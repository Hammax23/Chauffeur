import { type ReactNode } from "react";
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDriverTheme } from "../../contexts/DriverThemeContext";
import { GOLD } from "../../theme/driver-theme";

type PrimaryProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
};

export function DriverPrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  icon,
  style,
}: PrimaryProps) {
  const { palette } = useDriverTheme();
  const busy = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={({ pressed }) => [
        styles.primary,
        {
          backgroundColor: palette.primaryBtn,
          opacity: busy ? 0.5 : pressed ? 0.92 : 1,
        },
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator color={palette.primaryBtnText} />
      ) : (
        <>
          <Text style={[styles.primaryText, { color: palette.primaryBtnText }]}>{label}</Text>
          {icon ? (
            <Ionicons
              name={icon}
              size={18}
              color={palette.primaryBtnText}
              style={{ marginLeft: 6 }}
            />
          ) : null}
        </>
      )}
    </Pressable>
  );
}

type GhostProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

export function DriverGhostButton({
  label,
  onPress,
  disabled,
  danger,
  style,
}: GhostProps) {
  const { palette } = useDriverTheme();
  const color = danger ? palette.danger : palette.rejectText;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.ghost,
        {
          borderColor: danger ? "rgba(255,69,58,0.35)" : palette.rejectBorder,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        },
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={[styles.ghostText, { color }]}>{label}</Text>
    </Pressable>
  );
}

/** Gold solid CTA for light mode parity with marketing buttons. */
export function DriverGoldButton({
  label,
  onPress,
  disabled,
  loading,
  icon,
  style,
}: PrimaryProps) {
  const busy = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={({ pressed }) => [
        styles.primary,
        {
          backgroundColor: GOLD,
          opacity: busy ? 0.5 : pressed ? 0.92 : 1,
        },
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator color="#1A1208" />
      ) : (
        <>
          <Text style={[styles.primaryText, { color: "#1A1208" }]}>{label}</Text>
          {icon ? (
            <Ionicons name={icon} size={18} color="#1A1208" style={{ marginLeft: 6 }} />
          ) : null}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primary: {
    minHeight: 52,
    borderRadius: 14,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  primaryText: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  ghost: {
    minHeight: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth * 2,
    flex: 1,
  },
  ghostText: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
});
