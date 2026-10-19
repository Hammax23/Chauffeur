/**
 * Strip payment / Stripe internals from notes shown to chauffeurs.
 * Kept in DB for admin lookup; never expose to the driver app.
 */
export function sanitizeSpecialRequirementsForDriver(
  raw: string | null | undefined
): string {
  if (!raw?.trim()) return "";

  return raw
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => {
      const t = line.trim();
      if (!t) return false;
      // "Stripe payment: pi_..."
      if (/^stripe\s*payment\s*:/i.test(t)) return false;
      // Bare payment-intent id lines
      if (/^pi_[A-Za-z0-9]+$/.test(t)) return false;
      // Any line that is only Stripe PI metadata
      if (/stripe/i.test(t) && /\bpi_[A-Za-z0-9]{8,}\b/.test(t)) return false;
      return true;
    })
    .join("\n")
    .trim();
}
