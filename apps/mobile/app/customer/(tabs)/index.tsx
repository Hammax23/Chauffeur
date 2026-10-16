import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Image,
  Platform,
  Animated,
  Easing,
  LayoutAnimation,
  UIManager,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
  Modal,
  Alert,
  KeyboardAvoidingView,
  TextInput,
  Keyboard,
  Switch,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import MapView, { Marker, PROVIDER_DEFAULT, type Region } from "react-native-maps";
import * as Location from "expo-location";
import { useAuth } from "../../../contexts/AuthContext";
import { useCustomerTheme } from "../../../contexts/CustomerThemeContext";
import {
  getReservations,
  Reservation,
  getActiveAppPromotions,
  getAppFleetVehicles,
  type ActiveAppPromotion,
} from "../../../services/api";
import { useReservationStream } from "../../../hooks/useReservationStream";
import {
  GooglePlacesAddressField,
  PlacesSuggestionsPanel,
  type GooglePlacesSuggestionsState,
} from "../../../components/GooglePlacesAddressField";
import { VehicleTierSelectList } from "../../../components/VehicleTierSelectList";
import type { PlacePrediction } from "../../../services/places";
import { fetchDirectionsSummary } from "../../../services/places";
import { GOLD } from "../../../theme/driver-theme";
import {
  buildVehicleTiersFromAppFleet,
  type VehicleTierOption,
} from "../../../data/vehicle-tiers";
import {
  BASE_DISTANCE_KM,
  EXTRA_KM_RATE,
  MEET_GREET_CHARGE,
  calculateAppDistanceFare,
  isAirportPickupLocation,
  type AppDistancePricing,
} from "../../../utils/app-fare";
import {
  MAX_APP_STOPS,
  activeStopAddresses,
  joinAppStops,
} from "../../../utils/stops";
import { isParcelServiceType } from "../../../utils/parcel";

/** Home Plan-your-ride focus: pickup, dropoff, or stop index. */
type WhereRouteFocus = "pickup" | "dropoff" | number;
import {
  dismissHomePromo,
  isHomePromoDismissed,
  setPendingPromoCode,
} from "../../../utils/pending-promo";
import {
  getSavedPlace,
  getAllSavedPlaces,
  setSavedPlace,
  type SavedPlace,
  type SavedPlaceKind,
} from "../../../utils/saved-places";
import {
  PrimaryRideCard,
  SecondaryParcelRow,
} from "../../../components/homeServiceCards.legacy";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** Flip to `"legacy"` to restore Book a Ride / Send a Parcel dual cards. */
const HOME_SERVICES_STYLE: "concierge" | "legacy" = "concierge";

const ACCENT = GOLD;
const ACCENT_DARK = "#A87830";
const CONCIERGE_GOLD = "#B59461";
const CONCIERGE_INK = "#1C1916";
const CONCIERGE_CREAM = "#F5F2EA";
const SERIF = Platform.OS === "ios" ? "Georgia" : "serif";

const UPCOMING_STATUSES = new Set([
  "PENDING",
  "CONFIRMED",
  "SCHEDULED",
  "ASSIGNED",
  "BOOKED",
]);

type ConciergeServiceId = "ride" | "airport" | "parcel" | "hourly";
const DEFAULT_REGION: Region = {
  latitude: 43.6532,
  longitude: -79.3832,
  latitudeDelta: 0.035,
  longitudeDelta: 0.025,
};
const MAP_LAT_DELTA = 0.028;
const MAP_LNG_DELTA = 0.02;

/** Center pin in the visible map band above the bottom sheet (not mid full-screen). */
function regionForVisibleMap(lat: number, lng: number, mapTopRatio: number): Region {
  // Visible band is top mapTopRatio of the screen; its visual mid ≈ mapTopRatio/2.
  // Full MapView mid is 0.5 — shift center south so the pin sits in that visible mid.
  const visibleMidY = mapTopRatio / 2;
  const offsetRatio = 0.5 - visibleMidY;
  return {
    latitude: lat - MAP_LAT_DELTA * offsetRatio,
    longitude: lng,
    latitudeDelta: MAP_LAT_DELTA,
    longitudeDelta: MAP_LNG_DELTA,
  };
}

const ACTIVE_TRIP_STATUSES = new Set(["ACCEPTED", "ON THE WAY", "ARRIVED", "CIC", "STOP"]);

function displayFullName(first?: string | null, last?: string | null): string {
  const full = [first, last].filter((s) => s?.trim()).join(" ").trim();
  return full || "there";
}

function formatPlaceShort(loc: string): string {
  const raw = loc.split(",")[0]?.trim() || loc;
  if (!raw) return "";
  const compact = raw.replace(/\s+/g, " ").trim();
  if (compact.length <= 5 && /^[a-z]+$/i.test(compact.replace(/\s/g, ""))) {
    return compact.toUpperCase();
  }
  return compact.replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatReverseGeocodeAddress(
  place: Location.LocationGeocodedAddress | undefined
): string | null {
  if (!place) return null;
  const streetLine = [place.streetNumber, place.street].filter(Boolean).join(" ").trim();
  const parts = [
    streetLine || place.name || "",
    place.city || place.subregion || "",
  ]
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  return parts.join(", ");
}

function greetingLine(name: string) {
  const h = new Date().getHours();
  const part = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return `${part}, ${name.split(" ")[0]}`;
}

/** Uber-style service tile — cream face, ink icon, label below. */
function ConciergeServiceTile({
  icon,
  label,
  isDark,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  isDark: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.conciergeTileCol, pressed && { opacity: 0.88 }]}
    >
      <View
        style={[
          styles.conciergeTileFace,
          {
            backgroundColor: isDark ? "rgba(255,255,255,0.08)" : CONCIERGE_CREAM,
          },
        ]}
      >
        <Ionicons name={icon} size={28} color={isDark ? "#F5F0E8" : CONCIERGE_INK} />
      </View>
      <Text
        style={[
          styles.conciergeTileLabel,
          { color: isDark ? "#F5F0E8" : CONCIERGE_INK },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ConciergePlaceRow({
  icon,
  title,
  subtitle,
  isDark,
  onPress,
  onLongPress,
  showDivider,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  isDark: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  showDivider?: boolean;
}) {
  return (
    <>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={380}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${subtitle}`}
        style={({ pressed }) => [styles.conciergePlaceRow, pressed && { opacity: 0.88 }]}
      >
        <View
          style={[
            styles.conciergePlaceIcon,
            { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#EEEEEE" },
          ]}
        >
          <Ionicons name={icon} size={18} color={isDark ? "#F5F0E8" : CONCIERGE_INK} />
        </View>
        <View style={styles.conciergePlaceCopy}>
          <Text
            style={[styles.conciergePlaceTitle, { color: isDark ? "#F5F0E8" : CONCIERGE_INK }]}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text
            style={[styles.conciergePlaceSub, { color: isDark ? "#A8A29A" : "#6B6560" }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        </View>
      </Pressable>
      {showDivider ? (
        <View
          style={[
            styles.conciergePlaceDivider,
            { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#EBEBEB" },
          ]}
        />
      ) : null}
    </>
  );
}

export default function CustomerHomeScreen() {
  const { user } = useAuth();
  const { isDark, palette, toggleTheme } = useCustomerTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const mapRef = useRef<MapView | null>(null);
  const fadeAnim = useMemo(() => new Animated.Value(0), []);
  const slideAnim = useMemo(() => new Animated.Value(24), []);
  const livePulse = useRef(new Animated.Value(0.45)).current;
  const primaryEntry = useRef(new Animated.Value(0)).current;
  const secondaryEntry = useRef(new Animated.Value(0)).current;

  const layout = useMemo(() => {
    const isCompact = windowWidth < 375;
    const isShort = windowHeight < 700;
    const isTablet = windowWidth >= 768;
    // Uber-style: map dominates; sheet hugs greeting + service tiles (no empty cream void).
    // Concierge sheet is content-dense (search + chips + 4 tiles + upcoming).
    const mapTopRatio =
      HOME_SERVICES_STYLE === "concierge"
        ? isShort
          ? 0.3
          : isTablet
            ? 0.44
            : 0.4
        : isShort
          ? 0.5
          : isTablet
            ? 0.64
            : 0.63;
    const sheetTop = windowHeight * mapTopRatio;
    const padH = isCompact ? 12 : isTablet ? 24 : 16;
    const fabSize = isCompact ? 40 : 44;
    const pickupMinH = isCompact ? 48 : 52;
    const titleSize = isCompact ? 20 : 22;
    return {
      isCompact,
      isShort,
      isTablet,
      mapTopRatio,
      sheetTop,
      padH,
      fabSize,
      pickupMinH,
      titleSize,
      topGap: isCompact ? 8 : 10,
      sheetContentPad: padH,
    };
  }, [windowWidth, windowHeight]);

  const mapTopRatioRef = useRef(layout.mapTopRatio);
  mapTopRatioRef.current = layout.mapTopRatio;

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [myCoords, setMyCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [pickupLabel, setPickupLabel] = useState("Finding your location…");
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupManual, setPickupManual] = useState(false);
  const [locating, setLocating] = useState(true);
  const [locationDenied, setLocationDenied] = useState(false);
  const [activeRide, setActiveRide] = useState<Reservation | null>(null);
  const [activeRideCount, setActiveRideCount] = useState(0);
  const [upcomingRide, setUpcomingRide] = useState<Reservation | null>(null);
  const [selectedService, setSelectedService] = useState<ConciergeServiceId>("ride");
  const [homePromo, setHomePromo] = useState<ActiveAppPromotion | null>(null);
  const [savedHome, setSavedHome] = useState<SavedPlace | null>(null);
  const [savedOffice, setSavedOffice] = useState<SavedPlace | null>(null);
  const [placeModalKind, setPlaceModalKind] = useState<SavedPlaceKind | null>(null);
  const [placeDraft, setPlaceDraft] = useState("");
  const [placeDraftCoords, setPlaceDraftCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [placeSaving, setPlaceSaving] = useState(false);
  const [whereSearching, setWhereSearching] = useState(false);
  const [wherePickup, setWherePickup] = useState("");
  const [wherePickupCoords, setWherePickupCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [dropoff, setDropoff] = useState("");
  const [dropoffCoords, setDropoffCoords] = useState<{ lat: number; lng: number } | null>(null);
  /** Intermediate stops between pickup and dropoff (Uber-style). */
  const [whereStops, setWhereStops] = useState<string[]>([]);
  /** Airport flight fields — shown under route when pickup/dropoff is an airport. */
  const [whereAirline, setWhereAirline] = useState("");
  const [whereFlightNumber, setWhereFlightNumber] = useState("");
  const [whereMeetGreet, setWhereMeetGreet] = useState(false);
  /** Autocomplete labels — keep airport signal when formatted address is street-only. */
  const [wherePickupPlaceLabel, setWherePickupPlaceLabel] = useState("");
  const [whereDropoffPlaceLabel, setWhereDropoffPlaceLabel] = useState("");
  /** Who is riding — Plan your ride header pill (replaces profile avatar). */
  const [whereRideFor, setWhereRideFor] = useState<"me" | "someone" | "child">("me");
  const [showWhereRideForMenu, setShowWhereRideForMenu] = useState(false);
  const [routeFocus, setRouteFocus] = useState<WhereRouteFocus>("dropoff");
  const [routeSuggestions, setRouteSuggestions] = useState<GooglePlacesSuggestionsState | null>(
    null
  );
  const routeFocusRef = useRef<WhereRouteFocus>("dropoff");
  const pickupPickRef = useRef<((p: PlacePrediction) => void) | null>(null);
  const dropoffPickRef = useRef<((p: PlacePrediction) => void) | null>(null);
  const pickupDismissRef = useRef<(() => void) | null>(null);
  const dropoffDismissRef = useRef<(() => void) | null>(null);
  const pickupInputRef = useRef<TextInput | null>(null);
  const dropoffInputRef = useRef<TextInput | null>(null);
  const stopPickRefs = useRef(
    Array.from({ length: MAX_APP_STOPS }, () => ({
      current: null as ((p: PlacePrediction) => void) | null,
    }))
  );
  const stopDismissRefs = useRef(
    Array.from({ length: MAX_APP_STOPS }, () => ({
      current: null as (() => void) | null,
    }))
  );
  const stopInputRefs = useRef(
    Array.from({ length: MAX_APP_STOPS }, () => ({
      current: null as TextInput | null,
    }))
  );
  const [keyboardH, setKeyboardH] = useState(0);
  /**
   * Plan mode is full-height under the status bar — do NOT translateY the sheet
   * with the keyboard (that shoved "Plan your ride" off the top of the screen).
   * Keyboard clearance is padding inside the scroll content instead.
   */

  const dismissAllWhereFields = useCallback((except?: WhereRouteFocus) => {
    if (except !== "pickup") pickupDismissRef.current?.();
    if (except !== "dropoff") dropoffDismissRef.current?.();
    stopDismissRefs.current.forEach((ref, i) => {
      if (except !== i) ref.current?.();
    });
  }, []);

  const blurWhereInputs = useCallback(() => {
    pickupInputRef.current?.blur();
    dropoffInputRef.current?.blur();
    stopInputRefs.current.forEach((r) => r.current?.blur());
  }, []);

  /** One gentle dismiss — sheet animates with keyboard; blur after hide. */
  const softDismissWhereKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  // Inline Select vehicle (Uber-style) once pickup + dropoff are set on the home sheet
  const [whereTiers, setWhereTiers] = useState<VehicleTierOption[]>([]);
  const [whereSelectedTierId, setWhereSelectedTierId] = useState<string | null>(null);
  const [whereFleetLoading, setWhereFleetLoading] = useState(false);
  const [whereFleetError, setWhereFleetError] = useState("");
  const [whereDistancePricing, setWhereDistancePricing] = useState<AppDistancePricing>({
    baseDistanceKm: BASE_DISTANCE_KM,
    extraKmRate: EXTRA_KM_RATE,
  });
  const [whereDistanceMeters, setWhereDistanceMeters] = useState<number | null>(null);
  const [whereRouteMeta, setWhereRouteMeta] = useState<{
    distanceText: string;
    durationText: string;
  } | null>(null);
  const [whereRouteLoading, setWhereRouteLoading] = useState(false);
  const [whereRouteError, setWhereRouteError] = useState("");
  const whereVehicleReveal = useRef(new Animated.Value(0)).current;
  const whereDidScrollVehicles = useRef(false);
  const whereSearchScrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = Keyboard.addListener(showEvt, (e) => {
      setKeyboardH(e.endCoordinates?.height ?? 0);
    });
    const onHide = Keyboard.addListener(hideEvt, () => {
      setKeyboardH(0);
      // Blur after keyboard starts hiding — avoids focus fighting the animation.
      blurWhereInputs();
    });
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, [blurWhereInputs]);

  // Leave Plan your ride → clear keyboard inset tracking.
  useEffect(() => {
    if (whereSearching) return;
    setKeyboardH(0);
  }, [whereSearching]);

  // Plan your ride — hide footer tabs (re-apply on focus after Review back).
  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({
        tabBarStyle: whereSearching ? { display: "none" } : undefined,
      });
      return () => {
        navigation.setOptions({ tabBarStyle: undefined });
      };
    }, [navigation, whereSearching])
  );

  const isUsablePickupLabel = useCallback((label: string) => {
    const t = label.trim();
    return (
      !!t &&
      t !== "Finding your location…" &&
      t !== "Enable location for pickup" &&
      t !== "Couldn’t detect location"
    );
  }, []);

  const fullName = displayFullName(user?.firstName, user?.lastName);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 480, useNativeDriver: true }),
    ]).start();
    // Motion 1 — staggered service entrance: ride hero leads, parcel follows.
    Animated.stagger(120, [
      Animated.spring(primaryEntry, { toValue: 1, delay: 180, useNativeDriver: true, speed: 13, bounciness: 5 }),
      Animated.spring(secondaryEntry, { toValue: 1, useNativeDriver: true, speed: 13, bounciness: 5 }),
    ]).start();
  }, [fadeAnim, slideAnim, primaryEntry, secondaryEntry]);

  useEffect(() => {
    if (!activeRide) {
      livePulse.stopAnimation();
      livePulse.setValue(0.45);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(livePulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(livePulse, { toValue: 0.45, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [activeRide, livePulse]);

  const applyLocation = useCallback(async (lat: number, lng: number, opts?: { manual?: boolean; label?: string }) => {
    setCoords({ lat, lng });
    if (!opts?.manual) {
      setMyCoords({ lat, lng });
    }
    if (opts?.manual) setPickupManual(true);
    mapRef.current?.animateToRegion(regionForVisibleMap(lat, lng, mapTopRatioRef.current), 650);
    if (opts?.label?.trim()) {
      const label = opts.label.trim();
      setPickupLabel(label);
      setPickupAddress(label);
      return label;
    }
    try {
      const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      const label = formatReverseGeocodeAddress(results[0]);
      const resolved = label || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      setPickupLabel(resolved);
      setPickupAddress(resolved);
      return resolved;
    } catch {
      const fallback = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      setPickupLabel(fallback);
      setPickupAddress(fallback);
      return fallback;
    }
  }, []);

  const resolveLocation = useCallback(async () => {
    setLocating(true);
    setLocationDenied(false);
    try {
      const current = await Location.getForegroundPermissionsAsync();
      let status = current.status;
      if (status !== "granted") {
        const req = await Location.requestForegroundPermissionsAsync();
        status = req.status;
      }
      if (status !== "granted") {
        setLocationDenied(true);
        if (!pickupManual) setPickupLabel("Enable location for pickup");
        setLocating(false);
        return null;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const label = await applyLocation(position.coords.latitude, position.coords.longitude, {
        manual: false,
      });
      setPickupManual(false);
      return label;
    } catch {
      if (!pickupManual) setPickupLabel("Couldn’t detect location");
      return null;
    } finally {
      setLocating(false);
    }
  }, [applyLocation, pickupManual]);

  // Auto-locate only when user hasn't chosen a custom pickup
  const resolveLocationIfNeeded = useCallback(async () => {
    if (pickupManual) return;
    await resolveLocation();
  }, [pickupManual, resolveLocation]);

  const loadHomePromo = useCallback(async () => {
    try {
      const data = await getActiveAppPromotions();
      if (!data.success || !data.promotions?.length) {
        setHomePromo(null);
        return;
      }
      for (const p of data.promotions) {
        const dismissed = await isHomePromoDismissed(p.id, p.updatedAt);
        if (!dismissed) {
          setHomePromo(p);
          return;
        }
      }
      setHomePromo(null);
    } catch {
      setHomePromo(null);
    }
  }, []);

  const loadSavedPlaces = useCallback(async () => {
    // Paint instantly from the offline cache, then reconcile with the backend.
    const [cachedHome, cachedOffice] = await Promise.all([
      getSavedPlace("home"),
      getSavedPlace("office"),
    ]);
    setSavedHome(cachedHome);
    setSavedOffice(cachedOffice);
    const { home, office } = await getAllSavedPlaces();
    setSavedHome(home);
    setSavedOffice(office);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void resolveLocationIfNeeded();
      void loadHomePromo();
      void loadSavedPlaces();
      (async () => {
        try {
          const data = await getReservations();
          if (data.success) {
            const actives = data.reservations.filter((r) => ACTIVE_TRIP_STATUSES.has(r.status));
            setActiveRideCount(actives.length);
            setActiveRide(actives[0] || null);
            const done = new Set(["DONE", "COMPLETED", "CANCELLED", "CANCELED"]);
            const upcoming = data.reservations
              .filter(
                (r) =>
                  !ACTIVE_TRIP_STATUSES.has(r.status) &&
                  !done.has(r.status) &&
                  (UPCOMING_STATUSES.has(r.status) || Boolean(r.serviceDate))
              )
              .sort((a, b) => {
                const da = `${a.serviceDate} ${a.serviceTime}`;
                const db = `${b.serviceDate} ${b.serviceTime}`;
                return da.localeCompare(db);
              });
            setUpcomingRide(upcoming[0] || null);
          }
        } catch {
          setActiveRide(null);
          setUpcomingRide(null);
        }
      })();
    }, [resolveLocationIfNeeded, loadHomePromo, loadSavedPlaces])
  );

  const liveBookingId = activeRide?.bookingId ?? null;
  const liveActive = useReservationStream(liveBookingId);
  useEffect(() => {
    const next = liveActive.data;
    if (!next || !activeRide) return;
    if (next.status === activeRide.status) return;
    if (!ACTIVE_TRIP_STATUSES.has(next.status)) {
      setActiveRide(null);
      return;
    }
    setActiveRide({ ...activeRide, status: next.status });
  }, [liveActive.data, activeRide]);

  const friendlyStatus = (s: string) =>
    s === "ACCEPTED" ? "Driver assigned" : s === "CIC" ? "In car" : s;

  const bookingParams = useCallback(
    (extra?: Record<string, string>) => {
      const params: Record<string, string> = { ...(extra || {}) };
      const address = (pickupAddress || pickupLabel).trim();
      if (
        address &&
        address !== "Finding your location…" &&
        address !== "Enable location for pickup" &&
        address !== "Couldn’t detect location"
      ) {
        params.pickup = address;
      }
      if (coords) {
        params.pickupLat = String(coords.lat);
        params.pickupLng = String(coords.lng);
      }
      return params;
    },
    [pickupAddress, pickupLabel, coords]
  );

  const resetWhereVehicleState = useCallback(() => {
    setWhereTiers([]);
    setWhereSelectedTierId(null);
    setWhereFleetLoading(false);
    setWhereFleetError("");
    setWhereDistanceMeters(null);
    setWhereRouteMeta(null);
    setWhereRouteLoading(false);
    setWhereRouteError("");
    whereVehicleReveal.setValue(0);
    whereDidScrollVehicles.current = false;
  }, [whereVehicleReveal]);

  const cancelWhereSearch = useCallback(() => {
    setWhereSearching(false);
    setWherePickup("");
    setWherePickupCoords(null);
    setDropoff("");
    setDropoffCoords(null);
    setWhereStops([]);
    setWhereAirline("");
    setWhereFlightNumber("");
    setWhereMeetGreet(false);
    setWherePickupPlaceLabel("");
    setWhereDropoffPlaceLabel("");
    setWhereRideFor("me");
    setShowWhereRideForMenu(false);
    setRouteSuggestions(null);
    routeFocusRef.current = "dropoff";
    setRouteFocus("dropoff");
    resetWhereVehicleState();
  }, [resetWhereVehicleState]);

  /** Stay on the sheet after dropoff — Select vehicle appears below the route card. */
  const onWhereDropoffResolved = useCallback(
    (place: { address: string; lat?: number; lng?: number; description?: string }) => {
      const address = place.address.trim();
      setDropoff(address);
      setWhereDropoffPlaceLabel(place.description?.trim() || address);
      setDropoffCoords(
        place.lat != null && place.lng != null ? { lat: place.lat, lng: place.lng } : null
      );
      dropoffDismissRef.current?.();
      setRouteSuggestions(null);
      Keyboard.dismiss();
    },
    []
  );

  /** Tap a vehicle → select only; Continue goes to Review. */
  const selectWhereVehicle = useCallback((vehicleId: string) => {
    if (!vehicleId) return;
    setWhereSelectedTierId(vehicleId);
  }, []);

  const continueWhereToReview = useCallback(() => {
    if (!whereSelectedTierId) return;
    const params: Record<string, string> = { fromPlanRide: "1" };
    const pickupText = wherePickup.trim();
    if (pickupText && isUsablePickupLabel(pickupText)) {
      params.pickup = pickupText;
    } else {
      Object.assign(params, bookingParams());
    }
    if (wherePickupCoords) {
      params.pickupLat = String(wherePickupCoords.lat);
      params.pickupLng = String(wherePickupCoords.lng);
    } else if (coords) {
      params.pickupLat = String(coords.lat);
      params.pickupLng = String(coords.lng);
    }
    if (dropoff.trim()) params.dropoff = dropoff.trim();
    if (dropoffCoords) {
      params.dropoffLat = String(dropoffCoords.lat);
      params.dropoffLng = String(dropoffCoords.lng);
    }
    const stopsJoined = joinAppStops(whereStops);
    if (stopsJoined) params.stops = stopsJoined;
    params.vehicleId = whereSelectedTierId;
    if (whereAirline.trim()) params.airline = whereAirline.trim();
    if (whereFlightNumber.trim()) params.flightNumber = whereFlightNumber.trim();
    if (
      whereMeetGreet &&
      (isAirportPickupLocation(wherePickup) ||
        isAirportPickupLocation(wherePickupPlaceLabel))
    ) {
      params.meetGreet = "1";
    }
    if (whereRideFor !== "me") params.rideFor = whereRideFor;
    // Keep Plan your ride state — Review back must return here, not idle Home.
    router.push({ pathname: "/customer/create-reservation", params });
  }, [
    whereSelectedTierId,
    wherePickup,
    wherePickupCoords,
    dropoff,
    dropoffCoords,
    whereStops,
    whereAirline,
    whereFlightNumber,
    whereMeetGreet,
    wherePickupPlaceLabel,
    whereRideFor,
    coords,
    bookingParams,
    isUsablePickupLabel,
  ]);

  const onWherePickupResolved = useCallback(
    (place: { address: string; lat?: number; lng?: number; description?: string }) => {
      setWherePickup(place.address);
      setWherePickupPlaceLabel(place.description?.trim() || place.address);
      const nextCoords =
        place.lat != null && place.lng != null ? { lat: place.lat, lng: place.lng } : null;
      setWherePickupCoords(nextCoords);
      setPickupAddress(place.address);
      setPickupLabel(place.address);
      setPickupManual(true);
      if (nextCoords) {
        setCoords(nextCoords);
        setMyCoords(nextCoords);
      }
      dismissAllWhereFields("pickup");
      setRouteSuggestions(null);
      // After pickup → first empty stop if any, else dropoff
      const emptyStop = whereStops.findIndex((s) => s.trim().length < 3);
      if (emptyStop >= 0) {
        routeFocusRef.current = emptyStop;
        setRouteFocus(emptyStop);
        setTimeout(() => stopInputRefs.current[emptyStop]?.current?.focus(), 80);
      } else {
        routeFocusRef.current = "dropoff";
        setRouteFocus("dropoff");
        setTimeout(() => dropoffInputRef.current?.focus(), 80);
      }
    },
    [dismissAllWhereFields, whereStops]
  );

  const onWhereStopResolved = useCallback(
    (index: number, place: { address: string; lat?: number; lng?: number }) => {
      stopDismissRefs.current[index]?.current?.();
      setRouteSuggestions(null);
      setWhereStops((prev) => {
        const next = prev.map((s, i) => (i === index ? place.address.trim() : s));
        const nextEmpty = next.findIndex((s, i) => i > index && s.trim().length < 3);
        requestAnimationFrame(() => {
          if (nextEmpty >= 0) {
            routeFocusRef.current = nextEmpty;
            setRouteFocus(nextEmpty);
            setTimeout(() => stopInputRefs.current[nextEmpty]?.current?.focus(), 80);
          } else {
            routeFocusRef.current = "dropoff";
            setRouteFocus("dropoff");
            setTimeout(() => dropoffInputRef.current?.focus(), 80);
          }
        });
        return next;
      });
    },
    []
  );

  const addWhereStop = useCallback(() => {
    setWhereStops((prev) => {
      if (prev.length >= MAX_APP_STOPS) return prev;
      const next = [...prev, ""];
      const idx = next.length - 1;
      routeFocusRef.current = idx;
      setRouteFocus(idx);
      setRouteSuggestions(null);
      setTimeout(() => stopInputRefs.current[idx]?.current?.focus(), 80);
      return next;
    });
  }, []);

  const removeWhereStop = useCallback(
    (index: number) => {
      setWhereStops((prev) => prev.filter((_, i) => i !== index));
      stopDismissRefs.current[index]?.current?.();
      if (routeFocusRef.current === index) {
        routeFocusRef.current = "dropoff";
        setRouteFocus("dropoff");
      }
      setRouteSuggestions(null);
    },
    []
  );

  const onRouteSuggestionsFrom = useCallback(
    (field: WhereRouteFocus, state: GooglePlacesSuggestionsState | null) => {
      if (routeFocusRef.current !== field) return;
      setRouteSuggestions(state);
    },
    []
  );

  const whereRouteReady = useMemo(
    () =>
      whereSearching &&
      isUsablePickupLabel(wherePickup.trim()) &&
      dropoff.trim().length >= 3,
    [whereSearching, wherePickup, dropoff, isUsablePickupLabel]
  );

  /** Plan-your-ride airport check — also matches plain "YYZ Terminal 1" labels. */
  const whereAirportHaystack = [
    wherePickup,
    dropoff,
    wherePickupPlaceLabel,
    whereDropoffPlaceLabel,
  ]
    .join(" ")
    .toLowerCase();
  const whereIsAirportTransfer =
    whereSearching &&
    (isAirportPickupLocation(wherePickup) ||
      isAirportPickupLocation(dropoff) ||
      isAirportPickupLocation(wherePickupPlaceLabel) ||
      isAirportPickupLocation(whereDropoffPlaceLabel) ||
      whereAirportHaystack.includes("yyz") ||
      whereAirportHaystack.includes("airport") ||
      whereAirportHaystack.includes("pearson") ||
      /terminal\s*[1-3]/.test(whereAirportHaystack) ||
      !!whereAirline.trim() ||
      !!whereFlightNumber.trim() ||
      whereMeetGreet);
  const whereAllowMeetGreet =
    isAirportPickupLocation(wherePickup) ||
    isAirportPickupLocation(wherePickupPlaceLabel) ||
    wherePickup.toLowerCase().includes("yyz") ||
    wherePickupPlaceLabel.toLowerCase().includes("yyz") ||
    wherePickup.toLowerCase().includes("airport") ||
    wherePickupPlaceLabel.toLowerCase().includes("airport");

  useEffect(() => {
    if (!whereAllowMeetGreet && whereMeetGreet) setWhereMeetGreet(false);
  }, [whereAllowMeetGreet, whereMeetGreet]);

  const whereShowVehicles = whereRouteReady && !routeSuggestions?.showPanel;

  const whereActiveStops = useMemo(
    () => activeStopAddresses(whereStops),
    [whereStops]
  );

  const whereTierFareById = useMemo(() => {
    const out: Record<string, number> = {};
    const meters = whereDistanceMeters;
    if (meters == null || meters <= 0) return out;
    const stopCount = whereActiveStops.length;
    for (const tier of whereTiers) {
      const fare = calculateAppDistanceFare({
        distanceMeters: meters,
        hourlyRate: tier.hourlyRate,
        pricePerKm: tier.pricePerKm,
        baseDistanceKm: tier.baseDistanceKm || whereDistancePricing.baseDistanceKm,
        extraKmRate: tier.extraKmRate || whereDistancePricing.extraKmRate,
        stopCount,
        childSeatCount: 0,
      });
      // Show total estimated (ride + stops) so fares match booking
      if (fare) out[tier.id] = fare.rideFare + fare.stopCharge;
    }
    return out;
  }, [whereTiers, whereDistanceMeters, whereDistancePricing, whereActiveStops.length]);

  useEffect(() => {
    if (!whereShowVehicles) {
      whereVehicleReveal.setValue(0);
      whereDidScrollVehicles.current = false;
      return;
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Animated.timing(whereVehicleReveal, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    if (!whereDidScrollVehicles.current) {
      whereDidScrollVehicles.current = true;
      requestAnimationFrame(() => {
        setTimeout(() => {
          // Keep Flight details (above vehicles) on screen — don't jump to list end
          whereSearchScrollRef.current?.scrollTo({ y: 0, animated: true });
        }, 140);
      });
    }
  }, [whereShowVehicles, whereVehicleReveal]);

  useEffect(() => {
    if (!whereRouteReady) {
      setWhereTiers([]);
      setWhereSelectedTierId(null);
      setWhereFleetError("");
      return;
    }
    let cancelled = false;
    (async () => {
      setWhereFleetLoading(true);
      setWhereFleetError("");
      try {
        const { vehicles, pricing } = await getAppFleetVehicles();
        if (cancelled) return;
        if (pricing) {
          setWhereDistancePricing({
            baseDistanceKm: pricing.baseDistanceKm || BASE_DISTANCE_KM,
            extraKmRate: pricing.extraKmRate || EXTRA_KM_RATE,
          });
        }
        const next = buildVehicleTiersFromAppFleet(vehicles);
        setWhereTiers(next);
        setWhereSelectedTierId((prev) => {
          if (prev && next.some((t) => t.id === prev)) return prev;
          return next[0]?.id ?? null;
        });
      } catch (e) {
        if (!cancelled) {
          setWhereFleetError(e instanceof Error ? e.message : "Could not load vehicles");
          setWhereTiers([]);
          setWhereSelectedTierId(null);
        }
      } finally {
        if (!cancelled) setWhereFleetLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [whereRouteReady]);

  useEffect(() => {
    if (!whereRouteReady) {
      setWhereDistanceMeters(null);
      setWhereRouteMeta(null);
      setWhereRouteError("");
      setWhereRouteLoading(false);
      return;
    }

    const origin =
      wherePickupCoords != null
        ? `${wherePickupCoords.lat},${wherePickupCoords.lng}`
        : wherePickup.trim();
    const destination =
      dropoffCoords != null
        ? `${dropoffCoords.lat},${dropoffCoords.lng}`
        : dropoff.trim();
    const waypoints = activeStopAddresses(whereStops);

    let cancelled = false;
    const ac = new AbortController();
    const timer = setTimeout(async () => {
      setWhereRouteLoading(true);
      setWhereRouteError("");
      try {
        const r = await fetchDirectionsSummary(
          {
            origin,
            destination,
            waypoints: waypoints.length > 0 ? waypoints : undefined,
            avoidTolls: false,
            mapWidth: 640,
            mapHeight: 360,
          },
          ac.signal
        );
        if (cancelled) return;
        if (r.distanceMeters == null || r.distanceMeters <= 0) {
          setWhereDistanceMeters(null);
          setWhereRouteMeta(null);
          setWhereRouteError("Could not calculate distance. You can still continue.");
          return;
        }
        setWhereDistanceMeters(r.distanceMeters);
        setWhereRouteMeta({
          distanceText: r.distanceText || "",
          durationText: r.durationText || "",
        });
      } catch (e) {
        if (!cancelled && (e as { name?: string })?.name !== "AbortError") {
          setWhereDistanceMeters(null);
          setWhereRouteMeta(null);
          setWhereRouteError(
            e instanceof Error ? e.message : "Route unavailable — fares may show base rates."
          );
        }
      } finally {
        if (!cancelled) setWhereRouteLoading(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      ac.abort();
      clearTimeout(timer);
    };
  }, [whereRouteReady, wherePickup, dropoff, wherePickupCoords, dropoffCoords, whereStops]);

  const openRide = useCallback(
    () =>
      router.push({
        pathname: "/customer/create-reservation",
        params: bookingParams(),
      }),
    [bookingParams]
  );
  const openParcel = useCallback(
    () =>
      router.push({
        pathname: "/customer/create-reservation",
        params: bookingParams({ prefill: "parcel" }),
      }),
    [bookingParams]
  );
  const openExecutive = useCallback(
    () =>
      router.push({
        pathname: "/customer/create-reservation",
        params: bookingParams({ vehicleId: "exec-black-sedan" }),
      }),
    [bookingParams]
  );
  const openHourly = useCallback(
    () =>
      router.push({
        pathname: "/customer/create-reservation",
        params: bookingParams({ prefill: "hourly" }),
      }),
    [bookingParams]
  );
  const openAirport = useCallback(
    () =>
      router.push({
        pathname: "/customer/airport-transfer",
      }),
    []
  );

  const openWithDropoff = useCallback(
    (place: SavedPlace) => {
      const extra: Record<string, string> = { dropoff: place.address };
      if (place.lat != null && place.lng != null) {
        extra.dropoffLat = String(place.lat);
        extra.dropoffLng = String(place.lng);
      }
      router.push({
        pathname: "/customer/create-reservation",
        params: bookingParams(extra),
      });
    },
    [bookingParams]
  );

  const openPlaceModal = useCallback(
    (kind: SavedPlaceKind) => {
      const existing = kind === "home" ? savedHome : savedOffice;
      setPlaceDraft(existing?.address ?? "");
      setPlaceDraftCoords(
        existing?.lat != null && existing?.lng != null
          ? { lat: existing.lat, lng: existing.lng }
          : null
      );
      setPlaceModalKind(kind);
    },
    [savedHome, savedOffice]
  );

  const closePlaceModal = useCallback(() => {
    setPlaceModalKind(null);
    setPlaceDraft("");
    setPlaceDraftCoords(null);
    setPlaceSaving(false);
  }, []);

  const savePlaceAndBook = useCallback(async () => {
    if (!placeModalKind) return;
    const address = placeDraft.trim();
    if (address.length < 3) {
      Alert.alert("Address needed", `Enter a ${placeModalKind} address to continue.`);
      return;
    }
    setPlaceSaving(true);
    const place: SavedPlace = {
      address,
      lat: placeDraftCoords?.lat,
      lng: placeDraftCoords?.lng,
    };
    try {
      await setSavedPlace(placeModalKind, place);
      if (placeModalKind === "home") setSavedHome(place);
      else setSavedOffice(place);
      closePlaceModal();
      openWithDropoff(place);
    } catch {
      setPlaceSaving(false);
      Alert.alert("Couldn’t save", "Please try again.");
    }
  }, [placeModalKind, placeDraft, placeDraftCoords, closePlaceModal, openWithDropoff]);

  const onQuickPlacePress = useCallback(
    (kind: SavedPlaceKind) => {
      const saved = kind === "home" ? savedHome : savedOffice;
      if (saved?.address) {
        openWithDropoff(saved);
        return;
      }
      const label = kind === "home" ? "Home" : "Office";
      Alert.alert(`Set your ${label}`, `Save a ${label.toLowerCase()} address for one-tap booking.`, [
        { text: "Cancel", style: "cancel" },
        { text: `Set ${label}`, onPress: () => openPlaceModal(kind) },
      ]);
    },
    [savedHome, savedOffice, openWithDropoff, openPlaceModal]
  );

  const useHomePromo = useCallback(async () => {
    if (!homePromo) return;
    await setPendingPromoCode(homePromo.code);
    router.push({
      pathname: "/customer/create-reservation",
      params: bookingParams(),
    });
  }, [homePromo, bookingParams]);

  const dismissPromoBanner = useCallback(async () => {
    if (!homePromo) return;
    await dismissHomePromo(homePromo.id, homePromo.updatedAt);
    setHomePromo(null);
  }, [homePromo]);

  const recenter = useCallback(() => {
    const ratio = mapTopRatioRef.current;
    if (pickupManual && coords) {
      mapRef.current?.animateToRegion(regionForVisibleMap(coords.lat, coords.lng, ratio), 500);
      return;
    }
    if (myCoords) {
      mapRef.current?.animateToRegion(regionForVisibleMap(myCoords.lat, myCoords.lng, ratio), 500);
      return;
    }
    void resolveLocation();
  }, [coords, myCoords, pickupManual, resolveLocation]);

  // Footer bar height + visible gap between Services chips and the tab.
  const tabBarH = 46 + Math.max(insets.bottom - 4, 4); // matches tabs/_layout bottom pad
  const servicesFooterGap = 28;
  const floatingTabClearance = tabBarH + servicesFooterGap;
  const isConciergeSheet = HOME_SERVICES_STYLE === "concierge";
  // Plan mode: pad above the keyboard (sheet stays pinned under status bar).
  const sheetPadBottom = isConciergeSheet
    ? whereSearching
      ? (keyboardH > 0 ? keyboardH : Math.max(insets.bottom, 12)) + 12
      : floatingTabClearance
    : (Platform.OS === "ios" ? 88 : 78) + insets.bottom;
  // Fixed height from content — must grow with pad or the gap gets clipped (invisible).
  const sheetInnerW =
    Math.min(windowWidth, 560) - layout.sheetContentPad * 2;
  const serviceTileH = Math.round(sheetInnerW / 4) + 22; // tile face + label
  const homeIdleContentH =
    16 + // handle
    40 + // greeting
    12 + // greeting gap
    56 + // Where to?
    8 + // stack gap
    120 + // Office + Home
    6 + // services block top
    34 + // Services header
    serviceTileH + // service tiles
    (homePromo ? 70 : 0);
  // Search mode hides Office/Home/Services — size for dual fields + suggestions or vehicles.
  const routeSuggestMaxH = Math.round(
    Math.min(
      layout.isShort ? 160 : 220,
      Math.max(120, windowHeight * (layout.isShort ? 0.22 : 0.28) - (keyboardH > 0 ? 40 : 0))
    )
  );
  const idleSheetCap = layout.isShort ? 0.7 : 0.64;
  /**
   * Plan your ride = full height under the status bar so the header never
   * leaves the screen when the keyboard opens. Idle home stays a bottom sheet.
   */
  const conciergeSheetH = whereSearching
    ? Math.round(windowHeight - insets.top)
    : Math.round(
        Math.min(
          windowHeight * idleSheetCap,
          homeIdleContentH + floatingTabClearance
        )
      );
  const effectiveSheetTop = isConciergeSheet
    ? windowHeight - conciergeSheetH
    : layout.sheetTop;
  mapTopRatioRef.current = effectiveSheetTop / windowHeight;

  const startWhereSearch = useCallback(() => {
    const address = (pickupAddress || pickupLabel).trim();
    const hasPickup = isUsablePickupLabel(address);
    setWherePickup(hasPickup ? address : "");
    setWherePickupCoords(coords);
    setDropoff("");
    setDropoffCoords(null);
    setWhereStops([]);
    setRouteSuggestions(null);
    resetWhereVehicleState();
    const focus: WhereRouteFocus = hasPickup ? "dropoff" : "pickup";
    routeFocusRef.current = focus;
    setRouteFocus(focus);
    setWhereSearching(true);
    setSelectedService("ride");
  }, [pickupAddress, pickupLabel, coords, isUsablePickupLabel, resetWhereVehicleState]);

  const launchSelectedService = useCallback(() => {
    if (selectedService === "parcel") openParcel();
    else if (selectedService === "airport") openAirport();
    else if (selectedService === "hourly") openHourly();
    else startWhereSearch();
  }, [selectedService, openParcel, openAirport, openHourly, startWhereSearch]);

  const onConciergeServicePress = useCallback(
    (id: ConciergeServiceId) => {
      setSelectedService(id);
      if (id === "ride") openRide();
      else if (id === "parcel") openParcel();
      else if (id === "airport") openAirport();
      else openHourly();
    },
    [openRide, openParcel, openAirport, openHourly]
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Live map background */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_DEFAULT}
        initialRegion={DEFAULT_REGION}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        showsTraffic={false}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
        userInterfaceStyle={isDark ? "dark" : "light"}
      >
        {/* Custom “you are here”: blue ring under black person (native blue dot was covering the person) */}
        {myCoords ? (
          <Marker
            coordinate={{ latitude: myCoords.lat, longitude: myCoords.lng }}
            anchor={{ x: 0.5, y: 1 }}
            tracksViewChanges
            flat={false}
            zIndex={10}
          >
            <View style={styles.meMarker} pointerEvents="none">
              <View style={styles.meBubble}>
                <View style={styles.meSilhouette}>
                  <View style={styles.meHead} />
                  <View style={styles.meTorso} />
                  <View style={styles.meArm} />
                </View>
              </View>
              <View style={styles.meStem} />
              <View style={styles.meDotHalo}>
                <View style={styles.meDot} />
              </View>
            </View>
          </Marker>
        ) : null}

        {coords && pickupManual ? (
          <Marker
            coordinate={{ latitude: coords.lat, longitude: coords.lng }}
            pinColor={ACCENT}
            title="Pickup"
            description={pickupLabel}
          />
        ) : null}
      </MapView>

      {/* Soft fade into sheet */}
      <LinearGradient
        colors={
          isDark
            ? ["transparent", "rgba(20,18,16,0.35)", "rgba(20,18,16,0.92)"]
            : ["transparent", "rgba(255,255,255,0.28)", "rgba(255,255,255,0.95)"]
        }
        locations={[0, 0.5, 1]}
        style={[styles.mapFade, { top: effectiveSheetTop - 56, height: 72 }]}
        pointerEvents="none"
      />

      {/* Top floating chrome — profile only on main home (not Plan your ride) */}
      <SafeAreaView style={styles.topSafe} edges={["top"]} pointerEvents="box-none">
        {!whereSearching ? (
          <View
            style={[
              styles.topRow,
              {
                paddingHorizontal: layout.padH,
                gap: layout.topGap,
                justifyContent: "flex-end",
              },
            ]}
            pointerEvents="box-none"
          >
            <Pressable
              onPress={() => router.push("/customer/profile")}
              style={({ pressed }) => [
                styles.fab,
                {
                  width: layout.fabSize,
                  height: layout.fabSize,
                  borderRadius: layout.fabSize / 2,
                },
                pressed && styles.pressed,
              ]}
              accessibilityLabel="Profile"
            >
              {user?.photo ? (
                <Image
                  source={{ uri: user.photo }}
                  style={{
                    width: layout.fabSize,
                    height: layout.fabSize,
                    borderRadius: layout.fabSize / 2,
                  }}
                />
              ) : (
                <LinearGradient
                  colors={[ACCENT, ACCENT_DARK]}
                  style={{
                    width: layout.fabSize,
                    height: layout.fabSize,
                    borderRadius: layout.fabSize / 2,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={[styles.fabInitials, layout.isCompact && { fontSize: 13 }]}>
                    {(user?.firstName?.[0] || "S")}
                    {(user?.lastName?.[0] || "")}
                  </Text>
                </LinearGradient>
              )}
            </Pressable>
          </View>
        ) : null}

        {locationDenied ? (
          <Pressable
            onPress={resolveLocation}
            style={[
              styles.locationBanner,
              { maxWidth: windowWidth - layout.padH * 2, marginHorizontal: layout.padH },
            ]}
          >
            <Ionicons name="location-outline" size={16} color={ACCENT_DARK} />
            <Text style={styles.locationBannerText} numberOfLines={2}>
              Turn on location to set pickup
            </Text>
          </Pressable>
        ) : null}
      </SafeAreaView>

      {/* Live trip — floats above bottom sheet (never under it, even after driver assigned) */}
      {activeRide && !whereSearching ? (
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/customer/track-ride",
              params: { bookingId: activeRide.bookingId },
            })
          }
          style={({ pressed }) => [
            styles.liveFloat,
            {
              bottom: windowHeight - effectiveSheetTop + 10,
              left: layout.isTablet
                ? (windowWidth - Math.min(windowWidth, 560)) / 2 + layout.padH
                : layout.padH,
              right: layout.isTablet
                ? (windowWidth - Math.min(windowWidth, 560)) / 2 + layout.padH
                : layout.padH,
            },
            pressed && { opacity: 0.92 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Live trip"
        >
          <View style={styles.liveTop}>
            <View style={styles.liveDotWrap}>
              <Animated.View style={[styles.liveDotHalo, { opacity: livePulse }]} />
              <View style={styles.liveDot} />
            </View>
            <Text style={styles.liveEyebrow}>LIVE TRIP</Text>
            <View style={styles.liveChip}>
              <Text style={styles.liveChipText} numberOfLines={1}>
                {friendlyStatus(activeRide.status)}
              </Text>
            </View>
          </View>
          <Text style={styles.liveRoute} numberOfLines={1}>
            {formatPlaceShort(activeRide.pickupLocation)} →{" "}
            {formatPlaceShort(activeRide.dropoffLocation)}
          </Text>
          <Text style={styles.liveMeta} numberOfLines={1}>
            {activeRide.bookingId}
            {activeRideCount > 1 ? ` · +${activeRideCount - 1} more` : ""}
            {isParcelServiceType(activeRide.serviceType) ? " · Parcel" : ""}
          </Text>
        </Pressable>
      ) : null}

      {/* Upcoming — floats on the map above the sheet (does not grow sheet height) */}
      {isConciergeSheet && upcomingRide && !activeRide && !whereSearching ? (
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/customer/track-ride",
              params: { bookingId: upcomingRide.bookingId },
            })
          }
          style={({ pressed }) => [
            styles.upcomingFloat,
            {
              bottom: windowHeight - effectiveSheetTop + 10,
              left: layout.isTablet
                ? (windowWidth - Math.min(windowWidth, 560)) / 2 + layout.padH
                : layout.padH,
              right: layout.isTablet
                ? (windowWidth - Math.min(windowWidth, 560)) / 2 + layout.padH
                : layout.padH,
              backgroundColor: isDark ? "#1C1813" : "#FFFFFF",
              borderColor: isDark ? "rgba(181,148,97,0.18)" : "rgba(28,25,22,0.08)",
            },
            pressed && { opacity: 0.92 },
          ]}
        >
          <View
            style={[
              styles.upcomingFloatIcon,
              { backgroundColor: isDark ? "rgba(181,148,97,0.12)" : CONCIERGE_CREAM },
            ]}
          >
            <Ionicons name="calendar-outline" size={16} color={CONCIERGE_GOLD} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.upcomingFloatEyebrow} numberOfLines={1}>
              UPCOMING · {upcomingRide.serviceDate}
              {upcomingRide.serviceTime ? `, ${upcomingRide.serviceTime}` : ""}
            </Text>
            <Text
              style={[
                styles.upcomingFloatTitle,
                { color: isDark ? "#F5F0E8" : CONCIERGE_INK },
              ]}
              numberOfLines={1}
            >
              {formatPlaceShort(
                upcomingRide.dropoffLocation || upcomingRide.pickupLocation
              )}
              {" · "}
              <Text style={{ fontWeight: "500", color: isDark ? "#A8A29A" : "#8A847C" }}>
                {upcomingRide.driver ? "Chauffeur assigned" : "Awaiting chauffeur"}
              </Text>
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={isDark ? "rgba(245,240,232,0.35)" : "#A8A29A"}
          />
        </Pressable>
      ) : null}

      {/* Theme + recenter — stacked on map right; dark icon above arrow */}
      <View
        style={[
          styles.mapFabStack,
          {
            bottom:
              windowHeight -
              effectiveSheetTop +
              (whereSearching
                ? 18
                : activeRide
                  ? 100
                  : isConciergeSheet && upcomingRide
                    ? 78
                    : 18),
            right: layout.padH,
          },
        ]}
      >
        <Pressable
          onPress={toggleTheme}
          style={({ pressed }) => [styles.recenterFab, pressed && styles.pressed]}
          accessibilityLabel={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          <Ionicons
            name={isDark ? "sunny-outline" : "moon-outline"}
            size={18}
            color="#1C1C1E"
          />
        </Pressable>
        <Pressable
          onPress={recenter}
          style={({ pressed }) => [styles.recenterFab, pressed && styles.pressed]}
          accessibilityLabel="Recenter map"
        >
          <Ionicons name="navigate" size={18} color="#1C1C1E" />
        </Pressable>
      </View>

      {/* Bottom sheet — fixed height; no swipe move */}
      <Animated.View
        style={[
          styles.sheet,
          isConciergeSheet
            ? {
                bottom: 0,
                height: conciergeSheetH,
              }
            : {
                top: layout.sheetTop,
                bottom: 0,
              },
          {
            left: layout.isTablet ? (windowWidth - Math.min(windowWidth, 560)) / 2 : 0,
            right: layout.isTablet ? (windowWidth - Math.min(windowWidth, 560)) / 2 : 0,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            backgroundColor: isDark
              ? "#141210"
              : isConciergeSheet
                ? "#FFFFFF"
                : "#F8F6F2",
          },
        ]}
      >
        {isConciergeSheet && !whereSearching ? (
          <View style={styles.sheetHandleHit}>
            <View style={styles.sheetHandleWrap}>
              <View
                style={[styles.sheetHandle, { backgroundColor: isDark ? "#3A3530" : "#D6D0C6" }]}
              />
            </View>
          </View>
        ) : null}
        {whereSearching ? (
          <View
            style={[
              styles.conciergeWhereSearchTop,
              {
                paddingHorizontal: layout.sheetContentPad,
                paddingTop: 6,
                paddingBottom: 4,
              },
            ]}
          >
            <Pressable
              onPress={cancelWhereSearch}
              hitSlop={10}
              style={({ pressed }) => [
                styles.conciergeWhereBack,
                pressed && { opacity: 0.7 },
              ]}
              accessibilityLabel="Cancel search"
            >
              <Ionicons
                name="chevron-back"
                size={22}
                color={isDark ? "#F5F0E8" : CONCIERGE_INK}
              />
            </Pressable>
            <Text
              style={[
                styles.conciergeWhereSearchLabel,
                layout.isCompact && { fontSize: 15 },
                { color: isDark ? "#F5F0E8" : CONCIERGE_INK },
              ]}
              numberOfLines={1}
            >
              Plan your ride
            </Text>
            <Pressable
              onPress={() => setShowWhereRideForMenu(true)}
              style={({ pressed }) => [
                styles.whereRideForAvatarBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Riding for ${
                whereRideFor === "me"
                  ? "me"
                  : whereRideFor === "child"
                    ? "child"
                    : "someone else"
              }. Change who is riding.`}
            >
              {whereRideFor === "me" && user?.photo ? (
                <Image
                  source={{ uri: user.photo }}
                  style={styles.whereRideForAvatar}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={[
                    styles.whereRideForAvatar,
                    whereRideFor === "me" && styles.whereRideForAvatarMe,
                    whereRideFor === "child" && styles.whereRideForAvatarChild,
                    whereRideFor === "someone" && styles.whereRideForAvatarSomeone,
                  ]}
                >
                  {whereRideFor === "me" ? (
                    <Text style={styles.whereRideForInitials}>
                      {`${(user?.firstName?.[0] || "Y").toUpperCase()}${(
                        user?.lastName?.[0] || ""
                      ).toUpperCase()}`}
                    </Text>
                  ) : (
                    <Ionicons
                      name={
                        whereRideFor === "child" ? "happy-outline" : "people-outline"
                      }
                      size={18}
                      color="#fff"
                    />
                  )}
                </View>
              )}
              <Ionicons
                name="chevron-down"
                size={12}
                color={isDark ? "rgba(255,255,255,0.75)" : "#5C5348"}
              />
            </Pressable>
          </View>
        ) : null}
        <ScrollView
          ref={whereSearchScrollRef}
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
          scrollEnabled={whereSearching}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={whereSearching ? "on-drag" : "none"}
          automaticallyAdjustKeyboardInsets={false}
          style={isConciergeSheet ? { flex: 1 } : undefined}
          contentContainerStyle={
            isConciergeSheet && whereSearching
              ? { flexGrow: 1, paddingBottom: 8 }
              : undefined
          }
        >
          <View
            style={[
              styles.sheetContent,
              {
                // Sticky Continue sits below the scroll — don't pad for keyboard here.
                paddingBottom: whereShowVehicles ? 12 : sheetPadBottom,
                paddingHorizontal: layout.sheetContentPad,
                paddingTop: isConciergeSheet ? 0 : undefined,
              },
            ]}
          >
            {!isConciergeSheet ? (
            <View style={styles.sheetHandleWrap}>
              <View
                style={[styles.sheetHandle, { backgroundColor: isDark ? "#3A3530" : "#D6D0C6" }]}
              />
            </View>
            ) : null}
          {!whereSearching ? (
          <View style={styles.greetingRow}>
            <View style={styles.greetingTextWrap}>
              <Text
                style={[
                  styles.greeting,
                  {
                    color: isDark ? "#F5F5F7" : CONCIERGE_INK,
                    fontSize: layout.isCompact ? 20 : 22,
                    fontWeight: "700",
                    letterSpacing: -0.4,
                  },
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {greetingLine(fullName)}
              </Text>
            </View>
          </View>
          ) : null}

          {!whereSearching && homePromo ? (
            <View
              style={[
                styles.promoBanner,
                {
                  backgroundColor: isDark ? "rgba(201,160,99,0.12)" : "#FBF6EE",
                  borderColor: isDark ? "rgba(201,160,99,0.26)" : "rgba(168,120,48,0.2)",
                },
              ]}
              accessibilityRole="summary"
            >
              <Pressable
                onPress={() => void useHomePromo()}
                accessibilityRole="button"
                accessibilityLabel={`Use promo ${homePromo.code}. ${homePromo.bannerTitle}`}
                style={({ pressed }) => [
                  styles.promoBannerMain,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.promoBannerIcon}>
                  <Ionicons name="pricetag" size={15} color={ACCENT_DARK} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={[styles.promoBannerTitle, { color: isDark ? "#F5F5F7" : "#1C1C1E" }]}
                    numberOfLines={1}
                  >
                    {homePromo.bannerTitle}
                  </Text>
                  {homePromo.bannerMessage ? (
                    <Text
                      style={[styles.promoBannerSub, { color: isDark ? "#A8A29A" : "#6B6560" }]}
                      numberOfLines={1}
                    >
                      {homePromo.bannerMessage}
                    </Text>
                  ) : null}
                  <View style={styles.promoCodeRow}>
                    <Text
                      style={[
                        styles.promoCodeChip,
                        {
                          color: ACCENT_DARK,
                          backgroundColor: isDark
                            ? "rgba(201,160,99,0.2)"
                            : "rgba(201,160,99,0.18)",
                        },
                      ]}
                    >
                      {homePromo.code}
                    </Text>
                    <Text style={[styles.promoBannerSub, { color: isDark ? "#A8A29A" : "#6B6560" }]}>
                      Tap to apply at checkout
                    </Text>
                  </View>
                </View>
                <Text style={[styles.promoBannerCta, { color: ACCENT_DARK }]}>Use</Text>
              </Pressable>
              <Pressable
                onPress={() => void dismissPromoBanner()}
                hitSlop={12}
                style={styles.promoBannerClose}
                accessibilityRole="button"
                accessibilityLabel="Dismiss offer"
              >
                <Ionicons name="close" size={16} color={isDark ? "#A8A29A" : "#8A847C"} />
              </Pressable>
            </View>
          ) : null}

          {/* Service actions — concierge mock (default) or legacy dual cards */}
          <View style={[styles.serviceStack, layout.isCompact && { gap: 10 }]}>
            {HOME_SERVICES_STYLE === "legacy" ? (
              <>
                <PrimaryRideCard
                  isDark={isDark}
                  isCompact={layout.isCompact}
                  entrance={primaryEntry}
                  onPress={openRide}
                />
                <SecondaryParcelRow
                  isDark={isDark}
                  entrance={secondaryEntry}
                  onPress={openParcel}
                />
              </>
            ) : (
              <Animated.View style={{ opacity: primaryEntry, gap: 8 }}>
                {/* Where to? — type + suggestions stay inside this sheet */}
                {whereSearching ? (
                  <View style={styles.conciergeWhereSearch}>
                    <View
                      style={[
                        styles.uberRouteCard,
                        {
                          backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#FFFFFF",
                          borderColor: isDark ? "rgba(255,255,255,0.14)" : "#1C1916",
                        },
                      ]}
                    >
                      <View style={styles.uberRouteRail} pointerEvents="none">
                        <View
                          style={[
                            styles.uberPickupDot,
                            { backgroundColor: isDark ? "#F5F0E8" : CONCIERGE_INK },
                          ]}
                        />
                        <View
                          style={[
                            styles.uberRailLine,
                            {
                              backgroundColor: isDark
                                ? "rgba(255,255,255,0.22)"
                                : "rgba(0,0,0,0.18)",
                            },
                          ]}
                        />
                        {whereStops.map((_, i) => (
                          <View key={`rail-stop-${i}`} style={styles.uberRailStopWrap}>
                            <View
                              style={[
                                styles.uberStopDot,
                                {
                                  borderColor: isDark ? "#C9B8A0" : ACCENT_DARK,
                                  backgroundColor: isDark
                                    ? "rgba(201,184,160,0.2)"
                                    : "rgba(168,120,48,0.15)",
                                },
                              ]}
                            />
                            <View
                              style={[
                                styles.uberRailLine,
                                {
                                  backgroundColor: isDark
                                    ? "rgba(255,255,255,0.22)"
                                    : "rgba(0,0,0,0.18)",
                                },
                              ]}
                            />
                          </View>
                        ))}
                        <View
                          style={[
                            styles.uberDropoffSquare,
                            { backgroundColor: GOLD },
                          ]}
                        />
                      </View>
                      <View style={styles.uberRouteFields}>
                        <GooglePlacesAddressField
                          value={wherePickup}
                          onChangeText={(t) => {
                            setWherePickup(t);
                            setWherePickupCoords(null);
                            setWherePickupPlaceLabel("");
                          }}
                          placeholder="Pickup"
                          iconName="radio-button-on"
                          embedded
                          hidePanel
                          autoFocus={routeFocus === "pickup"}
                          inputRef={pickupInputRef}
                          pickHandlerRef={pickupPickRef}
                          dismissHandlerRef={pickupDismissRef}
                          onFocusChange={(focused) => {
                            if (!focused) return;
                            routeFocusRef.current = "pickup";
                            setRouteFocus("pickup");
                            dismissAllWhereFields("pickup");
                          }}
                          onSuggestionsChange={(state) =>
                            onRouteSuggestionsFrom("pickup", state)
                          }
                          onPlaceResolved={onWherePickupResolved}
                          containerStyle={styles.conciergeWhereField}
                        />

                        {whereStops.map((stop, index) => (
                          <View key={`where-stop-${index}`} style={styles.whereStopRow}>
                            <GooglePlacesAddressField
                              value={stop}
                              onChangeText={(t) =>
                                setWhereStops((prev) =>
                                  prev.map((s, i) => (i === index ? t : s))
                                )
                              }
                              placeholder={
                                whereStops.length > 1
                                  ? `Stop ${index + 1}`
                                  : "Add a stop"
                              }
                              iconName="ellipse-outline"
                              embedded
                              hidePanel
                              autoFocus={routeFocus === index}
                              inputRef={stopInputRefs.current[index]}
                              pickHandlerRef={stopPickRefs.current[index]}
                              dismissHandlerRef={stopDismissRefs.current[index]}
                              onFocusChange={(focused) => {
                                if (!focused) return;
                                routeFocusRef.current = index;
                                setRouteFocus(index);
                                dismissAllWhereFields(index);
                              }}
                              onSuggestionsChange={(state) =>
                                onRouteSuggestionsFrom(index, state)
                              }
                              onPlaceResolved={(place) =>
                                onWhereStopResolved(index, place)
                              }
                              containerStyle={styles.whereStopField}
                            />
                            <Pressable
                              onPress={() => removeWhereStop(index)}
                              hitSlop={8}
                              style={styles.whereStopRemove}
                              accessibilityLabel={`Remove stop ${index + 1}`}
                            >
                              <Ionicons
                                name="close-circle"
                                size={22}
                                color={isDark ? "#A8A29A" : "#8A847C"}
                              />
                            </Pressable>
                          </View>
                        ))}

                        {whereStops.length < MAX_APP_STOPS ? (
                          <Pressable
                            onPress={addWhereStop}
                            style={({ pressed }) => [
                              styles.whereAddStopBtn,
                              pressed && { opacity: 0.75 },
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel="Add stop"
                          >
                            <Ionicons
                              name="add"
                              size={18}
                              color={isDark ? GOLD : ACCENT_DARK}
                            />
                            <Text
                              style={[
                                styles.whereAddStopText,
                                { color: isDark ? GOLD : ACCENT_DARK },
                              ]}
                            >
                              {whereStops.length === 0 ? "Add stop" : "Add another stop"}
                            </Text>
                          </Pressable>
                        ) : null}

                        <GooglePlacesAddressField
                          value={dropoff}
                          onChangeText={(t) => {
                            setDropoff(t);
                            setDropoffCoords(null);
                            setWhereDropoffPlaceLabel("");
                          }}
                          placeholder="Where to?"
                          iconName="square"
                          embedded
                          embeddedDivider={false}
                          hidePanel
                          autoFocus={routeFocus === "dropoff"}
                          inputRef={dropoffInputRef}
                          pickHandlerRef={dropoffPickRef}
                          dismissHandlerRef={dropoffDismissRef}
                          onFocusChange={(focused) => {
                            if (!focused) return;
                            routeFocusRef.current = "dropoff";
                            setRouteFocus("dropoff");
                            dismissAllWhereFields("dropoff");
                          }}
                          onSuggestionsChange={(state) =>
                            onRouteSuggestionsFrom("dropoff", state)
                          }
                          onPlaceResolved={onWhereDropoffResolved}
                          containerStyle={styles.conciergeWhereField}
                        />
                      </View>
                    </View>

                    {whereIsAirportTransfer && !routeSuggestions?.showPanel ? (
                      <View
                        style={[
                          styles.whereFlightBlock,
                          {
                            backgroundColor: isDark
                              ? "rgba(255,255,255,0.06)"
                              : CONCIERGE_CREAM,
                            borderColor: isDark
                              ? "rgba(255,255,255,0.1)"
                              : "rgba(0,0,0,0.06)",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.whereFlightTitle,
                            { color: isDark ? "#F5F0E8" : CONCIERGE_INK },
                          ]}
                        >
                          Flight details
                        </Text>
                        <TextInput
                          style={[
                            styles.whereFlightInput,
                            {
                              color: isDark ? "#F5F0E8" : CONCIERGE_INK,
                              backgroundColor: isDark
                                ? "rgba(255,255,255,0.06)"
                                : "#fff",
                              borderColor: isDark
                                ? "rgba(255,255,255,0.12)"
                                : "rgba(0,0,0,0.08)",
                            },
                          ]}
                          value={whereAirline}
                          onChangeText={setWhereAirline}
                          placeholder="Airline"
                          placeholderTextColor={isDark ? "#A8A29A" : "#8A847C"}
                          autoCapitalize="words"
                        />
                        <TextInput
                          style={[
                            styles.whereFlightInput,
                            {
                              marginTop: 8,
                              color: isDark ? "#F5F0E8" : CONCIERGE_INK,
                              backgroundColor: isDark
                                ? "rgba(255,255,255,0.06)"
                                : "#fff",
                              borderColor: isDark
                                ? "rgba(255,255,255,0.12)"
                                : "rgba(0,0,0,0.08)",
                            },
                          ]}
                          value={whereFlightNumber}
                          onChangeText={setWhereFlightNumber}
                          placeholder="Flight/Tail number"
                          placeholderTextColor={isDark ? "#A8A29A" : "#8A847C"}
                          autoCapitalize="characters"
                        />
                        {whereAllowMeetGreet ? (
                          <View
                            style={[
                              styles.whereMeetGreetRow,
                              {
                                borderColor: isDark
                                  ? "rgba(255,255,255,0.12)"
                                  : "rgba(0,0,0,0.08)",
                                backgroundColor: isDark
                                  ? "rgba(255,255,255,0.04)"
                                  : "#fff",
                              },
                            ]}
                          >
                            <View style={{ flex: 1, minWidth: 0, paddingRight: 4 }}>
                              <Text
                                style={[
                                  styles.whereMeetGreetTitle,
                                  { color: isDark ? "#F5F0E8" : CONCIERGE_INK },
                                ]}
                                numberOfLines={1}
                              >
                                Meet & Greet
                              </Text>
                              <Text
                                style={[
                                  styles.whereMeetGreetSub,
                                  { color: isDark ? "#A8A29A" : "#6B6560" },
                                ]}
                                numberOfLines={2}
                              >
                                Personal airport assistance +$
                                {MEET_GREET_CHARGE.toFixed(0)}
                              </Text>
                            </View>
                            <Switch
                              value={whereMeetGreet}
                              onValueChange={setWhereMeetGreet}
                              trackColor={{
                                false: "rgba(150,150,150,0.35)",
                                true: "rgba(201,160,99,0.55)",
                              }}
                              thumbColor={whereMeetGreet ? GOLD : "#f4f3f4"}
                            />
                          </View>
                        ) : null}
                      </View>
                    ) : null}

                    {routeSuggestions?.showPanel ? (
                      <PlacesSuggestionsPanel
                        predictions={routeSuggestions.predictions}
                        loading={routeSuggestions.loading}
                        banner={routeSuggestions.banner}
                        value={routeSuggestions.value}
                        maxPanelHeight={Math.max(routeSuggestMaxH, 320)}
                        flat
                        onInteract={softDismissWhereKeyboard}
                        onDismiss={() => {
                          softDismissWhereKeyboard();
                          if (routeFocus === "pickup") pickupDismissRef.current?.();
                          else if (routeFocus === "dropoff") dropoffDismissRef.current?.();
                          else if (typeof routeFocus === "number") {
                            stopDismissRefs.current[routeFocus]?.current?.();
                          }
                          setRouteSuggestions(null);
                        }}
                        onPick={(item) => {
                          softDismissWhereKeyboard();
                          if (routeFocus === "pickup") pickupPickRef.current?.(item);
                          else if (routeFocus === "dropoff") dropoffPickRef.current?.(item);
                          else if (typeof routeFocus === "number") {
                            stopPickRefs.current[routeFocus]?.current?.(item);
                          }
                        }}
                      />
                    ) : whereShowVehicles ? (
                      <Animated.View
                        style={[
                          styles.whereVehicleBlock,
                          {
                            opacity: whereVehicleReveal,
                            transform: [
                              {
                                translateY: whereVehicleReveal.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [14, 0],
                                }),
                              },
                            ],
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.whereVehicleHairline,
                            {
                              backgroundColor: isDark
                                ? "rgba(255,255,255,0.12)"
                                : "rgba(0,0,0,0.08)",
                            },
                          ]}
                        />
                        <Text
                          style={[
                            styles.whereVehicleEyebrow,
                            { color: isDark ? GOLD : palette.hintBold },
                          ]}
                        >
                          VEHICLE
                        </Text>
                        <Text
                          style={[
                            styles.whereVehicleTitle,
                            { color: isDark ? "#F5F0E8" : CONCIERGE_INK },
                          ]}
                        >
                          Select vehicle
                        </Text>
                        <Text
                          style={[
                            styles.whereVehicleSub,
                            { color: isDark ? "#A8A29A" : "#6B6560" },
                          ]}
                        >
                          Estimated fare for this route
                          {whereRouteMeta?.distanceText
                            ? ` · ${whereRouteMeta.distanceText}`
                            : whereRouteLoading
                              ? " · calculating…"
                              : ""}
                          {whereRouteMeta?.durationText
                            ? ` · ${whereRouteMeta.durationText}`
                            : ""}
                        </Text>

                        {whereFleetError ? (
                          <Text style={styles.whereVehicleError}>{whereFleetError}</Text>
                        ) : null}
                        {whereRouteError && !whereRouteLoading ? (
                          <Text
                            style={[
                              styles.whereVehicleHint,
                              { color: isDark ? "#A8A29A" : "#6B6560" },
                            ]}
                          >
                            {whereRouteError}
                          </Text>
                        ) : null}

                        <VehicleTierSelectList
                          tiers={whereTiers}
                          selectedId={whereSelectedTierId}
                          fares={whereTierFareById}
                          onSelect={selectWhereVehicle}
                          loading={whereFleetLoading}
                          textColor={isDark ? "#F5F0E8" : CONCIERGE_INK}
                          mutedColor={isDark ? "#A8A29A" : "#6B6560"}
                          isDark={isDark}
                        />
                      </Animated.View>
                    ) : null}
                  </View>
                ) : (
                  <View
                    style={[
                      styles.conciergeWhereBar,
                      {
                        backgroundColor: isDark ? "rgba(255,255,255,0.08)" : CONCIERGE_CREAM,
                      },
                    ]}
                  >
                    <Pressable
                      onPress={launchSelectedService}
                      accessibilityRole="button"
                      accessibilityLabel="Where to?"
                      style={({ pressed }) => [
                        styles.conciergeWhereMain,
                        pressed && { opacity: 0.9 },
                      ]}
                    >
                      <Ionicons
                        name="search"
                        size={20}
                        color={isDark ? "#F5F0E8" : CONCIERGE_INK}
                      />
                      <Text
                        style={[
                          styles.conciergeWhereTitle,
                          { color: isDark ? "#F5F0E8" : CONCIERGE_INK },
                        ]}
                        numberOfLines={1}
                      >
                        Where to?
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={openRide}
                      style={({ pressed }) => [
                        styles.conciergeNowPill,
                        {
                          backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "#FFFFFF",
                        },
                        pressed && { opacity: 0.85 },
                      ]}
                      accessibilityLabel="Schedule for now"
                    >
                      <Ionicons
                        name="time-outline"
                        size={14}
                        color={isDark ? "#C9B8A0" : CONCIERGE_INK}
                      />
                      <Text
                        style={[
                          styles.conciergeNowText,
                          { color: isDark ? "#E8DED0" : CONCIERGE_INK },
                        ]}
                      >
                        Now
                      </Text>
                    </Pressable>
                  </View>
                )}

                {!whereSearching ? (
                  <>
                {/* Saved places — list rows */}
                <View style={styles.conciergePlaceList}>
                  <ConciergePlaceRow
                    icon="briefcase-outline"
                    title="Office"
                    subtitle={
                      savedOffice?.address?.trim() || "Set your office address"
                    }
                    isDark={isDark}
                    onPress={() => onQuickPlacePress("office")}
                    onLongPress={() => openPlaceModal("office")}
                    showDivider
                  />
                  <ConciergePlaceRow
                    icon="home-outline"
                    title="Home"
                    subtitle={savedHome?.address?.trim() || "Set your home address"}
                    isDark={isDark}
                    onPress={() => onQuickPlacePress("home")}
                    onLongPress={() => openPlaceModal("home")}
                  />
                </View>

                {/* Services */}
                <View style={styles.conciergeServicesBlock}>
                  <View style={styles.conciergeServicesHeader}>
                    <Text
                      style={[
                        styles.conciergeServicesTitle,
                        { color: isDark ? "#F5F0E8" : CONCIERGE_INK },
                      ]}
                    >
                      Services
                    </Text>
                  </View>
                  <View style={styles.conciergeServiceRow}>
                    <ConciergeServiceTile
                      icon="car-outline"
                      label="Ride"
                      isDark={isDark}
                      onPress={() => onConciergeServicePress("ride")}
                    />
                    <ConciergeServiceTile
                      icon="airplane-outline"
                      label="Airport"
                      isDark={isDark}
                      onPress={() => onConciergeServicePress("airport")}
                    />
                    <ConciergeServiceTile
                      icon="time-outline"
                      label="Hourly"
                      isDark={isDark}
                      onPress={() => onConciergeServicePress("hourly")}
                    />
                    <ConciergeServiceTile
                      icon="cube-outline"
                      label="Parcel"
                      isDark={isDark}
                      onPress={() => onConciergeServicePress("parcel")}
                    />
                  </View>
                </View>
                  </>
                ) : null}
              </Animated.View>
            )}
          </View>
          </View>
        </ScrollView>
        {whereSearching && whereShowVehicles ? (
          <View
            style={[
              styles.whereContinueFooter,
              {
                paddingHorizontal: layout.sheetContentPad,
                paddingBottom:
                  (keyboardH > 0 ? keyboardH : Math.max(insets.bottom, 12)) + 10,
                backgroundColor: isDark ? "#141210" : "#FFFFFF",
                borderTopColor: isDark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(0,0,0,0.06)",
              },
            ]}
          >
            <Pressable
              onPress={continueWhereToReview}
              disabled={!whereSelectedTierId || whereFleetLoading || whereRouteLoading}
              style={({ pressed }) => [
                styles.whereContinueBtn,
                (!whereSelectedTierId ||
                  whereFleetLoading ||
                  whereRouteLoading) &&
                  styles.whereContinueBtnDisabled,
                pressed &&
                  whereSelectedTierId &&
                  !whereFleetLoading &&
                  !whereRouteLoading && { opacity: 0.92 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Continue to review"
            >
              <LinearGradient
                colors={["#E8C078", ACCENT, ACCENT_DARK]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.whereContinueBtnGrad}
              >
                <Text style={styles.whereContinueBtnText}>
                  {!whereSelectedTierId
                    ? "Select a vehicle"
                    : whereRouteLoading
                      ? "Calculating route…"
                      : "Continue"}
                </Text>
                {whereSelectedTierId && !whereRouteLoading ? (
                  <Ionicons name="arrow-forward" size={18} color="#1A1208" />
                ) : null}
              </LinearGradient>
            </Pressable>
          </View>
        ) : null}
      </Animated.View>

      {/* Destination composer renders inline in the top header (see topRow). */}

      {/* Set / edit Home or Office address */}
      <Modal
        visible={placeModalKind != null}
        transparent
        animationType="fade"
        onRequestClose={closePlaceModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.placeModalRoot}
        >
          <Pressable style={styles.placeModalBackdrop} onPress={closePlaceModal} />
          <View
            style={[
              styles.placeModalCard,
              { backgroundColor: isDark ? "#1C1813" : "#FFFFFF" },
            ]}
          >
            <Text style={[styles.placeModalTitle, { color: isDark ? "#F5F0E8" : CONCIERGE_INK }]}>
              {placeModalKind === "office" ? "Set Office address" : "Set Home address"}
            </Text>
            <Text style={[styles.placeModalSub, { color: isDark ? "#A8A29A" : "#6B6560" }]}>
              Saved on this device for one-tap booking.
            </Text>
            <GooglePlacesAddressField
              value={placeDraft}
              onChangeText={(t) => {
                setPlaceDraft(t);
                setPlaceDraftCoords(null);
              }}
              placeholder={
                placeModalKind === "office" ? "Search office address" : "Search home address"
              }
              iconName={placeModalKind === "office" ? "briefcase-outline" : "home-outline"}
              autoFocus
              maxPanelHeight={200}
              onPlaceResolved={(place) => {
                setPlaceDraft(place.address);
                setPlaceDraftCoords(
                  place.lat != null && place.lng != null
                    ? { lat: place.lat, lng: place.lng }
                    : null
                );
              }}
            />
            <View style={styles.placeModalActions}>
              <Pressable
                onPress={closePlaceModal}
                style={({ pressed }) => [
                  styles.placeModalBtnGhost,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={[styles.placeModalBtnGhostText, { color: isDark ? "#C9B8A0" : "#6B6560" }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={() => void savePlaceAndBook()}
                disabled={placeSaving || placeDraft.trim().length < 3}
                style={({ pressed }) => [
                  styles.placeModalBtnPrimary,
                  (placeSaving || placeDraft.trim().length < 3) && { opacity: 0.45 },
                  pressed && { opacity: 0.9 },
                ]}
              >
                {placeSaving ? (
                  <ActivityIndicator size="small" color="#1A1208" />
                ) : (
                  <Text style={styles.placeModalBtnPrimaryText}>Save & continue</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Who is riding — Plan your ride */}
      <Modal
        visible={showWhereRideForMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWhereRideForMenu(false)}
      >
        <Pressable
          style={styles.whereRideForModalRoot}
          onPress={() => setShowWhereRideForMenu(false)}
        >
          <View
            style={[
              styles.whereRideForMenuCard,
              {
                backgroundColor: isDark ? "#2A2622" : "#FFF",
                borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
              },
            ]}
          >
            <Text
              style={[
                styles.whereRideForMenuTitle,
                { color: isDark ? "#F5F0E8" : CONCIERGE_INK },
              ]}
            >
              Who is riding?
            </Text>

            {(
              [
                {
                  id: "me" as const,
                  title: "For me",
                  sub:
                    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
                    "Your account",
                  icon: "person-outline" as const,
                },
                {
                  id: "child" as const,
                  title: "Child",
                  sub: "Book a ride for your child",
                  icon: "happy-outline" as const,
                },
                {
                  id: "someone" as const,
                  title: "Someone else",
                  sub: "Ride for a guest",
                  icon: "people-outline" as const,
                },
              ] as const
            ).map((opt) => {
              const on = whereRideFor === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => {
                    setWhereRideFor(opt.id);
                    setShowWhereRideForMenu(false);
                  }}
                  style={({ pressed }) => [
                    styles.whereRideForMenuItem,
                    on && {
                      backgroundColor: isDark
                        ? "rgba(201,160,99,0.14)"
                        : "rgba(201,160,99,0.12)",
                    },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <View
                    style={[
                      styles.whereRideForMenuIcon,
                      {
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.08)"
                          : CONCIERGE_CREAM,
                      },
                    ]}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={18}
                      color={isDark ? "#F5F0E8" : CONCIERGE_INK}
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={[
                        styles.whereRideForMenuItemTitle,
                        { color: isDark ? "#F5F0E8" : CONCIERGE_INK },
                      ]}
                    >
                      {opt.title}
                    </Text>
                    <Text
                      style={[
                        styles.whereRideForMenuItemSub,
                        { color: isDark ? "#A8A29A" : "#6B6560" },
                      ]}
                      numberOfLines={1}
                    >
                      {opt.sub}
                    </Text>
                  </View>
                  {on ? (
                    <Ionicons name="checkmark-circle" size={22} color={GOLD} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#E8E4DE",
  },
  mapFade: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  meMarker: {
    alignItems: "center",
    width: 44,
  },
  meBubble: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: "#0B0B0B",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 5,
      },
      android: { elevation: 5 },
    }),
  },
  meSilhouette: {
    width: 22,
    height: 24,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  meHead: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#FFF",
    marginBottom: 2,
  },
  meTorso: {
    width: 14,
    height: 11,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    backgroundColor: "#FFF",
  },
  meArm: {
    position: "absolute",
    right: -1,
    top: 8,
    width: 3,
    height: 10,
    borderRadius: 2,
    backgroundColor: "#FFF",
    transform: [{ rotate: "35deg" }],
  },
  meStem: {
    width: 2.5,
    height: 11,
    backgroundColor: "#0B0B0B",
    marginTop: -1,
  },
  meDotHalo: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(66,133,244,0.22)",
    marginTop: -3,
    alignItems: "center",
    justifyContent: "center",
  },
  meDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#4285F4",
    borderWidth: 2.5,
    borderColor: "#FFF",
  },
  topSafe: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 6,
  },
  inlineComposer: {
    marginTop: 6,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 14,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: { elevation: 6 },
    }),
  },
  inlineBackBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
    marginLeft: -4,
  },
  fab: {
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  fabAvatar: {
    alignItems: "center",
    justifyContent: "center",
  },
  fabInitials: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  /** Review-style avatar + chevron (no "For me" text). */
  whereRideForAvatarBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    flexGrow: 0,
    flexShrink: 0,
    paddingVertical: 2,
    paddingLeft: 2,
  },
  whereRideForAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "#111827",
  },
  whereRideForAvatarMe: {
    backgroundColor: "#111827",
  },
  whereRideForAvatarChild: {
    backgroundColor: "#C9A063",
  },
  whereRideForAvatarSomeone: {
    backgroundColor: "#4B5563",
  },
  whereRideForInitials: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.2,
  },
  whereRideForModalRoot: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-start",
    paddingTop: 140,
    paddingHorizontal: 20,
  },
  whereRideForMenuCard: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 4,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
    }),
  },
  whereRideForMenuTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
    marginBottom: 6,
    marginLeft: 4,
    opacity: 0.7,
  },
  whereRideForMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  whereRideForMenuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  whereRideForMenuItemTitle: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  whereRideForMenuItemSub: {
    fontSize: 12.5,
    fontWeight: "500",
    marginTop: 1,
  },
  pickupChip: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFF",
    borderRadius: 28,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: { elevation: 3 },
    }),
  },
  pickupDotWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(34,197,94,0.14)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  pickupDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22C55E",
  },
  pickupCopy: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  pickupEyebrow: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.8,
    color: "#8A847C",
    marginBottom: 1,
    textTransform: "uppercase",
  },
  pickupLabel: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#1C1C1E",
    letterSpacing: -0.2,
  },
  pickupChevronBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F3F0EA",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  locationBanner: {
    alignSelf: "center",
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  locationBannerText: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  mapFabStack: {
    position: "absolute",
    zIndex: 15,
    alignItems: "center",
    gap: 10,
  },
  recenterFab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  sheet: {
    position: "absolute",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    zIndex: 10,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: { elevation: 14 },
    }),
  },
  sheetHandleHit: {
    paddingTop: 2,
    paddingBottom: 2,
  },
  sheetHandleWrap: {
    alignItems: "center",
    paddingTop: 4,
    paddingBottom: 8,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  sheetContent: {
    paddingTop: 6,
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
    width: "100%",
  },
  greetingTextWrap: {
    flex: 1,
    minWidth: 0,
    marginRight: 4,
  },
  promoBanner: {
    flexDirection: "row",
    alignItems: "stretch",
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
  },
  promoBannerMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 4,
  },
  promoBannerIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(201,160,99,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  promoBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  promoBannerSub: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  promoCodeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
    flexWrap: "wrap",
  },
  promoCodeChip: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: "hidden",
  },
  promoBannerCta: {
    fontSize: 13,
    fontWeight: "700",
    paddingHorizontal: 6,
  },
  promoBannerClose: {
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  brandMark: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.6,
    marginBottom: 2,
  },
  greeting: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  bookingsPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bookingsPillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  liveFloat: {
    position: "absolute",
    zIndex: 16,
    borderRadius: 16,
    padding: 14,
    backgroundColor: "#0F1A12",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  liveTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  liveDotWrap: {
    width: 14,
    height: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  liveDotHalo: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "rgba(52,199,89,0.4)",
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#34C759",
  },
  liveEyebrow: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    fontWeight: "800",
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 1.1,
  },
  liveChip: {
    flexShrink: 1,
    maxWidth: "52%",
    backgroundColor: "rgba(52,199,89,0.16)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  liveChipText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#34C759",
    textTransform: "uppercase",
  },
  liveRoute: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFF",
  },
  liveMeta: {
    marginTop: 4,
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
  },
  serviceStack: {
    gap: 10,
    marginBottom: 0,
  },
  conciergeWhereSearch: {
    gap: 10,
  },
  conciergeWhereSearchTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  conciergeWhereBack: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -6,
  },
  conciergeWhereSearchLabel: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  conciergeWhereField: {
    zIndex: 1,
  },
  uberRouteCard: {
    flexDirection: "row",
    alignItems: "stretch",
    borderRadius: 18,
    borderWidth: 1.5,
    paddingVertical: 6,
    paddingRight: 12,
    paddingLeft: 6,
    gap: 10,
  },
  uberRouteRail: {
    width: 22,
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 22,
    paddingBottom: 22,
    alignSelf: "stretch",
  },
  uberPickupDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  uberRailLine: {
    flex: 1,
    width: 2,
    borderRadius: 1,
    marginVertical: 6,
    minHeight: 22,
  },
  uberDropoffSquare: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  uberRailStopWrap: {
    alignItems: "center",
    alignSelf: "stretch",
    width: 22,
  },
  uberStopDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  uberRouteFields: {
    flex: 1,
    minWidth: 0,
    gap: 0,
  },
  whereStopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  whereStopField: {
    flex: 1,
    minWidth: 0,
  },
  whereStopRemove: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  whereAddStopBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  whereFlightBlock: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  whereFlightTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: -0.1,
    marginBottom: 8,
  },
  whereFlightInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    fontSize: 15,
    fontWeight: "500",
  },
  whereMeetGreetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 52,
  },
  whereMeetGreetTitle: {
    fontSize: 14,
    fontWeight: "700",
    flexShrink: 1,
  },
  whereMeetGreetSub: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
    lineHeight: 16,
    flexShrink: 1,
  },
  whereContinueFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
  },
  whereContinueBtn: {
    borderRadius: 14,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: ACCENT,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.28,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  whereContinueBtnDisabled: {
    opacity: 0.45,
  },
  whereContinueBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  whereContinueBtnText: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
    color: "#1A1208",
  },
  whereAddStopText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  whereVehicleBlock: {
    marginTop: 6,
    paddingBottom: 4,
  },
  whereVehicleHairline: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  whereVehicleEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  whereVehicleTitle: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.35,
    marginBottom: 3,
  },
  whereVehicleSub: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  whereVehicleError: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  whereVehicleHint: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  conciergeWhereBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 28,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 6,
    minHeight: 50,
  },
  conciergeWhereMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 6,
  },
  conciergeWhereTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  conciergeNowPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 22,
    flexShrink: 0,
  },
  conciergeNowText: {
    fontSize: 14,
    fontWeight: "600",
  },
  conciergePlaceList: {
    marginTop: 0,
  },
  conciergePlaceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 8,
  },
  conciergePlaceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  conciergePlaceCopy: {
    flex: 1,
    minWidth: 0,
  },
  conciergePlaceTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  conciergePlaceSub: {
    fontSize: 13,
    fontWeight: "400",
    marginTop: 2,
  },
  conciergePlaceDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 54,
  },
  conciergeServicesBlock: {
    marginTop: 6,
    marginBottom: 8,
  },
  conciergeServicesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  conciergeServicesTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  conciergeSeeAll: {
    fontSize: 14,
    fontWeight: "600",
  },
  placeModalRoot: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  placeModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  placeModalCard: {
    borderRadius: 20,
    padding: 18,
    zIndex: 2,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
      },
      android: { elevation: 16 },
    }),
  },
  placeModalTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  placeModalSub: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 14,
  },
  placeModalActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 16,
  },
  placeModalBtnGhost: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  placeModalBtnGhostText: {
    fontSize: 14,
    fontWeight: "600",
  },
  placeModalBtnPrimary: {
    backgroundColor: CONCIERGE_GOLD,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 140,
    alignItems: "center",
  },
  placeModalBtnPrimaryText: {
    color: "#1A1208",
    fontSize: 14,
    fontWeight: "800",
  },
  conciergeServiceRow: {
    flexDirection: "row",
    gap: 12,
  },
  conciergeTileCol: {
    flex: 1,
    alignItems: "center",
    gap: 8,
  },
  conciergeTileFace: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  conciergeTileLabel: {
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: -0.1,
  },
  upcomingFloat: {
    position: "absolute",
    zIndex: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    paddingHorizontal: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
      },
      android: { elevation: 6 },
    }),
  },
  upcomingFloatIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  upcomingFloatEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.7,
    color: CONCIERGE_GOLD,
    marginBottom: 1,
  },
  upcomingFloatTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  pressed: {
    opacity: 0.92,
  },
  composerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.18)",
    zIndex: 25,
  },
  composer: {
    position: "absolute",
    marginHorizontal: 12,
    maxHeight: "82%",
    borderRadius: 22,
    zIndex: 30,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 20,
      },
      android: { elevation: 24 },
    }),
  },
  composerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingTop: 12,
    paddingBottom: 6,
  },
  composerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  composerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  composerFields: {
    paddingTop: 8,
  },
  composerFieldLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    marginBottom: 8,
  },
  composerGpsBtn: {
    marginTop: 12,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  composerGpsText: {
    fontSize: 13,
    fontWeight: "700",
  },
  composerContinue: {
    marginTop: 26,
    borderRadius: 14,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: ACCENT,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  composerContinueGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  composerContinueDisabled: {
    opacity: 0.45,
  },
  composerContinueText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1208",
  },
});
