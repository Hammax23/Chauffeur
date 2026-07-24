import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Image,
  Platform,
  Alert,
  Modal,
  ActivityIndicator,
} from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useAuth } from "../../contexts/AuthContext";
import { GooglePlacesAddressField } from "../../components/GooglePlacesAddressField";
import { fetchDirectionsSummary } from "../../services/places";
import { getAppFleetVehicles, type AppFleetVehicleDto } from "../../services/api";
import {
  buildVehicleTiersFromAppFleet,
  findTierById,
  resolveTierIdFromFleetVehicleId,
  type VehicleTierOption,
} from "../../data/vehicle-tiers";
import {
  calculateAppDistanceFare,
  APP_DEFAULT_GRATUITY_PERCENT,
  parseMaxPassengers,
  BASE_DISTANCE_KM,
  EXTRA_KM_RATE,
  type AppDistancePricing,
} from "../../utils/app-fare";
import { saveBookingDraft } from "../../services/booking-draft";
import {
  PARCEL_SERVICE_TYPE,
  formatParcelWeight,
  isParcelServiceType,
} from "../../utils/parcel";

/** Silent default — create UI no longer asks for service type (distance bookings). */
const DEFAULT_SERVICE_TYPE = "Point-to-Point transportation";

function defaultPickupDate(): Date {
  const d = new Date();
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
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
  const params = useLocalSearchParams<{
    prefill?: string | string[];
    vehicleId?: string | string[];
    pickup?: string | string[];
    pickupLat?: string | string[];
    pickupLng?: string | string[];
  }>();
  // Ensures we only honour a `vehicleId` param once — after the user has
  // possibly changed the selection, navigating back here shouldn't yank it
  // back to whatever the URL says.
  const consumedVehicleParamRef = useRef(false);
  const pickupAutoFilledRef = useRef(false);
  const [serviceType, setServiceType] = useState(DEFAULT_SERVICE_TYPE);
  const [pickupAddress, setPickupAddress] = useState("");
  /** GPS from "My location" — used as Directions origin so distance/duration stay accurate. */
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [pickupLocating, setPickupLocating] = useState(false);
  const [pickupLocationHint, setPickupLocationHint] = useState<string | null>(null);
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [stopAddress, setStopAddress] = useState("");
  const [showStopField, setShowStopField] = useState(false);
  const [pickupAt, setPickupAt] = useState<Date>(defaultPickupDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [passengersCount, setPassengersCount] = useState(1);
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [parcelWeight, setParcelWeight] = useState("");
  const [parcelNote, setParcelNote] = useState("");
  const [fleetVehicles, setFleetVehicles] = useState<AppFleetVehicleDto[]>([]);
  const [distancePricing, setDistancePricing] = useState<AppDistancePricing>({
    baseDistanceKm: BASE_DISTANCE_KM,
    extraKmRate: EXTRA_KM_RATE,
  });
  const [fleetLoading, setFleetLoading] = useState(true);
  const [fleetError, setFleetError] = useState("");
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [showTierDropdown, setShowTierDropdown] = useState(false);

  const vehicleTiers = useMemo(
    () => buildVehicleTiersFromAppFleet(fleetVehicles),
    [fleetVehicles]
  );

  const selectedTier = useMemo(
    () => (selectedTierId ? findTierById(vehicleTiers, selectedTierId) : null),
    [vehicleTiers, selectedTierId]
  );
  const isParcel = isParcelServiceType(serviceType);
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
  const [childSeatCount, setChildSeatCount] = useState(0);
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phone || "");
  const [email, setEmail] = useState(user?.email || "");

  useEffect(() => {
    if (!user) return;
    setFirstName((prev) => prev || user.firstName || "");
    setLastName((prev) => prev || user.lastName || "");
    setPhoneNumber((prev) => prev || user.phone || "");
    setEmail((prev) => prev || user.email || "");
  }, [user]);

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
      const tiers = buildVehicleTiersFromAppFleet(vehicles);

      const rawId = params.vehicleId;
      const requestedFleetOrTierId =
        typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : undefined;
      const preferredTierId =
        requestedFleetOrTierId && !consumedVehicleParamRef.current
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
  }, [params.vehicleId]);

  useEffect(() => {
    loadFleet();
  }, [loadFleet]);

  const fillCurrentPickup = useCallback(async (opts?: { force?: boolean }) => {
    if (!opts?.force && pickupAutoFilledRef.current) return;
    if (!opts?.force && pickupAddress.trim().length > 0) return;

    setPickupLocating(true);
    setPickupLocationHint(null);
    try {
      const result = await resolveCurrentPickup();
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
    setPickupLocationHint("Pickup from Home map");

    const rawLat = params.pickupLat;
    const rawLng = params.pickupLng;
    const latStr = typeof rawLat === "string" ? rawLat : Array.isArray(rawLat) ? rawLat[0] : undefined;
    const lngStr = typeof rawLng === "string" ? rawLng : Array.isArray(rawLng) ? rawLng[0] : undefined;
    const lat = latStr ? parseFloat(latStr) : NaN;
    const lng = lngStr ? parseFloat(lngStr) : NaN;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      setPickupCoords({ lat, lng });
      setPickupLocationHint("Using Home pickup — route uses exact coordinates");
    }
  }, [params.pickup, params.pickupLat, params.pickupLng]);

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
    if (value) setServiceType(value);
  }, [params.prefill]);

  useEffect(() => {
    const pickup = pickupAddress.trim();
    const dropoff = dropoffAddress.trim();
    const waypoint =
      showStopField && stopAddress.trim().length >= 3 ? stopAddress.trim() : undefined;

    // Prefer GPS lat,lng for My Location so Google Directions does not re-geocode a fuzzy address.
    const origin =
      pickupCoords != null
        ? `${pickupCoords.lat.toFixed(6)},${pickupCoords.lng.toFixed(6)}`
        : pickup;

    const pickupReady = pickupCoords != null || pickup.length >= 8;
    if (!pickupReady || dropoff.length < 8) {
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
        const r = await fetchDirectionsSummary(
          {
            origin,
            destination: dropoff,
            waypoint,
            avoidTolls: !tollRoute,
            mapWidth: 800,
            mapHeight: 460,
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
  }, [pickupAddress, pickupCoords, dropoffAddress, stopAddress, showStopField, tollRoute]);

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
    const meters = routeSummary?.distanceMeters ?? null;
    if (meters == null || meters <= 0) return null;
    return calculateAppDistanceFare({
      distanceMeters: meters,
      hourlyRate: selectedTier.hourlyRate,
      pricePerKm: selectedTier.pricePerKm,
      baseDistanceKm: distancePricing.baseDistanceKm,
      extraKmRate: distancePricing.extraKmRate,
      hasStop: showStopField && stopAddress.trim().length >= 3,
      childSeatCount,
      gratuityPercent: APP_DEFAULT_GRATUITY_PERCENT,
    });
  }, [
    selectedTier,
    routeSummary,
    showStopField,
    stopAddress,
    childSeatCount,
    distancePricing,
  ]);

  const maxPassengers = useMemo(
    () => parseMaxPassengers(selectedTier?.seating) ?? 8,
    [selectedTier]
  );

  useEffect(() => {
    setPassengersCount((n) => Math.min(n, maxPassengers));
    setChildSeatCount((n) => Math.min(n, passengersCount, maxPassengers));
  }, [maxPassengers, passengersCount]);

  /** Per-tier ride fare for the list (Uber-style price on the right). */
  const tierFareById = useMemo(() => {
    const meters = routeSummary?.distanceMeters ?? null;
    if (meters == null || meters <= 0) return {} as Record<string, number>;
    const out: Record<string, number> = {};
    for (const tier of vehicleTiers) {
      const fare = calculateAppDistanceFare({
        distanceMeters: meters,
        hourlyRate: tier.hourlyRate,
        pricePerKm: tier.pricePerKm,
        baseDistanceKm: distancePricing.baseDistanceKm,
        extraKmRate: distancePricing.extraKmRate,
        hasStop: false,
        childSeatCount: 0,
        gratuityPercent: APP_DEFAULT_GRATUITY_PERCENT,
      });
      if (fare) out[tier.id] = fare.rideFare;
    }
    return out;
  }, [vehicleTiers, routeSummary?.distanceMeters, distancePricing]);

  const onDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (event.type === "dismissed") {
      return;
    }
    if (date) setPickupAt(date);
  };

  const continueToConfirm = async () => {
    if (!pickupAddress.trim() || !dropoffAddress.trim()) {
      Alert.alert("Missing info", "Please enter pickup and drop-off addresses.");
      return;
    }
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phoneNumber.trim()) {
      Alert.alert("Missing info", "Please fill in your name, email, and phone.");
      return;
    }
    if (!selectedTier) {
      Alert.alert("Missing info", "Please wait for the vehicle list to load, then select a vehicle.");
      return;
    }
    if (!routeSummary?.distanceMeters || !fareEstimate) {
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
      if (childSeatCount > passengersCount) {
        Alert.alert("Child seats", "Child seats cannot exceed the passenger count.");
        return;
      }
    } else {
      if (!recipientName.trim() || !recipientPhone.trim()) {
        Alert.alert("Missing info", "Please enter the recipient name and phone number.");
        return;
      }
    }

    await saveBookingDraft({
      serviceType,
      pickupAddress,
      dropoffAddress,
      stopAddress: showStopField ? stopAddress : "",
      serviceDate: serviceDateStr,
      serviceTime: serviceTimeStr,
      pickupTimeDisplay,
      passengers: isParcel ? "1" : String(passengersCount),
      vehicle: selectedTier.title,
      vehicleId: selectedTier.id,
      vehicleSubtitle: selectedTier.subtitle,
      vehiclePrice:
        selectedTier.hourlyRate > 0
          ? `From $${selectedTier.hourlyRate.toFixed(2)}`
          : `$${selectedTier.pricePerKm.toFixed(2)}/km`,
      rideFare: String(fareEstimate.rideFare ?? 0),
      pricePerKm: String(selectedTier.pricePerKm),
      hourlyRate: String(selectedTier.hourlyRate),
      baseDistanceKm: String(distancePricing.baseDistanceKm),
      extraKmRate: String(distancePricing.extraKmRate),
      distanceText: routeSummary?.distanceText ?? "",
      durationText: routeSummary?.durationText ?? "",
      distanceMeters: String(routeSummary?.distanceMeters ?? ""),
      durationSeconds: String(routeSummary?.durationSeconds ?? ""),
      tollRoute: tollRoute ? "Yes" : "No",
      childSeatCount: isParcel ? "0" : String(childSeatCount),
      firstName,
      lastName,
      phoneNumber,
      email,
      seating: selectedTier.seating || "",
      recipientName: isParcel ? recipientName.trim() : undefined,
      recipientPhone: isParcel ? recipientPhone.trim() : undefined,
      parcelWeight: isParcel ? formatParcelWeight(parcelWeight) || undefined : undefined,
      parcelNote: isParcel ? parcelNote.trim() : undefined,
    });

    router.push("/customer/reservation-confirm");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color="#1a1a1a" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isParcel ? "Send a Parcel" : "Create Reservation"}
          </Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Step Indicator */}
        <View style={styles.stepIndicator}>
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
              <Ionicons name="cube-outline" size={16} color="#D4A04A" />
              <Text style={styles.parcelBannerText}>Parcel Delivery · same-day chauffeur</Text>
            </View>
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
                <ActivityIndicator size="small" color="#D4A04A" />
              ) : (
                <>
                  <Ionicons name="locate-outline" size={14} color="#D4A04A" />
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
                : "Search pickup — street, city, or airport (e.g. YYZ)"
            }
            iconName="navigate-outline"
          />
          {pickupLocationHint ? (
            <Text style={styles.pickupHint}>{pickupLocationHint}</Text>
          ) : null}

          {/* Dropoff Address */}
          <Text style={styles.inputLabel}>Dropoff Address</Text>
          <GooglePlacesAddressField
            value={dropoffAddress}
            onChangeText={setDropoffAddress}
            placeholder="Search destination"
            iconName="location-outline"
          />

          {/* Add Stop */}
          <TouchableOpacity 
            style={styles.addStopBtn} 
            onPress={() => setShowStopField(!showStopField)}
          >
            <Ionicons name={showStopField ? "remove-circle-outline" : "add-circle-outline"} size={20} color="#D4A04A" />
            <Text style={styles.addStopText}>{showStopField ? "Remove Stop" : "Add Stop"}</Text>
          </TouchableOpacity>
          {showStopField ? (
            <>
              <Text style={styles.inputLabel}>Stop</Text>
              <GooglePlacesAddressField
                value={stopAddress}
                onChangeText={setStopAddress}
                placeholder="Search stop location"
                iconName="flag-outline"
              />
            </>
          ) : null}

          {/* Pick-up Time */}
          <Text style={styles.inputLabel}>Pick-up Time</Text>
          <TouchableOpacity
            style={styles.inputWithIcon}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.85}
          >
            <Text style={[styles.inputField, { flex: 1 }]}>{pickupTimeDisplay}</Text>
            <Ionicons name="time-outline" size={18} color="#999" />
          </TouchableOpacity>

          {Platform.OS === "android" && showDatePicker ? (
            <DateTimePicker
              value={pickupAt}
              mode="datetime"
              display="default"
              minimumDate={new Date()}
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
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Text style={[styles.dateModalBtn, styles.dateModalDone]}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={pickupAt}
                    mode="datetime"
                    display="spinner"
                    minimumDate={new Date()}
                    themeVariant="light"
                    onChange={(_e, d) => {
                      if (d) setPickupAt(d);
                    }}
                    style={styles.iosPicker}
                  />
                </View>
              </View>
            </Modal>
          ) : null}
        </View>

        {/* Select Vehicle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Vehicle</Text>
          <Text style={styles.sectionSubtitle}>Choose your ride category</Text>

          <Text style={styles.inputLabel}>Select Car</Text>
          {fleetLoading ? (
            <View style={styles.fleetLoadingBox}>
              <ActivityIndicator size="small" color="#D4A04A" />
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
                style={styles.carSelector}
                onPress={() => vehicleTiers.length > 1 && setShowTierDropdown(!showTierDropdown)}
                disabled={vehicleTiers.length <= 1}
                activeOpacity={0.85}
              >
                <Image
                  source={{ uri: selectedTier.imageUrl }}
                  style={styles.carThumb}
                  resizeMode="contain"
                />
                <View style={styles.carSelectorCopy}>
                  <Text style={styles.carName} numberOfLines={2}>
                    {selectedTier.title}
                  </Text>
                  <Text style={styles.carCategory} numberOfLines={2}>
                    {selectedTier.subtitle}
                  </Text>
                </View>
                <View style={styles.carSelectorTrailing}>
                  {tierFareById[selectedTier.id] != null ? (
                    <Text style={styles.carPriceText} numberOfLines={1}>
                      ${tierFareById[selectedTier.id].toFixed(2)}
                    </Text>
                  ) : (
                    <Text style={styles.carPriceText} numberOfLines={1}>
                      {selectedTier.hourlyRate > 0
                        ? `From $${selectedTier.hourlyRate.toFixed(0)}`
                        : `$${selectedTier.pricePerKm.toFixed(2)}/km`}
                    </Text>
                  )}
                  {vehicleTiers.length > 1 ? (
                    <Ionicons
                      name={showTierDropdown ? "chevron-up" : "chevron-down"}
                      size={18}
                      color="#D4A04A"
                    />
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
                  {(["standard", "executive"] as const).map((group) => {
                    const groupTiers = vehicleTiers.filter((t) => t.group === group);
                    if (groupTiers.length === 0) return null;
                    return (
                      <View key={group}>
                        <Text style={styles.tierDropdownGroupLabel}>
                          {group === "executive" ? "Executive" : "Standard"}
                        </Text>
                        {groupTiers.map((tier, index) => {
                          const selected = selectedTierId === tier.id;
                          const tierFare = tierFareById[tier.id];
                          return (
                            <TouchableOpacity
                              key={tier.id}
                              style={[
                                styles.carDropdownItem,
                                selected && styles.carDropdownItemActive,
                                index < groupTiers.length - 1 && styles.carDropdownItemBorder,
                              ]}
                              onPress={() => {
                                setSelectedTierId(tier.id);
                                setShowTierDropdown(false);
                              }}
                            >
                              <Image
                                source={{ uri: tier.imageUrl }}
                                style={styles.carDropdownThumb}
                                resizeMode="contain"
                              />
                              <View style={styles.carDropdownCopy}>
                                <Text
                                  style={[
                                    styles.carDropdownName,
                                    selected && styles.carDropdownNameActive,
                                  ]}
                                  numberOfLines={2}
                                >
                                  {tier.title}
                                </Text>
                                <Text style={styles.tierDropdownSubtitle} numberOfLines={3}>
                                  {tier.subtitle}
                                </Text>
                              </View>
                              <View style={styles.carDropdownPriceCol}>
                                <Text style={styles.carDropdownPrice} numberOfLines={2}>
                                  {tierFare != null
                                    ? `$${tierFare.toFixed(2)}`
                                    : tier.hourlyRate > 0
                                      ? `From $${tier.hourlyRate.toFixed(0)}`
                                      : `$${tier.pricePerKm.toFixed(2)}/km`}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    );
                  })}
                </ScrollView>
              ) : null}
            </>
          ) : (
            <Text style={styles.fleetErrorText}>No vehicles available.</Text>
          )}

          {/* Passengers + Child Seat — rides only */}
          {!isParcel ? (
          <View style={styles.dualCounterRow}>
            <View style={styles.dualCounterCard}>
              <Text style={styles.dualCounterTitle}>Passengers</Text>
              <Text style={styles.dualCounterSub}>Guests</Text>
              <View style={styles.dualCounterControls}>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => setPassengersCount(Math.max(1, passengersCount - 1))}
                  hitSlop={6}
                >
                  <Ionicons name="remove" size={16} color="#1a1a1a" />
                </TouchableOpacity>
                <Text style={styles.dualCounterValue}>{passengersCount}</Text>
                <TouchableOpacity
                  style={[styles.counterBtn, styles.counterBtnAdd]}
                  onPress={() => setPassengersCount(Math.min(maxPassengers, passengersCount + 1))}
                  hitSlop={6}
                >
                  <Ionicons name="add" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.dualCounterDivider} />

            <View style={styles.dualCounterCard}>
              <Text style={styles.dualCounterTitle}>Child Seat</Text>
              <Text style={styles.dualCounterSub}>$25 each</Text>
              <View style={styles.dualCounterControls}>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => setChildSeatCount(Math.max(0, childSeatCount - 1))}
                  hitSlop={6}
                >
                  <Ionicons name="remove" size={16} color="#1a1a1a" />
                </TouchableOpacity>
                <Text style={styles.dualCounterValue}>{childSeatCount}</Text>
                <TouchableOpacity
                  style={[styles.counterBtn, styles.counterBtnAdd]}
                  onPress={() =>
                    setChildSeatCount(Math.min(passengersCount, childSeatCount + 1))
                  }
                  hitSlop={6}
                >
                  <Ionicons name="add" size={16} color="#fff" />
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
                  placeholderTextColor="#999"
                />
              </View>
              <Text style={styles.inputLabel}>Recipient Phone</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.textInput}
                  value={recipientPhone}
                  onChangeText={setRecipientPhone}
                  placeholder="Recipient phone number"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
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
                    placeholderTextColor="#999"
                    keyboardType="decimal-pad"
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
                  placeholderTextColor="#999"
                  multiline
                />
              </View>
            </View>
          )}
        </View>

        {/* Map Preview — static Google Map image of the booked route with labelled markers */}
        <View style={styles.mapContainer}>
          <View style={styles.mapImageWrap}>
            {routeSummary?.mapImageUrl ? (
              <Image
                source={{ uri: routeSummary.mapImageUrl }}
                style={styles.mapImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.mapPlaceholder}>
                <Ionicons name="map-outline" size={28} color="#94a3b8" />
                <Text style={styles.mapPlaceholderText}>
                  {pickupAddress.trim().length < 8 || dropoffAddress.trim().length < 8
                    ? "Enter pickup & drop-off to preview the route"
                    : routeLoading
                      ? "Calculating route…"
                      : routeError
                        ? "Route preview unavailable"
                        : "Route will appear here"}
                </Text>
              </View>
            )}
            {routeLoading && routeSummary?.mapImageUrl ? (
              <View style={styles.mapImageLoadingOverlay} pointerEvents="none">
                <ActivityIndicator size="small" color="#D4A04A" />
              </View>
            ) : null}
          </View>

          {/* A / B / (C) legend */}
          {routeSummary && routeSummary.pointCount >= 2 ? (
            <View style={styles.mapLegend}>
              <View style={styles.mapLegendItem}>
                <View style={styles.mapLegendDot}>
                  <Text style={styles.mapLegendDotText}>A</Text>
                </View>
                <Text style={styles.mapLegendLabel}>From</Text>
                <Text style={styles.mapLegendText} numberOfLines={1}>
                  {pickupAddress || "—"}
                </Text>
              </View>
              {routeSummary.pointCount >= 3 ? (
                <View style={styles.mapLegendItem}>
                  <View style={styles.mapLegendDot}>
                    <Text style={styles.mapLegendDotText}>B</Text>
                  </View>
                  <Text style={styles.mapLegendLabel}>Stop</Text>
                  <Text style={styles.mapLegendText} numberOfLines={1}>
                    {stopAddress || "—"}
                  </Text>
                </View>
              ) : null}
              <View style={styles.mapLegendItem}>
                <View style={styles.mapLegendDot}>
                  <Text style={styles.mapLegendDotText}>
                    {routeSummary.pointCount >= 3 ? "C" : "B"}
                  </Text>
                </View>
                <Text style={styles.mapLegendLabel}>To</Text>
                <Text style={styles.mapLegendText} numberOfLines={1}>
                  {dropoffAddress || "—"}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Distance & Duration */}
          <View style={styles.mapInfo}>
            <View style={styles.mapInfoItem}>
              <Text style={styles.mapInfoLabel}>Estimated Distance</Text>
              <Text style={styles.mapInfoValue}>{routeLoading ? "…" : routeSummary?.distanceText ?? "—"}</Text>
            </View>
            <View style={styles.mapInfoItem}>
              <Text style={styles.mapInfoLabel}>Estimated Duration</Text>
              <Text style={styles.mapInfoValue}>{routeLoading ? "…" : routeSummary?.durationText ?? "—"}</Text>
            </View>
          </View>

          {routeError ? (
            <Text style={styles.mapInfoError} numberOfLines={2}>
              {routeError}
            </Text>
          ) : (
            <Text style={styles.mapInfoFootnote}>
              Driving directions via Google · Typical time (not live traffic)
            </Text>
          )}
        </View>

        {/* Contact Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Info</Text>
          <Text style={styles.sectionSubtitle}>Your Details</Text>

          {/* Name Row */}
          <View style={styles.nameRow}>
            <View style={styles.nameField}>
              <Text style={styles.inputLabel}>First Name*</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.textInput}
                  value={firstName}
                  onChangeText={setFirstName}
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
                />
              </View>
            </View>
          </View>

          {/* Phone Number */}
          <Text style={styles.inputLabel}>Phone Number*</Text>
          <View style={styles.phoneInput}>
            <View style={styles.countryCode}>
              <View style={styles.flagIcon}>
                <Text>🇨🇦</Text>
              </View>
              <Ionicons name="chevron-down" size={14} color="#999" />
            </View>
            <TextInput
              style={styles.phoneField}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
            />
          </View>

          {/* Email */}
          <Text style={styles.inputLabel}>Email*</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.textInput}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={[styles.continueBtn, (fleetLoading || !selectedTier) && styles.continueBtnDisabled]} 
          activeOpacity={0.9}
          onPress={continueToConfirm}
          disabled={fleetLoading || !selectedTier}
        >
          <Text style={styles.continueBtnText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
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
    paddingVertical: 16,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  backText: {
    fontSize: 15,
    color: "#1a1a1a",
    marginLeft: 2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1a1a1a",
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
    backgroundColor: "#D4A04A",
    justifyContent: "center",
    alignItems: "center",
  },
  stepActiveText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },
  stepLine: {
    width: 180,
    height: 2,
    backgroundColor: "#e0e0e0",
  },
  stepInactive: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
  },
  stepInactiveText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#999",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#D4A04A",
    marginBottom: 16,
  },
  sectionSubtitleWhenWhere: {
    marginBottom: 4,
  },
  placesHint: {
    fontSize: 11,
    lineHeight: 15,
    color: "#64748b",
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#1a1a1a",
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
    color: "#D4A04A",
  },
  pickupHint: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 6,
    lineHeight: 15,
  },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e8e8e8",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "#fafafa",
  },
  placeholderText: {
    fontSize: 14,
    color: "#999",
  },
  selectedText: {
    fontSize: 14,
    color: "#1a1a1a",
    fontWeight: "500",
  },
  dropdownList: {
    borderWidth: 1,
    borderColor: "#e8e8e8",
    borderRadius: 10,
    marginTop: 6,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  dropdownItemActive: {
    backgroundColor: "#FFF8E7",
  },
  dropdownItemText: {
    fontSize: 14,
    color: "#1a1a1a",
  },
  dropdownItemTextActive: {
    color: "#D4A04A",
    fontWeight: "600",
  },
  inputWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e8e8e8",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fafafa",
    gap: 10,
  },
  inputField: {
    flex: 1,
    fontSize: 14,
    color: "#1a1a1a",
  },
  addStopBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
  addStopText: {
    fontSize: 13,
    color: "#D4A04A",
    fontWeight: "500",
  },
  mapContainer: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 24,
    backgroundColor: "#fff",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15,23,42,0.08)",
    shadowColor: "#0f172a",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  mapImageWrap: {
    width: "100%",
    height: 200,
    backgroundColor: "#eef2f7",
    overflow: "hidden",
  },
  mapImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#eef2f7",
  },
  mapImageLoadingOverlay: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(255,255,255,0.92)",
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0f172a",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  mapPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  mapPlaceholderText: {
    marginTop: 8,
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
    fontWeight: "500",
  },
  mapLegend: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(15,23,42,0.08)",
  },
  mapLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  mapLegendDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  mapLegendDotText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  mapLegendLabel: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "600",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    width: 38,
  },
  mapLegendText: {
    flex: 1,
    fontSize: 13,
    color: "#1a1a1a",
    fontWeight: "500",
  },
  mapInfo: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(15,23,42,0.08)",
  },
  mapInfoFootnote: {
    fontSize: 10,
    color: "#94a3b8",
    paddingHorizontal: 16,
    paddingBottom: 10,
    paddingTop: 2,
    lineHeight: 14,
  },
  mapInfoError: {
    fontSize: 11,
    color: "#b45309",
    paddingHorizontal: 16,
    paddingBottom: 10,
    paddingTop: 2,
    lineHeight: 15,
  },
  mapInfoItem: {
    flex: 1,
  },
  mapInfoLabel: {
    fontSize: 11,
    color: "#999",
    marginBottom: 2,
  },
  mapInfoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  tierList: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15,23,42,0.10)",
    backgroundColor: "#fff",
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
    color: "#94a3b8",
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
    backgroundColor: "#fff",
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
    color: "#0F172A",
    letterSpacing: 0.1,
  },
  tierTitleSelected: {
    color: "#8B6914",
  },
  tierSubtitle: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "500",
    color: "#64748b",
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
    color: "#0F172A",
  },
  tierFareSelected: {
    color: "#8B6914",
  },
  tierRate: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
  },
  tierCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  tierCheckSelected: {
    borderColor: "#C9A063",
    backgroundColor: "#C9A063",
  },
  carSelector: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "#e8e8e8",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#fafafa",
    gap: 10,
  },
  carThumb: {
    width: 56,
    height: 36,
    flexShrink: 0,
    marginTop: 2,
  },
  carSelectorCopy: {
    flex: 1,
    minWidth: 0,
    paddingRight: 4,
  },
  carSelectorTrailing: {
    flexShrink: 0,
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 4,
    minWidth: 72,
    maxWidth: 88,
    paddingTop: 2,
  },
  carName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1a1a1a",
    lineHeight: 17,
  },
  carCategory: {
    fontSize: 10,
    color: "#888",
    marginTop: 4,
    lineHeight: 14,
  },
  fleetLoadingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    borderRadius: 10,
    backgroundColor: "#fafafa",
  },
  fleetLoadingText: {
    fontSize: 14,
    color: "#666",
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
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
  },
  fleetRetryText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  carPriceText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#D4A04A",
    textAlign: "right",
  },
  carDropdownList: {
    borderWidth: 1,
    borderColor: "#e8e8e8",
    borderRadius: 12,
    marginTop: 6,
    backgroundColor: "#2a2a2a",
    maxHeight: 360,
  },
  tierDropdownGroupLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.45)",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
  },
  tierDropdownSubtitle: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: "500",
    color: "rgba(255,255,255,0.55)",
    lineHeight: 14,
  },
  carDropdownItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 10,
  },
  carDropdownItemActive: {
    backgroundColor: "#3a3a3a",
  },
  carDropdownItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  carDropdownThumb: {
    width: 56,
    height: 36,
    flexShrink: 0,
  },
  carDropdownCopy: {
    flex: 1,
    minWidth: 0,
  },
  carDropdownName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
    lineHeight: 17,
  },
  carDropdownNameActive: {
    color: "#D4A04A",
    fontWeight: "700",
  },
  carDropdownPriceCol: {
    flexShrink: 0,
    width: 76,
    alignItems: "flex-end",
    justifyContent: "flex-start",
    paddingTop: 2,
  },
  carDropdownPrice: {
    fontSize: 12,
    fontWeight: "700",
    color: "#D4A04A",
    textAlign: "right",
    lineHeight: 16,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  toggleSubtitle: {
    fontSize: 12,
    color: "#999",
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
    borderColor: "#e8e8e8",
    borderRadius: 14,
    backgroundColor: "#fafafa",
    overflow: "hidden",
  },
  dualCounterCard: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  dualCounterDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: "#e2e8f0",
    alignSelf: "stretch",
  },
  dualCounterTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: 0.2,
  },
  dualCounterSub: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "500",
    marginTop: 2,
    marginBottom: 10,
  },
  dualCounterControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dualCounterValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
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
    borderColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  counterBtnAdd: {
    backgroundColor: "#1a1a1a",
    borderColor: "#1a1a1a",
  },
  counterValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
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
    borderColor: "#e8e8e8",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fafafa",
  },
  textInput: {
    fontSize: 14,
    color: "#1a1a1a",
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
    color: "#8B6914",
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
    borderColor: "#e8e8e8",
    backgroundColor: "#f3f3f3",
    alignItems: "center",
    justifyContent: "center",
  },
  weightUnitText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748b",
    letterSpacing: 0.3,
  },
  weightHint: {
    fontSize: 11,
    color: "#94a3b8",
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
    borderColor: "#e8e8e8",
    borderRadius: 10,
    backgroundColor: "#fafafa",
    overflow: "hidden",
  },
  countryCode: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRightWidth: 1,
    borderRightColor: "#e8e8e8",
    gap: 4,
  },
  flagIcon: {
    width: 22,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  phoneField: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1a1a1a",
  },
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    ...Platform.select({
      ios: {
        paddingBottom: 30,
      },
    }),
  },
  continueBtn: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  continueBtnDisabled: {
    opacity: 0.45,
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
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
    backgroundColor: "#fff",
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
    borderBottomColor: "#eee",
  },
  dateModalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  dateModalBtn: {
    fontSize: 16,
    color: "#666",
  },
  dateModalDone: {
    color: "#D4A04A",
    fontWeight: "700",
  },
  iosPicker: {
    height: 216,
    alignSelf: "stretch",
  },
});
