import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  getReservationById,
  submitTripReview,
  type Reservation,
} from "../../services/api";
import { markReviewPrompted } from "../../utils/review-prompt";

const GOLD = "#C9A063";
const COMMENT_MAX = 500;

const STAR_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very good",
  5: "Excellent",
};

export default function RateDriverScreen() {
  const params = useLocalSearchParams<{ bookingId?: string | string[] }>();
  const bookingId =
    typeof params.bookingId === "string"
      ? params.bookingId
      : Array.isArray(params.bookingId)
        ? params.bookingId[0]
        : "";

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!bookingId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getReservationById(bookingId);
      if (!data.success || !data.reservation) {
        Alert.alert("Unavailable", "Could not load this trip.", [
          { text: "OK", onPress: () => router.back() },
        ]);
        return;
      }
      const r = data.reservation;
      if (r.status !== "DONE" || !r.driver) {
        Alert.alert("Not ready", "Reviews are available after a completed trip with your chauffeur.", [
          { text: "OK", onPress: () => router.back() },
        ]);
        return;
      }
      setReservation(r);
      if (r.review) {
        setStars(r.review.stars);
        setComment(r.review.comment || "");
      }
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Something went wrong.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (bookingId) void markReviewPrompted(bookingId);
  }, [bookingId]);

  const alreadyReviewed = !!reservation?.review;
  const canSubmit = stars >= 1 && stars <= 5 && !submitting;

  const starHint = useMemo(
    () => (stars > 0 ? STAR_LABELS[stars] || "" : "Tap a star to rate"),
    [stars]
  );

  const handleSubmit = async () => {
    if (!bookingId || !canSubmit) return;
    setSubmitting(true);
    try {
      const result = await submitTripReview(bookingId, {
        stars,
        comment: comment.trim() || undefined,
      });
      if (!result.success) {
        Alert.alert("Review", result.error || "Could not save your review.");
        return;
      }
      Alert.alert(
        "Thank you",
        alreadyReviewed
          ? "Your review has been updated."
          : "Your review has been shared with your chauffeur.",
        [{ text: "Done", onPress: () => router.back() }]
      );
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Could not save your review.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0f172a" />
        </View>
      </SafeAreaView>
    );
  }

  if (!reservation?.driver) {
    return null;
  }

  const driver = reservation.driver;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color="#0f172a" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rate chauffeur</Text>
          <View style={{ width: 56 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.eyebrow}>TRIP COMPLETE</Text>
          <Text style={styles.title}>How was your experience?</Text>
          <Text style={styles.subtitle}>
            Your feedback helps SARJ maintain a professional standard of service.
          </Text>

          <View style={styles.driverCard}>
            {driver.photo ? (
              <Image source={{ uri: driver.photo }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarLetter}>{driver.name?.[0] || "D"}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.driverName}>{driver.name}</Text>
              <Text style={styles.driverMeta} numberOfLines={1}>
                {[driver.vehiclePlate, reservation.bookingId].filter(Boolean).join(" · ")}
              </Text>
            </View>
          </View>

          <View style={styles.starsBlock}>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity
                  key={n}
                  onPress={() => setStars(n)}
                  activeOpacity={0.85}
                  accessibilityLabel={`${n} star${n === 1 ? "" : "s"}`}
                  hitSlop={6}
                >
                  <Ionicons
                    name={n <= stars ? "star" : "star-outline"}
                    size={40}
                    color={n <= stars ? GOLD : "#cbd5e1"}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.starHint}>{starHint}</Text>
          </View>

          <Text style={styles.inputLabel}>Comment (optional)</Text>
          <TextInput
            style={styles.commentInput}
            value={comment}
            onChangeText={(t) => setComment(t.slice(0, COMMENT_MAX))}
            placeholder="Share details about punctuality, professionalism, or the vehicle…"
            placeholderTextColor="#94a3b8"
            multiline
            textAlignVertical="top"
            maxLength={COMMENT_MAX}
          />
          <Text style={styles.charCount}>
            {comment.length}/{COMMENT_MAX}
          </Text>

          <TouchableOpacity
            style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={0.9}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>
                {alreadyReviewed ? "Update review" : "Submit review"}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Text style={styles.skipText}>{alreadyReviewed ? "Close" : "Maybe later"}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { flexDirection: "row", alignItems: "center", width: 56 },
  backText: { fontSize: 15, color: "#0f172a", marginLeft: 2 },
  headerTitle: { fontSize: 16, fontWeight: "600", color: "#0f172a" },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    color: GOLD,
    marginTop: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: "#64748b",
    marginBottom: 22,
  },
  driverCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 28,
  },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarFallback: {
    backgroundColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { color: GOLD, fontSize: 20, fontWeight: "700" },
  driverName: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  driverMeta: { fontSize: 12, color: "#64748b", marginTop: 2 },
  starsBlock: { alignItems: "center", marginBottom: 28 },
  starsRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  starHint: { fontSize: 14, fontWeight: "600", color: "#334155" },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 8,
  },
  commentInput: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#0f172a",
    backgroundColor: "#fafafa",
  },
  charCount: {
    alignSelf: "flex-end",
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 6,
    marginBottom: 20,
  },
  submitBtn: {
    backgroundColor: "#0f172a",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  skipBtn: { alignItems: "center", paddingVertical: 16 },
  skipText: { fontSize: 14, color: "#64748b", fontWeight: "500" },
});
