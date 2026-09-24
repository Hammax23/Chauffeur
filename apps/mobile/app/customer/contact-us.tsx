import { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Platform,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Modal,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import { useCustomerTheme } from "../../contexts/CustomerThemeContext";
import { submitSupportTicket } from "../../services/api";
import { SlimSpinner } from "../../components/SlimSpinner";
import { GOLD } from "../../theme/driver-theme";

const TICKET_TYPES = [
  // Keep in sync with apps/web/src/lib/support-ticket-types.ts
  "Suggestion",
  "Billing Problem",
  "General Question",
  "Booking Issue",
  "Account / Login",
  "Feedback",
  "Other",
] as const;

export default function ContactUsScreen() {
  const { user } = useAuth();
  const { palette, isDark } = useCustomerTheme();
  const blurIntensity = Platform.OS === "ios" ? 48 : 28;
  const cardBlur = Platform.OS === "ios" ? 36 : 22;

  const [type, setType] = useState<(typeof TICKET_TYPES)[number] | "">("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fullName = useMemo(
    () => [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || "Guest",
    [user?.firstName, user?.lastName]
  );

  const canSubmit = !!type && message.trim().length >= 10 && !submitting;

  async function handleSubmit() {
    if (!type) {
      Alert.alert("Select a topic", "Please choose what this message is about.");
      return;
    }
    if (message.trim().length < 10) {
      Alert.alert("Message too short", "Please enter at least 10 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitSupportTicket({
        type,
        subject: subject.trim() || undefined,
        message: message.trim(),
      });
      if (!res.ok || !res.data.success) {
        Alert.alert("Unable to send", res.data.error || "Please try again.");
        return;
      }
      Alert.alert(
        "Message sent",
        res.data.message ||
          "Thank you. Our team has received your message and will follow up soon.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (e) {
      Alert.alert(
        "Unable to send",
        e instanceof Error ? e.message : "Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.bg }]} edges={["top", "bottom"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            hitSlop={10}
          >
            <Ionicons name="chevron-back" size={22} color={palette.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: palette.text }]}>Contact Us</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <BlurView
            intensity={blurIntensity}
            tint={isDark ? "dark" : "light"}
            style={[
              styles.heroCard,
              {
                borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)",
                backgroundColor:
                  Platform.OS === "android"
                    ? isDark
                      ? "rgba(28,28,30,0.92)"
                      : "rgba(255,255,255,0.92)"
                    : "transparent",
              },
            ]}
          >
            <View style={styles.heroIcon}>
              <Ionicons name="chatbubbles-outline" size={20} color={GOLD} />
            </View>
            <Text style={[styles.heroTitle, { color: palette.text }]}>
              How can we help?
            </Text>
            <Text style={[styles.heroSub, { color: palette.muted }]}>
              Send a message to SARJ support. We typically respond within one business day.
            </Text>
            <View style={styles.heroMeta}>
              <Text style={[styles.heroMetaText, { color: palette.muted }]} numberOfLines={1}>
                {fullName}
              </Text>
              {user?.email ? (
                <Text style={[styles.heroMetaText, { color: palette.muted }]} numberOfLines={1}>
                  {user.email}
                </Text>
              ) : null}
            </View>
          </BlurView>

          <Text style={styles.fieldLabel}>TOPIC *</Text>
          <Pressable
            onPress={() => setTypePickerOpen(true)}
            style={({ pressed }) => [
              styles.fieldCard,
              {
                borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)",
                backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#FFF",
              },
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.fieldValue,
                { color: type ? palette.text : palette.muted },
              ]}
            >
              {type || "Select a topic"}
            </Text>
            <Ionicons name="chevron-down" size={18} color={palette.muted} />
          </Pressable>

          <Text style={styles.fieldLabel}>SUBJECT (OPTIONAL)</Text>
          <View
            style={[
              styles.fieldCard,
              {
                borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)",
                backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#FFF",
              },
            ]}
          >
            <TextInput
              value={subject}
              onChangeText={setSubject}
              placeholder="Brief subject"
              placeholderTextColor={palette.muted}
              style={[styles.input, { color: palette.text }]}
              maxLength={120}
            />
          </View>

          <Text style={styles.fieldLabel}>MESSAGE *</Text>
          <BlurView
            intensity={cardBlur}
            tint={isDark ? "dark" : "light"}
            style={[
              styles.messageCard,
              {
                borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)",
                backgroundColor:
                  Platform.OS === "android"
                    ? isDark
                      ? "rgba(28,28,30,0.92)"
                      : "#FFF"
                    : isDark
                      ? "rgba(255,255,255,0.04)"
                      : "rgba(255,255,255,0.55)",
              },
            ]}
          >
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Describe your question or issue…"
              placeholderTextColor={palette.muted}
              style={[styles.messageInput, { color: palette.text }]}
              multiline
              textAlignVertical="top"
              maxLength={4000}
            />
            <Text style={[styles.charCount, { color: palette.muted }]}>
              {message.trim().length}/4000
            </Text>
          </BlurView>

          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            style={({ pressed }) => [
              styles.submitWrap,
              (!canSubmit || pressed) && { opacity: canSubmit ? 0.9 : 0.45 },
            ]}
          >
            <LinearGradient
              colors={["#E8C078", GOLD, "#B8862E"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.submitBtn}
            >
              {submitting ? (
                <SlimSpinner size={20} stroke={2} color="#1A1208" />
              ) : (
                <>
                  <Ionicons name="send" size={16} color="#1A1208" />
                  <Text style={styles.submitText}>Send message</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={typePickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setTypePickerOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setTypePickerOpen(false)} />
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: isDark ? "#1C1C1E" : "#FFF" },
            ]}
          >
            <Text style={[styles.modalTitle, { color: palette.text }]}>Select topic</Text>
            <FlatList
              data={TICKET_TYPES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setType(item);
                    setTypePickerOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.modalRow,
                    pressed && styles.pressed,
                    type === item && styles.modalRowActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.modalRowText,
                      { color: palette.text },
                      type === item && { color: GOLD, fontWeight: "700" },
                    ]}
                  >
                    {item}
                  </Text>
                  {type === item ? (
                    <Ionicons name="checkmark-circle" size={18} color={GOLD} />
                  ) : null}
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  heroCard: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    marginBottom: 22,
    overflow: "hidden",
  },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(212,160,74,0.14)",
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  heroSub: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
  },
  heroMeta: {
    marginTop: 14,
    gap: 2,
  },
  heroMetaText: {
    fontSize: 12,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    color: GOLD,
    marginBottom: 8,
    marginTop: 4,
  },
  fieldCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  fieldValue: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: Platform.OS === "ios" ? 14 : 10,
  },
  messageCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    minHeight: 160,
    marginBottom: 22,
    overflow: "hidden",
  },
  messageInput: {
    minHeight: 120,
    fontSize: 15,
    lineHeight: 22,
  },
  charCount: {
    marginTop: 8,
    fontSize: 11,
    textAlign: "right",
  },
  submitWrap: {
    borderRadius: 16,
    overflow: "hidden",
  },
  submitBtn: {
    height: 52,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  submitText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1A1208",
  },
  pressed: { opacity: 0.85 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingBottom: 28,
    paddingHorizontal: 8,
    maxHeight: "70%",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginHorizontal: 8,
  },
  modalRowActive: {
    backgroundColor: "rgba(212,160,74,0.12)",
  },
  modalRowText: {
    fontSize: 15,
    fontWeight: "500",
  },
});
