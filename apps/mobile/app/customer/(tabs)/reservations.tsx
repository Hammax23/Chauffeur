import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  RefreshControl,
  Pressable,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getReservations, cancelReservation, Reservation } from "../../../services/api";
import { useAuth } from "../../../contexts/AuthContext";
import { useCustomerTheme } from "../../../contexts/CustomerThemeContext";
import { useCustomerReservationsStream } from "../../../hooks/useCustomerReservationsStream";
import type { ReservationLiveData, ReservationLiveEvent } from "../../../services/reservation-stream";
import { SlimSpinner } from "../../../components/SlimSpinner";
import {
  CancelRideSheet,
  type CancelReason,
} from "../../../components/CancelRideSheet";
import { GOLD } from "../../../theme/driver-theme";
import { isParcelServiceType } from "../../../utils/parcel";

/** Active trips only — History holds DONE / cancelled. */
const ACTIVE_STATUSES = new Set([
  "PENDING",
  "ACCEPTED",
  "ON THE WAY",
  "ARRIVED",
  "CIC",
  "STOP",
]);

function shortLoc(s?: string | null) {
  if (!s?.trim()) return "—";
  return s.split(",")[0]?.trim() || s.trim();
}

function mergeLiveIntoReservation(prev: Reservation, live: ReservationLiveData): Reservation {
  const status = live.status;
  const historyLocked =
    status === "DONE" || status === "CANCELLED" || status === "CANCELED";
  const driver = live.driver
    ? {
        name: live.driver.name,
        phone: historyLocked ? null : live.driver.phone,
        photo: live.driver.photo,
        vehicle: live.driver.vehicle ?? "",
        vehiclePlate: live.driver.vehiclePlate ?? "",
        rating: live.driver.rating ?? 0,
      }
    : null;
  const nextDriver = driver
    ? driver
    : prev.driver && historyLocked
      ? { ...prev.driver, phone: null }
      : null;
  return {
    ...prev,
    status,
    statusUpdatedAt: live.statusUpdatedAt ?? prev.statusUpdatedAt,
    completedAt: live.completedAt ?? prev.completedAt,
    driver: nextDriver,
    canReview:
      status === "DONE" && !!nextDriver && !prev.review
        ? true
        : status === "DONE" && !!prev.review
          ? false
          : prev.canReview,
  };
}

/** Confirmed until chauffeur accepts; then Chauffeur assigned (or live trip label). */
function customerStatus(r: Reservation): {
  label: string;
  tone: "confirmed" | "assigned" | "live";
} {
  if (!r.driver) {
    return { label: "Confirmed", tone: "confirmed" };
  }
  switch (r.status) {
    case "ON THE WAY":
      return { label: "On the way", tone: "live" };
    case "ARRIVED":
      return { label: "Arrived", tone: "live" };
    case "CIC":
      return { label: "In trip", tone: "live" };
    case "STOP":
      return { label: "Stop", tone: "live" };
    default:
      return { label: "Chauffeur assigned", tone: "assigned" };
  }
}

/** Track only after chauffeur has accepted (API hides driver until then). */
function canTrackReservation(r: Reservation) {
  return !!r.driver;
}

function formatBookingWhen(serviceDate: string, serviceTime: string): string {
  const time = (serviceTime || "").trim() || "—";
  const raw = (serviceDate || "").trim();
  if (!raw) return time;

  const parsed = new Date(raw.includes("T") ? raw : `${raw}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return `${raw} · ${time}`;
  }

  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startThat = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  const dayDiff = Math.round((startThat.getTime() - startToday.getTime()) / 86400000);

  if (dayDiff === 0) return `Today · ${time}`;
  if (dayDiff === 1) return `Tomorrow · ${time}`;

  const weekday = parsed.toLocaleDateString(undefined, { weekday: "short" });
  const day = parsed.getDate();
  const month = parsed.toLocaleDateString(undefined, { month: "short" });
  return `${weekday}, ${day} ${month} · ${time}`;
}

function secondaryLine(r: Reservation): string {
  if (isParcelServiceType(r.serviceType)) {
    return shortLoc(r.dropoffLocation);
  }
  const drop = (r.dropoffLocation || "").trim();
  const dur = (r.duration || "").trim();
  const hourly =
    /hour/i.test(dur) ||
    /hourly/i.test(r.serviceType || "") ||
    /^as directed$/i.test(drop);
  if (hourly) {
    const hours = dur.match(/(\d+)\s*h/i)?.[1] || dur.match(/(\d+)/)?.[1];
    return hours ? `By the hour · ${hours} hrs` : "By the hour";
  }
  return shortLoc(drop || "—");
}

export default function ReservationsScreen() {
  const { user } = useAuth();
  const { palette, isDark } = useCustomerTheme();

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [recentlyChanged, setRecentlyChanged] = useState<Set<string>>(new Set());
  const [manageTarget, setManageTarget] = useState<Reservation | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);

  const fetchReservations = useCallback(async () => {
    try {
      setLoadError(null);
      const data = await getReservations();
      if (data.success) {
        setReservations(data.reservations);
      } else {
        setLoadError("Could not load reservations.");
      }
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load reservations.");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      fetchReservations();
    }, [fetchReservations])
  );

  const handleLiveEvent = useCallback(
    (event: ReservationLiveEvent) => {
      if (!event.data) return;
      if (event.type === "reservation_created" || event.type === "snapshot") {
        setReservations((prev) => {
          const idx = prev.findIndex((r) => r.bookingId === event.bookingId);
          if (idx === -1) {
            if (event.type === "reservation_created") fetchReservations();
            return prev;
          }
          const next = [...prev];
          next[idx] = mergeLiveIntoReservation(next[idx], event.data!);
          return next;
        });
        return;
      }

      setReservations((prev) => {
        const idx = prev.findIndex((r) => r.bookingId === event.bookingId);
        if (idx === -1) {
          if (event.type === "driver_assigned" || event.type === "status_changed") {
            fetchReservations();
          }
          return prev;
        }
        const next = [...prev];
        next[idx] = mergeLiveIntoReservation(next[idx], event.data!);
        return next;
      });

      if (
        event.type === "status_changed" ||
        event.type === "driver_assigned" ||
        event.type === "driver_unassigned" ||
        event.type === "reservation_cancelled"
      ) {
        setRecentlyChanged((prev) => {
          const n = new Set(prev);
          n.add(event.bookingId);
          return n;
        });
      }
    },
    [fetchReservations]
  );

  useCustomerReservationsStream({
    enabled: !!user,
    onEvent: handleLiveEvent,
  });

  useEffect(() => {
    if (recentlyChanged.size === 0) return;
    const t = setTimeout(() => setRecentlyChanged(new Set()), 2200);
    return () => clearTimeout(t);
  }, [recentlyChanged]);

  const activeList = useMemo(
    () =>
      reservations
        .filter((r) => ACTIVE_STATUSES.has(r.status))
        .sort((a, b) => {
          const da = new Date(
            a.serviceDate?.includes("T") ? a.serviceDate : `${a.serviceDate}T12:00:00`
          ).getTime();
          const db = new Date(
            b.serviceDate?.includes("T") ? b.serviceDate : `${b.serviceDate}T12:00:00`
          ).getTime();
          return (Number.isNaN(da) ? 0 : da) - (Number.isNaN(db) ? 0 : db);
        }),
    [reservations]
  );

  const openManage = (reservation: Reservation) => {
    if (reservation.status === "ON THE WAY" || reservation.status === "ARRIVED" || reservation.status === "CIC" || reservation.status === "STOP") {
      router.push({
        pathname: "/customer/track-ride",
        params: { bookingId: reservation.bookingId },
      });
      return;
    }
    setManageTarget(reservation);
  };

  const openTrack = (bookingId: string) => {
    router.push({
      pathname: "/customer/track-ride",
      params: { bookingId },
    });
  };

  const handleCancelRide = async (reason: CancelReason) => {
    if (!manageTarget) return;
    setCancelBusy(true);
    try {
      const result = await cancelReservation(manageTarget.bookingId, { reason });
      if (result.success) {
        setManageTarget(null);
        Alert.alert("Ride cancelled", "Your reservation has been cancelled.");
        await fetchReservations();
      } else {
        Alert.alert("Unable to cancel", result.error || result.message || "Please try again.");
      }
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setCancelBusy(false);
    }
  };

  const toneStyles = (tone: "confirmed" | "assigned" | "live") => {
    if (tone === "confirmed") {
      return {
        bg: isDark ? "rgba(52,199,89,0.18)" : "rgba(22,163,74,0.12)",
        text: isDark ? "#34C759" : "#15803D",
      };
    }
    if (tone === "live") {
      return {
        bg: isDark ? "rgba(10,132,255,0.2)" : "rgba(37,99,235,0.12)",
        text: isDark ? "#64D2FF" : "#1D4ED8",
      };
    }
    return {
      bg: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
      text: isDark ? "#AEAEB2" : "#6B7280",
    };
  };

  const cardBg = isDark ? "#2C2C2E" : "#FFFFFF";
  const cardBorder = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
  const markColor = isDark ? "#F5F5F7" : "#1C1C1E";
  const divider = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";
  const manageBorder = isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.2)";
  const trackBg = isDark ? "#F5F5F7" : "#111827";
  const trackFg = isDark ? "#111827" : "#FFFFFF";

  return (
    <View style={[styles.root, { backgroundColor: palette.root }]}>
      <StatusBar barStyle={palette.statusBar} backgroundColor={palette.root} />
      <LinearGradient colors={[...palette.bg]} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: palette.text }]}>Bookings</Text>
          <Text style={[styles.headerSub, { color: palette.muted }]}>
            Upcoming & active trips
          </Text>
        </View>

        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchReservations();
              }}
              tintColor={GOLD}
              colors={[GOLD]}
            />
          }
        >
          {isLoading ? (
            <View style={styles.emptyState}>
              <SlimSpinner size={32} stroke={2} color={GOLD} />
            </View>
          ) : loadError ? (
            <View style={[styles.emptyCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <Text style={[styles.emptyTitle, { color: palette.text }]}>{loadError}</Text>
              <Pressable
                style={({ pressed }) => [styles.retryBtn, pressed && styles.pressed]}
                onPress={() => {
                  setIsLoading(true);
                  void fetchReservations();
                }}
              >
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : activeList.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="calendar-outline" size={26} color={GOLD} />
              </View>
              <Text style={[styles.emptyTitle, { color: palette.text }]}>No bookings yet</Text>
              <Text style={[styles.emptySubtext, { color: palette.muted }]}>
                Your upcoming reservations will show here.
                {"\n"}Past trips live in History.
              </Text>
              <Pressable
                onPress={() => router.push("/customer/create-reservation")}
                style={({ pressed }) => [styles.emptyCta, pressed && styles.pressed]}
              >
                <Text style={styles.emptyCtaText}>Book a ride</Text>
              </Pressable>
            </View>
          ) : (
            activeList.map((reservation) => {
              const status = customerStatus(reservation);
              const chip = toneStyles(status.tone);
              const showTrack = canTrackReservation(reservation);
              const changed = recentlyChanged.has(reservation.bookingId);
              const when = formatBookingWhen(reservation.serviceDate, reservation.serviceTime);

              return (
                <View
                  key={reservation.id}
                  style={[
                    styles.card,
                    {
                      backgroundColor: cardBg,
                      borderColor: changed ? "rgba(52,199,89,0.45)" : cardBorder,
                    },
                  ]}
                >
                  <View style={styles.cardTop}>
                    <Text style={[styles.whenText, { color: palette.text }]} numberOfLines={1}>
                      {when}
                    </Text>
                    <View style={[styles.statusPill, { backgroundColor: chip.bg }]}>
                      <Text style={[styles.statusPillText, { color: chip.text }]}>
                        {status.label}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.routeBlock}>
                    <View style={styles.routeRow}>
                      <View style={styles.routeRail}>
                        <View
                          style={[
                            styles.routeMark,
                            styles.routeMarkPickup,
                            { borderColor: markColor },
                          ]}
                        />
                        <View style={[styles.routeStem, { backgroundColor: divider }]} />
                      </View>
                      <Text style={[styles.routeText, { color: palette.text }]} numberOfLines={1}>
                        {shortLoc(reservation.pickupLocation)}
                      </Text>
                    </View>
                    <View style={styles.routeRow}>
                      <View style={styles.routeRail}>
                        <View
                          style={[
                            styles.routeMark,
                            styles.routeMarkDrop,
                            { backgroundColor: markColor },
                          ]}
                        />
                      </View>
                      <Text style={[styles.routeText, { color: palette.text }]} numberOfLines={1}>
                        {secondaryLine(reservation)}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.cardFooter, { borderTopColor: divider }]}>
                    <Text style={[styles.metaFoot, { color: palette.muted }]} numberOfLines={1}>
                      {reservation.vehicle} · ${reservation.total.toFixed(0)}
                    </Text>

                    <View style={styles.actions}>
                      <Pressable
                        onPress={() => openManage(reservation)}
                        style={({ pressed }) => [
                          styles.manageBtn,
                          { borderColor: manageBorder },
                          pressed && styles.pressed,
                        ]}
                        hitSlop={4}
                      >
                        <Text style={[styles.manageBtnText, { color: palette.text }]}>
                          Manage
                        </Text>
                      </Pressable>

                      {showTrack ? (
                        <Pressable
                          onPress={() => openTrack(reservation.bookingId)}
                          style={({ pressed }) => [
                            styles.trackBtn,
                            { backgroundColor: trackBg },
                            pressed && styles.pressed,
                          ]}
                          hitSlop={4}
                        >
                          <Text style={[styles.trackBtnText, { color: trackFg }]}>Track</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                </View>
              );
            })
          )}

          <View style={{ height: 110 }} />
        </ScrollView>
      </SafeAreaView>

      <CancelRideSheet
        visible={!!manageTarget}
        reservation={manageTarget}
        busy={cancelBusy}
        onClose={() => {
          if (!cancelBusy) setManageTarget(null);
        }}
        onConfirm={(reason) => void handleCancelRide(reason)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: "transparent" },
  headerRow: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -0.6,
  },
  headerSub: {
    marginTop: 3,
    fontSize: 14,
    fontWeight: "500",
  },
  container: { flex: 1 },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  card: {
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.16,
        shadowRadius: 14,
      },
      android: { elevation: 3 },
    }),
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
  },
  whenText: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.35,
  },
  statusPill: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    flexShrink: 0,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: -0.15,
  },
  routeBlock: {
    marginBottom: 4,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    minHeight: 28,
  },
  routeRail: {
    width: 12,
    alignItems: "center",
    paddingTop: 4,
  },
  routeMark: {
    width: 10,
    height: 10,
  },
  routeMarkPickup: {
    borderRadius: 5,
    borderWidth: 2,
    backgroundColor: "transparent",
  },
  routeMarkDrop: {
    borderRadius: 2.5,
  },
  routeStem: {
    width: 1.5,
    flex: 1,
    minHeight: 14,
    marginTop: 3,
    marginBottom: 3,
    borderRadius: 1,
  },
  routeText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    letterSpacing: -0.2,
    lineHeight: 20,
    paddingBottom: 10,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingTop: 14,
    marginTop: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  metaFoot: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: -0.1,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  manageBtn: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1.4,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  manageBtnText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  trackBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  trackBtnText: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: -0.1,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 80,
  },
  emptyCard: {
    alignItems: "center",
    marginTop: 20,
    paddingVertical: 36,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
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
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyCta: {
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: "rgba(212,160,74,0.18)",
  },
  emptyCtaText: {
    fontSize: 14,
    fontWeight: "800",
    color: GOLD,
  },
  retryBtn: {
    marginTop: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: GOLD,
  },
  retryText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1A1208",
  },
  pressed: {
    opacity: 0.86,
  },
});
