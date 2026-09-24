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
} from "react-native";
import { useState, type ReactNode } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../../contexts/AuthContext";
import { useCustomerTheme } from "../../../contexts/CustomerThemeContext";
import { deactivateCustomerAccount } from "../../../services/api";
import { GOLD } from "../../../theme/driver-theme";

type MenuRowProps = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  danger?: boolean;
  showDivider?: boolean;
  chevronColor: string;
  textColor: string;
  mutedColor: string;
};

function MenuRow({
  label,
  icon,
  onPress,
  danger,
  showDivider,
  chevronColor,
  textColor,
  mutedColor,
}: MenuRowProps) {
  return (
    <View>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
      >
        <View style={[styles.menuIconWrap, danger && styles.menuIconDanger]}>
          <Ionicons name={icon} size={17} color={danger ? "#FF453A" : GOLD} />
        </View>
        <Text style={[styles.menuText, { color: danger ? "#FF453A" : textColor }]}>
          {label}
        </Text>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={danger ? "rgba(255,69,58,0.55)" : chevronColor}
        />
      </Pressable>
      {showDivider ? (
        <View style={[styles.rowDivider, { backgroundColor: mutedColor }]} />
      ) : null}
    </View>
  );
}

function MenuGroup({
  children,
  borderColor,
  cardBg,
  blurTint,
  blurIntensity,
}: {
  children: ReactNode;
  borderColor: string;
  cardBg: string;
  blurTint: "light" | "dark";
  blurIntensity: number;
}) {
  return (
    <BlurView
      intensity={blurIntensity}
      tint={blurTint}
      style={[
        styles.menuGroup,
        {
          borderColor,
          backgroundColor: Platform.OS === "android" ? cardBg : "transparent",
        },
      ]}
    >
      {children}
    </BlurView>
  );
}

export default function CustomerProfileScreen() {
  const { user, logout } = useAuth();
  const { palette, isDark } = useCustomerTheme();
  const [showAccountOptions, setShowAccountOptions] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const cardBlur = Platform.OS === "ios" ? 40 : 24;

  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || "Customer";
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

  const handleDeactivate = () => {
    Alert.alert(
      "Deactivate account?",
      "This will sign you out and cancel open bookings. Password accounts can reactivate within 30 days by signing in again. Apple/Google sign-in users should email support to restore access.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Confirm deactivation",
              "Are you sure you want to deactivate your SARJ account?",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Deactivate",
                  style: "destructive",
                  onPress: () => {
                    void (async () => {
                      if (deactivating) return;
                      setDeactivating(true);
                      try {
                        const res = await deactivateCustomerAccount();
                        if (!res.ok || !res.data.success) {
                          Alert.alert(
                            "Unable to deactivate",
                            res.data.error || "Please try again or contact support."
                          );
                          return;
                        }
                        await logout();
                        router.replace("/login");
                        Alert.alert(
                          "Account deactivated",
                          "Your account is deactivated. Password users: sign in within 30 days to reactivate. Otherwise email reserve@sarjworldwide.ca."
                        );
                      } catch {
                        Alert.alert(
                          "Unable to deactivate",
                          "Something went wrong. Check your connection and try again."
                        );
                      } finally {
                        setDeactivating(false);
                      }
                    })();
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const rowCommon = {
    chevronColor: palette.menuChevron,
    textColor: palette.text,
    mutedColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
  };

  const groupCommon = {
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
            <Text style={[styles.headerTitle, { color: palette.text }]}>My Profile</Text>
            <Text style={[styles.headerSub, { color: palette.muted }]}>
              Manage your account & preferences
            </Text>
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
            <View style={styles.heroTop}>
              <View style={styles.avatarRing}>
                {user?.photo ? (
                  <Image source={{ uri: user.photo }} style={styles.avatar} />
                ) : (
                  <LinearGradient colors={[GOLD, "#A87830"]} style={styles.avatar}>
                    <Text style={styles.avatarLetter}>{initials}</Text>
                  </LinearGradient>
                )}
              </View>
              <View style={styles.heroCopy}>
                <Text style={[styles.profileName, { color: palette.text }]} numberOfLines={1}>
                  {fullName}
                </Text>
                <Text style={[styles.profileEmail, { color: palette.muted }]} numberOfLines={1}>
                  {user?.email || "N/A"}
                </Text>
                {user?.phone ? (
                  <Text style={[styles.profilePhone, { color: palette.muted }]} numberOfLines={1}>
                    {user.phone}
                  </Text>
                ) : null}
              </View>
            </View>

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

          <Text style={styles.sectionEyebrow}>SUPPORT</Text>
          <MenuGroup {...groupCommon}>
            <MenuRow
              label="Contact Us"
              icon="mail-outline"
              onPress={() => router.push("/customer/contact-us")}
              showDivider
              {...rowCommon}
            />
            <MenuRow
              label="Refund Policy"
              icon="card-outline"
              onPress={() =>
                router.push({ pathname: "/legal-doc", params: { doc: "refund" } })
              }
              showDivider
              {...rowCommon}
            />
            <MenuRow
              label="Privacy Policy"
              icon="shield-checkmark-outline"
              onPress={() =>
                router.push({ pathname: "/legal-doc", params: { doc: "privacy" } })
              }
              showDivider
              {...rowCommon}
            />
            <MenuRow
              label="Terms & Conditions"
              icon="document-outline"
              onPress={() =>
                router.push({ pathname: "/legal-doc", params: { doc: "terms" } })
              }
              {...rowCommon}
            />
          </MenuGroup>

          <Text style={styles.sectionEyebrow}>ACCOUNT</Text>
          <MenuGroup {...groupCommon}>
            <MenuRow
              label="Payment methods"
              icon="wallet-outline"
              onPress={() => router.push("/customer/payment-methods")}
              showDivider
              {...rowCommon}
            />
            <MenuRow
              label="Logout"
              icon="log-out-outline"
              onPress={handleLogout}
              danger
              {...rowCommon}
            />
          </MenuGroup>

          <View style={styles.hiddenAccountBlock}>
            <Pressable
              onPress={() => setShowAccountOptions((v) => !v)}
              hitSlop={8}
              style={({ pressed }) => [styles.accountOptionsToggle, pressed && { opacity: 0.7 }]}
            >
              <Text style={[styles.accountOptionsLabel, { color: palette.muted }]}>
                Account options
              </Text>
              <Ionicons
                name={showAccountOptions ? "chevron-up" : "chevron-down"}
                size={14}
                color={palette.muted}
              />
            </Pressable>
            {showAccountOptions ? (
              <Pressable
                onPress={handleDeactivate}
                style={({ pressed }) => [styles.deactivateLink, pressed && { opacity: 0.75 }]}
              >
                <Text style={styles.deactivateLinkText}>
                  {deactivating ? "Deactivating…" : "Deactivate account"}
                </Text>
              </Pressable>
            ) : null}
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
    paddingTop: 6,
    paddingBottom: 110,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -0.6,
  },
  headerSub: {
    marginTop: 4,
    fontSize: 13.5,
    fontWeight: "500",
    letterSpacing: -0.1,
  },
  heroCard: {
    borderRadius: 22,
    overflow: "hidden",
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 22,
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.18,
        shadowRadius: 18,
      },
      android: { elevation: 4 },
    }),
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatarRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    padding: 2.5,
    borderWidth: 1.5,
    borderColor: GOLD,
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.35,
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 13.5,
  },
  profilePhone: {
    fontSize: 12.5,
    marginTop: 2,
  },
  editBtn: {
    marginTop: 16,
    borderRadius: 12,
    overflow: "hidden",
    alignSelf: "stretch",
  },
  editGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 16,
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
    letterSpacing: 1.4,
    color: GOLD,
    marginBottom: 8,
    marginLeft: 6,
  },
  menuGroup: {
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 60,
    opacity: 0.9,
  },
  menuIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
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
    letterSpacing: -0.15,
  },
  pressed: {
    opacity: 0.78,
  },
  hiddenAccountBlock: {
    alignItems: "center",
    paddingTop: 2,
    paddingBottom: 8,
    gap: 10,
  },
  accountOptionsToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  accountOptionsLabel: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  deactivateLink: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  deactivateLinkText: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,69,58,0.75)",
    textDecorationLine: "underline",
  },
});
