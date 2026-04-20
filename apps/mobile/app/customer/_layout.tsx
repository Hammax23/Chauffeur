import { Tabs } from "expo-router";
import { View, Platform, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

export default function CustomerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          bottom: Platform.OS === "ios" ? 24 : 16,
          left: 24,
          right: 24,
          height: 65,
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
          borderRadius: 32,
          paddingHorizontal: 8,
        },
        tabBarBackground: () => (
          <View style={styles.tabBarBackground}>
            <BlurView
              intensity={Platform.OS === "ios" ? 90 : 100}
              tint="light"
              style={styles.blurView}
            />
            <View style={styles.tabBarOverlay} />
          </View>
        ),
        tabBarActiveTintColor: "#D4A04A",
        tabBarInactiveTintColor: "#8E8E93",
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          marginTop: -4,
          marginBottom: Platform.OS === "ios" ? 6 : 8,
        },
        tabBarIconStyle: {
          marginTop: Platform.OS === "ios" ? 6 : 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconContainer : styles.iconContainer}>
              <Ionicons 
                name={focused ? "home" : "home-outline"} 
                size={22} 
                color={color} 
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="reservations"
        options={{
          title: "Bookings",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconContainer : styles.iconContainer}>
              <Ionicons 
                name={focused ? "calendar" : "calendar-outline"} 
                size={22} 
                color={color} 
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconContainer : styles.iconContainer}>
              <Ionicons 
                name={focused ? "person-circle" : "person-circle-outline"} 
                size={22} 
                color={color} 
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="create-reservation"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="reservation-confirm"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="reservation-pending"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 32,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  blurView: {
    ...StyleSheet.absoluteFillObject,
  },
  tabBarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Platform.OS === "ios" 
      ? "rgba(255, 255, 255, 0.85)" 
      : "rgba(255, 255, 255, 0.95)",
    borderRadius: 32,
    borderWidth: 0.5,
    borderColor: "rgba(0, 0, 0, 0.05)",
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  activeIconContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
});
