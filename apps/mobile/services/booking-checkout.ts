import { Alert } from "react-native";
import {
  createCustomerPaymentIntent,
  createReservation,
  type SavedPaymentMethod,
} from "./api";
import { clearBookingDraft, type BookingDraft } from "./booking-draft";
import {
  formatRidePrefsRequirements,
  mergeSpecialRequirements,
  normalizeRidePrefs,
  type RidePrefs,
} from "../utils/ride-prefs";
import {
  encodeParcelRequirements,
  isParcelServiceType,
} from "../utils/parcel";

/** Uber-style checkout: charge selected saved card; PaymentSheet for new card / wallets. */
export const APP_PAYMENTS_ENABLED = true;
export const STRIPE_RETURN_URL = "sarjworldwide://stripe-redirect";

export type CheckoutFareSlice = {
  gratuityPercent: number;
};

type StripeSheetFns = {
  // Stripe RN typings vary by version — keep loose at the boundary.
  initPaymentSheet: (params: any) => Promise<{ error?: any }>;
  presentPaymentSheet: () => Promise<{ error?: any }>;
  handleNextAction: (
    clientSecret: string,
    returnUrl: string
  ) => Promise<{
    error?: { code?: string; message?: string };
    paymentIntent?: { status?: string };
  }>;
};

export type CheckoutFleetLine = { vehicleId: string; quantity: number };

export type RunBookingCheckoutArgs = {
  draft: BookingDraft;
  fare: CheckoutFareSlice;
  childSeats: number;
  vehicleCount: number;
  /** Mixed fleets — when set, payment + reservation use line-item fare. */
  fleetLines?: CheckoutFleetLine[];
  isHourly: boolean;
  hourlyDuration: number;
  distanceMeters: number;
  pricePerKm: number;
  dropoffDisplay: string;
  stopsPayload?: string;
  meetGreet: boolean;
  guestName: string;
  selectedCardId: string | null;
  savedCards: SavedPaymentMethod[];
  appliedPromoCode?: string | null;
  useReferralCredit?: boolean;
  prefs: RidePrefs;
  stripe: StripeSheetFns;
  onCardsChanged?: () => void;
};

export type RunBookingCheckoutResult =
  | { ok: true; bookingId: string }
  | { ok: false; canceled?: boolean };

/**
 * Payment + createReservation — shared by Review (and any former Confirm entry).
 */
export async function runBookingCheckout(
  args: RunBookingCheckoutArgs
): Promise<RunBookingCheckoutResult> {
  const {
    draft,
    fare,
    childSeats,
    vehicleCount,
    fleetLines,
    isHourly,
    hourlyDuration,
    distanceMeters,
    pricePerKm,
    dropoffDisplay,
    stopsPayload,
    meetGreet,
    guestName,
    selectedCardId,
    savedCards,
    appliedPromoCode,
    useReferralCredit,
    prefs: prefsIn,
    stripe,
    onCardsChanged,
  } = args;

  const isParcel = isParcelServiceType(draft.serviceType);
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
    const prefs = normalizeRidePrefs(prefsIn);
    let notes = mergeSpecialRequirements(base, formatRidePrefsRequirements(prefs));
    if (fleetLines && fleetLines.length > 1) {
      notes = mergeSpecialRequirements(
        notes,
        `Vehicles (mixed fleets): ${draft.vehicle || "multiple"}`
      );
    } else if (vehicleCount > 1) {
      // draft.vehicle already includes ×N from formatFleetLinesLabel when applicable.
      notes = mergeSpecialRequirements(
        notes,
        `Vehicles: ${draft.vehicle || "vehicle"}`
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
      fleetLines:
        fleetLines && fleetLines.length > 0
          ? fleetLines.map((l) => ({
              vehicleId: l.vehicleId,
              quantity: l.quantity,
            }))
          : undefined,
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
      return { ok: false };
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
      const { error: nextError, paymentIntent: nextPi } = await stripe.handleNextAction(
        intent.clientSecret,
        STRIPE_RETURN_URL
      );
      if (nextError) {
        if (nextError.code !== "Canceled") {
          Alert.alert("Payment", nextError.message || "Card authentication failed.");
        }
        return { ok: false, canceled: nextError.code === "Canceled" };
      }
      if (nextPi?.status !== "Succeeded") {
        Alert.alert("Payment", "Payment was not completed. Please try again.");
        return { ok: false };
      }
      stripePaymentIntentId = intent.paymentIntentId;
      stripePaymentMethodId = intent.paymentMethodId || selectedCardId || undefined;
      if (selectedCard) {
        cardType = selectedCard.brand;
        cardLast4 = selectedCard.last4;
      }
    } else {
      if (!intent.clientSecret || !intent.ephemeralKeySecret) {
        Alert.alert("Payment", intent.error || "Could not open secure checkout.");
        return { ok: false };
      }

      const { error: initError } = await stripe.initPaymentSheet({
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
        return { ok: false };
      }

      const { error: presentError } = await stripe.presentPaymentSheet();
      if (presentError) {
        if (presentError.code !== "Canceled") {
          Alert.alert("Payment", presentError.message || "Payment was not completed.");
        }
        return { ok: false, canceled: presentError.code === "Canceled" };
      }
      stripePaymentIntentId = intent.paymentIntentId;
      onCardsChanged?.();
    }
  }

  const result = await createReservation({
    serviceType: draft.serviceType || "Point-to-Point transportation",
    // draft.vehicle is already the full label (incl. ×N / mixed fleets).
    vehicle: draft.vehicle,
    vehicleId: draft.vehicleId,
    vehicleCount: vehicleCount > 1 ? vehicleCount : undefined,
    fleetLines:
      fleetLines && fleetLines.length > 0
        ? fleetLines.map((l) => ({
            vehicleId: l.vehicleId,
            quantity: l.quantity,
          }))
        : undefined,
    passengers: parseInt(draft.passengers || "1", 10),
    childSeats,
    etr407: draft.tollRoute === "Yes" ? "Yes" : "No",
    serviceDate: draft.serviceDate,
    serviceTime: draft.serviceTime,
    pickupLocation: draft.pickupAddress,
    pickupLat: (() => {
      const n = draft.pickupLat != null ? Number(draft.pickupLat) : NaN;
      return Number.isFinite(n) ? n : undefined;
    })(),
    pickupLng: (() => {
      const n = draft.pickupLng != null ? Number(draft.pickupLng) : NaN;
      return Number.isFinite(n) ? n : undefined;
    })(),
    stops: stopsPayload,
    dropoffLocation: dropoffDisplay,
    dropoffLat: (() => {
      const n = draft.dropoffLat != null ? Number(draft.dropoffLat) : NaN;
      return Number.isFinite(n) ? n : undefined;
    })(),
    dropoffLng: (() => {
      const n = draft.dropoffLng != null ? Number(draft.dropoffLng) : NaN;
      return Number.isFinite(n) ? n : undefined;
    })(),
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
    stripePaymentMethodId,
    stripeCustomerId,
    cardType,
    cardLast4,
    promoCode: useReferralCredit ? undefined : appliedPromoCode || undefined,
    useReferralCredit: useReferralCredit || undefined,
  });

  if (result.success && result.bookingId) {
    await clearBookingDraft();
    return { ok: true, bookingId: result.bookingId };
  }

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
  return { ok: false };
}
