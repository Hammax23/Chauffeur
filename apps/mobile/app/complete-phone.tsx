import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";
import {
  getStoredCustomer,
  persistCustomerProfile,
  sendCustomerPhoneOtp,
  verifyCustomerPhoneOtp,
} from "../services/api";
import { customerNeedsPhone } from "../utils/customer-phone";
import {
  normalizeNanpNationalNumber,
  validateUsCanadaPhone,
} from "../utils/phone-us-ca";

type Step = "phone" | "otp";

const OTP_LENGTH = 4;
const RESEND_SECONDS = 30;

function formatPhoneDisplay(national: string): string {
  if (national.length !== 10) return `+1 ${national}`;
  return `+1 (${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`;
}

/**
 * Uber-style post-social onboarding: require a verified US/CA mobile before app use.
 * OTP is static "1234" until SMS is wired.
 */
export default function CompletePhoneScreen() {
  const { user, isLoading: authLoading, refreshProfile, logout } = useAuth();
  const [step, setStep] = useState<Step>("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [otpError, setOtpError] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (authLoading) return;
    void (async () => {
      const stored = user ?? (await getStoredCustomer());
      if (!stored) {
        router.replace("/login");
        return;
      }
      if (!customerNeedsPhone(stored.phone)) {
        router.replace("/customer");
      }
    })();
  }, [authLoading, user]);

  useEffect(() => {
    if (step !== "otp" || resendTimer <= 0) return;
    const interval = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  async function handleContinuePhone() {
    const phoneError = validateUsCanadaPhone(phoneNumber);
    if (phoneError) {
      Alert.alert("Invalid phone", phoneError);
      return;
    }

    setIsLoading(true);
    try {
      const res = await sendCustomerPhoneOtp(phoneNumber);
      if (!res.ok || !res.data.success) {
        Alert.alert("Error", res.data.error || "Unable to send verification code.");
        return;
      }
      setOtp(Array(OTP_LENGTH).fill(""));
      setOtpError("");
      setResendTimer(RESEND_SECONDS);
      setStep("otp");
      setTimeout(() => otpRefs.current[0]?.focus(), 200);
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Unable to send verification code.");
    } finally {
      setIsLoading(false);
    }
  }

  const handleVerifyOtp = useCallback(
    async (codeOverride?: string) => {
      const value = (codeOverride ?? otp.join("")).trim();
      if (value.length !== OTP_LENGTH) {
        setOtpError(`Enter the ${OTP_LENGTH}-digit code.`);
        return;
      }

      setOtpError("");
      setIsLoading(true);
      try {
        const res = await verifyCustomerPhoneOtp(phoneNumber, value);
        if (!res.ok || !res.data.success || !res.data.customer) {
          setOtpError(res.data.error || "Invalid code. Please try again.");
          return;
        }
        await persistCustomerProfile(res.data.customer);
        await refreshProfile();
        router.replace("/customer");
      } catch (e) {
        setOtpError(e instanceof Error ? e.message : "Verification failed.");
      } finally {
        setIsLoading(false);
      }
    },
    [otp, phoneNumber, refreshProfile]
  );

  function handleOtpChange(value: string, index: number) {
    const cleaned = value.replace(/\D/g, "");

    if (cleaned.length > 1) {
      const digits = cleaned.slice(0, OTP_LENGTH).split("");
      const next = Array(OTP_LENGTH).fill("");
      digits.forEach((d, i) => {
        next[i] = d;
      });
      setOtp(next);
      setOtpError("");
      const last = Math.min(digits.length, OTP_LENGTH) - 1;
      if (last >= 0) otpRefs.current[last]?.focus();
      if (digits.length === OTP_LENGTH) {
        void handleVerifyOtp(digits.join(""));
      }
      return;
    }

    const digit = cleaned.slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    setOtpError("");

    if (digit && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
    if (digit && index === OTP_LENGTH - 1 && next.every((d) => d)) {
      void handleVerifyOtp(next.join(""));
    }
  }

  async function handleResendOtp() {
    if (resendTimer > 0 || isLoading) return;
    setIsLoading(true);
    setOtpError("");
    try {
      const res = await sendCustomerPhoneOtp(phoneNumber);
      if (!res.ok || !res.data.success) {
        setOtpError(res.data.error || "Unable to resend code.");
        return;
      }
      setOtp(Array(OTP_LENGTH).fill(""));
      setResendTimer(RESEND_SECONDS);
      otpRefs.current[0]?.focus();
    } catch (e) {
      setOtpError(e instanceof Error ? e.message : "Unable to resend code.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSignOut() {
    await logout();
    router.replace("/login");
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              if (step === "otp") {
                setStep("phone");
                setOtp(Array(OTP_LENGTH).fill(""));
                setOtpError("");
                return;
              }
              void handleSignOut();
            }}
            hitSlop={10}
          >
            <Ionicons name="chevron-back" size={22} color="#1a1a1a" />
          </TouchableOpacity>

          <Text style={styles.title}>
            {step === "phone" ? "Add your mobile number" : "Enter the code"}
          </Text>
          <Text style={styles.subtitle}>
            {step === "phone"
              ? "Confirm a phone number so we can reach you about your rides."
              : `Enter the 4-digit code sent to ${formatPhoneDisplay(phoneNumber)}`}
          </Text>

          {step === "phone" ? (
            <>
              <Text style={styles.label}>
                Phone Number<Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.phoneContainer}>
                <View style={styles.countryCode}>
                  <Text style={styles.flag}>🇨🇦</Text>
                  <Text style={styles.countryCodeText}>+1</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="10-digit number"
                  placeholderTextColor="#999"
                  value={phoneNumber}
                  onChangeText={(t) => setPhoneNumber(normalizeNanpNationalNumber(t))}
                  keyboardType="phone-pad"
                  maxLength={10}
                  editable={!isLoading}
                  returnKeyType="done"
                  onSubmitEditing={handleContinuePhone}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  (isLoading || phoneNumber.length < 10) && styles.primaryBtnDisabled,
                ]}
                disabled={isLoading || phoneNumber.length < 10}
                onPress={handleContinuePhone}
                activeOpacity={0.9}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Continue</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.otpContainer}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => {
                      otpRefs.current[index] = ref;
                    }}
                    style={[
                      styles.otpInput,
                      digit ? styles.otpInputFilled : null,
                      otpError ? styles.otpInputError : null,
                    ]}
                    value={digit}
                    onChangeText={(v) => handleOtpChange(v, index)}
                    onKeyPress={({ nativeEvent }) => {
                      if (nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
                        otpRefs.current[index - 1]?.focus();
                      }
                    }}
                    keyboardType="number-pad"
                    maxLength={index === 0 ? OTP_LENGTH : 1}
                    textContentType="oneTimeCode"
                    autoComplete={index === 0 ? "sms-otp" : "off"}
                    editable={!isLoading}
                    selectTextOnFocus
                  />
                ))}
              </View>
              {otpError ? <Text style={styles.otpErrorText}>{otpError}</Text> : null}

              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  (isLoading || otp.join("").length !== OTP_LENGTH) && styles.primaryBtnDisabled,
                ]}
                disabled={isLoading || otp.join("").length !== OTP_LENGTH}
                onPress={() => void handleVerifyOtp()}
                activeOpacity={0.9}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Verify & continue</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resendBtn}
                onPress={handleResendOtp}
                disabled={resendTimer > 0 || isLoading}
              >
                <Text
                  style={[
                    styles.resendText,
                    (resendTimer > 0 || isLoading) && styles.resendTextDisabled,
                  ]}
                >
                  {resendTimer > 0 ? `Resend code in ${resendTimer}s` : "Resend code"}
                </Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 32,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -8,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
    marginBottom: 28,
    lineHeight: 22,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000",
    marginBottom: 10,
  },
  required: { color: "#e53935" },
  phoneContainer: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    minHeight: 48,
    overflow: "hidden",
    marginBottom: 24,
  },
  countryCode: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderRightColor: "#e0e0e0",
    gap: 6,
  },
  flag: { fontSize: 20 },
  countryCodeText: { fontSize: 15, color: "#000" },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#000",
  },
  otpContainer: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  otpInput: {
    flex: 1,
    height: 56,
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
    color: "#000",
    backgroundColor: "#fafafa",
  },
  otpInputFilled: {
    borderColor: "#C9A063",
    backgroundColor: "#fff",
  },
  otpInputError: { borderColor: "#ef4444" },
  otpErrorText: {
    color: "#c62828",
    fontSize: 13,
    marginBottom: 12,
  },
  primaryBtn: {
    backgroundColor: "#C9A063",
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    minHeight: 52,
    justifyContent: "center",
  },
  primaryBtnDisabled: { opacity: 0.55 },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  resendBtn: {
    alignItems: "center",
    marginTop: 16,
    paddingVertical: 8,
  },
  resendText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#C9A063",
  },
  resendTextDisabled: {
    color: "#999",
    fontWeight: "500",
  },
  signOutBtn: {
    alignItems: "center",
    marginTop: 28,
    paddingVertical: 10,
  },
  signOutText: {
    fontSize: 14,
    color: "#666",
    textDecorationLine: "underline",
  },
});
