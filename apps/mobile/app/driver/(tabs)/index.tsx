import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Switch,
  Alert,
  RefreshControl,
  AppState,
  Animated,
  Easing,
  Pressable,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useDriverAuth } from "../../../contexts/DriverAuthContext";
import { useDriverRideAlertOptional } from "../../../contexts/DriverRideAlertContext";
import { useDriverTheme } from "../../../contexts/DriverThemeContext";
import { GOLD, DRIVER_ONLINE_GREEN, DRIVER_PRIMARY_INK } from "../../../theme/driver-theme";
import { SlimSpinner } from "../../../components/SlimSpinner";
import { DriverScreenShell } from "../../../components/driver/DriverScreenShell";
import { DriverEmptyState } from "../../../components/driver/DriverEmptyState";
import { DriverOfferCard } from "../../../components/driver/DriverOfferCard";
import {
  getDriverRides,
  acceptRide,
  rejectRide,
  updateRideStatus,
  isDriverConciergeEnrolled,
  DriverRide,
} from "../../../services/api";
import { dismissPresentedForEntity } from "../../../services/notification-deep-link";
import { syncDriverLiveTracking, syncLiveTrackingFromRideList } from "../../../services/driver-live-session";
import { openDriverStream, type DriverOfferEvent } from "../../../services/driver-stream";
import { isParcelServiceType } from "../../../utils/parcel";

type TabType = "requests" | "upcoming";

const POLL_INTERVAL = 12_000; // upcoming tab — SSE is primary
const REQUESTS_POLL_HEALTHY_MS = 20_000; // SSE open: light safety net only
const REQUESTS_POLL_DEGRADED_MS = 2_500; // SSE down/reconnecting: stay snappy
/** Only used before first GPS fix so MapView can mount — pin is hidden until real coords. */
const MAP_FALLBACK = { latitude: 43.6532, longitude: -79.3832 };
const { height: SCREEN_H } = Dimensions.get("window");
/** Match driver tab bar content height (avoid importing from _layout). */
const TAB_BAR_CONTENT_H = 46;
/** ~12–15m — re-center home map when the driver moves this far. */
const MAP_RECENTER_DEG = 0.00012;
const MAP_DELTA = 0.02;

function coordsMovedEnough(
  a: { lat: number; lng: number } | null,
  lat: number,
  lng: number
): boolean {
  if (!a) return true;
  return (
    Math.abs(a.lat - lat) > MAP_RECENTER_DEG || Math.abs(a.lng - lng) > MAP_RECENTER_DEG
  );
}

/**
 * Camera framing so the car sits in the open map strip — clear of status/header
 * and clear of the bottom sheet (not sliding under the sheet edge).
 */
function regionForDriverPin(
  lat: number,
  lng: number,
  visibleMapHeightPx: number,
  screenHeightPx: number
) {
  const visibleRatio = Math.min(0.5, Math.max(0.22, visibleMapHeightPx / screenHeightPx));
  // ~35% down the visible strip = between Online pill and sheet handle.
  const desiredYFromTop = visibleRatio * 0.35;
  const latOffset = MAP_DELTA * (0.5 - desiredYFromTop);
  return {
    latitude: lat - latOffset,
    longitude: lng,
    latitudeDelta: MAP_DELTA,
    longitudeDelta: MAP_DELTA,
  };
}

function offerToRide(event: DriverOfferEvent): DriverRide | null {
  const r = event.ride;
  if (!r) return null;
  return {
    id: r.bookingId,
    bookingId: r.bookingId,
    status: r.status,
    customerName: r.customerName,
    phone: r.phone,
    email: r.email,
    serviceType: r.serviceType,
    vehicle: r.vehicle,
    passengers: r.passengers,
    childSeats: r.childSeats,
    serviceDate: r.serviceDate,
    serviceTime: r.serviceTime,
    pickupLocation: r.pickupLocation,
    stops: r.stops,
    dropoffLocation: r.dropoffLocation,
    distance: r.distance,
    duration: r.duration,
    total: r.total,
    specialRequirements: r.specialRequirements,
    createdAt: r.createdAt,
    liveOffer: r.liveOffer,
  };
}

export default function DriverDashboard() {
  const { driver, toggleActive, refreshProfile } = useDriverAuth();
  const { palette, isDark, toggleTheme } = useDriverTheme();
  const insets = useSafeAreaInsets();
  const rideAlert = useDriverRideAlertOptional();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [isActive, setIsActive] = useState(driver?.isActive || false);
  const [activeTab, setActiveTab] = useState<TabType>(
    params.tab === "upcoming" ? "upcoming" : "requests"
  );
  const [rides, setRides] = useState<DriverRide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requestCount, setRequestCount] = useState(0);
  const [conciergeEnrolled, setConciergeEnrolled] = useState(!!driver?.conciergeEnrolled);
  const [myCoords, setMyCoords] = useState<{ lat: number; lng: number } | null>(null);
  /** Gate Marker until MapView finishes native layout — avoids top-left flash. */
  const [mapReady, setMapReady] = useState(false);
  /**
   * Custom markers need tracksViewChanges only while their *view* changes
   * (first paint / online halo) — NOT on every GPS tick (that re-snapshots
   * and briefly parks the pin at screen 0,0).
   */
  const [trackMapMarker, setTrackMapMarker] = useState(true);
  /** Hide pin for one frame after mount so the 0,0 snapshot never flashes. */
  const [pinVisible, setPinVisible] = useState(false);
  /** When true, GPS updates re-center the camera. User pan/zoom turns this off. */
  const [mapFollow, setMapFollow] = useState(true);
  const mapFollowRef = useRef(true);
  const trackMarkerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pinRevealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<ReturnType<typeof openDriverStream> | null>(null);
  const isFocusedRef = useRef(true);
  const sseHealthyRef = useRef(false);
  /** Bumps on each fetch so stale in-flight responses cannot wipe fresher SSE state. */
  const fetchGenRef = useRef(0);
  /** bookingId → when SSE added it — preserve through a racing poll for a short window. */
  const ssePendingHoldRef = useRef<Map<string, number>>(new Map());
  const livePulse = useRef(new Animated.Value(0)).current;
  const mapPulse = useRef(new Animated.Value(0)).current;

  const firstName = useMemo(
    () => driver?.name?.split(" ")[0] || "Driver",
    [driver?.name]
  );

  const mapLat = myCoords?.lat ?? MAP_FALLBACK.latitude;
  const mapLng = myCoords?.lng ?? MAP_FALLBACK.longitude;
  /** Leave a taller map band so the car pin isn't glued to the sheet edge. */
  const sheetTopPad = Math.max(insets.top + 72, SCREEN_H * 0.38);
  const tabBarReserve = TAB_BAR_CONTENT_H + Math.max(insets.bottom - 4, 4) + 8;
  const mapRef = useRef<MapView | null>(null);
  /** Last camera center — follow the driver when they move. */
  const lastMapCenterRef = useRef<{ lat: number; lng: number } | null>(null);

  const centerMapOnDriver = useCallback(
    (lat: number, lng: number, animated = true) => {
      const visibleH = Math.max(insets.top + 72, SCREEN_H * 0.38);
      const region = regionForDriverPin(lat, lng, visibleH, SCREEN_H);
      lastMapCenterRef.current = { lat, lng };
      if (animated) {
        mapRef.current?.animateToRegion(region, 380);
      } else {
        mapRef.current?.animateToRegion(region, 0);
      }
    },
    [insets.top]
  );

  const unlockMapFollow = useCallback(() => {
    mapFollowRef.current = false;
    setMapFollow(false);
  }, []);

  const recenterOnDriver = useCallback(() => {
    mapFollowRef.current = true;
    setMapFollow(true);
    if (myCoords) centerMapOnDriver(myCoords.lat, myCoords.lng, true);
  }, [myCoords, centerMapOnDriver]);

  useEffect(() => {
    if (driver?.conciergeEnrolled === true) setConciergeEnrolled(true);
    else if (driver?.conciergeEnrolled === false) setConciergeEnrolled(false);
  }, [driver?.conciergeEnrolled]);

  // Keep Online switch in sync if profile refresh / another device flips status.
  useEffect(() => {
    if (typeof driver?.isActive === "boolean") setIsActive(driver.isActive);
  }, [driver?.isActive]);

  const bumpMarkerTracking = useCallback((holdMs = 900) => {
    if (trackMarkerTimerRef.current) clearTimeout(trackMarkerTimerRef.current);
    setTrackMapMarker(true);
    trackMarkerTimerRef.current = setTimeout(() => {
      setTrackMapMarker(false);
      trackMarkerTimerRef.current = null;
    }, holdMs);
  }, []);

  const hasCoords = myCoords != null;

  // If GPS arrived before onMapReady, re-frame once the map can accept animateToRegion.
  useEffect(() => {
    if (!mapReady || !myCoords || !mapFollowRef.current) return;
    centerMapOnDriver(myCoords.lat, myCoords.lng, false);
  }, [mapReady]); // eslint-disable-line react-hooks/exhaustive-deps -- only on map ready

  // Re-snapshot only when the car/halo chrome changes — not when GPS moves.
  useEffect(() => {
    if (!mapReady || !hasCoords) return;
    bumpMarkerTracking(isActive ? 1200 : 700);
  }, [isActive, mapReady, hasCoords, bumpMarkerTracking]);

  // Reveal pin after map is ready + coords exist (skips the native 0,0 flash).
  useEffect(() => {
    if (pinRevealTimerRef.current) {
      clearTimeout(pinRevealTimerRef.current);
      pinRevealTimerRef.current = null;
    }
    if (!mapReady || !hasCoords) {
      setPinVisible(false);
      return;
    }
    setPinVisible(false);
    bumpMarkerTracking(1000);
    // Show after native annotation is attached; keep tracking a bit longer so the
    // visible (opacity 1) frame is what gets snapshotted — not the invisible one.
    pinRevealTimerRef.current = setTimeout(() => {
      setPinVisible(true);
      pinRevealTimerRef.current = null;
    }, 120);
    return () => {
      if (pinRevealTimerRef.current) {
        clearTimeout(pinRevealTimerRef.current);
        pinRevealTimerRef.current = null;
      }
    };
  }, [mapReady, hasCoords, bumpMarkerTracking]);

  useEffect(() => {
    return () => {
      if (trackMarkerTimerRef.current) clearTimeout(trackMarkerTimerRef.current);
      if (pinRevealTimerRef.current) clearTimeout(pinRevealTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(livePulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(livePulse, {
          toValue: 0,
          duration: 1100,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [livePulse]);

  // Pulse only while Online + marker is tracking view updates (avoids Animated listener WARN).
  useEffect(() => {
    if (!isActive || !trackMapMarker) {
      mapPulse.stopAnimation();
      mapPulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(mapPulse, {
          toValue: 1,
          duration: 1600,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(mapPulse, {
          toValue: 0,
          duration: 1600,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [mapPulse, isActive, trackMapMarker]);

  // Driver “you are here” — high-accuracy GPS, camera follows real movement.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      let sub: Location.LocationSubscription | null = null;
      lastMapCenterRef.current = null;
      mapFollowRef.current = true;
      setMapFollow(true);

      const applyFix = (
        lat: number,
        lng: number,
        accuracy: number | null,
        forceCenter: boolean
      ) => {
        // Prefer solid fixes; still accept a coarse first fix so the pin isn't blank indoors.
        if (
          typeof accuracy === "number" &&
          accuracy > 80 &&
          lastMapCenterRef.current != null
        ) {
          return;
        }
        const next = { lat, lng };
        setMyCoords(next);
        // Never yank the camera while the driver is exploring the map.
        if (!mapFollowRef.current && !forceCenter) return;
        if (forceCenter || coordsMovedEnough(lastMapCenterRef.current, lat, lng)) {
          const visibleH = Math.max(insets.top + 72, SCREEN_H * 0.38);
          lastMapCenterRef.current = next;
          mapRef.current?.animateToRegion(
            regionForDriverPin(lat, lng, visibleH, SCREEN_H),
            forceCenter ? 450 : 350
          );
        }
      };

      (async () => {
        try {
          const current = await Location.getForegroundPermissionsAsync();
          let status = current.status;
          if (status !== "granted") {
            const req = await Location.requestForegroundPermissionsAsync();
            status = req.status;
          }
          if (status !== "granted" || cancelled) return;

          // Fast approximate first (last-known), then refine with a fresh high-accuracy fix.
          try {
            const last = await Location.getLastKnownPositionAsync({
              maxAge: 60_000,
              requiredAccuracy: 100,
            });
            if (!cancelled && last) {
              applyFix(
                last.coords.latitude,
                last.coords.longitude,
                typeof last.coords.accuracy === "number" ? last.coords.accuracy : null,
                true
              );
            }
          } catch {
            /* optional warm start */
          }

          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          if (!cancelled) {
            applyFix(
              pos.coords.latitude,
              pos.coords.longitude,
              typeof pos.coords.accuracy === "number" ? pos.coords.accuracy : null,
              true
            );
          }

          sub = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              distanceInterval: 8,
              timeInterval: 4_000,
              mayShowUserSettingsDialog: true,
            },
            (loc) => {
              if (cancelled) return;
              applyFix(
                loc.coords.latitude,
                loc.coords.longitude,
                typeof loc.coords.accuracy === "number" ? loc.coords.accuracy : null,
                false
              );
            }
          );
          if (cancelled) {
            sub.remove();
            sub = null;
          }
        } catch {
          /* keep last good fix / empty pin until GPS available */
        }
      })();
      return () => {
        cancelled = true;
        sub?.remove();
      };
    }, [insets.top])
  );

  const fetchRides = useCallback(async (tab: TabType, silent = false) => {
    const gen = ++fetchGenRef.current;
    try {
      const data = await getDriverRides(tab);
      if (gen !== fetchGenRef.current) return;
      if (data.success) {
        if (tab === "requests") {
          const apiRides = data.rides;
          const apiIds = new Set(apiRides.map((r) => r.bookingId));
          const now = Date.now();
          for (const [id, addedAt] of [...ssePendingHoldRef.current.entries()]) {
            if (apiIds.has(id) || now - addedAt > 25_000) {
              ssePendingHoldRef.current.delete(id);
            }
          }
          setRides((prev) => {
            const preserved = prev.filter((r) => {
              if (apiIds.has(r.bookingId)) return false;
              if (r.status !== "PENDING") return false;
              const heldAt = ssePendingHoldRef.current.get(r.bookingId);
              return heldAt != null && now - heldAt < 25_000;
            });
            const next = [...apiRides];
            for (const ride of preserved) {
              if (!next.some((r) => r.bookingId === ride.bookingId)) {
                next.unshift(ride);
              }
            }
            setRequestCount(next.length);
            return next;
          });
        } else {
          setRides(data.rides);
        }
        if (tab === "upcoming") {
          syncLiveTrackingFromRideList(data.rides).catch(() => {});
        }
      }
    } catch {
      // Silently fail
    } finally {
      // Always clear the full-screen loader when the *latest* request finishes —
      // even silent AppState/poll fetches. Otherwise a silent fetch that bumps
      // fetchGen can strand isLoading=true forever (spinner until pull-to-refresh).
      if (gen === fetchGenRef.current) {
        setIsLoading(false);
        if (!silent) setRefreshing(false);
      } else if (!silent) {
        setRefreshing(false);
      }
    }
  }, []);

  const applyOfferEvent = useCallback((event: DriverOfferEvent) => {
    if (event.type === "offer_created" && event.ride && rideAlert) {
      const pickup = event.ride.pickupLocation?.split(",")[0] || "Pickup";
      const dropoff = event.ride.dropoffLocation?.split(",")[0] || "Dropoff";
      const when = [event.ride.serviceDate, event.ride.serviceTime].filter(Boolean).join(" · ");
      rideAlert.showRideAlert({
        bookingId: event.bookingId,
        title: event.ride.liveOffer ? "New Reservation Available" : "New Reservation Assigned",
        body: when ? `${pickup} → ${dropoff}\n${when}` : `${pickup} → ${dropoff}`,
        type: event.ride.liveOffer ? "live_offer" : "new_assignment",
      });
    }

    // Always keep badge accurate from list mutations when on Requests;
    // when on Upcoming, soft-refresh the request count only.
    if (activeTab !== "requests") {
      if (
        event.type === "offer_created" ||
        event.type === "snapshot" ||
        event.type === "offer_revoked" ||
        event.type === "offer_claimed" ||
        event.type === "offer_declined"
      ) {
        getDriverRides("requests")
          .then((data) => {
            if (data.success) setRequestCount(data.rides.length);
          })
          .catch(() => {});
      }
      return;
    }

    if (event.type === "offer_created" || event.type === "snapshot") {
      const ride = offerToRide(event);
      if (!ride) return;
      // Ignore non-PENDING ghosts (e.g. stale DONE reassignment before server reopen)
      if (ride.status && ride.status !== "PENDING") return;
      ssePendingHoldRef.current.set(ride.bookingId, Date.now());
      setRides((prev) => {
        if (prev.some((r) => r.bookingId === ride.bookingId)) {
          return prev.map((r) => (r.bookingId === ride.bookingId ? { ...r, ...ride } : r));
        }
        const next = [ride, ...prev];
        setRequestCount(next.length);
        return next;
      });
      return;
    }

    if (
      event.type === "offer_revoked" ||
      event.type === "offer_claimed" ||
      event.type === "offer_declined"
    ) {
      ssePendingHoldRef.current.delete(event.bookingId);
      setRides((prev) => {
        const next = prev.filter((r) => r.bookingId !== event.bookingId);
        setRequestCount(next.length);
        return next;
      });
    }
  }, [activeTab, rideAlert]);

  useEffect(() => {
    if (params.tab === "requests" || params.tab === "upcoming") {
      setActiveTab(params.tab);
    }
  }, [params.tab]);

  // Admin may change name/photo / Concierge enroll — re-fetch when this screen is shown
  useFocusEffect(
    useCallback(() => {
      refreshProfile();
      syncDriverLiveTracking().catch(() => {});

      let cancelled = false;
      void (async () => {
        const enrolled = await isDriverConciergeEnrolled();
        if (!cancelled) setConciergeEnrolled(enrolled);
      })();

      return () => {
        cancelled = true;
      };
    }, [refreshProfile])
  );

  // Keep Live Auto SSE always connected on this screen; poll adapts to SSE health
  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;
      // Full-page loader only until the first fetch for this focus settles.
      // (Silent AppState/poll must also clear this — see fetchRides finally.)
      setIsLoading(true);
      void fetchRides(activeTab, false);

      const startPoll = (intervalMs: number) => {
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
        pollTimerRef.current = setInterval(() => {
          if (isFocusedRef.current) fetchRides(activeTab, true);
        }, intervalMs);
      };

      streamRef.current?.close();
      streamRef.current = openDriverStream({
        onEvent: applyOfferEvent,
        onStatus: (status) => {
          const healthy = status === "open";
          sseHealthyRef.current = healthy;
          if (activeTab === "requests") {
            startPoll(healthy ? REQUESTS_POLL_HEALTHY_MS : REQUESTS_POLL_DEGRADED_MS);
          }
        },
      });

      // Until first SSE open, poll fast so assign never feels stuck
      startPoll(
        activeTab === "requests" ? REQUESTS_POLL_DEGRADED_MS : POLL_INTERVAL
      );

      return () => {
        isFocusedRef.current = false;
        sseHealthyRef.current = false;
        streamRef.current?.close();
        streamRef.current = null;
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
      };
    }, [activeTab, fetchRides, applyOfferEvent])
  );

  // Also fetch request count in background for notification badge
  useEffect(() => {
    if (activeTab !== "requests") {
      const fetchCount = async () => {
        try {
          const data = await getDriverRides("requests");
          if (data.success) {
            setRequestCount(data.rides.length);
          }
        } catch {}
      };
      fetchCount();
      const interval = setInterval(fetchCount, POLL_INTERVAL);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  // Pause polling when app goes to background; on resume force SSE reopen + refresh
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      const active = state === "active";
      isFocusedRef.current = active;
      if (active) {
        fetchRides(activeTab, true);
        // Force fresh SSE so we get a new snapshot after background kill
        streamRef.current?.close();
        streamRef.current = openDriverStream({
          onEvent: applyOfferEvent,
          onStatus: (status) => {
            const healthy = status === "open";
            sseHealthyRef.current = healthy;
            if (activeTab === "requests") {
              if (pollTimerRef.current) {
                clearInterval(pollTimerRef.current);
                pollTimerRef.current = null;
              }
              pollTimerRef.current = setInterval(() => {
                if (isFocusedRef.current) fetchRides(activeTab, true);
              }, healthy ? REQUESTS_POLL_HEALTHY_MS : REQUESTS_POLL_DEGRADED_MS);
            }
          },
        });
      }
    });
    return () => sub.remove();
  }, [activeTab, fetchRides, applyOfferEvent]);

  const handleToggleActive = async (value: boolean) => {
    setIsActive(value);
    const result = await toggleActive(value);
    if (!result.success) {
      setIsActive(!value);
      Alert.alert("Error", result.error || "Failed to update status");
      return;
    }
    // Pull in (or clear) Live Auto offers immediately after status change
    if (activeTab === "requests") {
      fetchRides("requests", true);
    } else {
      getDriverRides("requests")
        .then((data) => {
          if (data.success) setRequestCount(data.rides.length);
        })
        .catch(() => {});
    }
  };

  const performAcceptRide = async (bookingId: string) => {
    try {
      const result = await acceptRide(bookingId);
      if (result.success) {
        void dismissPresentedForEntity({ bookingId });
        // Optimistic remove from requests (SSE also revokes for others)
        setRides((prev) => prev.filter((r) => r.bookingId !== bookingId));
        setRequestCount((c) => Math.max(0, c - 1));
        // No helper dialog — switch straight to Upcoming.
        setActiveTab("upcoming");
        syncDriverLiveTracking().catch(() => {});
        fetchRides("upcoming");
      } else {
        Alert.alert("Error", "Failed to accept ride");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      Alert.alert(
        msg.toLowerCase().includes("another driver") ? "Ride taken" : "Error",
        msg
      );
      fetchRides(activeTab, true);
    }
  };

  /** Uber-like: one tap accept — no confirm Alert on happy path. */
  const handleAcceptRide = (bookingId: string) => {
    void performAcceptRide(bookingId);
  };

  /** Upcoming: Start → ON THE WAY (idempotent) then open Track Ride. */
  const handleStartOrOpenRide = (ride: DriverRide) => {
    void (async () => {
      const open = () => {
        router.push({
          pathname: "/driver/ride-details",
          params: { bookingId: ride.bookingId },
        });
      };
      if (ride.status === "ACCEPTED" || ride.status === "PENDING") {
        try {
          const result = await updateRideStatus(ride.bookingId, "ON THE WAY");
          if (!result.success) {
            Alert.alert("Error", "Could not start the trip");
            return;
          }
          syncDriverLiveTracking().catch(() => {});
          fetchRides("upcoming", true);
        } catch (e) {
          Alert.alert(
            "Error",
            e instanceof Error ? e.message : "Could not start the trip"
          );
          return;
        }
      }
      open();
    })();
  };

  const handleRejectRide = (bookingId: string) => {
    Alert.alert("Decline ride", "Are you sure you want to decline this ride?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Decline",
        style: "destructive",
        onPress: () => {
          // Optimistic remove — don't wait on Live Auto rebroadcast
          let removed: DriverRide | undefined;
          setRides((prev) => {
            removed = prev.find((r) => r.bookingId === bookingId);
            const next = prev.filter((r) => r.bookingId !== bookingId);
            setRequestCount(next.length);
            return next;
          });
          ssePendingHoldRef.current.delete(bookingId);

          void (async () => {
            try {
              const result = await rejectRide(bookingId);
              if (!result.success) {
                if (removed) {
                  setRides((prev) => {
                    if (prev.some((r) => r.bookingId === bookingId)) return prev;
                    const next = [removed!, ...prev];
                    setRequestCount(next.length);
                    return next;
                  });
                }
                Alert.alert("Error", "Failed to decline ride");
                fetchRides(activeTab, true);
                return;
              }
              void dismissPresentedForEntity({ bookingId });
              syncDriverLiveTracking().catch(() => {});
            } catch (error: unknown) {
              if (removed) {
                setRides((prev) => {
                  if (prev.some((r) => r.bookingId === bookingId)) return prev;
                  const next = [removed!, ...prev];
                  setRequestCount(next.length);
                  return next;
                });
              }
              const message =
                error instanceof Error ? error.message : "Something went wrong";
              Alert.alert("Error", message);
              fetchRides(activeTab, true);
            }
          })();
        },
      },
    ]);
  };

  const sheetBg = palette.surfaceElevated;
  const floatingBg = isDark ? palette.heroCard : palette.cardSurface;
  const floatingBorder = palette.border;

  return (
    <DriverScreenShell edges={[]} hideGlow style={{ backgroundColor: palette.root }}>
      <View style={styles.root}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          provider={PROVIDER_DEFAULT}
          initialRegion={regionForDriverPin(mapLat, mapLng, sheetTopPad, SCREEN_H)}
          scrollEnabled
          zoomEnabled
          rotateEnabled={false}
          pitchEnabled={false}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}
          showsScale={false}
          showsTraffic={false}
          showsBuildings
          toolbarEnabled={false}
          userInterfaceStyle={isDark ? "dark" : "light"}
          onMapReady={() => setMapReady(true)}
          onPanDrag={unlockMapFollow}
          onRegionChangeComplete={(_region, details) => {
            // iOS/Android: details.isGesture means the driver moved the map.
            if (details?.isGesture) unlockMapFollow();
          }}
        >
          {mapReady && myCoords ? (
            <Marker
              coordinate={{ latitude: myCoords.lat, longitude: myCoords.lng }}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={trackMapMarker}
              opacity={pinVisible ? 1 : 0}
              identifier="driver-home-self"
            >
              <View style={styles.mapMarkerWrap} pointerEvents="none">
                {isActive ? (
                  <Animated.View
                    style={[
                      styles.mapHalo,
                      {
                        opacity: mapPulse.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.45, 0.08],
                        }),
                        transform: [
                          {
                            scale: mapPulse.interpolate({
                              inputRange: [0, 1],
                              outputRange: [1, 1.55],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                ) : null}
                <View style={[styles.mapCar, !isActive && styles.mapCarOff]}>
                  <Ionicons name="car" size={15} color="#fff" />
                </View>
              </View>
            </Marker>
          ) : null}
        </MapView>

        <View
          style={[styles.floatingHeader, { paddingTop: insets.top + 6 }]}
          pointerEvents="box-none"
        >
          <View
            style={[
              styles.statusPill,
              { backgroundColor: floatingBg, borderColor: floatingBorder },
            ]}
          >
            <Switch
              value={isActive}
              onValueChange={handleToggleActive}
              trackColor={{ false: palette.switchTrackOff, true: DRIVER_ONLINE_GREEN }}
              thumbColor="#fff"
              ios_backgroundColor={palette.switchTrackOff}
            />
            <Text
              style={[
                styles.statusText,
                { color: isActive ? palette.statusOn : palette.muted },
              ]}
            >
              {isActive ? "Online" : "Offline"}
            </Text>
          </View>

          <View style={styles.headerRight}>
            {conciergeEnrolled ? (
              <Pressable
                onPress={() => router.push("/driver/concierge")}
                accessibilityLabel="Hotel Concierge"
                style={({ pressed }) => [
                  styles.iconBtn,
                  { backgroundColor: floatingBg, borderColor: floatingBorder },
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="business-outline" size={18} color={GOLD} />
              </Pressable>
            ) : null}

            <Pressable
              onPress={toggleTheme}
              accessibilityLabel={isDark ? "Switch to light mode" : "Switch to dark mode"}
              style={({ pressed }) => [
                styles.iconBtn,
                { backgroundColor: floatingBg, borderColor: floatingBorder },
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name={isDark ? "sunny-outline" : "moon-outline"}
                size={18}
                color={palette.icon}
              />
            </Pressable>

            <Pressable
              onPress={() => router.push("/driver/profile")}
              style={({ pressed }) => [styles.avatarRing, pressed && styles.pressed]}
            >
              {driver?.photo ? (
                <Image key={driver.photo} source={{ uri: driver.photo }} style={styles.avatar} />
              ) : (
                <LinearGradient colors={[GOLD, "#A87830"]} style={styles.avatar}>
                  <Text style={styles.avatarLetter}>{driver?.name?.[0] || "D"}</Text>
                </LinearGradient>
              )}
            </Pressable>
          </View>
        </View>

        {!mapFollow && myCoords ? (
          <Pressable
            onPress={recenterOnDriver}
            accessibilityRole="button"
            accessibilityLabel="Recenter map on your location"
            style={({ pressed }) => [
              styles.recenterBtn,
              {
                top: insets.top + 58,
                backgroundColor: floatingBg,
                borderColor: floatingBorder,
              },
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="locate" size={20} color={GOLD} />
          </Pressable>
        ) : null}

        <View style={[styles.sheetColumn, { paddingTop: sheetTopPad }]} pointerEvents="box-none">
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: sheetBg,
                paddingBottom: tabBarReserve,
              },
            ]}
          >
            <View style={styles.sheetHandleWrap}>
              <View
                style={[
                  styles.sheetHandle,
                  { backgroundColor: isDark ? "rgba(212,160,74,0.45)" : "rgba(26,18,8,0.2)" },
                ]}
              />
            </View>

            <View style={styles.greetingRow}>
              <Text style={[styles.greetingTitle, { color: palette.text }]}>
                Hi, {firstName}
              </Text>
              <Text style={[styles.greetingStatus, { color: palette.muted }]}>
                {isActive ? "You're online" : "You're offline"}
              </Text>
            </View>

            <View style={[styles.tabShell, { backgroundColor: palette.tabTrack }]}>
              <Pressable
                style={[
                  styles.tab,
                  activeTab === "requests" && [
                    styles.tabActive,
                    { backgroundColor: palette.tabActive },
                  ],
                ]}
                onPress={() => setActiveTab("requests")}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: palette.tabText },
                    activeTab === "requests" && { color: palette.tabTextActive },
                  ]}
                >
                  Requests
                </Text>
                {requestCount > 0 ? (
                  <View style={styles.tabCount}>
                    <Text style={styles.tabCountText}>
                      {requestCount > 9 ? "9+" : requestCount}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
              <Pressable
                style={[
                  styles.tab,
                  activeTab === "upcoming" && [
                    styles.tabActive,
                    { backgroundColor: palette.tabActive },
                  ],
                ]}
                onPress={() => setActiveTab("upcoming")}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: palette.tabText },
                    activeTab === "upcoming" && { color: palette.tabTextActive },
                  ]}
                >
                  Upcoming
                </Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={styles.sheetScrollContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => {
                    setRefreshing(true);
                    fetchRides(activeTab);
                  }}
                  tintColor={GOLD}
                  colors={[GOLD]}
                />
              }
            >
              {isLoading ? (
                <View style={styles.loadingWrap}>
                  <SlimSpinner size={32} stroke={2} />
                </View>
              ) : rides.length === 0 ? (
                <DriverEmptyState
                  icon={activeTab === "requests" ? "car-outline" : "calendar-outline"}
                  title={activeTab === "requests" ? "No requests yet" : "No upcoming rides"}
                  subtitle={
                    activeTab === "requests"
                      ? isActive
                        ? "Stay online. New offers appear here instantly."
                        : "Go online to receive live offers."
                      : "Accepted rides show up here until you complete them."
                  }
                />
              ) : (
                <View style={styles.requestsList}>
                  {rides.map((ride) => (
                    <DriverOfferCard
                      key={ride.bookingId || ride.id}
                      customerName={ride.customerName}
                      phone={ride.phone}
                      serviceDate={ride.serviceDate}
                      serviceTime={ride.serviceTime}
                      passengers={ride.passengers}
                      vehicle={ride.vehicle}
                      bookingId={ride.bookingId}
                      pickupLocation={ride.pickupLocation}
                      dropoffLocation={ride.dropoffLocation}
                      isParcel={isParcelServiceType(ride.serviceType)}
                      isLive={!!ride.liveOffer}
                      showNewBadge={activeTab === "requests"}
                      livePulse={livePulse}
                      fareLabel={
                        ride.total != null && ride.total > 0
                          ? `$${ride.total.toFixed(0)}`
                          : null
                      }
                      mode={activeTab === "requests" ? "request" : "upcoming"}
                      status={ride.status}
                      onReject={() => handleRejectRide(ride.bookingId)}
                      onPrimary={() => {
                        if (activeTab === "requests") {
                          handleAcceptRide(ride.bookingId);
                        } else {
                          handleStartOrOpenRide(ride);
                        }
                      }}
                    />
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </View>
    </DriverScreenShell>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  floatingHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  recenterBtn: {
    position: "absolute",
    right: 14,
    zIndex: 25,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 5,
    paddingLeft: 8,
    paddingRight: 14,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statusText: { fontSize: 13, fontWeight: "700", letterSpacing: -0.1 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  avatarRing: { borderRadius: 20, overflow: "hidden" },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { color: DRIVER_PRIMARY_INK, fontSize: 16, fontWeight: "800" },
  mapMarkerWrap: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  mapHalo: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(46,125,79,0.35)",
  },
  mapCar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: DRIVER_PRIMARY_INK,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: GOLD,
  },
  mapCarOff: { backgroundColor: "#8A8A8E" },
  sheetColumn: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 6,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  sheetHandleWrap: { alignItems: "center", paddingVertical: 6 },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginTop: 4,
    marginBottom: 14,
    gap: 12,
  },
  greetingTitle: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.7,
    flexShrink: 1,
  },
  greetingStatus: {
    fontSize: 13,
    fontWeight: "500",
  },
  tabShell: {
    flexDirection: "row",
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 11,
  },
  tabActive: {},
  tabText: { fontSize: 14, fontWeight: "600" },
  tabCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
  },
  tabCountText: { fontSize: 11, fontWeight: "800", color: DRIVER_PRIMARY_INK },
  sheetScroll: { flex: 1 },
  sheetScrollContent: { paddingBottom: 12, flexGrow: 1 },
  loadingWrap: { alignItems: "center", paddingVertical: 48 },
  requestsList: { gap: 0 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
});

