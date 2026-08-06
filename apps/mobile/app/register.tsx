import { useEffect, useRef, useState, useCallback } from "react";
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
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";
import { checkPhoneAvailable, sendPhoneOtp, verifyPhoneOtp } from "../services/api";
import { validatePassword } from "../utils/password-policy";
import {
  formatUsCanadaE164,
  normalizeNanpNationalNumber,
  validateUsCanadaPhone,
} from "../utils/phone-us-ca";

type Step = "phone" | "otp" | "details";
type PhoneCheckStatus = "idle" | "checking" | "available" | "taken" | "invalid";

const OTP_LENGTH = 4;
const RESEND_SECONDS = 30;

function formatPhoneDisplay(national: string): string {
  if (national.length !== 10) return `+1 ${national}`;
  return `+1 (${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`;
}

export default function RegisterScreen() {
  const { register } = useAuth();
  const { width } = useWindowDimensions();
  const stackNames = width < 380;

  const [step, setStep] = useState<Step>("phone");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [city, setCity] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [phoneCheckStatus, setPhoneCheckStatus] = useState<PhoneCheckStatus>("idle");
  const [phoneCheckMessage, setPhoneCheckMessage] = useState("");
  const phoneCheckSeq = useRef(0);

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [otpError, setOtpError] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const [phoneVerificationToken, setPhoneVerificationToken] = useState("");
  const otpRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (phoneNumber.length < 10) {
      setPhoneCheckStatus("idle");
      setPhoneCheckMessage("");
      return;
    }

    const formatError = validateUsCanadaPhone(phoneNumber);
    if (formatError) {
      setPhoneCheckStatus("invalid");
      setPhoneCheckMessage(formatError);
      return;
    }

    const seq = ++phoneCheckSeq.current;
    setPhoneCheckStatus("checking");
    setPhoneCheckMessage("Checking phone number…");

    const timer = setTimeout(async () => {
      try {
        const res = await checkPhoneAvailable(phoneNumber);
        if (seq !== phoneCheckSeq.current) return;

        if (res.data.available) {
          setPhoneCheckStatus("available");
          setPhoneCheckMessage("Phone number is available");
          return;
        }

        setPhoneCheckStatus("taken");
        setPhoneCheckMessage(res.data.error || "This phone number is already registered.");
      } catch {
        if (seq !== phoneCheckSeq.current) return;
        setPhoneCheckStatus("idle");
        setPhoneCheckMessage("");
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [phoneNumber]);

  useEffect(() => {
    if (step !== "otp" || resendTimer <= 0) return;
    const interval = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  function handleBack() {
    if (step === "otp") {
      setStep("phone");
      setOtp(Array(OTP_LENGTH).fill(""));
      setOtpError("");
      return;
    }
    if (step === "details") {
      setStep("otp");
      return;
    }
    router.back();
  }

  async function handleContinuePhone() {
    const phoneError = validateUsCanadaPhone(phoneNumber);
    if (phoneError) {
      Alert.alert("Invalid phone", phoneError);
      return;
    }
    if (phoneCheckStatus === "taken") {
      Alert.alert("Phone in use", "This phone number is already registered. Please sign in.");
      return;
    }
    if (phoneCheckStatus === "checking") {
      Alert.alert("Please wait", "Still checking if this phone number is available.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await sendPhoneOtp(phoneNumber);
      if (!res.ok || !res.data.success) {
        Alert.alert("Error", res.data.error || "Unable to send verification code.");
        return;
      }
      setOtp(Array(OTP_LENGTH).fill(""));
      setOtpError("");
      setPhoneVerificationToken("");
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
        const res = await verifyPhoneOtp(phoneNumber, value);
        if (!res.ok || !res.data.success || !res.data.phoneVerificationToken) {
          setOtpError(res.data.error || "Invalid code. Please try again.");
          return;
        }
        setPhoneVerificationToken(res.data.phoneVerificationToken);
        setStep("details");
      } catch (e) {
        setOtpError(e instanceof Error ? e.message : "Verification failed.");
      } finally {
        setIsLoading(false);
      }
    },
    [otp, phoneNumber]
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
      const res = await sendPhoneOtp(phoneNumber);
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

  async function handleRegister() {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }
    if (!agreeTerms) {
      Alert.alert("Error", "Please agree to the Terms of Service and Privacy Policy");
      return;
    }
    if (!phoneVerificationToken) {
      Alert.alert("Verify phone", "Please verify your phone number first.");
      setStep("phone");
      return;
    }
    const normalizedPhone = formatUsCanadaE164(phoneNumber);
    if (!normalizedPhone) {
      Alert.alert("Invalid phone", "Enter a valid US or Canada (+1) phone number.");
      setStep("phone");
      return;
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      Alert.alert("Error", passwordError);
      return;
    }

    setIsLoading(true);
    try {
      const result = await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: normalizedPhone,
        password,
        city: city.trim() || undefined,
        phoneVerificationToken,
      });
      if (result.success) {
        router.replace("/customer");
      } else {
        Alert.alert("Registration Failed", result.error || "Something went wrong");
      }
    } catch {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  const title =
    step === "phone"
      ? "Enter your mobile number"
      : step === "otp"
        ? "Enter the code"
        : "Create your account";

  const subtitle =
    step === "phone"
      ? "We’ll text you a verification code."
      : step === "otp"
        ? `Enter the 4-digit code sent to ${formatPhoneDisplay(phoneNumber)}`
        : "Add your details to finish signing up.";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces
        >
          <TouchableOpacity
            style={styles.backBtn}
            onPress={handleBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={22} color="#1a1a1a" />
          </TouchableOpacity>

          <Text style={styles.title} maxFontSizeMultiplier={1.3}>
            {title}
          </Text>
          <Text style={styles.subtitle} maxFontSizeMultiplier={1.3}>
            {subtitle}
          </Text>

          {step === "phone" ? (
            <>
              <View style={styles.inputGroup}>
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
                    onChangeText={(text) => {
                      setPhoneNumber(normalizeNanpNationalNumber(text));
                      setPhoneVerificationToken("");
                    }}
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    textContentType="telephoneNumber"
                    maxLength={10}
                    editable={!isLoading}
                    returnKeyType="done"
                    onSubmitEditing={handleContinuePhone}
                  />
                </View>
                {phoneCheckMessage ? (
                  <View style={styles.phoneStatusRow}>
                    {phoneCheckStatus === "checking" ? (
                      <ActivityIndicator size="small" color="#888" />
                    ) : (
                      <Ionicons
                        name={
                          phoneCheckStatus === "available"
                            ? "checkmark-circle"
                            : phoneCheckStatus === "taken" || phoneCheckStatus === "invalid"
                              ? "close-circle"
                              : "information-circle-outline"
                        }
                        size={16}
                        color={
                          phoneCheckStatus === "available"
                            ? "#2e7d32"
                            : phoneCheckStatus === "taken" || phoneCheckStatus === "invalid"
                              ? "#c62828"
                              : "#888"
                        }
                      />
                    )}
                    <Text
                      style={[
                        styles.phoneStatusText,
                        phoneCheckStatus === "available" && styles.phoneStatusOk,
                        (phoneCheckStatus === "taken" || phoneCheckStatus === "invalid") &&
                          styles.phoneStatusError,
                      ]}
                    >
                      {phoneCheckMessage}
                    </Text>
                  </View>
                ) : null}
              </View>

              <TouchableOpacity
                style={[
                  styles.registerButton,
                  (isLoading ||
                    phoneNumber.length < 10 ||
                    phoneCheckStatus === "taken" ||
                    phoneCheckStatus === "checking") &&
                    styles.registerButtonDisabled,
                ]}
                disabled={
                  isLoading ||
                  phoneNumber.length < 10 ||
                  phoneCheckStatus === "taken" ||
                  phoneCheckStatus === "checking"
                }
                onPress={handleContinuePhone}
                activeOpacity={0.9}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.registerButtonText}>Continue</Text>
                )}
              </TouchableOpacity>
            </>
          ) : null}

          {step === "otp" ? (
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
                  styles.registerButton,
                  (isLoading || otp.join("").length !== OTP_LENGTH) && styles.registerButtonDisabled,
                ]}
                disabled={isLoading || otp.join("").length !== OTP_LENGTH}
                onPress={() => void handleVerifyOtp()}
                activeOpacity={0.9}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.registerButtonText}>Next</Text>
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

              <TouchableOpacity onPress={() => setStep("phone")} style={styles.changePhoneBtn}>
                <Text style={styles.changePhoneText}>Change phone number</Text>
              </TouchableOpacity>
            </>
          ) : null}

          {step === "details" ? (
            <>
              <View style={styles.verifiedPhoneBanner}>
                <Ionicons name="checkmark-circle" size={18} color="#2e7d32" />
                <Text style={styles.verifiedPhoneText}>
                  Verified {formatPhoneDisplay(phoneNumber)}
                </Text>
              </View>

              <View style={[styles.row, stackNames && styles.rowStacked]}>
                <View style={[styles.halfInput, stackNames && styles.fullInput]}>
                  <Text style={styles.label}>
                    First Name<Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder={stackNames ? "Enter your first name" : "First name"}
                    placeholderTextColor="#999"
                    value={firstName}
                    onChangeText={setFirstName}
                    autoComplete="given-name"
                    textContentType="givenName"
                    returnKeyType="next"
                  />
                </View>
                <View style={[styles.halfInput, stackNames && styles.fullInput]}>
                  <Text style={styles.label}>
                    Last Name<Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder={stackNames ? "Enter your last name" : "Last name"}
                    placeholderTextColor="#999"
                    value={lastName}
                    onChangeText={setLastName}
                    autoComplete="family-name"
                    textContentType="familyName"
                    returnKeyType="next"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Email<Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#999"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="next"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>City</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your city"
                  placeholderTextColor="#999"
                  value={city}
                  onChangeText={setCity}
                  autoComplete="postal-address"
                  textContentType="addressCity"
                  returnKeyType="next"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Password<Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Create a password"
                    placeholderTextColor="#999"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoComplete="new-password"
                    textContentType="newPassword"
                    returnKeyType="done"
                    onSubmitEditing={handleRegister}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                  >
                    <Ionicons
                      name={showPassword ? "eye-outline" : "eye-off-outline"}
                      size={22}
                      color="#999"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setAgreeTerms(!agreeTerms)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, agreeTerms && styles.checkboxChecked]}>
                  {agreeTerms && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
                <Text style={styles.checkboxText} maxFontSizeMultiplier={1.25}>
                  I agree to the <Text style={styles.link}>Terms of Service</Text> and{" "}
                  <Text style={styles.link}>Privacy Policy</Text>
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.registerButton, isLoading && styles.registerButtonDisabled]}
                disabled={isLoading}
                onPress={handleRegister}
                activeOpacity={0.9}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.registerButtonText}>Register</Text>
                )}
              </TouchableOpacity>
            </>
          ) : null}

          <View style={styles.signInContainer}>
            <Text style={styles.signInText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push("/login")}>
              <Text style={styles.signInLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
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
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  contentContainer: {
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
  row: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  rowStacked: {
    flexDirection: "column",
    gap: 20,
  },
  halfInput: {
    flex: 1,
    minWidth: 0,
  },
  fullInput: {
    flex: undefined,
    width: "100%",
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000",
    marginBottom: 10,
  },
  required: {
    color: "#e53935",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 14 : 12,
    fontSize: 15,
    color: "#000",
    minHeight: 48,
  },
  phoneContainer: {
    flexDirection: "row",
    alignItems: "stretch",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    minHeight: 48,
    overflow: "hidden",
  },
  countryCode: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderRightColor: "#e0e0e0",
    gap: 6,
    flexShrink: 0,
  },
  flag: {
    fontSize: 20,
  },
  countryCodeText: {
    fontSize: 15,
    color: "#000",
  },
  phoneInput: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 14 : 12,
    fontSize: 15,
    color: "#000",
  },
  phoneStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  phoneStatusText: {
    flex: 1,
    fontSize: 12,
    color: "#666",
  },
  phoneStatusOk: {
    color: "#2e7d32",
  },
  phoneStatusError: {
    color: "#c62828",
  },
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
    color: "#000",
    backgroundColor: "#fafafa",
  },
  otpInputFilled: {
    borderColor: "#C9A063",
    backgroundColor: "#fff",
  },
  otpInputError: {
    borderColor: "#ef4444",
  },
  otpErrorText: {
    color: "#c62828",
    fontSize: 13,
    marginBottom: 12,
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
  changePhoneBtn: {
    alignItems: "center",
    marginTop: 4,
    paddingVertical: 8,
  },
  changePhoneText: {
    fontSize: 14,
    color: "#666",
    textDecorationLine: "underline",
  },
  verifiedPhoneBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#e8f5e9",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 20,
  },
  verifiedPhoneText: {
    fontSize: 13,
    color: "#2e7d32",
    fontWeight: "600",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    minHeight: 48,
  },
  passwordInput: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 14 : 12,
    fontSize: 15,
    color: "#000",
  },
  eyeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 24,
    marginTop: 4,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#ccc",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: "#C9A063",
    borderColor: "#C9A063",
  },
  checkboxText: {
    flex: 1,
    fontSize: 13,
    color: "#666",
    lineHeight: 20,
  },
  link: {
    color: "#C9A063",
    fontWeight: "500",
  },
  registerButton: {
    backgroundColor: "#C9A063",
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  registerButtonDisabled: {
    opacity: 0.55,
  },
  registerButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  signInContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    flexWrap: "wrap",
  },
  signInText: {
    fontSize: 14,
    color: "#666",
  },
  signInLink: {
    fontSize: 14,
    color: "#C9A063",
    fontWeight: "600",
  },
});
