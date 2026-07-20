import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Image,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../../contexts/AuthContext";

const SITE = "https://sarjworldwide.ca";
const SUPPORT_EMAIL = "mailto:info@sarjworldwide.ca";

export default function CustomerProfileScreen() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  };

  const handleEditProfile = () => {
    router.push("/customer/edit-profile");
  };

  const openUrl = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert("Unable to open", "Please try again later.");
    });
  };

  const handleDeactivate = () => {
    Alert.alert(
      "Deactivate account",
      "To deactivate your account, contact SARJ support. We will confirm before removing your data.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Email support", onPress: () => openUrl(SUPPORT_EMAIL) },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.headerTitle}>Customer's Profile</Text>

        <View style={styles.profileCard}>
          {user?.photo ? (
            <Image source={{ uri: user.photo }} style={styles.profileAvatar} />
          ) : (
            <View style={[styles.profileAvatar, { backgroundColor: "#D4A04A", justifyContent: "center", alignItems: "center" }]}>
              <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}>
                {user?.firstName?.[0]}
                {user?.lastName?.[0]}
              </Text>
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {user?.firstName} {user?.lastName}
            </Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
          </View>
          <TouchableOpacity style={styles.editBtn} onPress={handleEditProfile}>
            <Ionicons name="pencil-outline" size={14} color="#1a1a1a" />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.menuItem} onPress={() => openUrl(SUPPORT_EMAIL)}>
          <Text style={styles.menuText}>Contact Us</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => openUrl(`${SITE}/refund-policy`)}>
          <Text style={styles.menuText}>Refund Policy</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => openUrl(`${SITE}/privacy-policy`)}>
          <Text style={styles.menuText}>Privacy Policy</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => openUrl(`${SITE}/terms-of-service`)}>
          <Text style={styles.menuText}>Terms & Conditions</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
          <Text style={styles.dangerText}>Logout</Text>
          <Ionicons name="chevron-forward" size={20} color="#e53935" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleDeactivate}>
          <Text style={styles.dangerText}>Deactivate Account</Text>
          <Ionicons name="chevron-forward" size={20} color="#e53935" />
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1a1a1a",
    textAlign: "center",
    marginBottom: 24,
  },
  profileCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  profileAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D4A04A",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  menuText: {
    fontSize: 15,
    color: "#1a1a1a",
  },
  dangerText: {
    fontSize: 15,
    color: "#e53935",
  },
});
