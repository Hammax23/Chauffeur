import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Image,
  Platform,
  Alert,
  Pressable,
  StatusBar,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../contexts/AuthContext";
import { useCustomerTheme } from "../../contexts/CustomerThemeContext";
import {
  API_BASE_URL,
  getCustomerToken,
  sendCustomerPhoneOtp,
  verifyCustomerPhoneOtp,
} from "../../services/api";
import { SlimSpinner } from "../../components/SlimSpinner";
import { GOLD } from "../../theme/driver-theme";
import {
  authPhoneCountryMeta,
  digitsOnly,
  formatAuthPhoneDisplay,
  formatAuthPhoneE164,
  isAuthPhoneReady,
  normalizeAuthPhoneInput,
  normalizeE164,
  normalizeNanpNationalNumber,
  validateAuthPhone,
} from "../../utils/phone-us-ca";

const OTP_LENGTH = 4;
const RESEND_SECONDS = 30;

type PhoneStep = "idle" | "edit" | "otp";

/** Pretty NANP typing: (416) 555-0123 */
function formatNanpTyping(input: string): string {
  const d = normalizeNanpNationalNumber(input);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

function fieldDisplayValue(stored: string): string {
  const meta = authPhoneCountryMeta(stored);
  if (meta.isIntlTest) {
    if (stored.startsWith("+")) {
      return digitsOnly(stored).slice(meta.dial.replace("+", "").length);
    }
    return digitsOnly(stored).slice(0, 15);
  }
  return formatNanpTyping(stored);
}

export default function EditProfileScreen() {
  const { user, updateProfile, refreshProfile, applyCustomerProfile } = useAuth();
  const { palette } = useCustomerTheme();
  const blurIntensity = Platform.OS === "ios" ? 48 : 28;
  const cardBlur = Platform.OS === "ios" ? 36 : 22;

  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [email] = useState(user?.email || "");
  const [city, setCity] = useState(user?.city || "");
  const [photoUrl, setPhotoUrl] = useState<string | null>(user?.photo || null);
  const [verifiedPhone, setVerifiedPhone] = useState(user?.phone || "");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [phoneStep, setPhoneStep] = useState<PhoneStep>("idle");
  const [pendingPhone, setPendingPhone] = useState("");
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [otpError, setOtpError] = useState("");
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef<(TextInput | null)[]>([]);

  const initials = `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || "C";
  const phoneMeta = authPhoneCountryMeta(pendingPhone || verifiedPhone);
  const verifiedDisplay = verifiedPhone
    ? formatAuthPhoneDisplay(verifiedPhone) || verifiedPhone
    : "No number on file";
  const hasVerifiedPhone = !!(formatAuthPhoneE164(verifiedPhone) || normalizeE164(verifiedPhone));
  const pendingReady = isAuthPhoneReady(pendingPhone);
  const pendingDigits = phoneMeta.isIntlTest
    ? digitsOnly(pendingPhone).length
    : normalizeNanpNationalNumber(pendingPhone).length;
  const pendingDigitMax = phoneMeta.isIntlTest ? 15 : 10;
  const otpComplete = otp.join("").length === OTP_LENGTH;

  useEffect(() => {
    if (user?.phone) setVerifiedPhone(user.phone);
  }, [user?.phone]);

  useEffect(() => {
    if (phoneStep !== "otp" || resendTimer <= 0) return;
    const id = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [phoneStep, resendTimer]);

  const cancelPhoneChange = () => {
    setPhoneStep("idle");
    setPendingPhone("");
    setOtp(Array(OTP_LENGTH).fill(""));
    setOtpError("");
    setResendTimer(0);
  };

  const handleBack = () => {
    if (phoneStep !== "idle") {
      Alert.alert("Discard phone change?", "Your verification progress will be lost.", [
        { text: "Keep editing", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => {
            cancelPhoneChange();
            router.back();
          },
        },
      ]);
      return;
    }
    router.back();
  };

  const handlePickPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Please allow photo library access to upload a profile photo.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
        allowsEditing: true,
        aspect: [1, 1],
      });

      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      setUploadingPhoto(true);
      const formData = new FormData();
      formData.append("file", {
        uri: asset.uri,
        name: `customer_${Date.now()}.jpg`,
        type: asset.mimeType || "image/jpeg",
      } as any);
      formData.append("type", "customer");

      const authToken = await getCustomerToken();
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
        body: formData,
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        Alert.alert("Upload Failed", data?.error || "Failed to upload photo");
        return;
      }

      setPhotoUrl(data.url);
      Alert.alert("Uploaded", "Profile photo uploaded. Tap Save Changes to apply.");
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const startPhoneChange = () => {
    // Fresh entry — don't prefill old number (avoids "did I change it?" confusion).
    setPendingPhone("");
    setPhoneStep("edit");
    setOtpError("");
    setOtp(Array(OTP_LENGTH).fill(""));
    setResendTimer(0);
  };

  const sendOtpToPending = async () => {
    const phoneError = validateAuthPhone(pendingPhone);
    if (phoneError) {
      Alert.alert("Invalid phone", phoneError);
      return;
    }
    const e164 = formatAuthPhoneE164(pendingPhone);
    if (!e164) {
      Alert.alert("Invalid phone", "Enter a valid phone number.");
      return;
    }
    const current = formatAuthPhoneE164(verifiedPhone) || normalizeE164(verifiedPhone);
    if (current && current === e164) {
      Alert.alert("Same number", "This is already your verified phone number.");
      return;
    }

    setPhoneBusy(true);
    setOtpError("");
    try {
      const res = await sendCustomerPhoneOtp(e164);
      if (!res.ok || !res.data.success) {
        Alert.alert("Error", res.data.error || "Unable to send verification code.");
        return;
      }
      setOtp(Array(OTP_LENGTH).fill(""));
      setResendTimer(RESEND_SECONDS);
      setPhoneStep("otp");
      setTimeout(() => otpRefs.current[0]?.focus(), 200);
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Unable to send verification code.");
    } finally {
      setPhoneBusy(false);
    }
  };

  const handleVerifyOtp = useCallback(
    async (codeOverride?: string) => {
      const value = (codeOverride ?? otp.join("")).trim();
      if (value.length !== OTP_LENGTH) {
        setOtpError(`Enter the ${OTP_LENGTH}-digit code.`);
        return;
      }
      const e164 = formatAuthPhoneE164(pendingPhone);
      if (!e164) {
        setOtpError("Invalid phone number.");
        return;
      }

      setOtpError("");
      setPhoneBusy(true);
      try {
        const res = await verifyCustomerPhoneOtp(e164, value);
        if (!res.ok || !res.data.success || !res.data.customer) {
          setOtpError(res.data.error || "Invalid code. Please try again.");
          return;
        }
        await applyCustomerProfile(res.data.customer);
        // Refresh from server without wiping the just-verified phone if GET is slow.
        void refreshProfile();
        setVerifiedPhone(res.data.customer.phone || e164);
        cancelPhoneChange();
        Alert.alert("Verified", "Your phone number has been updated.");
      } catch (e) {
        setOtpError(e instanceof Error ? e.message : "Verification failed.");
      } finally {
        setPhoneBusy(false);
      }
    },
    [otp, pendingPhone, refreshProfile, applyCustomerProfile]
  );

  const handleOtpChange = (value: string, index: number) => {
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
      if (digits.length === OTP_LENGTH) void handleVerifyOtp(digits.join(""));
      return;
    }
    const digit = cleaned.slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    setOtpError("");
    if (digit && index < OTP_LENGTH - 1) otpRefs.current[index + 1]?.focus();
    if (digit && index === OTP_LENGTH - 1 && next.every((d) => d)) {
      void handleVerifyOtp(next.join(""));
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0 || phoneBusy) return;
    const e164 = formatAuthPhoneE164(pendingPhone);
    if (!e164) {
      setOtpError("Invalid phone number.");
      return;
    }
    setPhoneBusy(true);
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
      setPhoneBusy(false);
    }
  };

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert("Error", "First and last name are required");
      return;
    }
    if (phoneStep !== "idle") {
      Alert.alert(
        "Finish phone change",
        "Complete or cancel the phone verification before saving your profile."
      );
      return;
    }
    setIsLoading(true);
    try {
      // Never send phone on profile PATCH — OTP flow owns phone updates.
      const result = await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        city: city.trim() || undefined,
        photo: photoUrl || undefined,
      });
      if (result.success) {
        Alert.alert("Saved", "Your profile was updated.");
        router.back();
      } else {
        Alert.alert("Couldn't save", result.error || "Failed to update profile");
      }
    } catch {
      Alert.alert("Error", "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const fieldShell = {
    borderColor: palette.border,
    backgroundColor: Platform.OS === "android" ? palette.cardAndroid : "transparent",
  };

  return (
    <View style={[styles.root, { backgroundColor: palette.root }]}>
      <StatusBar barStyle={palette.statusBar} backgroundColor={palette.root} />
      <LinearGradient colors={[...palette.bg]} style={StyleSheet.absoluteFill} />
      <View style={styles.ambientGlow} pointerEvents="none">
        <LinearGradient
          colors={[...palette.glow]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.85, y: 0.5 }}
        />
      </View>

      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.header}>
            <Pressable
              onPress={handleBack}
              style={({ pressed }) => [styles.glassCircleWrap, pressed && styles.pressed]}
              accessibilityLabel="Go back"
            >
              <BlurView
                intensity={blurIntensity}
                tint={palette.blurTint}
                style={[styles.glassCircle, { borderColor: palette.glassBorder }]}
              >
                <Ionicons name="chevron-back" size={22} color={palette.icon} />
              </BlurView>
            </Pressable>
            <Text style={[styles.headerTitle, { color: palette.text }]}>Edit Profile</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.photoContainer}>
              <View style={styles.avatarRing}>
                {photoUrl ? (
                  <Image source={{ uri: photoUrl }} style={styles.profilePhoto} />
                ) : (
                  <LinearGradient colors={[GOLD, "#A87830"]} style={styles.profilePhoto}>
                    <Text style={styles.avatarText}>{initials}</Text>
                  </LinearGradient>
                )}
                <Pressable
                  style={({ pressed }) => [
                    styles.cameraBtn,
                    uploadingPhoto && { opacity: 0.7 },
                    pressed && styles.pressed,
                  ]}
                  onPress={handlePickPhoto}
                  disabled={uploadingPhoto}
                >
                  {uploadingPhoto ? (
                    <SlimSpinner size={14} stroke={2} color={GOLD} />
                  ) : (
                    <Ionicons name="camera" size={14} color="#1A1208" />
                  )}
                </Pressable>
              </View>
              <Text style={[styles.photoHint, { color: palette.muted }]}>Tap camera to change photo</Text>
            </View>

            <BlurView
              intensity={cardBlur}
              tint={palette.blurTint}
              style={[
                styles.formCard,
                {
                  borderColor: palette.border,
                  backgroundColor: Platform.OS === "android" ? palette.cardAndroid : "transparent",
                },
              ]}
            >
              <View style={styles.nameRow}>
                <View style={styles.nameField}>
                  <Text style={[styles.inputLabel, { color: palette.muted }]}>First Name</Text>
                  <BlurView
                    intensity={Platform.OS === "ios" ? 20 : 10}
                    tint={palette.blurTint}
                    style={[styles.inputBox, fieldShell]}
                  >
                    <TextInput
                      style={[styles.textInput, { color: palette.text }]}
                      value={firstName}
                      onChangeText={setFirstName}
                      placeholderTextColor={palette.muted}
                      placeholder="First name"
                    />
                  </BlurView>
                </View>
                <View style={styles.nameField}>
                  <Text style={[styles.inputLabel, { color: palette.muted }]}>Last Name</Text>
                  <BlurView
                    intensity={Platform.OS === "ios" ? 20 : 10}
                    tint={palette.blurTint}
                    style={[styles.inputBox, fieldShell]}
                  >
                    <TextInput
                      style={[styles.textInput, { color: palette.text }]}
                      value={lastName}
                      onChangeText={setLastName}
                      placeholderTextColor={palette.muted}
                      placeholder="Last name"
                    />
                  </BlurView>
                </View>
              </View>

              {/* Phone — verified lock + OTP change panel */}
              <Text style={[styles.inputLabel, { color: palette.muted }]}>Mobile number</Text>

              {phoneStep === "idle" ? (
                <BlurView
                  intensity={Platform.OS === "ios" ? 20 : 10}
                  tint={palette.blurTint}
                  style={[styles.phoneLockedRow, fieldShell]}
                >
                  <View style={styles.phoneLockedLeft}>
                    <View
                      style={[
                        styles.phoneShield,
                        {
                          backgroundColor: hasVerifiedPhone
                            ? "rgba(52,199,89,0.14)"
                            : "rgba(201,160,99,0.14)",
                        },
                      ]}
                    >
                      <Ionicons
                        name={hasVerifiedPhone ? "shield-checkmark" : "call-outline"}
                        size={18}
                        color={hasVerifiedPhone ? "#34C759" : GOLD}
                      />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.phoneLockedValue, { color: palette.text }]} numberOfLines={1}>
                        {verifiedDisplay}
                      </Text>
                      <Text style={[styles.verifiedBadge, { color: palette.muted }]}>
                        {hasVerifiedPhone
                          ? "Verified with SMS · change requires a new code"
                          : "Add a number — we'll verify it by SMS"}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={startPhoneChange}
                    style={({ pressed }) => [styles.changePhoneBtn, pressed && styles.pressed]}
                    accessibilityLabel={hasVerifiedPhone ? "Change phone number" : "Add phone number"}
                  >
                    <Text style={styles.changePhoneBtnText}>
                      {hasVerifiedPhone ? "Change" : "Add"}
                    </Text>
                  </Pressable>
                </BlurView>
              ) : null}

              {phoneStep !== "idle" ? (
                <View
                  style={[
                    styles.phonePanel,
                    {
                      borderColor: palette.border,
                      backgroundColor:
                        Platform.OS === "android" ? palette.cardAndroid : "rgba(255,255,255,0.03)",
                    },
                  ]}
                >
                  <View style={styles.stepRow}>
                    <View
                      style={[
                        styles.stepPill,
                        phoneStep === "edit" && styles.stepPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.stepPillText,
                          phoneStep === "edit" && styles.stepPillTextActive,
                        ]}
                      >
                        1 · Number
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color={palette.muted} />
                    <View
                      style={[
                        styles.stepPill,
                        phoneStep === "otp" && styles.stepPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.stepPillText,
                          phoneStep === "otp" && styles.stepPillTextActive,
                        ]}
                      >
                        2 · Verify
                      </Text>
                    </View>
                  </View>

                  {phoneStep === "edit" ? (
                    <>
                      <Text style={[styles.panelTitle, { color: palette.text }]}>
                        {hasVerifiedPhone ? "Enter your new number" : "Add your mobile number"}
                      </Text>
                      <Text style={[styles.panelSub, { color: palette.muted }]}>
                        Country code stays on the left. Type only the local digits.
                      </Text>

                      <View style={[styles.phoneInput, fieldShell, { marginTop: 12 }]}>
                        <View
                          style={[
                            styles.countryCode,
                            {
                              borderRightColor: palette.border,
                              backgroundColor: "rgba(201,160,99,0.1)",
                            },
                          ]}
                        >
                          <Text style={styles.flagText}>{phoneMeta.flag}</Text>
                          <Text style={[styles.dialText, { color: palette.text }]}>
                            {phoneMeta.dial}
                          </Text>
                        </View>
                        <TextInput
                          style={[styles.phoneField, { color: palette.text }]}
                          value={fieldDisplayValue(pendingPhone)}
                          onChangeText={(text) => {
                            const meta = authPhoneCountryMeta(pendingPhone || verifiedPhone);
                            const raw =
                              meta.isIntlTest &&
                              !text.trim().startsWith("+") &&
                              !text.startsWith("03")
                                ? `${meta.dial}${digitsOnly(text)}`
                                : text;
                            setPendingPhone(normalizeAuthPhoneInput(raw));
                          }}
                          keyboardType="phone-pad"
                          autoComplete="tel"
                          textContentType="telephoneNumber"
                          maxLength={phoneMeta.isIntlTest ? 18 : 14}
                          placeholderTextColor={palette.muted}
                          placeholder={phoneMeta.isIntlTest ? "Local number" : "(416) 555-0123"}
                          autoFocus
                          returnKeyType="done"
                          onSubmitEditing={() => {
                            if (pendingReady && !phoneBusy) void sendOtpToPending();
                          }}
                        />
                      </View>

                      <View style={styles.hintRow}>
                        <Text style={[styles.lockedHint, { color: palette.muted, flex: 1 }]}>
                          {phoneMeta.isIntlTest
                            ? `${phoneMeta.dial} selected — don't type the country code again.`
                            : "🇨🇦 +1 Canada / US selected — enter 10 digits only."}
                        </Text>
                        <Text style={[styles.digitCount, { color: pendingReady ? "#34C759" : palette.muted }]}>
                          {Math.min(pendingDigits, pendingDigitMax)}/{pendingDigitMax}
                        </Text>
                      </View>

                      <View style={styles.phoneActionRow}>
                        <Pressable
                          onPress={cancelPhoneChange}
                          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
                        >
                          <Text style={[styles.secondaryBtnText, { color: palette.text }]}>Cancel</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => void sendOtpToPending()}
                          disabled={phoneBusy || !pendingReady}
                          style={({ pressed }) => [
                            styles.primaryPhoneBtn,
                            (!pendingReady || phoneBusy || pressed) && styles.pressed,
                            !pendingReady && styles.primaryDisabled,
                          ]}
                        >
                          <LinearGradient
                            colors={
                              pendingReady
                                ? ["#E8C078", GOLD, "#B8862E"]
                                : ["#9CA3AF", "#9CA3AF"]
                            }
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.primaryPhoneGradient}
                          >
                            {phoneBusy ? (
                              <SlimSpinner size={16} stroke={2} color="#1A1208" />
                            ) : (
                              <Text style={styles.primaryPhoneText}>Send code</Text>
                            )}
                          </LinearGradient>
                        </Pressable>
                      </View>
                    </>
                  ) : null}

                  {phoneStep === "otp" ? (
                    <>
                      <Text style={[styles.panelTitle, { color: palette.text }]}>
                        Enter verification code
                      </Text>
                      <Text style={[styles.panelSub, { color: palette.muted }]}>
                        We sent a {OTP_LENGTH}-digit SMS to{" "}
                        <Text style={{ color: palette.text, fontWeight: "700" }}>
                          {formatAuthPhoneDisplay(pendingPhone) || pendingPhone}
                        </Text>
                      </Text>

                      <View style={[styles.otpRow, { marginTop: 14 }]}>
                        {otp.map((digit, index) => (
                          <TextInput
                            key={`otp-${index}`}
                            ref={(r) => {
                              otpRefs.current[index] = r;
                            }}
                            style={[
                              styles.otpBox,
                              {
                                color: palette.text,
                                borderColor: otpError
                                  ? "#FF453A"
                                  : digit
                                    ? GOLD
                                    : palette.border,
                                backgroundColor:
                                  Platform.OS === "android"
                                    ? palette.cardAndroid
                                    : "rgba(255,255,255,0.04)",
                              },
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
                            selectTextOnFocus
                            editable={!phoneBusy}
                          />
                        ))}
                      </View>
                      {otpError ? <Text style={styles.otpError}>{otpError}</Text> : null}

                      <View style={styles.phoneActionRow}>
                        <Pressable
                          onPress={() => {
                            setPhoneStep("edit");
                            setOtp(Array(OTP_LENGTH).fill(""));
                            setOtpError("");
                          }}
                          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
                        >
                          <Text style={[styles.secondaryBtnText, { color: palette.text }]}>
                            Edit number
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => void handleVerifyOtp()}
                          disabled={phoneBusy || !otpComplete}
                          style={({ pressed }) => [
                            styles.primaryPhoneBtn,
                            (!otpComplete || phoneBusy || pressed) && styles.pressed,
                            !otpComplete && styles.primaryDisabled,
                          ]}
                        >
                          <LinearGradient
                            colors={
                              otpComplete
                                ? ["#E8C078", GOLD, "#B8862E"]
                                : ["#9CA3AF", "#9CA3AF"]
                            }
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.primaryPhoneGradient}
                          >
                            {phoneBusy ? (
                              <SlimSpinner size={16} stroke={2} color="#1A1208" />
                            ) : (
                              <Text style={styles.primaryPhoneText}>Verify</Text>
                            )}
                          </LinearGradient>
                        </Pressable>
                      </View>

                      <Pressable
                        onPress={() => void handleResendOtp()}
                        disabled={resendTimer > 0 || phoneBusy}
                        style={{ marginTop: 14, alignSelf: "center" }}
                      >
                        <Text
                          style={{
                            color: resendTimer > 0 || phoneBusy ? palette.muted : GOLD,
                            fontSize: 13,
                            fontWeight: "700",
                          }}
                        >
                          {resendTimer > 0 ? `Resend code in ${resendTimer}s` : "Resend code"}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={cancelPhoneChange}
                        style={{ marginTop: 10, alignSelf: "center", paddingVertical: 4 }}
                      >
                        <Text style={{ color: palette.muted, fontSize: 12, fontWeight: "600" }}>
                          Cancel change
                        </Text>
                      </Pressable>
                    </>
                  ) : null}
                </View>
              ) : null}

              <Text style={[styles.inputLabel, { color: palette.muted }]}>Email</Text>
              <BlurView
                intensity={Platform.OS === "ios" ? 20 : 10}
                tint={palette.blurTint}
                style={[styles.inputBox, fieldShell, { opacity: 0.72 }]}
              >
                <TextInput
                  style={[styles.textInput, { color: palette.muted }]}
                  value={email}
                  editable={false}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </BlurView>
              <Text style={[styles.lockedHint, { color: palette.muted }]}>Email cannot be changed</Text>

              <Text style={[styles.inputLabel, { color: palette.muted }]}>City</Text>
              <BlurView
                intensity={Platform.OS === "ios" ? 20 : 10}
                tint={palette.blurTint}
                style={[styles.inputBox, fieldShell]}
              >
                <TextInput
                  style={[styles.textInput, { color: palette.text }]}
                  value={city}
                  onChangeText={setCity}
                  placeholder="Enter your city"
                  placeholderTextColor={palette.muted}
                />
              </BlurView>
            </BlurView>

            <View style={{ height: 120 }} />
          </ScrollView>

          <BlurView
            intensity={blurIntensity}
            tint={palette.blurTint}
            style={[styles.bottomBar, { borderTopColor: palette.border }]}
          >
            <Pressable
              style={({ pressed }) => [
                styles.saveBtn,
                (isLoading || pressed) && styles.pressed,
              ]}
              disabled={isLoading}
              onPress={handleSave}
            >
              <LinearGradient
                colors={["#E8C078", GOLD, "#B8862E"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.saveGradient}
              >
                {isLoading ? (
                  <SlimSpinner size={18} stroke={2} color="#1A1208" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                )}
              </LinearGradient>
            </Pressable>
          </BlurView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  ambientGlow: {
    position: "absolute",
    top: -40,
    left: -20,
    right: -20,
    height: 240,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
  },
  glassCircleWrap: {
    borderRadius: 22,
  },
  glassCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  headerSpacer: {
    width: 44,
    height: 44,
  },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 18,
  },
  photoContainer: {
    alignItems: "center",
    marginTop: 8,
    marginBottom: 22,
  },
  avatarRing: {
    width: 108,
    height: 108,
    borderRadius: 54,
    padding: 3,
    borderWidth: 2,
    borderColor: GOLD,
    position: "relative",
  },
  profilePhoto: {
    width: "100%",
    height: "100%",
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "800",
  },
  cameraBtn: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: GOLD,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#1A1208",
  },
  photoHint: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: "500",
  },
  formCard: {
    borderRadius: 22,
    overflow: "hidden",
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 18,
      },
      android: { elevation: 5 },
    }),
  },
  nameRow: {
    flexDirection: "row",
    gap: 12,
  },
  nameField: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
    marginBottom: 8,
    marginTop: 14,
  },
  inputBox: {
    borderRadius: 14,
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  textInput: {
    fontSize: 15,
    fontWeight: "500",
    paddingVertical: Platform.OS === "android" ? 10 : 0,
  },
  phoneLockedRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  phoneLockedLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  phoneShield: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  phoneLockedValue: {
    fontSize: 15,
    fontWeight: "700",
  },
  verifiedBadge: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  changePhoneBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(201,160,99,0.18)",
  },
  changePhoneBtnText: {
    color: GOLD,
    fontSize: 13,
    fontWeight: "800",
  },
  phonePanel: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginTop: 2,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  stepPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(148,163,184,0.12)",
  },
  stepPillActive: {
    backgroundColor: "rgba(201,160,99,0.22)",
  },
  stepPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
    letterSpacing: 0.2,
  },
  stepPillTextActive: {
    color: GOLD,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  panelSub: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
    fontWeight: "500",
  },
  phoneInput: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  countryCode: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRightWidth: StyleSheet.hairlineWidth,
    gap: 6,
    minWidth: 78,
  },
  flagText: {
    fontSize: 16,
  },
  dialText: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  phoneField: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 8,
  },
  digitCount: {
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
  phoneActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  secondaryBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(201,160,99,0.35)",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  primaryPhoneBtn: {
    flex: 1.2,
    borderRadius: 12,
    overflow: "hidden",
  },
  primaryDisabled: {
    opacity: 0.7,
  },
  primaryPhoneGradient: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  primaryPhoneText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1A1208",
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  otpBox: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "800",
  },
  otpError: {
    color: "#FF453A",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 8,
  },
  lockedHint: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "500",
  },
  bottomBar: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  saveBtn: {
    borderRadius: 16,
    overflow: "hidden",
  },
  saveGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1A1208",
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
});
