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
import { GoogleMapsProvider } from "@/components/GoogleMapsProvider";

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
    
    if (modeParam === "hourly" || modeParam === "distance") {
      setBookingMode(modeParam);
      if (modeParam === "hourly") {
        setServiceType("Hourly ride");
      } else if (serviceTypeParam) {
        setServiceType(serviceTypeParam);
      }
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

  const sendReservationEmails = useCallback(async (paymentIntentId: string) => {
    setEmailSending(true);
    setEmailError("");
    try {
      const vehicleName = resolveVehicle(selectedVehicle)?.name || selectedVehicle;
      const res = await fetch("/api/reservation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName, lastName, email, phone, phoneCode: countryCode,
          serviceType,
          bookingMode,
          transferType,
          adultsCount,
          childrenCount,
          hourlyDuration,
          returnDateTime: returnDateTime ? returnDateTime.toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" }) : undefined,
          pickupLocation, dropoffLocation,
          stops: stops.filter((s) => s.trim() !== ""),
          serviceDate: pickupDateTime ? pickupDateTime.toLocaleDateString("en-CA") : "",
          serviceTime: pickupDateTime ? pickupDateTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) : "",
          vehicle: vehicleName,
          vehicleId: selectedVehicle,
          passengers: passengersCount,
          childSeatCount,
          childSeatType,
          etr407,
          meetGreet,
          bouquetFlowers,
          specialRequirements,
          routeDistance, routeDuration, routePrice,
          routeDistanceValue,
          gratuityPercent,
          airlineName, flightNumber, flightNote,
          billingAddress, zipCode,
          purchaseOrder, deptNumber,
          stripePaymentIntentId: paymentIntentId,
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
  }, [firstName, lastName, email, phone, countryCode, serviceType, bookingMode, transferType, adultsCount, childrenCount, hourlyDuration, returnDateTime, pickupLocation, dropoffLocation, stops, pickupDateTime, selectedVehicle, passengersCount, childSeatCount, childSeatType, etr407, meetGreet, bouquetFlowers, specialRequirements, routeDistance, routeDuration, routePrice, routeDistanceValue, gratuityPercent, airlineName, flightNumber, flightNote, billingAddress, zipCode, purchaseOrder, deptNumber, turnstileToken, resolveVehicle]);

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
        childSeatCount,
        meetGreet,
        bouquetFlowers,
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
    { id: 4, title: "Confirmation", description: "Review & pay" }
  ];

  return (
    <GoogleMapsProvider>
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 overflow-x-hidden">
      <TopNav />
      <Navbar />

      <section className="pt-[140px] sm:pt-[165px] md:pt-[185px] pb-12 sm:pb-20 overflow-x-hidden">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 md:px-12">
          
          {/* Header */}
          <div className="text-center mb-6 sm:mb-10">
            <div className="inline-flex items-center gap-2 sm:gap-2.5 px-3.5 sm:px-6 py-2 sm:py-3 rounded-full bg-white border border-[#C9A063]/30 shadow-lg shadow-[#C9A063]/10 mb-4 sm:mb-6 max-w-full">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#C9A063] to-[#B8935A] animate-pulse flex-shrink-0" />
              <span className="text-gray-800 text-[12px] sm:text-[20px] font-bold tracking-[0.08em] sm:tracking-[0.2em] uppercase">Make A Reservation</span>
            </div>
            <p className="text-gray-600 text-[14px] sm:text-lg max-w-2xl mx-auto px-1">
              Experience world-class chauffeur service with our premium fleet
            </p>
          </div>

          {/* Progress Steps */}
          <div className="mb-6 sm:mb-12">
            {/* Desktop Progress */}
            <div className="hidden md:flex items-center justify-center">
              <div className="flex items-center space-x-4">
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
                          ? "cursor-pointer hover:opacity-90 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A063]/40 focus-visible:ring-offset-2 rounded-lg"
                          : "cursor-default"
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold text-sm border-2 transition-all duration-300 ${
                        currentStep >= step.id 
                          ? 'bg-[#C9A063] text-white border-[#C9A063] shadow-lg shadow-[#C9A063]/30' 
                          : 'bg-white text-gray-400 border-gray-300'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle className="w-6 h-6" />
                        ) : (
                          step.id
                        )}
                      </div>
                      <div className="mt-2 text-center max-w-[120px]">
                        <div className="text-sm font-semibold">{step.title}</div>
                        <div className="text-xs text-gray-500">{step.description}</div>
                        {isClickable && (
                          <div className="text-[10px] text-[#C9A063]/80 mt-0.5 font-medium">Tap to edit</div>
                        )}
                      </div>
                    </button>
                    {index < steps.length - 1 && (
                      <div className={`w-16 h-0.5 mx-4 ${currentStep > step.id ? 'bg-[#C9A063]' : 'bg-gray-300'}`} />
                    )}
                  </div>
                )})}
              </div>
            </div>

            {/* Mobile Progress */}
            <div className="md:hidden">
              <div className="flex items-center justify-between mb-2.5">
                <div className="text-[12px] font-medium text-gray-600">
                  Step {currentStep} of {steps.length}
                </div>
                <div className="text-[12px] text-gray-500">
                  {Math.round((currentStep / steps.length) * 100)}% Complete
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mb-3">
                <div 
                  className="bg-gradient-to-r from-[#C9A063] to-[#A68B5B] h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${(currentStep / steps.length) * 100}%` }}
                />
              </div>

              {/* Mobile step dots — tap completed steps to go back */}
              <div className="flex items-stretch justify-between gap-1 mb-3">
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
                      className={`flex flex-1 flex-col items-center gap-1 min-w-0 py-1 transition-all ${
                        isCompleted
                          ? "cursor-pointer active:scale-95"
                          : "cursor-default"
                      }`}
                    >
                      <span
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold border-2 transition-colors ${
                          isCompleted
                            ? "bg-[#C9A063] text-white border-[#C9A063]"
                            : isCurrent
                              ? "bg-[#C9A063] text-white border-[#C9A063] ring-2 ring-[#C9A063]/30"
                              : "bg-white text-gray-400 border-gray-300"
                        }`}
                      >
                        {isCompleted ? <CheckCircle className="w-3.5 h-3.5" /> : step.id}
                      </span>
                      <span
                        className={`text-[9px] font-medium leading-tight text-center truncate w-full px-0.5 ${
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
                <h3 className="text-base font-bold text-gray-900">{steps[currentStep - 1].title}</h3>
                <p className="text-[12px] text-gray-600">{steps[currentStep - 1].description}</p>
                {currentStep > 1 && (
                  <p className="text-[11px] text-[#C9A063] mt-1 font-medium">
                    Tap a completed step above to go back and edit
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            
            {/* Form Section */}
            <div className="lg:col-span-2">
              {/* Booking Mode Toggle - Above Form */}
              {currentStep === 1 && (
                <div className="flex justify-center mb-3 px-1">
                  <div className="inline-flex w-full max-w-sm sm:w-auto sm:max-w-none rounded-full p-0.5 bg-white border border-gray-200 shadow-sm">
                    <button
                      type="button"
                      onClick={() => {
                        setBookingMode("distance");
                        setServiceType("Point-to-Point transportation");
                        setDropoffLocation("");
                      }}
                      className={`relative flex-1 min-w-[7.5rem] px-4 sm:px-7 py-2 rounded-full text-[11px] sm:text-[12px] font-semibold tracking-wide transition-all duration-300 ${
                        bookingMode === "distance"
                          ? "bg-[#1C1C1E] text-white shadow-md"
                          : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      DISTANCE
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBookingMode("hourly");
                        setServiceType("Hourly ride");
                        setDropoffLocation("");
                      }}
                      className={`relative flex-1 min-w-[7.5rem] px-4 sm:px-7 py-2 rounded-full text-[11px] sm:text-[12px] font-semibold tracking-wide transition-all duration-300 ${
                        bookingMode === "hourly"
                          ? "bg-[#1C1C1E] text-white shadow-md"
                          : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      HOURLY
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden">
                <div className="bg-[#1C1C1E] px-4 py-3 sm:px-5 sm:py-3.5">
                  <h2 className="text-[15px] sm:text-base font-semibold text-white leading-tight">
                    Step {currentStep}: {steps[currentStep - 1].title}
                  </h2>
                  <p className="text-gray-400 text-[12px] sm:text-[13px] mt-0.5">
                    {steps[currentStep - 1].description}
                  </p>
                </div>

                <div className="p-3.5 sm:p-5 bg-[#f2f2f7]">
                  {/* Step 1: Ride Details */}
                  {currentStep === 1 && (
                    <div className="space-y-3">
                      {/* Trip Route - iOS grouped style */}
                      <div className="bg-white rounded-xl border border-gray-200/60 divide-y divide-gray-100">
                        <div className="px-3.5 py-2.5">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-7 h-7 rounded-md bg-[#e5e5ea] flex items-center justify-center flex-shrink-0">
                              <MapPin className="w-3.5 h-3.5 text-gray-600" strokeWidth={2} />
                            </div>
                            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Pickup</label>
                          </div>
                          <PlacesAutocomplete
                            value={pickupLocation}
                            onChange={(val) => { setPickupLocation(val); setStepError(""); }}
                            placeholder="Address or airport code (e.g. YYZ)"
                            className="w-full py-1 bg-transparent text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none"
                          />
                        </div>
                        {bookingMode === "distance" && (
                          <div className="px-3.5 py-2.5">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-7 h-7 rounded-md bg-[#e5e5ea] flex items-center justify-center flex-shrink-0">
                                <MapPin className="w-3.5 h-3.5 text-gray-600" strokeWidth={2} />
                              </div>
                              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Drop-off</label>
                            </div>
                            <PlacesAutocomplete
                              value={dropoffLocation}
                              onChange={(val) => { setDropoffLocation(val); setStepError(""); }}
                              placeholder="Destination address"
                              className="w-full py-1 bg-transparent text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none"
                            />
                          </div>
                        )}
                        {bookingMode === "hourly" && (
                          <div className="px-3.5 py-2.5">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-7 h-7 rounded-md bg-[#e5e5ea] flex items-center justify-center flex-shrink-0">
                                <Clock className="w-3.5 h-3.5 text-gray-600" strokeWidth={2} />
                              </div>
                              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Duration (Hours)</label>
                            </div>
                            <select
                              value={hourlyDuration}
                              onChange={(e) => setHourlyDuration(parseInt(e.target.value))}
                              className="w-full py-1 bg-transparent text-[14px] text-gray-900 focus:outline-none"
                            >
                              {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => (
                                <option key={h} value={h}>{h} hours</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      {stops.map((stop, index) => (
                        <div key={index} className="bg-white rounded-xl border border-gray-200/60">
                          <div className="px-3.5 py-2.5">
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
                                  className="w-full py-1 bg-transparent text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => setStops(stops.filter((_, i) => i !== index))}
                                className="p-1 text-gray-400 hover:text-gray-600"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => setStops([...stops, ""])}
                        className="flex items-center gap-1.5 text-[#007AFF] text-[13px] font-medium pl-0.5"
                      >
                        <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                        Add Stop
                      </button>

                      {/* Pick-up Date & Time + Passengers — compact row on desktop */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                              className="w-full px-3.5 py-2.5 pr-10 border border-gray-200 rounded-xl text-[14px] text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#C9A063]/20 focus:border-[#C9A063] transition-all duration-200"
                              withPortal
                              required
                            />
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200/60 px-3.5 py-2.5">
                          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Passengers</label>
                          <div className="flex items-center justify-between">
                            <span className="text-[14px] font-medium text-gray-900 tabular-nums">{passengersCount}</span>
                            <div className="flex items-center rounded-lg overflow-hidden border border-gray-200">
                              <button
                                type="button"
                                onClick={() => { setAdultsCount((p) => Math.max(1, p - 1)); }}
                                disabled={passengersCount <= 1}
                                className="p-1.5 bg-[#f2f2f7] text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed active:bg-[#e5e5ea]"
                                aria-label="Decrease"
                              >
                                <ChevronDown className="w-3.5 h-3.5" strokeWidth={2.5} />
                              </button>
                              <button
                                type="button"
                                onClick={() => { setAdultsCount((p) => Math.min(50, p + 1)); }}
                                disabled={passengersCount >= 50}
                                className="p-1.5 bg-[#f2f2f7] text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed active:bg-[#e5e5ea] border-l border-gray-200"
                                aria-label="Increase"
                              >
                                <ChevronUp className="w-3.5 h-3.5" strokeWidth={2.5} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* Step 2: Select Vehicle */}
                  {currentStep === 2 && (
                    <div className="space-y-4">
                      <div>
                        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-3">
                          <div>
                            <h3 className="text-[15px] sm:text-base font-semibold text-gray-900">Choose Your Vehicle</h3>
                            <p className="text-[12px] text-gray-500 mt-0.5">
                              {filteredVehicles.length} option{filteredVehicles.length === 1 ? "" : "s"} available
                            </p>
                          </div>
                        </div>

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

                        {/* Compact horizontal vehicle rows — less scroll */}
                        <div className="bg-white rounded-xl border border-gray-200/60 overflow-hidden divide-y divide-gray-100">
                          {filteredVehicles.length === 0 ? (
                            <div className="px-4 py-8 text-center text-[13px] text-gray-500">
                              No vehicles match this filter for your passenger count.
                            </div>
                          ) : (
                            filteredVehicles.map((vehicle) => {
                              const isSelected = selectedVehicle === vehicle.id;
                              return (
                                <button
                                  key={vehicle.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedVehicle(vehicle.id);
                                    setStepError("");
                                  }}
                                  className={`w-full flex items-center gap-2.5 sm:gap-3 px-2.5 py-2.5 sm:px-3.5 sm:py-3 text-left transition-colors min-h-[64px] ${
                                    isSelected
                                      ? "bg-[#C9A063]/10"
                                      : "active:bg-gray-100 sm:hover:bg-gray-50"
                                  }`}
                                >
                                  <div
                                    className={`relative w-[64px] h-[44px] sm:w-[88px] sm:h-[56px] rounded-lg overflow-hidden flex-shrink-0 bg-gray-50 border ${
                                      isSelected ? "border-[#C9A063]/40" : "border-gray-100"
                                    }`}
                                  >
                                    <img
                                      src={vehicle.image}
                                      alt={vehicle.name}
                                      className="w-full h-full object-contain p-0.5 sm:p-1"
                                    />
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <h4 className="font-semibold text-gray-900 text-[13px] sm:text-[15px] truncate">
                                        {vehicle.name}
                                      </h4>
                                      <span className="flex-shrink-0 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                        {vehicle.category}
                                      </span>
                                    </div>
                                    <p className="text-[12px] text-gray-500 mt-0.5 tabular-nums">
                                      From ${formatHourlyRate(vehicle.price)}/hr
                                    </p>
                                  </div>

                                  <div className="flex-shrink-0 pl-1">
                                    {isSelected ? (
                                      <CheckCircle className="w-5 h-5 text-[#C9A063]" strokeWidth={2} />
                                    ) : (
                                      <span className="w-5 h-5 rounded-full border-2 border-gray-300 block" />
                                    )}
                                  </div>
                                </button>
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
                            
                            {/* Meet & Greet */}
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
                            
                            {/* Bouquet of Flowers */}
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
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Step 3: Contact Information */}
                  {currentStep === 3 && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-gray-700 text-sm font-semibold mb-3">
                            First Name *
                          </label>
                          <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#C9A063]" />
                            <input
                              type="text"
                              required
                              placeholder="John"
                              value={firstName}
                              onChange={(e) => { setFirstName(e.target.value); setStepError(""); }}
                              className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:border-[#C9A063] focus:ring-4 focus:ring-[#C9A063]/10 transition-all duration-300"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-gray-700 text-sm font-semibold mb-3">
                            Last Name *
                          </label>
                          <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#C9A063]" />
                            <input
                              type="text"
                              required
                              placeholder="Smith"
                              value={lastName}
                              onChange={(e) => { setLastName(e.target.value); setStepError(""); }}
                              className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:border-[#C9A063] focus:ring-4 focus:ring-[#C9A063]/10 transition-all duration-300"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-gray-700 text-sm font-semibold mb-3">
                          Email Address *
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#C9A063]" />
                          <input
                            type="email"
                            required
                            placeholder="john.smith@example.com"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); setStepError(""); }}
                            className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:border-[#C9A063] focus:ring-4 focus:ring-[#C9A063]/10 transition-all duration-300"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-gray-700 text-sm font-semibold mb-3">
                          Phone Number *
                        </label>
                        <div className="flex rounded-xl border-2 border-gray-200 focus-within:border-[#C9A063] focus-within:ring-4 focus-within:ring-[#C9A063]/10 transition-all duration-300">
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setCountryDropdownOpen(!countryDropdownOpen)}
                              className="flex items-center gap-2 px-4 py-4 bg-gray-50 border-r border-gray-200 rounded-l-xl hover:bg-gray-100 transition-colors"
                            >
                              <img
                                src={`https://flagcdn.com/w40/${COUNTRY_CODES.find(c => c.code === countryCode)?.flagCode}.png`}
                                alt=""
                                className="w-5 h-4 object-cover rounded-sm"
                              />
                              <span className="text-sm font-bold text-gray-900">{countryCode}</span>
                              <ChevronDown className="w-4 h-4 text-gray-500" />
                            </button>
                            {countryDropdownOpen && (
                              <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-50">
                                {COUNTRY_CODES.map((country) => (
                                  <button
                                    key={`${country.code}-${country.label}`}
                                    onClick={() => {
                                      setCountryCode(country.code);
                                      setCountryDropdownOpen(false);
                                    }}
                                    className="flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-50 text-left"
                                  >
                                    <img
                                      src={`https://flagcdn.com/w40/${country.flagCode}.png`}
                                      alt=""
                                      className="w-5 h-4 object-cover rounded-sm"
                                    />
                                    <span className="text-sm font-semibold text-gray-900">{country.code} {country.name}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="relative flex-1">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#C9A063]" />
                            <input
                              type="tel"
                              required
                              placeholder="123-456-7890"
                              value={phone}
                              onChange={(e) => { setPhone(e.target.value); setStepError(""); }}
                              className="w-full pl-12 pr-4 py-4 bg-transparent text-gray-900 placeholder-gray-500 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-gray-700 text-sm font-semibold mb-3">
                          Special Requirements (Optional)
                        </label>
                        <textarea
                          placeholder="Special Requests"
                          rows={4}
                          value={specialRequirements}
                          onChange={(e) => setSpecialRequirements(e.target.value)}
                          className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:border-[#C9A063] focus:ring-4 focus:ring-[#C9A063]/10 transition-all duration-300 resize-none"
                        />
                      </div>

                      {/* Flight Info Section */}
                      <div className="pt-6 border-t border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Flight Info (YYZ - Pearson International Airport-Toronto):</h3>
                        
                        <div className="space-y-4">
                          <div>
                            <input
                              type="text"
                              placeholder="Start typing airline name and select from list"
                              value={airlineName}
                              onChange={(e) => setAirlineName(e.target.value)}
                              className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-[#C9A063] focus:ring-4 focus:ring-[#C9A063]/10 transition-all duration-300"
                            />
                          </div>

                          <div>
                            <input
                              type="text"
                              placeholder="Flight or Tail Number"
                              value={flightNumber}
                              onChange={(e) => setFlightNumber(e.target.value)}
                              className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-[#C9A063] focus:ring-4 focus:ring-[#C9A063]/10 transition-all duration-300"
                            />
                          </div>

                          <div>
                            <select
                              value={flightNote}
                              onChange={(e) => setFlightNote(e.target.value)}
                              className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-[#C9A063] focus:ring-4 focus:ring-[#C9A063]/10 transition-all duration-300"
                            >
                              <option value="">See Note</option>
                              <option value="Domestic Flight">Domestic Flight</option>
                              <option value="International Flight">International Flight</option>
                              <option value="Private Flight">Private Jet</option>
                            </select>
                          </div>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* Step 4: Confirm and proceed to Payment */}
                  {currentStep === 4 && (() => {
                    const subtotal = pricingSummary?.subtotal ?? 0;
                    const hst = pricingSummary?.hst ?? 0;
                    const gratuity = pricingSummary?.gratuity ?? 0;
                    const total = pricingSummary?.total ?? 0;
                    const vehicle = resolveVehicle(selectedVehicle);

                    const summaryRows: { label: string; value: string }[] = [
                      { label: "Vehicle", value: vehicle?.name ?? "--" },
                      {
                        label: "Date & time",
                        value: pickupDateTime
                          ? pickupDateTime.toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            })
                          : "--",
                      },
                      { label: "Pickup", value: pickupLocation || "--" },
                    ];
                    if (bookingMode === "distance") {
                      summaryRows.push({ label: "Drop-off", value: dropoffLocation || "--" });
                      if (routeDistance !== "--") {
                        summaryRows.push({
                          label: "Estimate",
                          value: `${routeDistance} · ${routeDuration}`,
                        });
                      }
                    } else {
                      summaryRows.push({ label: "Duration", value: `${hourlyDuration} hours` });
                    }
                    summaryRows.push({ label: "Passengers", value: String(passengersCount) });
                    summaryRows.push({
                      label: "Guest",
                      value: [firstName, lastName].filter(Boolean).join(" ") || "--",
                    });

                    return (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-[16px] font-semibold text-gray-900">Confirmation</h3>
                        <p className="text-[13px] text-gray-500 mt-0.5">Review details and pay to book</p>
                      </div>

                      {/* One simple summary + fare card */}
                      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-100">
                          <span className="text-[13px] font-semibold text-gray-900">Trip details</span>
                        </div>

                        <div className="divide-y divide-gray-100">
                          {summaryRows.map((row) => (
                            <div
                              key={row.label}
                              className="flex items-start justify-between gap-4 px-4 py-2.5"
                            >
                              <span className="text-[13px] text-gray-500 flex-shrink-0">{row.label}</span>
                              <span className="text-[13px] font-medium text-gray-900 text-right break-words">
                                {row.value}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="border-t border-gray-200 divide-y divide-gray-100 bg-[#fafafa]">
                          {!RESERVATION_HIDE_HOURLY_RATE_IDS.has(selectedVehicle) && (
                            <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                              <span className="text-[13px] text-gray-500">
                                {bookingMode === "hourly"
                                  ? `Rate (${hourlyDuration} hr)`
                                  : `Base (up to ${pricingConfig.baseDistanceKm} km)`}
                              </span>
                              <span className="text-[13px] font-medium text-gray-900 tabular-nums">
                                {bookingMode === "hourly"
                                  ? `$${((vehicle?.price ?? 0) * hourlyDuration).toFixed(2)}`
                                  : `$${(vehicle?.price ?? 0).toFixed(2)}`}
                              </span>
                            </div>
                          )}
                          {bookingMode === "distance" && routeDistanceValue > pricingConfig.baseDistanceKm * 1000 && (
                            <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                              <span className="text-[13px] text-gray-500">Extra distance</span>
                              <span className="text-[13px] font-medium text-gray-900 tabular-nums">
                                ${(((routeDistanceValue / 1000) - pricingConfig.baseDistanceKm) * pricingConfig.extraKmRate).toFixed(2)}
                              </span>
                            </div>
                          )}
                          {meetGreet && (
                            <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                              <span className="text-[13px] text-gray-500">Meet & Greet</span>
                              <span className="text-[13px] font-medium text-gray-900 tabular-nums">${pricingConfig.meetGreet.toFixed(2)}</span>
                            </div>
                          )}
                          {activeStopCount > 0 && (
                            <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                              <span className="text-[13px] text-gray-500">Stops ({activeStopCount})</span>
                              <span className="text-[13px] font-medium text-gray-900 tabular-nums">
                                ${(activeStopCount * pricingConfig.stop).toFixed(2)}
                              </span>
                            </div>
                          )}
                          {childSeatCount > 0 && (
                            <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                              <span className="text-[13px] text-gray-500">Child seat ({childSeatCount})</span>
                              <span className="text-[13px] font-medium text-gray-900 tabular-nums">
                                ${(childSeatCount * pricingConfig.childSeat).toFixed(2)}
                              </span>
                            </div>
                          )}
                          {bouquetFlowers && (
                            <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                              <span className="text-[13px] text-gray-500">Bouquet</span>
                              <span className="text-[13px] font-medium text-gray-900 tabular-nums">${pricingConfig.bouquet.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                            <span className="text-[13px] text-gray-500">Subtotal</span>
                            <span className="text-[13px] font-medium text-gray-900 tabular-nums">
                              ${subtotal > 0 ? subtotal.toFixed(2) : "0.00"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                            <span className="text-[13px] text-gray-500">
                              HST ({(pricingConfig.hstRate * 100).toFixed(0)}%)
                            </span>
                            <span className="text-[13px] font-medium text-gray-900 tabular-nums">
                              ${subtotal > 0 ? hst.toFixed(2) : "0.00"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                            <div className="flex items-center gap-2">
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
                            <span className="text-[13px] font-medium text-gray-900 tabular-nums">
                              ${subtotal > 0 ? gratuity.toFixed(2) : "0.00"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3 px-4 py-3 bg-white border-t border-gray-200">
                            <span className="text-[14px] font-semibold text-gray-900">Total</span>
                            <span className="text-[16px] font-bold text-gray-900 tabular-nums">
                              ${total > 0 ? total.toFixed(2) : "0.00"}{" "}
                              <span className="text-[12px] font-semibold text-gray-500">CAD</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={termsAccepted}
                          onChange={(e) => setTermsAccepted(e.target.checked)}
                          className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#C9A063] focus:ring-[#C9A063] flex-shrink-0"
                        />
                        <span className="text-[13px] text-gray-600 leading-snug">
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

                      <Turnstile
                        onVerify={(token) => setTurnstileToken(token)}
                        onExpire={() => setTurnstileToken("")}
                        onError={() => setTurnstileToken("")}
                      />

                      {!paymentSuccess && (
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                          <h3 className="text-[14px] font-semibold text-gray-900 mb-1">Payment</h3>
                          <p className="text-[12px] text-gray-500 mb-3">
                            Pay the full amount to confirm your reservation.
                          </p>
                          {!termsAccepted && (
                            <p className="text-[12px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5 mb-3">
                              Please accept the terms before paying.
                            </p>
                          )}
                          {termsAccepted && !turnstileToken && (
                            <p className="text-[12px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5 mb-3">
                              Please complete the security check above.
                            </p>
                          )}
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
                        </div>
                      )}

                      {paymentSuccess && (
                        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
                          <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto mb-3" strokeWidth={2} />
                          <h3 className="text-[15px] font-semibold text-gray-900">Payment successful</h3>
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
                          {!emailSending && !emailSent && !emailError && (
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

                      <p className="text-[12px] text-gray-400 leading-relaxed">
                        Includes flight tracking for airport transfers and 15 min complimentary wait time. 24/7 support available.
                      </p>
                    </div>
                    );
                  })()}

                  {/* Validation Error */}
                  {stepError && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5">
                      <AlertCircle className="w-4.5 h-4.5 text-red-500 flex-shrink-0" strokeWidth={2} />
                      <p className="text-red-700 text-[13px] font-medium">{stepError}</p>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-2.5 mt-4 pt-3 border-t border-gray-200/60">
                    <button
                      onClick={handlePrevious}
                      disabled={currentStep === 1}
                      className={`w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl text-[14px] font-medium transition-colors ${
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
                        className="w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-1.5 bg-[#1C1C1E] text-white px-5 py-2.5 rounded-xl text-[14px] font-medium active:bg-[#2C2C2E] transition-colors"
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
            <div className={`lg:col-span-1 order-first lg:order-last ${currentStep === 1 ? "lg:mt-[52px]" : ""}`}>
              <div className="rounded-xl sm:rounded-2xl overflow-hidden lg:sticky lg:top-8 border border-gray-200/60 shadow-sm bg-white">
                {currentStep === 1 ? (
                  <>
                    <div className="bg-[#1C1C1E] px-4 py-3 sm:px-5 sm:py-3.5">
                      <h3 className="text-[15px] sm:text-base font-semibold text-white leading-tight">Route Preview</h3>
                      <p className="text-gray-400 text-[12px] sm:text-[13px] mt-0.5">Your journey visualization</p>
                    </div>
                    <div className="h-44 sm:h-64 lg:h-72 relative bg-gray-200">
                      <RouteMap
                        pickupLocation={pickupLocation}
                        dropoffLocation={dropoffLocation}
                        stops={stops}
                        onRouteCalculated={handleRouteCalculated}
                      />
                    </div>
                    <div className="p-3 sm:p-4 bg-[#f2f2f7]">
                      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-1 sm:space-y-0 sm:gap-1.5">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-3 py-2 bg-white rounded-lg border border-gray-200/60">
                          <span className="text-[11px] sm:text-[12px] font-medium text-gray-600">Distance</span>
                          <span className="text-[12px] font-semibold text-gray-900 tabular-nums">
                            {routeDistance !== "--" ? routeDistance : "-- km"}
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-3 py-2 bg-white rounded-lg border border-gray-200/60">
                          <span className="text-[11px] sm:text-[12px] font-medium text-gray-600">Duration</span>
                          <span className="text-[12px] font-semibold text-gray-900 tabular-nums">
                            {routeDuration !== "--" ? routeDuration : "-- min"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-4 sm:p-5 space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-[15px] font-semibold text-[#007AFF]">Ride Details</h3>
                        <button
                          type="button"
                          onClick={() => setCurrentStep(1)}
                          className="flex items-center gap-1.5 text-[#007AFF] text-[13px] font-medium"
                        >
                          <Pencil className="w-3.5 h-3.5" strokeWidth={2} />
                          Edit
                        </button>
                      </div>
                      <div className="bg-white rounded-xl border border-gray-200/60 overflow-hidden">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                          <div className="p-4 space-y-3">
                            <div>
                              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Pick-up Time</div>
                              <div className="text-[13px] text-gray-900">
                                {pickupDateTime
                                  ? pickupDateTime.toLocaleString("en-US", { month: "2-digit", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })
                                  : "--"}
                              </div>
                            </div>
                            <div>
                              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Pick-up Location</div>
                              <div className="text-[13px] text-gray-900 break-words">{pickupLocation || "--"}</div>
                            </div>
                            <div>
                              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Drop-off Location</div>
                              <div className="text-[13px] text-gray-900 break-words">{dropoffLocation || "--"}</div>
                            </div>
                          </div>
                          <div className="p-4 space-y-3">
                            <div>
                              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Booking Mode</div>
                              <div className="text-[13px] text-gray-900">{bookingMode === "distance" ? "Distance Based" : "Hourly"}</div>
                            </div>
                            <div>
                              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Passengers</div>
                              <div className="text-[13px] text-gray-900">{passengersCount}</div>
                            </div>
                            {bookingMode === "distance" && (
                              <div>
                                <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Estimated</div>
                                <div className="text-[13px] text-gray-900">
                                  {routeDistance !== "--" && routeDuration !== "--"
                                    ? `${routeDistance} / ${routeDuration}`
                                    : "--"}
                                </div>
                              </div>
                            )}
                            {bookingMode === "hourly" && (
                              <div>
                                <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Duration</div>
                                <div className="text-[13px] text-gray-900">{hourlyDuration} hours</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Selected Vehicle - Show on Contact Info (Step 3) & Confirmation (Step 4) */}
                    {currentStep >= 3 && selectedVehicle && (() => {
                      const vehicle = resolveVehicle(selectedVehicle);
                      if (!vehicle) return null;
                      return (
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-[15px] font-semibold text-[#007AFF]">Selected Vehicle</h3>
                            {currentStep === 3 && (
                              <button
                                type="button"
                                onClick={() => setCurrentStep(2)}
                                className="flex items-center gap-1.5 text-[#007AFF] text-[13px] font-medium"
                              >
                                <Pencil className="w-3.5 h-3.5" strokeWidth={2} />
                                Change
                              </button>
                            )}
                          </div>
                          <div className="bg-white rounded-xl border border-gray-200/60 overflow-hidden">
                            <div className="flex gap-4 p-4">
                              <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-xl bg-[#f2f2f7] overflow-hidden">
                                <img
                                  src={vehicle.image}
                                  alt={vehicle.name}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-[15px] text-gray-900">{vehicle.name}</div>
                                <div className="text-[13px] text-gray-500 mt-1 line-clamp-2">{vehicle.description}</div>
                                <div className="flex flex-wrap gap-3 mt-2 text-[12px] text-gray-600">
                                  <span className="flex items-center gap-1">
                                    <Users className="w-3.5 h-3.5 text-[#007AFF]" strokeWidth={2} />
                                    {vehicle.seating}
                                  </span>
                                  <span className="flex items-center gap-1">🧳 {vehicle.luggage}</span>
                                </div>
                                {/* Extra Options Summary */}
                                {(etr407 || childSeatCount > 0 || meetGreet || bouquetFlowers) && (
                                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                                    {etr407 && (
                                      <div className="flex items-center justify-between text-[13px]">
                                        <span className="text-gray-600">407 ETR</span>
                                        <span className="text-green-600 font-medium">✓ Added</span>
                                      </div>
                                    )}
                                    {childSeatCount > 0 && (
                                      <div className="flex items-center justify-between text-[13px]">
                                        <span className="text-gray-600">Child Seat ({childSeatCount}x)</span>
                                        <span className="text-gray-900 font-medium">${childSeatCount * 25}</span>
                                      </div>
                                    )}
                                    {childSeatType && childSeatCount > 0 && (
                                      <div className="text-[11px] text-gray-500 pl-2">
                                        Type: {childSeatType}
                                      </div>
                                    )}
                                    {meetGreet && (
                                      <div className="flex items-center justify-between text-[13px]">
                                        <span className="text-gray-600">Meet & Greet</span>
                                        <span className="text-gray-900 font-medium">$95</span>
                                      </div>
                                    )}
                                    {bouquetFlowers && (
                                      <div className="flex items-center justify-between text-[13px]">
                                        <span className="text-gray-600">Bouquet of Flowers</span>
                                        <span className="text-gray-900 font-medium">$50</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
    </GoogleMapsProvider>
  );
}

export default function ReservationPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#C9A063] animate-spin" />
        </main>
      }
    >
      <ReservationPageContent />
    </Suspense>
  );
}
