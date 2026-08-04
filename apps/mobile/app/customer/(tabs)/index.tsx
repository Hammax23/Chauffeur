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
  Modal,
  Keyboard,
  useWindowDimensions,
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
  getAppFleetVehicles,
  type AppFleetVehicleDto,
} from "../../../services/api";
import { useReservationStream } from "../../../hooks/useReservationStream";
import { SlimSpinner } from "../../../components/SlimSpinner";
import { GooglePlacesAddressField } from "../../../components/GooglePlacesAddressField";
import { GOLD } from "../../../theme/driver-theme";
import { isParcelServiceType } from "../../../utils/parcel";

const ACCENT = GOLD;
const ACCENT_DARK = "#A87830";
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

export default function CustomerHomeScreen() {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useCustomerTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const mapRef = useRef<MapView | null>(null);
  const fadeAnim = useMemo(() => new Animated.Value(0), []);
  const slideAnim = useMemo(() => new Animated.Value(24), []);
  const livePulse = useRef(new Animated.Value(0.45)).current;

  const layout = useMemo(() => {
    const isCompact = windowWidth < 375;
    const isShort = windowHeight < 700;
    const isTablet = windowWidth >= 768;
    const mapTopRatio = isShort ? 0.3 : isTablet ? 0.42 : 0.38;
    const sheetTop = windowHeight * mapTopRatio;
    const padH = isCompact ? 12 : isTablet ? 24 : 16;
    const fabSize = isCompact ? 40 : 44;
    const pickupMinH = isCompact ? 50 : 56;
    const titleSize = isCompact ? 20 : 22;
    const fleetCardW = Math.min(windowWidth * (isTablet ? 0.28 : 0.42), isTablet ? 220 : 180);
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
      fleetCardW,
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
  const [tripEditorOpen, setTripEditorOpen] = useState(false);
  const [tripEditorFocus, setTripEditorFocus] = useState<"pickup" | "dropoff">("pickup");
  const [pickupDraft, setPickupDraft] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [dropoffDraft, setDropoffDraft] = useState("");
  const [dropoffFocusKey, setDropoffFocusKey] = useState(0);
  const [locating, setLocating] = useState(true);
  const [locationDenied, setLocationDenied] = useState(false);
  const [activeRide, setActiveRide] = useState<Reservation | null>(null);
  const [activeRideCount, setActiveRideCount] = useState(0);
  const [fleetPreview, setFleetPreview] = useState<AppFleetVehicleDto[]>([]);
  const [fleetLoading, setFleetLoading] = useState(true);

  const fullName = displayFullName(user?.firstName, user?.lastName);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 480, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    if (!tripEditorOpen) {
      setKeyboardHeight(0);
      return;
    }
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const onShow = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const onHide = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, [tripEditorOpen]);

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

  const loadFleetPreview = useCallback(async () => {
    setFleetLoading(true);
    try {
      const { vehicles } = await getAppFleetVehicles({ homeOnly: true });
      setFleetPreview(vehicles.slice(0, 8));
    } catch (e) {
      if (__DEV__) {
        console.warn("[home] fleet preview failed:", e instanceof Error ? e.message : e);
      }
      setFleetPreview([]);
    } finally {
      setFleetLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void resolveLocationIfNeeded();
      void loadFleetPreview();
      (async () => {
        try {
          const data = await getReservations();
          if (data.success) {
            const actives = data.reservations.filter((r) => ACTIVE_TRIP_STATUSES.has(r.status));
            setActiveRideCount(actives.length);
            setActiveRide(actives[0] || null);
          }
        } catch {
          setActiveRide(null);
        }
      })();
    }, [resolveLocationIfNeeded, loadFleetPreview])
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

  const openTripEditor = useCallback(
    (focus: "pickup" | "dropoff" = "pickup") => {
      setPickupDraft(
        pickupAddress ||
          (pickupLabel !== "Finding your location…" &&
          pickupLabel !== "Enable location for pickup" &&
          pickupLabel !== "Couldn’t detect location"
            ? pickupLabel
            : "")
      );
      setDropoffDraft("");
      setTripEditorFocus(focus);
      if (focus === "dropoff") setDropoffFocusKey((k) => k + 1);
      setTripEditorOpen(true);
    },
    [pickupAddress, pickupLabel]
  );

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

  const continueToBooking = useCallback(
    (dropoff: string, dropCoords?: { lat?: number; lng?: number }) => {
      const params = bookingParams({ dropoff: dropoff.trim() });
      if (dropCoords?.lat != null && dropCoords?.lng != null) {
        params.dropoffLat = String(dropCoords.lat);
        params.dropoffLng = String(dropCoords.lng);
      }
      setTripEditorOpen(false);
      router.push({ pathname: "/customer/create-reservation", params });
    },
    [bookingParams]
  );

  const openRide = useCallback(() => openTripEditor("dropoff"), [openTripEditor]);
  const openParcel = useCallback(
    () =>
      router.push({
        pathname: "/customer/create-reservation",
        params: bookingParams({ prefill: "parcel" }),
      }),
    [bookingParams]
  );

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

  const sheetPadBottom = (Platform.OS === "ios" ? 88 : 72) + insets.bottom;
  // Cap sheet so title/close never slide under the status bar when keyboard opens.
  const tripSheetTopGap = Math.max(insets.top, 12) + 8;
  const tripSheetMaxHeight = Math.max(
    280,
    windowHeight - tripSheetTopGap - keyboardHeight
  );
  const tripSheetHeaderBlock = layout.isCompact ? 78 : 88;
  const tripScrollMaxHeight = Math.max(
    160,
    tripSheetMaxHeight - tripSheetHeaderBlock - (keyboardHeight > 0 ? 12 : Math.max(insets.bottom, 12))
  );
  const placesPanelMaxHeight = Math.max(
    100,
    Math.min(
      layout.isShort || keyboardHeight > 0 ? 140 : 220,
      windowHeight * (keyboardHeight > 0 ? 0.18 : layout.isShort ? 0.22 : 0.28)
    )
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
        colors={["transparent", "rgba(255,255,255,0.35)", "rgba(248,246,242,0.95)"]}
        locations={[0, 0.55, 1]}
        style={[styles.mapFade, { top: layout.sheetTop - 70, height: 90 }]}
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

          <Pressable
            onPress={() => openTripEditor("pickup")}
            style={({ pressed }) => [
              styles.pickupChip,
              {
                minHeight: layout.pickupMinH,
                paddingVertical: layout.isCompact ? 10 : 12,
                paddingHorizontal: layout.isCompact ? 10 : 14,
              },
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.pickupDotWrap}>
              <View style={styles.pickupDot} />
            </View>
            <View style={styles.pickupCopy}>
              <Text style={styles.pickupEyebrow}>Pickup</Text>
              <Text
                style={[styles.pickupLabel, layout.isCompact && { fontSize: 14 }]}
                numberOfLines={1}
              >
                {pickupLabel}
              </Text>
            </View>
            {locating ? (
              <ActivityIndicator size="small" color={ACCENT} />
            ) : (
              <Ionicons name="chevron-down" size={18} color="#64748b" />
            )}
          </Pressable>

          <Pressable
            onPress={toggleTheme}
            style={({ pressed }) => [
              styles.fab,
              { width: layout.fabSize, height: layout.fabSize, borderRadius: layout.fabSize / 2 },
              pressed && styles.pressed,
            ]}
            accessibilityLabel={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            <Ionicons
              name={isDark ? "sunny-outline" : "moon-outline"}
              size={layout.isCompact ? 18 : 20}
              color="#1C1C1E"
            />
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

      {/* Recenter FAB — sits above sheet */}
      <Pressable
        onPress={recenter}
        style={[
          styles.recenterFab,
          {
            bottom: windowHeight - layout.sheetTop + 18,
            right: layout.padH,
          },
        ]}
      >
        <Ionicons name="navigate" size={18} color="#1C1C1E" />
      </Pressable>

      {/* Bottom sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            top: layout.sheetTop,
            left: layout.isTablet ? (windowWidth - Math.min(windowWidth, 560)) / 2 : 0,
            right: layout.isTablet ? (windowWidth - Math.min(windowWidth, 560)) / 2 : 0,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            backgroundColor: isDark ? "#141210" : "#F8F6F2",
          },
        ]}
      >
        <View style={styles.sheetHandleWrap}>
          <View style={[styles.sheetHandle, { backgroundColor: isDark ? "#3A3530" : "#D6D0C6" }]} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.sheetContent,
            {
              paddingBottom: sheetPadBottom,
              paddingHorizontal: layout.sheetContentPad,
            },
          ]}
          bounces
        >
          <View style={styles.greetingRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.brandMark, { color: ACCENT }]}>SARJ WORLDWIDE</Text>
              <Text
                style={[
                  styles.greeting,
                  { color: isDark ? "#F5F5F7" : "#1C1C1E", fontSize: layout.isCompact ? 16 : 18 },
                ]}
                numberOfLines={1}
              >
                {greetingLine(fullName)}
              </Text>
            </View>
            <Pressable
              onPress={() => router.push("/customer/reservations")}
              style={({ pressed }) => [
                styles.bookingsPill,
                {
                  backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#FFF",
                  borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)",
                },
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="calendar-outline" size={15} color={ACCENT} />
              <Text style={[styles.bookingsPillText, { color: isDark ? "#F5F5F7" : "#1C1C1E" }]}>
                Bookings
              </Text>
            </Pressable>
          </View>

          {/* Live trip */}
          {activeRide ? (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/customer/track-ride",
                  params: { bookingId: activeRide.bookingId },
                })
              }
              style={({ pressed }) => [styles.liveCard, pressed && styles.pressed]}
            >
              <View style={styles.liveTop}>
                <View style={styles.liveDotWrap}>
                  <Animated.View style={[styles.liveDotHalo, { opacity: livePulse }]} />
                  <View style={styles.liveDot} />
                </View>
                <Text style={styles.liveEyebrow}>LIVE TRIP</Text>
                <View style={styles.liveChip}>
                  <Text style={styles.liveChipText}>{friendlyStatus(activeRide.status)}</Text>
                </View>
              </View>
              <Text style={styles.liveRoute} numberOfLines={1}>
                {formatPlaceShort(activeRide.pickupLocation)} →{" "}
                {formatPlaceShort(activeRide.dropoffLocation)}
              </Text>
              <Text style={styles.liveMeta}>
                {activeRide.bookingId}
                {activeRideCount > 1 ? ` · +${activeRideCount - 1} more` : ""}
                {isParcelServiceType(activeRide.serviceType) ? " · Parcel" : ""}
              </Text>
            </Pressable>
          ) : null}

          {/* Service tiles — Ride primary, Parcel secondary */}
          <View style={[styles.serviceGrid, layout.isCompact && { gap: 8 }]}>
            <Pressable
              onPress={openRide}
              style={({ pressed }) => [
                styles.rideTile,
                layout.isCompact && { minHeight: 132, padding: 12 },
                pressed && styles.pressed,
              ]}
            >
              <LinearGradient
                colors={["#1C1710", "#0E0C0A"]}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.rideIcon}>
                <Ionicons name="car-sport" size={22} color={ACCENT} />
              </View>
              <Text style={[styles.rideTitle, layout.isCompact && { fontSize: 15 }]}>
                Book a Ride
              </Text>
              <Text style={styles.rideSub} numberOfLines={1}>
                Airport · hourly · city
              </Text>
              <View style={styles.rideCta}>
                <Text style={styles.rideCtaText}>Reserve</Text>
                <Ionicons name="arrow-forward" size={14} color="#1A1208" />
              </View>
            </Pressable>

            <Pressable
              onPress={openParcel}
              style={({ pressed }) => [
                styles.parcelTile,
                {
                  backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#FFF",
                  borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
                },
                layout.isCompact && { minHeight: 132, padding: 12 },
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.parcelIcon}>
                <Ionicons name="cube-outline" size={20} color={ACCENT} />
              </View>
              <Text
                style={[
                  styles.parcelTitle,
                  { color: isDark ? "#F5F5F7" : "#1C1C1E" },
                  layout.isCompact && { fontSize: 14 },
                ]}
                numberOfLines={2}
              >
                Send a Parcel
              </Text>
              <Text
                style={[styles.parcelSub, { color: isDark ? "#A1A1AA" : "#64748b" }]}
                numberOfLines={2}
              >
                Same-day chauffeur delivery
              </Text>
            </Pressable>
          </View>

          {/* Where to */}
          <Pressable
            onPress={openRide}
            style={({ pressed }) => [
              styles.whereBar,
              {
                backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "#FFF",
                borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
              },
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="search" size={18} color={ACCENT} />
            <Text style={[styles.wherePlaceholder, { color: isDark ? "#A1A1AA" : "#94a3b8" }]}>
              Where to?
            </Text>
            <View style={styles.whereNow}>
              <Text style={styles.whereNowText}>Now</Text>
            </View>
          </Pressable>

          {/* Fleet strip */}
          <View style={styles.fleetHeader}>
            <Text style={[styles.fleetTitle, { color: isDark ? "#F5F5F7" : "#1C1C1E" }]}>
              Premium fleet
            </Text>
            <Pressable onPress={openRide} hitSlop={10}>
              <Text style={styles.fleetLink}>Book</Text>
            </Pressable>
          </View>

          {fleetLoading ? (
            <View style={styles.fleetLoading}>
              <SlimSpinner size={24} stroke={2} color={ACCENT} />
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.fleetScroll}
            >
              {fleetPreview.map((v) => (
                <Pressable
                  key={v.id}
                  onPress={() =>
                    router.push({
                      pathname: "/customer/create-reservation",
                      params: bookingParams({ vehicleId: v.id }),
                    })
                  }
                  style={({ pressed }) => [
                    styles.fleetCard,
                    { width: layout.fleetCardW },
                    pressed && styles.pressed,
                  ]}
                >
                  <Image source={{ uri: v.imageUrl }} style={styles.fleetImage} resizeMode="contain" />
                  <Text style={styles.fleetName} numberOfLines={1}>
                    {v.title}
                  </Text>
                  <Text style={styles.fleetPrice}>
                    {v.hourlyRate > 0
                      ? `$${v.hourlyRate.toFixed(0)} base`
                      : `$${v.pricePerKm.toFixed(2)}/km`}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </ScrollView>
      </Animated.View>

      {/* Pickup + Where to — responsive trip editor */}
      <Modal
        visible={tripEditorOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setTripEditorOpen(false)}
        statusBarTranslucent
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => {
              Keyboard.dismiss();
              setTripEditorOpen(false);
            }}
            accessibilityLabel="Close"
          />
          <View
            style={[
              styles.modalAvoid,
              layout.isTablet && { maxWidth: 560, alignSelf: "center", width: "100%" },
              {
                marginBottom: keyboardHeight,
                maxHeight: tripSheetMaxHeight,
              },
            ]}
          >
            <View
              style={[
                styles.modalSheet,
                {
                  maxHeight: tripSheetMaxHeight,
                  paddingBottom:
                    keyboardHeight > 0 ? 12 : Math.max(insets.bottom, 16),
                  paddingHorizontal: layout.isCompact ? 14 : 18,
                },
              ]}
            >
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text
                  style={[styles.modalTitle, { fontSize: layout.titleSize }]}
                  numberOfLines={1}
                >
                  Plan your ride
                </Text>
                <Pressable
                  onPress={() => {
                    Keyboard.dismiss();
                    setTripEditorOpen(false);
                  }}
                  hitSlop={12}
                  style={styles.modalCloseBtn}
                >
                  <Ionicons name="close" size={22} color="#1C1C1E" />
                </Pressable>
              </View>

              <ScrollView
                style={[styles.modalScroll, { maxHeight: tripScrollMaxHeight }]}
                contentContainerStyle={styles.modalScrollContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={false}
                bounces={false}
                nestedScrollEnabled
              >
                <View
                  style={[
                    styles.routeCard,
                    layout.isCompact && { paddingHorizontal: 12, paddingVertical: 12, gap: 10 },
                  ]}
                >
                  <View style={styles.routeRail} pointerEvents="none">
                    <View style={styles.routePickupDot} />
                    <View style={styles.routeLine} />
                    <View style={styles.routeDropDot} />
                  </View>
                  <View style={styles.routeFields}>
                    <View
                      style={[
                        styles.routeFieldBlock,
                        tripEditorFocus === "pickup" && styles.routeFieldBlockActive,
                      ]}
                    >
                      <Text style={styles.routeFieldLabel}>Pickup</Text>
                      <GooglePlacesAddressField
                        value={pickupDraft}
                        onChangeText={setPickupDraft}
                        placeholder="Current location"
                        iconName="locate-outline"
                        autoFocus={tripEditorFocus === "pickup"}
                        maxPanelHeight={placesPanelMaxHeight}
                        onPlaceResolved={(place) => {
                          if (place.lat != null && place.lng != null) {
                            void applyLocation(place.lat, place.lng, {
                              manual: true,
                              label: place.address,
                            });
                          } else {
                            setPickupManual(true);
                            setPickupLabel(place.address);
                            setPickupAddress(place.address);
                          }
                          setPickupDraft(place.address);
                          setTripEditorFocus("dropoff");
                          setDropoffFocusKey((k) => k + 1);
                        }}
                      />
                    </View>

                    <View style={styles.routeDivider} />

                    <View
                      style={[
                        styles.routeFieldBlock,
                        tripEditorFocus === "dropoff" && styles.routeFieldBlockActive,
                      ]}
                    >
                      <Text style={styles.routeFieldLabel}>Drop-off</Text>
                      <GooglePlacesAddressField
                        key={`dropoff-${dropoffFocusKey}`}
                        value={dropoffDraft}
                        onChangeText={setDropoffDraft}
                        placeholder="Where to?"
                        iconName="search-outline"
                        autoFocus={tripEditorFocus === "dropoff"}
                        maxPanelHeight={placesPanelMaxHeight}
                        onPlaceResolved={(place) => {
                          setDropoffDraft(place.address);
                          continueToBooking(place.address, {
                            lat: place.lat,
                            lng: place.lng,
                          });
                        }}
                      />
                    </View>
                  </View>
                </View>

                <Pressable
                  onPress={async () => {
                    const label = await resolveLocation();
                    if (label) setPickupDraft(label);
                    setTripEditorFocus("dropoff");
                    setDropoffFocusKey((k) => k + 1);
                  }}
                  style={({ pressed }) => [
                    styles.useGpsBtn,
                    layout.isCompact && { paddingVertical: 12 },
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.useGpsIcon}>
                    <Ionicons name="navigate" size={18} color="#1C1C1E" />
                  </View>
                  <Text
                    style={[styles.useGpsText, layout.isCompact && { fontSize: 15 }]}
                    numberOfLines={1}
                  >
                    Use current location
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </View>
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
    backgroundColor: "rgba(34,197,94,0.12)",
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
    fontSize: 12,
    fontWeight: "500",
    color: "#64748b",
    marginBottom: 2,
  },
  pickupLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1C1C1E",
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
  recenterFab: {
    position: "absolute",
    zIndex: 15,
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
    bottom: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.14,
        shadowRadius: 18,
      },
      android: { elevation: 12 },
    }),
  },
  sheetHandleWrap: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 4,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  sheetContent: {
    paddingTop: 6,
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
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
  liveCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    backgroundColor: "#0F1A12",
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
    fontSize: 11,
    fontWeight: "800",
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 1.1,
  },
  liveChip: {
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
  serviceGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  rideTile: {
    flex: 1.15,
    minWidth: 0,
    minHeight: 148,
    borderRadius: 20,
    overflow: "hidden",
    padding: 14,
    justifyContent: "space-between",
  },
  rideIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(212,160,74,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  rideTitle: {
    marginTop: 12,
    fontSize: 17,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: -0.3,
  },
  rideSub: {
    marginTop: 4,
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    marginBottom: 12,
  },
  rideCta: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: ACCENT,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  rideCtaText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1A1208",
  },
  parcelTile: {
    flex: 0.95,
    minWidth: 0,
    minHeight: 148,
    borderRadius: 20,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "flex-start",
  },
  parcelIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(212,160,74,0.14)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  parcelTitle: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  parcelSub: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 16,
  },
  whereBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 18,
  },
  wherePlaceholder: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
  },
  whereNow: {
    backgroundColor: "rgba(212,160,74,0.16)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  whereNowText: {
    fontSize: 12,
    fontWeight: "800",
    color: ACCENT_DARK,
  },
  fleetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  fleetTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  fleetLink: {
    fontSize: 13,
    fontWeight: "700",
    color: ACCENT,
  },
  fleetLoading: {
    paddingVertical: 28,
    alignItems: "center",
  },
  fleetScroll: {
    paddingRight: 8,
    gap: 10,
  },
  fleetCard: {
    backgroundColor: "#F4F0EA",
    borderRadius: 16,
    padding: 10,
    marginRight: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.06)",
  },
  fleetImage: {
    width: "100%",
    height: 72,
    marginBottom: 8,
  },
  fleetName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1C1C1E",
  },
  fleetPrice: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "700",
    color: ACCENT_DARK,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalAvoid: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    width: "100%",
    zIndex: 2,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.12,
        shadowRadius: 18,
      },
      android: { elevation: 16 },
    }),
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalScrollContent: {
    paddingBottom: 12,
    flexGrow: 1,
  },
  modalHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#D1D5DB",
    marginBottom: 14,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 12,
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  modalTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 22,
    fontWeight: "700",
    color: "#1C1C1E",
    letterSpacing: -0.4,
  },
  routeCard: {
    flexDirection: "row",
    gap: 14,
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 16,
    marginBottom: 12,
  },
  routeRail: {
    width: 16,
    alignItems: "center",
    paddingTop: 30,
    paddingBottom: 14,
  },
  routePickupDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#22C55E",
  },
  routeLine: {
    flex: 1,
    width: 2,
    backgroundColor: "#D1D5DB",
    marginVertical: 8,
    minHeight: 36,
  },
  routeDropDot: {
    width: 12,
    height: 12,
    borderRadius: 3,
    backgroundColor: "#1C1C1E",
  },
  routeFields: {
    flex: 1,
    minWidth: 0,
  },
  routeFieldBlock: {
    zIndex: 1,
  },
  routeFieldBlockActive: {
    zIndex: 50,
  },
  routeFieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 8,
  },
  routeDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#D1D5DB",
    marginVertical: 14,
  },
  useGpsBtn: {
    marginTop: 4,
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "#F9FAFB",
  },
  useGpsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  useGpsText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
  },
});
