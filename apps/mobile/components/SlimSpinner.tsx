import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View, type ViewStyle } from "react-native";
import { GOLD } from "../theme/driver-theme";

type SlimSpinnerProps = {
  size?: number;
  color?: string;
  stroke?: number;
  style?: ViewStyle;
};

/** Thin, fast arc spinner — sleek process vibe. */
export function SlimSpinner({
  size = 28,
  color = GOLD,
  stroke = 2,
  style,
}: SlimSpinnerProps) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 650,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={[styles.wrap, { width: size, height: size }, style]} accessibilityRole="progressbar">
      {/* Soft track */}
      <View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: stroke,
            borderColor: `${color}22`,
          },
        ]}
      />
      {/* Fast arc */}
      <Animated.View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: stroke,
            borderTopColor: color,
            borderRightColor: `${color}55`,
            borderBottomColor: "transparent",
            borderLeftColor: "transparent",
            transform: [{ rotate }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    borderColor: "transparent",
  },
});
