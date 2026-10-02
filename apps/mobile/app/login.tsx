import { useState, useEffect, useMemo } from "react";
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
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";
import { useDriverAuth } from "../contexts/DriverAuthContext";
import { getStoredCustomer } from "../services/api";
import { customerNeedsPhone } from "../utils/customer-phone";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { makeRedirectUri, ResponseType, exchangeCodeAsync } from "expo-auth-session";
import * as AppleAuthentication from "expo-apple-authentication";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { SlimSpinner } from "../components/SlimSpinner";
import {
  CustomerThemeProvider,
  useCustomerTheme,
} from "../contexts/CustomerThemeContext";
import { GOLD, type DriverPalette } from "../theme/driver-theme";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_DISCOVERY = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  revocationEndpoint: "https://oauth2.googleapis.com/revoke",
  userInfoEndpoint: "https://openidconnect.googleapis.com/v1/userinfo",
};

function googleReversedIosScheme(iosClientId: string | undefined): string | undefined {
  if (!iosClientId) return undefined;
  const id = iosClientId.replace(/\.apps\.googleusercontent\.com$/i, "");
  if (!id || id.includes("REPLACE")) return undefined;
  return `com.googleusercontent.apps.${id}`;
}

function extractGoogleIdToken(result: {
  params?: Record<string, string>;
  authentication?: { idToken?: string | null } | null;
}): string | null {
  const fromParams = result.params?.id_token?.trim();
  if (fromParams) return fromParams;
  const fromAuth = result.authentication?.idToken?.trim();
  if (fromAuth) return fromAuth;
  return null;
}

function isExpoGoRuntime(): boolean {
  if (Constants.appOwnership === "expo") return true;
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

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
function LoginScreenInner() {
  const { login, reactivate, loginWithGoogle, loginWithApple } = useAuth();
  const { login: driverLogin } = useDriverAuth();
  const { palette, isDark, hydrated } = useCustomerTheme();
  const styles = useMemo(() => makeStyles(palette, isDark), [palette, isDark]);
  const { width } = useWindowDimensions();
  const compact = width < 380;
  const [userType, setUserType] = useState<MainRole>("customer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  const accent = isDark ? GOLD : "#8B6914";
  const fieldBg = isDark ? palette.metaChipBg : "#fff";

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
  const googleIosScheme = googleReversedIosScheme(googleIosClientId);

  const googleRedirectUri = makeRedirectUri({
    native:
      Platform.OS === "ios" && googleIosScheme
        ? `${googleIosScheme}:/oauthredirect`
        : undefined,
  });

  const [googleRequest, , promptGoogle] = Google.useIdTokenAuthRequest(
    {
      clientId: googleExpoClientId || googleWebClientId,
      iosClientId: googleIosClientId,
      androidClientId: googleAndroidClientId,
      webClientId: googleWebClientId,
      redirectUri: googleRedirectUri,
      selectAccount: true,
      scopes: ["openid", "profile", "email"],
      responseType: Platform.OS === "web" ? ResponseType.IdToken : ResponseType.Code,
      shouldAutoExchangeCode: true,
    },
    Platform.OS === "ios" && googleIosScheme
      ? { scheme: googleIosScheme, path: "oauthredirect" }
      : undefined
  );

  async function resolveGoogleIdToken(
    result: Awaited<ReturnType<typeof promptGoogle>>
  ): Promise<string | null> {
    if (result.type !== "success") return null;

    const immediate = extractGoogleIdToken(result);
    if (immediate) return immediate;

    const code = result.params?.code;
    if (!code || !googleRequest) return null;

    const clientId =
      (Platform.OS === "ios" && googleIosClientId) ||
      (Platform.OS === "android" && googleAndroidClientId) ||
      googleWebClientId ||
      googleExpoClientId;
    if (!clientId) return null;

    try {
      const tokenResponse = await exchangeCodeAsync(
        {
          clientId,
          code,
          redirectUri: googleRedirectUri,
          extraParams: {
            code_verifier: googleRequest.codeVerifier || "",
          },
        },
        GOOGLE_DISCOVERY
      );
      return tokenResponse.idToken?.trim() || null;
    } catch (e) {
      console.warn("[Google] code exchange failed", e);
      return null;
    }
  }

  async function handleGoogle() {
    try {
      if (isExpoGoRuntime()) {
        Alert.alert(
          "Google Sign-In unavailable in Expo Go",
          "Google login needs a development build or TestFlight app (not Expo Go). Use email/password here, or open the SARJ build."
        );
        return;
      }

      if (Platform.OS === "ios" && !googleIosClientId) {
        Alert.alert(
          "Google Sign-In not configured",
          "iOS Google client ID is missing. Create an iOS OAuth client in Google Cloud Console for bundle com.sarjworldwide.chauffeur, then add GOOGLE_IOS_CLIENT_ID to the app build."
        );
        return;
      }

      if (!googleRequest) return;

      const anyId =
        googleIosClientId ||
        googleAndroidClientId ||
        googleWebClientId ||
        googleExpoClientId;
      if (!anyId) {
        Alert.alert(
          "Config Missing",
          "Google OAuth client IDs are not set. Add GOOGLE_IOS_CLIENT_ID (iOS) and GOOGLE_WEB_CLIENT_ID in app config."
        );
        return;
      }

      setIsLoading(true);
      const result = await promptGoogle();
      if (result.type !== "success") return;

      const idToken = await resolveGoogleIdToken(result);

      if (!idToken) {
        Alert.alert(
          "Google Login Failed",
          "Google did not return an ID token. Confirm the iOS OAuth client bundle ID is com.sarjworldwide.chauffeur and rebuild the app after Google config changes."
        );
        return;
      }

      const r = await loginWithGoogle(idToken);
      if (r.success) {
        await routeAfterCustomerAuth();
      } else {
        const hint =
          r.tokenAudience != null
            ? `\n\n(Token audience: ${Array.isArray(r.tokenAudience) ? r.tokenAudience.join(", ") : r.tokenAudience})`
            : "";
        Alert.alert(
          "Google Login Failed",
          `${r.error || "Unable to login with Google"}${__DEV__ ? hint : ""}`
        );
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
      const code =
        e && typeof e === "object" && "code" in e
          ? String((e as { code?: string }).code)
          : "";
      if (code === "ERR_REQUEST_CANCELED" || code === "ERR_CANCELED") return;
      const raw = e instanceof Error ? e.message : "Apple login failed";
      const lower = raw.toLowerCase();
      const msg =
        lower.includes("sign up not completed") ||
        lower.includes("authorizationerror") ||
        code === "ERR_REQUEST_UNKNOWN"
          ? "Apple Sign In could not start on this install. Delete the app, install the latest TestFlight build, and try again. If it still fails, Sign in with Apple may need to be re-enabled on the App ID in Apple Developer."
          : raw;
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
      } else if (result.code === "ACCOUNT_DEACTIVATED" && result.canReactivate) {
        Alert.alert(
          "Account deactivated",
          "Your account is deactivated. Reactivate now to sign in again? You have 30 days from deactivation to restore access.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Reactivate",
              onPress: async () => {
                setIsLoading(true);
                try {
                  const r = await reactivate(email.trim(), password);
                  if (r.success) {
                    await routeAfterCustomerAuth();
                  } else {
                    Alert.alert("Reactivation failed", r.error || "Please contact support.");
                  }
                } catch {
                  Alert.alert("Error", "Something went wrong. Please try again.");
                } finally {
                  setIsLoading(false);
                }
              },
            },
          ]
        );
      } else if (result.code === "ACCOUNT_DEACTIVATED") {
        Alert.alert(
          "Account deactivated",
          result.error ||
            "This account is deactivated. Email reserve@sarjworldwide.ca if you need help restoring access."
        );
      } else {
        Alert.alert("Login Failed", result.error || "Invalid credentials");
      }
    } catch {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  if (!hydrated) {
    return (
      <View style={[styles.root, { backgroundColor: palette.root }]}>
        <StatusBar barStyle={palette.statusBar} backgroundColor={palette.root} />
        <LinearGradient colors={[...palette.bg]} style={StyleSheet.absoluteFill} />
        <View style={styles.hydrateGate}>
          <SlimSpinner size={28} stroke={2} color={GOLD} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: palette.root }]}>
      <StatusBar barStyle={palette.statusBar} backgroundColor={palette.root} />
      <LinearGradient colors={[...palette.bg]} style={StyleSheet.absoluteFill} />
      <View style={styles.ambientGlow} pointerEvents="none">
        <LinearGradient
          colors={[...palette.glow]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.85, y: 0.55 }}
        />
      </View>

      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
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
              Welcome back
            </Text>
            <Text style={styles.subtitle} maxFontSizeMultiplier={1.3}>
              Sign in to book your chauffeur
            </Text>

            <View style={styles.segment}>
              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  userType === "customer" && styles.segmentBtnActive,
                ]}
                onPress={() => setUserType("customer")}
                accessibilityRole="button"
                accessibilityState={{ selected: userType === "customer" }}
              >
                <Text
                  style={[
                    styles.segmentText,
                    userType === "customer" && styles.segmentTextActive,
                  ]}
                  maxFontSizeMultiplier={1.2}
                >
                  Customer
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  userType === "driver" && styles.segmentBtnActive,
                ]}
                onPress={() => setUserType("driver")}
                accessibilityRole="button"
                accessibilityState={{ selected: userType === "driver" }}
              >
                <Text
                  style={[
                    styles.segmentText,
                    userType === "driver" && styles.segmentTextActive,
                  ]}
                  maxFontSizeMultiplier={1.15}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                >
                  Drive for us!
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Email<Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: fieldBg }]}
                placeholder="Enter your email"
                placeholderTextColor={palette.muted}
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
              <View style={[styles.passwordContainer, { backgroundColor: fieldBg }]}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter your password"
                  placeholderTextColor={palette.muted}
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
                    color={palette.muted}
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
                <Text style={[styles.forgotText, { color: accent }]}>Forgot Password?</Text>
              </TouchableOpacity>
            )}

            {userType === "customer" && (
              <View style={styles.registerContainer}>
                <Text style={styles.registerText}>Don&apos;t have an account? </Text>
                <TouchableOpacity onPress={() => router.push("/register")}>
                  <Text style={[styles.registerLink, { color: accent }]}>Register Here</Text>
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
                  style={[
                    styles.socialButton,
                    { backgroundColor: fieldBg },
                    (!googleRequest || isLoading) && styles.disabled,
                  ]}
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
                    style={[
                      styles.socialButton,
                      { backgroundColor: fieldBg },
                      isLoading && styles.disabled,
                    ]}
                    disabled={isLoading}
                    onPress={handleApple}
                    activeOpacity={0.9}
                  >
                    <Ionicons name="logo-apple" size={20} color={palette.text} />
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
                <Text style={styles.partnerLinkText}>SARJ Partners</Text>
                <Ionicons name="open-outline" size={13} color={palette.muted} />
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function makeStyles(palette: DriverPalette, isDark: boolean) {
  const segmentTrack = isDark ? palette.metaChipBg : "rgba(0,0,0,0.06)";
  const segmentActiveBg = isDark ? GOLD : "#0f172a";
  const segmentActiveText = isDark ? "#1A1208" : "#fff";

  return StyleSheet.create({
    root: { flex: 1 },
    ambientGlow: {
      position: "absolute",
      top: -60,
      left: -30,
      right: -30,
      height: 280,
    },
    safeArea: { flex: 1, backgroundColor: "transparent" },
    flex: { flex: 1 },
    hydrateGate: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    container: { flex: 1, backgroundColor: "transparent" },
    contentContainer: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 32,
    },
    contentContainerCompact: {
      paddingHorizontal: 18,
      paddingTop: 10,
    },
    title: {
      fontSize: 28,
      fontWeight: "800",
      color: palette.text,
      letterSpacing: -0.5,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 15,
      color: palette.muted,
      marginBottom: 26,
      lineHeight: 21,
    },
    segment: {
      flexDirection: "row",
      backgroundColor: segmentTrack,
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
    segmentBtnActive: { backgroundColor: segmentActiveBg },
    segmentText: {
      fontSize: 14,
      fontWeight: "600",
      color: palette.muted,
      textAlign: "center",
    },
    segmentTextActive: { color: segmentActiveText },
    inputGroup: { marginBottom: 18 },
    label: {
      fontSize: 13,
      fontWeight: "600",
      color: palette.text,
      marginBottom: 8,
    },
    required: { color: palette.danger },
    input: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: Platform.OS === "ios" ? 14 : 12,
      fontSize: 15,
      fontWeight: "500",
      color: palette.text,
      minHeight: 48,
    },
    passwordContainer: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 12,
      minHeight: 48,
    },
    passwordInput: {
      flex: 1,
      minWidth: 0,
      paddingHorizontal: 14,
      paddingVertical: Platform.OS === "ios" ? 14 : 12,
      fontSize: 15,
      fontWeight: "500",
      color: palette.text,
    },
    eyeButton: {
      paddingHorizontal: 14,
      justifyContent: "center",
      alignItems: "center",
    },
    forgotContainer: {
      alignItems: "flex-end",
      marginBottom: 14,
    },
    forgotText: {
      fontSize: 14,
      fontWeight: "600",
    },
    registerContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      marginBottom: 22,
    },
    registerText: { fontSize: 14, color: palette.muted },
    registerLink: {
      fontSize: 14,
      fontWeight: "700",
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
      marginBottom: 20,
    },
    dividerLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: palette.border,
    },
    dividerText: {
      paddingHorizontal: 12,
      fontSize: 13,
      color: palette.muted,
      flexShrink: 1,
    },
    socialButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 16,
      marginBottom: 12,
      gap: 10,
      minHeight: 52,
    },
    socialIcon: { width: 20, height: 20, flexShrink: 0 },
    socialText: {
      fontSize: 15,
      fontWeight: "600",
      color: palette.text,
      flexShrink: 1,
    },
    partnerFooter: {
      marginTop: 28,
      alignItems: "center",
    },
    partnerDivider: {
      width: 48,
      height: StyleSheet.hairlineWidth,
      backgroundColor: palette.border,
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
      color: palette.muted,
      fontWeight: "600",
    },
  });
}

export default function LoginScreen() {
  return (
    <CustomerThemeProvider>
      <LoginScreenInner />
    </CustomerThemeProvider>
  );
}
