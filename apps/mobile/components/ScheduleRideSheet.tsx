import { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { GOLD } from "../theme/driver-theme";

const CREAM = "#F5F2EA";
const INK = "#1C1916";
const MUTED = "#6B6560";
const ACCENT_DARK = "#A87830";

type Props = {
  visible: boolean;
  value: Date;
  minimumDate?: Date;
  onClose: () => void;
  onConfirm: (date: Date) => void;
  isDark?: boolean;
};

function formatHeadlineDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** 12-hour with AM/PM so pickup time is unambiguous for customers. */
function formatHeadlineTime(d: Date): string {
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Enterprise schedule sheet — native OS date/time wheels via
 * `@react-native-community/datetimepicker` (same stack as Expo / RN docs).
 */
export function ScheduleRideSheet({
  visible,
  value,
  minimumDate,
  onClose,
  onConfirm,
  isDark = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(value);
  const [backdropArmed, setBackdropArmed] = useState(false);
  /** Android: spiners are dialogs — keep in-sheet preview + open system pickers. */
  const [androidMode, setAndroidMode] = useState<"date" | "time" | null>(null);

  useEffect(() => {
    if (visible) {
      const min = minimumDate && value.getTime() < minimumDate.getTime() ? minimumDate : value;
      setDraft(min);
      setAndroidMode(null);
    }
  }, [visible, value, minimumDate]);

  useEffect(() => {
    if (!visible) {
      setBackdropArmed(false);
      return;
    }
    setBackdropArmed(false);
    const t = setTimeout(() => setBackdropArmed(true), 700);
    return () => clearTimeout(t);
  }, [visible]);

  const textColor = isDark ? "#F5F0E8" : INK;
  const mutedColor = isDark ? "#A8A29A" : MUTED;
  const sheetBg = isDark ? "#1C1916" : "#FFFFFF";
  const infoBg = isDark ? "rgba(201,160,99,0.12)" : CREAM;
  const chipBg = isDark ? "rgba(255,255,255,0.08)" : CREAM;

  const onChange = (_e: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") {
      setAndroidMode(null);
      if (_e.type === "dismissed" || !date) return;
    }
    if (!date) return;
    const min = minimumDate;
    setDraft(min && date.getTime() < min.getTime() ? new Date(min) : date);
  };

  const confirm = () => {
    const min = minimumDate || new Date();
    const next = new Date(draft.getTime() < min.getTime() ? min : draft);
    next.setSeconds(0, 0);
    onConfirm(next);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable
          style={styles.backdrop}
          onPress={backdropArmed ? onClose : undefined}
          disabled={!backdropArmed}
          accessibilityLabel="Close"
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: sheetBg,
              paddingBottom: Math.max(insets.bottom, 12) + 8,
            },
          ]}
        >
          <View style={styles.handleWrap}>
            <View style={[styles.handle, { backgroundColor: isDark ? "#5C5348" : "#D6D0C6" }]} />
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={[
                styles.closeBtn,
                { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)" },
              ]}
              accessibilityLabel="Close schedule"
            >
              <Ionicons name="close" size={18} color={mutedColor} />
            </Pressable>
          </View>

          <Text style={[styles.title, { color: textColor }]}>Schedule a ride</Text>
          <Text style={[styles.subtitle, { color: mutedColor }]}>
            Choose when your chauffeur should arrive
          </Text>

          <View style={styles.headline}>
            <Text style={[styles.headlineDate, { color: mutedColor }]} numberOfLines={1}>
              {formatHeadlineDate(draft)}
            </Text>
            <Text style={[styles.headlineTime, { color: textColor }]}>
              {formatHeadlineTime(draft)}
            </Text>
          </View>

          {Platform.OS === "ios" ? (
            <View style={styles.iosPickerWrap}>
              <DateTimePicker
                value={draft}
                mode="datetime"
                display="spinner"
                themeVariant={isDark ? "dark" : "light"}
                minimumDate={minimumDate}
                onChange={onChange}
                locale="en_US"
                style={styles.iosPicker}
              />
            </View>
          ) : (
            <View style={styles.androidRow}>
              <Pressable
                onPress={() => setAndroidMode("date")}
                style={[styles.androidChip, { backgroundColor: chipBg }]}
              >
                <Ionicons name="calendar-outline" size={18} color={GOLD} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.androidChipLabel, { color: mutedColor }]}>Date</Text>
                  <Text
                    style={[styles.androidChipValue, { color: textColor }]}
                    numberOfLines={1}
                  >
                    {draft.toLocaleDateString("en-GB", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={mutedColor} />
              </Pressable>
              <Pressable
                onPress={() => setAndroidMode("time")}
                style={[styles.androidChip, { backgroundColor: chipBg }]}
              >
                <Ionicons name="time-outline" size={18} color={GOLD} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.androidChipLabel, { color: mutedColor }]}>Time</Text>
                  <Text style={[styles.androidChipValue, { color: textColor }]}>
                    {formatHeadlineTime(draft)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={mutedColor} />
              </Pressable>
              {androidMode ? (
                <DateTimePicker
                  value={draft}
                  mode={androidMode}
                  display="default"
                  is24Hour={false}
                  minimumDate={minimumDate}
                  onChange={onChange}
                />
              ) : null}
            </View>
          )}

          <View style={[styles.infoBox, { backgroundColor: infoBg }]}>
            <Ionicons name="information-circle-outline" size={18} color={GOLD} />
            <Text style={[styles.infoText, { color: textColor }]}>
              Your chauffeur will arrive at {formatHeadlineTime(draft)}
            </Text>
          </View>

          <Pressable
            onPress={confirm}
            style={({ pressed }) => [styles.cta, pressed && { opacity: 0.92 }]}
            accessibilityRole="button"
            accessibilityLabel="Set pickup time"
          >
            <LinearGradient
              colors={["#E8C078", GOLD, ACCENT_DARK]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaGrad}
            >
              <Text style={styles.ctaText}>Set pickup time</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: { elevation: 16 },
    }),
  },
  handleWrap: {
    alignItems: "center",
    justifyContent: "center",
    height: 36,
    marginBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  closeBtn: {
    position: "absolute",
    right: 0,
    top: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
    textAlign: "center",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 16,
  },
  headline: {
    alignItems: "center",
    marginBottom: 8,
  },
  headlineDate: {
    fontSize: 15,
    fontWeight: "600",
    paddingHorizontal: 8,
  },
  headlineTime: {
    marginTop: 4,
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: 1,
    fontVariant: ["tabular-nums"],
  },
  iosPickerWrap: {
    alignItems: "center",
    marginBottom: 8,
    minHeight: 180,
  },
  iosPicker: {
    width: "100%",
    height: 196,
  },
  androidRow: {
    gap: 10,
    marginBottom: 14,
  },
  androidChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  androidChipLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  androidChipValue: {
    fontSize: 16,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  cta: {
    borderRadius: 14,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: GOLD,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.28,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  ctaGrad: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
    color: "#1A1208",
  },
});
