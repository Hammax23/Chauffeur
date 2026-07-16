"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, Users, Briefcase, MapPin, Plane, Menu, LogIn, ChevronDown } from 'lucide-react';
import PlacesAutocomplete from '@/components/PlacesAutocomplete';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

export default function ServiceQuoteForm({ prefilledPickup }: { prefilledPickup?: string }) {
  const router = useRouter();
  const [serviceType, setServiceType] = useState("Airport Drop Off");
  const [pickupDate, setPickupDate] = useState<Date | null>(new Date());
  const [passengers, setPassengers] = useState("1 passenger");
  const [luggage, setLuggage] = useState("0 luggage");
  const [pickup, setPickup] = useState(prefilledPickup || "");
  const [dropoff, setDropoff] = useState("");
  const [airline, setAirline] = useState("");
  const [flightNum, setFlightNum] = useState("");

  const handleCheckPricing = () => {
    const params = new URLSearchParams();

    if (serviceType === "Hourly / As Directed") {
      params.set("mode", "hourly");
    } else {
      params.set("mode", "distance");
      params.set("serviceType", serviceType);
    }

    if (pickup) params.set("pickup", pickup);
    if (dropoff) params.set("dropoff", dropoff);
    if (pickupDate) params.set("date", pickupDate.toISOString());

    const pax = parseInt(passengers.split(' ')[0]) || 1;
    params.set("adults", pax.toString());

    if (airline) params.set("airline", airline);
    if (flightNum) params.set("flight", flightNum);

    router.push(`/reservation?${params.toString()}`);
  };

  return (
    <div className="w-full bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header section matching the black background */}
      <div className="bg-[#1a1a1a] p-6 text-white">
        <h3 className="text-2xl font-serif mb-2">Get Your Instant Quote</h3>
        <p className="text-[#C9A063] text-sm font-medium">Live rates · book in minutes</p>
      </div>

      <div className="p-5">
        <div className="space-y-4">
          {/* Service Details */}
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1">Service Details</label>
            <div className="relative">
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-300 rounded-lg py-2 px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C9A063] focus:border-transparent"
              >
                <option>Airport Drop Off</option>
                <option>Airport Pick Up</option>
                <option>Point to Point</option>
                <option>Hourly / As Directed</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1">Pickup Date</label>
              <div className="relative">
                <DatePicker
                  selected={pickupDate}
                  onChange={(date: Date | null) => setPickupDate(date)}
                  dateFormat="MMM d yyyy"
                  className="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C9A063]"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-gray-400">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1">Pickup Time</label>
              <div className="relative">
                <DatePicker
                  selected={pickupDate}
                  onChange={(date: Date | null) => setPickupDate(date)}
                  showTimeSelect
                  showTimeSelectOnly
                  timeIntervals={15}
                  timeCaption="Time"
                  dateFormat="h:mm aa"
                  className="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C9A063]"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-gray-400">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          {/* Passengers & Luggage */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1">Passengers</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">
                  <Users className="w-4 h-4" />
                </div>
                <select
                  value={passengers}
                  onChange={(e) => setPassengers(e.target.value)}
                  className="w-full appearance-none bg-white border border-gray-300 rounded-lg py-2 pl-9 pr-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C9A063]"
                >
                  <option>1 passenger</option>
                  <option>2 passengers</option>
                  <option>3 passengers</option>
                  <option>4 passengers</option>
                  <option>5+ passengers</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1">Luggage</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">
                  <Briefcase className="w-4 h-4" />
                </div>
                <select
                  value={luggage}
                  onChange={(e) => setLuggage(e.target.value)}
                  className="w-full appearance-none bg-white border border-gray-300 rounded-lg py-2 pl-9 pr-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C9A063]"
                >
                  <option>0 luggage</option>
                  <option>1 luggage</option>
                  <option>2 luggage</option>
                  <option>3 luggage</option>
                  <option>4+ luggage</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          {/* Pickup Address */}
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1">Pickup Address</label>
            <div className="relative">
              <PlacesAutocomplete
                value={pickup}
                onChange={setPickup}
                placeholder="Pickup Address"
                className="w-full border border-gray-300 rounded-lg py-2 pl-3 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C9A063]"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-gray-400">
                <MapPin className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Dropoff Airport/Address */}
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1">Dropoff Address / Airport</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">
                <Plane className="w-4 h-4" />
              </div>
              <PlacesAutocomplete
                value={dropoff}
                onChange={setDropoff}
                placeholder="Dropoff Address"
                className="w-full border border-gray-300 rounded-md py-2 pl-9 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C9A063]"
              />
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Airline & Flight Number (conditional on airport service) */}
          {(serviceType === "Airport Pick Up" || serviceType === "Airport Drop Off") && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">Airline</label>
                <div className="relative">
                  <input
                    type="text"
                    value={airline}
                    onChange={(e) => setAirline(e.target.value)}
                    placeholder="Airline"
                    className="w-full border border-gray-300 rounded-md py-2 pl-3 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C9A063]"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-gray-400">
                    <Plane className="w-4 h-4" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">Flight #</label>
                <div className="relative">
                  <input
                    type="text"
                    value={flightNum}
                    onChange={(e) => setFlightNum(e.target.value)}
                    placeholder="(eg. 123)"
                    className="w-full border border-gray-300 rounded-md py-2 pl-3 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#C9A063]"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-gray-400">
                    <span className="text-xs font-bold text-gray-400">#</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Check Pricing Button */}
          <div className="pt-3">
            <button
              onClick={handleCheckPricing}
              className="w-full bg-gradient-to-r from-[#C9A063] to-[#A68B5B] hover:shadow-lg hover:shadow-[#C9A063]/30 text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-300"
            >
              Check Pricing
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-[10px] text-gray-400">
            © {new Date().getFullYear()} SARJ Worldwide. All Rights Reserved
            <span className="mx-2">|</span>
            <a href="#" className="hover:underline">Terms & Conditions</a>
            <span className="mx-2">|</span>
            <a href="#" className="hover:underline">Privacy Policy</a>
          </p>
        </div>
      </div>

      <style jsx global>{`
        /* Fix datepicker width */
        .react-datepicker-wrapper {
          width: 100%;
        }
      `}</style>
    </div>
  );
}
