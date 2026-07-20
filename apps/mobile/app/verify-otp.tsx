import { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { forgotPassword, verifyResetOtp } from "../services/api";
import {
  loadPasswordResetOtpSession,
  updatePasswordResetOtpSessionId,
  savePasswordResetToken,
} from "../services/auth-session";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

export default function VerifyOTPScreen() {
  const [sessionId, setSessionId] = useState("");
  const [email, setEmail] = useState("");
  const [emailMasked, setEmailMasked] = useState("");
  const [sessionReady, setSessionReady] = useState(false);

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [timer, setTimer] = useState(RESEND_SECONDS);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    void (async () => {
      const session = await loadPasswordResetOtpSession();
      if (!session?.sessionId) {
        Alert.alert("Session expired", "Please request a new verification code.", [
          { text: "OK", onPress: () => router.replace("/forgot-password") },
        ]);
        return;
      }
      setSessionId(session.sessionId);
      setEmail(session.email);
      setEmailMasked(session.emailMasked || session.email);
      setSessionReady(true);
    })();
  }, []);

  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const code = otp.join("");

  const handleVerify = useCallback(async (codeOverride?: string) => {
    const value = (codeOverride ?? code).trim();
    if (value.length !== OTP_LENGTH) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    if (!sessionId) return;

    setError("");
    setLoading(true);
    try {
      const { ok, data } = await verifyResetOtp(sessionId, value);
      if (!ok || !data.success || !data.resetToken) {
        setError(data.error || "Invalid code. Please try again.");
        return;
      }

      await savePasswordResetToken(data.resetToken);
      router.push("/reset-password");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [code, sessionId]);

  const handleOtpChange = (value: string, index: number) => {
    const cleaned = value.replace(/\D/g, "");

    if (cleaned.length > 1) {
      const digits = cleaned.slice(0, OTP_LENGTH).split("");
      const next = Array(OTP_LENGTH).fill("");
      digits.forEach((d, i) => {
        next[i] = d;
      });
      setOtp(next);
      setError("");
      const last = Math.min(digits.length, OTP_LENGTH) - 1;
      if (last >= 0) inputRefs.current[last]?.focus();
      if (digits.length === OTP_LENGTH) {
        void handleVerify(digits.join(""));
      }
      return;
    }

    const digit = cleaned.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setError("");

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (digit && index === OTP_LENGTH - 1 && newOtp.every((d) => d)) {
      void handleVerify(newOtp.join(""));
    }
  };

  const handleKeyPress = (e: { nativeEvent: { key: string } }, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    if (timer > 0 || !email || resending) return;
    setResending(true);
    setError("");
    try {
      const { ok, data } = await forgotPassword(email);
      if (!ok || !data.success || !data.sessionId) {
        setError(data.error || "Could not resend code. Please try again.");
        return;
      }
      await updatePasswordResetOtpSessionId(data.sessionId);
      setSessionId(data.sessionId);
      setOtp(Array(OTP_LENGTH).fill(""));
      setTimer(RESEND_SECONDS);
      inputRefs.current[0]?.focus();
      Alert.alert("Code sent", "A new verification code has been sent to your email.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not resend code.");
    } finally {
      setResending(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (!sessionReady) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
          <ActivityIndicator size="large" color="#0f172a" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={20} color="#0f172a" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Verify your email</Text>
        <Text style={styles.subtitle}>
          We sent a 6-digit code to{" "}
          <Text style={styles.emailHighlight}>{emailMasked || "your email"}</Text>. Enter it
          below to continue.
        </Text>

        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                inputRefs.current[index] = ref;
              }}
              style={[styles.otpInput, digit ? styles.otpInputFilled : null, error ? styles.otpInputError : null]}
              value={digit}
              onChangeText={(value) => handleOtpChange(value, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={index === 0 ? OTP_LENGTH : 1}
              selectTextOnFocus
              editable={!loading}
              textContentType={index === 0 ? "oneTimeCode" : "none"}
              autoComplete={index === 0 ? "sms-otp" : "off"}
            />
          ))}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.timerContainer}>
          <Text style={styles.timerLabel}>
            {timer > 0 ? "Code expires in " : "Code expired · "}
          </Text>
          {timer > 0 ? (
            <Text style={styles.timerValue}>{formatTime(timer)}</Text>
          ) : (
            <Text style={styles.timerExpired}>Resend available</Text>
          )}
        </View>

        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>Didn&apos;t receive a code? </Text>
          <TouchableOpacity onPress={handleResend} disabled={timer > 0 || resending}>
            {resending ? (
              <ActivityIndicator size="small" color="#0f172a" />
            ) : (
              <Text style={[styles.resendLink, (timer > 0 || resending) && styles.resendDisabled]}>
                Resend
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.continueButton, (loading || code.length !== OTP_LENGTH) && styles.continueDisabled]}
          onPress={() => handleVerify()}
          activeOpacity={0.9}
          disabled={loading || code.length !== OTP_LENGTH}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.continueButtonText}>Continue</Text>
          )}
        </TouchableOpacity>
      </View>
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
    paddingHorizontal: 24,
    paddingTop: 10,
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
  emailHighlight: {
    color: "#0f172a",
    fontWeight: "600",
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 16,
  },
  otpInput: {
    flex: 1,
    maxWidth: 52,
    height: 56,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    color: "#0f172a",
    backgroundColor: "#f8fafc",
  },
  otpInputFilled: {
    borderColor: "#0f172a",
    backgroundColor: "#fff",
  },
  otpInputError: {
    borderColor: "#fca5a5",
  },
  errorText: {
    fontSize: 13,
    color: "#dc2626",
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 18,
  },
  timerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 12,
  },
  timerLabel: {
    fontSize: 13,
    color: "#64748b",
  },
  timerValue: {
    fontSize: 13,
    color: "#0f172a",
    fontWeight: "600",
  },
  timerExpired: {
    fontSize: 13,
    color: "#dc2626",
    fontWeight: "600",
  },
  resendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
    minHeight: 24,
  },
  resendText: {
    fontSize: 14,
    color: "#64748b",
  },
  resendLink: {
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "700",
  },
  resendDisabled: {
    color: "#94a3b8",
  },
  continueButton: {
    backgroundColor: "#0f172a",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    minHeight: 54,
    justifyContent: "center",
  },
  continueDisabled: {
    opacity: 0.55,
  },
  continueButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
