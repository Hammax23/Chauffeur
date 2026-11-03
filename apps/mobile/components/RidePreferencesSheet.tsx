import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Platform,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useCustomerTheme } from "../contexts/CustomerThemeContext";
import { GOLD } from "../theme/driver-theme";

const ACCENT_DARK = "#A87830";
import {
  type RidePrefs,
  type RideConversationPref,
  type RideTemperaturePref,
  MAX_LUGGAGE_BAGS,
  normalizeRidePrefs,
} from "../utils/ride-prefs";

type Props = {
  visible: boolean;
  value: RidePrefs;
  onClose: () => void;
  onSave: (prefs: RidePrefs) => void;
  /** Max bags the selected vehicle / fleet can carry. */
  maxLuggageBags: number;
  /** Short vehicle label for copy, e.g. "Black Sedan". */
  vehicleLabel?: string;
  /** Open vehicle picker when customer needs more luggage space. */
  onNeedLargerVehicle?: () => void;
};

const CONVO: { id: RideConversationPref; label: string }[] = [
  { id: "quiet", label: "Quiet" },
  { id: "chat", label: "Happy to chat" },
  { id: "none", label: "No preference" },
];

const TEMPS: { id: RideTemperaturePref; label: string }[] = [
  { id: "cool", label: "Cool" },
  { id: "warm", label: "Warm" },
  { id: "none", label: "No preference" },
];

/**
 * Uber-style ride preferences sheet — opens only on Confirm row tap.
 * Discard on close/backdrop; commit only via Save.
 * Luggage stepper is capped to the selected vehicle's bag capacity.
 */
export function RidePreferencesSheet({
  visible,
  value,
  onClose,
  onSave,
  maxLuggageBags,
  vehicleLabel,
  onNeedLargerVehicle,
}: Props) {
  const insets = useSafeAreaInsets();
  const { palette, isDark } = useCustomerTheme();
  const bagCap = useMemo(() => {
    const n = Math.floor(Number(maxLuggageBags) || 0);
    // Fail closed: never fall back to the global 12-bag max when capacity is unknown.
    if (!Number.isFinite(n) || n < 1) return 1;
    return Math.min(MAX_LUGGAGE_BAGS, n);
  }, [maxLuggageBags]);

  const [draft, setDraft] = useState<RidePrefs>(() =>
    normalizeRidePrefs(value, { maxBags: bagCap })
  );

  useEffect(() => {
    if (visible) setDraft(normalizeRidePrefs(value, { maxBags: bagCap }));
  }, [visible, value, bagCap]);

  const sheetBg = isDark ? "#1C1813" : "#FFFFFF";
  const segmentTrack = isDark ? "rgba(255,255,255,0.06)" : "#F3EFE7";
  const iconMuted = isDark ? palette.muted : "#6B6560";
  const vehicleName = (vehicleLabel || "This vehicle").trim() || "This vehicle";
  const atBagCap =
    draft.helpWithLuggage && draft.luggageBagCount >= bagCap;

  const promptLargerVehicle = () => {
    Alert.alert(
      "More luggage space needed",
      `${vehicleName} holds up to ${bagCap} ${
        bagCap === 1 ? "bag" : "bags"
      }. Choose a vehicle with higher luggage capacity to continue.`,
      [
        { text: "Not now", style: "cancel" },
        {
          text: "See vehicles",
          onPress: () => {
            onClose();
            onNeedLargerVehicle?.();
          },
        },
      ]
    );
  };

  const segmentSelectedStyle = {
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
  };

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
          <View style={[styles.segment, { backgroundColor: segmentTrack }]}>
            {CONVO.map((opt) => {
              const selected = draft.conversation === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.segmentItem, selected && segmentSelectedStyle]}
                  onPress={() => setDraft((p) => ({ ...p, conversation: opt.id }))}
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

          <Text style={[styles.sectionLabel, { color: palette.text, marginTop: 22 }]}>
            Temperature
          </Text>
          <View style={[styles.segment, { backgroundColor: segmentTrack }]}>
            {TEMPS.map((opt) => {
              const selected = draft.temperature === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.segmentItem, selected && segmentSelectedStyle]}
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

          <Text style={[styles.sectionLabel, { color: palette.text, marginTop: 22 }]}>
            Air freshener
          </Text>
          <Text style={[styles.airFreshenerHint, { color: palette.muted }]}>
            Would you like a light air freshener in the cabin?
          </Text>
          <View style={[styles.segment, { backgroundColor: segmentTrack }]}>
            {(
              [
                { id: true as const, label: "Yes" },
                { id: false as const, label: "No" },
              ] as const
            ).map((opt) => {
              const selected = draft.airFreshener === opt.id;
              return (
                <TouchableOpacity
                  key={opt.label}
                  style={[styles.segmentItem, selected && segmentSelectedStyle]}
                  onPress={() =>
                    setDraft((p) => ({ ...p, airFreshener: opt.id }))
                  }
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Air freshener ${opt.label}`}
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
                Travelling with bags
              </Text>
              <Text style={[styles.luggageSub, { color: palette.muted }]}>
                {draft.helpWithLuggage
                  ? `${vehicleName} holds up to ${bagCap} ${
                      bagCap === 1 ? "bag" : "bags"
                    }`
                  : "Let us know if you’re bringing luggage"}
              </Text>
            </View>
            <Switch
              value={draft.helpWithLuggage}
              onValueChange={(v) =>
                setDraft((p) =>
                  normalizeRidePrefs(
                    {
                      ...p,
                      helpWithLuggage: v,
                      luggageBagCount: v ? Math.max(1, p.luggageBagCount || 1) : 0,
                    },
                    { maxBags: bagCap }
                  )
                )
              }
              trackColor={{
                false: isDark ? "rgba(255,255,255,0.18)" : "#D1CDC4",
                true: isDark ? GOLD : "#1C1916",
              }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={isDark ? "rgba(255,255,255,0.18)" : "#D1CDC4"}
            />
          </View>

          {draft.helpWithLuggage ? (
            <>
              <View
                style={[
                  styles.bagStepperRow,
                  {
                    backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F3EFE7",
                    borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
                  },
                ]}
              >
                <Text style={[styles.bagStepperLabel, { color: palette.text }]}>
                  Number of bags
                </Text>
                <View style={styles.bagStepper}>
                  <Pressable
                    onPress={() =>
                      setDraft((p) =>
                        normalizeRidePrefs(
                          {
                            ...p,
                            luggageBagCount: Math.max(1, (p.luggageBagCount || 1) - 1),
                          },
                          { maxBags: bagCap }
                        )
                      )
                    }
                    disabled={draft.luggageBagCount <= 1}
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.bagStepBtn,
                      {
                        backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#FFFFFF",
                        opacity: draft.luggageBagCount <= 1 ? 0.4 : pressed ? 0.85 : 1,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Fewer bags"
                  >
                    <Ionicons name="remove" size={18} color={palette.text} />
                  </Pressable>
                  <Text
                    style={[styles.bagStepValue, { color: palette.text }]}
                    accessibilityLabel={`${draft.luggageBagCount} bags`}
                  >
                    {draft.luggageBagCount}
                  </Text>
                  <Pressable
                    onPress={() => {
                      if (draft.luggageBagCount >= bagCap) {
                        promptLargerVehicle();
                        return;
                      }
                      setDraft((p) =>
                        normalizeRidePrefs(
                          {
                            ...p,
                            luggageBagCount: Math.min(
                              bagCap,
                              (p.luggageBagCount || 1) + 1
                            ),
                          },
                          { maxBags: bagCap }
                        )
                      );
                    }}
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.bagStepBtn,
                      {
                        backgroundColor: isDark ? GOLD : "#1C1916",
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={
                      atBagCap
                        ? "Need a larger vehicle for more bags"
                        : "More bags"
                    }
                  >
                    <Ionicons
                      name="add"
                      size={18}
                      color={isDark ? "#1A1208" : "#FFFFFF"}
                    />
                  </Pressable>
                </View>
              </View>

              {atBagCap ? (
                <Pressable
                  onPress={promptLargerVehicle}
                  style={({ pressed }) => [
                    styles.capacityHint,
                    {
                      backgroundColor: isDark
                        ? "rgba(232,192,120,0.12)"
                        : "rgba(28,25,22,0.04)",
                      borderColor: isDark
                        ? "rgba(232,192,120,0.28)"
                        : "rgba(0,0,0,0.08)",
                      opacity: pressed ? 0.88 : 1,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="See vehicles with more luggage space"
                >
                  <Ionicons
                    name="briefcase-outline"
                    size={18}
                    color={isDark ? GOLD : "#1C1916"}
                  />
                  <Text style={[styles.capacityHintText, { color: palette.text }]}>
                    Need more bags? See vehicles that fit your luggage
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={palette.muted} />
                </Pressable>
              ) : null}
            </>
          ) : null}

          <TouchableOpacity
            style={[styles.saveBtn, draft.helpWithLuggage ? null : { marginTop: 10 }]}
            onPress={() => {
              const next = normalizeRidePrefs(draft, { maxBags: bagCap });
              if (
                next.helpWithLuggage &&
                next.luggageBagCount > bagCap
              ) {
                promptLargerVehicle();
                return;
              }
              onSave(next);
            }}
            activeOpacity={0.92}
            accessibilityRole="button"
            accessibilityLabel="Save ride preferences"
          >
            <LinearGradient
              colors={["#E8C078", GOLD, ACCENT_DARK]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.saveGrad}
            >
              <Text style={styles.saveText}>Save</Text>
            </LinearGradient>
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
  airFreshenerHint: {
    marginTop: -6,
    marginBottom: 12,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
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
    marginBottom: 12,
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
  bagStepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  bagStepperLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  bagStepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bagStepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  bagStepValue: {
    minWidth: 28,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  capacityHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 18,
  },
  capacityHintText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  saveBtn: {
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
  saveGrad: {
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  saveText: {
    color: "#1A1208",
    fontSize: 17,
    fontWeight: "700",
  },
});
