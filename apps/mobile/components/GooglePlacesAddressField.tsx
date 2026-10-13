import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  type TextInput as TextInputType,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, MutableRefObject, Ref } from "react";
import { randomUUID } from "expo-crypto";
import { fetchPlaceFormattedAddress, fetchPlacePredictions, type PlacePrediction } from "../services/places";
import { useOptionalCustomerTheme } from "../contexts/CustomerThemeContext";
import { GOLD, getDriverPalette } from "../theme/driver-theme";

const DEBOUNCE_MS = 280;
const ACCENT = GOLD;
const FALLBACK_PALETTE = getDriverPalette("dark");

export type GooglePlacesAddressFieldIcon = ComponentProps<typeof Ionicons>["name"];

export type GooglePlacesSuggestionsState = {
  predictions: PlacePrediction[];
  loading: boolean;
  banner: string | null;
  showPanel: boolean;
  value: string;
};

function predictionIcon(types: string[]): GooglePlacesAddressFieldIcon {
  if (types.includes("airport")) return "airplane-outline";
  if (types.includes("transit_station") || types.includes("train_station")) return "train-outline";
  if (types.includes("establishment") || types.includes("point_of_interest")) return "business-outline";
  return "location-outline";
}

export interface PlacesSuggestionsPanelProps {
  predictions: PlacePrediction[];
  loading: boolean;
  banner: string | null;
  value: string;
  maxPanelHeight?: number;
  compact?: boolean;
  onDismiss: () => void;
  onPick: (item: PlacePrediction) => void;
}

/** Shared suggestion list — used under a single field or below Uber-style dual fields. */
export function PlacesSuggestionsPanel({
  predictions,
  loading,
  banner,
  value,
  maxPanelHeight = 260,
  compact = false,
  onDismiss,
  onPick,
}: PlacesSuggestionsPanelProps) {
  const theme = useOptionalCustomerTheme();
  const palette = theme?.palette ?? FALLBACK_PALETTE;
  const isDark = theme?.isDark ?? true;
  const panelBg = isDark ? "rgba(28,28,30,0.98)" : "#fff";
  const panelHeaderBg = isDark ? "rgba(255,255,255,0.04)" : "#fafafa";
  const divider = palette.border;

  return (
    <View
      style={[styles.panel, { borderColor: divider, backgroundColor: panelBg }]}
      accessibilityRole="list"
    >
      <View
        style={[
          styles.panelHeader,
          { backgroundColor: panelHeaderBg, borderBottomColor: divider },
        ]}
      >
        <Text style={[styles.panelHeaderTitle, { color: palette.muted }]}>Suggestions</Text>
        <TouchableOpacity
          onPress={onDismiss}
          hitSlop={10}
          accessibilityLabel="Close suggestions"
          accessibilityRole="button"
        >
          <Ionicons name="close" size={16} color={palette.muted} />
        </TouchableOpacity>
      </View>
      {banner ? (
        <View
          style={[
            styles.banner,
            {
              backgroundColor: isDark ? "rgba(212,160,74,0.12)" : "#fffbeb",
              borderBottomColor: isDark ? palette.hintBorder : "#fde68a",
            },
          ]}
        >
          <Ionicons name="alert-circle-outline" size={18} color={isDark ? GOLD : "#b45309"} />
          <Text style={[styles.bannerText, { color: isDark ? "#E8C078" : "#92400e" }]}>
            {banner}
          </Text>
        </View>
      ) : null}
      {loading && predictions.length === 0 && !banner ? (
        <View style={[styles.loadingBanner, { borderBottomColor: divider }]}>
          <ActivityIndicator size="small" color={ACCENT} />
          <Text style={[styles.loadingText, { color: palette.muted }]}>
            Searching addresses…
          </Text>
        </View>
      ) : null}
      {!banner && predictions.length > 0 ? (
        <ScrollView
          style={[styles.panelScroll, { maxHeight: maxPanelHeight }]}
          keyboardShouldPersistTaps="always"
          nestedScrollEnabled
          showsVerticalScrollIndicator={predictions.length > 4}
        >
          {predictions.map((item) => (
            <TouchableOpacity
              key={item.placeId}
              style={[
                styles.row,
                compact && styles.rowCompact,
                { borderBottomColor: divider },
              ]}
              activeOpacity={0.7}
              onPress={() => onPick(item)}
            >
              <View style={styles.rowIcon}>
                <Ionicons name={predictionIcon(item.types)} size={20} color={ACCENT} />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.main, { color: palette.text }]} numberOfLines={1}>
                  {item.mainText}
                </Text>
                {item.secondaryText ? (
                  <Text style={[styles.secondary, { color: palette.muted }]} numberOfLines={2}>
                    {item.secondaryText}
                  </Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={palette.muted} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}
      {!banner && !loading && predictions.length === 0 && value.trim().length >= 2 ? (
        <Text style={[styles.empty, { color: palette.muted }]}>
          No matches — try street, city, or airport code
        </Text>
      ) : null}
      <View
        style={[
          styles.poweredRow,
          {
            backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
            borderTopColor: divider,
          },
        ]}
      >
        <Text style={[styles.powered, { color: palette.muted }]}>Google Places</Text>
      </View>
    </View>
  );
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
  /** Cap suggestion list height (modals / small screens). Default 260. */
  maxPanelHeight?: number;
  /** Tighter input padding for dense layouts. */
  compact?: boolean;
  /** Restrict autocomplete to airports (server supports `airport` only). */
  placeTypes?: "airport";
  /** Omit Canada-only filter — used with airport composer (Uber-style). */
  worldwide?: boolean;
  /**
   * When true, do not render suggestions under this field.
   * Parent should render `PlacesSuggestionsPanel` from `onSuggestionsChange`.
   */
  hidePanel?: boolean;
  /** Report suggestion state for a shared list below pickup + dropoff. */
  onSuggestionsChange?: (state: GooglePlacesSuggestionsState | null) => void;
  onFocusChange?: (focused: boolean) => void;
  /** Parent shared panel calls this to resolve a prediction for this field. */
  pickHandlerRef?: MutableRefObject<((p: PlacePrediction) => void) | null>;
  /** Parent shared panel calls this to dismiss this field's suggestions. */
  dismissHandlerRef?: MutableRefObject<(() => void) | null>;
  inputRef?: Ref<TextInputType>;
}

export function GooglePlacesAddressField({
  value,
  onChangeText,
  placeholder = "Search address",
  iconName = "location-outline",
  containerStyle,
  onPlaceResolved,
  autoFocus,
  maxPanelHeight = 260,
  compact = false,
  placeTypes,
  worldwide = false,
  hidePanel = false,
  onSuggestionsChange,
  onFocusChange,
  pickHandlerRef,
  dismissHandlerRef,
  inputRef,
}: GooglePlacesAddressFieldProps) {
  const theme = useOptionalCustomerTheme();
  const palette = theme?.palette ?? FALLBACK_PALETTE;
  const isDark = theme?.isDark ?? true;
  const sessionRef = useRef<string>(randomUUID());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const onPlaceResolvedRef = useRef(onPlaceResolved);
  onPlaceResolvedRef.current = onPlaceResolved;
  const onSuggestionsChangeRef = useRef(onSuggestionsChange);
  onSuggestionsChangeRef.current = onSuggestionsChange;
  const onFocusChangeRef = useRef(onFocusChange);
  onFocusChangeRef.current = onFocusChange;

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

  const runAutocomplete = useCallback(
    async (text: string) => {
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
        const list = await fetchPlacePredictions(q, sessionRef.current, ac.signal, {
          types: placeTypes,
          worldwide,
        });
        setPredictions(list);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setPredictions([]);
        setBanner(e instanceof Error ? e.message : "Suggestions unavailable");
      } finally {
        setLoading(false);
      }
    },
    [placeTypes, worldwide]
  );

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

  const onDismissPanel = useCallback(() => {
    cancelInFlight();
    clearDebounce();
    setPanelOpen(false);
    setPredictions([]);
    setLoading(false);
    setBanner(null);
  }, []);

  const onPick = useCallback(
    async (p: PlacePrediction) => {
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
        onPlaceResolvedRef.current?.({
          address: formattedAddress,
          lat: location?.lat,
          lng: location?.lng,
        });
        sessionRef.current = randomUUID();
      } catch (e) {
        setBanner(e instanceof Error ? e.message : "Could not confirm address");
        onChangeText(p.description);
        onPlaceResolvedRef.current?.({ address: p.description });
        sessionRef.current = randomUUID();
      } finally {
        setResolving(false);
      }
    },
    [onChangeText]
  );

  useEffect(() => {
    if (!pickHandlerRef) return;
    pickHandlerRef.current = (p) => {
      void onPick(p);
    };
    return () => {
      pickHandlerRef.current = null;
    };
  }, [pickHandlerRef, onPick]);

  useEffect(() => {
    if (!dismissHandlerRef) return;
    dismissHandlerRef.current = onDismissPanel;
    return () => {
      dismissHandlerRef.current = null;
    };
  }, [dismissHandlerRef, onDismissPanel]);

  const showPanel =
    panelOpen && (!!banner || loading || predictions.length > 0 || value.trim().length >= 2);

  useEffect(() => {
    if (!onSuggestionsChangeRef.current) return;
    if (!showPanel && !focused) {
      onSuggestionsChangeRef.current(null);
      return;
    }
    onSuggestionsChangeRef.current({
      predictions,
      loading,
      banner,
      showPanel,
      value,
    });
  }, [predictions, loading, banner, showPanel, value, focused]);

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
    onFocusChangeRef.current?.(true);
    if (value.trim().length >= 2) {
      setPanelOpen(true);
      if (predictions.length === 0) {
        setLoading(true);
        scheduleAutocomplete(value);
      }
    }
  };

  const onBlur = () => {
    setFocused(false);
    onFocusChangeRef.current?.(false);
  };

  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "#FFFFFF";
  const accentMuted = isDark ? GOLD : "#8B6914";

  return (
    <View
      style={[
        styles.wrap,
        !hidePanel && (focused || panelOpen) && styles.wrapRaised,
        containerStyle,
      ]}
    >
      <View
        style={[
          styles.inputRow,
          compact && styles.inputRowCompact,
          {
            borderColor: focused
              ? isDark
                ? "rgba(212, 160, 74, 0.55)"
                : "rgba(139, 105, 20, 0.45)"
              : palette.border,
            backgroundColor: inputBg,
          },
        ]}
      >
        <Ionicons
          name={iconName}
          size={compact ? 16 : 18}
          color={focused ? accentMuted : palette.muted}
        />
        <TextInput
          ref={inputRef}
          style={[styles.input, compact && styles.inputCompact, { color: palette.text }]}
          placeholder={placeholder}
          placeholderTextColor={palette.muted}
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
        {(loading || resolving) && (
          <ActivityIndicator size="small" color={accentMuted} style={styles.spinner} />
        )}
      </View>

      {!hidePanel && showPanel ? (
        <PlacesSuggestionsPanel
          predictions={predictions}
          loading={loading}
          banner={banner}
          value={value}
          maxPanelHeight={maxPanelHeight}
          compact={compact}
          onDismiss={onDismissPanel}
          onPick={(item) => void onPick(item)}
        />
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
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    minHeight: 48,
  },
  inputRowCompact: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    minHeight: 44,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    paddingVertical: 0,
  },
  inputCompact: {
    fontSize: 13.5,
    fontWeight: "400",
  },
  spinner: { marginLeft: 4 },
  panel: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  panelHeaderTitle: {
    fontSize: 11,
    fontWeight: "800",
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
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bannerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowCompact: {
    paddingVertical: 10,
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
  },
  secondary: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
  },
  empty: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 13,
    textAlign: "center",
  },
  poweredRow: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  powered: {
    fontSize: 10,
    fontWeight: "600",
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
  },
  loadingText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
