import { useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  Modal,
  ScrollView,
  Platform,
  TextInput,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { GOLD, type DriverPalette } from "../theme/driver-theme";
import {
  formatTierDisplayTitle,
  getTierCapacity,
  getTierLuggage,
  getTierSubtitle,
  isVipFleetTier,
  type VehicleTierOption,
} from "../data/vehicle-tiers";
import {
  APP_HOURLY_DURATIONS,
  APP_MIN_HOURLY_HOURS,
  CHILD_SEAT_CHARGE,
  MEET_GREET_CHARGE,
} from "../utils/app-fare";
import {
  MAX_FLEET_UNITS,
  totalFleetUnits,
  type FleetLine,
} from "../utils/fleet-lines";
import { activeStopAddresses } from "../utils/stops";
import { VipFleetBadge } from "./VipFleetBadge";

function shortPlace(addr: string): string {
  const first = (addr.split(",")[0] || addr).trim();
  if (first.length <= 32) return first;
  return `${first.slice(0, 30)}…`;
}

type Props = {
  palette: DriverPalette;
  isDark: boolean;
  pickupAddress: string;
  dropoffAddress: string;
  stops: string[];
  selectedTier: VehicleTierOption | null;
  vehicleTiers: VehicleTierOption[];
  selectedTierId: string | null;
  onSelectTier: (id: string) => void;
  tierFare: number | null;
  /** Total estimated ride fare across all fleet lines (preferred for price chip). */
  fleetFareTotal?: number | null;
  /** Mixed fleets on this trip (any available types · max 5 units). */
  fleetLines: FleetLine[];
  onSetFleetLineQuantity: (tierId: string, quantity: number) => void;
  onRemoveFleetLine: (tierId: string) => void;
  onAddFleetLine: (tierId: string) => void;
  childSeatCount: number;
  setChildSeatCount: (n: number | ((p: number) => number)) => void;
  maxPassengers: number;
  pickupTimeDisplay: string;
  onEditRoute: () => void;
  onOpenPickupTime: () => void;
  airline: string;
  flightNumber: string;
  meetGreet: boolean;
  allowMeetGreet: boolean;
  /** Show Flight row even when empty (airport trip) so user can add after Skip. */
  showFlightRow?: boolean;
  onEditFlight?: () => void;
  /** Payment row (SS) */
  paymentLoading?: boolean;
  paymentBrand?: string | null;
  paymentLast4?: string | null;
  paymentSubtitle?: string;
  onChangePayment: () => void;
  /** Tip row — same list style as payment / extras */
  tipSummary: string;
  tipAmountLabel?: string | null;
  onOpenTip: () => void;
  /** Hourly Plan→Review */
  isHourly?: boolean;
  hourlyDuration?: number;
  onChangeHourlyDuration?: (hours: number) => void;
  /** Parcel Plan→Review — recipient required to Confirm */
  isParcel?: boolean;
  recipientName?: string;
  recipientPhone?: string;
  parcelWeight?: string;
  parcelNote?: string;
  onChangeRecipientName?: (v: string) => void;
  onChangeRecipientPhone?: (v: string) => void;
  onChangeParcelWeight?: (v: string) => void;
  onChangeParcelNote?: (v: string) => void;
};

/**
 * Uber-style Review sheet content — map lives in parent; this is the floating panel.
 */
export function PlanRideReviewPanel({
  palette,
  isDark,
  pickupAddress,
  dropoffAddress,
  stops,
  selectedTier,
  vehicleTiers,
  selectedTierId,
  onSelectTier,
  tierFare,
  fleetFareTotal = null,
  fleetLines,
  onSetFleetLineQuantity,
  onRemoveFleetLine,
  onAddFleetLine,
  childSeatCount,
  setChildSeatCount,
  maxPassengers,
  pickupTimeDisplay,
  onEditRoute,
  onOpenPickupTime,
  airline,
  flightNumber,
  meetGreet,
  allowMeetGreet,
  showFlightRow = false,
  onEditFlight,
  paymentLoading = false,
  paymentBrand = null,
  paymentLast4 = null,
  paymentSubtitle = "Card",
  onChangePayment,
  tipSummary,
  tipAmountLabel = null,
  onOpenTip,
  isHourly = false,
  hourlyDuration = APP_MIN_HOURLY_HOURS,
  onChangeHourlyDuration,
  isParcel = false,
  recipientName = "",
  recipientPhone = "",
  parcelWeight = "",
  parcelNote = "",
  onChangeRecipientName,
  onChangeRecipientPhone,
  onChangeParcelWeight,
  onChangeParcelNote,
}: Props) {
  const insets = useSafeAreaInsets();
  const [showExtras, setShowExtras] = useState(false);
  const [showCars, setShowCars] = useState(false);
  /**
   * Inside the Extras modal only — never stack a second RN Modal on iOS
   * (that freezes taps: Add vehicle appears to do nothing, then UI hangs).
   */
  const [extrasStep, setExtrasStep] = useState<"main" | "addFleet">("main");

  const closeExtras = () => {
    setShowExtras(false);
    setExtrasStep("main");
  };

  const stopAddrs = activeStopAddresses(stops);
  const hourlyDropoff =
    (dropoffAddress || "").trim() &&
    !/^as directed$/i.test((dropoffAddress || "").trim())
      ? (dropoffAddress || "").trim()
      : "";
  const showHourlyRoute = isHourly && !!hourlyDropoff;
  const showRouteTimeline = !isHourly || showHourlyRoute;
  const ink = isDark ? "#F5F0E8" : "#000000";
  const muted = isDark ? "#A8A29A" : "#6B6B6B";
  const surface = isDark ? "#1F1C19" : "#FFFFFF";
  const hairline = isDark ? "rgba(255,255,255,0.1)" : "#E8E8E8";
  const rail = isDark ? "rgba(255,255,255,0.22)" : "#D0D0D0";
  const soft = isDark ? "rgba(255,255,255,0.06)" : "#F3F3F3";
  const accent = isDark ? GOLD : "#000000";
  const link = isDark ? GOLD : "#276EF1";

  const fleetUnitTotal = totalFleetUnits(fleetLines);
  const tierById = (id: string) => vehicleTiers.find((t) => t.id === id) || null;

  const extrasSummary = (() => {
    const bits: string[] = [];
    if (childSeatCount > 0) {
      bits.push(childSeatCount === 1 ? "1 child seat" : `${childSeatCount} child seats`);
    } else {
      bits.push("Child seats");
    }
    if (fleetUnitTotal > 1 || fleetLines.length > 1) {
      bits.push(
        fleetLines.length > 1
          ? `${fleetLines.length} fleets · ${fleetUnitTotal} cars`
          : `${fleetUnitTotal} cars`
      );
    } else {
      bits.push("More cars");
    }
    return bits.join(" · ");
  })();

  const vehicleTitleSummary = (() => {
    if (fleetLines.length <= 1) {
      const q = fleetLines[0]?.quantity || 1;
      const title = selectedTier
        ? formatTierDisplayTitle(selectedTier.title)
        : "Vehicle";
      return q > 1 ? `${title} ×${q}` : title;
    }
    return fleetLines
      .map((l) => {
        const t = tierById(l.tierId);
        const title = t
          ? formatTierDisplayTitle(t.title)
          : "Vehicle";
        return l.quantity > 1 ? `${title} ×${l.quantity}` : title;
      })
      .join(" · ");
  })();

  const priceLabel =
    fleetFareTotal != null
      ? `$${fleetFareTotal.toFixed(0)}`
      : tierFare != null
        ? `$${(tierFare * Math.max(1, fleetLines[0]?.quantity || 1)).toFixed(0)}`
        : selectedTier
          ? `$${selectedTier.hourlyRate > 0 ? selectedTier.hourlyRate.toFixed(0) : selectedTier.pricePerKm.toFixed(2)}`
          : "—";

  const stopMeta =
    stopAddrs.length === 0
      ? "Direct"
      : stopAddrs.length === 1
        ? "1 stop"
        : `${stopAddrs.length} stops`;

  return (
    <View style={styles.wrap}>
      {/* Floating sheet surface */}
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: surface,
            shadowColor: "#000",
          },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: isDark ? "#5C5348" : "#D0D0D0" }]} />

        {/* Route block — Uber timeline */}
        <View style={styles.block}>
          <View style={styles.blockHead}>
            <Text style={[styles.eyebrow, { color: muted }]}>
              {isHourly
                ? "Trip · Hourly"
                : isParcel
                  ? "Parcel · Direct"
                  : `Trip · ${stopMeta}`}
            </Text>
            <Pressable onPress={onEditRoute} hitSlop={10} style={styles.textBtn}>
              <Text style={[styles.textBtnLabel, { color: link }]}>Edit</Text>
            </Pressable>
          </View>

          <View style={styles.timeline}>
            <View style={styles.timelineRail} pointerEvents="none">
              <View style={[styles.dotPickup, { backgroundColor: ink }]} />
              {showRouteTimeline ? (
                <>
                  <View style={[styles.railLine, { backgroundColor: rail }]} />
                  {stopAddrs.map((_, i) => (
                    <View key={`r-${i}`} style={styles.railStopWrap}>
                      <View
                        style={[styles.dotStop, { borderColor: muted, backgroundColor: surface }]}
                      />
                      <View style={[styles.railLine, { backgroundColor: rail }]} />
                    </View>
                  ))}
                  <View style={[styles.dotDrop, { backgroundColor: ink }]} />
                </>
              ) : null}
            </View>
            <View style={styles.timelineCopy}>
              <Text style={[styles.placeText, { color: ink }]} numberOfLines={1}>
                {shortPlace(pickupAddress) || "Pickup"}
              </Text>
              {showRouteTimeline ? (
                <>
                  {stopAddrs.map((s, i) => (
                    <Text
                      key={`s-${i}`}
                      style={[styles.placeText, styles.placeStop, { color: muted }]}
                      numberOfLines={1}
                    >
                      {shortPlace(s)}
                    </Text>
                  ))}
                  <Text style={[styles.placeText, { color: ink }]} numberOfLines={1}>
                    {shortPlace(showHourlyRoute ? hourlyDropoff : dropoffAddress) || "Dropoff"}
                  </Text>
                  {isHourly ? (
                    <Text style={[styles.placeText, styles.placeStop, { color: muted }]} numberOfLines={1}>
                      Hourly · {hourlyDuration}h
                    </Text>
                  ) : null}
                </>
              ) : (
                <Text style={[styles.placeText, { color: muted }]} numberOfLines={1}>
                  As directed · {hourlyDuration}h
                </Text>
              )}
            </View>
          </View>
        </View>

        <View style={[styles.sep, { backgroundColor: hairline }]} />

        {/* Vehicle */}
        <Pressable
          onPress={() => vehicleTiers.length > 1 && setShowCars(true)}
          style={({ pressed }) => [styles.vehicleRow, pressed && { opacity: 0.92 }]}
        >
          {selectedTier ? (
            <>
              <View style={[styles.carThumbBg, { backgroundColor: soft }]}>
                <Image
                  source={{ uri: selectedTier.imageUrl }}
                  style={styles.carThumb}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.vehicleCopy}>
                <View style={styles.vehicleTitleRow}>
                  <Text style={[styles.vehicleName, { color: ink }]} numberOfLines={2}>
                    {vehicleTitleSummary}
                  </Text>
                  {fleetLines.some((l) => isVipFleetTier(l.tierId)) ||
                  isVipFleetTier(selectedTier.id) ? (
                    <VipFleetBadge isDark={isDark} compact />
                  ) : null}
                </View>
                <Text style={[styles.vehicleMeta, { color: muted }]} numberOfLines={1}>
                  {fleetLines.length > 1
                    ? `${fleetUnitTotal} vehicles · mix & match`
                    : `${getTierCapacity(selectedTier)} seats · ${getTierLuggage(selectedTier)} bags`}
                </Text>
              </View>
              <View style={styles.vehicleRight}>
                <Text style={[styles.price, { color: ink }]}>{priceLabel}</Text>
                {vehicleTiers.length > 1 ? (
                  <Text style={[styles.changeLink, { color: link }]}>Change</Text>
                ) : null}
              </View>
            </>
          ) : (
            <Text style={{ color: muted, paddingVertical: 8 }}>Loading vehicle…</Text>
          )}
        </Pressable>

        <View style={[styles.sep, { backgroundColor: hairline }]} />

        {/* Pick-up time — list row */}
        <Pressable
          onPress={onOpenPickupTime}
          style={({ pressed }) => [styles.listRow, pressed && { backgroundColor: soft }]}
        >
          <View style={[styles.rowIcon, { backgroundColor: soft }]}>
            <Ionicons name="calendar-outline" size={18} color={ink} />
          </View>
          <View style={styles.listCopy}>
            <Text style={[styles.listLabel, { color: muted }]}>Pick-up</Text>
            <Text style={[styles.listValue, { color: ink }]} numberOfLines={1}>
              {pickupTimeDisplay}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={muted} />
        </Pressable>

        {/* Hourly duration */}
        {isHourly && onChangeHourlyDuration ? (
          <>
            <View style={[styles.sep, { backgroundColor: hairline }]} />
            <View style={styles.hoursBlock}>
              <Text style={[styles.listLabel, { color: muted, marginBottom: 8 }]}>
                Duration · {APP_MIN_HOURLY_HOURS}h min
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.hoursRow}
              >
                {APP_HOURLY_DURATIONS.map((h) => {
                  const active = hourlyDuration === h;
                  return (
                    <Pressable
                      key={h}
                      onPress={() => onChangeHourlyDuration(h)}
                      style={[
                        styles.hourChip,
                        {
                          backgroundColor: active ? (isDark ? GOLD : ink) : soft,
                          borderColor: active ? "transparent" : hairline,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.hourChipValue,
                          { color: active ? (isDark ? "#1A1208" : "#fff") : ink },
                        ]}
                      >
                        {h}
                      </Text>
                      <Text
                        style={[
                          styles.hourChipUnit,
                          {
                            color: active
                              ? isDark
                                ? "rgba(26,18,8,0.7)"
                                : "rgba(255,255,255,0.75)"
                              : muted,
                          },
                        ]}
                      >
                        hrs
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </>
        ) : null}

        {/* Flight summary / Add flight details */}
        {showFlightRow ||
        airline.trim() ||
        flightNumber.trim() ||
        (allowMeetGreet && meetGreet) ? (
          <>
            <View style={[styles.sep, { backgroundColor: hairline }]} />
            <Pressable
              onPress={onEditFlight}
              disabled={!onEditFlight}
              style={({ pressed }) => [
                styles.listRow,
                pressed && onEditFlight && { opacity: 0.85 },
              ]}
              accessibilityRole={onEditFlight ? "button" : undefined}
              accessibilityLabel="Edit flight details"
            >
              <View style={[styles.rowIcon, { backgroundColor: soft }]}>
                <Ionicons name="airplane-outline" size={18} color={ink} />
              </View>
              <View style={styles.listCopy}>
                <Text style={[styles.listLabel, { color: muted }]}>Flight</Text>
                <Text style={[styles.listValue, { color: ink }]} numberOfLines={2}>
                  {[airline.trim(), flightNumber.trim()].filter(Boolean).join(" · ") ||
                    (showFlightRow ? "Add flight details" : "Details on file")}
                </Text>
                {allowMeetGreet && meetGreet ? (
                  <Text style={[styles.listHint, { color: muted }]}>
                    Meet & Greet · +${MEET_GREET_CHARGE.toFixed(0)}
                  </Text>
                ) : null}
              </View>
              {onEditFlight ? (
                <Ionicons name="chevron-forward" size={18} color={muted} />
              ) : null}
            </Pressable>
          </>
        ) : null}

        {/* Parcel recipient — required for Confirm */}
        {isParcel ? (
          <>
            <View style={[styles.sep, { backgroundColor: hairline }]} />
            <View style={styles.parcelBlock}>
              <Text style={[styles.listLabel, { color: muted, marginBottom: 10 }]}>
                Recipient
              </Text>
              <TextInput
                style={[
                  styles.parcelInput,
                  {
                    color: ink,
                    backgroundColor: soft,
                    borderColor: hairline,
                  },
                ]}
                value={recipientName}
                onChangeText={onChangeRecipientName}
                placeholder="Recipient name"
                placeholderTextColor={muted}
              />
              <TextInput
                style={[
                  styles.parcelInput,
                  {
                    color: ink,
                    backgroundColor: soft,
                    borderColor: hairline,
                    marginTop: 8,
                  },
                ]}
                value={recipientPhone}
                onChangeText={onChangeRecipientPhone}
                placeholder="Recipient phone"
                placeholderTextColor={muted}
                keyboardType="phone-pad"
              />
              <View style={styles.parcelWeightRow}>
                <TextInput
                  style={[
                    styles.parcelInput,
                    styles.parcelWeightInput,
                    {
                      color: ink,
                      backgroundColor: soft,
                      borderColor: hairline,
                    },
                  ]}
                  value={parcelWeight}
                  onChangeText={onChangeParcelWeight}
                  placeholder="Weight"
                  placeholderTextColor={muted}
                  keyboardType="decimal-pad"
                />
                <View style={[styles.parcelKg, { backgroundColor: soft, borderColor: hairline }]}>
                  <Text style={[styles.parcelKgText, { color: muted }]}>kg</Text>
                </View>
              </View>
              <TextInput
                style={[
                  styles.parcelInput,
                  styles.parcelNoteInput,
                  {
                    color: ink,
                    backgroundColor: soft,
                    borderColor: hairline,
                    marginTop: 8,
                  },
                ]}
                value={parcelNote}
                onChangeText={onChangeParcelNote}
                placeholder="Package note (optional)"
                placeholderTextColor={muted}
                multiline
              />
            </View>
          </>
        ) : null}

        {!isParcel ? (
          <>
            <View style={[styles.sep, { backgroundColor: hairline }]} />

            {/* Extras */}
            <Pressable
              onPress={() => {
                setExtrasStep("main");
                setShowExtras(true);
              }}
              style={({ pressed }) => [styles.listRow, pressed && { backgroundColor: soft }]}
            >
              <View style={[styles.rowIcon, { backgroundColor: soft }]}>
                <Ionicons name="add-circle-outline" size={18} color={ink} />
              </View>
              <View style={styles.listCopy}>
                <Text style={[styles.listLabel, { color: muted }]}>Extras</Text>
                <Text style={[styles.listValue, { color: ink }]} numberOfLines={1}>
                  {extrasSummary}
                </Text>
              </View>
              <Text style={[styles.addLink, { color: link }]}>
                {childSeatCount > 0 || fleetUnitTotal > 1 || fleetLines.length > 1
                  ? "Edit"
                  : "Add"}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={muted} />
            </Pressable>
          </>
        ) : null}

        <View style={[styles.sep, { backgroundColor: hairline }]} />

        {/* Payment method — matches SS */}
        <Pressable
          onPress={onChangePayment}
          style={({ pressed }) => [styles.listRow, pressed && { backgroundColor: soft }]}
        >
          <View
            style={[
              styles.brandTile,
              { backgroundColor: isDark ? soft : "#F0EBE3" },
            ]}
          >
            {paymentLoading ? (
              <Text style={[styles.brandTileText, { color: muted }]}>· · ·</Text>
            ) : (
              <Text
                style={[
                  styles.brandTileText,
                  {
                    color:
                      (paymentBrand || "").toLowerCase() === "visa" ? "#1A1F71" : ink,
                  },
                ]}
                numberOfLines={1}
              >
                {paymentBrand
                  ? paymentBrand.toLowerCase() === "visa"
                    ? "VISA"
                    : paymentBrand.toLowerCase() === "mastercard"
                      ? "MC"
                      : paymentBrand.slice(0, 4).toUpperCase()
                  : "CARD"}
              </Text>
            )}
          </View>
          <View style={styles.listCopy}>
            <Text style={[styles.listValue, { color: ink }]} numberOfLines={1}>
              {paymentLast4 ? `•••• ${paymentLast4}` : paymentLoading ? "Loading…" : "Add payment"}
            </Text>
            <Text style={[styles.listHint, { color: muted }]}>
              {paymentLast4 ? paymentSubtitle : "Required to confirm"}
            </Text>
          </View>
          <Text style={[styles.changeLinkRow, { color: link }]}>Change</Text>
        </Pressable>

        <View style={[styles.sep, { backgroundColor: hairline }]} />

        {/* Tip — same row language as payment / extras */}
        <Pressable
          onPress={onOpenTip}
          style={({ pressed }) => [styles.listRow, pressed && { backgroundColor: soft }]}
        >
          <View
            style={[
              styles.brandTile,
              { backgroundColor: isDark ? soft : "#F0EBE3" },
            ]}
          >
            <Ionicons name="heart-outline" size={18} color={ink} />
          </View>
          <View style={styles.listCopy}>
            <Text style={[styles.listValue, { color: ink }]} numberOfLines={1}>
              {tipSummary}
            </Text>
            {tipAmountLabel ? (
              <Text style={[styles.listHint, { color: muted }]} numberOfLines={1}>
                {tipAmountLabel}
              </Text>
            ) : null}
          </View>
          <Text style={[styles.changeLinkRow, { color: link }]}>
            {tipAmountLabel ? "Edit" : "Add"}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={muted} />
        </Pressable>
      </View>

      {/* Change vehicle */}
      <Modal
        visible={showCars && vehicleTiers.length > 0}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowCars(false)}
      >
        <View style={[styles.carRoot, { backgroundColor: isDark ? palette.root : "#F6F6F6" }]}>
          <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
            <View style={[styles.carHeader, { paddingTop: Math.max(insets.top, 12), backgroundColor: surface }]}>
              <Pressable onPress={() => setShowCars(false)} hitSlop={12} style={styles.carClose}>
                <Ionicons name="close" size={26} color={ink} />
              </Pressable>
              <Text style={[styles.carHeaderTitle, { color: ink }]}>Choose a ride</Text>
              <View style={{ width: 40 }} />
            </View>
            <ScrollView contentContainerStyle={styles.carList} keyboardShouldPersistTaps="handled">
              {vehicleTiers.map((tier) => {
                const selected = selectedTierId === tier.id;
                const line = getTierSubtitle(tier.id, tier.subtitle, tier.description);
                return (
                  <Pressable
                    key={tier.id}
                    onPress={() => {
                      onSelectTier(tier.id);
                      setShowCars(false);
                    }}
                    style={[
                      styles.carCard,
                      {
                        backgroundColor: surface,
                        borderColor: selected ? ink : "transparent",
                      },
                    ]}
                  >
                    <Image source={{ uri: tier.imageUrl }} style={styles.carCardThumb} resizeMode="contain" />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={styles.vehicleTitleRow}>
                        <Text style={[styles.carCardName, { color: ink }]} numberOfLines={1}>
                          {formatTierDisplayTitle(tier.title)}
                        </Text>
                        {isVipFleetTier(tier.id) ? (
                          <VipFleetBadge isDark={isDark} compact />
                        ) : null}
                      </View>
                      <Text style={{ color: muted, fontSize: 13, marginTop: 2 }} numberOfLines={1}>
                        {getTierCapacity(tier)} seats · {getTierLuggage(tier)} bags
                        {line ? ` · ${line}` : ""}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.radio,
                        {
                          borderColor: selected ? ink : muted,
                          backgroundColor: selected ? ink : "transparent",
                        },
                      ]}
                    >
                      {selected ? <Ionicons name="checkmark" size={12} color={surface} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Extras sheet — single Modal; add-fleet is an inner step (no stacked Modals). */}
      <Modal visible={showExtras} transparent animationType="slide" onRequestClose={closeExtras}>
        <View style={styles.extrasRoot}>
          <Pressable style={styles.extrasBackdrop} onPress={closeExtras} />
          <View
            style={[
              styles.extrasSheet,
              extrasStep === "addFleet" && styles.extrasSheetTall,
              {
                backgroundColor: surface,
                paddingBottom: Math.max(insets.bottom, 14) + 6,
              },
            ]}
          >
            <View style={[styles.handle, { backgroundColor: isDark ? "#5C5348" : "#D0D0D0", marginBottom: 14 }]} />

            {extrasStep === "addFleet" ? (
              <>
                <View style={styles.extrasStepHeader}>
                  <Pressable
                    onPress={() => setExtrasStep("main")}
                    hitSlop={12}
                    style={styles.extrasBackBtn}
                    accessibilityLabel="Back to extras"
                  >
                    <Ionicons name="chevron-back" size={22} color={ink} />
                  </Pressable>
                  <Text style={[styles.extrasTitle, { color: ink, flex: 1 }]}>Add a vehicle</Text>
                  <View style={{ width: 36 }} />
                </View>
                <Text style={[styles.extrasSub, { color: muted, marginBottom: 12 }]}>
                  Pick any available fleet for this same trip
                </Text>
                <ScrollView
                  style={styles.extrasFleetScroll}
                  contentContainerStyle={{ paddingBottom: 8, gap: 8 }}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {vehicleTiers.map((tier) => {
                    const already = fleetLines.some((l) => l.tierId === tier.id);
                    return (
                      <Pressable
                        key={`add-${tier.id}`}
                        onPress={() => {
                          onAddFleetLine(tier.id);
                          setExtrasStep("main");
                        }}
                        style={({ pressed }) => [
                          styles.extrasFleetCard,
                          {
                            backgroundColor: soft,
                            borderColor: already
                              ? ink
                              : isDark
                                ? "rgba(255,255,255,0.08)"
                                : "rgba(0,0,0,0.06)",
                          },
                          pressed && { opacity: 0.9 },
                        ]}
                      >
                        <Image
                          source={{ uri: tier.imageUrl }}
                          style={styles.extrasFleetThumb}
                          resizeMode="contain"
                        />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <View style={styles.vehicleTitleRow}>
                            <Text style={[styles.counterTitle, { color: ink }]} numberOfLines={1}>
                              {formatTierDisplayTitle(tier.title)}
                            </Text>
                            {isVipFleetTier(tier.id) ? (
                              <VipFleetBadge isDark={isDark} compact />
                            ) : null}
                          </View>
                          <Text style={[styles.counterSub, { color: muted }]} numberOfLines={1}>
                            {already
                              ? "Already on trip · adds +1"
                              : `${getTierCapacity(tier)} seats · ${getTierLuggage(tier)} bags`}
                          </Text>
                        </View>
                        <Ionicons name="add-circle" size={22} color={link} />
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </>
            ) : (
              <>
                <Text style={[styles.extrasTitle, { color: ink }]}>Extras</Text>
                <Text style={[styles.extrasSub, { color: muted }]}>
                  Optional add-ons for this trip
                </Text>

                <View style={[styles.counterRow, { backgroundColor: soft }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.counterTitle, { color: ink }]}>Child seat</Text>
                    <Text style={[styles.counterSub, { color: muted }]}>
                      ${CHILD_SEAT_CHARGE} each
                    </Text>
                  </View>
                  <View style={styles.stepper}>
                    <Pressable
                      onPress={() => setChildSeatCount((n) => Math.max(0, n - 1))}
                      style={[styles.stepBtn, { backgroundColor: surface }]}
                    >
                      <Ionicons name="remove" size={18} color={ink} />
                    </Pressable>
                    <Text style={[styles.stepVal, { color: ink }]}>{childSeatCount}</Text>
                    <Pressable
                      onPress={() => setChildSeatCount((n) => Math.min(maxPassengers, n + 1))}
                      style={[styles.stepBtn, { backgroundColor: ink }]}
                    >
                      <Ionicons name="add" size={18} color={surface} />
                    </Pressable>
                  </View>
                </View>

                <Text style={[styles.fleetSectionTitle, { color: ink, marginBottom: 10 }]}>
                  Vehicles
                </Text>

                {fleetLines.map((line) => {
                  const tier = tierById(line.tierId);
                  const title = tier
                    ? formatTierDisplayTitle(tier.title)
                    : "Vehicle";
                  const canRemove = fleetLines.length > 1;
                  return (
                    <View
                      key={line.tierId}
                      style={[styles.counterRow, { backgroundColor: soft }]}
                    >
                      <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                        <View style={styles.vehicleTitleRow}>
                          <Text style={[styles.counterTitle, { color: ink }]} numberOfLines={1}>
                            {title}
                          </Text>
                          {isVipFleetTier(line.tierId) ? (
                            <VipFleetBadge isDark={isDark} compact />
                          ) : null}
                        </View>
                        <Text style={[styles.counterSub, { color: muted }]} numberOfLines={1}>
                          {tier
                            ? `${getTierCapacity(tier)} seats · ${getTierLuggage(tier)} bags`
                            : "Selected fleet"}
                        </Text>
                        {canRemove ? (
                          <Pressable
                            onPress={() => onRemoveFleetLine(line.tierId)}
                            hitSlop={8}
                            style={{ marginTop: 6, alignSelf: "flex-start" }}
                          >
                            <Text style={{ color: link, fontSize: 13, fontWeight: "600" }}>
                              Remove
                            </Text>
                          </Pressable>
                        ) : null}
                      </View>
                      <View style={styles.stepper}>
                        <Pressable
                          onPress={() =>
                            onSetFleetLineQuantity(line.tierId, Math.max(1, line.quantity - 1))
                          }
                          style={[styles.stepBtn, { backgroundColor: surface }]}
                        >
                          <Ionicons name="remove" size={18} color={ink} />
                        </Pressable>
                        <Text style={[styles.stepVal, { color: ink }]}>{line.quantity}</Text>
                        <Pressable
                          onPress={() => {
                            if (fleetUnitTotal >= MAX_FLEET_UNITS) return;
                            onSetFleetLineQuantity(line.tierId, line.quantity + 1);
                          }}
                          style={[styles.stepBtn, { backgroundColor: ink }]}
                        >
                          <Ionicons name="add" size={18} color={surface} />
                        </Pressable>
                      </View>
                    </View>
                  );
                })}

                {fleetUnitTotal < MAX_FLEET_UNITS ? (
                  <Pressable
                    onPress={() => setExtrasStep("addFleet")}
                    style={({ pressed }) => [
                      styles.addFleetBtn,
                      {
                        borderColor: isDark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.12)",
                        backgroundColor: soft,
                      },
                      pressed && { opacity: 0.88 },
                    ]}
                  >
                    <Ionicons name="add-circle-outline" size={20} color={link} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.addFleetTitle, { color: ink }]}>
                        Add another vehicle
                      </Text>
                      <Text style={[styles.counterSub, { color: muted }]}>
                        Choose any type from Select vehicle
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={muted} />
                  </Pressable>
                ) : null}

                <Pressable
                  onPress={closeExtras}
                  style={[styles.doneBtn, { backgroundColor: accent }]}
                >
                  <Text style={[styles.doneBtnText, { color: isDark ? "#1A1208" : "#fff" }]}>
                    Done
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 12,
    // No negative overlap — handle + TRIP must be fully visible on first paint.
    marginTop: 0,
    paddingTop: 2,
    zIndex: 2,
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingBottom: 6,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    marginTop: 8,
    marginBottom: 4,
    opacity: 1,
  },
  block: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 14,
  },
  blockHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  textBtn: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  textBtnLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  timeline: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 12,
  },
  timelineRail: {
    width: 14,
    alignItems: "center",
    paddingTop: 5,
  },
  dotPickup: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  dotStop: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  dotDrop: {
    width: 9,
    height: 9,
    borderRadius: 2,
  },
  railLine: {
    width: 2,
    flexGrow: 1,
    minHeight: 14,
    borderRadius: 1,
    marginVertical: 3,
  },
  railStopWrap: {
    alignItems: "center",
    alignSelf: "stretch",
    width: 14,
  },
  timelineCopy: {
    flex: 1,
    minWidth: 0,
    gap: 12,
    justifyContent: "space-between",
  },
  placeText: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.2,
    lineHeight: 21,
  },
  placeStop: {
    fontWeight: "500",
  },
  sep: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
  vehicleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  carThumbBg: {
    width: 64,
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  carThumb: {
    width: 58,
    height: 40,
  },
  vehicleCopy: {
    flex: 1,
    minWidth: 0,
  },
  vehicleTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "nowrap",
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.3,
    flexShrink: 1,
    minWidth: 0,
  },
  vehicleMeta: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 3,
  },
  vehicleRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  changeLink: {
    fontSize: 13,
    fontWeight: "600",
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  listCopy: {
    flex: 1,
    minWidth: 0,
  },
  listLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 2,
  },
  listValue: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  listHint: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 3,
  },
  addLink: {
    fontSize: 14,
    fontWeight: "600",
    marginRight: 2,
  },
  brandTile: {
    width: 44,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  brandTileText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  changeLinkRow: {
    fontSize: 15,
    fontWeight: "600",
  },
  carRoot: { flex: 1 },
  carHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
  carClose: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  carHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  carList: {
    padding: 12,
    gap: 8,
  },
  carCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
  },
  carCardThumb: { width: 72, height: 48 },
  carCardName: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
    flexShrink: 1,
    minWidth: 0,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  extrasRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  extrasBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  extrasSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  extrasTitle: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.4,
    textAlign: "center",
  },
  extrasSub: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 18,
  },
  extrasSheetTall: {
    maxHeight: "88%",
  },
  extrasStepHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  extrasBackBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -6,
  },
  extrasFleetScroll: {
    maxHeight: 360,
    marginBottom: 8,
  },
  extrasFleetCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  extrasFleetThumb: {
    width: 56,
    height: 36,
  },
  fleetSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
    marginTop: 4,
  },
  addFleetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
  },
  addFleetTitle: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  addFleetHint: {
    fontSize: 13,
    fontWeight: "500",
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  counterTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  counterSub: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 3,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  stepVal: {
    minWidth: 24,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  doneBtn: {
    marginTop: 10,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
  },
  doneBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
  hoursBlock: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  hoursRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 2,
  },
  hourChip: {
    minWidth: 52,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  hourChipValue: {
    fontSize: 17,
    fontWeight: "700",
  },
  hourChipUnit: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 1,
  },
  parcelBlock: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  parcelInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 12,
    fontSize: 16,
    fontWeight: "500",
  },
  parcelWeightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  parcelWeightInput: {
    flex: 1,
  },
  parcelKg: {
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  parcelKgText: {
    fontSize: 14,
    fontWeight: "600",
  },
  parcelNoteInput: {
    minHeight: 72,
    textAlignVertical: "top",
  },
});
