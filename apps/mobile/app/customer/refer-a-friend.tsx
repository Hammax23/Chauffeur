import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Pressable,
  Platform,
  Share,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCustomerTheme } from "../../contexts/CustomerThemeContext";
import { getReferralStatus, type ReferralProgress } from "../../services/api";
import { SlimSpinner } from "../../components/SlimSpinner";
import { GOLD } from "../../theme/driver-theme";

export default function ReferAFriendScreen() {
  const { palette } = useCustomerTheme();
  const cardBlur = Platform.OS === "ios" ? 36 : 22;
  const [referral, setReferral] = useState<ReferralProgress | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getReferralStatus();
      if (data.success && data.referral) {
        setReferral(data.referral);
      }
    } catch {
      /* soft fail */
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const amount = referral?.rewardAmount ?? 20;

  const shareReferral = async () => {
    if (!referral) return;
    const link = referral.shareUrl || "https://sarjworldwide.ca";
    try {
      await Share.share({
        message: `Join me on SARJ Worldwide for luxury chauffeur rides. ${link}`,
      });
    } catch {
      /* ignore */
    }
  };

  const copyReferralCode = async () => {
    if (!referral?.referralCode) {
      Alert.alert(
        "Invite code",
        "Your personal code isn’t ready yet. Pull to refresh or try again shortly."
      );
      return;
    }
    try {
      await Share.share({ message: referral.referralCode });
    } catch {
      Alert.alert("Your code", referral.referralCode);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: palette.root }]}>
      <StatusBar barStyle={palette.statusBar} backgroundColor={palette.root} />
      <LinearGradient colors={[...palette.bg]} style={StyleSheet.absoluteFill} />
      <View style={styles.ambientGlow} pointerEvents="none">
        <LinearGradient
          colors={[...palette.glow]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.85, y: 0.45 }}
        />
      </View>

      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={22} color={palette.text} />
          </Pressable>
          <Text style={[styles.topTitle, { color: palette.text }]}>Refer a friend</Text>
          <View style={{ width: 40 }} />
        </View>

        {loading && !referral ? (
          <View style={styles.centered}>
            <SlimSpinner size={32} stroke={2} color={GOLD} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <BlurView
              intensity={cardBlur}
              tint={palette.blurTint}
              style={[
                styles.heroCard,
                {
                  borderColor: palette.border,
                  backgroundColor:
                    Platform.OS === "android" ? palette.cardAndroid : "transparent",
                },
              ]}
            >
              <View style={[styles.heroIcon, { backgroundColor: palette.hintBg, borderColor: palette.hintBorder }]}>
                <Text style={styles.heroLetter}>R</Text>
              </View>
              <Text style={styles.heroEyebrow}>REFERRAL</Text>
              <Text style={[styles.heroTitle, { color: palette.text }]}>
                Give ${amount.toFixed(0)}, get ${amount.toFixed(0)}
              </Text>
              <Text style={[styles.heroBody, { color: palette.muted }]}>
                Invite friends to SARJ Worldwide. When two friends each complete their first
                paid ride, you unlock a one-time ${amount.toFixed(0)} off.
              </Text>
            </BlurView>

            <BlurView
              intensity={cardBlur}
              tint={palette.blurTint}
              style={[
                styles.card,
                {
                  borderColor: palette.border,
                  backgroundColor:
                    Platform.OS === "android" ? palette.cardAndroid : "transparent",
                },
              ]}
            >
              <Text style={[styles.sectionLabel, { color: GOLD }]}>PROGRESS</Text>
              <View style={styles.progressRow}>
                <Text style={[styles.progressText, { color: palette.text }]}>
                  {Math.min(referral?.qualifiedCount ?? 0, referral?.qualifyNeeded ?? 2)}/
                  {referral?.qualifyNeeded ?? 2} qualified
                  {(referral?.pendingCount ?? 0) > 0
                    ? ` · ${referral?.pendingCount} pending`
                    : ""}
                </Text>
                {referral?.rewardAvailable ? (
                  <Text style={styles.readyPill}>${amount.toFixed(0)} ready</Text>
                ) : referral?.rewardStatus === "REDEEMED" ? (
                  <Text style={[styles.readyPill, { color: palette.muted }]}>Used</Text>
                ) : null}
              </View>
            </BlurView>

            <BlurView
              intensity={cardBlur}
              tint={palette.blurTint}
              style={[
                styles.card,
                {
                  borderColor: palette.border,
                  backgroundColor:
                    Platform.OS === "android" ? palette.cardAndroid : "transparent",
                },
              ]}
            >
              <Text style={[styles.sectionLabel, { color: GOLD }]}>YOUR CODE</Text>
              <View style={styles.codeRow}>
                <Text style={styles.codeText}>
                  {referral?.referralCode || (loading ? "Loading…" : "Unavailable")}
                </Text>
                {referral?.referralCode ? (
                  <Pressable
                    onPress={() => void copyReferralCode()}
                    style={({ pressed }) => [styles.copyBtn, pressed && styles.pressed]}
                    hitSlop={6}
                  >
                    <Ionicons name="copy-outline" size={16} color={GOLD} />
                    <Text style={styles.copyText}>Copy</Text>
                  </Pressable>
                ) : null}
              </View>
              {!referral?.referralCode && !loading ? (
                <Text style={[styles.hint, { color: palette.muted }]}>
                  Personal code will appear after the referral update is applied on the server.
                </Text>
              ) : null}
            </BlurView>

            <Pressable
              onPress={() => void shareReferral()}
              style={({ pressed }) => [styles.shareBtn, pressed && styles.pressed]}
            >
              <LinearGradient
                colors={["#E8C078", GOLD, "#B8862E"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.shareGradient}
              >
                <Ionicons name="share-outline" size={18} color="#1A1208" />
                <Text style={styles.shareText}>Share invite</Text>
              </LinearGradient>
            </Pressable>

            <Text style={[styles.footnote, { color: palette.muted }]}>
              Credit applies automatically at checkout once unlocked. One reward per account.
            </Text>
          </ScrollView>
        )}
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
    height: 220,
  },
  safe: { flex: 1, backgroundColor: "transparent" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 40,
    gap: 14,
  },
  heroCard: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    alignItems: "center",
    overflow: "hidden",
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  heroLetter: {
    fontSize: 22,
    fontWeight: "800",
    color: GOLD,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: GOLD,
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
    textAlign: "center",
    marginBottom: 8,
  },
  heroBody: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  card: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    overflow: "hidden",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  progressText: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  readyPill: {
    fontSize: 12,
    fontWeight: "800",
    color: "#34C759",
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  codeText: {
    flex: 1,
    fontSize: 22,
    fontWeight: "800",
    color: GOLD,
    letterSpacing: 1.5,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  copyText: {
    fontSize: 13,
    fontWeight: "700",
    color: GOLD,
  },
  hint: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
  },
  shareBtn: {
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 4,
  },
  shareGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  shareText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1A1208",
  },
  footnote: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  pressed: { opacity: 0.85 },
});
