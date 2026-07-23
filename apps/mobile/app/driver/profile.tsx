import { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Image,
  Alert,
  Pressable,
  Platform,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useDriverAuth } from "../../contexts/DriverAuthContext";
import { useDriverTheme } from "../../contexts/DriverThemeContext";
import { GOLD } from "../../theme/driver-theme";

const SITE = "https://sarjworldwide.ca";

type MenuRowProps = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  danger?: boolean;
  chevronColor: string;
  textColor: string;
  borderColor: string;
  cardBg: string;
  blurTint: "light" | "dark";
  blurIntensity: number;
};

function MenuRow({
  label,
  icon,
  onPress,
  danger,
  chevronColor,
  textColor,
  borderColor,
  cardBg,
  blurTint,
  blurIntensity,
}: MenuRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.menuWrap, pressed && styles.pressed]}
    >
      <BlurView
        intensity={blurIntensity}
        tint={blurTint}
        style={[
          styles.menuItem,
          {
            borderColor,
            backgroundColor: Platform.OS === "android" ? cardBg : "transparent",
          },
        ]}
      >
        <View style={[styles.menuIconWrap, danger && styles.menuIconDanger]}>
          <Ionicons name={icon} size={18} color={danger ? "#FF453A" : GOLD} />
        </View>
        <Text style={[styles.menuText, { color: danger ? "#FF453A" : textColor }]}>{label}</Text>
        <Ionicons name="chevron-forward" size={18} color={danger ? "#FF453A" : chevronColor} />
      </BlurView>
    </Pressable>
  );
}

export default function DriverProfileScreen() {
  const { driver, logout, refreshProfile } = useDriverAuth();
  const { palette } = useDriverTheme();
  const blurIntensity = Platform.OS === "ios" ? 48 : 28;
  const cardBlur = Platform.OS === "ios" ? 36 : 22;

  useFocusEffect(
    useCallback(() => {
      refreshProfile();
    }, [refreshProfile])
  );

  const openUrl = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert("Unable to open", "Please try again later.");
    });
  };

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

  const infoRows = [
    { label: "Phone", value: driver?.phone || "N/A", icon: "call-outline" as const },
    { label: "Vehicle", value: driver?.vehicle || "N/A", icon: "car-sport-outline" as const },
    { label: "Car Code", value: driver?.vehicleCode || "N/A", icon: "keypad-outline" as const },
    {
      label: "License Plate",
      value: driver?.vehiclePlate || "N/A",
      icon: "document-text-outline" as const,
    },
  ];

  return (
    <View style={[styles.root, { backgroundColor: palette.root }]}>
      <StatusBar barStyle={palette.statusBar} backgroundColor={palette.root} />
      <LinearGradient colors={[...palette.bg]} style={StyleSheet.absoluteFill} />
      <View style={styles.ambientGlow} pointerEvents="none">
        <LinearGradient
          colors={[...palette.glow]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 0.5 }}
        />
      </View>

      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
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

            <Text style={[styles.headerTitle, { color: palette.text }]}>Profile</Text>

            <View style={styles.headerSpacer} />
          </View>

          {/* Hero */}
          <BlurView
            intensity={cardBlur}
            tint={palette.blurTint}
            style={[
              styles.heroCard,
              {
                borderColor: palette.border,
                backgroundColor: Platform.OS === "android" ? palette.cardAndroid : "transparent",
              },
            ]}
          >
            <View style={styles.avatarRing}>
              {driver?.photo ? (
                <Image key={driver.photo} source={{ uri: driver.photo }} style={styles.avatar} />
              ) : (
                <LinearGradient colors={[GOLD, "#A87830"]} style={styles.avatar}>
                  <Text style={styles.avatarLetter}>{driver?.name?.[0] || "D"}</Text>
                </LinearGradient>
              )}
            </View>
            <Text style={[styles.profileName, { color: palette.text }]}>
              {driver?.name || "Driver"}
            </Text>
            <Text style={[styles.profileEmail, { color: palette.muted }]}>
              {driver?.email || "N/A"}
            </Text>

            <View style={styles.statRow}>
              <View style={[styles.statChip, { backgroundColor: palette.metaChipBg, borderColor: palette.border }]}>
                <Ionicons name="star" size={14} color={GOLD} />
                <Text style={[styles.statValue, { color: palette.text }]}>
                  {driver?.rating?.toFixed(1) || "5.0"}
                </Text>
                <Text style={[styles.statLabel, { color: palette.muted }]}>Rating</Text>
              </View>
              <View style={[styles.statChip, { backgroundColor: palette.metaChipBg, borderColor: palette.border }]}>
                <Ionicons name="navigate" size={14} color={GOLD} />
                <Text style={[styles.statValue, { color: palette.text }]}>
                  {driver?.totalTrips || 0}
                </Text>
                <Text style={[styles.statLabel, { color: palette.muted }]}>Trips</Text>
              </View>
              <View style={[styles.statChip, { backgroundColor: palette.metaChipBg, borderColor: palette.border }]}>
                <View
                  style={[
                    styles.onlineDot,
                    { backgroundColor: driver?.isActive ? "#34C759" : "#8E8E93" },
                  ]}
                />
                <Text style={[styles.statValue, { color: palette.text }]}>
                  {driver?.isActive ? "Online" : "Offline"}
                </Text>
                <Text style={[styles.statLabel, { color: palette.muted }]}>Status</Text>
              </View>
            </View>
          </BlurView>

          {/* Details */}
          <Text style={[styles.sectionEyebrow, { color: GOLD }]}>DETAILS</Text>
          <BlurView
            intensity={cardBlur}
            tint={palette.blurTint}
            style={[
              styles.infoCard,
              {
                borderColor: palette.border,
                backgroundColor: Platform.OS === "android" ? palette.cardAndroid : "transparent",
              },
            ]}
          >
            {infoRows.map((row, index) => (
              <View
                key={row.label}
                style={[
                  styles.infoRow,
                  index < infoRows.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: palette.border,
                  },
                ]}
              >
                <View style={styles.infoLeft}>
                  <View style={[styles.infoIcon, { backgroundColor: palette.metaChipBg }]}>
                    <Ionicons name={row.icon} size={15} color={GOLD} />
                  </View>
                  <Text style={[styles.infoLabel, { color: palette.muted }]}>{row.label}</Text>
                </View>
                <Text style={styles.infoValue} numberOfLines={1}>
                  {row.value}
                </Text>
              </View>
            ))}
          </BlurView>

          {/* Menu */}
          <Text style={[styles.sectionEyebrow, { color: GOLD }]}>SUPPORT</Text>
          <View style={styles.menuList}>
            <MenuRow
              label="Privacy Policy"
              icon="shield-checkmark-outline"
              onPress={() => openUrl(`${SITE}/privacy-policy`)}
              chevronColor={palette.menuChevron}
              textColor={palette.text}
              borderColor={palette.border}
              cardBg={palette.cardAndroid}
              blurTint={palette.blurTint}
              blurIntensity={cardBlur}
            />
            <MenuRow
              label="Terms & Conditions"
              icon="document-outline"
              onPress={() => openUrl(`${SITE}/terms-of-service`)}
              chevronColor={palette.menuChevron}
              textColor={palette.text}
              borderColor={palette.border}
              cardBg={palette.cardAndroid}
              blurTint={palette.blurTint}
              blurIntensity={cardBlur}
            />
            <MenuRow
              label="Contact Us"
              icon="mail-outline"
              onPress={() => openUrl(`${SITE}/contact`)}
              chevronColor={palette.menuChevron}
              textColor={palette.text}
              borderColor={palette.border}
              cardBg={palette.cardAndroid}
              blurTint={palette.blurTint}
              blurIntensity={cardBlur}
            />
            <MenuRow
              label="Logout"
              icon="log-out-outline"
              onPress={handleLogout}
              danger
              chevronColor={palette.menuChevron}
              textColor={palette.text}
              borderColor={palette.border}
              cardBg={palette.cardAndroid}
              blurTint={palette.blurTint}
              blurIntensity={cardBlur}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  ambientGlow: {
    position: "absolute",
    top: -40,
    left: -20,
    right: -20,
    height: 260,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 48,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
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
  heroCard: {
    borderRadius: 24,
    overflow: "hidden",
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 22,
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.28,
        shadowRadius: 20,
      },
      android: { elevation: 6 },
    }),
  },
  avatarRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    padding: 3,
    borderWidth: 2,
    borderColor: GOLD,
    marginBottom: 14,
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 43,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "700",
  },
  profileName: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    marginBottom: 18,
  },
  statRow: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
  },
  statChip: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 2,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  infoCard: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 22,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    gap: 12,
  },
  infoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 0,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  infoValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 14,
    fontWeight: "600",
    color: GOLD,
  },
  menuList: {
    gap: 10,
  },
  menuWrap: {
    borderRadius: 16,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  menuIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(212,160,74,0.14)",
  },
  menuIconDanger: {
    backgroundColor: "rgba(255,69,58,0.12)",
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },
});
