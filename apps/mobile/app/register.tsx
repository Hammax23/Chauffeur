import { useState } from "react";
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
import { validatePassword } from "../utils/password-policy";

export default function RegisterScreen() {
  const { register } = useAuth();
  const { width } = useWindowDimensions();
  const stackNames = width < 380;
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [city, setCity] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleRegister() {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phoneNumber.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }
    if (!agreeTerms) {
      Alert.alert("Error", "Please agree to the Terms of Service and Privacy Policy");
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
        phone: phoneNumber.trim(),
        password,
        city: city.trim() || undefined,
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
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={22} color="#1a1a1a" />
          </TouchableOpacity>

          <Text style={styles.title} maxFontSizeMultiplier={1.3}>
            Create Your Account!
          </Text>
          <Text style={styles.subtitle} maxFontSizeMultiplier={1.3}>
            Set up your account today!
          </Text>

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
              Phone Number<Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.phoneContainer}>
              <View style={styles.countryCode}>
                <Text style={styles.flag}>🇨🇦</Text>
                <Text style={styles.countryCodeText}>+1</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                placeholder="Phone number"
                placeholderTextColor="#999"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
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
    paddingHorizontal: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 24,
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    marginTop: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: "#1a1a1a",
    borderColor: "#1a1a1a",
  },
  checkboxText: {
    fontSize: 14,
    color: "#000",
    flex: 1,
    flexShrink: 1,
    lineHeight: 20,
  },
  link: {
    color: "#1a1a1a",
    fontWeight: "600",
  },
  registerButton: {
    backgroundColor: "#1a1a1a",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    marginBottom: 16,
    minHeight: 52,
    justifyContent: "center",
  },
  registerButtonDisabled: {
    opacity: 0.7,
  },
  registerButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  signInContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: 24,
  },
  signInText: {
    fontSize: 14,
    color: "#666",
  },
  signInLink: {
    fontSize: 14,
    color: "#000",
    fontWeight: "600",
  },
});
