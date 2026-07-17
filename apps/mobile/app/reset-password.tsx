import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { resetPassword } from "../services/api";

function qp(v: string | string[] | undefined): string {
  if (v == null) return "";
  return Array.isArray(v) ? String(v[0] ?? "") : String(v);
}

export default function ResetPasswordScreen() {
  const raw = useLocalSearchParams();
  const resetToken = qp(raw.resetToken);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!resetToken) {
      Alert.alert("Session expired", "Please verify your email again.", [
        { text: "OK", onPress: () => router.replace("/forgot-password") },
      ]);
    }
  }, [resetToken]);

  const handleSave = async () => {
    if (!resetToken) return;

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const { ok, data } = await resetPassword(resetToken, newPassword);
      if (!ok || !data.success) {
        setError(data.error || "Could not update password. Please try again.");
        return;
      }

      Alert.alert("Password updated", "You can now sign in with your new password.", [
        {
          text: "Sign in",
          onPress: () => router.replace("/login"),
        },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
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
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color="#0f172a" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Set new password</Text>
          <Text style={styles.subtitle}>
            Choose a strong password you have not used before. Minimum 8 characters.
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              New password<Text style={styles.required}> *</Text>
            </Text>
            <View style={[styles.passwordContainer, error ? styles.inputError : null]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="At least 8 characters"
                placeholderTextColor="#94a3b8"
                value={newPassword}
                onChangeText={(t) => {
                  setNewPassword(t);
                  if (error) setError("");
                }}
                secureTextEntry={!showNewPassword}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowNewPassword(!showNewPassword)}
                hitSlop={8}
              >
                <Ionicons
                  name={showNewPassword ? "eye-outline" : "eye-off-outline"}
                  size={22}
                  color="#94a3b8"
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Confirm password<Text style={styles.required}> *</Text>
            </Text>
            <View style={[styles.passwordContainer, error ? styles.inputError : null]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Re-enter password"
                placeholderTextColor="#94a3b8"
                value={confirmPassword}
                onChangeText={(t) => {
                  setConfirmPassword(t);
                  if (error) setError("");
                }}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                hitSlop={8}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                  size={22}
                  color="#94a3b8"
                />
              </TouchableOpacity>
            </View>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSave}
            activeOpacity={0.9}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save password</Text>
            )}
          </TouchableOpacity>
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
    flexGrow: 1,
    backgroundColor: "#fff",
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
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 18,
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
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    backgroundColor: "#f8fafc",
  },
  inputError: {
    borderColor: "#fca5a5",
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 14 : 12,
    fontSize: 15,
    color: "#0f172a",
  },
  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  errorText: {
    fontSize: 13,
    color: "#dc2626",
    marginBottom: 12,
    lineHeight: 18,
  },
  saveButton: {
    backgroundColor: "#0f172a",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 12,
    minHeight: 54,
    justifyContent: "center",
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
