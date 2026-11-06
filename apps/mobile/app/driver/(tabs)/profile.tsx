import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  Pressable,
  Platform,
  Switch,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useDriverAuth } from "../../../contexts/DriverAuthContext";
import { useDriverTheme } from "../../../contexts/DriverThemeContext";
import { GOLD } from "../../../theme/driver-theme";
import { DriverScreenShell } from "../../../components/driver/DriverScreenShell";
import * as WebBrowser from "expo-web-browser";
import {
  getDriverEarnings,
  getDriverConnectStatus,
  startDriverConnectOnboarding,
  type DriverConnectStatus,
  type DriverEarningSummary,
} from "../../../services/api";

type MenuRowProps = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  danger?: boolean;
  chevronColor: string;
  textColor: string;
  borderColor: string;
  surface: string;
  /** When set, replaces the chevron (e.g. Switch). */
  right?: ReactNode;
  hint?: string;
};

function MenuRow({
  label,
  icon,
  onPress,
  danger,
  chevronColor,
  textColor,
  borderColor,
  surface,
  right,
  hint,
}: MenuRowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.menuItem,
        {
          borderColor,
          backgroundColor: surface,
          opacity: pressed && onPress ? 0.88 : 1,
        },
      ]}
    >
      <View style={[styles.menuIconWrap, danger && styles.menuIconDanger]}>
        <Ionicons name={icon} size={18} color={danger ? "#FF453A" : GOLD} />
      </View>
      <View style={styles.menuCopy}>
        <Text style={[styles.menuText, { color: danger ? "#FF453A" : textColor }]}>{label}</Text>
        {hint ? (
          <Text style={[styles.menuHint, { color: chevronColor }]}>{hint}</Text>
        ) : null}
      </View>
      {right ?? (
        <Ionicons name="chevron-forward" size={18} color={danger ? "#FF453A" : chevronColor} />
      )}
    </Pressable>
  );
}

export default function DriverProfileScreen() {
  const { driver, logout, refreshProfile } = useDriverAuth();
  const { palette, isDark, setThemeMode } = useDriverTheme();
  const surface = palette.cardSurface;
  const [earnings, setEarnings] = useState<DriverEarningSummary | null>(null);
  const [connect, setConnect] = useState<DriverConnectStatus | null>(null);
  const [connectBusy, setConnectBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshProfile();
    }, [refreshProfile])
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getDriverEarnings({ summaryOnly: true });
        if (!cancelled && res.success) setEarnings(res.summary);
      } catch {
        /* non-fatal — earnings tile hides silently if the call fails */
      }
      try {
        const cs = await getDriverConnectStatus();
        if (!cancelled && cs.success) setConnect(cs);
      } catch {
        /* non-fatal — Bank/Payouts row stays in its default state */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [driver?.id]);

  const handleBankPress = async () => {
    if (!connect?.connectAvailable) {
      Alert.alert(
        "Bank payouts not available",
        "Stripe isn't configured on this environment yet. Please contact support."
      );
      return;
    }
    setConnectBusy(true);
    try {
      const res = await startDriverConnectOnboarding();
      if (!res.success || !res.url) {
        Alert.alert("Onboarding failed", res.error || "Could not start Stripe onboarding.");
        return;
      }
      await WebBrowser.openBrowserAsync(res.url);
      // When the user returns, re-pull status.
      try {
        const cs = await getDriverConnectStatus({ refresh: true });
        if (cs.success) setConnect(cs);
      } catch {
        /* ignore */
      }
    } catch (e: any) {
      Alert.alert("Onboarding failed", e?.message || "Please try again.");
    } finally {
      setConnectBusy(false);
    }
  };

  const bankHint = (() => {
    if (!connect) return "Set up to receive payouts to your bank";
    switch (connect.status) {
      case "ENABLED":
        return connect.payoutsLive
          ? "Bank account connected · payouts enabled"
          : "Bank account connected · manual payouts active";
      case "PENDING":
        return "Verification pending — tap to continue";
      case "RESTRICTED":
        return "Action needed — tap to update details";
      default:
        return "Tap to set up Stripe (direct deposit)";
    }
  })();

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

  const infoRows: Array<{
    label: string;
    value: string;
    icon: keyof typeof Ionicons.glyphMap;
    verified?: boolean;
  }> = [
    { label: "Phone", value: driver?.phone || "N/A", icon: "call-outline" },
    { label: "Vehicle", value: driver?.vehicle || "N/A", icon: "car-sport-outline" },
    {
      label: "Verified",
      value: "Verified",
      icon: "shield-checkmark-outline",
      verified: true,
    },
    {
      label: "License Plate",
      value: driver?.vehiclePlate || "N/A",
      icon: "document-text-outline",
    },
  ];

  return (
    <DriverScreenShell>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={[styles.pageTitle, { color: palette.text }]}>Profile</Text>
          </View>

          <View
            style={[
              styles.heroCard,
              {
                borderColor: palette.border,
                backgroundColor: surface,
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

            <View style={styles.statRow}>
              <Pressable
                onPress={() => router.push("/driver/reviews")}
                style={({ pressed }) => [
                  styles.statChip,
                  { backgroundColor: palette.metaChipBg, borderColor: palette.border },
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="star" size={14} color={GOLD} />
                <Text style={[styles.statValue, { color: palette.text }]}>
                  {driver?.rating?.toFixed(1) || "5.0"}
                </Text>
                <Text style={[styles.statLabel, { color: palette.muted }]}>Rating</Text>
              </Pressable>
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
          </View>

          {earnings ? (
            <>
              <View style={styles.sectionHeadRow}>
                <Text style={[styles.sectionEyebrow, { color: palette.muted }]}>Earnings</Text>
                <Pressable
                  onPress={() => router.push("/driver/earnings")}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.viewAllBtn,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.viewAllText, { color: GOLD }]}>View all</Text>
                  <Ionicons name="chevron-forward" size={14} color={GOLD} />
                </Pressable>
              </View>
              <Pressable
                onPress={() => router.push("/driver/earnings")}
                style={({ pressed }) => [
                  styles.earningsCard,
                  { borderColor: palette.border, backgroundColor: surface },
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.earningsHeadRow}>
                  <View>
                    <Text style={[styles.earningsHeadLabel, { color: palette.muted }]}>
                      This week (Toronto)
                    </Text>
                    <Text style={[styles.earningsHeadValue, { color: palette.text }]}>
                      ${earnings.thisWeek.total.toFixed(2)}
                    </Text>
                    <Text style={[styles.earningsHeadHint, { color: palette.muted }]}>
                      {earnings.thisWeek.count} trip{earnings.thisWeek.count === 1 ? "" : "s"}
                    </Text>
                  </View>
                  <View style={styles.earningsLifetime}>
                    <Text style={[styles.earningsHeadLabel, { color: palette.muted }]}>
                      Lifetime
                    </Text>
                    <Text style={[styles.earningsHeadValue, { color: GOLD }]}>
                      ${earnings.lifetime.total.toFixed(2)}
                    </Text>
                  </View>
                </View>

                <View style={[styles.earningsDivider, { backgroundColor: palette.border }]} />

                <View style={styles.earningsRow}>
                  <View style={styles.earningsPillWrap}>
                    <View
                      style={[
                        styles.earningsPill,
                        { backgroundColor: "rgba(212,160,74,0.14)" },
                      ]}
                    >
                      <Text style={[styles.earningsPillLabel, { color: GOLD }]}>
                        Owed to you
                      </Text>
                      <Text style={[styles.earningsPillValue, { color: GOLD }]}>
                        ${earnings.pending.total.toFixed(2)}
                      </Text>
                      <Text style={[styles.earningsPillHint, { color: palette.muted }]}>
                        {earnings.pending.count} pending
                      </Text>
                    </View>
                  </View>
                  <View style={styles.earningsPillWrap}>
                    <View
                      style={[
                        styles.earningsPill,
                        { backgroundColor: "rgba(52,199,89,0.12)" },
                      ]}
                    >
                      <Text style={[styles.earningsPillLabel, { color: "#34C759" }]}>Paid</Text>
                      <Text style={[styles.earningsPillValue, { color: "#34C759" }]}>
                        ${earnings.paid.total.toFixed(2)}
                      </Text>
                      <Text style={[styles.earningsPillHint, { color: palette.muted }]}>
                        {earnings.paid.count} batches
                      </Text>
                    </View>
                  </View>
                </View>

                {(earnings.held.count > 0 ||
                  earnings.remittanceOwed.count > 0 ||
                  (earnings.adjustments && earnings.adjustments.net !== 0)) ? (
                  <View style={styles.earningsFooterRow}>
                    {earnings.held.count > 0 ? (
                      <Text style={[styles.earningsFooterText, { color: "#FF9F0A" }]}>
                        {earnings.held.count} on hold · ${earnings.held.total.toFixed(2)}
                      </Text>
                    ) : null}
                    {earnings.remittanceOwed.count > 0 ? (
                      <Text style={[styles.earningsFooterText, { color: palette.muted }]}>
                        You owe company ${earnings.remittanceOwed.total.toFixed(2)} (COD)
                      </Text>
                    ) : null}
                    {earnings.adjustments && earnings.adjustments.net !== 0 ? (
                      <Text
                        style={[
                          styles.earningsFooterText,
                          {
                            color:
                              earnings.adjustments.net > 0 ? "#34C759" : "#FF453A",
                          },
                        ]}
                      >
                        Adjustments {earnings.adjustments.net > 0 ? "+" : "−"}$
                        {Math.abs(earnings.adjustments.net).toFixed(2)}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </Pressable>
            </>
          ) : null}

          <Text style={[styles.sectionEyebrow, { color: palette.muted }]}>Details</Text>
          <View
            style={[
              styles.infoCard,
              {
                borderColor: palette.border,
                backgroundColor: surface,
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
                  <View
                    style={[
                      styles.infoIcon,
                      {
                        backgroundColor: row.verified
                          ? "rgba(22,163,74,0.12)"
                          : palette.metaChipBg,
                      },
                    ]}
                  >
                    <Ionicons
                      name={row.icon}
                      size={15}
                      color={row.verified ? "#16A34A" : GOLD}
                    />
                  </View>
                  <Text style={[styles.infoLabel, { color: palette.muted }]}>{row.label}</Text>
                </View>
                {row.verified ? (
                  <View style={styles.verifiedBadge} accessibilityLabel="Verified driver">
                    <LinearGradient
                      colors={["#22C55E", "#15803D"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.verifiedTickRing}
                    >
                      <View style={styles.verifiedTickInner}>
                        <Ionicons name="checkmark" size={14} color="#15803D" />
                      </View>
                    </LinearGradient>
                  </View>
                ) : (
                  <Text style={[styles.infoValue, { color: palette.text }]} numberOfLines={1}>
                    {row.value}
                  </Text>
                )}
              </View>
            ))}
          </View>

          <Text style={[styles.sectionEyebrow, { color: palette.muted }]}>Account</Text>
          <View style={styles.menuList}>
            <MenuRow
              label="Customer reviews"
              icon="star-outline"
              onPress={() => router.push("/driver/reviews")}
              chevronColor={palette.menuChevron}
              textColor={palette.text}
              borderColor={palette.border}
              surface={surface}
            />
            <MenuRow
              label={connectBusy ? "Opening Stripe…" : "Bank / Payouts"}
              icon="card-outline"
              hint={bankHint}
              onPress={connectBusy ? undefined : handleBankPress}
              chevronColor={palette.menuChevron}
              textColor={palette.text}
              borderColor={palette.border}
              surface={surface}
            />
            <MenuRow
              label="Dark mode"
              icon={isDark ? "moon-outline" : "sunny-outline"}
              hint={isDark ? "On" : "Off"}
              chevronColor={palette.menuChevron}
              textColor={palette.text}
              borderColor={palette.border}
              surface={surface}
              right={
                <Switch
                  value={isDark}
                  onValueChange={(v) => setThemeMode(v ? "dark" : "light")}
                  trackColor={{
                    false: isDark ? "rgba(255,255,255,0.18)" : "#D1CDC4",
                    true: isDark ? GOLD : "#1C1916",
                  }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor={isDark ? "rgba(255,255,255,0.18)" : "#D1CDC4"}
                  accessibilityLabel="Dark mode"
                />
              }
            />
          </View>

          <Text style={[styles.sectionEyebrow, { color: palette.muted }]}>Support</Text>
          <View style={styles.menuList}>
            <MenuRow
              label="Privacy Policy"
              icon="shield-checkmark-outline"
              onPress={() =>
                router.push({
                  pathname: "/legal-doc",
                  params: { doc: "privacy", from: "driver" },
                })
              }
              chevronColor={palette.menuChevron}
              textColor={palette.text}
              borderColor={palette.border}
              surface={surface}
            />
            <MenuRow
              label="Terms & Conditions"
              icon="document-outline"
              onPress={() =>
                router.push({
                  pathname: "/legal-doc",
                  params: { doc: "terms", from: "driver" },
                })
              }
              chevronColor={palette.menuChevron}
              textColor={palette.text}
              borderColor={palette.border}
              surface={surface}
            />
            <MenuRow
              label="Contact Us"
              icon="mail-outline"
              onPress={() => router.push("/driver/contact-us")}
              chevronColor={palette.menuChevron}
              textColor={palette.text}
              borderColor={palette.border}
              surface={surface}
            />
            <MenuRow
              label="Logout"
              icon="log-out-outline"
              onPress={handleLogout}
              danger
              chevronColor={palette.menuChevron}
              textColor={palette.text}
              borderColor={palette.border}
              surface={surface}
            />
          </View>
        </ScrollView>
    </DriverScreenShell>
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
    paddingTop: 10,
    paddingBottom: 110,
  },
  header: {
    marginBottom: 18,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
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
    marginBottom: 18,
  },
  verifiedBadge: {
    alignItems: "center",
    justifyContent: "center",
  },
  verifiedTickRing: {
    width: 28,
    height: 28,
    borderRadius: 14,
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#15803D",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.28,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  verifiedTickInner: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
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
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: -0.1,
    marginBottom: 10,
    marginLeft: 2,
    marginTop: 8,
  },
  sectionHeadRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 10,
    marginLeft: 2,
  },
  viewAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: -0.1,
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
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  menuCopy: {
    flex: 1,
    minWidth: 0,
  },
  menuHint: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "500",
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
    fontSize: 15,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },
  earningsCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 22,
    borderWidth: StyleSheet.hairlineWidth,
  },
  earningsHeadRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  earningsLifetime: {
    alignItems: "flex-end",
  },
  earningsHeadLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  earningsHeadValue: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.6,
  },
  earningsHeadHint: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: "500",
  },
  earningsDivider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 14,
  },
  earningsRow: {
    flexDirection: "row",
    gap: 10,
  },
  earningsPillWrap: {
    flex: 1,
  },
  earningsPill: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  earningsPillLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  earningsPillValue: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  earningsPillHint: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
  earningsFooterRow: {
    marginTop: 12,
    gap: 4,
  },
  earningsFooterText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
