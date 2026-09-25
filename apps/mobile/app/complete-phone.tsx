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
  sendCustomerPhoneOtp,
  verifyCustomerPhoneOtp,
} from "../services/api";
import { customerNeedsPhone } from "../utils/customer-phone";
import {
  authPhoneCountryMeta,
  digitsOnly,
  formatAuthPhoneDisplay,
  formatAuthPhoneE164,
  isAuthPhoneReady,
  normalizeAuthPhoneInput,
  validateAuthPhone,
} from "../utils/phone-us-ca";

type Step = "phone" | "otp";

const OTP_LENGTH = 4;
const RESEND_SECONDS = 30;

function phoneInputDisplay(stored: string): string {
  const meta = authPhoneCountryMeta(stored);
  if (meta.isIntlTest && stored.startsWith("+")) {
    return digitsOnly(stored).slice(meta.dial.replace("+", "").length);
  }
  return stored;
}

/**
 * Uber-style post-social onboarding: require a verified mobile before app use.
 * OTP via Twilio SMS (test allow-list may include non-+1 numbers).
 */
export default function CompletePhoneScreen() {
  const { user, isLoading: authLoading, refreshProfile, applyCustomerProfile, logout } = useAuth();
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
    const phoneError = validateAuthPhone(phoneNumber);
    if (phoneError) {
      Alert.alert("Invalid phone", phoneError);
      return;
    }
    const e164 = formatAuthPhoneE164(phoneNumber);
    if (!e164) {
      Alert.alert("Invalid phone", "Enter a valid phone number.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await sendCustomerPhoneOtp(e164);
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

      const e164 = formatAuthPhoneE164(phoneNumber);
      if (!e164) {
        setOtpError("Invalid phone number.");
        return;
      }

      setOtpError("");
      setIsLoading(true);
      try {
        const res = await verifyCustomerPhoneOtp(e164, value);
        if (!res.ok || !res.data.success || !res.data.customer) {
          setOtpError(res.data.error || "Invalid code. Please try again.");
          return;
        }
        await applyCustomerProfile(res.data.customer);
        void refreshProfile();
        router.replace("/customer");
      } catch (e) {
        setOtpError(e instanceof Error ? e.message : "Verification failed.");
      } finally {
        setIsLoading(false);
      }
    },
    [otp, phoneNumber, refreshProfile, applyCustomerProfile]
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
    const e164 = formatAuthPhoneE164(phoneNumber);
    if (!e164) {
      setOtpError("Invalid phone number.");
      return;
    }
    setIsLoading(true);
    setOtpError("");
    try {
      const res = await sendCustomerPhoneOtp(e164);
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

  const phoneMeta = authPhoneCountryMeta(phoneNumber);

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
              : `Enter the 4-digit code sent to ${formatAuthPhoneDisplay(phoneNumber)}`}
          </Text>

          {step === "phone" ? (
            <>
              <Text style={styles.label}>
                Phone Number<Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.phoneContainer}>
                <View style={styles.countryCode}>
                  <Text style={styles.flag}>{phoneMeta.flag}</Text>
                  <Text style={styles.countryCodeText}>{phoneMeta.dial}</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="Phone number"
                  placeholderTextColor="#999"
                  value={phoneInputDisplay(phoneNumber)}
                  onChangeText={(text) => {
                    const meta = authPhoneCountryMeta(phoneNumber);
                    const raw =
                      meta.isIntlTest && !text.trim().startsWith("+") && !text.startsWith("03")
                        ? `${meta.dial}${digitsOnly(text)}`
                        : text;
                    setPhoneNumber(normalizeAuthPhoneInput(raw));
                  }}
                  keyboardType="phone-pad"
                  maxLength={16}
                  editable={!isLoading}
                  returnKeyType="done"
                  onSubmitEditing={handleContinuePhone}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  (isLoading || !isAuthPhoneReady(phoneNumber)) && styles.primaryBtnDisabled,
                ]}
                disabled={isLoading || !isAuthPhoneReady(phoneNumber)}
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
    marginBottom: 12,
    backgroundColor: "#f3f3f3",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
    lineHeight: 22,
    marginBottom: 28,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  required: { color: "#c62828" },
  phoneContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 20,
  },
  countryCode: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "#f7f7f7",
    borderRightWidth: 1,
    borderRightColor: "#e0e0e0",
  },
  flag: { fontSize: 16 },
  countryCodeText: { fontSize: 15, fontWeight: "600", color: "#111" },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 12,
    fontSize: 16,
    color: "#111",
  },
  primaryBtn: {
    backgroundColor: "#111",
    borderRadius: 12,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
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
    color: "#111",
  },
  otpInputFilled: { borderColor: "#111" },
  otpInputError: { borderColor: "#c62828" },
  otpErrorText: { color: "#c62828", fontSize: 13, marginBottom: 12 },
  resendBtn: { alignItems: "center", marginTop: 16, padding: 8 },
  resendText: { fontSize: 14, color: "#111", fontWeight: "600" },
  resendTextDisabled: { color: "#999" },
  signOutBtn: { alignItems: "center", marginTop: 28, padding: 8 },
  signOutText: { fontSize: 14, color: "#888" },
});
