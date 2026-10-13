import { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useCustomerTheme } from "../contexts/CustomerThemeContext";
import { GOLD } from "../theme/driver-theme";
import {
  type RidePrefs,
  type RideConversationPref,
  type RideTemperaturePref,
  normalizeRidePrefs,
} from "../utils/ride-prefs";

type Props = {
  visible: boolean;
  value: RidePrefs;
  onClose: () => void;
  onSave: (prefs: RidePrefs) => void;
};

const CONVO: {
  id: RideConversationPref;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { id: "quiet", label: "Quiet", icon: "volume-mute" },
  { id: "chat", label: "Happy to chat", icon: "chatbubble-ellipses" },
  { id: "none", label: "No preference", icon: "remove-circle-outline" },
];

const TEMPS: { id: RideTemperaturePref; label: string }[] = [
  { id: "cool", label: "Cool" },
  { id: "warm", label: "Warm" },
  { id: "none", label: "No preference" },
];

/**
 * Uber-style ride preferences sheet — opens only on Confirm row tap.
 * Discard on close/backdrop; commit only via Save.
 */
export function RidePreferencesSheet({ visible, value, onClose, onSave }: Props) {
  const insets = useSafeAreaInsets();
  const { palette, isDark } = useCustomerTheme();
  const [draft, setDraft] = useState<RidePrefs>(() => normalizeRidePrefs(value));

  useEffect(() => {
    if (visible) setDraft(normalizeRidePrefs(value));
  }, [visible, value]);

  const sheetBg = isDark ? "#1C1813" : "#FFFFFF";
  const chipIdle = isDark ? "rgba(255,255,255,0.06)" : "#F3EFE7";
  const chipSelectedBg = isDark ? "rgba(212,160,74,0.12)" : "#FFFFFF";
  const chipSelectedBorder = isDark ? GOLD : "#1C1916";
  const chipIdleBorder = isDark ? "rgba(255,255,255,0.08)" : "transparent";
  const segmentTrack = isDark ? "rgba(255,255,255,0.06)" : "#F3EFE7";
  const iconMuted = isDark ? palette.muted : "#6B6560";
  const iconActive = isDark ? GOLD : "#1C1916";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Dismiss" />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: sheetBg,
              paddingBottom: Math.max(insets.bottom, 16) + 8,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: palette.border }]} />

          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={[styles.title, { color: palette.text }]}>Ride preferences</Text>
              <Text style={[styles.subtitle, { color: palette.muted }]}>
                Your chauffeur sees these before pickup
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={({ pressed }) => [
                styles.closeBtn,
                {
                  backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F3EFE7",
                },
                pressed && { opacity: 0.8 },
              ]}
              accessibilityLabel="Close"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={18} color={palette.text} />
            </Pressable>
          </View>

          <Text style={[styles.sectionLabel, { color: palette.text }]}>Conversation</Text>
          <View style={styles.convoRow}>
            {CONVO.map((opt) => {
              const selected = draft.conversation === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.convoCard,
                    {
                      backgroundColor: selected ? chipSelectedBg : chipIdle,
                      borderColor: selected ? chipSelectedBorder : chipIdleBorder,
                    },
                  ]}
                  onPress={() => setDraft((p) => ({ ...p, conversation: opt.id }))}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Ionicons
                    name={opt.icon}
                    size={22}
                    color={selected ? iconActive : iconMuted}
                  />
                  <Text
                    style={[
                      styles.convoLabel,
                      { color: selected ? palette.text : iconMuted },
                      selected && styles.convoLabelSelected,
                    ]}
                    numberOfLines={2}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.sectionLabel, { color: palette.text, marginTop: 22 }]}>
            Temperature
          </Text>
          <View style={[styles.segment, { backgroundColor: segmentTrack }]}>
            {TEMPS.map((opt) => {
              const selected = draft.temperature === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.segmentItem,
                    selected && {
                      backgroundColor: isDark ? "#2A2622" : "#FFFFFF",
                      borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)",
                      ...Platform.select({
                        ios: {
                          shadowColor: "#000",
                          shadowOpacity: 0.06,
                          shadowRadius: 4,
                          shadowOffset: { width: 0, height: 1 },
                        },
                        android: { elevation: 1 },
                      }),
                    },
                  ]}
                  onPress={() => setDraft((p) => ({ ...p, temperature: opt.id }))}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      { color: selected ? palette.text : iconMuted },
                      selected && { fontWeight: "700" },
                    ]}
                    numberOfLines={1}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.luggageRow}>
            <View style={styles.luggageCopy}>
              <Text style={[styles.luggageTitle, { color: palette.text }]}>
                Help with luggage
              </Text>
              <Text style={[styles.luggageSub, { color: palette.muted }]}>
                Chauffeur loads your bags
              </Text>
            </View>
            <Switch
              value={draft.helpWithLuggage}
              onValueChange={(v) => setDraft((p) => ({ ...p, helpWithLuggage: v }))}
              trackColor={{
                false: isDark ? "rgba(255,255,255,0.18)" : "#D1CDC4",
                true: isDark ? GOLD : "#1C1916",
              }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={isDark ? "rgba(255,255,255,0.18)" : "#D1CDC4"}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.saveBtn,
              { backgroundColor: isDark ? "#2A2622" : "#1C1916" },
            ]}
            onPress={() => onSave(normalizeRidePrefs(draft))}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel="Save ride preferences"
          >
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    zIndex: 2,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 22,
  },
  headerCopy: { flex: 1, minWidth: 0 },
  title: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "500",
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
    marginBottom: 12,
  },
  convoRow: {
    flexDirection: "row",
    gap: 10,
  },
  convoCard: {
    flex: 1,
    minHeight: 96,
    borderRadius: 14,
    borderWidth: 2,
    paddingHorizontal: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  convoLabel: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 17,
  },
  convoLabelSelected: {
    fontWeight: "700",
  },
  segment: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
    gap: 2,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "600",
  },
  luggageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 26,
    marginBottom: 22,
  },
  luggageCopy: { flex: 1, minWidth: 0 },
  luggageTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  luggageSub: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: "500",
  },
  saveBtn: {
    borderRadius: 14,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
});
