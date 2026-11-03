import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocalSearchParams, useNavigation } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Pressable,
  Animated,
  StatusBar,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useCustomerTheme } from "../../contexts/CustomerThemeContext";
import { GOLD, type DriverPalette } from "../../theme/driver-theme";
import {
  resetToBookingsTab,
  resetToTripDetail,
} from "../../utils/booking-nav-reset";
import { getReservationById, type Reservation } from "../../services/api";

function qp(v: string | string[] | undefined): string {
  if (v == null) return "";
  return Array.isArray(v) ? String(v[0] ?? "") : String(v);
}

function shortLoc(s?: string | null): string {
  if (!s?.trim()) return "—";
  const t = s.trim();
  if (/^as directed$/i.test(t)) return "As directed";
  return t.split(",")[0]?.trim() || t;
}

function formatBookingWhen(serviceDate: string, serviceTime: string): string {
  const time = (serviceTime || "").trim() || "—";
  const raw = (serviceDate || "").trim();
  if (!raw) return time === "—" ? "" : time;

  const parsed = new Date(raw.includes("T") ? raw : `${raw}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return `${raw} · ${time}`;
  }

  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startThat = new Date(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate()
  );
  const dayDiff = Math.round(
    (startThat.getTime() - startToday.getTime()) / 86400000
  );

  if (dayDiff === 0) return `Today · ${time}`;
  if (dayDiff === 1) return `Tomorrow · ${time}`;

  const weekday = parsed.toLocaleDateString(undefined, { weekday: "short" });
  const day = parsed.getDate();
  const month = parsed.toLocaleDateString(undefined, { month: "short" });
  return `${weekday}, ${day} ${month} · ${time}`;
}

type TripSummary = {
  pickupLocation: string;
  dropoffLocation: string;
  serviceDate: string;
  serviceTime: string;
  vehicle: string;
};

function summaryFromReservation(r: Reservation): TripSummary {
  return {
    pickupLocation: r.pickupLocation || "",
    dropoffLocation: r.dropoffLocation || "",
    serviceDate: r.serviceDate || "",
    serviceTime: r.serviceTime || "",
    vehicle: (r.vehicle || "").trim(),
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function ReservationConfirmedScreen() {
  const navigation = useNavigation();
  const { palette, isDark } = useCustomerTheme();
  const styles = useMemo(() => makeStyles(palette, isDark), [palette, isDark]);
  const raw = useLocalSearchParams();
  const bookingId = qp(raw.bookingId);

  const snapshot = useMemo<TripSummary | null>(() => {
    const pickupLocation = qp(raw.pickupLocation);
    const dropoffLocation = qp(raw.dropoffLocation);
    const serviceDate = qp(raw.serviceDate);
    const serviceTime = qp(raw.serviceTime);
    const vehicle = qp(raw.vehicle);
    if (
      !pickupLocation &&
      !dropoffLocation &&
      !serviceDate &&
      !serviceTime &&
      !vehicle
    ) {
      return null;
    }
    return {
      pickupLocation,
      dropoffLocation,
      serviceDate,
      serviceTime,
      vehicle,
    };
  }, [raw.pickupLocation, raw.dropoffLocation, raw.serviceDate, raw.serviceTime, raw.vehicle]);

  const [trip, setTrip] = useState<TripSummary | null>(snapshot);
  const [loadingTrip, setLoadingTrip] = useState(
    Boolean(bookingId) && !snapshot
  );

  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(18)).current;
  const checkScale = useRef(new Animated.Value(0.6)).current;

  const loadTrip = useCallback(async () => {
    if (!bookingId) {
      setLoadingTrip(false);
      return;
    }
    // Snapshot already paints the card — refresh quietly in the background.
    if (!snapshot) setLoadingTrip(true);

    const tryFetch = async () => {
      const data = await getReservationById(bookingId);
      if (data.success && data.reservation) {
        setTrip(summaryFromReservation(data.reservation));
        return true;
      }
      return false;
    };

    try {
      const ok = await tryFetch();
      if (!ok) {
        await sleep(450);
        await tryFetch();
      }
    } catch {
      try {
        await sleep(450);
        await tryFetch();
      } catch {
        // Keep snapshot / success chrome if API is briefly unavailable.
      }
    } finally {
      setLoadingTrip(false);
    }
  }, [bookingId, snapshot]);

  useEffect(() => {
    void loadTrip();
  }, [loadTrip]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 420, useNativeDriver: true }),
      Animated.spring(checkScale, {
        toValue: 1,
        friction: 6,
        tension: 90,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, rise, checkScale]);

  const goBookings = () => {
    resetToBookingsTab(navigation);
  };

  const goTripDetail = () => {
    if (!bookingId) {
      goBookings();
      return;
    }
    resetToTripDetail(navigation, bookingId);
  };

  const whenLabel = trip
    ? formatBookingWhen(trip.serviceDate, trip.serviceTime)
    : "";
  const vehicleLabel = (trip?.vehicle || "").trim();
  const pickupLabel = trip ? shortLoc(trip.pickupLocation) : "";
  const dropoffRaw = (trip?.dropoffLocation || "").trim();
  const hideDropoff = !dropoffRaw || /^as directed$/i.test(dropoffRaw);
  const dropoffLabel = hideDropoff ? "" : shortLoc(dropoffRaw);
  const showTripCard =
    !!trip &&
    (Boolean(pickupLabel && pickupLabel !== "—") ||
      Boolean(dropoffLabel && dropoffLabel !== "—") ||
      Boolean(whenLabel) ||
      Boolean(vehicleLabel));

  return (
    <View style={[styles.root, { backgroundColor: palette.root }]}>
      <StatusBar barStyle={palette.statusBar} backgroundColor={palette.root} />
      <LinearGradient colors={[...palette.bg]} style={StyleSheet.absoluteFill} />
      <View style={styles.ambientGlow} pointerEvents="none">
        <LinearGradient
          colors={[...palette.glow]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.85, y: 0.55 }}
        />
      </View>

      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces
        >
          <Animated.View
            style={[
              styles.content,
              { opacity: fade, transform: [{ translateY: rise }] },
            ]}
          >
            <Animated.View style={{ transform: [{ scale: checkScale }] }}>
              <View style={styles.badgeOuter}>
                <LinearGradient
                  colors={
                    isDark
                      ? ["rgba(232,192,120,0.28)", "rgba(212,160,74,0.08)"]
                      : ["rgba(232,192,120,0.45)", "rgba(212,160,74,0.16)"]
                  }
                  style={styles.badgeRing}
                >
                  <LinearGradient
                    colors={["#E8C078", GOLD, "#B8862E"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.badgeInner}
                  >
                    <Ionicons name="checkmark" size={42} color="#1A1208" />
                  </LinearGradient>
                </LinearGradient>
              </View>
            </Animated.View>

            <Text style={styles.eyebrow}>YOU'RE ALL SET</Text>
            <Text style={styles.title}>Reservation confirmed</Text>
            <Text style={styles.subtitle}>
              Your ride is booked. We’ll notify you as soon as a chauffeur is
              assigned.
            </Text>

            {bookingId ? (
              <View style={styles.idChip}>
                <Text style={styles.idLabel}>BOOKING ID</Text>
                <Text style={styles.idValue} numberOfLines={1}>
                  {bookingId}
                </Text>
              </View>
            ) : null}

            {loadingTrip ? (
              <View style={styles.tripLoading}>
                <ActivityIndicator color={GOLD} />
              </View>
            ) : showTripCard ? (
              <View style={styles.tripCard}>
                {whenLabel ? (
                  <View style={styles.metaRow}>
                    <View style={styles.metaIcon}>
                      <Ionicons name="time-outline" size={16} color={GOLD} />
                    </View>
                    <View style={styles.metaCopy}>
                      <Text style={styles.metaLabel}>RESERVATION TIME</Text>
                      <Text style={styles.metaValue} numberOfLines={2}>
                        {whenLabel}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {vehicleLabel ? (
                  <>
                    {whenLabel ? (
                      <View
                        style={[
                          styles.metaDivider,
                          { backgroundColor: palette.border },
                        ]}
                      />
                    ) : null}
                    <View style={styles.metaRow}>
                      <View style={styles.metaIcon}>
                        <Ionicons name="car-outline" size={16} color={GOLD} />
                      </View>
                      <View style={styles.metaCopy}>
                        <Text style={styles.metaLabel}>VEHICLE</Text>
                        <Text style={styles.metaValue} numberOfLines={2}>
                          {vehicleLabel}
                        </Text>
                      </View>
                    </View>
                  </>
                ) : null}

                {(pickupLabel && pickupLabel !== "—") ||
                (dropoffLabel && dropoffLabel !== "—") ? (
                  <>
                    <View
                      style={[
                        styles.metaDivider,
                        { backgroundColor: palette.border },
                      ]}
                    />
                    <View style={styles.routeBlock}>
                      <View style={styles.routeRailCol}>
                        {pickupLabel && pickupLabel !== "—" ? (
                          <View
                            style={[styles.routeDot, styles.routeDotPickup]}
                          />
                        ) : null}
                        {pickupLabel &&
                        pickupLabel !== "—" &&
                        dropoffLabel &&
                        dropoffLabel !== "—" ? (
                          <View
                            style={[
                              styles.routeStem,
                              { backgroundColor: palette.border },
                            ]}
                          />
                        ) : null}
                        {dropoffLabel && dropoffLabel !== "—" ? (
                          <View style={[styles.routeDot, styles.routeDotDrop]} />
                        ) : null}
                      </View>
                      <View style={styles.routeCopyCol}>
                        {pickupLabel && pickupLabel !== "—" ? (
                          <View style={styles.routeStop}>
                            <Text style={styles.metaLabel}>PICKUP</Text>
                            <Text style={styles.metaValue} numberOfLines={2}>
                              {pickupLabel}
                            </Text>
                          </View>
                        ) : null}
                        {dropoffLabel && dropoffLabel !== "—" ? (
                          <View
                            style={[
                              styles.routeStop,
                              pickupLabel && pickupLabel !== "—"
                                ? { marginTop: 14 }
                                : null,
                            ]}
                          >
                            <Text style={styles.metaLabel}>DROPOFF</Text>
                            <Text style={styles.metaValue} numberOfLines={2}>
                              {dropoffLabel}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </>
                ) : null}
              </View>
            ) : null}

            <View style={styles.tipsCard}>
              <View style={styles.tipRow}>
                <View style={styles.tipIcon}>
                  <Ionicons name="notifications-outline" size={16} color={GOLD} />
                </View>
                <Text style={styles.tipText}>
                  Push updates when your chauffeur is on the way
                </Text>
              </View>
              <View
                style={[styles.tipDivider, { backgroundColor: palette.border }]}
              />
              <View style={styles.tipRow}>
                <View style={styles.tipIcon}>
                  <Ionicons name="calendar-outline" size={16} color={GOLD} />
                </View>
                <Text style={styles.tipText}>
                  Find this trip anytime under Bookings
                </Text>
              </View>
            </View>
          </Animated.View>
        </ScrollView>

        <View style={styles.bottom}>
          {bookingId ? (
            <Pressable
              onPress={goTripDetail}
              style={({ pressed }) => [
                styles.secondaryBtn,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.secondaryBtnText}>View booking</Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={goBookings}
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          >
            <LinearGradient
              colors={["#E8C078", GOLD, "#B8862E"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryGradient}
            >
              <Text style={styles.primaryBtnText}>Got it</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

function makeStyles(palette: DriverPalette, isDark: boolean) {
  const card = isDark ? "rgba(28,28,30,0.88)" : "rgba(255,255,255,0.88)";
  return StyleSheet.create({
    root: { flex: 1 },
    ambientGlow: {
      position: "absolute",
      top: -60,
      left: -30,
      right: -30,
      height: 320,
    },
    safe: { flex: 1, backgroundColor: "transparent" },
    scroll: { flex: 1 },
    scrollContent: {
      flexGrow: 1,
      justifyContent: "center",
      paddingBottom: 12,
    },
    content: {
      alignItems: "center",
      paddingHorizontal: 28,
      paddingTop: 12,
    },
    badgeOuter: {
      marginBottom: 22,
    },
    badgeRing: {
      width: 104,
      height: 104,
      borderRadius: 52,
      alignItems: "center",
      justifyContent: "center",
    },
    badgeInner: {
      width: 78,
      height: 78,
      borderRadius: 39,
      alignItems: "center",
      justifyContent: "center",
      ...Platform.select({
        ios: {
          shadowColor: GOLD,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.35,
          shadowRadius: 16,
        },
        android: { elevation: 6 },
      }),
    },
    eyebrow: {
      fontSize: 11,
      fontWeight: "800",
      color: isDark ? GOLD : palette.hintBold,
      letterSpacing: 1.6,
      marginBottom: 8,
    },
    title: {
      fontSize: 28,
      fontWeight: "800",
      letterSpacing: -0.6,
      textAlign: "center",
      marginBottom: 10,
      color: palette.text,
    },
    subtitle: {
      fontSize: 15,
      fontWeight: "500",
      textAlign: "center",
      lineHeight: 22,
      maxWidth: 320,
      color: palette.muted,
    },
    idChip: {
      marginTop: 18,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: isDark ? "rgba(212,160,74,0.35)" : palette.hintBorder,
      backgroundColor: isDark ? "rgba(212,160,74,0.12)" : palette.hintBg,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: "center",
      minWidth: 220,
      gap: 4,
    },
    idLabel: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 1.2,
      color: palette.muted,
    },
    idValue: {
      fontSize: 14,
      fontWeight: "800",
      color: isDark ? GOLD : palette.hintBold,
      letterSpacing: 0.4,
    },
    tripLoading: {
      marginTop: 22,
      paddingVertical: 18,
    },
    tripCard: {
      marginTop: 20,
      alignSelf: "stretch",
      maxWidth: 340,
      borderRadius: 18,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: palette.border,
      backgroundColor: card,
      paddingHorizontal: 14,
      paddingVertical: 6,
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: isDark ? 0.28 : 0.06,
          shadowRadius: 14,
        },
        android: { elevation: 2 },
      }),
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      paddingVertical: 12,
    },
    metaIcon: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark
        ? "rgba(212,160,74,0.14)"
        : "rgba(212,160,74,0.12)",
      marginTop: 1,
    },
    metaCopy: { flex: 1, minWidth: 0 },
    metaLabel: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 1.1,
      color: palette.muted,
      marginBottom: 3,
    },
    metaValue: {
      fontSize: 15,
      fontWeight: "700",
      letterSpacing: -0.2,
      color: palette.text,
      lineHeight: 20,
    },
    metaDivider: {
      height: StyleSheet.hairlineWidth,
      marginLeft: 44,
    },
    routeBlock: {
      flexDirection: "row",
      alignItems: "stretch",
      gap: 12,
      paddingVertical: 12,
      paddingLeft: 2,
    },
    routeRailCol: {
      width: 32,
      alignItems: "center",
      paddingTop: 5,
    },
    routeDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    routeDotPickup: {
      backgroundColor: "#34C759",
    },
    routeDotDrop: {
      backgroundColor: "#FF453A",
    },
    routeStem: {
      width: 2,
      flex: 1,
      minHeight: 28,
      marginVertical: 4,
      borderRadius: 1,
    },
    routeCopyCol: { flex: 1, minWidth: 0 },
    routeStop: { minHeight: 40 },
    tipsCard: {
      marginTop: 16,
      alignSelf: "stretch",
      maxWidth: 340,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: palette.border,
      backgroundColor: card,
      paddingHorizontal: 14,
      paddingVertical: 6,
    },
    tipRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 12,
    },
    tipIcon: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark
        ? "rgba(212,160,74,0.14)"
        : "rgba(212,160,74,0.12)",
    },
    tipDivider: {
      height: StyleSheet.hairlineWidth,
      marginLeft: 44,
    },
    tipText: {
      flex: 1,
      fontSize: 13,
      fontWeight: "500",
      lineHeight: 18,
      color: palette.muted,
    },
    bottom: {
      paddingHorizontal: 20,
      paddingBottom: Platform.OS === "ios" ? 8 : 20,
      gap: 10,
    },
    secondaryBtn: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: palette.border,
      backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
      paddingVertical: 15,
      borderRadius: 14,
      alignItems: "center",
    },
    secondaryBtnText: {
      fontSize: 16,
      fontWeight: "700",
      color: palette.text,
    },
    primaryBtn: {
      borderRadius: 14,
      overflow: "hidden",
    },
    primaryGradient: {
      paddingVertical: 16,
      alignItems: "center",
    },
    primaryBtnText: {
      fontSize: 16,
      fontWeight: "800",
      color: "#1A1208",
    },
    pressed: { opacity: 0.88 },
  });
}
