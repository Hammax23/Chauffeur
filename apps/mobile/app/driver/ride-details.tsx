import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Alert,
  Animated,
  Easing,
  Pressable,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getDriverRideDetail, updateRideStatus, DriverRide } from "../../services/api";
import { syncDriverLiveTracking } from "../../services/driver-live-session";
import { SlimSpinner } from "../../components/SlimSpinner";

type RideStatus =
  | "pending"
  | "accepted"
  | "on_the_way"
  | "arrived"
  | "customer_in_car"
  | "stop"
  | "done";

type StopPeriod = { start: string; end?: string };

const GOLD = "#D4A04A";
const AMBER = "#F5A623";
const RED = "#E53935";
const GREEN = "#16A34A";
const INK = "#0B0B0B";
const MUTED = "#6B7280";
const SHEET = "#F7F7F8";

const statusSteps = [
  { id: "on_the_way", label: "On The Way", short: "En route", hint: "Head to pickup", icon: "car-outline" as const },
  { id: "arrived", label: "Arrived", short: "Arrived", hint: "At pickup", icon: "location-outline" as const },
  {
    id: "customer_in_car",
    label: "Customer In Car",
    short: "In car",
    hint: "Trip started",
    icon: "person-outline" as const,
  },
  { id: "done", label: "Done", short: "Done", hint: "Complete ride", icon: "checkmark-circle-outline" as const },
];

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

function formatClock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

const getStatusIndex = (status: RideStatus) => {
  if (status === "stop") return statusSteps.findIndex((s) => s.id === "customer_in_car");
  const index = statusSteps.findIndex((s) => s.id === status);
  return index >= 0 ? index : -1;
};

const getStatusMeta = (status: RideStatus) => {
  switch (status) {
    case "pending":
      return { label: "Pending", color: "#9CA3AF", subtitle: "Waiting to start" };
    case "accepted":
      return { label: "Accepted", color: "#3B82F6", subtitle: "Ready when you are" };
    case "on_the_way":
      return { label: "On The Way", color: GOLD, subtitle: "Heading to pickup" };
    case "arrived":
      return { label: "Arrived", color: GREEN, subtitle: "At pickup location" };
    case "customer_in_car":
      return { label: "Customer In Car", color: GOLD, subtitle: "Trip in progress" };
    case "stop":
      return { label: "Mid-trip Stop", color: RED, subtitle: "Trip paused" };
    case "done":
      return { label: "Completed", color: GREEN, subtitle: "Ride finished" };
    default:
      return { label: "Pending", color: "#9CA3AF", subtitle: "" };
  }
};

function nextActionForStatus(status: RideStatus): { id: string; label: string; icon: keyof typeof Ionicons.glyphMap } | null {
  switch (status) {
    case "accepted":
    case "pending":
      return { id: "on_the_way", label: "Start — On The Way", icon: "navigate" };
    case "on_the_way":
      return { id: "arrived", label: "Mark Arrived", icon: "location" };
    case "arrived":
      return { id: "customer_in_car", label: "Customer In Car", icon: "person" };
    case "customer_in_car":
      return { id: "done", label: "Complete Ride", icon: "checkmark-circle" };
    case "stop":
      return { id: "continue", label: "Continue Trip", icon: "play" };
    default:
      return null;
  }
}

export default function RideDetailsScreen() {
  const { bookingId } = useLocalSearchParams();
  const id = typeof bookingId === "string" ? bookingId : Array.isArray(bookingId) ? bookingId[0] : "";

  const [ride, setRide] = useState<DriverRide | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [tick, setTick] = useState(0);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(28)).current;
  const sheetSlide = useRef(new Animated.Value(40)).current;
  const livePulse = useRef(new Animated.Value(0.35)).current;
  const stepPulse = useRef(new Animated.Value(0.45)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const ctaScale = useRef(new Animated.Value(1)).current;
  const lastStatusRef = useRef<string | null>(null);
  const statusFlash = useRef(new Animated.Value(0)).current;
  const glowDrift = useRef(new Animated.Value(0)).current;

  const mapStatusToRideStatus = (status: string): RideStatus => {
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
        return "done";
      default:
        return "pending";
    }
  };

  const mapRideStatusToApi = (status: RideStatus): string => {
    switch (status) {
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
      default:
        return "ON THE WAY";
    }
  };

  const refreshRide = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getDriverRideDetail(id);
      if (data.success) setRide(data.ride);
    } catch {
      // ignore
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      (async () => {
        try {
          const data = await getDriverRideDetail(id);
          if (data.success) setRide(data.ride);
        } catch {
          // Silently fail
        } finally {
          setIsLoading(false);
        }
      })();
    } else {
      setIsLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      syncDriverLiveTracking().catch(() => {});
      refreshRide();
    }, [refreshRide])
  );

  useEffect(() => {
    if (!ride || ride.completedAt) return;
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [ride?.bookingId, ride?.completedAt]);

  // Entrance
  useEffect(() => {
    if (isLoading) return;
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 520,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(slideUp, {
        toValue: 0,
        useNativeDriver: true,
        damping: 18,
        stiffness: 140,
        mass: 0.9,
      }),
      Animated.sequence([
        Animated.delay(80),
        Animated.spring(sheetSlide, {
          toValue: 0,
          useNativeDriver: true,
          damping: 16,
          stiffness: 120,
          mass: 1,
        }),
      ]),
    ]).start();
  }, [isLoading, fadeIn, slideUp, sheetSlide]);

  // Soft ambient gold drift
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowDrift, {
          toValue: 1,
          duration: 4200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glowDrift, {
          toValue: 0,
          duration: 4200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [glowDrift]);

  // Live pulse
  useEffect(() => {
    const active = !!ride && !ride.completedAt && ride.status !== "DONE";
    if (!active) {
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
  }, [ride?.status, ride?.completedAt, livePulse]);

  // Current step pulse
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(stepPulse, { toValue: 1, duration: 1100, useNativeDriver: true }),
        Animated.timing(stepPulse, { toValue: 0.4, duration: 1100, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [stepPulse]);

  const currentStatus: RideStatus = ride ? mapStatusToRideStatus(ride.status) : "pending";
  const currentIndex = getStatusIndex(currentStatus);
  const statusMeta = getStatusMeta(currentStatus);
  const progressRatio = useMemo(() => {
    if (currentStatus === "done") return 1;
    if (currentIndex < 0) return 0;
    return currentIndex / Math.max(1, statusSteps.length - 1);
  }, [currentIndex, currentStatus]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progressRatio,
      duration: 550,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progressRatio, progressAnim]);

  useEffect(() => {
    const next = ride?.status ?? null;
    if (next && lastStatusRef.current && next !== lastStatusRef.current) {
      statusFlash.setValue(1);
      Animated.timing(statusFlash, { toValue: 0, duration: 1200, useNativeDriver: false }).start();
    }
    lastStatusRef.current = next;
  }, [ride?.status, statusFlash]);

  const stopPeriods = useMemo(
    () => parseStopPeriods(ride?.driverStopPeriodsJson),
    [ride?.driverStopPeriodsJson, tick]
  );

  const timing = useMemo(() => {
    if (!ride) return null;
    const now = Date.now();
    const tripStart = ride.driverOnTheWayAt ? Date.parse(ride.driverOnTheWayAt) : null;
    const tripEnd = ride.completedAt ? Date.parse(ride.completedAt) : now;
    const totalTripMs = tripStart ? tripEnd - tripStart : 0;

    const completedStops = stopPeriods.filter((p) => p.end);
    const completedStopMs = completedStops.reduce(
      (acc, p) => acc + (Date.parse(p.end!) - Date.parse(p.start)),
      0
    );

    const last = stopPeriods[stopPeriods.length - 1];
    let currentStopMs = 0;
    if (ride.status === "STOP" && last && !last.end) {
      currentStopMs = now - Date.parse(last.start);
    }

    let drivingAfterContinueMs = 0;
    if (last?.end && ride.status === "CIC" && !ride.completedAt) {
      drivingAfterContinueMs = now - Date.parse(last.end);
    }

    return {
      totalTripMs,
      completedStopMs,
      currentStopMs,
      drivingAfterContinueMs,
      hasTripStart: !!tripStart,
      completedStops,
      stopCount: completedStops.length + (ride.status === "STOP" ? 1 : 0),
    };
  }, [ride, stopPeriods, tick]);

  const canUseStop = ride?.status === "CIC" || ride?.status === "STOP";
  const isOnStop = ride?.status === "STOP";
  const nextAction = nextActionForStatus(currentStatus);
  const canMessage =
    !!ride &&
    ["ACCEPTED", "ON THE WAY", "ARRIVED", "CIC", "STOP", "DONE", "CANCELLED"].includes(ride.status);

  const stepCompleted = (index: number): boolean => {
    if (!ride) return false;
    if (currentStatus === "done") return true;
    if (index < currentIndex) return true;
    return false;
  };

  const stepCurrent = (index: number): boolean => {
    if (!ride || currentStatus === "done") return false;
    if (ride.status === "STOP") return index === 2;
    return index === currentIndex;
  };

  const runStatusUpdate = async (apiStatus: string) => {
    if (!ride || isUpdating) return;
    setIsUpdating(true);
    try {
      const result = await updateRideStatus(ride.bookingId, apiStatus);
      if (result.success) {
        await refreshRide();
        syncDriverLiveTracking().catch(() => {});
        if (apiStatus === "DONE") {
          Alert.alert("Ride complete", "This ride has been marked as done.", [
            { text: "OK", onPress: () => router.back() },
          ]);
        }
      } else {
        Alert.alert("Error", "Failed to update status");
      }
    } catch {
      Alert.alert("Error", "Something went wrong");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStatusChange = (stepId: string) => {
    if (!ride || isUpdating) return;
    if (ride.status === "STOP") {
      Alert.alert("Trip paused", "Tap Continue Trip before changing status.");
      return;
    }
    const apiStatus = mapRideStatusToApi(stepId as RideStatus);
    Alert.alert("Update status", `Set status to “${apiStatus}”?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Confirm", onPress: () => runStatusUpdate(apiStatus) },
    ]);
  };

  const onStartStop = () => {
    if (!ride || isUpdating || ride.status !== "CIC") return;
    Alert.alert("Start mid-trip stop", "A stop timer will run until you resume the trip.", [
      { text: "Cancel", style: "cancel" },
      { text: "Start stop", style: "destructive", onPress: () => runStatusUpdate("STOP") },
    ]);
  };

  const onContinueTrip = () => {
    if (!ride || isUpdating || ride.status !== "STOP") return;
    Alert.alert("Continue trip", "Resume driving and return to Customer In Car?", [
      { text: "Cancel", style: "cancel" },
      { text: "Continue", onPress: () => runStatusUpdate("CIC") },
    ]);
  };

  const onPrimaryCta = () => {
    if (!nextAction) return;
    if (nextAction.id === "continue") {
      onContinueTrip();
      return;
    }
    handleStatusChange(nextAction.id);
  };

  const tripTimerDisplay = timing?.hasTripStart ? formatDuration(timing.totalTripMs) : "—";
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });
  const flashBg = statusFlash.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(212,160,74,0)", "rgba(212,160,74,0.18)"],
  });
  const glowX = glowDrift.interpolate({
    inputRange: [0, 1],
    outputRange: [-18, 22],
  });
  const glowY = glowDrift.interpolate({
    inputRange: [0, 1],
    outputRange: [8, -14],
  });
  const blurIntensity = Platform.OS === "ios" ? 42 : 24;

  if (isLoading) {
    return (
      <View style={styles.loadingRoot}>
        <LinearGradient colors={["#0B0B0B", "#1A1612", "#0B0B0B"]} style={StyleSheet.absoluteFill} />
        <SlimSpinner size={34} stroke={2} color={GOLD} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={["#070707", "#15110E", "#0C0B0A"]} style={styles.heroBg} />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ambientGlow,
          {
            transform: [{ translateX: glowX }, { translateY: glowY }],
            opacity: glowDrift.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.55] }),
          },
        ]}
      >
        <LinearGradient
          colors={["rgba(212,160,74,0.35)", "rgba(212,160,74,0.05)", "transparent"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.9, y: 1 }}
        />
      </Animated.View>

      <SafeAreaView style={styles.safe} edges={["top"]}>
        <Animated.View style={{ flex: 1, opacity: fadeIn, transform: [{ translateY: slideUp }] }}>
          {/* Top chrome — frosted glass */}
          <View style={styles.topBar}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.glassCircleWrap, pressed && { opacity: 0.75, transform: [{ scale: 0.96 }] }]}
            >
              <BlurView intensity={blurIntensity} tint="dark" style={styles.glassCircle}>
                <Ionicons name="chevron-back" size={20} color="#fff" />
              </BlurView>
            </Pressable>

            <BlurView intensity={blurIntensity} tint="dark" style={styles.liveBadge}>
              <Animated.View
                style={[
                  styles.livePulseRing,
                  {
                    opacity: livePulse,
                    transform: [
                      {
                        scale: livePulse.interpolate({
                          inputRange: [0.35, 1],
                          outputRange: [1, 1.7],
                        }),
                      },
                    ],
                  },
                ]}
              />
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>
                {currentStatus === "done" ? "DONE" : "LIVE"}
              </Text>
            </BlurView>

            <BlurView intensity={blurIntensity} tint="dark" style={styles.timerPill}>
              <Ionicons name="time-outline" size={13} color={GOLD} />
              <Text style={styles.timerPillText}>{tripTimerDisplay}</Text>
            </BlurView>
          </View>

          {/* Hero copy */}
          <Animated.View style={[styles.heroCopy, { backgroundColor: flashBg }]}>
            <Text style={styles.heroEyebrow}>OPEN RIDE</Text>
            <Text style={styles.heroStatus}>{statusMeta.label}</Text>
            <Text style={styles.heroSub}>{statusMeta.subtitle}</Text>
            <View style={styles.bookingChip}>
              <Ionicons name="ticket-outline" size={12} color="rgba(255,255,255,0.55)" />
              <Text style={styles.bookingId} numberOfLines={1}>
                {ride?.bookingId || "N/A"}
              </Text>
            </View>
          </Animated.View>

          {/* Horizontal journey progress — glass */}
          <BlurView intensity={Platform.OS === "ios" ? 28 : 18} tint="dark" style={styles.progressCard}>
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
            </View>
            <View style={styles.progressSteps}>
              {statusSteps.map((step, index) => {
                const done = stepCompleted(index);
                const current = stepCurrent(index);
                return (
                  <TouchableOpacity
                    key={step.id}
                    style={styles.progressStep}
                    disabled={isOnStop || isUpdating}
                    onPress={() => handleStatusChange(step.id)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.progressNodeWrap}>
                      {current ? (
                        <Animated.View
                          style={[
                            styles.progressHalo,
                            {
                              opacity: stepPulse,
                              transform: [
                                {
                                  scale: stepPulse.interpolate({
                                    inputRange: [0.4, 1],
                                    outputRange: [1, 1.4],
                                  }),
                                },
                              ],
                            },
                          ]}
                        />
                      ) : null}
                      <View
                        style={[
                          styles.progressNode,
                          done && styles.progressNodeDone,
                          current && styles.progressNodeCurrent,
                        ]}
                      >
                        {done && !current ? (
                          <Ionicons name="checkmark" size={12} color="#fff" />
                        ) : (
                          <Ionicons
                            name={step.icon}
                            size={13}
                            color={done || current ? "#fff" : "#9CA3AF"}
                          />
                        )}
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.progressLabel,
                        (done || current) && styles.progressLabelActive,
                        current && styles.progressLabelCurrent,
                      ]}
                      numberOfLines={1}
                    >
                      {step.short}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </BlurView>

          {/* Sheet */}
          <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetSlide }] }]}>
            <View style={styles.sheetHandle} />
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.sheetContent}
              showsVerticalScrollIndicator={false}
              bounces
              decelerationRate="fast"
            >
              {isOnStop && timing ? (
                <View style={[styles.stopBanner, styles.iosShadow]}>
                  <LinearGradient colors={["#7F1D1D", "#B91C1C"]} style={styles.stopBannerGrad}>
                    <View style={styles.stopBannerTop}>
                      <View style={styles.stopBannerIcon}>
                        <Ionicons name="pause" size={16} color="#fff" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.stopBannerTitle}>Trip paused</Text>
                        <Text style={styles.stopBannerSub}>Mid-trip stop in progress</Text>
                      </View>
                    </View>
                    <Text style={styles.stopBannerTimer}>{formatDuration(timing.currentStopMs)}</Text>
                  </LinearGradient>
                </View>
              ) : null}

              <View style={styles.metricsRow}>
                <View style={[styles.metricCard, styles.iosShadowSoft]}>
                  <Text style={styles.metricLabel}>Trip</Text>
                  <Text style={styles.metricValue}>{tripTimerDisplay}</Text>
                </View>
                <View style={[styles.metricCard, styles.iosShadowSoft]}>
                  <Text style={styles.metricLabel}>Stopped</Text>
                  <Text style={[styles.metricValue, { color: RED }]}>
                    {timing && timing.completedStopMs > 0
                      ? formatDuration(timing.completedStopMs)
                      : "0:00"}
                  </Text>
                </View>
                <View style={[styles.metricCard, styles.iosShadowSoft]}>
                  <Text style={styles.metricLabel}>Stops</Text>
                  <Text style={styles.metricValue}>{timing?.stopCount ?? 0}</Text>
                </View>
              </View>

              {timing && timing.drivingAfterContinueMs > 0 && ride?.status === "CIC" && !ride.completedAt ? (
                <View style={styles.resumeChip}>
                  <Ionicons name="navigate" size={13} color={AMBER} />
                  <Text style={styles.resumeChipText}>
                    Driving since last stop · {formatDuration(timing.drivingAfterContinueMs)}
                  </Text>
                </View>
              ) : null}

              {/* Customer */}
              <View style={[styles.card, styles.iosShadow]}>
                <View style={styles.customerRow}>
                  <LinearGradient colors={[GOLD, "#B8893A"]} style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {(ride?.customerName || "C").trim().charAt(0).toUpperCase()}
                    </Text>
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.customerName}>{ride?.customerName || "N/A"}</Text>
                    <Text style={styles.customerMeta}>
                      {ride?.passengers || 0} passenger{(ride?.passengers || 0) === 1 ? "" : "s"}
                      {ride?.vehicle ? ` · ${ride.vehicle}` : ""}
                    </Text>
                  </View>
                </View>
                {canMessage ? (
                  <TouchableOpacity
                    style={styles.messageBtn}
                    activeOpacity={0.88}
                    onPress={() =>
                      router.push({
                        pathname: "/driver/chat",
                        params: { bookingId: id, name: ride?.customerName || "Customer" },
                      })
                    }
                  >
                    <Ionicons name="chatbubble-ellipses" size={16} color="#fff" />
                    <Text style={styles.messageBtnText}>Message customer</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Route */}
              <View style={[styles.card, styles.iosShadow]}>
                <Text style={styles.cardTitle}>Trip route</Text>
                <View style={styles.routeRow}>
                  <View style={styles.routeRail}>
                    <View style={[styles.routeDot, { backgroundColor: GREEN }]} />
                    <View style={styles.routeLine} />
                    {ride?.stops ? (
                      <>
                        <View style={[styles.routeDot, { backgroundColor: RED }]} />
                        <View style={styles.routeLine} />
                      </>
                    ) : null}
                    <View style={[styles.routeDot, { backgroundColor: AMBER }]} />
                  </View>
                  <View style={{ flex: 1, gap: 14 }}>
                    <View>
                      <Text style={[styles.routeLabel, { color: GREEN }]}>Pick-up</Text>
                      <Text style={styles.routeText}>{ride?.pickupLocation || "N/A"}</Text>
                    </View>
                    {ride?.stops ? (
                      <View>
                        <Text style={[styles.routeLabel, { color: RED }]}>Route stop</Text>
                        <Text style={styles.routeText}>{ride.stops}</Text>
                      </View>
                    ) : null}
                    <View>
                      <Text style={[styles.routeLabel, { color: AMBER }]}>Drop-off</Text>
                      <Text style={styles.routeText}>{ride?.dropoffLocation || "N/A"}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.scheduleRow}>
                  <View style={styles.scheduleItem}>
                    <Text style={styles.scheduleLabel}>Date</Text>
                    <Text style={styles.scheduleValue}>{ride?.serviceDate || "—"}</Text>
                  </View>
                  <View style={styles.scheduleItem}>
                    <Text style={styles.scheduleLabel}>Time</Text>
                    <Text style={styles.scheduleValue}>{ride?.serviceTime || "—"}</Text>
                  </View>
                </View>
              </View>

              {/* Mid-trip stop */}
              {canUseStop && !isOnStop ? (
                <View style={[styles.stopCard, styles.iosShadow]}>
                  <View style={styles.stopCardHeader}>
                    <View style={styles.stopCardIcon}>
                      <Ionicons name="pause-circle" size={22} color={RED} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.stopCardTitle}>Mid-trip stop</Text>
                      <Text style={styles.stopCardSub}>
                        Pause for fuel, wait, or passenger request — resume anytime.
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.startStopBtn}
                    onPress={onStartStop}
                    disabled={isUpdating}
                    activeOpacity={0.85}
                  >
                    {isUpdating ? (
                      <SlimSpinner size={20} stroke={2} color={RED} />
                    ) : (
                      <>
                        <Ionicons name="stop-circle" size={18} color={RED} />
                        <Text style={styles.startStopBtnText}>Start stop</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              ) : null}

              {timing && timing.completedStops.length > 0 ? (
                <View style={[styles.card, styles.iosShadow]}>
                  <Text style={styles.cardTitle}>
                    Stop history · {timing.completedStops.length}
                  </Text>
                  {timing.completedStops.map((period, i) => {
                    const ms = Date.parse(period.end!) - Date.parse(period.start);
                    return (
                      <View
                        key={`${period.start}-${i}`}
                        style={[
                          styles.historyRow,
                          i < timing.completedStops.length - 1 && styles.historyBorder,
                        ]}
                      >
                        <View>
                          <Text style={styles.historyIndex}>Stop {i + 1}</Text>
                          <Text style={styles.historyRange}>
                            {formatClock(period.start)} – {formatClock(period.end!)}
                          </Text>
                        </View>
                        <Text style={styles.historyDuration}>{formatDuration(ms)}</Text>
                      </View>
                    );
                  })}
                </View>
              ) : null}

              {/* Detailed status list */}
              <View style={[styles.card, styles.iosShadow]}>
                <Text style={styles.cardTitle}>Update status</Text>
                {statusSteps.map((step, index) => {
                  const done = stepCompleted(index);
                  const current = stepCurrent(index);
                  return (
                    <TouchableOpacity
                      key={step.id}
                      style={[styles.statusRow, current && styles.statusRowCurrent]}
                      disabled={isOnStop || isUpdating}
                      onPress={() => handleStatusChange(step.id)}
                      activeOpacity={0.8}
                    >
                      <View
                        style={[
                          styles.statusIcon,
                          done && styles.statusIconDone,
                          current && styles.statusIconCurrent,
                        ]}
                      >
                        {done && !current ? (
                          <Ionicons name="checkmark" size={15} color="#fff" />
                        ) : (
                          <Ionicons
                            name={step.icon}
                            size={15}
                            color={done || current ? "#fff" : MUTED}
                          />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.statusLabel, (done || current) && { color: INK }]}>
                          {step.label}
                        </Text>
                        <Text style={styles.statusHint}>
                          {current ? "Current" : done ? "Completed" : step.hint}
                        </Text>
                      </View>
                      {current ? (
                        <View style={styles.nowChip}>
                          <Text style={styles.nowChipText}>NOW</Text>
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={{ height: nextAction ? 110 : 32 }} />
            </ScrollView>
          </Animated.View>
        </Animated.View>

        {/* Sticky frosted CTA */}
        {nextAction && currentStatus !== "done" ? (
          <View style={styles.ctaDock}>
            <BlurView intensity={Platform.OS === "ios" ? 55 : 30} tint="light" style={styles.ctaBlur}>
              <SafeAreaView edges={["bottom"]}>
                <Animated.View style={{ transform: [{ scale: ctaScale }] }}>
                  <Pressable
                    onPressIn={() =>
                      Animated.spring(ctaScale, {
                        toValue: 0.97,
                        useNativeDriver: true,
                        speed: 40,
                        bounciness: 0,
                      }).start()
                    }
                    onPressOut={() =>
                      Animated.spring(ctaScale, {
                        toValue: 1,
                        useNativeDriver: true,
                        speed: 20,
                        bounciness: 6,
                      }).start()
                    }
                    onPress={onPrimaryCta}
                    disabled={isUpdating}
                    style={styles.ctaPress}
                  >
                    <LinearGradient
                      colors={isOnStop ? ["#22C55E", "#15803D"] : ["#E8C48A", GOLD, "#B8893A"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.ctaBtn}
                    >
                      {isUpdating ? (
                        <SlimSpinner size={20} stroke={2} color="#fff" />
                      ) : (
                        <>
                          <Ionicons name={nextAction.icon} size={18} color="#fff" />
                          <Text style={styles.ctaText}>{nextAction.label}</Text>
                          <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.85)" />
                        </>
                      )}
                    </LinearGradient>
                  </Pressable>
                </Animated.View>
              </SafeAreaView>
            </BlurView>
          </View>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#070707" },
  loadingRoot: { flex: 1, alignItems: "center", justifyContent: "center" },
  heroBg: { ...StyleSheet.absoluteFillObject, height: 380 },
  ambientGlow: {
    position: "absolute",
    top: 40,
    left: 40,
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  safe: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 6,
    gap: 10,
  },
  glassCircleWrap: { borderRadius: 20, overflow: "hidden" },
  glassCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.18)",
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(74,222,128,0.35)",
  },
  livePulseRing: {
    position: "absolute",
    left: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: GREEN,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: GREEN },
  liveBadgeText: { color: "#BBF7D0", fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  timerPill: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(212,160,74,0.4)",
  },
  timerPillText: { color: GOLD, fontSize: 12, fontWeight: "800", fontVariant: ["tabular-nums"] },
  heroCopy: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderRadius: 18,
    marginHorizontal: 12,
  },
  heroEyebrow: { color: GOLD, fontSize: 10, fontWeight: "800", letterSpacing: 1.6, marginBottom: 8 },
  heroStatus: { color: "#fff", fontSize: 32, fontWeight: "800", letterSpacing: -0.8 },
  heroSub: { color: "rgba(255,255,255,0.55)", fontSize: 14, marginTop: 5, marginBottom: 14, fontWeight: "500" },
  bookingChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  bookingId: { color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: "600" },
  progressCard: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 10,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 12,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
    marginBottom: 14,
    marginHorizontal: 8,
  },
  progressFill: { height: "100%", borderRadius: 2, backgroundColor: GOLD },
  progressSteps: { flexDirection: "row", justifyContent: "space-between" },
  progressStep: { flex: 1, alignItems: "center" },
  progressNodeWrap: { width: 30, height: 30, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  progressHalo: { position: "absolute", width: 30, height: 30, borderRadius: 15, backgroundColor: GOLD },
  progressNode: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  progressNodeDone: { backgroundColor: GREEN },
  progressNodeCurrent: { backgroundColor: GOLD },
  progressLabel: { fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: "600" },
  progressLabelActive: { color: "rgba(255,255,255,0.78)" },
  progressLabelCurrent: { color: GOLD, fontWeight: "800" },
  sheet: {
    flex: 1,
    backgroundColor: SHEET,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: 4,
    overflow: "hidden",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.28, shadowRadius: 16 },
      android: { elevation: 12 },
    }),
  },
  sheetHandle: {
    alignSelf: "center",
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#D1D5DB",
    marginTop: 10,
    marginBottom: 8,
  },
  sheetContent: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 20 },
  iosShadow: Platform.select({
    ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 16 },
    android: { elevation: 3 },
    default: {},
  }),
  iosShadowSoft: Platform.select({
    ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10 },
    android: { elevation: 2 },
    default: {},
  }),
  stopBanner: { borderRadius: 18, overflow: "hidden", marginBottom: 12 },
  stopBannerGrad: { padding: 16 },
  stopBannerTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  stopBannerIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  stopBannerTitle: { color: "#fff", fontSize: 15, fontWeight: "800" },
  stopBannerSub: { color: "rgba(255,255,255,0.75)", fontSize: 11, marginTop: 2 },
  stopBannerTimer: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "800",
    textAlign: "center",
    fontVariant: ["tabular-nums"],
    letterSpacing: 1,
  },
  metricsRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  metricCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.04)",
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metricValue: { fontSize: 17, fontWeight: "800", color: INK, fontVariant: ["tabular-nums"], letterSpacing: -0.3 },
  resumeChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 12,
  },
  resumeChipText: { fontSize: 11, fontWeight: "700", color: "#92400E", fontVariant: ["tabular-nums"] },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.04)",
    marginBottom: 12,
  },
  cardTitle: { fontSize: 13, fontWeight: "800", color: INK, marginBottom: 12, letterSpacing: -0.2 },
  customerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  avatar: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  customerName: { fontSize: 17, fontWeight: "800", color: INK, letterSpacing: -0.3 },
  customerMeta: { fontSize: 12, color: MUTED, marginTop: 2 },
  messageBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: INK,
    paddingVertical: 14,
    borderRadius: 14,
  },
  messageBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  routeRow: { flexDirection: "row", gap: 12 },
  routeRail: { width: 14, alignItems: "center", paddingTop: 4 },
  routeDot: { width: 10, height: 10, borderRadius: 5 },
  routeLine: { width: 2, flex: 1, minHeight: 22, backgroundColor: "#E5E7EB", marginVertical: 4 },
  routeLabel: { fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2 },
  routeText: { fontSize: 13, color: "#374151", lineHeight: 18 },
  scheduleRow: {
    flexDirection: "row",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
    gap: 12,
  },
  scheduleItem: { flex: 1 },
  scheduleLabel: { fontSize: 10, fontWeight: "700", color: MUTED, textTransform: "uppercase", marginBottom: 3 },
  scheduleValue: { fontSize: 14, fontWeight: "700", color: INK },
  stopCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
    marginBottom: 12,
    gap: 12,
  },
  stopCardHeader: { flexDirection: "row", gap: 10 },
  stopCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
  },
  stopCardTitle: { fontSize: 15, fontWeight: "800", color: INK, marginBottom: 3 },
  stopCardSub: { fontSize: 12, color: MUTED, lineHeight: 17 },
  startStopBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingVertical: 12,
    borderRadius: 12,
  },
  startStopBtnText: { fontSize: 14, fontWeight: "800", color: RED },
  historyRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10 },
  historyBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E5E7EB" },
  historyIndex: { fontSize: 13, fontWeight: "700", color: INK },
  historyRange: { fontSize: 11, color: MUTED, marginTop: 2 },
  historyDuration: { fontSize: 14, fontWeight: "800", color: RED, fontVariant: ["tabular-nums"] },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  statusRowCurrent: { backgroundColor: "#FFFBEB" },
  statusIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  statusIconDone: { backgroundColor: GREEN },
  statusIconCurrent: { backgroundColor: GOLD },
  statusLabel: { fontSize: 14, fontWeight: "700", color: MUTED },
  statusHint: { fontSize: 11, color: MUTED, marginTop: 1 },
  nowChip: { backgroundColor: GOLD, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  nowChipText: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  ctaDock: { position: "absolute", left: 0, right: 0, bottom: 0 },
  ctaBlur: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.08)",
    paddingHorizontal: 16,
    paddingTop: 10,
    overflow: "hidden",
  },
  ctaPress: { borderRadius: 18, overflow: "hidden", marginBottom: 4 },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 17,
    borderRadius: 18,
    ...Platform.select({
      ios: { shadowColor: GOLD, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 14 },
      android: { elevation: 6 },
    }),
  },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: -0.2 },
});

