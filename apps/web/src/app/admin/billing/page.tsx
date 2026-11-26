"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type InputHTMLAttributes,
} from "react";
import {
  FileText,
  RefreshCw,
  Send,
  Link2,
  Unlink,
  AlertTriangle,
  Copy,
  CopyPlus,
  ExternalLink,
  Trash2,
  MapPin,
  Car,
  Clock,
  Users,
  Pencil,
  Plus,
  X,
} from "lucide-react";
import { fleetData, type FleetVehicle } from "@/data/fleet";
import { PARCEL_SERVICE_TYPE } from "@/lib/parcel";
import AdminInvoiceCardPay from "@/components/AdminInvoiceCardPay";
import PlacesAutocomplete from "@/components/PlacesAutocomplete";
import { GoogleMapsProvider } from "@/components/GoogleMapsProvider";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  APP_DEFAULT_GRATUITY_PERCENT,
  APP_GRATUITY_PERCENTS,
  APP_HOURLY_DURATIONS,
  APP_MIN_HOURLY_HOURS,
  applyGratuityThenHst,
  BASE_DISTANCE_KM,
  EXTRA_KM_RATE,
  HST_RATE,
  STOP_CHARGE,
  CHILD_SEAT_CHARGE,
  MEET_GREET_CHARGE,
  BOUQUET_CHARGE,
  AIRPORT_PICKUP_FEE,
  calculateReservationPricing,
  type VehiclePricing,
} from "@/lib/reservation-pricing";

const MANUAL_SERVICE_TYPES = [
  { value: "Point-to-Point transportation", label: "Distance" },
  { value: "Hourly ride", label: "Hourly" },
  { value: PARCEL_SERVICE_TYPE, label: "Parcel" },
] as const;

const MANUAL_PAYMENT_METHODS = [
  "Credit card",
  "Cash",
  "e-Transfer",
  "Debit",
  "Cheque",
  "Invoice / Net terms",
  "Other",
] as const;

type PendingCardCollect = {
  invoiceId: string;
  invoiceNumber: string;
  bookingId: string;
  total: number;
  paymentUrl: string;
  clientSecret: string;
};

const fieldClass =
  "w-full min-h-11 rounded-lg border border-gray-200 px-3 py-2.5 text-sm bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A063]/25 focus:border-[#C9A063]";
const labelClass =
  "block text-[11px] sm:text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5";
const goldLabelClass =
  "text-[11px] sm:text-[12px] font-semibold text-[#C9A063] uppercase tracking-wider";
const sectionEyebrow =
  "text-[11px] sm:text-[12px] font-semibold tracking-[0.12em] uppercase text-[#C9A063] mb-0.5";

const emptyStandalone = () => ({
  customerName: "",
  customerEmails: [""] as string[],
  customerPhone: "",
  pickupName: "",
  pickupPhone: "",
  waitingTime: "",
  waitingCharge: "",
  serviceType: "Point-to-Point transportation",
  vehicle: "",
  serviceDate: "",
  serviceTime: "",
  pickupLocation: "",
  dropoffLocation: "",
  stops: "",
  passengers: "1",
  childSeats: "0",
  childSeatType: "",
  etr407: "",
  airline: "",
  flightNumber: "",
  flightNote: "",
  distance: "",
  duration: "",
  specialRequirements: "",
  paymentMethodLabel: "Credit card",
  alreadyPaid: false,
});

function splitEmails(raw: string | null | undefined): string[] {
  const parts = String(raw || "")
    .split(/[,;\n]+/)
    .map((e) => e.trim())
    .filter(Boolean);
  return parts.length ? parts : [""];
}

function joinEmails(emails: string[]): string {
  return emails.map((e) => e.trim()).filter(Boolean).join(", ");
}

function splitStops(raw: string | null | undefined): string[] {
  return String(raw || "")
    .split(/[|\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function joinStops(rows: string[]): string {
  return rows.map((s) => s.trim()).filter(Boolean).join(" | ");
}

const MAX_MANUAL_STOPS = 10;

function parseDistanceMeters(raw: string | null | undefined): number {
  const t = String(raw || "").trim().toLowerCase();
  if (!t) return 0;
  const km = t.match(/([\d.]+)\s*km/);
  if (km) return Math.round(Number(km[1]) * 1000);
  const mOnly = t.match(/^([\d.]+)\s*m(?:eters?)?$/);
  if (mOnly) return Math.round(Number(mOnly[1]));
  const n = Number(t.replace(/,/g, ""));
  if (!Number.isFinite(n) || n <= 0) return 0;
  // Bare numbers: treat small as km, large as meters.
  return n < 500 ? Math.round(n * 1000) : Math.round(n);
}

function findFleetVehicle(
  list: FleetVehicle[],
  vehicleLabelOrId: string
): FleetVehicle | undefined {
  const key = vehicleLabelOrId.trim().toLowerCase();
  if (!key) return undefined;
  return (
    list.find((v) => v.id === vehicleLabelOrId) ||
    list.find((v) => v.name.toLowerCase() === key) ||
    list.find((v) => (v.dropdownName || "").toLowerCase() === key) ||
    list.find((v) => v.name.toLowerCase().includes(key)) ||
    list.find((v) => (v.dropdownName || "").toLowerCase().includes(key))
  );
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Match Custom Reservation: en-CA date + en-US 12h time. */
function formatServiceFields(date: Date): { serviceDate: string; serviceTime: string } {
  return {
    serviceDate: date.toLocaleDateString("en-CA"),
    serviceTime: date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }),
  };
}

function formatServiceTimeOnly(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Parse typed time like "5:37 PM", "17:37", "5:37pm". */
function parseTimeOnly(
  timeStr: string
): { hours: number; mins: number } | null {
  const t = String(timeStr || "").trim().replace(/\s+/g, " ");
  if (!t) return null;

  const ampm = t.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
  if (ampm) {
    let hours = Number(ampm[1]);
    const mins = Number(ampm[2]);
    if (!Number.isFinite(hours) || !Number.isFinite(mins) || mins > 59) return null;
    const ap = ampm[3].toUpperCase();
    if (ap === "PM" && hours < 12) hours += 12;
    if (ap === "AM" && hours === 12) hours = 0;
    if (hours < 0 || hours > 23) return null;
    return { hours, mins };
  }

  const m24 = t.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (m24) {
    const hours = Number(m24[1]);
    const mins = Number(m24[2]);
    if (
      !Number.isFinite(hours) ||
      !Number.isFinite(mins) ||
      hours > 23 ||
      mins > 59
    ) {
      return null;
    }
    return { hours, mins };
  }

  return null;
}

function applyTimeToDate(base: Date, timeStr: string): Date | null {
  const parsed = parseTimeOnly(timeStr);
  if (!parsed) return null;
  const next = new Date(base);
  next.setHours(parsed.hours, parsed.mins, 0, 0);
  return Number.isNaN(next.getTime()) ? null : next;
}

function parseServiceDateTime(
  dateStr: string,
  timeStr: string
): Date | null {
  const d = String(dateStr || "").trim();
  const t = String(timeStr || "").trim();
  if (!d) return null;

  let hours = 0;
  let mins = 0;
  const ampm = t.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
  if (ampm) {
    hours = Number(ampm[1]);
    mins = Number(ampm[2]);
    const ap = ampm[3].toUpperCase();
    if (ap === "PM" && hours < 12) hours += 12;
    if (ap === "AM" && hours === 12) hours = 0;
  } else {
    const m24 = t.match(/^(\d{1,2}):(\d{2})/);
    if (m24) {
      hours = Number(m24[1]);
      mins = Number(m24[2]);
    }
  }

  const datePart = /^\d{4}-\d{2}-\d{2}/.test(d) ? d.slice(0, 10) : d;
  // Parse as local wall time (avoid UTC shift from Date.parse ISO).
  const [y, mo, day] = datePart.split("-").map(Number);
  if (!y || !mo || !day) return null;
  const dt = new Date(y, mo - 1, day, hours, mins, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

/** Loose typing for admin — calendar still works; typing also accepted. */
function parseLooseDateTime(raw: string): Date | null {
  const s = String(raw || "").trim().replace(/\s+/g, " ");
  if (!s) return null;

  // Already split fields style: keep using dedicated parser when possible.
  const native = Date.parse(s);
  if (!Number.isNaN(native)) {
    const d = new Date(native);
    if (!Number.isNaN(d.getTime())) return d;
  }

  // dd/mm/yyyy [h:mm am/pm]
  const dmy = s.match(
    /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})(?:\s+(\d{1,2}):(\d{2})\s*(AM|PM)?)?$/i
  );
  if (dmy) {
    const day = Number(dmy[1]);
    const mo = Number(dmy[2]);
    const y = Number(dmy[3]);
    let h = Number(dmy[4] || 0);
    const mi = Number(dmy[5] || 0);
    const ap = (dmy[6] || "").toUpperCase();
    if (ap === "PM" && h < 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    const dt = new Date(y, mo - 1, day, h, mi, 0, 0);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  // yyyy-mm-dd [HH:mm]
  const iso = s.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2})(?:\s*(AM|PM))?)?$/i
  );
  if (iso) {
    let h = Number(iso[4] || 0);
    const mi = Number(iso[5] || 0);
    const ap = (iso[6] || "").toUpperCase();
    if (ap === "PM" && h < 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    const dt = new Date(
      Number(iso[1]),
      Number(iso[2]) - 1,
      Number(iso[3]),
      h,
      mi,
      0,
      0
    );
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  return null;
}

const BillingDateTimeInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function BillingDateTimeInput(props, ref) {
  return (
    <input
      {...props}
      ref={ref}
      type="text"
      inputMode="text"
      autoComplete="off"
      spellCheck={false}
    />
  );
});

type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  kind: string;
  status: string;
  bookingId: string;
  source?: string;
  reservationId?: string | null;
  customerName: string;
  customerEmail: string;
  total: number;
  currency: string;
  emailStatus: string;
  qbSyncStatus: string;
  dropboxSyncStatus: string;
  pdfUrl: string | null;
  emailedAt: string | null;
  resendCount: number;
  createdAt: string;
  paid?: boolean;
  paymentHeld?: boolean;
  isDraft?: boolean;
};

type ManualLine = { label: string; amount: string };

const emptyManualLine = (): ManualLine => ({ label: "", amount: "" });

function isWaitingTimeLine(label: string): boolean {
  return /^waiting\s*time/i.test(String(label || "").trim());
}

function waitingTimeLineLabel(waitingTime: string): string {
  const t = String(waitingTime || "").trim();
  return t ? `Waiting time (${t})` : "Waiting time";
}

/** Keep / update / remove the Waiting time charge line without wiping other lines. */
function withWaitingChargeLine(
  rows: ManualLine[],
  waitingTime: string,
  waitingCharge: string
): ManualLine[] {
  const without = rows.filter((l) => !isWaitingTimeLine(l.label));
  const amt = Number(waitingCharge);
  if (!Number.isFinite(amt) || Math.abs(amt) < 0.0001) {
    return without.length ? without : [{ label: "Ride fare", amount: "" }];
  }
  return [
    ...without,
    {
      label: waitingTimeLineLabel(waitingTime),
      amount: round2(amt).toFixed(2),
    },
  ];
}

type Integrations = {
  role: string;
  encryptionConfigured: boolean;
  billingHstNumberSet: boolean;
  quickbooks: {
    connected: boolean;
    realmId: string | null;
    connectedAt: string | null;
    connectedByEmail: string | null;
    envReady: boolean;
  };
  dropbox: {
    connected: boolean;
    folderPath: string | null;
    connectedAt: string | null;
    connectedByEmail: string | null;
    envReady: boolean;
  };
};

function badge(status: string) {
  const s = (status || "").toUpperCase();
  const color =
    s === "DONE" || s === "EMAILED" || s === "ISSUED"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
      : s === "FAILED"
        ? "bg-rose-50 text-rose-800 ring-rose-200"
        : s === "SKIPPED" || s === "DRAFT"
          ? "bg-slate-50 text-slate-600 ring-slate-200"
          : "bg-amber-50 text-amber-900 ring-amber-200";
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold ring-1 ${color}`}>
      {s || "—"}
    </span>
  );
}

/** List payment badge: Draft | Paid | Unpaid (from snapshot paid flag). */
function paymentStatusBadge(inv: {
  paid?: boolean;
  isDraft?: boolean;
  status?: string;
}) {
  const draft =
    inv.isDraft || String(inv.status || "").toUpperCase() === "DRAFT";
  if (draft) {
    return (
      <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold ring-1 bg-amber-50 text-amber-900 ring-amber-200">
        DRAFT
      </span>
    );
  }
  if (inv.paid) {
    return (
      <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold ring-1 bg-emerald-50 text-emerald-800 ring-emerald-200">
        PAID
      </span>
    );
  }
  return (
    <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold ring-1 bg-rose-50 text-rose-800 ring-rose-200">
      UNPAID
    </span>
  );
}

/** Invoice list date — Toronto local wall time from ISO createdAt. */
function formatInvoiceCreatedAt(iso: string | null | undefined): {
  date: string;
  time: string;
} {
  const raw = String(iso || "").trim();
  if (!raw) return { date: "—", time: "" };
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return { date: "—", time: "" };
  try {
    return {
      date: new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Toronto",
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(d),
      time: new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Toronto",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(d),
    };
  } catch {
    return {
      date: d.toLocaleDateString("en-CA"),
      time: d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
    };
  }
}

export default function AdminBillingPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [failedCount, setFailedCount] = useState(0);
  const [integrations, setIntegrations] = useState<Integrations | null>(null);
  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [matchedCount, setMatchedCount] = useState(0);
  const [listTruncated, setListTruncated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [manualReservationId, setManualReservationId] = useState("");
  const [loadedBookingId, setLoadedBookingId] = useState<string | null>(null);
  const [loadedReservationId, setLoadedReservationId] = useState<string | null>(
    null
  );
  const [manualGratuity, setManualGratuity] = useState("");
  const [standalone, setStandalone] = useState(emptyStandalone);
  const [manualLines, setManualLines] = useState<ManualLine[]>([
    { label: "Ride fare", amount: "" },
  ]);
  const [fleetVehicles, setFleetVehicles] = useState<FleetVehicle[]>(fleetData);
  const [pendingCard, setPendingCard] = useState<PendingCardCollect | null>(null);
  const [vehicleId, setVehicleId] = useState("");
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [hourlyDuration, setHourlyDuration] = useState(APP_MIN_HOURLY_HOURS);
  const [fareManual, setFareManual] = useState(false);
  const [routeBusy, setRouteBusy] = useState(false);
  const [pickupDateTime, setPickupDateTime] = useState<Date | null>(null);
  const [gratuityPercent, setGratuityPercent] = useState(APP_DEFAULT_GRATUITY_PERCENT);
  const [tipModalOpen, setTipModalOpen] = useState(false);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [editingDraftNumber, setEditingDraftNumber] = useState<string | null>(
    null
  );
  const [stopRows, setStopRows] = useState<string[]>([]);
  const [pricingDefaults, setPricingDefaults] = useState({
    baseDistanceKm: BASE_DISTANCE_KM,
    extraKmRate: EXTRA_KM_RATE,
    stop: STOP_CHARGE,
    childSeat: CHILD_SEAT_CHARGE,
    meetGreet: MEET_GREET_CHARGE,
    bouquet: BOUQUET_CHARGE,
    hstRate: HST_RATE,
    airportPickup: AIRPORT_PICKUP_FEE,
  });
  const isCardCollect = /^credit\s*card$/i.test(standalone.paymentMethodLabel);
  const isHourly = standalone.serviceType === "Hourly ride";
  const directionsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedFleetVehicle = useMemo(
    () =>
      findFleetVehicle(fleetVehicles, vehicleId || standalone.vehicle) || null,
    [fleetVehicles, vehicleId, standalone.vehicle]
  );

  useEffect(() => {
    fetch("/api/fleet")
      .then((r) => r.json())
      .then((data: { success?: boolean; vehicles?: FleetVehicle[] }) => {
        if (data?.success && Array.isArray(data.vehicles) && data.vehicles.length > 0) {
          setFleetVehicles(data.vehicles);
        }
      })
      .catch(() => {
        /* keep static fleetData fallback */
      });
    fetch("/api/pricing-config")
      .then((r) => r.json())
      .then((data: { success?: boolean; charges?: Record<string, number> }) => {
        if (!data?.success || !data.charges) return;
        const c = data.charges;
        setPricingDefaults((prev) => ({
          baseDistanceKm: Number(c.baseDistanceKm) || prev.baseDistanceKm,
          extraKmRate: Number(c.extraKmRate) || prev.extraKmRate,
          stop: Number(c.stop) || prev.stop,
          childSeat: Number(c.childSeat) || prev.childSeat,
          meetGreet: Number(c.meetGreet) || prev.meetGreet,
          bouquet: Number(c.bouquet) || prev.bouquet,
          hstRate: Number(c.hstRate) || prev.hstRate,
          airportPickup: Number(c.airportPickup) || prev.airportPickup,
        }));
      })
      .catch(() => {});
  }, []);

  const applyReservationFare = useCallback(() => {
    const vehicle = findFleetVehicle(
      fleetVehicles,
      vehicleId || standalone.vehicle
    );
    if (!vehicle) return false;

    const fleetPricing: VehiclePricing[] = fleetVehicles.map((v) => ({
      id: v.id,
      hourlyRate: v.price,
      basePrice: v.basePrice ?? v.price,
      pricePerKm: v.pricePerKm,
      baseDistanceKm: v.baseDistanceKm,
      extraKmRate: v.extraKmRate ?? v.pricePerKm,
    }));

    const stopCount = String(standalone.stops || "")
      .split(/[|\n]/)
      .map((s) => s.trim())
      .filter(Boolean).length;

    const pricing = calculateReservationPricing(
      {
        vehicleId: vehicle.id,
        bookingMode: isHourly ? "hourly" : "distance",
        distanceMeters: isHourly ? undefined : distanceMeters,
        hourlyDuration: isHourly ? hourlyDuration : undefined,
        stopCount,
        childSeatCount: Math.max(0, Math.floor(Number(standalone.childSeats) || 0)),
        meetGreet: /Meet\s*&\s*Greet:\s*Yes/i.test(
          standalone.specialRequirements || ""
        ),
        bouquetFlowers: /Bouquet of Flowers:\s*Yes/i.test(
          standalone.specialRequirements || ""
        ),
        pickupLocation: standalone.pickupLocation,
        gratuityPercent,
      },
      fleetPricing,
      {
        stop: pricingDefaults.stop,
        childSeat: pricingDefaults.childSeat,
        meetGreet: pricingDefaults.meetGreet,
        bouquet: pricingDefaults.bouquet,
        hstRate: pricingDefaults.hstRate,
        baseDistanceKm: pricingDefaults.baseDistanceKm,
        extraKmRate: pricingDefaults.extraKmRate,
        airportPickup: pricingDefaults.airportPickup,
      }
    );
    if (!pricing || pricing.rideFare <= 0) return false;

    const nextLines: ManualLine[] = [
      { label: "Ride fare", amount: round2(pricing.rideFare).toFixed(2) },
    ];
    if (pricing.stopCharge > 0) {
      nextLines.push({
        label: "Stops",
        amount: round2(pricing.stopCharge).toFixed(2),
      });
    }
    if (pricing.childSeatCharge > 0) {
      nextLines.push({
        label: "Child seat(s)",
        amount: round2(pricing.childSeatCharge).toFixed(2),
      });
    }
    if (pricing.meetGreetCharge > 0) {
      nextLines.push({
        label: "Meet & Greet",
        amount: round2(pricing.meetGreetCharge).toFixed(2),
      });
    }
    if (pricing.bouquetCharge > 0) {
      nextLines.push({
        label: "Bouquet of Flowers",
        amount: round2(pricing.bouquetCharge).toFixed(2),
      });
    }
    if (pricing.airportPickupFee > 0) {
      nextLines.push({
        label: "Airport pickup fee (GTAA)",
        amount: round2(pricing.airportPickupFee).toFixed(2),
      });
    }
    setManualLines(
      withWaitingChargeLine(
        nextLines,
        standalone.waitingTime,
        standalone.waitingCharge
      )
    );
    setManualGratuity(round2(pricing.gratuity).toFixed(2));
    return true;
  }, [
    fleetVehicles,
    vehicleId,
    standalone.vehicle,
    standalone.stops,
    standalone.childSeats,
    standalone.specialRequirements,
    standalone.pickupLocation,
    standalone.waitingTime,
    standalone.waitingCharge,
    isHourly,
    distanceMeters,
    hourlyDuration,
    pricingDefaults,
    gratuityPercent,
  ]);

  // Auto route distance when pickup / drop-off / stops change (distance & parcel).
  useEffect(() => {
    if (isHourly) return;
    const origin = standalone.pickupLocation.trim();
    const destination = standalone.dropoffLocation.trim();
    if (origin.length < 5 || destination.length < 5) return;

    if (directionsTimer.current) clearTimeout(directionsTimer.current);
    directionsTimer.current = setTimeout(() => {
      const waypoints = String(standalone.stops || "")
        .split(/[|\n]/)
        .map((s) => s.trim())
        .filter((s) => s.length >= 3);
      setRouteBusy(true);
      fetch("/api/places/directions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin,
          destination,
          waypoints: waypoints.length ? waypoints : undefined,
        }),
      })
        .then((r) => r.json())
        .then(
          (data: {
            success?: boolean;
            distanceMeters?: number | null;
            distanceText?: string;
            durationText?: string;
          }) => {
            if (!data?.success || !data.distanceMeters) return;
            setDistanceMeters(Number(data.distanceMeters) || 0);
            setStandalone((s) => ({
              ...s,
              distance: data.distanceText || s.distance,
              duration: data.durationText || s.duration,
            }));
            setFareManual(false);
          }
        )
        .catch(() => {})
        .finally(() => setRouteBusy(false));
    }, 550);

    return () => {
      if (directionsTimer.current) clearTimeout(directionsTimer.current);
    };
  }, [
    isHourly,
    standalone.pickupLocation,
    standalone.dropoffLocation,
    standalone.stops,
  ]);

  // Recalc fare like Custom Reservation when vehicle / distance / hours change.
  useEffect(() => {
    if (fareManual) return;
    if (!selectedFleetVehicle) return;
    if (!isHourly && distanceMeters <= 0) return;
    applyReservationFare();
  }, [
    fareManual,
    selectedFleetVehicle,
    isHourly,
    distanceMeters,
    hourlyDuration,
    applyReservationFare,
  ]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      // Normalize: one date filled → that day only; from>to → swap.
      let from = dateFrom.trim();
      let to = dateTo.trim();
      if (from && !to) to = from;
      if (to && !from) from = to;
      if (from && to && from > to) {
        const tmp = from;
        from = to;
        to = tmp;
      }
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const qs = params.toString();
      const [invRes, intRes] = await Promise.all([
        fetch(`/api/admin/billing/invoices${qs ? `?${qs}` : ""}`, {
          credentials: "include",
        }),
        fetch("/api/admin/billing/integrations", { credentials: "include" }),
      ]);
      const invJson = await invRes.json();
      const intJson = await intRes.json();
      if (invJson.success) {
        setInvoices(invJson.invoices || []);
        setFailedCount(invJson.failedCount || 0);
        setMatchedCount(
          typeof invJson.matchedCount === "number"
            ? invJson.matchedCount
            : (invJson.invoices || []).length
        );
        setListTruncated(Boolean(invJson.truncated));
      }
      if (intJson.success) setIntegrations(intJson);
    } catch {
      setMessage("Failed to load billing data");
    } finally {
      setLoading(false);
    }
  }, [q, dateFrom, dateTo]);

  useEffect(() => {
    void load();
  }, [load]);

  async function postAction(body: Record<string, unknown>) {
    setBusyId(String(body.invoiceId || body.action || "x"));
    setMessage("");
    try {
      const res = await fetch("/api/admin/billing/invoices", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) {
        setMessage(json.error || "Action failed");
        return;
      }

      setMessage("Done");
      await load();
    } catch {
      setMessage("Network error");
    } finally {
      setBusyId(null);
    }
  }

  async function loadReservationIntoForm() {
    const key = manualReservationId.trim();
    if (!key) return;
    setBusyId("load_reservation");
    setMessage("");
    setPendingCard(null);
    try {
      const res = await fetch("/api/admin/billing/invoices", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "load_reservation", bookingId: key }),
      });
      const json = await res.json();
      if (!json.success || !json.reservation) {
        setMessage(json.error || "Reservation not found");
        return;
      }
      const r = json.reservation as {
        id: string;
        bookingId: string;
        status?: string;
        customerName: string;
        customerEmail: string;
        customerPhone: string;
        serviceType: string;
        vehicle: string;
        serviceDate: string;
        serviceTime: string;
        pickupLocation: string;
        dropoffLocation: string;
        stops: string;
        passengers: string;
        childSeats?: string;
        childSeatType?: string;
        etr407?: string;
        airline?: string;
        flightNumber?: string;
        flightNote?: string;
        distance?: string;
        duration?: string;
        specialRequirements?: string;
        paymentStatus: string;
        gratuity?: number;
        bookingTotal?: number;
        lines: { label: string; amount: number }[];
        existingInvoice?: {
          id: string;
          invoiceNumber: string;
          emailStatus: string;
          total: number;
          paid: boolean;
        } | null;
      };

      // Always fill the form from the reservation (never skip the form).
      // Loading a booking starts a new issue path — don't keep an unrelated draft id.
      setEditingDraftId(null);
      setEditingDraftNumber(null);
      setLoadedBookingId(r.bookingId);
      setLoadedReservationId(r.id);
      const matched = findFleetVehicle(fleetVehicles, r.vehicle || "");
      setVehicleId(matched?.id || "");
      setDistanceMeters(parseDistanceMeters(r.distance));
      setFareManual(true); // keep booking’s stored fare until staff changes vehicle/route
      setPickupDateTime(parseServiceDateTime(r.serviceDate, r.serviceTime));
      setStopRows(splitStops(r.stops));
      setStandalone({
        customerName: r.customerName,
        customerEmails: splitEmails(r.customerEmail),
        customerPhone: r.customerPhone,
        pickupName: "",
        pickupPhone: "",
        waitingTime: "",
        waitingCharge: "",
        serviceType: r.serviceType || "Point-to-Point transportation",
        vehicle: r.vehicle,
        serviceDate: r.serviceDate,
        serviceTime: r.serviceTime,
        pickupLocation: r.pickupLocation,
        dropoffLocation: r.dropoffLocation,
        stops: joinStops(splitStops(r.stops)),
        passengers: r.passengers || "1",
        childSeats: r.childSeats || "0",
        childSeatType: r.childSeatType || "",
        etr407: r.etr407 || "",
        airline: r.airline || "",
        flightNumber: r.flightNumber || "",
        flightNote: r.flightNote || "",
        distance: r.distance || "",
        duration: r.duration || "",
        specialRequirements: r.specialRequirements || "",
        paymentMethodLabel: "Credit card",
        alreadyPaid: false,
      });
      setManualLines(
        r.lines?.length
          ? r.lines.map((l) => ({
              label: l.label,
              amount: String(l.amount),
            }))
          : [{ label: "Ride fare", amount: "" }]
      );
      setManualGratuity(
        r.gratuity && r.gratuity > 0 ? String(r.gratuity) : ""
      );
      // Infer tip % from booking when possible (default 18).
      if (r.gratuity && r.gratuity > 0 && r.lines?.length) {
        const sub = r.lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
        if (sub > 0) {
          const pct = Math.round((r.gratuity / sub) * 100);
          const nearest =
            APP_GRATUITY_PERCENTS.find((p) => Math.abs(p - pct) <= 1) ||
            (pct >= APP_DEFAULT_GRATUITY_PERCENT ? pct : APP_DEFAULT_GRATUITY_PERCENT);
          setGratuityPercent(
            Math.min(100, Math.max(APP_DEFAULT_GRATUITY_PERCENT, nearest))
          );
        } else {
          setGratuityPercent(APP_DEFAULT_GRATUITY_PERCENT);
        }
      } else {
        setGratuityPercent(APP_DEFAULT_GRATUITY_PERCENT);
      }

      const unpaidExisting =
        r.existingInvoice && !r.existingInvoice.paid ? r.existingInvoice : null;
      const paidNote =
        String(r.paymentStatus || "").toUpperCase() === "PAID"
          ? " (booking already marked PAID — review carefully)"
          : "";
      const priorPaidNote = r.existingInvoice?.paid
        ? ` Prior invoice ${r.existingInvoice.invoiceNumber} is paid.`
        : "";
      const totalHint =
        r.bookingTotal && r.bookingTotal > 0
          ? ` Booking total $${r.bookingTotal.toFixed(2)}.`
          : "";

      if (unpaidExisting) {
        // Form is filled for review; resume collect on the existing invoice for THIS booking only.
        setMessage(
          `Loaded ${r.bookingId} — form filled. Unpaid ${unpaidExisting.invoiceNumber} ($${Number(unpaidExisting.total).toFixed(2)}) already exists for this booking — collect below (or delete it from the list to re-issue).${paidNote}${totalHint}`
        );
        document.getElementById("create-manual-invoice")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        await beginPaymentCollect({
          invoiceId: unpaidExisting.id,
          invoiceNumber: unpaidExisting.invoiceNumber,
          bookingId: r.bookingId,
          total: Number(unpaidExisting.total),
        });
        return;
      }

      setMessage(
        `Loaded ${r.bookingId} into Create manual invoice — review & Create & collect payment.${paidNote}${priorPaidNote}${totalHint}`
      );
      document.getElementById("create-manual-invoice")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } catch {
      setMessage("Network error loading reservation");
    } finally {
      setBusyId(null);
    }
  }

  async function beginPaymentCollect(opts: {
    invoiceId: string;
    invoiceNumber: string;
    bookingId: string;
    total: number;
  }) {
    setPendingCard(null);
    const [linkRes, piRes] = await Promise.all([
      fetch("/api/admin/billing/invoices", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_payment_link",
          invoiceId: opts.invoiceId,
          returnBaseUrl: window.location.origin,
        }),
      }),
      fetch("/api/admin/billing/invoices", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_payment_intent",
          invoiceId: opts.invoiceId,
        }),
      }),
    ]);
    const linkJson = await linkRes.json();
    const piJson = await piRes.json();
    if (!linkJson.success || !piJson.success) {
      setMessage(
        linkJson.error ||
          piJson.error ||
          "Invoice created but payment setup failed — retry from the invoice list."
      );
      await load();
      return;
    }
    setPendingCard({
      invoiceId: opts.invoiceId,
      invoiceNumber: opts.invoiceNumber,
      bookingId: opts.bookingId,
      total: opts.total,
      paymentUrl: String(linkJson.url),
      clientSecret: String(piJson.clientSecret),
    });
    setMessage(
      `${opts.invoiceNumber} ready — collect payment below. No customer email until paid.`
    );
    await load();
  }

  async function connect(provider: "QUICKBOOKS" | "DROPBOX") {
    setMessage("");
    const res = await fetch("/api/admin/billing/integrations", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "connect", provider }),
    });
    const json = await res.json();
    if (!json.success) {
      setMessage(json.error || "Connect failed (owner only)");
      return;
    }
    window.location.href = json.url;
  }

  async function disconnect(provider: "QUICKBOOKS" | "DROPBOX") {
    if (!confirm(`Disconnect ${provider}? Only the owner should do this.`)) return;
    const res = await fetch("/api/admin/billing/integrations", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "disconnect", provider }),
    });
    const json = await res.json();
    if (!json.success) setMessage(json.error || "Disconnect failed");
    else {
      setMessage("Disconnected");
      await load();
    }
  }

  const isOwner = integrations?.role === "OWNER";

  const manualSubtotal = manualLines.reduce((s, l) => {
    const n = Number(l.amount);
    return s + (Number.isFinite(n) ? n : 0);
  }, 0);
  const manualGratNum = Math.max(0, Number(manualGratuity) || 0);
  const manualTax =
    manualGratNum > 0.0001
      ? (() => {
          const taxable = round2(manualSubtotal + manualGratNum);
          const hst = round2(taxable * (pricingDefaults.hstRate || HST_RATE));
          return { hst, total: round2(taxable + hst) };
        })()
      : (() => {
          const hst = round2(manualSubtotal * (pricingDefaults.hstRate || HST_RATE));
          return { hst, total: round2(manualSubtotal + hst) };
        })();
  const manualHst = manualTax.hst;
  const manualTotal = manualTax.total;

  function clearManualForm() {
    setStandalone(emptyStandalone());
    setManualLines([{ label: "Ride fare", amount: "" }]);
    setManualGratuity("");
    setLoadedBookingId(null);
    setLoadedReservationId(null);
    setManualReservationId("");
    setVehicleId("");
    setDistanceMeters(0);
    setHourlyDuration(APP_MIN_HOURLY_HOURS);
    setFareManual(false);
    setPickupDateTime(null);
    setGratuityPercent(APP_DEFAULT_GRATUITY_PERCENT);
    setTipModalOpen(false);
    setEditingDraftId(null);
    setEditingDraftNumber(null);
    setStopRows([]);
  }

  function syncStops(next: string[]) {
    setStopRows(next);
    setFareManual(false);
    setStandalone((s) => ({ ...s, stops: joinStops(next) }));
  }

  function buildStandalonePayload() {
    const lines = manualLines
      .map((l) => ({
        label: l.label.trim(),
        amount: Number(l.amount),
      }))
      .filter((l) => l.label && Number.isFinite(l.amount) && Math.abs(l.amount) > 0.0001);

    const customerEmail = joinEmails(standalone.customerEmails);
    const { customerEmails: _emails, ...standaloneRest } = standalone;
    return {
      ...standaloneRest,
      customerEmail,
      ...(loadedBookingId ? { bookingId: loadedBookingId } : {}),
      ...(loadedReservationId ? { reservationId: loadedReservationId } : {}),
      ...(editingDraftId ? { draftId: editingDraftId } : {}),
      alreadyPaid: isCardCollect ? false : standalone.alreadyPaid,
      passengers: standalone.passengers.trim()
        ? Number(standalone.passengers)
        : undefined,
      childSeats: Number(standalone.childSeats) || 0,
      gratuity: manualGratNum > 0 ? manualGratNum : 0,
      lines,
    };
  }

  function applyGratuityPercent(pct: number) {
    const next = Math.max(APP_DEFAULT_GRATUITY_PERCENT, Math.round(pct));
    setGratuityPercent(next);
    setTipModalOpen(false);
    // Recompute flat CAD grat from current pre-tax lines (same as reservation).
    const sub = manualLines.reduce((s, l) => {
      const n = Number(l.amount);
      return s + (Number.isFinite(n) ? n : 0);
    }, 0);
    if (sub > 0) {
      const computed = applyGratuityThenHst(
        sub,
        next,
        pricingDefaults.hstRate || HST_RATE
      );
      setManualGratuity(round2(computed.gratuity).toFixed(2));
    }
    // If vehicle/route known, also refresh ride lines at the new tip %.
    if (!fareManual && selectedFleetVehicle) {
      setFareManual(false);
    }
  }

  async function issueStandalone() {
    setBusyId("issue_standalone");
    setMessage("");
    setPendingCard(null);
    try {
      const payload = buildStandalonePayload();
      if (!String(payload.customerEmail || "").includes("@")) {
        setMessage("Add at least one valid customer email");
        setBusyId(null);
        return;
      }
      if (!payload.lines.length) {
        setMessage("Add at least one line item with an amount");
        setBusyId(null);
        return;
      }

      const res = await fetch("/api/admin/billing/invoices", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "issue_standalone", ...payload }),
      });
      const json = await res.json();
      if (!json.success) {
        setMessage(json.error || "Failed to issue manual invoice");
        return;
      }

      if (json.deferDelivery) {
        setEditingDraftId(null);
        setEditingDraftNumber(null);
        await load();
        await beginPaymentCollect({
          invoiceId: String(json.invoiceId),
          invoiceNumber: String(json.invoiceNumber),
          bookingId: String(json.bookingId),
          total: Number(json.total),
        });
        return;
      }

      setMessage(
        `Issued ${json.invoiceNumber} · ${json.bookingId} · $${Number(json.total).toFixed(2)} · email sent`
      );
      clearManualForm();
      await load();
    } catch {
      setMessage("Network error");
    } finally {
      setBusyId(null);
    }
  }

  async function saveDraft() {
    setBusyId("save_draft");
    setMessage("");
    try {
      const payload = buildStandalonePayload();
      if (!String(payload.customerName || "").trim()) {
        setMessage("Customer name is required to save a draft");
        setBusyId(null);
        return;
      }
      if (!payload.lines.length) {
        setMessage("Add at least one line item with an amount");
        setBusyId(null);
        return;
      }

      const res = await fetch("/api/admin/billing/invoices", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_draft", ...payload }),
      });
      const json = await res.json();
      if (!json.success) {
        setMessage(json.error || "Failed to save draft");
        return;
      }

      setEditingDraftId(String(json.invoiceId));
      setEditingDraftNumber(String(json.invoiceNumber));
      setLoadedBookingId(String(json.bookingId));
      setMessage(
        `Draft saved · ${json.invoiceNumber} · ${json.bookingId} · $${Number(json.total).toFixed(2)} (no email)`
      );
      await load();
    } catch {
      setMessage("Network error");
    } finally {
      setBusyId(null);
    }
  }

  async function loadInvoiceIntoForm(invoiceId: string, opts?: { asNewDraft?: boolean }) {
    setBusyId(`load_invoice_${invoiceId}`);
    setMessage("");
    setPendingCard(null);
    try {
      const res = await fetch("/api/admin/billing/invoices", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "load_invoice", invoiceId }),
      });
      const json = await res.json();
      if (!json.success || !json.invoice) {
        setMessage(json.error || "Could not load invoice");
        return;
      }
      const inv = json.invoice as {
        id: string;
        invoiceNumber: string;
        bookingId: string;
        reservationId: string | null;
        isDraft: boolean;
        customerName: string;
        customerEmail: string;
        customerPhone: string;
        pickupName?: string;
        pickupPhone?: string;
        waitingTime?: string;
        serviceType: string;
        vehicle: string;
        serviceDate: string;
        serviceTime: string;
        pickupLocation: string;
        dropoffLocation: string;
        stops: string;
        passengers: string;
        childSeats: string;
        childSeatType: string;
        etr407: string;
        airline: string;
        flightNumber: string;
        flightNote: string;
        distance: string;
        duration: string;
        specialRequirements: string;
        paymentMethodLabel: string;
        gratuity: number;
        lines: { label: string; amount: number }[];
      };

      const payMethod =
        MANUAL_PAYMENT_METHODS.find(
          (m) => m.toLowerCase() === String(inv.paymentMethodLabel || "").toLowerCase()
        ) ||
        (String(inv.paymentMethodLabel || "").trim() || "Credit card");

      const loadedStops = splitStops(inv.stops);
      setStopRows(loadedStops);
      setStandalone({
        ...emptyStandalone(),
        customerName: inv.customerName || "",
        customerEmails: splitEmails(inv.customerEmail),
        customerPhone: inv.customerPhone || "",
        pickupName: inv.pickupName || "",
        pickupPhone: inv.pickupPhone || "",
        waitingTime: inv.waitingTime || "",
        waitingCharge: (() => {
          const waitLine = (inv.lines || []).find((l) =>
            isWaitingTimeLine(l.label)
          );
          return waitLine && Number(waitLine.amount) > 0
            ? String(waitLine.amount)
            : "";
        })(),
        serviceType: inv.serviceType || "Point-to-Point transportation",
        vehicle: inv.vehicle || "",
        serviceDate: inv.serviceDate || "",
        serviceTime: inv.serviceTime || "",
        pickupLocation: inv.pickupLocation || "",
        dropoffLocation: inv.dropoffLocation || "",
        stops: joinStops(loadedStops),
        passengers: inv.passengers || "1",
        childSeats: inv.childSeats || "0",
        childSeatType: inv.childSeatType || "",
        etr407: inv.etr407 || "",
        airline: inv.airline || "",
        flightNumber: inv.flightNumber || "",
        flightNote: inv.flightNote || "",
        distance: inv.distance || "",
        duration: inv.duration || "",
        specialRequirements: inv.specialRequirements || "",
        paymentMethodLabel: payMethod,
        alreadyPaid: !/^credit\s*card$/i.test(payMethod),
      });

      const lines =
        Array.isArray(inv.lines) && inv.lines.length
          ? inv.lines.map((l) => ({
              label: l.label,
              amount: Number.isFinite(l.amount) ? String(l.amount) : "",
            }))
          : [{ label: "Ride fare", amount: "" }];
      setManualLines(lines);
      setManualGratuity(
        inv.gratuity > 0 ? round2(inv.gratuity).toFixed(2) : ""
      );

      const lineSub = lines.reduce((s, l) => {
        const n = Number(l.amount);
        return s + (Number.isFinite(n) ? n : 0);
      }, 0);
      if (lineSub > 0 && inv.gratuity > 0) {
        const pct = Math.round((inv.gratuity / lineSub) * 100);
        setGratuityPercent(
          APP_GRATUITY_PERCENTS.includes(pct as (typeof APP_GRATUITY_PERCENTS)[number])
            ? pct
            : Math.max(APP_DEFAULT_GRATUITY_PERCENT, pct || APP_DEFAULT_GRATUITY_PERCENT)
        );
      } else {
        setGratuityPercent(APP_DEFAULT_GRATUITY_PERCENT);
      }

      const fleetMatch = findFleetVehicle(fleetVehicles, inv.vehicle || "");
      setVehicleId(fleetMatch?.id || "");
      setDistanceMeters(parseDistanceMeters(inv.distance));
      if (/hourly/i.test(inv.serviceType || "")) {
        const hrs = Number(String(inv.duration || "").match(/([\d.]+)/)?.[1]);
        if (Number.isFinite(hrs) && hrs > 0) {
          setHourlyDuration(Math.max(APP_MIN_HOURLY_HOURS, Math.round(hrs)));
        }
      }
      setFareManual(true);
      setPickupDateTime(parseServiceDateTime(inv.serviceDate, inv.serviceTime));

      if (opts?.asNewDraft) {
        // Duplicate already created a new DRAFT — keep editing that new id.
        setEditingDraftId(inv.id);
        setEditingDraftNumber(inv.invoiceNumber);
        setLoadedBookingId(inv.bookingId);
        setLoadedReservationId(null);
      } else if (inv.isDraft) {
        setEditingDraftId(inv.id);
        setEditingDraftNumber(inv.invoiceNumber);
        setLoadedBookingId(inv.bookingId);
        setLoadedReservationId(inv.reservationId || null);
      } else {
        // Loading a issued invoice for reference — do not overwrite it; treat as new form copy.
        setEditingDraftId(null);
        setEditingDraftNumber(null);
        setLoadedBookingId(null);
        setLoadedReservationId(null);
      }

      setMessage(
        inv.isDraft || opts?.asNewDraft
          ? `Editing draft ${inv.invoiceNumber} — Save draft or Create & collect when ready`
          : `Copied ${inv.invoiceNumber} into form — Save as Draft or Create & collect (new invoice)`
      );

      document
        .getElementById("create-manual-invoice")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      setMessage("Network error");
    } finally {
      setBusyId(null);
    }
  }

  async function duplicateInvoice(invoiceId: string) {
    setBusyId(`dup_${invoiceId}`);
    setMessage("");
    setPendingCard(null);
    try {
      const res = await fetch("/api/admin/billing/invoices", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "duplicate_invoice", invoiceId }),
      });
      const json = await res.json();
      if (!json.success) {
        setMessage(json.error || "Duplicate failed");
        return;
      }
      setMessage(
        `Duplicated ${json.fromInvoiceNumber} → draft ${json.invoiceNumber}`
      );
      await load();
      await loadInvoiceIntoForm(String(json.invoiceId), { asNewDraft: true });
    } catch {
      setMessage("Network error");
    } finally {
      setBusyId(null);
    }
  }

  async function onCardPaid(paymentIntentId: string) {
    if (!pendingCard) return;
    setBusyId("confirm_paid");
    try {
      const res = await fetch("/api/admin/billing/invoices", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm_manual_paid",
          invoiceId: pendingCard.invoiceId,
          paymentIntentId,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setMessage(json.error || "Paid but invoice email failed to queue");
      } else {
        setMessage(
          `Payment OK · ${pendingCard.invoiceNumber} · invoice email sending to customer`
        );
        setPendingCard(null);
        clearManualForm();
        await load();
      }
    } catch {
      setMessage("Network error after payment");
    } finally {
      setBusyId(null);
    }
  }

  async function copyPaymentLink() {
    if (!pendingCard?.paymentUrl) return;
    try {
      await navigator.clipboard.writeText(pendingCard.paymentUrl);
      setMessage("Payment link copied");
    } catch {
      setMessage("Could not copy — select the link manually");
    }
  }

  return (
    <GoogleMapsProvider>
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-2">
              <FileText className="w-6 h-6 text-[#C9A063]" />
              Billing &amp; Invoices
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Walk-in or load a booking. Manual entry uses the same vehicle fare as
              Custom Reservation.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {failedCount > 0 && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              {failedCount} invoice(s) have a failed email/QB/Dropbox sync. Use Retry below.
            </span>
          </div>
        )}

        {message && (
          <div className="rounded-lg bg-slate-900 text-white text-sm px-4 py-2">{message}</div>
        )}

        {/* Integrations */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
            Archives &amp; books
          </h2>
          {!integrations?.encryptionConfigured && (
            <p className="text-sm text-rose-700">
              Set <code className="text-xs">INTEGRATION_TOKEN_ENCRYPTION_KEY</code> before connecting
              QuickBooks/Dropbox.
            </p>
          )}
          {!integrations?.billingHstNumberSet && (
            <p className="text-sm text-amber-800">
              Set <code className="text-xs">BILLING_HST_NUMBER</code> so tax invoices show your CRA
              registration.
            </p>
          )}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-100 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-900">QuickBooks Online</p>
                {badge(integrations?.quickbooks.connected ? "DONE" : "PENDING")}
              </div>
              <p className="text-xs text-gray-500">
                {integrations?.quickbooks.connected
                  ? `Connected${integrations.quickbooks.connectedByEmail ? ` by ${integrations.quickbooks.connectedByEmail}` : ""}`
                  : "Owner OAuth connect required"}
              </p>
              {isOwner && (
                <div className="flex gap-2 pt-1">
                  {!integrations?.quickbooks.connected ? (
                    <button
                      type="button"
                      disabled={!integrations?.quickbooks.envReady}
                      onClick={() => void connect("QUICKBOOKS")}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-[#C9A063] text-black disabled:opacity-40"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      Connect
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void disconnect("QUICKBOOKS")}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md border border-rose-200 text-rose-700"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                      Disconnect
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="rounded-xl border border-gray-100 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-900">Dropbox</p>
                {badge(integrations?.dropbox.connected ? "DONE" : "PENDING")}
              </div>
              <p className="text-xs text-gray-500">
                {integrations?.dropbox.folderPath || "Company Invoices folder"}
              </p>
              {isOwner && (
                <div className="flex gap-2 pt-1">
                  {!integrations?.dropbox.connected ? (
                    <button
                      type="button"
                      disabled={!integrations?.dropbox.envReady}
                      onClick={() => void connect("DROPBOX")}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-[#C9A063] text-black disabled:opacity-40"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      Connect
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void disconnect("DROPBOX")}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md border border-rose-200 text-rose-700"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                      Disconnect
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Standalone manual invoice (+ optional load from booking) */}
        <section id="create-manual-invoice" className="space-y-4">
          <div className="rounded-2xl border border-gray-200/80 bg-white shadow-sm overflow-hidden">
            <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-4 border-b border-gray-100 space-y-4">
              <div>
                <p className={sectionEyebrow}>Billing</p>
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 tracking-tight">
                  Create manual invoice
                </h2>
                <p className="text-[12px] text-gray-500 mt-0.5">
                  Fill fields yourself or load a booking. Save as Draft anytime. Duplicate
                  from the list. Credit card → email only after payment.
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-3 sm:p-3.5">
                <label className={labelClass}>Load from reservation</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    value={manualReservationId}
                    onChange={(e) => setManualReservationId(e.target.value)}
                    placeholder="SARJ-MWTJ66FC575"
                    className={`${fieldClass} flex-1 font-mono text-[13px]`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void loadReservationIntoForm();
                      }
                    }}
                  />
                  <button
                    type="button"
                    disabled={
                      !manualReservationId.trim() || busyId === "load_reservation"
                    }
                    onClick={() => void loadReservationIntoForm()}
                    className="px-4 min-h-11 rounded-lg text-sm font-semibold bg-gray-900 text-white disabled:opacity-40 whitespace-nowrap"
                  >
                    {busyId === "load_reservation" ? "Loading…" : "Load into form"}
                  </button>
                </div>
                {(editingDraftId || loadedBookingId) && (
                  <div className="mt-3 rounded-lg border border-[#C9A063]/30 bg-[#C9A063]/8 px-3 py-2 text-[12px] text-[#5c4a1f] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <p>
                      {editingDraftId ? (
                        <>
                          Editing draft{" "}
                          <span className="font-semibold text-[#8B6914]">
                            {editingDraftNumber || editingDraftId}
                          </span>
                          {loadedBookingId ? ` · ${loadedBookingId}` : ""} — Save draft
                          or Create &amp; collect when ready.
                        </>
                      ) : (
                        <>
                          <span className="font-semibold text-[#8B6914]">
                            {loadedBookingId}
                          </span>
                          {loadedReservationId ? " · linked to reservation" : ""} —
                          review all fields, then collect payment.
                        </>
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        clearManualForm();
                        setPendingCard(null);
                        setMessage("Form cleared");
                      }}
                      className="text-[11px] font-semibold text-[#8B6914] hover:underline whitespace-nowrap shrink-0"
                    >
                      Clear form
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 sm:p-5">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 lg:items-start">
                <div className="lg:col-span-2 space-y-4">
                  {/* Customer */}
                  <div className="rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-3.5 sm:px-4 pt-3.5 pb-2 bg-white">
                      <p className={sectionEyebrow}>Guest</p>
                      <h3 className="text-sm sm:text-base font-semibold text-gray-900">
                        Customer
                      </h3>
                    </div>
                    <div className="px-3.5 sm:px-4 pb-3.5 space-y-3">
                      <div className="grid sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className={labelClass}>Full name *</label>
                          <input
                            value={standalone.customerName}
                            onChange={(e) =>
                              setStandalone((s) => ({
                                ...s,
                                customerName: e.target.value,
                              }))
                            }
                            placeholder="Guest name"
                            className={fieldClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Phone</label>
                          <input
                            value={standalone.customerPhone}
                            onChange={(e) =>
                              setStandalone((s) => ({
                                ...s,
                                customerPhone: e.target.value,
                              }))
                            }
                            placeholder="(416) 000-0000"
                            className={fieldClass}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <label className={labelClass + " !mb-0"}>
                            Email *{" "}
                            <span className="normal-case tracking-normal font-normal text-gray-400">
                              — all get invoice when paid
                            </span>
                          </label>
                          {standalone.customerEmails.length < 5 && (
                            <button
                              type="button"
                              onClick={() =>
                                setStandalone((s) => ({
                                  ...s,
                                  customerEmails: [...s.customerEmails, ""],
                                }))
                              }
                              className="text-[11px] font-semibold text-[#8B6914] hover:underline"
                            >
                              + Add email
                            </button>
                          )}
                        </div>
                        <div className="space-y-2">
                          {standalone.customerEmails.map((value, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                              <input
                                type="email"
                                autoComplete={idx === 0 ? "email" : "off"}
                                value={value}
                                onChange={(e) => {
                                  const next = e.target.value;
                                  setStandalone((s) => ({
                                    ...s,
                                    customerEmails: s.customerEmails.map((em, i) =>
                                      i === idx ? next : em
                                    ),
                                  }));
                                }}
                                placeholder={
                                  idx === 0
                                    ? "guest@email.com"
                                    : "assistant@email.com"
                                }
                                className={fieldClass}
                              />
                              {standalone.customerEmails.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setStandalone((s) => ({
                                      ...s,
                                      customerEmails: s.customerEmails.filter(
                                        (_, i) => i !== idx
                                      ),
                                    }))
                                  }
                                  className="text-xs font-semibold text-rose-700 shrink-0"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="pt-1">
                        <p className="text-[11px] text-gray-500 mb-2">
                          Pickup guest — if assistant booked but you pick up someone else
                        </p>
                        <div className="grid sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className={labelClass}>Pickup name</label>
                            <input
                              value={standalone.pickupName}
                              onChange={(e) =>
                                setStandalone((s) => ({
                                  ...s,
                                  pickupName: e.target.value,
                                }))
                              }
                              placeholder="Passenger at pickup"
                              className={fieldClass}
                              autoComplete="off"
                            />
                          </div>
                          <div>
                            <label className={labelClass}>Pickup phone</label>
                            <input
                              value={standalone.pickupPhone}
                              onChange={(e) =>
                                setStandalone((s) => ({
                                  ...s,
                                  pickupPhone: e.target.value,
                                }))
                              }
                              placeholder="(416) 000-0000"
                              className={fieldClass}
                              autoComplete="off"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Trip */}
                  <div className="rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-3.5 sm:px-4 pt-3.5 pb-2 bg-white">
                      <p className={sectionEyebrow}>Trip</p>
                      <h3 className="text-sm sm:text-base font-semibold text-gray-900">
                        Ride details
                      </h3>
                    </div>
                    <div className="px-3.5 sm:px-4 pb-3.5 space-y-3">
                      <div
                        className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-gray-100 border border-gray-200/70"
                        role="tablist"
                        aria-label="Service type"
                      >
                        {MANUAL_SERVICE_TYPES.map((t) => {
                          const active = standalone.serviceType === t.value;
                          return (
                            <button
                              key={t.value}
                              type="button"
                              role="tab"
                              aria-selected={active}
                              onClick={() => {
                                setFareManual(false);
                                setStandalone((s) => ({
                                  ...s,
                                  serviceType: t.value,
                                }));
                              }}
                              className={`min-h-11 px-1.5 sm:px-2 py-2 rounded-lg text-[11px] sm:text-[12px] font-semibold tracking-wide transition-all ${
                                active
                                  ? "bg-gray-900 text-white shadow-sm"
                                  : "text-gray-600 hover:text-gray-900"
                              }`}
                            >
                              {t.label}
                            </button>
                          );
                        })}
                      </div>
                      {!MANUAL_SERVICE_TYPES.some(
                        (t) => t.value === standalone.serviceType
                      ) && standalone.serviceType ? (
                        <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
                          Loaded service:{" "}
                          <strong>{standalone.serviceType}</strong> — pick Distance /
                          Hourly / Parcel above if you need to change it.
                        </p>
                      ) : null}

                      <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                        <div className="px-3 py-2.5 bg-white">
                          <div className="flex items-center gap-2 mb-1">
                            <MapPin
                              className="w-3.5 h-3.5 text-[#C9A063] shrink-0"
                              strokeWidth={2}
                            />
                            <label className={goldLabelClass}>Pickup</label>
                          </div>
                          <PlacesAutocomplete
                            value={standalone.pickupLocation}
                            onChange={(val) => {
                              setFareManual(false);
                              setStandalone((s) => ({
                                ...s,
                                pickupLocation: val,
                              }));
                            }}
                            placeholder="Pickup address"
                            className={fieldClass}
                          />
                        </div>
                        {!isHourly && (
                          <div className="px-3 py-2.5 bg-white">
                            <div className="flex items-center gap-2 mb-1">
                              <MapPin
                                className="w-3.5 h-3.5 text-rose-500 shrink-0"
                                strokeWidth={2}
                              />
                              <label className={goldLabelClass}>Drop-off</label>
                            </div>
                            <PlacesAutocomplete
                              value={standalone.dropoffLocation}
                              onChange={(val) => {
                                setFareManual(false);
                                setStandalone((s) => ({
                                  ...s,
                                  dropoffLocation: val,
                                }));
                              }}
                              placeholder="Drop-off address"
                              className={fieldClass}
                            />
                          </div>
                        )}
                        {!isHourly && (
                          <div className="px-3 py-2.5 bg-white space-y-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <label className={`${labelClass} !mb-0`}>
                                Stops (optional)
                              </label>
                              <button
                                type="button"
                                disabled={stopRows.length >= MAX_MANUAL_STOPS}
                                onClick={() => {
                                  if (stopRows.length >= MAX_MANUAL_STOPS) return;
                                  syncStops([...stopRows, ""]);
                                }}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#8B6914] hover:underline disabled:opacity-40 disabled:no-underline"
                              >
                                <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                                Add stop
                              </button>
                            </div>
                            {stopRows.length === 0 ? (
                              <p className="text-[11px] text-gray-400">
                                No stops — tap Add stop for Google address suggestions.
                              </p>
                            ) : (
                              stopRows.map((stop, index) => (
                                <div key={`stop-${index}`} className="space-y-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                                      Stop {index + 1}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        syncStops(
                                          stopRows.filter((_, i) => i !== index)
                                        )
                                      }
                                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:underline"
                                      aria-label={`Remove stop ${index + 1}`}
                                    >
                                      <X className="w-3 h-3" />
                                      Remove
                                    </button>
                                  </div>
                                  <div className="relative">
                                    <PlacesAutocomplete
                                      value={stop}
                                      onChange={(val) => {
                                        const next = [...stopRows];
                                        next[index] = val;
                                        syncStops(next);
                                      }}
                                      placeholder={`Stop ${index + 1} address`}
                                      className={fieldClass}
                                    />
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      <div className="grid sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className={labelClass}>Pick-up date &amp; time</label>
                          <div className="relative reservation-datepicker">
                            <DatePicker
                              selected={pickupDateTime}
                              onChange={(date: Date | null) => {
                                // Ignore null mid-typing (incomplete parse) so staff can type freely.
                                if (!date) return;
                                setPickupDateTime(date);
                                setStandalone((s) => ({
                                  ...s,
                                  ...formatServiceFields(date),
                                }));
                              }}
                              onChangeRaw={(e) => {
                                const raw = (e.target as HTMLInputElement)?.value;
                                if (!raw?.trim()) {
                                  setPickupDateTime(null);
                                  setStandalone((s) => ({
                                    ...s,
                                    serviceDate: "",
                                    serviceTime: "",
                                  }));
                                }
                              }}
                              customInput={
                                <BillingDateTimeInput
                                  className={fieldClass + " pr-9"}
                                  onBlur={(e) => {
                                    const parsed = parseLooseDateTime(e.target.value);
                                    if (!parsed) return;
                                    setPickupDateTime(parsed);
                                    setStandalone((s) => ({
                                      ...s,
                                      ...formatServiceFields(parsed),
                                    }));
                                  }}
                                />
                              }
                              showTimeSelect
                              timeIntervals={15}
                              timeCaption="Time"
                              dateFormat={[
                                "MMM d, yyyy  h:mm aa",
                                "MMM d, yyyy h:mm aa",
                                "MM/dd/yyyy h:mm aa",
                                "dd/MM/yyyy h:mm aa",
                                "yyyy-MM-dd h:mm aa",
                                "yyyy-MM-dd HH:mm",
                              ]}
                              timeFormat="h:mm aa"
                              minTime={new Date(new Date().setHours(0, 0, 0, 0))}
                              maxTime={new Date(new Date().setHours(23, 45, 0, 0))}
                              placeholderText="Type or select date & time"
                              withPortal
                            />
                            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
                              <Clock
                                className="w-3.5 h-3.5 text-gray-400"
                                strokeWidth={1.75}
                              />
                            </div>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1">
                            Pick date &amp; time from calendar, or type below
                          </p>
                          {pickupDateTime ? (
                            <div className="mt-2.5">
                              <label className={labelClass}>Time</label>
                              <input
                                type="text"
                                inputMode="text"
                                autoComplete="off"
                                spellCheck={false}
                                value={standalone.serviceTime}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  setStandalone((s) => ({
                                    ...s,
                                    serviceTime: raw,
                                  }));
                                }}
                                onBlur={(e) => {
                                  if (!pickupDateTime) return;
                                  const next = applyTimeToDate(
                                    pickupDateTime,
                                    e.target.value
                                  );
                                  if (!next) {
                                    // Invalid type — snap back to last good time.
                                    setStandalone((s) => ({
                                      ...s,
                                      serviceTime: formatServiceTimeOnly(pickupDateTime),
                                    }));
                                    return;
                                  }
                                  setPickupDateTime(next);
                                  setStandalone((s) => ({
                                    ...s,
                                    ...formatServiceFields(next),
                                  }));
                                }}
                                onKeyDown={(e) => {
                                  if (e.key !== "Enter") return;
                                  e.preventDefault();
                                  (e.target as HTMLInputElement).blur();
                                }}
                                placeholder="e.g. 5:37 PM"
                                className={fieldClass}
                              />
                              <p className="text-[10px] text-gray-400 mt-1">
                                Type any time (not only 15‑min slots), e.g. 5:37 PM
                              </p>
                            </div>
                          ) : null}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <Car className="w-3.5 h-3.5 text-gray-400" />
                            <label className={labelClass + " !mb-0"}>Vehicle</label>
                          </div>
                          <select
                            value={vehicleId || selectedFleetVehicle?.id || ""}
                            onChange={(e) => {
                              const id = e.target.value;
                              const v = findFleetVehicle(fleetVehicles, id);
                              setVehicleId(id);
                              setFareManual(false);
                              setStandalone((s) => ({
                                ...s,
                                vehicle: v?.name || v?.dropdownName || "",
                              }));
                            }}
                            className={fieldClass}
                          >
                            <option value="">Select vehicle…</option>
                            {!selectedFleetVehicle && standalone.vehicle ? (
                              <option value="">
                                {standalone.vehicle} (from booking — pick fleet match)
                              </option>
                            ) : null}
                            {fleetVehicles.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.dropdownName || v.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        {isHourly ? (
                          <div>
                            <label className={labelClass}>Hours</label>
                            <select
                              value={hourlyDuration}
                              onChange={(e) => {
                                setFareManual(false);
                                setHourlyDuration(Number(e.target.value) || APP_MIN_HOURLY_HOURS);
                              }}
                              className={fieldClass}
                            >
                              {APP_HOURLY_DURATIONS.map((h) => (
                                <option key={h} value={h}>
                                  {h} hour{h === 1 ? "" : "s"}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center gap-2 mb-1.5">
                              <Users className="w-3.5 h-3.5 text-gray-400" />
                              <label className={labelClass + " !mb-0"}>
                                Passengers
                              </label>
                            </div>
                            <input
                              type="number"
                              min={1}
                              value={standalone.passengers}
                              onChange={(e) =>
                                setStandalone((s) => ({
                                  ...s,
                                  passengers: e.target.value,
                                }))
                              }
                              className={fieldClass}
                            />
                          </div>
                        )}
                      </div>

                      {isHourly && (
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <Users className="w-3.5 h-3.5 text-gray-400" />
                            <label className={labelClass + " !mb-0"}>
                              Passengers
                            </label>
                          </div>
                          <input
                            type="number"
                            min={1}
                            value={standalone.passengers}
                            onChange={(e) =>
                              setStandalone((s) => ({
                                ...s,
                                passengers: e.target.value,
                              }))
                            }
                            className={fieldClass}
                          />
                        </div>
                      )}

                      <div className="grid sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className={labelClass}>
                            Distance{" "}
                            {routeBusy ? (
                              <span className="normal-case tracking-normal font-normal text-[#8B6914]">
                                · routing…
                              </span>
                            ) : null}
                          </label>
                          <input
                            value={standalone.distance}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFareManual(false);
                              setDistanceMeters(parseDistanceMeters(val));
                              setStandalone((s) => ({ ...s, distance: val }));
                            }}
                            placeholder="Auto from route, or e.g. 24.5 km"
                            className={fieldClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Duration</label>
                          <input
                            value={standalone.duration}
                            onChange={(e) =>
                              setStandalone((s) => ({
                                ...s,
                                duration: e.target.value,
                              }))
                            }
                            placeholder="Auto from route"
                            className={fieldClass}
                          />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className={labelClass}>Waiting time</label>
                          <input
                            value={standalone.waitingTime}
                            onChange={(e) => {
                              const waitingTime = e.target.value;
                              setStandalone((s) => ({ ...s, waitingTime }));
                              setManualLines((rows) =>
                                withWaitingChargeLine(
                                  rows,
                                  waitingTime,
                                  standalone.waitingCharge
                                )
                              );
                            }}
                            placeholder="e.g. 15 min"
                            className={fieldClass}
                            autoComplete="off"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>
                            Waiting charges ($)
                          </label>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={standalone.waitingCharge}
                            onChange={(e) => {
                              const waitingCharge = e.target.value;
                              setStandalone((s) => ({ ...s, waitingCharge }));
                              setFareManual(true);
                              setManualLines((rows) =>
                                withWaitingChargeLine(
                                  rows,
                                  standalone.waitingTime,
                                  waitingCharge
                                )
                              );
                            }}
                            placeholder="0.00"
                            className={fieldClass}
                          />
                          <p className="text-[10px] text-gray-400 mt-1">
                            Admin / billing sets the amount — adds a fare line
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className={labelClass}>Flight number</label>
                        <input
                          value={standalone.flightNumber}
                          onChange={(e) =>
                            setStandalone((s) => ({
                              ...s,
                              flightNumber: e.target.value,
                            }))
                          }
                          placeholder="e.g. AC123"
                          className={fieldClass}
                          autoComplete="off"
                        />
                      </div>

                      <div>
                        <label className={labelClass}>Special Details</label>
                        <textarea
                          value={standalone.specialRequirements}
                          onChange={(e) =>
                            setStandalone((s) => ({
                              ...s,
                              specialRequirements: e.target.value,
                            }))
                          }
                          placeholder="Notes for driver / billing (optional)"
                          rows={3}
                          className={`${fieldClass} min-h-[5.5rem] resize-y`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Payment method (mobile also in sidebar CTA) */}
                  <div className="rounded-xl border border-gray-200 overflow-hidden lg:hidden">
                    <div className="px-3.5 sm:px-4 pt-3.5 pb-2">
                      <p className={sectionEyebrow}>Payment</p>
                      <h3 className="text-sm font-semibold text-gray-900">
                        How they pay
                      </h3>
                    </div>
                    <div className="px-3.5 sm:px-4 pb-3.5 space-y-3">
                      <select
                        value={standalone.paymentMethodLabel}
                        onChange={(e) => {
                          const v = e.target.value;
                          const card = /^credit\s*card$/i.test(v);
                          setStandalone((s) => ({
                            ...s,
                            paymentMethodLabel: v,
                            alreadyPaid: card ? false : s.alreadyPaid || true,
                          }));
                        }}
                        className={fieldClass}
                      >
                        {MANUAL_PAYMENT_METHODS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                      {!isCardCollect && (
                        <label className="inline-flex items-center gap-2 text-sm text-gray-800">
                          <input
                            type="checkbox"
                            checked={standalone.alreadyPaid}
                            onChange={(e) =>
                              setStandalone((s) => ({
                                ...s,
                                alreadyPaid: e.target.checked,
                              }))
                            }
                            className="rounded border-gray-300"
                          />
                          Already paid
                        </label>
                      )}
                    </div>
                  </div>
                </div>

                {/* Summary / charges rail */}
                <aside className="lg:sticky lg:top-20 space-y-3">
                  <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="px-3.5 sm:px-4 pt-3.5 pb-2 border-b border-gray-100">
                      <p className={sectionEyebrow}>Fare</p>
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm sm:text-base font-semibold text-gray-900">
                          Charges
                        </h3>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setFareManual(false);
                              const ok = applyReservationFare();
                              setMessage(
                                ok
                                  ? "Fare recalculated from vehicle + route (same as reservation)."
                                  : "Need vehicle + distance (or hourly hours) to calculate fare."
                              );
                            }}
                            className="text-[11px] font-semibold text-[#8B6914] hover:underline"
                          >
                            Recalc
                          </button>
                          <button
                            type="button"
                            disabled={manualLines.length >= 20}
                            onClick={() => {
                              setFareManual(true);
                              setManualLines((rows) => [...rows, emptyManualLine()]);
                            }}
                            className="text-[11px] font-semibold text-[#8B6914] hover:underline disabled:opacity-40"
                          >
                            + Add line
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Same pricing as Custom Reservation · pick vehicle + route
                        {fareManual ? " · manual edit on" : ""}
                      </p>
                    </div>
                    <div className="p-3.5 sm:p-4 space-y-2.5">
                      {manualLines.map((line, idx) => (
                        <div key={idx} className="space-y-1.5">
                          <input
                            value={line.label}
                            onChange={(e) => {
                              setFareManual(true);
                              setManualLines((rows) =>
                                rows.map((row, i) =>
                                  i === idx
                                    ? { ...row, label: e.target.value }
                                    : row
                                )
                              );
                            }}
                            placeholder="e.g. Ride fare"
                            className={fieldClass}
                          />
                          <div className="flex gap-2 items-center">
                            <input
                              value={line.amount}
                              onChange={(e) => {
                                setFareManual(true);
                                setManualLines((rows) =>
                                  rows.map((row, i) =>
                                    i === idx
                                      ? { ...row, amount: e.target.value }
                                      : row
                                  )
                                );
                              }}
                              placeholder="0.00"
                              inputMode="decimal"
                              className={`${fieldClass} tabular-nums text-right`}
                            />
                            <button
                              type="button"
                              disabled={manualLines.length <= 1}
                              onClick={() => {
                                setFareManual(true);
                                setManualLines((rows) =>
                                  rows.filter((_, i) => i !== idx)
                                );
                              }}
                              className="text-xs text-rose-700 font-semibold disabled:opacity-30 shrink-0 px-1"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}

                      <div className="pt-1 border-t border-gray-100 space-y-1.5">
                        <label className={labelClass}>Admin, Fuel &amp; Grat</label>
                        <button
                          type="button"
                          onClick={() => setTipModalOpen(true)}
                          className="w-full flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-[#f8fafc] px-3 py-3 text-left hover:border-[#C9A063]/50 transition-colors"
                        >
                          <div>
                            <div className="text-[13px] font-semibold text-gray-900">
                              Admin, Fuel &amp; Grat
                            </div>
                            <div className="text-[12px] text-gray-500">
                              {gratuityPercent}%
                              {manualGratNum > 0
                                ? ` · $${manualGratNum.toFixed(2)}`
                                : ""}
                            </div>
                          </div>
                          <span className="text-gray-400 text-sm">›</span>
                        </button>
                      </div>

                      <div className="rounded-lg bg-gray-50 border border-gray-100 divide-y divide-gray-100 text-sm">
                        <div className="flex justify-between px-3 py-2 text-gray-600">
                          <span>Subtotal</span>
                          <span className="tabular-nums font-medium text-gray-900">
                            ${manualSubtotal.toFixed(2)}
                          </span>
                        </div>
                        {manualGratNum > 0 ? (
                          <div className="flex justify-between px-3 py-2 text-gray-600">
                            <span>Grat</span>
                            <span className="tabular-nums font-medium text-gray-900">
                              ${manualGratNum.toFixed(2)}
                            </span>
                          </div>
                        ) : null}
                        <div className="flex justify-between px-3 py-2 text-gray-600">
                          <span>HST (13%)</span>
                          <span className="tabular-nums font-medium text-gray-900">
                            ${manualHst.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between px-3 py-2.5 font-semibold text-gray-900">
                          <span>Total</span>
                          <span className="tabular-nums text-base text-[#8B6914]">
                            ${manualTotal.toFixed(2)} CAD
                          </span>
                        </div>
                      </div>

                      <div className="hidden lg:block space-y-2 pt-1">
                        <label className={labelClass}>Payment method</label>
                        <select
                          value={standalone.paymentMethodLabel}
                          onChange={(e) => {
                            const v = e.target.value;
                            const card = /^credit\s*card$/i.test(v);
                            setStandalone((s) => ({
                              ...s,
                              paymentMethodLabel: v,
                              alreadyPaid: card ? false : s.alreadyPaid || true,
                            }));
                          }}
                          className={fieldClass}
                        >
                          {MANUAL_PAYMENT_METHODS.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                        {!isCardCollect && (
                          <label className="inline-flex items-center gap-2 text-sm text-gray-800">
                            <input
                              type="checkbox"
                              checked={standalone.alreadyPaid}
                              onChange={(e) =>
                                setStandalone((s) => ({
                                  ...s,
                                  alreadyPaid: e.target.checked,
                                }))
                              }
                              className="rounded border-gray-300"
                            />
                            Already paid
                          </label>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={
                            busyId === "save_draft" ||
                            busyId === "issue_standalone" ||
                            Boolean(pendingCard)
                          }
                          onClick={() => void saveDraft()}
                          className="w-full min-h-11 rounded-lg text-sm font-semibold border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 disabled:opacity-40"
                        >
                          {busyId === "save_draft"
                            ? "Saving…"
                            : editingDraftId
                              ? "Update draft"
                              : "Save as Draft"}
                        </button>
                        <button
                          type="button"
                          disabled={
                            busyId === "issue_standalone" ||
                            busyId === "save_draft" ||
                            Boolean(pendingCard)
                          }
                          onClick={() => void issueStandalone()}
                          className="w-full min-h-11 rounded-lg text-sm font-semibold bg-gradient-to-b from-[#D4AF6E] to-[#C9A063] text-[#1a1a1a] shadow-sm disabled:opacity-40"
                        >
                          {busyId === "issue_standalone"
                            ? "Creating…"
                            : isCardCollect
                              ? editingDraftId
                                ? "Issue & collect"
                                : "Create & collect payment"
                              : "Issue invoice"}
                        </button>
                      </div>
                      <p className="text-[11px] text-gray-500 text-center leading-snug">
                        {isCardCollect
                          ? "Draft = no email. Collect = email only after Stripe succeeds."
                          : "Draft = no email. Issue sends invoice email (if already paid)."}
                      </p>
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          </div>
        </section>

        {pendingCard && (
          <section className="rounded-2xl border border-[#C9A063]/40 bg-[#C9A063]/5 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Collect payment · {pendingCard.invoiceNumber}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {pendingCard.bookingId} · ${pendingCard.total.toFixed(2)} CAD — no
                  customer invoice email until paid
                </p>
              </div>
              <button
                type="button"
                className="text-xs font-semibold text-gray-600 hover:underline"
                onClick={() => setPendingCard(null)}
              >
                Dismiss
              </button>
            </div>

            <div className="space-y-2">
              <label className={labelClass}>Payment link (WhatsApp / email)</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  readOnly
                  value={pendingCard.paymentUrl}
                  className={`${fieldClass} font-mono text-xs`}
                />
                <button
                  type="button"
                  onClick={() => void copyPaymentLink()}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-gray-200 bg-white hover:bg-gray-50"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </button>
                <a
                  href={pendingCard.paymentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-gray-200 bg-white hover:bg-gray-50"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open
                </a>
              </div>
            </div>

            <div className="pt-2 border-t border-[#C9A063]/20">
              <p className="text-xs text-gray-600 mb-3">
                Or enter the card here (phone / WhatsApp) — Stripe secure form
              </p>
              <AdminInvoiceCardPay
                clientSecret={pendingCard.clientSecret}
                onSuccess={(pi) => void onCardPaid(pi)}
                onError={(err) => setMessage(err)}
              />
            </div>
          </section>
        )}

        {/* Search + table */}
        <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="p-4 border-b border-gray-100 space-y-3">
            <div className="flex flex-col lg:flex-row gap-2 lg:items-end lg:justify-between">
              <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:items-end flex-1">
                <div className="w-full sm:max-w-xs">
                  <label className={labelClass}>Search</label>
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Booking, invoice #, email…"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className={labelClass}>From date</label>
                  <input
                    type="date"
                    value={dateFrom}
                    max={dateTo || undefined}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm min-h-[40px]"
                  />
                </div>
                <div>
                  <label className={labelClass}>To date</label>
                  <input
                    type="date"
                    value={dateTo}
                    min={dateFrom || undefined}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm min-h-[40px]"
                  />
                </div>
                {(dateFrom || dateTo) && (
                  <button
                    type="button"
                    onClick={() => {
                      setDateFrom("");
                      setDateTo("");
                    }}
                    className="text-xs font-semibold text-gray-600 hover:underline px-1 py-2"
                  >
                    Clear dates
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => void postAction({ action: "process_jobs" })}
                className="text-xs font-semibold text-[#8B6914] hover:underline shrink-0"
              >
                Process pending jobs now
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-gray-600">
              <span>
                Showing{" "}
                <span className="font-semibold text-gray-900">
                  {invoices.length}
                </span>
                {matchedCount > invoices.length || listTruncated ? (
                  <>
                    {" "}
                    of{" "}
                    <span className="font-semibold text-gray-900">
                      {matchedCount}
                    </span>
                  </>
                ) : null}{" "}
                invoice{matchedCount === 1 ? "" : "s"}
                {dateFrom || dateTo ? (
                  <>
                    {" "}
                    ·{" "}
                    <span className="font-medium text-[#8B6914]">
                      {(() => {
                        let from = dateFrom;
                        let to = dateTo;
                        if (from && !to) to = from;
                        if (to && !from) from = to;
                        if (from && to && from > to) {
                          const tmp = from;
                          from = to;
                          to = tmp;
                        }
                        if (from && to && from === to) return from;
                        return [from || "…", to || "…"].join(" → ");
                      })()}
                    </span>
                    <span className="text-gray-400"> (Toronto)</span>
                  </>
                ) : null}
              </span>
              {listTruncated ? (
                <span className="text-amber-800">
                  {dateFrom || dateTo
                    ? "List capped — narrow the date range to see every invoice."
                    : "Showing latest only — pick a date (or range) for a full count."}
                </span>
              ) : null}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3 whitespace-nowrap">Date</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">QB</th>
                  <th className="px-4 py-3">Dropbox</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                      Loading…
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                      No invoices yet
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50/80">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900 flex items-center gap-2 flex-wrap">
                          {inv.invoiceNumber}
                          {(inv.isDraft ||
                            String(inv.status || "").toUpperCase() === "DRAFT") && (
                            <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide bg-amber-50 text-amber-900 ring-1 ring-amber-200">
                              DRAFT
                            </span>
                          )}
                          {(inv.source || "").toUpperCase() === "MANUAL" && (
                            <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide bg-slate-100 text-slate-700 ring-1 ring-slate-200">
                              MANUAL
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {inv.bookingId} · {inv.kind}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {(() => {
                          const { date, time } = formatInvoiceCreatedAt(
                            inv.createdAt
                          );
                          return (
                            <>
                              <div className="text-gray-900 font-medium tabular-nums">
                                {date}
                              </div>
                              {time ? (
                                <div className="text-xs text-gray-500 tabular-nums">
                                  {time}
                                </div>
                              ) : null}
                            </>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-900">{inv.customerName}</div>
                        <div className="text-xs text-gray-500">{inv.customerEmail}</div>
                      </td>
                      <td className="px-4 py-3 tabular-nums font-medium">
                        ${Number(inv.total).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">{paymentStatusBadge(inv)}</td>
                      <td className="px-4 py-3">
                        {inv.isDraft ||
                        String(inv.status || "").toUpperCase() === "DRAFT"
                          ? badge("DRAFT")
                          : badge(inv.emailStatus)}
                      </td>
                      <td className="px-4 py-3">{badge(inv.qbSyncStatus)}</td>
                      <td className="px-4 py-3">{badge(inv.dropboxSyncStatus)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-nowrap items-center gap-0">
                          <a
                            href={`/api/admin/billing/invoices/${encodeURIComponent(inv.id)}/pdf`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-[#C9A063]/15 text-[#8B6914] ring-1 ring-[#C9A063]/35 hover:bg-[#C9A063]/25"
                          >
                            <FileText className="w-3 h-3" />
                            PDF
                          </a>
                          <span
                            className="mx-2 h-5 w-px shrink-0 bg-gray-300"
                            aria-hidden
                          />
                          {inv.isDraft ||
                          String(inv.status || "").toUpperCase() === "DRAFT" ? (
                            <button
                              type="button"
                              disabled={
                                busyId === `load_invoice_${inv.id}` ||
                                Boolean(pendingCard)
                              }
                              onClick={() => void loadInvoiceIntoForm(inv.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-white text-gray-800 ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-40 whitespace-nowrap"
                            >
                              <Pencil className="w-3 h-3" />
                              Edit
                            </button>
                          ) : inv.paymentHeld ? (
                            <button
                              type="button"
                              disabled={busyId === inv.id || Boolean(pendingCard)}
                              onClick={() =>
                                void beginPaymentCollect({
                                  invoiceId: inv.id,
                                  invoiceNumber: inv.invoiceNumber,
                                  bookingId: inv.bookingId,
                                  total: Number(inv.total),
                                })
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100 disabled:opacity-40 whitespace-nowrap"
                            >
                              Collect
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={busyId === inv.id}
                              onClick={() =>
                                void postAction({ action: "resend", invoiceId: inv.id })
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-40"
                            >
                              <Send className="w-3 h-3" />
                              Resend
                            </button>
                          )}
                          {inv.kind === "STANDARD" && (
                            <>
                              <span
                                className="mx-2 h-5 w-px shrink-0 bg-gray-300"
                                aria-hidden
                              />
                              <button
                                type="button"
                                disabled={
                                  busyId === `dup_${inv.id}` ||
                                  busyId === `load_invoice_${inv.id}` ||
                                  Boolean(pendingCard)
                                }
                                onClick={() => void duplicateInvoice(inv.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-40 whitespace-nowrap"
                              >
                                <CopyPlus className="w-3 h-3" />
                                Duplicate
                              </button>
                            </>
                          )}
                          {inv.emailStatus === "FAILED" &&
                            !inv.paymentHeld &&
                            !inv.isDraft &&
                            String(inv.status || "").toUpperCase() !== "DRAFT" && (
                            <>
                              <span
                                className="mx-2 h-5 w-px shrink-0 bg-gray-300"
                                aria-hidden
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  void postAction({
                                    action: "retry",
                                    invoiceId: inv.id,
                                    type: "EMAIL",
                                  })
                                }
                                className="inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-semibold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50 whitespace-nowrap"
                              >
                                Retry email
                              </button>
                            </>
                          )}
                          {inv.qbSyncStatus === "FAILED" && (
                            <>
                              <span
                                className="mx-2 h-5 w-px shrink-0 bg-gray-300"
                                aria-hidden
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  void postAction({
                                    action: "retry",
                                    invoiceId: inv.id,
                                    type: "QBO_SYNC",
                                  })
                                }
                                className="inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-semibold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50 whitespace-nowrap"
                              >
                                Retry QB
                              </button>
                            </>
                          )}
                          {inv.dropboxSyncStatus === "FAILED" && (
                            <>
                              <span
                                className="mx-2 h-5 w-px shrink-0 bg-gray-300"
                                aria-hidden
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  void postAction({
                                    action: "retry",
                                    invoiceId: inv.id,
                                    type: "DROPBOX_SYNC",
                                  })
                                }
                                className="inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-semibold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50 whitespace-nowrap"
                              >
                                Retry Dropbox
                              </button>
                            </>
                          )}
                          <span
                            className="mx-2 h-5 w-px shrink-0 bg-gray-300"
                            aria-hidden
                          />
                          <button
                            type="button"
                            disabled={busyId === inv.id}
                            onClick={() => {
                              if (
                                !confirm(
                                  `Delete invoice ${inv.invoiceNumber}?\n\nThis permanently removes it from Billing. This cannot be undone.`
                                )
                              ) {
                                return;
                              }
                              void postAction({
                                action: "delete_invoice",
                                invoiceId: inv.id,
                              });
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50 disabled:opacity-40"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {tipModalOpen ? (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label="Close"
            onClick={() => setTipModalOpen(false)}
          />
          <div className="relative z-[81] w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl px-5 pt-3 pb-6 shadow-xl">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-300 sm:hidden" />
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[22px] font-bold text-gray-900">
                Admin, Fuel &amp; Grat
              </h3>
              <button
                type="button"
                onClick={() => setTipModalOpen(false)}
                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[13px] text-gray-500 mb-4">
              Administration Fuel and Gratuity. You can increase it to 20% or 25%.
            </p>
            <div className="grid grid-cols-3 gap-2.5">
              {APP_GRATUITY_PERCENTS.map((pct) => {
                const selected = gratuityPercent === pct;
                return (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => applyGratuityPercent(pct)}
                    className={`min-h-[72px] rounded-2xl border-2 text-[22px] font-bold ${
                      selected
                        ? "bg-gray-900 border-gray-900 text-white"
                        : "bg-[#f8fafc] border-gray-200 text-gray-900"
                    }`}
                  >
                    {pct}%
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </GoogleMapsProvider>
  );
}
