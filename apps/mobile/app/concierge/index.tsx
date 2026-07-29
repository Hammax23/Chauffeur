import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Pressable,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useConciergeAuth } from "../../contexts/ConciergeAuthContext";
import {
  getConciergeDashboard,
  getConciergeRides,
  type ConciergeDashboard,
  type ConciergeRide,
} from "../../services/api";
import { SlimSpinner } from "../../components/SlimSpinner";

const GOLD = "#D4A04A";

function shortLoc(s?: string | null) {
  if (!s?.trim()) return "—";
  return s.split(",")[0]?.trim() || s.trim();
}

function statusColor(status: string) {
  switch (status) {
    case "OPEN":
      return "#2563eb";
    case "ASSIGNED":
    case "ON_THE_WAY":
    case "ARRIVED":
    case "IN_TRIP":
      return "#059669";
    case "COMPLETED":
      return "#64748b";
    case "CANCELLED":
      return "#dc2626";
    default:
      return "#64748b";
  }
}

type ListTab = "active" | "completed";

function RideCard({ ride }: { ride: ConciergeRide }) {
  return (
    <Pressable
      onPress={() => router.push(`/concierge/ride/${ride.id}`)}
      style={({ pressed }) => [styles.rideCard, pressed && { opacity: 0.92 }]}
    >
      <View style={styles.rideTop}>
        <Text style={styles.rideCode}>{ride.requestCode}</Text>
        <View style={[styles.badge, { backgroundColor: statusColor(ride.status) + "18" }]}>
          <Text style={[styles.badgeText, { color: statusColor(ride.status) }]}>
            {ride.status.replace(/_/g, " ")}
          </Text>
        </View>
      </View>
      <Text style={styles.guestName}>{ride.guestName || "Guest"}</Text>
      <Text style={styles.route}>
        {shortLoc(ride.pickupLocation)} → {shortLoc(ride.dropoffLocation)}
      </Text>
      <View style={styles.rideMeta}>
        <Text style={styles.metaText}>${Number(ride.fare || 0).toFixed(2)}</Text>
        <Text style={styles.metaText}>
          {ride.guestPaymentMethod && ride.guestPaymentMethod !== "UNSET"
            ? ride.guestPaymentMethod
            : "Pay unset"}
          {Number(ride.platformFee || 0) > 0 ? ` · fee $${Number(ride.platformFee).toFixed(2)}` : ""}
        </Text>
      </View>
      {ride.status === "COMPLETED" && ride.commission?.conciergeClaim === "UNSET" ? (
        <Text style={styles.pendingHint}>Commission confirmation pending</Text>
      ) : null}
    </Pressable>
  );
}

export default function ConciergeDashboardScreen() {
  const { concierge } = useConciergeAuth();
  const [dashboard, setDashboard] = useState<ConciergeDashboard | null>(null);
  const [activeRides, setActiveRides] = useState<ConciergeRide[]>([]);
  const [completedRides, setCompletedRides] = useState<ConciergeRide[]>([]);
  const [tab, setTab] = useState<ListTab>("active");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [dashRes, activeRes, completedRes] = await Promise.all([
        getConciergeDashboard(),
        getConciergeRides("active"),
        getConciergeRides("completed"),
      ]);
      if (dashRes.success) setDashboard(dashRes.dashboard);
      if (activeRes.success) setActiveRides(activeRes.rides);
      if (completedRes.success) setCompletedRides(completedRes.rides);
    } catch {
      // keep last good state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(true);
    }, [load])
  );

  const firstName = concierge?.name?.split(" ")[0] || "Concierge";
  const list = tab === "active" ? activeRides : completedRides;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load(true);
            }}
            tintColor={GOLD}
            colors={[GOLD]}
          />
        }
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>HOTEL CONCIERGE</Text>
            <Text style={styles.title}>Hi, {firstName}</Text>
            <Text style={styles.subtitle}>{concierge?.hotelName || "Your hotel"}</Text>
          </View>
          <Pressable
            onPress={() => router.push("/concierge/profile")}
            style={({ pressed }) => [styles.avatar, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.avatarLetter}>{concierge?.name?.[0] || "C"}</Text>
          </Pressable>
        </View>

        {loading && !dashboard ? (
          <View style={styles.loader}>
            <SlimSpinner size={32} stroke={2} color={GOLD} />
          </View>
        ) : (
          <>
            <View style={styles.statsRow}>
              <Pressable style={styles.statCard} onPress={() => setTab("active")}>
                <Text style={styles.statValue}>{dashboard?.activeRequests ?? 0}</Text>
                <Text style={styles.statLabel}>Active</Text>
              </Pressable>
              <Pressable style={styles.statCard} onPress={() => setTab("completed")}>
                <Text style={styles.statValue}>{dashboard?.completedTrips ?? 0}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </Pressable>
              <Pressable
                style={styles.statCard}
                onPress={() => setTab("completed")}
              >
                <Text style={styles.statValue}>{dashboard?.pendingCommissions ?? 0}</Text>
                <Text style={styles.statLabel}>Pending $</Text>
              </Pressable>
            </View>

            <Pressable
              onPress={() => router.push("/concierge/create")}
              style={({ pressed }) => [styles.createBtn, pressed && { opacity: 0.9 }]}
            >
              <Ionicons name="add-circle-outline" size={22} color="#fff" />
              <Text style={styles.createBtnText}>New Guest Ride</Text>
            </Pressable>

            <View style={styles.tabRow}>
              <Pressable
                style={[styles.tabBtn, tab === "active" && styles.tabBtnActive]}
                onPress={() => setTab("active")}
              >
                <Text style={[styles.tabText, tab === "active" && styles.tabTextActive]}>
                  Active
                </Text>
              </Pressable>
              <Pressable
                style={[styles.tabBtn, tab === "completed" && styles.tabBtnActive]}
                onPress={() => setTab("completed")}
              >
                <Text style={[styles.tabText, tab === "completed" && styles.tabTextActive]}>
                  Completed
                </Text>
              </Pressable>
            </View>

            <Text style={styles.sectionTitle}>
              {tab === "active" ? "Active rides" : "Completed rides"}
            </Text>
            {list.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="car-outline" size={36} color="#cbd5e1" />
                <Text style={styles.emptyText}>
                  {tab === "active" ? "No active rides right now" : "No completed rides yet"}
                </Text>
              </View>
            ) : (
              list.map((ride) => <RideCard key={ride.id} ride={ride} />)
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 24, gap: 12 },
  eyebrow: { fontSize: 11, fontWeight: "700", color: GOLD, letterSpacing: 1.2 },
  title: { fontSize: 26, fontWeight: "700", color: "#0f172a", marginTop: 4 },
  subtitle: { fontSize: 14, color: "#64748b", marginTop: 2 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { fontSize: 20, fontWeight: "700", color: "#111" },
  loader: { paddingVertical: 60, alignItems: "center" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  statValue: { fontSize: 22, fontWeight: "800", color: "#0f172a" },
  statLabel: { fontSize: 12, color: "#64748b", marginTop: 4, fontWeight: "500" },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1a1a1a",
    borderRadius: 30,
    paddingVertical: 15,
    marginBottom: 16,
  },
  createBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  tabRow: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10 },
  tabBtnActive: { backgroundColor: "#fff" },
  tabText: { fontSize: 14, fontWeight: "600", color: "#64748b" },
  tabTextActive: { color: "#0f172a" },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 12,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 36,
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  emptyText: { marginTop: 10, color: "#94a3b8", fontSize: 14 },
  rideCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  rideTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rideCode: { fontSize: 12, fontWeight: "700", color: GOLD, letterSpacing: 0.5 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  guestName: { fontSize: 16, fontWeight: "700", color: "#0f172a", marginTop: 8 },
  route: { fontSize: 13, color: "#64748b", marginTop: 4 },
  rideMeta: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  metaText: { fontSize: 12, color: "#94a3b8", fontWeight: "600" },
  pendingHint: { marginTop: 8, fontSize: 12, fontWeight: "600", color: "#b45309" },
});
