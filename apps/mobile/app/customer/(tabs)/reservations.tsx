import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Image,
  Animated,
  Alert,
  RefreshControl,
  Linking,
  Pressable,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getReservations, cancelReservation, Reservation } from "../../../services/api";
import { useAuth } from "../../../contexts/AuthContext";
import { useCustomerTheme } from "../../../contexts/CustomerThemeContext";
import { useCustomerReservationsStream } from "../../../hooks/useCustomerReservationsStream";
import type { ReservationLiveData, ReservationLiveEvent } from "../../../services/reservation-stream";
import { SlimSpinner } from "../../../components/SlimSpinner";
import { GOLD } from "../../../theme/driver-theme";
import { isParcelServiceType } from "../../../utils/parcel";

const tabs = ["Pending", "In-progress", "Completed"] as const;

const IN_PROGRESS_STATUSES = new Set(["ACCEPTED", "ON THE WAY", "ARRIVED", "CIC", "STOP"]);
const COMPLETED_STATUSES = new Set(["DONE", "CANCELLED"]);

function shortLoc(s?: string | null) {
  if (!s?.trim()) return "—";
  return s.split(",")[0]?.trim() || s.trim();
}

function mergeLiveIntoReservation(prev: Reservation, live: ReservationLiveData): Reservation {
  const driver = live.driver
    ? {
        name: live.driver.name,
        phone: live.driver.phone,
        photo: live.driver.photo,
        vehicle: live.driver.vehicle ?? "",
        vehiclePlate: live.driver.vehiclePlate ?? "",
        rating: live.driver.rating ?? 0,
      }
    : null;
  return {
    ...prev,
    status: live.status,
    statusUpdatedAt: live.statusUpdatedAt ?? prev.statusUpdatedAt,
    completedAt: live.completedAt ?? prev.completedAt,
    driver: driver ?? prev.driver,
  };
}

function statusColors(status: string) {
  if (status === "PENDING") {
    return { bg: "rgba(212,160,74,0.16)", border: "rgba(212,160,74,0.4)", text: GOLD };
  }
  if (status === "ACCEPTED") {
    return { bg: "rgba(59,130,246,0.16)", border: "rgba(59,130,246,0.4)", text: "#60A5FA" };
  }
  if (status === "ON THE WAY" || status === "ARRIVED" || status === "CIC" || status === "STOP") {
    return { bg: "rgba(52,199,89,0.14)", border: "rgba(52,199,89,0.4)", text: "#34C759" };
  }
  if (status === "CANCELLED") {
    return { bg: "rgba(255,69,58,0.12)", border: "rgba(255,69,58,0.35)", text: "#FF453A" };
  }
  return { bg: "rgba(142,142,147,0.14)", border: "rgba(142,142,147,0.35)", text: "#8E8E93" };
}

export default function ReservationsScreen() {
  const { user } = useAuth();
  const { palette, isDark } = useCustomerTheme();
  const blurIntensity = Platform.OS === "ios" ? 48 : 28;
  const cardBlur = Platform.OS === "ios" ? 36 : 22;

  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Pending");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [recentlyChanged, setRecentlyChanged] = useState<Set<string>>(new Set());

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
        if (idx === -1) return prev;
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

  const live = useCustomerReservationsStream({
    enabled: !!user,
    onEvent: handleLiveEvent,
  });

  useEffect(() => {
    if (recentlyChanged.size === 0) return;
    const t = setTimeout(() => setRecentlyChanged(new Set()), 2200);
    return () => clearTimeout(t);
  }, [recentlyChanged]);

  const handleCancel = async (bookingId: string) => {
    Alert.alert("Cancel Reservation", "Are you sure you want to cancel this reservation?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          try {
            const result = await cancelReservation(bookingId);
            if (result.success) {
              Alert.alert("Success", "Reservation cancelled successfully");
              fetchReservations();
            } else {
              Alert.alert("Error", "Failed to cancel reservation");
            }
          } catch {
            Alert.alert("Error", "Something went wrong");
          }
        },
      },
    ]);
  };

  const filteredReservations = reservations.filter((res) => {
    if (activeTab === "Pending") return res.status === "PENDING";
    if (activeTab === "In-progress") return IN_PROGRESS_STATUSES.has(res.status);
    if (activeTab === "Completed") return COMPLETED_STATUSES.has(res.status);
    return true;
  });

  const tabCounts = {
    Pending: reservations.filter((r) => r.status === "PENDING").length,
    "In-progress": reservations.filter((r) => IN_PROGRESS_STATUSES.has(r.status)).length,
    Completed: reservations.filter((r) => COMPLETED_STATUSES.has(r.status)).length,
  } as const;

  const isInProgress = (status: string) => IN_PROGRESS_STATUSES.has(status);
  const friendlyStatus = (status: string) => (status === "ACCEPTED" ? "DRIVER ASSIGNED" : status);

  const livePulse = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    if (live.status !== "open") {
      livePulse.stopAnimation();
      livePulse.setValue(0.35);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(livePulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(livePulse, { toValue: 0.35, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [live.status, livePulse]);

  const liveLabel =
    live.status === "open"
      ? "LIVE"
      : live.status === "reconnecting"
        ? "RECONNECTING"
        : live.status === "connecting"
          ? "CONNECTING"
          : "OFFLINE";

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
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerEyebrow}>YOUR TRIPS</Text>
            <Text style={[styles.headerTitle, { color: palette.text }]}>Bookings</Text>
          </View>

          <BlurView
            intensity={blurIntensity}
            tint={palette.blurTint}
            style={[
              styles.liveBadge,
              {
                borderColor:
                  live.status === "open"
                    ? "rgba(52,199,89,0.4)"
                    : live.status === "connecting" || live.status === "reconnecting"
                      ? "rgba(245,166,35,0.4)"
                      : palette.border,
                backgroundColor:
                  live.status === "open"
                    ? "rgba(52,199,89,0.12)"
                    : live.status === "connecting" || live.status === "reconnecting"
                      ? "rgba(245,166,35,0.12)"
                      : Platform.OS === "android"
                        ? palette.cardAndroid
                        : "transparent",
              },
            ]}
          >
            <Animated.View
              style={[
                styles.liveDot,
                {
                  backgroundColor:
                    live.status === "open"
                      ? "#34C759"
                      : live.status === "connecting" || live.status === "reconnecting"
                        ? "#F5A623"
                        : "#8E8E93",
                  opacity: live.status === "open" ? livePulse : 1,
                },
              ]}
            />
            <Text
              style={[
                styles.liveBadgeText,
                {
                  color:
                    live.status === "open"
                      ? "#34C759"
                      : live.status === "connecting" || live.status === "reconnecting"
                        ? "#F5A623"
                        : palette.muted,
                },
              ]}
            >
              {liveLabel}
            </Text>
          </BlurView>
        </View>

        {/* Tabs */}
        <BlurView
          intensity={blurIntensity}
          tint={palette.blurTint}
          style={[styles.tabShell, { borderColor: palette.border }]}
        >
          {tabs.map((tab) => {
            const count = tabCounts[tab];
            const active = activeTab === tab;
            return (
              <Pressable
                key={tab}
                style={[
                  styles.tab,
                  active && { backgroundColor: palette.tabActive },
                ]}
                onPress={() => setActiveTab(tab)}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: active ? palette.tabTextActive : palette.tabText },
                  ]}
                >
                  {tab}
                  {count > 0 ? ` · ${count}` : ""}
                </Text>
              </Pressable>
            );
          })}
        </BlurView>

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
          ) : filteredReservations.length === 0 ? (
            <BlurView
              intensity={cardBlur}
              tint={palette.blurTint}
              style={[styles.emptyCard, { borderColor: palette.border }]}
            >
              <View style={styles.emptyIconWrap}>
                <Ionicons name="calendar-outline" size={26} color={GOLD} />
              </View>
              <Text style={[styles.emptyTitle, { color: palette.text }]}>No reservations</Text>
              <Text style={[styles.emptySubtext, { color: palette.muted }]}>
                No {activeTab.toLowerCase()} reservations found
              </Text>
            </BlurView>
          ) : (
            filteredReservations.map((reservation) => {
              const chip = statusColors(reservation.status);
              const changed = recentlyChanged.has(reservation.bookingId);
              return (
                <View
                  key={reservation.id}
                  style={[
                    styles.cardWrap,
                    changed && {
                      shadowColor: "#34C759",
                    },
                  ]}
                >
                  <BlurView
                    intensity={cardBlur}
                    tint={palette.blurTint}
                    style={[
                      styles.reservationCard,
                      {
                        borderColor: changed ? "rgba(52,199,89,0.55)" : palette.border,
                        backgroundColor:
                          Platform.OS === "android"
                            ? changed
                              ? isDark
                                ? "rgba(20,40,28,0.95)"
                                : "rgba(236,253,245,0.95)"
                              : palette.cardAndroid
                            : "transparent",
                      },
                    ]}
                  >
                    <View style={styles.cardHeader}>
                      <Text style={[styles.vehicleName, { color: palette.text }]} numberOfLines={1}>
                        {reservation.vehicle}
                      </Text>
                      <View
                        style={[
                          styles.statusChip,
                          { backgroundColor: chip.bg, borderColor: chip.border },
                        ]}
                      >
                        <Text style={[styles.statusChipText, { color: chip.text }]}>
                          {friendlyStatus(reservation.status)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.metaRow}>
                      <Text style={styles.bookingId}>{reservation.bookingId}</Text>
                      <Text style={styles.price}>${reservation.total.toFixed(2)} CAD</Text>
                    </View>

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
                        <View style={[styles.routeDot, { backgroundColor: GOLD }]} />
                        <View style={[styles.routeLine, { backgroundColor: palette.routeLine }]} />
                        <View style={[styles.routeDot, { backgroundColor: "#FF453A" }]} />
                      </View>
                      <View style={styles.routeCopy}>
                        <View style={styles.routeBlock}>
                          <Text style={[styles.routeLabel, { color: palette.muted }]}>PICKUP</Text>
                          <Text style={[styles.locationText, { color: palette.location }]} numberOfLines={2}>
                            {shortLoc(reservation.pickupLocation)}
                          </Text>
                        </View>
                        <View style={styles.routeBlock}>
                          <Text style={[styles.routeLabel, { color: palette.muted }]}>DROPOFF</Text>
                          <Text style={[styles.locationText, { color: palette.location }]} numberOfLines={2}>
                            {shortLoc(reservation.dropoffLocation)}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {reservation.driver ? (
                      <View
                        style={[
                          styles.driverCard,
                          { backgroundColor: palette.metaChipBg, borderColor: palette.border },
                        ]}
                      >
                        <View style={styles.driverHeader}>
                          <Text style={[styles.driverLabel, { color: palette.muted }]}>Your Driver</Text>
                          <View style={styles.ratingBadge}>
                            <Ionicons name="star" size={12} color={GOLD} />
                            <Text style={[styles.ratingText, { color: palette.text }]}>
                              {reservation.driver.rating}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.driverInfo}>
                          {reservation.driver.photo ? (
                            <Image source={{ uri: reservation.driver.photo }} style={styles.driverPhoto} />
                          ) : (
                            <View
                              style={[
                                styles.driverPhoto,
                                styles.driverPhotoFallback,
                                { backgroundColor: palette.avatarBg },
                              ]}
                            >
                              <Ionicons name="person" size={18} color={palette.avatarIcon} />
                            </View>
                          )}
                          <View style={styles.driverDetails}>
                            <Text style={[styles.driverName, { color: palette.text }]}>
                              {reservation.driver.name}
                            </Text>
                            <Text style={[styles.vehicleNumber, { color: palette.muted }]}>
                              {reservation.driver.vehiclePlate}
                            </Text>
                          </View>
                          <Pressable
                            style={({ pressed }) => [styles.callBtn, pressed && styles.pressed]}
                            onPress={() => {
                              const phone = reservation.driver?.phone?.replace(/[^0-9+]/g, "");
                              if (!phone) {
                                Alert.alert("Unavailable", "Driver phone number is not available.");
                                return;
                              }
                              Linking.openURL(`tel:${phone}`).catch(() => {});
                            }}
                          >
                            <Ionicons name="call" size={16} color="#fff" />
                          </Pressable>
                        </View>
                      </View>
                    ) : null}

                    {reservation.status === "PENDING" ? (
                      <Pressable
                        style={({ pressed }) => [
                          styles.cancelBtn,
                          {
                            borderColor: palette.rejectBorder,
                            backgroundColor: palette.rejectBg,
                          },
                          pressed && styles.pressed,
                        ]}
                        onPress={() => handleCancel(reservation.bookingId)}
                      >
                        <Text style={[styles.cancelBtnText, { color: palette.rejectText }]}>
                          Cancel Reservation
                        </Text>
                      </Pressable>
                    ) : null}

                    {isInProgress(reservation.status) ? (
                      <Pressable
                        style={({ pressed }) => [styles.trackBtn, pressed && styles.pressed]}
                        onPress={() =>
                          router.push({
                            pathname: "/customer/track-ride",
                            params: { bookingId: reservation.bookingId },
                          })
                        }
                      >
                        <LinearGradient
                          colors={["#E8C078", GOLD, "#B8862E"]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.trackGradient}
                        >
                          <Ionicons name="navigate" size={16} color="#1A1208" />
                          <Text style={styles.trackBtnText}>
                            {reservation.status === "ACCEPTED" ? "View Trip" : "Track Ride"}
                          </Text>
                        </LinearGradient>
                      </Pressable>
                    ) : null}
                  </BlurView>
                </View>
              );
            })
          )}

          <View style={{ height: 110 }} />
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  tabShell: {
    flexDirection: "row",
    marginHorizontal: 18,
    marginBottom: 14,
    padding: 4,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    borderRadius: 12,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "700",
  },
  container: { flex: 1 },
  contentContainer: {
    paddingHorizontal: 18,
  },
  cardWrap: {
    borderRadius: 22,
    marginBottom: 14,
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
  reservationCard: {
    borderRadius: 22,
    overflow: "hidden",
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  vehicleName: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  statusChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  bookingId: {
    fontSize: 12,
    fontWeight: "600",
    color: GOLD,
  },
  price: {
    fontSize: 14,
    fontWeight: "800",
    color: GOLD,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
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
    marginBottom: 12,
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
  driverCard: {
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  driverHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  driverLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "700",
  },
  driverInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  driverPhoto: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  driverPhotoFallback: {
    justifyContent: "center",
    alignItems: "center",
  },
  driverDetails: {
    flex: 1,
    marginLeft: 12,
  },
  driverName: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  vehicleNumber: {
    fontSize: 12,
  },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2E7D4F",
    justifyContent: "center",
    alignItems: "center",
  },
  cancelBtn: {
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  trackBtn: {
    borderRadius: 14,
    overflow: "hidden",
  },
  trackGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
  },
  trackBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1A1208",
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
