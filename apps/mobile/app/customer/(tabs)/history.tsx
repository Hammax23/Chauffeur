import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getReservations, type Reservation } from "../../../services/api";

export default function HistoryScreen() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchReservations = useCallback(async () => {
    try {
      setLoadError(null);
      const data = await getReservations();
      if (data.success) {
        setReservations(data.reservations);
      } else {
        setLoadError("Could not load history.");
      }
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load history.");
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

  const completed = useMemo(() => {
    return reservations.filter((r) => r.status === "DONE" || r.status === "CANCELLED");
  }, [reservations]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <Text style={styles.headerTitle}>History</Text>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchReservations();
            }}
            tintColor="#D4A04A"
            colors={["#D4A04A"]}
          />
        }
      >
        {isLoading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color="#D4A04A" />
          </View>
        ) : loadError ? (
          <View style={styles.emptyState}>
            <Ionicons name="cloud-offline-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>{loadError}</Text>
            <TouchableOpacity
              style={{ marginTop: 12, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#0f172a", borderRadius: 10 }}
              onPress={() => {
                setIsLoading(true);
                void fetchReservations();
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "600" }}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : completed.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No ride history</Text>
            <Text style={styles.emptySubtext}>Completed rides will appear here.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {completed.map((reservation) => (
              <TouchableOpacity
                key={reservation.id}
                activeOpacity={0.85}
                style={styles.card}
                onPress={() =>
                  router.push({
                    pathname: "/customer/track-ride",
                    params: { bookingId: reservation.bookingId },
                  })
                }
              >
                <View style={styles.rowBetween}>
                  <Text style={styles.bookingId}>{reservation.bookingId}</Text>
                  <View
                    style={[
                      styles.statusPill,
                      reservation.status === "DONE" ? styles.statusDone : styles.statusCancelled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        reservation.status === "DONE"
                          ? styles.statusDoneText
                          : styles.statusCancelledText,
                      ]}
                    >
                      {reservation.status === "DONE" ? "COMPLETED" : "CANCELLED"}
                    </Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>
                    {reservation.serviceDate} | {reservation.serviceTime}
                  </Text>
                  <Text style={styles.metaText}>{reservation.passengers} passengers</Text>
                </View>

                <View style={styles.locationBlock}>
                  <View style={styles.locationRow}>
                    <View style={[styles.dot, styles.dotPickup]} />
                    <Text style={styles.locationText} numberOfLines={2}>
                      {reservation.pickupLocation}
                    </Text>
                  </View>
                  <View style={styles.locationRow}>
                    <View style={[styles.dot, styles.dotDropoff]} />
                    <Text style={styles.locationText} numberOfLines={2}>
                      {reservation.dropoffLocation}
                    </Text>
                  </View>
                </View>

                <View style={styles.footerRow}>
                  <Text style={styles.totalText}>
                    Total: ${Number(reservation.total || 0).toFixed(2)}
                  </Text>
                  <View style={styles.ctaRow}>
                    <Text style={styles.ctaText}>View</Text>
                    <Ionicons name="chevron-forward" size={16} color="#111" />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#000",
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 10,
  },
  container: { flex: 1, backgroundColor: "#fff" },
  contentContainer: { paddingHorizontal: 20, paddingBottom: 110 },
  list: { gap: 14, paddingTop: 6 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e8e8e8",
  },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  bookingId: { fontSize: 14, color: "#D4A04A", fontWeight: "700" },
  statusPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.4 },
  statusDone: { backgroundColor: "rgba(76, 175, 80, 0.14)" },
  statusDoneText: { color: "#2E7D32" },
  statusCancelled: { backgroundColor: "rgba(229, 57, 53, 0.10)" },
  statusCancelledText: { color: "#C62828" },
  metaRow: { marginTop: 10, flexDirection: "row", justifyContent: "space-between" },
  metaText: { fontSize: 13, color: "#111", fontWeight: "600" },
  locationBlock: {
    marginTop: 12,
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  locationRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  dotPickup: { backgroundColor: "#4CAF50" },
  dotDropoff: { backgroundColor: "#F44336" },
  locationText: { flex: 1, fontSize: 13, color: "#333", lineHeight: 18 },
  footerRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalText: { fontSize: 13, fontWeight: "800", color: "#111" },
  ctaRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  ctaText: { fontSize: 13, fontWeight: "800", color: "#111" },
  emptyState: { alignItems: "center", paddingVertical: 70, gap: 10 },
  emptyText: { fontSize: 16, color: "#999", fontWeight: "700" },
  emptySubtext: { fontSize: 13, color: "#aaa", fontWeight: "600" },
});

