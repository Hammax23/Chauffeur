import { useState } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";
import { useDriverAuth } from "../contexts/DriverAuthContext";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import * as AppleAuthentication from "expo-apple-authentication";
import Constants from "expo-constants";

WebBrowser.maybeCompleteAuthSession();

type UserType = "customer" | "driver";

export default function LoginScreen() {
  const { login, loginWithGoogle, loginWithApple } = useAuth();
  const { login: driverLogin } = useDriverAuth();
  const [userType, setUserType] = useState<UserType>("customer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const extra = (Constants.expoConfig?.extra || {}) as Record<string, string>;
  const googleExpoClientId = extra.GOOGLE_EXPO_CLIENT_ID;
  const googleIosClientId = extra.GOOGLE_IOS_CLIENT_ID;
  const googleAndroidClientId = extra.GOOGLE_ANDROID_CLIENT_ID;
  const googleWebClientId = extra.GOOGLE_WEB_CLIENT_ID;

  const [googleRequest, googleResponse, promptGoogle] = Google.useIdTokenAuthRequest({
    expoClientId: googleExpoClientId,
    iosClientId: googleIosClientId,
    androidClientId: googleAndroidClientId,
    webClientId: googleWebClientId,
  });

  async function handleGoogle() {
    try {
      if (!googleRequest) return;
      const anyId =
        googleExpoClientId ||
        googleIosClientId ||
        googleAndroidClientId ||
        googleWebClientId;
      if (!anyId || anyId === "REPLACE_ME") {
        Alert.alert(
          "Config Missing",
          "Google OAuth client IDs are not set. Add GOOGLE_EXPO_CLIENT_ID (for Expo Go) and platform client IDs in app.json extra."
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
        router.replace("/customer");
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
        router.replace("/customer");
      } else {
        const extra =
          r.tokenAudience || r.allowedAudiences
            ? `\n\nToken aud: ${JSON.stringify(r.tokenAudience ?? null)}\nAllowed: ${JSON.stringify(
                r.allowedAudiences ?? []
              )}`
            : "";
        Alert.alert("Apple Login Failed", (r.error || "Unable to login with Apple") + extra);
      }
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Apple login failed";
      Alert.alert("Apple Login Failed", msg);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>

      <Text style={styles.title}>Login</Text>
      <Text style={styles.subtitle}>Log into your account.</Text>

      {/* Customer/Driver Toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            userType === "customer" && styles.toggleButtonActive,
          ]}
          onPress={() => setUserType("customer")}
        >
          <Text
            style={[
              styles.toggleText,
              userType === "customer" && styles.toggleTextActive,
            ]}
          >
            Customer
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            userType === "driver" && styles.toggleButtonActive,
          ]}
          onPress={() => setUserType("driver")}
        >
          <Text
            style={[
              styles.toggleText,
              userType === "driver" && styles.toggleTextActive,
            ]}
          >
            Driver
          </Text>
        </TouchableOpacity>
      </View>

      {/* Email/Phone Input */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          Enter your Email/Phone No<Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your email/phone number here..."
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      {/* Password Input */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          Enter your Password<Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="********"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons
              name={showPassword ? "eye-outline" : "eye-off-outline"}
              size={22}
              color="#999"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Forgot Password */}
      <TouchableOpacity style={styles.forgotContainer} onPress={() => router.push("/forgot-password")}>
        <Text style={styles.forgotText}>Forgot Password?</Text>
      </TouchableOpacity>

      {/* Register Link - Only for Customer */}
      {userType === "customer" && (
        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push("/register")}>
            <Text style={styles.registerLink}>Register Here</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Sign In Button */}
      <TouchableOpacity 
        style={[styles.signInButton, isLoading && { opacity: 0.7 }]}
        disabled={isLoading}
        onPress={async () => {
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
            } else {
              const result = await login(email.trim(), password);
              if (result.success) {
                router.replace("/customer");
              } else {
                Alert.alert("Login Failed", result.error || "Invalid credentials");
              }
            }
          } catch {
            Alert.alert("Error", "Something went wrong. Please try again.");
          } finally {
            setIsLoading(false);
          }
        }}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.signInText}>Sign In</Text>
        )}
      </TouchableOpacity>

      {/* Social Login - Only for Customer */}
      {userType === "customer" && (
        <>
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Or sign in with</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.socialButton, (!googleRequest || isLoading) && { opacity: 0.7 }]}
            disabled={!googleRequest || isLoading}
            onPress={handleGoogle}
          >
            <Image
              source={{ uri: "https://www.google.com/favicon.ico" }}
              style={styles.socialIcon}
            />
            <Text style={styles.socialText}>Continue with Google</Text>
          </TouchableOpacity>

          {Platform.OS === "ios" && (
            <TouchableOpacity
              style={[styles.socialButton, isLoading && { opacity: 0.7 }]}
              disabled={isLoading}
              onPress={handleApple}
            >
              <Ionicons name="logo-apple" size={20} color="#000" />
              <Text style={styles.socialText}>Continue with Apple</Text>
            </TouchableOpacity>
          )}
        </>
      )}
      </ScrollView>
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
    paddingTop: 20,
    paddingBottom: 40,
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
  toggleContainer: {
    flexDirection: "row",
    marginBottom: 32,
    gap: 60,
  },
  toggleButton: {
    paddingVertical: 16,
    paddingHorizontal: 42,
    borderRadius: 30,
  },
  toggleButtonActive: {
    backgroundColor: "#1a1a1a",
  },
  toggleText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#666",
  },
  toggleTextActive: {
    color: "#fff",
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
    paddingVertical: 14,
    fontSize: 15,
    color: "#000",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#000",
  },
  eyeButton: {
    paddingHorizontal: 16,
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
    justifyContent: "center",
    marginBottom: 24,
  },
  registerText: {
    fontSize: 14,
    color: "#666",
  },
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
    marginBottom: 24,
  },
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
    height: 1,
    backgroundColor: "#e0e0e0",
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
    color: "#666",
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 30,
    paddingVertical: 14,
    marginBottom: 12,
    gap: 10,
  },
  socialIcon: {
    width: 20,
    height: 20,
  },
  socialText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#000",
  },
});
