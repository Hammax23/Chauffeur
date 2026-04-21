import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Image,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

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

export default function TrackRideScreen() {
  // In real app, this would come from API/state based on reservation
  const currentStatus: RideStatus = "pending";
  const currentIndex = getStatusIndex(currentStatus);

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
            <Text style={styles.bookingIdLabel}>ID: SARJ-MNL4363K34</Text>
            <View style={styles.chauffeurBadge}>
              <Text style={styles.chauffeurBadgeText}>YOUR CHAUFFEUR STATUS</Text>
            </View>
          </View>
          <Text style={styles.price}>$ 250.80</Text>
        </View>

        {/* Driver Details */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="person-circle-outline" size={18} color="#999" />
            <Text style={styles.sectionTitle}>DRIVER DETAILS</Text>
          </View>
          <View style={styles.driverCard}>
            <Image
              source={{ uri: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80" }}
              style={styles.driverAvatar}
            />
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>Jhon Smith</Text>
              <Text style={styles.driverPhone}>+14164180528</Text>
            </View>
            <Text style={styles.passengerCount}>4 passengers</Text>
          </View>
        </View>

        {/* Ride Details */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="car-outline" size={18} color="#999" />
            <Text style={styles.sectionTitle}>RIDE DETAILS</Text>
          </View>
          
          <View style={styles.rideDetailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>VEHICLE</Text>
              <Text style={styles.detailValue}>Cadillac XTC</Text>
            </View>

            <View style={styles.dateTimeRow}>
              <View style={styles.dateTimeItem}>
                <Text style={styles.detailLabel}>DATE</Text>
                <Text style={styles.detailValue}>2026-04-10</Text>
              </View>
              <View style={styles.dateTimeItem}>
                <Text style={styles.detailLabel}>TIME</Text>
                <Text style={styles.detailValue}>09:00 AM</Text>
              </View>
            </View>

            {/* Locations */}
            <View style={styles.locationItem}>
              <View style={[styles.locationDot, styles.pickupDot]} />
              <View style={styles.locationContent}>
                <Text style={[styles.locationLabel, { color: "#4CAF50" }]}>PICK-UP</Text>
                <Text style={styles.locationText}>YYZ Terminal 1, Mississauga, ON, CA</Text>
              </View>
            </View>

            <View style={styles.locationItem}>
              <View style={[styles.locationDot, styles.dropoffDot]} />
              <View style={styles.locationContent}>
                <Text style={[styles.locationLabel, { color: "#F5A623" }]}>DROP-OFF</Text>
                <Text style={styles.locationText}>Biryaniwalla Milton, Main Street East, Milton, ON, CA</Text>
              </View>
            </View>

            <View style={[styles.locationItem, { marginBottom: 0 }]}>
              <View style={[styles.locationDot, styles.stopDot]} />
              <View style={styles.locationContent}>
                <Text style={[styles.locationLabel, { color: "#e53935" }]}>Stop</Text>
                <Text style={styles.locationText}>PO BOX 123 Main Street East, Milton, ON, CA</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Current Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitlePlain}>CURRENT STATUS</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(currentStatus) }]}>
            <Text style={styles.statusBadgeText}>{getStatusLabel(currentStatus)}</Text>
          </View>
        </View>

        {/* Your Chauffeur Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitlePlain}>YOUR CHAUFFEUR STATUS</Text>

          <View style={styles.statusList}>
            {statusSteps.map((step, index) => {
              const isCompleted = index < currentIndex;
              const isCurrent = index === currentIndex;
              const isActive = isCompleted || isCurrent;

              return (
                <View
                  key={step.id}
                  style={[
                    styles.statusItem,
                    isActive && styles.statusItemActive,
                    isCurrent && styles.statusItemCurrent,
                  ]}
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
                </View>
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
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#999",
    letterSpacing: 0.5,
  },
  sectionTitlePlain: {
    fontSize: 12,
    fontWeight: "600",
    color: "#999",
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  driverCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e8e8e8",
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  driverPhone: {
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
