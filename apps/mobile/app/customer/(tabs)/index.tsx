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
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
  Modal,
  Alert,
  KeyboardAvoidingView,
  TextInput,
  Keyboard,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
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
  type ActiveAppPromotion,
} from "../../../services/api";
import { useReservationStream } from "../../../hooks/useReservationStream";
import {
  GooglePlacesAddressField,
  PlacesSuggestionsPanel,
  type GooglePlacesSuggestionsState,
} from "../../../components/GooglePlacesAddressField";
import type { PlacePrediction } from "../../../services/places";
import { GOLD } from "../../../theme/driver-theme";
import { isParcelServiceType } from "../../../utils/parcel";
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
  const { isDark, toggleTheme } = useCustomerTheme();
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
  const [routeFocus, setRouteFocus] = useState<"pickup" | "dropoff">("dropoff");
  const [routeSuggestions, setRouteSuggestions] = useState<GooglePlacesSuggestionsState | null>(
    null
  );
  const routeFocusRef = useRef<"pickup" | "dropoff">("dropoff");
  const pickupPickRef = useRef<((p: PlacePrediction) => void) | null>(null);
  const dropoffPickRef = useRef<((p: PlacePrediction) => void) | null>(null);
  const pickupDismissRef = useRef<(() => void) | null>(null);
  const dropoffDismissRef = useRef<(() => void) | null>(null);
  const dropoffInputRef = useRef<TextInput | null>(null);
  const [keyboardH, setKeyboardH] = useState(0);

  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const onShow = Keyboard.addListener(showEvt, (e) => {
      setKeyboardH(e.endCoordinates?.height ?? 0);
    });
    const onHide = Keyboard.addListener(hideEvt, () => setKeyboardH(0));
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

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

  const cancelWhereSearch = useCallback(() => {
    setWhereSearching(false);
    setWherePickup("");
    setWherePickupCoords(null);
    setDropoff("");
    setDropoffCoords(null);
    setRouteSuggestions(null);
    routeFocusRef.current = "dropoff";
    setRouteFocus("dropoff");
  }, []);

  const bookWithDropoff = useCallback(
    (place: { address: string; lat?: number; lng?: number }) => {
      const params: Record<string, string> = {};
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
      const address = place.address.trim();
      if (address) params.dropoff = address;
      if (place.lat != null && place.lng != null) {
        params.dropoffLat = String(place.lat);
        params.dropoffLng = String(place.lng);
      }
      setWhereSearching(false);
      setDropoff(address);
      setDropoffCoords(
        place.lat != null && place.lng != null ? { lat: place.lat, lng: place.lng } : null
      );
      setRouteSuggestions(null);
      router.push({ pathname: "/customer/create-reservation", params });
    },
    [bookingParams, wherePickup, wherePickupCoords, coords, isUsablePickupLabel]
  );

  const onWherePickupResolved = useCallback(
    (place: { address: string; lat?: number; lng?: number }) => {
      setWherePickup(place.address);
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
      pickupDismissRef.current?.();
      setRouteSuggestions(null);
      routeFocusRef.current = "dropoff";
      setRouteFocus("dropoff");
      setTimeout(() => dropoffInputRef.current?.focus(), 80);
    },
    []
  );

  const onRouteSuggestionsFrom = useCallback(
    (field: "pickup" | "dropoff", state: GooglePlacesSuggestionsState | null) => {
      if (routeFocusRef.current !== field) return;
      setRouteSuggestions(state);
    },
    []
  );

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
  // While typing addresses, keyboard covers the tab bar — drop heavy footer clearance.
  const sheetPadBottom = isConciergeSheet
    ? whereSearching && keyboardH > 0
      ? Math.max(insets.bottom, 12) + 8
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
  // Search mode hides Office/Home/Services — size for dual fields + shared suggestions only.
  const routeSuggestMaxH = Math.round(
    Math.min(
      layout.isShort ? 160 : 220,
      Math.max(120, windowHeight * (layout.isShort ? 0.22 : 0.28) - (keyboardH > 0 ? 40 : 0))
    )
  );
  const homeSearchContentH =
    16 + // handle
    40 + // greeting
    12 + // greeting gap
    36 + // Plan your ride header
    118 + // Uber pickup + dropoff card
    10 + // gap
    routeSuggestMaxH +
    28; // panel chrome
  const searchSheetCap = layout.isShort ? 0.78 : layout.isTablet ? 0.7 : 0.8;
  const idleSheetCap = layout.isShort ? 0.7 : 0.64;
  // iOS: lift sheet above keyboard. Android usually resizes the window already.
  const sheetKeyboardLift =
    Platform.OS === "ios" && whereSearching && keyboardH > 0 ? keyboardH : 0;
  const availableH = Math.max(300, windowHeight - sheetKeyboardLift);
  const conciergeSheetH = Math.round(
    Math.min(
      availableH * (whereSearching ? searchSheetCap : idleSheetCap),
      (whereSearching ? homeSearchContentH : homeIdleContentH) +
        (whereSearching && keyboardH > 0 ? sheetPadBottom : floatingTabClearance)
    )
  );
  const effectiveSheetTop = isConciergeSheet
    ? windowHeight - sheetKeyboardLift - conciergeSheetH
    : layout.sheetTop;
  mapTopRatioRef.current = effectiveSheetTop / windowHeight;

  const startWhereSearch = useCallback(() => {
    const address = (pickupAddress || pickupLabel).trim();
    const hasPickup = isUsablePickupLabel(address);
    setWherePickup(hasPickup ? address : "");
    setWherePickupCoords(coords);
    setDropoff("");
    setDropoffCoords(null);
    setRouteSuggestions(null);
    const focus: "pickup" | "dropoff" = hasPickup ? "dropoff" : "pickup";
    routeFocusRef.current = focus;
    setRouteFocus(focus);
    setWhereSearching(true);
    setSelectedService("ride");
  }, [pickupAddress, pickupLabel, coords, isUsablePickupLabel]);

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

      {/* Top floating chrome */}
      <SafeAreaView style={styles.topSafe} edges={["top"]} pointerEvents="box-none">
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
              { width: layout.fabSize, height: layout.fabSize, borderRadius: layout.fabSize / 2 },
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
                bottom: sheetKeyboardLift,
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
        {isConciergeSheet ? (
          <View style={styles.sheetHandleHit}>
            <View style={styles.sheetHandleWrap}>
              <View
                style={[styles.sheetHandle, { backgroundColor: isDark ? "#3A3530" : "#D6D0C6" }]}
              />
            </View>
          </View>
        ) : null}
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
          scrollEnabled={whereSearching}
          keyboardShouldPersistTaps={whereSearching ? "always" : "handled"}
          keyboardDismissMode={whereSearching ? "on-drag" : "none"}
          // Sheet already lifts above the iOS keyboard — avoid double inset.
          automaticallyAdjustKeyboardInsets={false}
          style={isConciergeSheet ? { flex: 1 } : undefined}
          contentContainerStyle={
            isConciergeSheet && whereSearching ? { flexGrow: 1, paddingBottom: 8 } : undefined
          }
        >
          <View
            style={[
              styles.sheetContent,
              {
                paddingBottom: sheetPadBottom,
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
          <View style={styles.greetingRow}>
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
            >
              {greetingLine(fullName)}
            </Text>
          </View>

          {homePromo ? (
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
                    <View style={styles.conciergeWhereSearchTop}>
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
                      <View style={{ width: 34 }} />
                    </View>

                    <View
                      style={[
                        styles.uberRouteCard,
                        {
                          backgroundColor: isDark ? "rgba(255,255,255,0.06)" : CONCIERGE_CREAM,
                          borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
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
                            { backgroundColor: isDark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.18)" },
                          ]}
                        />
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
                          }}
                          placeholder="Pickup location"
                          iconName="radio-button-on"
                          compact
                          hidePanel
                          autoFocus={routeFocus === "pickup"}
                          pickHandlerRef={pickupPickRef}
                          dismissHandlerRef={pickupDismissRef}
                          onFocusChange={(focused) => {
                            if (!focused) return;
                            routeFocusRef.current = "pickup";
                            setRouteFocus("pickup");
                            dropoffDismissRef.current?.();
                          }}
                          onSuggestionsChange={(state) =>
                            onRouteSuggestionsFrom("pickup", state)
                          }
                          onPlaceResolved={onWherePickupResolved}
                          containerStyle={styles.conciergeWhereField}
                        />
                        <GooglePlacesAddressField
                          value={dropoff}
                          onChangeText={(t) => {
                            setDropoff(t);
                            setDropoffCoords(null);
                          }}
                          placeholder="Dropoff location"
                          iconName="square"
                          compact
                          hidePanel
                          autoFocus={routeFocus === "dropoff"}
                          inputRef={dropoffInputRef}
                          pickHandlerRef={dropoffPickRef}
                          dismissHandlerRef={dropoffDismissRef}
                          onFocusChange={(focused) => {
                            if (!focused) return;
                            routeFocusRef.current = "dropoff";
                            setRouteFocus("dropoff");
                            pickupDismissRef.current?.();
                          }}
                          onSuggestionsChange={(state) =>
                            onRouteSuggestionsFrom("dropoff", state)
                          }
                          onPlaceResolved={bookWithDropoff}
                          containerStyle={styles.conciergeWhereField}
                        />
                      </View>
                    </View>

                    {routeSuggestions?.showPanel ? (
                      <PlacesSuggestionsPanel
                        predictions={routeSuggestions.predictions}
                        loading={routeSuggestions.loading}
                        banner={routeSuggestions.banner}
                        value={routeSuggestions.value}
                        maxPanelHeight={routeSuggestMaxH}
                        compact
                        onDismiss={() => {
                          if (routeFocus === "pickup") pickupDismissRef.current?.();
                          else dropoffDismissRef.current?.();
                          setRouteSuggestions(null);
                        }}
                        onPick={(item) => {
                          if (routeFocus === "pickup") pickupPickRef.current?.(item);
                          else dropoffPickRef.current?.(item);
                        }}
                      />
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
    marginBottom: 10,
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
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    paddingRight: 10,
    paddingLeft: 4,
    gap: 8,
  },
  uberRouteRail: {
    width: 22,
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 16,
    paddingBottom: 16,
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
    minHeight: 18,
  },
  uberDropoffSquare: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  uberRouteFields: {
    flex: 1,
    minWidth: 0,
    gap: 8,
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
