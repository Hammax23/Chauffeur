import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getDriverRideDetail, updateRideStatus, DriverRide } from "../../services/api";

type RideStatus = "pending" | "on_the_way" | "arrived" | "customer_in_car" | "stop" | "done";

const statusSteps = [
  { id: "on_the_way", label: "On The Way", icon: "car-outline" },
  { id: "arrived", label: "Arrived", icon: "location-outline" },
  { id: "customer_in_car", label: "Customer In Car", icon: "person-outline" },
  { id: "stop", label: "Stop", icon: "stop-circle-outline" },
  { id: "done", label: "Done", icon: "checkmark-circle-outline" },
];

const getStatusIndex = (status: RideStatus) => {
  const index = statusSteps.findIndex((s) => s.id === status);
  return index >= 0 ? index : -1;
};

const getStatusLabel = (status: RideStatus) => {
  switch (status) {
    case "pending": return "PENDING";
    case "on_the_way": return "ON THE WAY";
    case "arrived": return "ARRIVED";
    case "customer_in_car": return "CIC";
    case "stop": return "STOP";
    case "done": return "DONE";
    default: return "PENDING";
  }
};

const getStatusColor = (status: RideStatus) => {
  switch (status) {
    case "pending": return "#666";
    case "on_the_way": return "#F5A623";
    case "arrived": return "#4CAF50";
    case "customer_in_car": return "#F5A623";
    case "stop": return "#e53935";
    case "done": return "#4CAF50";
    default: return "#666";
  }
};

export default function RideDetailsScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [ride, setRide] = useState<DriverRide | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const mapStatusToRideStatus = (status: string): RideStatus => {
    switch (status) {
      case "PENDING": return "pending";
      case "ON THE WAY": return "on_the_way";
      case "ARRIVED": return "arrived";
      case "CIC": return "customer_in_car";
      case "DONE": return "done";
      default: return "pending";
    }
  };

  const mapRideStatusToApi = (status: RideStatus): string => {
    switch (status) {
      case "on_the_way": return "ON THE WAY";
      case "arrived": return "ARRIVED";
      case "customer_in_car": return "CIC";
      case "done": return "DONE";
      default: return "ON THE WAY";
    }
  };

  useEffect(() => {
    if (bookingId) {
      (async () => {
        try {
          const data = await getDriverRideDetail(bookingId);
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
  }, [bookingId]);

  const currentStatus: RideStatus = ride ? mapStatusToRideStatus(ride.status) : "pending";

  const handleStatusChange = async (stepId: string) => {
    if (!ride || isUpdating) return;
    const apiStatus = mapRideStatusToApi(stepId as RideStatus);
    
    Alert.alert(
      "Update Status",
      `Change ride status to "${apiStatus}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            setIsUpdating(true);
            try {
              const result = await updateRideStatus(ride.bookingId, apiStatus);
              if (result.success) {
                setRide({ ...ride, status: apiStatus });
                if (apiStatus === "DONE") {
                  Alert.alert("Ride Complete", "This ride has been completed!", [
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
          },
        },
      ]
    );
  };

  const currentIndex = getStatusIndex(currentStatus);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]} edges={["top"]}>
        <ActivityIndicator size="large" color="#D4A04A" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color="#000" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        {/* Header Info */}
        <View style={styles.headerInfo}>
          <View style={styles.headerLeft}>
            <Text style={styles.bookingIdLabel}>ID: {ride?.bookingId || "N/A"}</Text>
            <View style={styles.chauffeurBadge}>
              <Text style={styles.chauffeurBadgeText}>YOUR CHAUFFEUR STATUS</Text>
            </View>
          </View>
          <Text style={styles.price}>${ride?.total?.toFixed(2) || "0.00"}</Text>
        </View>

        {/* Customer Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CUSTOMER DETAILS</Text>
          <View style={styles.customerCard}>
            <View style={[styles.customerAvatar, { backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' }]}>
              <Ionicons name="person" size={22} color="#999" />
            </View>
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>{ride?.customerName || "N/A"}</Text>
              <Text style={styles.customerPhone}>{ride?.phone || ""}</Text>
            </View>
            <Text style={styles.passengerCount}>{ride?.passengers || 0} passengers</Text>
          </View>
        </View>

        {/* Ride Details */}
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

            {/* Locations */}
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

        {/* Current Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CURRENT STATUS</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(currentStatus) }]}>
            <Text style={styles.statusBadgeText}>{getStatusLabel(currentStatus)}</Text>
          </View>
        </View>

        {/* Your Chauffeur Status */}
        <View style={styles.section}>
          <View style={styles.chauffeurStatusHeader}>
            <Text style={styles.sectionTitle}>YOUR CHAUFFEUR STATUS</Text>
            {currentStatus !== "pending" && currentStatus !== "done" && (
              <View style={styles.timerBadge}>
                <Text style={styles.timerText}>5:00</Text>
              </View>
            )}
          </View>

          <View style={styles.statusList}>
            {statusSteps.map((step, index) => {
              const isCompleted = index < currentIndex;
              const isCurrent = index === currentIndex;
              const isActive = isCompleted || isCurrent;

              return (
                <TouchableOpacity
                  key={step.id}
                  style={[
                    styles.statusItem,
                    isActive && styles.statusItemActive,
                    isCurrent && styles.statusItemCurrent,
                  ]}
                  onPress={() => handleStatusChange(step.id)}
                >
                  <View style={[
                    styles.statusIcon,
                    isCompleted && styles.statusIconCompleted,
                    isCurrent && styles.statusIconCurrent,
                  ]}>
                    <Ionicons
                      name={step.icon as any}
                      size={20}
                      color={isActive ? "#fff" : "#666"}
                    />
                  </View>
                  <View style={styles.statusContent}>
                    <Text style={[
                      styles.statusLabel,
                      isActive && styles.statusLabelActive,
                    ]}>
                      {step.label}
                    </Text>
                    {isCurrent && (
                      <Text style={styles.currentStatusText}>Current Status</Text>
                    )}
                    {isCompleted && (
                      <Text style={styles.completedStatusText}>Completed</Text>
                    )}
                  </View>
                  {isActive && (
                    <View style={[
                      styles.statusIndicator,
                      isCompleted && styles.statusIndicatorCompleted,
                      isCurrent && styles.statusIndicatorCurrent,
                    ]} />
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
  customerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e8e8e8",
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
