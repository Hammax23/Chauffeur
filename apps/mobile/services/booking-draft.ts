import * as SecureStore from "expo-secure-store";

/**
 * Booking draft between create → confirm. Avoids putting PII in Expo Router params.
 */

const DRAFT_KEY = "sarj_booking_draft_v1";

export type BookingDraft = {
  serviceType: string;
  pickupAddress: string;
  dropoffAddress: string;
  stopAddress: string;
  serviceDate: string;
  serviceTime: string;
  pickupTimeDisplay: string;
  passengers: string;
  vehicle: string;
  vehicleId: string;
  vehicleSubtitle: string;
  vehiclePrice: string;
  rideFare: string;
  pricePerKm: string;
  hourlyRate: string;
  distanceText: string;
  durationText: string;
  distanceMeters: string;
  durationSeconds: string;
  tollRoute: string;
  childSeatCount: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  seating?: string;
};

export async function saveBookingDraft(draft: BookingDraft): Promise<void> {
  await SecureStore.setItemAsync(DRAFT_KEY, JSON.stringify(draft));
}

export async function loadBookingDraft(): Promise<BookingDraft | null> {
  try {
    const raw = await SecureStore.getItemAsync(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BookingDraft;
  } catch {
    return null;
  }
}

export async function clearBookingDraft(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}
