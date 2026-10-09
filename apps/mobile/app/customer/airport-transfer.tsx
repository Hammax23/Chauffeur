import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Alert,
  StatusBar,
  TextInput,
  Switch,
  KeyboardAvoidingView,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCustomerTheme } from "../../contexts/CustomerThemeContext";
import { GooglePlacesAddressField } from "../../components/GooglePlacesAddressField";
import { GOLD } from "../../theme/driver-theme";
import { MEET_GREET_CHARGE } from "../../utils/app-fare";
import {
  getAllSavedPlaces,
  type SavedPlace,
} from "../../utils/saved-places";

type Direction = "from" | "to";

type PlaceState = {
  address: string;
  lat?: number;
  lng?: number;
};

const CONCIERGE_GOLD = "#B59461";
const CONCIERGE_INK = "#1C1916";

function formatAirportAddress(airport: PlaceState, terminal: string): string {
  const base = airport.address.trim();
  const t = terminal.trim();
  if (!t) return base;
  if (/\bterminal\b/i.test(base)) return base;
  return `${base} · Terminal ${t.replace(/^terminal\s*/i, "")}`;
}

function buildFlightNote(terminal: string): string | undefined {
  const t = terminal.trim();
  if (!t) return undefined;
  const normalized = t.replace(/^terminal\s*/i, "").trim();
  return `Terminal: ${normalized}`;
}

export default function AirportTransferScreen() {
  const { palette, isDark } = useCustomerTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const isNarrow = windowWidth < 380;
  const isShort = windowHeight < 700;
  const hPad = windowWidth < 360 ? 14 : 18;
  const placesPanelH = Math.min(220, Math.max(140, Math.round(windowHeight * (isShort ? 0.22 : 0.28))));

  const [direction, setDirection] = useState<Direction>("from");
  const [airport, setAirport] = useState<PlaceState>({ address: "" });
  const [terminal, setTerminal] = useState("");
  const [other, setOther] = useState<PlaceState>({ address: "" });
  const [airline, setAirline] = useState("");
  const [flightNumber, setFlightNumber] = useState("");
  const [meetGreet, setMeetGreet] = useState(false);
  const [savedHome, setSavedHome] = useState<SavedPlace | null>(null);
  const [savedOffice, setSavedOffice] = useState<SavedPlace | null>(null);

  useEffect(() => {
    void (async () => {
      const { home, office } = await getAllSavedPlaces();
      setSavedHome(home);
      setSavedOffice(office);
    })();
  }, []);

  useEffect(() => {
    if (direction === "to") setMeetGreet(false);
  }, [direction]);

  const applySavedOther = useCallback((place: SavedPlace) => {
    setOther({
      address: place.address,
      lat: place.lat,
      lng: place.lng,
    });
  }, []);

  const continueBooking = useCallback(() => {
    const airportAddr = airport.address.trim();
    const otherAddr = other.address.trim();
    if (airportAddr.length < 3) {
      Alert.alert("Airport needed", "Search and select an airport to continue.");
      return;
    }
    if (otherAddr.length < 3) {
      Alert.alert(
        direction === "from" ? "Destination needed" : "Pickup needed",
        direction === "from"
          ? "Enter where you want to go after landing."
          : "Enter your pickup address for the airport drop-off."
      );
      return;
    }

    if (direction === "from") {
      if (!airline.trim()) {
        Alert.alert("Airline needed", "Enter your airline for the airport pickup.");
        return;
      }
      if (!flightNumber.trim()) {
        Alert.alert("Flight number needed", "Enter your flight number for the airport pickup.");
        return;
      }
    }

    const airportFormatted = formatAirportAddress(airport, terminal);
    const flightNote = buildFlightNote(terminal);

    const params: Record<string, string> = {
      prefill: "airport",
      meetGreet: direction === "from" && meetGreet ? "1" : "0",
    };

    if (direction === "from") {
      params.pickup = airportFormatted;
      if (typeof airport.lat === "number") params.pickupLat = String(airport.lat);
      if (typeof airport.lng === "number") params.pickupLng = String(airport.lng);
      params.dropoff = otherAddr;
      if (typeof other.lat === "number") params.dropoffLat = String(other.lat);
      if (typeof other.lng === "number") params.dropoffLng = String(other.lng);
      params.airline = airline.trim();
      params.flightNumber = flightNumber.trim();
      if (flightNote) params.flightNote = flightNote;
    } else {
      params.pickup = otherAddr;
      if (typeof other.lat === "number") params.pickupLat = String(other.lat);
      if (typeof other.lng === "number") params.pickupLng = String(other.lng);
      params.dropoff = airportFormatted;
      if (typeof airport.lat === "number") params.dropoffLat = String(airport.lat);
      if (typeof airport.lng === "number") params.dropoffLng = String(airport.lng);
      if (flightNote) params.flightNote = flightNote;
    }

    router.push({
      pathname: "/customer/create-reservation",
      params,
    });
  }, [airport, other, terminal, airline, flightNumber, meetGreet, direction]);

  const fieldBg = isDark ? "rgba(255,255,255,0.06)" : "#F5F2EA";
  const border = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";

  const contentPad = useMemo(
    () => ({
      paddingHorizontal: hPad,
      paddingTop: 4,
      paddingBottom: Math.max(insets.bottom, 12) + 28,
    }),
    [hPad, insets.bottom]
  );

  return (
    <View style={[styles.root, { backgroundColor: palette.root }]}>
      <StatusBar barStyle={palette.statusBar} backgroundColor={palette.root} />
      <LinearGradient colors={[...palette.bg]} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        >
          <View style={styles.topBar}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            >
              <Ionicons name="chevron-back" size={22} color={palette.text} />
            </Pressable>
            <Text
              style={[styles.topTitle, { color: palette.text, fontSize: isNarrow ? 16 : 18 }]}
              numberOfLines={1}
            >
              Airport transfer
            </Text>
            <View style={styles.backBtn} />
          </View>

          <ScrollView
            style={styles.flex}
            contentContainerStyle={contentPad}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.intro, { color: palette.muted, fontSize: isNarrow ? 13 : 13.5 }]}>
              Book to or from any airport. Flight details help your chauffeur meet you on time.
            </Text>

            <View style={[styles.segment, { backgroundColor: fieldBg, borderColor: border }]}>
              <Pressable
                onPress={() => setDirection("from")}
                accessibilityRole="button"
                accessibilityState={{ selected: direction === "from" }}
                style={[
                  styles.segmentBtn,
                  direction === "from" && {
                    backgroundColor: isDark ? CONCIERGE_INK : "#FFFFFF",
                  },
                ]}
              >
                <Ionicons
                  name="airplane-outline"
                  size={isNarrow ? 15 : 16}
                  color={direction === "from" ? CONCIERGE_GOLD : palette.muted}
                />
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                  style={[
                    styles.segmentText,
                    {
                      color: direction === "from" ? palette.text : palette.muted,
                      fontSize: isNarrow ? 12 : 13.5,
                    },
                  ]}
                >
                  From airport
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setDirection("to")}
                accessibilityRole="button"
                accessibilityState={{ selected: direction === "to" }}
                style={[
                  styles.segmentBtn,
                  direction === "to" && {
                    backgroundColor: isDark ? CONCIERGE_INK : "#FFFFFF",
                  },
                ]}
              >
                <Ionicons
                  name="navigate-outline"
                  size={isNarrow ? 15 : 16}
                  color={direction === "to" ? CONCIERGE_GOLD : palette.muted}
                />
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                  style={[
                    styles.segmentText,
                    {
                      color: direction === "to" ? palette.text : palette.muted,
                      fontSize: isNarrow ? 12 : 13.5,
                    },
                  ]}
                >
                  To airport
                </Text>
              </Pressable>
            </View>

            {/* To airport: Pickup → Airport. From airport: Airport → Where to? */}
            {direction === "to" ? (
              <>
                <Text style={[styles.label, { color: palette.muted }]}>Pickup address</Text>
                <GooglePlacesAddressField
                  value={other.address}
                  onChangeText={(t) =>
                    setOther((p) => ({ ...p, address: t, lat: undefined, lng: undefined }))
                  }
                  onPlaceResolved={(p) =>
                    setOther({
                      address: p.address,
                      lat: p.lat,
                      lng: p.lng,
                    })
                  }
                  placeholder="Enter pickup address"
                  iconName="location-outline"
                  maxPanelHeight={placesPanelH}
                  containerStyle={styles.placesField}
                />
                <View style={styles.quickRow}>
                  <Pressable
                    onPress={() => {
                      if (savedHome?.address) applySavedOther(savedHome);
                      else
                        Alert.alert(
                          "No Home saved",
                          "Save a Home address in Profile → Saved places."
                        );
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={
                      savedHome?.address ? "Use Home address" : "Home not saved"
                    }
                    style={({ pressed }) => [
                      styles.quickChip,
                      { backgroundColor: fieldBg, borderColor: border },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons name="home-outline" size={14} color={CONCIERGE_GOLD} />
                    <Text style={[styles.quickText, { color: palette.text }]} numberOfLines={1}>
                      {savedHome?.address ? "Home" : "Set Home"}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      if (savedOffice?.address) applySavedOther(savedOffice);
                      else
                        Alert.alert(
                          "No Office saved",
                          "Save an Office address in Profile → Saved places."
                        );
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={
                      savedOffice?.address ? "Use Office address" : "Office not saved"
                    }
                    style={({ pressed }) => [
                      styles.quickChip,
                      { backgroundColor: fieldBg, borderColor: border },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons name="briefcase-outline" size={14} color={CONCIERGE_GOLD} />
                    <Text style={[styles.quickText, { color: palette.text }]} numberOfLines={1}>
                      {savedOffice?.address ? "Office" : "Set Office"}
                    </Text>
                  </Pressable>
                </View>

                <Text style={[styles.label, { color: palette.muted }]}>Airport</Text>
                <GooglePlacesAddressField
                  value={airport.address}
                  onChangeText={(t) =>
                    setAirport((p) => ({ ...p, address: t, lat: undefined, lng: undefined }))
                  }
                  onPlaceResolved={(p) =>
                    setAirport({
                      address: p.address,
                      lat: p.lat,
                      lng: p.lng,
                    })
                  }
                  placeholder="Search any airport (e.g. YYZ, LAX)"
                  iconName="airplane-outline"
                  placeTypes="airport"
                  worldwide
                  maxPanelHeight={placesPanelH}
                  containerStyle={styles.placesField}
                />
                <Text style={[styles.label, { color: palette.muted }]}>Terminal (optional)</Text>
                <TextInput
                  value={terminal}
                  onChangeText={setTerminal}
                  placeholder="e.g. 1, 3, International"
                  placeholderTextColor={palette.muted}
                  returnKeyType="next"
                  style={[
                    styles.input,
                    {
                      color: palette.text,
                      backgroundColor: fieldBg,
                      borderColor: border,
                    },
                  ]}
                />
              </>
            ) : (
              <>
                <Text style={[styles.label, { color: palette.muted }]}>Airport</Text>
                <GooglePlacesAddressField
                  value={airport.address}
                  onChangeText={(t) =>
                    setAirport((p) => ({ ...p, address: t, lat: undefined, lng: undefined }))
                  }
                  onPlaceResolved={(p) =>
                    setAirport({
                      address: p.address,
                      lat: p.lat,
                      lng: p.lng,
                    })
                  }
                  placeholder="Search any airport (e.g. YYZ, LAX)"
                  iconName="airplane-outline"
                  placeTypes="airport"
                  worldwide
                  maxPanelHeight={placesPanelH}
                  containerStyle={styles.placesField}
                />
                <Text style={[styles.label, { color: palette.muted }]}>Terminal (optional)</Text>
                <TextInput
                  value={terminal}
                  onChangeText={setTerminal}
                  placeholder="e.g. 1, 3, International"
                  placeholderTextColor={palette.muted}
                  returnKeyType="next"
                  style={[
                    styles.input,
                    {
                      color: palette.text,
                      backgroundColor: fieldBg,
                      borderColor: border,
                    },
                  ]}
                />

                <Text style={[styles.label, { color: palette.muted }]}>Where to?</Text>
                <GooglePlacesAddressField
                  value={other.address}
                  onChangeText={(t) =>
                    setOther((p) => ({ ...p, address: t, lat: undefined, lng: undefined }))
                  }
                  onPlaceResolved={(p) =>
                    setOther({
                      address: p.address,
                      lat: p.lat,
                      lng: p.lng,
                    })
                  }
                  placeholder="Enter destination address"
                  iconName="location-outline"
                  maxPanelHeight={placesPanelH}
                  containerStyle={styles.placesField}
                />
                <View style={styles.quickRow}>
                  <Pressable
                    onPress={() => {
                      if (savedHome?.address) applySavedOther(savedHome);
                      else
                        Alert.alert(
                          "No Home saved",
                          "Save a Home address in Profile → Saved places."
                        );
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={
                      savedHome?.address ? "Use Home address" : "Home not saved"
                    }
                    style={({ pressed }) => [
                      styles.quickChip,
                      { backgroundColor: fieldBg, borderColor: border },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons name="home-outline" size={14} color={CONCIERGE_GOLD} />
                    <Text style={[styles.quickText, { color: palette.text }]} numberOfLines={1}>
                      {savedHome?.address ? "Home" : "Set Home"}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      if (savedOffice?.address) applySavedOther(savedOffice);
                      else
                        Alert.alert(
                          "No Office saved",
                          "Save an Office address in Profile → Saved places."
                        );
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={
                      savedOffice?.address ? "Use Office address" : "Office not saved"
                    }
                    style={({ pressed }) => [
                      styles.quickChip,
                      { backgroundColor: fieldBg, borderColor: border },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons name="briefcase-outline" size={14} color={CONCIERGE_GOLD} />
                    <Text style={[styles.quickText, { color: palette.text }]} numberOfLines={1}>
                      {savedOffice?.address ? "Office" : "Set Office"}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}

            {direction === "from" ? (
              <View style={styles.flightBlock}>
                <Text style={[styles.sectionTitle, { color: palette.text }]}>Flight details</Text>
                <Text style={[styles.label, { color: palette.muted }]}>Airline</Text>
                <TextInput
                  value={airline}
                  onChangeText={setAirline}
                  placeholder="e.g. Air Canada"
                  placeholderTextColor={palette.muted}
                  autoCapitalize="words"
                  returnKeyType="next"
                  style={[
                    styles.input,
                    {
                      color: palette.text,
                      backgroundColor: fieldBg,
                      borderColor: border,
                    },
                  ]}
                />
                <Text style={[styles.label, { color: palette.muted }]}>Flight number</Text>
                <TextInput
                  value={flightNumber}
                  onChangeText={setFlightNumber}
                  placeholder="e.g. AC123"
                  placeholderTextColor={palette.muted}
                  autoCapitalize="characters"
                  returnKeyType="done"
                  style={[
                    styles.input,
                    {
                      color: palette.text,
                      backgroundColor: fieldBg,
                      borderColor: border,
                    },
                  ]}
                />

                <View
                  style={[styles.mgRow, { backgroundColor: fieldBg, borderColor: border }]}
                >
                  <View style={styles.mgCopy}>
                    <Text style={[styles.mgTitle, { color: palette.text }]} numberOfLines={1}>
                      Meet & Greet
                    </Text>
                    <Text style={[styles.mgSub, { color: palette.muted }]} numberOfLines={2}>
                      Personal airport assistance +${MEET_GREET_CHARGE.toFixed(0)}
                    </Text>
                  </View>
                  <Switch
                    value={meetGreet}
                    onValueChange={setMeetGreet}
                    trackColor={{
                      false: "rgba(150,150,150,0.35)",
                      true: "rgba(201,160,99,0.55)",
                    }}
                    thumbColor={meetGreet ? GOLD : "#f4f3f4"}
                  />
                </View>
              </View>
            ) : null}

            <Pressable
              onPress={continueBooking}
              accessibilityRole="button"
              accessibilityLabel="Continue to reservation"
              style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
            >
              <LinearGradient
                colors={["#E8C078", GOLD, "#B8862E"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaGradient}
              >
                <Text style={styles.ctaText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#1A1208" />
              </LinearGradient>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: "transparent" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    flex: 1,
    textAlign: "center",
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  intro: {
    fontWeight: "500",
    lineHeight: 19,
    marginBottom: 16,
  },
  segment: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
    gap: 4,
    marginBottom: 18,
  },
  segmentBtn: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 11,
    paddingHorizontal: 6,
    borderRadius: 11,
  },
  segmentText: {
    flexShrink: 1,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  label: {
    fontSize: 11.5,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 4,
  },
  placesField: {
    marginBottom: 10,
    zIndex: 2,
  },
  input: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 12,
    fontSize: 15,
    fontWeight: "500",
    marginBottom: 10,
    minHeight: 48,
  },
  quickRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
    marginTop: 2,
  },
  quickChip: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  quickText: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  flightBlock: {
    marginTop: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  mgRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 8,
    marginBottom: 8,
    minHeight: 56,
  },
  mgCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    paddingRight: 4,
  },
  mgTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  mgSub: {
    fontSize: 12.5,
    fontWeight: "500",
    lineHeight: 17,
  },
  cta: {
    marginTop: 22,
    borderRadius: 14,
    overflow: "hidden",
  },
  ctaGradient: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1A1208",
  },
  pressed: { opacity: 0.78 },
});
