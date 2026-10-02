import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { GooglePlacesAddressField } from "../../components/GooglePlacesAddressField";
import { useCustomerTheme } from "../../contexts/CustomerThemeContext";
import { GOLD } from "../../theme/driver-theme";

const ACCENT = GOLD;

function paramStr(value: string | string[] | undefined): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] || "";
  return "";
}

function formatReverseGeocodeAddress(
  place: Location.LocationGeocodedAddress | undefined
): string | null {
  if (!place) return null;
  const streetLine = [place.streetNumber, place.street].filter(Boolean).join(" ").trim();
  const parts = [streetLine || place.name || "", place.city || place.subregion || ""]
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  return parts.join(", ");
}

/**
 * Plan your ride — same ScrollView pattern as create-reservation
 * (no Modal / KeyboardAvoidingView — those break the iOS soft keyboard).
 */
export default function PlanRideScreen() {
  const { palette, isDark } = useCustomerTheme();
  const params = useLocalSearchParams<{
    focus?: string | string[];
    pickup?: string | string[];
    pickupLat?: string | string[];
    pickupLng?: string | string[];
  }>();

  const [pickup, setPickup] = useState(() => paramStr(params.pickup).trim());
  const [dropoff, setDropoff] = useState("");
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(() => {
    const latStr = paramStr(params.pickupLat).trim();
    const lngStr = paramStr(params.pickupLng).trim();
    if (!latStr || !lngStr) return null;
    const lat = Number(latStr);
    const lng = Number(lngStr);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    return null;
  });
  const [dropoffCoords, setDropoffCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  const canContinue = useMemo(() => dropoff.trim().length >= 3, [dropoff]);

  const goCreate = useCallback(
    (drop: string, dropC?: { lat?: number; lng?: number } | null) => {
      const next: Record<string, string> = {};
      if (pickup.trim()) next.pickup = pickup.trim();
      if (pickupCoords) {
        next.pickupLat = String(pickupCoords.lat);
        next.pickupLng = String(pickupCoords.lng);
      }
      next.dropoff = drop.trim();
      const lat = dropC?.lat ?? dropoffCoords?.lat;
      const lng = dropC?.lng ?? dropoffCoords?.lng;
      if (lat != null && lng != null) {
        next.dropoffLat = String(lat);
        next.dropoffLng = String(lng);
      }
      router.replace({ pathname: "/customer/create-reservation", params: next });
    },
    [pickup, pickupCoords, dropoffCoords]
  );

  const useCurrentLocation = useCallback(async () => {
    setLocating(true);
    try {
      const current = await Location.getForegroundPermissionsAsync();
      let status = current.status;
      if (status !== "granted") {
        const req = await Location.requestForegroundPermissionsAsync();
        status = req.status;
      }
      if (status !== "granted") {
        Alert.alert(
          "Location needed",
          "Allow location access in Settings so we can fill your pickup address."
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude: lat, longitude: lng } = position.coords;
      setPickupCoords({ lat, lng });

      try {
        const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        const label = formatReverseGeocodeAddress(results[0]);
        setPickup(label || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      } catch {
        setPickup(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      }
    } finally {
      setLocating(false);
    }
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: palette.root }]}>
      <StatusBar barStyle={palette.statusBar} backgroundColor={palette.root} />
      <LinearGradient colors={[...palette.bg]} style={StyleSheet.absoluteFill} />
      <View style={styles.ambientGlow} pointerEvents="none">
        <LinearGradient
          colors={[...palette.glow]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.85, y: 0.45 }}
        />
      </View>

      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
        >
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
              <Ionicons name="chevron-back" size={20} color={palette.text} />
              <Text style={[styles.backText, { color: palette.text }]}>Back</Text>
            </Pressable>
            <Text style={[styles.headerTitle, { color: palette.text }]}>Plan your ride</Text>
            <View style={{ width: 64 }} />
          </View>

          <Text style={[styles.eyebrow, { color: isDark ? GOLD : palette.hintBold }]}>
            ROUTE
          </Text>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Where</Text>
          <Text style={[styles.sectionSub, { color: palette.muted }]}>
            Search pickup and drop-off
          </Text>

          <Text style={[styles.inputLabel, { color: palette.muted }]}>Pickup</Text>
          <GooglePlacesAddressField
            value={pickup}
            onChangeText={(t) => {
              setPickup(t);
              setPickupCoords(null);
            }}
            placeholder="Search pickup address"
            iconName="navigate-outline"
            onPlaceResolved={(place) => {
              setPickup(place.address);
              if (place.lat != null && place.lng != null) {
                setPickupCoords({ lat: place.lat, lng: place.lng });
              }
            }}
          />

          <Pressable
            onPress={() => void useCurrentLocation()}
            disabled={locating}
            style={({ pressed }) => [
              styles.gpsBtn,
              {
                backgroundColor: palette.hintBg,
                borderColor: palette.hintBorder,
              },
              pressed && styles.pressed,
              locating && { opacity: 0.7 },
            ]}
          >
            {locating ? (
              <ActivityIndicator size="small" color={isDark ? ACCENT : "#8B6914"} />
            ) : (
              <Ionicons name="navigate" size={16} color={isDark ? ACCENT : "#8B6914"} />
            )}
            <Text style={[styles.gpsText, { color: isDark ? "#E8C078" : "#7A5A28" }]}>
              {locating ? "Getting location…" : "Use current location"}
            </Text>
          </Pressable>

          <Text style={[styles.inputLabel, { color: palette.muted, marginTop: 18 }]}>
            Drop-off
          </Text>
          <GooglePlacesAddressField
            value={dropoff}
            onChangeText={(t) => {
              setDropoff(t);
              setDropoffCoords(null);
            }}
            placeholder="Search drop-off address"
            iconName="location-outline"
            onPlaceResolved={(place) => {
              setDropoff(place.address);
              const coords =
                place.lat != null && place.lng != null
                  ? { lat: place.lat, lng: place.lng }
                  : null;
              setDropoffCoords(coords);
              goCreate(place.address, coords);
            }}
          />

          <Pressable
            onPress={() => goCreate(dropoff)}
            disabled={!canContinue}
            style={({ pressed }) => [
              styles.continueBtn,
              !canContinue && styles.continueDisabled,
              pressed && canContinue && styles.pressed,
            ]}
          >
            <LinearGradient
              colors={["#E8C078", ACCENT, "#B8862E"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.continueGrad}
            >
              <Text style={styles.continueText}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color="#1A1208" />
            </LinearGradient>
          </Pressable>
        </ScrollView>
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
    height: 220,
  },
  safe: { flex: 1, backgroundColor: "transparent" },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    marginTop: 4,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    width: 64,
  },
  backText: {
    fontSize: 16,
    fontWeight: "500",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 13,
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  gpsBtn: {
    marginTop: 10,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  gpsText: {
    fontSize: 13,
    fontWeight: "600",
  },
  continueBtn: {
    marginTop: 28,
    borderRadius: 14,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: GOLD,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  continueGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  continueDisabled: {
    opacity: 0.45,
  },
  continueText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1208",
  },
  pressed: {
    opacity: 0.9,
  },
});
