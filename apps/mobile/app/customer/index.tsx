import { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Image,
  Platform,
  Animated,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const fleetVehicles = [
  {
    id: "1",
    name: "Mercedes-Maybach\nS-Class",
    price: "$450",
    image: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=400&q=80",
    tag: "Luxury Sedan",
    seats: 3,
  },
  {
    id: "2",
    name: "Tesla\nModel S",
    price: "$450",
    image: "https://images.unsplash.com/photo-1536700503339-1e4b06520771?w=400&q=80",
    tag: "Electric Premium",
    seats: 3,
  },
  {
    id: "3",
    name: "Mercedes\nG Wagon AMG",
    price: "$450",
    image: "https://images.unsplash.com/photo-1520031441872-265e4ff70366?w=400&q=80",
    tag: "Luxury SUV",
    seats: 5,
  },
  {
    id: "4",
    name: "Porsche\nCarrera GT",
    price: "$450",
    image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&q=80",
    tag: "Sports",
    seats: 2,
  },
];

const serviceOptions = [
  { id: "1", icon: "navigate-circle", title: "Airport Transfer", desc: "Pickups & drop-offs", color: "#007AFF" },
  { id: "2", icon: "timer", title: "Hourly Chauffeur", desc: "By the hour", color: "#D4A04A" },
  { id: "3", icon: "globe", title: "Corporate Travel", desc: "Business trips", color: "#34C759" },
  { id: "4", icon: "sparkles", title: "Special Events", desc: "Weddings & more", color: "#AF52DE" },
];

const trustPoints = [
  { id: "1", icon: "shield-checkmark", title: "Licensed & Insured", desc: "All drivers verified" },
  { id: "2", icon: "star", title: "4.9 Average Rating", desc: "From 2,000+ rides" },
  { id: "3", icon: "time", title: "24/7 Availability", desc: "Anytime, anywhere" },
];

export default function CustomerHomeScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View
          style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          <TouchableOpacity style={styles.headerLeft} activeOpacity={0.8} onPress={() => router.push("/customer/profile")}>
            <View style={styles.avatarContainer}>
              <Image
                source={{ uri: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80" }}
                style={styles.avatar}
              />
              <View style={styles.onlineIndicator} />
            </View>
            <View>
              <Text style={styles.welcomeText}>Welcome back</Text>
              <Text style={styles.userName}>Valadmir Putin</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.notificationBtn}>
            <Ionicons name="notifications-outline" size={22} color="#1a1a1a" />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </Animated.View>

        {/* Active Ride Banner */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <TouchableOpacity
            style={styles.activeRideBanner}
            activeOpacity={0.9}
            onPress={() => router.push("/customer/track-ride")}
          >
            <LinearGradient
              colors={["#D4A04A", "#C49A3A"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.activeRideGradient}
            >
              <View style={styles.activeRideLeft}>
                <View style={styles.activeRidePulse}>
                  <View style={styles.activeRideDot} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activeRideLabel}>RIDE IN PROGRESS</Text>
                  <Text style={styles.activeRideRoute}>YYZ Terminal 1 → Niagara Falls</Text>
                </View>
              </View>
              <View style={styles.activeRideArrow}>
                <Ionicons name="chevron-forward" size={18} color="#D4A04A" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Hero Card – Book */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <TouchableOpacity
            style={styles.heroCard}
            activeOpacity={0.95}
            onPress={() => router.push("/customer/create-reservation")}
          >
            <LinearGradient
              colors={["#111111", "#1e1e1e"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroGradient}
            >
              <View style={styles.heroContent}>
                <View style={styles.heroIconWrapper}>
                  <LinearGradient colors={["#D4A04A", "#C49A3A"]} style={styles.heroIcon}>
                    <Ionicons name="car-sport" size={26} color="#fff" />
                  </LinearGradient>
                </View>
                <View style={styles.heroTextContainer}>
                  <Text style={styles.heroTitle}>Book a Chauffeur</Text>
                  <Text style={styles.heroSubtitle}>Premium rides at your fingertips</Text>
                </View>
              </View>
              <View style={styles.heroArrow}>
                <Ionicons name="arrow-forward" size={20} color="#D4A04A" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Services */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Our Services</Text>
          </View>
        </Animated.View>
        <Animated.View style={{ opacity: fadeAnim }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.servicesScroll}
            decelerationRate="fast"
            snapToInterval={SCREEN_WIDTH * 0.44 + 10}
          >
            {serviceOptions.map((service) => (
              <TouchableOpacity
                key={service.id}
                style={styles.serviceCard}
                activeOpacity={0.7}
                onPress={() => router.push("/customer/create-reservation")}
              >
                <View style={[styles.serviceIconCircle, { backgroundColor: service.color + "18" }]}>
                  <Ionicons name={service.icon as any} size={20} color={service.color} />
                </View>
                <View style={styles.serviceTextRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.serviceTitle}>{service.title}</Text>
                    <Text style={styles.serviceDesc}>{service.desc}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#ccc" />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Our Fleet – Horizontal Scroll */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Our Fleet</Text>
            <TouchableOpacity>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.fleetScroll}
            decelerationRate="fast"
            snapToInterval={SCREEN_WIDTH * 0.6 + 12}
          >
            {fleetVehicles.map((v) => (
              <TouchableOpacity key={v.id} style={styles.fleetCard} activeOpacity={0.9}>
                <Image source={{ uri: v.image }} style={styles.fleetImage} resizeMode="cover" />
                <LinearGradient
                  colors={["transparent", "rgba(0,0,0,0.8)"]}
                  style={styles.fleetOverlay}
                />
                <View style={styles.fleetTag}>
                  <Text style={styles.fleetTagText}>{v.tag}</Text>
                </View>
                <View style={styles.fleetInfo}>
                  <Text style={styles.fleetName}>{v.name}</Text>
                  <View style={styles.fleetMeta}>
                    <Text style={styles.fleetPrice}>{v.price}<Text style={styles.fleetPriceUnit}>/hr</Text></Text>
                    <View style={styles.fleetSeats}>
                      <Ionicons name="people" size={12} color="rgba(255,255,255,0.7)" />
                      <Text style={styles.fleetSeatsText}>{v.seats}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Trust Section */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={[styles.sectionHeader, { marginTop: 8 }]}>
            <Text style={styles.sectionTitle}>Why Choose Us</Text>
          </View>
          <View style={styles.trustSection}>
            {trustPoints.map((item, index) => (
              <View
                key={item.id}
                style={[styles.trustItem, index < trustPoints.length - 1 && styles.trustItemBorder]}
              >
                <View style={styles.trustIcon}>
                  <Ionicons name={item.icon as any} size={20} color="#D4A04A" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.trustTitle}>{item.title}</Text>
                  <Text style={styles.trustDesc}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>

        <View style={{ height: 90 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingTop: 8,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: "#D4A04A",
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#4CAF50",
    borderWidth: 2,
    borderColor: "#FAFAFA",
  },
  welcomeText: {
    fontSize: 12,
    color: "#888",
    fontWeight: "500",
  },
  userName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  notificationDot: {
    position: "absolute",
    top: 11,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E53935",
  },

  /* Active Ride Banner */
  activeRideBanner: {
    borderRadius: 14,
    marginBottom: 16,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#D4A04A",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  activeRideGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  activeRideLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  activeRidePulse: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  activeRideDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#fff",
  },
  activeRideLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.85)",
    letterSpacing: 1,
    marginBottom: 2,
  },
  activeRideRoute: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },
  activeRideArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },

  /* Hero Card */
  heroCard: {
    borderRadius: 18,
    marginBottom: 18,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: { elevation: 6 },
    }),
  },
  heroGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
  },
  heroContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  heroIconWrapper: {
    marginRight: 14,
  },
  heroIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  heroTextContainer: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 3,
  },
  heroSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
  },
  heroArrow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },

  /* Section Header */
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  viewAll: {
    fontSize: 13,
    fontWeight: "600",
    color: "#D4A04A",
  },

  /* Services */
  servicesScroll: {
    paddingRight: 10,
    marginBottom: 24,
  },
  serviceCard: {
    width: SCREEN_WIDTH * 0.44,
    marginRight: 10,
    borderRadius: 16,
    backgroundColor: "#fff",
    padding: 16,
    borderWidth: 1,
    borderColor: "#eee",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  serviceIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  serviceTextRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  serviceTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  serviceDesc: {
    fontSize: 11,
    color: "#888",
    fontWeight: "400",
  },

  /* Recent Booking */
  recentCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: { elevation: 1 },
    }),
  },
  recentTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  recentInfo: {
    flex: 1,
  },
  recentId: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 6,
  },
  recentStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 5,
  },
  recentStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4CAF50",
  },
  recentStatusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4CAF50",
  },
  recentPrice: {
    fontSize: 18,
    fontWeight: "800",
    color: "#D4A04A",
  },
  recentMidRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  recentVehicle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  recentVehicleText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  recentDriver: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  recentDriverAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  recentDriverName: {
    fontSize: 12,
    fontWeight: "500",
    color: "#666",
  },
  recentDivider: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginVertical: 12,
  },
  recentBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  recentRoute: {
    flex: 1,
    marginRight: 12,
  },
  recentLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  recentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  recentLocationText: {
    fontSize: 12,
    color: "#555",
    flex: 1,
  },
  recentRouteLine: {
    width: 1,
    height: 14,
    backgroundColor: "#ddd",
    marginLeft: 3.5,
    marginVertical: 2,
  },
  recentDate: {
    fontSize: 11,
    color: "#999",
    fontWeight: "500",
  },

  /* Fleet Horizontal */
  fleetScroll: {
    paddingRight: 20,
    marginBottom: 22,
  },
  fleetCard: {
    width: SCREEN_WIDTH * 0.6,
    height: 220,
    borderRadius: 16,
    overflow: "hidden",
    marginRight: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: { elevation: 4 },
    }),
  },
  fleetImage: {
    width: "100%",
    height: "100%",
  },
  fleetOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "70%",
  },
  fleetTag: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  fleetTagText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#fff",
    letterSpacing: 0.5,
  },
  fleetInfo: {
    position: "absolute",
    bottom: 14,
    left: 14,
    right: 14,
  },
  fleetName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
    lineHeight: 19,
  },
  fleetMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fleetPrice: {
    fontSize: 15,
    fontWeight: "700",
    color: "#D4A04A",
  },
  fleetPriceUnit: {
    fontSize: 11,
    fontWeight: "500",
    color: "rgba(255,255,255,0.6)",
  },
  fleetSeats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  fleetSeatsText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "500",
  },

  /* Trust Section */
  trustSection: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: { elevation: 1 },
    }),
  },
  trustItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 14,
  },
  trustItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  trustIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(212,160,74,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  trustTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  trustDesc: {
    fontSize: 12,
    color: "#999",
  },
});
