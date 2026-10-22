import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDriverTheme } from "../../contexts/DriverThemeContext";
import { GOLD } from "../../theme/driver-theme";

type Props = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
};

export function DriverEmptyState({
  icon = "car-outline",
  title,
  subtitle,
}: Props) {
  const { palette } = useDriverTheme();

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: palette.softFill,
          borderColor: palette.border,
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: palette.metaChipBg }]}>
        <Ionicons name={icon} size={26} color={GOLD} />
      </View>
      <Text style={[styles.title, { color: palette.emptyTitle }]}>{title}</Text>
      <Text style={[styles.sub, { color: palette.muted }]}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 12,
    paddingVertical: 36,
    paddingHorizontal: 28,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  sub: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    fontWeight: "500",
  },
});
