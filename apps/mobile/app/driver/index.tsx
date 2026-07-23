import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Image,
  Switch,
  Alert,
  RefreshControl,
  AppState,
  Animated,
  Easing,
  Pressable,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useDriverAuth } from "../../contexts/DriverAuthContext";
import { useDriverRideAlertOptional } from "../../contexts/DriverRideAlertContext";
import { useDriverTheme } from "../../contexts/DriverThemeContext";
import { GOLD } from "../../theme/driver-theme";
import { SlimSpinner } from "../../components/SlimSpinner";
import { getDriverRides, acceptRide, rejectRide, DriverRide } from "../../services/api";
import { syncDriverLiveTracking, syncLiveTrackingFromRideList } from "../../services/driver-live-session";
import { openDriverStream, type DriverOfferEvent } from "../../services/driver-stream";

type TabType = "requests" | "upcoming";

const POLL_INTERVAL = 12_000; // upcoming tab — SSE is primary
const REQUESTS_POLL_HEALTHY_MS = 20_000; // SSE open: light safety net only
const REQUESTS_POLL_DEGRADED_MS = 2_500; // SSE down/reconnecting: stay snappy

function shortLoc(s?: string | null) {
  if (!s?.trim()) return "—";
  const first = s.split(",")[0]?.trim();
  return first || s.trim();
}

function greetingLine(name: string, active: boolean) {
  const h = new Date().getHours();
  const part = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  if (!active) return `${part}, ${name}. You're offline.`;
  return `${part}, ${name}. Ready for the next ride.`;
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
    createdAt: r.createdAt,
    liveOffer: r.liveOffer,
  };
}

export default function DriverDashboard() {
  const { driver, toggleActive, refreshProfile } = useDriverAuth();
  const { palette, isDark, toggleTheme } = useDriverTheme();
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
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<ReturnType<typeof openDriverStream> | null>(null);
  const isFocusedRef = useRef(true);
  const sseHealthyRef = useRef(false);
  /** Bumps on each fetch so stale in-flight responses cannot wipe fresher SSE state. */
  const fetchGenRef = useRef(0);
  /** bookingId → when SSE added it — preserve through a racing poll for a short window. */
  const ssePendingHoldRef = useRef<Map<string, number>>(new Map());
  const livePulse = useRef(new Animated.Value(0)).current;
  const blurIntensity = Platform.OS === "ios" ? 48 : 28;

  const firstName = useMemo(
    () => driver?.name?.split(" ")[0] || "Driver",
    [driver?.name]
  );

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

  // Admin may change name/photo in dashboard — re-fetch profile when this screen is shown
  useFocusEffect(
    useCallback(() => {
      refreshProfile();
      syncDriverLiveTracking().catch(() => {});
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
        // Optimistic remove from requests (SSE also revokes for others)
        setRides((prev) => prev.filter((r) => r.bookingId !== bookingId));
        setRequestCount((c) => Math.max(0, c - 1));
        Alert.alert(
          "Ride accepted",
          "It's now in the Upcoming Rides tab. Open it and tap \"On The Way\" when you head to pickup.",
          [
            { text: "Stay here", style: "cancel" },
            { text: "Open Upcoming", onPress: () => setActiveTab("upcoming") },
          ]
        );
        syncDriverLiveTracking().catch(() => {});
        fetchRides(activeTab);
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

  const handleAcceptRide = (bookingId: string) => {
    Alert.alert(
      "Accept this ride?",
      "It will move from Requests to the Upcoming Rides tab. The trip itself only starts when you tap \"On The Way\" on the ride screen.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Accept", onPress: () => performAcceptRide(bookingId) },
      ]
    );
  };

  const handleRejectRide = (bookingId: string) => {
    Alert.alert("Reject Ride", "Are you sure you want to reject this ride?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Reject",
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
                Alert.alert("Error", "Failed to reject ride");
                fetchRides(activeTab, true);
                return;
              }
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

  return (
    <View style={[styles.root, { backgroundColor: palette.root }]}>
      <StatusBar barStyle={palette.statusBar} backgroundColor={palette.root} />
      <LinearGradient colors={[...palette.bg]} style={StyleSheet.absoluteFill} />
      <View style={styles.ambientGlow} pointerEvents="none">
        <LinearGradient
          colors={[...palette.glow]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.9, y: 0.55 }}
        />
      </View>

      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
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
          {/* Header */}
          <View style={styles.header}>
            <BlurView
              intensity={blurIntensity}
              tint={palette.blurTint}
              style={[styles.statusPill, { borderColor: palette.border }]}
            >
              <Switch
                value={isActive}
                onValueChange={handleToggleActive}
                trackColor={{ false: palette.switchTrackOff, true: "#2E7D4F" }}
                thumbColor="#fff"
                ios_backgroundColor={palette.switchTrackOff}
              />
              <View style={styles.statusCopy}>
                <View style={[styles.statusDot, isActive && styles.statusDotOn]} />
                <Text
                  style={[
                    styles.statusText,
                    { color: palette.muted },
                    isActive && { color: palette.statusOn },
                  ]}
                >
                  {isActive ? "Online" : "Offline"}
                </Text>
              </View>
            </BlurView>

            <View style={styles.headerRight}>
              <Pressable
                onPress={toggleTheme}
                accessibilityLabel={isDark ? "Switch to light mode" : "Switch to dark mode"}
                style={({ pressed }) => [styles.glassCircleWrap, pressed && styles.pressed]}
              >
                <BlurView
                  intensity={blurIntensity}
                  tint={palette.blurTint}
                  style={[styles.glassCircle, { borderColor: palette.glassBorder }]}
                >
                  <Ionicons
                    name={isDark ? "sunny-outline" : "moon-outline"}
                    size={20}
                    color={palette.icon}
                  />
                </BlurView>
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

          {/* Greeting */}
          <View style={styles.greeting}>
            <Text style={styles.greetingEyebrow}>DRIVER HOME</Text>
            <Text style={[styles.greetingTitle, { color: palette.text }]}>Hi, {firstName}</Text>
            <Text style={[styles.greetingSubtitle, { color: palette.textSecondary }]}>
              {greetingLine(firstName, isActive)}
            </Text>
          </View>

          {/* Tabs */}
          <BlurView
            intensity={blurIntensity}
            tint={palette.blurTint}
            style={[styles.tabShell, { borderColor: palette.border }]}
          >
            <Pressable
              style={[
                styles.tab,
                activeTab === "requests" && [styles.tabActive, { backgroundColor: palette.tabActive }],
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
              {requestCount > 0 && activeTab !== "requests" ? (
                <View style={styles.tabCount}>
                  <Text style={styles.tabCountText}>{requestCount > 9 ? "9+" : requestCount}</Text>
                </View>
              ) : null}
            </Pressable>
            <Pressable
              style={[
                styles.tab,
                activeTab === "upcoming" && [styles.tabActive, { backgroundColor: palette.tabActive }],
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
          </BlurView>

          {/* Rides */}
          {isLoading ? (
            <View style={styles.emptyState}>
              <SlimSpinner size={32} stroke={2} />
            </View>
          ) : rides.length === 0 ? (
            <BlurView
              intensity={blurIntensity}
              tint={palette.blurTint}
              style={[styles.emptyCard, { borderColor: palette.border }]}
            >
              <View style={styles.emptyIconWrap}>
                <Ionicons
                  name={activeTab === "requests" ? "car-outline" : "calendar-outline"}
                  size={28}
                  color={GOLD}
                />
              </View>
              <Text style={[styles.emptyTitle, { color: palette.emptyTitle }]}>
                {activeTab === "requests" ? "No requests yet" : "No upcoming rides"}
              </Text>
              <Text style={[styles.emptyText, { color: palette.muted }]}>
                {activeTab === "requests"
                  ? isActive
                    ? "Stay online — new offers will appear here instantly."
                    : "Go online to receive live reservation offers."
                  : "Accepted rides show up here until you complete them."}
              </Text>
            </BlurView>
          ) : (
            <View style={styles.requestsList}>
              {rides.map((ride) => (
                <View key={ride.bookingId || ride.id} style={styles.rideCardWrap}>
                  <BlurView
                    intensity={Platform.OS === "ios" ? 36 : 22}
                    tint={palette.blurTint}
                    style={[
                      styles.rideCard,
                      {
                        borderColor: palette.border,
                        backgroundColor: Platform.OS === "android" ? palette.cardAndroid : "transparent",
                      },
                    ]}
                  >
                    <View style={styles.customerRow}>
                      <View style={[styles.customerAvatar, { backgroundColor: palette.avatarBg, borderColor: palette.border }]}>
                        <Ionicons name="person" size={20} color={palette.avatarIcon} />
                      </View>
                      <View style={styles.customerInfo}>
                        <View style={styles.nameRow}>
                          <Text style={[styles.customerName, { color: palette.text }]} numberOfLines={1}>
                            {ride.customerName}
                          </Text>
                          {activeTab === "requests" && (
                            <View style={[styles.newBadge, ride.liveOffer && styles.liveBadge]}>
                              {ride.liveOffer ? (
                                <Animated.View
                                  style={[
                                    styles.livePulseRing,
                                    {
                                      opacity: livePulse.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0.35, 0],
                                      }),
                                      transform: [
                                        {
                                          scale: livePulse.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [1, 1.85],
                                          }),
                                        },
                                      ],
                                    },
                                  ]}
                                />
                              ) : null}
                              <View style={[styles.liveDot, !ride.liveOffer && styles.newDot]} />
                              <Text style={[styles.newBadgeText, ride.liveOffer && styles.liveBadgeText]}>
                                {ride.liveOffer ? "LIVE" : "NEW"}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.customerPhone, { color: palette.muted }]}>{ride.phone}</Text>
                      </View>
                    </View>

                    <View style={styles.metaRow}>
                      <View
                        style={[
                          styles.metaChip,
                          { backgroundColor: palette.metaChipBg, borderColor: palette.border },
                        ]}
                      >
                        <Ionicons name="calendar-outline" size={13} color={GOLD} />
                        <Text style={[styles.metaChipText, { color: palette.metaText }]}>
                          {ride.serviceDate} · {ride.serviceTime}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.metaChip,
                          { backgroundColor: palette.metaChipBg, borderColor: palette.border },
                        ]}
                      >
                        <Ionicons name="people-outline" size={13} color={GOLD} />
                        <Text style={[styles.metaChipText, { color: palette.metaText }]}>
                          {ride.passengers} pax
                        </Text>
                      </View>
                      {ride.vehicle ? (
                        <View
                          style={[
                            styles.metaChip,
                            { backgroundColor: palette.metaChipBg, borderColor: palette.border },
                          ]}
                        >
                          <Ionicons name="car-sport-outline" size={13} color={GOLD} />
                          <Text style={[styles.metaChipText, { color: palette.metaText }]} numberOfLines={1}>
                            {ride.vehicle}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <Text style={styles.bookingId}>{ride.bookingId}</Text>

                    <View
                      style={[
                        styles.routeCard,
                        { backgroundColor: palette.routeBg, borderColor: palette.border },
                      ]}
                    >
                      <View style={styles.routeRail}>
                        <View style={[styles.routeDot, styles.pickupDot]} />
                        <View style={[styles.routeLine, { backgroundColor: palette.routeLine }]} />
                        <View style={[styles.routeDot, styles.dropoffDot]} />
                      </View>
                      <View style={styles.routeCopy}>
                        <View style={styles.routeBlock}>
                          <Text style={[styles.routeLabel, { color: palette.muted }]}>PICKUP</Text>
                          <Text style={[styles.locationText, { color: palette.location }]} numberOfLines={2}>
                            {shortLoc(ride.pickupLocation)}
                          </Text>
                        </View>
                        <View style={styles.routeBlock}>
                          <Text style={[styles.routeLabel, { color: palette.muted }]}>DROPOFF</Text>
                          <Text style={[styles.locationText, { color: palette.location }]} numberOfLines={2}>
                            {shortLoc(ride.dropoffLocation)}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {activeTab === "requests" ? (
                      <View
                        style={[
                          styles.acceptHintBox,
                          { backgroundColor: palette.hintBg, borderColor: palette.hintBorder },
                        ]}
                      >
                        <Ionicons name="sparkles-outline" size={15} color={GOLD} />
                        <Text style={[styles.acceptHintText, { color: palette.hintText }]}>
                          Accept moves this to{" "}
                          <Text style={[styles.acceptHintBold, { color: palette.hintBold }]}>Upcoming</Text>.
                          Start the trip there with{" "}
                          <Text style={[styles.acceptHintBold, { color: palette.hintBold }]}>On The Way</Text>.
                        </Text>
                      </View>
                    ) : null}

                    <View style={styles.actionButtons}>
                      <Pressable
                        onPress={() => handleRejectRide(ride.bookingId)}
                        style={({ pressed }) => [
                          styles.rejectButton,
                          {
                            borderColor: palette.rejectBorder,
                            backgroundColor: palette.rejectBg,
                          },
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text style={[styles.rejectButtonText, { color: palette.rejectText }]}>
                          {activeTab === "requests" ? "Reject" : "Cancel"}
                        </Text>
                      </Pressable>
                      {activeTab === "requests" ? (
                        <Pressable
                          onPress={() => handleAcceptRide(ride.bookingId)}
                          style={({ pressed }) => [styles.acceptButton, pressed && styles.pressed]}
                        >
                          <LinearGradient
                            colors={["#E8C078", GOLD, "#B8862E"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.acceptGradient}
                          >
                            <Text style={styles.acceptButtonText}>Accept</Text>
                            <Ionicons name="checkmark" size={16} color="#1A1208" />
                          </LinearGradient>
                        </Pressable>
                      ) : (
                        <Pressable
                          onPress={() =>
                            router.push({
                              pathname: "/driver/ride-details",
                              params: { bookingId: ride.bookingId },
                            })
                          }
                          style={({ pressed }) => [styles.acceptButton, pressed && styles.pressed]}
                        >
                          <LinearGradient
                            colors={["#E8C078", GOLD, "#B8862E"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.acceptGradient}
                          >
                            <Text style={styles.acceptButtonText}>Open Ride</Text>
                            <Ionicons name="arrow-forward" size={15} color="#1A1208" />
                          </LinearGradient>
                        </Pressable>
                      )}
                    </View>
                  </BlurView>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  ambientGlow: {
    position: "absolute",
    top: -40,
    left: -20,
    right: -20,
    height: 280,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 48,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 22,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
  },
  statusCopy: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingRight: 4,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#636366",
  },
  statusDotOn: {
    backgroundColor: "#34C759",
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  glassCircleWrap: {
    borderRadius: 22,
  },
  glassCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  avatarRing: {
    width: 46,
    height: 46,
    borderRadius: 23,
    padding: 2,
    borderWidth: 1.5,
    borderColor: GOLD,
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  greeting: {
    marginBottom: 20,
  },
  greetingEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: GOLD,
    letterSpacing: 1.6,
    marginBottom: 6,
  },
  greetingTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "#F5F5F7",
    letterSpacing: -0.6,
    marginBottom: 6,
  },
  greetingSubtitle: {
    fontSize: 15,
    lineHeight: 21,
  },
  tabShell: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 18,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  tabActive: {},
  tabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  tabTextActive: {},
  tabCount: {
    backgroundColor: "#FF453A",
    borderRadius: 8,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  tabCountText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  requestsList: {
    gap: 14,
  },
  rideCardWrap: {
    borderRadius: 22,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.35,
        shadowRadius: 18,
      },
      android: { elevation: 8 },
    }),
  },
  rideCard: {
    borderRadius: 22,
    overflow: "hidden",
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: Platform.OS === "android" ? "rgba(28,28,30,0.92)" : "transparent",
  },
  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  customerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginRight: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.1)",
  },
  customerInfo: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  customerName: {
    flexShrink: 1,
    fontSize: 17,
    fontWeight: "700",
    color: "#F5F5F7",
    letterSpacing: -0.2,
  },
  newBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(245,166,35,0.16)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(245,166,35,0.45)",
    overflow: "visible",
  },
  liveBadge: {
    backgroundColor: "rgba(52,199,89,0.14)",
    borderColor: "rgba(52,199,89,0.45)",
  },
  livePulseRing: {
    position: "absolute",
    left: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#34C759",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#34C759",
  },
  newDot: {
    backgroundColor: "#F5A623",
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#F5A623",
    letterSpacing: 0.4,
  },
  liveBadgeText: {
    color: "#34C759",
  },
  customerPhone: {
    fontSize: 13,
    marginTop: 3,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.08)",
    maxWidth: "100%",
  },
  metaChipText: {
    fontSize: 12,
    color: "#E5E5EA",
    fontWeight: "500",
  },
  bookingId: {
    fontSize: 12,
    color: GOLD,
    fontWeight: "600",
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  routeCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "rgba(0,0,0,0.28)",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.06)",
  },
  routeRail: {
    width: 14,
    alignItems: "center",
    paddingTop: 4,
    paddingBottom: 4,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pickupDot: {
    backgroundColor: "#34C759",
  },
  dropoffDot: {
    backgroundColor: "#FF453A",
  },
  routeLine: {
    flex: 1,
    width: 2,
    backgroundColor: "rgba(255,255,255,0.18)",
    marginVertical: 4,
    borderRadius: 1,
  },
  routeCopy: {
    flex: 1,
    gap: 14,
  },
  routeBlock: {
    gap: 3,
  },
  routeLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.1,
  },
  locationText: {
    fontSize: 14,
    color: "#F2F2F7",
    lineHeight: 19,
    fontWeight: "500",
  },
  acceptHintBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(212,160,74,0.1)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(212,160,74,0.28)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  acceptHintText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: "#D8C4A0",
  },
  acceptHintBold: {
    fontWeight: "700",
    color: "#F0E0C0",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 10,
  },
  rejectButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F5F5F7",
  },
  acceptButton: {
    flex: 1.15,
    borderRadius: 14,
    overflow: "hidden",
  },
  acceptGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1208",
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 64,
  },
  emptyCard: {
    alignItems: "center",
    paddingVertical: 36,
    paddingHorizontal: 24,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.1)",
    gap: 10,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(212,160,74,0.14)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#F5F5F7",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
