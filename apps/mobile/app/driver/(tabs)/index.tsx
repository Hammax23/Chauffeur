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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useDriverAuth } from "../../../contexts/DriverAuthContext";
import { useDriverRideAlertOptional } from "../../../contexts/DriverRideAlertContext";
import { useDriverTheme } from "../../../contexts/DriverThemeContext";
import { GOLD, DRIVER_ONLINE_GREEN } from "../../../theme/driver-theme";
import { SlimSpinner } from "../../../components/SlimSpinner";
import { DriverScreenShell } from "../../../components/driver/DriverScreenShell";
import { DriverEmptyState } from "../../../components/driver/DriverEmptyState";
import { DriverOfferCard } from "../../../components/driver/DriverOfferCard";
import { getDriverRides, acceptRide, rejectRide, isDriverConciergeEnrolled, DriverRide } from "../../../services/api";
import { dismissPresentedForEntity } from "../../../services/notification-deep-link";
import { syncDriverLiveTracking, syncLiveTrackingFromRideList } from "../../../services/driver-live-session";
import { openDriverStream, type DriverOfferEvent } from "../../../services/driver-stream";
import { isParcelServiceType } from "../../../utils/parcel";

type TabType = "requests" | "upcoming";

const POLL_INTERVAL = 12_000; // upcoming tab — SSE is primary
const REQUESTS_POLL_HEALTHY_MS = 20_000; // SSE open: light safety net only
const REQUESTS_POLL_DEGRADED_MS = 2_500; // SSE down/reconnecting: stay snappy

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
    specialRequirements: r.specialRequirements,
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
  const [conciergeEnrolled, setConciergeEnrolled] = useState(!!driver?.conciergeEnrolled);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<ReturnType<typeof openDriverStream> | null>(null);
  const isFocusedRef = useRef(true);
  const sseHealthyRef = useRef(false);
  /** Bumps on each fetch so stale in-flight responses cannot wipe fresher SSE state. */
  const fetchGenRef = useRef(0);
  /** bookingId → when SSE added it — preserve through a racing poll for a short window. */
  const ssePendingHoldRef = useRef<Map<string, number>>(new Map());
  const livePulse = useRef(new Animated.Value(0)).current;

  const firstName = useMemo(
    () => driver?.name?.split(" ")[0] || "Driver",
    [driver?.name]
  );

  useEffect(() => {
    if (driver?.conciergeEnrolled === true) setConciergeEnrolled(true);
    else if (driver?.conciergeEnrolled === false) setConciergeEnrolled(false);
  }, [driver?.conciergeEnrolled]);

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

  return (
    <DriverScreenShell>
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
        <View style={styles.header}>
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: palette.softFill,
                borderColor: palette.border,
              },
            ]}
          >
            <Switch
              value={isActive}
              onValueChange={handleToggleActive}
              trackColor={{ false: palette.switchTrackOff, true: DRIVER_ONLINE_GREEN }}
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
          </View>

          <View style={styles.headerRight}>
            {conciergeEnrolled ? (
              <Pressable
                onPress={() => router.push("/driver/concierge")}
                accessibilityLabel="Hotel Concierge"
                style={({ pressed }) => [
                  styles.iconBtn,
                  { backgroundColor: palette.softFill, borderColor: palette.border },
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
                { backgroundColor: palette.softFill, borderColor: palette.border },
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

        <View style={styles.greeting}>
          <Text style={[styles.greetingTitle, { color: palette.text }]}>Hi, {firstName}</Text>
          <Text style={[styles.greetingSubtitle, { color: palette.textSecondary }]}>
            {greetingLine(firstName, isActive)}
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
                <Text style={styles.tabCountText}>{requestCount > 9 ? "9+" : requestCount}</Text>
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
                  ride.total != null && ride.total > 0 ? `$${ride.total.toFixed(0)}` : null
                }
                mode={activeTab === "requests" ? "request" : "upcoming"}
                onReject={() => handleRejectRide(ride.bookingId)}
                onPrimary={() => {
                  if (activeTab === "requests") {
                    handleAcceptRide(ride.bookingId);
                  } else {
                    router.push({
                      pathname: "/driver/ride-details",
                      params: { bookingId: ride.bookingId },
                    });
                  }
                }}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </DriverScreenShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 110,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statusCopy: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#8A8A8E',
  },
  statusDotOn: { backgroundColor: '#34C759' },
  statusText: { fontSize: 13, fontWeight: '700', letterSpacing: -0.1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  avatarRing: { borderRadius: 20, overflow: 'hidden' },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { color: '#1A1208', fontSize: 16, fontWeight: '800' },
  greeting: { marginBottom: 18 },
  greetingTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  greetingSubtitle: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  tabShell: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 11,
  },
  tabActive: {},
  tabText: { fontSize: 14, fontWeight: '600' },
  tabCount: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabCountText: { fontSize: 10, fontWeight: '800', color: '#1A1208' },
  loadingWrap: { alignItems: 'center', paddingVertical: 64 },
  requestsList: { gap: 0 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
});

