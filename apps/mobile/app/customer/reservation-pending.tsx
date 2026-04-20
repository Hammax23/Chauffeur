import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function ReservationPendingScreen() {
  const handleGotIt = () => {
    router.replace("/customer/reservations");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.content}>
        {/* Hourglass Illustration */}
        <View style={styles.illustrationContainer}>
          <View style={styles.hourglass}>
            <Text style={styles.hourglassEmoji}>⏳</Text>
          </View>
          {/* Decorative elements */}
          <View style={styles.sparkle1}>
            <Ionicons name="sparkles" size={16} color="#1a1a1a" />
          </View>
          <View style={styles.sparkle2}>
            <Ionicons name="flash" size={14} color="#1a1a1a" />
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Pending Reservation!</Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          You reservation is in pending state, we will notify you once we will assign you a driver.
        </Text>
      </View>

      {/* Got it Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={styles.gotItBtn} 
          activeOpacity={0.9}
          onPress={handleGotIt}
        >
          <Text style={styles.gotItBtnText}>Got, it</Text>
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
  },
  hourglassEmoji: {
    fontSize: 70,
  },
  sparkle1: {
    position: "absolute",
    top: -5,
    right: -10,
    transform: [{ rotate: "15deg" }],
  },
  sparkle2: {
    position: "absolute",
    bottom: 10,
    right: -15,
    transform: [{ rotate: "-10deg" }],
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
  bottomContainer: {
    paddingHorizontal: 40,
    paddingBottom: Platform.OS === "ios" ? 20 : 30,
  },
  gotItBtn: {
    backgroundColor: "#1a1a1a",
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: "center",
  },
  gotItBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
