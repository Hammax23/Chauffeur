import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Image,
  Animated,
  Pressable,
  Platform,
  Linking,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { getReservationById, Reservation } from "../../services/api";
import { useReservationStream } from "../../hooks/useReservationStream";
import type { ReservationStreamStatus } from "../../services/reservation-stream";

// Palette — kept consistent with customer/index.tsx
const ACCENT = "#C9A063";
const ACCENT_DARK = "#A67C32";
const SLATE_900 = "#0f172a";
const SLATE_700 = "#334155";
const SLATE_600 = "#475569";
const SLATE_500 = "#64748b";
const SLATE_400 = "#94a3b8";
const SLATE_200 = "#e2e8f0";

type RideStatus = "pending" | "accepted" | "on_the_way" | "arrived" | "customer_in_car" | "stop" | "done";

interface StatusStep {
  id: Exclude<RideStatus, "pending">;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const statusSteps: StatusStep[] = [
  { id: "accepted", label: "Driver assigned", icon: "person-outline" },
  { id: "on_the_way", label: "On the way", icon: "car-outline" },
  { id: "arrived", label: "Arrived at pickup", icon: "location-outline" },
  { id: "customer_in_car", label: "In car", icon: "people-outline" },
  { id: "stop", label: "Stopped", icon: "pause-circle-outline" },
  { id: "done", label: "Completed", icon: "checkmark-circle-outline" },
];

const getStatusIndex = (status: RideStatus) => {
  const index = statusSteps.findIndex((s) => s.id === status);
  return index >= 0 ? index : -1;
};

const friendlyStatus = (status: RideStatus) => {
  switch (status) {
    case "pending": return "Awaiting driver";
    case "accepted": return "Driver assigned";
    case "on_the_way": return "On the way";
    case "arrived": return "Driver arrived";
    case "customer_in_car": return "In your ride";
    case "stop": return "Stopped";
    case "done": return "Trip completed";
    default: return "Awaiting driver";
  }
};

const statusSubtitle = (status: RideStatus) => {
  switch (status) {
    case "pending": return "We're matching you with a chauffeur.";
    case "accepted": return "Your chauffeur has accepted the request.";
    case "on_the_way": return "Your chauffeur is heading to pickup.";
    case "arrived": return "Your chauffeur is at the pickup location.";
    case "customer_in_car": return "Enjoy the ride — sit back and relax.";
    case "stop": return "Trip is currently paused.";
    case "done": return "Thanks for riding with SARJ.";
    default: return "";
  }
};

const getStatusTone = (status: RideStatus): "neutral" | "info" | "active" | "success" | "warn" => {
  switch (status) {
    case "pending": return "neutral";
    case "accepted": return "info";
    case "on_the_way":
    case "arrived":
    case "customer_in_car": return "active";
    case "stop": return "warn";
    case "done": return "success";
    default: return "neutral";
  }
};

function statusFromString(status: string): RideStatus {
  switch (status) {
    case "PENDING": return "pending";
    case "ACCEPTED": return "accepted";
    case "ON THE WAY": return "on_the_way";
    case "ARRIVED": return "arrived";
    case "CIC": return "customer_in_car";
    case "STOP": return "stop";
    case "DONE": return "done";
    default: return "pending";
  }
}

function describeConnection(status: ReservationStreamStatus): { label: string; tone: "live" | "warn" | "off" } {
  switch (status) {
    case "open": return { label: "LIVE", tone: "live" };
    case "connecting": return { label: "CONNECTING", tone: "warn" };
    case "reconnecting": return { label: "RECONNECTING", tone: "warn" };
    case "closed":
    case "idle":
    default: return { label: "OFFLINE", tone: "off" };
  }
}

function formatRelative(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const diffSec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diffSec < 30) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

export default function TrackRideScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Load the full reservation snapshot once for static fields (price, addresses, dates).
  useEffect(() => {
    if (!bookingId) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await getReservationById(bookingId);
        if (!cancelled && data.success) setReservation(data.reservation);
      } catch {
        // Stream will still try to provide live status
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [bookingId]);

  // 2. Open the realtime SSE channel — server pushes status / driver changes.
  const liveBookingId = typeof bookingId === "string" ? bookingId : null;
  const live = useReservationStream(liveBookingId);

  // Merge live data into the existing reservation snapshot (status, driver, etc.).
  useEffect(() => {
    if (!live.data) return;
    setReservation((prev) => {
      if (!prev) return prev;
      const driverFromLive = live.data?.driver
        ? {
            name: live.data.driver.name,
            phone: live.data.driver.phone,
            photo: live.data.driver.photo,
            vehicle: live.data.driver.vehicle ?? "",
            vehiclePlate: live.data.driver.vehiclePlate ?? "",
            rating: live.data.driver.rating ?? 0,
          }
        : null;
      return {
        ...prev,
        status: live.data?.status ?? prev.status,
        statusUpdatedAt: live.data?.statusUpdatedAt ?? prev.statusUpdatedAt,
        completedAt: live.data?.completedAt ?? prev.completedAt,
        driver: driverFromLive ?? prev.driver,
      };
    });
  }, [live.data]);

  const currentStatus: RideStatus = reservation ? statusFromString(reservation.status) : "pending";
  const currentIndex = getStatusIndex(currentStatus);

  // Pulse ring on the connection badge whenever we are LIVE.
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

  // Soft flash on the status pill when the status changes.
  const statusFlash = useRef(new Animated.Value(0)).current;
  const lastStatusRef = useRef<string | null>(null);
  useEffect(() => {
    const next = reservation?.status ?? null;
    if (next && lastStatusRef.current && next !== lastStatusRef.current) {
      statusFlash.setValue(1);
      Animated.timing(statusFlash, { toValue: 0, duration: 1400, useNativeDriver: false }).start();
    }
    lastStatusRef.current = next;
  }, [reservation?.status, statusFlash]);

  // Pulsing halo on the CURRENT step inside the journey timeline.
  const stepPulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    if (live.status !== "open") {
      stepPulse.stopAnimation();
      stepPulse.setValue(0.4);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(stepPulse, { toValue: 1, duration: 1100, useNativeDriver: true }),
        Animated.timing(stepPulse, { toValue: 0.4, duration: 1100, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [live.status, stepPulse]);

  // iOS-style spring press on the back button.
  const backScale = useRef(new Animated.Value(1)).current;
  const handleBackPressIn = useCallback(() => {
    Animated.spring(backScale, { toValue: 0.92, useNativeDriver: true, speed: 30, bounciness: 0 }).start();
  }, [backScale]);
  const handleBackPressOut = useCallback(() => {
    Animated.spring(backScale, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 6 }).start();
  }, [backScale]);

  const handleCallDriver = useCallback(() => {
    const phone = reservation?.driver?.phone?.replace(/[^0-9+]/g, "");
    if (!phone) return;
    Linking.openURL(`tel:${phone}`).catch(() => {});
  }, [reservation?.driver?.phone]);

  const conn = useMemo(() => describeConnection(live.status), [live.status]);
  const statusRelative = useMemo(
    () => formatRelative(reservation?.statusUpdatedAt) ?? formatRelative(live.lastEventAt),
    [reservation?.statusUpdatedAt, live.lastEventAt]
  );
  const friendly = friendlyStatus(currentStatus);
  const subtitle = statusSubtitle(currentStatus);
  const statusTone = getStatusTone(currentStatus);

  if (isLoading) {
    return (
      <LinearGradient colors={["#f1f4f9", "#fafbfc", "#ffffff"]} locations={[0, 0.38, 1]} style={styles.gradientFill}>
        <SafeAreaView style={[styles.safeArea, { justifyContent: "center", alignItems: "center" }]} edges={["top"]}>
          <ActivityIndicator size="large" color={ACCENT} />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#f1f4f9", "#fafbfc", "#ffffff"]} locations={[0, 0.38, 1]} style={styles.gradientFill}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <StatusBar barStyle="dark-content" />
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Top bar — back, title, live indicator */}
          <View style={styles.topBar}>
            <Animated.View style={{ transform: [{ scale: backScale }] }}>
              <Pressable
                style={styles.backButton}
                onPress={() => router.back()}
                onPressIn={handleBackPressIn}
                onPressOut={handleBackPressOut}
                hitSlop={8}
              >
                <Ionicons name="chevron-back" size={20} color={SLATE_900} />
              </Pressable>
            </Animated.View>

            <View style={styles.topTitleCol}>
              <Text style={styles.topEyebrow}>TRACK RIDE</Text>
              <Text style={styles.topBookingMono} numberOfLines={1}>
                {reservation?.bookingId || "—"}
              </Text>
            </View>

            <View
              style={[
                styles.liveBadge,
                conn.tone === "live" && styles.liveBadgeLive,
                conn.tone === "warn" && styles.liveBadgeWarn,
                conn.tone === "off" && styles.liveBadgeOff,
              ]}
            >
              <Animated.View
                style={[
                  styles.liveDot,
                  conn.tone === "live" && styles.liveDotLive,
                  conn.tone === "warn" && styles.liveDotWarn,
                  conn.tone === "off" && styles.liveDotOff,
                  conn.tone === "live" ? { opacity: livePulse } : null,
                ]}
              />
              <Text
                style={[
                  styles.liveBadgeText,
                  conn.tone === "live" && styles.liveBadgeTextLive,
                  conn.tone === "warn" && styles.liveBadgeTextWarn,
                  conn.tone === "off" && styles.liveBadgeTextOff,
                ]}
              >
                {conn.label}
              </Text>
            </View>
          </View>

          {/* Premium status hero */}
          <View style={styles.statusHero}>
            <LinearGradient
              colors={["#0E172A", "#0A1120", "#070B14"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={["rgba(201,160,99,0.22)", "rgba(201,160,99,0)"]}
              start={{ x: 1, y: 0 }}
              end={{ x: 0.4, y: 0.8 }}
              style={styles.statusHeroGlow}
              pointerEvents="none"
            />
            <View style={styles.statusHeroTopHairline} pointerEvents="none" />

            <View style={styles.statusHeroInner}>
              <View style={styles.statusHeroEyebrowRow}>
                <View style={styles.statusHeroEyebrowBar} />
                <Text style={styles.statusHeroEyebrow}>YOUR CHAUFFEUR</Text>
              </View>
              <View style={styles.statusHeroTitleRow}>
                <Text style={styles.statusHeroTitle} numberOfLines={1}>
                  {friendly}
                </Text>
                <View
                  style={[
                    styles.statusHeroTonePill,
                    statusTone === "active" && styles.statusHeroTonePillActive,
                    statusTone === "info" && styles.statusHeroTonePillInfo,
                    statusTone === "success" && styles.statusHeroTonePillSuccess,
                    statusTone === "warn" && styles.statusHeroTonePillWarn,
                  ]}
                >
                  <View
                    style={[
                      styles.statusHeroToneDot,
                      statusTone === "active" && styles.statusHeroToneDotActive,
                      statusTone === "info" && styles.statusHeroToneDotInfo,
                      statusTone === "success" && styles.statusHeroToneDotSuccess,
                      statusTone === "warn" && styles.statusHeroToneDotWarn,
                    ]}
                  />
                </View>
              </View>
              {subtitle ? (
                <Text style={styles.statusHeroSub} numberOfLines={2}>
                  {subtitle}
                </Text>
              ) : null}
              {statusRelative ? (
                <Text style={styles.statusHeroMeta}>Updated {statusRelative}</Text>
              ) : null}
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.statusHeroFlash,
                  { opacity: statusFlash },
                ]}
              />
            </View>
          </View>

          {/* Driver section */}
          <View style={styles.section}>
            <Text style={styles.sectionEyebrow}>DRIVER</Text>
            <View style={styles.driverCard}>
              {reservation?.driver?.photo ? (
                <Image source={{ uri: reservation.driver.photo }} style={styles.driverAvatar} />
              ) : (
                <View style={[styles.driverAvatar, styles.driverAvatarFallback]}>
                  <Ionicons name="person" size={20} color={SLATE_400} />
                </View>
              )}
              <View style={styles.driverInfoCol}>
                <Text style={styles.driverName} numberOfLines={1}>
                  {reservation?.driver?.name || "Awaiting assignment"}
                </Text>
                <View style={styles.driverMetaRow}>
                  {reservation?.driver?.vehiclePlate ? (
                    <Text style={styles.driverPlate} numberOfLines={1}>
                      {reservation.driver.vehiclePlate}
                    </Text>
                  ) : (
                    <Text style={styles.driverPlateMuted}>{reservation?.vehicle || "Vehicle TBD"}</Text>
                  )}
                  {reservation?.driver?.rating ? (
                    <View style={styles.driverRatingPill}>
                      <Ionicons name="star" size={11} color={ACCENT_DARK} />
                      <Text style={styles.driverRatingText}>{reservation.driver.rating.toFixed(1)}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <TouchableOpacity
                style={[styles.callBtn, !reservation?.driver?.phone && styles.callBtnDisabled]}
                disabled={!reservation?.driver?.phone}
                activeOpacity={0.85}
                onPress={handleCallDriver}
              >
                <Ionicons name="call" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Trip details — slim card */}
          <View style={styles.section}>
            <Text style={styles.sectionEyebrow}>TRIP</Text>
            <View style={styles.tripCard}>
              <View style={styles.tripMetaRow}>
                <View style={styles.tripMetaItem}>
                  <Text style={styles.tripMetaLabel}>DATE</Text>
                  <Text style={styles.tripMetaValue} numberOfLines={1}>
                    {reservation?.serviceDate || "—"}
                  </Text>
                </View>
                <View style={styles.tripMetaDivider} />
                <View style={styles.tripMetaItem}>
                  <Text style={styles.tripMetaLabel}>TIME</Text>
                  <Text style={styles.tripMetaValue} numberOfLines={1}>
                    {reservation?.serviceTime || "—"}
                  </Text>
                </View>
                <View style={styles.tripMetaDivider} />
                <View style={styles.tripMetaItem}>
                  <Text style={styles.tripMetaLabel}>GUESTS</Text>
                  <Text style={styles.tripMetaValue}>
                    {reservation?.passengers ?? 0}
                  </Text>
                </View>
              </View>

              <View style={styles.tripHairline} />

              {/* Route — connected vertical line with dots */}
              <View style={styles.routeTimeline}>
                <View style={styles.routeRow}>
                  <View style={styles.routeIndicatorCol}>
                    <View style={[styles.routeDot, { backgroundColor: "#10B981" }]} />
                    <View style={styles.routeLine} />
                  </View>
                  <View style={styles.routeContentCol}>
                    <Text style={styles.routeLabel}>PICK-UP</Text>
                    <Text style={styles.routeValue} numberOfLines={2}>
                      {reservation?.pickupLocation || "—"}
                    </Text>
                  </View>
                </View>

                {reservation?.stops ? (
                  <View style={styles.routeRow}>
                    <View style={styles.routeIndicatorCol}>
                      <View style={[styles.routeDot, styles.routeDotHollow]}>
                        <View style={styles.routeDotHollowInner} />
                      </View>
                      <View style={styles.routeLine} />
                    </View>
                    <View style={styles.routeContentCol}>
                      <Text style={styles.routeLabel}>STOP</Text>
                      <Text style={styles.routeValue} numberOfLines={2}>
                        {reservation.stops}
                      </Text>
                    </View>
                  </View>
                ) : null}

                <View style={[styles.routeRow, styles.routeRowLast]}>
                  <View style={styles.routeIndicatorCol}>
                    <View style={[styles.routeDot, { backgroundColor: ACCENT_DARK }]} />
                  </View>
                  <View style={styles.routeContentCol}>
                    <Text style={styles.routeLabel}>DROP-OFF</Text>
                    <Text style={styles.routeValue} numberOfLines={2}>
                      {reservation?.dropoffLocation || "—"}
                    </Text>
                  </View>
                </View>
              </View>

              {reservation?.vehicle || reservation?.total ? (
                <>
                  <View style={styles.tripHairline} />
                  <View style={styles.tripFooterRow}>
                    <Text style={styles.tripVehicle} numberOfLines={1}>
                      {reservation?.vehicle || "Vehicle TBD"}
                    </Text>
                    <Text style={styles.tripFare}>
                      ${reservation?.total?.toFixed(2) || "0.00"}
                      <Text style={styles.tripFareUnit}> CAD</Text>
                    </Text>
                  </View>
                </>
              ) : null}
            </View>
          </View>

          {/* Journey timeline */}
          <View style={styles.section}>
            <Text style={styles.sectionEyebrow}>JOURNEY</Text>
            <View style={styles.journeyCard}>
              {statusSteps.map((step, index) => {
                const isCompleted = index < currentIndex;
                const isCurrent = index === currentIndex;
                const isFuture = currentIndex === -1 || index > currentIndex;
                const isLast = index === statusSteps.length - 1;

                return (
                  <View key={step.id} style={styles.journeyRow}>
                    {/* Indicator column */}
                    <View style={styles.journeyIndicatorCol}>
                      <View
                        style={[
                          styles.journeyIconTile,
                          isCompleted && styles.journeyIconTileCompleted,
                          isCurrent && styles.journeyIconTileCurrent,
                          isFuture && styles.journeyIconTileFuture,
                        ]}
                      >
                        {isCurrent ? (
                          <Animated.View
                            pointerEvents="none"
                            style={[styles.journeyHalo, { opacity: stepPulse }]}
                          />
                        ) : null}
                        {isCompleted ? (
                          <Ionicons name="checkmark" size={15} color="#fff" />
                        ) : (
                          <Ionicons
                            name={step.icon}
                            size={14}
                            color={isCurrent ? "#fff" : SLATE_400}
                          />
                        )}
                      </View>
                      {!isLast ? (
                        <View
                          style={[
                            styles.journeyConnector,
                            (isCompleted || isCurrent) && styles.journeyConnectorActive,
                          ]}
                        />
                      ) : null}
                    </View>

                    {/* Step content */}
                    <View style={styles.journeyContentCol}>
                      <Text
                        style={[
                          styles.journeyLabel,
                          isFuture && styles.journeyLabelFuture,
                          isCurrent && styles.journeyLabelCurrent,
                        ]}
                        numberOfLines={1}
                      >
                        {step.label}
                      </Text>
                      <Text
                        style={[
                          styles.journeyMeta,
                          isCurrent && styles.journeyMetaCurrent,
                        ]}
                      >
                        {isCompleted ? "Done" : isCurrent ? "In progress" : "Pending"}
                      </Text>
                    </View>

                    {isCurrent ? (
                      <View style={styles.journeyNowChip}>
                        <Text style={styles.journeyNowChipText}>NOW</Text>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>

            {live.status === "reconnecting" && live.error ? (
              <Text style={styles.connectionHintWarn}>Reconnecting… {live.error}</Text>
            ) : null}
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientFill: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: "transparent" },
  container: { flex: 1 },
  contentContainer: {
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 16,
  },

  /* ───── top bar ───── */
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    marginBottom: 14,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15,23,42,0.08)",
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: { shadowColor: "#0f172a", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  topTitleCol: {
    flex: 1,
    minWidth: 0,
  },
  topEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    color: SLATE_400,
    letterSpacing: 2,
    marginBottom: 2,
  },
  topBookingMono: {
    fontSize: 13,
    fontWeight: "700",
    color: SLATE_900,
    letterSpacing: 0.4,
    ...Platform.select({
      ios: { fontFamily: "Menlo" },
      android: { fontFamily: "monospace" },
    }),
  },

  /* ───── live badge ───── */
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  liveBadgeLive: { backgroundColor: "#ECFDF5", borderColor: "rgba(16,185,129,0.35)" },
  liveBadgeWarn: { backgroundColor: "#FFFBEB", borderColor: "rgba(217,119,6,0.35)" },
  liveBadgeOff: { backgroundColor: "#F1F5F9", borderColor: "rgba(15,23,42,0.12)" },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveDotLive: { backgroundColor: "#10B981" },
  liveDotWarn: { backgroundColor: "#D97706" },
  liveDotOff: { backgroundColor: "#94A3B8" },
  liveBadgeText: { fontSize: 9.5, fontWeight: "800", letterSpacing: 0.6 },
  liveBadgeTextLive: { color: "#047857" },
  liveBadgeTextWarn: { color: "#B45309" },
  liveBadgeTextOff: { color: "#475569" },

  /* ───── status hero ───── */
  statusHero: {
    position: "relative",
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 22,
    backgroundColor: "#0A1120",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.06)",
    ...Platform.select({
      ios: {
        shadowColor: "#020617",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.22,
        shadowRadius: 22,
      },
      android: { elevation: 8 },
    }),
  },
  statusHeroGlow: {
    position: "absolute",
    top: -30,
    right: -40,
    width: 220,
    height: 180,
    borderRadius: 220,
  },
  statusHeroTopHairline: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  statusHeroInner: {
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  statusHeroEyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  statusHeroEyebrowBar: {
    width: 16,
    height: 2,
    borderRadius: 1,
    backgroundColor: ACCENT,
    opacity: 0.85,
  },
  statusHeroEyebrow: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "rgba(255,255,255,0.62)",
    letterSpacing: 2.4,
  },
  statusHeroTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusHeroTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.4,
  },
  statusHeroTonePill: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(148,163,184,0.18)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(148,163,184,0.30)",
  },
  statusHeroTonePillActive: {
    backgroundColor: "rgba(201,160,99,0.18)",
    borderColor: "rgba(201,160,99,0.45)",
  },
  statusHeroTonePillInfo: {
    backgroundColor: "rgba(59,130,246,0.20)",
    borderColor: "rgba(59,130,246,0.45)",
  },
  statusHeroTonePillSuccess: {
    backgroundColor: "rgba(16,185,129,0.20)",
    borderColor: "rgba(16,185,129,0.45)",
  },
  statusHeroTonePillWarn: {
    backgroundColor: "rgba(220,38,38,0.20)",
    borderColor: "rgba(220,38,38,0.45)",
  },
  statusHeroToneDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: SLATE_400 },
  statusHeroToneDotActive: { backgroundColor: ACCENT },
  statusHeroToneDotInfo: { backgroundColor: "#60A5FA" },
  statusHeroToneDotSuccess: { backgroundColor: "#10B981" },
  statusHeroToneDotWarn: { backgroundColor: "#F87171" },
  statusHeroSub: {
    fontSize: 13,
    color: "rgba(226,232,240,0.66)",
    lineHeight: 18,
    marginTop: 6,
  },
  statusHeroMeta: {
    fontSize: 11,
    color: "rgba(226,232,240,0.46)",
    marginTop: 10,
    letterSpacing: 0.2,
  },
  statusHeroFlash: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(201,160,99,0.18)",
    opacity: 0,
  },

  /* ───── sections ───── */
  section: { marginBottom: 22 },
  sectionEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    color: SLATE_400,
    letterSpacing: 2,
    marginBottom: 10,
  },

  /* ───── driver card ───── */
  driverCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15,23,42,0.08)",
    ...Platform.select({
      ios: { shadowColor: "#0f172a", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
      android: { elevation: 1 },
    }),
  },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(201,160,99,0.45)",
  },
  driverAvatarFallback: {
    backgroundColor: SLATE_200,
    justifyContent: "center",
    alignItems: "center",
  },
  driverInfoCol: {
    flex: 1,
    minWidth: 0,
  },
  driverName: {
    fontSize: 14.5,
    fontWeight: "700",
    color: SLATE_900,
    letterSpacing: -0.1,
    marginBottom: 3,
  },
  driverMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  driverPlate: {
    fontSize: 11,
    fontWeight: "700",
    color: SLATE_700,
    letterSpacing: 1.2,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15,23,42,0.08)",
    ...Platform.select({
      ios: { fontFamily: "Menlo" },
      android: { fontFamily: "monospace" },
    }),
  },
  driverPlateMuted: {
    fontSize: 12,
    color: SLATE_500,
  },
  driverRatingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(201,160,99,0.10)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(201,160,99,0.30)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  driverRatingText: {
    fontSize: 11,
    fontWeight: "700",
    color: ACCENT_DARK,
  },
  callBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: { shadowColor: "#10B981", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  callBtnDisabled: {
    backgroundColor: "#CBD5E1",
    ...Platform.select({ ios: { shadowOpacity: 0 }, android: { elevation: 0 } }),
  },

  /* ───── trip card ───── */
  tripCard: {
    backgroundColor: "#fff",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15,23,42,0.08)",
    ...Platform.select({
      ios: { shadowColor: "#0f172a", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
      android: { elevation: 1 },
    }),
  },
  tripMetaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  tripMetaItem: {
    flex: 1,
    minWidth: 0,
  },
  tripMetaDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
    backgroundColor: "rgba(15,23,42,0.10)",
    marginHorizontal: 10,
  },
  tripMetaLabel: {
    fontSize: 9.5,
    fontWeight: "800",
    color: SLATE_400,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  tripMetaValue: {
    fontSize: 13,
    fontWeight: "600",
    color: SLATE_900,
    letterSpacing: -0.1,
  },
  tripHairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(15,23,42,0.08)",
    marginVertical: 12,
  },
  routeTimeline: {
    paddingLeft: 2,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingBottom: 14,
  },
  routeRowLast: {
    paddingBottom: 0,
  },
  routeIndicatorCol: {
    width: 14,
    alignItems: "center",
    paddingTop: 4,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: SLATE_400,
    justifyContent: "center",
    alignItems: "center",
  },
  routeDotHollow: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: SLATE_400,
  },
  routeDotHollowInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: SLATE_400,
  },
  routeLine: {
    width: 1.5,
    flex: 1,
    minHeight: 20,
    backgroundColor: "rgba(15,23,42,0.12)",
    marginTop: 3,
  },
  routeContentCol: {
    flex: 1,
    minWidth: 0,
  },
  routeLabel: {
    fontSize: 9.5,
    fontWeight: "800",
    color: SLATE_400,
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  routeValue: {
    fontSize: 13,
    fontWeight: "600",
    color: SLATE_900,
    lineHeight: 17,
    letterSpacing: -0.1,
  },
  tripFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tripVehicle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: SLATE_700,
    minWidth: 0,
    marginRight: 8,
  },
  tripFare: {
    fontSize: 14,
    fontWeight: "800",
    color: ACCENT_DARK,
    letterSpacing: -0.2,
  },
  tripFareUnit: {
    fontSize: 10,
    fontWeight: "700",
    color: SLATE_400,
    letterSpacing: 0.4,
  },

  /* ───── journey timeline ───── */
  journeyCard: {
    backgroundColor: "#fff",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15,23,42,0.08)",
    ...Platform.select({
      ios: { shadowColor: "#0f172a", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
      android: { elevation: 1 },
    }),
  },
  journeyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 10,
  },
  journeyIndicatorCol: {
    width: 28,
    alignItems: "center",
  },
  journeyIconTile: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: SLATE_200,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  journeyIconTileCompleted: { backgroundColor: ACCENT },
  journeyIconTileCurrent: { backgroundColor: ACCENT_DARK },
  journeyIconTileFuture: {
    backgroundColor: "#F1F5F9",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15,23,42,0.08)",
  },
  journeyHalo: {
    position: "absolute",
    top: -5,
    left: -5,
    right: -5,
    bottom: -5,
    borderRadius: 14,
    backgroundColor: "rgba(201,160,99,0.30)",
  },
  journeyConnector: {
    width: 1.5,
    flex: 1,
    minHeight: 14,
    backgroundColor: "rgba(15,23,42,0.10)",
    marginTop: 3,
  },
  journeyConnectorActive: {
    backgroundColor: ACCENT,
    opacity: 0.55,
  },
  journeyContentCol: {
    flex: 1,
    minWidth: 0,
    paddingTop: 3,
  },
  journeyLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: SLATE_900,
    letterSpacing: -0.1,
  },
  journeyLabelFuture: {
    color: SLATE_500,
    fontWeight: "500",
  },
  journeyLabelCurrent: {
    color: SLATE_900,
    fontWeight: "700",
  },
  journeyMeta: {
    fontSize: 11,
    color: SLATE_400,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  journeyMetaCurrent: {
    color: ACCENT_DARK,
    fontWeight: "700",
  },
  journeyNowChip: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(201,160,99,0.12)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(201,160,99,0.32)",
    marginTop: 4,
  },
  journeyNowChipText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: ACCENT_DARK,
    letterSpacing: 0.8,
  },
  connectionHintWarn: {
    marginTop: 10,
    fontSize: 11,
    color: "#B45309",
    fontWeight: "500",
  },
});
