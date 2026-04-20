import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Image,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

type TabType = "requests" | "upcoming";

interface RideRequest {
  id: string;
  customerName: string;
  phone: string;
  bookingId: string;
  date: string;
  time: string;
  passengers: number;
  pickup: string;
  dropoff: string;
  isNew: boolean;
  avatar?: string;
}

const mockRequests: RideRequest[] = [
  {
    id: "1",
    customerName: "Jhon Smith",
    phone: "+14164180528",
    bookingId: "SARJ-MNL4363K34",
    date: "2026-04-10",
    time: "09:00 AM",
    passengers: 4,
    pickup: "YYZ Terminal 1, Mississauga, ON, CA",
    dropoff: "Biryaniwalla Milton, Main Street East, Milton, ON, CA",
    isNew: true,
  },
];

const mockUpcomingRides: RideRequest[] = [
  {
    id: "2",
    customerName: "Sarah Johnson",
    phone: "+14165551234",
    bookingId: "SARJ-MNL4363K35",
    date: "2026-04-11",
    time: "10:30 AM",
    passengers: 2,
    pickup: "Toronto Pearson Airport, Terminal 3",
    dropoff: "Downtown Toronto, King Street West",
    isNew: false,
  },
  {
    id: "3",
    customerName: "Michael Brown",
    phone: "+14165559876",
    bookingId: "SARJ-MNL4363K36",
    date: "2026-04-12",
    time: "02:00 PM",
    passengers: 3,
    pickup: "Union Station, Toronto",
    dropoff: "Niagara Falls, Ontario",
    isNew: false,
  },
];

export default function DriverDashboard() {
  const [isActive, setIsActive] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("requests");

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.statusToggle}>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: "#e0e0e0", true: "#4CAF50" }}
              thumbColor={isActive ? "#fff" : "#fff"}
            />
            <Text style={styles.statusText}>{isActive ? "Active" : "Inactive"}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.notificationBtn}>
              <Ionicons name="notifications-outline" size={24} color="#000" />
              <View style={styles.notificationBadge}>
                <Text style={styles.badgeText}>2</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.avatarContainer} onPress={() => router.push("/driver/profile")}>
              <Image
                source={{ uri: "https://randomuser.me/api/portraits/men/32.jpg" }}
                style={styles.avatar}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={styles.greetingTitle}>Hi, Hammad 🤚</Text>
          <Text style={styles.greetingSubtitle}>Good to see you back on work!</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "requests" && styles.tabActive]}
            onPress={() => setActiveTab("requests")}
          >
            <Text style={[styles.tabText, activeTab === "requests" && styles.tabTextActive]}>
              Requests
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "upcoming" && styles.tabActive]}
            onPress={() => setActiveTab("upcoming")}
          >
            <Text style={[styles.tabText, activeTab === "upcoming" && styles.tabTextActive]}>
              Upcoming Rides
            </Text>
          </TouchableOpacity>
        </View>

        {/* Ride Requests */}
        {activeTab === "requests" && (
          <View style={styles.requestsList}>
            {mockRequests.map((request) => (
              <View key={request.id} style={styles.rideCard}>
                {/* Customer Info */}
                <View style={styles.customerRow}>
                  <Image
                    source={{ uri: "https://randomuser.me/api/portraits/men/45.jpg" }}
                    style={styles.customerAvatar}
                  />
                  <View style={styles.customerInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.customerName}>{request.customerName}</Text>
                      {request.isNew && (
                        <View style={styles.newBadge}>
                          <Text style={styles.newBadgeText}>NEW</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.customerPhone}>{request.phone}</Text>
                  </View>
                </View>

                {/* Booking ID */}
                <Text style={styles.bookingId}>{request.bookingId}</Text>

                {/* Date & Passengers */}
                <View style={styles.dateRow}>
                  <Text style={styles.dateText}>{request.date} | {request.time}</Text>
                  <Text style={styles.passengers}>{request.passengers} passengers</Text>
                </View>

                {/* Locations */}
                <View style={styles.locationsContainer}>
                  <View style={styles.locationRow}>
                    <View style={[styles.locationDot, styles.pickupDot]} />
                    <Text style={styles.locationText}>{request.pickup}</Text>
                  </View>
                  <View style={styles.locationRow}>
                    <View style={[styles.locationDot, styles.dropoffDot]} />
                    <Text style={styles.locationText}>{request.dropoff}</Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity style={styles.rejectButton}>
                    <Text style={styles.rejectButtonText}>Reject Ride</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.acceptButton}>
                    <Text style={styles.acceptButtonText}>Accept Ride</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {activeTab === "upcoming" && (
          <View style={styles.requestsList}>
            {mockUpcomingRides.map((ride) => (
              <View key={ride.id} style={styles.rideCard}>
                {/* Customer Info */}
                <View style={styles.customerRow}>
                  <Image
                    source={{ uri: `https://randomuser.me/api/portraits/women/${ride.id}5.jpg` }}
                    style={styles.customerAvatar}
                  />
                  <View style={styles.customerInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.customerName}>{ride.customerName}</Text>
                    </View>
                    <Text style={styles.customerPhone}>{ride.phone}</Text>
                  </View>
                </View>

                {/* Booking ID */}
                <Text style={styles.bookingId}>{ride.bookingId}</Text>

                {/* Date & Passengers */}
                <View style={styles.dateRow}>
                  <Text style={styles.dateText}>{ride.date} | {ride.time}</Text>
                  <Text style={styles.passengers}>{ride.passengers} passengers</Text>
                </View>

                {/* Locations */}
                <View style={styles.locationsContainer}>
                  <View style={styles.locationRow}>
                    <View style={[styles.locationDot, styles.pickupDot]} />
                    <Text style={styles.locationText}>{ride.pickup}</Text>
                  </View>
                  <View style={styles.locationRow}>
                    <View style={[styles.locationDot, styles.dropoffDot]} />
                    <Text style={styles.locationText}>{ride.dropoff}</Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity style={styles.rejectButton}>
                    <Text style={styles.rejectButtonText}>Cancel Ride</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.acceptButton} onPress={() => router.push("/driver/ride-details")}>
                    <Text style={styles.acceptButtonText}>Start Ride</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  statusToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  notificationBtn: {
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#e53935",
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  avatarContainer: {
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 22,
    padding: 2,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  greeting: {
    marginBottom: 24,
  },
  greetingTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
    marginBottom: 4,
  },
  greetingSubtitle: {
    fontSize: 15,
    color: "#666",
  },
  tabContainer: {
    flexDirection: "row",
    marginBottom: 20,
    gap: 70,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  tabActive: {
    backgroundColor: "#1a1a1a",
  },
  tabText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#666",
  },
  tabTextActive: {
    color: "#fff",
  },
  requestsList: {
    gap: 16,
  },
  rideCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e8e8e8",
  },
  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
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
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  customerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  newBadge: {
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FFB74D",
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#F57C00",
  },
  customerPhone: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  bookingId: {
    fontSize: 14,
    color: "#D4A04A",
    fontWeight: "500",
    marginBottom: 8,
  },
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  dateText: {
    fontSize: 13,
    color: "#000",
    fontWeight: "500",
  },
  passengers: {
    fontSize: 13,
    color: "#666",
  },
  locationsContainer: {
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 12,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 3,
  },
  pickupDot: {
    backgroundColor: "#4CAF50",
  },
  dropoffDot: {
    backgroundColor: "#F44336",
  },
  locationText: {
    fontSize: 13,
    color: "#333",
    flex: 1,
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  rejectButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    alignItems: "center",
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
  acceptButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 25,
    backgroundColor: "#1a1a1a",
    alignItems: "center",
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
  },
});
