import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Image,
  Switch,
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
import { useAuth } from "../../contexts/AuthContext";
import { GooglePlacesAddressField } from "../../components/GooglePlacesAddressField";
import { fetchDirectionsSummary } from "../../services/places";
import { getFleetVehicles, type FleetVehicleDto } from "../../services/api";
import {
  buildVehicleTierOptions,
  findTierById,
  resolveTierIdFromFleetVehicleId,
  type VehicleTierOption,
} from "../../data/vehicle-tiers";

/** Values align with web / admin custom reservation */
const serviceTypes = [
  { id: "1", value: "Airport Transfer pick-up/drop-off", label: "Airport Transfer" },
  { id: "2", value: "Hourly ride", label: "Hourly Chauffeur" },
  { id: "3", value: "Point-to-Point transportation", label: "Point-to-Point" },
];

function defaultPickupDate(): Date {
  const d = new Date();
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
  return d;
}

const SERVICE_PREFILL_MAP: Record<string, string> = {
  airport: "Airport Transfer pick-up/drop-off",
  hourly: "Hourly ride",
  point: "Point-to-Point transportation",
  corporate: "Point-to-Point transportation",
  events: "Hourly ride",
};

export default function CreateReservationScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    prefill?: string | string[];
    vehicleId?: string | string[];
  }>();
  // Ensures we only honour a `vehicleId` param once — after the user has
  // possibly changed the selection, navigating back here shouldn't yank it
  // back to whatever the URL says.
  const consumedVehicleParamRef = useRef(false);
  const [serviceType, setServiceType] = useState("");
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [stopAddress, setStopAddress] = useState("");
  const [showStopField, setShowStopField] = useState(false);
  const [pickupAt, setPickupAt] = useState<Date>(defaultPickupDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [passengersCount, setPassengersCount] = useState(1);
  const [fleetVehicles, setFleetVehicles] = useState<FleetVehicleDto[]>([]);
  const [fleetLoading, setFleetLoading] = useState(true);
  const [fleetError, setFleetError] = useState("");
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [showTierDropdown, setShowTierDropdown] = useState(false);

  const vehicleTiers = useMemo(
    () => buildVehicleTierOptions(fleetVehicles),
    [fleetVehicles]
  );

  const selectedTier = useMemo(
    () => (selectedTierId ? findTierById(vehicleTiers, selectedTierId) : null),
    [vehicleTiers, selectedTierId]
  );
  const [tollRoute, setTollRoute] = useState(true);
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

  const loadFleet = useCallback(async () => {
    setFleetLoading(true);
    setFleetError("");
    try {
      const { vehicles } = await getFleetVehicles();
      setFleetVehicles(vehicles);
      const tiers = buildVehicleTierOptions(vehicles);

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

    if (pickup.length < 8 || dropoff.length < 8) {
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
            origin: pickup,
            destination: dropoff,
            waypoint,
            avoidTolls: !tollRoute,
            mapWidth: 800,
            mapHeight: 460,
          },
          ac.signal
        );
        if (!cancelled) {
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
  }, [pickupAddress, dropoffAddress, stopAddress, showStopField, tollRoute]);

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
   * Live fare estimate.
   *
   *   ride fare = distanceKm * pricePerKm     (full decimal precision — e.g. 1.7 km × $3.05/km)
   *   subtotal  = ride fare + stop charge + child seat charge
   *   HST       = 13% × subtotal
   *   Gratuity  = 15% × subtotal
   *   total     = subtotal + HST + gratuity
   *
   * Returns null until we have both a route distance and a selected vehicle —
   * UI then shows "—" placeholders.
   */
  const fareEstimate = useMemo(() => {
    if (!selectedTier) return null;
    const meters = routeSummary?.distanceMeters ?? null;
    if (meters == null || meters <= 0) return null;
    const km = meters / 1000;
    const pricePerKm = Math.max(0, selectedTier.pricePerKm);
    const rideFare = km * pricePerKm;
    const stopCharge = showStopField && stopAddress.trim().length >= 3 ? 15 : 0;
    const childSeatCharge = childSeatCount * 25;
    const subtotal = rideFare + stopCharge + childSeatCharge;
    const hst = subtotal * 0.13;
    const gratuity = subtotal * 0.15;
    const total = subtotal + hst + gratuity;
    return { km, pricePerKm, rideFare, stopCharge, childSeatCharge, subtotal, hst, gratuity, total };
  }, [selectedTier, routeSummary, showStopField, stopAddress, childSeatCount]);

  /** Per-tier ride fare for the list (Uber-style price on the right). */
  const tierFareById = useMemo(() => {
    const meters = routeSummary?.distanceMeters ?? null;
    if (meters == null || meters <= 0) return {} as Record<string, number>;
    const km = meters / 1000;
    const out: Record<string, number> = {};
    for (const tier of vehicleTiers) {
      out[tier.id] = km * tier.pricePerKm;
    }
    return out;
  }, [vehicleTiers, routeSummary?.distanceMeters]);

  const onDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (event.type === "dismissed") {
      return;
    }
    if (date) setPickupAt(date);
  };

  const continueToConfirm = () => {
    if (!serviceType.trim()) {
      Alert.alert("Missing info", "Please select a service type.");
      return;
    }
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
    router.push({
      pathname: "/customer/reservation-confirm",
      params: {
        serviceType,
        pickupAddress,
        dropoffAddress,
        stopAddress: showStopField ? stopAddress : "",
        serviceDate: serviceDateStr,
        serviceTime: serviceTimeStr,
        pickupTimeDisplay,
        passengers: String(passengersCount),
        vehicle: selectedTier.title,
        vehicleId: selectedTier.id,
        vehicleSubtitle: selectedTier.subtitle,
        vehiclePrice: `$${selectedTier.pricePerKm.toFixed(2)}/km`,
        rideFare: String(fareEstimate?.rideFare ?? 0),
        pricePerKm: String(selectedTier.pricePerKm),
        hourlyRate: String(selectedTier.hourlyRate),
        distanceText: routeSummary?.distanceText ?? "",
        durationText: routeSummary?.durationText ?? "",
        distanceMeters: String(routeSummary?.distanceMeters ?? ""),
        durationSeconds: String(routeSummary?.durationSeconds ?? ""),
        tollRoute: tollRoute ? "Yes" : "No",
        childSeatCount: String(childSeatCount),
        firstName,
        lastName,
        phoneNumber,
        email,
      },
    });
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
          <Text style={styles.headerTitle}>Create Reservation</Text>
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
          <Text style={styles.sectionTitle}>Ride Details</Text>
          <Text style={[styles.sectionSubtitle, styles.sectionSubtitleWhenWhere]}>When & Where</Text>
         

          {/* Service Type */}
          <Text style={styles.inputLabel}>Service Type</Text>
          <TouchableOpacity 
            style={styles.dropdown} 
            onPress={() => setShowServiceDropdown(!showServiceDropdown)}
          >
            <Text style={serviceType ? styles.selectedText : styles.placeholderText}>
              {serviceTypes.find((s) => s.value === serviceType)?.label || "Select Service"}
            </Text>
            <Ionicons name={showServiceDropdown ? "chevron-up" : "chevron-down"} size={20} color="#999" />
          </TouchableOpacity>
          {showServiceDropdown && (
            <View style={styles.dropdownList}>
              {serviceTypes.map((service) => (
                <TouchableOpacity
                  key={service.id}
                  style={[
                    styles.dropdownItem,
                    serviceType === service.value && styles.dropdownItemActive,
                  ]}
                  onPress={() => {
                    setServiceType(service.value);
                    setShowServiceDropdown(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownItemText,
                    serviceType === service.value && styles.dropdownItemTextActive,
                  ]}>
                    {service.label}
                  </Text>
                  {serviceType === service.value && (
                    <Ionicons name="checkmark" size={18} color="#D4A04A" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Pickup Address */}
          <Text style={styles.inputLabel}>Pickup Address</Text>
          <GooglePlacesAddressField
            value={pickupAddress}
            onChangeText={setPickupAddress}
            placeholder="Search pickup — street, city, or airport (e.g. YYZ)"
            iconName="navigate-outline"
          />

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

          {/* Passengers */}
          <View style={[styles.counterRow, { marginTop: 4 }]}>
            <View>
              <Text style={styles.toggleTitle}>Passengers</Text>
              <Text style={styles.toggleSubtitle}>Number of passengers</Text>
            </View>
            <View style={styles.counter}>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => setPassengersCount(Math.max(1, passengersCount - 1))}
              >
                <Ionicons name="remove" size={18} color="#1a1a1a" />
              </TouchableOpacity>
              <Text style={styles.counterValue}>{passengersCount}</Text>
              <TouchableOpacity
                style={[styles.counterBtn, styles.counterBtnAdd]}
                onPress={() => setPassengersCount(Math.min(50, passengersCount + 1))}
              >
                <Ionicons name="add" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
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

          {/* Live fare estimate — pricePerKm × full-decimal distance */}
          {selectedTier ? (
            <View style={styles.fareEstimate}>
              <View style={styles.fareEstimateRow}>
                <Text style={styles.fareEstimateLabel}>Ride fare</Text>
                <Text style={styles.fareEstimateMeta}>
                  {fareEstimate
                    ? `${fareEstimate.km.toFixed(2)} km × $${fareEstimate.pricePerKm.toFixed(2)}/km`
                    : "Awaiting route…"}
                </Text>
                <Text style={styles.fareEstimateValue}>
                  {fareEstimate ? `$${fareEstimate.rideFare.toFixed(2)}` : "—"}
                </Text>
              </View>
              <View style={styles.fareEstimateTotalRow}>
                <Text style={styles.fareEstimateTotalLabel}>Estimated total</Text>
                <Text style={styles.fareEstimateHint}>incl. HST 13% + Gratuity 15%</Text>
                <Text style={styles.fareEstimateTotalValue}>
                  {fareEstimate ? `$${fareEstimate.total.toFixed(2)}` : "—"}
                </Text>
              </View>
            </View>
          ) : null}

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

        {/* Select Vehicle — dropdown + client dispatch categories */}
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
                      ${selectedTier.pricePerKm.toFixed(2)}/km
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

          {/* 407 ETR Toggle */}
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleTitle}>407 ETR</Text>
              <Text style={styles.toggleSubtitle}>Highway 407 Express Toll Route</Text>
            </View>
            <Switch
              value={tollRoute}
              onValueChange={setTollRoute}
              trackColor={{ false: "#e0e0e0", true: "#D4A04A" }}
              thumbColor="#fff"
            />
          </View>

          {/* Child Seat */}
          <View style={styles.counterRow}>
            <View>
              <Text style={styles.toggleTitle}>Child Seat</Text>
              <Text style={styles.toggleSubtitle}>Child Seat $25</Text>
            </View>
            <View style={styles.counter}>
              <TouchableOpacity 
                style={styles.counterBtn}
                onPress={() => setChildSeatCount(Math.max(0, childSeatCount - 1))}
              >
                <Ionicons name="remove" size={18} color="#1a1a1a" />
              </TouchableOpacity>
              <Text style={styles.counterValue}>{childSeatCount}</Text>
              <TouchableOpacity 
                style={[styles.counterBtn, styles.counterBtnAdd]}
                onPress={() => setChildSeatCount(childSeatCount + 1)}
              >
                <Ionicons name="add" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
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
  fareEstimate: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(15,23,42,0.08)",
  },
  fareEstimateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  fareEstimateLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1a1a1a",
    letterSpacing: 0.2,
  },
  fareEstimateMeta: {
    flex: 1,
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "500",
    textAlign: "right",
    marginRight: 10,
  },
  fareEstimateValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1a1a1a",
    minWidth: 64,
    textAlign: "right",
  },
  fareEstimateTotalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(15,23,42,0.06)",
  },
  fareEstimateTotalLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: 0.2,
  },
  fareEstimateHint: {
    flex: 1,
    fontSize: 10,
    color: "#94a3b8",
    fontWeight: "500",
    textAlign: "right",
    marginRight: 10,
  },
  fareEstimateTotalValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    minWidth: 64,
    textAlign: "right",
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
  counter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  counterBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  counterBtnAdd: {
    backgroundColor: "#D4A04A",
    borderColor: "#D4A04A",
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
