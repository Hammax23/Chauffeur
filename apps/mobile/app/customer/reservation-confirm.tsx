import { useState } from "react";
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

  /**
   * Distance-based fare math.
   *
   *   distanceKm × pricePerKm     — full decimal precision (e.g. 1.7 × 3.05 = 5.185)
   *   Only the final display is rounded to 2 dp with toFixed(2).
   *
   * Falls back to the route fare passed from the previous screen if the raw
   * distance / per-km values are missing (older deep link, etc.). As a last
   * resort, falls back to the legacy hourly rate.
   */
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
  const hstCalc = subtotalCalc * 0.13;
  const gratuityAmount = subtotalCalc * 0.15;
  const totalCalc = subtotalCalc + hstCalc + gratuityAmount;

  const [nameOnCard, setNameOnCard] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [gratuity, setGratuity] = useState("15%");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        hst: hstCalc,
        gratuity: gratuityAmount,
        total: totalCalc,
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
          <View style={styles.stepCompleted}>
            <Text style={styles.stepCompletedText}>1</Text>
          </View>
          <View style={styles.stepLineActive} />
          <View style={styles.stepActive}>
            <Text style={styles.stepActiveText}>2</Text>
          </View>
        </View>

        {/* Confirmation Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Confirmation</Text>
          <Text style={styles.sectionSubtitle}>Review & Pay</Text>

          {/* Order Summary */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Vehicle</Text>
              <View style={{ flex: 1, alignItems: "flex-end" }}>
                <Text style={[styles.summaryValue, { textAlign: "right" }]} numberOfLines={3}>
                  {params.vehicle || "N/A"}
                </Text>
                {params.vehicleSubtitle ? (
                  <Text style={styles.vehicleSubtitle} numberOfLines={2}>
                    {params.vehicleSubtitle}
                  </Text>
                ) : null}
              </View>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Date & Time</Text>
              <Text style={[styles.summaryValue, { flex: 1, textAlign: "right" }]} numberOfLines={2}>
                {dateTimeSummary}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Passengers</Text>
              <Text style={styles.summaryValue}>{params.passengers || "1"}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Service Type</Text>
              <Text style={styles.summaryValue}>{params.serviceType || "N/A"}</Text>
            </View>
            
            <View style={styles.divider} />

            {distanceKm > 0 && pricePerKm > 0 ? (
              <>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Distance</Text>
                  <Text style={styles.summaryValue}>
                    {params.distanceText || `${distanceKm.toFixed(2)} km`}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Rate</Text>
                  <Text style={styles.summaryValue}>${pricePerKm.toFixed(2)}/km</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Ride fare</Text>
                  <Text style={styles.summaryValue}>${rideFare.toFixed(2)}</Text>
                </View>
                {params.durationText ? (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Estimated duration</Text>
                    <Text style={styles.summaryValue}>{params.durationText}</Text>
                  </View>
                ) : null}
              </>
            ) : (
              <>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Ride fare</Text>
                  <Text style={styles.summaryValue}>${rideFare.toFixed(2)}</Text>
                </View>
              </>
            )}
            {stopChargeCalc > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Stop charge</Text>
                <Text style={styles.summaryValue}>${stopChargeCalc.toFixed(2)}</Text>
              </View>
            )}
            {childSeats > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Child Seat ({childSeats} x $25)</Text>
              <Text style={styles.summaryValue}>${childSeatCharge.toFixed(2)}</Text>
            </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>${subtotalCalc.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>HST (13%)</Text>
              <Text style={styles.summaryValue}>${hstCalc.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <View style={styles.gratuityLabel}>
                <Text style={styles.summaryLabel}>Gratuity</Text>
                <TouchableOpacity style={styles.gratuityDropdown}>
                  <Text style={styles.gratuityText}>15%</Text>
                  <Ionicons name="chevron-down" size={14} color="#1a1a1a" />
                </TouchableOpacity>
              </View>
              <Text style={styles.summaryValue}>${gratuityAmount.toFixed(2)}</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>${totalCalc.toFixed(2)} CAD</Text>
            </View>
          </View>
        </View>

        {/* Payment Card Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Card</Text>

          <Text style={styles.inputLabel}>Name on card</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.textInput}
              placeholder="Name as it appears on card"
              placeholderTextColor="#999"
              value={nameOnCard}
              onChangeText={setNameOnCard}
            />
          </View>

          <Text style={styles.inputLabel}>Card Details (Secure Validation)</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.textInput}
              placeholder="Card Number"
              placeholderTextColor="#999"
              value={cardNumber}
              onChangeText={setCardNumber}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.cardRow}>
            <View style={styles.cardField}>
              <Text style={styles.inputLabel}>EXP</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Expiry"
                  placeholderTextColor="#999"
                  value={expiry}
                  onChangeText={setExpiry}
                />
              </View>
            </View>
            <View style={styles.cardField}>
              <Text style={styles.inputLabel}>CVV</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.textInput}
                  placeholder="CVV"
                  placeholderTextColor="#999"
                  value={cvv}
                  onChangeText={setCvv}
                  keyboardType="numeric"
                  secureTextEntry
                />
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.validateBtn} activeOpacity={0.9}>
            <Text style={styles.validateBtnText}>Validate Card</Text>
          </TouchableOpacity>

          <View style={styles.secureNote}>
            <Ionicons name="lock-closed" size={14} color="#D4A04A" />
            <Text style={styles.secureNoteText}>
              Your card will be securely validated without any charges
            </Text>
          </View>
        </View>

        {/* Billing Address Section */}
        <View style={styles.section}>
          <Text style={styles.inputLabel}>Billing Address (Optional)</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.textInput}
              placeholder="Card billing street address"
              placeholderTextColor="#999"
              value={billingAddress}
              onChangeText={setBillingAddress}
            />
          </View>

          <View style={[styles.inputBox, { marginTop: 12 }]}>
            <TextInput
              style={styles.textInput}
              placeholder="ZIP/Postal code"
              placeholderTextColor="#999"
              value={zipCode}
              onChangeText={setZipCode}
            />
          </View>
        </View>

        {/* Before you pay info */}
        <View style={styles.infoBox}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={18} color="#D4A04A" />
            <Text style={styles.infoTitle}>Before you pay</Text>
          </View>
          <View style={styles.infoList}>
            <Text style={styles.infoItem}>• Flight tracking included for airport transfers</Text>
            <Text style={styles.infoItem}>• 15 minutes complimentary wait time</Text>
            <Text style={styles.infoItem}>• Meet & greet service with name board (extra charge applies)</Text>
            <Text style={styles.infoItem}>• For Wi-Fi access, please ask your chauffeur</Text>
            <Text style={styles.infoItem}>• 24/7 customer support</Text>
            <Text style={styles.infoItem}>• 407 ETR (extra charges applies)</Text>
          </View>
        </View>

        {/* Terms Checkbox */}
        <TouchableOpacity 
          style={styles.termsRow}
          onPress={() => setTermsAccepted(!termsAccepted)}
          activeOpacity={0.8}
        >
          <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
            {termsAccepted && <Ionicons name="checkmark" size={14} color="#fff" />}
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

      {/* Bottom Buttons */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={styles.previousBtn} 
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Text style={styles.previousBtnText}>Previous</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.submitBtn} 
          activeOpacity={0.9}
          disabled={isSubmitting}
          onPress={handleSubmit}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.submitBtnText}>Submit Reservation</Text>
          )}
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
  stepCompleted: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#D4A04A",
    justifyContent: "center",
    alignItems: "center",
  },
  stepCompletedText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },
  stepLineActive: {
    width: 180,
    height: 2,
    backgroundColor: "#D4A04A",
  },
  stepActive: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#D4A04A",
    justifyContent: "center",
    alignItems: "center",
  },
  stepActiveText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#D4A04A",
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
  summaryCard: {
    borderWidth: 1,
    borderColor: "#e8e8e8",
    borderRadius: 12,
    padding: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  summaryLabel: {
    fontSize: 13,
    color: "#666",
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: "500",
    color: "#1a1a1a",
  },
  vehicleSubtitle: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "500",
    color: "#64748b",
    textAlign: "right",
    lineHeight: 15,
  },
  divider: {
    height: 1,
    backgroundColor: "#e8e8e8",
    marginVertical: 8,
  },
  gratuityLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  gratuityDropdown: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e8e8e8",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  gratuityText: {
    fontSize: 12,
    color: "#1a1a1a",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#D4A04A",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#1a1a1a",
    marginBottom: 8,
    marginTop: 12,
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
  cardRow: {
    flexDirection: "row",
    gap: 12,
  },
  cardField: {
    flex: 1,
  },
  validateBtn: {
    backgroundColor: "#D4A04A",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  validateBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  secureNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
  },
  secureNoteText: {
    fontSize: 11,
    color: "#666",
  },
  infoBox: {
    backgroundColor: "#fffbf5",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#f5efe5",
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  infoList: {
    gap: 6,
  },
  infoItem: {
    fontSize: 12,
    color: "#666",
    lineHeight: 18,
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 20,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#ccc",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: "#D4A04A",
    borderColor: "#D4A04A",
  },
  termsText: {
    flex: 1,
    fontSize: 12,
    color: "#666",
    lineHeight: 18,
  },
  termsLink: {
    color: "#D4A04A",
    textDecorationLine: "underline",
  },
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    gap: 12,
    ...Platform.select({
      ios: {
        paddingBottom: 30,
      },
    }),
  },
  previousBtn: {
    flex: 0.4,
    borderWidth: 1.5,
    borderColor: "#1a1a1a",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  previousBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  submitBtn: {
    flex: 0.6,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
});
