"use client";

import { useState, useCallback, useEffect } from "react";
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
} from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { fleetData, getFleetForReservation, type FleetVehicle } from "@/data/fleet";
import PlacesAutocomplete from "@/components/PlacesAutocomplete";
import RouteMap from "@/components/RouteMap";
import {
  APP_GRATUITY_PERCENTS,
  STOP_CHARGE,
  CHILD_SEAT_CHARGE,
  MEET_GREET_CHARGE,
  BOUQUET_CHARGE,
  HST_RATE,
  BASE_DISTANCE_KM,
  EXTRA_KM_RATE,
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

function calcDistanceFare(basePrice: number, distanceMeters: number): number {
  const km = distanceMeters / 1000;
  if (km <= BASE_DISTANCE_KM) return basePrice;
  return basePrice + (km - BASE_DISTANCE_KM) * EXTRA_KM_RATE;
}

export default function CustomReservationForm() {
  const [bookingMode, setBookingMode] = useState<"distance" | "hourly">("distance");
  const [serviceType, setServiceType] = useState("Point-to-Point transportation");
  const [hourlyDuration, setHourlyDuration] = useState(3);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [reservationFleet, setReservationFleet] = useState<FleetVehicle[]>(fleetData);
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
  const [gratuityPercent, setGratuityPercent] = useState(0);
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
  const availableVehicles = getFleetForReservation(
    isParcel ? 1 : passengersCount,
    reservationFleet
  );

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

  // Auto-suggest fare from fleet pricing (admin can still override)
  useEffect(() => {
    if (fareManual || !selectedVehicle) return;
    const vehicle = resolveVehicle(selectedVehicle);
    if (!vehicle) return;
    let fare = vehicle.price;
    if (bookingMode === "hourly") {
      fare = vehicle.price * hourlyDuration;
    } else if (routeDistanceValue > 0) {
      fare = calcDistanceFare(vehicle.price, routeDistanceValue);
    }
    setRideFare(fare > 0 ? fare.toFixed(2) : "");
  }, [selectedVehicle, bookingMode, hourlyDuration, routeDistanceValue, fareManual, resolveVehicle]);

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
  const subtotal =
    rideFareNum + stopCharge + childSeatCharge + meetGreetCharge + bouquetCharge;
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

  const handleSubmit = async () => {
    setError("");

    if (!firstName || !lastName || !email || !phone) {
      setError("Please fill in all contact information.");
      return;
    }
    if (!serviceType || !selectedVehicle) {
      setError("Please select service type and vehicle.");
      return;
    }
    if (!pickupLocation) {
      setError("Please enter a pickup location.");
      return;
    }
    if (showDropoff && !dropoffLocation.trim()) {
      setError("Please enter a drop-off location.");
      return;
    }
    if (!pickupDateTime) {
      setError("Please select pickup date and time.");
      return;
    }
    if (isParcel) {
      if (!recipientName.trim() || !recipientPhone.trim()) {
        setError("Please enter parcel recipient name and phone.");
        return;
      }
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
    setBookingMode("distance");
    setServiceType("Point-to-Point transportation");
    setHourlyDuration(3);
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setSelectedVehicle("");
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
    setGratuityPercent(0);
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
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Create Custom Reservation</h1>
          <p className="text-gray-500 text-sm mt-1">
            Create the booking now — payment can be collected later via Stripe link (unlike online
            reservation)
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6 lg:items-start">
        <div className="lg:col-span-2 space-y-5">
          {/* Booking mode — same as online reservation */}
          <div className="bg-white rounded-xl border border-gray-200/60 p-3">
            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">
              Booking Mode
            </label>
            <div className="grid grid-cols-3 p-0.5 rounded-lg bg-gray-100 border border-gray-200/70">
              <button
                type="button"
                onClick={setModeDistance}
                className={`py-2 rounded-md text-[11px] font-semibold uppercase tracking-wide transition-all ${
                  bookingMode === "distance" && !isParcel
                    ? "bg-gray-900 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                Distance
              </button>
              <button
                type="button"
                onClick={setModeHourly}
                className={`py-2 rounded-md text-[11px] font-semibold uppercase tracking-wide transition-all ${
                  bookingMode === "hourly"
                    ? "bg-gray-900 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                Hourly
              </button>
              <button
                type="button"
                onClick={setModeParcel}
                className={`py-2 rounded-md text-[11px] font-semibold uppercase tracking-wide transition-all ${
                  isParcel
                    ? "bg-gray-900 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                Parcel
              </button>
            </div>
            <p className="text-[12px] text-gray-500 mt-2">
              Service: <span className="font-medium text-gray-800">{serviceType}</span>
            </p>
          </div>

          {/* Route */}
          <div className="bg-white rounded-xl border border-gray-200/60 divide-y divide-gray-100">
            <div className="px-4 py-3">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-green-600" strokeWidth={2} />
                </div>
                <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                  Pickup
                </label>
              </div>
              <PlacesAutocomplete
                value={pickupLocation}
                onChange={(val) => setPickupLocation(val)}
                placeholder="Address or airport code (e.g. YYZ)"
                className="w-full py-1.5 bg-transparent text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none"
              />
            </div>
            {showDropoff && (
              <div className="px-4 py-3">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-red-600" strokeWidth={2} />
                  </div>
                  <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                    Drop-off
                  </label>
                </div>
                <PlacesAutocomplete
                  value={dropoffLocation}
                  onChange={(val) => setDropoffLocation(val)}
                  placeholder="Destination address"
                  className="w-full py-1.5 bg-transparent text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none"
                />
              </div>
            )}
            {bookingMode === "hourly" && (
              <div className="px-4 py-3">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-[#C9A063]/15 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-[#C9A063]" strokeWidth={2} />
                  </div>
                  <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                    Duration (Hours)
                  </label>
                </div>
                <select
                  value={hourlyDuration}
                  onChange={(e) => {
                    setHourlyDuration(parseInt(e.target.value, 10));
                    setFareManual(false);
                  }}
                  className="w-full py-1.5 bg-transparent text-[15px] text-gray-900 focus:outline-none"
                >
                  {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => (
                    <option key={h} value={h}>
                      {h} hours
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {stops.map((stop, index) => (
            <div key={index} className="bg-white rounded-xl border border-gray-200/60 px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#C9A063]/20 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-[#C9A063]" strokeWidth={2} />
                  </div>
                  <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                    Stop {index + 1}
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => removeStop(index)}
                  className="p-1 text-gray-400 hover:text-red-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <PlacesAutocomplete
                value={stop}
                onChange={(val) => updateStop(index, val)}
                placeholder="Stop address"
                className="w-full py-1.5 bg-transparent text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none"
              />
            </div>
          ))}

          <button
            type="button"
            onClick={addStop}
            className="flex items-center gap-2 text-[#007AFF] text-[15px] font-medium"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Add Stop
          </button>

          {pickupLocation && showDropoff && dropoffLocation && (
            <div className="bg-white rounded-xl border border-gray-200/60 overflow-hidden">
              <div className="h-48 relative">
                <RouteMap
                  pickupLocation={pickupLocation}
                  dropoffLocation={dropoffLocation}
                  stops={stops}
                  onRouteCalculated={handleRouteCalculated}
                />
              </div>
            </div>
          )}

          {showDropoff && (
            <div className="bg-white rounded-xl border border-gray-200/60 divide-y divide-gray-100">
              <div className="px-4 py-3">
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Distance
                </label>
                <span className="text-[15px] text-gray-900 font-medium">{routeDistance}</span>
              </div>
              <div className="px-4 py-3">
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Duration
                </label>
                <span className="text-[15px] text-gray-900 font-medium">{routeDuration}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">
              Pick-up Time
            </label>
            <div className="relative reservation-datepicker">
              <DatePicker
                selected={pickupDateTime}
                onChange={(date: Date | null) => setPickupDateTime(date)}
                showTimeSelect
                timeIntervals={15}
                timeCaption="Time"
                dateFormat="MMMM d, yyyy  h:mm aa"
                timeFormat="h:mm aa"
                placeholderText="Select date & time"
                className="w-full px-4 py-3 pr-11 border border-gray-200 rounded-xl text-[15px] text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#C9A063]/20 focus:border-[#C9A063] transition-all duration-200"
                withPortal
              />
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                <Clock className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200/60 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                Select Vehicle
              </label>
              <p className="text-[12px] text-gray-400 mt-0.5">
                Tap a car to select — photos and capacity shown
              </p>
            </div>
            <div className="divide-y divide-gray-100 max-h-[420px] overflow-y-auto">
              {availableVehicles.map((vehicle) => {
                const isSelected = selectedVehicle === vehicle.id;
                const seats =
                  parseInt(vehicle.seating.match(/(\d+)/)?.[1] || "3", 10) || 3;
                const bags =
                  parseInt(vehicle.luggage.match(/(\d+)/)?.[1] || "2", 10) || 2;
                const imageSrc =
                  (vehicle as FleetVehicle & { imageUrl?: string }).imageUrl ||
                  vehicle.image;
                let suggested = vehicle.price;
                if (bookingMode === "hourly") {
                  suggested = vehicle.price * hourlyDuration;
                } else if (routeDistanceValue > 0) {
                  suggested = calcDistanceFare(vehicle.price, routeDistanceValue);
                }
                return (
                  <button
                    key={vehicle.id}
                    type="button"
                    onClick={() => {
                      setSelectedVehicle(vehicle.id);
                      setFareManual(false);
                    }}
                    className={`w-full flex items-center gap-3 sm:gap-4 px-3 py-3.5 sm:px-4 text-left transition-colors ${
                      isSelected
                        ? "bg-[#C9A063]/10 ring-inset ring-2 ring-[#C9A063]/40"
                        : "bg-white hover:bg-gray-50"
                    }`}
                  >
                    <div className="w-[88px] sm:w-[110px] h-[56px] sm:h-[68px] flex-shrink-0 flex items-center justify-center rounded-lg bg-gray-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageSrc}
                        alt={vehicle.name}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[13px] sm:text-[15px] font-semibold text-gray-900 truncate">
                        {vehicle.dropdownName}
                      </h4>
                      <p className="text-[12px] text-gray-500 truncate">{vehicle.name}</p>
                      <p className="mt-0.5 text-[16px] sm:text-[18px] font-bold text-[#4A2C5A] tabular-nums">
                        CAD{suggested.toFixed(2)}
                        {bookingMode === "hourly" ? (
                          <span className="text-[11px] font-medium text-gray-400 ml-1">
                            / {hourlyDuration}h
                          </span>
                        ) : null}
                      </p>
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-end gap-2">
                      <span
                        className={`px-3.5 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wide ${
                          isSelected
                            ? "bg-gray-900 text-white"
                            : "bg-gray-200/90 text-gray-600"
                        }`}
                      >
                        {isSelected ? "Selected" : "Select"}
                      </span>
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
                  </button>
                );
              })}
              {availableVehicles.length === 0 && (
                <div className="px-4 py-8 text-center text-[13px] text-gray-500">
                  No vehicles match this passenger count.
                </div>
              )}
            </div>
          </div>

          {/* Passengers / Parcel recipient */}
          {isParcel ? (
            <div className="bg-white rounded-xl border border-gray-200/60 divide-y divide-gray-100">
              <div className="px-4 py-3">
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Recipient Name
                </label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Recipient full name"
                  className="w-full py-1.5 bg-transparent text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none"
                />
              </div>
              <div className="px-4 py-3">
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Recipient Phone
                </label>
                <input
                  type="tel"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="Recipient phone"
                  className="w-full py-1.5 bg-transparent text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none"
                />
              </div>
              <div className="px-4 py-3">
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Parcel Weight (optional)
                </label>
                <input
                  type="text"
                  value={parcelWeight}
                  onChange={(e) => setParcelWeight(e.target.value)}
                  placeholder="e.g. 2.5 kg"
                  className="w-full py-1.5 bg-transparent text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none"
                />
              </div>
              <div className="px-4 py-3">
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Parcel Note (optional)
                </label>
                <input
                  type="text"
                  value={parcelNote}
                  onChange={(e) => setParcelNote(e.target.value)}
                  placeholder="Fragile, leave at door, etc."
                  className="w-full py-1.5 bg-transparent text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none"
                />
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200/60 divide-y divide-gray-100">
              <div className="px-4 py-3">
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Adults
                </label>
                <div className="flex items-center justify-between">
                  <span className="text-[15px] text-gray-900">{adultsCount}</span>
                  <div className="flex items-center rounded-lg overflow-hidden border border-gray-200">
                    <button
                      type="button"
                      onClick={() => setAdultsCount(Math.max(1, adultsCount - 1))}
                      className="p-2 bg-[#f2f2f7] text-gray-600"
                    >
                      <Minus className="w-4 h-4" strokeWidth={2.5} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdultsCount(Math.min(50, adultsCount + 1))}
                      className="p-2 bg-[#f2f2f7] text-gray-600 border-l border-gray-200"
                    >
                      <Plus className="w-4 h-4" strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="px-4 py-3">
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Children
                </label>
                <div className="flex items-center justify-between">
                  <span className="text-[15px] text-gray-900">{childrenCount}</span>
                  <div className="flex items-center rounded-lg overflow-hidden border border-gray-200">
                    <button
                      type="button"
                      onClick={() => setChildrenCount(Math.max(0, childrenCount - 1))}
                      className="p-2 bg-[#f2f2f7] text-gray-600"
                    >
                      <Minus className="w-4 h-4" strokeWidth={2.5} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setChildrenCount(Math.min(20, childrenCount + 1))}
                      className="p-2 bg-[#f2f2f7] text-gray-600 border-l border-gray-200"
                    >
                      <Plus className="w-4 h-4" strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="px-4 py-2.5 bg-gray-50">
                <p className="text-[12px] text-gray-500">
                  Total passengers:{" "}
                  <span className="font-semibold text-gray-800">{passengersCount}</span>
                </p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200/60 px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                  407 ETR
                </label>
                <span className="text-[13px] text-gray-600">Highway 407 Express Toll Route</span>
              </div>
              <button
                type="button"
                onClick={() => setEtr407(!etr407)}
                className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${
                  etr407 ? "bg-[#C9A063]" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-300 ${
                    etr407 ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {!isParcel && (
            <>
              <div className="bg-white rounded-xl border border-gray-200/60 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                      Child Seat
                    </label>
                    <span className="text-[13px] text-gray-600">
                      Child Seat: ${CHILD_SEAT_CHARGE}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setChildSeatCount(Math.max(0, childSeatCount - 1))}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-[15px] font-semibold text-gray-900 w-6 text-center">
                      {childSeatCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => setChildSeatCount(childSeatCount + 1)}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {childSeatCount > 0 && (
                  <div className="mt-3">
                    <input
                      type="text"
                      placeholder="Child Seat Type (e.g., Infant, Toddler, Booster)"
                      value={childSeatType}
                      onChange={(e) => setChildSeatType(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#C9A063]"
                    />
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl border border-gray-200/60 divide-y divide-gray-100">
                <div className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                      Meet &amp; Greet
                    </label>
                    <span className="text-[13px] text-gray-600">
                      Personal airport assistance +${MEET_GREET_CHARGE}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMeetGreet(!meetGreet)}
                    className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${
                      meetGreet ? "bg-[#C9A063]" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-300 ${
                        meetGreet ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
                <div className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                      Bouquet of Flowers
                    </label>
                    <span className="text-[13px] text-gray-600">
                      Fresh flowers for your ride +${BOUQUET_CHARGE}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBouquetFlowers(!bouquetFlowers)}
                    className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${
                      bouquetFlowers ? "bg-[#C9A063]" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-300 ${
                        bouquetFlowers ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </>
          )}

          <div className="bg-white rounded-xl border border-gray-200/60 divide-y divide-gray-100">
            <div className="px-4 py-3">
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">
                First Name
              </label>
              <div className="relative">
                <User className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-[#C9A063]" />
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  className="w-full pl-7 py-1.5 bg-transparent text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none"
                />
              </div>
            </div>
            <div className="px-4 py-3">
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">
                Last Name
              </label>
              <div className="relative">
                <User className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-[#C9A063]" />
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Smith"
                  className="w-full pl-7 py-1.5 bg-transparent text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none"
                />
              </div>
            </div>
            <div className="px-4 py-3">
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-[#C9A063]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john.smith@example.com"
                  className="w-full pl-7 py-1.5 bg-transparent text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none"
                />
              </div>
            </div>
            <div className="px-4 py-3">
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">
                Phone Number
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="bg-transparent text-[15px] text-gray-900 focus:outline-none"
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.label} value={c.code}>
                      {c.code}
                    </option>
                  ))}
                </select>
                <div className="relative flex-1">
                  <Phone className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-[#C9A063]" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="123-456-7890"
                    className="w-full pl-7 py-1.5 bg-transparent text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200/60 px-4 py-3">
            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">
              Special Requirements
            </label>
            <textarea
              value={specialRequirements}
              onChange={(e) => setSpecialRequirements(e.target.value)}
              rows={3}
              placeholder="Any special requirements or notes..."
              className="w-full py-1.5 bg-transparent text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none resize-none"
            />
          </div>

          <div className="bg-white rounded-xl border border-gray-200/60 divide-y divide-gray-100">
            <div className="px-4 py-3">
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">
                Ride Fare ($)
              </label>
              <input
                type="number"
                value={rideFare}
                onChange={(e) => {
                  setFareManual(true);
                  setRideFare(e.target.value);
                }}
                placeholder="0.00"
                step="0.01"
                className="w-full py-1.5 bg-transparent text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Auto-suggested from vehicle + distance/hours — you can override
              </p>
            </div>
            <div className="px-4 py-3">
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">
                Gratuity
              </label>
              <button
                type="button"
                onClick={() => setTipModalOpen(true)}
                className="w-full flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-[#f8fafc] px-3 py-3 text-left"
              >
                <div>
                  <div className="text-[14px] font-semibold text-gray-900">Add tip</div>
                  <div className="text-[12px] text-gray-500 mt-0.5">
                    {gratuityPercent > 0 ? `${gratuityPercent}%` : "Optional"}
                  </div>
                </div>
                <span className="text-gray-400 text-sm">›</span>
              </button>
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
                  <h3 className="text-[22px] font-bold text-gray-900">Add a tip</h3>
                  <button
                    type="button"
                    onClick={() => setTipModalOpen(false)}
                    className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
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
                <button
                  type="button"
                  onClick={() => {
                    setGratuityPercent(0);
                    setTipModalOpen(false);
                  }}
                  className="mt-4 w-full py-3 text-[15px] font-semibold text-gray-500"
                >
                  No tip
                </button>
              </div>
            </div>
          ) : null}

          <div className="bg-white rounded-xl border border-gray-200/60 px-4 py-3">
            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">
              Payment Status
            </label>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              className="w-full py-1.5 bg-transparent text-[15px] text-gray-900 focus:outline-none"
            >
              <option value="PENDING">Pending — create now, customer pays later</option>
              <option value="PAID">Already paid</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <p className="text-[11px] text-gray-500 mt-2">
              Custom reservations do not require payment upfront. Use Pending to create the booking
              and share a Stripe link later.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-4 bg-gradient-to-r from-[#C9A063] to-[#A68B5B] text-white rounded-xl font-bold text-[16px] hover:from-[#B89552] hover:to-[#957A4A] transition-all shadow-lg shadow-[#C9A063]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

        {/* Right summary — matches online reservation */}
        <aside className="lg:col-span-1">
          <div className="lg:sticky lg:top-6 rounded-2xl border border-gray-200 bg-[#f8f9fa] overflow-hidden shadow-sm">
            <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3">
              <h3 className="text-[18px] sm:text-[20px] font-bold text-gray-900 tracking-tight">
                Summary
              </h3>
            </div>

            <div className="px-4 sm:px-5 pb-4 divide-y divide-gray-200/90">
              <div className="py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-1">
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
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-1">
                  Pickup Location
                </div>
                <div className="text-[14px] text-gray-900 break-words leading-snug">
                  {pickupLocation || "--"}
                </div>
              </div>

              {showDropoff && (
                <div className="py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-1">
                    Drop-off Location
                  </div>
                  <div className="text-[14px] text-gray-900 break-words leading-snug">
                    {dropoffLocation || "--"}
                  </div>
                </div>
              )}

              {bookingMode === "hourly" && (
                <div className="py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-1">
                    Duration
                  </div>
                  <div className="text-[14px] text-gray-900">{hourlyDuration} hours</div>
                </div>
              )}

              <div className="py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-1">
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
                    <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-1">
                      Total Distance
                    </div>
                    <div className="text-[14px] text-gray-900 tabular-nums">
                      {routeDistance !== "--" ? routeDistance : "-- km"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-1">
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
                  <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-1">
                    Stops
                  </div>
                  <div className="text-[14px] text-gray-900">{stopCount}</div>
                </div>
              )}

              <div className="py-3">
                <div className="rounded-lg bg-[#f1f2f4] px-3 py-2.5">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-1">
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
                  <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-1">
                    Guest
                  </div>
                  <div className="text-[14px] text-gray-900">
                    {[firstName, lastName].filter(Boolean).join(" ")}
                  </div>
                </div>
              )}

              {selectedVehicle && (
                <div className="py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-1">
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

            <div className="px-4 sm:px-5 pb-5 space-y-2 border-t border-gray-200/90 pt-3 bg-white/60">
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
              <div className="flex items-center justify-between text-[13px] text-gray-700 border-t border-gray-100 pt-2">
                <span>Subtotal</span>
                <span className="tabular-nums">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-[13px] text-gray-700">
                <span>HST (13%)</span>
                <span className="tabular-nums">${hst.toFixed(2)}</span>
              </div>
              {gratuityPercent > 0 && (
                <div className="flex items-center justify-between text-[13px] text-gray-700">
                  <span>Tip ({gratuityPercent}%)</span>
                  <span className="tabular-nums">${gratuity.toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-[16px] font-bold pt-2 border-t border-gray-200">
                <span className="text-gray-900">Total</span>
                <span className="text-[#C9A063] tabular-nums">${total.toFixed(2)}</span>
              </div>
              <div className="text-[11px] text-gray-500 pt-1">
                Payment: <span className="font-semibold text-gray-700">{paymentStatus}</span>
              </div>
            </div>
          </div>
        </aside>
        </div>
      </div>
    </div>
  );
}
