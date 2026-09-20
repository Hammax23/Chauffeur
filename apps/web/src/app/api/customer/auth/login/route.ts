import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { blockedCustomerResponse, canCustomerSelfReactivate, deactivatedCustomerResponse, isCustomerBlocked, isCustomerDeactivated } from "@/lib/customer-auth";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
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
      JWT_SECRET,
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
