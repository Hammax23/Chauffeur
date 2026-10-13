import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { router, useNavigation, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { usePaymentSheet, useStripe } from "@stripe/stripe-react-native";
import {
  createReservation,
  createCustomerPaymentIntent,
  validatePromoCode,
  getActiveAppPromotions,
  getReferralStatus,
  getCustomerPaymentMethods,
  type SavedPaymentMethod,
} from "../../services/api";
import {
  clearBookingDraft,
  loadBookingDraft,
  saveBookingDraft,
  type BookingDraft,
} from "../../services/booking-draft";
import { RidePreferencesSheet } from "../../components/RidePreferencesSheet";
import {
  DEFAULT_RIDE_PREFS,
  formatRidePrefsRequirements,
  mergeSpecialRequirements,
  normalizeRidePrefs,
  type RidePrefs,
} from "../../utils/ride-prefs";
import { resetToReservationConfirmed } from "../../utils/booking-nav-reset";
import {
  APP_DEFAULT_GRATUITY_PERCENT,
  APP_GRATUITY_PERCENTS,
  applyPromoDiscount,
  calculateAppDistanceFare,
  calculateAppHourlyFare,
  parseVehicleCount,
  scaleFareForVehicleCount,
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
import {
  SavedCardPicker,
  brandLabel,
} from "../../components/SavedCardPicker";

/**
 * Uber-style checkout: charge selected saved card; PaymentSheet for new card / wallets.
 * Search: APP_PAYMENTS_ENABLED
 */
const APP_PAYMENTS_ENABLED = true;
const STRIPE_RETURN_URL = "sarjworldwide://stripe-redirect";

export default function ReservationConfirmScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { palette, isDark } = useCustomerTheme();
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [ready, setReady] = useState(false);
  const [gratuityPercent, setGratuityPercent] = useState<number>(APP_DEFAULT_GRATUITY_PERCENT);
  const [tipModalOpen, setTipModalOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [ridePrefs, setRidePrefs] = useState<RidePrefs>(DEFAULT_RIDE_PREFS);
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
  const [savedCards, setSavedCards] = useState<SavedPaymentMethod[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [cardsError, setCardsError] = useState<string | null>(null);
  const fareErrorShownRef = useRef(false);
  const pendingPromoTriedRef = useRef(false);
  const { initPaymentSheet, presentPaymentSheet } = usePaymentSheet();
  const { handleNextAction } = useStripe();

  const savedCardsCountRef = useRef(0);
  savedCardsCountRef.current = savedCards.length;

  const reloadSavedCards = useCallback(async (opts?: { force?: boolean }) => {
    if (!APP_PAYMENTS_ENABLED) return;
    const force = opts?.force === true;
    const hadCards = savedCardsCountRef.current > 0;
    if (!hadCards) {
      setCardsLoading(true);
      setCardsError(null);
    }
    try {
      const res = await getCustomerPaymentMethods({ force });
      if (!res.success) {
        // Keep whatever we already showed — don't flash a hard error over a good list.
        if (!hadCards) {
          setCardsError(res.error || "Could not load cards");
        }
        return;
      }
      const list = res.paymentMethods || [];
      setCardsError(null);
      setSavedCards(list);
      setSelectedCardId((prev) => {
        if (prev && list.some((c) => c.id === prev)) return prev;
        return list.find((c) => c.isDefault)?.id || list[0]?.id || null;
      });
    } catch (e) {
      if (!hadCards) {
        setCardsError(e instanceof Error ? e.message : "Could not load cards");
      }
    } finally {
      setCardsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reloadSavedCards();
    }, [reloadSavedCards])
  );

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
      setRidePrefs(normalizeRidePrefs(loaded.ridePrefs));
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
  const vehicleCount = parseVehicleCount(
    isParcelServiceType(draft?.serviceType) ? 1 : draft?.vehicleCount
  );

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
    base = scaleFareForVehicleCount(base, vehicleCount);
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
    vehicleCount,
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
    `${draft?.serviceDate || ""} Â· ${draft?.serviceTime || ""}`;

  const guestName = [draft?.firstName, draft?.lastName].filter(Boolean).join(" ").trim();
  const isParcel = isParcelServiceType(draft?.serviceType);
  const dropoffDisplay =
    draft?.dropoffAddress?.trim() || (isHourly ? "As directed" : "â€”");
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
        vehicleCount: vehicleCount > 1 ? vehicleCount : undefined,
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
            vehicleCount: vehicleCount > 1 ? vehicleCount : undefined,
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
          setPromoHint(`Offer available â€” use ${first.code} below`);
        }
      } catch {
        /* ignore */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once when fare first ready
  }, [ready, draft, fare]);

  const handleSubmit = async (prefsOverride?: RidePrefs) => {
    if (!draft || !fare) return;
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
        let base: string | undefined;
        if (draft.rideFor === "child") {
          const booker =
            draft.bookerName?.trim() ||
            [draft.bookerEmail, draft.bookerPhone].filter(Boolean).join(" · ") ||
            "account holder";
          const age = draft.childAge?.trim();
          base = [
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
        } else if (draft.rideFor === "someone" && draft.bookerName) {
          base = `Passenger booked by: ${draft.bookerName}${
            draft.bookerPhone ? ` · ${draft.bookerPhone}` : ""
          }`;
        }
        const prefs = normalizeRidePrefs(
          prefsOverride ?? draft.ridePrefs ?? ridePrefs
        );
        let notes = mergeSpecialRequirements(
          base,
          formatRidePrefsRequirements(prefs)
        );
        if (vehicleCount > 1) {
          notes = mergeSpecialRequirements(
            notes,
            `Vehicles: ${vehicleCount} × ${draft.vehicle || "vehicle"}`
          );
        }
        return notes;
      })();

      let stripePaymentIntentId: string | undefined;
      let stripePaymentMethodId: string | undefined;
      let stripeCustomerId: string | undefined;
      let cardType: string | undefined;
      let cardLast4: string | undefined;

      if (APP_PAYMENTS_ENABLED) {
        const farePayload = {
          vehicle: draft.vehicle,
          vehicleId: draft.vehicleId,
          vehicleCount: vehicleCount > 1 ? vehicleCount : undefined,
          childSeats,
          pickupLocation: draft.pickupAddress,
          stops: stopsPayload,
          distanceMeters: isHourly ? undefined : distanceMeters,
          gratuityPercent: fare.gratuityPercent,
          email: draft.email,
          bookingMode: (isHourly ? "hourly" : "distance") as "hourly" | "distance",
          hourlyDuration: isHourly ? hourlyDuration : undefined,
          meetGreet: meetGreet || undefined,
          promoCode: useReferralCredit ? undefined : appliedPromoCode || undefined,
          useReferralCredit: useReferralCredit || undefined,
        };

        const selectedCard = savedCards.find((c) => c.id === selectedCardId) || null;
        const useSavedCard = !!selectedCardId && !!selectedCard;

        const intent = await createCustomerPaymentIntent({
          ...farePayload,
          paymentMethodId: useSavedCard ? selectedCardId! : undefined,
        });

        if (!intent.success || !intent.paymentIntentId || !intent.customerId) {
          Alert.alert("Payment", intent.error || "Could not start payment. Please try again.");
          return;
        }

        stripeCustomerId = intent.customerId;

        if (intent.status === "succeeded") {
          stripePaymentIntentId = intent.paymentIntentId;
          stripePaymentMethodId = intent.paymentMethodId || selectedCardId || undefined;
          if (selectedCard) {
            cardType = selectedCard.brand;
            cardLast4 = selectedCard.last4;
          }
        } else if (intent.status === "requires_action" && intent.clientSecret) {
          const { error: nextError, paymentIntent: nextPi } = await handleNextAction(
            intent.clientSecret,
            STRIPE_RETURN_URL
          );
          if (nextError) {
            if (nextError.code !== "Canceled") {
              Alert.alert("Payment", nextError.message || "Card authentication failed.");
            }
            return;
          }
          if (nextPi?.status !== "Succeeded") {
            Alert.alert("Payment", "Payment was not completed. Please try again.");
            return;
          }
          stripePaymentIntentId = intent.paymentIntentId;
          stripePaymentMethodId = intent.paymentMethodId || selectedCardId || undefined;
          if (selectedCard) {
            cardType = selectedCard.brand;
            cardLast4 = selectedCard.last4;
          }
        } else {
          // PaymentSheet: new card / no saved card / wallets
          if (!intent.clientSecret || !intent.ephemeralKeySecret) {
            Alert.alert("Payment", intent.error || "Could not open secure checkout.");
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
            returnURL: STRIPE_RETURN_URL,
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
          void reloadSavedCards({ force: true });
        }
      }

      const result = await createReservation({
        serviceType: draft.serviceType || "Point-to-Point transportation",
        vehicle:
          vehicleCount > 1
            ? `${draft.vehicle} × ${vehicleCount}`
            : draft.vehicle,
        vehicleId: draft.vehicleId,
        passengers: parseInt(draft.passengers || "1", 10),
        childSeats,
        etr407: draft.tollRoute === "Yes" ? "Yes" : "No",
        serviceDate: draft.serviceDate,
        serviceTime: draft.serviceTime,
        pickupLocation: draft.pickupAddress,
        stops: stopsPayload,
        dropoffLocation: dropoffDisplay,
        distance: draft.distanceText || "â€”",
        duration: draft.durationText || "â€”",
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
        stripePaymentMethodId,
        stripeCustomerId,
        cardType,
        cardLast4,
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
  const selectedCard = useMemo(
    () => savedCards.find((c) => c.id === selectedCardId) || null,
    [savedCards, selectedCardId]
  );

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
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backCircle}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={22} color={palette.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Confirm</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Trip â€” Uber compact summary */}
        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>Your trip</Text>
          <View style={styles.chipRow}>
            <View style={styles.chip}>
              <Ionicons name="calendar-outline" size={13} color={GOLD} />
              <Text style={styles.chipText} numberOfLines={1}>
                {dateTimeSummary}
              </Text>
            </View>
            <View style={styles.chip}>
              <Ionicons name="car-sport-outline" size={13} color={GOLD} />
              <Text style={styles.chipText} numberOfLines={1}>
                {vehicleCount > 1
                  ? `${vehicleCount} vehicles · ${draft.vehicle || "Vehicle"}`
                  : draft.vehicle || "Vehicle"}
              </Text>
            </View>
            {isHourly ? (
              <View style={styles.chip}>
                <Ionicons name="time-outline" size={13} color={GOLD} />
                <Text style={styles.chipText}>{hourlyDuration}h</Text>
              </View>
            ) : draft.distanceText || draft.durationText ? (
              <View style={styles.chip}>
                <Ionicons name="navigate-outline" size={13} color={GOLD} />
                <Text style={styles.chipText} numberOfLines={1}>
                  {[draft.distanceText, draft.durationText].filter(Boolean).join(" Â· ")}
                </Text>
              </View>
            ) : null}
          </View>

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
                <Text style={styles.routeValue}>{draft.pickupAddress || "â€”"}</Text>
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

          {(isParcel ||
            childSeats > 0 ||
            meetGreet ||
            draft.airline ||
            draft.flightNumber ||
            (draft.passengers && draft.passengers !== "1")) && (
            <View style={styles.metaPills}>
              {!isParcel ? (
                <Text style={styles.metaPill}>
                  {draft.passengers || "1"} passenger
                  {(parseInt(draft.passengers || "1", 10) || 1) === 1 ? "" : "s"}
                </Text>
              ) : (
                <Text style={styles.metaPill}>Parcel</Text>
              )}
              {childSeats > 0 ? (
                <Text style={styles.metaPill}>{childSeats} child seat{childSeats > 1 ? "s" : ""}</Text>
              ) : null}
              {meetGreet ? <Text style={styles.metaPill}>Meet & Greet</Text> : null}
              {draft.airline || draft.flightNumber ? (
                <Text style={styles.metaPill} numberOfLines={1}>
                  {[draft.airline, draft.flightNumber].filter(Boolean).join(" ")}
                </Text>
              ) : null}
              {isParcel && draft.recipientName ? (
                <Text style={styles.metaPill} numberOfLines={1}>
                  To {draft.recipientName}
                </Text>
              ) : null}
            </View>
          )}
        </View>

        {/* Payment — screenshot-matched block */}
        <View style={[styles.paymentSection, !APP_PAYMENTS_ENABLED && styles.paymentDisabledCard]}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.paymentSectionTitle}>Payment</Text>
            {APP_PAYMENTS_ENABLED ? (
              <View style={styles.encryptedBadge}>
                <Ionicons name="lock-closed" size={12} color="#1A5319" />
                <Text style={styles.encryptedBadgeText}>Encrypted</Text>
              </View>
            ) : null}
          </View>
          {APP_PAYMENTS_ENABLED ? (
            <SavedCardPicker
              cards={savedCards}
              selectedId={selectedCardId}
              onSelect={setSelectedCardId}
              onAddCard={() => router.push("/customer/payment-methods")}
              loading={cardsLoading}
              disabled={isSubmitting}
              error={cardsError}
              textColor={isDark ? palette.text : "#000000"}
              mutedColor={isDark ? palette.muted : "#6B6B6B"}
              borderColor={palette.border}
              isDark={isDark}
            />
          ) : (
            <Text style={styles.paymentNote}>
              Card checkout is temporarily unavailable.
            </Text>
          )}
        </View>

        {/* Fare + tip + promo — Uber-style expandable */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.fareSummaryHeader}
            onPress={() => setFareSummaryOpen((o) => !o)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityState={{ expanded: fareSummaryOpen }}
            accessibilityLabel="Fare details"
          >
            <View style={styles.fareSummaryHeaderLeft}>
              <Text style={styles.sectionTitle}>Total</Text>
              <Text style={styles.fareSummaryHeaderHint}>
                {fareSummaryOpen ? "Hide breakdown" : "Tap for details · tip & promo"}
              </Text>
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

          <TouchableOpacity
            style={styles.tipQuickRow}
            onPress={() => setTipModalOpen(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="heart" size={16} color={GOLD} />
            <Text style={styles.tipQuickText}>
              {gratuityPercent > 0
                ? `Tip ${gratuityPercent}% Â· $${fare.gratuity.toFixed(2)}`
                : "Add a tip for your chauffeur"}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={palette.muted} />
          </TouchableOpacity>

          {fareSummaryOpen ? (
            <View style={styles.fareSummaryBody}>
              {isHourly ? (
                <View style={styles.fareRow}>
                  <Text style={styles.fareLabel}>Hourly</Text>
                  <Text style={styles.fareValue}>
                    ${hourlyRate.toFixed(2)}/hr Ã— {hourlyDuration}h
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
                      ? `Stops Ã— ${stopCount} ($20 each)`
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
                        One-time âˆ’${referralAmount.toFixed(0)} (cannot combine with promo)
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
                    âˆ’${(fare.discountAmount || 0).toFixed(2)}
                  </Text>
                </View>
              ) : null}

              <View style={styles.fareRow}>
                <Text style={styles.fareLabel}>HST (13%)</Text>
                <Text style={styles.fareValue}>${fare.hst.toFixed(2)}</Text>
              </View>
              {gratuityPercent > 0 ? (
                <View style={styles.fareRow}>
                  <Text style={styles.fareLabel}>Tip ({gratuityPercent}%)</Text>
                  <Text style={styles.fareValue}>${fare.gratuity.toFixed(2)}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        {(guestName || draft.email || draft.phoneNumber) && draft.rideFor !== "me" ? (
          <View style={styles.section}>
            <Text style={styles.sectionEyebrow}>
              {draft.rideFor === "child" ? "Child passenger" : "Passenger"}
            </Text>
            {guestName ? <Text style={styles.guestName}>{guestName}</Text> : null}
            {draft.rideFor === "child" && draft.childAge ? (
              <Text style={styles.guestDetail}>Age {draft.childAge}</Text>
            ) : null}
            {draft.phoneNumber ? (
              <Text style={styles.guestDetail}>
                {draft.rideFor === "child"
                  ? `Guardian Â· ${draft.phoneNumber}`
                  : draft.phoneNumber}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* Clear absolute bottom bar (padTop + pill + safe area) — no leftover terms gap */}
        <View
          style={{
            height: 10 + 58 + Math.max(insets.bottom, 10) + 6 + 4,
          }}
        />
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 10) + 6 }]}>
        <TouchableOpacity
          style={[styles.payPill, isSubmitting && styles.payPillDisabled]}
          activeOpacity={0.9}
          disabled={isSubmitting}
          onPress={() => {
            if (isParcel) {
              void handleSubmit();
              return;
            }
            // Stay on Confirm — overlay prefs sheet; create only after Save.
            setPrefsOpen(true);
          }}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <View style={styles.payPillCenter}>
                <Text style={styles.payPillTitle} numberOfLines={1}>
                  {APP_PAYMENTS_ENABLED ? "Confirm & pay" : "Confirm reservation"}
                </Text>
                {APP_PAYMENTS_ENABLED ? (
                  <Text style={styles.payPillSub} numberOfLines={1}>
                    {selectedCard
                      ? `${brandLabel(selectedCard.brand)} •••• ${selectedCard.last4}`
                      : "Add a payment method"}
                  </Text>
                ) : null}
              </View>
              <View style={styles.payArrowChip}>
                <Ionicons name="arrow-forward" size={16} color="#1A1208" />
              </View>
            </>
          )}
        </TouchableOpacity>
      </View>

      <RidePreferencesSheet
        visible={prefsOpen}
        value={ridePrefs}
        onClose={() => setPrefsOpen(false)}
        onSave={(prefs) => {
          const nextPrefs = normalizeRidePrefs(prefs);
          setRidePrefs(nextPrefs);
          setPrefsOpen(false);
          setDraft((prev) => {
            if (!prev) return prev;
            const next = { ...prev, ridePrefs: nextPrefs };
            void saveBookingDraft(next);
            return next;
          });
          // Confirm & Pay → Save: foran pay + create → success
          void handleSubmit(nextPrefs);
        }}
      />

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
  const card = isDark ? palette.cardAndroid : "#FFFFFF";
  const fieldBg = isDark ? palette.metaChipBg : "#F7F5F1";
  const primaryBtnBg = isDark ? GOLD : "#0f172a";
  const primaryBtnText = isDark ? "#1A1208" : "#fff";
  return StyleSheet.create({
    root: { flex: 1 },
    ambientGlow: {
      position: "absolute",
      top: -40,
      left: -20,
      right: -20,
      height: 180,
    },
    safe: { flex: 1, backgroundColor: "transparent" },
    scrollView: { flex: 1 },
    scrollContent: { paddingHorizontal: 18, paddingTop: 4 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 10,
      marginBottom: 8,
    },
    backCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: palette.text,
      letterSpacing: -0.3,
    },
    section: {
      backgroundColor: card,
      borderRadius: 20,
      padding: 16,
      marginBottom: 12,
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOpacity: isDark ? 0.25 : 0.06,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 4 },
        },
        android: { elevation: 2 },
      }),
    },
    sectionEyebrow: {
      fontSize: 12,
      fontWeight: "700",
      color: palette.muted,
      letterSpacing: 0.4,
      textTransform: "uppercase",
      marginBottom: 10,
    },
    sectionTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: palette.text,
      letterSpacing: -0.2,
    },
    paymentSection: {
      backgroundColor: isDark ? card : "#FFFFFF",
      borderRadius: 22,
      padding: 18,
      marginBottom: 12,
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOpacity: isDark ? 0.25 : 0.06,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 4 },
        },
        android: { elevation: 2 },
      }),
    },
    paymentSectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: isDark ? palette.text : "#000000",
      letterSpacing: -0.3,
    },
    encryptedBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    encryptedBadgeText: {
      fontSize: 13,
      fontWeight: "600",
      color: "#1A5319",
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 14,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      maxWidth: "100%",
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: fieldBg,
    },
    chipText: {
      fontSize: 12.5,
      fontWeight: "600",
      color: palette.text,
      flexShrink: 1,
    },
    routeBlock: { flexDirection: "row" },
    routeRail: { width: 16, alignItems: "center", paddingTop: 5 },
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
      backgroundColor: GOLD,
    },
    routeDotEnd: {
      width: 10,
      height: 10,
      borderRadius: 2,
      backgroundColor: palette.text,
    },
    routeDotAsDirected: {
      borderRadius: 5,
      backgroundColor: GOLD,
    },
    routeLine: {
      width: 2,
      flex: 1,
      minHeight: 18,
      backgroundColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)",
      marginVertical: 3,
    },
    routeCopy: { flex: 1, paddingLeft: 12, gap: 14 },
    routeItem: {},
    routeLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: palette.muted,
      marginBottom: 2,
      letterSpacing: 0.2,
    },
    routeValue: {
      fontSize: 15,
      fontWeight: "500",
      color: palette.text,
      lineHeight: 21,
    },
    routeValueMuted: {
      color: palette.muted,
      fontStyle: "italic",
      fontWeight: "500",
    },
    metaPills: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: palette.border,
    },
    metaPill: {
      fontSize: 12,
      fontWeight: "600",
      color: palette.muted,
      backgroundColor: fieldBg,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      overflow: "hidden",
      maxWidth: "100%",
    },
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
    fareSummaryHeaderLeft: { flex: 1, minWidth: 0 },
    fareSummaryHeaderHint: {
      marginTop: 3,
      fontSize: 12,
      color: palette.muted,
    },
    fareSummaryHeaderRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    fareSummaryHeaderTotal: {
      fontSize: 22,
      fontWeight: "700",
      color: palette.text,
      letterSpacing: -0.4,
    },
    tipQuickRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginTop: 12,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 14,
      backgroundColor: fieldBg,
    },
    tipQuickText: {
      flex: 1,
      fontSize: 14,
      fontWeight: "600",
      color: palette.text,
    },
    fareSummaryBody: {
      marginTop: 14,
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
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: Platform.OS === "ios" ? 11 : 8,
      fontSize: 14,
      fontWeight: "600",
      color: palette.text,
      letterSpacing: 0.6,
      backgroundColor: isDark ? "rgba(0,0,0,0.2)" : "#fff",
    },
    promoApplyBtn: {
      backgroundColor: primaryBtnBg,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      minWidth: 72,
      alignItems: "center",
    },
    promoApplyText: {
      fontSize: 14,
      fontWeight: "700",
      color: primaryBtnText,
    },
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
    tipModalRoot: { flex: 1, justifyContent: "flex-end" },
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
      fontSize: 18,
      fontWeight: "700",
      color: palette.text,
      marginBottom: 16,
    },
    tipModalOptions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    tipModalOption: {
      width: "30%",
      flexGrow: 1,
      paddingVertical: 16,
      borderRadius: 14,
      alignItems: "center",
      backgroundColor: fieldBg,
      borderWidth: 1.5,
      borderColor: "transparent",
    },
    tipModalOptionActive: {
      borderColor: GOLD,
      backgroundColor: "rgba(201,160,99,0.12)",
    },
    tipModalOptionPct: {
      fontSize: 18,
      fontWeight: "700",
      color: palette.text,
    },
    tipModalOptionPctActive: { color: isDark ? GOLD : "#8B6914" },
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
    guestName: {
      fontSize: 16,
      fontWeight: "600",
      color: palette.text,
      marginBottom: 4,
    },
    guestDetail: { fontSize: 13, color: palette.muted, marginBottom: 2 },
    paymentDisabledCard: { opacity: 0.72 },
    paymentNote: { fontSize: 13, color: palette.muted, lineHeight: 19 },
    bottomBar: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: 16,
      paddingTop: 10,
      backgroundColor: isDark ? "rgba(20,18,16,0.98)" : "#FFFFFF",
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: palette.border,
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOpacity: 0.08,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: -4 },
        },
        android: { elevation: 12 },
      }),
    },
    payPill: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDark ? "#2A2622" : "#1C1916",
      borderRadius: 999,
      paddingLeft: 20,
      paddingRight: 6,
      paddingVertical: 6,
      minHeight: 58,
    },
    payPillDisabled: {
      opacity: 0.55,
    },
    payPillCenter: {
      flex: 1,
      minWidth: 0,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 6,
      paddingRight: 8,
    },
    payPillTitle: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "700",
      letterSpacing: -0.2,
      textAlign: "center",
    },
    payPillSub: {
      marginTop: 3,
      fontSize: 12.5,
      fontWeight: "500",
      color: "rgba(255,255,255,0.55)",
      textAlign: "center",
    },
    payArrowChip: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: GOLD,
      alignItems: "center",
      justifyContent: "center",
    },
  });
}
