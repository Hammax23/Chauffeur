export type DriverTripStatus = "available" | "on_trip" | "offline";

const STATUS_COLORS: Record<
  DriverTripStatus,
  { bg: string; text: string; dot: string }
> = {
  available: { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" },
  on_trip: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
  offline: { bg: "bg-gray-100", text: "text-gray-500", dot: "bg-gray-400" },
};

export const DRIVER_STATUS_LABELS: Record<DriverTripStatus, string> = {
  available: "Available",
  on_trip: "On Trip",
  offline: "Offline",
};

function normalizeStatus(status: string | undefined | null): DriverTripStatus {
  if (status === "available" || status === "on_trip" || status === "offline") return status;
  return "offline";
}

/** Plain label for native `<option>` text, same wording as the badge. */
export function driverStatusLabel(status: string | undefined | null): string {
  return DRIVER_STATUS_LABELS[normalizeStatus(status)];
}

/** Same pill + dot treatment as admin driver cards. */
export default function DriverStatusBadge({
  status,
  className = "",
}: {
  status: string | undefined | null;
  className?: string;
}) {
  const s = normalizeStatus(status);
  const style = STATUS_COLORS[s];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text} ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot} ${s === "on_trip" ? "animate-pulse" : ""}`}
      />
      {DRIVER_STATUS_LABELS[s]}
    </span>
  );
}
