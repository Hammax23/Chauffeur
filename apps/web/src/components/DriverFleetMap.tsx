"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { GoogleMap, OverlayView } from "@react-google-maps/api";
import { Loader2 } from "lucide-react";
import { useGoogleMaps } from "./GoogleMapsProvider";

export type FleetMapDriver = {
  id: string;
  name: string;
  /** Profile photo URL from driver registration (Cloudinary, etc.) */
  photo: string | null;
  lastLatitude: number | null;
  lastLongitude: number | null;
  /** Degrees clockwise from true north when available */
  lastLocationHeading: number | null;
  lastLocationUpdatedAt: string | null;
};

const DEFAULT_CENTER: google.maps.LatLngLiteral = { lat: 43.6532, lng: -79.3832 };

const mapContainerStyle = { width: "100%", height: "100%" };

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
  gestureHandling: "greedy",
  styles: [
    { featureType: "all", elementType: "geometry.fill", stylers: [{ saturation: -5 }, { lightness: 5 }] },
    { featureType: "road", elementType: "geometry", stylers: [{ lightness: 50 }] },
    { featureType: "water", elementType: "geometry.fill", stylers: [{ color: "#a3ccff" }] },
  ],
};

function minutesSince(iso: string | null) {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

/** Top-down luxury sedan — reads clearly as a vehicle at map zoom */
function FleetCarIcon({ uid }: { uid: string }) {
  return (
    <svg
      width="52"
      height="60"
      viewBox="0 0 52 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="drop-shadow-[0_4px_8px_rgba(0,0,0,0.35)]"
    >
      <defs>
        <linearGradient id={`fleet-body-${uid}`} x1="26" y1="6" x2="26" y2="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2d3748" />
          <stop offset="0.45" stopColor="#1a202c" />
          <stop offset="1" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient id={`fleet-glass-${uid}`} x1="26" y1="14" x2="26" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#93c5fd" stopOpacity="0.85" />
          <stop offset="1" stopColor="#1e3a5f" stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id={`fleet-hood-${uid}`} x1="26" y1="22" x2="26" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#374151" />
          <stop offset="1" stopColor="#111827" />
        </linearGradient>
      </defs>
      {/* Ground shadow */}
      <ellipse cx="26" cy="54" rx="17" ry="4.5" fill="#000" opacity="0.22" />
      {/* Outer shell — rounded limousine silhouette */}
      <path
        d="M10 24c0-8 4.5-14 16-14s16 6 16 14v16c0 9-5.5 14.5-14 14.5h-4c-8.5 0-14-5.5-14-14.5V24Z"
        fill={`url(#fleet-body-${uid})`}
        stroke="#D4A04A"
        strokeWidth="1.25"
      />
      {/* Hood / front wedge */}
      <path d="M16 24c2.5-6 7-9 10-9s7.5 3 10 9H16Z" fill={`url(#fleet-hood-${uid})`} opacity="0.92" />
      {/* Windshield + roof glass */}
      <path
        d="M17 24h18l-4.5-7.5c-1.2-2-3.2-3.2-4.5-3.5-1.3.3-3.3 1.5-4.5 3.5L17 24Z"
        fill={`url(#fleet-glass-${uid})`}
        stroke="#60a5fa"
        strokeOpacity="0.35"
        strokeWidth="0.5"
      />
      {/* Cabin / roof panel */}
      <rect x="18" y="26" width="16" height="11" rx="2" fill="#111827" opacity="0.88" />
      {/* Front headlights */}
      <ellipse cx="17" cy="21" rx="2.2" ry="1.4" fill="#fef9c3" opacity="0.95" />
      <ellipse cx="35" cy="21" rx="2.2" ry="1.4" fill="#fef9c3" opacity="0.95" />
      {/* Rear taillights */}
      <ellipse cx="17" cy="49" rx="2" ry="1.3" fill="#ef4444" opacity="0.9" />
      <ellipse cx="35" cy="49" rx="2" ry="1.3" fill="#ef4444" opacity="0.9" />
      {/* Side mirror nubs */}
      <circle cx="12.5" cy="30" r="1.8" fill="#374151" stroke="#D4A04A" strokeWidth="0.4" />
      <circle cx="39.5" cy="30" r="1.8" fill="#374151" stroke="#D4A04A" strokeWidth="0.4" />
      {/* Center bonnet line */}
      <path d="M26 14v36" stroke="#D4A04A" strokeOpacity="0.35" strokeWidth="0.6" />
    </svg>
  );
}

function FleetVehicleMarker({
  name,
  photo,
  headingDeg,
  fresh,
  markerUid,
}: {
  name: string;
  photo: string | null;
  headingDeg: number;
  fresh: boolean;
  markerUid: string;
}) {
  const initials = initialsFromName(name);

  return (
    <div className="flex flex-col items-center pointer-events-none select-none">
      {/* Driver chip: registration photo + name (Uber-style callout) */}
      <div
        className={`mb-1 flex max-w-[240px] items-center gap-2 rounded-full border bg-white/95 py-1 pl-1 pr-3 shadow-[0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur-sm ring-1 ring-black/5 ${
          fresh ? "border-emerald-500/50" : "border-gray-200"
        }`}
      >
        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-[#C9A063] to-[#A68B5B] ring-2 ring-white">
          {photo ? (
            <Image
              src={photo}
              alt=""
              width={36}
              height={36}
              className="h-full w-full object-cover"
              sizes="36px"
              unoptimized={photo.startsWith("http://")}
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[11px] font-bold text-white">
              {initials}
            </span>
          )}
        </div>
        <span className="truncate text-[13px] font-bold tracking-tight text-gray-900" title={name}>
          {name}
        </span>
      </div>

      {/* Vehicle rotated by GPS heading; anchored at road position */}
      <div className="relative flex flex-col items-center">
        {fresh && (
          <span className="absolute -inset-4 animate-ping rounded-full bg-emerald-400/20" aria-hidden />
        )}
        <div
          className="transition-transform duration-500 ease-out will-change-transform"
          style={{ transform: `rotate(${headingDeg}deg)` }}
        >
          <FleetCarIcon uid={markerUid} />
        </div>
      </div>
    </div>
  );
}

interface DriverFleetMapProps {
  drivers: FleetMapDriver[];
  /** Pan/zoom when user picks a driver from the list */
  focusDriverId?: string | null;
}

export function DriverFleetMap({ drivers, focusDriverId }: DriverFleetMapProps) {
  const { isLoaded, loadError } = useGoogleMaps();
  const mapRef = useRef<google.maps.Map | null>(null);

  const points = useMemo(
    () =>
      drivers.filter(
        (d): d is FleetMapDriver & { lastLatitude: number; lastLongitude: number } =>
          typeof d.lastLatitude === "number" && typeof d.lastLongitude === "number"
      ),
    [drivers]
  );

  /** Refit bounds only when which drivers appear changes — not on every coordinate poll */
  const plottedDriverSignature = useMemo(() => {
    if (points.length === 0) return "";
    return points
      .map((p) => p.id)
      .sort()
      .join("|");
  }, [points]);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    if (points.length === 0) {
      mapRef.current.setCenter(DEFAULT_CENTER);
      mapRef.current.setZoom(10);
      return;
    }

    const map = mapRef.current;
    if (points.length === 1) {
      map.setCenter({ lat: points[0].lastLatitude, lng: points[0].lastLongitude });
      map.setZoom(14);
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    points.forEach((p) => bounds.extend({ lat: p.lastLatitude, lng: p.lastLongitude }));
    map.fitBounds(bounds, 72);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bounds use `points` from same render as signature change
  }, [isLoaded, plottedDriverSignature]);

  useEffect(() => {
    if (!focusDriverId || !isLoaded || !mapRef.current) return;
    const d = points.find((p) => p.id === focusDriverId);
    if (!d) return;
    mapRef.current.panTo({ lat: d.lastLatitude, lng: d.lastLongitude });
    mapRef.current.setZoom(15);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusDriverId, isLoaded]);

  const apiKeyMissing = !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (apiKeyMissing) {
    return (
      <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-2 bg-gray-100 px-6 text-center text-sm text-gray-600">
        <p className="font-semibold text-gray-800">Google Maps API key missing</p>
        <p>Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to your environment to show the live map.</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-full min-h-[420px] items-center justify-center bg-red-50 px-6 text-center text-sm text-red-700">
        Could not load Google Maps. Check your API key and billing.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex h-full min-h-[420px] items-center justify-center bg-[#e8eef5]">
        <Loader2 className="h-8 w-8 animate-spin text-[#C9A063]" />
      </div>
    );
  }

  return (
    <div className="relative h-full w-full min-h-[420px]">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={DEFAULT_CENTER}
        zoom={11}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={mapOptions}
      >
        {points.map((d) => {
          const mins = minutesSince(d.lastLocationUpdatedAt);
          const fresh = mins !== null && mins <= 2;
          const rawHeading = d.lastLocationHeading;
          const heading =
            typeof rawHeading === "number" &&
            Number.isFinite(rawHeading) &&
            rawHeading >= 0 &&
            rawHeading <= 360
              ? rawHeading
              : 0;

          return (
            <OverlayView
              key={d.id}
              position={{ lat: d.lastLatitude, lng: d.lastLongitude }}
              mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              getPixelPositionOffset={(width, height) => ({
                x: -(width / 2),
                y: -height,
              })}
            >
              <FleetVehicleMarker
                name={d.name}
                photo={d.photo}
                headingDeg={heading}
                fresh={fresh}
                markerUid={d.id.replace(/[^a-zA-Z0-9_-]/g, "")}
              />
            </OverlayView>
          );
        })}
      </GoogleMap>

      {points.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/5">
          <div className="rounded-2xl bg-white/95 px-5 py-4 text-center shadow-lg ring-1 ring-black/5">
            <p className="text-sm font-semibold text-gray-900">No vehicles on map yet</p>
            <p className="mt-1 max-w-xs text-xs text-gray-600">
              When drivers enable location in the app, they appear here with live placement.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
