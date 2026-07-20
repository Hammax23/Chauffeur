import { useLocalSearchParams, router } from "expo-router";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

function qp(v: string | string[] | undefined): string {
  if (v == null) return "";
  return Array.isArray(v) ? String(v[0] ?? "") : String(v);
}

export default function ReservationPendingScreen() {
  const raw = useLocalSearchParams();
  const bookingId = qp(raw.bookingId);

  const handleGotIt = () => {
    router.replace("/customer/reservations");
  };

  const handleTrack = () => {
    if (!bookingId) {
      handleGotIt();
      return;
    }
    router.replace({
      pathname: "/customer/track-ride",
      params: { bookingId },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.content}>
        <View style={styles.illustrationContainer}>
          <View style={styles.hourglass}>
            <Ionicons name="hourglass-outline" size={64} color="#0f172a" />
          </View>
        </View>

        <Text style={styles.title}>Reservation pending</Text>
        <Text style={styles.subtitle}>
          Your reservation is pending. We will notify you when a chauffeur is assigned
          {bookingId ? ` (${bookingId})` : ""}.
        </Text>
      </View>

      <View style={styles.bottomContainer}>
        {bookingId ? (
          <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.9} onPress={handleTrack}>
            <Text style={styles.secondaryBtnText}>View booking</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={styles.gotItBtn} activeOpacity={0.9} onPress={handleGotIt}>
          <Text style={styles.gotItBtnText}>Got it</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  illustrationContainer: {
    position: "relative",
    marginBottom: 30,
  },
  hourglass: {
    width: 100,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 22,
  },
  bottomContainer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === "ios" ? 8 : 20,
    gap: 10,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  secondaryBtnText: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "600",
  },
  gotItBtn: {
    backgroundColor: "#0f172a",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  gotItBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
