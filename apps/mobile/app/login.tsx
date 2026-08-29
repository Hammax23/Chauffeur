import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Image,
  Platform,
  Alert,
  ActivityIndicator,
  Pressable,
  KeyboardAvoidingView,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";
import { useDriverAuth } from "../contexts/DriverAuthContext";
import { getStoredCustomer } from "../services/api";
import { customerNeedsPhone } from "../utils/customer-phone";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import * as AppleAuthentication from "expo-apple-authentication";
import Constants from "expo-constants";

WebBrowser.maybeCompleteAuthSession();

type MainRole = "customer" | "driver";

async function routeAfterCustomerAuth() {
  const stored = await getStoredCustomer();
  if (customerNeedsPhone(stored?.phone)) {
    router.replace("/complete-phone");
    return;
  }
  router.replace("/customer");
}

/**
 * Consumer app login — Customer & Driver only.
 * Hotel Concierge uses the separate enterprise Partner Portal at /partner/login.
 */
export default function LoginScreen() {
  const { login, loginWithGoogle, loginWithApple } = useAuth();
  const { login: driverLogin } = useDriverAuth();
  const { width } = useWindowDimensions();
  const compact = width < 380;
  const [userType, setUserType] = useState<MainRole>("customer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    void AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  const extra = (Constants.expoConfig?.extra || {}) as Record<string, string>;
  const sanitizeGoogleClientId = (id: string | undefined) => {
    const t = id?.trim();
    if (!t || t.includes("REPLACE")) return undefined;
    return t;
  };
  const googleExpoClientId = sanitizeGoogleClientId(extra.GOOGLE_EXPO_CLIENT_ID);
  const googleIosClientId = sanitizeGoogleClientId(extra.GOOGLE_IOS_CLIENT_ID);
  const googleAndroidClientId = sanitizeGoogleClientId(extra.GOOGLE_ANDROID_CLIENT_ID);
  const googleWebClientId = sanitizeGoogleClientId(extra.GOOGLE_WEB_CLIENT_ID);

  const [googleRequest, , promptGoogle] = Google.useIdTokenAuthRequest({
    clientId: googleExpoClientId,
    iosClientId: googleIosClientId,
    androidClientId: googleAndroidClientId,
    webClientId: googleWebClientId,
  });

  async function handleGoogle() {
    try {
      // Google rejects Expo Go's exp:// redirect URI (Error 400: invalid_request).
      // Google Sign-In needs a development/production build with iOS/Android client IDs.
      if (Constants.appOwnership === "expo") {
        Alert.alert(
          "Google Sign-In unavailable in Expo Go",
          "Google does not allow Expo Go redirects (exp://…). Use email/password here, or test Google login in a development build with GOOGLE_IOS_CLIENT_ID / GOOGLE_ANDROID_CLIENT_ID / GOOGLE_WEB_CLIENT_ID set in app.json."
        );
        return;
      }
      if (!googleRequest) return;
      const anyId =
        googleExpoClientId ||
        googleIosClientId ||
        googleAndroidClientId ||
        googleWebClientId;
      if (!anyId) {
        Alert.alert(
          "Config Missing",
          "Google OAuth client IDs are not set. Add GOOGLE_IOS_CLIENT_ID, GOOGLE_ANDROID_CLIENT_ID, and GOOGLE_WEB_CLIENT_ID in app.json extra."
        );
        return;
      }
      const result = await promptGoogle();
      if (result.type !== "success") return;
      const idToken = result.params?.id_token;
      if (!idToken) {
        Alert.alert("Google Login Failed", "No id_token returned.");
        return;
      }
      setIsLoading(true);
      const r = await loginWithGoogle(idToken);
      if (r.success) {
        await routeAfterCustomerAuth();
      } else {
        Alert.alert("Google Login Failed", r.error || "Unable to login with Google");
      }
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Google login failed");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleApple() {
    try {
      if (Platform.OS !== "ios") {
        Alert.alert("Apple Sign In", "Apple sign-in is available on iOS devices only.");
        return;
      }
      setIsLoading(true);
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        Alert.alert("Apple Login Failed", "No identity token returned.");
        return;
      }
      const r = await loginWithApple({
        identityToken: credential.identityToken,
        fullName: credential.fullName
          ? {
              givenName: credential.fullName.givenName ?? null,
              familyName: credential.fullName.familyName ?? null,
            }
          : null,
      });
      if (r.success) {
        await routeAfterCustomerAuth();
      } else {
        const detail =
          __DEV__ && r.tokenAudience
            ? `\n\n(dev) token aud: ${String(r.tokenAudience)}`
            : "";
        Alert.alert(
          "Apple Login Failed",
          (r.error || "Unable to login with Apple") + detail
        );
      }
    } catch (e: unknown) {
      // User dismissed the Apple sheet — not an error
      const code =
        e && typeof e === "object" && "code" in e
          ? String((e as { code?: string }).code)
          : "";
      if (code === "ERR_REQUEST_CANCELED" || code === "ERR_CANCELED") return;
      const msg = e instanceof Error ? e.message : "Apple login failed";
      Alert.alert("Apple Login Failed", msg);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSignIn() {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter your email and password");
      return;
    }
    setIsLoading(true);
    try {
      if (userType === "driver") {
        const result = await driverLogin(email.trim(), password);
        if (result.success) {
          router.replace("/driver");
        } else {
          Alert.alert("Login Failed", result.error || "Invalid credentials");
        }
        return;
      }
      const result = await login(email.trim(), password);
      if (result.success) {
        await routeAfterCustomerAuth();
      } else {
        Alert.alert("Login Failed", result.error || "Invalid credentials");
      }
    } catch {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

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
          contentContainerStyle={[
            styles.contentContainer,
            compact && styles.contentContainerCompact,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces
        >
          <Text style={styles.title} maxFontSizeMultiplier={1.3}>
            Login
          </Text>
          <Text style={styles.subtitle} maxFontSizeMultiplier={1.3}>
            Log into your account.
          </Text>

          <View style={styles.segment}>
            <TouchableOpacity
              style={[styles.segmentBtn, userType === "customer" && styles.segmentBtnActive]}
              onPress={() => setUserType("customer")}
              accessibilityRole="button"
              accessibilityState={{ selected: userType === "customer" }}
            >
              <Text
                style={[styles.segmentText, userType === "customer" && styles.segmentTextActive]}
                maxFontSizeMultiplier={1.2}
              >
                Customer
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segmentBtn, userType === "driver" && styles.segmentBtnActive]}
              onPress={() => setUserType("driver")}
              accessibilityRole="button"
              accessibilityState={{ selected: userType === "driver" }}
            >
              <Text
                style={[styles.segmentText, userType === "driver" && styles.segmentTextActive]}
                maxFontSizeMultiplier={1.2}
              >
                Driver
              </Text>
            </TouchableOpacity>
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
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
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
                placeholder="Enter your password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
                textContentType="password"
                returnKeyType="done"
                onSubmitEditing={() => void handleSignIn()}
              />
              <TouchableOpacity
                style={styles.eyeButton}
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

          {userType === "customer" && (
            <TouchableOpacity
              style={styles.forgotContainer}
              onPress={() => router.push("/forgot-password")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
          )}

          {userType === "customer" && (
            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>Don&apos;t have an account? </Text>
              <TouchableOpacity onPress={() => router.push("/register")}>
                <Text style={styles.registerLink}>Register Here</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={[styles.signInButton, isLoading && styles.disabled]}
            disabled={isLoading}
            onPress={() => void handleSignIn()}
            activeOpacity={0.9}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.signInText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {userType === "customer" && (
            <>
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText} maxFontSizeMultiplier={1.2}>
                  Or sign in with
                </Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={[styles.socialButton, (!googleRequest || isLoading) && styles.disabled]}
                disabled={!googleRequest || isLoading}
                onPress={handleGoogle}
                activeOpacity={0.9}
              >
                <Image
                  source={{ uri: "https://www.google.com/favicon.ico" }}
                  style={styles.socialIcon}
                />
                <Text style={styles.socialText} numberOfLines={1}>
                  Continue with Google
                </Text>
              </TouchableOpacity>

              {Platform.OS === "ios" && appleAvailable && (
                <TouchableOpacity
                  style={[styles.socialButton, isLoading && styles.disabled]}
                  disabled={isLoading}
                  onPress={handleApple}
                  activeOpacity={0.9}
                >
                  <Ionicons name="logo-apple" size={20} color="#000" />
                  <Text style={styles.socialText} numberOfLines={1}>
                    Continue with Apple
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}

          <View style={styles.partnerFooter}>
            <View style={styles.partnerDivider} />
            <Pressable
              onPress={() => router.push("/partner/login")}
              style={({ pressed }) => [styles.partnerLink, pressed && { opacity: 0.7 }]}
              hitSlop={8}
            >
              <Text style={styles.partnerLinkText}>Hotel partner access</Text>
              <Ionicons name="open-outline" size={13} color="#94a3b8" />
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: "#fff" },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
  },
  contentContainerCompact: {
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#000",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
    marginBottom: 28,
  },
  segment: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 14,
    padding: 4,
    marginBottom: 28,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentBtnActive: { backgroundColor: "#1a1a1a" },
  segmentText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#64748b",
  },
  segmentTextActive: { color: "#fff" },
  inputGroup: { marginBottom: 20 },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000",
    marginBottom: 10,
  },
  required: { color: "#e53935" },
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
  eyeButton: {
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  forgotContainer: {
    alignItems: "flex-end",
    marginBottom: 16,
  },
  forgotText: {
    fontSize: 14,
    color: "#000",
    fontWeight: "500",
  },
  registerContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: 24,
  },
  registerText: { fontSize: 14, color: "#666" },
  registerLink: {
    fontSize: 14,
    color: "#000",
    fontWeight: "600",
  },
  signInButton: {
    backgroundColor: "#1a1a1a",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    minHeight: 52,
  },
  disabled: { opacity: 0.7 },
  signInText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#e0e0e0",
  },
  dividerText: {
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#666",
    flexShrink: 1,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 10,
    minHeight: 52,
  },
  socialIcon: { width: 20, height: 20, flexShrink: 0 },
  socialText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#000",
    flexShrink: 1,
  },
  partnerFooter: {
    marginTop: 36,
    alignItems: "center",
  },
  partnerDivider: {
    width: 48,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#e2e8f0",
    marginBottom: 16,
  },
  partnerLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
  },
  partnerLinkText: {
    fontSize: 13,
    color: "#94a3b8",
    fontWeight: "600",
  },
});
