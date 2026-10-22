import { type ReactNode } from "react";
import { View, StyleSheet, StatusBar, type ViewStyle, type StyleProp } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useDriverTheme } from "../../contexts/DriverThemeContext";

type Props = {
  children: ReactNode;
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  /** Skip ambient gold glow (e.g. dense lists). */
  hideGlow?: boolean;
};

export function DriverScreenShell({
  children,
  edges = ["top"],
  style,
  contentStyle,
  hideGlow = false,
}: Props) {
  const { palette } = useDriverTheme();

  return (
    <View style={[styles.root, { backgroundColor: palette.root }, style]}>
      <StatusBar barStyle={palette.statusBar} backgroundColor={palette.root} />
      <LinearGradient colors={[...palette.bg]} style={StyleSheet.absoluteFill} />
      {!hideGlow ? (
        <View style={styles.ambientGlow} pointerEvents="none">
          <LinearGradient
            colors={[...palette.glow]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.9, y: 0.55 }}
          />
        </View>
      ) : null}
      <SafeAreaView style={[styles.safe, contentStyle]} edges={edges}>
        {children}
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
    height: 240,
  },
  safe: { flex: 1, backgroundColor: "transparent" },
});
