"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useGoogleMaps } from "./GoogleMapsProvider";
import { MapPin, Navigation, Plane, Building2 } from "lucide-react";

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

  const { isLoaded } = useGoogleMaps();

  // Mount check for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update dropdown position
  const updatePosition = useCallback(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      const isMobile = window.innerWidth < 640;
      // Fixed width dropdown, centered below input or full width on mobile
      const dropdownWidth = isMobile ? window.innerWidth - 32 : 400;
      const left = isMobile ? 16 : Math.max(16, rect.left + (rect.width / 2) - (dropdownWidth / 2));
      setDropdownPosition({
        top: rect.bottom + 8,
        left: Math.min(left, window.innerWidth - dropdownWidth - 16),
        width: dropdownWidth,
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
          className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
        >
          {/* Suggestions List */}
          <div className="max-h-[280px] overflow-y-auto py-2">
            {predictions.map((prediction) => (
              <button
                key={prediction.place_id}
                type="button"
                onClick={() => handleSelect(prediction)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors duration-150 group"
              >
                <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 group-hover:bg-[#C9A063]/10 transition-colors">
                  {getIcon(prediction.types)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-medium text-gray-900 truncate">
                    {prediction.structured_formatting.main_text}
                  </div>
                  <div className="text-[12px] text-gray-500 truncate">
                    {prediction.structured_formatting.secondary_text}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Google Attribution */}
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
            <div className="flex items-center gap-1.5">
              <img src="https://maps.gstatic.com/mapfiles/api-3/images/powered-by-google-on-white3.png" alt="Powered by Google" className="h-3" />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
