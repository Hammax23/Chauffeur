"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
  Loader2
} from "lucide-react";
import TopNav from "@/components/TopNav";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import RouteMap from "@/components/RouteMap";
// import StripePayment from "@/components/StripePayment";
import Turnstile from "@/components/Turnstile";
import { fleetData } from "@/data/fleet";

const COUNTRY_CODES = [
  { code: "+1", label: "CA", name: "Canada", flagCode: "ca" },
  { code: "+1", label: "US", name: "United States", flagCode: "us" },
  { code: "+44", label: "UK", name: "United Kingdom", flagCode: "gb" },
  { code: "+33", label: "FR", name: "France", flagCode: "fr" },
  { code: "+49", label: "DE", name: "Germany", flagCode: "de" },
];

export default function ReservationPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [stops, setStops] = useState<string[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [passengersCount, setPassengersCount] = useState(1);
  const [countryCode, setCountryCode] = useState(COUNTRY_CODES[0].code);
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  
  // Dynamic location states
  const [serviceType, setServiceType] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [dropoffLocation, setDropoffLocation] = useState("");
  const [serviceDate, setServiceDate] = useState("");
  const [serviceTime, setServiceTime] = useState("");
  const [childSeatCount, setChildSeatCount] = useState(0);
  const [childSeatType, setChildSeatType] = useState("");
  const [etr407, setEtr407] = useState(false);

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
  const [gratuityPercent, setGratuityPercent] = useState(15);

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

  // Validation state
  const [stepError, setStepError] = useState("");
  
  // Route calculation states
  const [routeDistance, setRouteDistance] = useState("--");
  const [routeDuration, setRouteDuration] = useState("--");
  const [routePrice, setRoutePrice] = useState(0);
  const [routeDistanceValue, setRouteDistanceValue] = useState(0);
  const [routeDurationValue, setRouteDurationValue] = useState(0);
  
  // Payment states (Stripe - commented out)
  // const [showPayment, setShowPayment] = useState(false);
  // const [paymentSuccess, setPaymentSuccess] = useState(false);
  // const [paymentError, setPaymentError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Email states
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState("");

  // Turnstile
  const [turnstileToken, setTurnstileToken] = useState("");

  const sendReservationEmails = useCallback(async () => {
    setEmailSending(true);
    setEmailError("");
    try {
      const vehicleName = fleetData.find((v) => v.id === selectedVehicle)?.name || selectedVehicle;
      const res = await fetch("/api/reservation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName, lastName, email, phone, phoneCode: countryCode,
          serviceType,
          pickupLocation, dropoffLocation,
          stops: stops.filter((s) => s.trim() !== ""),
          serviceDate, serviceTime,
          vehicle: vehicleName,
          passengers: passengersCount,
          childSeatCount,
          childSeatType,
          etr407,
          specialRequirements,
          routeDistance, routeDuration, routePrice,
          gratuityPercent,
          airlineName, flightNumber, flightNote,
          cardType, nameOnCard,
          cardFullNumber: cardNumber,
          expirationMonth, expirationYear,
          billingAddress, zipCode,
          purchaseOrder, deptNumber,
          turnstileToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.error || "Failed to send emails");
      setEmailSent(true);
    } catch (err: any) {
      setEmailError(err.message || "Failed to send confirmation emails.");
    } finally {
      setEmailSending(false);
    }
  }, [firstName, lastName, email, phone, countryCode, serviceType, pickupLocation, dropoffLocation, stops, serviceDate, serviceTime, selectedVehicle, passengersCount, childSeatCount, childSeatType, etr407, specialRequirements, routeDistance, routeDuration, routePrice, gratuityPercent, airlineName, flightNumber, flightNote, cardType, nameOnCard, cardNumber, expirationMonth, expirationYear, billingAddress, zipCode, purchaseOrder, deptNumber, turnstileToken]);

  // Store route data; price is recalculated via useEffect when vehicle or route changes
  const handleRouteCalculated = useCallback((distance: string, duration: string, distanceValue: number, durationValue: number) => {
    setRouteDistance(distance);
    setRouteDuration(duration);
    setRouteDistanceValue(distanceValue);
    setRouteDurationValue(durationValue);
  }, []);

  // Recalculate price whenever vehicle selection or route data changes
  useEffect(() => {
    if (routeDistanceValue <= 0 || routeDurationValue <= 0) {
      setRoutePrice(0);
      return;
    }
    const vehicle = fleetData.find((v) => v.id === selectedVehicle);
    const hourlyRate = vehicle ? vehicle.price : 0;
    // Duration in hours (minimum 1 hour)
    const durationHours = Math.max(1, Math.ceil(routeDurationValue / 3600));
    const calculatedPrice = hourlyRate * durationHours;
    setRoutePrice(calculatedPrice);
  }, [selectedVehicle, routeDistanceValue, routeDurationValue]);

  // Step validation
  const validateStep = (step: number): boolean => {
    setStepError("");
    if (step === 1) {
      if (!serviceType) { setStepError("Please select a service type."); return false; }
      if (!pickupLocation.trim()) { setStepError("Please enter a pickup location."); return false; }
      if (!dropoffLocation.trim()) { setStepError("Please enter a drop-off location."); return false; }
      if (!serviceDate) { setStepError("Please select a date."); return false; }
      if (!serviceTime) { setStepError("Please select a time."); return false; }
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
    }
  };

  const steps = [
    { id: 1, title: "Ride Details", description: "When and where" },
    { id: 2, title: "Select Vehicle", description: "Choose your ride" },
    { id: 3, title: "Contact Info", description: "Your details" },
    { id: 4, title: "Confirmation", description: "Review & pay" }
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <TopNav />
      <Navbar />

      <section className="pt-[165px] md:pt-[185px] pb-20">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 md:px-12">
          
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-white border border-[#C9A063]/30 shadow-lg shadow-[#C9A063]/10 mb-6">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#C9A063] to-[#B8935A] animate-pulse" />
              <span className="text-gray-800 text-[20px] font-bold tracking-[0.2em] uppercase">Make A Reservation</span>
            </div>
            {/* <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight mb-4">
              Make A Reservation
            </h1> */}
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Experience world-class chauffeur service with our premium fleet
            </p>
          </div>

          {/* Progress Steps */}
          <div className="mb-8 sm:mb-12">
            {/* Desktop Progress */}
            <div className="hidden md:flex items-center justify-center">
              <div className="flex items-center space-x-4">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex items-center">
                    <div className={`flex flex-col items-center ${currentStep >= step.id ? 'text-[#C9A063]' : 'text-gray-400'}`}>
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold text-sm border-2 transition-all duration-300 ${
                        currentStep >= step.id 
                          ? 'bg-[#C9A063] text-white border-[#C9A063] shadow-lg shadow-[#C9A063]/30' 
                          : 'bg-white text-gray-400 border-gray-300'
                      }`}>
                        {currentStep > step.id ? (
                          <CheckCircle className="w-6 h-6" />
                        ) : (
                          step.id
                        )}
                      </div>
                      <div className="mt-2 text-center">
                        <div className="text-sm font-semibold">{step.title}</div>
                        <div className="text-xs text-gray-500">{step.description}</div>
                      </div>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`w-16 h-0.5 mx-4 ${currentStep > step.id ? 'bg-[#C9A063]' : 'bg-gray-300'}`} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile Progress */}
            <div className="md:hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-medium text-gray-600">
                  Step {currentStep} of {steps.length}
                </div>
                <div className="text-sm text-gray-500">
                  {Math.round((currentStep / steps.length) * 100)}% Complete
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div 
                  className="bg-gradient-to-r from-[#C9A063] to-[#A68B5B] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(currentStep / steps.length) * 100}%` }}
                />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold text-gray-900">{steps[currentStep - 1].title}</h3>
                <p className="text-sm text-gray-600">{steps[currentStep - 1].description}</p>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            
            {/* Form Section */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200/80">
                <div className="bg-[#1C1C1E] p-4 sm:p-5">
                  <h2 className="text-lg sm:text-xl font-semibold text-white">
                    Step {currentStep}: {steps[currentStep - 1].title}
                  </h2>
                  <p className="text-gray-400 text-sm mt-0.5">
                    {steps[currentStep - 1].description}
                  </p>
                </div>

                <div className="p-4 sm:p-6 bg-[#f2f2f7]">
                  {/* Step 1: Ride Details */}
                  {currentStep === 1 && (
                    <div className="space-y-5">
                      {/* Service Type */}
                      <div className="bg-white rounded-xl border border-gray-200/60 px-4 py-3">
                        <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">Service Type</label>
                        <select
                          value={serviceType}
                          onChange={(e) => { setServiceType(e.target.value); setStepError(""); }}
                          className="w-full py-1.5 bg-transparent text-[15px] text-gray-900 focus:outline-none"
                        >
                          <option value="">Select service type</option>
                          <option value="Airport pick-up/drop-off">Airport pick-up/drop-off</option>
                          <option value="Point-to-Point transportation">Point-to-Point transportation</option>
                          <option value="Hourly ride">Hourly ride</option>
                        </select>
                      </div>

                      {/* Trip Route - iOS grouped style */}
                      <div className="bg-white rounded-xl overflow-hidden border border-gray-200/60 divide-y divide-gray-100">
                        <div className="px-4 py-3">
                          <div className="flex items-center gap-2.5 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-[#e5e5ea] flex items-center justify-center flex-shrink-0">
                              <MapPin className="w-4 h-4 text-gray-600" strokeWidth={2} />
                            </div>
                            <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Pickup</label>
                          </div>
                          <input
                            type="text"
                            required
                            value={pickupLocation}
                            onChange={(e) => { setPickupLocation(e.target.value); setStepError(""); }}
                            placeholder="Address or airport code (e.g. YYZ)"
                            className="w-full py-1.5 -mt-1 bg-transparent text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none"
                          />
                        </div>
                        <div className="px-4 py-3">
                          <div className="flex items-center gap-2.5 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-[#e5e5ea] flex items-center justify-center flex-shrink-0">
                              <MapPin className="w-4 h-4 text-gray-600" strokeWidth={2} />
                            </div>
                            <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Drop-off</label>
                          </div>
                          <input
                            type="text"
                            required
                            value={dropoffLocation}
                            onChange={(e) => { setDropoffLocation(e.target.value); setStepError(""); }}
                            placeholder="Destination address"
                            className="w-full py-1.5 -mt-1 bg-transparent text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none"
                          />
                        </div>
                      </div>

                      {stops.map((stop, index) => (
                        <div key={index} className="bg-white rounded-xl border border-gray-200/60 overflow-hidden">
                          <div className="px-4 py-3">
                            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">Stop {index + 1}</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder="Stop address"
                                value={stop}
                                onChange={(e) => {
                                  const newStops = [...stops];
                                  newStops[index] = e.target.value;
                                  setStops(newStops);
                                }}
                                className="flex-1 py-1.5 bg-transparent text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => setStops(stops.filter((_, i) => i !== index))}
                                className="p-1.5 text-gray-400 hover:text-gray-600"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}

                      <button
                        onClick={() => setStops([...stops, ""])}
                        className="flex items-center gap-2 text-[#007AFF] text-[15px] font-medium"
                      >
                        <Plus className="w-4 h-4" strokeWidth={2.5} />
                        Add Stop
                      </button>

                      {/* 407 ETR */}
                      <div className="bg-white rounded-xl border border-gray-200/60 px-4 py-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider">407 ETR</label>
                            <span className="text-[13px] text-gray-600">Highway 407 Express Toll Route</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setEtr407(!etr407)}
                            className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${etr407 ? 'bg-[#C9A063]' : 'bg-gray-300'}`}
                          >
                            <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-300 ${etr407 ? 'translate-x-5' : 'translate-x-0'}`} />
                          </button>
                        </div>
                      </div>

                      {/* Child Seat */}
                      <div className="bg-white rounded-xl border border-gray-200/60 px-4 py-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider">Child Seat</label>
                            <span className="text-[13px] text-gray-600">$25 per child seat</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setChildSeatCount(Math.max(0, childSeatCount - 1))}
                              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:border-[#C9A063] hover:text-[#C9A063] transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="text-[15px] font-semibold text-gray-900 w-6 text-center">{childSeatCount}</span>
                            <button
                              type="button"
                              onClick={() => setChildSeatCount(childSeatCount + 1)}
                              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:border-[#C9A063] hover:text-[#C9A063] transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        {childSeatCount > 0 && (
                          <div className="mt-3 flex items-center gap-2">
                            <label className="text-[13px] font-medium text-gray-600 whitespace-nowrap">Note:</label>
                            <input
                              type="text"
                              placeholder="Child Seat Type (e.g., Infant, Toddler, Booster)"
                              value={childSeatType}
                              onChange={(e) => setChildSeatType(e.target.value)}
                              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#C9A063] focus:ring-2 focus:ring-[#C9A063]/10 transition-all"
                            />
                          </div>
                        )}
                      </div>

                      {/* Date & Time */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white rounded-xl border border-gray-200/60 px-4 py-3">
                          <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">Date</label>
                          <input
                            type="date"
                            required
                            value={serviceDate}
                            onChange={(e) => { setServiceDate(e.target.value); setStepError(""); }}
                            className="w-full py-1.5 bg-transparent text-[15px] text-gray-900 focus:outline-none"
                          />
                        </div>
                        <div className="bg-white rounded-xl border border-gray-200/60 px-4 py-3">
                          <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">Time</label>
                          <input
                            type="time"
                            required
                            value={serviceTime}
                            onChange={(e) => { setServiceTime(e.target.value); setStepError(""); }}
                            className="w-full py-1.5 bg-transparent text-[15px] text-gray-900 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Passengers - iOS stepper style */}
                      <div className="bg-white rounded-xl border border-gray-200/60 px-4 py-3">
                        <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">Passengers</label>
                        <div className="flex items-center justify-between">
                          <span className="text-[15px] text-gray-900">{passengersCount}</span>
                          <div className="flex items-center rounded-lg overflow-hidden border border-gray-200">
                            <button
                              type="button"
                              onClick={() => setPassengersCount((p) => Math.max(1, p - 1))}
                              disabled={passengersCount <= 1}
                              className="p-2 bg-[#f2f2f7] text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed active:bg-[#e5e5ea]"
                              aria-label="Decrease"
                            >
                              <ChevronDown className="w-4 h-4" strokeWidth={2.5} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setPassengersCount((p) => Math.min(50, p + 1))}
                              disabled={passengersCount >= 50}
                              className="p-2 bg-[#f2f2f7] text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed active:bg-[#e5e5ea] border-l border-gray-200"
                              aria-label="Increase"
                            >
                              <ChevronUp className="w-4 h-4" strokeWidth={2.5} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Select Vehicle */}
                  {currentStep === 2 && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-6">Choose Your Luxury Vehicle</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {fleetData.filter((vehicle) => {
                            const maxSeats = parseInt(vehicle.seating);
                            return !isNaN(maxSeats) && maxSeats >= passengersCount;
                          }).map((vehicle) => (
                            <button
                              key={vehicle.id}
                              onClick={() => { setSelectedVehicle(vehicle.id); setStepError(""); }}
                              className={`p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 text-left transition-all duration-300 group ${
                                selectedVehicle === vehicle.id
                                  ? 'border-[#C9A063] bg-[#C9A063]/5 shadow-xl shadow-[#C9A063]/20'
                                  : 'border-gray-200 hover:border-[#C9A063]/40 hover:bg-gray-50 hover:shadow-lg active:scale-95'
                              }`}
                            >
                              <div className="aspect-[4/3] bg-gray-100 rounded-lg sm:rounded-xl mb-3 sm:mb-4 overflow-hidden">
                                <img
                                  src={vehicle.image}
                                  alt={vehicle.name}
                                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                                />
                              </div>
                              <div className="font-bold text-gray-900 text-base sm:text-lg mb-2">{vehicle.name}</div>
                              <div className="text-gray-700 text-sm mb-3 sm:mb-4 line-clamp-2">{vehicle.description}</div>
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 text-sm">
                                <div className="flex items-center gap-3 sm:gap-4">
                                  <div className="flex items-center gap-1">
                                    <Users className="w-4 h-4 text-[#C9A063]" />
                                    <span className="text-xs sm:text-sm font-medium text-gray-800">{vehicle.seating}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="w-4 h-4 text-[#C9A063] text-xs">🧳</span>
                                    <span className="text-xs sm:text-sm font-medium text-gray-800">{vehicle.luggage}</span>
                                  </div>
                                </div>
                                <span className="font-bold text-[#C9A063] text-sm">From ${vehicle.price}/hr</span>
                              </div>
                            </button>
                          ))}
                        </div>
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
                              <span className="text-sm font-medium">{countryCode}</span>
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
                                    <span className="text-sm">{country.code} {country.name}</span>
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
                          placeholder="Any special requests, dietary requirements, or additional information..."
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
                              <option value="Private Flight">Private Flight</option>
                            </select>
                          </div>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* Step 4: Confirm and proceed to Payment */}
                  {currentStep === 4 && (
                    <div className="space-y-5">
                      <div>
                        <h3 className="text-[17px] font-semibold text-gray-900 mb-1">Confirmation</h3>
                        <p className="text-[13px] text-gray-500">Review & pay</p>
                      </div>

                      <div className="bg-white rounded-xl border border-gray-200/60 overflow-hidden">
                        <div className="divide-y divide-gray-100">
                          <div className="flex items-center justify-between p-4">
                            <span className="text-[13px] font-medium text-gray-600">Vehicle</span>
                            <span className="text-[13px] font-semibold text-gray-900">
                              {fleetData.find((v) => v.id === selectedVehicle)?.name ?? "--"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-4">
                            <span className="text-[13px] font-medium text-gray-600">Date & Time</span>
                            <span className="text-[13px] font-semibold text-gray-900 text-right">
                              {serviceDate && serviceTime
                                ? new Date(serviceDate + "T" + serviceTime).toLocaleString("en-US", { month: "2-digit", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })
                                : "--"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-4">
                            <span className="text-[13px] font-medium text-gray-600">Passengers</span>
                            <span className="text-[13px] font-semibold text-gray-900">{passengersCount}</span>
                          </div>
                          <div className="flex items-center justify-between p-4">
                            <span className="text-[13px] font-medium text-gray-600">Estimate</span>
                            <span className="text-[13px] font-semibold text-gray-900">
                              {routeDistance !== "--" && routeDuration !== "--" ? `${routeDistance} / ${routeDuration}` : "--"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-4">
                            <span className="text-[13px] font-medium text-gray-600">Rate</span>
                            <span className="text-[13px] font-semibold text-gray-900">
                              ${fleetData.find((v) => v.id === selectedVehicle)?.price ?? 0}/hr
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-4">
                            <span className="text-[13px] font-medium text-gray-600">Duration (billable)</span>
                            <span className="text-[13px] font-semibold text-gray-900">
                              {routeDurationValue > 0 ? `${Math.max(1, Math.ceil(routeDurationValue / 3600))} hr` : "--"}
                            </span>
                          </div>
                          {stops.filter((s) => s.trim() !== "").length > 0 && (
                            <div className="flex items-center justify-between p-4">
                              <span className="text-[13px] font-medium text-gray-600">
                                Stops ({stops.filter((s) => s.trim() !== "").length} × $20)
                              </span>
                              <span className="text-[13px] font-semibold text-gray-900">
                                ${(stops.filter((s) => s.trim() !== "").length * 20).toFixed(2)}
                              </span>
                            </div>
                          )}
                          {childSeatCount > 0 && (
                            <div className="flex items-center justify-between p-4">
                              <span className="text-[13px] font-medium text-gray-600">
                                Child Seat ({childSeatCount} × $25)
                              </span>
                              <span className="text-[13px] font-semibold text-gray-900">
                                ${(childSeatCount * 25).toFixed(2)}
                              </span>
                            </div>
                          )}
                          {(() => {
                            const activeStops = stops.filter((s) => s.trim() !== "").length;
                            const stopCharge = activeStops * 20;
                            const childSeatCharge = childSeatCount * 25;
                            const subtotal = routePrice + stopCharge + childSeatCharge;
                            const hst = subtotal * 0.13;
                            const gratuity = subtotal * gratuityPercent / 100;
                            const total = subtotal + hst + gratuity;
                            return (
                              <>
                                <div className="flex items-center justify-between p-4">
                                  <span className="text-[13px] font-medium text-gray-600">Subtotal</span>
                                  <span className="text-[13px] font-semibold text-gray-900">
                                    ${subtotal > 0 ? subtotal.toFixed(2) : "0.00"}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between p-4">
                                  <span className="text-[13px] font-medium text-gray-600">HST (13%)</span>
                                  <span className="text-[13px] font-semibold text-gray-900">
                                    ${subtotal > 0 ? hst.toFixed(2) : "0.00"}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between p-4">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[13px] font-medium text-gray-600">Gratuity</span>
                                    <select
                                      value={gratuityPercent}
                                      onChange={(e) => setGratuityPercent(Number(e.target.value))}
                                      className="text-[13px] font-semibold text-gray-900 bg-transparent border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:border-[#C9A063]"
                                    >
                                      <option value={15}>15%</option>
                                      <option value={18}>18%</option>
                                      <option value={25}>25%</option>
                                    </select>
                                  </div>
                                  <span className="text-[13px] font-semibold text-gray-900">
                                    ${subtotal > 0 ? gratuity.toFixed(2) : "0.00"}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-[#f2f2f7]">
                                  <span className="text-[15px] font-semibold text-gray-900">Total</span>
                                  <span className="text-[17px] font-bold text-[#1C1C1E]">
                                    ${total > 0 ? total.toFixed(2) : "0.00"} CAD
                                  </span>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>

                      
                      {/* Turnstile CAPTCHA */}
                      <Turnstile
                        onVerify={(token) => setTurnstileToken(token)}
                        onExpire={() => setTurnstileToken("")}
                        onError={() => setTurnstileToken("")}
                      />

                      
                      {/* Stripe Payment - Commented Out */}
                      {/* {showPayment && !paymentSuccess && (
                        <StripePayment
                          amount={Math.round(routePrice * 100)}
                          vehicleId={selectedVehicle}
                          durationValue={routeDurationValue}
                          onSuccess={async (id) => {
                            setPaymentSuccess(true);
                            setShowPayment(false);
                            await sendReservationEmails();
                          }}
                          onError={(err) => setPaymentError(err)}
                          metadata={{
                            pickup: pickupLocation,
                            dropoff: dropoffLocation,
                            date: serviceDate,
                            time: serviceTime,
                            vehicle: selectedVehicle,
                            passengers: String(passengersCount),
                          }}
                        />
                      )}

                      {paymentSuccess && (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                          </div>
                          <h3 className="text-[17px] font-bold text-gray-900 mb-1">Payment Successful!</h3>
                          {emailSending && (
                            <div className="flex items-center gap-2 mt-2">
                              <Loader2 className="w-4 h-4 animate-spin text-[#C9A063]" />
                              <p className="text-[13px] text-gray-500">Sending confirmation emails...</p>
                            </div>
                          )}
                          {emailSent && (
                            <p className="text-[13px] text-green-600 mt-2">Confirmation emails sent! Check your inbox.</p>
                          )}
                          {emailError && (
                            <p className="text-[13px] text-red-500 mt-2">Email error: {emailError}</p>
                          )}
                          {!emailSending && !emailSent && !emailError && (
                            <p className="text-[13px] text-gray-500">Your reservation has been confirmed.</p>
                          )}
                        </div>
                      )}

                      {paymentError && (
                        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl">
                          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                          <span className="text-red-700 text-[13px]">{paymentError}</span>
                        </div>
                      )} */}

                      {/* Payment Section */}
                      <div className="pt-4 border-t border-gray-200">
                        <h3 className="text-lg font-semibold text-[#007AFF] mb-4">Payment</h3>
                        
                        <div className="space-y-4">
                          <div>
                            <select
                              value={cardType}
                              onChange={(e) => setCardType(e.target.value)}
                              className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-[#C9A063] focus:ring-4 focus:ring-[#C9A063]/10 transition-all duration-300"
                            >
                              <option value="">Select Card Type</option>
                              <option value="American Express">American Express</option>
                              <option value="Visa">Visa</option>
                              <option value="Mastercard">Mastercard</option>
                              <option value="Discover">Discover</option>
                            </select>
                          </div>

                          <div>
                            <input
                              type="text"
                              placeholder="Name on Card"
                              value={nameOnCard}
                              onChange={(e) => setNameOnCard(e.target.value)}
                              className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-[#C9A063] focus:ring-4 focus:ring-[#C9A063]/10 transition-all duration-300"
                            />
                          </div>

                          <div>
                            <input
                              type="text"
                              placeholder="Card Number"
                              value={cardNumber}
                              onChange={(e) => setCardNumber(e.target.value)}
                              className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-[#C9A063] focus:ring-4 focus:ring-[#C9A063]/10 transition-all duration-300"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <select
                                value={expirationYear}
                                onChange={(e) => setExpirationYear(e.target.value)}
                                className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-[#C9A063] focus:ring-4 focus:ring-[#C9A063]/10 transition-all duration-300"
                              >
                                <option value="">Select Expiration Year</option>
                                <option value="2024">2024</option>
                                <option value="2025">2025</option>
                                <option value="2026">2026</option>
                                <option value="2027">2027</option>
                                <option value="2028">2028</option>
                                <option value="2029">2029</option>
                                <option value="2030">2030</option>
                              </select>
                            </div>
                            <div>
                              <select
                                value={expirationMonth}
                                onChange={(e) => setExpirationMonth(e.target.value)}
                                className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-[#C9A063] focus:ring-4 focus:ring-[#C9A063]/10 transition-all duration-300"
                              >
                                <option value="">Select Expiration Month</option>
                                <option value="01">01 - January</option>
                                <option value="02">02 - February</option>
                                <option value="03">03 - March</option>
                                <option value="04">04 - April</option>
                                <option value="05">05 - May</option>
                                <option value="06">06 - June</option>
                                <option value="07">07 - July</option>
                                <option value="08">08 - August</option>
                                <option value="09">09 - September</option>
                                <option value="10">10 - October</option>
                                <option value="11">11 - November</option>
                                <option value="12">12 - December</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <input
                              type="text"
                              placeholder="CVV (Secret Code)"
                              value={cvv}
                              onChange={(e) => setCvv(e.target.value)}
                              maxLength={4}
                              className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-[#C9A063] focus:ring-4 focus:ring-[#C9A063]/10 transition-all duration-300"
                            />
                          </div>

                          <div>
                            <input
                              type="text"
                              placeholder="Card Billing Street Address"
                              value={billingAddress}
                              onChange={(e) => setBillingAddress(e.target.value)}
                              className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-[#C9A063] focus:ring-4 focus:ring-[#C9A063]/10 transition-all duration-300"
                            />
                          </div>

                          <div>
                            <input
                              type="text"
                              placeholder="Zip/Postal Code"
                              value={zipCode}
                              onChange={(e) => setZipCode(e.target.value)}
                              className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-[#C9A063] focus:ring-4 focus:ring-[#C9A063]/10 transition-all duration-300"
                            />
                          </div>

                        </div>
                      </div>

                      {/* Before you pay - Information Section */}
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-blue-600 font-semibold text-sm">i</span>
                          </div>
                          <div>
                            <h4 className="text-gray-900 font-semibold text-[15px] mb-3">Before you pay</h4>
                            <ul className="space-y-2 text-gray-700 text-[13px]">
                              <li className="flex items-start gap-2">
                                <span className="text-gray-400 mt-0.5">•</span>
                                <span>Flight tracking included for airport transfers</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="text-gray-400 mt-0.5">•</span>
                                <span>15 minutes complimentary wait time</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="text-gray-400 mt-0.5">•</span>
                                <span>Meet & greet service with name board (extra charge applies)</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="text-gray-400 mt-0.5">•</span>
                                <span>For Wi-Fi access, please ask your chauffeur</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="text-gray-400 mt-0.5">•</span>
                                <span>24/7 customer support</span>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* Success Message (if email sent) */}
                      {emailSent && (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                          <div className="flex items-center gap-3">
                            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                            <div>
                              <h4 className="text-green-900 font-semibold text-[15px]">Success!</h4>
                              <p className="text-green-700 text-[13px] mt-0.5">Your reservation has been confirmed. Check your email for details.</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Email Error */}
                      {emailError && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                          <div className="flex items-center gap-3">
                            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                            <div>
                              <h4 className="text-red-900 font-semibold text-[15px]">Error</h4>
                              <p className="text-red-700 text-[13px] mt-0.5">{emailError}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Terms & Conditions Checkbox */}
                      <label className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors group">
                        <input
                          type="checkbox"
                          checked={termsAccepted}
                          onChange={(e) => setTermsAccepted(e.target.checked)}
                          className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#C9A063] focus:ring-[#C9A063] focus:ring-offset-0"
                        />
                        <span className="text-gray-600 text-[13px] leading-snug group-hover:text-gray-700">
                          I agree to the <a href="/terms" className="text-[#C9A063] underline">Terms of Service</a> and <a href="/privacy" className="text-[#C9A063] underline">Privacy Policy</a>
                        </span>
                      </label>
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
                  <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 mt-6 pt-4 border-t border-gray-200/60">
                    <button
                      onClick={() => { setCurrentStep(Math.max(1, currentStep - 1)); setStepError(""); }}
                      disabled={currentStep === 1}
                      className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-[15px] font-medium transition-colors ${
                        currentStep === 1
                          ? "bg-[#e5e5ea] text-gray-400 cursor-not-allowed"
                          : "bg-white border border-gray-200 text-gray-700 active:bg-[#f2f2f7]"
                      }`}
                    >
                      Previous
                    </button>
                    {currentStep === 4 ? (
                      <button
                        onClick={async () => {
                          if (!cardType) { setStepError("Please select a card type."); return; }
                          if (!nameOnCard.trim()) { setStepError("Please enter the name on card."); return; }
                          if (!cardNumber.trim()) { setStepError("Please enter the card number."); return; }
                          if (!expirationYear) { setStepError("Please select the expiration year."); return; }
                          if (!expirationMonth) { setStepError("Please select the expiration month."); return; }
                          if (!cvv.trim()) { setStepError("Please enter the CVV."); return; }
                          if (!billingAddress.trim()) { setStepError("Please enter the billing address."); return; }
                          if (!zipCode.trim()) { setStepError("Please enter the zip/postal code."); return; }
                          if (!termsAccepted) {
                            setStepError("Please accept the Terms of Service and Privacy Policy.");
                            return;
                          }
                          setStepError("");
                          await sendReservationEmails();
                        }}
                        disabled={!termsAccepted || emailSending}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#C9A063] text-white px-6 py-2.5 rounded-xl text-[15px] font-medium hover:bg-[#B8935A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {emailSending ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            Submit Reservation
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={handleNext}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#1C1C1E] text-white px-6 py-2.5 rounded-xl text-[15px] font-medium active:bg-[#2C2C2E] transition-colors"
                      >
                        Continue
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Sidebar - Map (Step 1) or Ride Details (Step 2+) */}
            <div className="lg:col-span-1 order-first lg:order-last">
              <div className="rounded-2xl overflow-hidden lg:sticky lg:top-8 border border-gray-200/60 shadow-sm bg-white">
                {currentStep === 1 ? (
                  <>
                    <div className="bg-[#1C1C1E] p-4 sm:p-5">
                      <h3 className="text-lg font-semibold text-white">Route Preview</h3>
                      <p className="text-gray-400 text-sm mt-0.5">Your journey visualization</p>
                    </div>
                    <div className="h-64 sm:h-80 lg:h-96 relative bg-gray-200">
                      <RouteMap
                        pickupLocation={pickupLocation}
                        dropoffLocation={dropoffLocation}
                        onRouteCalculated={handleRouteCalculated}
                      />
                    </div>
                    <div className="p-4 sm:p-5 bg-[#f2f2f7]">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200/60">
                          <span className="text-[13px] font-medium text-gray-600">Estimated Distance</span>
                          <span className="text-[13px] font-semibold text-gray-900">
                            {routeDistance !== "--" ? routeDistance : "-- km"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200/60">
                          <span className="text-[13px] font-medium text-gray-600">Estimated Duration</span>
                          <span className="text-[13px] font-semibold text-gray-900">
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
                                {serviceDate && serviceTime
                                  ? new Date(serviceDate + "T" + serviceTime).toLocaleString("en-US", { month: "2-digit", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })
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
                              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Service Type</div>
                              <div className="text-[13px] text-gray-900">{serviceType || "--"}</div>
                            </div>
                            <div>
                              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Passengers</div>
                              <div className="text-[13px] text-gray-900">{passengersCount}</div>
                            </div>
                            <div>
                              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Estimated</div>
                              <div className="text-[13px] text-gray-900">
                                {routeDistance !== "--" && routeDuration !== "--"
                                  ? `${routeDistance} / ${routeDuration}`
                                  : "--"}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Selected Vehicle - Show on Contact Info (Step 3) & Confirmation (Step 4) */}
                    {currentStep >= 3 && selectedVehicle && (() => {
                      const vehicle = fleetData.find((v) => v.id === selectedVehicle);
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
  );
}
