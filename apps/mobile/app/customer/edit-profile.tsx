import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Image,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import * as ImagePicker from "expo-image-picker";
import { API_BASE_URL } from "../../services/api";

export default function EditProfileScreen() {
  const { user, updateProfile } = useAuth();
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

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
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

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color="#1a1a1a" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Profile Photo */}
        <View style={styles.photoContainer}>
          <View style={styles.photoWrapper}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.profilePhoto} />
            ) : (
              <View style={[styles.profilePhoto, styles.avatarFallback]}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.cameraBtn, uploadingPhoto && { opacity: 0.7 }]}
              onPress={handlePickPhoto}
              disabled={uploadingPhoto}
            >
              {uploadingPhoto ? (
                <ActivityIndicator size="small" color="#D4A04A" />
              ) : (
                <Ionicons name="camera" size={14} color="#D4A04A" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Name Row */}
        <View style={styles.nameRow}>
          <View style={styles.nameField}>
            <Text style={styles.inputLabel}>First Name</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textInput}
                value={firstName}
                onChangeText={setFirstName}
              />
            </View>
          </View>
          <View style={styles.nameField}>
            <Text style={styles.inputLabel}>Last Name</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textInput}
                value={lastName}
                onChangeText={setLastName}
              />
            </View>
          </View>
        </View>

        {/* Phone Number */}
        <Text style={styles.inputLabel}>Phone Number</Text>
        <View style={styles.phoneInput}>
          <TouchableOpacity style={styles.countryCode}>
            <View style={styles.flagIcon}>
              <Text>🇨🇦</Text>
            </View>
            <Ionicons name="chevron-down" size={14} color="#999" />
          </TouchableOpacity>
          <TextInput
            style={styles.phoneField}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
          />
        </View>

        {/* Email */}
        <Text style={styles.inputLabel}>Email</Text>
        <View style={[styles.inputBox, { backgroundColor: '#f0f0f0' }]}>
          <TextInput
            style={[styles.textInput, { color: '#999' }]}
            value={email}
            editable={false}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* City */}
        <Text style={styles.inputLabel}>City</Text>
        <View style={styles.inputBox}>
          <TextInput
            style={styles.textInput}
            value={city}
            onChangeText={setCity}
            placeholder="Enter your city"
            placeholderTextColor="#999"
          />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={[styles.saveBtn, isLoading && { opacity: 0.7 }]} 
          activeOpacity={0.9}
          disabled={isLoading}
          onPress={handleSave}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  backText: {
    fontSize: 15,
    color: "#1a1a1a",
    marginLeft: 2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  photoContainer: {
    alignItems: "center",
    marginVertical: 24,
  },
  photoWrapper: {
    position: "relative",
  },
  profilePhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarFallback: {
    backgroundColor: "#D4A04A",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  cameraBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#D4A04A",
  },
  nameRow: {
    flexDirection: "row",
    gap: 12,
  },
  nameField: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#1a1a1a",
    marginBottom: 8,
    marginTop: 16,
  },
  inputBox: {
    borderWidth: 1,
    borderColor: "#e8e8e8",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "#fff",
  },
  textInput: {
    fontSize: 14,
    color: "#1a1a1a",
  },
  phoneInput: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e8e8e8",
    borderRadius: 10,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  countryCode: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRightWidth: 1,
    borderRightColor: "#e8e8e8",
    gap: 4,
  },
  flagIcon: {
    width: 22,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  phoneField: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 14,
    color: "#1a1a1a",
  },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e8e8e8",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "#fff",
  },
  dropdownText: {
    fontSize: 14,
    color: "#1a1a1a",
  },
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    ...Platform.select({
      ios: {
        paddingBottom: 30,
      },
    }),
  },
  saveBtn: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
