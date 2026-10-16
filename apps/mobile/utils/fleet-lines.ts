/** One fleet type + quantity on a single trip booking. */
export type FleetLine = {
  tierId: string;
  quantity: number;
};

export const MAX_FLEET_UNITS = 5;

export function normalizeFleetLines(lines: FleetLine[]): FleetLine[] {
  const merged = new Map<string, number>();
  for (const line of lines) {
    const id = String(line?.tierId || "").trim();
    if (!id) continue;
    const q = Math.max(1, Math.min(MAX_FLEET_UNITS, Math.floor(Number(line.quantity) || 1)));
    merged.set(id, Math.min(MAX_FLEET_UNITS, (merged.get(id) || 0) + q));
  }
  const out: FleetLine[] = [];
  let total = 0;
  for (const [tierId, quantity] of merged) {
    if (total >= MAX_FLEET_UNITS) break;
    const q = Math.min(quantity, MAX_FLEET_UNITS - total);
    if (q < 1) continue;
    out.push({ tierId, quantity: q });
    total += q;
  }
  return out;
}

export function totalFleetUnits(lines: FleetLine[]): number {
  return normalizeFleetLines(lines).reduce((sum, l) => sum + l.quantity, 0);
}

export function formatFleetLinesLabel(
  lines: FleetLine[],
  titleFor: (tierId: string) => string
): string {
  return normalizeFleetLines(lines)
    .map((l) => {
      const title = titleFor(l.tierId) || "Vehicle";
      return l.quantity > 1 ? `${title} ×${l.quantity}` : title;
    })
    .join(", ");
}

export function upsertFleetLine(
  lines: FleetLine[],
  tierId: string,
  quantityDelta = 1
): FleetLine[] {
  const id = tierId.trim();
  if (!id) return normalizeFleetLines(lines);
  const next = normalizeFleetLines(lines).map((l) => ({ ...l }));
  const idx = next.findIndex((l) => l.tierId === id);
  const room = MAX_FLEET_UNITS - totalFleetUnits(next);
  if (idx >= 0) {
    if (quantityDelta > 0 && room < 1) return next;
    const add = quantityDelta > 0 ? Math.min(quantityDelta, room) : quantityDelta;
    next[idx] = {
      ...next[idx],
      quantity: Math.max(1, next[idx].quantity + add),
    };
    return normalizeFleetLines(next);
  }
  if (room < 1) return next;
  next.push({ tierId: id, quantity: Math.min(Math.max(1, quantityDelta), room) });
  return normalizeFleetLines(next);
}

export function setFleetLineQuantity(
  lines: FleetLine[],
  tierId: string,
  quantity: number
): FleetLine[] {
  const id = tierId.trim();
  const next = normalizeFleetLines(lines).map((l) =>
    l.tierId === id ? { ...l, quantity: Math.max(1, Math.floor(quantity) || 1) } : l
  );
  return normalizeFleetLines(next);
}

export function removeFleetLine(lines: FleetLine[], tierId: string): FleetLine[] {
  const next = normalizeFleetLines(lines).filter((l) => l.tierId !== tierId);
  return next;
}
