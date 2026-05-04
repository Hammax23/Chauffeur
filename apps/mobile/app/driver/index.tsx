import { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Image,
  Switch,
  ActivityIndicator,
  Alert,
  RefreshControl,
  AppState,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useDriverAuth } from "../../contexts/DriverAuthContext";
import { getDriverRides, acceptRide, rejectRide, DriverRide } from "../../services/api";

type TabType = "requests" | "upcoming";

const POLL_INTERVAL = 5000; // 5 seconds

export default function DriverDashboard() {
  const { driver, toggleActive } = useDriverAuth();
  const [isActive, setIsActive] = useState(driver?.isActive || false);
  const [activeTab, setActiveTab] = useState<TabType>("requests");
  const [rides, setRides] = useState<DriverRide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requestCount, setRequestCount] = useState(0);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isFocusedRef = useRef(true);

  const fetchRides = useCallback(async (tab: TabType, silent = false) => {
    try {
      const data = await getDriverRides(tab);
      if (data.success) {
        setRides(data.rides);
        if (tab === "requests") {
          setRequestCount(data.rides.length);
        }
      }
    } catch {
      // Silently fail
    } finally {
      if (!silent) {
        setIsLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  // Auto-poll: fetch rides every 5 seconds for real-time updates
  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;
      setIsLoading(true);
      fetchRides(activeTab);

      // Start polling
      pollTimerRef.current = setInterval(() => {
        if (isFocusedRef.current) {
          fetchRides(activeTab, true);
        }
      }, POLL_INTERVAL);

      return () => {
        isFocusedRef.current = false;
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
      };
    }, [activeTab, fetchRides])
  );

  // Also fetch request count in background for notification badge
  useEffect(() => {
    if (activeTab !== "requests") {
      const fetchCount = async () => {
        try {
          const data = await getDriverRides("requests");
          if (data.success) {
            setRequestCount(data.rides.length);
          }
        } catch {}
      };
      fetchCount();
      const interval = setInterval(fetchCount, POLL_INTERVAL);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  // Pause polling when app goes to background
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      isFocusedRef.current = state === "active";
    });
    return () => sub.remove();
  }, []);

  const handleToggleActive = async (value: boolean) => {
    setIsActive(value);
    const result = await toggleActive(value);
    if (!result.success) {
      setIsActive(!value);
      Alert.alert("Error", result.error || "Failed to update status");
    }
  };

  const handleAcceptRide = async (bookingId: string) => {
    try {
      const result = await acceptRide(bookingId);
      if (result.success) {
        Alert.alert("Success", "Ride accepted!");
        fetchRides(activeTab);
      } else {
        Alert.alert("Error", "Failed to accept ride");
      }
    } catch {
      Alert.alert("Error", "Something went wrong");
    }
  };

  const handleRejectRide = async (bookingId: string) => {
    Alert.alert("Reject Ride", "Are you sure you want to reject this ride?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Reject",
        style: "destructive",
        onPress: async () => {
          try {
            const result = await rejectRide(bookingId);
            if (result.success) {
              fetchRides(activeTab);
            } else {
              Alert.alert("Error", "Failed to reject ride");
            }
          } catch {
            Alert.alert("Error", "Something went wrong");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchRides(activeTab);
            }}
            tintColor="#D4A04A"
            colors={["#D4A04A"]}
          />
        }
      >
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.statusToggle}>
            <Switch
              value={isActive}
              onValueChange={handleToggleActive}
              trackColor={{ false: "#e0e0e0", true: "#4CAF50" }}
              thumbColor={isActive ? "#fff" : "#fff"}
            />
            <Text style={styles.statusText}>{isActive ? "Active" : "Inactive"}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.notificationBtn}>
              <Ionicons name="notifications-outline" size={24} color="#000" />
              {requestCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.badgeText}>{requestCount > 9 ? "9+" : requestCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.avatarContainer} onPress={() => router.push("/driver/profile")}>
              {driver?.photo ? (
                <Image source={{ uri: driver.photo }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: '#D4A04A', justifyContent: 'center', alignItems: 'center' }]}>
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{driver?.name?.[0] || 'D'}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={styles.greetingTitle}>Hi, {driver?.name?.split(' ')[0] || 'Driver'} 🤚</Text>
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

        {/* Rides List */}
        {isLoading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color="#D4A04A" />
          </View>
        ) : rides.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="car-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>
              {activeTab === "requests" ? "No new ride requests" : "No upcoming rides"}
            </Text>
          </View>
        ) : (
          <View style={styles.requestsList}>
            {rides.map((ride) => (
              <View key={ride.id} style={styles.rideCard}>
                {/* Customer Info */}
                <View style={styles.customerRow}>
                  <View style={[styles.customerAvatar, { backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' }]}>
                    <Ionicons name="person" size={22} color="#999" />
                  </View>
                  <View style={styles.customerInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.customerName}>{ride.customerName}</Text>
                      {activeTab === "requests" && (
                        <View style={styles.newBadge}>
                          <Text style={styles.newBadgeText}>NEW</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.customerPhone}>{ride.phone}</Text>
                  </View>
                </View>

                {/* Booking ID */}
                <Text style={styles.bookingId}>{ride.bookingId}</Text>

                {/* Date & Passengers */}
                <View style={styles.dateRow}>
                  <Text style={styles.dateText}>{ride.serviceDate} | {ride.serviceTime}</Text>
                  <Text style={styles.passengers}>{ride.passengers} passengers</Text>
                </View>

                {/* Locations */}
                <View style={styles.locationsContainer}>
                  <View style={styles.locationRow}>
                    <View style={[styles.locationDot, styles.pickupDot]} />
                    <Text style={styles.locationText}>{ride.pickupLocation}</Text>
                  </View>
                  <View style={styles.locationRow}>
                    <View style={[styles.locationDot, styles.dropoffDot]} />
                    <Text style={styles.locationText}>{ride.dropoffLocation}</Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity style={styles.rejectButton} onPress={() => handleRejectRide(ride.bookingId)}>
                    <Text style={styles.rejectButtonText}>{activeTab === "requests" ? "Reject Ride" : "Cancel Ride"}</Text>
                  </TouchableOpacity>
                  {activeTab === "requests" ? (
                    <TouchableOpacity style={styles.acceptButton} onPress={() => handleAcceptRide(ride.bookingId)}>
                      <Text style={styles.acceptButtonText}>Accept Ride</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.acceptButton} onPress={() => router.push({ pathname: "/driver/ride-details", params: { bookingId: ride.bookingId } })}>
                      <Text style={styles.acceptButtonText}>Start Ride</Text>
                    </TouchableOpacity>
                  )}
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
