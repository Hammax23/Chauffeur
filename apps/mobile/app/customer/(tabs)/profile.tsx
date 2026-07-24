import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Image,
  Alert,
  Linking,
  Pressable,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../../contexts/AuthContext";
import { useCustomerTheme } from "../../../contexts/CustomerThemeContext";
import { GOLD } from "../../../theme/driver-theme";

const SITE = "https://sarjworldwide.ca";
const SUPPORT_EMAIL = "mailto:info@sarjworldwide.ca";

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

export default function CustomerProfileScreen() {
  const { user, logout } = useAuth();
  const { palette } = useCustomerTheme();
  const blurIntensity = Platform.OS === "ios" ? 48 : 28;
  const cardBlur = Platform.OS === "ios" ? 36 : 22;

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || "Customer";
  const initials = `${user?.firstName?.[0] || "C"}${user?.lastName?.[0] || ""}`;

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

  const menuCommon = {
    chevronColor: palette.menuChevron,
    textColor: palette.text,
    borderColor: palette.border,
    cardBg: palette.cardAndroid,
    blurTint: palette.blurTint,
    blurIntensity: cardBlur,
  };

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
          <View style={styles.header}>
            <Text style={styles.headerEyebrow}>ACCOUNT</Text>
            <Text style={[styles.headerTitle, { color: palette.text }]}>My Profile</Text>
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
              {user?.photo ? (
                <Image source={{ uri: user.photo }} style={styles.avatar} />
              ) : (
                <LinearGradient colors={[GOLD, "#A87830"]} style={styles.avatar}>
                  <Text style={styles.avatarLetter}>{initials}</Text>
                </LinearGradient>
              )}
            </View>
            <Text style={[styles.profileName, { color: palette.text }]}>{fullName}</Text>
            <Text style={[styles.profileEmail, { color: palette.muted }]}>
              {user?.email || "N/A"}
            </Text>
            {user?.phone ? (
              <Text style={[styles.profilePhone, { color: palette.muted }]}>{user.phone}</Text>
            ) : null}

            <Pressable
              onPress={() => router.push("/customer/edit-profile")}
              style={({ pressed }) => [styles.editBtn, pressed && styles.pressed]}
            >
              <LinearGradient
                colors={["#E8C078", GOLD, "#B8862E"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.editGradient}
              >
                <Ionicons name="pencil" size={14} color="#1A1208" />
                <Text style={styles.editBtnText}>Edit Profile</Text>
              </LinearGradient>
            </Pressable>
          </BlurView>

          {/* Support */}
          <Text style={styles.sectionEyebrow}>SUPPORT</Text>
          <View style={styles.menuList}>
            <MenuRow
              label="Contact Us"
              icon="mail-outline"
              onPress={() => openUrl(SUPPORT_EMAIL)}
              {...menuCommon}
            />
            <MenuRow
              label="Refund Policy"
              icon="card-outline"
              onPress={() => openUrl(`${SITE}/refund-policy`)}
              {...menuCommon}
            />
            <MenuRow
              label="Privacy Policy"
              icon="shield-checkmark-outline"
              onPress={() => openUrl(`${SITE}/privacy-policy`)}
              {...menuCommon}
            />
            <MenuRow
              label="Terms & Conditions"
              icon="document-outline"
              onPress={() => openUrl(`${SITE}/terms-of-service`)}
              {...menuCommon}
            />
          </View>

          {/* Account */}
          <Text style={styles.sectionEyebrow}>ACCOUNT</Text>
          <View style={styles.menuList}>
            <MenuRow
              label="Logout"
              icon="log-out-outline"
              onPress={handleLogout}
              danger
              {...menuCommon}
            />
            <MenuRow
              label="Deactivate Account"
              icon="trash-outline"
              onPress={handleDeactivate}
              danger
              {...menuCommon}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
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
  container: { flex: 1 },
  contentContainer: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 110,
  },
  header: {
    marginBottom: 18,
  },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: GOLD,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
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
    fontSize: 28,
    fontWeight: "700",
  },
  profileName: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.4,
    marginBottom: 4,
    textAlign: "center",
  },
  profileEmail: {
    fontSize: 14,
    textAlign: "center",
  },
  profilePhone: {
    fontSize: 13,
    marginTop: 4,
    textAlign: "center",
  },
  editBtn: {
    marginTop: 18,
    borderRadius: 14,
    overflow: "hidden",
  },
  editGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  editBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1A1208",
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: GOLD,
    marginBottom: 10,
    marginLeft: 4,
  },
  menuList: {
    gap: 10,
    marginBottom: 22,
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
