/** Parcel Delivery helpers for web (same encoding as mobile). */

export const PARCEL_SERVICE_TYPE = "Parcel Delivery";

export function isParcelServiceType(serviceType?: string | null): boolean {
  const s = (serviceType || "").toLowerCase();
  return s.includes("parcel");
}

export function encodeParcelRequirements(opts: {
  recipientName: string;
  recipientPhone: string;
  parcelWeight?: string;
  parcelNote?: string;
}): string {
  const parts = [
    "PARCEL",
    `recipient=${opts.recipientName.trim()}`,
    `phone=${opts.recipientPhone.trim()}`,
  ];
  const weight = opts.parcelWeight?.trim();
  if (weight) parts.push(`weight=${weight}`);
  const note = opts.parcelNote?.trim();
  if (note) parts.push(`note=${note}`);
  return parts.join("|");
}

export function parseParcelRequirements(text?: string | null): {
  recipientName: string;
  recipientPhone: string;
  parcelWeight: string;
  parcelNote: string;
} | null {
  if (!text || !text.includes("PARCEL")) return null;
  const get = (key: string) => {
    const m = text.match(new RegExp(`${key}=([^|\\n]+)`));
    return m?.[1]?.trim() || "";
  };
  return {
    recipientName: get("recipient"),
    recipientPhone: get("phone"),
    parcelWeight: get("weight"),
    parcelNote: get("note"),
  };
}

/** Normalize user weight input to a clean display string (e.g. "2.5 kg"). */
export function formatParcelWeight(raw?: string | null): string {
  const t = (raw || "").trim();
  if (!t) return "";
  if (/kg|lb|lbs/i.test(t)) return t.replace(/\s+/g, " ");
  const n = parseFloat(t.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return t;
  const rounded = Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
  return `${rounded} kg`;
}
