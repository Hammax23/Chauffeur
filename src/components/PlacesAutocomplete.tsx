"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useJsApiLoader } from "@react-google-maps/api";
import { MapPin, Navigation, Plane, Building2, Search } from "lucide-react";

const libraries: ("places" | "geometry" | "drawing" | "visualization")[] = ["places"];

interface PlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

interface Prediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
  types: string[];
}

export default function PlacesAutocomplete({
  value,
  onChange,
  placeholder = "Enter address",
  className = "",
}: PlacesAutocompleteProps) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [mounted, setMounted] = useState(false);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  // Mount check for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update dropdown position
  const updatePosition = useCallback(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left - 16,
        width: rect.width + 32,
      });
    }
  }, []);

  // Sync external value changes
  useEffect(() => {
    if (!isUserTyping) {
      setInputValue(value);
    }
  }, [value, isUserTyping]);

  // Initialize autocomplete service
  useEffect(() => {
    if (isLoaded && !autocompleteService.current) {
      autocompleteService.current = new google.maps.places.AutocompleteService();
    }
  }, [isLoaded]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        inputRef.current && !inputRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
        setIsUserTyping(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update position on scroll/resize
  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
      return () => {
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [isOpen, updatePosition]);

  const fetchPredictions = useCallback(
    (input: string) => {
      if (!autocompleteService.current || input.length < 2) {
        setPredictions([]);
        setIsOpen(false);
        return;
      }

      autocompleteService.current.getPlacePredictions(
        {
          input,
          componentRestrictions: { country: "ca" },
        },
        (results, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            setPredictions(results as unknown as Prediction[]);
            setIsOpen(true);
            updatePosition();
          } else {
            setPredictions([]);
            setIsOpen(false);
          }
        }
      );
    },
    [updatePosition]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsUserTyping(true);
    onChange(newValue);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      fetchPredictions(newValue);
    }, 300);
  };

  const handleSelect = (prediction: Prediction) => {
    setInputValue(prediction.description);
    onChange(prediction.description);
    setPredictions([]);
    setIsOpen(false);
    setIsUserTyping(false);
  };

  const getIcon = (types: string[]) => {
    if (types.includes("airport")) {
      return <Plane className="w-5 h-5 text-[#C9A063]" strokeWidth={1.5} />;
    }
    if (types.includes("transit_station") || types.includes("train_station")) {
      return <Navigation className="w-5 h-5 text-blue-500" strokeWidth={1.5} />;
    }
    if (types.includes("establishment") || types.includes("point_of_interest")) {
      return <Building2 className="w-5 h-5 text-purple-500" strokeWidth={1.5} />;
    }
    return <MapPin className="w-5 h-5 text-gray-500" strokeWidth={1.5} />;
  };

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => {
          if (inputValue.length >= 2) {
            fetchPredictions(inputValue);
          }
        }}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {mounted && isOpen && predictions.length > 0 && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: "fixed",
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            zIndex: 99999,
          }}
          className="bg-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-gray-100 overflow-hidden"
        >
          {/* Search Header */}
          <div className="px-5 py-4 bg-gradient-to-r from-[#1C1C1E] to-[#2C2C2E] border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#C9A063]/20 flex items-center justify-center">
                <Search className="w-4 h-4 text-[#C9A063]" strokeWidth={2} />
              </div>
              <div>
                <p className="text-white text-sm font-medium">Location Suggestions</p>
                <p className="text-gray-400 text-xs">{predictions.length} results found</p>
              </div>
            </div>
          </div>

          {/* Suggestions List */}
          <div className="max-h-[320px] overflow-y-auto">
            {predictions.map((prediction) => (
              <button
                key={prediction.place_id}
                type="button"
                onClick={() => handleSelect(prediction)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left bg-white hover:bg-gradient-to-r hover:from-[#C9A063]/5 hover:to-transparent active:bg-[#C9A063]/10 transition-all duration-200 group border-b border-gray-50 last:border-b-0"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center flex-shrink-0 group-hover:from-[#C9A063]/10 group-hover:to-[#C9A063]/5 group-hover:shadow-lg transition-all duration-300 border border-gray-100 group-hover:border-[#C9A063]/20">
                  {getIcon(prediction.types)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-semibold text-gray-900 truncate group-hover:text-[#C9A063] transition-colors duration-200">
                    {prediction.structured_formatting.main_text}
                  </div>
                  <div className="text-[13px] text-gray-500 truncate mt-1 flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    {prediction.structured_formatting.secondary_text}
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-transparent group-hover:bg-[#C9A063]/10 flex items-center justify-center transition-all duration-200">
                  <svg className="w-4 h-4 text-gray-300 group-hover:text-[#C9A063] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 bg-gradient-to-r from-gray-50 to-white border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1">
                  <div className="w-4 h-4 rounded-full bg-[#4285F4]"></div>
                  <div className="w-4 h-4 rounded-full bg-[#EA4335]"></div>
                  <div className="w-4 h-4 rounded-full bg-[#FBBC05]"></div>
                  <div className="w-4 h-4 rounded-full bg-[#34A853]"></div>
                </div>
                <span className="text-[11px] font-medium text-gray-500">Powered by Google</span>
              </div>
              <span className="text-[10px] text-gray-400">Click to select</span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
