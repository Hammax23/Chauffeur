import { useEffect, useMemo, useRef } from "react";
import { useLocalSearchParams, useNavigation } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Pressable,
  Animated,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useCustomerTheme } from "../../contexts/CustomerThemeContext";
import { GOLD, type DriverPalette } from "../../theme/driver-theme";
import {
  resetToBookingsTab,
  resetToTripDetail,
} from "../../utils/booking-nav-reset";

function qp(v: string | string[] | undefined): string {
  if (v == null) return "";
  return Array.isArray(v) ? String(v[0] ?? "") : String(v);
}

export default function ReservationConfirmedScreen() {
  const navigation = useNavigation();
  const { palette, isDark } = useCustomerTheme();
  const styles = useMemo(() => makeStyles(palette, isDark), [palette, isDark]);
  const raw = useLocalSearchParams();
  const bookingId = qp(raw.bookingId);

  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(18)).current;
  const checkScale = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 420, useNativeDriver: true }),
      Animated.spring(checkScale, {
        toValue: 1,
        friction: 6,
        tension: 90,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, rise, checkScale]);

  const goBookings = () => {
    resetToBookingsTab(navigation);
  };

  const goTripDetail = () => {
    if (!bookingId) {
      goBookings();
      return;
    }
    resetToTripDetail(navigation, bookingId);
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
          end={{ x: 0.85, y: 0.55 }}
        />
      </View>

      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <Animated.View
          style={[
            styles.content,
            { opacity: fade, transform: [{ translateY: rise }] },
          ]}
        >
          <Animated.View style={{ transform: [{ scale: checkScale }] }}>
            <View style={styles.badgeOuter}>
              <LinearGradient
                colors={
                  isDark
                    ? ["rgba(232,192,120,0.28)", "rgba(212,160,74,0.08)"]
                    : ["rgba(232,192,120,0.45)", "rgba(212,160,74,0.16)"]
                }
                style={styles.badgeRing}
              >
                <LinearGradient
                  colors={["#E8C078", GOLD, "#B8862E"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.badgeInner}
                >
                  <Ionicons name="checkmark" size={42} color="#1A1208" />
                </LinearGradient>
              </LinearGradient>
            </View>
          </Animated.View>

          <Text style={styles.eyebrow}>YOU'RE ALL SET</Text>
          <Text style={styles.title}>Reservation confirmed</Text>
          <Text style={styles.subtitle}>
            Your ride is booked. We’ll notify you as soon as a chauffeur is assigned.
          </Text>

          {bookingId ? (
            <View style={styles.idChip}>
              <Text style={styles.idLabel}>BOOKING ID</Text>
              <Text style={styles.idValue} numberOfLines={1}>
                {bookingId}
              </Text>
            </View>
          ) : null}

          <View style={styles.tipsCard}>
            <View style={styles.tipRow}>
              <View style={styles.tipIcon}>
                <Ionicons name="notifications-outline" size={16} color={GOLD} />
              </View>
              <Text style={styles.tipText}>
                Push updates when your chauffeur is on the way
              </Text>
            </View>
            <View style={[styles.tipDivider, { backgroundColor: palette.border }]} />
            <View style={styles.tipRow}>
              <View style={styles.tipIcon}>
                <Ionicons name="calendar-outline" size={16} color={GOLD} />
              </View>
              <Text style={styles.tipText}>Find this trip anytime under Bookings</Text>
            </View>
          </View>
        </Animated.View>

        <View style={styles.bottom}>
          {bookingId ? (
            <Pressable
              onPress={goTripDetail}
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryBtnText}>View booking</Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={goBookings}
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          >
            <LinearGradient
              colors={["#E8C078", GOLD, "#B8862E"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryGradient}
            >
              <Text style={styles.primaryBtnText}>Got it</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

function makeStyles(palette: DriverPalette, isDark: boolean) {
  const card = isDark ? "rgba(28,28,30,0.88)" : "rgba(255,255,255,0.88)";
  return StyleSheet.create({
    root: { flex: 1 },
    ambientGlow: {
      position: "absolute",
      top: -60,
      left: -30,
      right: -30,
      height: 320,
    },
    safe: { flex: 1, backgroundColor: "transparent" },
    content: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 28,
    },
    badgeOuter: {
      marginBottom: 28,
    },
    badgeRing: {
      width: 112,
      height: 112,
      borderRadius: 56,
      alignItems: "center",
      justifyContent: "center",
    },
    badgeInner: {
      width: 84,
      height: 84,
      borderRadius: 42,
      alignItems: "center",
      justifyContent: "center",
      ...Platform.select({
        ios: {
          shadowColor: GOLD,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.35,
          shadowRadius: 16,
        },
        android: { elevation: 6 },
      }),
    },
    eyebrow: {
      fontSize: 11,
      fontWeight: "800",
      color: isDark ? GOLD : palette.hintBold,
      letterSpacing: 1.6,
      marginBottom: 8,
    },
    title: {
      fontSize: 28,
      fontWeight: "800",
      letterSpacing: -0.6,
      textAlign: "center",
      marginBottom: 10,
      color: palette.text,
    },
    subtitle: {
      fontSize: 15,
      fontWeight: "500",
      textAlign: "center",
      lineHeight: 22,
      maxWidth: 320,
      color: palette.muted,
    },
    idChip: {
      marginTop: 22,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: isDark ? "rgba(212,160,74,0.35)" : palette.hintBorder,
      backgroundColor: isDark ? "rgba(212,160,74,0.12)" : palette.hintBg,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: "center",
      minWidth: 220,
      gap: 4,
    },
    idLabel: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 1.2,
      color: palette.muted,
    },
    idValue: {
      fontSize: 14,
      fontWeight: "800",
      color: isDark ? GOLD : palette.hintBold,
      letterSpacing: 0.4,
    },
    tipsCard: {
      marginTop: 28,
      alignSelf: "stretch",
      maxWidth: 340,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: palette.border,
      backgroundColor: card,
      paddingHorizontal: 14,
      paddingVertical: 6,
    },
    tipRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 12,
    },
    tipIcon: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "rgba(212,160,74,0.14)" : "rgba(212,160,74,0.12)",
    },
    tipDivider: {
      height: StyleSheet.hairlineWidth,
      marginLeft: 44,
    },
    tipText: {
      flex: 1,
      fontSize: 13,
      fontWeight: "500",
      lineHeight: 18,
      color: palette.muted,
    },
    bottom: {
      paddingHorizontal: 20,
      paddingBottom: Platform.OS === "ios" ? 8 : 20,
      gap: 10,
    },
    secondaryBtn: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: palette.border,
      backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
      paddingVertical: 15,
      borderRadius: 14,
      alignItems: "center",
    },
    secondaryBtnText: {
      fontSize: 16,
      fontWeight: "700",
      color: palette.text,
    },
    primaryBtn: {
      borderRadius: 14,
      overflow: "hidden",
    },
    primaryGradient: {
      paddingVertical: 16,
      alignItems: "center",
    },
    primaryBtnText: {
      fontSize: 16,
      fontWeight: "800",
      color: "#1A1208",
    },
    pressed: { opacity: 0.88 },
  });
}
