import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  RefreshControl,
  Pressable,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getReservations, type Reservation } from "../../../services/api";
import { useCustomerTheme } from "../../../contexts/CustomerThemeContext";
import { SlimSpinner } from "../../../components/SlimSpinner";
import { GOLD } from "../../../theme/driver-theme";
import { isParcelServiceType } from "../../../utils/parcel";

function shortLoc(s?: string | null) {
  if (!s?.trim()) return "—";
  return s.split(",")[0]?.trim() || s.trim();
}

export default function HistoryScreen() {
  const { palette } = useCustomerTheme();
  const blurIntensity = Platform.OS === "ios" ? 48 : 28;
  const cardBlur = Platform.OS === "ios" ? 36 : 22;

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchReservations = useCallback(async () => {
    try {
      setLoadError(null);
      const data = await getReservations();
      if (data.success) {
        setReservations(data.reservations);
      } else {
        setLoadError("Could not load history.");
      }
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load history.");
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

  const completed = useMemo(() => {
    return reservations.filter((r) => r.status === "DONE" || r.status === "CANCELLED");
  }, [reservations]);

  const doneCount = completed.filter((r) => r.status === "DONE").length;
  const cancelledCount = completed.filter((r) => r.status === "CANCELLED").length;

  return (
    <View style={[styles.root, { backgroundColor: palette.root }]}>
      <StatusBar barStyle={palette.statusBar} backgroundColor={palette.root} />
      <LinearGradient colors={[...palette.bg]} style={StyleSheet.absoluteFill} />
      <View style={styles.ambientGlow} pointerEvents="none">
        <LinearGradient
          colors={[...palette.glow]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.85, y: 0.5 }}
        />
      </View>

      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Text style={styles.headerEyebrow}>PAST TRIPS</Text>
          <Text style={[styles.headerTitle, { color: palette.text }]}>History</Text>
          {!isLoading && completed.length > 0 ? (
            <Text style={[styles.headerSub, { color: palette.muted }]}>
              {doneCount} completed{cancelledCount > 0 ? ` · ${cancelledCount} cancelled` : ""}
            </Text>
          ) : null}
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
            <BlurView
              intensity={cardBlur}
              tint={palette.blurTint}
              style={[styles.emptyCard, { borderColor: palette.border }]}
            >
              <View style={styles.emptyIconWrap}>
                <Ionicons name="cloud-offline-outline" size={26} color={GOLD} />
              </View>
              <Text style={[styles.emptyTitle, { color: palette.text }]}>{loadError}</Text>
              <Pressable
                style={({ pressed }) => [styles.retryBtn, pressed && styles.pressed]}
                onPress={() => {
                  setIsLoading(true);
                  void fetchReservations();
                }}
              >
                <LinearGradient
                  colors={["#E8C078", GOLD, "#B8862E"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.retryGradient}
                >
                  <Text style={styles.retryText}>Retry</Text>
                </LinearGradient>
              </Pressable>
            </BlurView>
          ) : completed.length === 0 ? (
            <BlurView
              intensity={cardBlur}
              tint={palette.blurTint}
              style={[styles.emptyCard, { borderColor: palette.border }]}
            >
              <View style={styles.emptyIconWrap}>
                <Ionicons name="time-outline" size={26} color={GOLD} />
              </View>
              <Text style={[styles.emptyTitle, { color: palette.text }]}>No ride history</Text>
              <Text style={[styles.emptySubtext, { color: palette.muted }]}>
                Completed rides will appear here.
              </Text>
            </BlurView>
          ) : (
            <View style={styles.list}>
              {completed.map((reservation) => {
                const isDone = reservation.status === "DONE";
                return (
                  <Pressable
                    key={reservation.id}
                    style={({ pressed }) => [styles.cardWrap, pressed && styles.pressed]}
                    onPress={() =>
                      router.push({
                        pathname: "/customer/track-ride",
                        params: { bookingId: reservation.bookingId },
                      })
                    }
                  >
                    <BlurView
                      intensity={cardBlur}
                      tint={palette.blurTint}
                      style={[
                        styles.card,
                        {
                          borderColor: palette.border,
                          backgroundColor:
                            Platform.OS === "android" ? palette.cardAndroid : "transparent",
                        },
                      ]}
                    >
                      <View style={styles.rowBetween}>
                        <Text style={styles.bookingId}>{reservation.bookingId}</Text>
                        <View
                          style={[
                            styles.statusPill,
                            {
                              backgroundColor: isDone
                                ? "rgba(52,199,89,0.14)"
                                : "rgba(255,69,58,0.12)",
                              borderColor: isDone
                                ? "rgba(52,199,89,0.4)"
                                : "rgba(255,69,58,0.35)",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusText,
                              { color: isDone ? "#34C759" : "#FF453A" },
                            ]}
                          >
                            {isDone ? "COMPLETED" : "CANCELLED"}
                          </Text>
                        </View>
                      </View>

                      {reservation.vehicle ? (
                        <Text style={[styles.vehicleName, { color: palette.text }]} numberOfLines={1}>
                          {reservation.vehicle}
                        </Text>
                      ) : null}

                      <View style={styles.chipRow}>
                        <View
                          style={[
                            styles.metaChip,
                            { backgroundColor: palette.metaChipBg, borderColor: palette.border },
                          ]}
                        >
                          <Ionicons name="calendar-outline" size={13} color={GOLD} />
                          <Text style={[styles.metaChipText, { color: palette.metaText }]}>
                            {reservation.serviceDate} · {reservation.serviceTime}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.metaChip,
                            { backgroundColor: palette.metaChipBg, borderColor: palette.border },
                          ]}
                        >
                          <Ionicons
                            name={isParcelServiceType(reservation.serviceType) ? "cube-outline" : "people-outline"}
                            size={13}
                            color={GOLD}
                          />
                          <Text style={[styles.metaChipText, { color: palette.metaText }]}>
                            {isParcelServiceType(reservation.serviceType)
                              ? "Parcel"
                              : `${reservation.passengers} pax`}
                          </Text>
                        </View>
                      </View>

                      <View
                        style={[
                          styles.routeCard,
                          { backgroundColor: palette.routeBg, borderColor: palette.border },
                        ]}
                      >
                        <View style={styles.routeRail}>
                          <View style={[styles.routeDot, { backgroundColor: "#34C759" }]} />
                          <View style={[styles.routeLine, { backgroundColor: palette.routeLine }]} />
                          <View style={[styles.routeDot, { backgroundColor: "#FF453A" }]} />
                        </View>
                        <View style={styles.routeCopy}>
                          <View style={styles.routeBlock}>
                            <Text style={[styles.routeLabel, { color: palette.muted }]}>PICKUP</Text>
                            <Text
                              style={[styles.locationText, { color: palette.location }]}
                              numberOfLines={2}
                            >
                              {shortLoc(reservation.pickupLocation)}
                            </Text>
                          </View>
                          <View style={styles.routeBlock}>
                            <Text style={[styles.routeLabel, { color: palette.muted }]}>DROPOFF</Text>
                            <Text
                              style={[styles.locationText, { color: palette.location }]}
                              numberOfLines={2}
                            >
                              {shortLoc(reservation.dropoffLocation)}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.footerRow}>
                        <Text style={styles.totalText}>
                          ${Number(reservation.total || 0).toFixed(2)} CAD
                        </Text>
                        <View style={styles.ctaRow}>
                          <Text style={[styles.ctaText, { color: palette.text }]}>View</Text>
                          <Ionicons name="chevron-forward" size={16} color={palette.icon} />
                        </View>
                      </View>
                    </BlurView>
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  ambientGlow: {
    position: "absolute",
    top: -40,
    left: -20,
    right: -20,
    height: 240,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 14,
  },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: GOLD,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    marginTop: 4,
  },
  container: { flex: 1 },
  contentContainer: {
    paddingHorizontal: 18,
    paddingBottom: 110,
  },
  list: {
    gap: 14,
    paddingTop: 2,
  },
  cardWrap: {
    borderRadius: 22,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.28,
        shadowRadius: 18,
      },
      android: { elevation: 5 },
    }),
  },
  card: {
    borderRadius: 22,
    overflow: "hidden",
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  bookingId: {
    flex: 1,
    fontSize: 13,
    color: GOLD,
    fontWeight: "700",
  },
  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  vehicleName: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  metaChipText: {
    fontSize: 12,
    fontWeight: "500",
  },
  routeCard: {
    flexDirection: "row",
    gap: 12,
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  routeRail: {
    width: 14,
    alignItems: "center",
    paddingVertical: 4,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  routeLine: {
    flex: 1,
    width: 2,
    marginVertical: 4,
    borderRadius: 1,
  },
  routeCopy: {
    flex: 1,
    gap: 12,
  },
  routeBlock: { gap: 3 },
  routeLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.1,
  },
  locationText: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 19,
  },
  footerRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalText: {
    fontSize: 15,
    fontWeight: "800",
    color: GOLD,
  },
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: "700",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 80,
  },
  emptyCard: {
    alignItems: "center",
    marginTop: 24,
    paddingVertical: 36,
    paddingHorizontal: 24,
    borderRadius: 22,
    overflow: "hidden",
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
  retryBtn: {
    marginTop: 10,
    borderRadius: 14,
    overflow: "hidden",
  },
  retryGradient: {
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  retryText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1A1208",
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
});
