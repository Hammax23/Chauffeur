import { View, Text, StyleSheet } from "react-native";
import { GOLD } from "../theme/driver-theme";

type Props = {
  isDark?: boolean;
  /** Slightly denser for tight list rows */
  compact?: boolean;
};

/**
 * Quiet enterprise VIP mark — gold outline, no glow/pills stack.
 */
export function VipFleetBadge({ isDark = false, compact = false }: Props) {
  return (
    <View
      style={[
        styles.badge,
        compact && styles.badgeCompact,
        {
          borderColor: isDark ? "rgba(232,192,120,0.55)" : "rgba(168,120,48,0.45)",
          backgroundColor: isDark ? "rgba(201,160,99,0.14)" : "rgba(201,160,99,0.1)",
        },
      ]}
      accessibilityLabel="VIP"
    >
      <Text
        style={[
          styles.text,
          compact && styles.textCompact,
          { color: isDark ? "#E8C078" : "#8B6914" },
        ]}
      >
        VIP
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexShrink: 0,
  },
  badgeCompact: {
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  text: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.9,
    color: GOLD,
  },
  textCompact: {
    fontSize: 9,
    letterSpacing: 0.8,
  },
});
