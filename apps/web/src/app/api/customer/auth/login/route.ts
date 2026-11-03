import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { blockedCustomerResponse, canCustomerSelfReactivate, deactivatedCustomerResponse, isCustomerBlocked, isCustomerDeactivated } from "@/lib/customer-auth";
import { getAppJwtSecret } from "@/lib/app-jwt-secret";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = await checkRateLimit(`customer-login:${ip}`, {
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
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    const emailKey = String(email).trim().toLowerCase();
    const emailRl = await checkRateLimit(`customer-login-email:${emailKey}`, {
      maxRequests: 8,
      windowMs: 15 * 60 * 1000,
    });
    if (!emailRl.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many login attempts. Try again in ${emailRl.resetIn} seconds.`,
        },
        { status: 429 }
      );
    }

    const customer = await prisma.customer.findUnique({
      where: { email: email.toLowerCase() },
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

    if (isCustomerDeactivated(customer)) {
      const { ok: canReactivate, until } = canCustomerSelfReactivate(customer);
      return NextResponse.json(
        deactivatedCustomerResponse({
          canReactivate,
          reactivatesUntil: until?.toISOString() ?? null,
        }),
        { status: 403 }
      );
    }

    const isValidPassword = await bcrypt.compare(password, customer.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const token = jwt.sign(
      { id: customer.id, email: customer.email, type: "customer" },
      getAppJwtSecret(),
      { expiresIn: "30d" }
    );

    return NextResponse.json({
      success: true,
      message: "Login successful",
      token,
      customer: {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        city: customer.city,
        photo: customer.photo,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "Login failed" },
      { status: 500 }
    );
  }
}
