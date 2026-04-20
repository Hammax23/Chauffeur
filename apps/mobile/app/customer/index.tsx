import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Image,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

interface Vehicle {
  id: string;
  name: string;
  pricePerHour: number;
  maxPassengers: number;
  comfortableSeats: number;
  largeLuggage: number;
  mediumLuggage: number;
  image: string;
  category: string;
}

const recommendedVehicles: Vehicle[] = [
  {
    id: "1",
    name: "Mercedes-Maybach S-Class",
    pricePerHour: 450,
    maxPassengers: 3,
    comfortableSeats: 3,
    largeLuggage: 2,
    mediumLuggage: 2,
    image: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=400&q=80",
    category: "Luxury Sedan",
  },
  {
    id: "2",
    name: "Tesla Model S",
    pricePerHour: 450,
    maxPassengers: 3,
    comfortableSeats: 3,
    largeLuggage: 2,
    mediumLuggage: 2,
    image: "https://images.unsplash.com/photo-1536700503339-1e4b06520771?w=400&q=80",
    category: "Electric Premium",
  },
  {
    id: "3",
    name: "Mercedes G Wagon AMG",
    pricePerHour: 450,
    maxPassengers: 3,
    comfortableSeats: 3,
    largeLuggage: 2,
    mediumLuggage: 2,
    image: "https://images.unsplash.com/photo-1520031441872-265e4ff70366?w=400&q=80",
    category: "Luxury SUV",
  },
];

export default function CustomerHomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Slim Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hi, Valadmir 👋</Text>
            <Text style={styles.subGreeting}>Ready for your next ride?</Text>
          </View>
          <TouchableOpacity style={styles.notificationBtn}>
            <Ionicons name="notifications-outline" size={24} color="#1a1a1a" />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>

        {/* Create Reservation Card */}
        <TouchableOpacity 
          style={styles.reservationCard} 
          activeOpacity={0.95}
          onPress={() => router.push("/customer/create-reservation")}
        >
          <View style={styles.reservationContent}>
            <View style={styles.reservationIcon}>
              <Ionicons name="car-sport" size={24} color="#D4A04A" />
            </View>
            <View style={styles.reservationText}>
              <Text style={styles.reservationTitle}>Create Reservation</Text>
              <Text style={styles.reservationSubtitle}>Book your premium chauffeur</Text>
            </View>
          </View>
          <View style={styles.reservationArrow}>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickActionItem}>
            <View style={styles.quickActionIcon}>
              <Ionicons name="time-outline" size={20} color="#D4A04A" />
            </View>
            <Text style={styles.quickActionText}>Schedule</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionItem}>
            <View style={styles.quickActionIcon}>
              <Ionicons name="location-outline" size={20} color="#D4A04A" />
            </View>
            <Text style={styles.quickActionText}>Track</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionItem}>
            <View style={styles.quickActionIcon}>
              <Ionicons name="star-outline" size={20} color="#D4A04A" />
            </View>
            <Text style={styles.quickActionText}>Favorites</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionItem}>
            <View style={styles.quickActionIcon}>
              <Ionicons name="gift-outline" size={20} color="#D4A04A" />
            </View>
            <Text style={styles.quickActionText}>Offers</Text>
          </TouchableOpacity>
        </View>

        {/* Recommended Vehicles */}
        <View style={styles.vehiclesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recommended Vehicles</Text>
            <TouchableOpacity>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>

          {recommendedVehicles.map((vehicle) => (
            <TouchableOpacity key={vehicle.id} style={styles.vehicleCard} activeOpacity={0.95}>
              <View style={styles.vehicleHeader}>
                <View>
                  <Text style={styles.vehicleName}>{vehicle.name}</Text>
                  <Text style={styles.vehicleCategory}>{vehicle.category}</Text>
                </View>
                <Text style={styles.vehiclePrice}>
                  ${vehicle.pricePerHour}<Text style={styles.priceUnit}>/hr</Text>
                </Text>
              </View>
              
              <View style={styles.vehicleSpecs}>
                <View style={styles.specItem}>
                  <Ionicons name="people-outline" size={14} color="#666" />
                  <Text style={styles.specText}>
                    {vehicle.maxPassengers} Max, {vehicle.comfortableSeats} Comfortable
                  </Text>
                </View>
                <View style={styles.specItem}>
                  <Ionicons name="briefcase-outline" size={14} color="#666" />
                  <Text style={styles.specText}>
                    {vehicle.largeLuggage} Large, {vehicle.mediumLuggage} Medium
                  </Text>
                </View>
              </View>

              <View style={styles.vehicleImageContainer}>
                <Image
                  source={{ uri: vehicle.image }}
                  style={styles.vehicleImage}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={["transparent", "rgba(0,0,0,0.6)"]}
                  style={styles.imageOverlay}
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>
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
    paddingBottom: 100,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  greeting: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  subGreeting: {
    fontSize: 14,
    color: "#666",
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  notificationDot: {
    position: "absolute",
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D4A04A",
  },
  reservationCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  reservationContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  reservationIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(212, 160, 74, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  reservationText: {},
  reservationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 2,
  },
  reservationSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
  },
  reservationArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#D4A04A",
    justifyContent: "center",
    alignItems: "center",
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  quickActionItem: {
    alignItems: "center",
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#f8f8f8",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  quickActionText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#333",
  },
  vehiclesSection: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  viewAll: {
    fontSize: 13,
    fontWeight: "600",
    color: "#D4A04A",
  },
  vehicleCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  vehicleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  vehicleCategory: {
    fontSize: 12,
    color: "#999",
  },
  vehiclePrice: {
    fontSize: 18,
    fontWeight: "700",
    color: "#D4A04A",
  },
  priceUnit: {
    fontSize: 12,
    fontWeight: "500",
    color: "#999",
  },
  vehicleSpecs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 12,
  },
  specItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  specText: {
    fontSize: 12,
    color: "#666",
  },
  vehicleImageContainer: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
  },
  vehicleImage: {
    width: "100%",
    height: 160,
    borderRadius: 12,
  },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
});
