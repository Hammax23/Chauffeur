"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useGoogleMaps } from "./GoogleMapsProvider";
import { MapPin, Navigation, Plane, Building2, Loader2 } from "lucide-react";

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

const DEBOUNCE_MS = 100;
const MIN_INPUT_LENGTH = 1;

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const lowerText = text.toLowerCase();
  const lowerQuery = query.trim().toLowerCase();
  const idx = lowerText.indexOf(lowerQuery);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-semibold text-gray-900">{text.slice(idx, idx + query.trim().length)}</span>
      {text.slice(idx + query.trim().length)}
    </>
  );
}

export default function PlacesAutocomplete({
  value,
  onChange,
  placeholder = "Enter address",
  className = "",
}: PlacesAutocompleteProps) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
    caretLeft: 24,
  });
  const [mounted, setMounted] = useState(false);

  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const { isLoaded } = useGoogleMaps();

  useEffect(() => {
    setMounted(true);
  }, []);

  const refreshSessionToken = useCallback(() => {
    if (window.google?.maps?.places) {
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
    }
  }, []);

  const updatePosition = useCallback(() => {
    if (!inputRef.current) return;

    const rect = inputRef.current.getBoundingClientRect();
    const isMobile = window.innerWidth < 640;
    const dropdownWidth = isMobile
      ? Math.min(window.innerWidth - 24, Math.max(rect.width + 48, 300))
      : Math.max(rect.width + 56, 360);

    const left = isMobile
      ? Math.max(12, Math.min(rect.left - 12, window.innerWidth - dropdownWidth - 12))
      : Math.max(12, rect.left - 28);

    const caretLeft = Math.min(
      Math.max(rect.left + rect.width / 2 - left - 8, 20),
      dropdownWidth - 28
    );

    setDropdownPosition({
      top: rect.bottom + 10,
      left,
      width: dropdownWidth,
      caretLeft,
    });
  }, []);

  useEffect(() => {
    if (!isUserTyping) {
      setInputValue(value);
    }
  }, [value, isUserTyping]);

  useEffect(() => {
    if (isLoaded && !autocompleteService.current) {
      autocompleteService.current = new google.maps.places.AutocompleteService();
      refreshSessionToken();
    }
  }, [isLoaded, refreshSessionToken]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        inputRef.current &&
        !inputRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
        setIsUserTyping(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, updatePosition]);

  const fetchPredictions = useCallback(
    (input: string) => {
      const trimmed = input.trim();

      if (!autocompleteService.current || trimmed.length < MIN_INPUT_LENGTH) {
        setPredictions([]);
        setIsOpen(false);
        setIsLoading(false);
        setHighlightedIndex(-1);
        return;
      }

      const requestId = ++requestIdRef.current;
      setIsLoading(true);
      setIsOpen(true);
      updatePosition();

      autocompleteService.current.getPlacePredictions(
        {
          input: trimmed,
          componentRestrictions: { country: "ca" },
          sessionToken: sessionTokenRef.current ?? undefined,
        },
        (results, status) => {
          if (requestId !== requestIdRef.current) return;

          setIsLoading(false);

          if (status === google.maps.places.PlacesServiceStatus.OK && results?.length) {
            setPredictions(results as unknown as Prediction[]);
            setIsOpen(true);
            setHighlightedIndex(0);
            updatePosition();
            return;
          }

          setPredictions([]);
          setHighlightedIndex(-1);
          setIsOpen(
            trimmed.length >= MIN_INPUT_LENGTH &&
              status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS
          );
        }
      );
    },
    [updatePosition]
  );

  const scheduleFetch = useCallback(
    (nextValue: string) => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      debounceTimer.current = setTimeout(() => {
        fetchPredictions(nextValue);
      }, DEBOUNCE_MS);
    },
    [fetchPredictions]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsUserTyping(true);
    onChange(newValue);

    if (newValue.trim().length >= MIN_INPUT_LENGTH) {
      setIsOpen(true);
      setIsLoading(true);
      updatePosition();
    } else {
      setIsOpen(false);
      setIsLoading(false);
      setPredictions([]);
    }

    scheduleFetch(newValue);
  };

  const handleSelect = (prediction: Prediction) => {
    setInputValue(prediction.description);
    onChange(prediction.description);
    setPredictions([]);
    setIsOpen(false);
    setIsLoading(false);
    setIsUserTyping(false);
    setHighlightedIndex(-1);
    refreshSessionToken();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && e.key !== "ArrowDown") return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen && inputValue.trim().length >= MIN_INPUT_LENGTH) {
        fetchPredictions(inputValue);
        return;
      }
      if (predictions.length > 0) {
        setHighlightedIndex((prev) => (prev + 1) % predictions.length);
      }
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (predictions.length > 0) {
        setHighlightedIndex((prev) =>
          prev <= 0 ? predictions.length - 1 : prev - 1
        );
      }
      return;
    }

    if (e.key === "Enter" && highlightedIndex >= 0 && predictions[highlightedIndex]) {
      e.preventDefault();
      handleSelect(predictions[highlightedIndex]);
      return;
    }

    if (e.key === "Escape") {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const getIcon = (types: string[]) => {
    if (types.includes("airport")) {
      return <Plane className="w-4 h-4 text-[#C9A063]" strokeWidth={2} />;
    }
    if (types.includes("transit_station") || types.includes("train_station")) {
      return <Navigation className="w-4 h-4 text-blue-500" strokeWidth={2} />;
    }
    if (types.includes("establishment") || types.includes("point_of_interest")) {
      return <Building2 className="w-4 h-4 text-purple-500" strokeWidth={2} />;
    }
    return <MapPin className="w-4 h-4 text-gray-400" strokeWidth={2} />;
  };

  const showDropdown =
    mounted && isOpen && (isLoading || predictions.length > 0);

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (inputValue.trim().length >= MIN_INPUT_LENGTH) {
            fetchPredictions(inputValue);
          }
        }}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={showDropdown}
        role="combobox"
      />

      {showDropdown &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width,
              zIndex: 99999,
            }}
            className="places-autocomplete-dropdown"
            role="listbox"
          >
            <div
              className="absolute -top-[6px] w-3 h-3 bg-white border-l border-t border-gray-200/90 rotate-45"
              style={{ left: dropdownPosition.caretLeft }}
              aria-hidden
            />

            <div className="relative bg-white rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.14)] border border-gray-200/90 overflow-hidden">
              <div className="places-autocomplete-list max-h-[300px] overflow-y-auto py-1.5 divide-y divide-gray-100/80">
                {isLoading && predictions.length === 0 ? (
                  <div className="flex items-center gap-2.5 px-4 py-3 text-[13px] text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin text-[#C9A063]" />
                    Searching locations...
                  </div>
                ) : (
                  predictions.map((prediction, index) => {
                    const isHighlighted = index === highlightedIndex;
                    return (
                      <button
                        key={prediction.place_id}
                        type="button"
                        role="option"
                        aria-selected={isHighlighted}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        onClick={() => handleSelect(prediction)}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors duration-100 ${
                          isHighlighted
                            ? "bg-[#C9A063]/8"
                            : "hover:bg-gray-50 active:bg-[#C9A063]/10"
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                            isHighlighted ? "bg-[#C9A063]/15" : "bg-gray-100"
                          }`}
                        >
                          {getIcon(prediction.types)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[14px] font-medium text-gray-800 truncate leading-snug">
                            <HighlightMatch
                              text={prediction.structured_formatting.main_text}
                              query={inputValue}
                            />
                          </div>
                          <div className="text-[12px] text-gray-500 truncate leading-snug mt-0.5">
                            {prediction.structured_formatting.secondary_text}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              <div className="px-3.5 py-2 bg-gray-50/90 border-t border-gray-100">
                <img
                  src="https://maps.gstatic.com/mapfiles/api-3/images/powered-by-google-on-white3.png"
                  alt="Powered by Google"
                  className="h-3 opacity-80"
                />
              </div>
            </div>
          </div>,
          document.body
        )}

      <style jsx global>{`
        .places-autocomplete-list {
          scrollbar-width: thin;
          scrollbar-color: #d1d5db transparent;
        }
        .places-autocomplete-list::-webkit-scrollbar {
          width: 6px;
        }
        .places-autocomplete-list::-webkit-scrollbar-track {
          background: transparent;
        }
        .places-autocomplete-list::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 999px;
        }
        .places-autocomplete-list::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>
    </>
  );
}
