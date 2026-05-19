/** Ride finished or cancelled — driver may take another assignment. */
export const TERMINAL_RESERVATION_STATUSES = ["DONE", "CANCELLED"] as const;

export function isReservationTerminal(status: string): boolean {
  return (TERMINAL_RESERVATION_STATUSES as readonly string[]).includes(status);
}

/** True if this driver is assigned to a different booking that is still active. */
export function isDriverLockedOnAnotherReservation(
  driverId: string,
  currentBookingId: string,
  reservations: ReadonlyArray<{
    bookingId: string;
    assignedDriverId?: string | null;
    status: string;
  }>
): boolean {
  return reservations.some(
    (r) =>
      r.bookingId !== currentBookingId &&
      r.assignedDriverId === driverId &&
      !isReservationTerminal(r.status)
  );
}
