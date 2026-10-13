/**
 * Legacy Home service cards (Book a Ride hero + Send a Parcel row).
 * Restore by setting HOME_SERVICES_STYLE = "legacy" in index.tsx.
 */
import { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Animated,
  Easing,
  Pressable,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

/**
 * PRIMARY service surface — the hero of the Home sheet.
 *
 * SARJ DNA: a deep ink plane (the black chauffeur sedan) lifted off the cream
 * sheet, warmed by a single top-right gold sun-glow, a gold-ringed car medallion,
 * and a decisive gold action disc. On mount / focus a soft diagonal sheen sweeps
 * the plane once.
 */
export function PrimaryRideCard({
  isDark,
  isCompact,
  entrance,
  onPress,
}: {
  isDark: boolean;
  isCompact: boolean;
  entrance: Animated.Value;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const sheen = useRef(new Animated.Value(0)).current;
  const [cardW, setCardW] = useState(0);

  const runSheen = useCallback(() => {
    sheen.setValue(0);
    Animated.timing(sheen, {
      toValue: 1,
      duration: 1150,
      delay: 460,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [sheen]);
  useFocusEffect(useCallback(() => runSheen(), [runSheen]));

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.972, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 38, bounciness: 7 }).start();

  const translateY = entrance.interpolate({ inputRange: [0, 1], outputRange: [20, 0] });
  const sheenX = sheen.interpolate({
    inputRange: [0, 1],
    outputRange: [-cardW * 0.7, cardW * 1.2],
  });

  const medallion = isCompact ? 38 : 40;
  const action = isCompact ? 38 : 40;
  const glassBorder = isDark ? "rgba(232,192,120,0.28)" : "rgba(232,192,120,0.32)";

  return (
    <Animated.View style={{ opacity: entrance, transform: [{ translateY }, { scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onLayout={(e) => setCardW(e.nativeEvent.layout.width)}
        accessibilityRole="button"
        accessibilityLabel="Book a ride"
        style={[styles.primaryShadow, { shadowColor: isDark ? "#000" : "#5A4018" }]}
      >
        <View
          style={[
            styles.primaryCard,
            { borderColor: glassBorder },
            isCompact && { paddingVertical: 11, paddingHorizontal: 12 },
          ]}
        >
          {Platform.OS === "ios" ? (
            <BlurView
              intensity={isDark ? 56 : 60}
              tint="systemThickMaterialDark"
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
          ) : null}
          <LinearGradient
            colors={
              isDark
                ? ["rgba(22,15,10,0.94)", "rgba(8,6,4,0.98)"]
                : ["rgba(28,20,12,0.96)", "rgba(12,8,5,0.98)"]
            }
            start={{ x: 0.05, y: 0 }}
            end={{ x: 0.95, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <LinearGradient
            colors={["rgba(255,255,255,0.08)", "transparent"]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.primaryGlassSpec}
            pointerEvents="none"
          />
          <LinearGradient
            colors={["rgba(232,192,120,0.16)", "transparent"]}
            start={{ x: 1, y: 0 }}
            end={{ x: 0.35, y: 0.9 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <Animated.View
            style={[styles.primarySheen, { transform: [{ translateX: sheenX }, { skewX: "-18deg" }] }]}
            pointerEvents="none"
          >
            <LinearGradient
              colors={["transparent", "rgba(255,246,228,0.10)", "transparent"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ flex: 1 }}
            />
          </Animated.View>

          <View style={styles.primaryRow}>
            <View
              style={[
                styles.primaryMedallion,
                { width: medallion, height: medallion, borderRadius: medallion / 2 },
              ]}
            >
              <Ionicons name="car-sport" size={isCompact ? 18 : 19} color="#F0D28C" />
            </View>

            <View style={styles.primaryCopy}>
              <Text style={[styles.primaryTitle, isCompact && { fontSize: 17 }]} numberOfLines={1}>
                Book a Ride
              </Text>
              <Text style={styles.primarySub} numberOfLines={1}>
                Airport · hourly · city
              </Text>
            </View>

            <View style={[styles.primaryAction, { width: action, height: action, borderRadius: action / 2 }]}>
              <LinearGradient
                colors={["#F2D493", "#E8C078", "#C9A063"]}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={styles.primaryActionGrad}
              >
                <Ionicons name="arrow-forward" size={isCompact ? 17 : 18} color="#1A1208" />
              </LinearGradient>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

/**
 * SECONDARY service surface — deliberately quiet parcel row.
 */
export function SecondaryParcelRow({
  isDark,
  entrance,
  onPress,
}: {
  isDark: boolean;
  entrance: Animated.Value;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.985, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 38, bounciness: 6 }).start();

  const translateY = entrance.interpolate({ inputRange: [0, 1], outputRange: [20, 0] });

  const bg = isDark ? "#1C1813" : "#E8E0D4";
  const border = isDark ? "rgba(232,192,120,0.18)" : "rgba(26,21,16,0.12)";
  const iconBg = isDark ? "rgba(232,192,120,0.12)" : "rgba(184,134,46,0.14)";
  const titleColor = isDark ? "#F0E8DA" : "#1F1810";
  const subColor = isDark ? "rgba(240,232,218,0.5)" : "rgba(31,24,16,0.55)";
  const mark = isDark ? "#D4B078" : "#A67C2E";
  const chevronBg = isDark ? "rgba(232,192,120,0.12)" : "rgba(184,134,46,0.12)";

  return (
    <Animated.View style={{ opacity: entrance, transform: [{ translateY }, { scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel="Send a parcel"
        style={[styles.secondaryRow, { backgroundColor: bg, borderColor: border }]}
      >
        <View style={[styles.secondaryIcon, { backgroundColor: iconBg }]}>
          <Ionicons name="cube-outline" size={17} color={mark} />
        </View>
        <View style={styles.secondaryCopy}>
          <Text style={[styles.secondaryTitle, { color: titleColor }]} numberOfLines={1}>
            Send a Parcel
          </Text>
          <Text style={[styles.secondarySub, { color: subColor }]} numberOfLines={1}>
            Same-day chauffeured delivery
          </Text>
        </View>
        <View style={[styles.secondaryChevron, { backgroundColor: chevronBg }]}>
          <Ionicons name="chevron-forward" size={16} color={mark} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  primaryShadow: {
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.22,
        shadowRadius: 14,
      },
      android: { elevation: 5 },
    }),
  },
  primaryCard: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 13,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: "#100C08",
  },
  primaryGlassSpec: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: "42%",
  },
  primarySheen: {
    position: "absolute",
    top: -16,
    bottom: -16,
    width: 72,
    left: 0,
  },
  primaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  primaryMedallion: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(232,192,120,0.14)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(232,192,120,0.45)",
  },
  primaryCopy: {
    flex: 1,
    minWidth: 0,
  },
  primaryTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.4,
    color: "#F7F1E6",
  },
  primarySub: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: -0.1,
    color: "rgba(247,241,230,0.58)",
  },
  primaryAction: {
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#C9A063",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.45,
        shadowRadius: 7,
      },
      android: { elevation: 3 },
    }),
  },
  primaryActionGrad: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    minHeight: 56,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  secondaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryCopy: {
    flex: 1,
    minWidth: 0,
  },
  secondaryTitle: {
    fontSize: 15.5,
    fontWeight: "700",
    letterSpacing: -0.25,
  },
  secondarySub: {
    marginTop: 1,
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: -0.05,
  },
  secondaryChevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
