import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Alert,
  Animated,
  Easing,
  Pressable,
  Linking,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from "react-native-maps";
import * as Location from "expo-location";
import {
  getDriverRideDetail,
  updateRideStatus,
  getDriverChat,
  sendDriverChatMessage,
  markDriverNoShow,
  DriverRide,
} from "../../services/api";
import { syncDriverLiveTracking } from "../../services/driver-live-session";
import { dismissPresentedForEntity } from "../../services/notification-deep-link";
import { SlimSpinner } from "../../components/SlimSpinner";
import { SlideToAct } from "../../components/driver/SlideToAct";
import { isParcelServiceType, parseParcelRequirements } from "../../utils/parcel";
import { parseAppStops } from "../../utils/stops";
import { openNavigationTo } from "../../utils/open-navigation";
import { fetchDirectionsSummary } from "../../services/places";
import { decodePolyline } from "../../utils/decode-polyline";
import { useDriverTheme } from "../../contexts/DriverThemeContext";
import {
  GOLD,
  DRIVER_ONLINE_GREEN,
  DRIVER_PRIMARY_INK,
} from "../../theme/driver-theme";

type RideStatus =
  | "pending"
  | "accepted"
  | "on_the_way"
  | "arrived"
  | "customer_in_car"
  | "stop"
  | "done";

type StopPeriod = { start: string; end?: string };

const { height: SCREEN_H } = Dimensions.get("window");
const MAP_DELTA = 0.04;
const PROGRESS = [
  { id: "on_the_way", label: "On the way" },
  { id: "arrived", label: "Arrived" },
  { id: "customer_in_car", label: "Customer in car" },
  { id: "done", label: "Done" },
] as const;

function parseStopPeriods(json?: string | null): StopPeriod[] {
  if (!json?.trim()) return [];
  try {
    const p = JSON.parse(json) as unknown;
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "0:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function shortLoc(s?: string | null) {
  if (!s?.trim()) return "—";
  return s.split(",")[0]?.trim() || s.trim();
}

function initialOf(name: string) {
  return (name.trim()[0] || "?").toUpperCase();
}

function mapApiStatus(status: string): RideStatus {
  switch (status) {
    case "PENDING":
      return "pending";
    case "ACCEPTED":
      return "accepted";
    case "ON THE WAY":
      return "on_the_way";
    case "ARRIVED":
      return "arrived";
    case "CIC":
      return "customer_in_car";
    case "STOP":
      return "stop";
    case "DONE":
    case "NO_SHOW":
      return "done";
    default:
      return "pending";
  }
}

function toApiStatus(id: string): string {
  switch (id) {
    case "on_the_way":
      return "ON THE WAY";
    case "arrived":
      return "ARRIVED";
    case "customer_in_car":
      return "CIC";
    case "stop":
      return "STOP";
    case "done":
      return "DONE";
    case "continue":
      return "CIC";
    default:
      return "ON THE WAY";
  }
}

function preferenceChips(ride: DriverRide): string[] {
  const raw = String(ride.specialRequirements || "");
  const chips: string[] = [];
  if (/quiet/i.test(raw)) chips.push("Quiet ride");
  if (/no\s*bags|no\s*luggage/i.test(raw)) chips.push("No bags");
  if (/any\s*temp|temperature/i.test(raw)) chips.push("Any temp.");
  if (/distance\s*booking|long\s*distance/i.test(raw)) chips.push("Distance booking");
  if (/Meet\s*&\s*Greet\s*:\s*Yes/i.test(raw)) chips.push("Meet & Greet");
  return chips.slice(0, 6);
}

/** Uber-style edge padding: keep car + route visible above the bottom sheet. */
function tripEdgePadding(visibleMapH: number, topInset: number) {
  const bottomCover = Math.max(SCREEN_H - visibleMapH + 24, SCREEN_H * 0.52);
  return {
    top: topInset + 72,
    right: 36,
    bottom: bottomCover,
    left: 36,
  };
}

/**
 * Real-map camera: fit driver + destination (+ route samples). Falls back to a
 * single-point region only when we have nothing else to frame.
 */
function fitTripCamera(
  map: MapView | null,
  opts: {
    driver?: { lat: number; lng: number } | null;
    dest?: { latitude: number; longitude: number } | null;
    route?: { latitude: number; longitude: number }[];
    visibleMapH: number;
    topInset: number;
    animated?: boolean;
  }
) {
  if (!map) return;
  const pts: { latitude: number; longitude: number }[] = [];
  if (opts.driver) {
    pts.push({ latitude: opts.driver.lat, longitude: opts.driver.lng });
  }
  if (opts.dest) pts.push(opts.dest);
  const route = opts.route || [];
  if (route.length >= 2) {
    pts.push(route[0]);
    pts.push(route[Math.floor(route.length / 2)]);
    pts.push(route[route.length - 1]);
  }
  if (pts.length === 0) return;

  const pad = tripEdgePadding(opts.visibleMapH, opts.topInset);
  if (pts.length === 1) {
    const p = pts[0];
    const visibleRatio = Math.min(0.55, Math.max(0.28, opts.visibleMapH / SCREEN_H));
    const desiredY = visibleRatio * 0.42;
    const latOffset = MAP_DELTA * (0.5 - desiredY);
    map.animateToRegion(
      {
        latitude: p.latitude - latOffset,
        longitude: p.longitude,
        latitudeDelta: MAP_DELTA,
        longitudeDelta: MAP_DELTA,
      },
      opts.animated === false ? 0 : 380
    );
    return;
  }

  try {
    map.fitToCoordinates(pts, {
      edgePadding: pad,
      animated: opts.animated !== false,
    });
  } catch {
    /* map not ready */
  }
}

/**
 * Real native maps only (Apple Maps iOS / Google Maps Android via RN default).
 * Do not force PROVIDER_GOOGLE without app.json googleMapsApiKey — blank map risk.
 */
const MAP_PROVIDER = PROVIDER_DEFAULT;
const FOLLOW_REFIT_MS = 12_000;

export default function RideDetailsScreen() {
  const { bookingId, fromNotification } = useLocalSearchParams();
  const { palette, isDark } = useDriverTheme();
  const insets = useSafeAreaInsets();
  const id =
    typeof bookingId === "string"
      ? bookingId
      : Array.isArray(bookingId)
        ? bookingId[0]
        : "";
  const openedFromStaleNotification =
    fromNotification === "stale" ||
    (Array.isArray(fromNotification) && fromNotification[0] === "stale");

  const [ride, setRide] = useState<DriverRide | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [tick, setTick] = useState(0);
  const [chatUnread, setChatUnread] = useState(0);
  const [myCoords, setMyCoords] = useState<{
    lat: number;
    lng: number;
    heading?: number | null;
  } | null>(null);
  const [mapFollow, setMapFollow] = useState(true);
  const [routeCoords, setRouteCoords] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  const [chipBusy, setChipBusy] = useState<string | null>(null);
  const [trackCarMarker, setTrackCarMarker] = useState(true);

  const mapFollowRef = useRef(true);
  const mapRef = useRef<MapView | null>(null);
  const destCoordRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const routeCoordsRef = useRef<{ latitude: number; longitude: number }[]>([]);
  const lastFollowFitAtRef = useRef(0);
  const lastSoftCamRef = useRef<{ lat: number; lng: number } | null>(null);
  const mapPulse = useRef(new Animated.Value(0)).current;
  const sheetTopPad = Math.max(insets.top + 72, SCREEN_H * 0.42);

  const refreshRide = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getDriverRideDetail(id);
      if (data.success && data.ride) setRide(data.ride);
    } catch {
      /* keep snapshot */
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      void refreshRide();
      syncDriverLiveTracking().catch(() => {});
      if (!id) return;
      void getDriverChat(id)
        .then((c) => {
          if (c.success) setChatUnread(c.unreadCount || 0);
        })
        .catch(() => {});
    }, [id, refreshRide])
  );

  // Only tick clocks when a live timer is on-screen (avoids 1Hz full re-renders otherwise).
  useEffect(() => {
    const status = ride?.status;
    const needTick =
      status === "ON THE WAY" ||
      status === "ARRIVED" ||
      status === "CIC" ||
      status === "STOP";
    if (!needTick) return;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [ride?.status]);

  useEffect(() => {
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
  }, [mapPulse]);

  useEffect(() => {
    if (!trackCarMarker) return;
    const t = setTimeout(() => setTrackCarMarker(false), 2200);
    return () => clearTimeout(t);
  }, [trackCarMarker, myCoords?.lat, myCoords?.lng]);

  // Driver GPS
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      let sub: Location.LocationSubscription | null = null;
      mapFollowRef.current = true;
      setMapFollow(true);

      const apply = (
        lat: number,
        lng: number,
        heading: number | null,
        force: boolean
      ) => {
        setMyCoords((prev) => {
          // Skip React state if pin barely moved (keeps UI fast).
          if (
            !force &&
            prev &&
            Math.abs(prev.lat - lat) < 0.00004 &&
            Math.abs(prev.lng - lng) < 0.00004 &&
            prev.heading === heading
          ) {
            return prev;
          }
          return { lat, lng, heading };
        });
        if (force) setTrackCarMarker(true);
        if (!mapFollowRef.current && !force) return;

        const now = Date.now();
        const hasTripFrame =
          !!destCoordRef.current || routeCoordsRef.current.length >= 2;
        // Uber-like: full fit (car+route) on force / periodically — avoid zoom thrash every GPS tick.
        const shouldFullFit =
          force ||
          !hasTripFrame ||
          now - lastFollowFitAtRef.current > FOLLOW_REFIT_MS;

        if (shouldFullFit) {
          lastFollowFitAtRef.current = now;
          lastSoftCamRef.current = { lat, lng };
          fitTripCamera(mapRef.current, {
            driver: { lat, lng },
            dest: destCoordRef.current,
            route: routeCoordsRef.current,
            visibleMapH: sheetTopPad,
            topInset: insets.top,
            animated: true,
          });
          return;
        }

        // Skip soft camera if we haven't moved ~8m — cuts jank.
        const soft = lastSoftCamRef.current;
        if (
          soft &&
          Math.abs(soft.lat - lat) < 0.00007 &&
          Math.abs(soft.lng - lng) < 0.00007
        ) {
          return;
        }
        lastSoftCamRef.current = { lat, lng };

        // Between fits: gently keep the car framed in the open map strip.
        const visibleRatio = Math.min(
          0.55,
          Math.max(0.28, sheetTopPad / SCREEN_H)
        );
        const desiredY = visibleRatio * 0.42;
        const latOffset = MAP_DELTA * (0.5 - desiredY);
        mapRef.current?.animateToRegion(
          {
            latitude: lat - latOffset,
            longitude: lng,
            latitudeDelta: MAP_DELTA * 0.85,
            longitudeDelta: MAP_DELTA * 0.85,
          },
          220
        );
      };

      (async () => {
        try {
          const cur = await Location.getForegroundPermissionsAsync();
          let status = cur.status;
          if (status !== "granted") {
            const req = await Location.requestForegroundPermissionsAsync();
            status = req.status;
          }
          if (status !== "granted" || cancelled) return;

          // Fast first pin, then refine (Uber-like snappy open).
          try {
            const last = await Location.getLastKnownPositionAsync({
              maxAge: 45_000,
              requiredAccuracy: 80,
            });
            if (!cancelled && last) {
              apply(
                last.coords.latitude,
                last.coords.longitude,
                typeof last.coords.heading === "number" && last.coords.heading >= 0
                  ? last.coords.heading
                  : null,
                true
              );
            }
          } catch {
            /* optional */
          }

          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.BestForNavigation,
          });
          if (!cancelled) {
            apply(
              pos.coords.latitude,
              pos.coords.longitude,
              typeof pos.coords.heading === "number" && pos.coords.heading >= 0
                ? pos.coords.heading
                : null,
              true
            );
          }

          sub = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.BestForNavigation,
              distanceInterval: 8,
              timeInterval: 3_000,
              mayShowUserSettingsDialog: true,
            },
            (loc) => {
              if (cancelled) return;
              const acc = loc.coords.accuracy;
              // Ignore coarse jumps only after we already have a good pin.
              if (
                typeof acc === "number" &&
                acc > 65 &&
                lastFollowFitAtRef.current > 0
              ) {
                return;
              }
              apply(
                loc.coords.latitude,
                loc.coords.longitude,
                typeof loc.coords.heading === "number" && loc.coords.heading >= 0
                  ? loc.coords.heading
                  : null,
                false
              );
            }
          );
          if (cancelled) {
            sub.remove();
            sub = null;
          }
        } catch {
          /* map still usable */
        }
      })();

      return () => {
        cancelled = true;
        sub?.remove();
      };
    }, [sheetTopPad, insets.top])
  );

  const currentStatus = ride ? mapApiStatus(ride.status) : "pending";
  const progressIndex = useMemo(() => {
    if (currentStatus === "stop") return 2;
    if (currentStatus === "pending" || currentStatus === "accepted") return -1;
    const i = PROGRESS.findIndex((p) => p.id === currentStatus);
    return i;
  }, [currentStatus]);

  const stopPeriods = useMemo(
    () => parseStopPeriods(ride?.driverStopPeriodsJson),
    [ride?.driverStopPeriodsJson]
  );

  const timing = useMemo(() => {
    if (!ride) return null;
    const now = Date.now();
    void tick;
    const tripStart = ride.driverOnTheWayAt
      ? Date.parse(ride.driverOnTheWayAt)
      : NaN;
    const totalTripMs = Number.isFinite(tripStart)
      ? (ride.completedAt ? Date.parse(ride.completedAt) : now) - tripStart
      : 0;

    let completedStopMs = 0;
    let currentStopMs = 0;
    for (const p of stopPeriods) {
      const s = Date.parse(p.start);
      if (!Number.isFinite(s)) continue;
      if (p.end) {
        const e = Date.parse(p.end);
        if (Number.isFinite(e)) completedStopMs += Math.max(0, e - s);
      } else if (ride.status === "STOP") {
        currentStopMs = Math.max(0, now - s);
      }
    }

    const arrivedAt = ride.driverArrivedAt ? Date.parse(ride.driverArrivedAt) : NaN;
    const waitingMs =
      ride.status === "ARRIVED" && Number.isFinite(arrivedAt)
        ? Math.max(0, now - arrivedAt)
        : 0;

    return {
      totalTripMs,
      completedStopMs,
      currentStopMs,
      waitingMs,
      stopCount:
        stopPeriods.filter((p) => p.end).length + (ride.status === "STOP" ? 1 : 0),
      hasTripStart: Number.isFinite(tripStart),
    };
  }, [ride, stopPeriods, tick]);

  const freeWaitMin = ride?.freeWaitMinutes ?? 60;
  const waitingMin = timing ? Math.floor(timing.waitingMs / 60_000) : 0;
  const canNoShow =
    ride?.status === "ARRIVED" &&
    !ride.noShowMarkedAt &&
    waitingMin >= freeWaitMin;

  // Route polyline — status/booking change, or driver moved ~120m since last fetch.
  const lastRouteOriginRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastRouteStatusRef = useRef<string | null>(null);

  useEffect(() => {
    lastRouteOriginRef.current = null;
    lastRouteStatusRef.current = null;
    setRouteCoords([]);
  }, [id]);

  useEffect(() => {
    if (!ride) return;
    const towardDropoff =
      ride.status === "CIC" || ride.status === "STOP" || ride.status === "DONE";
    const destination = towardDropoff
      ? ride.dropoffLocation
      : ride.pickupLocation;
    if (!destination?.trim()) return;

    const statusChanged = lastRouteStatusRef.current !== ride.status;
    if (myCoords && !statusChanged) {
      const prev = lastRouteOriginRef.current;
      if (prev) {
        const moved =
          Math.abs(prev.lat - myCoords.lat) > 0.0011 ||
          Math.abs(prev.lng - myCoords.lng) > 0.0011;
        if (!moved) return;
      }
    }

    const origin = myCoords
      ? `${myCoords.lat},${myCoords.lng}`
      : ride.pickupLocation;
    if (!origin?.trim()) return;

    const ac = new AbortController();
    const t = setTimeout(() => {
      void (async () => {
        const fallbackLine = (): { latitude: number; longitude: number }[] => {
          const a = myCoords
            ? { latitude: myCoords.lat, longitude: myCoords.lng }
            : typeof ride.pickupLat === "number" &&
                typeof ride.pickupLng === "number"
              ? { latitude: ride.pickupLat, longitude: ride.pickupLng }
              : null;
          const b = towardDropoff
            ? typeof ride.dropoffLat === "number" &&
              typeof ride.dropoffLng === "number"
              ? { latitude: ride.dropoffLat, longitude: ride.dropoffLng }
              : null
            : typeof ride.pickupLat === "number" &&
                typeof ride.pickupLng === "number"
              ? { latitude: ride.pickupLat, longitude: ride.pickupLng }
              : null;
          return a && b ? [a, b] : [];
        };

        try {
          const dir = await fetchDirectionsSummary(
            {
              origin,
              destination,
              waypoints: towardDropoff ? parseAppStops(ride.stops) : undefined,
              avoidTolls: false,
            },
            ac.signal
          );
          if (ac.signal.aborted) return;
          lastRouteStatusRef.current = ride.status;
          if (myCoords) lastRouteOriginRef.current = { lat: myCoords.lat, lng: myCoords.lng };
          const decoded = dir.polyline ? decodePolyline(dir.polyline) : [];
          setRouteCoords(decoded.length >= 2 ? decoded : fallbackLine());
        } catch {
          if (!ac.signal.aborted) setRouteCoords(fallbackLine());
        }
      })();
    }, 500);

    return () => {
      ac.abort();
      clearTimeout(t);
    };
  }, [
    ride?.bookingId,
    ride?.status,
    ride?.pickupLocation,
    ride?.dropoffLocation,
    ride?.stops,
    ride?.pickupLat,
    ride?.pickupLng,
    ride?.dropoffLat,
    ride?.dropoffLng,
    myCoords?.lat,
    myCoords?.lng,
  ]);

  const runStatusUpdate = async (apiStatus: string) => {
    if (!ride || isUpdating) return;
    // Idempotent: already there
    if (ride.status === apiStatus) return;

    const prev = ride;
    // Optimistic UI — slide feels instant; reconcile from server after.
    setRide({ ...ride, status: apiStatus });
    setIsUpdating(true);
    try {
      const result = await updateRideStatus(ride.bookingId, apiStatus);
      if (result.success) {
        await refreshRide();
        syncDriverLiveTracking().catch(() => {});
        if (apiStatus === "DONE") {
          void dismissPresentedForEntity({ bookingId: ride.bookingId });
          Alert.alert("Ride complete", "This ride has been marked as done.", [
            { text: "OK", onPress: () => router.back() },
          ]);
        }
      } else {
        setRide(prev);
        Alert.alert("Error", "Failed to update status");
      }
    } catch {
      setRide(prev);
      Alert.alert("Error", "Something went wrong");
    } finally {
      setIsUpdating(false);
    }
  };

  const onPrimarySlide = () => {
    if (!ride || isUpdating) return;
    if (ride.status === "STOP") {
      void runStatusUpdate("CIC");
      return;
    }
    if (ride.status === "PENDING" || ride.status === "ACCEPTED") {
      void runStatusUpdate("ON THE WAY");
      return;
    }
    if (ride.status === "ON THE WAY") {
      void runStatusUpdate("ARRIVED");
      return;
    }
    if (ride.status === "ARRIVED") {
      void runStatusUpdate("CIC");
      return;
    }
    if (ride.status === "CIC") {
      void runStatusUpdate("DONE");
    }
  };

  const slideLabel = (() => {
    switch (ride?.status) {
      case "PENDING":
      case "ACCEPTED":
        return "Slide · I'm on the way";
      case "ON THE WAY":
        return "Slide · I've arrived";
      case "ARRIVED":
        return "Slide · Start trip";
      case "CIC":
        return "Slide · End trip";
      case "STOP":
        return "Slide · Continue trip";
      default:
        return "";
    }
  })();

  const showNavigate =
    ride?.status === "ON THE WAY" ||
    ride?.status === "CIC" ||
    ride?.status === "STOP";

  const navTarget = useMemo(() => {
    if (!ride) return null;
    if (ride.status === "CIC" || ride.status === "STOP") {
      if (
        typeof ride.dropoffLat === "number" &&
        typeof ride.dropoffLng === "number"
      ) {
        return {
          lat: ride.dropoffLat,
          lng: ride.dropoffLng,
          label: shortLoc(ride.dropoffLocation),
        };
      }
      return { address: ride.dropoffLocation, label: shortLoc(ride.dropoffLocation) };
    }
    if (
      typeof ride.pickupLat === "number" &&
      typeof ride.pickupLng === "number"
    ) {
      return {
        lat: ride.pickupLat,
        lng: ride.pickupLng,
        label: shortLoc(ride.pickupLocation),
      };
    }
    return { address: ride.pickupLocation, label: shortLoc(ride.pickupLocation) };
  }, [ride]);

  const openNav = () => {
    if (!navTarget) return;
    if ("lat" in navTarget && typeof navTarget.lat === "number") {
      openNavigationTo({
        lat: navTarget.lat,
        lng: navTarget.lng,
        label: navTarget.label,
      });
    } else if ("address" in navTarget && navTarget.address) {
      openNavigationTo({ address: navTarget.address, label: navTarget.label });
    }
  };

  const callCustomer = () => {
    const digits = (ride?.phone || "").replace(/[^\d+]/g, "");
    if (!digits) return;
    Linking.openURL(`tel:${digits}`).catch(() => {});
  };

  const openChat = () => {
    if (!ride) return;
    router.push({
      pathname: "/driver/chat",
      params: { bookingId: ride.bookingId },
    });
  };

  const sendQuick = async (text: string) => {
    if (!ride || chipBusy) return;
    setChipBusy(text);
    try {
      await sendDriverChatMessage(ride.bookingId, text);
    } catch (e) {
      Alert.alert(
        "Couldn’t send",
        e instanceof Error ? e.message : "Try again from chat"
      );
    } finally {
      setChipBusy(null);
    }
  };

  const onNoShow = () => {
    if (!ride || !canNoShow) {
      const left = Math.max(0, freeWaitMin - waitingMin);
      Alert.alert(
        "No-show unavailable",
        left > 0
          ? `Free wait is still active. You can mark no-show in about ${left} min.`
          : "No-show is not available for this trip."
      );
      return;
    }
    Alert.alert(
      "Mark no-show?",
      "The rider will be marked no-show and prepaid fare is retained per policy.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark no-show",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setIsUpdating(true);
              try {
                const res = await markDriverNoShow(ride.bookingId);
                if (res.success) {
                  void dismissPresentedForEntity({ bookingId: ride.bookingId });
                  Alert.alert("No-show recorded", "This trip is closed.", [
                    { text: "OK", onPress: () => router.back() },
                  ]);
                } else {
                  Alert.alert("Error", res.error || "Could not mark no-show");
                }
              } catch (e) {
                Alert.alert(
                  "Error",
                  e instanceof Error ? e.message : "Could not mark no-show"
                );
              } finally {
                setIsUpdating(false);
              }
            })();
          },
        },
      ]
    );
  };

  const onAddStop = () => {
    if (!ride || ride.status !== "CIC" || isUpdating) return;
    Alert.alert("Start mid-trip stop", "A stop timer will run until you resume.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Start stop",
        style: "destructive",
        onPress: () => void runStatusUpdate("STOP"),
      },
    ]);
  };

  const unlockFollow = () => {
    mapFollowRef.current = false;
    setMapFollow(false);
  };

  const recenter = () => {
    mapFollowRef.current = true;
    setMapFollow(true);
    lastFollowFitAtRef.current = 0;
    fitTripCamera(mapRef.current, {
      driver: myCoords,
      dest: destCoordRef.current,
      route: routeCoordsRef.current,
      visibleMapH: sheetTopPad,
      topInset: insets.top,
      animated: true,
    });
    lastFollowFitAtRef.current = Date.now();
  };

  const sheetBg = isDark ? palette.surfaceElevated : "#FFFFFF";
  const chipBg = palette.metaChipBg;
  const title =
    currentStatus === "on_the_way"
      ? "On the way"
      : currentStatus === "arrived"
        ? "Arrived"
        : currentStatus === "customer_in_car"
          ? "Customer in car"
          : currentStatus === "stop"
            ? "Mid-trip stop"
            : currentStatus === "done"
              ? "Completed"
              : "Ready to start";

  const subtitle = (() => {
    if (!ride) return "";
    if (currentStatus === "on_the_way") {
      return `Heading to pickup · ${ride.serviceDate} · ${ride.serviceTime}`;
    }
    if (currentStatus === "arrived") {
      return `Waiting for ${ride.customerName.split(" ")[0] || "rider"} · Rider notified`;
    }
    if (currentStatus === "customer_in_car" || currentStatus === "stop") {
      return `Heading to ${shortLoc(ride.dropoffLocation)}`;
    }
    if (currentStatus === "accepted" || currentStatus === "pending") {
      return `${ride.serviceDate} · ${ride.serviceTime}`;
    }
    return "";
  })();

  const liveTimer = timing?.hasTripStart
    ? formatDuration(timing.totalTripMs)
    : "0:00";

  const destCoord = useMemo(() => {
    if (!ride) return null;
    const towardDrop =
      ride.status === "CIC" || ride.status === "STOP" || ride.status === "DONE";
    if (towardDrop) {
      if (
        typeof ride.dropoffLat === "number" &&
        typeof ride.dropoffLng === "number"
      ) {
        return {
          latitude: ride.dropoffLat,
          longitude: ride.dropoffLng,
          label: `Drop-off · ${shortLoc(ride.dropoffLocation)}`,
          kind: "drop" as const,
        };
      }
      return null;
    }
    if (
      typeof ride.pickupLat === "number" &&
      typeof ride.pickupLng === "number"
    ) {
      return {
        latitude: ride.pickupLat,
        longitude: ride.pickupLng,
        label: `Pickup · ${shortLoc(ride.pickupLocation)}`,
        kind: "pick" as const,
      };
    }
    return null;
  }, [ride]);

  useEffect(() => {
    destCoordRef.current = destCoord
      ? { latitude: destCoord.latitude, longitude: destCoord.longitude }
      : null;
  }, [destCoord]);

  useEffect(() => {
    routeCoordsRef.current = routeCoords;
    // Re-frame when a new route arrives.
    if (!mapFollowRef.current) return;
    lastFollowFitAtRef.current = Date.now();
    fitTripCamera(mapRef.current, {
      driver: myCoords,
      dest: destCoordRef.current,
      route: routeCoords,
      visibleMapH: sheetTopPad,
      topInset: insets.top,
      animated: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on route geometry change
  }, [routeCoords, sheetTopPad, insets.top]);

  const mapLat = myCoords?.lat ?? destCoord?.latitude ?? 43.6532;
  const mapLng = myCoords?.lng ?? destCoord?.longitude ?? -79.3832;

  const isParcel = ride ? isParcelServiceType(ride.serviceType) : false;
  const parcel = ride ? parseParcelRequirements(ride.specialRequirements) : null;
  const chips = ride ? preferenceChips(ride) : [];
  const quickChips = ride
    ? ["I'm here", "At arrivals door", ride.vehicle || "Black Sedan"].filter(
        Boolean
      )
    : [];

  if (isLoading) {
    return (
      <View style={[styles.loadingRoot, { backgroundColor: palette.root }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <SlimSpinner size={34} stroke={2} color={GOLD} />
      </View>
    );
  }

  if (!ride) {
    return (
      <View style={[styles.loadingRoot, { backgroundColor: palette.root }]}>
        <Text style={{ color: palette.text }}>Ride not found</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: GOLD, fontWeight: "700" }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: palette.root }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={MAP_PROVIDER}
        initialRegion={{
          latitude: mapLat,
          longitude: mapLng,
          latitudeDelta: MAP_DELTA,
          longitudeDelta: MAP_DELTA,
        }}
        scrollEnabled
        zoomEnabled
        rotateEnabled={false}
        pitchEnabled={false}
        showsCompass={false}
        showsScale={false}
        showsTraffic
        showsBuildings
        showsIndoors={false}
        showsMyLocationButton={false}
        showsUserLocation={false}
        toolbarEnabled={false}
        loadingEnabled
        moveOnMarkerPress={false}
        userInterfaceStyle={isDark ? "dark" : "light"}
        onMapReady={() => {
          if (!mapFollowRef.current) return;
          lastFollowFitAtRef.current = Date.now();
          fitTripCamera(mapRef.current, {
            driver: myCoords,
            dest: destCoordRef.current,
            route: routeCoordsRef.current,
            visibleMapH: sheetTopPad,
            topInset: insets.top,
            animated: false,
          });
        }}
        onPanDrag={unlockFollow}
        onRegionChangeComplete={(_r, d) => {
          if (d?.isGesture) unlockFollow();
        }}
      >
        {routeCoords.length >= 2 ? (
          <>
            {/* Uber-style route: light casing + dark stroke */}
            <Polyline
              coordinates={routeCoords}
              strokeColor="rgba(255,255,255,0.92)"
              strokeWidth={8}
              geodesic
              lineJoin="round"
              lineCap="round"
              zIndex={1}
            />
            <Polyline
              coordinates={routeCoords}
              strokeColor={DRIVER_PRIMARY_INK}
              strokeWidth={4.5}
              geodesic
              lineJoin="round"
              lineCap="round"
              zIndex={2}
            />
          </>
        ) : null}

        {destCoord ? (
          <Marker
            coordinate={{
              latitude: destCoord.latitude,
              longitude: destCoord.longitude,
            }}
            anchor={{ x: 0.5, y: destCoord.kind === "pick" ? 0.5 : 0.5 }}
            tracksViewChanges={false}
          >
            <View style={styles.destWrap}>
              <View
                style={[
                  destCoord.kind === "pick" ? styles.pickDot : styles.dropSquare,
                ]}
              />
              <View style={styles.destLabel}>
                <Text style={styles.destLabelText} numberOfLines={1}>
                  {destCoord.label}
                </Text>
              </View>
            </View>
          </Marker>
        ) : null}

        {myCoords ? (
          <Marker
            coordinate={{ latitude: myCoords.lat, longitude: myCoords.lng }}
            anchor={{ x: 0.5, y: 0.5 }}
            flat={typeof myCoords.heading === "number"}
            rotation={
              typeof myCoords.heading === "number" &&
              Number.isFinite(myCoords.heading) &&
              myCoords.heading >= 0
                ? myCoords.heading
                : 0
            }
            tracksViewChanges={trackCarMarker}
          >
            <View style={styles.carWrap} pointerEvents="none">
              <Animated.View
                style={[
                  styles.carHalo,
                  {
                    opacity: mapPulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.4, 0.08],
                    }),
                    transform: [
                      {
                        scale: mapPulse.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.5],
                        }),
                      },
                    ],
                  },
                ]}
              />
              <View style={styles.carPin}>
                <Ionicons name="car" size={14} color="#fff" />
              </View>
            </View>
          </Marker>
        ) : null}
      </MapView>

      {/* Overlays */}
      <View
        style={[styles.overlayRow, { paddingTop: insets.top + 8 }]}
        pointerEvents="box-none"
      >
        <Pressable
          onPress={() => router.back()}
          style={styles.roundBtn}
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={22} color={DRIVER_PRIMARY_INK} />
        </Pressable>

        <View style={styles.livePill}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
          <Text style={styles.liveSep}>|</Text>
          <Text style={styles.liveTimer}>{liveTimer}</Text>
        </View>

        <Pressable
          onPress={recenter}
          style={styles.roundBtn}
          accessibilityLabel="Recenter on trip"
        >
          <Ionicons name="locate" size={20} color={DRIVER_PRIMARY_INK} />
        </Pressable>
      </View>

      {showNavigate ? (
        <Pressable
          onPress={openNav}
          style={[styles.navigateFab, { bottom: SCREEN_H - sheetTopPad + 12 }]}
          accessibilityLabel="Navigate"
        >
          <Ionicons name="navigate" size={16} color={GOLD} />
          <Text style={styles.navigateText}>Navigate</Text>
        </Pressable>
      ) : null}

      {!mapFollow && myCoords ? (
        <Pressable
          onPress={recenter}
          style={[styles.locateFab, { top: insets.top + 58 }]}
        >
          <Ionicons name="locate" size={20} color={GOLD} />
        </Pressable>
      ) : null}

      {/* Sheet */}
      <View style={[styles.sheetCol, { paddingTop: sheetTopPad }]} pointerEvents="box-none">
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: sheetBg,
              paddingBottom: Math.max(insets.bottom, 12) + 8,
            },
          ]}
        >
          <View style={styles.handleWrap}>
            <View style={[styles.handle, { backgroundColor: "rgba(28,25,22,0.18)" }]} />
          </View>

          {openedFromStaleNotification ? (
            <Text style={[styles.staleHint, { color: palette.muted }]}>
              Opened from a notification — status may have updated.
            </Text>
          ) : null}

          <View style={styles.titleRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
              <Text style={[styles.subtitle, { color: palette.muted }]} numberOfLines={2}>
                {subtitle}
              </Text>
            </View>
            {ride.status === "ARRIVED" && timing ? (
              <View style={styles.waitingBadge}>
                <Text style={styles.waitingLabel}>WAITING</Text>
                <Text style={styles.waitingTime}>
                  {formatDuration(timing.waitingMs)}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Progress */}
          <View style={styles.progressRow}>
            {PROGRESS.map((step, i) => {
              const filled =
                progressIndex > i ||
                (progressIndex === i && currentStatus !== "done") ||
                currentStatus === "done";
              const current = progressIndex === i && currentStatus !== "done";
              return (
                <View key={step.id} style={styles.progressCol}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        backgroundColor: filled
                          ? DRIVER_PRIMARY_INK
                          : isDark
                            ? "rgba(255,255,255,0.12)"
                            : "#E8E2D8",
                      },
                      current && { backgroundColor: GOLD },
                    ]}
                  />
                  <Text
                    style={[
                      styles.progressLabel,
                      {
                        color: current || filled ? palette.text : palette.muted,
                        fontWeight: current ? "800" : "500",
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {step.label}
                  </Text>
                </View>
              );
            })}
          </View>

          <ScrollView
            style={styles.sheetScroll}
            contentContainerStyle={styles.sheetScrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {ride.status === "STOP" ? (
              <View style={styles.stopBanner}>
                <Ionicons name="pause-circle" size={18} color="#B45309" />
                <Text style={styles.stopBannerText}>
                  Stopped · {formatDuration(timing?.currentStopMs || 0)}
                </Text>
              </View>
            ) : null}

            {(ride.status === "CIC" || ride.status === "STOP") && timing ? (
              <View style={[styles.metrics, { borderColor: palette.border }]}>
                <View style={styles.metricCell}>
                  <Text style={[styles.metricLabel, { color: palette.muted }]}>
                    TRIP TIME
                  </Text>
                  <Text style={[styles.metricValue, { color: palette.text }]}>
                    {formatDuration(timing.totalTripMs)}
                  </Text>
                </View>
                <View style={styles.metricCell}>
                  <Text style={[styles.metricLabel, { color: palette.muted }]}>
                    STOPPED
                  </Text>
                  <Text style={[styles.metricValue, { color: palette.text }]}>
                    {formatDuration(
                      timing.completedStopMs + timing.currentStopMs
                    )}
                  </Text>
                </View>
                <View style={styles.metricCell}>
                  <Text style={[styles.metricLabel, { color: palette.muted }]}>
                    STOPS
                  </Text>
                  <Text style={[styles.metricValue, { color: palette.text }]}>
                    {timing.stopCount}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Customer */}
            <View style={styles.customerRow}>
              <View style={[styles.avatar, { backgroundColor: DRIVER_PRIMARY_INK }]}>
                <Text style={styles.avatarLetter}>
                  {initialOf(ride.customerName)}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.customerName, { color: palette.text }]} numberOfLines={1}>
                  {ride.customerName}
                </Text>
                <Text style={[styles.customerMeta, { color: palette.muted }]} numberOfLines={1}>
                  {isParcel
                    ? `Parcel${parcel?.recipientName ? ` · ${parcel.recipientName}` : ""}`
                    : [
                        `${ride.passengers} passenger${ride.passengers === 1 ? "" : "s"}`,
                        ride.vehicle,
                        ride.childSeats > 0
                          ? `${ride.childSeats} child seat${ride.childSeats === 1 ? "" : "s"}`
                          : null,
                        chips[0],
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                </Text>
              </View>
              {ride.status === "CIC" ? (
                <View style={styles.iconPair}>
                  <Pressable
                    onPress={openChat}
                    style={[styles.iconBtn, { backgroundColor: chipBg }]}
                  >
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={18}
                      color={palette.text}
                    />
                    {chatUnread > 0 ? (
                      <View style={styles.unreadDot}>
                        <Text style={styles.unreadText}>
                          {chatUnread > 9 ? "9+" : chatUnread}
                        </Text>
                      </View>
                    ) : null}
                  </Pressable>
                  <Pressable
                    onPress={onAddStop}
                    style={[styles.addStopBtn, { backgroundColor: chipBg }]}
                  >
                    <Text style={[styles.addStopText, { color: palette.text }]}>
                      + Add stop
                    </Text>
                  </Pressable>
                </View>
              ) : ride.status === "DONE" || ride.status === "NO_SHOW" ? null : (
                <View style={styles.iconPair}>
                  <Pressable
                    onPress={openChat}
                    style={[styles.iconBtn, { backgroundColor: chipBg }]}
                  >
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={18}
                      color={palette.text}
                    />
                    {chatUnread > 0 ? (
                      <View style={styles.unreadDot}>
                        <Text style={styles.unreadText}>
                          {chatUnread > 9 ? "9+" : chatUnread}
                        </Text>
                      </View>
                    ) : null}
                  </Pressable>
                  {ride.phone ? (
                    <Pressable
                      onPress={callCustomer}
                      style={[styles.iconBtn, { backgroundColor: chipBg }]}
                    >
                      <Ionicons name="call-outline" size={18} color={palette.text} />
                    </Pressable>
                  ) : null}
                </View>
              )}
            </View>

            {/* OTW preference chips */}
            {ride.status === "ON THE WAY" && chips.length > 0 ? (
              <View style={styles.chipRow}>
                {chips.map((c) => (
                  <View
                    key={c}
                    style={[
                      styles.prefChip,
                      {
                        backgroundColor:
                          c === "Quiet ride" ? "rgba(212,160,74,0.2)" : chipBg,
                      },
                    ]}
                  >
                    <Text style={[styles.prefChipText, { color: palette.text }]}>
                      {c === "Quiet ride" ? `🔊 ${c}` : c}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {/* Arrived quick messages */}
            {ride.status === "ARRIVED" ? (
              <View style={styles.chipRow}>
                {quickChips.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => void sendQuick(c)}
                    disabled={!!chipBusy}
                    style={[
                      styles.quickChip,
                      { borderColor: palette.border, backgroundColor: sheetBg },
                    ]}
                  >
                    <Text style={[styles.quickChipText, { color: palette.text }]}>
                      {chipBusy === c ? "…" : c}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {ride.status === "ARRIVED" ? (
              <View style={[styles.noShowBox, { backgroundColor: "rgba(212,160,74,0.12)" }]}>
                <Ionicons name="information-circle" size={16} color={GOLD} />
                <Text style={[styles.noShowCopy, { color: palette.metaText }]}>
                  Rider not here? You can mark a no-show after {freeWaitMin} min.
                </Text>
                <Pressable onPress={onNoShow} hitSlop={6}>
                  <Text
                    style={[
                      styles.noShowAction,
                      { opacity: canNoShow ? 1 : 0.45 },
                    ]}
                  >
                    No-show
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {/* Timeline OTW / accepted */}
            {(ride.status === "ON THE WAY" ||
              ride.status === "ACCEPTED" ||
              ride.status === "PENDING") && (
              <View style={styles.timeline}>
                <View style={styles.rail}>
                  <View style={styles.railCircle} />
                  <View style={[styles.railLine, { backgroundColor: palette.routeLine }]} />
                  <View style={[styles.railSquare, { backgroundColor: palette.text }]} />
                </View>
                <View style={{ flex: 1, gap: 14 }}>
                  <View>
                    <Text style={[styles.tlTitle, { color: palette.text }]} numberOfLines={1}>
                      {shortLoc(ride.pickupLocation)}
                    </Text>
                    <Text style={[styles.tlSub, { color: palette.muted }]} numberOfLines={2}>
                      {ride.pickupLocation}
                    </Text>
                  </View>
                  <View>
                    <Text style={[styles.tlTitle, { color: palette.text }]} numberOfLines={1}>
                      {shortLoc(ride.dropoffLocation)}
                    </Text>
                    <Text style={[styles.tlSub, { color: palette.muted }]} numberOfLines={2}>
                      {ride.dropoffLocation}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {ride.status === "DONE" || ride.status === "NO_SHOW" ? (
              <View style={[styles.doneBox, { backgroundColor: chipBg }]}>
                <Text style={[styles.doneTitle, { color: palette.text }]}>
                  {ride.status === "NO_SHOW" ? "Marked no-show" : "Trip completed"}
                </Text>
                {ride.review ? (
                  <Text style={[styles.doneReview, { color: palette.muted }]}>
                    {"★".repeat(Math.max(0, Math.min(5, ride.review.stars)))}{" "}
                    {ride.review.comment?.trim()
                      ? `· ${ride.review.comment.trim()}`
                      : "· Rider review"}
                  </Text>
                ) : (
                  <Text style={[styles.doneReview, { color: palette.muted }]}>
                    You can return to Home for your next offer.
                  </Text>
                )}
                <Pressable
                  onPress={() => router.back()}
                  style={[styles.doneBackBtn, { backgroundColor: DRIVER_PRIMARY_INK }]}
                >
                  <Text style={styles.doneBackText}>Back to Home</Text>
                </Pressable>
              </View>
            ) : null}
          </ScrollView>

          {slideLabel ? (
            <View style={styles.ctaWrap}>
              <SlideToAct
                label={slideLabel}
                onComplete={onPrimarySlide}
                disabled={isUpdating}
                loading={isUpdating}
              />
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loadingRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  overlayRow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
  },
  roundBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#1C1C1E",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: DRIVER_ONLINE_GREEN,
  },
  liveText: { color: "#fff", fontSize: 12, fontWeight: "800", letterSpacing: 0.4 },
  liveSep: { color: "rgba(255,255,255,0.35)", fontWeight: "600" },
  liveTimer: { color: GOLD, fontSize: 13, fontWeight: "800", fontVariant: ["tabular-nums"] },
  navigateFab: {
    position: "absolute",
    right: 14,
    zIndex: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#1C1C1E",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
  },
  navigateText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  locateFab: {
    position: "absolute",
    right: 14,
    zIndex: 22,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)",
  },
  carWrap: { width: 52, height: 52, alignItems: "center", justifyContent: "center" },
  carHalo: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(212,160,74,0.35)",
  },
  carPin: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: DRIVER_PRIMARY_INK,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: GOLD,
  },
  destWrap: { alignItems: "center", maxWidth: 180 },
  pickDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    borderColor: DRIVER_PRIMARY_INK,
    backgroundColor: "#fff",
  },
  dropSquare: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: GOLD,
  },
  destLabel: {
    marginTop: 4,
    backgroundColor: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  destLabelText: {
    fontSize: 11,
    fontWeight: "700",
    color: DRIVER_PRIMARY_INK,
  },
  sheetCol: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 4,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  handleWrap: { alignItems: "center", paddingVertical: 6 },
  handle: { width: 40, height: 4, borderRadius: 2 },
  staleHint: { fontSize: 12, marginBottom: 6 },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
  },
  title: { fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { marginTop: 3, fontSize: 13, fontWeight: "500" },
  waitingBadge: {
    backgroundColor: "rgba(212,160,74,0.22)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
  },
  waitingLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6,
    color: "#7A5A28",
  },
  waitingTime: {
    fontSize: 15,
    fontWeight: "800",
    color: DRIVER_PRIMARY_INK,
    fontVariant: ["tabular-nums"],
  },
  progressRow: { flexDirection: "row", gap: 6, marginBottom: 14 },
  progressCol: { flex: 1, minWidth: 0 },
  progressBar: { height: 4, borderRadius: 2, marginBottom: 6 },
  progressLabel: { fontSize: 10, letterSpacing: -0.2 },
  sheetScroll: { flex: 1 },
  sheetScrollContent: { paddingBottom: 8, gap: 12 },
  stopBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(245,158,11,0.15)",
    padding: 10,
    borderRadius: 12,
  },
  stopBannerText: { fontSize: 13, fontWeight: "700", color: "#92400E" },
  metrics: {
    flexDirection: "row",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingVertical: 12,
  },
  metricCell: { flex: 1, alignItems: "center" },
  metricLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.4 },
  metricValue: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { color: GOLD, fontSize: 18, fontWeight: "800" },
  customerName: { fontSize: 16, fontWeight: "700", letterSpacing: -0.2 },
  customerMeta: { marginTop: 2, fontSize: 12, fontWeight: "500" },
  iconPair: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadDot: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  unreadText: {
    fontSize: 9,
    fontWeight: "800",
    color: DRIVER_PRIMARY_INK,
  },
  addStopBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
  },
  addStopText: { fontSize: 13, fontWeight: "700" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  prefChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  prefChipText: { fontSize: 12, fontWeight: "600" },
  quickChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  quickChipText: { fontSize: 13, fontWeight: "600" },
  noShowBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
  },
  noShowCopy: { flex: 1, fontSize: 12, fontWeight: "500", lineHeight: 16 },
  noShowAction: {
    fontSize: 13,
    fontWeight: "800",
    color: "#9A3412",
  },
  timeline: { flexDirection: "row", gap: 12, marginTop: 4 },
  rail: { width: 14, alignItems: "center", paddingTop: 4 },
  railCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: GOLD,
    backgroundColor: "transparent",
  },
  railLine: { flex: 1, width: 2, marginVertical: 4, minHeight: 28 },
  railSquare: { width: 9, height: 9, borderRadius: 2 },
  tlTitle: { fontSize: 14, fontWeight: "700" },
  tlSub: { marginTop: 2, fontSize: 12, fontWeight: "500" },
  ctaWrap: { paddingTop: 10 },
  doneBox: {
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  doneTitle: { fontSize: 16, fontWeight: "800" },
  doneReview: { fontSize: 13, fontWeight: "500", lineHeight: 18 },
  doneBackBtn: {
    marginTop: 6,
    minHeight: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  doneBackText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
