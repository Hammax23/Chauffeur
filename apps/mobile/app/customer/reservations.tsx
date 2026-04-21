import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Image,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

interface Driver {
  name: string;
  phone: string;
  rating: number;
  photo: string;
  vehicleNumber: string;
}

interface Reservation {
  id: string;
  bookingId: string;
  vehicleName: string;
  vehicleImage: string;
  status: "Pending" | "Accepted" | "In-progress" | "Completed";
  price: string;
  date: string;
  time: string;
  passengers: number;
  pickupLocation: string;
  dropoffLocation: string;
  driver?: Driver;
}

const mockReservations: Reservation[] = [
  {
    id: "1",
    bookingId: "SARJ-MNLA363K34",
    vehicleName: "Mercedes-Maybach S-Class",
    vehicleImage: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=400&q=80",
    status: "Pending",
    price: "$179.20 CAD",
    date: "2026-04-10",
    time: "09:00 AM",
    passengers: 4,
    pickupLocation: "YYZ Terminal 1, Mississauga, ON, CA",
    dropoffLocation: "Bryanwalla Milton, Main Street East, Milton, ON, CA",
  },
  {
    id: "2",
    bookingId: "SARJ-MNLA363K34",
    vehicleName: "Tesla Model S",
    vehicleImage: "https://images.unsplash.com/photo-1536700503339-1e4b06520771?w=400&q=80",
    status: "Accepted",
    price: "$179.20 CAD",
    date: "2026-04-10",
    time: "09:00 AM",
    passengers: 4,
    pickupLocation: "YYZ Terminal 1, Mississauga, ON, CA",
    dropoffLocation: "Bryanwalla Milton, Main Street East, Milton, ON, CA",
  },
  {
    id: "3",
    bookingId: "SARJ-MNLA789K56",
    vehicleName: "Mercedes-Maybach S-Class",
    vehicleImage: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=400&q=80",
    status: "In-progress",
    price: "$215.50 CAD",
    date: "2026-04-19",
    time: "02:30 PM",
    passengers: 2,
    pickupLocation: "YYZ Terminal 3, Mississauga, ON, CA",
    dropoffLocation: "Downtown Toronto, King Street, Toronto, ON, CA",
    driver: {
      name: "Michael Johnson",
      phone: "+1 (416) 555-0123",
      rating: 4.9,
      photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
      vehicleNumber: "ABCD 1234",
    },
  },
  {
    id: "4",
    bookingId: "SARJ-MNLA456K78",
    vehicleName: "Cadillac Escalade",
    vehicleImage: "https://images.unsplash.com/photo-1520031441872-265e4ff70366?w=400&q=80",
    status: "In-progress",
    price: "$320.00 CAD",
    date: "2026-04-19",
    time: "04:00 PM",
    passengers: 6,
    pickupLocation: "Pearson Airport, Terminal 1",
    dropoffLocation: "Niagara Falls, ON, CA",
    driver: {
      name: "David Williams",
      phone: "+1 (905) 555-0456",
      rating: 4.8,
      photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80",
      vehicleNumber: "WXYZ 5678",
    },
  },
  {
    id: "5",
    bookingId: "SARJ-MNLA112K90",
    vehicleName: "BMW 7 Series",
    vehicleImage: "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=400&q=80",
    status: "Completed",
    price: "$195.00 CAD",
    date: "2026-04-15",
    time: "11:00 AM",
    passengers: 3,
    pickupLocation: "Union Station, Toronto, ON, CA",
    dropoffLocation: "Pearson Airport, Terminal 3, Mississauga, ON, CA",
    driver: {
      name: "James Anderson",
      phone: "+1 (647) 555-0789",
      rating: 4.7,
      photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80",
      vehicleNumber: "LMNO 9012",
    },
  },
];

const tabs = ["Pending", "In-progress", "Completed"];

export default function ReservationsScreen() {
  const [activeTab, setActiveTab] = useState("Pending");

  const filteredReservations = mockReservations.filter((res) => {
    if (activeTab === "Pending") return res.status === "Pending" || res.status === "Accepted";
    if (activeTab === "In-progress") return res.status === "In-progress";
    if (activeTab === "Completed") return res.status === "Completed";
    return true;
  });

  const getStatusStyle = (status: string) => {
    if (status === "Pending") return styles.statusPending;
    if (status === "Accepted") return styles.statusAccepted;
    return styles.statusDefault;
  };

  const getStatusTextStyle = (status: string) => {
    if (status === "Pending") return styles.statusPendingText;
    if (status === "Accepted") return styles.statusAcceptedText;
    return styles.statusDefaultText;
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <Text style={styles.headerTitle}>Reservations</Text>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {filteredReservations.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No reservations</Text>
            <Text style={styles.emptySubtext}>No {activeTab.toLowerCase()} reservations found</Text>
          </View>
        ) : (
          filteredReservations.map((reservation) => (
            <View key={reservation.id} style={styles.reservationCard}>
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <Text style={styles.vehicleName}>{reservation.vehicleName}</Text>
                <View style={getStatusStyle(reservation.status)}>
                  <Text style={getStatusTextStyle(reservation.status)}>
                    {reservation.status}
                  </Text>
                </View>
              </View>

              {/* Booking Info */}
              <View style={styles.bookingInfo}>
                <Text style={styles.bookingId}>{reservation.bookingId}</Text>
                <Text style={styles.price}>{reservation.price}</Text>
              </View>
              <View style={styles.bookingInfo}>
                <Text style={styles.dateTime}>
                  {reservation.date} | {reservation.time}
                </Text>
                <Text style={styles.passengers}>{reservation.passengers} passengers</Text>
              </View>

              {/* Locations */}
              <View style={styles.locationContainer}>
                <View style={styles.locationRow}>
                  <View style={styles.locationDotYellow} />
                  <Text style={styles.locationText} numberOfLines={1}>
                    {reservation.pickupLocation}
                  </Text>
                </View>
                <View style={styles.locationRow}>
                  <View style={styles.locationDotOrange} />
                  <Text style={styles.locationText} numberOfLines={1}>
                    {reservation.dropoffLocation}
                  </Text>
                </View>
              </View>

              {/* Vehicle Image */}
              <Image
                source={{ uri: reservation.vehicleImage }}
                style={styles.vehicleImage}
                resizeMode="contain"
              />

              {/* Driver Info - Only for In-progress */}
              {reservation.driver && (
                <View style={styles.driverCard}>
                  <View style={styles.driverHeader}>
                    <Text style={styles.driverLabel}>Your Driver</Text>
                    <View style={styles.ratingBadge}>
                      <Ionicons name="star" size={12} color="#D4A04A" />
                      <Text style={styles.ratingText}>{reservation.driver.rating}</Text>
                    </View>
                  </View>
                  <View style={styles.driverInfo}>
                    <Image
                      source={{ uri: reservation.driver.photo }}
                      style={styles.driverPhoto}
                    />
                    <View style={styles.driverDetails}>
                      <Text style={styles.driverName}>{reservation.driver.name}</Text>
                      <Text style={styles.vehicleNumber}>{reservation.driver.vehicleNumber}</Text>
                    </View>
                    <TouchableOpacity style={styles.callBtn}>
                      <Ionicons name="call" size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Cancel Button - Only for Pending */}
              {(reservation.status === "Pending" || reservation.status === "Accepted") && (
                <TouchableOpacity style={styles.cancelBtn} activeOpacity={0.8}>
                  <Text style={styles.cancelBtnText}>Cancel Reservation</Text>
                </TouchableOpacity>
              )}

              {/* Track Ride Button - Only for In-progress */}
              {reservation.status === "In-progress" && (
                <TouchableOpacity 
                  style={styles.trackBtn} 
                  activeOpacity={0.8}
                  onPress={() => router.push("/customer/track-ride")}
                >
                  <Ionicons name="location" size={18} color="#fff" />
                  <Text style={styles.trackBtnText}>Track Ride</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a1a",
    textAlign: "center",
    paddingVertical: 16,
  },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 18,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
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
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  contentContainer: {
    paddingHorizontal: 20,
  },
  reservationCard: {
    borderWidth: 1,
    borderColor: "#e8e8e8",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    flex: 1,
  },
  statusPending: {
    backgroundColor: "#fff5e6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusPendingText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#D4A04A",
  },
  statusAccepted: {
    backgroundColor: "#e6f7e6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusAcceptedText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#2e7d32",
  },
  statusDefault: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusDefaultText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#666",
  },
  bookingInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  bookingId: {
    fontSize: 11,
    color: "#D4A04A",
    textDecorationLine: "underline",
  },
  price: {
    fontSize: 13,
    fontWeight: "600",
    color: "#D4A04A",
  },
  dateTime: {
    fontSize: 12,
    color: "#666",
  },
  passengers: {
    fontSize: 12,
    color: "#666",
  },
  locationContainer: {
    marginTop: 12,
    gap: 8,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  locationDotYellow: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#D4A04A",
  },
  locationDotOrange: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF6B35",
  },
  locationText: {
    fontSize: 12,
    color: "#666",
    flex: 1,
  },
  vehicleImage: {
    width: "100%",
    height: 100,
    marginTop: 12,
    borderRadius: 8,
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 12,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1a1a1a",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
  },
  driverCard: {
    backgroundColor: "#f8f9fa",
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
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
    color: "#666",
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1a1a1a",
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
  driverDetails: {
    flex: 1,
    marginLeft: 12,
  },
  driverName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  vehicleNumber: {
    fontSize: 12,
    color: "#666",
  },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2e7d32",
    justifyContent: "center",
    alignItems: "center",
  },
  trackBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D4A04A",
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 12,
    gap: 8,
  },
  trackBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
});
