import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { randomUUID } from "expo-crypto";
import { fetchPlaceFormattedAddress, fetchPlacePredictions, type PlacePrediction } from "../services/places";

const DEBOUNCE_MS = 280;

const ACCENT = "#D4A04A";
const SLATE_900 = "#0f172a";
const SLATE_500 = "#64748b";
const SLATE_400 = "#94a3b8";
const SLATE_100 = "#f1f5f9";

export type GooglePlacesAddressFieldIcon = ComponentProps<typeof Ionicons>["name"];

function predictionIcon(types: string[]): GooglePlacesAddressFieldIcon {
  if (types.includes("airport")) return "airplane-outline";
  if (types.includes("transit_station") || types.includes("train_station")) return "train-outline";
  if (types.includes("establishment") || types.includes("point_of_interest")) return "business-outline";
  return "location-outline";
}

export interface GooglePlacesAddressFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  iconName?: GooglePlacesAddressFieldIcon;
  containerStyle?: object;
  /** Fired after a suggestion is resolved (includes lat/lng when available). */
  onPlaceResolved?: (place: {
    address: string;
    lat?: number;
    lng?: number;
  }) => void;
  autoFocus?: boolean;
}

export function GooglePlacesAddressField({
  value,
  onChangeText,
  placeholder = "Search address",
  iconName = "location-outline",
  containerStyle,
  onPlaceResolved,
  autoFocus,
}: GooglePlacesAddressFieldProps) {
  const sessionRef = useRef<string>(randomUUID());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // `focused`  — visual focus on the TextInput (gold border etc.). Mirrors keyboard focus.
  // `panelOpen` — controls whether the suggestions panel is visible. Decoupled
  //               from focus so that dismissing the keyboard (by tapping a label
  //               or empty space) does NOT close the panel. It only closes on
  //               explicit user actions: pick, clear, dismiss button.
  const [focused, setFocused] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const clearDebounce = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  };

  const cancelInFlight = () => {
    abortRef.current?.abort();
    abortRef.current = null;
  };

  const runAutocomplete = useCallback(async (text: string) => {
    const q = text.trim();
    if (q.length < 2) {
      setPredictions([]);
      setLoading(false);
      return;
    }
    cancelInFlight();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setBanner(null);
    try {
      const list = await fetchPlacePredictions(q, sessionRef.current, ac.signal);
      setPredictions(list);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setPredictions([]);
      setBanner(e instanceof Error ? e.message : "Suggestions unavailable");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      clearDebounce();
      cancelInFlight();
    };
  }, []);

  const scheduleAutocomplete = (text: string) => {
    clearDebounce();
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      void runAutocomplete(text);
    }, DEBOUNCE_MS);
  };

  const onChange = (text: string) => {
    onChangeText(text);
    setBanner(null);
    if (text.trim().length < 2) {
      clearDebounce();
      cancelInFlight();
      setPredictions([]);
      setLoading(false);
      setPanelOpen(false);
      return;
    }
    setPanelOpen(true);
    setLoading(true);
    scheduleAutocomplete(text);
  };

  const onFocus = () => {
    setFocused(true);
    if (value.trim().length >= 2) {
      setPanelOpen(true);
      // Re-run autocomplete on refocus only if we don't already have results
      // (avoids a pointless network round-trip).
      if (predictions.length === 0) {
        setLoading(true);
        scheduleAutocomplete(value);
      }
    }
  };

  const onBlur = () => {
    // Visual focus follows the keyboard, but the panel is INTENTIONALLY left
    // open so the user can tap aside to dismiss the keyboard and still read
    // / scroll / pick a suggestion. The panel closes on pick, clear, or the
    // explicit dismiss button (see onDismissPanel).
    setFocused(false);
  };

  const onDismissPanel = () => {
    cancelInFlight();
    clearDebounce();
    setPanelOpen(false);
    setPredictions([]);
    setLoading(false);
  };

  const onPick = async (p: PlacePrediction) => {
    cancelInFlight();
    clearDebounce();
    setPredictions([]);
    setPanelOpen(false);
    setFocused(false);
    setResolving(true);
    setBanner(null);
    try {
      const { formattedAddress, location } = await fetchPlaceFormattedAddress(
        p.placeId,
        sessionRef.current
      );
      onChangeText(formattedAddress);
      onPlaceResolved?.({
        address: formattedAddress,
        lat: location?.lat,
        lng: location?.lng,
      });
      sessionRef.current = randomUUID();
    } catch (e) {
      setBanner(e instanceof Error ? e.message : "Could not confirm address");
      onChangeText(p.description);
      onPlaceResolved?.({ address: p.description });
      sessionRef.current = randomUUID();
    } finally {
      setResolving(false);
    }
  };

  const showPanel =
    panelOpen && (!!banner || loading || predictions.length > 0 || value.trim().length >= 2);

  return (
    <View style={[styles.wrap, (focused || panelOpen) && styles.wrapRaised, containerStyle]}>
      <View style={[styles.inputRow, focused && styles.inputRowFocused]}>
        <Ionicons name={iconName} size={18} color={focused ? ACCENT : SLATE_400} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#999"
          value={value}
          onChangeText={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          autoCorrect={false}
          autoCapitalize="words"
          returnKeyType="search"
          editable={!resolving}
          autoFocus={autoFocus}
          accessibilityLabel={placeholder}
        />
        {(loading || resolving) && <ActivityIndicator size="small" color={ACCENT} style={styles.spinner} />}
      </View>

      {showPanel ? (
        <View style={styles.panel} accessibilityRole="list">
          <View style={styles.panelHeader}>
            <Text style={styles.panelHeaderTitle}>Suggestions</Text>
            <TouchableOpacity
              onPress={onDismissPanel}
              hitSlop={10}
              accessibilityLabel="Close suggestions"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={16} color={SLATE_500} />
            </TouchableOpacity>
          </View>
          {banner ? (
            <View style={styles.banner}>
              <Ionicons name="alert-circle-outline" size={18} color="#b45309" />
              <Text style={styles.bannerText}>{banner}</Text>
            </View>
          ) : null}
          {loading && predictions.length === 0 && !banner ? (
            <View style={styles.loadingBanner}>
              <ActivityIndicator size="small" color={ACCENT} />
              <Text style={styles.loadingText}>Searching addresses…</Text>
            </View>
          ) : null}
          {/*
            Predictions sit inside a NESTED ScrollView so that:
              • the drag gesture stays inside the panel and never bubbles up to
                the parent ScrollView (which has keyboardDismissMode="on-drag").
              • `keyboardShouldPersistTaps="always"` lets the user tap a row
                without the keyboard interfering.
          */}
          {!banner && predictions.length > 0 ? (
            <ScrollView
              style={styles.panelScroll}
              keyboardShouldPersistTaps="always"
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              {predictions.map((item) => (
                <TouchableOpacity
                  key={item.placeId}
                  style={styles.row}
                  activeOpacity={0.7}
                  onPress={() => onPick(item)}
                >
                  <View style={styles.rowIcon}>
                    <Ionicons name={predictionIcon(item.types)} size={20} color={ACCENT} />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.main} numberOfLines={1}>
                      {item.mainText}
                    </Text>
                    {item.secondaryText ? (
                      <Text style={styles.secondary} numberOfLines={2}>
                        {item.secondaryText}
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={SLATE_400} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : null}
          {!banner && !loading && predictions.length === 0 && value.trim().length >= 2 ? (
            <Text style={styles.empty}>No matches — try street, city, or airport code</Text>
          ) : null}
          <View style={styles.poweredRow}>
            <Text style={styles.powered}>Google Places</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    zIndex: 1,
  },
  wrapRaised: {
    zIndex: 40,
    elevation: 10,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e8e8e8",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fafafa",
    gap: 10,
  },
  inputRowFocused: {
    borderColor: "rgba(212, 160, 74, 0.55)",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: SLATE_900,
    paddingVertical: 0,
  },
  spinner: { marginLeft: 4 },
  panel: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fafafa",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(15,23,42,0.06)",
  },
  panelHeaderTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: SLATE_500,
    letterSpacing: 1.2,
  },
  panelScroll: {
    maxHeight: 260,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fffbeb",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#fde68a",
  },
  bannerText: {
    flex: 1,
    fontSize: 12,
    color: "#92400e",
    lineHeight: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SLATE_100,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(212, 160, 74, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  main: {
    fontSize: 15,
    fontWeight: "600",
    color: SLATE_900,
  },
  secondary: {
    marginTop: 2,
    fontSize: 12,
    color: SLATE_500,
    lineHeight: 16,
  },
  empty: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 13,
    color: SLATE_500,
    textAlign: "center",
  },
  poweredRow: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: SLATE_100,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(15, 23, 42, 0.06)",
  },
  powered: {
    fontSize: 10,
    fontWeight: "600",
    color: SLATE_400,
    letterSpacing: 0.4,
    textAlign: "center",
  },
  loadingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SLATE_100,
  },
  loadingText: {
    fontSize: 13,
    color: SLATE_500,
    fontWeight: "500",
  },
});
