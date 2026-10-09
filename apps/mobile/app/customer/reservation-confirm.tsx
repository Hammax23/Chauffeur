import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
  TextInput,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { usePaymentSheet } from "@stripe/stripe-react-native";
import {
  createReservation,
  createCustomerPaymentIntent,
  validatePromoCode,
  getActiveAppPromotions,
  getReferralStatus,
} from "../../services/api";
import { clearBookingDraft, loadBookingDraft, type BookingDraft } from "../../services/booking-draft";
import { resetToReservationConfirmed } from "../../utils/booking-nav-reset";
import {
  APP_DEFAULT_GRATUITY_PERCENT,
  APP_GRATUITY_PERCENTS,
  applyPromoDiscount,
  calculateAppDistanceFare,
  calculateAppHourlyFare,
} from "../../utils/app-fare";
import { parseAppStops } from "../../utils/stops";
import {
  encodeParcelRequirements,
  isParcelServiceType,
} from "../../utils/parcel";
import {
  clearPendingPromoCode,
  getPendingPromoCode,
} from "../../utils/pending-promo";
import { useCustomerTheme } from "../../contexts/CustomerThemeContext";
import { GOLD, type DriverPalette } from "../../theme/driver-theme";

/**
 * App card checkout via Stripe PaymentSheet (saved cards + Apple Pay when available).
 *
 * TEMP (user request): payment validation DISABLED so reservations can complete without paying.
 * Set back to `true` when user asks to re-enable payment (uncomment / restore checkout).
 * Search: APP_PAYMENTS_ENABLED
 */
const APP_PAYMENTS_ENABLED = false; // was: true

export default function ReservationConfirmScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { palette, isDark } = useCustomerTheme();
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [ready, setReady] = useState(false);
  const [gratuityPercent, setGratuityPercent] = useState<number>(APP_DEFAULT_GRATUITY_PERCENT);
  const [tipModalOpen, setTipModalOpen] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [promoHint, setPromoHint] = useState("");
  const [useReferralCredit, setUseReferralCredit] = useState(false);
  const [referralAvailable, setReferralAvailable] = useState(false);
  const [referralAmount, setReferralAmount] = useState(20);
  const [fareSummaryOpen, setFareSummaryOpen] = useState(false);
  const fareErrorShownRef = useRef(false);
  const pendingPromoTriedRef = useRef(false);
  const { initPaymentSheet, presentPaymentSheet } = usePaymentSheet();

  useEffect(() => {
    void (async () => {
      const loaded = await loadBookingDraft();
      const isHourlyDraft = loaded?.bookingMode === "hourly";
      if (
        !loaded?.pickupAddress?.trim() ||
        (!isHourlyDraft && !loaded?.dropoffAddress?.trim())
      ) {
        Alert.alert("Session expired", "Please create your reservation again.", [
          { text: "OK", onPress: () => router.replace("/customer/create-reservation") },
        ]);
        return;
      }
      if (isHourlyDraft) {
        const rate = parseFloat(loaded.hourlyRate || "0") || 0;
        const hours = Math.floor(parseFloat(loaded.hourlyDuration || "0") || 0);
        if (rate <= 0 || hours < 3) {
          Alert.alert("Booking incomplete", "Please create your hourly reservation again.", [
            { text: "OK", onPress: () => router.replace("/customer/create-reservation") },
          ]);
          return;
        }
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
  const isHourly = draft?.bookingMode === "hourly";
  const hourlyDuration = Math.max(
    3,
    Math.floor(parseFloat(draft?.hourlyDuration || "3") || 3)
  );
  const stopList = useMemo(
    () => parseAppStops(draft?.stopAddress),
    [draft?.stopAddress]
  );
  const stopCount = stopList.length;
  const stopsPayload = stopCount > 0 ? draft?.stopAddress?.trim() : undefined;
  const meetGreet = draft?.meetGreet === "1" || draft?.meetGreet === "true";

  const fare = useMemo(() => {
    if (!draft) return null;
    let base = null;
    if (isHourly) {
      base = calculateAppHourlyFare({
        hours: hourlyDuration,
        hourlyRate,
        stopCount,
        childSeatCount: childSeats,
        gratuityPercent,
        pickupLocation: draft.pickupAddress,
        meetGreet,
      });
    } else {
      base = calculateAppDistanceFare({
        distanceMeters,
        hourlyRate,
        pricePerKm,
        baseDistanceKm,
        extraKmRate,
        stopCount,
        childSeatCount: childSeats,
        gratuityPercent,
        pickupLocation: draft.pickupAddress,
        meetGreet,
      });
    }
    if (!base) return null;
    if (useReferralCredit && referralAvailable) {
      return applyPromoDiscount(base, referralAmount, "REFERRAL");
    }
    if (appliedPromoCode && promoDiscount > 0) {
      return applyPromoDiscount(base, promoDiscount, appliedPromoCode);
    }
    return base;
  }, [
    draft,
    isHourly,
    hourlyDuration,
    distanceMeters,
    hourlyRate,
    pricePerKm,
    baseDistanceKm,
    extraKmRate,
    stopCount,
    childSeats,
    gratuityPercent,
    meetGreet,
    appliedPromoCode,
    promoDiscount,
    useReferralCredit,
    referralAvailable,
    referralAmount,
  ]);

  useEffect(() => {
    if (!ready || !draft || fare || fareErrorShownRef.current) return;
    fareErrorShownRef.current = true;
    Alert.alert("Fare unavailable", "Please create your reservation again.", [
      { text: "OK", onPress: () => router.replace("/customer/create-reservation") },
    ]);
  }, [ready, draft, fare]);

  const dateTimeSummary =
    draft?.pickupTimeDisplay?.trim() ||
    `${draft?.serviceDate || ""} · ${draft?.serviceTime || ""}`;

  const guestName = [draft?.firstName, draft?.lastName].filter(Boolean).join(" ").trim();
  const isParcel = isParcelServiceType(draft?.serviceType);
  const dropoffDisplay =
    draft?.dropoffAddress?.trim() || (isHourly ? "As directed" : "—");
  const isAsDirected =
    isHourly && dropoffDisplay.toLowerCase() === "as directed";

  const handleApplyPromo = async (codeOverride?: string) => {
    if (!draft || !fare) return;
    if (useReferralCredit) {
      setPromoError("Turn off referral credit to apply a promo code.");
      return;
    }
    const code = (codeOverride ?? promoInput).trim().toUpperCase();
    if (!code) {
      setPromoError("Enter a promo code.");
      return;
    }
    setPromoBusy(true);
    setPromoError("");
    try {
      const res = await validatePromoCode({
        code,
        vehicle: draft.vehicle,
        vehicleId: draft.vehicleId,
        childSeats,
        pickupLocation: draft.pickupAddress,
        stops: stopsPayload,
        distanceMeters: isHourly ? undefined : distanceMeters,
        gratuityPercent,
        bookingMode: isHourly ? "hourly" : "distance",
        hourlyDuration: isHourly ? hourlyDuration : undefined,
        meetGreet: meetGreet || undefined,
      });
      if (!res.success || !res.promoCode || !(res.discountAmount && res.discountAmount > 0)) {
        setAppliedPromoCode(null);
        setPromoDiscount(0);
        setPromoError(res.error || "This promo code is not valid.");
        return;
      }
      setAppliedPromoCode(res.promoCode);
      setPromoDiscount(res.discountAmount);
      setPromoInput(res.promoCode);
      setPromoError("");
      setPromoHint("");
      await clearPendingPromoCode();
    } catch (e) {
      setPromoError(e instanceof Error ? e.message : "Could not apply promo code.");
    } finally {
      setPromoBusy(false);
    }
  };

  const handleClearPromo = () => {
    setAppliedPromoCode(null);
    setPromoDiscount(0);
    setPromoInput("");
    setPromoError("");
  };

  const enableReferralCredit = () => {
    setUseReferralCredit(true);
    setAppliedPromoCode(null);
    setPromoDiscount(0);
    setPromoInput("");
    setPromoError("");
    setPromoHint("");
  };

  const disableReferralCredit = () => {
    setUseReferralCredit(false);
  };

  // Referral credit (preferred) + pending promo from Home banner + soft hint
  useEffect(() => {
    if (!ready || !draft || !fare || pendingPromoTriedRef.current) return;
    pendingPromoTriedRef.current = true;
    void (async () => {
      let hasReferral = false;
      try {
        const ref = await getReferralStatus();
        if (ref.success && ref.referral?.rewardAvailable) {
          hasReferral = true;
          setReferralAvailable(true);
          setReferralAmount(ref.referral.rewardAmount || 20);
          enableReferralCredit();
        }
      } catch {
        /* ignore */
      }
      if (hasReferral) {
        await clearPendingPromoCode();
        return;
      }
      const pending = await getPendingPromoCode();
      if (pending) {
        setPromoInput(pending);
        setPromoBusy(true);
        try {
          const res = await validatePromoCode({
            code: pending,
            vehicle: draft.vehicle,
            vehicleId: draft.vehicleId,
            childSeats,
            pickupLocation: draft.pickupAddress,
            stops: stopsPayload,
            distanceMeters: isHourly ? undefined : distanceMeters,
            gratuityPercent,
            bookingMode: isHourly ? "hourly" : "distance",
            hourlyDuration: isHourly ? hourlyDuration : undefined,
            meetGreet: meetGreet || undefined,
          });
          if (res.success && res.promoCode && res.discountAmount && res.discountAmount > 0) {
            setAppliedPromoCode(res.promoCode);
            setPromoDiscount(res.discountAmount);
            setPromoInput(res.promoCode);
            setPromoError("");
            setPromoHint("");
            await clearPendingPromoCode();
          } else {
            setPromoError(res.error || "This promo code could not be applied.");
            await clearPendingPromoCode();
          }
        } catch (e) {
          setPromoError(e instanceof Error ? e.message : "Could not apply promo code.");
          await clearPendingPromoCode();
        } finally {
          setPromoBusy(false);
        }
        return;
      }
      try {
        const data = await getActiveAppPromotions();
        if (data.success && data.promotions?.length) {
          const first = data.promotions[0];
          setPromoHint(`Offer available — use ${first.code} below`);
        }
      } catch {
        /* ignore */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once when fare first ready
  }, [ready, draft, fare]);

  const handleSubmit = async () => {
    if (!draft || !fare) return;
    if (!termsAccepted) {
      Alert.alert("Error", "Please agree to the Terms of Service");
      return;
    }
    setIsSubmitting(true);
    try {
      const specialRequirements = (() => {
        if (isParcel) {
          return encodeParcelRequirements({
            recipientName: draft.recipientName || "",
            recipientPhone: draft.recipientPhone || "",
            parcelWeight: draft.parcelWeight,
            parcelNote: draft.parcelNote,
          });
        }
        if (draft.rideFor === "child") {
          const booker =
            draft.bookerName?.trim() ||
            [draft.bookerEmail, draft.bookerPhone].filter(Boolean).join(" · ") ||
            "account holder";
          const age = draft.childAge?.trim();
          return [
            "CHILD PASSENGER — reserve for child",
            age ? `Child age: ${age}` : null,
            `Booked by guardian: ${booker}`,
            draft.phoneNumber
              ? `Guardian contact at pickup: ${draft.phoneNumber}`
              : null,
            "Please confirm identity with the guardian before departure.",
          ]
            .filter(Boolean)
            .join("\n");
        }
        if (draft.rideFor === "someone" && draft.bookerName) {
          return `Passenger booked by: ${draft.bookerName}${
            draft.bookerPhone ? ` · ${draft.bookerPhone}` : ""
          }`;
        }
        return undefined;
      })();

      let stripePaymentIntentId: string | undefined;

      if (APP_PAYMENTS_ENABLED) {
        const intent = await createCustomerPaymentIntent({
          vehicle: draft.vehicle,
          vehicleId: draft.vehicleId,
          childSeats,
          pickupLocation: draft.pickupAddress,
          stops: stopsPayload,
          distanceMeters: isHourly ? undefined : distanceMeters,
          gratuityPercent: fare.gratuityPercent,
          email: draft.email,
          bookingMode: isHourly ? "hourly" : "distance",
          hourlyDuration: isHourly ? hourlyDuration : undefined,
          meetGreet: meetGreet || undefined,
          promoCode: useReferralCredit ? undefined : appliedPromoCode || undefined,
          useReferralCredit: useReferralCredit || undefined,
        });

        if (
          !intent.success ||
          !intent.clientSecret ||
          !intent.paymentIntentId ||
          !intent.customerId ||
          !intent.ephemeralKeySecret
        ) {
          Alert.alert("Payment", intent.error || "Could not start payment. Please try again.");
          return;
        }

        const { error: initError } = await initPaymentSheet({
          merchantDisplayName: "SARJ Worldwide",
          paymentIntentClientSecret: intent.clientSecret,
          customerId: intent.customerId,
          customerEphemeralKeySecret: intent.ephemeralKeySecret,
          allowsDelayedPaymentMethods: false,
          defaultBillingDetails: {
            name: guestName || undefined,
            email: draft.email || undefined,
            phone: draft.phoneNumber || undefined,
          },
          returnURL: "sarjworldwide://stripe-redirect",
          appearance: {
            colors: {
              primary: "#C9A063",
            },
          },
        });
        if (initError) {
          Alert.alert(
            "Payment",
            initError.message?.includes("publishable")
              ? "Payments are not configured on this build. Please update the app or try again later."
              : initError.message || "Could not open secure checkout."
          );
          return;
        }

        const { error: presentError } = await presentPaymentSheet();
        if (presentError) {
          if (presentError.code !== "Canceled") {
            Alert.alert("Payment", presentError.message || "Payment was not completed.");
          }
          return;
        }
        stripePaymentIntentId = intent.paymentIntentId;
      }

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
        stops: stopsPayload,
        dropoffLocation: dropoffDisplay,
        distance: draft.distanceText || "—",
        duration: draft.durationText || "—",
        distanceMeters: isHourly ? undefined : distanceMeters,
        pricePerKm,
        gratuityPercent: fare.gratuityPercent,
        bookingMode: isHourly ? "hourly" : "distance",
        hourlyDuration: isHourly ? hourlyDuration : undefined,
        airline: draft.airline?.trim() || undefined,
        flightNumber: draft.flightNumber?.trim() || undefined,
        flightNote: draft.flightNote?.trim() || undefined,
        meetGreet: meetGreet || undefined,
        specialRequirements,
        firstName: draft.firstName,
        lastName: draft.lastName,
        phone: draft.phoneNumber,
        email: draft.email,
        stripePaymentIntentId,
        promoCode: useReferralCredit ? undefined : appliedPromoCode || undefined,
        useReferralCredit: useReferralCredit || undefined,
      });
      if (result.success && result.bookingId) {
        await clearBookingDraft();
        resetToReservationConfirmed(navigation, result.bookingId);
      } else {
        const serverError =
          typeof (result as { error?: string }).error === "string"
            ? (result as { error?: string }).error
            : undefined;
        Alert.alert(
          APP_PAYMENTS_ENABLED ? "Payment received" : "Error",
          serverError ||
            (APP_PAYMENTS_ENABLED
              ? "Your card was charged but the booking could not be saved. Please contact SARJ with your receipt."
              : "Failed to create reservation")
        );
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

  const styles = useMemo(() => makeStyles(palette, isDark), [palette, isDark]);

  if (!ready || !draft || !fare) {
    return (
      <View style={[styles.root, { backgroundColor: palette.root }]}>
        <StatusBar barStyle={palette.statusBar} backgroundColor={palette.root} />
        <LinearGradient colors={[...palette.bg]} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.safe} edges={["top"]}>
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator size="large" color={isDark ? GOLD : palette.text} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: palette.root }]}>
      <StatusBar barStyle={palette.statusBar} backgroundColor={palette.root} />
      <LinearGradient colors={[...palette.bg]} style={StyleSheet.absoluteFill} />
      <View style={styles.ambientGlow} pointerEvents="none">
        <LinearGradient
          colors={[...palette.glow]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.85, y: 0.45 }}
        />
      </View>

      <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color={palette.text} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Confirm Booking</Text>
          <View style={{ width: 56 }} />
        </View>

        <View style={styles.stepIndicator}>
          <View style={styles.stepDone}>
            <Ionicons
              name="checkmark"
              size={14}
              color={isDark ? "#1A1208" : "#fff"}
            />
          </View>
          <View style={styles.stepLine} />
          <View style={styles.stepCurrent}>
            <Text style={styles.stepCurrentText}>2</Text>
          </View>
        </View>

        <Text style={styles.pageTitle}>Review & confirm</Text>
        <Text style={styles.pageSubtitle}>
          {APP_PAYMENTS_ENABLED
            ? isHourly
              ? "Confirm your hourly booking and pay securely. Saved cards and Apple Pay appear when available."
              : "Confirm trip details and pay securely. Saved cards and Apple Pay appear when available."
            : "Confirm trip details. Card payment is temporarily unavailable."}
        </Text>

        <View style={styles.card}>
          {!isParcel ? (
            <View style={styles.modeBadgeRow}>
              <View style={[styles.modeBadge, isHourly && styles.modeBadgeHourly]}>
                <Ionicons
                  name={isHourly ? "time-outline" : "navigate-outline"}
                  size={13}
                  color={isHourly ? "#1a1208" : palette.muted}
                />
                <Text style={[styles.modeBadgeText, isHourly && styles.modeBadgeTextHourly]}>
                  {isHourly ? `Hourly · ${hourlyDuration} hours` : "Distance"}
                </Text>
              </View>
            </View>
          ) : null}
          <View style={styles.routeBlock}>
            <View style={styles.routeRail}>
              <View style={styles.routeDotStart} />
              <View style={styles.routeLine} />
              {stopList.map((_, i) => (
                <View key={`rail-stop-${i}`}>
                  <View style={styles.routeDotStop} />
                  <View style={styles.routeLine} />
                </View>
              ))}
              <View style={[styles.routeDotEnd, isAsDirected && styles.routeDotAsDirected]} />
            </View>
            <View style={styles.routeCopy}>
              <View style={styles.routeItem}>
                <Text style={styles.routeLabel}>Pickup</Text>
                <Text style={styles.routeValue}>{draft.pickupAddress || "—"}</Text>
              </View>
              {stopList.map((addr, i) => (
                <View key={`stop-item-${i}`} style={styles.routeItem}>
                  <Text style={styles.routeLabel}>
                    {stopList.length > 1 ? `Stop ${i + 1}` : "Stop"}
                  </Text>
                  <Text style={styles.routeValue}>{addr}</Text>
                </View>
              ))}
              <View style={styles.routeItem}>
                <Text style={styles.routeLabel}>Drop-off</Text>
                <Text
                  style={[styles.routeValue, isAsDirected && styles.routeValueMuted]}
                >
                  {isAsDirected ? "As directed by you" : dropoffDisplay}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Ionicons name="car-outline" size={15} color={palette.muted} />
              <View style={styles.metaTextWrap}>
                <Text style={styles.metaLabel}>Vehicle</Text>
                <Text style={styles.metaValue} numberOfLines={2}>
                  {draft.vehicle || "—"}
                </Text>
              </View>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={15} color={palette.muted} />
              <View style={styles.metaTextWrap}>
                <Text style={styles.metaLabel}>Date & time</Text>
                <Text style={styles.metaValue} numberOfLines={2}>
                  {dateTimeSummary}
                </Text>
              </View>
            </View>
            {isHourly ? (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={15} color={palette.muted} />
                <View style={styles.metaTextWrap}>
                  <Text style={styles.metaLabel}>Duration</Text>
                  <Text style={styles.metaValue}>{hourlyDuration} hours</Text>
                </View>
              </View>
            ) : null}
            <View style={styles.metaItem}>
              <Ionicons name={isParcel ? "cube-outline" : "people-outline"} size={15} color={palette.muted} />
              <View style={styles.metaTextWrap}>
                <Text style={styles.metaLabel}>{isParcel ? "Service" : "Passengers"}</Text>
                <Text style={styles.metaValue}>
                  {isParcel ? "Parcel Delivery" : draft.passengers || "1"}
                </Text>
              </View>
            </View>
            {isParcel && (draft.recipientName || draft.recipientPhone) ? (
              <View style={styles.metaItem}>
                <Ionicons name="person-outline" size={15} color={palette.muted} />
                <View style={styles.metaTextWrap}>
                  <Text style={styles.metaLabel}>Recipient</Text>
                  <Text style={styles.metaValue} numberOfLines={2}>
                    {[draft.recipientName, draft.recipientPhone].filter(Boolean).join(" · ")}
                  </Text>
                </View>
              </View>
            ) : null}
            {isParcel && draft.parcelWeight?.trim() ? (
              <View style={styles.metaItem}>
                <Ionicons name="scale-outline" size={15} color={palette.muted} />
                <View style={styles.metaTextWrap}>
                  <Text style={styles.metaLabel}>Weight</Text>
                  <Text style={styles.metaValue}>{draft.parcelWeight}</Text>
                </View>
              </View>
            ) : null}
            {isParcel && draft.parcelNote?.trim() ? (
              <View style={styles.metaItem}>
                <Ionicons name="document-text-outline" size={15} color={palette.muted} />
                <View style={styles.metaTextWrap}>
                  <Text style={styles.metaLabel}>Package note</Text>
                  <Text style={styles.metaValue} numberOfLines={3}>
                    {draft.parcelNote}
                  </Text>
                </View>
              </View>
            ) : null}
            {!isParcel && childSeats > 0 ? (
              <View style={styles.metaItem}>
                <Ionicons name="happy-outline" size={15} color={palette.muted} />
                <View style={styles.metaTextWrap}>
                  <Text style={styles.metaLabel}>Child seats</Text>
                  <Text style={styles.metaValue}>{childSeats}</Text>
                </View>
              </View>
            ) : null}
            {!isParcel && (draft.airline || draft.flightNumber) ? (
              <View style={styles.metaItem}>
                <Ionicons name="airplane-outline" size={15} color={palette.muted} />
                <View style={styles.metaTextWrap}>
                  <Text style={styles.metaLabel}>Flight</Text>
                  <Text style={styles.metaValue} numberOfLines={2}>
                    {[draft.airline, draft.flightNumber].filter(Boolean).join(" · ")}
                    {draft.flightNote ? ` · ${draft.flightNote}` : ""}
                  </Text>
                </View>
              </View>
            ) : null}
            {!isParcel && meetGreet ? (
              <View style={styles.metaItem}>
                <Ionicons name="hand-left-outline" size={15} color={palette.muted} />
                <View style={styles.metaTextWrap}>
                  <Text style={styles.metaLabel}>Meet & Greet</Text>
                  <Text style={styles.metaValue}>Yes</Text>
                </View>
              </View>
            ) : null}
          </View>

          {!isHourly && (draft.distanceText || draft.durationText) ? (
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
          ) : null}
        </View>

        <View style={styles.card}>
          <TouchableOpacity
            style={styles.fareSummaryHeader}
            onPress={() => setFareSummaryOpen((o) => !o)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityState={{ expanded: fareSummaryOpen }}
            accessibilityLabel="Fare summary"
          >
            <View style={styles.fareSummaryHeaderLeft}>
              <Text style={styles.fareSummaryHeaderTitle}>Fare summary</Text>
              {!fareSummaryOpen ? (
                <Text style={styles.fareSummaryHeaderHint}>Tap for breakdown</Text>
              ) : null}
            </View>
            <View style={styles.fareSummaryHeaderRight}>
              <Text style={styles.fareSummaryHeaderTotal}>${fare.total.toFixed(2)}</Text>
              <Ionicons
                name={fareSummaryOpen ? "chevron-up" : "chevron-down"}
                size={18}
                color={palette.muted}
              />
            </View>
          </TouchableOpacity>

          {fareSummaryOpen ? (
            <View style={styles.fareSummaryBody}>
              {isHourly ? (
                <View style={styles.fareRow}>
                  <Text style={styles.fareLabel}>Hourly</Text>
                  <Text style={styles.fareValue}>
                    ${hourlyRate.toFixed(2)}/hr × {hourlyDuration}h
                  </Text>
                </View>
              ) : fare.km > 0 ? (
                <View style={styles.fareRow}>
                  <Text style={styles.fareLabel}>Distance</Text>
                  <Text style={styles.fareValue}>
                    {draft.distanceText || `${fare.km.toFixed(2)} km`}
                  </Text>
                </View>
              ) : null}
              <View style={styles.fareRow}>
                <Text style={styles.fareLabel}>Ride fare</Text>
                <Text style={styles.fareValue}>${fare.rideFare.toFixed(2)}</Text>
              </View>
              {fare.stopCharge > 0 ? (
                <View style={styles.fareRow}>
                  <Text style={styles.fareLabel}>
                    {stopCount > 1
                      ? `Stops × ${stopCount} ($20 each)`
                      : "Stop charge"}
                  </Text>
                  <Text style={styles.fareValue}>${fare.stopCharge.toFixed(2)}</Text>
                </View>
              ) : null}
              {fare.childSeatCharge > 0 ? (
                <View style={styles.fareRow}>
                  <Text style={styles.fareLabel}>Child seats</Text>
                  <Text style={styles.fareValue}>${fare.childSeatCharge.toFixed(2)}</Text>
                </View>
              ) : null}
              {fare.airportPickupFee > 0 ? (
                <View style={styles.fareRow}>
                  <Text style={styles.fareLabel}>Airport pickup fee</Text>
                  <Text style={styles.fareValue}>${fare.airportPickupFee.toFixed(2)}</Text>
                </View>
              ) : null}
              {(fare.meetGreetCharge || 0) > 0 ? (
                <View style={styles.fareRow}>
                  <Text style={styles.fareLabel}>Meet & Greet</Text>
                  <Text style={styles.fareValue}>${fare.meetGreetCharge.toFixed(2)}</Text>
                </View>
              ) : null}
              <View style={styles.fareRow}>
                <Text style={styles.fareLabel}>Subtotal</Text>
                <Text style={styles.fareValue}>${fare.subtotal.toFixed(2)}</Text>
              </View>

              {referralAvailable ? (
                <View style={styles.promoBlock}>
                  <TouchableOpacity
                    style={styles.referralToggleRow}
                    onPress={() =>
                      useReferralCredit ? disableReferralCredit() : enableReferralCredit()
                    }
                    activeOpacity={0.85}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.promoLabel}>Referral credit</Text>
                      <Text style={styles.promoHint}>
                        One-time −${referralAmount.toFixed(0)} (cannot combine with promo)
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.referralToggle,
                        useReferralCredit && styles.referralToggleOn,
                      ]}
                    >
                      <Ionicons
                        name={useReferralCredit ? "checkmark" : "add"}
                        size={16}
                        color={useReferralCredit ? "#fff" : palette.muted}
                      />
                    </View>
                  </TouchableOpacity>
                </View>
              ) : null}

              {!useReferralCredit ? (
                <View style={styles.promoBlock}>
                  <Text style={styles.promoLabel}>Promo code</Text>
                  {promoHint && !appliedPromoCode ? (
                    <Text style={styles.promoHint}>{promoHint}</Text>
                  ) : null}
                  {appliedPromoCode ? (
                    <View style={styles.promoAppliedRow}>
                      <View style={styles.promoChip}>
                        <Ionicons
                          name="pricetag"
                          size={14}
                          color={isDark ? "#4ADE80" : "#166534"}
                        />
                        <Text style={styles.promoChipText}>{appliedPromoCode}</Text>
                      </View>
                      <TouchableOpacity onPress={handleClearPromo} hitSlop={10}>
                        <Text style={styles.promoRemove}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.promoInputRow}>
                      <TextInput
                        style={styles.promoInput}
                        value={promoInput}
                        onChangeText={(t) => {
                          setPromoInput(t.toUpperCase());
                          if (promoError) setPromoError("");
                        }}
                        placeholder="Enter code"
                        placeholderTextColor={palette.muted}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        editable={!promoBusy}
                      />
                      <TouchableOpacity
                        style={[styles.promoApplyBtn, promoBusy && { opacity: 0.6 }]}
                        onPress={() => void handleApplyPromo()}
                        disabled={promoBusy}
                      >
                        {promoBusy ? (
                          <ActivityIndicator size="small" color={isDark ? "#1A1208" : "#fff"} />
                        ) : (
                          <Text style={styles.promoApplyText}>Apply</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                  {promoError ? <Text style={styles.promoError}>{promoError}</Text> : null}
                </View>
              ) : null}

              {(fare.discountAmount || 0) > 0 ? (
                <View style={styles.fareRow}>
                  <Text
                    style={[
                      styles.fareLabel,
                      { color: isDark ? "#4ADE80" : "#166534" },
                    ]}
                  >
                    {useReferralCredit
                      ? "Referral credit"
                      : `Discount${appliedPromoCode ? ` (${appliedPromoCode})` : ""}`}
                  </Text>
                  <Text
                    style={[
                      styles.fareValue,
                      { color: isDark ? "#4ADE80" : "#166534" },
                    ]}
                  >
                    −${(fare.discountAmount || 0).toFixed(2)}
                  </Text>
                </View>
              ) : null}

              <View style={styles.fareRow}>
                <Text style={styles.fareLabel}>HST (13%)</Text>
                <Text style={styles.fareValue}>${fare.hst.toFixed(2)}</Text>
              </View>

              <TouchableOpacity
                style={styles.tipEntryRow}
                onPress={() => setTipModalOpen(true)}
                activeOpacity={0.85}
              >
                <View style={styles.tipEntryLeft}>
                  <View style={styles.tipEntryIcon}>
                    <Ionicons name="heart-outline" size={18} color={palette.text} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.tipEntryTitle}>Add tip</Text>
                    <Text style={styles.tipEntrySub} numberOfLines={1}>
                      {gratuityPercent > 0
                        ? `${gratuityPercent}%`
                        : "Choose a tip for your chauffeur"}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={palette.muted} />
              </TouchableOpacity>

              {gratuityPercent > 0 ? (
                <View style={styles.fareRow}>
                  <Text style={styles.fareLabel}>Tip ({gratuityPercent}%)</Text>
                  <Text style={styles.fareValue}>${fare.gratuity.toFixed(2)}</Text>
                </View>
              ) : null}
              <View style={[styles.fareRow, styles.fareTotalRow]}>
                <Text style={styles.fareTotalLabel}>Estimated total</Text>
                <Text style={styles.fareTotalValue}>${fare.total.toFixed(2)}</Text>
              </View>
            </View>
          ) : null}
        </View>

        {(guestName || draft.email || draft.phoneNumber) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {draft.rideFor === "child"
                ? "Child passenger"
                : draft.rideFor === "someone"
                  ? "Passenger"
                  : "Rider"}
            </Text>
            {guestName ? <Text style={styles.guestName}>{guestName}</Text> : null}
            {draft.rideFor === "child" && draft.childAge ? (
              <Text style={styles.guestDetail}>Age {draft.childAge}</Text>
            ) : null}
            {draft.phoneNumber ? (
              <Text style={styles.guestDetail}>
                {draft.rideFor === "child"
                  ? `Guardian · ${draft.phoneNumber}`
                  : draft.phoneNumber}
              </Text>
            ) : null}
            {draft.rideFor === "me" && draft.email ? (
              <Text style={styles.guestDetail}>{draft.email}</Text>
            ) : null}
            {draft.rideFor === "someone" || draft.rideFor === "child" ? (
              <View style={styles.bookerBox}>
                <Text style={styles.bookerLabel}>
                  {draft.rideFor === "child" ? "Booked by parent / guardian" : "Booked by you"}
                </Text>
                {draft.bookerName ? (
                  <Text style={styles.guestDetail}>{draft.bookerName}</Text>
                ) : null}
                {draft.bookerEmail || draft.email ? (
                  <Text style={styles.guestDetail}>{draft.bookerEmail || draft.email}</Text>
                ) : null}
              </View>
            ) : null}
            {draft.rideFor === "child" ? (
              <Text style={styles.childShareHint}>
                After booking, use Share trip status so family can follow the live ride link.
              </Text>
            ) : null}
          </View>
        )}

        <View style={[styles.card, !APP_PAYMENTS_ENABLED && styles.paymentDisabledCard]}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.cardTitle, !APP_PAYMENTS_ENABLED && styles.paymentDisabledText]}>
              Payment
            </Text>
            <View
              style={[
                styles.secureBadge,
                !APP_PAYMENTS_ENABLED && styles.paymentDisabledBadge,
              ]}
            >
              <Ionicons
                name={APP_PAYMENTS_ENABLED ? "lock-closed-outline" : "ban-outline"}
                size={11}
                color={APP_PAYMENTS_ENABLED ? "#2e7d32" : palette.muted}
              />
              <Text
                style={[
                  styles.secureBadgeText,
                  !APP_PAYMENTS_ENABLED && styles.paymentDisabledBadgeText,
                ]}
              >
                {APP_PAYMENTS_ENABLED ? "Pay securely" : "Unavailable"}
              </Text>
            </View>
          </View>
          <Text
            style={[styles.paymentAmount, !APP_PAYMENTS_ENABLED && styles.paymentDisabledText]}
          >
            ${fare.total.toFixed(2)} CAD
          </Text>
          <Text style={styles.paymentNote}>
            {APP_PAYMENTS_ENABLED
              ? "Your card is charged now for the fare, tax, and tip shown above. Cards are encrypted by Stripe — SARJ never sees your full card number. You will receive a receipt after payment."
              : "Card checkout is temporarily disabled for testing. Your reservation will be created without charging a card."}
          </Text>
          {APP_PAYMENTS_ENABLED ? (
            <View style={styles.paymentTrustRow}>
              <Ionicons name="shield-checkmark-outline" size={14} color="#2e7d32" />
              <Text style={styles.paymentTrustText}>Secured by Stripe · PCI compliant</Text>
            </View>
          ) : null}
          {APP_PAYMENTS_ENABLED ? (
            <Pressable
              onPress={() => router.push("/customer/payment-methods")}
              style={styles.manageCardsBtn}
              hitSlop={6}
            >
              <Ionicons name="wallet-outline" size={14} color={palette.text} />
              <Text style={styles.manageCardsText}>Manage saved cards</Text>
              <Ionicons name="chevron-forward" size={14} color={palette.muted} />
            </Pressable>
          ) : null}
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
            {termsAccepted && (
              <Ionicons name="checkmark" size={13} color={isDark ? "#1A1208" : "#fff"} />
            )}
          </View>
          <Text style={styles.termsText}>
            I agree to the{" "}
            <Text
              style={styles.termsLink}
              onPress={() =>
                router.push({ pathname: "/legal-doc", params: { doc: "terms" } })
              }
            >
              Terms of Service
            </Text>
            ,{" "}
            <Text
              style={styles.termsLink}
              onPress={() =>
                router.push({ pathname: "/legal-doc", params: { doc: "privacy" } })
              }
            >
              Privacy Policy
            </Text>{" "}
            &{" "}
            <Text
              style={styles.termsLink}
              onPress={() =>
                router.push({ pathname: "/legal-doc", params: { doc: "refund" } })
              }
            >
              Cancellation Policy
            </Text>
          </Text>
        </TouchableOpacity>

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.bottomTotal}>
          <Text style={styles.bottomTotalLabel}>
            {APP_PAYMENTS_ENABLED ? "Total due" : "Estimated total"}
          </Text>
          <Text style={styles.bottomTotalValue}>${fare.total.toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
          activeOpacity={0.9}
          disabled={isSubmitting}
          onPress={handleSubmit}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#1A1208" size="small" />
          ) : (
            <Text style={styles.submitBtnText}>
              {APP_PAYMENTS_ENABLED ? "Pay & confirm" : "Submit reservation"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={tipModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setTipModalOpen(false)}
        statusBarTranslucent
      >
        <View style={styles.tipModalRoot}>
          <Pressable style={styles.tipModalBackdrop} onPress={() => setTipModalOpen(false)} />
          <View
            style={[
              styles.tipModalSheet,
              { paddingBottom: Math.max(insets.bottom, 16) + 8 },
            ]}
          >
            <View style={styles.tipModalHandle} />
            <Text style={styles.tipModalTitle}>Add a tip</Text>

            <View style={styles.tipModalOptions}>
              {APP_GRATUITY_PERCENTS.map((pct) => {
                const selected = gratuityPercent === pct;
                return (
                  <TouchableOpacity
                    key={pct}
                    style={[styles.tipModalOption, selected && styles.tipModalOptionActive]}
                    onPress={() => {
                      setGratuityPercent(pct);
                      setTipModalOpen(false);
                    }}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.tipModalOptionPct,
                        selected && styles.tipModalOptionPctActive,
                      ]}
                    >
                      {pct}%
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.tipModalNoTip}
              onPress={() => {
                setGratuityPercent(0);
                setTipModalOpen(false);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.tipModalNoTipText}>No tip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      </SafeAreaView>
    </View>
  );
}

function makeStyles(palette: DriverPalette, isDark: boolean) {
  const card = isDark ? palette.cardAndroid : "#fff";
  const fieldBg = isDark ? palette.metaChipBg : "#fff";
  const primaryBtnBg = isDark ? GOLD : "#0f172a";
  const primaryBtnText = isDark ? "#1A1208" : "#fff";
  return StyleSheet.create({
  root: { flex: 1 },
  ambientGlow: {
    position: "absolute",
    top: -40,
    left: -20,
    right: -20,
    height: 220,
  },
  safe: { flex: 1, backgroundColor: "transparent" },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  backBtn: { flexDirection: "row", alignItems: "center" },
  backText: { fontSize: 15, color: palette.text, marginLeft: 2 },
  headerTitle: { fontSize: 16, fontWeight: "600", color: palette.text },
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
    backgroundColor: isDark ? GOLD : "#0f172a",
    justifyContent: "center",
    alignItems: "center",
  },
  stepLine: { width: 120, height: 2, backgroundColor: isDark ? GOLD : "#0f172a" },
  stepCurrent: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: isDark ? GOLD : "#0f172a",
    backgroundColor: card,
    justifyContent: "center",
    alignItems: "center",
  },
  stepCurrentText: { fontSize: 12, fontWeight: "700", color: palette.text },
  pageTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: palette.text,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  pageSubtitle: { fontSize: 14, color: palette.muted, marginBottom: 18, lineHeight: 20 },
  card: {
    backgroundColor: card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: palette.border,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: palette.text, marginBottom: 10 },
  modeBadgeRow: {
    marginBottom: 12,
  },
  modeBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: fieldBg,
  },
  modeBadgeHourly: {
    backgroundColor: "#F5E6C8",
  },
  modeBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: palette.muted,
    letterSpacing: 0.2,
  },
  modeBadgeTextHourly: {
    color: "#1a1208",
    fontWeight: "700",
  },
  routeBlock: { flexDirection: "row", marginBottom: 14 },
  routeRail: { width: 16, alignItems: "center", paddingTop: 4 },
  routeDotStart: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.text,
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
    backgroundColor: palette.text,
  },
  routeDotAsDirected: {
    borderRadius: 5,
    backgroundColor: "#C9A063",
  },
  routeLine: { width: 2, flex: 1, backgroundColor: palette.border, marginVertical: 4 },
  routeCopy: { flex: 1, paddingLeft: 10, gap: 12 },
  routeItem: {},
  routeLabel: { fontSize: 11, fontWeight: "600", color: palette.muted, marginBottom: 2 },
  routeValue: { fontSize: 14, color: palette.text, lineHeight: 20 },
  routeValueMuted: {
    color: palette.muted,
    fontStyle: "italic",
    fontWeight: "500",
  },
  metaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metaItem: {
    width: "47%",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: fieldBg,
    borderRadius: 10,
    padding: 10,
  },
  metaTextWrap: { flex: 1 },
  metaLabel: { fontSize: 11, color: palette.muted, marginBottom: 2 },
  metaValue: { fontSize: 13, fontWeight: "600", color: palette.text },
  routeStats: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  routeStatText: { fontSize: 13, color: palette.muted, fontWeight: "500" },
  routeStatDot: { marginHorizontal: 6, color: palette.muted },
  fareRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  fareSummaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minHeight: 44,
  },
  fareSummaryHeaderLeft: {
    flex: 1,
    minWidth: 0,
  },
  fareSummaryHeaderTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: palette.text,
  },
  fareSummaryHeaderHint: {
    marginTop: 2,
    fontSize: 12,
    color: palette.muted,
    fontWeight: "500",
  },
  fareSummaryHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  fareSummaryHeaderTotal: {
    fontSize: 16,
    fontWeight: "700",
    color: palette.text,
    fontVariant: ["tabular-nums"],
  },
  fareSummaryBody: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
  },
  fareLabel: { fontSize: 13, color: palette.muted },
  fareValue: { fontSize: 13, fontWeight: "600", color: palette.text },
  promoBlock: {
    marginTop: 4,
    marginBottom: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
  },
  referralToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  referralToggle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: palette.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: fieldBg,
  },
  referralToggleOn: {
    backgroundColor: "#166534",
    borderColor: "#166534",
  },
  promoLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: palette.muted,
    marginBottom: 8,
  },
  promoHint: {
    fontSize: 12,
    color: "#A87830",
    marginBottom: 8,
    lineHeight: 16,
  },
  promoInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  promoInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 11 : 8,
    fontSize: 14,
    fontWeight: "600",
    color: palette.text,
    letterSpacing: 0.6,
    backgroundColor: fieldBg,
  },
  promoApplyBtn: {
    backgroundColor: primaryBtnBg,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
    minWidth: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  promoApplyText: { color: primaryBtnText, fontSize: 13, fontWeight: "700" },
  promoAppliedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  promoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: isDark ? "rgba(74,222,128,0.14)" : "#dcfce7",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  promoChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: isDark ? "#4ADE80" : "#166534",
  },
  promoRemove: { fontSize: 13, fontWeight: "600", color: palette.muted },
  promoError: { marginTop: 6, fontSize: 12, color: "#b91c1c" },
  fareTotalRow: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  fareTotalLabel: { fontSize: 15, fontWeight: "700", color: palette.text },
  fareTotalValue: { fontSize: 16, fontWeight: "700", color: palette.text },
  tipEntryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 10,
    marginBottom: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: fieldBg,
    borderWidth: 1,
    borderColor: palette.border,
  },
  tipEntryLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
  },
  tipEntryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: palette.border,
  },
  tipEntryTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: palette.text,
  },
  tipEntrySub: {
    marginTop: 2,
    fontSize: 12,
    color: palette.muted,
  },
  tipModalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  tipModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  tipModalSheet: {
    backgroundColor: card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    zIndex: 2,
  },
  tipModalHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.border,
    marginBottom: 14,
  },
  tipModalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: palette.text,
    letterSpacing: -0.3,
    marginBottom: 20,
  },
  tipModalOptions: {
    flexDirection: "row",
    gap: 10,
  },
  tipModalOption: {
    flex: 1,
    minHeight: 72,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: palette.border,
    backgroundColor: fieldBg,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  tipModalOptionActive: {
    borderColor: primaryBtnBg,
    backgroundColor: primaryBtnBg,
  },
  tipModalOptionPct: {
    fontSize: 22,
    fontWeight: "700",
    color: palette.text,
  },
  tipModalOptionPctActive: {
    color: primaryBtnText,
  },
  tipModalNoTip: {
    marginTop: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  tipModalNoTipText: {
    fontSize: 15,
    fontWeight: "600",
    color: palette.muted,
  },
  guestName: { fontSize: 15, fontWeight: "600", color: palette.text, marginBottom: 4 },
  guestDetail: { fontSize: 13, color: palette.muted, marginBottom: 2 },
  bookerBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
  },
  bookerLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: isDark ? GOLD : palette.hintBold,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  childShareHint: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 17,
    color: palette.muted,
  },
  secureBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#e8f5e9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
  },
  secureBadgeText: { fontSize: 11, fontWeight: "600", color: "#2e7d32" },
  paymentDisabledCard: {
    opacity: 0.72,
    backgroundColor: fieldBg,
  },
  paymentDisabledBadge: {
    backgroundColor: palette.border,
  },
  paymentDisabledBadgeText: {
    color: palette.muted,
  },
  paymentDisabledText: {
    color: palette.muted,
  },
  paymentAmount: {
    fontSize: 22,
    fontWeight: "700",
    color: palette.text,
    marginBottom: 8,
  },
  paymentNote: { fontSize: 13, color: palette.muted, lineHeight: 19 },
  paymentTrustRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
  paymentTrustText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2e7d32",
  },
  manageCardsBtn: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: fieldBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  manageCardsText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: palette.text,
  },
  notesCard: {
    backgroundColor: fieldBg,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: palette.border,
  },
  notesTitle: { fontSize: 13, fontWeight: "700", color: palette.text, marginBottom: 6 },
  notesLine: { fontSize: 12, color: palette.muted, marginBottom: 2 },
  termsRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 8 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: palette.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: isDark ? GOLD : "#0f172a",
    borderColor: isDark ? GOLD : "#0f172a",
  },
  termsText: { flex: 1, fontSize: 13, color: palette.muted, lineHeight: 19 },
  termsLink: { color: palette.text, fontWeight: "600", textDecorationLine: "underline" },
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
    backgroundColor: card,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  bottomTotal: { flex: 1 },
  bottomTotalLabel: { fontSize: 12, color: palette.muted },
  bottomTotalValue: { fontSize: 20, fontWeight: "700", color: palette.text },
  submitBtn: {
    backgroundColor: GOLD,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    minWidth: 160,
    alignItems: "center",
  },
  submitBtnDisabled: {
    backgroundColor: isDark ? "rgba(212,160,74,0.28)" : "rgba(212,160,74,0.4)",
    opacity: 1,
  },
  submitBtnText: { color: "#1A1208", fontSize: 15, fontWeight: "700" },
});
}
