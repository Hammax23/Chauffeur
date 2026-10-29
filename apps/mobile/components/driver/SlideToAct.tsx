import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Animated,
  LayoutChangeEvent,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GOLD, DRIVER_PRIMARY_INK } from "../../theme/driver-theme";

type Props = {
  label: string;
  onComplete: () => void;
  disabled?: boolean;
  loading?: boolean;
};

const KNOB = 48;
const END_PAD = 6;

/**
 * Charcoal track + gold knob — slide ~85% to fire once.
 */
export function SlideToAct({ label, onComplete, disabled, loading }: Props) {
  const [trackW, setTrackW] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  const firedRef = useRef(false);
  const maxXRef = useRef(0);
  const busyRef = useRef(!!(disabled || loading));
  const onCompleteRef = useRef(onComplete);
  const busy = !!(disabled || loading);

  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setTrackW(w);
    maxXRef.current = Math.max(0, w - KNOB - END_PAD * 2);
  };

  const reset = () => {
    firedRef.current = false;
    Animated.spring(x, {
      toValue: 0,
      useNativeDriver: false,
      bounciness: 6,
    }).start();
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !busyRef.current,
      onMoveShouldSetPanResponder: () => !busyRef.current,
      onPanResponderGrant: () => {
        firedRef.current = false;
      },
      onPanResponderMove: (_, g) => {
        if (busyRef.current) return;
        const max = maxXRef.current;
        const next = Math.min(max, Math.max(0, g.dx));
        x.setValue(next);
      },
      onPanResponderRelease: (_, g) => {
        if (busyRef.current) {
          reset();
          return;
        }
        const max = maxXRef.current;
        const next = Math.min(max, Math.max(0, g.dx));
        if (max > 0 && next >= max * 0.85 && !firedRef.current) {
          firedRef.current = true;
          Animated.timing(x, {
            toValue: max,
            duration: 100,
            useNativeDriver: false,
          }).start(() => {
            onCompleteRef.current();
            setTimeout(reset, 350);
          });
          return;
        }
        reset();
      },
      onPanResponderTerminate: reset,
    })
  ).current;

  return (
    <View
      style={[styles.track, busy && styles.trackDisabled]}
      onLayout={onLayout}
      accessibilityRole="adjustable"
      accessibilityLabel={label}
    >
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      {loading ? (
        <View style={styles.knob}>
          <ActivityIndicator color={DRIVER_PRIMARY_INK} />
        </View>
      ) : (
        <Animated.View
          style={[styles.knob, { transform: [{ translateX: x }] }]}
          {...pan.panHandlers}
        >
          <Ionicons name="arrow-forward" size={22} color={DRIVER_PRIMARY_INK} />
        </Animated.View>
      )}
      {trackW <= 0 ? null : null}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 58,
    borderRadius: 29,
    backgroundColor: "#1C1C1E",
    justifyContent: "center",
    overflow: "hidden",
    paddingHorizontal: END_PAD,
  },
  trackDisabled: { opacity: 0.55 },
  label: {
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
    paddingLeft: KNOB,
  },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
  },
});
