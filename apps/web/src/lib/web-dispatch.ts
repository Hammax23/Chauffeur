import "server-only";
import prisma from "@/lib/prisma";
import { sendSms } from "@/lib/twilio-sms";
import { sendTransactionalEmail } from "@/lib/email-delivery";
import {
  buildWebDispatchCustomerEmail,
  buildWebDispatchDriverEmail,
} from "@/lib/email-templates";

function siteBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://sarjworldwide.ca").replace(/\/$/, "");
}

function ensureDriverLink(bookingId: string, existing?: string | null): string {
  if (existing?.trim()) return existing.trim();
  return `${siteBaseUrl()}/driver/${bookingId}`;
}

function ensureTrackLink(bookingId: string, existing?: string | null): string {
  if (existing?.trim()) return existing.trim();
  return `${siteBaseUrl()}/track/${bookingId}`;
}

/**
 * After web-channel assign: email + SMS driver with /driver link and customer with /track link.
 * Never throws — failures are logged so assign API still succeeds.
 */
export async function notifyWebDispatchAssignment(
  bookingId: string,
  driverId?: string
): Promise<void> {
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { bookingId },
      select: {
        bookingId: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        pickupLocation: true,
        dropoffLocation: true,
        serviceDate: true,
        serviceTime: true,
        driverLink: true,
        trackLink: true,
        assignedDriverId: true,
        assignedDriver: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
    });

    if (!reservation) return;

    const targetDriverId = driverId || reservation.assignedDriverId;
    if (!targetDriverId) return;

    let driver = reservation.assignedDriver;
    if (!driver || driver.id !== targetDriverId) {
      driver = await prisma.driver.findUnique({
        where: { id: targetDriverId },
        select: { id: true, name: true, email: true, phone: true },
      });
    }
    if (!driver) return;

    const driverLink = ensureDriverLink(bookingId, reservation.driverLink);
    const trackLink = ensureTrackLink(bookingId, reservation.trackLink);
    const passengerName = `${reservation.firstName} ${reservation.lastName}`.trim();

    // Persist links if they were missing at create time
    if (
      reservation.driverLink !== driverLink ||
      reservation.trackLink !== trackLink
    ) {
      await prisma.reservation
        .update({
          where: { bookingId },
          data: { driverLink, trackLink },
        })
        .catch((err) => console.error("[web-dispatch] ensure links", err));
    }

    const driverHtml = buildWebDispatchDriverEmail({
      driverName: driver.name,
      bookingId: reservation.bookingId,
      pickupLocation: reservation.pickupLocation,
      dropoffLocation: reservation.dropoffLocation,
      serviceDate: reservation.serviceDate,
      serviceTime: reservation.serviceTime,
      passengerName,
      driverLink,
    });

    const customerHtml = buildWebDispatchCustomerEmail({
      customerName: reservation.firstName || "Guest",
      bookingId: reservation.bookingId,
      pickupLocation: reservation.pickupLocation,
      dropoffLocation: reservation.dropoffLocation,
      serviceDate: reservation.serviceDate,
      serviceTime: reservation.serviceTime,
      driverName: driver.name,
      trackLink,
    });

    await Promise.all([
      driver.email?.trim()
        ? sendTransactionalEmail({
            to: driver.email.trim(),
            subject: `SARJ trip assigned — ${reservation.bookingId}`,
            html: driverHtml,
            logLabel: "web-dispatch-driver",
          })
        : Promise.resolve(false),
      reservation.email?.trim()
        ? sendTransactionalEmail({
            to: reservation.email.trim(),
            subject: `Your chauffeur is assigned — ${reservation.bookingId}`,
            html: customerHtml,
            logLabel: "web-dispatch-customer",
          })
        : Promise.resolve(false),
    ]);

    if (driver.phone?.trim()) {
      const sms = [
        `SARJ: Trip assigned (${reservation.bookingId})`,
        `${reservation.serviceDate} ${reservation.serviceTime}`,
        `Pickup: ${reservation.pickupLocation}`,
        `Open your driver page:`,
        driverLink,
      ].join("\n");
      const result = await sendSms(driver.phone, sms);
      if (!result.ok) {
        console.error("[web-dispatch] driver sms", result.error);
      }
    } else {
      console.warn("[web-dispatch] No phone for driver", targetDriverId);
    }

    if (reservation.phone?.trim()) {
      const sms = [
        `SARJ: Your chauffeur ${driver.name} is assigned (${reservation.bookingId}).`,
        `Track your ride:`,
        trackLink,
      ].join("\n");
      const result = await sendSms(reservation.phone, sms);
      if (!result.ok) {
        console.error("[web-dispatch] customer sms", result.error);
      }
    }
  } catch (error) {
    console.error("[web-dispatch]", error);
  }
}
