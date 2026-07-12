import { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getDriverRideDetail, updateRideStatus, DriverRide } from "../../services/api";
import { syncDriverLiveTracking } from "../../services/driver-live-session";

type RideStatus = "pending" | "accepted" | "on_the_way" | "arrived" | "customer_in_car" | "stop" | "done";

type StopPeriod = { start: string; end?: string };

const statusSteps = [
  { id: "on_the_way", label: "On The Way", icon: "car-outline" as const },
  { id: "arrived", label: "Arrived", icon: "location-outline" as const },
  { id: "customer_in_car", label: "Customer In Car", icon: "person-outline" as const },
  { id: "stop", label: "Stop", icon: "stop-circle-outline" as const },
  { id: "done", label: "Done", icon: "checkmark-circle-outline" as const },
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

const getStatusIndex = (status: RideStatus) => {
  const index = statusSteps.findIndex((s) => s.id === status);
  return index >= 0 ? index : -1;
};

const getStatusLabel = (status: RideStatus) => {
  switch (status) {
    case "pending":
      return "PENDING";
    case "accepted":
      return "ACCEPTED";
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
      return "PENDING";
  }
};

const getStatusColor = (status: RideStatus) => {
  switch (status) {
    case "pending":
      return "#666";
    case "accepted":
      return "#3B82F6";
    case "on_the_way":
      return "#F5A623";
    case "arrived":
      return "#4CAF50";
    case "customer_in_car":
      return "#F5A623";
    case "stop":
      return "#e53935";
    case "done":
      return "#4CAF50";
    default:
      return "#666";
  }
};

export default function RideDetailsScreen() {
  const { bookingId } = useLocalSearchParams();
  const id = typeof bookingId === "string" ? bookingId : Array.isArray(bookingId) ? bookingId[0] : "";

  const [ride, setRide] = useState<DriverRide | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [tick, setTick] = useState(0);

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
          if (data.success) {
            setRide(data.ride);
          }
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

  const currentStatus: RideStatus = ride ? mapStatusToRideStatus(ride.status) : "pending";
  const currentIndex = getStatusIndex(currentStatus);
  const stopPeriods = useMemo(() => parseStopPeriods(ride?.driverStopPeriodsJson), [ride?.driverStopPeriodsJson, tick]);

  const timing = useMemo(() => {
    if (!ride) return null;
    const now = Date.now();
    const tripStart = ride.driverOnTheWayAt ? Date.parse(ride.driverOnTheWayAt) : null;
    const tripEnd = ride.completedAt ? Date.parse(ride.completedAt) : now;
    const totalTripMs = tripStart ? tripEnd - tripStart : 0;

    const completedStopMs = stopPeriods
      .filter((p) => p.end)
      .reduce((acc, p) => acc + (Date.parse(p.end!) - Date.parse(p.start)), 0);

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
    };
  }, [ride, stopPeriods, tick]);

  const stepCompleted = (index: number): boolean => {
    if (!ride) return false;
    if (index < currentIndex) return true;
    if (index === 3 && stopPeriods.some((p) => p.end)) return true;
    return false;
  };

  const stepCurrent = (index: number): boolean => {
    if (!ride) return false;
    if (ride.status === "STOP" && index === 3) return true;
    return index === currentIndex && ride.status !== "STOP";
  };

  const runStatusUpdate = async (apiStatus: string, successTitle?: string) => {
    if (!ride || isUpdating) return;
    setIsUpdating(true);
    try {
      const result = await updateRideStatus(ride.bookingId, apiStatus);
      if (result.success) {
        await refreshRide();
        syncDriverLiveTracking().catch(() => {});
        if (apiStatus === "DONE") {
          Alert.alert("Ride Complete", successTitle || "This ride has been completed!", [
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

  const handleStatusChange = async (stepId: string) => {
    if (!ride || isUpdating || stepId === "stop") return;
    const apiStatus = mapRideStatusToApi(stepId as RideStatus);

    Alert.alert("Update Status", `Change ride status to "${apiStatus}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        onPress: () => runStatusUpdate(apiStatus),
      },
    ]);
  };

  const onPressStopStep = () => {
    if (!ride || isUpdating) return;
    if (ride.status === "STOP") {
      Alert.alert("Continue trip", "Resume driving — back to Customer In Car?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          onPress: () => runStatusUpdate("CIC"),
        },
      ]);
    } else if (ride.status === "CIC") {
      Alert.alert("Stop", "Start a mid-trip stop? (Timer runs until you tap Continue.)", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Stop",
          style: "destructive",
          onPress: () => runStatusUpdate("STOP"),
        },
      ]);
    } else {
      Alert.alert("Not available", "Stop is available after Customer In Car.");
    }
  };

  const tripTimerDisplay = timing?.hasTripStart ? formatDuration(timing.totalTripMs) : "—";
  const headerTimerDisplay =
    currentStatus !== "pending" && currentStatus !== "done" && timing?.hasTripStart
      ? formatDuration(timing.totalTripMs)
      : null;

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: "center", alignItems: "center" }]} edges={["top"]}>
        <ActivityIndicator size="large" color="#D4A04A" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color="#000" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <View style={styles.headerLeft}>
            <Text style={styles.bookingIdLabel}>ID: {ride?.bookingId || "N/A"}</Text>
            <View style={styles.chauffeurBadge}>
              <Text style={styles.chauffeurBadgeText}>YOUR CHAUFFEUR STATUS</Text>
            </View>
          </View>
          <Text style={styles.price}>${ride?.total?.toFixed(2) || "0.00"}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TRIP TIMERS</Text>
          <View style={styles.timingCard}>
            <View style={styles.timingRow}>
              <Text style={styles.timingLabel}>Trip (On the way → Done)</Text>
              <Text style={styles.timingValue}>{tripTimerDisplay}</Text>
            </View>
            <Text style={styles.timingHint}>Starts when status first becomes On The Way.</Text>

            {timing && timing.completedStopMs > 0 ? (
              <View style={[styles.timingRow, styles.timingRowBorder]}>
                <Text style={styles.timingLabel}>Total stop time (completed)</Text>
                <Text style={styles.timingValue}>{formatDuration(timing.completedStopMs)}</Text>
              </View>
            ) : null}

            {ride?.status === "STOP" && timing && timing.currentStopMs >= 0 ? (
              <View style={[styles.timingRow, styles.timingRowBorder]}>
                <Text style={styles.timingLabel}>Current stop</Text>
                <Text style={[styles.timingValue, styles.timingValueAccent]}>{formatDuration(timing.currentStopMs)}</Text>
              </View>
            ) : null}

            {timing && timing.drivingAfterContinueMs > 0 && ride?.status === "CIC" && !ride.completedAt ? (
              <View style={[styles.timingRow, styles.timingRowBorder]}>
                <Text style={styles.timingLabel}>Driving after Continue</Text>
                <Text style={styles.timingValue}>{formatDuration(timing.drivingAfterContinueMs)}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CUSTOMER DETAILS</Text>
          <View style={styles.customerCard}>
            <View style={[styles.customerAvatar, { backgroundColor: "#e0e0e0", justifyContent: "center", alignItems: "center" }]}>
              <Ionicons name="person" size={22} color="#999" />
            </View>
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>{ride?.customerName || "N/A"}</Text>
              <Text style={styles.customerPhone}>{ride?.phone || ""}</Text>
            </View>
            <Text style={styles.passengerCount}>{ride?.passengers || 0} passengers</Text>
          </View>
          {ride &&
          ["ACCEPTED", "ON THE WAY", "ARRIVED", "CIC", "STOP", "DONE", "CANCELLED"].includes(
            ride.status
          ) ? (
            <TouchableOpacity
              style={styles.chatButton}
              onPress={() =>
                router.push({
                  pathname: "/driver/chat",
                  params: { bookingId: id, name: ride.customerName || "Customer" },
                })
              }
            >
              <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
              <Text style={styles.chatButtonText}>Message customer</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RIDE DETAILS</Text>

          <View style={styles.rideDetailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>VEHICLE</Text>
              <Text style={styles.detailValue}>{ride?.vehicle || "N/A"}</Text>
            </View>

            <View style={styles.dateTimeRow}>
              <View style={styles.dateTimeItem}>
                <Text style={styles.detailLabel}>DATE</Text>
                <Text style={styles.detailValue}>{ride?.serviceDate || "N/A"}</Text>
              </View>
              <View style={styles.dateTimeItem}>
                <Text style={styles.detailLabel}>TIME</Text>
                <Text style={styles.detailValue}>{ride?.serviceTime || "N/A"}</Text>
              </View>
            </View>

            <View style={styles.locationItem}>
              <View style={[styles.locationDot, styles.pickupDot]} />
              <View style={styles.locationContent}>
                <Text style={[styles.locationLabel, { color: "#4CAF50" }]}>PICK-UP</Text>
                <Text style={styles.locationText}>{ride?.pickupLocation || "N/A"}</Text>
              </View>
            </View>

            <View style={styles.locationItem}>
              <View style={[styles.locationDot, styles.dropoffDot]} />
              <View style={styles.locationContent}>
                <Text style={[styles.locationLabel, { color: "#F5A623" }]}>DROP-OFF</Text>
                <Text style={styles.locationText}>{ride?.dropoffLocation || "N/A"}</Text>
              </View>
            </View>

            {ride?.stops ? (
              <View style={[styles.locationItem, { marginBottom: 0 }]}>
                <View style={[styles.locationDot, styles.stopDot]} />
                <View style={styles.locationContent}>
                  <Text style={[styles.locationLabel, { color: "#e53935" }]}>Stop</Text>
                  <Text style={styles.locationText}>{ride.stops}</Text>
                </View>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CURRENT STATUS</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(currentStatus) }]}>
            <Text style={styles.statusBadgeText}>{getStatusLabel(currentStatus)}</Text>
          </View>
          {currentStatus === "accepted" ? (
            <Text style={styles.acceptedHint}>
              Tap <Text style={styles.acceptedHintBold}>On The Way</Text> below when you head to pickup.
            </Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <View style={styles.chauffeurStatusHeader}>
            <Text style={styles.sectionTitle}>YOUR CHAUFFEUR STATUS</Text>
            {headerTimerDisplay ? (
              <View style={styles.timerBadge}>
                <Text style={styles.timerText}>{headerTimerDisplay}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.statusList}>
            {statusSteps.map((step, index) => {
              const isCompleted = stepCompleted(index);
              const isCurrent = stepCurrent(index);
              const isActive = isCompleted || isCurrent;
              const isStopStep = step.id === "stop";
              const stopPrimaryLabel =
                isStopStep && ride?.status === "STOP" ? "Continue" : isStopStep ? "Stop" : step.label;
              const stopDisabled = isStopStep && ride && ride.status !== "CIC" && ride.status !== "STOP";

              return (
                <TouchableOpacity
                  key={step.id}
                  style={[
                    styles.statusItem,
                    isActive && styles.statusItemActive,
                    isCurrent && styles.statusItemCurrent,
                    stopDisabled && styles.statusItemDisabled,
                  ]}
                  disabled={!!stopDisabled}
                  onPress={() => (isStopStep ? onPressStopStep() : handleStatusChange(step.id))}
                >
                  <View
                    style={[
                      styles.statusIcon,
                      isCompleted && styles.statusIconCompleted,
                      isCurrent && styles.statusIconCurrent,
                    ]}
                  >
                    <Ionicons name={isStopStep && ride?.status === "STOP" ? "play-outline" : step.icon} size={20} color={isActive ? "#fff" : "#666"} />
                  </View>
                  <View style={styles.statusContent}>
                    <Text style={[styles.statusLabel, isActive && styles.statusLabelActive]}>{stopPrimaryLabel}</Text>
                    {isCurrent && <Text style={styles.currentStatusText}>Current Status</Text>}
                    {isCompleted && !isCurrent && <Text style={styles.completedStatusText}>Completed</Text>}
                  </View>
                  {isActive && (
                    <View
                      style={[
                        styles.statusIndicator,
                        isCompleted && styles.statusIndicatorCompleted,
                        isCurrent && styles.statusIndicatorCurrent,
                      ]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  backText: {
    fontSize: 16,
    color: "#000",
    marginLeft: 4,
  },
  headerInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  headerLeft: {
    flex: 1,
  },
  bookingIdLabel: {
    fontSize: 13,
    color: "#666",
    marginBottom: 8,
  },
  chauffeurBadge: {
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#FFB74D",
  },
  chauffeurBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#F57C00",
  },
  price: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#999",
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  timingCard: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e8e8e8",
  },
  timingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  timingRowBorder: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ddd",
  },
  timingLabel: {
    fontSize: 13,
    color: "#555",
    flex: 1,
    paddingRight: 12,
  },
  timingValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
    fontVariant: ["tabular-nums"],
  },
  timingValueAccent: {
    color: "#e53935",
  },
  timingHint: {
    fontSize: 11,
    color: "#999",
    marginTop: 4,
  },
  customerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e8e8e8",
  },
  chatButton: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1C1C1E",
    paddingVertical: 12,
    borderRadius: 12,
  },
  chatButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  customerPhone: {
    fontSize: 13,
    color: "#F5A623",
    marginTop: 2,
  },
  passengerCount: {
    fontSize: 13,
    color: "#666",
  },
  rideDetailsCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e8e8e8",
  },
  detailRow: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 11,
    color: "#999",
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  detailValue: {
    fontSize: 15,
    color: "#000",
    fontWeight: "500",
  },
  dateTimeRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  dateTimeItem: {
    flex: 1,
  },
  locationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    paddingLeft: 4,
  },
  locationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
    marginRight: 12,
  },
  pickupDot: {
    backgroundColor: "#4CAF50",
  },
  dropoffDot: {
    backgroundColor: "#F5A623",
  },
  stopDot: {
    backgroundColor: "#e53935",
  },
  locationContent: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 11,
    color: "#4CAF50",
    fontWeight: "500",
    marginBottom: 2,
  },
  locationText: {
    fontSize: 13,
    color: "#333",
    lineHeight: 18,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  acceptedHint: {
    marginTop: 10,
    fontSize: 12,
    color: "#475569",
    lineHeight: 17,
  },
  acceptedHintBold: {
    fontWeight: "700",
    color: "#0f172a",
  },
  chauffeurStatusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  timerBadge: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timerText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
    fontVariant: ["tabular-nums"],
  },
  statusList: {
    gap: 8,
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e8e8e8",
  },
  statusItemActive: {
    backgroundColor: "#fff",
  },
  statusItemCurrent: {
    backgroundColor: "#FFF8E1",
    borderWidth: 1,
    borderColor: "#F5A623",
  },
  statusItemDisabled: {
    opacity: 0.45,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  statusIconCompleted: {
    backgroundColor: "#4CAF50",
  },
  statusIconCurrent: {
    backgroundColor: "#F5A623",
  },
  statusContent: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  statusLabelActive: {
    color: "#000",
  },
  currentStatusText: {
    fontSize: 11,
    color: "#F5A623",
    marginTop: 2,
  },
  completedStatusText: {
    fontSize: 11,
    color: "#4CAF50",
    marginTop: 2,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ccc",
  },
  statusIndicatorCompleted: {
    backgroundColor: "#4CAF50",
  },
  statusIndicatorCurrent: {
    backgroundColor: "#F5A623",
  },
});
