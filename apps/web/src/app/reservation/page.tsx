"use client";

import { useState, useRef, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  MapPin, 
  Users, 
  User, 
  Phone, 
  Mail, 
  ArrowRight, 
  CheckCircle,
  Plus,
  Minus,
  X,
  ChevronDown,
  ChevronUp,
  Pencil,
  AlertCircle,
  Loader2,
  Handshake,
  Clock,
  LocateFixed,
  Briefcase,
  CreditCard,
  Banknote,
} from "lucide-react";
import TopNav from "@/components/TopNav";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import RouteMap from "@/components/RouteMap";
import PlacesAutocomplete from "@/components/PlacesAutocomplete";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import StripePayment from "@/components/StripePayment";
import Turnstile from "@/components/Turnstile";
import { fleetData, RESERVATION_HIDE_HOURLY_RATE_IDS, RESERVATION_EXCLUDED_VEHICLE_IDS, getFleetForReservation, type FleetVehicle, type FleetCategory } from "@/data/fleet";
import { calculateReservationPricing } from "@/lib/reservation-pricing";
import { GoogleMapsProvider, useGoogleMaps } from "@/components/GoogleMapsProvider";
import {
  PARCEL_SERVICE_TYPE,
  encodeParcelRequirements,
  formatParcelWeight,
  isParcelServiceType,
} from "@/lib/parcel";

const COUNTRY_CODES = [
  { code: "+1", label: "CA", name: "Canada", flagCode: "ca" },
  { code: "+1", label: "US", name: "United States", flagCode: "us" },
  { code: "+44", label: "UK", name: "United Kingdom", flagCode: "gb" },
  { code: "+33", label: "FR", name: "France", flagCode: "fr" },
  { code: "+49", label: "DE", name: "Germany", flagCode: "de" },
];

function formatHourlyRate(price: number): string {
  const n = Number(price);
  if (!Number.isFinite(n)) return "0";
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function ReservationPageContent() {
  const searchParams = useSearchParams();
  const { isLoaded: mapsLoaded } = useGoogleMaps();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [stops, setStops] = useState<string[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [vehicleCategoryFilter, setVehicleCategoryFilter] = useState<"All" | FleetCategory>("All");
  const [reservationFleet, setReservationFleet] = useState<FleetVehicle[]>(fleetData);
  const [countryCode, setCountryCode] = useState(COUNTRY_CODES[0].code);
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  
  // Dynamic location states
  const [bookingMode, setBookingMode] = useState<"distance" | "hourly">("distance");
  const [serviceType, setServiceType] = useState("Point-to-Point transportation");
  const [pickupLocation, setPickupLocation] = useState("");
  const [dropoffLocation, setDropoffLocation] = useState("");
  const [pickupDateTime, setPickupDateTime] = useState<Date | null>(null);
  const [hourlyDuration, setHourlyDuration] = useState(3);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const handleGetMyLocation = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setLocationError("Location is not supported on this device.");
      return;
    }

    setLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          if (!mapsLoaded || !window.google?.maps) {
            setPickupLocation(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
            setLocating(false);
            return;
          }

          const geocoder = new window.google.maps.Geocoder();
          const address = await new Promise<string>((resolve, reject) => {
            geocoder.geocode(
              { location: { lat: latitude, lng: longitude } },
              (results, status) => {
                if (status === "OK" && results?.[0]?.formatted_address) {
                  resolve(results[0].formatted_address);
                } else {
                  reject(new Error(String(status)));
                }
              }
            );
          });
          setPickupLocation(address);
        } catch {
          setPickupLocation(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
          setLocationError("Address lookup failed — coordinates filled instead.");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError("Location permission denied. Enable it in browser settings.");
        } else if (err.code === err.TIMEOUT) {
          setLocationError("Location request timed out. Try again.");
        } else {
          setLocationError("Could not get your location. Try again.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
      }
    );
  }, [mapsLoaded]);


  // Keep Select Vehicle in sync with /api/fleet (same source as homepage fleet)
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

  // Pre-select vehicle from URL (e.g. Discover Fleet card)
  useEffect(() => {
    const vehicleIdParam = searchParams.get("vehicleId");
    if (!vehicleIdParam || RESERVATION_EXCLUDED_VEHICLE_IDS.has(vehicleIdParam)) return;
    const exists = reservationFleet.some((v) => v.id === vehicleIdParam);
    if (exists) setSelectedVehicle(vehicleIdParam);
  }, [searchParams, reservationFleet]);

  // Clear selection if current vehicle is excluded from reservation (e.g. Sprinter)
  useEffect(() => {
    if (selectedVehicle && RESERVATION_EXCLUDED_VEHICLE_IDS.has(selectedVehicle)) {
      setSelectedVehicle("");
    }
  }, [selectedVehicle]);

  const [transferType, setTransferType] = useState<"oneWay" | "return" | "returnNewRide">("oneWay");
  const [adultsCount, setAdultsCount] = useState(1);
  const [childrenCount, setChildrenCount] = useState(0);
  const passengersCount = adultsCount + childrenCount;

  const availableVehicles = useMemo(
    () => getFleetForReservation(passengersCount, reservationFleet),
    [passengersCount, reservationFleet]
  );

  const vehicleCategories = useMemo(() => {
    const cats = Array.from(new Set(availableVehicles.map((v) => v.category)));
    return cats as FleetCategory[];
  }, [availableVehicles]);

  const filteredVehicles = useMemo(() => {
    if (vehicleCategoryFilter === "All") return availableVehicles;
    return availableVehicles.filter((v) => v.category === vehicleCategoryFilter);
  }, [availableVehicles, vehicleCategoryFilter]);

  // Reset category filter if current filter has no vehicles (e.g. passenger count changed)
  useEffect(() => {
    if (
      vehicleCategoryFilter !== "All" &&
      !availableVehicles.some((v) => v.category === vehicleCategoryFilter)
    ) {
      setVehicleCategoryFilter("All");
    }
  }, [availableVehicles, vehicleCategoryFilter]);

  const resolveVehicle = useCallback(
    (vehicleId: string) =>
      reservationFleet.find((v) => v.id === vehicleId) ?? fleetData.find((v) => v.id === vehicleId),
    [reservationFleet]
  );
  const [returnDateTime, setReturnDateTime] = useState<Date | null>(null);
  const [childSeatCount, setChildSeatCount] = useState(0);
  const [childSeatType, setChildSeatType] = useState("");
  const [etr407, setEtr407] = useState(false);
  const [meetGreet, setMeetGreet] = useState(false);
  const [bouquetFlowers, setBouquetFlowers] = useState(false);
  const [extraOptionsOpen, setExtraOptionsOpen] = useState(false);

  // Contact Info states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [specialRequirements, setSpecialRequirements] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [parcelWeight, setParcelWeight] = useState("");
  const [parcelNote, setParcelNote] = useState("");
  const isParcel = isParcelServiceType(serviceType);

  // Flight Info states
  const [airlineName, setAirlineName] = useState("");
  const [flightNumber, setFlightNumber] = useState("");
  const [flightNote, setFlightNote] = useState("");

  // Gratuity
  const [gratuityPercent, setGratuityPercent] = useState(20);

  // Payment states (card info)
  const [cardType, setCardType] = useState("");
  const [nameOnCard, setNameOnCard] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expirationYear, setExpirationYear] = useState("");
  const [expirationMonth, setExpirationMonth] = useState("");
  const [cvv, setCvv] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [purchaseOrder, setPurchaseOrder] = useState("");
  const [deptNumber, setDeptNumber] = useState("");

  // Payment states
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState<"card" | "cash">("card");
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Pre-fill from URL query parameters (from homepage hero form & service quote form)
  useEffect(() => {
    const modeParam = searchParams.get("mode");
    const serviceTypeParam = searchParams.get("serviceType");
    const pickupParam = searchParams.get("pickup");
    const dropoffParam = searchParams.get("dropoff");
    const dateParam = searchParams.get("date");
    const durationParam = searchParams.get("duration");
    const adultsParam = searchParams.get("adults");
    const airlineParam = searchParams.get("airline");
    const flightParam = searchParams.get("flight");
    
    if (modeParam === "hourly" || modeParam === "distance" || modeParam === "parcel") {
      if (modeParam === "hourly") {
        setBookingMode("hourly");
        setServiceType("Hourly ride");
      } else if (modeParam === "parcel") {
        setBookingMode("distance");
        setServiceType(PARCEL_SERVICE_TYPE);
      } else {
        setBookingMode("distance");
        if (serviceTypeParam) {
          setServiceType(serviceTypeParam);
        }
      }
    } else if (serviceTypeParam && isParcelServiceType(serviceTypeParam)) {
      setBookingMode("distance");
      setServiceType(PARCEL_SERVICE_TYPE);
    }
    if (pickupParam) setPickupLocation(pickupParam);
    if (dropoffParam) setDropoffLocation(dropoffParam);
    if (dateParam) {
      const parsedDate = new Date(dateParam);
      if (!isNaN(parsedDate.getTime())) {
        setPickupDateTime(parsedDate);
      }
    }
    if (durationParam) {
      const dur = parseInt(durationParam);
      if (!isNaN(dur) && dur >= 3) setHourlyDuration(dur);
    }
    if (adultsParam) {
      const parsedAdults = parseInt(adultsParam);
      if (!isNaN(parsedAdults) && parsedAdults > 0) {
        setAdultsCount(parsedAdults);
      }
    }
    if (airlineParam) setAirlineName(airlineParam);
    if (flightParam) setFlightNumber(flightParam);
  }, [searchParams]);
  const [stepError, setStepError] = useState("");

  // Route calculation states
  const [routeDistance, setRouteDistance] = useState("--");
  const [routeDuration, setRouteDuration] = useState("--");
  const [routePrice, setRoutePrice] = useState(0);
  const [routeDistanceValue, setRouteDistanceValue] = useState(0);
  const [routeDurationValue, setRouteDurationValue] = useState(0);

  // Dynamic pricing config from database (admin panel). All charges flow from here
  // so the displayed total and the actually-charged amount always match the server.
  const [pricingConfig, setPricingConfig] = useState({
    baseDistanceKm: 17,
    extraKmRate: 3.2,
    stop: 20,
    childSeat: 25,
    meetGreet: 95,
    bouquet: 75,
    hstRate: 0.13,
  });

  // Email states
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState("");

  // Turnstile
  const [turnstileToken, setTurnstileToken] = useState("");

  const sendReservationEmails = useCallback(async (paymentIntentId?: string) => {
    setEmailSending(true);
    setEmailError("");
    try {
      const vehicleName = resolveVehicle(selectedVehicle)?.name || selectedVehicle;
      const parcelExtra = isParcelServiceType(serviceType)
        ? encodeParcelRequirements({
            recipientName,
            recipientPhone,
            parcelWeight: formatParcelWeight(parcelWeight),
            parcelNote,
          })
        : "";
      const mergedSpecialRequirements = [parcelExtra, specialRequirements.trim()]
        .filter(Boolean)
        .join("\n");
      const res = await fetch("/api/reservation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName, lastName, email, phone, phoneCode: countryCode,
          serviceType,
          bookingMode,
          transferType,
          adultsCount: isParcelServiceType(serviceType) ? 1 : adultsCount,
          childrenCount: isParcelServiceType(serviceType) ? 0 : childrenCount,
          hourlyDuration,
          returnDateTime: returnDateTime ? returnDateTime.toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" }) : undefined,
          pickupLocation, dropoffLocation,
          stops: stops.filter((s) => s.trim() !== ""),
          serviceDate: pickupDateTime ? pickupDateTime.toLocaleDateString("en-CA") : "",
          serviceTime: pickupDateTime ? pickupDateTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) : "",
          vehicle: vehicleName,
          vehicleId: selectedVehicle,
          passengers: isParcelServiceType(serviceType) ? 1 : passengersCount,
          childSeatCount: isParcelServiceType(serviceType) ? 0 : childSeatCount,
          childSeatType: isParcelServiceType(serviceType) ? "" : childSeatType,
          etr407,
          meetGreet: isParcelServiceType(serviceType) ? false : meetGreet,
          bouquetFlowers: isParcelServiceType(serviceType) ? false : bouquetFlowers,
          specialRequirements: mergedSpecialRequirements,
          routeDistance, routeDuration, routePrice,
          routeDistanceValue,
          gratuityPercent,
          airlineName, flightNumber, flightNote,
          billingAddress, zipCode,
          purchaseOrder, deptNumber,
          paymentMethod: checkoutPaymentMethod,
          stripePaymentIntentId: checkoutPaymentMethod === "card" ? paymentIntentId : undefined,
          turnstileToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.error || "Failed to send emails");
      setEmailSent(true);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send confirmation emails.";
      setEmailError(errorMessage);
    } finally {
      setEmailSending(false);
    }
  }, [firstName, lastName, email, phone, countryCode, serviceType, bookingMode, transferType, adultsCount, childrenCount, hourlyDuration, returnDateTime, pickupLocation, dropoffLocation, stops, pickupDateTime, selectedVehicle, passengersCount, childSeatCount, childSeatType, etr407, meetGreet, bouquetFlowers, specialRequirements, recipientName, recipientPhone, parcelWeight, parcelNote, routeDistance, routeDuration, routePrice, routeDistanceValue, gratuityPercent, airlineName, flightNumber, flightNote, billingAddress, zipCode, purchaseOrder, deptNumber, checkoutPaymentMethod, turnstileToken, resolveVehicle]);

  const confirmCashReservation = useCallback(async () => {
    if (!termsAccepted || !turnstileToken || emailSending) return;
    setPaymentError(null);
    setStepError("");
    setEmailSending(true);
    setEmailError("");
    try {
      const vehicleName = resolveVehicle(selectedVehicle)?.name || selectedVehicle;
      const parcelExtra = isParcelServiceType(serviceType)
        ? encodeParcelRequirements({
            recipientName,
            recipientPhone,
            parcelWeight: formatParcelWeight(parcelWeight),
            parcelNote,
          })
        : "";
      const mergedSpecialRequirements = [parcelExtra, specialRequirements.trim()]
        .filter(Boolean)
        .join("\n");
      const res = await fetch("/api/reservation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName, lastName, email, phone, phoneCode: countryCode,
          serviceType,
          bookingMode,
          transferType,
          adultsCount: isParcelServiceType(serviceType) ? 1 : adultsCount,
          childrenCount: isParcelServiceType(serviceType) ? 0 : childrenCount,
          hourlyDuration,
          returnDateTime: returnDateTime ? returnDateTime.toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" }) : undefined,
          pickupLocation, dropoffLocation,
          stops: stops.filter((s) => s.trim() !== ""),
          serviceDate: pickupDateTime ? pickupDateTime.toLocaleDateString("en-CA") : "",
          serviceTime: pickupDateTime ? pickupDateTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) : "",
          vehicle: vehicleName,
          vehicleId: selectedVehicle,
          passengers: isParcelServiceType(serviceType) ? 1 : passengersCount,
          childSeatCount: isParcelServiceType(serviceType) ? 0 : childSeatCount,
          childSeatType: isParcelServiceType(serviceType) ? "" : childSeatType,
          etr407,
          meetGreet: isParcelServiceType(serviceType) ? false : meetGreet,
          bouquetFlowers: isParcelServiceType(serviceType) ? false : bouquetFlowers,
          specialRequirements: mergedSpecialRequirements,
          routeDistance, routeDuration, routePrice,
          routeDistanceValue,
          gratuityPercent,
          airlineName, flightNumber, flightNote,
          billingAddress, zipCode,
          purchaseOrder, deptNumber,
          paymentMethod: "cash",
          turnstileToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.error || "Failed to confirm reservation");
      setPaymentSuccess(true);
      setEmailSent(true);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to confirm cash reservation.";
      setPaymentError(errorMessage);
      setStepError(errorMessage);
      setEmailError(errorMessage);
    } finally {
      setEmailSending(false);
    }
  }, [termsAccepted, turnstileToken, emailSending, resolveVehicle, selectedVehicle, firstName, lastName, email, phone, countryCode, serviceType, bookingMode, transferType, adultsCount, childrenCount, hourlyDuration, returnDateTime, pickupLocation, dropoffLocation, stops, pickupDateTime, passengersCount, childSeatCount, childSeatType, etr407, meetGreet, bouquetFlowers, specialRequirements, recipientName, recipientPhone, parcelWeight, parcelNote, routeDistance, routeDuration, routePrice, routeDistanceValue, gratuityPercent, airlineName, flightNumber, flightNote, billingAddress, zipCode, purchaseOrder, deptNumber]);

  // Store route data; price is recalculated via useEffect when vehicle or route changes
  const handleRouteCalculated = useCallback((distance: string, duration: string, distanceValue: number, durationValue: number) => {
    setRouteDistance(distance);
    setRouteDuration(duration);
    setRouteDistanceValue(distanceValue);
    setRouteDurationValue(durationValue);
  }, []);

  // Fetch dynamic pricing config from database
  useEffect(() => {
    fetch("/api/pricing-config")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.charges) {
          setPricingConfig({
            baseDistanceKm: data.charges.baseDistanceKm ?? 17,
            extraKmRate: data.charges.extraKmRate ?? 3.2,
            stop: data.charges.stop ?? 20,
            childSeat: data.charges.childSeat ?? 25,
            meetGreet: data.charges.meetGreet ?? 95,
            bouquet: data.charges.bouquet ?? 75,
            hstRate: data.charges.hstRate ?? 0.13,
          });
        }
      })
      .catch(() => {});
  }, []);

  // Recalculate price whenever vehicle selection, route data, or transfer type changes
  useEffect(() => {
    const vehicle = resolveVehicle(selectedVehicle);
    if (!vehicle) {
      setRoutePrice(0);
      return;
    }

    if (bookingMode === "hourly") {
      // Hourly mode: hourlyRate × hours
      const calculatedPrice = vehicle.price * hourlyDuration;
      setRoutePrice(calculatedPrice);
    } else {
      // Distance mode: Base price covers first X km, then extra $/km after
      if (routeDistanceValue <= 0) {
        setRoutePrice(0);
        return;
      }
      const distanceKm = routeDistanceValue / 1000;
      const basePrice = vehicle.price;
      const extraKm = Math.max(0, distanceKm - pricingConfig.baseDistanceKm);
      const extraCharge = extraKm * pricingConfig.extraKmRate;
      const calculatedPrice = basePrice + extraCharge;
      setRoutePrice(calculatedPrice);
    }
  }, [selectedVehicle, routeDistanceValue, bookingMode, hourlyDuration, resolveVehicle, pricingConfig]);

  const activeStopCount = stops.filter((s) => s.trim() !== "").length;

  /** Ride fare for a vehicle from trip distance/hours (not the static base list price). */
  const getVehicleRideFare = useCallback(
    (vehicle: { price: number }) => {
      if (bookingMode === "hourly") {
        return vehicle.price * hourlyDuration;
      }
      if (routeDistanceValue <= 0) return null;
      const distanceKm = routeDistanceValue / 1000;
      const extraKm = Math.max(0, distanceKm - pricingConfig.baseDistanceKm);
      return vehicle.price + extraKm * pricingConfig.extraKmRate;
    },
    [bookingMode, hourlyDuration, routeDistanceValue, pricingConfig]
  );

  const pricingFleetSource = useMemo(
    () =>
      reservationFleet.map((vehicle) => ({
        id: vehicle.id,
        price: vehicle.price,
        pricePerKm: vehicle.pricePerKm,
      })),
    [reservationFleet]
  );

  const pricingSummary = useMemo(() => {
    if (!selectedVehicle) return null;
    return calculateReservationPricing(
      {
        vehicleId: selectedVehicle,
        bookingMode,
        distanceMeters: routeDistanceValue,
        hourlyDuration,
        stopCount: activeStopCount,
        childSeatCount: isParcel ? 0 : childSeatCount,
        meetGreet: isParcel ? false : meetGreet,
        bouquetFlowers: isParcel ? false : bouquetFlowers,
        gratuityPercent,
      },
      pricingFleetSource,
      {
        baseDistanceKm: pricingConfig.baseDistanceKm,
        extraKmRate: pricingConfig.extraKmRate,
        stop: pricingConfig.stop,
        childSeat: pricingConfig.childSeat,
        meetGreet: pricingConfig.meetGreet,
        bouquet: pricingConfig.bouquet,
        hstRate: pricingConfig.hstRate,
      }
    );
  }, [
    selectedVehicle,
    bookingMode,
    routeDistanceValue,
    hourlyDuration,
    activeStopCount,
    childSeatCount,
    meetGreet,
    bouquetFlowers,
    gratuityPercent,
    pricingFleetSource,
    pricingConfig,
    isParcel,
  ]);

  const paymentAmountCents = pricingSummary ? Math.round(pricingSummary.total * 100) : 0;
  const paymentAmountLabel = pricingSummary
    ? `$${pricingSummary.total.toFixed(2)} CAD`
    : "$0.00 CAD";

  const paymentMetadata = useMemo(
    () => ({
      pickup: pickupLocation,
      dropoff: dropoffLocation,
      date: pickupDateTime ? pickupDateTime.toLocaleDateString("en-CA") : "",
      time: pickupDateTime
        ? pickupDateTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
        : "",
      vehicle: selectedVehicle,
      passengers: String(passengersCount),
    }),
    [pickupLocation, dropoffLocation, pickupDateTime, selectedVehicle, passengersCount]
  );

  // Card validation functions
  const validateCardNumber = (number: string): boolean => {
    const cleanNumber = number.replace(/\D/g, '');
    if (cleanNumber.length < 13 || cleanNumber.length > 19) return false;
    
    // Luhn algorithm
    let sum = 0;
    let isEven = false;
    
    for (let i = cleanNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cleanNumber.charAt(i));
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  };

  const detectCardType = (number: string): string => {
    const cleanNumber = number.replace(/\D/g, '');
    const patterns = {
      'Visa': /^4[0-9]/,
      'Mastercard': /^5[1-5][0-9]/,
      'American Express': /^3[47][0-9]/,
      'Discover': /^6(?:011|5[0-9]{2})[0-9]/
    };
    
    for (let [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(cleanNumber)) return type;
    }
    return '';
  };

  // Auto-detect card type when user enters card number
  useEffect(() => {
    if (cardNumber.length >= 4) {
      const detectedType = detectCardType(cardNumber);
      if (detectedType && detectedType !== cardType) {
        setCardType(detectedType);
      }
    }
  }, [cardNumber, cardType]);

  // Step validation
  const validateStep = (step: number): boolean => {
    setStepError("");
    if (step === 1) {
      if (!pickupLocation.trim()) { setStepError("Please enter a pickup location."); return false; }
      if (bookingMode === "distance" && !dropoffLocation.trim()) { setStepError("Please enter a drop-off location."); return false; }
      if (!pickupDateTime) { setStepError("Please select date and time."); return false; }
      if (isParcel) {
        if (!recipientName.trim()) { setStepError("Please enter the recipient name."); return false; }
        if (!recipientPhone.trim()) { setStepError("Please enter the recipient phone number."); return false; }
      }
    } else if (step === 2) {
      if (!selectedVehicle) { setStepError("Please select a vehicle."); return false; }
    } else if (step === 3) {
      if (!firstName.trim()) { setStepError("Please enter your first name."); return false; }
      if (!lastName.trim()) { setStepError("Please enter your last name."); return false; }
      if (!email.trim()) { setStepError("Please enter your email address."); return false; }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) { setStepError("Please enter a valid email address."); return false; }
      if (!phone.trim()) { setStepError("Please enter your phone number."); return false; }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(Math.min(4, currentStep + 1));
      // Smooth scroll to top of page on mobile, slightly below on desktop
      setTimeout(() => {
        const isMobile = window.innerWidth < 768;
        window.scrollTo({ top: isMobile ? 0 : 200, behavior: 'smooth' });
      }, 100);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(Math.max(1, currentStep - 1));
    setStepError("");
    // Smooth scroll to top of page on mobile, slightly below on desktop
    setTimeout(() => {
      const isMobile = window.innerWidth < 768;
      window.scrollTo({ top: isMobile ? 0 : 200, behavior: 'smooth' });
    }, 100);
  };

  const scrollToFormTop = () => {
    setTimeout(() => {
      const isMobile = window.innerWidth < 768;
      window.scrollTo({ top: isMobile ? 0 : 200, behavior: "smooth" });
    }, 100);
  };

  const handleGoToStep = (stepId: number) => {
    if (stepId >= currentStep || stepId < 1) return;
    setCurrentStep(stepId);
    setStepError("");
    scrollToFormTop();
  };

  const steps = [
    { id: 1, title: "Ride Details", description: "When and where" },
    { id: 2, title: "Select Vehicle", description: "Choose your ride" },
    { id: 3, title: "Contact Info", description: "Your details" },
    { id: 4, title: "Confirmation", description: "Booking Summary" }
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 overflow-x-hidden">
      <TopNav />
      <Navbar />

      <section className="pt-[120px] sm:pt-[140px] md:pt-[155px] pb-8 sm:pb-12 overflow-x-hidden">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 md:px-12">
          
          {/* Header — slim */}
          <div className="text-center mb-4 sm:mb-5">
            <div className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-white border border-[#C9A063]/40 shadow-sm mb-2.5 max-w-full">
              <div className="w-2 h-2 rounded-full bg-[#C9A063] flex-shrink-0" />
              <span className="text-gray-800 text-[12px] sm:text-[13px] font-bold tracking-[0.14em] uppercase">
                Make A Reservation
              </span>
            </div>
            <p className="text-gray-500 text-[12px] sm:text-[13px] max-w-xl mx-auto">
              Experience world-class chauffeur service with our premium fleet
            </p>
          </div>

          {/* Progress Steps */}
          <div className="mb-4 sm:mb-6">
            {/* Desktop Progress */}
            <div className="hidden md:flex items-center justify-center">
              <div className="flex items-center">
                {steps.map((step, index) => {
                  const isCompleted = currentStep > step.id;
                  const isCurrent = currentStep === step.id;
                  const isClickable = isCompleted;

                  return (
                  <div key={step.id} className="flex items-center">
                    <button
                      type="button"
                      onClick={() => handleGoToStep(step.id)}
                      disabled={!isClickable}
                      aria-label={
                        isClickable
                          ? `Go back to ${step.title} and edit`
                          : isCurrent
                            ? `Current step: ${step.title}`
                            : `${step.title} (not yet available)`
                      }
                      aria-current={isCurrent ? "step" : undefined}
                      className={`flex flex-col items-center text-center transition-all duration-200 ${
                        currentStep >= step.id ? "text-[#C9A063]" : "text-gray-400"
                      } ${
                        isClickable
                          ? "cursor-pointer hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A063]/40 focus-visible:ring-offset-1 rounded-md"
                          : "cursor-default"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-[14px] border-2 transition-all duration-300 ${
                        currentStep >= step.id 
                          ? 'bg-[#C9A063] text-white border-[#C9A063] shadow-md shadow-[#C9A063]/30' 
                          : 'bg-white text-gray-400 border-gray-300'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          step.id
                        )}
                      </div>
                      <div className="mt-2 text-center max-w-[110px]">
                        <div className="text-[13px] font-bold leading-tight">{step.title}</div>
                        <div className="text-[11px] text-gray-500 leading-tight mt-0.5">{step.description}</div>
                      </div>
                    </button>
                    {index < steps.length - 1 && (
                      <div className={`w-12 lg:w-16 h-[2px] mx-3 lg:mx-4 ${currentStep > step.id ? 'bg-[#C9A063]' : 'bg-gray-300'}`} />
                    )}
                  </div>
                )})}
              </div>
            </div>

            {/* Mobile Progress */}
            <div className="md:hidden">
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[12px] font-medium text-gray-600">
                  Step {currentStep} of {steps.length}
                </div>
                <div className="text-[12px] text-gray-500">
                  {Math.round((currentStep / steps.length) * 100)}%
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mb-3">
                <div 
                  className="bg-[#C9A063] h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${(currentStep / steps.length) * 100}%` }}
                />
              </div>

              <div className="flex items-stretch justify-between gap-1 mb-2.5">
                {steps.map((step) => {
                  const isCompleted = currentStep > step.id;
                  const isCurrent = currentStep === step.id;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => handleGoToStep(step.id)}
                      disabled={!isCompleted}
                      aria-label={
                        isCompleted
                          ? `Go back to ${step.title} and edit`
                          : isCurrent
                            ? `Current step: ${step.title}`
                            : step.title
                      }
                      aria-current={isCurrent ? "step" : undefined}
                      className={`flex flex-1 flex-col items-center gap-1 min-w-0 py-0.5 transition-all ${
                        isCompleted
                          ? "cursor-pointer active:scale-95"
                          : "cursor-default"
                      }`}
                    >
                      <span
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold border-2 transition-colors ${
                          isCompleted
                            ? "bg-[#C9A063] text-white border-[#C9A063]"
                            : isCurrent
                              ? "bg-[#C9A063] text-white border-[#C9A063] ring-2 ring-[#C9A063]/25"
                              : "bg-white text-gray-400 border-gray-300"
                        }`}
                      >
                        {isCompleted ? <CheckCircle className="w-4 h-4" /> : step.id}
                      </span>
                      <span
                        className={`text-[10px] font-semibold leading-tight text-center truncate w-full px-0.5 ${
                          isCurrent || isCompleted ? "text-[#C9A063]" : "text-gray-400"
                        }`}
                      >
                        {step.title.split(" ")[0]}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="text-center">
                <h3 className="text-[15px] font-semibold text-gray-900">{steps[currentStep - 1].title}</h3>
                <p className="text-[12px] text-gray-500">{steps[currentStep - 1].description}</p>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className={`grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 ${currentStep === 1 ? "lg:items-stretch" : "lg:items-start"}`}>
            
            {/* Form Section */}
            <div className={`lg:col-span-2 ${currentStep === 1 ? "flex" : ""}`}>
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden w-full h-fit">
                {currentStep === 1 ? (
                  <div className="px-3.5 sm:px-4 pt-3.5 sm:pt-4 pb-0">
                    <div className="mb-3">
                      <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[#C9A063] mb-0.5">
                        Step 1
                      </p>
                      <h2 className="text-base sm:text-lg font-semibold text-gray-900 tracking-tight leading-tight">
                        {isParcel ? "Parcel Details" : "Ride Details"}
                      </h2>
                    </div>

                    <div className="grid grid-cols-3 p-0.5 rounded-lg bg-gray-100 border border-gray-200/70">
                      <button
                        type="button"
                        onClick={() => {
                          setBookingMode("distance");
                          setServiceType("Point-to-Point transportation");
                          setDropoffLocation("");
                        }}
                        className={`py-1.5 sm:py-2 rounded-md text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.06em] transition-all duration-200 ${
                          bookingMode === "distance" && !isParcel
                            ? "bg-gray-900 text-white shadow-sm"
                            : "text-gray-500 hover:text-gray-800"
                        }`}
                      >
                        Distance
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setBookingMode("hourly");
                          setServiceType("Hourly ride");
                          setDropoffLocation("");
                        }}
                        className={`py-1.5 sm:py-2 rounded-md text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.06em] transition-all duration-200 ${
                          bookingMode === "hourly"
                            ? "bg-gray-900 text-white shadow-sm"
                            : "text-gray-500 hover:text-gray-800"
                        }`}
                      >
                        Hourly
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setBookingMode("distance");
                          setServiceType(PARCEL_SERVICE_TYPE);
                          setAdultsCount(1);
                          setChildrenCount(0);
                          setChildSeatCount(0);
                          setMeetGreet(false);
                          setBouquetFlowers(false);
                        }}
                        className={`py-1.5 sm:py-2 rounded-md text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.06em] transition-all duration-200 ${
                          isParcel
                            ? "bg-gray-900 text-white shadow-sm"
                            : "text-gray-500 hover:text-gray-800"
                        }`}
                      >
                        Parcel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="px-3.5 sm:px-4 pt-3.5 sm:pt-4 pb-0">
                    <div className="mb-1">
                      <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[#C9A063] mb-0.5">
                        Step {currentStep}
                      </p>
                      <h2 className="text-base sm:text-lg font-semibold text-gray-900 tracking-tight leading-tight">
                        {steps[currentStep - 1].title}
                      </h2>
                      <p className="text-[12px] text-gray-500 mt-0.5">
                        {steps[currentStep - 1].description}
                        {currentStep === 2
                          ? ` · ${filteredVehicles.length} option${filteredVehicles.length === 1 ? "" : "s"}`
                          : ""}
                      </p>
                    </div>
                  </div>
                )}

                <div className="p-3.5 sm:p-4 bg-white">
                  {/* Step 1: Ride Details */}
                  {currentStep === 1 && (
                    <div className="space-y-2.5">
                      {/* Trip Route — slim rows */}
                      <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                        <div className="px-3 py-2.5 bg-white">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <MapPin className="w-3.5 h-3.5 text-[#C9A063] shrink-0" strokeWidth={2} />
                              <label className="text-[10px] font-semibold text-[#C9A063] uppercase tracking-wider">
                                Pickup
                              </label>
                            </div>
                            <button
                              type="button"
                              onClick={handleGetMyLocation}
                              disabled={locating}
                              className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-[#C9A063] hover:text-[#B8935A] disabled:opacity-60 transition-colors whitespace-nowrap"
                              title="Use your current location"
                            >
                              {locating ? (
                                <Loader2 className="w-3 h-3 animate-spin" strokeWidth={2.5} />
                              ) : (
                                <LocateFixed className="w-3 h-3" strokeWidth={2.5} />
                              )}
                              {locating ? "Locating…" : "Get my location"}
                            </button>
                          </div>
                          <PlacesAutocomplete
                            value={pickupLocation}
                            onChange={(val) => {
                              setPickupLocation(val);
                              setStepError("");
                              if (locationError) setLocationError(null);
                            }}
                            placeholder="Address or airport code (e.g. YYZ)"
                            className="w-full py-0.5 bg-transparent text-[13px] sm:text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none"
                          />
                          {locationError && (
                            <p className="text-[10px] text-red-500 mt-1 leading-tight">{locationError}</p>
                          )}
                        </div>
                        {bookingMode === "distance" && (
                          <div className="px-3 py-2.5 bg-white">
                            <div className="flex items-center gap-2 mb-1">
                              <MapPin className="w-3.5 h-3.5 text-[#C9A063] shrink-0" strokeWidth={2} />
                              <label className="text-[10px] font-semibold text-[#C9A063] uppercase tracking-wider">Drop-off</label>
                            </div>
                            <PlacesAutocomplete
                              value={dropoffLocation}
                              onChange={(val) => { setDropoffLocation(val); setStepError(""); }}
                              placeholder="Destination address"
                              className="w-full py-0.5 bg-transparent text-[13px] sm:text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none"
                            />
                          </div>
                        )}
                        {bookingMode === "hourly" && (
                          <div className="px-3 py-2.5 bg-white">
                            <div className="flex items-center gap-2 mb-1">
                              <Clock className="w-3.5 h-3.5 text-[#C9A063] shrink-0" strokeWidth={2} />
                              <label className="text-[10px] font-semibold text-[#C9A063] uppercase tracking-wider">Duration (Hours)</label>
                            </div>
                            <select
                              value={hourlyDuration}
                              onChange={(e) => setHourlyDuration(parseInt(e.target.value))}
                              className="w-full py-0.5 bg-transparent text-[13px] sm:text-[14px] text-gray-900 focus:outline-none"
                            >
                              {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => (
                                <option key={h} value={h}>{h} hours</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      {stops.map((stop, index) => (
                        <div key={index} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5">
                          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Stop {index + 1}</label>
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <PlacesAutocomplete
                                value={stop}
                                onChange={(val) => {
                                  const newStops = [...stops];
                                  newStops[index] = val;
                                  setStops(newStops);
                                }}
                                placeholder="Stop address"
                                className="w-full py-0.5 bg-transparent text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => setStops(stops.filter((_, i) => i !== index))}
                              className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => setStops([...stops, ""])}
                        className="inline-flex items-center gap-1 text-[#C9A063] hover:text-[#B8935A] text-[12px] font-semibold transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                        Add Stop
                      </button>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Pick-up Time</label>
                          <div className="relative reservation-datepicker">
                            <DatePicker
                              selected={pickupDateTime}
                              onChange={(date: Date | null) => { setPickupDateTime(date); setStepError(""); }}
                              showTimeSelect
                              timeIntervals={15}
                              timeCaption="Time"
                              dateFormat="MMM d, yyyy  h:mm aa"
                              timeFormat="h:mm aa"
                              minDate={new Date()}
                              placeholderText="Select date & time"
                              className="w-full px-3 py-2 pr-9 border border-gray-200 rounded-lg text-[13px] text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#C9A063]/20 focus:border-[#C9A063] transition-all duration-200"
                              withPortal
                              required
                            />
                            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
                              <Clock className="w-3.5 h-3.5 text-gray-400" strokeWidth={1.75} />
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                            {isParcel ? "Service" : "Passengers"}
                          </label>
                          {isParcel ? (
                            <div className="flex items-center px-3 py-2 border border-[#C9A063]/35 rounded-lg bg-[#C9A063]/8 min-h-[38px]">
                              <span className="text-[13px] font-semibold text-[#8B6914]">Parcel Delivery</span>
                            </div>
                          ) : (
                          <div className="flex items-center justify-between px-3 py-1.5 border border-gray-200 rounded-lg bg-white min-h-[38px]">
                            <span className="text-[13px] font-semibold text-gray-900 tabular-nums">{passengersCount}</span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => { setAdultsCount((p) => Math.max(1, p - 1)); }}
                                disabled={passengersCount <= 1}
                                className="w-7 h-7 rounded-md border border-gray-200 bg-gray-50 text-gray-700 hover:border-[#C9A063]/50 hover:text-[#C9A063] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center text-sm leading-none"
                                aria-label="Decrease"
                              >
                                −
                              </button>
                              <button
                                type="button"
                                onClick={() => { setAdultsCount((p) => Math.min(50, p + 1)); }}
                                disabled={passengersCount >= 50}
                                className="w-7 h-7 rounded-md border border-gray-200 bg-gray-50 text-gray-700 hover:border-[#C9A063]/50 hover:text-[#C9A063] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center text-sm leading-none"
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
                          <p className="text-[10px] font-semibold text-[#C9A063] uppercase tracking-wider">Recipient</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Name</label>
                              <input
                                type="text"
                                value={recipientName}
                                onChange={(e) => { setRecipientName(e.target.value); setStepError(""); }}
                                placeholder="Who receives the parcel?"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A063]/20 focus:border-[#C9A063] transition-all"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Phone</label>
                              <input
                                type="tel"
                                value={recipientPhone}
                                onChange={(e) => { setRecipientPhone(e.target.value); setStepError(""); }}
                                placeholder="Recipient phone"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A063]/20 focus:border-[#C9A063] transition-all"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
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
                                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A063]/20 focus:border-[#C9A063] transition-all"
                              />
                              <span className="inline-flex items-center justify-center min-w-[52px] px-3 rounded-lg border border-gray-200 bg-gray-50 text-[12px] font-bold text-gray-500 tracking-wide">
                                kg
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] text-gray-400">Approximate weight helps the chauffeur prepare</p>
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Package note</label>
                            <input
                              type="text"
                              value={parcelNote}
                              onChange={(e) => setParcelNote(e.target.value)}
                              placeholder="e.g. Small box, fragile"
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A063]/20 focus:border-[#C9A063] transition-all"
                            />
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                  {/* Step 2: Select Vehicle */}
                  {currentStep === 2 && (
                    <div className="space-y-3">
                      <div>
                        {/* Category filters — horizontal scroll on mobile */}
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
                                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors whitespace-nowrap ${
                                    isActive
                                      ? "bg-[#1C1C1E] text-white"
                                      : "bg-white border border-gray-200 text-gray-600 active:bg-gray-50"
                                  }`}
                                >
                                  {cat}
                                  <span className={`ml-1.5 ${isActive ? "text-white/60" : "text-gray-400"}`}>
                                    {count}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Vehicle rows — image | name+price | select+capacity */}
                        <div className="bg-white rounded-xl border border-gray-200/70 overflow-hidden divide-y divide-gray-200">
                          {filteredVehicles.length === 0 ? (
                            <div className="px-4 py-8 text-center text-[13px] text-gray-500">
                              No vehicles match this filter for your passenger count.
                            </div>
                          ) : (
                            filteredVehicles.map((vehicle) => {
                              const isSelected = selectedVehicle === vehicle.id;
                              const passengers =
                                parseInt(vehicle.seating.match(/(\d+)/)?.[1] || "3", 10) || 3;
                              const luggage =
                                parseInt(vehicle.luggage.match(/(\d+)/)?.[1] || "2", 10) || 2;
                              const imageSrc =
                                (vehicle as FleetVehicle & { imageUrl?: string }).imageUrl ||
                                vehicle.image;

                              return (
                                <div
                                  key={vehicle.id}
                                  className={`flex items-center gap-3 sm:gap-4 px-3 py-3.5 sm:px-4 sm:py-4 transition-colors ${
                                    isSelected ? "bg-[#C9A063]/[0.06]" : "bg-white"
                                  }`}
                                >
                                  <div className="w-[88px] sm:w-[120px] h-[56px] sm:h-[72px] flex-shrink-0 flex items-center justify-center">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={imageSrc}
                                      alt={vehicle.name}
                                      className="max-w-full max-h-full object-contain"
                                    />
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-[13px] sm:text-[15px] font-medium text-gray-800 truncate">
                                      {vehicle.name}
                                    </h4>
                                    {(() => {
                                      const fare = getVehicleRideFare(vehicle);
                                      return (
                                        <p className="mt-0.5 text-[18px] sm:text-[22px] font-bold text-[#4A2C5A] tabular-nums leading-tight">
                                          {fare != null
                                            ? `CAD${fare.toFixed(2)}`
                                            : "—"}
                                        </p>
                                      );
                                    })()}
                                  </div>

                                  <div className="flex-shrink-0 flex flex-col items-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedVehicle(vehicle.id);
                                        setStepError("");
                                      }}
                                      className={`px-4 sm:px-5 py-1.5 rounded-full text-[11px] sm:text-[12px] font-semibold uppercase tracking-wide transition-colors ${
                                        isSelected
                                          ? "bg-gray-900 text-white"
                                          : "bg-gray-200/90 text-gray-600 hover:bg-gray-300"
                                      }`}
                                    >
                                      {isSelected ? "Selected" : "Select"}
                                    </button>
                                    <div className="flex items-center gap-3 text-gray-500">
                                      <span className="inline-flex items-center gap-1">
                                        <Users className="w-3.5 h-3.5" strokeWidth={1.75} />
                                        <span className="w-5 h-5 rounded-full bg-gray-100 text-[10px] font-semibold text-gray-600 flex items-center justify-center tabular-nums">
                                          {passengers}
                                        </span>
                                      </span>
                                      <span className="inline-flex items-center gap-1">
                                        <Briefcase className="w-3.5 h-3.5" strokeWidth={1.75} />
                                        <span className="w-5 h-5 rounded-full bg-gray-100 text-[10px] font-semibold text-gray-600 flex items-center justify-center tabular-nums">
                                          {luggage}
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

                      {/* Extra Options Dropdown */}
                      <div className="bg-white rounded-xl border border-gray-200/60 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setExtraOptionsOpen(!extraOptionsOpen)}
                          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-lg bg-[#C9A063]/10 flex items-center justify-center">
                              <Plus className="w-3.5 h-3.5 text-[#C9A063]" />
                            </div>
                            <div className="text-left">
                              <span className="block text-[13px] font-semibold text-gray-900">Extra Options</span>
                              <span className="block text-[11px] text-gray-500">Add extras to your ride</span>
                            </div>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${extraOptionsOpen ? "rotate-180" : ""}`} />
                        </button>
                        
                        {extraOptionsOpen && (
                          <div className="border-t border-gray-100 divide-y divide-gray-100">
                            {/* 407 ETR */}
                            <div className="px-4 py-3 flex items-center justify-between">
                              <div>
                                <span className="block text-[14px] font-medium text-gray-900">407 ETR</span>
                                <span className="block text-[12px] text-gray-500">Highway 407 Express Toll Route</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setEtr407(!etr407)}
                                className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${etr407 ? 'bg-[#C9A063]' : 'bg-gray-300'}`}
                              >
                                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${etr407 ? 'translate-x-5' : 'translate-x-0'}`} />
                              </button>
                            </div>
                            
                            {/* Child Seat */}
                            {!isParcel && (
                            <div className="px-4 py-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="block text-[14px] font-medium text-gray-900">Child Seat</span>
                                  <span className="block text-[12px] text-gray-500">${pricingConfig.childSeat.toFixed(0)} per seat</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setChildSeatCount(Math.max(0, childSeatCount - 1))}
                                    className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:border-[#C9A063] hover:text-[#C9A063] transition-colors"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="text-[14px] font-semibold text-gray-900 w-5 text-center">{childSeatCount}</span>
                                  <button
                                    type="button"
                                    onClick={() => setChildSeatCount(childSeatCount + 1)}
                                    className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:border-[#C9A063] hover:text-[#C9A063] transition-colors"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
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
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#C9A063] transition-all"
                                  />
                                </div>
                              )}
                            </div>
                            )}
                            
                            {/* Meet & Greet */}
                            {!isParcel && (
                            <div className="px-4 py-3 flex items-center justify-between">
                              <div>
                                <span className="block text-[14px] font-medium text-gray-900">Meet & Greet</span>
                                <span className="block text-[12px] text-gray-500">Personal airport assistance <span className="text-[#C9A063] font-semibold">+${pricingConfig.meetGreet.toFixed(0)}</span></span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setMeetGreet(!meetGreet)}
                                className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${meetGreet ? 'bg-[#C9A063]' : 'bg-gray-300'}`}
                              >
                                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${meetGreet ? 'translate-x-5' : 'translate-x-0'}`} />
                              </button>
                            </div>
                            )}
                            
                            {/* Bouquet of Flowers */}
                            {!isParcel && (
                            <div className="px-4 py-3 flex items-center justify-between">
                              <div>
                                <span className="block text-[14px] font-medium text-gray-900">Bouquet of Flowers</span>
                                <span className="block text-[12px] text-gray-500">Fresh flowers for your ride <span className="text-[#C9A063] font-semibold">+${pricingConfig.bouquet.toFixed(0)}</span></span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setBouquetFlowers(!bouquetFlowers)}
                                className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${bouquetFlowers ? 'bg-[#C9A063]' : 'bg-gray-300'}`}
                              >
                                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${bouquetFlowers ? 'translate-x-5' : 'translate-x-0'}`} />
                              </button>
                            </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Step 3: Contact Information */}
                  {currentStep === 3 && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                            First Name *
                          </label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#C9A063]" strokeWidth={2} />
                            <input
                              type="text"
                              required
                              placeholder="John"
                              value={firstName}
                              onChange={(e) => { setFirstName(e.target.value); setStepError(""); }}
                              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A063]/20 focus:border-[#C9A063] transition-all"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                            Last Name *
                          </label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#C9A063]" strokeWidth={2} />
                            <input
                              type="text"
                              required
                              placeholder="Smith"
                              value={lastName}
                              onChange={(e) => { setLastName(e.target.value); setStepError(""); }}
                              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A063]/20 focus:border-[#C9A063] transition-all"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                          Email Address *
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#C9A063]" strokeWidth={2} />
                          <input
                            type="email"
                            required
                            placeholder="john.smith@example.com"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); setStepError(""); }}
                            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A063]/20 focus:border-[#C9A063] transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                          Phone Number *
                        </label>
                        <div className="flex rounded-lg border border-gray-200 focus-within:border-[#C9A063] focus-within:ring-2 focus-within:ring-[#C9A063]/20 transition-all">
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setCountryDropdownOpen(!countryDropdownOpen)}
                              className="flex items-center gap-1.5 px-2.5 py-2 bg-gray-50 border-r border-gray-200 rounded-l-lg hover:bg-gray-100 transition-colors"
                            >
                              <img
                                src={`https://flagcdn.com/w40/${COUNTRY_CODES.find(c => c.code === countryCode)?.flagCode}.png`}
                                alt=""
                                className="w-4 h-3 object-cover rounded-sm"
                              />
                              <span className="text-[12px] font-semibold text-gray-900">{countryCode}</span>
                              <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                            </button>
                            {countryDropdownOpen && (
                              <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                                {COUNTRY_CODES.map((country) => (
                                  <button
                                    key={`${country.code}-${country.label}`}
                                    type="button"
                                    onClick={() => {
                                      setCountryCode(country.code);
                                      setCountryDropdownOpen(false);
                                    }}
                                    className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-gray-50 text-left"
                                  >
                                    <img
                                      src={`https://flagcdn.com/w40/${country.flagCode}.png`}
                                      alt=""
                                      className="w-4 h-3 object-cover rounded-sm"
                                    />
                                    <span className="text-[12px] font-medium text-gray-900">{country.code} {country.name}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="relative flex-1">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#C9A063]" strokeWidth={2} />
                            <input
                              type="tel"
                              required
                              placeholder="123-456-7890"
                              value={phone}
                              onChange={(e) => { setPhone(e.target.value); setStepError(""); }}
                              className="w-full pl-9 pr-3 py-2 bg-transparent text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                          Special Requirements (Optional)
                        </label>
                        <textarea
                          placeholder="Special requests"
                          rows={3}
                          value={specialRequirements}
                          onChange={(e) => setSpecialRequirements(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A063]/20 focus:border-[#C9A063] transition-all resize-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Step 4: Payment — fare, tip & Turnstile live in the right Summary */}
                  {currentStep === 4 && (
                    <div className="space-y-3">
                      {!paymentSuccess && (
                        <div className="bg-white rounded-xl border border-gray-200 p-3.5">
                          <h3 className="text-[13px] font-semibold text-gray-900 mb-0.5">Payment</h3>
                          <p className="text-[12px] text-gray-500 mb-3">
                            Choose how you&apos;d like to pay, then confirm your reservation.
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3.5">
                            <button
                              type="button"
                              onClick={() => {
                                setCheckoutPaymentMethod("card");
                                setPaymentError(null);
                              }}
                              className={`relative text-left rounded-xl border px-3.5 py-3 transition-all ${
                                checkoutPaymentMethod === "card"
                                  ? "border-[#C9A063] bg-[#C9A063]/10 ring-1 ring-[#C9A063]/35"
                                  : "border-gray-200 bg-white hover:border-gray-300"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                                    checkoutPaymentMethod === "card"
                                      ? "bg-[#C9A063]/15 text-[#C9A063]"
                                      : "bg-gray-100 text-gray-500"
                                  }`}
                                >
                                  <CreditCard className="w-4 h-4" strokeWidth={2} />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-[13px] font-semibold text-gray-900">Pay by Card</div>
                                  <p className="text-[11px] text-gray-500 leading-snug mt-0.5">
                                    Secure online payment via Stripe
                                  </p>
                                </div>
                              </div>
                              {checkoutPaymentMethod === "card" && (
                                <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-[#C9A063]" />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setCheckoutPaymentMethod("cash");
                                setPaymentError(null);
                              }}
                              className={`relative text-left rounded-xl border px-3.5 py-3 transition-all ${
                                checkoutPaymentMethod === "cash"
                                  ? "border-[#C9A063] bg-[#C9A063]/10 ring-1 ring-[#C9A063]/35"
                                  : "border-gray-200 bg-white hover:border-gray-300"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                                    checkoutPaymentMethod === "cash"
                                      ? "bg-[#C9A063]/15 text-[#C9A063]"
                                      : "bg-gray-100 text-gray-500"
                                  }`}
                                >
                                  <Banknote className="w-4 h-4" strokeWidth={2} />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-[13px] font-semibold text-gray-900">Cash on Delivery</div>
                                  <p className="text-[11px] text-gray-500 leading-snug mt-0.5">
                                    Pay your chauffeur at trip time
                                  </p>
                                </div>
                              </div>
                              {checkoutPaymentMethod === "cash" && (
                                <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-[#C9A063]" />
                              )}
                            </button>
                          </div>

                          {!termsAccepted && (
                            <p className="text-[12px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5 mb-3">
                              Please accept the terms in the Summary before continuing.
                            </p>
                          )}
                          {termsAccepted && !turnstileToken && (
                            <p className="text-[12px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5 mb-3">
                              Please complete the security check in the Summary.
                            </p>
                          )}

                          {checkoutPaymentMethod === "card" ? (
                            <StripePayment
                              amountCents={paymentAmountCents}
                              amountLabel={paymentAmountLabel}
                              vehicleId={selectedVehicle}
                              bookingMode={bookingMode}
                              distanceMeters={routeDistanceValue}
                              hourlyDuration={hourlyDuration}
                              stopCount={activeStopCount}
                              childSeatCount={childSeatCount}
                              meetGreet={meetGreet}
                              bouquetFlowers={bouquetFlowers}
                              gratuityPercent={gratuityPercent}
                              email={email}
                              disabled={!termsAccepted || !turnstileToken || emailSending}
                              metadata={paymentMetadata}
                              onSuccess={async (paymentIntentId) => {
                                setPaymentSuccess(true);
                                setPaymentError(null);
                                setStepError("");
                                await sendReservationEmails(paymentIntentId);
                              }}
                              onError={(err) => {
                                setPaymentError(err);
                                setStepError(err);
                              }}
                            />
                          ) : (
                            <div className="space-y-3">
                              <div className="rounded-lg border border-gray-200 bg-[#fafafa] px-3.5 py-3">
                                <div className="flex items-center justify-between gap-3 mb-1.5">
                                  <span className="text-[12px] font-medium text-gray-600">Amount due at pickup</span>
                                  <span className="text-[15px] font-bold text-gray-900 tabular-nums">
                                    {paymentAmountLabel}
                                  </span>
                                </div>
                                <p className="text-[11px] text-gray-500 leading-snug">
                                  Your booking will be confirmed now. Please have the exact amount ready for your chauffeur.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={confirmCashReservation}
                                disabled={!termsAccepted || !turnstileToken || emailSending}
                                className="w-full flex items-center justify-center gap-2 bg-[#C9A063] text-white px-5 py-3.5 rounded-xl text-[14px] font-semibold hover:bg-[#B8935A] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-[#C9A063]/20"
                              >
                                {emailSending ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Confirming reservation...
                                  </>
                                ) : (
                                  <>
                                    <Banknote className="w-4 h-4" />
                                    Confirm Cash Reservation
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {paymentSuccess && (
                        <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
                          <CheckCircle className="w-9 h-9 text-emerald-600 mx-auto mb-2.5" strokeWidth={2} />
                          <h3 className="text-[15px] font-semibold text-gray-900">
                            {checkoutPaymentMethod === "cash"
                              ? "Reservation confirmed"
                              : "Payment successful"}
                          </h3>
                          {checkoutPaymentMethod === "cash" && !emailSending && !emailError && (
                            <p className="text-[12px] text-gray-500 mt-1.5">
                              Payment method: Cash on Delivery — pay {paymentAmountLabel} at trip time.
                            </p>
                          )}
                          {emailSending && (
                            <div className="flex items-center justify-center gap-2 mt-2">
                              <Loader2 className="w-4 h-4 animate-spin text-[#C9A063]" />
                              <p className="text-[13px] text-gray-500">Sending confirmation...</p>
                            </div>
                          )}
                          {emailSent && (
                            <p className="text-[13px] text-emerald-700 mt-2">
                              Confirmation sent to {email}
                            </p>
                          )}
                          {emailError && (
                            <p className="text-[13px] text-red-600 mt-2">{emailError}</p>
                          )}
                          {!emailSending && !emailSent && !emailError && checkoutPaymentMethod === "card" && (
                            <p className="text-[13px] text-gray-500 mt-2">Your reservation is confirmed.</p>
                          )}
                        </div>
                      )}

                      {paymentError && (
                        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                          <span className="text-red-700 text-[13px]">{paymentError}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Validation Error */}
                  {stepError && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5">
                      <AlertCircle className="w-4.5 h-4.5 text-red-500 flex-shrink-0" strokeWidth={2} />
                      <p className="text-red-700 text-[13px] font-medium">{stepError}</p>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-2.5 mt-3 pt-3 border-t border-gray-200/60">
                    <button
                      onClick={handlePrevious}
                      disabled={currentStep === 1}
                      className={`w-full sm:w-auto min-h-[38px] px-3.5 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                        currentStep === 1
                          ? "bg-[#e5e5ea] text-gray-400 cursor-not-allowed"
                          : "bg-white border border-gray-200 text-gray-700 active:bg-[#f2f2f7]"
                      }`}
                    >
                      Previous
                    </button>
                    {currentStep < 4 ? (
                      <button
                        onClick={handleNext}
                        className="w-full sm:w-auto min-h-[38px] flex items-center justify-center gap-1.5 bg-[#1C1C1E] text-white px-4 py-2 rounded-lg text-[13px] font-medium active:bg-[#2C2C2E] transition-colors"
                      >
                        Continue
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Sidebar - Map (Step 1) or Ride Details (Step 2+) */}
            <div className="lg:col-span-1 order-first lg:order-last flex">
              <div
                className={`w-full overflow-hidden bg-white flex flex-col ${
                  currentStep === 1
                    ? "rounded-xl sm:rounded-2xl shadow-sm h-full min-h-[280px]"
                    : "rounded-xl sm:rounded-2xl border border-gray-200/60 shadow-sm lg:sticky lg:top-8"
                }`}
              >
                {currentStep === 1 ? (
                  <>
                    <div className="relative flex-1 min-h-[220px] sm:min-h-[280px] lg:min-h-0 bg-gray-100">
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
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className="inline-flex items-center gap-1 text-[12px] font-medium text-[#C9A063] hover:text-[#B8935A] transition-colors"
                      >
                        <Pencil className="w-3 h-3" strokeWidth={2} />
                        Edit
                      </button>
                    </div>

                    <div className="divide-y divide-gray-200/90">
                      <div className="py-3">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-1">
                          Service Type
                        </div>
                        <div className="text-[14px] text-gray-900">
                          {isParcel ? "Parcel Delivery" : bookingMode === "distance" ? "Distance" : "Hourly"}
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

                      {bookingMode === "distance" && (
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
                                .replace(",", ",")
                            : "--"}
                        </div>
                      </div>

                      {bookingMode === "distance" && (
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
                                ? `${Math.floor(routeDurationValue / 3600)} h ${Math.floor((routeDurationValue % 3600) / 60)} m`
                                : routeDuration !== "--"
                                  ? routeDuration
                                  : "--"}
                            </div>
                          </div>
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
                    </div>

                    {/* Pricing / Fare & tip (matches checkout fare card) */}
                    <div className="mt-3 space-y-3">
                      {(selectedVehicle ||
                        (pricingSummary &&
                          (pricingSummary.stopCharge > 0 ||
                            pricingSummary.childSeatCharge > 0 ||
                            pricingSummary.meetGreetCharge > 0 ||
                            pricingSummary.bouquetCharge > 0))) && (
                        <div className="space-y-2">
                          {selectedVehicle && (() => {
                            const vehicle = resolveVehicle(selectedVehicle);
                            if (!vehicle) return null;
                            const vehicleAmount =
                              pricingSummary?.rideFare ?? routePrice ?? vehicle.price;
                            return (
                              <div className="flex items-center justify-between text-[13px] text-gray-700">
                                <span>Selected vehicle</span>
                                <span className="tabular-nums font-medium text-gray-800">
                                  ${Number(vehicleAmount).toFixed(2)}
                                </span>
                              </div>
                            );
                          })()}
                          {pricingSummary && pricingSummary.stopCharge > 0 && (
                            <div className="flex items-center justify-between text-[13px] text-gray-700">
                              <span>Stops</span>
                              <span className="tabular-nums">${pricingSummary.stopCharge.toFixed(2)}</span>
                            </div>
                          )}
                          {pricingSummary && pricingSummary.childSeatCharge > 0 && (
                            <div className="flex items-center justify-between text-[13px] text-gray-700">
                              <span>Child seat</span>
                              <span className="tabular-nums">${pricingSummary.childSeatCharge.toFixed(2)}</span>
                            </div>
                          )}
                          {pricingSummary && pricingSummary.meetGreetCharge > 0 && (
                            <div className="flex items-center justify-between text-[13px] text-gray-700">
                              <span>Meet &amp; Greet</span>
                              <span className="tabular-nums">${pricingSummary.meetGreetCharge.toFixed(2)}</span>
                            </div>
                          )}
                          {pricingSummary && pricingSummary.bouquetCharge > 0 && (
                            <div className="flex items-center justify-between text-[13px] text-gray-700">
                              <span>Bouquet</span>
                              <span className="tabular-nums">${pricingSummary.bouquetCharge.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div>
                        <div className="text-[12px] font-semibold text-gray-800 mb-2">Fare & tip</div>
                        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                          <div className="divide-y divide-gray-100">
                            <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                              <span className="text-[13px] text-gray-500">Subtotal</span>
                              <span className="text-[13px] font-medium text-gray-900 tabular-nums">
                                ${(pricingSummary?.subtotal ?? 0).toFixed(2)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                              <span className="text-[13px] text-gray-500">
                                HST ({(pricingConfig.hstRate * 100).toFixed(0)}%)
                              </span>
                              <span className="text-[13px] font-medium text-gray-900 tabular-nums">
                                ${(pricingSummary?.hst ?? 0).toFixed(2)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[13px] text-gray-500">Gratuity</span>
                                <select
                                  value={gratuityPercent}
                                  onChange={(e) => setGratuityPercent(Number(e.target.value))}
                                  className="text-[12px] font-medium text-gray-900 bg-white border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:border-[#C9A063]"
                                >
                                  <option value={20}>20%</option>
                                  <option value={25}>25%</option>
                                </select>
                              </div>
                              <span className="text-[13px] font-medium text-gray-900 tabular-nums shrink-0">
                                ${(pricingSummary?.gratuity ?? 0).toFixed(2)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3 px-3 py-2.5 border-t border-gray-200">
                              <span className="text-[14px] font-semibold text-gray-900">Total</span>
                              <span className="text-[15px] font-bold text-gray-900 tabular-nums">
                                ${(pricingSummary?.total ?? routePrice ?? 0).toFixed(2)}{" "}
                                <span className="text-[11px] font-semibold text-gray-500">CAD</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {currentStep === 4 && !paymentSuccess && (
                        <div className="space-y-3">
                          <label className="flex items-start gap-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={termsAccepted}
                              onChange={(e) => setTermsAccepted(e.target.checked)}
                              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#C9A063] focus:ring-[#C9A063] flex-shrink-0"
                            />
                            <span className="text-[12px] text-gray-600 leading-snug">
                              I agree to the{" "}
                              <a href="/terms-of-service" target="_blank" rel="noopener noreferrer" className="text-[#C9A063] underline">
                                Terms
                              </a>
                              ,{" "}
                              <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[#C9A063] underline">
                                Privacy
                              </a>
                              {" "}&{" "}
                              <a href="/privacy-policy#cancellation" target="_blank" rel="noopener noreferrer" className="text-[#C9A063] underline">
                                Cancellation Policy
                              </a>
                            </span>
                          </label>

                          <div>
                            <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500 mb-1.5">
                              Security check
                            </div>
                            <Turnstile
                              onVerify={(token) => setTurnstileToken(token)}
                              onExpire={() => setTurnstileToken("")}
                              onError={() => setTurnstileToken("")}
                            />
                          </div>
                        </div>
                      )}

                      {currentStep >= 3 && currentStep < 4 && selectedVehicle && (
                        <button
                          type="button"
                          onClick={() => setCurrentStep(2)}
                          className="w-full text-center text-[12px] font-medium text-[#C9A063] hover:text-[#B8935A] transition-colors"
                        >
                          Change vehicle
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

export default function ReservationPage() {
  return (
    <GoogleMapsProvider>
      <Suspense
        fallback={
          <main className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-[#C9A063] animate-spin" />
          </main>
        }
      >
        <ReservationPageContent />
      </Suspense>
    </GoogleMapsProvider>
  );
}
