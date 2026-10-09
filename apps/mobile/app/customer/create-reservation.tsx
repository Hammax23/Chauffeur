import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  Image,
  Platform,
  Alert,
  Modal,
  ActivityIndicator,
  Keyboard,
  Dimensions,
  StatusBar,
  Switch,
  useWindowDimensions,
  Animated,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  type TextInputProps,
} from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCustomerTheme } from "../../contexts/CustomerThemeContext";
import { GOLD, type DriverPalette } from "../../theme/driver-theme";
import * as Location from "expo-location";
import { useAuth } from "../../contexts/AuthContext";
import { GooglePlacesAddressField } from "../../components/GooglePlacesAddressField";
import { fetchDirectionsSummary } from "../../services/places";
import { getAppFleetVehicles, type AppFleetVehicleDto } from "../../services/api";
import {
  buildVehicleTiersFromAppFleet,
  filterVehicleTiersForParcel,
  findTierById,
  formatTierDisplayTitle,
  getTierCapacity,
  getTierSubtitle,
  resolveTierIdFromFleetVehicleId,
  type VehicleTierOption,
} from "../../data/vehicle-tiers";
import {
  calculateAppDistanceFare,
  calculateAppHourlyFare,
  APP_DEFAULT_GRATUITY_PERCENT,
  APP_HOURLY_DURATIONS,
  APP_MIN_HOURLY_HOURS,
  MEET_GREET_CHARGE,
  isAirportPickupLocation,
  parseMaxPassengers,
  BASE_DISTANCE_KM,
  EXTRA_KM_RATE,
  type AppBookingMode,
  type AppDistancePricing,
} from "../../utils/app-fare";
import {
  MAX_APP_STOPS,
  activeStopAddresses,
  joinAppStops,
} from "../../utils/stops";
import { saveBookingDraft } from "../../services/booking-draft";
import {
  PARCEL_SERVICE_TYPE,
  formatParcelWeight,
  isParcelServiceType,
} from "../../utils/parcel";
import {
  formatUsCanadaE164,
  normalizeNanpNationalNumber,
  validateUsCanadaPhone,
} from "../../utils/phone-us-ca";

/** Silent default — create UI no longer asks for service type (distance bookings). */
const DEFAULT_SERVICE_TYPE = "Point-to-Point transportation";
const HOURLY_SERVICE_TYPE = "Hourly ride";
const AS_DIRECTED_DROPOFF = "As directed";

/** Earliest allowed pick-up (now + small lead so past times can't be chosen). */
function earliestPickupAt(from: Date = new Date()): Date {
  const d = new Date(from.getTime() + 5 * 60 * 1000);
  d.setSeconds(0, 0);
  return d;
}

function clampPickupAt(date: Date): Date {
  const min = earliestPickupAt();
  return date.getTime() < min.getTime() ? min : date;
}

function defaultPickupDate(): Date {
  const d = earliestPickupAt();
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
  if (d.getTime() < earliestPickupAt().getTime()) {
    d.setMinutes(d.getMinutes() + 15);
  }
  return d;
}

/** Build a readable street address from expo-location reverse geocode. */
function formatReverseGeocodeAddress(
  place: Location.LocationGeocodedAddress | undefined
): string | null {
  if (!place) return null;
  const streetLine = [place.streetNumber, place.street].filter(Boolean).join(" ").trim();
  const parts = [
    streetLine || place.name || "",
    place.city || place.subregion || "",
    [place.region, place.postalCode].filter(Boolean).join(" "),
    place.country || "",
  ]
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  return parts.join(", ");
}

type CurrentPickupResult = {
  address: string;
  lat: number;
  lng: number;
};

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(label)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

async function resolveCurrentPickup(): Promise<CurrentPickupResult | null> {
  // Optional on some runtimes — only call when present.
  if (typeof Location.hasServicesEnabledAsync === "function") {
    const servicesOn = await Location.hasServicesEnabledAsync();
    if (!servicesOn) {
      throw new Error("Location services are turned off on this device");
    }
  }

  const current = await Location.getForegroundPermissionsAsync();
  let status = current.status;
  if (status !== "granted") {
    const req = await Location.requestForegroundPermissionsAsync();
    status = req.status;
  }
  if (status !== "granted") {
    return null;
  }

  let lat: number | null = null;
  let lng: number | null = null;

  // Prefer a fresh fix, but don't hang forever on High GPS indoors.
  try {
    const position = await withTimeout(
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }),
      12_000,
      "Location timeout"
    );
    lat = position.coords.latitude;
    lng = position.coords.longitude;
  } catch {
    if (typeof Location.getLastKnownPositionAsync === "function") {
      const last = await Location.getLastKnownPositionAsync({
        maxAge: 5 * 60_000,
        requiredAccuracy: 500,
      });
      if (last) {
        lat = last.coords.latitude;
        lng = last.coords.longitude;
      }
    }
  }

  if (lat == null || lng == null) {
    throw new Error("Couldn’t get a GPS fix — try again outdoors or check permissions");
  }

  let address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  try {
    const results = await withTimeout(
      Location.reverseGeocodeAsync({ latitude: lat, longitude: lng }),
      8_000,
      "Geocode timeout"
    );
    const formatted = formatReverseGeocodeAddress(results[0]);
    if (formatted) address = formatted;
  } catch {
    // Keep coordinate fallback — Directions still uses lat/lng.
  }

  return { address, lat, lng };
}

/** Optional deep-link prefill (home service tiles) — applied silently, no UI. */
const SERVICE_PREFILL_MAP: Record<string, string> = {
  airport: "Airport Transfer pick-up/drop-off",
  hourly: "Hourly ride",
  point: "Point-to-Point transportation",
  corporate: "Point-to-Point transportation",
  events: "Hourly ride",
  parcel: PARCEL_SERVICE_TYPE,
};

export default function CreateReservationScreen() {
  const { user } = useAuth();
  const { palette, isDark } = useCustomerTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const routeMapAnim = useRef(new Animated.Value(0)).current;
  const params = useLocalSearchParams<{
    prefill?: string | string[];
    vehicleId?: string | string[];
    pickup?: string | string[];
    pickupLat?: string | string[];
    pickupLng?: string | string[];
    dropoff?: string | string[];
    dropoffLat?: string | string[];
    dropoffLng?: string | string[];
    airline?: string | string[];
    flightNumber?: string | string[];
    flightNote?: string | string[];
    meetGreet?: string | string[];
  }>();
  // Ensures we only honour a `vehicleId` param once — after the user has
  // possibly changed the selection, navigating back here shouldn't yank it
  // back to whatever the URL says.
  const consumedVehicleParamRef = useRef(false);
  const pickupAutoFilledRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const onScrollViewScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollYRef.current = e.nativeEvent.contentOffset.y;
  }, []);

  /** Keep focused fields above the soft keyboard (Who is riding / Child is near the bottom). */
  const onFormFieldFocus = useCallback<NonNullable<TextInputProps["onFocus"]>>((e) => {
    const target = e.target as unknown as {
      measureInWindow?: (
        cb: (x: number, y: number, width: number, height: number) => void
      ) => void;
    };
    const delay = Platform.OS === "ios" ? 340 : 140;
    setTimeout(() => {
      target?.measureInWindow?.((_x, y, _w, h) => {
        const screenH = Dimensions.get("window").height;
        const keyboardReserve = Platform.OS === "ios" ? 360 : 300;
        const safeBottom = screenH - keyboardReserve;
        const fieldBottom = y + h;
        if (fieldBottom > safeBottom) {
          const delta = fieldBottom - safeBottom + 28;
          scrollRef.current?.scrollTo({
            y: Math.max(0, scrollYRef.current + delta),
            animated: true,
          });
        }
      });
    }, delay);
  }, []);
  const [serviceType, setServiceType] = useState(DEFAULT_SERVICE_TYPE);
  const [bookingMode, setBookingMode] = useState<AppBookingMode>("distance");
  const [hourlyDuration, setHourlyDuration] = useState<number>(APP_MIN_HOURLY_HOURS);
  const [pickupAddress, setPickupAddress] = useState("");
  /** GPS from "My location" — used as Directions origin so distance/duration stay accurate. */
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [pickupLocating, setPickupLocating] = useState(false);
  const [pickupLocationHint, setPickupLocationHint] = useState<string | null>(null);
  const [dropoffAddress, setDropoffAddress] = useState("");
  /** Optional coords from airport composer / quick places — improves Directions accuracy. */
  const [dropoffCoords, setDropoffCoords] = useState<{ lat: number; lng: number } | null>(null);
  /** Intermediate stops (empty slots allowed while editing). */
  const [stops, setStops] = useState<string[]>([]);
  const [pickupAt, setPickupAt] = useState<Date>(defaultPickupDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerMinDate, setPickerMinDate] = useState(() => earliestPickupAt());

  const openPickupTimePicker = useCallback(() => {
    const min = earliestPickupAt();
    setPickerMinDate(min);
    setPickupAt((prev) => (prev.getTime() < min.getTime() ? min : prev));
    setShowDatePicker(true);
  }, []);
  const [passengersCount, setPassengersCount] = useState(1);
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [parcelWeight, setParcelWeight] = useState("");
  const [parcelNote, setParcelNote] = useState("");
  const [airline, setAirline] = useState("");
  const [flightNumber, setFlightNumber] = useState("");
  const [flightNote, setFlightNote] = useState("");
  const [meetGreet, setMeetGreet] = useState(false);
  const [fleetVehicles, setFleetVehicles] = useState<AppFleetVehicleDto[]>([]);
  const [distancePricing, setDistancePricing] = useState<AppDistancePricing>({
    baseDistanceKm: BASE_DISTANCE_KM,
    extraKmRate: EXTRA_KM_RATE,
  });
  const [fleetLoading, setFleetLoading] = useState(true);
  const [fleetError, setFleetError] = useState("");
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [showTierDropdown, setShowTierDropdown] = useState(false);
  const isParcel = isParcelServiceType(serviceType);
  const isHourly = !isParcel && bookingMode === "hourly";
  const showDropoff = !isHourly;
  const isAirportTransfer =
    !isParcel &&
    (serviceType.toLowerCase().includes("airport") ||
      !!airline.trim() ||
      !!flightNumber.trim() ||
      meetGreet ||
      isAirportPickupLocation(pickupAddress) ||
      isAirportPickupLocation(dropoffAddress));
  /** Meet & Greet only makes sense for airport pickups (From airport). */
  const allowMeetGreet = isAirportPickupLocation(pickupAddress);

  const vehicleTiers = useMemo(() => {
    const all = buildVehicleTiersFromAppFleet(fleetVehicles);
    const base = isParcel ? filterVehicleTiersForParcel(all) : all;
    if (isHourly) {
      return base.filter((t) => t.hourlyRate > 0);
    }
    return base;
  }, [fleetVehicles, isParcel, isHourly]);

  const selectedTier = useMemo(
    () => (selectedTierId ? findTierById(vehicleTiers, selectedTierId) : null),
    [vehicleTiers, selectedTierId]
  );
  /** Silent default — 407 allowed on routed trips (UI toggle removed). */
  const tollRoute = true;
  const [routeSummary, setRouteSummary] = useState<{
    distanceText: string;
    durationText: string;
    distanceMeters: number | null;
    durationSeconds: number | null;
    mapImageUrl: string | null;
    pointCount: number;
  } | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  /** Uber-style: route map only after both ends are set (never empty placeholder). */
  const addressesReadyForMap =
    !isHourly &&
    pickupAddress.trim().length >= 8 &&
    dropoffAddress.trim().length >= 8;
  const showRouteHero =
    addressesReadyForMap &&
    !routeError &&
    (!!routeSummary?.mapImageUrl || routeLoading);
  /** Top pinned map plane (Uber) — taller than mid-card for “wow” presence. */
  const routeHeroHeight = Math.round(
    Math.min(360, Math.max(240, windowHeight * 0.42))
  );

  useEffect(() => {
    Animated.spring(routeMapAnim, {
      toValue: showRouteHero ? 1 : 0,
      friction: 8,
      tension: 64,
      useNativeDriver: true,
    }).start();
    if (showRouteHero) {
      // Reveal map at the very top when both ends lock in.
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      });
    }
  }, [showRouteHero, routeMapAnim]);
  const [childSeatCount, setChildSeatCount] = useState(0);
  const [rideFor, setRideFor] = useState<"me" | "someone" | "child">("me");
  const [showRideForMenu, setShowRideForMenu] = useState(false);
  const [childAge, setChildAge] = useState("");
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phone || "");
  const [email, setEmail] = useState(user?.email || "");

  const setModeDistance = useCallback(() => {
    setBookingMode("distance");
    setServiceType((prev) =>
      isParcelServiceType(prev) ? prev : DEFAULT_SERVICE_TYPE
    );
  }, []);

  const setModeHourly = useCallback(() => {
    setBookingMode("hourly");
    setServiceType(HOURLY_SERVICE_TYPE);
    setDropoffAddress("");
    setRouteSummary(null);
    setRouteError(null);
  }, []);

  const applyAccountContact = useCallback(() => {
    setFirstName(user?.firstName || "");
    setLastName(user?.lastName || "");
    setPhoneNumber(user?.phone || "");
    setEmail(user?.email || "");
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (rideFor === "me") {
      setFirstName((prev) => prev || user.firstName || "");
      setLastName((prev) => prev || user.lastName || "");
      // Verified account phone is authoritative for "For me"
      if (user.phone?.trim()) {
        setPhoneNumber(user.phone);
      } else {
        setPhoneNumber((prev) => prev || "");
      }
      setEmail((prev) => prev || user.email || "");
    } else {
      // Keep booker email for receipts when riding for someone else / child
      setEmail((prev) => prev || user.email || "");
    }
  }, [user, rideFor]);

  const selectRideFor = useCallback(
    (next: "me" | "someone" | "child") => {
      if (next === rideFor) {
        setShowRideForMenu(false);
        return;
      }
      setRideFor(next);
      setShowRideForMenu(false);
      if (next === "me") {
        applyAccountContact();
        setChildAge("");
      } else if (next === "child") {
        setFirstName("");
        setLastName("");
        // Guardian phone must be entered fresh — do not prefill account phone
        setPhoneNumber("");
        setEmail(user?.email || "");
        setChildAge("");
        setChildSeatCount((n) => (n > 0 ? n : 1));
      } else {
        setFirstName("");
        setLastName("");
        setPhoneNumber("");
        setEmail(user?.email || "");
        setChildAge("");
      }
    },
    [rideFor, applyAccountContact, user?.email]
  );

  const rideForLabel = useMemo(() => {
    if (isParcel) {
      if (rideFor === "someone") return "Someone else";
      return "Me";
    }
    if (rideFor === "child") return "Child";
    if (rideFor === "someone") return "Someone else";
    const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
    return name || "Me";
  }, [isParcel, rideFor, user?.firstName, user?.lastName]);

  const rideForInitials = useMemo(() => {
    if (rideFor === "me" && user?.firstName) {
      return `${(user.firstName[0] || "Y").toUpperCase()}${(user.lastName?.[0] || "").toUpperCase()}`;
    }
    if (rideFor === "child") return "CH";
    if (rideFor === "someone") return "SE";
    return "ME";
  }, [rideFor, user?.firstName, user?.lastName]);

  // Parcel bookings cannot use "Child" — reset if service type flips.
  useEffect(() => {
    if (isParcel && rideFor === "child") {
      selectRideFor("me");
    }
  }, [isParcel, rideFor, selectRideFor]);

  const loadFleet = useCallback(async () => {
    setFleetLoading(true);
    setFleetError("");
    try {
      const { vehicles, pricing } = await getAppFleetVehicles();
      setFleetVehicles(vehicles);
      if (pricing) {
        setDistancePricing({
          baseDistanceKm: pricing.baseDistanceKm || BASE_DISTANCE_KM,
          extraKmRate: pricing.extraKmRate || EXTRA_KM_RATE,
        });
      }
      const allTiers = buildVehicleTiersFromAppFleet(vehicles);
      const parcelMode = isParcelServiceType(
        typeof params.prefill === "string"
          ? params.prefill
          : Array.isArray(params.prefill)
            ? params.prefill[0]
            : serviceType
      );
      const tiers = parcelMode ? filterVehicleTiersForParcel(allTiers) : allTiers;

      const rawId = params.vehicleId;
      const requestedFleetOrTierId =
        typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : undefined;
      const preferredTierId =
        !parcelMode &&
        requestedFleetOrTierId &&
        !consumedVehicleParamRef.current
          ? resolveTierIdFromFleetVehicleId(requestedFleetOrTierId)
          : null;
      if (preferredTierId) consumedVehicleParamRef.current = true;

      setSelectedTierId((prev) => {
        if (preferredTierId && tiers.some((t) => t.id === preferredTierId)) return preferredTierId;
        if (prev && tiers.some((t) => t.id === prev)) return prev;
        return tiers[0]?.id ?? null;
      });
    } catch (e) {
      setFleetError(e instanceof Error ? e.message : "Could not load vehicles");
      setFleetVehicles([]);
      setSelectedTierId(null);
    } finally {
      setFleetLoading(false);
    }
  }, [params.vehicleId, params.prefill, serviceType]);

  useEffect(() => {
    loadFleet();
  }, [loadFleet]);

  // Parcel: lock selection to the only allowed car when tiers refresh
  useEffect(() => {
    if (!isParcel || vehicleTiers.length === 0) return;
    setSelectedTierId((prev) =>
      prev && vehicleTiers.some((t) => t.id === prev) ? prev : vehicleTiers[0].id
    );
    setShowTierDropdown(false);
  }, [isParcel, vehicleTiers]);

  const fillCurrentPickup = useCallback(async (opts?: { force?: boolean }) => {
    if (!opts?.force && pickupAutoFilledRef.current) return;
    if (!opts?.force && pickupAddress.trim().length > 0) return;

    setPickupLocating(true);
    setPickupLocationHint(null);
    try {
      const result = await resolveCurrentPickup();
      // Param prefill (Home / airport composer) may have won while GPS was resolving.
      if (!opts?.force && pickupAutoFilledRef.current) return;
      if (!result) {
        setPickupLocationHint("Location permission needed — tap My location again to allow access");
        if (opts?.force) {
          Alert.alert(
            "Location permission",
            "Allow location access in Settings so we can fill your pickup address."
          );
        }
        return;
      }
      pickupAutoFilledRef.current = true;
      setPickupCoords({ lat: result.lat, lng: result.lng });
      setPickupAddress(result.address);
      setPickupLocationHint("Using GPS location — route uses exact coordinates");
    } catch (e) {
      setPickupCoords(null);
      const msg =
        e instanceof Error && e.message
          ? e.message
          : "Couldn’t detect location — enter pickup manually";
      setPickupLocationHint(msg);
      if (opts?.force) {
        Alert.alert("My location", msg);
      }
    } finally {
      setPickupLocating(false);
    }
  }, [pickupAddress]);

  // Prefill pickup from Home map chip (address + optional GPS)
  useEffect(() => {
    const rawPickup = params.pickup;
    const pickup =
      typeof rawPickup === "string" ? rawPickup : Array.isArray(rawPickup) ? rawPickup[0] : undefined;
    if (!pickup?.trim()) return;

    pickupAutoFilledRef.current = true;
    setPickupAddress(pickup.trim());
    setPickupLocationHint("Pickup from booking");

    const rawLat = params.pickupLat;
    const rawLng = params.pickupLng;
    const latStr = typeof rawLat === "string" ? rawLat : Array.isArray(rawLat) ? rawLat[0] : undefined;
    const lngStr = typeof rawLng === "string" ? rawLng : Array.isArray(rawLng) ? rawLng[0] : undefined;
    const lat = latStr ? parseFloat(latStr) : NaN;
    const lng = lngStr ? parseFloat(lngStr) : NaN;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      setPickupCoords({ lat, lng });
      setPickupLocationHint("Using booked pickup — route uses exact coordinates");
    }
  }, [params.pickup, params.pickupLat, params.pickupLng]);

  // Prefill drop-off from Home trip editor / quick places / airport composer
  useEffect(() => {
    const raw = params.dropoff;
    const dropoff = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : "";
    if (!dropoff?.trim()) return;
    setDropoffAddress(dropoff.trim());

    const rawLat = params.dropoffLat;
    const rawLng = params.dropoffLng;
    const latStr = typeof rawLat === "string" ? rawLat : Array.isArray(rawLat) ? rawLat[0] : undefined;
    const lngStr = typeof rawLng === "string" ? rawLng : Array.isArray(rawLng) ? rawLng[0] : undefined;
    const lat = latStr ? parseFloat(latStr) : NaN;
    const lng = lngStr ? parseFloat(lngStr) : NaN;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      setDropoffCoords({ lat, lng });
    }
  }, [params.dropoff, params.dropoffLat, params.dropoffLng]);

  // Airport composer: airline / flight / M&G
  useEffect(() => {
    const paramStr = (v?: string | string[]) =>
      typeof v === "string" ? v : Array.isArray(v) ? v[0] || "" : "";
    const a = paramStr(params.airline).trim();
    const f = paramStr(params.flightNumber).trim();
    const n = paramStr(params.flightNote).trim();
    const mg = paramStr(params.meetGreet).trim();
    if (a) setAirline(a);
    if (f) setFlightNumber(f);
    if (n) setFlightNote(n);
    if (mg === "1" || mg === "true") setMeetGreet(true);
  }, [params.airline, params.flightNumber, params.flightNote, params.meetGreet]);

  // If pickup is no longer an airport, drop Meet & Greet (To-airport / edited pickup).
  useEffect(() => {
    if (!allowMeetGreet && meetGreet) setMeetGreet(false);
  }, [allowMeetGreet, meetGreet]);

  // Auto-detect pickup once when the screen opens (skipped if Home already set pickup)
  useEffect(() => {
    void fillCurrentPickup();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  useEffect(() => {
    const raw = params.prefill;
    const key = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
    if (!key) return;
    const value = SERVICE_PREFILL_MAP[key];
    if (!value) return;
    setServiceType(value);
    if (key === "hourly" || key === "events" || value === HOURLY_SERVICE_TYPE) {
      setBookingMode("hourly");
      setDropoffAddress("");
    } else {
      // distance, parcel, airport, corporate, etc.
      setBookingMode("distance");
    }
  }, [params.prefill]);

  // Keep selection valid when switching to hourly (only vehicles with hourly rates)
  useEffect(() => {
    if (vehicleTiers.length === 0) {
      setSelectedTierId(null);
      return;
    }
    if (!selectedTierId || !vehicleTiers.some((t) => t.id === selectedTierId)) {
      setSelectedTierId(vehicleTiers[0].id);
    }
  }, [vehicleTiers, selectedTierId]);

  useEffect(() => {
    if (isHourly) {
      setRouteSummary(null);
      setRouteError(null);
      setRouteLoading(false);
      return;
    }
    const pickup = pickupAddress.trim();
    const dropoff = dropoffAddress.trim();
    const waypoints = activeStopAddresses(stops);

    // Prefer GPS lat,lng for My Location so Google Directions does not re-geocode a fuzzy address.
    const origin =
      pickupCoords != null
        ? `${pickupCoords.lat.toFixed(6)},${pickupCoords.lng.toFixed(6)}`
        : pickup;
    const destination =
      dropoffCoords != null
        ? `${dropoffCoords.lat.toFixed(6)},${dropoffCoords.lng.toFixed(6)}`
        : dropoff;

    const pickupReady = pickupCoords != null || pickup.length >= 8;
    const dropoffReady = dropoffCoords != null || dropoff.length >= 8;
    if (!pickupReady || !dropoffReady) {
      setRouteSummary(null);
      setRouteError(null);
      setRouteLoading(false);
      return;
    }

    let cancelled = false;
    const ac = new AbortController();
    const timer = setTimeout(async () => {
      setRouteLoading(true);
      setRouteError(null);
      try {
        const mapW = Math.min(900, Math.max(640, Math.round(windowWidth * 2)));
        const planeH = Math.round(
          Math.min(360, Math.max(240, windowHeight * 0.42)) + 48
        );
        const mapH = Math.min(
          800,
          Math.max(360, Math.round(mapW * (planeH / Math.max(windowWidth, 1))))
        );
        const r = await fetchDirectionsSummary(
          {
            origin,
            destination,
            waypoints,
            avoidTolls: !tollRoute,
            mapWidth: mapW,
            mapHeight: mapH,
            mapPad: "hero",
          },
          ac.signal
        );
        if (!cancelled) {
          if (r.distanceMeters == null || r.distanceMeters <= 0) {
            setRouteSummary(null);
            setRouteError("Could not calculate distance for these addresses. Try editing pickup or drop-off.");
            return;
          }
          setRouteSummary({
            distanceText: r.distanceText,
            durationText: r.durationText,
            distanceMeters: r.distanceMeters,
            durationSeconds: r.durationSeconds,
            mapImageUrl: r.mapImageUrl,
            pointCount: r.points.length,
          });
        }
      } catch (e) {
        if (cancelled || (e as Error).name === "AbortError") return;
        setRouteSummary(null);
        setRouteError(e instanceof Error ? e.message : "Could not get route");
      } finally {
        if (!cancelled) setRouteLoading(false);
      }
    }, 650);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      ac.abort();
      setRouteLoading(false);
    };
  }, [
    isHourly,
    pickupAddress,
    pickupCoords,
    dropoffAddress,
    dropoffCoords,
    stops,
    tollRoute,
  ]);

  const serviceDateStr = pickupAt.toLocaleDateString("en-CA");
  const serviceTimeStr = pickupAt.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const pickupTimeDisplay = pickupAt.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  /**
   * Live fare estimate (same formula as confirm + server).
   * Gratuity preview uses default tip percent.
   */
  const fareEstimate = useMemo(() => {
    if (!selectedTier) return null;
    const stopCount = activeStopAddresses(stops).length;
    if (isHourly) {
      return calculateAppHourlyFare({
        hours: hourlyDuration,
        hourlyRate: selectedTier.hourlyRate,
        stopCount,
        childSeatCount,
        gratuityPercent: APP_DEFAULT_GRATUITY_PERCENT,
        pickupLocation: pickupAddress,
        meetGreet: allowMeetGreet && meetGreet,
      });
    }
    const meters = routeSummary?.distanceMeters ?? null;
    if (meters == null || meters <= 0) return null;
    return calculateAppDistanceFare({
      distanceMeters: meters,
      hourlyRate: selectedTier.hourlyRate,
      pricePerKm: selectedTier.pricePerKm,
      baseDistanceKm: selectedTier.baseDistanceKm || distancePricing.baseDistanceKm,
      extraKmRate: selectedTier.extraKmRate || distancePricing.extraKmRate,
      stopCount,
      childSeatCount,
      gratuityPercent: APP_DEFAULT_GRATUITY_PERCENT,
      pickupLocation: pickupAddress,
      meetGreet: allowMeetGreet && meetGreet,
    });
  }, [
    selectedTier,
    isHourly,
    hourlyDuration,
    routeSummary,
    stops,
    childSeatCount,
    distancePricing,
    pickupAddress,
    allowMeetGreet,
    meetGreet,
  ]);

  const maxPassengers = useMemo(
    () => parseMaxPassengers(selectedTier?.seating) ?? 8,
    [selectedTier]
  );

  useEffect(() => {
    setPassengersCount((n) => Math.min(Math.max(n, 1), maxPassengers));
    setChildSeatCount((n) => Math.min(n, maxPassengers));
  }, [maxPassengers]);

  /** Per-tier ride fare for the list (Uber-style price on the right). */
  const tierFareById = useMemo(() => {
    const out: Record<string, number> = {};
    const stopCount = 0;
    if (isHourly) {
      for (const tier of vehicleTiers) {
        const fare = calculateAppHourlyFare({
          hours: hourlyDuration,
          hourlyRate: tier.hourlyRate,
          stopCount,
          childSeatCount: 0,
          gratuityPercent: APP_DEFAULT_GRATUITY_PERCENT,
          pickupLocation: pickupAddress,
        });
        if (fare) out[tier.id] = fare.rideFare;
      }
      return out;
    }
    const meters = routeSummary?.distanceMeters ?? null;
    if (meters == null || meters <= 0) return out;
    for (const tier of vehicleTiers) {
      const fare = calculateAppDistanceFare({
        distanceMeters: meters,
        hourlyRate: tier.hourlyRate,
        pricePerKm: tier.pricePerKm,
        baseDistanceKm: tier.baseDistanceKm || distancePricing.baseDistanceKm,
        extraKmRate: tier.extraKmRate || distancePricing.extraKmRate,
        stopCount,
        childSeatCount: 0,
        gratuityPercent: APP_DEFAULT_GRATUITY_PERCENT,
        pickupLocation: pickupAddress,
      });
      if (fare) out[tier.id] = fare.rideFare;
    }
    return out;
  }, [
    vehicleTiers,
    isHourly,
    hourlyDuration,
    routeSummary?.distanceMeters,
    distancePricing,
    pickupAddress,
  ]);

  const onDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (event.type === "dismissed") {
      return;
    }
    if (date) setPickupAt(clampPickupAt(date));
  };

  const confirmPickupTime = useCallback(() => {
    setPickupAt((prev) => clampPickupAt(prev));
    setShowDatePicker(false);
  }, []);

  const continueDisabled =
    fleetLoading ||
    !selectedTier ||
    !pickupAddress.trim() ||
    !fareEstimate ||
    (showDropoff && !dropoffAddress.trim()) ||
    (!isHourly && (!!routeLoading || !routeSummary?.distanceMeters));

  const continueLabel = (() => {
    if (fleetLoading) return "Loading vehicles…";
    if (!selectedTier) {
      if (isHourly && vehicleTiers.length === 0) return "No hourly vehicles";
      return "Select a vehicle";
    }
    if (!pickupAddress.trim()) return "Enter pickup address";
    if (showDropoff && !dropoffAddress.trim()) return "Enter drop-off address";
    if (!isHourly && routeLoading) return "Calculating route…";
    if (!fareEstimate) {
      return isHourly ? "Fare unavailable" : "Route needed to continue";
    }
    return `Continue · $${fareEstimate.total.toFixed(2)}`;
  })();

  const continueToConfirm = async () => {
    if (!pickupAddress.trim()) {
      Alert.alert("Missing info", "Please enter a pickup address.");
      return;
    }
    const minPickup = earliestPickupAt();
    if (pickupAt.getTime() < minPickup.getTime()) {
      setPickupAt(minPickup);
      Alert.alert(
        "Pick-up time",
        "Please choose a future pick-up time. Past dates and times aren’t allowed."
      );
      return;
    }
    if (showDropoff && !dropoffAddress.trim()) {
      Alert.alert("Missing info", "Please enter pickup and drop-off addresses.");
      return;
    }
    if (stops.some((s) => s.trim().length > 0 && s.trim().length < 3)) {
      Alert.alert("Stop address", "Each stop needs a full address. Clear or complete empty stop fields.");
      return;
    }
    if (stops.some((s) => !s.trim())) {
      Alert.alert(
        "Incomplete stop",
        "Please enter an address for every stop, or remove the empty stop."
      );
      return;
    }
    const bookingPhone =
      rideFor === "me" && user?.phone?.trim()
        ? user.phone.trim()
        : formatUsCanadaE164(phoneNumber) || phoneNumber.trim();
    if (!firstName.trim() || !lastName.trim() || !bookingPhone) {
      Alert.alert(
        "Missing info",
        rideFor === "me"
          ? "Please confirm your name and phone number."
          : rideFor === "child"
            ? "Please enter the child’s name and a guardian phone number."
            : "Please enter the passenger’s name and phone number."
      );
      return;
    }
    if (rideFor === "someone" || rideFor === "child") {
      const phoneError = validateUsCanadaPhone(phoneNumber);
      if (phoneError) {
        Alert.alert(
          rideFor === "child" ? "Guardian phone" : "Phone number",
          phoneError
        );
        return;
      }
    }
    if (rideFor === "me" && !email.trim()) {
      Alert.alert("Missing info", "Please add an email on your account for booking confirmation.");
      return;
    }
    if (
      (rideFor === "someone" || rideFor === "child") &&
      !(user?.email || email).trim()
    ) {
      Alert.alert("Missing info", "Your account needs an email so we can send the booking confirmation.");
      return;
    }
    if (rideFor === "child") {
      const ageNum = parseInt(childAge.trim(), 10);
      if (!childAge.trim() || Number.isNaN(ageNum) || ageNum < 1 || ageNum > 17) {
        Alert.alert("Child age", "Please enter the child’s age (1–17).");
        return;
      }
    }
    if (!selectedTier) {
      Alert.alert(
        "Missing info",
        isHourly
          ? "No vehicles are available for hourly booking right now."
          : "Please wait for the vehicle list to load, then select a vehicle."
      );
      return;
    }
    if (isHourly) {
      if (selectedTier.hourlyRate <= 0 || !fareEstimate) {
        Alert.alert(
          "Hourly fare",
          "This vehicle isn’t available for hourly booking. Try another vehicle or Distance mode."
        );
        return;
      }
    } else if (!routeSummary?.distanceMeters || !fareEstimate) {
      Alert.alert(
        routeLoading ? "Calculating route" : "Route not ready",
        routeLoading
          ? "We're calculating the trip distance — please wait a moment."
          : "We couldn't calculate the route. Please double-check the pickup and drop-off addresses."
      );
      return;
    }
    if (!isParcel) {
      if (passengersCount > maxPassengers) {
        Alert.alert(
          "Too many passengers",
          `This vehicle seats up to ${maxPassengers} passengers.`
        );
        return;
      }
      if (childSeatCount > maxPassengers) {
        Alert.alert(
          "Child seats",
          `This vehicle allows up to ${maxPassengers} child seats.`
        );
        return;
      }
      if (rideFor === "child" && childSeatCount < 1) {
        Alert.alert(
          "Child seat recommended",
          "Most children require an approved child seat. Add one to this booking?",
          [
            { text: "Not now", style: "cancel", onPress: () => void persistDraftAndContinue() },
            {
              text: "Add child seat",
              onPress: () => {
                setChildSeatCount(1);
                void persistDraftAndContinue({ childSeatsOverride: 1 });
              },
            },
          ]
        );
        return;
      }
    } else {
      if (!recipientName.trim() || !recipientPhone.trim()) {
        Alert.alert("Missing info", "Please enter the recipient name and phone number.");
        return;
      }
    }

    await persistDraftAndContinue();
  };

  const persistDraftAndContinue = async (opts?: { childSeatsOverride?: number }) => {
    const bookingPhone =
      rideFor === "me" && user?.phone?.trim()
        ? user.phone.trim()
        : formatUsCanadaE164(phoneNumber) || phoneNumber.trim();
    const resolvedDropoff = isHourly
      ? dropoffAddress.trim() || AS_DIRECTED_DROPOFF
      : dropoffAddress.trim();
    const seats =
      typeof opts?.childSeatsOverride === "number"
        ? opts.childSeatsOverride
        : childSeatCount;
    const bookerRide = rideFor === "someone" || rideFor === "child";

    await saveBookingDraft({
      serviceType,
      bookingMode: isHourly ? "hourly" : "distance",
      hourlyDuration: isHourly ? String(hourlyDuration) : undefined,
      pickupAddress: pickupAddress.trim(),
      dropoffAddress: resolvedDropoff,
      stopAddress: joinAppStops(stops),
      serviceDate: serviceDateStr,
      serviceTime: serviceTimeStr,
      pickupTimeDisplay,
      passengers: isParcel ? "1" : String(Math.max(passengersCount, seats, 1)),
      vehicle: selectedTier!.title,
      vehicleId: selectedTier!.id,
      vehicleSubtitle: selectedTier!.subtitle,
      vehiclePrice: isHourly
        ? `$${selectedTier!.hourlyRate.toFixed(2)}/hr · ${hourlyDuration}h`
        : selectedTier!.hourlyRate > 0
          ? `From $${selectedTier!.hourlyRate.toFixed(2)}`
          : `$${selectedTier!.pricePerKm.toFixed(2)}/km`,
      rideFare: String(fareEstimate!.rideFare ?? 0),
      pricePerKm: String(selectedTier!.pricePerKm),
      hourlyRate: String(selectedTier!.hourlyRate),
      baseDistanceKm: String(selectedTier!.baseDistanceKm || distancePricing.baseDistanceKm),
      extraKmRate: String(selectedTier!.extraKmRate || distancePricing.extraKmRate),
      distanceText: isHourly
        ? `Hourly · ${hourlyDuration}h`
        : routeSummary?.distanceText ?? "",
      durationText: isHourly
        ? `${hourlyDuration} hours`
        : routeSummary?.durationText ?? "",
      distanceMeters: isHourly ? "0" : String(routeSummary?.distanceMeters ?? ""),
      durationSeconds: isHourly
        ? String(hourlyDuration * 3600)
        : String(routeSummary?.durationSeconds ?? ""),
      tollRoute: tollRoute ? "Yes" : "No",
      childSeatCount: isParcel ? "0" : String(seats),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phoneNumber: bookingPhone,
      email: bookerRide ? (user?.email || email).trim() : email.trim(),
      rideFor,
      childAge: rideFor === "child" ? childAge.trim() : undefined,
      bookerName: bookerRide
        ? [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || undefined
        : undefined,
      bookerEmail: bookerRide ? (user?.email || email).trim() || undefined : undefined,
      bookerPhone: bookerRide ? user?.phone || bookingPhone || undefined : undefined,
      seating: selectedTier!.seating || "",
      recipientName: isParcel ? recipientName.trim() : undefined,
      recipientPhone: isParcel ? recipientPhone.trim() : undefined,
      parcelWeight: isParcel ? formatParcelWeight(parcelWeight) || undefined : undefined,
      parcelNote: isParcel ? parcelNote.trim() : undefined,
      airline: airline.trim() || undefined,
      flightNumber: flightNumber.trim() || undefined,
      flightNote: flightNote.trim() || undefined,
      meetGreet: allowMeetGreet && meetGreet ? "1" : undefined,
    });

    router.push("/customer/reservation-confirm");
  };

  const styles = useMemo(() => makeStyles(palette, isDark), [palette, isDark]);

  const mapPlaneH = routeHeroHeight + insets.top;
  const headerBlock = (
    <View style={[styles.header, showRouteHero && styles.headerOverMap]}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={[styles.backBtn, showRouteHero && styles.headerGlassBtn]}
        hitSlop={8}
      >
        <Ionicons
          name="chevron-back"
          size={20}
          color={showRouteHero ? (isDark ? "#fff" : "#1C1916") : palette.text}
        />
        {!showRouteHero ? <Text style={styles.backText}>Back</Text> : null}
      </TouchableOpacity>
      <Text
        style={[
          styles.headerTitle,
          showRouteHero && styles.headerTitleOverMap,
          showRouteHero && { color: isDark ? "#fff" : "#1C1916" },
        ]}
        numberOfLines={1}
      >
        {isParcel ? "Send a Parcel" : isHourly ? "Hourly Reservation" : "Create Reservation"}
      </Text>
      <TouchableOpacity
        style={[styles.riderHeaderBtn, showRouteHero && styles.headerGlassBtn]}
        onPress={() => setShowRideForMenu(true)}
        activeOpacity={0.85}
        accessibilityLabel={`Riding for ${rideForLabel}. Change who is riding.`}
        accessibilityRole="button"
      >
        {rideFor === "me" && user?.photo ? (
          <Image
            source={{ uri: user.photo }}
            style={styles.riderHeaderAvatar}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.riderHeaderAvatar,
              rideFor === "child" && styles.riderHeaderAvatarChild,
              rideFor === "someone" && styles.riderHeaderAvatarSomeone,
            ]}
          >
            {rideFor === "me" ? (
              <Text style={styles.riderHeaderInitials}>{rideForInitials}</Text>
            ) : (
              <Ionicons
                name={rideFor === "child" ? "happy-outline" : "people-outline"}
                size={18}
                color="#fff"
              />
            )}
          </View>
        )}
        <Ionicons
          name="chevron-down"
          size={12}
          color={showRouteHero ? (isDark ? "rgba(255,255,255,0.75)" : "#5C5348") : palette.muted}
        />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: palette.root }]}>
      <StatusBar
        barStyle={showRouteHero && !isDark ? "dark-content" : palette.statusBar}
        backgroundColor={showRouteHero ? "transparent" : palette.root}
        translucent={showRouteHero}
      />
      {!showRouteHero ? (
        <>
          <LinearGradient colors={[...palette.bg]} style={StyleSheet.absoluteFill} />
          <View style={styles.ambientGlow} pointerEvents="none">
            <LinearGradient
              colors={[...palette.glow]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.85, y: 0.45 }}
            />
          </View>
        </>
      ) : null}

      {/* Absolute TOP map plane — Uber backdrop */}
      {showRouteHero ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.routeMapPlane,
            {
              height: mapPlaneH,
              opacity: routeMapAnim,
              transform: [
                {
                  translateY: routeMapAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-28, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {routeSummary?.mapImageUrl ? (
            <Image
              source={{ uri: routeSummary.mapImageUrl }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
          ) : (
            <View style={[StyleSheet.absoluteFillObject, styles.routeHeroLoadingBg]} />
          )}
          <LinearGradient
            colors={["rgba(0,0,0,0.28)", "transparent"]}
            style={styles.routeMapTopVignette}
            pointerEvents="none"
          />
          <LinearGradient
            colors={[
              "transparent",
              isDark ? "rgba(10,9,8,0.45)" : "rgba(245,242,234,0.55)",
              palette.root,
            ]}
            locations={[0.4, 0.78, 1]}
            style={styles.routeHeroFade}
            pointerEvents="none"
          />
          <View style={[styles.routeHeroChips, { bottom: 64 }]}>
            <View style={styles.routeHeroChip}>
              <Ionicons name="navigate" size={13} color={GOLD} />
              <Text style={styles.routeHeroChipText} numberOfLines={1}>
                {routeLoading && !routeSummary?.distanceText
                  ? "…"
                  : routeSummary?.distanceText || "—"}
              </Text>
            </View>
            <View style={styles.routeHeroChip}>
              <Ionicons name="time" size={13} color={GOLD} />
              <Text style={styles.routeHeroChipText} numberOfLines={1}>
                {routeLoading && !routeSummary?.durationText
                  ? "…"
                  : routeSummary?.durationText || "—"}
              </Text>
            </View>
          </View>
          {routeLoading ? (
            <View style={[styles.routeHeroSpinner, { top: insets.top + 56 }]}>
              <ActivityIndicator size="small" color={GOLD} />
            </View>
          ) : null}
        </Animated.View>
      ) : null}

      <SafeAreaView
        style={[styles.safe, showRouteHero && styles.safeOverMap]}
        edges={showRouteHero ? [] : ["top"]}
      >
      {/* Floating glass chrome over map */}
      {showRouteHero ? (
        <View style={[styles.floatingChrome, { paddingTop: insets.top + 4 }]}>
          {headerBlock}
        </View>
      ) : null}

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: keyboardVisible ? 32 : 120,
            // Pull sheet up under the map fade so chips sit tight above Ride Details.
            paddingTop: showRouteHero ? mapPlaneH - 88 : 0,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        onScroll={onScrollViewScroll}
        scrollEventThrottle={16}
      >
        {/* Header — only inline when map is hidden; sheet handle when map pins top */}
        {!showRouteHero ? (
          headerBlock
        ) : (
          <View style={styles.sheetHandleRow}>
            <View style={styles.sheetHandle} />
          </View>
        )}

        <Modal
          visible={showRideForMenu}
          transparent
          animationType="fade"
          onRequestClose={() => setShowRideForMenu(false)}
        >
          <View style={styles.riderMenuOverlay}>
            <Pressable
              style={StyleSheet.absoluteFillObject}
              onPress={() => setShowRideForMenu(false)}
            />
            <View style={styles.riderMenuCard}>
              <Text style={styles.riderMenuTitle}>
                {isParcel ? "Who is sending?" : "Who is riding?"}
              </Text>

              <TouchableOpacity
                style={[styles.riderMenuItem, rideFor === "me" && styles.riderMenuItemOn]}
                onPress={() => selectRideFor("me")}
                activeOpacity={0.85}
              >
                <View style={styles.riderMenuIcon}>
                  {user?.photo ? (
                    <Image source={{ uri: user.photo }} style={styles.riderMenuIconImg} />
                  ) : (
                    <Ionicons name="person" size={18} color={palette.text} />
                  )}
                </View>
                <View style={styles.riderMenuCopy}>
                  <Text style={styles.riderMenuItemTitle}>
                    {isParcel ? "For me" : "Me"}
                  </Text>
                  <Text style={styles.riderMenuItemSub} numberOfLines={1}>
                    {[user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
                      "Your account"}
                  </Text>
                </View>
                {rideFor === "me" ? (
                  <Ionicons name="checkmark-circle" size={22} color={palette.text} />
                ) : null}
              </TouchableOpacity>

              {!isParcel ? (
                <TouchableOpacity
                  style={[styles.riderMenuItem, rideFor === "child" && styles.riderMenuItemOn]}
                  onPress={() => selectRideFor("child")}
                  activeOpacity={0.85}
                >
                  <View style={[styles.riderMenuIcon, styles.riderMenuIconChild]}>
                    <Ionicons name="happy-outline" size={18} color="#8B6914" />
                  </View>
                  <View style={styles.riderMenuCopy}>
                    <Text style={styles.riderMenuItemTitle}>Child</Text>
                    <Text style={styles.riderMenuItemSub}>Book a ride for your child</Text>
                  </View>
                  {rideFor === "child" ? (
                    <Ionicons name="checkmark-circle" size={22} color={palette.text} />
                  ) : null}
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={[styles.riderMenuItem, rideFor === "someone" && styles.riderMenuItemOn]}
                onPress={() => selectRideFor("someone")}
                activeOpacity={0.85}
              >
                <View style={[styles.riderMenuIcon, styles.riderMenuIconSomeone]}>
                  <Ionicons name="people-outline" size={18} color={palette.text} />
                </View>
                <View style={styles.riderMenuCopy}>
                  <Text style={styles.riderMenuItemTitle}>Someone else</Text>
                  <Text style={styles.riderMenuItemSub}>
                    {isParcel ? "Send for another person" : "Ride for a guest"}
                  </Text>
                </View>
                {rideFor === "someone" ? (
                  <Ionicons name="checkmark-circle" size={22} color={palette.text} />
                ) : null}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Step Indicator */}
        <View style={[styles.stepIndicator, showRouteHero && styles.stepIndicatorTight]}>
          <View style={styles.stepActive}>
            <Text style={styles.stepActiveText}>1</Text>
          </View>
          <View style={styles.stepLine} />
          <View style={styles.stepInactive}>
            <Text style={styles.stepInactiveText}>2</Text>
          </View>
        </View>

        {/* Ride Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{isParcel ? "Parcel Details" : "Ride Details"}</Text>
          <Text style={[styles.sectionSubtitle, styles.sectionSubtitleWhenWhere]}>When & Where</Text>
          {isParcel ? (
            <View style={styles.parcelBanner}>
              <Ionicons
                name="cube-outline"
                size={16}
                color={isDark ? GOLD : "#8B6914"}
              />
              <Text style={styles.parcelBannerText}>Parcel Delivery · same-day chauffeur</Text>
            </View>
          ) : (
            <View style={styles.modeToggle} accessibilityRole="tablist">
              <TouchableOpacity
                style={[styles.modeToggleBtn, !isHourly && styles.modeToggleBtnActive]}
                onPress={setModeDistance}
                activeOpacity={0.85}
                accessibilityRole="tab"
                accessibilityState={{ selected: !isHourly }}
                accessibilityLabel="Distance booking"
              >
                <Ionicons
                  name="navigate-outline"
                  size={15}
                  color={!isHourly ? (isDark ? "#1A1208" : "#fff") : palette.muted}
                />
                <Text style={[styles.modeToggleText, !isHourly && styles.modeToggleTextActive]}>
                  Distance
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeToggleBtn, isHourly && styles.modeToggleBtnActive]}
                onPress={setModeHourly}
                activeOpacity={0.85}
                accessibilityRole="tab"
                accessibilityState={{ selected: isHourly }}
                accessibilityLabel="Hourly booking"
              >
                <Ionicons
                  name="time-outline"
                  size={15}
                  color={isHourly ? (isDark ? "#1A1208" : "#fff") : palette.muted}
                />
                <Text style={[styles.modeToggleText, isHourly && styles.modeToggleTextActive]}>
                  Hourly
                </Text>
              </TouchableOpacity>
            </View>
          )}
          {!isParcel && isHourly ? (
            <Text style={styles.modeHint}>
              Chauffeur as directed · {APP_MIN_HOURLY_HOURS}h minimum · priced by the hour
            </Text>
          ) : null}

          {/* Pickup Address */}
          <View style={styles.pickupLabelRow}>
            <Text style={[styles.inputLabel, styles.pickupLabelInline]}>Pickup Address</Text>
            <TouchableOpacity
              style={styles.useLocationBtn}
              onPress={() => void fillCurrentPickup({ force: true })}
              disabled={pickupLocating}
              hitSlop={8}
            >
              {pickupLocating ? (
                <ActivityIndicator size="small" color={isDark ? GOLD : "#8B6914"} />
              ) : (
                <>
                  <Ionicons
                    name="locate-outline"
                    size={14}
                    color={isDark ? GOLD : "#8B6914"}
                  />
                  <Text style={styles.useLocationText}>My location</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          <GooglePlacesAddressField
            value={pickupAddress}
            onChangeText={(text) => {
              setPickupAddress(text);
              // Manual edit → stop using stale GPS so Places geocode takes over
              setPickupCoords(null);
              if (pickupLocationHint) setPickupLocationHint(null);
            }}
            placeholder={
              pickupLocating
                ? "Detecting your location…"
                : "Search pickup address"
            }
            iconName="navigate-outline"
            onPlaceResolved={(place) => {
              setPickupAddress(place.address);
              if (place.lat != null && place.lng != null) {
                setPickupCoords({ lat: place.lat, lng: place.lng });
                setPickupLocationHint(null);
              }
            }}
          />
          {pickupLocationHint ? (
            <Text style={styles.pickupHint}>{pickupLocationHint}</Text>
          ) : null}

          {/* Dropoff Address — required for distance / parcel; hourly is as-directed */}
          {showDropoff ? (
            <>
              <Text style={styles.inputLabel}>Dropoff Address</Text>
              <GooglePlacesAddressField
                value={dropoffAddress}
                onChangeText={(text) => {
                  setDropoffAddress(text);
                  setDropoffCoords(null);
                }}
                placeholder="Search drop-off address"
                iconName="location-outline"
                onPlaceResolved={(place) => {
                  setDropoffAddress(place.address);
                  if (place.lat != null && place.lng != null) {
                    setDropoffCoords({ lat: place.lat, lng: place.lng });
                  } else {
                    setDropoffCoords(null);
                  }
                }}
              />
            </>
          ) : (
            <View style={styles.asDirectedCard}>
              <View style={styles.asDirectedIcon}>
                <Ionicons
                  name="compass-outline"
                  size={18}
                  color={isDark ? GOLD : "#8B6914"}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.asDirectedTitle}>Drop-off · As directed</Text>
                <Text style={styles.asDirectedSub}>
                  Your chauffeur stays with you for the booked hours
                </Text>
              </View>
            </View>
          )}

          {isAirportTransfer ? (
            <View style={styles.airportExtrasBlock}>
              <Text style={styles.inputLabel}>Flight details</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.textInput}
                  value={airline}
                  onChangeText={setAirline}
                  placeholder="Airline"
                  placeholderTextColor={palette.muted}
                  autoCapitalize="words"
                  onFocus={onFormFieldFocus}
                />
              </View>
              <View style={[styles.inputBox, { marginTop: 10 }]}>
                <TextInput
                  style={styles.textInput}
                  value={flightNumber}
                  onChangeText={setFlightNumber}
                  placeholder="Flight number"
                  placeholderTextColor={palette.muted}
                  autoCapitalize="characters"
                  onFocus={onFormFieldFocus}
                />
              </View>
              {flightNote ? (
                <Text style={[styles.pickupHint, { marginTop: 8 }]}>{flightNote}</Text>
              ) : null}
              {allowMeetGreet ? (
                <View style={styles.meetGreetRow}>
                  <View style={{ flex: 1, minWidth: 0, paddingRight: 4 }}>
                    <Text style={styles.meetGreetTitle} numberOfLines={1}>
                      Meet & Greet
                    </Text>
                    <Text style={styles.meetGreetSub} numberOfLines={2}>
                      Personal airport assistance +${MEET_GREET_CHARGE.toFixed(0)}
                    </Text>
                  </View>
                  <Switch
                    value={meetGreet}
                    onValueChange={setMeetGreet}
                    trackColor={{ false: "rgba(150,150,150,0.35)", true: "rgba(201,160,99,0.55)" }}
                    thumbColor={meetGreet ? GOLD : "#f4f3f4"}
                  />
                </View>
              ) : null}
            </View>
          ) : null}

          {isHourly ? (
            <>
              <Text style={styles.inputLabel}>Duration</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                nestedScrollEnabled
                contentContainerStyle={styles.hoursRow}
                style={styles.hoursScroll}
              >
                {APP_HOURLY_DURATIONS.map((h) => {
                  const active = hourlyDuration === h;
                  return (
                    <TouchableOpacity
                      key={h}
                      style={[styles.hourChip, active && styles.hourChipActive]}
                      onPress={() => setHourlyDuration(h)}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.hourChipValue, active && styles.hourChipValueActive]}>
                        {h}
                      </Text>
                      <Text style={[styles.hourChipUnit, active && styles.hourChipUnitActive]}>
                        hrs
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          ) : null}

          {/* Intermediate stops (up to MAX_APP_STOPS) */}
          {stops.map((stop, index) => (
            <View key={`stop-${index}`} style={styles.stopBlock}>
              <View style={styles.stopLabelRow}>
                <Text style={styles.inputLabel}>
                  {stops.length > 1 ? `Stop ${index + 1}` : "Stop"}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    setStops((prev) => prev.filter((_, i) => i !== index))
                  }
                  hitSlop={10}
                  style={styles.stopRemoveBtn}
                >
                  <Ionicons name="close-circle" size={20} color={palette.muted} />
                  <Text style={styles.stopRemoveText}>Remove</Text>
                </TouchableOpacity>
              </View>
              <GooglePlacesAddressField
                value={stop}
                onChangeText={(text) =>
                  setStops((prev) => prev.map((s, i) => (i === index ? text : s)))
                }
                placeholder="Search stop address"
                iconName="flag-outline"
                onPlaceResolved={(place) => {
                  setStops((prev) =>
                    prev.map((s, i) => (i === index ? place.address : s))
                  );
                }}
              />
            </View>
          ))}
          {stops.length < MAX_APP_STOPS ? (
            <TouchableOpacity
              style={styles.addStopBtn}
              onPress={() => setStops((prev) => [...prev, ""])}
            >
              <Ionicons
                name="add-circle"
                size={18}
                color={isDark ? GOLD : "#8B6914"}
              />
              <Text style={styles.addStopText}>
                {stops.length === 0 ? "Add Stop" : "Add another stop"}
              </Text>
            </TouchableOpacity>
          ) : null}

          {/* Pick-up Time */}
          <Text style={styles.inputLabel}>Pick-up Time</Text>
          <TouchableOpacity
            style={styles.inputWithIcon}
            onPress={openPickupTimePicker}
            activeOpacity={0.85}
          >
            <Text style={[styles.inputField, { flex: 1 }]}>{pickupTimeDisplay}</Text>
            <Ionicons name="time-outline" size={18} color={palette.muted} />
          </TouchableOpacity>

          {Platform.OS === "android" && showDatePicker ? (
            <DateTimePicker
              value={pickupAt.getTime() < pickerMinDate.getTime() ? pickerMinDate : pickupAt}
              mode="datetime"
              display="default"
              minimumDate={pickerMinDate}
              onChange={onDateChange}
            />
          ) : null}

          {Platform.OS === "ios" ? (
            <Modal visible={showDatePicker} transparent animationType="slide">
              <View style={styles.dateModalRoot}>
                <TouchableOpacity
                  style={styles.dateModalBackdrop}
                  activeOpacity={1}
                  onPress={() => setShowDatePicker(false)}
                />
                <View style={styles.dateModalSheet}>
                  <View style={styles.dateModalHeader}>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Text style={styles.dateModalBtn}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.dateModalTitle}>Pick-up</Text>
                    <TouchableOpacity onPress={confirmPickupTime}>
                      <Text style={[styles.dateModalBtn, styles.dateModalDone]}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={pickupAt.getTime() < pickerMinDate.getTime() ? pickerMinDate : pickupAt}
                    mode="datetime"
                    display="spinner"
                    minimumDate={pickerMinDate}
                    themeVariant={isDark ? "dark" : "light"}
                    onChange={(_e, d) => {
                      if (d) setPickupAt(clampPickupAt(d));
                    }}
                    style={styles.iosPicker}
                  />
                </View>
              </View>
            </Modal>
          ) : null}
        </View>

        {/* Vehicle — sheet content under top map plane */}
        <View style={[styles.section, showRouteHero && styles.sectionOverMap]}>
          <Text style={styles.sectionTitle}>
            {isParcel ? "Vehicle" : "Select Vehicle"}
          </Text>
          <Text style={styles.sectionSubtitle}>
            {isParcel
              ? "Assigned vehicle for parcel delivery"
              : isHourly
                ? "Vehicles with hourly rates · fare updates with duration"
                : "Choose your ride category"}
          </Text>

          {!isParcel ? <Text style={styles.inputLabel}>Select Car</Text> : null}
          {fleetLoading ? (
            <View style={styles.fleetLoadingBox}>
              <ActivityIndicator size="small" color={GOLD} />
              <Text style={styles.fleetLoadingText}>Loading vehicles…</Text>
            </View>
          ) : fleetError ? (
            <View style={styles.fleetErrorBox}>
              <Text style={styles.fleetErrorText}>{fleetError}</Text>
              <TouchableOpacity style={styles.fleetRetryBtn} onPress={loadFleet}>
                <Text style={styles.fleetRetryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : selectedTier ? (
            <>
              <TouchableOpacity
                style={[
                  styles.carSelector,
                  isParcel || vehicleTiers.length <= 1 ? styles.carSelectorLocked : null,
                ]}
                onPress={() =>
                  !isParcel &&
                  vehicleTiers.length > 1 &&
                  setShowTierDropdown(!showTierDropdown)
                }
                disabled={isParcel || vehicleTiers.length <= 1}
                activeOpacity={isParcel || vehicleTiers.length <= 1 ? 1 : 0.85}
              >
                <Image
                  source={{ uri: selectedTier.imageUrl }}
                  style={styles.carThumb}
                  resizeMode="contain"
                />
                <View style={styles.carSelectorCopy}>
                  <View style={styles.carTitleRow}>
                    <Text style={styles.carName} numberOfLines={2}>
                      {formatTierDisplayTitle(selectedTier.title)}
                    </Text>
                    <View style={styles.capacityInline} accessibilityLabel={`${getTierCapacity(selectedTier)} passengers`}>
                      <Ionicons name="person" size={13} color={palette.muted} />
                      <Text style={styles.capacityInlineText}>
                        {getTierCapacity(selectedTier)}
                      </Text>
                    </View>
                  </View>
                  {(() => {
                    const line = getTierSubtitle(
                      selectedTier.id,
                      selectedTier.subtitle,
                      selectedTier.description
                    );
                    return line ? (
                      <Text style={styles.carCategory} numberOfLines={2}>
                        {line}
                      </Text>
                    ) : null;
                  })()}
                </View>
                <View style={styles.carSelectorTrailing}>
                  {tierFareById[selectedTier.id] != null ? (
                    <Text style={styles.carPriceText} numberOfLines={1}>
                      ${tierFareById[selectedTier.id].toFixed(0)}
                    </Text>
                  ) : (
                    <Text style={styles.carPriceText} numberOfLines={1}>
                      {selectedTier.hourlyRate > 0
                        ? isHourly
                          ? `$${selectedTier.hourlyRate.toFixed(0)}/hr`
                          : `$${selectedTier.hourlyRate.toFixed(0)}`
                        : `$${selectedTier.pricePerKm.toFixed(2)}`}
                    </Text>
                  )}
                  {vehicleTiers.length > 1 ? (
                    <View style={styles.carChevronWrap}>
                      <Ionicons
                        name={showTierDropdown ? "chevron-up" : "chevron-down"}
                        size={18}
                        color={palette.text}
                      />
                    </View>
                  ) : null}
                </View>
              </TouchableOpacity>

              {showTierDropdown && vehicleTiers.length > 1 ? (
                <ScrollView
                  style={styles.carDropdownList}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator
                >
                  {vehicleTiers.map((tier) => {
                    const selected = selectedTierId === tier.id;
                    const tierFare = tierFareById[tier.id];
                    const tierLine = getTierSubtitle(
                      tier.id,
                      tier.subtitle,
                      tier.description
                    );
                    return (
                      <TouchableOpacity
                        key={tier.id}
                        style={[
                          styles.carDropdownItem,
                          selected && styles.carDropdownItemActive,
                        ]}
                        onPress={() => {
                          setSelectedTierId(tier.id);
                          setShowTierDropdown(false);
                        }}
                        activeOpacity={0.85}
                      >
                        <Image
                          source={{ uri: tier.imageUrl }}
                          style={styles.carDropdownThumb}
                          resizeMode="contain"
                        />
                        <View style={styles.carDropdownCopy}>
                          <View style={styles.carTitleRow}>
                            <Text
                              style={[
                                styles.carDropdownName,
                                selected && styles.carDropdownNameActive,
                              ]}
                              numberOfLines={2}
                            >
                              {formatTierDisplayTitle(tier.title)}
                            </Text>
                            <View
                              style={styles.capacityInline}
                              accessibilityLabel={`${getTierCapacity(tier)} passengers`}
                            >
                              <Ionicons
                                name="person"
                                size={13}
                                color={selected ? (isDark ? GOLD : "#8B6914") : palette.muted}
                              />
                              <Text
                                style={[
                                  styles.capacityInlineText,
                                  selected && {
                                    color: isDark ? GOLD : "#8B6914",
                                  },
                                ]}
                              >
                                {getTierCapacity(tier)}
                              </Text>
                            </View>
                          </View>
                          {tierLine ? (
                            <Text
                              style={[
                                styles.tierDropdownSubtitle,
                                selected &&
                                  !isDark && { color: "rgba(26,21,16,0.55)" },
                              ]}
                              numberOfLines={2}
                            >
                              {tierLine}
                            </Text>
                          ) : null}
                        </View>
                        <View style={styles.carDropdownPriceCol}>
                          <Text
                            style={[
                              styles.carDropdownPrice,
                              selected && styles.carDropdownPriceActive,
                            ]}
                            numberOfLines={1}
                          >
                            {tierFare != null
                              ? `$${tierFare.toFixed(0)}`
                              : tier.hourlyRate > 0
                                ? isHourly
                                  ? `$${tier.hourlyRate.toFixed(0)}/hr`
                                  : `$${tier.hourlyRate.toFixed(0)}`
                                : `$${tier.pricePerKm.toFixed(2)}`}
                          </Text>
                          <View
                            style={[
                              styles.carRadio,
                              selected && styles.carRadioSelected,
                            ]}
                          >
                            {selected ? (
                              <Ionicons
                                name="checkmark"
                                size={12}
                                color={isDark ? "#1A1208" : "#fff"}
                              />
                            ) : null}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              ) : null}
            </>
          ) : (
            <Text style={styles.fleetErrorText}>
              {isHourly
                ? "No vehicles with hourly rates are available. Switch to Distance, or try again later."
                : "No vehicles available."}
            </Text>
          )}

          {/* Child Seat — rides only */}
          {!isParcel ? (
          <View style={styles.dualCounterRow}>
            <View style={[styles.dualCounterCard, styles.dualCounterCardFull]}>
              <View style={styles.dualCounterTextCol}>
                <Text style={styles.dualCounterTitle}>Child Seat</Text>
                <Text style={styles.dualCounterSub}>$25 each</Text>
              </View>
              <View style={styles.dualCounterControls}>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => setChildSeatCount(Math.max(0, childSeatCount - 1))}
                  hitSlop={6}
                >
                  <Ionicons name="remove" size={16} color={palette.text} />
                </TouchableOpacity>
                <Text style={styles.dualCounterValue}>{childSeatCount}</Text>
                <TouchableOpacity
                  style={[styles.counterBtn, styles.counterBtnAdd]}
                  onPress={() =>
                    setChildSeatCount(Math.min(maxPassengers, childSeatCount + 1))
                  }
                  hitSlop={6}
                >
                  <Ionicons name="add" size={16} color={isDark ? "#1A1208" : "#fff"} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
          ) : (
            <View style={styles.parcelFields}>
              <Text style={styles.inputLabel}>Recipient Name</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.textInput}
                  value={recipientName}
                  onChangeText={setRecipientName}
                  placeholder="Who receives the parcel?"
                  placeholderTextColor={palette.muted}
                  onFocus={onFormFieldFocus}
                />
              </View>
              <Text style={styles.inputLabel}>Recipient Phone</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.textInput}
                  value={recipientPhone}
                  onChangeText={setRecipientPhone}
                  placeholder="Recipient phone number"
                  placeholderTextColor={palette.muted}
                  keyboardType="phone-pad"
                  onFocus={onFormFieldFocus}
                />
              </View>
              <Text style={styles.inputLabel}>Parcel Weight</Text>
              <View style={styles.weightRow}>
                <View style={[styles.inputBox, styles.weightInputBox]}>
                  <TextInput
                    style={styles.textInput}
                    value={parcelWeight}
                    onChangeText={setParcelWeight}
                    placeholder="e.g. 2.5"
                    placeholderTextColor={palette.muted}
                    keyboardType="decimal-pad"
                    onFocus={onFormFieldFocus}
                  />
                </View>
                <View style={styles.weightUnit}>
                  <Text style={styles.weightUnitText}>kg</Text>
                </View>
              </View>
              <Text style={styles.weightHint}>Approximate weight helps the chauffeur prepare</Text>
              <Text style={styles.inputLabel}>Package Note</Text>
              <View style={[styles.inputBox, styles.parcelNoteBox]}>
                <TextInput
                  style={[styles.textInput, styles.parcelNoteInput]}
                  value={parcelNote}
                  onChangeText={setParcelNote}
                  placeholder="e.g. Small box, fragile"
                  placeholderTextColor={palette.muted}
                  multiline
                  onFocus={onFormFieldFocus}
                />
              </View>
            </View>
          )}
        </View>

        {/* Contact details — rider chosen from header menu */}
        <View style={styles.section}>
          {rideFor === "me" ? (
            user?.firstName && user?.lastName ? (
              <View style={styles.forMeChip}>
                <View style={styles.forMeChipAvatar}>
                  {user.photo ? (
                    <Image
                      source={{ uri: user.photo }}
                      style={styles.forMeAvatarImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={styles.riderHeaderInitials}>
                      {`${(user.firstName[0] || "Y").toUpperCase()}${(user.lastName[0] || "").toUpperCase()}`}
                    </Text>
                  )}
                </View>
                <View style={styles.forMeCopy}>
                  <Text style={styles.forMeName} numberOfLines={1}>
                    {[firstName, lastName].filter(Boolean).join(" ") || "You"}
                  </Text>
                  <Text style={styles.forMeMeta} numberOfLines={1}>
                    {isParcel ? "Sending with your account" : "Booking with your account"}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowRideForMenu(true)}
                  hitSlop={8}
                  style={styles.forMeChangeBtn}
                >
                  <Text style={styles.forMeChangeText}>Switch</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.sectionTitle}>Your details</Text>
                <View style={styles.forMeCard}>
                  <Text style={styles.forMeIncompleteTitle}>Complete your name</Text>
                  <Text style={styles.forMeIncompleteHint}>
                    We’ll save this to your booking details.
                  </Text>
                  <View style={[styles.nameRow, { marginTop: 12 }]}>
                    <View style={styles.nameField}>
                      <Text style={styles.inputLabel}>First Name*</Text>
                      <View style={styles.inputBox}>
                        <TextInput
                          style={styles.textInput}
                          value={firstName}
                          onChangeText={setFirstName}
                          placeholder="First name"
                          placeholderTextColor={palette.muted}
                          autoCapitalize="words"
                          onFocus={onFormFieldFocus}
                        />
                      </View>
                    </View>
                    <View style={styles.nameField}>
                      <Text style={styles.inputLabel}>Last Name*</Text>
                      <View style={styles.inputBox}>
                        <TextInput
                          style={styles.textInput}
                          value={lastName}
                          onChangeText={setLastName}
                          placeholder="Last name"
                          placeholderTextColor={palette.muted}
                          autoCapitalize="words"
                          onFocus={onFormFieldFocus}
                        />
                      </View>
                    </View>
                  </View>
                </View>
              </>
            )
          ) : rideFor === "child" ? (
            <>
              <View style={styles.riderSectionHead}>
                <Text style={[styles.sectionTitle, styles.riderSectionHeadTitle]}>Child details</Text>
                <TouchableOpacity onPress={() => setShowRideForMenu(true)} hitSlop={8}>
                  <Text style={styles.forMeChangeText}>Switch</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.childSafetyBanner}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#A67C32" />
                <Text style={styles.childSafetyText}>
                  You stay the account holder and pay. Enter your child’s details, keep a
                  guardian phone reachable, then share the live trip link with family after
                  booking.
                </Text>
              </View>

              <View style={styles.nameRow}>
                <View style={styles.nameField}>
                  <Text style={styles.inputLabel}>Child’s first name*</Text>
                  <View style={styles.inputBox}>
                    <TextInput
                      style={styles.textInput}
                      value={firstName}
                      onChangeText={setFirstName}
                      placeholder="First name"
                      placeholderTextColor={palette.muted}
                      autoCapitalize="words"
                      onFocus={onFormFieldFocus}
                    />
                  </View>
                </View>
                <View style={styles.nameField}>
                  <Text style={styles.inputLabel}>Last name*</Text>
                  <View style={styles.inputBox}>
                    <TextInput
                      style={styles.textInput}
                      value={lastName}
                      onChangeText={setLastName}
                      placeholder="Last name"
                      placeholderTextColor={palette.muted}
                      autoCapitalize="words"
                      onFocus={onFormFieldFocus}
                    />
                  </View>
                </View>
              </View>

              <Text style={styles.inputLabel}>Child’s age*</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.textInput}
                  value={childAge}
                  onChangeText={(t) => setChildAge(t.replace(/[^0-9]/g, "").slice(0, 2))}
                  keyboardType="number-pad"
                  placeholder="Age (1–17)"
                  placeholderTextColor={palette.muted}
                  maxLength={2}
                  onFocus={onFormFieldFocus}
                />
              </View>

              <Text style={[styles.inputLabel, { marginTop: 12 }]}>Guardian phone*</Text>
              <View style={styles.phoneInput}>
                <View style={styles.countryCode}>
                  <View style={styles.flagIcon}>
                    <Text>🇨🇦</Text>
                  </View>
                  <Text style={styles.countryCodeText}>+1</Text>
                </View>
                <TextInput
                  style={styles.phoneField}
                  value={phoneNumber}
                  onChangeText={(t) => setPhoneNumber(normalizeNanpNationalNumber(t))}
                  keyboardType="phone-pad"
                  placeholder="10-digit number"
                  placeholderTextColor={palette.muted}
                  maxLength={10}
                  onFocus={onFormFieldFocus}
                />
              </View>
              <Text style={styles.childPhoneHint}>
                Chauffeur will use this number at pickup. You’ll get receipts on your account
                email.
              </Text>
            </>
          ) : (
            <>
              <View style={styles.riderSectionHead}>
                <Text style={[styles.sectionTitle, styles.riderSectionHeadTitle]}>
                  {isParcel ? "Sender details" : "Guest details"}
                </Text>
                <TouchableOpacity onPress={() => setShowRideForMenu(true)} hitSlop={8}>
                  <Text style={styles.forMeChangeText}>Switch</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.nameRow}>
                <View style={styles.nameField}>
                  <Text style={styles.inputLabel}>First Name*</Text>
                  <View style={styles.inputBox}>
                    <TextInput
                      style={styles.textInput}
                      value={firstName}
                      onChangeText={setFirstName}
                      placeholder={isParcel ? "Sender" : "Passenger"}
                      placeholderTextColor={palette.muted}
                      autoCapitalize="words"
                      onFocus={onFormFieldFocus}
                    />
                  </View>
                </View>
                <View style={styles.nameField}>
                  <Text style={styles.inputLabel}>Last Name*</Text>
                  <View style={styles.inputBox}>
                    <TextInput
                      style={styles.textInput}
                      value={lastName}
                      onChangeText={setLastName}
                      placeholder="Name"
                      placeholderTextColor={palette.muted}
                      autoCapitalize="words"
                      onFocus={onFormFieldFocus}
                    />
                  </View>
                </View>
              </View>

              <Text style={styles.inputLabel}>Phone*</Text>
              <View style={styles.phoneInput}>
                <View style={styles.countryCode}>
                  <View style={styles.flagIcon}>
                    <Text>🇨🇦</Text>
                  </View>
                  <Text style={styles.countryCodeText}>+1</Text>
                </View>
                <TextInput
                  style={styles.phoneField}
                  value={phoneNumber}
                  onChangeText={(t) => setPhoneNumber(normalizeNanpNationalNumber(t))}
                  keyboardType="phone-pad"
                  placeholder="10-digit number"
                  placeholderTextColor={palette.muted}
                  maxLength={10}
                  onFocus={onFormFieldFocus}
                />
              </View>
            </>
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Continue — hide while typing so keyboard never covers the active field */}
      {!keyboardVisible ? (
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[styles.continueBtn, continueDisabled && styles.continueBtnDisabled]}
            activeOpacity={0.9}
            onPress={continueToConfirm}
            disabled={continueDisabled}
          >
            <Text
              style={[
                styles.continueBtnText,
                continueDisabled && styles.continueBtnTextDisabled,
              ]}
            >
              {continueLabel}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
      </SafeAreaView>
    </View>
  );
}

function makeStyles(palette: DriverPalette, isDark: boolean) {
  const card = isDark ? palette.cardAndroid : "#fff";
  /** Light: match Google Places white fields. Dark: subtle elevated chip. */
  const fieldBg = isDark ? palette.metaChipBg : "#fff";
  const segmentTrack = isDark ? palette.metaChipBg : "rgba(0,0,0,0.06)";
  const primaryBtnBg = isDark ? GOLD : "#0f172a";
  const primaryBtnText = isDark ? "#1A1208" : "#fff";
  const primaryBtnTextMuted = isDark ? "rgba(26,18,8,0.72)" : "rgba(255,255,255,0.72)";
  return StyleSheet.create({
  root: {
    flex: 1,
  },
  ambientGlow: {
    position: "absolute",
    top: -40,
    left: -20,
    right: -20,
    height: 220,
  },
  safe: {
    flex: 1,
    backgroundColor: "transparent",
  },
  safeOverMap: {
    zIndex: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    gap: 4,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 56,
  },
  backText: {
    fontSize: 15,
    color: palette.text,
    marginLeft: 2,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "600",
    color: palette.text,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  riderHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    minWidth: 56,
    justifyContent: "flex-end",
  },
  riderHeaderAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  riderHeaderAvatarChild: {
    backgroundColor: "#C9A063",
  },
  riderHeaderAvatarSomeone: {
    backgroundColor: "#4B5563",
  },
  riderHeaderInitials: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.2,
  },
  riderMenuOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.35)",
    justifyContent: "flex-start",
    paddingTop: Platform.OS === "ios" ? 100 : 72,
    paddingHorizontal: 16,
  },
  riderMenuCard: {
    backgroundColor: card,
    borderRadius: 20,
    paddingTop: 16,
    paddingBottom: 10,
    paddingHorizontal: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.18,
        shadowRadius: 24,
      },
      android: { elevation: 10 },
    }),
  },
  riderMenuTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: palette.muted,
    letterSpacing: 0.3,
    textTransform: "uppercase",
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  riderMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  riderMenuItemOn: {
    backgroundColor: fieldBg,
  },
  riderMenuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: fieldBg,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  riderMenuIconImg: {
    width: 40,
    height: 40,
  },
  riderMenuIconChild: {
    backgroundColor: "rgba(201,160,99,0.22)",
  },
  riderMenuIconSomeone: {
    backgroundColor: fieldBg,
  },
  riderMenuCopy: {
    flex: 1,
    minWidth: 0,
  },
  riderMenuItemTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: palette.text,
    letterSpacing: -0.2,
  },
  riderMenuItemSub: {
    marginTop: 2,
    fontSize: 13,
    color: palette.muted,
  },
  riderSectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  riderSectionHeadTitle: {
    marginBottom: 0,
  },
  forMeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: fieldBg,
    borderWidth: 1,
    borderColor: palette.border,
  },
  forMeChipAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  forMeChangeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  forMeChangeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#A67C32",
  },
  stepIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 20,
  },
  stepActive: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: primaryBtnBg,
    justifyContent: "center",
    alignItems: "center",
  },
  stepActiveText: {
    fontSize: 13,
    fontWeight: "600",
    color: primaryBtnText,
  },
  stepLine: {
    width: 180,
    height: 2,
    backgroundColor: palette.border,
  },
  stepInactive: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: palette.border,
    justifyContent: "center",
    alignItems: "center",
  },
  stepInactiveText: {
    fontSize: 13,
    fontWeight: "500",
    color: palette.muted,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: palette.text,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: isDark ? GOLD : palette.hintBold,
    marginBottom: 16,
  },
  childSafetyBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(201,160,99,0.12)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(201,160,99,0.35)",
    marginBottom: 14,
  },
  childSafetyText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: palette.hintText,
    fontWeight: "500",
  },
  childPhoneHint: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 16,
    color: palette.muted,
  },
  forMeCard: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 14,
    backgroundColor: fieldBg,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  forMeCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  forMeAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F5EBD9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(201,160,99,0.35)",
    overflow: "hidden",
  },
  forMeAvatarImage: {
    width: "100%",
    height: "100%",
  },
  forMeInitials: {
    fontSize: 14,
    fontWeight: "700",
    color: "#8B6914",
    letterSpacing: 0.4,
  },
  forMeCopy: {
    flex: 1,
    minWidth: 0,
  },
  forMeName: {
    fontSize: 16,
    fontWeight: "700",
    color: palette.text,
    marginBottom: 2,
  },
  forMeMeta: {
    fontSize: 12,
    color: palette.muted,
    fontWeight: "500",
  },
  forMeVerified: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#e8f5e9",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  forMeVerifiedText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2e7d32",
  },
  forMeFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
  },
  forMeEmail: {
    flex: 1,
    fontSize: 13,
    color: palette.muted,
  },
  forMeIncompleteTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: palette.text,
  },
  forMeIncompleteHint: {
    marginTop: 4,
    fontSize: 12,
    color: palette.muted,
    lineHeight: 16,
  },
  riderSimpleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  riderAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: fieldBg,
    alignItems: "center",
    justifyContent: "center",
  },
  riderInitials: {
    fontSize: 13,
    fontWeight: "700",
    color: palette.text,
    letterSpacing: 0.3,
  },
  riderName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: palette.text,
  },
  sectionSubtitleWhenWhere: {
    marginBottom: 4,
  },
  modeToggle: {
    flexDirection: "row",
    backgroundColor: segmentTrack,
    borderRadius: 12,
    padding: 4,
    marginTop: 10,
    marginBottom: 4,
    gap: 4,
  },
  modeToggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 9,
  },
  modeToggleBtnActive: {
    backgroundColor: primaryBtnBg,
  },
  modeToggleText: {
    fontSize: 13,
    fontWeight: "600",
    color: palette.muted,
    letterSpacing: 0.2,
  },
  modeToggleTextActive: {
    color: primaryBtnText,
  },
  modeHint: {
    fontSize: 12,
    lineHeight: 16,
    color: palette.muted,
    marginTop: 8,
    marginBottom: 2,
  },
  asDirectedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: isDark ? "rgba(212,160,74,0.12)" : palette.hintBg,
    borderWidth: 1,
    borderColor: isDark ? "rgba(212,160,74,0.28)" : palette.hintBorder,
  },
  asDirectedIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: isDark ? "rgba(212,160,74,0.18)" : "rgba(212,160,74,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  asDirectedTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: isDark ? palette.text : palette.hintBold,
  },
  asDirectedSub: {
    fontSize: 12,
    color: isDark ? palette.muted : palette.hintText,
    marginTop: 2,
    lineHeight: 16,
  },
  hoursScroll: {
    marginTop: 2,
    marginHorizontal: -4,
  },
  hoursRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  hourChip: {
    minWidth: 56,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: fieldBg,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: "center",
  },
  hourChipActive: {
    backgroundColor: primaryBtnBg,
    borderColor: primaryBtnBg,
  },
  hourChipValue: {
    fontSize: 18,
    fontWeight: "700",
    color: palette.text,
  },
  hourChipValueActive: {
    color: primaryBtnText,
  },
  hourChipUnit: {
    fontSize: 11,
    fontWeight: "500",
    color: palette.muted,
    marginTop: 1,
  },
  hourChipUnitActive: {
    color: primaryBtnTextMuted,
  },
  placesHint: {
    fontSize: 11,
    lineHeight: 15,
    color: palette.muted,
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: palette.text,
    marginBottom: 8,
    marginTop: 12,
  },
  pickupLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    marginBottom: 8,
  },
  pickupLabelInline: {
    marginTop: 0,
    marginBottom: 0,
  },
  useLocationBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  useLocationText: {
    fontSize: 12,
    fontWeight: "600",
    color: isDark ? GOLD : palette.hintBold,
  },
  pickupHint: {
    fontSize: 11,
    color: palette.muted,
    marginTop: 6,
    lineHeight: 15,
  },
  airportExtrasBlock: {
    marginTop: 4,
  },
  meetGreetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    backgroundColor: fieldBg,
    minHeight: 56,
  },
  meetGreetTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: palette.text,
    flexShrink: 1,
  },
  meetGreetSub: {
    fontSize: 12.5,
    fontWeight: "500",
    color: palette.muted,
    marginTop: 2,
    lineHeight: 17,
    flexShrink: 1,
  },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: fieldBg,
  },
  placeholderText: {
    fontSize: 14,
    color: palette.muted,
  },
  selectedText: {
    fontSize: 14,
    color: palette.text,
    fontWeight: "500",
  },
  dropdownList: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 10,
    marginTop: 6,
    backgroundColor: card,
    overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  dropdownItemActive: {
    backgroundColor: isDark ? "rgba(212,160,74,0.16)" : "#FFFBF5",
  },
  dropdownItemText: {
    fontSize: 14,
    color: palette.text,
  },
  dropdownItemTextActive: {
    color: isDark ? GOLD : "#8B6914",
    fontWeight: "600",
  },
  inputWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
    backgroundColor: fieldBg,
    gap: 10,
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: palette.text,
  },
  stopBlock: {
    marginTop: 10,
  },
  stopLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  stopRemoveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 2,
  },
  stopRemoveText: {
    fontSize: 12,
    fontWeight: "600",
    color: palette.muted,
  },
  addStopBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 12,
    alignSelf: "flex-start",
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 10,
    backgroundColor: isDark ? "rgba(232,192,120,0.12)" : "rgba(201,160,99,0.14)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: isDark ? "rgba(232,192,120,0.28)" : "rgba(168,120,48,0.28)",
  },
  addStopText: {
    fontSize: 12.5,
    color: isDark ? GOLD : "#8B6914",
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  /** Absolute TOP map plane — full screen width, sits under chrome. */
  routeMapPlane: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 0,
    overflow: "hidden",
    backgroundColor: "#EEF0F3",
  },
  routeMapTopVignette: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  routeHeroLoadingBg: {
    backgroundColor: isDark ? "#1C1916" : "#E8E4DC",
  },
  routeHeroFade: {
    ...StyleSheet.absoluteFillObject,
  },
  routeHeroChips: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  routeHeroChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: "44%",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: isDark ? "rgba(28,25,22,0.9)" : "rgba(255,255,255,0.95)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.14,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 4 },
    }),
  },
  routeHeroChipText: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "700",
    color: palette.text,
    letterSpacing: -0.2,
  },
  routeHeroSpinner: {
    position: "absolute",
    right: 16,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: isDark ? "rgba(28,25,22,0.9)" : "rgba(255,255,255,0.94)",
  },
  floatingChrome: {
    zIndex: 4,
    paddingHorizontal: 12,
  },
  headerOverMap: {
    paddingVertical: 6,
  },
  headerGlassBtn: {
    backgroundColor: isDark ? "rgba(28,25,22,0.72)" : "rgba(255,255,255,0.88)",
    borderRadius: 22,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 44,
    minHeight: 40,
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 3 },
    }),
  },
  headerTitleOverMap: {
    textShadowColor: "rgba(255,255,255,0.55)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  sheetHandleRow: {
    alignItems: "center",
    paddingTop: 2,
    paddingBottom: 4,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: isDark ? "rgba(255,255,255,0.28)" : "rgba(28,25,22,0.18)",
  },
  stepIndicatorTight: {
    marginTop: 6,
    marginBottom: 10,
  },
  sectionOverMap: {
    marginTop: 0,
    zIndex: 2,
  },
  tierList: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15,23,42,0.10)",
    backgroundColor: card,
    overflow: "hidden",
    shadowColor: "#0f172a",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  tierGroup: {
    paddingTop: 4,
  },
  tierGroupLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: palette.muted,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  tierRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: card,
  },
  tierRowSelected: {
    backgroundColor: "rgba(201,160,99,0.06)",
  },
  tierRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(15,23,42,0.08)",
  },
  tierThumb: {
    width: 72,
    height: 44,
    flexShrink: 0,
    marginRight: 10,
  },
  tierCopy: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  tierTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: palette.text,
    letterSpacing: 0.1,
  },
  tierTitleSelected: {
    color: isDark ? GOLD : "#8B6914",
  },
  tierSubtitle: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "500",
    color: palette.muted,
    lineHeight: 15,
    letterSpacing: 0.2,
  },
  tierRight: {
    alignItems: "flex-end",
    flexShrink: 0,
    gap: 8,
  },
  tierFare: {
    fontSize: 15,
    fontWeight: "800",
    color: palette.text,
  },
  tierFareSelected: {
    color: isDark ? GOLD : "#8B6914",
  },
  tierRate: {
    fontSize: 12,
    fontWeight: "600",
    color: palette.muted,
  },
  tierCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: palette.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: card,
  },
  tierCheckSelected: {
    borderColor: "#C9A063",
    backgroundColor: "#C9A063",
  },
  carSelector: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1.5,
    borderColor: palette.border,
    borderRadius: 16,
    paddingLeft: 6,
    paddingRight: 10,
    paddingVertical: 12,
    backgroundColor: card,
    gap: 8,
    minHeight: 88,
  },
  carSelectorLocked: {
    backgroundColor: fieldBg,
    borderColor: palette.border,
  },
  carThumbWrap: {
    width: 96,
    height: 70,
    backgroundColor: "transparent",
    flexShrink: 0,
  },
  carThumb: {
    width: 96,
    height: 70,
    backgroundColor: "transparent",
    flexShrink: 0,
  },
  carSelectorCopy: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
    gap: 4,
    paddingTop: 2,
  },
  carTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    flexWrap: "nowrap",
  },
  capacityInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    flexShrink: 0,
    marginTop: 2,
  },
  capacityInlineText: {
    fontSize: 13,
    fontWeight: "600",
    color: palette.muted,
    fontVariant: ["tabular-nums"],
  },
  carSelectorTrailing: {
    flexShrink: 0,
    alignItems: "flex-end",
    justifyContent: "flex-start",
    gap: 8,
    minWidth: 64,
    paddingTop: 2,
  },
  carChevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: fieldBg,
    alignItems: "center",
    justifyContent: "center",
  },
  carName: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    fontWeight: "700",
    color: palette.text,
    lineHeight: 21,
    letterSpacing: -0.2,
  },
  carCategory: {
    fontSize: 13,
    color: palette.muted,
    marginTop: 0,
    lineHeight: 18,
  },
  carMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  carMetaText: {
    fontSize: 12,
    fontWeight: "500",
    color: palette.muted,
    flexShrink: 1,
  },
  fleetLoadingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 10,
    backgroundColor: fieldBg,
  },
  fleetLoadingText: {
    fontSize: 14,
    color: palette.muted,
  },
  fleetErrorBox: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#f5c6cb",
    backgroundColor: "#fef2f2",
  },
  fleetErrorText: {
    fontSize: 13,
    color: "#c0392b",
    marginBottom: 8,
  },
  fleetRetryBtn: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: primaryBtnBg,
    borderRadius: 8,
  },
  fleetRetryText: {
    color: primaryBtnText,
    fontSize: 13,
    fontWeight: "600",
  },
  carPriceText: {
    fontSize: 15,
    fontWeight: "700",
    color: palette.text,
    textAlign: "right",
  },
  carDropdownList: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 16,
    marginTop: 10,
    backgroundColor: card,
    maxHeight: 520,
    overflow: "hidden",
  },
  tierDropdownGroupLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: palette.text,
    letterSpacing: -0.2,
    textTransform: "none",
    paddingLeft: 8,
    paddingRight: 12,
    paddingTop: 14,
    paddingBottom: 2,
  },
  tierDropdownSubtitle: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "400",
    color: palette.muted,
    lineHeight: 18,
  },
  carDropdownItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingLeft: 4,
    paddingRight: 8,
    paddingVertical: 10,
    gap: 6,
    minHeight: 80,
    marginHorizontal: 0,
    marginBottom: 2,
    borderRadius: 12,
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  carDropdownItemActive: {
    backgroundColor: isDark ? "rgba(212,160,74,0.16)" : "#FFFBF5",
    borderColor: "#C9A063",
  },
  carDropdownItemBorder: {
    borderBottomWidth: 0,
  },
  carDropdownThumbWrap: {
    width: 100,
    height: 74,
    backgroundColor: "transparent",
    flexShrink: 0,
  },
  carDropdownThumb: {
    width: 100,
    height: 74,
    backgroundColor: "transparent",
    flexShrink: 0,
  },
  carDropdownCopy: {
    flex: 1,
    minWidth: 0,
    justifyContent: "flex-start",
    paddingTop: 2,
  },
  carDropdownName: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    fontWeight: "700",
    color: palette.text,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  carDropdownNameActive: {
    color: isDark ? "#F7F1E8" : "#1A1510",
    fontWeight: "800",
  },
  carDropdownPriceCol: {
    flexShrink: 0,
    width: 64,
    alignItems: "flex-end",
    justifyContent: "flex-start",
    gap: 8,
    paddingTop: 2,
  },
  carDropdownPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: palette.text,
    textAlign: "right",
    lineHeight: 18,
  },
  carDropdownPriceActive: {
    color: isDark ? "#F7F1E8" : "#1A1510",
    fontWeight: "800",
  },
  carRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: palette.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: card,
  },
  carRadioSelected: {
    borderColor: primaryBtnBg,
    backgroundColor: primaryBtnBg,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.text,
    marginBottom: 2,
  },
  toggleSubtitle: {
    fontSize: 12,
    color: palette.muted,
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  dualCounterRow: {
    flexDirection: "row",
    alignItems: "stretch",
    marginTop: 12,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 14,
    backgroundColor: fieldBg,
    overflow: "hidden",
  },
  dualCounterCard: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  dualCounterCardFull: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dualCounterTextCol: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },
  dualCounterDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: palette.border,
    alignSelf: "stretch",
  },
  dualCounterTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: palette.text,
    letterSpacing: 0.2,
  },
  dualCounterSub: {
    fontSize: 12,
    color: palette.muted,
    fontWeight: "500",
    marginTop: 2,
    marginBottom: 0,
  },
  dualCounterControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexShrink: 0,
  },
  dualCounterValue: {
    fontSize: 16,
    fontWeight: "700",
    color: palette.text,
    minWidth: 22,
    textAlign: "center",
  },
  counter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  counterBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: card,
  },
  counterBtnAdd: {
    backgroundColor: primaryBtnBg,
    borderColor: primaryBtnBg,
  },
  counterValue: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.text,
    minWidth: 20,
    textAlign: "center",
  },
  nameRow: {
    flexDirection: "row",
    gap: 12,
  },
  nameField: {
    flex: 1,
  },
  inputBox: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: fieldBg,
  },
  textInput: {
    fontSize: 14,
    color: palette.text,
  },
  parcelBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "rgba(212,160,74,0.1)",
    borderWidth: 1,
    borderColor: "rgba(212,160,74,0.28)",
  },
  parcelBannerText: {
    fontSize: 12,
    fontWeight: "600",
    color: isDark ? "#E8C078" : "#8B6914",
  },
  parcelFields: {
    marginTop: 4,
  },
  weightRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 8,
  },
  weightInputBox: {
    flex: 1,
  },
  weightUnit: {
    minWidth: 52,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: fieldBg,
    alignItems: "center",
    justifyContent: "center",
  },
  weightUnitText: {
    fontSize: 13,
    fontWeight: "700",
    color: palette.muted,
    letterSpacing: 0.3,
  },
  weightHint: {
    fontSize: 11,
    color: palette.muted,
    marginTop: 6,
    lineHeight: 15,
  },
  parcelNoteBox: {
    minHeight: 72,
    alignItems: "flex-start",
  },
  parcelNoteInput: {
    minHeight: 56,
    textAlignVertical: "top",
  },
  phoneInput: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 10,
    backgroundColor: fieldBg,
    overflow: "hidden",
  },
  countryCode: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRightWidth: 1,
    borderRightColor: palette.border,
    gap: 6,
  },
  flagIcon: {
    width: 22,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.text,
  },
  phoneField: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: palette.text,
  },
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: isDark ? "rgba(10,9,8,0.94)" : card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
    ...Platform.select({
      ios: {
        paddingBottom: 30,
      },
    }),
  },
  continueBtn: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  continueBtnDisabled: {
    backgroundColor: isDark ? "rgba(212,160,74,0.28)" : "rgba(212,160,74,0.4)",
    opacity: 1,
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1208",
  },
  continueBtnTextDisabled: {
    color: "rgba(26,18,8,0.55)",
  },
  dateModalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  dateModalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  dateModalSheet: {
    backgroundColor: card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: Platform.OS === "ios" ? 28 : 16,
  },
  dateModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  dateModalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: palette.text,
  },
  dateModalBtn: {
    fontSize: 16,
    color: palette.muted,
  },
  dateModalDone: {
    color: isDark ? GOLD : palette.hintBold,
    fontWeight: "700",
  },
  iosPicker: {
    height: 216,
    alignSelf: "stretch",
  },
  });
}
