import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function CustomerProfileScreen() {
  const handleLogout = () => {
    router.replace("/login");
  };

  const handleEditProfile = () => {
    router.push("/customer/edit-profile");
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        
        {/* Header */}
        <Text style={styles.headerTitle}>Customer's Profile</Text>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <Image
            source={{ uri: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80" }}
            style={styles.profileAvatar}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>Valadmir Putin</Text>
            <Text style={styles.profileEmail}>voladmir1@gmail.com</Text>
          </View>
          <TouchableOpacity style={styles.editBtn} onPress={handleEditProfile}>
            <Ionicons name="pencil-outline" size={14} color="#1a1a1a" />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Menu Items */}
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>Contact Us</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>Refund Policy</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>Privacy Policy</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>Terms & Conditions</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
          <Text style={styles.dangerText}>Logout</Text>
          <Ionicons name="chevron-forward" size={20} color="#e53935" />
        </TouchableOpacity>

        {/* Deactivate Account */}
        <TouchableOpacity style={styles.menuItem}>
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
    color: "#D4A04A",
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#1a1a1a",
  },
  menuItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
