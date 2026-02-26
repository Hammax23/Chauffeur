"use client";

import { useState, useCallback } from "react";
import { 
  MapPin, 
  Users, 
  User, 
  Phone, 
  Mail, 
  Plus,
  Minus,
  X,
  CheckCircle,
  Loader2,
  Car,
  Calendar,
  Clock,
  Plane,
  FileText,
  CreditCard,
  DollarSign
} from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { fleetData } from "@/data/fleet";
import PlacesAutocomplete from "@/components/PlacesAutocomplete";
import RouteMap from "@/components/RouteMap";

const COUNTRY_CODES = [
  { code: "+1", label: "CA", name: "Canada" },
  { code: "+1", label: "US", name: "United States" },
  { code: "+44", label: "UK", name: "United Kingdom" },
  { code: "+33", label: "FR", name: "France" },
  { code: "+49", label: "DE", name: "Germany" },
];

const SERVICE_TYPES = [
  { value: "Airport Transfer pick-up/drop-off", label: "Airport Transfer pick-up/drop-off" },
  { value: "Point-to-Point transportation", label: "Point-to-Point transportation" },
  { value: "Hourly ride", label: "Hourly Service" },
];

const CHILD_SEAT_TYPES = [
  "Infant Seat (0-12 months)",
  "Toddler Seat (1-3 years)",
  "Booster Seat (4-7 years)",
];

export default function CustomReservationPage() {
  // Service Info
  const [serviceType, setServiceType] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [passengersCount, setPassengersCount] = useState(1);
  const [childSeatCount, setChildSeatCount] = useState(0);
  const [childSeatType, setChildSeatType] = useState("");
  const [etr407, setEtr407] = useState(false);

  // Location Info
  const [pickupLocation, setPickupLocation] = useState("");
  const [dropoffLocation, setDropoffLocation] = useState("");
  const [stops, setStops] = useState<string[]>([]);
  const [pickupDateTime, setPickupDateTime] = useState<Date | null>(null);

  // Contact Info
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState(COUNTRY_CODES[0].code);
  const [specialRequirements, setSpecialRequirements] = useState("");

  // Flight Info
  const [airlineName, setAirlineName] = useState("");
  const [flightNumber, setFlightNumber] = useState("");
  const [flightNote, setFlightNote] = useState("");

  // Pricing
  const [rideFare, setRideFare] = useState("");
  const [gratuityPercent, setGratuityPercent] = useState(15);

  // Route calculation (auto from Google Maps)
  const [routeDistance, setRouteDistance] = useState("--");
  const [routeDuration, setRouteDuration] = useState("--");
  const [routeDistanceValue, setRouteDistanceValue] = useState(0);
  const [routeDurationValue, setRouteDurationValue] = useState(0);

  // Handle route calculated callback
  const handleRouteCalculated = useCallback((distance: string, duration: string, distanceValue: number, durationValue: number) => {
    setRouteDistance(distance);
    setRouteDuration(duration);
    setRouteDistanceValue(distanceValue);
    setRouteDurationValue(durationValue);
  }, []);

  // Payment Info
  const [paymentStatus, setPaymentStatus] = useState("PENDING");

  // Form state
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const addStop = () => setStops([...stops, ""]);
  const removeStop = (index: number) => setStops(stops.filter((_, i) => i !== index));
  const updateStop = (index: number, value: string) => {
    const newStops = [...stops];
    newStops[index] = value;
    setStops(newStops);
  };

  // Calculate totals
  const rideFareNum = parseFloat(rideFare) || 0;
  const stopCharge = stops.filter(s => s.trim()).length * 15;
  const childSeatCharge = childSeatCount * 25;
  const subtotal = rideFareNum + stopCharge + childSeatCharge;
  const hst = subtotal * 0.13;
  const gratuity = subtotal * (gratuityPercent / 100);
  const total = subtotal + hst + gratuity;

  const handleSubmit = async () => {
    setError("");
    
    // Validation
    if (!firstName || !lastName || !email || !phone) {
      setError("Please fill in all contact information.");
      return;
    }
    if (!serviceType || !selectedVehicle) {
      setError("Please select service type and vehicle.");
      return;
    }
    if (!pickupLocation || !dropoffLocation) {
      setError("Please enter pickup and dropoff locations.");
      return;
    }
    if (!pickupDateTime) {
      setError("Please select pickup date and time.");
      return;
    }

    setSubmitting(true);

    try {
      const vehicleName = fleetData.find((v) => v.id === selectedVehicle)?.name || selectedVehicle;
      
      const res = await fetch("/api/reservation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          phoneCode: countryCode,
          serviceType,
          pickupLocation,
          dropoffLocation,
          stops: stops.filter((s) => s.trim() !== ""),
          serviceDate: pickupDateTime.toLocaleDateString("en-CA"),
          serviceTime: pickupDateTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
          vehicle: vehicleName,
          passengers: passengersCount,
          childSeatCount,
          childSeatType,
          etr407,
          specialRequirements,
          routeDistance: routeDistance,
          routeDuration: routeDuration,
          routePrice: rideFareNum,
          gratuityPercent,
          airlineName,
          flightNumber,
          flightNote,
          // Admin created - no card info
          cardType: "",
          nameOnCard: "",
          cardLast4: "",
          stripePaymentMethodId: "",
          stripeCustomerId: "",
          billingAddress: "",
          zipCode: "",
          purchaseOrder: "",
          deptNumber: "",
          // Skip turnstile for admin
          skipTurnstile: true,
          paymentStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.error || "Failed to create reservation");
      
      setSubmitted(true);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create reservation.";
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setServiceType("");
    setSelectedVehicle("");
    setPassengersCount(1);
    setChildSeatCount(0);
    setChildSeatType("");
    setEtr407(false);
    setPickupLocation("");
    setDropoffLocation("");
    setStops([]);
    setPickupDateTime(null);
    setSpecialRequirements("");
    setAirlineName("");
    setFlightNumber("");
    setFlightNote("");
    setRideFare("");
    setRouteDistance("--");
    setRouteDuration("--");
    setRouteDistanceValue(0);
    setRouteDurationValue(0);
    setPaymentStatus("PENDING");
    setSubmitted(false);
    setError("");
  };

  if (submitted) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Reservation Created!</h1>
            <p className="text-gray-500 mb-6">
              The custom reservation has been successfully created and confirmation emails have been sent.
            </p>
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
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Create Custom Reservation</h1>
          <p className="text-gray-500 text-sm mt-1">Manually create a reservation for a customer</p>
        </div>

        <div className="space-y-5">
          {/* Service Type */}
          <div className="bg-white rounded-xl border border-gray-200/60 px-4 py-3">
            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">Service Type</label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="w-full py-1.5 bg-transparent text-[15px] text-gray-900 focus:outline-none"
            >
              <option value="">Select service type</option>
              {SERVICE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          {/* Trip Route - Grouped style */}
          <div className="bg-white rounded-xl border border-gray-200/60 divide-y divide-gray-100">
            <div className="px-4 py-3">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-green-600" strokeWidth={2} />
                </div>
                <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Pickup</label>
              </div>
              <PlacesAutocomplete
                value={pickupLocation}
                onChange={(val) => setPickupLocation(val)}
                placeholder="Address or airport code (e.g. YYZ)"
                className="w-full py-1.5 bg-transparent text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none"
              />
            </div>
            <div className="px-4 py-3">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-red-600" strokeWidth={2} />
                </div>
                <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Drop-off</label>
              </div>
              <PlacesAutocomplete
                value={dropoffLocation}
                onChange={(val) => setDropoffLocation(val)}
                placeholder="Destination address"
                className="w-full py-1.5 bg-transparent text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Stops */}
          {stops.map((stop, index) => (
            <div key={index} className="bg-white rounded-xl border border-gray-200/60 px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#C9A063]/20 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-[#C9A063]" strokeWidth={2} />
                  </div>
                  <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Stop {index + 1}</label>
                </div>
                <button type="button" onClick={() => removeStop(index)} className="p-1 text-gray-400 hover:text-red-500">
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

          <button type="button" onClick={addStop} className="flex items-center gap-2 text-[#007AFF] text-[15px] font-medium">
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Add Stop
          </button>

          {/* Route Map for Auto-Calculate */}
          {pickupLocation && dropoffLocation && (
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

          {/* Distance & Duration (Auto-calculated) */}
          <div className="bg-white rounded-xl border border-gray-200/60 divide-y divide-gray-100">
            <div className="px-4 py-3">
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">Distance</label>
              <span className="text-[15px] text-gray-900 font-medium">{routeDistance}</span>
            </div>
            <div className="px-4 py-3">
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">Duration</label>
              <span className="text-[15px] text-gray-900 font-medium">{routeDuration}</span>
            </div>
          </div>

          {/* Pick-up Time */}
          <div className="bg-white rounded-xl border border-gray-200/60 px-4 py-3">
            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">Pick-up Time</label>
            <DatePicker
              selected={pickupDateTime}
              onChange={(date: Date | null) => setPickupDateTime(date)}
              showTimeSelect
              timeIntervals={15}
              dateFormat="MMMM d, yyyy  h:mm aa"
              placeholderText="Select date & time"
              className="w-full py-1.5 bg-transparent text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none"
            />
          </div>

          {/* Passengers */}
          <div className="bg-white rounded-xl border border-gray-200/60 px-4 py-3">
            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">Passengers</label>
            <div className="flex items-center justify-between">
              <span className="text-[15px] text-gray-900">{passengersCount}</span>
              <div className="flex items-center rounded-lg overflow-hidden border border-gray-200">
                <button type="button" onClick={() => setPassengersCount(Math.max(1, passengersCount - 1))} className="p-2 bg-[#f2f2f7] text-gray-600 active:bg-[#e5e5ea]">
                  <Minus className="w-4 h-4" strokeWidth={2.5} />
                </button>
                <button type="button" onClick={() => setPassengersCount(Math.min(50, passengersCount + 1))} className="p-2 bg-[#f2f2f7] text-gray-600 active:bg-[#e5e5ea] border-l border-gray-200">
                  <Plus className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>

          {/* Vehicle Selection */}
          <div className="bg-white rounded-xl border border-gray-200/60 px-4 py-3">
            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">Vehicle</label>
            <select
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              className="w-full py-1.5 bg-transparent text-[15px] text-gray-900 focus:outline-none"
            >
              <option value="">Select vehicle</option>
              {fleetData.map((v) => (
                <option key={v.id} value={v.id}>{v.dropdownName}</option>
              ))}
            </select>
          </div>

          {/* 407 ETR Toggle */}
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
                <span className="text-[13px] text-gray-600">Child Seat: $25</span>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setChildSeatCount(Math.max(0, childSeatCount - 1))} className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:border-[#C9A063] hover:text-[#C9A063] transition-colors">
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-[15px] font-semibold text-gray-900 w-6 text-center">{childSeatCount}</span>
                <button type="button" onClick={() => setChildSeatCount(childSeatCount + 1)} className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:border-[#C9A063] hover:text-[#C9A063] transition-colors">
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

          {/* Contact Information - Grouped */}
          <div className="bg-white rounded-xl border border-gray-200/60 divide-y divide-gray-100">
            <div className="px-4 py-3">
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">First Name</label>
              <div className="relative">
                <User className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-[#C9A063]" />
                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="John" className="w-full pl-7 py-1.5 bg-transparent text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none" />
              </div>
            </div>
            <div className="px-4 py-3">
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">Last Name</label>
              <div className="relative">
                <User className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-[#C9A063]" />
                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Smith" className="w-full pl-7 py-1.5 bg-transparent text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none" />
              </div>
            </div>
            <div className="px-4 py-3">
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-[#C9A063]" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john.smith@example.com" className="w-full pl-7 py-1.5 bg-transparent text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none" />
              </div>
            </div>
            <div className="px-4 py-3">
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">Phone Number</label>
              <div className="flex items-center gap-2">
                <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className="bg-transparent text-[15px] text-gray-900 focus:outline-none">
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.label} value={c.code}>{c.code}</option>
                  ))}
                </select>
                <div className="relative flex-1">
                  <Phone className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-[#C9A063]" />
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="123-456-7890" className="w-full pl-7 py-1.5 bg-transparent text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Flight Info - Grouped */}
          <div className="bg-white rounded-xl border border-gray-200/60 divide-y divide-gray-100">
            <div className="px-4 py-3">
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">Airline (Optional)</label>
              <div className="relative">
                <Plane className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-[#C9A063]" />
                <input type="text" value={airlineName} onChange={(e) => setAirlineName(e.target.value)} placeholder="e.g. Air Canada" className="w-full pl-7 py-1.5 bg-transparent text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none" />
              </div>
            </div>
            <div className="px-4 py-3">
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">Flight Number</label>
              <input type="text" value={flightNumber} onChange={(e) => setFlightNumber(e.target.value)} placeholder="e.g. AC123" className="w-full py-1.5 bg-transparent text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none" />
            </div>
            <div className="px-4 py-3">
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">Flight Notes</label>
              <input type="text" value={flightNote} onChange={(e) => setFlightNote(e.target.value)} placeholder="Any additional flight details" className="w-full py-1.5 bg-transparent text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none" />
            </div>
          </div>

          {/* Special Requirements */}
          <div className="bg-white rounded-xl border border-gray-200/60 px-4 py-3">
            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">Special Requirements</label>
            <textarea
              value={specialRequirements}
              onChange={(e) => setSpecialRequirements(e.target.value)}
              rows={3}
              placeholder="Any special requirements or notes..."
              className="w-full py-1.5 bg-transparent text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none resize-none"
            />
          </div>

          {/* Pricing */}
          <div className="bg-white rounded-xl border border-gray-200/60 divide-y divide-gray-100">
            <div className="px-4 py-3">
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">Ride Fare ($)</label>
              <input type="number" value={rideFare} onChange={(e) => setRideFare(e.target.value)} placeholder="0.00" step="0.01" className="w-full py-1.5 bg-transparent text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none" />
            </div>
            <div className="px-4 py-3">
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">Gratuity</label>
              <select value={gratuityPercent} onChange={(e) => setGratuityPercent(parseInt(e.target.value))} className="w-full py-1.5 bg-transparent text-[15px] text-gray-900 focus:outline-none">
                <option value={15}>15%</option>
                <option value={18}>18%</option>
                <option value={20}>20%</option>
                <option value={25}>25%</option>
              </select>
            </div>
          </div>

          {/* Price Summary */}
          <div className="bg-white rounded-xl border border-gray-200/60 p-4 space-y-2.5">
            <div className="flex justify-between text-[14px]">
              <span className="text-gray-600">Ride Fare</span>
              <span className="font-medium text-gray-900">${rideFareNum.toFixed(2)}</span>
            </div>
            {stops.filter(s => s.trim()).length > 0 && (
              <div className="flex justify-between text-[14px]">
                <span className="text-gray-600">Stop Charges ({stops.filter(s => s.trim()).length} × $15)</span>
                <span className="font-medium text-gray-900">${stopCharge.toFixed(2)}</span>
              </div>
            )}
            {childSeatCount > 0 && (
              <div className="flex justify-between text-[14px]">
                <span className="text-gray-600">Child Seats ({childSeatCount} × $25)</span>
                <span className="font-medium text-gray-900">${childSeatCharge.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-[14px] border-t border-gray-100 pt-2.5">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium text-gray-900">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[14px]">
              <span className="text-gray-600">HST (13%)</span>
              <span className="font-medium text-gray-900">${hst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[14px]">
              <span className="text-gray-600">Gratuity ({gratuityPercent}%)</span>
              <span className="font-medium text-gray-900">${gratuity.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[16px] border-t border-gray-100 pt-2.5">
              <span className="font-bold text-gray-900">Total</span>
              <span className="font-bold text-[#C9A063]">${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Status */}
          <div className="bg-white rounded-xl border border-gray-200/60 px-4 py-3">
            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">Payment Status</label>
            <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className="w-full py-1.5 bg-transparent text-[15px] text-gray-900 focus:outline-none">
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Submit */}
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
      </div>
    </div>
  );
}
