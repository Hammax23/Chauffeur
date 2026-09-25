/**
 * Customer-facing chauffeur visibility.
 * Admin/ops may assign before the driver accepts; customers only see a chauffeur
 * after acceptance (or web-channel auto-accept which sets driverResponse=ACCEPTED).
 */

export type CustomerDriverFields = {
  name: string;
  phone: string | null;
  photo: string | null;
  vehicle: string | null;
  vehiclePlate: string | null;
  rating: number | null;
};

export function isDriverVisibleToCustomer(r: {
  status: string;
  driverResponse?: string | null;
}): boolean {
  // Primary rule: only after chauffeur accepted (incl. web-channel auto-accept).
  if (r.driverResponse === "ACCEPTED") return true;
  if (r.driverResponse != null) return false;

  // Legacy rows that never wrote driverResponse but already progressed past assign.
  // Do NOT treat status ACCEPTED alone as visible — admin reassign keeps that status
  // until we roll it back, and must not leak the new unaccepted assignee.
  const legacyVisible = new Set(["ON THE WAY", "ARRIVED", "CIC", "STOP", "DONE"]);
  return legacyVisible.has(r.status);
}

export function serializeCustomerDriver(
  status: string,
  assignedDriver: {
    name: string;
    phone: string | null;
    photo: string | null;
    vehicle: string | null;
    vehiclePlate: string | null;
    rating: number | null;
  } | null | undefined,
  driverResponse?: string | null
): CustomerDriverFields | null {
  if (!assignedDriver) return null;
  if (!isDriverVisibleToCustomer({ status, driverResponse })) return null;

  const historyLocked =
    status === "DONE" || status === "CANCELLED" || status === "CANCELED";

  return {
    name: assignedDriver.name,
    phone: historyLocked ? null : assignedDriver.phone,
    photo: assignedDriver.photo,
    vehicle: assignedDriver.vehicle,
    vehiclePlate: assignedDriver.vehiclePlate,
    rating: assignedDriver.rating,
  };
}
