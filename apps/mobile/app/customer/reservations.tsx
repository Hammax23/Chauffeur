import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Image,
  Platform,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getReservations, cancelReservation, Reservation } from "../../services/api";

const tabs = ["Pending", "In-progress", "Completed"];

export default function ReservationsScreen() {
  const [activeTab, setActiveTab] = useState("Pending");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReservations = useCallback(async () => {
    try {
      const data = await getReservations();
      if (data.success) {
        setReservations(data.reservations);
      }
    } catch {
      // Silently fail
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

  const handleCancel = async (bookingId: string) => {
    Alert.alert(
      "Cancel Reservation",
      "Are you sure you want to cancel this reservation?",
      [
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
      ]
    );
  };

  const filteredReservations = reservations.filter((res) => {
    if (activeTab === "Pending") return res.status === "PENDING";
    if (activeTab === "In-progress") return res.status === "ON THE WAY" || res.status === "ARRIVED" || res.status === "CIC";
    if (activeTab === "Completed") return res.status === "DONE" || res.status === "CANCELLED";
    return true;
  });

  const getStatusStyle = (status: string) => {
    if (status === "PENDING") return styles.statusPending;
    if (status === "ON THE WAY" || status === "ARRIVED" || status === "CIC") return styles.statusAccepted;
    if (status === "CANCELLED") return styles.statusDefault;
    return styles.statusDefault;
  };

  const getStatusTextStyle = (status: string) => {
    if (status === "PENDING") return styles.statusPendingText;
    if (status === "ON THE WAY" || status === "ARRIVED" || status === "CIC") return styles.statusAcceptedText;
    if (status === "CANCELLED") return styles.statusDefaultText;
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchReservations(); }} />
        }
      >
        {isLoading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color="#D4A04A" />
          </View>
        ) : filteredReservations.length === 0 ? (
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
                <Text style={styles.vehicleName}>{reservation.vehicle}</Text>
                <View style={getStatusStyle(reservation.status)}>
                  <Text style={getStatusTextStyle(reservation.status)}>
                    {reservation.status}
                  </Text>
                </View>
              </View>

              {/* Booking Info */}
              <View style={styles.bookingInfo}>
                <Text style={styles.bookingId}>{reservation.bookingId}</Text>
                <Text style={styles.price}>${reservation.total.toFixed(2)} CAD</Text>
              </View>
              <View style={styles.bookingInfo}>
                <Text style={styles.dateTime}>
                  {reservation.serviceDate} | {reservation.serviceTime}
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

              {/* Driver Info - Only when driver assigned */}
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
                    {reservation.driver.photo ? (
                      <Image
                        source={{ uri: reservation.driver.photo }}
                        style={styles.driverPhoto}
                      />
                    ) : (
                      <View style={[styles.driverPhoto, { backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' }]}>
                        <Ionicons name="person" size={20} color="#999" />
                      </View>
                    )}
                    <View style={styles.driverDetails}>
                      <Text style={styles.driverName}>{reservation.driver.name}</Text>
                      <Text style={styles.vehicleNumber}>{reservation.driver.vehiclePlate}</Text>
                    </View>
                    <TouchableOpacity style={styles.callBtn}>
                      <Ionicons name="call" size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Cancel Button - Only for Pending */}
              {reservation.status === "PENDING" && (
                <TouchableOpacity style={styles.cancelBtn} activeOpacity={0.8} onPress={() => handleCancel(reservation.bookingId)}>
                  <Text style={styles.cancelBtnText}>Cancel Reservation</Text>
                </TouchableOpacity>
              )}

              {/* Track Ride Button - Only for In-progress */}
              {(reservation.status === "ON THE WAY" || reservation.status === "ARRIVED" || reservation.status === "CIC") && (
                <TouchableOpacity 
                  style={styles.trackBtn} 
                  activeOpacity={0.8}
                  onPress={() => router.push({ pathname: "/customer/track-ride", params: { bookingId: reservation.bookingId } })}
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
