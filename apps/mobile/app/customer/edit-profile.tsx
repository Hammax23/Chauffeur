import { useState } from "react";
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
import { API_BASE_URL, getCustomerToken } from "../../services/api";
import { SlimSpinner } from "../../components/SlimSpinner";
import { GOLD } from "../../theme/driver-theme";

export default function EditProfileScreen() {
  const { user, updateProfile } = useAuth();
  const { palette } = useCustomerTheme();
  const blurIntensity = Platform.OS === "ios" ? 48 : 28;
  const cardBlur = Platform.OS === "ios" ? 36 : 22;

  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phone || "");
  const [email] = useState(user?.email || "");
  const [city, setCity] = useState(user?.city || "");
  const [photoUrl, setPhotoUrl] = useState<string | null>(user?.photo || null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const initials = `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || "C";

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

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim() || !phoneNumber.trim()) {
      Alert.alert("Error", "Name and phone number are required");
      return;
    }
    setIsLoading(true);
    try {
      const result = await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phoneNumber.trim(),
        city: city.trim() || undefined,
        photo: photoUrl || undefined,
      });
      if (result.success) {
        Alert.alert("Success", "Profile updated successfully");
        router.back();
      } else {
        Alert.alert("Error", result.error || "Failed to update profile");
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
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              onPress={() => router.back()}
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
            {/* Photo */}
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

            {/* Form card */}
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

              <Text style={[styles.inputLabel, { color: palette.muted }]}>Phone Number</Text>
              <BlurView
                intensity={Platform.OS === "ios" ? 20 : 10}
                tint={palette.blurTint}
                style={[styles.phoneInput, fieldShell]}
              >
                <View style={[styles.countryCode, { borderRightColor: palette.border }]}>
                  <Text style={styles.flagText}>🇨🇦</Text>
                  <Ionicons name="chevron-down" size={14} color={palette.muted} />
                </View>
                <TextInput
                  style={[styles.phoneField, { color: palette.text }]}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  placeholderTextColor={palette.muted}
                  placeholder="Phone number"
                />
              </BlurView>

              <Text style={[styles.inputLabel, { color: palette.muted }]}>Email</Text>
              <BlurView
                intensity={Platform.OS === "ios" ? 20 : 10}
                tint={palette.blurTint}
                style={[
                  styles.inputBox,
                  fieldShell,
                  { opacity: 0.72 },
                ]}
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

          {/* Save */}
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
    gap: 4,
  },
  flagText: {
    fontSize: 16,
  },
  phoneField: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: "500",
  },
  lockedHint: {
    fontSize: 11,
    marginTop: 6,
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
