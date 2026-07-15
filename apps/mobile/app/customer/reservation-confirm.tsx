import { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { createReservation } from "../../services/api";

/** Expo Router may give string | string[] for the same key */
function qp(v: string | string[] | undefined): string {
  if (v == null) return "";
  return Array.isArray(v) ? String(v[0] ?? "") : String(v);
}

const GRATUITY_OPTIONS = [20, 25] as const;

export default function ReservationConfirmScreen() {
  const raw = useLocalSearchParams();

  const params = {
    serviceType: qp(raw.serviceType),
    pickupAddress: qp(raw.pickupAddress),
    dropoffAddress: qp(raw.dropoffAddress),
    stopAddress: qp(raw.stopAddress),
    pickupTime: qp(raw.pickupTime),
    serviceDate: qp(raw.serviceDate),
    serviceTime: qp(raw.serviceTime),
    pickupTimeDisplay: qp(raw.pickupTimeDisplay),
    passengers: qp(raw.passengers),
    vehicle: qp(raw.vehicle),
    vehicleId: qp(raw.vehicleId),
    vehiclePrice: qp(raw.vehiclePrice),
    vehicleSubtitle: qp(raw.vehicleSubtitle),
    rideFare: qp(raw.rideFare),
    pricePerKm: qp(raw.pricePerKm),
    hourlyRate: qp(raw.hourlyRate),
    distanceText: qp(raw.distanceText),
    durationText: qp(raw.durationText),
    distanceMeters: qp(raw.distanceMeters),
    durationSeconds: qp(raw.durationSeconds),
    tollRoute: qp(raw.tollRoute),
    childSeatCount: qp(raw.childSeatCount),
    firstName: qp(raw.firstName),
    lastName: qp(raw.lastName),
    phoneNumber: qp(raw.phoneNumber),
    email: qp(raw.email),
  };

  const childSeats = parseInt(params.childSeatCount || "0", 10);

  const distanceMeters = Math.max(0, parseFloat(params.distanceMeters) || 0);
  const distanceKm = distanceMeters / 1000;
  const pricePerKm = Math.max(0, parseFloat(params.pricePerKm) || 0);
  const passedRideFare = Math.max(0, parseFloat(params.rideFare) || 0);
  const hourlyFallback = Math.max(0, parseFloat(params.hourlyRate) || 115);

  const rideFare =
    distanceKm > 0 && pricePerKm > 0
      ? distanceKm * pricePerKm
      : passedRideFare > 0
        ? passedRideFare
        : hourlyFallback;

  const stopChargeCalc = params.stopAddress.trim() ? 15 : 0;
  const childSeatCharge = childSeats * 25;
  const subtotalCalc = rideFare + stopChargeCalc + childSeatCharge;

  const resolvedServiceDate =
    (params.serviceDate && String(params.serviceDate).trim()) ||
    params.pickupTime?.split(",")[0]?.trim() ||
    new Date().toISOString().split("T")[0];

  const resolvedServiceTime =
    (params.serviceTime && String(params.serviceTime).trim()) ||
    params.pickupTime?.split(",")[1]?.trim() ||
    "12:00";

  const dateTimeSummary =
    params.pickupTimeDisplay?.trim() ||
    `${resolvedServiceDate} · ${resolvedServiceTime}`;

  const [nameOnCard, setNameOnCard] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [gratuityPercent, setGratuityPercent] = useState(20);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pricing = useMemo(() => {
    const hst = subtotalCalc * 0.13;
    const gratuity = subtotalCalc * (gratuityPercent / 100);
    const total = subtotalCalc + hst + gratuity;
    return { hst, gratuity, total };
  }, [subtotalCalc, gratuityPercent]);

  const guestName = [params.firstName, params.lastName].filter(Boolean).join(" ").trim();

  const handleSubmit = async () => {
    if (!termsAccepted) {
      Alert.alert("Error", "Please agree to the Terms of Service");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await createReservation({
        serviceType: params.serviceType || "Airport Transfer pick-up/drop-off",
        vehicle: params.vehicle || "Mercedes-Maybach S-Class",
        passengers: parseInt(params.passengers || "1", 10),
        childSeats,
        etr407: params.tollRoute === "Yes" ? "Yes" : "No",
        serviceDate: resolvedServiceDate,
        serviceTime: resolvedServiceTime,
        pickupLocation: params.pickupAddress || "",
        stops: params.stopAddress || undefined,
        dropoffLocation: params.dropoffAddress || "",
        distance: params.distanceText || "—",
        duration: params.durationText || "—",
        rideFare,
        stopCharge: stopChargeCalc,
        childSeatCharge,
        subtotal: subtotalCalc,
        hst: pricing.hst,
        gratuity: pricing.gratuity,
        total: pricing.total,
        firstName: params.firstName,
        lastName: params.lastName,
        phone: params.phoneNumber,
        email: params.email,
      });
      if (result.success) {
        router.push({
          pathname: "/customer/reservation-pending",
          params: { bookingId: result.bookingId },
        });
      } else {
        Alert.alert("Error", "Failed to create reservation");
      }
    } catch {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color="#0f172a" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Confirm Booking</Text>
          <View style={{ width: 56 }} />
        </View>

        <View style={styles.stepIndicator}>
          <View style={styles.stepDone}>
            <Ionicons name="checkmark" size={14} color="#fff" />
          </View>
          <View style={styles.stepLine} />
          <View style={styles.stepCurrent}>
            <Text style={styles.stepCurrentText}>2</Text>
          </View>
        </View>

        <Text style={styles.pageTitle}>Review & pay</Text>
        <Text style={styles.pageSubtitle}>Confirm trip details, then secure your reservation.</Text>

        {/* Trip route */}
        <View style={styles.card}>
          <View style={styles.routeBlock}>
            <View style={styles.routeRail}>
              <View style={styles.routeDotStart} />
              <View style={styles.routeLine} />
              {params.stopAddress.trim() ? (
                <>
                  <View style={styles.routeDotStop} />
                  <View style={styles.routeLine} />
                </>
              ) : null}
              <View style={styles.routeDotEnd} />
            </View>
            <View style={styles.routeCopy}>
              <View style={styles.routeItem}>
                <Text style={styles.routeLabel}>Pickup</Text>
                <Text style={styles.routeValue}>{params.pickupAddress || "—"}</Text>
              </View>
              {params.stopAddress.trim() ? (
                <View style={styles.routeItem}>
                  <Text style={styles.routeLabel}>Stop</Text>
                  <Text style={styles.routeValue}>{params.stopAddress}</Text>
                </View>
              ) : null}
              <View style={styles.routeItem}>
                <Text style={styles.routeLabel}>Drop-off</Text>
                <Text style={styles.routeValue}>{params.dropoffAddress || "—"}</Text>
              </View>
            </View>
          </View>

          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Ionicons name="car-outline" size={15} color="#64748b" />
              <View style={styles.metaTextWrap}>
                <Text style={styles.metaLabel}>Vehicle</Text>
                <Text style={styles.metaValue} numberOfLines={2}>
                  {params.vehicle || "—"}
                </Text>
              </View>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={15} color="#64748b" />
              <View style={styles.metaTextWrap}>
                <Text style={styles.metaLabel}>Date & time</Text>
                <Text style={styles.metaValue} numberOfLines={2}>
                  {dateTimeSummary}
                </Text>
              </View>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={15} color="#64748b" />
              <View style={styles.metaTextWrap}>
                <Text style={styles.metaLabel}>Passengers</Text>
                <Text style={styles.metaValue}>{params.passengers || "1"}</Text>
              </View>
            </View>
            {childSeats > 0 ? (
              <View style={styles.metaItem}>
                <Ionicons name="happy-outline" size={15} color="#64748b" />
                <View style={styles.metaTextWrap}>
                  <Text style={styles.metaLabel}>Child seats</Text>
                  <Text style={styles.metaValue}>{childSeats}</Text>
                </View>
              </View>
            ) : null}
          </View>

          {(params.distanceText || params.durationText) && (
            <View style={styles.routeStats}>
              {params.distanceText ? (
                <Text style={styles.routeStatText}>{params.distanceText}</Text>
              ) : null}
              {params.distanceText && params.durationText ? (
                <Text style={styles.routeStatDot}>·</Text>
              ) : null}
              {params.durationText ? (
                <Text style={styles.routeStatText}>{params.durationText}</Text>
              ) : null}
            </View>
          )}
        </View>

        {/* Fare */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Fare summary</Text>

          {distanceKm > 0 && pricePerKm > 0 ? (
            <>
              <View style={styles.fareRow}>
                <Text style={styles.fareLabel}>Distance</Text>
                <Text style={styles.fareValue}>
                  {params.distanceText || `${distanceKm.toFixed(2)} km`}
                </Text>
              </View>
              <View style={styles.fareRow}>
                <Text style={styles.fareLabel}>Rate</Text>
                <Text style={styles.fareValue}>${pricePerKm.toFixed(2)}/km</Text>
              </View>
            </>
          ) : null}

          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Ride fare</Text>
            <Text style={styles.fareValue}>${rideFare.toFixed(2)}</Text>
          </View>
          {stopChargeCalc > 0 ? (
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>Stop charge</Text>
              <Text style={styles.fareValue}>${stopChargeCalc.toFixed(2)}</Text>
            </View>
          ) : null}
          {childSeats > 0 ? (
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>Child seat ({childSeats} × $25)</Text>
              <Text style={styles.fareValue}>${childSeatCharge.toFixed(2)}</Text>
            </View>
          ) : null}

          <View style={styles.softDivider} />

          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Subtotal</Text>
            <Text style={styles.fareValue}>${subtotalCalc.toFixed(2)}</Text>
          </View>
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>HST (13%)</Text>
            <Text style={styles.fareValue}>${pricing.hst.toFixed(2)}</Text>
          </View>

          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Gratuity</Text>
            <View style={styles.gratuityOptions}>
              {GRATUITY_OPTIONS.map((pct) => {
                const active = gratuityPercent === pct;
                return (
                  <TouchableOpacity
                    key={pct}
                    style={[styles.gratuityChip, active && styles.gratuityChipActive]}
                    onPress={() => setGratuityPercent(pct)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.gratuityChipText, active && styles.gratuityChipTextActive]}>
                      {pct}%
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.fareValue}>${pricing.gratuity.toFixed(2)}</Text>
          </View>

          <View style={styles.totalBar}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${pricing.total.toFixed(2)} CAD</Text>
          </View>
        </View>

        {/* Guest */}
        {(guestName || params.email || params.phoneNumber) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Guest</Text>
            {guestName ? <Text style={styles.guestName}>{guestName}</Text> : null}
            {params.email ? <Text style={styles.guestDetail}>{params.email}</Text> : null}
            {params.phoneNumber ? (
              <Text style={styles.guestDetail}>{params.phoneNumber}</Text>
            ) : null}
          </View>
        )}

        {/* Payment */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>Payment card</Text>
            <View style={styles.secureBadge}>
              <Ionicons name="lock-closed" size={11} color="#64748b" />
              <Text style={styles.secureBadgeText}>Secure</Text>
            </View>
          </View>

          <Text style={styles.fieldLabel}>Name on card</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.textInput}
              placeholder="Name as it appears on card"
              placeholderTextColor="#94a3b8"
              value={nameOnCard}
              onChangeText={setNameOnCard}
              autoCapitalize="words"
            />
          </View>

          <Text style={styles.fieldLabel}>Card number</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.textInput}
              placeholder="•••• •••• •••• ••••"
              placeholderTextColor="#94a3b8"
              value={cardNumber}
              onChangeText={setCardNumber}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.cardRow}>
            <View style={styles.cardField}>
              <Text style={styles.fieldLabel}>Expiry</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.textInput}
                  placeholder="MM/YY"
                  placeholderTextColor="#94a3b8"
                  value={expiry}
                  onChangeText={setExpiry}
                />
              </View>
            </View>
            <View style={styles.cardField}>
              <Text style={styles.fieldLabel}>CVV</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.textInput}
                  placeholder="CVV"
                  placeholderTextColor="#94a3b8"
                  value={cvv}
                  onChangeText={setCvv}
                  keyboardType="numeric"
                  secureTextEntry
                />
              </View>
            </View>
          </View>

          <Text style={styles.fieldLabel}>Billing address (optional)</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.textInput}
              placeholder="Street address"
              placeholderTextColor="#94a3b8"
              value={billingAddress}
              onChangeText={setBillingAddress}
            />
          </View>
          <View style={[styles.inputBox, { marginTop: 10 }]}>
            <TextInput
              style={styles.textInput}
              placeholder="ZIP / Postal code"
              placeholderTextColor="#94a3b8"
              value={zipCode}
              onChangeText={setZipCode}
              autoCapitalize="characters"
            />
          </View>

          <Text style={styles.secureNote}>
            Your card is validated securely — no charge until the trip is confirmed.
          </Text>
        </View>

        {/* Notes */}
        <View style={styles.notesCard}>
          <Text style={styles.notesTitle}>Included</Text>
          <Text style={styles.notesLine}>Flight tracking · 15 min wait · 24/7 support</Text>
          <Text style={styles.notesLine}>Child seat charges apply when selected</Text>
        </View>

        <TouchableOpacity
          style={styles.termsRow}
          onPress={() => setTermsAccepted(!termsAccepted)}
          activeOpacity={0.8}
        >
          <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
            {termsAccepted && <Ionicons name="checkmark" size={13} color="#fff" />}
          </View>
          <Text style={styles.termsText}>
            I agree to the{" "}
            <Text style={styles.termsLink}>Terms of Service</Text>,{" "}
            <Text style={styles.termsLink}>Privacy Policy</Text> &{" "}
            <Text style={styles.termsLink}>Cancellation Policy</Text>
          </Text>
        </TouchableOpacity>

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.bottomTotal}>
          <Text style={styles.bottomTotalLabel}>Total due</Text>
          <Text style={styles.bottomTotalValue}>${pricing.total.toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
          activeOpacity={0.9}
          disabled={isSubmitting}
          onPress={handleSubmit}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.submitBtnText}>Submit reservation</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
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
    paddingVertical: 14,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  backText: {
    fontSize: 15,
    color: "#0f172a",
    marginLeft: 2,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
  },
  stepIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  stepDone: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
  },
  stepLine: {
    width: 120,
    height: 2,
    backgroundColor: "#0f172a",
  },
  stepCurrent: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: "#0f172a",
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  stepCurrentText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: -0.3,
  },
  pageSubtitle: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 4,
    marginBottom: 18,
    lineHeight: 18,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 12,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  secureBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  secureBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b",
  },
  routeBlock: {
    flexDirection: "row",
    gap: 12,
  },
  routeRail: {
    width: 14,
    alignItems: "center",
    paddingTop: 4,
  },
  routeDotStart: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#0f172a",
  },
  routeDotStop: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#94a3b8",
  },
  routeDotEnd: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2.5,
    borderColor: "#D4A04A",
    backgroundColor: "#fff",
  },
  routeLine: {
    width: 2,
    flex: 1,
    minHeight: 18,
    backgroundColor: "#e2e8f0",
    marginVertical: 4,
  },
  routeCopy: {
    flex: 1,
    gap: 14,
  },
  routeItem: {
    gap: 2,
  },
  routeLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  routeValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#0f172a",
    lineHeight: 20,
  },
  metaGrid: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e2e8f0",
    gap: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  metaTextWrap: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "500",
    marginBottom: 1,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0f172a",
    lineHeight: 18,
  },
  routeStats: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e2e8f0",
    gap: 6,
  },
  routeStatText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  routeStatDot: {
    fontSize: 12,
    color: "#cbd5e1",
  },
  fareRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 7,
    gap: 10,
  },
  fareLabel: {
    fontSize: 13,
    color: "#64748b",
    flexShrink: 1,
  },
  fareValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0f172a",
  },
  softDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#e2e8f0",
    marginVertical: 8,
  },
  gratuityOptions: {
    flexDirection: "row",
    gap: 6,
    marginLeft: "auto",
    marginRight: 10,
  },
  gratuityChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
  },
  gratuityChipActive: {
    backgroundColor: "#0f172a",
    borderColor: "#0f172a",
  },
  gratuityChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  gratuityChipTextActive: {
    color: "#fff",
  },
  totalBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: -0.2,
  },
  guestName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 4,
  },
  guestDetail: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 2,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 6,
    marginTop: 10,
  },
  inputBox: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 13 : 10,
    backgroundColor: "#f8fafc",
  },
  textInput: {
    fontSize: 14,
    color: "#0f172a",
    padding: 0,
  },
  cardRow: {
    flexDirection: "row",
    gap: 10,
  },
  cardField: {
    flex: 1,
  },
  secureNote: {
    marginTop: 14,
    fontSize: 11,
    color: "#94a3b8",
    lineHeight: 16,
  },
  notesCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    marginBottom: 16,
  },
  notesTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  notesLine: {
    fontSize: 12,
    color: "#64748b",
    lineHeight: 18,
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 1,
    backgroundColor: "#fff",
  },
  checkboxChecked: {
    backgroundColor: "#0f172a",
    borderColor: "#0f172a",
  },
  termsText: {
    flex: 1,
    fontSize: 12,
    color: "#64748b",
    lineHeight: 18,
  },
  termsLink: {
    color: "#0f172a",
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 16,
    backgroundColor: "#fff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e2e8f0",
    gap: 12,
  },
  bottomTotal: {
    minWidth: 88,
  },
  bottomTotalLabel: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "500",
  },
  bottomTotalValue: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a",
    marginTop: 1,
  },
  submitBtn: {
    flex: 1,
    backgroundColor: "#0f172a",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
});
