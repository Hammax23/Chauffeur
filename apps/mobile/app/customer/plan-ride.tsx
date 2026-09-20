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
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { GooglePlacesAddressField } from "../../components/GooglePlacesAddressField";
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
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" />
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
            <Ionicons name="chevron-back" size={20} color="#1a1a1a" />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Plan your ride</Text>
          <View style={{ width: 64 }} />
        </View>

        <Text style={styles.sectionTitle}>Where</Text>
        <Text style={styles.sectionSub}>Search pickup and drop-off</Text>

        <Text style={styles.inputLabel}>Pickup</Text>
        <GooglePlacesAddressField
          value={pickup}
          onChangeText={(t) => {
            setPickup(t);
            setPickupCoords(null);
          }}
          placeholder="Search pickup — street, city, or airport"
          iconName="locate-outline"
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
            pressed && styles.pressed,
            locating && { opacity: 0.7 },
          ]}
        >
          {locating ? (
            <ActivityIndicator size="small" color={ACCENT} />
          ) : (
            <Ionicons name="navigate" size={16} color={ACCENT} />
          )}
          <Text style={styles.gpsText}>
            {locating ? "Getting location…" : "Use current location"}
          </Text>
        </Pressable>

        <Text style={[styles.inputLabel, { marginTop: 18 }]}>Drop-off</Text>
        <GooglePlacesAddressField
          value={dropoff}
          onChangeText={(t) => {
            setDropoff(t);
            setDropoffCoords(null);
          }}
          placeholder="Search destination"
          iconName="search-outline"
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
          <Text style={styles.continueText}>Continue</Text>
          <Ionicons name="arrow-forward" size={18} color="#1A1208" />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f8f8",
  },
  scroll: {
    flex: 1,
  },
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
    color: "#1a1a1a",
    fontWeight: "500",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
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
    backgroundColor: "rgba(212,160,74,0.12)",
  },
  gpsText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8B6914",
  },
  continueBtn: {
    marginTop: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
    }),
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
