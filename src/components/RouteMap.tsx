"use client";

import { useCallback, useEffect, useState, memo, useMemo } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  DirectionsRenderer,
  Marker,
} from "@react-google-maps/api";

interface RouteMapProps {
  pickupLocation: string;
  dropoffLocation: string;
  onRouteCalculated?: (distance: string, duration: string, distanceValue: number, durationValue: number) => void;
}

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

const defaultCenter = {
  lat: 43.6532,
  lng: -79.3832,
};

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
  styles: [
    {
      featureType: "all",
      elementType: "geometry.fill",
      stylers: [{ saturation: -5 }, { lightness: 5 }],
    },
    {
      featureType: "road",
      elementType: "geometry",
      stylers: [{ lightness: 50 }],
    },
    {
      featureType: "water",
      elementType: "geometry.fill",
      stylers: [{ color: "#a3ccff" }],
    },
  ],
};

const libraries: ("places" | "geometry" | "drawing" | "visualization")[] = ["places"];

function RouteMap({ pickupLocation, dropoffLocation, onRouteCalculated }: RouteMapProps) {
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [pickupCoords, setPickupCoords] = useState<google.maps.LatLngLiteral | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<google.maps.LatLngLiteral | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Geocode addresses to coordinates
  useEffect(() => {
    if (!isLoaded || !pickupLocation) {
      setPickupCoords(null);
      return;
    }

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: pickupLocation }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        const location = results[0].geometry.location;
        setPickupCoords({ lat: location.lat(), lng: location.lng() });
      }
    });
  }, [isLoaded, pickupLocation]);

  useEffect(() => {
    if (!isLoaded || !dropoffLocation) {
      setDropoffCoords(null);
      return;
    }

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: dropoffLocation }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        const location = results[0].geometry.location;
        setDropoffCoords({ lat: location.lat(), lng: location.lng() });
      }
    });
  }, [isLoaded, dropoffLocation]);

  // Calculate route when both locations are set
  useEffect(() => {
    if (!isLoaded || !pickupCoords || !dropoffCoords) {
      setDirections(null);
      if (onRouteCalculated) {
        onRouteCalculated("--", "--", 0, 0);
      }
      return;
    }

    const directionsService = new google.maps.DirectionsService();

    directionsService.route(
      {
        origin: pickupCoords,
        destination: dropoffCoords,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK" && result) {
          setDirections(result);
          
          // Extract distance and duration
          const route = result.routes[0];
          if (route && route.legs[0]) {
            const leg = route.legs[0];
            const distance = leg.distance?.text || "--";
            const duration = leg.duration?.text || "--";
            const distanceValue = leg.distance?.value || 0;
            const durationValue = leg.duration?.value || 0;
            
            if (onRouteCalculated) {
              onRouteCalculated(distance, duration, distanceValue, durationValue);
            }
          }
        }
      }
    );
  }, [isLoaded, pickupCoords, dropoffCoords, onRouteCalculated]);

  // Fit map bounds to show both markers
  useEffect(() => {
    if (!map) return;

    if (pickupCoords && dropoffCoords) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(pickupCoords);
      bounds.extend(dropoffCoords);
      map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
    } else if (pickupCoords) {
      map.setCenter(pickupCoords);
      map.setZoom(14);
    } else if (dropoffCoords) {
      map.setCenter(dropoffCoords);
      map.setZoom(14);
    }
  }, [map, pickupCoords, dropoffCoords]);

  // Check if API key is missing
  const apiKeyMissing = !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (loadError || apiKeyMissing) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
        <div className="text-center px-4 max-w-xs">
          <div className="w-14 h-14 rounded-full bg-[#C9A063]/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-[#C9A063]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <p className="text-gray-800 font-semibold text-sm mb-1">Google Maps API Key Required</p>
          <p className="text-gray-500 text-xs mb-3">Add your API key to <code className="bg-gray-200 px-1.5 py-0.5 rounded text-[10px]">.env.local</code></p>
          <div className="bg-white rounded-lg p-3 text-left border border-gray-200 shadow-sm">
            <code className="text-[10px] text-gray-600 block leading-relaxed">
              NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key
            </code>
          </div>
          <p className="text-gray-400 text-[10px] mt-3">Restart dev server after adding key</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#C9A063] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-600 text-sm font-medium">Loading Map...</p>
        </div>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={pickupCoords || dropoffCoords || defaultCenter}
      zoom={12}
      onLoad={onLoad}
      onUnmount={onUnmount}
      options={mapOptions}
    >
      {/* Pickup Marker */}
      {pickupCoords && !directions && (
        <Marker
          position={pickupCoords}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: "#C9A063",
            fillOpacity: 1,
            strokeColor: "#FFFFFF",
            strokeWeight: 3,
          }}
          title="Pickup Location"
        />
      )}

      {/* Dropoff Marker */}
      {dropoffCoords && !directions && (
        <Marker
          position={dropoffCoords}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: "#EF4444",
            fillOpacity: 1,
            strokeColor: "#FFFFFF",
            strokeWeight: 3,
          }}
          title="Drop-off Location"
        />
      )}

      {/* Route */}
      {directions && (
        <DirectionsRenderer
          directions={directions}
          options={{
            suppressMarkers: false,
            polylineOptions: {
              strokeColor: "#C9A063",
              strokeWeight: 5,
              strokeOpacity: 0.9,
            },
            markerOptions: {
              zIndex: 100,
            },
          }}
        />
      )}
    </GoogleMap>
  );
}

// Memoize component to prevent unnecessary re-renders
export default memo(RouteMap);
