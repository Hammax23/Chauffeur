import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  StatusBar,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Easing,
  Dimensions,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useConciergeAuth } from "../../contexts/ConciergeAuthContext";

const GOLD = "#C9A063";
const GOLD_SOFT = "#D4A04A";
const INK = "#08090B";
const { width: W } = Dimensions.get("window");

/**
 * Enterprise Hotel Partner Portal — Concierge staff only.
 * Accounts are provisioned by SARJ Admin (not self-serve).
 */
export default function PartnerLoginScreen() {
  const { login } = useConciergeAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(18)).current;
  const glow = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 620,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(rise, {
        toValue: 0,
        duration: 620,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 0.55,
          duration: 2800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0.3,
          duration: 2800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [fade, rise, glow]);

  const canSubmit = useMemo(
    () => email.trim().length > 3 && password.trim().length > 0 && !isLoading,
    [email, password, isLoading]
  );

  async function handleSignIn() {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Required", "Enter your staff email and password.");
      return;
    }
    setIsLoading(true);
    try {
      const result = await login(email.trim(), password);
      if (result.success) {
        router.replace("/concierge");
      } else {
        Alert.alert("Access denied", result.error || "Invalid staff credentials.");
      }
    } catch {
      Alert.alert("Error", "Unable to reach the partner portal. Try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={INK} />
      <LinearGradient
        colors={["#0B0C0E", "#12100C", "#0B0C0E"]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Ambient gold wash — atmospheric, not decorative clutter */}
      <Animated.View
        pointerEvents="none"
        style={[styles.glowOrb, { opacity: glow, transform: [{ scale: 1.05 }] }]}
      />
      <View pointerEvents="none" style={styles.vignette} />

      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Top bar */}
            <View style={styles.topBar}>
              <Image
                source={require("../../assets/logo.png")}
                style={styles.topLogo}
                resizeMode="contain"
                accessibilityLabel="SARJ"
              />
              <Pressable
                onPress={() => router.replace("/login")}
                style={({ pressed }) => [styles.exitBtn, pressed && { opacity: 0.65 }]}
                hitSlop={10}
              >
                <Text style={styles.exitBtnText}>Exit</Text>
              </Pressable>
            </View>

            <Animated.View
              style={{
                opacity: fade,
                transform: [{ translateY: rise }],
              }}
            >
              <Text style={styles.kicker}>HOTEL OPERATIONS</Text>
              <Text style={styles.headline}>Partner portal</Text>
              <Text style={styles.lede}>
                Concierge workspace for SARJ hotel partners. Access is granted by
                administrators only.
              </Text>

              {/* Auth panel */}
              <View style={styles.panelOuter}>
                {Platform.OS === "ios" ? (
                  <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFill} />
                ) : (
                  <View style={[StyleSheet.absoluteFill, styles.androidPanelBg]} />
                )}
                <View style={styles.panelBorder} />

                <View style={styles.panelInner}>
                  <Text style={styles.panelTitle}>Staff credentials</Text>

                  <Text style={styles.fieldLabel}>Email</Text>
                  <View
                    style={[
                      styles.fieldShell,
                      emailFocused && styles.fieldShellFocused,
                    ]}
                  >
                    <Ionicons
                      name="mail-outline"
                      size={18}
                      color={emailFocused ? GOLD : "rgba(255,255,255,0.35)"}
                      style={styles.fieldIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="name@hotel.com"
                      placeholderTextColor="rgba(255,255,255,0.28)"
                      value={email}
                      onChangeText={setEmail}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="email"
                      textContentType="emailAddress"
                      editable={!isLoading}
                      returnKeyType="next"
                    />
                  </View>

                  <Text style={[styles.fieldLabel, { marginTop: 18 }]}>Password</Text>
                  <View
                    style={[
                      styles.fieldShell,
                      passFocused && styles.fieldShellFocused,
                    ]}
                  >
                    <Ionicons
                      name="key-outline"
                      size={18}
                      color={passFocused ? GOLD : "rgba(255,255,255,0.35)"}
                      style={styles.fieldIcon}
                    />
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Enter password"
                      placeholderTextColor="rgba(255,255,255,0.28)"
                      value={password}
                      onChangeText={setPassword}
                      onFocus={() => setPassFocused(true)}
                      onBlur={() => setPassFocused(false)}
                      secureTextEntry={!showPassword}
                      autoComplete="password"
                      textContentType="password"
                      editable={!isLoading}
                      returnKeyType="go"
                      onSubmitEditing={() => {
                        if (canSubmit) void handleSignIn();
                      }}
                    />
                    <Pressable
                      onPress={() => setShowPassword((v) => !v)}
                      style={styles.eyeBtn}
                      hitSlop={10}
                    >
                      <Ionicons
                        name={showPassword ? "eye-outline" : "eye-off-outline"}
                        size={19}
                        color="rgba(255,255,255,0.4)"
                      />
                    </Pressable>
                  </View>

                  <Pressable
                    style={[styles.cta, !canSubmit && styles.ctaDisabled]}
                    disabled={!canSubmit}
                    onPress={() => void handleSignIn()}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#111" />
                    ) : (
                      <Text style={styles.ctaText}>Sign in</Text>
                    )}
                  </Pressable>
                </View>
              </View>

              {/* Trust strip — one purpose, quiet */}
              <View style={styles.trustRow}>
                <TrustItem icon="business-outline" label="Hotel scoped" />
                <View style={styles.trustSep} />
                <TrustItem icon="lock-closed-outline" label="Encrypted" />
                <View style={styles.trustSep} />
                <TrustItem icon="person-outline" label="Admin issued" />
              </View>

              <Text style={styles.support}>
                Request access through your property manager or SARJ operations.
              </Text>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function TrustItem({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View style={styles.trustItem}>
      <Ionicons name={icon} size={13} color="rgba(255,255,255,0.4)" />
      <Text style={styles.trustLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: INK },
  safe: { flex: 1 },
  glowOrb: {
    position: "absolute",
    top: -W * 0.15,
    alignSelf: "center",
    width: W * 0.9,
    height: W * 0.9,
    borderRadius: W * 0.45,
    backgroundColor: "rgba(201,160,99,0.14)",
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
    borderWidth: 0,
  },
  scroll: {
    paddingHorizontal: 22,
    paddingTop: 4,
    paddingBottom: 36,
    flexGrow: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 36,
    paddingVertical: 4,
  },
  topLogo: {
    width: 136,
    height: 46,
  },
  exitBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  exitBtnText: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  kicker: {
    color: GOLD,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2.2,
    marginBottom: 10,
  },
  headline: {
    color: "#FAFAF9",
    fontSize: 32,
    fontWeight: "600",
    letterSpacing: -0.6,
    marginBottom: 10,
  },
  lede: {
    color: "rgba(255,255,255,0.52)",
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 28,
    maxWidth: 340,
  },
  panelOuter: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 28,
  },
  androidPanelBg: {
    backgroundColor: "rgba(22,20,18,0.92)",
  },
  panelBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  panelInner: {
    padding: 22,
  },
  panelTitle: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 22,
  },
  fieldLabel: {
    color: "rgba(255,255,255,0.48)",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  fieldShell: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(0,0,0,0.28)",
    borderRadius: 12,
    minHeight: 52,
  },
  fieldShellFocused: {
    borderColor: "rgba(201,160,99,0.65)",
    backgroundColor: "rgba(201,160,99,0.06)",
  },
  fieldIcon: { marginLeft: 14 },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 16,
    color: "#fff",
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 16,
    color: "#fff",
  },
  eyeBtn: { paddingHorizontal: 14, paddingVertical: 12 },
  cta: {
    marginTop: 24,
    backgroundColor: GOLD_SOFT,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaDisabled: { opacity: 0.45 },
  ctaText: {
    color: "#111",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    gap: 4,
  },
  trustItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 4,
  },
  trustSep: {
    width: 1,
    height: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginHorizontal: 6,
  },
  trustLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    fontWeight: "600",
  },
  support: {
    textAlign: "center",
    color: "rgba(255,255,255,0.28)",
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 12,
  },
});
