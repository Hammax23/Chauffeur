import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  blockedCustomerResponse,
  canCustomerSelfReactivate,
  deactivatedCustomerResponse,
  isCustomerBlocked,
  isCustomerDeactivated,
} from "@/lib/customer-auth";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key";

/**
 * POST /api/customer/account/reactivate
 * Restores a self-deactivated account within the recovery window (email + password).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.findUnique({
      where: { email },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (isCustomerBlocked(customer)) {
      return NextResponse.json(blockedCustomerResponse(), { status: 403 });
    }

    if (!isCustomerDeactivated(customer)) {
      return NextResponse.json(
        { success: false, error: "This account is not deactivated" },
        { status: 400 }
      );
    }

    const { ok: withinWindow, until } = canCustomerSelfReactivate(customer);
    if (!withinWindow) {
      return NextResponse.json(
        deactivatedCustomerResponse({ canReactivate: false, reactivatesUntil: null }),
        { status: 403 }
      );
    }

    const valid = await bcrypt.compare(password, customer.password);
    if (!valid) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const updated = await prisma.customer.update({
      where: { id: customer.id },
      data: {
        accountStatus: "ACTIVE",
        deactivatedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        city: true,
        photo: true,
      },
    });

    const token = jwt.sign(
      { id: updated.id, email: updated.email, type: "customer" },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    return NextResponse.json({
      success: true,
      message: "Account reactivated",
      token,
      customer: updated,
      reactivatedWithin: until?.toISOString() ?? null,
    });
  } catch (error) {
    console.error("[customer/account/reactivate]", error);
    return NextResponse.json(
      { success: false, error: "Failed to reactivate account" },
      { status: 500 }
    );
  }
}
