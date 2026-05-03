import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useDriverAuth } from "../../contexts/DriverAuthContext";

export default function DriverProfileScreen() {
  const { driver, logout } = useDriverAuth();

  const handleLogout = () => {
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

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color="#000" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Driver's Profile</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          {driver?.photo ? (
            <Image source={{ uri: driver.photo }} style={styles.profileAvatar} />
          ) : (
            <View style={[styles.profileAvatar, { backgroundColor: '#D4A04A', justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>{driver?.name?.[0] || 'D'}</Text>
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{driver?.name || "N/A"}</Text>
            <Text style={styles.profileEmail}>{driver?.email || "N/A"}</Text>
          </View>
        </View>

        {/* Phone Number */}
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Phone Number</Text>
          <Text style={styles.infoValue}>{driver?.phone || "N/A"}</Text>
        </View>

        {/* Assigned Vehicle */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionLabel}>Assigned Vehicle</Text>
          
          <View style={styles.vehicleRow}>
            <Text style={styles.vehicleLabel}>Vehicle Type:</Text>
            <Text style={styles.vehicleValue}>{driver?.vehicle || "N/A"}</Text>
          </View>
          
          <View style={styles.vehicleRow}>
            <Text style={styles.vehicleLabel}>Car Code:</Text>
            <Text style={styles.vehicleValue}>{driver?.vehicleCode || "N/A"}</Text>
          </View>
          
          <View style={[styles.vehicleRow, { marginBottom: 0 }]}>
            <Text style={styles.vehicleLabel}>Car License Plate:</Text>
            <Text style={styles.vehicleValue}>{driver?.vehiclePlate || "N/A"}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionLabel}>Stats</Text>
          <View style={styles.vehicleRow}>
            <Text style={styles.vehicleLabel}>Rating:</Text>
            <Text style={styles.vehicleValue}>⭐ {driver?.rating?.toFixed(1) || "5.0"}</Text>
          </View>
          <View style={[styles.vehicleRow, { marginBottom: 0 }]}>
            <Text style={styles.vehicleLabel}>Total Trips:</Text>
            <Text style={styles.vehicleValue}>{driver?.totalTrips || 0}</Text>
          </View>
        </View>

        {/* Menu Items */}
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>Privacy Policy</Text>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>Terms & Conditions</Text>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>Contact Us</Text>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
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
    paddingTop: 10,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  backText: {
    fontSize: 16,
    color: "#000",
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    textAlign: "center",
  },
  headerSpacer: {
    flex: 1,
  },
  profileCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: "#999",
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e8e8e8",
  },
  infoLabel: {
    fontSize: 14,
    color: "#666",
  },
  infoValue: {
    fontSize: 14,
    color: "#D4A04A",
    fontWeight: "500",
    textAlign: "right",
    position: "absolute",
    right: 16,
    top: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000",
    marginBottom: 16,
  },
  vehicleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  vehicleLabel: {
    fontSize: 14,
    color: "#666",
  },
  vehicleValue: {
    fontSize: 14,
    color: "#D4A04A",
    fontWeight: "500",
  },
  menuItem: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  menuText: {
    fontSize: 15,
    color: "#000",
  },
  logoutText: {
    fontSize: 15,
    color: "#e53935",
  },
});
