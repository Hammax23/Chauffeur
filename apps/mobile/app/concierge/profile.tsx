import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Pressable,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useConciergeAuth } from "../../contexts/ConciergeAuthContext";

const GOLD = "#D4A04A";

export default function ConciergeProfileScreen() {
  const { concierge, logout } = useConciergeAuth();

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </Pressable>
        <Text style={styles.topTitle}>Profile</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatar}>
          <Text style={styles.avatarLetter}>{concierge?.name?.[0] || "C"}</Text>
        </View>
        <Text style={styles.name}>{concierge?.name || "Concierge"}</Text>
        <Text style={styles.email}>{concierge?.email}</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Hotel</Text>
          <Info label="Name" value={concierge?.hotelName} />
          <Info label="Phone" value={concierge?.phone} />
          <Info
            label="Commission"
            value={
              concierge?.hotelCommissionPercent != null
                ? `${concierge.hotelCommissionPercent}%`
                : "—"
            }
          />
        </View>

        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.85 }]}
        >
          <Ionicons name="log-out-outline" size={20} color="#dc2626" />
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || "—"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  topTitle: { fontSize: 17, fontWeight: "700", color: "#0f172a" },
  content: { padding: 24, alignItems: "center", paddingBottom: 40 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarLetter: { fontSize: 28, fontWeight: "800", color: "#111" },
  name: { fontSize: 22, fontWeight: "700", color: "#0f172a" },
  email: { fontSize: 14, color: "#64748b", marginTop: 4, marginBottom: 24 },
  card: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#0f172a", marginBottom: 12 },
  infoRow: { marginBottom: 12 },
  infoLabel: { fontSize: 12, color: "#94a3b8", fontWeight: "600", marginBottom: 2 },
  infoValue: { fontSize: 15, color: "#0f172a", fontWeight: "500" },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
  },
  logoutText: { color: "#dc2626", fontSize: 15, fontWeight: "700" },
});
