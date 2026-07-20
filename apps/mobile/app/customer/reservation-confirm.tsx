import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { createReservation } from "../../services/api";
import { clearBookingDraft, loadBookingDraft, type BookingDraft } from "../../services/booking-draft";
import {
  APP_DEFAULT_GRATUITY_PERCENT,
  APP_GRATUITY_PERCENTS,
  calculateAppDistanceFare,
} from "../../utils/app-fare";

const SITE = "https://sarjworldwide.ca";

export default function ReservationConfirmScreen() {
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [ready, setReady] = useState(false);
  const [gratuityPercent, setGratuityPercent] = useState<number>(APP_DEFAULT_GRATUITY_PERCENT);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void (async () => {
      const loaded = await loadBookingDraft();
      if (!loaded?.pickupAddress || !loaded?.dropoffAddress) {
        Alert.alert("Session expired", "Please create your reservation again.", [
          { text: "OK", onPress: () => router.replace("/customer/create-reservation") },
        ]);
        return;
      }
      setDraft(loaded);
      setReady(true);
    })();
  }, []);

  const childSeats = parseInt(draft?.childSeatCount || "0", 10) || 0;
  const distanceMeters = Math.max(0, parseFloat(draft?.distanceMeters || "0") || 0);
  const pricePerKm = Math.max(0, parseFloat(draft?.pricePerKm || "0") || 0);
  const hourlyRate = Math.max(0, parseFloat(draft?.hourlyRate || "0") || 0);
  const baseDistanceKm = Math.max(0, parseFloat(draft?.baseDistanceKm || "17") || 17);
  const extraKmRate = Math.max(0, parseFloat(draft?.extraKmRate || "3.2") || 3.2);

  const fare = useMemo(() => {
    if (!draft) return null;
    return calculateAppDistanceFare({
      distanceMeters,
      hourlyRate,
      pricePerKm,
      baseDistanceKm,
      extraKmRate,
      hasStop: !!draft.stopAddress.trim(),
      childSeatCount: childSeats,
      gratuityPercent,
    });
  }, [
    draft,
    distanceMeters,
    hourlyRate,
    pricePerKm,
    baseDistanceKm,
    extraKmRate,
    childSeats,
    gratuityPercent,
  ]);

  const dateTimeSummary =
    draft?.pickupTimeDisplay?.trim() ||
    `${draft?.serviceDate || ""} · ${draft?.serviceTime || ""}`;

  const guestName = [draft?.firstName, draft?.lastName].filter(Boolean).join(" ").trim();

  const handleSubmit = async () => {
    if (!draft || !fare) return;
    if (!termsAccepted) {
      Alert.alert("Error", "Please agree to the Terms of Service");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await createReservation({
        serviceType: draft.serviceType || "Point-to-Point transportation",
        vehicle: draft.vehicle,
        vehicleId: draft.vehicleId,
        passengers: parseInt(draft.passengers || "1", 10),
        childSeats,
        etr407: draft.tollRoute === "Yes" ? "Yes" : "No",
        serviceDate: draft.serviceDate,
        serviceTime: draft.serviceTime,
        pickupLocation: draft.pickupAddress,
        stops: draft.stopAddress || undefined,
        dropoffLocation: draft.dropoffAddress,
        distance: draft.distanceText || "—",
        duration: draft.durationText || "—",
        distanceMeters,
        pricePerKm,
        gratuityPercent: fare.gratuityPercent,
        firstName: draft.firstName,
        lastName: draft.lastName,
        phone: draft.phoneNumber,
        email: draft.email,
      });
      if (result.success) {
        await clearBookingDraft();
        router.replace({
          pathname: "/customer/reservation-pending",
          params: { bookingId: result.bookingId },
        });
      } else {
        Alert.alert("Error", "Failed to create reservation");
      }
    } catch (e) {
      Alert.alert(
        "Error",
        e instanceof Error ? e.message : "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!ready || !draft || !fare) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#0f172a" />
        </View>
      </SafeAreaView>
    );
  }

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

        <Text style={styles.pageTitle}>Review & confirm</Text>
        <Text style={styles.pageSubtitle}>Confirm trip details. Payment is arranged after booking.</Text>

        <View style={styles.card}>
          <View style={styles.routeBlock}>
            <View style={styles.routeRail}>
              <View style={styles.routeDotStart} />
              <View style={styles.routeLine} />
              {draft.stopAddress.trim() ? (
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
                <Text style={styles.routeValue}>{draft.pickupAddress || "—"}</Text>
              </View>
              {draft.stopAddress.trim() ? (
                <View style={styles.routeItem}>
                  <Text style={styles.routeLabel}>Stop</Text>
                  <Text style={styles.routeValue}>{draft.stopAddress}</Text>
                </View>
              ) : null}
              <View style={styles.routeItem}>
                <Text style={styles.routeLabel}>Drop-off</Text>
                <Text style={styles.routeValue}>{draft.dropoffAddress || "—"}</Text>
              </View>
            </View>
          </View>

          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Ionicons name="car-outline" size={15} color="#64748b" />
              <View style={styles.metaTextWrap}>
                <Text style={styles.metaLabel}>Vehicle</Text>
                <Text style={styles.metaValue} numberOfLines={2}>
                  {draft.vehicle || "—"}
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
                <Text style={styles.metaValue}>{draft.passengers || "1"}</Text>
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

          {(draft.distanceText || draft.durationText) && (
            <View style={styles.routeStats}>
              {draft.distanceText ? (
                <Text style={styles.routeStatText}>{draft.distanceText}</Text>
              ) : null}
              {draft.distanceText && draft.durationText ? (
                <Text style={styles.routeStatDot}>·</Text>
              ) : null}
              {draft.durationText ? (
                <Text style={styles.routeStatText}>{draft.durationText}</Text>
              ) : null}
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Fare summary</Text>
          {fare.km > 0 ? (
            <>
              <View style={styles.fareRow}>
                <Text style={styles.fareLabel}>Distance</Text>
                <Text style={styles.fareValue}>
                  {draft.distanceText || `${fare.km.toFixed(2)} km`}
                </Text>
              </View>
              {hourlyRate > 0 ? (
                <View style={styles.fareRow}>
                  <Text style={styles.fareLabel}>Base rate</Text>
                  <Text style={styles.fareValue}>
                    ${hourlyRate.toFixed(2)} (first {baseDistanceKm} km)
                  </Text>
                </View>
              ) : pricePerKm > 0 ? (
                <View style={styles.fareRow}>
                  <Text style={styles.fareLabel}>Rate</Text>
                  <Text style={styles.fareValue}>${pricePerKm.toFixed(2)}/km</Text>
                </View>
              ) : null}
            </>
          ) : null}
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Ride fare</Text>
            <Text style={styles.fareValue}>${fare.rideFare.toFixed(2)}</Text>
          </View>
          {fare.stopCharge > 0 ? (
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>Stop charge</Text>
              <Text style={styles.fareValue}>${fare.stopCharge.toFixed(2)}</Text>
            </View>
          ) : null}
          {fare.childSeatCharge > 0 ? (
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>Child seats</Text>
              <Text style={styles.fareValue}>${fare.childSeatCharge.toFixed(2)}</Text>
            </View>
          ) : null}
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Subtotal</Text>
            <Text style={styles.fareValue}>${fare.subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>HST (13%)</Text>
            <Text style={styles.fareValue}>${fare.hst.toFixed(2)}</Text>
          </View>

          <Text style={[styles.fareLabel, { marginTop: 12, marginBottom: 8 }]}>Gratuity</Text>
          <View style={styles.tipRow}>
            {APP_GRATUITY_PERCENTS.map((pct) => (
              <TouchableOpacity
                key={pct}
                style={[styles.tipChip, gratuityPercent === pct && styles.tipChipActive]}
                onPress={() => setGratuityPercent(pct)}
              >
                <Text style={[styles.tipChipText, gratuityPercent === pct && styles.tipChipTextActive]}>
                  {pct}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Tip ({fare.gratuityPercent}%)</Text>
            <Text style={styles.fareValue}>${fare.gratuity.toFixed(2)}</Text>
          </View>
          <View style={[styles.fareRow, styles.fareTotalRow]}>
            <Text style={styles.fareTotalLabel}>Estimated total</Text>
            <Text style={styles.fareTotalValue}>${fare.total.toFixed(2)}</Text>
          </View>
        </View>

        {(guestName || draft.email || draft.phoneNumber) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Guest</Text>
            {guestName ? <Text style={styles.guestName}>{guestName}</Text> : null}
            {draft.email ? <Text style={styles.guestDetail}>{draft.email}</Text> : null}
            {draft.phoneNumber ? <Text style={styles.guestDetail}>{draft.phoneNumber}</Text> : null}
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>Payment</Text>
            <View style={styles.secureBadge}>
              <Ionicons name="time-outline" size={11} color="#64748b" />
              <Text style={styles.secureBadgeText}>Pending</Text>
            </View>
          </View>
          <Text style={styles.paymentNote}>
            Your reservation is submitted without charging a card in-app. Our team will confirm
            payment details after a chauffeur is assigned.
          </Text>
        </View>

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
            <Text style={styles.termsLink} onPress={() => Linking.openURL(`${SITE}/terms-of-service`)}>
              Terms of Service
            </Text>
            ,{" "}
            <Text style={styles.termsLink} onPress={() => Linking.openURL(`${SITE}/privacy-policy`)}>
              Privacy Policy
            </Text>{" "}
            &{" "}
            <Text
              style={styles.termsLink}
              onPress={() => Linking.openURL(`${SITE}/privacy-policy#cancellation`)}
            >
              Cancellation Policy
            </Text>
          </Text>
        </TouchableOpacity>

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.bottomTotal}>
          <Text style={styles.bottomTotalLabel}>Estimated total</Text>
          <Text style={styles.bottomTotalValue}>${fare.total.toFixed(2)}</Text>
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
  container: { flex: 1, backgroundColor: "#f8fafc" },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  backBtn: { flexDirection: "row", alignItems: "center" },
  backText: { fontSize: 15, color: "#0f172a", marginLeft: 2 },
  headerTitle: { fontSize: 16, fontWeight: "600", color: "#0f172a" },
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
  stepLine: { width: 120, height: 2, backgroundColor: "#0f172a" },
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
  stepCurrentText: { fontSize: 12, fontWeight: "700", color: "#0f172a" },
  pageTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  pageSubtitle: { fontSize: 14, color: "#64748b", marginBottom: 18, lineHeight: 20 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#0f172a", marginBottom: 10 },
  routeBlock: { flexDirection: "row", marginBottom: 14 },
  routeRail: { width: 16, alignItems: "center", paddingTop: 4 },
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
    backgroundColor: "#C9A063",
  },
  routeDotEnd: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: "#0f172a",
  },
  routeLine: { width: 2, flex: 1, backgroundColor: "#e2e8f0", marginVertical: 4 },
  routeCopy: { flex: 1, paddingLeft: 10, gap: 12 },
  routeItem: {},
  routeLabel: { fontSize: 11, fontWeight: "600", color: "#94a3b8", marginBottom: 2 },
  routeValue: { fontSize: 14, color: "#0f172a", lineHeight: 20 },
  metaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metaItem: {
    width: "47%",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 10,
  },
  metaTextWrap: { flex: 1 },
  metaLabel: { fontSize: 11, color: "#94a3b8", marginBottom: 2 },
  metaValue: { fontSize: 13, fontWeight: "600", color: "#0f172a" },
  routeStats: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  routeStatText: { fontSize: 13, color: "#64748b", fontWeight: "500" },
  routeStatDot: { marginHorizontal: 6, color: "#cbd5e1" },
  fareRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  fareLabel: { fontSize: 13, color: "#64748b" },
  fareValue: { fontSize: 13, fontWeight: "600", color: "#0f172a" },
  fareTotalRow: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  fareTotalLabel: { fontSize: 15, fontWeight: "700", color: "#0f172a" },
  fareTotalValue: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  tipRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  tipChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  tipChipActive: { backgroundColor: "#0f172a", borderColor: "#0f172a" },
  tipChipText: { fontSize: 13, fontWeight: "600", color: "#64748b" },
  tipChipTextActive: { color: "#fff" },
  guestName: { fontSize: 15, fontWeight: "600", color: "#0f172a", marginBottom: 4 },
  guestDetail: { fontSize: 13, color: "#64748b", marginBottom: 2 },
  secureBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
  },
  secureBadgeText: { fontSize: 11, fontWeight: "600", color: "#64748b" },
  paymentNote: { fontSize: 13, color: "#64748b", lineHeight: 19 },
  notesCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  notesTitle: { fontSize: 13, fontWeight: "700", color: "#0f172a", marginBottom: 6 },
  notesLine: { fontSize: 12, color: "#64748b", marginBottom: 2 },
  termsRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 8 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxChecked: { backgroundColor: "#0f172a", borderColor: "#0f172a" },
  termsText: { flex: 1, fontSize: 13, color: "#64748b", lineHeight: 19 },
  termsLink: { color: "#0f172a", fontWeight: "600", textDecorationLine: "underline" },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  bottomTotal: { flex: 1 },
  bottomTotalLabel: { fontSize: 12, color: "#64748b" },
  bottomTotalValue: { fontSize: 20, fontWeight: "700", color: "#0f172a" },
  submitBtn: {
    backgroundColor: "#0f172a",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    minWidth: 160,
    alignItems: "center",
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
