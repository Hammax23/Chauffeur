import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getAppJwtSecret } from "@/lib/app-jwt-secret";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = await checkRateLimit(`concierge-login:${ip}`, {
      maxRequests: 10,
      windowMs: 15 * 60 * 1000,
    });
    if (!rl.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many login attempts. Try again in ${rl.resetIn} seconds.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    const concierge = await prisma.concierge.findUnique({
      where: { email },
      include: { hotel: true },
    });

    if (!concierge || !concierge.isActive || !concierge.hotel.isActive) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const ok = await bcrypt.compare(password, concierge.password);
    if (!ok) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const token = jwt.sign(
      {
        id: concierge.id,
        email: concierge.email,
        hotelId: concierge.hotelId,
        type: "concierge",
      },
      getAppJwtSecret(),
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
    console.error("Concierge login error:", error);
    return NextResponse.json({ success: false, error: "Login failed" }, { status: 500 });
  }
}
