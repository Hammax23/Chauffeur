import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json({ success: false, error: "Email and password are required" }, { status: 400 });
    }

    const concierge = await prisma.concierge.findUnique({
      where: { email },
      include: { hotel: true },
    });

    if (!concierge || !concierge.isActive || !concierge.hotel.isActive) {
      return NextResponse.json({ success: false, error: "Invalid email or password" }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, concierge.password);
    if (!ok) {
      return NextResponse.json({ success: false, error: "Invalid email or password" }, { status: 401 });
    }

    const token = jwt.sign(
      { id: concierge.id, email: concierge.email, hotelId: concierge.hotelId, type: "concierge" },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    return NextResponse.json({
      success: true,
      token,
      concierge: {
        id: concierge.id,
        name: concierge.name,
        email: concierge.email,
        phone: concierge.phone,
        hotelId: concierge.hotelId,
        hotelName: concierge.hotel.name,
        hotelCommissionPercent: concierge.hotel.commissionPercent,
      },
    });
  } catch (error) {
    console.error("[concierge login]", error);
    return NextResponse.json({ success: false, error: "Login failed" }, { status: 500 });
  }
}
