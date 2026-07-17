import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { forgotPassword } from "../services/api";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendCode = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Please enter your email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const { ok, data } = await forgotPassword(trimmed);
      if (!ok || !data.success || !data.sessionId) {
        setError(data.error || "Unable to send verification code. Please try again.");
        return;
      }

      router.push({
        pathname: "/verify-otp",
        params: {
          sessionId: data.sessionId,
          email: trimmed.toLowerCase(),
          emailMasked: data.emailMasked || trimmed.toLowerCase(),
        },
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Something went wrong. Please try again.";
      setError(message);
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color="#0f172a" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.iconWrap}>
            <View style={styles.iconCircle}>
              <Ionicons name="lock-closed-outline" size={36} color="#0f172a" />
            </View>
          </View>

          <Text style={styles.title}>Forgot password?</Text>
          <Text style={styles.subtitle}>
            Enter the email on your account. We will send a 6-digit verification code to reset
            your password.
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Email address<Text style={styles.required}> *</Text>
            </Text>
            <TextInput
              style={[styles.input, error ? styles.inputError : null]}
              placeholder="you@example.com"
              placeholderTextColor="#94a3b8"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (error) setError("");
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              editable={!loading}
              returnKeyType="send"
              onSubmitEditing={handleSendCode}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

          <TouchableOpacity
            style={[styles.sendButton, loading && styles.sendButtonDisabled]}
            onPress={handleSendCode}
            activeOpacity={0.9}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.sendButtonText}>Send verification code</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.hint}>
            For your security, we never confirm whether an email is registered.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 40,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 28,
  },
  backText: {
    fontSize: 16,
    color: "#0f172a",
    marginLeft: 4,
  },
  iconWrap: {
    alignItems: "center",
    marginBottom: 24,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    color: "#64748b",
    lineHeight: 22,
    marginBottom: 28,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 8,
  },
  required: {
    color: "#dc2626",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 14 : 12,
    fontSize: 15,
    color: "#0f172a",
    backgroundColor: "#f8fafc",
  },
  inputError: {
    borderColor: "#fca5a5",
  },
  errorText: {
    marginTop: 8,
    fontSize: 13,
    color: "#dc2626",
    lineHeight: 18,
  },
  sendButton: {
    backgroundColor: "#0f172a",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    minHeight: 54,
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.7,
  },
  sendButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  hint: {
    marginTop: 16,
    fontSize: 12,
    color: "#94a3b8",
    lineHeight: 17,
    textAlign: "center",
  },
});
