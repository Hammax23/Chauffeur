"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  MapPin,
  User,
  Phone,
  Mail,
  Plus,
  Minus,
  X,
  CheckCircle,
  Loader2,
  Clock,
  Users,
  Briefcase,
  Copy,
  Check,
  MessageCircle,
  Link2,
  ChevronDown,
  ArrowRight,
  Pencil,
} from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  fleetData,
  getFleetForReservation,
  type FleetVehicle,
  type FleetCategory,
} from "@/data/fleet";
import PlacesAutocomplete from "@/components/PlacesAutocomplete";
import RouteMap from "@/components/RouteMap";
import {
  APP_GRATUITY_PERCENTS,
  APP_DEFAULT_GRATUITY_PERCENT,
  APP_HOURLY_DURATIONS,
  APP_MIN_HOURLY_HOURS,
  STOP_CHARGE,
  CHILD_SEAT_CHARGE,
  MEET_GREET_CHARGE,
  BOUQUET_CHARGE,
  AIRPORT_PICKUP_FEE,
  HST_RATE,
  BASE_DISTANCE_KM,
  EXTRA_KM_RATE,
  isAirportPickupLocation,
} from "@/lib/reservation-pricing";
import {
  PARCEL_SERVICE_TYPE,
  isParcelServiceType,
  encodeParcelRequirements,
} from "@/lib/parcel";

const COUNTRY_CODES = [
  { code: "+1", label: "CA", name: "Canada" },
  { code: "+1", label: "US", name: "United States" },
  { code: "+44", label: "UK", name: "United Kingdom" },
  { code: "+33", label: "FR", name: "France" },
  { code: "+49", label: "DE", name: "Germany" },
];

type PricedVehicle = {
  price: number;
  basePrice?: number;
  baseDistanceKm?: number;
  extraKmRate?: number;
  pricePerKm?: number;
};

/** Same distance formula as website reservation: basePrice + extra km × rate. */
function calcDistanceFare(
  vehicle: PricedVehicle,
  distanceMeters: number,
  defaults: { baseDistanceKm: number; extraKmRate: number }
): number {
  const distanceKm = distanceMeters / 1000;
  const basePrice =
    vehicle.basePrice && vehicle.basePrice > 0 ? vehicle.basePrice : vehicle.price;
  const baseKm =
    vehicle.baseDistanceKm && vehicle.baseDistanceKm > 0
      ? vehicle.baseDistanceKm
      : defaults.baseDistanceKm;
  const extraRate =
    vehicle.extraKmRate && vehicle.extraKmRate > 0
      ? vehicle.extraKmRate
      : vehicle.pricePerKm && vehicle.pricePerKm > 0
        ? vehicle.pricePerKm
        : defaults.extraKmRate;
  const extraKm = Math.max(0, distanceKm - baseKm);
  return basePrice + extraKm * extraRate;
}

function getVehicleRideFare(
  vehicle: PricedVehicle,
  opts: {
    bookingMode: "distance" | "hourly";
    hourlyDuration: number;
    routeDistanceValue: number;
    defaults: { baseDistanceKm: number; extraKmRate: number };
  }
): number | null {
  if (opts.bookingMode === "hourly") {
    return vehicle.price * opts.hourlyDuration;
  }
  if (opts.routeDistanceValue <= 0) return null;
  return calcDistanceFare(vehicle, opts.routeDistanceValue, opts.defaults);
}

const STEPS = [
  { id: 1, title: "Ride Details", description: "When and where" },
  { id: 2, title: "Select Vehicle", description: "Choose your ride" },
  { id: 3, title: "Contact Info", description: "Guest details" },
  { id: 4, title: "Confirmation", description: "Review & create" },
] as const;

export default function CustomReservationForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [stepError, setStepError] = useState("");
  const [bookingMode, setBookingMode] = useState<"distance" | "hourly">("distance");
  const [serviceType, setServiceType] = useState("Point-to-Point transportation");
  const [hourlyDuration, setHourlyDuration] = useState(APP_MIN_HOURLY_HOURS);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [vehicleCategoryFilter, setVehicleCategoryFilter] = useState<"All" | FleetCategory>("All");
  const [extraOptionsOpen, setExtraOptionsOpen] = useState(false);
  const [reservationFleet, setReservationFleet] = useState<FleetVehicle[]>(fleetData);
  const [pricingDefaults, setPricingDefaults] = useState({
    baseDistanceKm: BASE_DISTANCE_KM,
    extraKmRate: EXTRA_KM_RATE,
  });
  const [adultsCount, setAdultsCount] = useState(1);
  const [childrenCount, setChildrenCount] = useState(0);
  const passengersCount = adultsCount + childrenCount;
  const [childSeatCount, setChildSeatCount] = useState(0);
  const [childSeatType, setChildSeatType] = useState("");
  const [etr407, setEtr407] = useState(false);
  const [meetGreet, setMeetGreet] = useState(false);
  const [bouquetFlowers, setBouquetFlowers] = useState(false);

  const [pickupLocation, setPickupLocation] = useState("");
  const [dropoffLocation, setDropoffLocation] = useState("");
  const [stops, setStops] = useState<string[]>([]);
  const [pickupDateTime, setPickupDateTime] = useState<Date | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState(COUNTRY_CODES[0].code);
  const [specialRequirements, setSpecialRequirements] = useState("");

  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [parcelWeight, setParcelWeight] = useState("");
  const [parcelNote, setParcelNote] = useState("");

  const [rideFare, setRideFare] = useState("");
  const [gratuityPercent, setGratuityPercent] = useState(APP_DEFAULT_GRATUITY_PERCENT);
  const [tipModalOpen, setTipModalOpen] = useState(false);
  const [fareManual, setFareManual] = useState(false);

  const [routeDistance, setRouteDistance] = useState("--");
  const [routeDuration, setRouteDuration] = useState("--");
  const [routeDistanceValue, setRouteDistanceValue] = useState(0);
  const [routeDurationValue, setRouteDurationValue] = useState(0);

  const [paymentStatus, setPaymentStatus] = useState("PENDING");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [createdBookingId, setCreatedBookingId] = useState("");
  const [paymentLink, setPaymentLink] = useState("");
  const [paymentLinkError, setPaymentLinkError] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [error, setError] = useState("");

  const isParcel = isParcelServiceType(serviceType);
  const showDropoff = bookingMode === "distance" || isParcel;
  const availableVehicles = useMemo(
    () => getFleetForReservation(isParcel ? 1 : passengersCount, reservationFleet),
    [isParcel, passengersCount, reservationFleet]
  );
  const vehicleCategories = useMemo(() => {
    return Array.from(new Set(availableVehicles.map((v) => v.category))) as FleetCategory[];
  }, [availableVehicles]);
  const filteredVehicles = useMemo(() => {
    if (vehicleCategoryFilter === "All") return availableVehicles;
    return availableVehicles.filter((v) => v.category === vehicleCategoryFilter);
  }, [availableVehicles, vehicleCategoryFilter]);

  useEffect(() => {
    if (
      vehicleCategoryFilter !== "All" &&
      !availableVehicles.some((v) => v.category === vehicleCategoryFilter)
    ) {
      setVehicleCategoryFilter("All");
    }
  }, [availableVehicles, vehicleCategoryFilter]);

  useEffect(() => {
    fetch("/api/fleet")
      .then((res) => res.json())
      .then((data: { success?: boolean; vehicles?: FleetVehicle[] }) => {
        if (data?.success && Array.isArray(data.vehicles) && data.vehicles.length > 0) {
          setReservationFleet(data.vehicles);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/pricing-config")
      .then((res) => res.json())
      .then((data: { success?: boolean; charges?: { baseDistanceKm?: number; extraKmRate?: number } }) => {
        if (data?.success && data.charges) {
          setPricingDefaults({
            baseDistanceKm: data.charges.baseDistanceKm ?? BASE_DISTANCE_KM,
            extraKmRate: data.charges.extraKmRate ?? EXTRA_KM_RATE,
          });
        }
      })
      .catch(() => {});
  }, []);

  const resolveVehicle = useCallback(
    (vehicleId: string) =>
      reservationFleet.find((v) => v.id === vehicleId) ??
      fleetData.find((v) => v.id === vehicleId),
    [reservationFleet]
  );

  const handleRouteCalculated = useCallback(
    (distance: string, duration: string, distanceValue: number, durationValue: number) => {
      setRouteDistance(distance);
      setRouteDuration(duration);
      setRouteDistanceValue(distanceValue);
      setRouteDurationValue(durationValue);
    },
    []
  );

  // Auto-suggest fare from fleet pricing (admin can still override) — same rules as website
  useEffect(() => {
    if (fareManual || !selectedVehicle) return;
    const vehicle = resolveVehicle(selectedVehicle);
    if (!vehicle) return;
    const fare = getVehicleRideFare(vehicle, {
      bookingMode,
      hourlyDuration,
      routeDistanceValue,
      defaults: pricingDefaults,
    });
    if (fare == null || fare <= 0) {
      setRideFare("");
      return;
    }
    setRideFare(fare.toFixed(2));
  }, [
    selectedVehicle,
    bookingMode,
    hourlyDuration,
    routeDistanceValue,
    fareManual,
    resolveVehicle,
    pricingDefaults,
  ]);

  const addStop = () => setStops([...stops, ""]);
  const removeStop = (index: number) => setStops(stops.filter((_, i) => i !== index));
  const updateStop = (index: number, value: string) => {
    const next = [...stops];
    next[index] = value;
    setStops(next);
  };

  const stopCount = stops.filter((s) => s.trim()).length;
  const rideFareNum = parseFloat(rideFare) || 0;
  const stopCharge = stopCount * STOP_CHARGE;
  const childSeatCharge = isParcel ? 0 : childSeatCount * CHILD_SEAT_CHARGE;
  const meetGreetCharge = !isParcel && meetGreet ? MEET_GREET_CHARGE : 0;
  const bouquetCharge = !isParcel && bouquetFlowers ? BOUQUET_CHARGE : 0;
  // Same GTAA / airport rule as website reservation + API
  const airportPickupFee = isAirportPickupLocation(pickupLocation)
    ? AIRPORT_PICKUP_FEE
    : 0;
  const subtotal =
    rideFareNum +
    stopCharge +
    childSeatCharge +
    meetGreetCharge +
    bouquetCharge +
    airportPickupFee;
  const hst = subtotal * HST_RATE;
  const gratuity = subtotal * (gratuityPercent / 100);
  const total = subtotal + hst + gratuity;

  const setModeDistance = () => {
    setBookingMode("distance");
    setServiceType("Point-to-Point transportation");
  };
  const setModeHourly = () => {
    setBookingMode("hourly");
    setServiceType("Hourly ride");
    setDropoffLocation("");
  };
  const setModeParcel = () => {
    setBookingMode("distance");
    setServiceType(PARCEL_SERVICE_TYPE);
    setAdultsCount(1);
    setChildrenCount(0);
    setChildSeatCount(0);
    setMeetGreet(false);
    setBouquetFlowers(false);
  };

  const validateStep = (step: number): boolean => {
    setStepError("");
    if (step === 1) {
      if (!pickupLocation.trim()) {
        setStepError("Please enter a pickup location.");
        return false;
      }
      if (showDropoff && !dropoffLocation.trim()) {
        setStepError("Please enter a drop-off location.");
        return false;
      }
      if (!pickupDateTime) {
        setStepError("Please select date and time.");
        return false;
      }
      if (pickupDateTime.getTime() < Date.now() - 60_000) {
        setStepError("Please select a future date and time.");
        return false;
      }
      if (isParcel) {
        if (!recipientName.trim()) {
          setStepError("Please enter the recipient name.");
          return false;
        }
        if (!recipientPhone.trim()) {
          setStepError("Please enter the recipient phone number.");
          return false;
        }
      }
    }
    if (step === 2) {
      if (!selectedVehicle) {
        setStepError("Please select a vehicle.");
        return false;
      }
    }
    if (step === 3) {
      if (!firstName.trim()) {
        setStepError("Please enter first name.");
        return false;
      }
      if (!lastName.trim()) {
        setStepError("Please enter last name.");
        return false;
      }
      if (!email.trim()) {
        setStepError("Please enter email address.");
        return false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setStepError("Please enter a valid email address.");
        return false;
      }
      if (!phone.trim()) {
        setStepError("Please enter phone number.");
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;
    setCurrentStep(Math.min(4, currentStep + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePrevious = () => {
    setStepError("");
    setCurrentStep(Math.max(1, currentStep - 1));
  };

  const handleGoToStep = (stepId: number) => {
    if (stepId >= currentStep || stepId < 1) return;
    setStepError("");
    setCurrentStep(stepId);
  };

  const handleSubmit = async () => {
    setError("");
    if (!validateStep(1)) {
      setCurrentStep(1);
      return;
    }
    if (!validateStep(2)) {
      setCurrentStep(2);
      return;
    }
    if (!validateStep(3)) {
      setCurrentStep(3);
      return;
    }
    if (!rideFareNum || rideFareNum <= 0) {
      setStepError("Please enter a valid ride fare.");
      setCurrentStep(4);
      return;
    }

    setSubmitting(true);

    try {
      const vehicleName = resolveVehicle(selectedVehicle)?.name || selectedVehicle;

      const parcelExtra = isParcel
        ? encodeParcelRequirements({
            recipientName,
            recipientPhone,
            parcelWeight,
            parcelNote,
          })
        : "";

      const notes = [parcelExtra, specialRequirements].filter(Boolean).join("\n");

      const res = await fetch("/api/reservation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          phoneCode: countryCode,
          serviceType,
          bookingMode,
          transferType: "oneWay",
          hourlyDuration: bookingMode === "hourly" ? hourlyDuration : undefined,
          adultsCount: isParcel ? 1 : adultsCount,
          childrenCount: isParcel ? 0 : childrenCount,
          pickupLocation,
          dropoffLocation: showDropoff ? dropoffLocation : "",
          stops: stops.filter((s) => s.trim() !== ""),
          serviceDate: pickupDateTime.toLocaleDateString("en-CA"),
          serviceTime: pickupDateTime.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }),
          vehicle: vehicleName,
          vehicleId: selectedVehicle,
          passengers: isParcel ? 1 : passengersCount,
          childSeatCount: isParcel ? 0 : childSeatCount,
          childSeatType: isParcel ? "" : childSeatType,
          etr407,
          meetGreet: isParcel ? false : meetGreet,
          bouquetFlowers: isParcel ? false : bouquetFlowers,
          specialRequirements: notes,
          routeDistance,
          routeDuration,
          routeDistanceValue,
          routePrice: rideFareNum,
          gratuityPercent,
          recipientName: isParcel ? recipientName : undefined,
          recipientPhone: isParcel ? recipientPhone : undefined,
          parcelWeight: isParcel ? parcelWeight : undefined,
          parcelNote: isParcel ? parcelNote : undefined,
          cardType: "",
          nameOnCard: "",
          cardLast4: "",
          stripePaymentMethodId: "",
          stripeCustomerId: "",
          billingAddress: "",
          zipCode: "",
          purchaseOrder: "",
          deptNumber: "",
          skipTurnstile: true,
          paymentStatus,
          returnBaseUrl: typeof window !== "undefined" ? window.location.origin : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.error || "Failed to create reservation");

      const bookingId = String(data.bookingId || "");
      setCreatedBookingId(bookingId);
      setPaymentLink("");
      setPaymentLinkError("");
      setLinkCopied(false);

      // Prefer server-created Stripe link (created with the reservation).
      if (data.paymentUrl) {
        setPaymentLink(String(data.paymentUrl));
      } else if (paymentStatus !== "PAID" && paymentStatus !== "CANCELLED" && bookingId) {
        // Fallback: create link client-side if server did not return one.
        try {
          const checkoutRes = await fetch("/api/admin/reservations/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              bookingId,
              returnBaseUrl: window.location.origin,
            }),
          });
          const checkoutData = await checkoutRes.json();
          if (!checkoutRes.ok || !checkoutData.url) {
            throw new Error(
              checkoutData.error ||
                data.paymentLinkError ||
                "Could not create Stripe payment link"
            );
          }
          setPaymentLink(String(checkoutData.url));
        } catch (checkoutErr: unknown) {
          const msg =
            checkoutErr instanceof Error
              ? checkoutErr.message
              : data.paymentLinkError || "Could not create Stripe payment link";
          setPaymentLinkError(msg);
        }
      } else if (data.paymentLinkError) {
        setPaymentLinkError(String(data.paymentLinkError));
      }

      setSubmitted(true);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create reservation.";
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const copyPaymentLink = async () => {
    if (!paymentLink) return;
    try {
      await navigator.clipboard.writeText(paymentLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      setPaymentLinkError("Could not copy link — select and copy manually.");
    }
  };

  const shareWhatsApp = () => {
    if (!paymentLink) return;
    const text = `SARJ Worldwide payment link for booking ${createdBookingId}:\n${paymentLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  const shareEmail = () => {
    if (!paymentLink) return;
    const subject = `Payment link — ${createdBookingId} — SARJ Worldwide`;
    const body = `Hello${firstName ? ` ${firstName}` : ""},\n\nPlease use this secure Stripe link to pay for your reservation ${createdBookingId}:\n\n${paymentLink}\n\nThank you,\nSARJ Worldwide`;
    window.open(
      `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
      "_blank"
    );
  };

  const resetForm = () => {
    setCurrentStep(1);
    setStepError("");
    setBookingMode("distance");
    setServiceType("Point-to-Point transportation");
    setHourlyDuration(APP_MIN_HOURLY_HOURS);
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setSelectedVehicle("");
    setVehicleCategoryFilter("All");
    setExtraOptionsOpen(false);
    setAdultsCount(1);
    setChildrenCount(0);
    setChildSeatCount(0);
    setChildSeatType("");
    setEtr407(false);
    setMeetGreet(false);
    setBouquetFlowers(false);
    setPickupLocation("");
    setDropoffLocation("");
    setStops([]);
    setPickupDateTime(null);
    setSpecialRequirements("");
    setRecipientName("");
    setRecipientPhone("");
    setParcelWeight("");
    setParcelNote("");
    setRideFare("");
    setFareManual(false);
    setGratuityPercent(APP_DEFAULT_GRATUITY_PERCENT);
    setRouteDistance("--");
    setRouteDuration("--");
    setRouteDistanceValue(0);
    setRouteDurationValue(0);
    setPaymentStatus("PENDING");
    setSubmitted(false);
    setCreatedBookingId("");
    setPaymentLink("");
    setPaymentLinkError("");
    setLinkCopied(false);
    setError("");
  };

  if (submitted) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Reservation Created!</h1>
            {createdBookingId ? (
              <p className="font-mono text-[#C9A063] text-sm mb-2">{createdBookingId}</p>
            ) : null}
            <p className="text-gray-500 mb-2">
              Reservation is saved. Confirmation emails have been sent.
            </p>
            <p className="text-gray-500 text-sm mb-6">
              Payment is optional at create time — the customer can pay later with the Stripe link.
            </p>

            {paymentLink ? (
              <div className="text-left rounded-xl border border-[#C9A063]/30 bg-[#C9A063]/5 p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Link2 className="w-4 h-4 text-[#C9A063]" />
                  <p className="text-sm font-semibold text-gray-900">Pay-later Stripe link</p>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  Share on WhatsApp or email whenever you want. Booking stays valid until they pay.
                </p>
                <div className="flex gap-2 mb-3">
                  <input
                    readOnly
                    value={paymentLink}
                    className="flex-1 min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 font-mono"
                  />
                  <button
                    type="button"
                    onClick={copyPaymentLink}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white hover:bg-gray-800"
                  >
                    {linkCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {linkCopied ? "Copied" : "Copy"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={shareWhatsApp}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1ebe57]"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={shareEmail}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-50"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Email
                  </button>
                  <a
                    href={paymentLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#C9A063]/40 bg-white px-3 py-2 text-xs font-semibold text-[#A68B5B] hover:bg-[#C9A063]/10"
                  >
                    Open link
                  </a>
                </div>
              </div>
            ) : paymentStatus !== "PAID" && paymentStatus !== "CANCELLED" ? (
              <div className="text-left rounded-xl border border-amber-200 bg-amber-50 p-4 mb-6 space-y-3">
                <p className="text-sm text-amber-800">
                  {paymentLinkError ||
                    (total < 0.5
                      ? "Stripe link needs a total of at least $0.50."
                      : "Stripe payment link was not created.")}
                </p>
                {createdBookingId && total >= 0.5 ? (
                  <button
                    type="button"
                    onClick={async () => {
                      setPaymentLinkError("");
                      try {
                        const checkoutRes = await fetch("/api/admin/reservations/checkout", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          credentials: "include",
                          body: JSON.stringify({
                            bookingId: createdBookingId,
                            returnBaseUrl: window.location.origin,
                          }),
                        });
                        const checkoutData = await checkoutRes.json();
                        if (!checkoutRes.ok || !checkoutData.url) {
                          throw new Error(checkoutData.error || "Could not create Stripe payment link");
                        }
                        setPaymentLink(String(checkoutData.url));
                      } catch (e: unknown) {
                        setPaymentLinkError(
                          e instanceof Error ? e.message : "Could not create Stripe payment link"
                        );
                      }
                    }}
                    className="inline-flex items-center rounded-lg bg-amber-900 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-800"
                  >
                    Generate Stripe link
                  </button>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-6">
                Payment status set to <span className="font-semibold">{paymentStatus}</span> — no
                Stripe link needed.
              </p>
            )}

            <button
              onClick={resetForm}
              className="px-6 py-3 bg-[#C9A063] text-white rounded-xl font-semibold hover:bg-[#B89552] transition-colors"
            >
              Create Another Reservation
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-[#f2f2f7] min-h-screen">
      <div className="max-w-[1400px] mx-auto">
        <div className="mb-4 sm:mb-5 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#C9A063]/40 shadow-sm mb-2">
            <div className="w-2 h-2 rounded-full bg-[#C9A063] flex-shrink-0" />
            <span className="text-gray-800 text-[12px] sm:text-[13px] font-bold tracking-[0.14em] uppercase">
              Custom Reservation
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Create Custom Reservation</h1>
          <p className="text-gray-500 text-sm mt-1 max-w-2xl">
            Same booking flow as the website — create now, collect payment later via Stripe link.
          </p>
        </div>

        {/* Progress Steps — same as online reservation */}
        <div className="mb-4 sm:mb-6">
          <div className="hidden md:flex items-center justify-center">
            <div className="flex items-center">
              {STEPS.map((step, index) => {
                const isCompleted = currentStep > step.id;
                const isCurrent = currentStep === step.id;
                const isClickable = isCompleted;
                return (
                  <div key={step.id} className="flex items-center">
                    <button
                      type="button"
                      onClick={() => handleGoToStep(step.id)}
                      disabled={!isClickable}
                      aria-current={isCurrent ? "step" : undefined}
                      className={`flex flex-col items-center text-center transition-all duration-200 ${
                        currentStep >= step.id ? "text-[#C9A063]" : "text-gray-400"
                      } ${
                        isClickable
                          ? "cursor-pointer hover:opacity-90"
                          : "cursor-default"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-[14px] border-2 transition-all duration-300 ${
                          currentStep >= step.id
                            ? "bg-[#C9A063] text-white border-[#C9A063] shadow-md shadow-[#C9A063]/30"
                            : "bg-white text-gray-400 border-gray-300"
                        }`}
                      >
                        {isCompleted ? <CheckCircle className="w-5 h-5" /> : step.id}
                      </div>
                      <div className="mt-2 text-center max-w-[110px]">
                        <div className="text-[13px] font-bold leading-tight">{step.title}</div>
                        <div className="text-[11px] text-gray-500 leading-tight mt-0.5">
                          {step.description}
                        </div>
                      </div>
                    </button>
                    {index < STEPS.length - 1 && (
                      <div
                        className={`w-12 lg:w-16 h-[2px] mx-3 lg:mx-4 ${
                          currentStep > step.id ? "bg-[#C9A063]" : "bg-gray-300"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="md:hidden">
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[12px] font-medium text-gray-600">
                Step {currentStep} of {STEPS.length}
              </div>
              <div className="text-[12px] text-gray-500">
                {Math.round((currentStep / STEPS.length) * 100)}%
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mb-3">
              <div
                className="bg-[#C9A063] h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
              />
            </div>
            <div className="flex items-stretch justify-between gap-1 mb-2.5">
              {STEPS.map((step) => {
                const isCompleted = currentStep > step.id;
                const isCurrent = currentStep === step.id;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => handleGoToStep(step.id)}
                    disabled={!isCompleted}
                    className={`flex flex-1 flex-col items-center gap-1.5 min-w-0 py-1 ${
                      isCompleted ? "cursor-pointer" : "cursor-default"
                    }`}
                  >
                    <span
                      className={`w-11 h-11 rounded-full flex items-center justify-center text-[13px] font-bold border-2 ${
                        isCompleted || isCurrent
                          ? "bg-[#C9A063] text-white border-[#C9A063]"
                          : "bg-white text-gray-400 border-gray-300"
                      }`}
                    >
                      {isCompleted ? <CheckCircle className="w-4 h-4" /> : step.id}
                    </span>
                    <span
                      className={`text-[11px] font-semibold leading-tight text-center truncate w-full px-0.5 ${
                        isCurrent || isCompleted ? "text-[#C9A063]" : "text-gray-400"
                      }`}
                    >
                      {step.title.split(" ")[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div
          className={`grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 ${
            currentStep === 1 ? "lg:items-stretch" : "lg:items-start"
          }`}
        >
          <div className={`lg:col-span-2 ${currentStep === 1 ? "flex" : ""}`}>
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200/80 overflow-visible w-full h-fit">
              {currentStep === 1 ? (
                <div className="px-3.5 sm:px-4 pt-3.5 sm:pt-4 pb-0">
                  <div className="mb-3">
                    <p className="text-[11px] sm:text-[12px] font-semibold tracking-[0.12em] uppercase text-[#C9A063] mb-0.5">
                      Step 1
                    </p>
                    <h2 className="text-base sm:text-lg font-semibold text-gray-900 tracking-tight leading-tight">
                      {isParcel ? "Parcel Details" : "Ride Details"}
                    </h2>
                  </div>
                  <div
                    className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-gray-100 border border-gray-200/70"
                    role="tablist"
                    aria-label="Booking mode"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={bookingMode === "distance" && !isParcel}
                      onClick={setModeDistance}
                      className={`min-h-11 px-1.5 sm:px-2 py-2 rounded-lg text-[11px] sm:text-[12px] font-semibold tracking-wide transition-all ${
                        bookingMode === "distance" && !isParcel
                          ? "bg-gray-900 text-white shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Distance
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={bookingMode === "hourly"}
                      onClick={setModeHourly}
                      className={`min-h-11 px-1.5 sm:px-2 py-2 rounded-lg text-[11px] sm:text-[12px] font-semibold tracking-wide transition-all ${
                        bookingMode === "hourly"
                          ? "bg-gray-900 text-white shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Hourly
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={isParcel}
                      onClick={setModeParcel}
                      className={`min-h-11 px-1.5 sm:px-2 py-2 rounded-lg text-[11px] sm:text-[12px] font-semibold tracking-wide transition-all ${
                        isParcel
                          ? "bg-gray-900 text-white shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Parcel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="px-3.5 sm:px-4 pt-3.5 sm:pt-4 pb-0">
                  <div className="mb-1">
                    <p className="text-[11px] sm:text-[12px] font-semibold tracking-[0.12em] uppercase text-[#C9A063] mb-0.5">
                      Step {currentStep}
                    </p>
                    <h2 className="text-base sm:text-lg font-semibold text-gray-900 tracking-tight leading-tight">
                      {STEPS[currentStep - 1].title}
                    </h2>
                    <p className="text-[12px] text-gray-500 mt-0.5">
                      {STEPS[currentStep - 1].description}
                      {currentStep === 2
                        ? ` · ${filteredVehicles.length} option${
                            filteredVehicles.length === 1 ? "" : "s"
                          }`
                        : ""}
                    </p>
                  </div>
                </div>
              )}

              <div className="p-3.5 sm:p-4 bg-white">
                {/* Step 1: Ride Details */}
                {currentStep === 1 && (
                  <div className="space-y-2.5">
                    <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                      <div className="px-3 py-2.5 bg-white">
                        <div className="flex items-center gap-2 mb-1">
                          <MapPin className="w-3.5 h-3.5 text-[#C9A063] shrink-0" strokeWidth={2} />
                          <label className="text-[11px] sm:text-[12px] font-semibold text-[#C9A063] uppercase tracking-wider">
                            Pickup
                          </label>
                        </div>
                        <PlacesAutocomplete
                          value={pickupLocation}
                          onChange={(val) => {
                            setPickupLocation(val);
                            setStepError("");
                          }}
                          placeholder="Address or airport code (e.g. YYZ)"
                          className="w-full min-h-11 py-2.5 bg-transparent text-base text-gray-900 placeholder-gray-400 focus:outline-none"
                        />
                      </div>
                      {showDropoff && (
                        <div className="px-3 py-2.5 bg-white">
                          <div className="flex items-center gap-2 mb-1">
                            <MapPin className="w-3.5 h-3.5 text-[#C9A063] shrink-0" strokeWidth={2} />
                            <label className="text-[11px] sm:text-[12px] font-semibold text-[#C9A063] uppercase tracking-wider">
                              Drop-off
                            </label>
                          </div>
                          <PlacesAutocomplete
                            value={dropoffLocation}
                            onChange={(val) => {
                              setDropoffLocation(val);
                              setStepError("");
                            }}
                            placeholder="Destination address"
                            className="w-full min-h-11 py-2.5 bg-transparent text-base text-gray-900 placeholder-gray-400 focus:outline-none"
                          />
                        </div>
                      )}
                      {bookingMode === "hourly" && (
                        <div className="px-3 py-2.5 bg-white">
                          <div className="flex items-center gap-2 mb-1">
                            <Clock className="w-3.5 h-3.5 text-[#C9A063] shrink-0" strokeWidth={2} />
                            <label className="text-[11px] sm:text-[12px] font-semibold text-[#C9A063] uppercase tracking-wider">
                              Duration (Hours)
                            </label>
                          </div>
                          <select
                            value={hourlyDuration}
                            onChange={(e) => {
                              setHourlyDuration(parseInt(e.target.value, 10));
                              setFareManual(false);
                            }}
                            className="w-full min-h-11 py-2.5 bg-transparent text-base text-gray-900 focus:outline-none"
                          >
                            {APP_HOURLY_DURATIONS.map((h) => (
                              <option key={h} value={h}>
                                {h} hours
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {stops.map((stop, index) => (
                      <div key={index} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5">
                        <label className="block text-[11px] sm:text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                          Stop {index + 1}
                        </label>
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <PlacesAutocomplete
                              value={stop}
                              onChange={(val) => updateStop(index, val)}
                              placeholder="Stop address"
                              className="w-full min-h-11 py-2.5 bg-transparent text-base text-gray-900 placeholder-gray-400 focus:outline-none"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeStop(index)}
                            className="w-11 h-11 shrink-0 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center"
                            aria-label={`Remove stop ${index + 1}`}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={addStop}
                      className="inline-flex items-center justify-center gap-1.5 min-h-11 px-3 rounded-lg text-[#C9A063] hover:text-[#B8935A] hover:bg-[#C9A063]/10 text-[13px] font-semibold transition-colors"
                    >
                      <Plus className="w-4 h-4" strokeWidth={2.5} />
                      Add Stop
                    </button>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] sm:text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                          Pick-up Time
                        </label>
                        <div className="relative reservation-datepicker">
                          <DatePicker
                            selected={pickupDateTime}
                            onChange={(date: Date | null) => {
                              if (!date) {
                                setPickupDateTime(null);
                                setStepError("");
                                return;
                              }
                              const now = new Date();
                              // If today was picked with a past clock time, snap to now
                              const next =
                                date.toDateString() === now.toDateString() &&
                                date.getTime() < now.getTime()
                                  ? now
                                  : date;
                              setPickupDateTime(next);
                              setStepError("");
                            }}
                            showTimeSelect
                            timeIntervals={15}
                            timeCaption="Time"
                            dateFormat="MMM d, yyyy  h:mm aa"
                            timeFormat="h:mm aa"
                            minDate={new Date()}
                            minTime={
                              !pickupDateTime ||
                              pickupDateTime.toDateString() === new Date().toDateString()
                                ? new Date()
                                : new Date(new Date().setHours(0, 0, 0, 0))
                            }
                            maxTime={new Date(new Date().setHours(23, 45, 0, 0))}
                            placeholderText="Select date & time"
                            className="w-full min-h-11 px-3 py-2.5 pr-9 border border-gray-200 rounded-lg text-base text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#C9A063]/20 focus:border-[#C9A063]"
                            withPortal
                          />
                          <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
                            <Clock className="w-3.5 h-3.5 text-gray-400" strokeWidth={1.75} />
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] sm:text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                          {isParcel ? "Service" : "Passengers"}
                        </label>
                        {isParcel ? (
                          <div className="flex items-center px-3 py-2 border border-[#C9A063]/35 rounded-lg bg-[#C9A063]/8 min-h-11">
                            <span className="text-[13px] font-semibold text-[#8B6914]">
                              Parcel Delivery
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between px-3 py-1.5 border border-gray-200 rounded-lg bg-white min-h-11">
                            <span className="text-[13px] font-semibold text-gray-900 tabular-nums">
                              {passengersCount}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setAdultsCount((p) => Math.max(1, p - 1))}
                                disabled={passengersCount <= 1}
                                className="w-11 h-11 rounded-lg border border-gray-200 bg-gray-50 text-gray-700 disabled:opacity-40 flex items-center justify-center"
                                aria-label="Decrease"
                              >
                                −
                              </button>
                              <button
                                type="button"
                                onClick={() => setAdultsCount((p) => Math.min(50, p + 1))}
                                disabled={passengersCount >= 50}
                                className="w-11 h-11 rounded-lg border border-gray-200 bg-gray-50 text-gray-700 disabled:opacity-40 flex items-center justify-center"
                                aria-label="Increase"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {isParcel && (
                      <div className="rounded-xl border border-gray-200 p-3 space-y-2.5 bg-white">
                        <p className="text-[11px] sm:text-[12px] font-semibold text-[#C9A063] uppercase tracking-wider">
                          Recipient
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[11px] sm:text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                              Name
                            </label>
                            <input
                              type="text"
                              value={recipientName}
                              onChange={(e) => {
                                setRecipientName(e.target.value);
                                setStepError("");
                              }}
                              placeholder="Who receives the parcel?"
                              className="w-full min-h-11 px-3 py-2.5 border border-gray-200 rounded-lg text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A063]/20 focus:border-[#C9A063]"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] sm:text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                              Phone
                            </label>
                            <input
                              type="tel"
                              value={recipientPhone}
                              onChange={(e) => {
                                setRecipientPhone(e.target.value);
                                setStepError("");
                              }}
                              placeholder="Recipient phone"
                              className="w-full min-h-11 px-3 py-2.5 border border-gray-200 rounded-lg text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A063]/20 focus:border-[#C9A063]"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] sm:text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                            Parcel weight
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              inputMode="decimal"
                              min="0"
                              step="0.1"
                              value={parcelWeight}
                              onChange={(e) => setParcelWeight(e.target.value)}
                              placeholder="e.g. 2.5"
                              className="flex-1 min-h-11 px-3 py-2.5 border border-gray-200 rounded-lg text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A063]/20 focus:border-[#C9A063]"
                            />
                            <span className="inline-flex items-center justify-center min-w-[52px] px-3 rounded-lg border border-gray-200 bg-gray-50 text-[12px] font-bold text-gray-500">
                              kg
                            </span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] sm:text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                            Package note
                          </label>
                          <input
                            type="text"
                            value={parcelNote}
                            onChange={(e) => setParcelNote(e.target.value)}
                            placeholder="e.g. Small box, fragile"
                            className="w-full min-h-11 px-3 py-2.5 border border-gray-200 rounded-lg text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A063]/20 focus:border-[#C9A063]"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 2: Extra Options + Vehicle */}
                {currentStep === 2 && (
                  <div className="space-y-3">
                    <div className="bg-white rounded-xl border border-gray-200/60 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setExtraOptionsOpen(!extraOptionsOpen)}
                        className="w-full min-h-12 px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-[#C9A063]/10 flex items-center justify-center">
                            <Plus className="w-3.5 h-3.5 text-[#C9A063]" />
                          </div>
                          <div className="text-left">
                            <span className="block text-[13px] font-semibold text-gray-900">
                              Extra Options
                            </span>
                            <span className="block text-[11px] text-gray-500">
                              Add extras to your ride
                            </span>
                          </div>
                        </div>
                        <ChevronDown
                          className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${
                            extraOptionsOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      {extraOptionsOpen && (
                        <div className="border-t border-gray-100 divide-y divide-gray-100">
                          <div className="px-4 py-3 flex items-center justify-between">
                            <div>
                              <span className="block text-[14px] font-medium text-gray-900">
                                407 ETR
                              </span>
                              <span className="block text-[12px] text-gray-500">
                                Highway 407 Express Toll Route
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setEtr407(!etr407)}
                              aria-pressed={etr407}
                              className="p-2 -m-2"
                            >
                              <span
                                className={`relative block w-12 h-7 rounded-full transition-colors ${
                                  etr407 ? "bg-[#C9A063]" : "bg-gray-300"
                                }`}
                              >
                                <span
                                  className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                                    etr407 ? "translate-x-5" : "translate-x-0"
                                  }`}
                                />
                              </span>
                            </button>
                          </div>
                          {!isParcel && (
                            <>
                              <div className="px-4 py-3">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="block text-[14px] font-medium text-gray-900">
                                      Child Seat
                                    </span>
                                    <span className="block text-[12px] text-gray-500">
                                      ${CHILD_SEAT_CHARGE} per seat
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setChildSeatCount(Math.max(0, childSeatCount - 1))
                                      }
                                      className="w-11 h-11 rounded-full border border-gray-300 flex items-center justify-center text-gray-600"
                                    >
                                      <Minus className="w-4 h-4" />
                                    </button>
                                    <span className="text-[14px] font-semibold text-gray-900 w-6 text-center tabular-nums">
                                      {childSeatCount}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setChildSeatCount(childSeatCount + 1)}
                                      className="w-11 h-11 rounded-full border border-gray-300 flex items-center justify-center text-gray-600"
                                    >
                                      <Plus className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                                {childSeatCount > 0 && (
                                  <div className="mt-2">
                                    <input
                                      type="text"
                                      placeholder="Type (e.g., Infant, Toddler, Booster)"
                                      value={childSeatType}
                                      onChange={(e) => setChildSeatType(e.target.value)}
                                      className="w-full min-h-11 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#C9A063]"
                                    />
                                  </div>
                                )}
                              </div>
                              <div className="px-4 py-3 flex items-center justify-between">
                                <div>
                                  <span className="block text-[14px] font-medium text-gray-900">
                                    Meet &amp; Greet
                                  </span>
                                  <span className="block text-[12px] text-gray-500">
                                    Personal airport assistance{" "}
                                    <span className="text-[#C9A063] font-semibold">
                                      +${MEET_GREET_CHARGE}
                                    </span>
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setMeetGreet(!meetGreet)}
                                  aria-pressed={meetGreet}
                                  className="p-2 -m-2"
                                >
                                  <span
                                    className={`relative block w-12 h-7 rounded-full transition-colors ${
                                      meetGreet ? "bg-[#C9A063]" : "bg-gray-300"
                                    }`}
                                  >
                                    <span
                                      className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                                        meetGreet ? "translate-x-5" : "translate-x-0"
                                      }`}
                                    />
                                  </span>
                                </button>
                              </div>
                              <div className="px-4 py-3 flex items-center justify-between">
                                <div>
                                  <span className="block text-[14px] font-medium text-gray-900">
                                    Bouquet of Flowers
                                  </span>
                                  <span className="block text-[12px] text-gray-500">
                                    Fresh flowers for your ride{" "}
                                    <span className="text-[#C9A063] font-semibold">
                                      +${BOUQUET_CHARGE}
                                    </span>
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setBouquetFlowers(!bouquetFlowers)}
                                  aria-pressed={bouquetFlowers}
                                  className="p-2 -m-2"
                                >
                                  <span
                                    className={`relative block w-12 h-7 rounded-full transition-colors ${
                                      bouquetFlowers ? "bg-[#C9A063]" : "bg-gray-300"
                                    }`}
                                  >
                                    <span
                                      className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                                        bouquetFlowers ? "translate-x-5" : "translate-x-0"
                                      }`}
                                    />
                                  </span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-[11px] sm:text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-2 px-0.5">
                        Select Vehicle
                      </p>
                      <div className="-mx-1 mb-3">
                        <div className="flex gap-1.5 overflow-x-auto px-1 pb-1 touch-pan-x [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                          {(["All", ...vehicleCategories] as const).map((cat) => {
                            const isActive = vehicleCategoryFilter === cat;
                            const count =
                              cat === "All"
                                ? availableVehicles.length
                                : availableVehicles.filter((v) => v.category === cat).length;
                            return (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => setVehicleCategoryFilter(cat)}
                                className={`flex-shrink-0 min-h-11 px-3.5 py-2 rounded-full text-[13px] font-semibold transition-colors whitespace-nowrap ${
                                  isActive
                                    ? "bg-[#1C1C1E] text-white"
                                    : "bg-white border border-gray-200 text-gray-600"
                                }`}
                              >
                                {cat}
                                <span
                                  className={`ml-1.5 ${
                                    isActive ? "text-white/60" : "text-gray-400"
                                  }`}
                                >
                                  {count}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="bg-white rounded-xl border border-gray-200/70 overflow-hidden divide-y divide-gray-200">
                        {filteredVehicles.length === 0 ? (
                          <div className="px-4 py-8 text-center text-[13px] text-gray-500">
                            No vehicles match this filter for your passenger count.
                          </div>
                        ) : (
                          filteredVehicles.map((vehicle) => {
                            const isSelected = selectedVehicle === vehicle.id;
                            const seats =
                              parseInt(vehicle.seating.match(/(\d+)/)?.[1] || "3", 10) || 3;
                            const bags =
                              parseInt(vehicle.luggage.match(/(\d+)/)?.[1] || "2", 10) || 2;
                            const imageSrc =
                              (vehicle as FleetVehicle & { imageUrl?: string }).imageUrl ||
                              vehicle.image;
                            const suggested = getVehicleRideFare(vehicle, {
                              bookingMode,
                              hourlyDuration,
                              routeDistanceValue,
                              defaults: pricingDefaults,
                            });
                            return (
                              <div
                                key={vehicle.id}
                                className={`flex max-[379px]:flex-col min-[380px]:flex-row items-stretch min-[380px]:items-center gap-3 sm:gap-4 px-3 py-3.5 sm:px-4 sm:py-4 ${
                                  isSelected ? "bg-[#C9A063]/[0.06]" : "bg-white"
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <div className="w-[88px] sm:w-[120px] h-[56px] sm:h-[72px] flex-shrink-0 flex items-center justify-center">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={imageSrc}
                                      alt={vehicle.name}
                                      className="max-w-full max-h-full object-contain"
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-[14px] sm:text-[15px] font-medium text-gray-800 leading-snug">
                                      {vehicle.name}
                                    </h4>
                                    <p className="mt-0.5 text-[20px] sm:text-[22px] font-bold text-[#4A2C5A] tabular-nums leading-tight">
                                      {suggested != null ? (
                                        <>
                                          CAD{suggested.toFixed(2)}
                                          {bookingMode === "hourly" ? (
                                            <span className="text-[11px] font-medium text-gray-400 ml-1">
                                              / {hourlyDuration}h
                                            </span>
                                          ) : null}
                                        </>
                                      ) : (
                                        <span className="text-[14px] font-semibold text-gray-400">
                                          Enter route for fare
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex-shrink-0 flex flex-row min-[380px]:flex-col items-center min-[380px]:items-end justify-between gap-2 max-[379px]:w-full pl-[100px] min-[380px]:pl-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedVehicle(vehicle.id);
                                      setFareManual(false);
                                      setStepError("");
                                      setCurrentStep(3);
                                      window.scrollTo({ top: 0, behavior: "smooth" });
                                    }}
                                    className={`min-h-11 px-5 py-2 rounded-full text-[13px] font-semibold uppercase tracking-wide max-[379px]:flex-1 ${
                                      isSelected
                                        ? "bg-gray-900 text-white"
                                        : "bg-gray-200/90 text-gray-600"
                                    }`}
                                  >
                                    {isSelected ? "Selected" : "Select"}
                                  </button>
                                  <div className="flex items-center gap-3 text-gray-500">
                                    <span className="inline-flex items-center gap-1">
                                      <Users className="w-3.5 h-3.5" strokeWidth={1.75} />
                                      <span className="w-5 h-5 rounded-full bg-gray-100 text-[10px] font-semibold text-gray-600 flex items-center justify-center tabular-nums">
                                        {seats}
                                      </span>
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                      <Briefcase className="w-3.5 h-3.5" strokeWidth={1.75} />
                                      <span className="w-5 h-5 rounded-full bg-gray-100 text-[10px] font-semibold text-gray-600 flex items-center justify-center tabular-nums">
                                        {bags}
                                      </span>
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Contact */}
                {currentStep === 3 && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] sm:text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                          First Name *
                        </label>
                        <div className="relative">
                          <User
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#C9A063]"
                            strokeWidth={2}
                          />
                          <input
                            type="text"
                            placeholder="John"
                            value={firstName}
                            onChange={(e) => {
                              setFirstName(e.target.value);
                              setStepError("");
                            }}
                            className="w-full min-h-11 pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A063]/20 focus:border-[#C9A063]"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] sm:text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                          Last Name *
                        </label>
                        <div className="relative">
                          <User
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#C9A063]"
                            strokeWidth={2}
                          />
                          <input
                            type="text"
                            placeholder="Smith"
                            value={lastName}
                            onChange={(e) => {
                              setLastName(e.target.value);
                              setStepError("");
                            }}
                            className="w-full min-h-11 pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A063]/20 focus:border-[#C9A063]"
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] sm:text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                        Email Address *
                      </label>
                      <div className="relative">
                        <Mail
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#C9A063]"
                          strokeWidth={2}
                        />
                        <input
                          type="email"
                          placeholder="john.smith@example.com"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            setStepError("");
                          }}
                          className="w-full min-h-11 pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A063]/20 focus:border-[#C9A063]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] sm:text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                        Phone Number *
                      </label>
                      <div className="flex rounded-lg border border-gray-200 min-h-11 focus-within:border-[#C9A063] focus-within:ring-2 focus-within:ring-[#C9A063]/20">
                        <select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="min-h-11 px-3 py-2 bg-gray-50 border-r border-gray-200 rounded-l-lg text-[13px] font-semibold text-gray-900 focus:outline-none"
                        >
                          {COUNTRY_CODES.map((c) => (
                            <option key={c.label} value={c.code}>
                              {c.code} {c.label}
                            </option>
                          ))}
                        </select>
                        <div className="relative flex-1">
                          <Phone
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#C9A063]"
                            strokeWidth={2}
                          />
                          <input
                            type="tel"
                            placeholder="123-456-7890"
                            value={phone}
                            onChange={(e) => {
                              setPhone(e.target.value);
                              setStepError("");
                            }}
                            className="w-full min-h-11 pl-9 pr-3 py-2.5 bg-transparent text-base text-gray-900 placeholder-gray-400 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] sm:text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                        Special Requirements (Optional)
                      </label>
                      <textarea
                        placeholder="Special requests"
                        rows={3}
                        value={specialRequirements}
                        onChange={(e) => setSpecialRequirements(e.target.value)}
                        className="w-full min-h-[88px] px-3 py-2.5 border border-gray-200 rounded-lg text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A063]/20 focus:border-[#C9A063] resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* Step 4: Confirmation — admin create (no card charge) */}
                {currentStep === 4 && (
                  <div className="space-y-3">
                    <div className="bg-[#C9A063]/8 border border-[#C9A063]/25 rounded-xl p-3.5">
                      <h3 className="text-[13px] font-semibold text-gray-900 mb-0.5">
                        Staff confirmation
                      </h3>
                      <p className="text-[12px] text-gray-600">
                        Review the summary, adjust fare if needed, then create the booking. Customer
                        can pay later with the Stripe link (unlike online reservation).
                      </p>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                      <div className="px-4 py-3">
                        <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                          Ride Fare ($)
                        </label>
                        <input
                          type="number"
                          value={rideFare}
                          onChange={(e) => {
                            setFareManual(true);
                            setRideFare(e.target.value);
                            setStepError("");
                          }}
                          placeholder="0.00"
                          step="0.01"
                          className="w-full min-h-11 px-3 py-2.5 border border-gray-200 rounded-lg text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#C9A063]/20 focus:border-[#C9A063]"
                        />
                        <p className="text-[11px] text-gray-400 mt-1">
                          Auto-suggested from vehicle + distance/hours — you can override
                        </p>
                      </div>
                      <div className="px-4 py-3">
                        <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                          Admin, Fuel &amp; Grat
                        </label>
                        <button
                          type="button"
                          onClick={() => setTipModalOpen(true)}
                          className="w-full flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-[#f8fafc] px-3 py-3 text-left"
                        >
                          <div>
                            <div className="text-[13px] font-semibold text-gray-900">
                              Admin, Fuel &amp; Grat
                            </div>
                            <div className="text-[12px] text-gray-500">{gratuityPercent}%</div>
                          </div>
                          <span className="text-gray-400 text-sm">›</span>
                        </button>
                      </div>
                      <div className="px-4 py-3">
                        <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                          Payment Status
                        </label>
                        <select
                          value={paymentStatus}
                          onChange={(e) => setPaymentStatus(e.target.value)}
                          className="w-full min-h-11 px-3 py-2.5 border border-gray-200 rounded-lg text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#C9A063]/20 focus:border-[#C9A063]"
                        >
                          <option value="PENDING">Pending — create now, customer pays later</option>
                          <option value="PAID">Already paid</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      </div>
                    </div>

                    {error && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <p className="text-red-600 text-sm">{error}</p>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="w-full min-h-12 py-3.5 bg-gradient-to-r from-[#C9A063] to-[#A68B5B] text-white rounded-xl font-bold text-[16px] hover:from-[#B89552] hover:to-[#957A4A] transition-all shadow-lg shadow-[#C9A063]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Creating Reservation...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          Create Reservation
                        </>
                      )}
                    </button>
                  </div>
                )}

                {stepError && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                    <p className="text-red-700 text-[13px] font-medium">{stepError}</p>
                  </div>
                )}

                <div className="hidden sm:flex flex-row justify-between items-center gap-2.5 mt-3 pt-3 border-t border-gray-200/60">
                  <button
                    type="button"
                    onClick={handlePrevious}
                    disabled={currentStep === 1}
                    className={`min-h-11 px-4 py-2.5 rounded-lg text-[14px] font-medium transition-colors ${
                      currentStep === 1
                        ? "bg-[#e5e5ea] text-gray-400 cursor-not-allowed"
                        : "bg-white border border-gray-200 text-gray-700 hover:bg-[#f2f2f7]"
                    }`}
                  >
                    Previous
                  </button>
                  {currentStep < 4 ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="min-h-11 flex items-center justify-center gap-1.5 bg-[#1C1C1E] text-white px-5 py-2.5 rounded-lg text-[14px] font-medium hover:bg-[#2C2C2E] transition-colors"
                    >
                      Continue
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : null}
                </div>
                {currentStep > 1 ? (
                  <div className="sm:hidden mt-3 pt-3 border-t border-gray-200/60">
                    <button
                      type="button"
                      onClick={handlePrevious}
                      className="w-full min-h-11 px-4 py-2.5 rounded-lg text-[14px] font-medium bg-white border border-gray-200 text-gray-700"
                    >
                      Previous
                    </button>
                  </div>
                ) : null}
                {currentStep < 4 ? (
                  <div className="sm:hidden mt-2">
                    <button
                      type="button"
                      onClick={handleNext}
                      className="w-full min-h-11 flex items-center justify-center gap-1.5 bg-[#1C1C1E] text-white px-5 py-2.5 rounded-lg text-[14px] font-medium"
                    >
                      Continue
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Keep DirectionsService alive off the map panel so fare stays in sync */}
          {showDropoff &&
          pickupLocation &&
          dropoffLocation &&
          !(currentStep === 1 && showDropoff && pickupLocation && dropoffLocation) ? (
            <div className="hidden" aria-hidden>
              <RouteMap
                pickupLocation={pickupLocation}
                dropoffLocation={dropoffLocation}
                stops={stops}
                onRouteCalculated={handleRouteCalculated}
              />
            </div>
          ) : null}

          {/* Right: Map (step 1) or Summary */}
          <aside className="lg:col-span-1 flex">
            <div
              className={`w-full overflow-hidden bg-white flex flex-col rounded-2xl border border-gray-200 shadow-sm ${
                currentStep === 1 ? "min-h-[320px]" : ""
              }`}
            >
              {currentStep === 1 && showDropoff && pickupLocation && dropoffLocation ? (
                <>
                  <div className="relative flex-1 min-h-[280px] bg-gray-100">
                    <div className="absolute inset-0">
                      <RouteMap
                        pickupLocation={pickupLocation}
                        dropoffLocation={dropoffLocation}
                        stops={stops}
                        onRouteCalculated={handleRouteCalculated}
                      />
                    </div>
                  </div>
                  <div className="shrink-0 px-3 py-2 border-t border-gray-100 bg-white">
                    <div className="flex items-center justify-between gap-3 text-[12px]">
                      <span className="text-gray-500 font-medium">
                        Distance{" "}
                        <span className="text-gray-900 font-semibold tabular-nums">
                          {routeDistance !== "--" ? routeDistance : "-- km"}
                        </span>
                      </span>
                      <span className="text-gray-500 font-medium">
                        Duration{" "}
                        <span className="text-gray-900 font-semibold tabular-nums">
                          {routeDuration !== "--" ? routeDuration : "-- min"}
                        </span>
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-[#f8f9fa] p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-[18px] sm:text-[20px] font-bold text-gray-900 tracking-tight">
                      Summary
                    </h3>
                    {currentStep > 1 && (
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className="inline-flex items-center gap-1 text-[12px] font-medium text-[#C9A063] hover:text-[#B8935A]"
                      >
                        <Pencil className="w-3 h-3" strokeWidth={2} />
                        Edit
                      </button>
                    )}
                  </div>

                  <div className="divide-y divide-gray-200/90">
                    <div className="py-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-1">
                        Service Type
                      </div>
                      <div className="text-[14px] text-gray-900">
                        {isParcel
                          ? "Parcel Delivery"
                          : bookingMode === "distance"
                            ? "Distance"
                            : "Hourly"}
                      </div>
                    </div>
                    <div className="py-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-1">
                        Pickup Location
                      </div>
                      <div className="text-[14px] text-gray-900 break-words leading-snug">
                        {pickupLocation || "--"}
                      </div>
                    </div>
                    {showDropoff && (
                      <div className="py-3">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-1">
                          Drop-off Location
                        </div>
                        <div className="text-[14px] text-gray-900 break-words leading-snug">
                          {dropoffLocation || "--"}
                        </div>
                      </div>
                    )}
                    {bookingMode === "hourly" && (
                      <div className="py-3">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-1">
                          Duration
                        </div>
                        <div className="text-[14px] text-gray-900">{hourlyDuration} hours</div>
                      </div>
                    )}
                    <div className="py-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-1">
                        Pickup Date, Time
                      </div>
                      <div className="text-[14px] text-gray-900">
                        {pickupDateTime
                          ? pickupDateTime
                              .toLocaleString("en-GB", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                                hour12: true,
                              })
                              .replace(/\//g, "-")
                          : "--"}
                      </div>
                    </div>
                    {showDropoff && (
                      <div className="py-3 grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-1">
                            Total Distance
                          </div>
                          <div className="text-[14px] text-gray-900 tabular-nums">
                            {routeDistance !== "--" ? routeDistance : "-- km"}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-1">
                            Total Time
                          </div>
                          <div className="text-[14px] text-gray-900 tabular-nums">
                            {routeDurationValue > 0
                              ? `${Math.floor(routeDurationValue / 3600)} h ${Math.floor(
                                  (routeDurationValue % 3600) / 60
                                )} m`
                              : routeDuration !== "--"
                                ? routeDuration
                                : "--"}
                          </div>
                        </div>
                      </div>
                    )}
                    {stopCount > 0 && (
                      <div className="py-3">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-1">
                          Stops
                        </div>
                        <div className="text-[14px] text-gray-900">{stopCount}</div>
                      </div>
                    )}
                    <div className="py-3">
                      <div className="rounded-lg bg-[#f1f2f4] px-3 py-2.5">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-1">
                          {isParcel ? "Recipient" : "Passengers"}
                        </div>
                        <div className="text-[14px] text-gray-900">
                          {isParcel
                            ? [recipientName, recipientPhone].filter(Boolean).join(" · ") || "—"
                            : `${adultsCount} adult${adultsCount === 1 ? "" : "s"}${
                                childrenCount > 0
                                  ? `, ${childrenCount} child${childrenCount === 1 ? "" : "ren"}`
                                  : ""
                              }`}
                        </div>
                      </div>
                    </div>
                    {(firstName || lastName) && (
                      <div className="py-3">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-1">
                          Guest
                        </div>
                        <div className="text-[14px] text-gray-900">
                          {[firstName, lastName].filter(Boolean).join(" ")}
                        </div>
                      </div>
                    )}
                    {selectedVehicle && (
                      <div className="py-3">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-1">
                          Vehicle
                        </div>
                        <div className="flex items-center gap-3">
                          {(() => {
                            const v = resolveVehicle(selectedVehicle);
                            if (!v) return <span className="text-[14px] text-gray-900">—</span>;
                            const imageSrc =
                              (v as FleetVehicle & { imageUrl?: string }).imageUrl || v.image;
                            return (
                              <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={imageSrc}
                                  alt={v.name}
                                  className="w-16 h-10 object-contain"
                                />
                                <div className="min-w-0">
                                  <div className="text-[13px] font-semibold text-gray-900 truncate">
                                    {v.dropdownName}
                                  </div>
                                  <div className="text-[12px] text-gray-500 truncate">{v.name}</div>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 space-y-2 border-t border-gray-200/90 pt-3">
                    <div className="text-[12px] font-semibold text-gray-800 mb-1">Fare & tip</div>
                    <div className="flex items-center justify-between text-[13px] text-gray-700">
                      <span>Ride fare</span>
                      <span className="tabular-nums font-medium">${rideFareNum.toFixed(2)}</span>
                    </div>
                    {stopCharge > 0 && (
                      <div className="flex items-center justify-between text-[13px] text-gray-700">
                        <span>Stops</span>
                        <span className="tabular-nums">${stopCharge.toFixed(2)}</span>
                      </div>
                    )}
                    {childSeatCharge > 0 && (
                      <div className="flex items-center justify-between text-[13px] text-gray-700">
                        <span>Child seat</span>
                        <span className="tabular-nums">${childSeatCharge.toFixed(2)}</span>
                      </div>
                    )}
                    {meetGreetCharge > 0 && (
                      <div className="flex items-center justify-between text-[13px] text-gray-700">
                        <span>Meet &amp; Greet</span>
                        <span className="tabular-nums">${meetGreetCharge.toFixed(2)}</span>
                      </div>
                    )}
                    {bouquetCharge > 0 && (
                      <div className="flex items-center justify-between text-[13px] text-gray-700">
                        <span>Bouquet</span>
                        <span className="tabular-nums">${bouquetCharge.toFixed(2)}</span>
                      </div>
                    )}
                    {airportPickupFee > 0 && (
                      <div className="flex items-center justify-between text-[13px] text-gray-700">
                        <span>Airport pickup fee ( GTA )</span>
                        <span className="tabular-nums">${airportPickupFee.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[13px] text-gray-700 border-t border-gray-100 pt-2">
                      <span>Subtotal</span>
                      <span className="tabular-nums">${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[13px] text-gray-700">
                      <span>HST (13%)</span>
                      <span className="tabular-nums">${hst.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[13px] text-gray-700">
                      <span>Admin, Fuel &amp; Grat ({gratuityPercent}%)</span>
                      <span className="tabular-nums">${gratuity.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[16px] font-bold pt-2 border-t border-gray-200">
                      <span className="text-gray-900">Total</span>
                      <span className="text-[#C9A063] tabular-nums">${total.toFixed(2)}</span>
                    </div>
                    <div className="text-[11px] text-gray-500 pt-1">
                      Payment:{" "}
                      <span className="font-semibold text-gray-700">{paymentStatus}</span>
                    </div>
                    {currentStep >= 3 && currentStep < 4 && selectedVehicle ? (
                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className="w-full min-h-11 mt-2 inline-flex items-center justify-center text-[13px] font-medium text-[#C9A063] hover:text-[#B8935A]"
                      >
                        Change vehicle
                      </button>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {tipModalOpen ? (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label="Close"
            onClick={() => setTipModalOpen(false)}
          />
          <div className="relative z-[81] w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl px-5 pt-3 pb-6 shadow-xl">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-300 sm:hidden" />
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[22px] font-bold text-gray-900">Admin, Fuel &amp; Grat</h3>
              <button
                type="button"
                onClick={() => setTipModalOpen(false)}
                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[13px] text-gray-500 mb-4">
              Administration Fuel and Gratuity. You can increase it to 20% or 25%.
            </p>
            <div className="grid grid-cols-3 gap-2.5">
              {APP_GRATUITY_PERCENTS.map((pct) => {
                const selected = gratuityPercent === pct;
                return (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => {
                      setGratuityPercent(pct);
                      setTipModalOpen(false);
                    }}
                    className={`min-h-[72px] rounded-2xl border-2 text-[22px] font-bold ${
                      selected
                        ? "bg-gray-900 border-gray-900 text-white"
                        : "bg-[#f8fafc] border-gray-200 text-gray-900"
                    }`}
                  >
                    {pct}%
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
