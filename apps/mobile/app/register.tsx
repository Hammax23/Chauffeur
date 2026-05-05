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
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";

export default function RegisterScreen() {
  const { register } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [city, setCity] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>

      {/* Title */}
      <Text style={styles.title}>Create Your Account!</Text>
      <Text style={styles.subtitle}>Set up your account today!</Text>

      {/* First Name & Last Name Row */}
      <View style={styles.row}>
        <View style={styles.halfInput}>
          <Text style={styles.label}>
            First Name<Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your first name"
            placeholderTextColor="#999"
            value={firstName}
            onChangeText={setFirstName}
          />
        </View>
        <View style={styles.halfInput}>
          <Text style={styles.label}>
            Last Name<Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your last name"
            placeholderTextColor="#999"
            value={lastName}
            onChangeText={setLastName}
          />
        </View>
      </View>

      {/* Phone Number */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          Phone Number<Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.phoneContainer}>
          <TouchableOpacity style={styles.countryCode}>
            <Text style={styles.flag}>🇨🇦</Text>
            <Ionicons name="chevron-down" size={16} color="#666" />
            <Text style={styles.countryCodeText}>+1</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.phoneInput}
            placeholder=""
            placeholderTextColor="#999"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
          />
        </View>
      </View>

      {/* Email */}
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
        />
      </View>

      {/* City */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>City</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your city"
          placeholderTextColor="#999"
          value={city}
          onChangeText={setCity}
        />
      </View>

      {/* Password */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          Password<Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.phoneContainer}>
          <TextInput
            style={[styles.input, { flex: 1, borderWidth: 0 }]}
            placeholder="Create a password"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity
            style={{ paddingHorizontal: 12, justifyContent: "center" }}
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

      {/* Terms Checkbox */}
      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={() => setAgreeTerms(!agreeTerms)}
      >
        <View style={[styles.checkbox, agreeTerms && styles.checkboxChecked]}>
          {agreeTerms && <Ionicons name="checkmark" size={14} color="#fff" />}
        </View>
        <Text style={styles.checkboxText}>
          I agree to the <Text style={styles.link}>Terms of Service</Text> and{" "}
          <Text style={styles.link}>Privacy Policy</Text>
        </Text>
      </TouchableOpacity>

      {/* Register Button */}
      <TouchableOpacity
        style={[styles.registerButton, isLoading && { opacity: 0.7 }]}
        disabled={isLoading}
        onPress={async () => {
          if (!firstName.trim() || !lastName.trim() || !email.trim() || !phoneNumber.trim() || !password.trim()) {
            Alert.alert("Error", "Please fill in all required fields");
            return;
          }
          if (!agreeTerms) {
            Alert.alert("Error", "Please agree to the Terms of Service and Privacy Policy");
            return;
          }
          if (password.length < 6) {
            Alert.alert("Error", "Password must be at least 6 characters");
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
        }}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.registerButtonText}>Register</Text>
        )}
      </TouchableOpacity>

      {/* Sign In Link */}
      <View style={styles.signInContainer}>
        <Text style={styles.signInText}>Already have an account? </Text>
        <TouchableOpacity onPress={() => router.push("/login")}>
          <Text style={styles.signInLink}>Sign In</Text>
        </TouchableOpacity>
      </View>

      {/* Divider */}
      <View style={styles.dividerContainer}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>Or sign up with</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Social Buttons */}
      <TouchableOpacity style={styles.socialButton}>
        <Image
          source={{ uri: "https://www.google.com/favicon.ico" }}
          style={styles.socialIcon}
        />
        <Text style={styles.socialText}>Continue with Google</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.socialButton}>
        <Ionicons name="logo-apple" size={20} color="#000" />
        <Text style={styles.socialText}>Continue with Apple</Text>
      </TouchableOpacity>
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
    gap: 16,
    marginBottom: 20,
  },
  halfInput: {
    flex: 1,
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
  phoneContainer: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
  },
  countryCode: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderRightColor: "#e0e0e0",
    gap: 6,
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#000",
  },
  selectContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  selectText: {
    fontSize: 15,
    color: "#000",
  },
  selectPlaceholder: {
    fontSize: 15,
    color: "#999",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#1a1a1a",
    borderColor: "#1a1a1a",
  },
  checkboxText: {
    fontSize: 14,
    color: "#000",
    flex: 1,
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
  },
  registerButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  signInContainer: {
    flexDirection: "row",
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
