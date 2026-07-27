import "server-only";
import prisma from "@/lib/prisma";
import { sendSms } from "@/lib/twilio-sms";
import { buildDriverAssignmentCopy } from "@/lib/driver-push";

/**
 * SMS the assigned driver when admin/ops manually assigns a reservation.
 * Never throws — failures are logged only so assign API still succeeds.
 */
export async function notifyDriverAssignmentSms(
  bookingId: string,
  driverId?: string
): Promise<void> {
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { bookingId },
      select: {
        bookingId: true,
        status: true,
        pickupLocation: true,
        dropoffLocation: true,
        serviceDate: true,
        serviceTime: true,
        assignedDriverId: true,
        assignedDriver: { select: { id: true, phone: true, name: true } },
      },
    });

    if (!reservation) return;
    if (reservation.status !== "PENDING") return;

    const targetDriverId = driverId || reservation.assignedDriverId;
    if (!targetDriverId) return;

    let phone = reservation.assignedDriver?.phone ?? null;
    if (!phone || reservation.assignedDriver?.id !== targetDriverId) {
      const driver = await prisma.driver.findUnique({
        where: { id: targetDriverId },
        select: { phone: true },
      });
      phone = driver?.phone ?? null;
    }

    if (!phone?.trim()) {
      console.warn("[notifyDriverAssignmentSms] No phone for driver", targetDriverId);
      return;
    }

    const { title, body } = buildDriverAssignmentCopy(reservation);
    const smsBody = [
      `SARJ: ${title}`,
      body,
      `Booking ${reservation.bookingId}`,
      "Open the driver app to Accept or Reject.",
    ].join("\n");

    const result = await sendSms(phone, smsBody);
    if (!result.ok) {
      console.error("[notifyDriverAssignmentSms]", result.error);
    }
  } catch (error) {
    console.error("[notifyDriverAssignmentSms]", error);
  }
}
