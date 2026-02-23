import { NextResponse } from "next/server";
import { getReservations } from "@/lib/data-store";

export async function GET() {
  try {
    const reservations = await getReservations();

    // Group reservations by email to create customer records
    const customerMap = new Map<string, {
      email: string;
      name: string;
      phone: string;
      totalBookings: number;
      totalSpent: number;
      lastBooking: string;
      lastPickup: string;
    }>();

    reservations.forEach((r) => {
      const email = r.email?.toLowerCase();
      if (!email) return;

      const existing = customerMap.get(email);
      if (existing) {
        existing.totalBookings += 1;
        existing.totalSpent += r.total || 0;
        // Update last booking if this one is more recent
        if (r.serviceDate > existing.lastBooking) {
          existing.lastBooking = r.serviceDate;
          existing.lastPickup = r.pickupLocation;
        }
      } else {
        customerMap.set(email, {
          email: r.email,
          name: `${r.firstName} ${r.lastName}`,
          phone: r.phone,
          totalBookings: 1,
          totalSpent: r.total || 0,
          lastBooking: r.serviceDate,
          lastPickup: r.pickupLocation,
        });
      }
    });

    const customers = Array.from(customerMap.values())
      .sort((a, b) => b.totalSpent - a.totalSpent);

    return NextResponse.json({ success: true, customers });
  } catch (error: any) {
    console.error("Get customers error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch customers" }, { status: 500 });
  }
}
