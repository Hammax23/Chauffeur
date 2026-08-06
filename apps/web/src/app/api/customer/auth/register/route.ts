import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { validatePassword } from "@/lib/password-policy";
import { formatUsCanadaE164, phoneLookupVariants, validateUsCanadaPhone } from "@/lib/phone-us-ca";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { firstName, lastName, email, phone, password, city, source, phoneVerificationToken } =
      body;

    if (!firstName || !lastName || !email || !phone || !password) {
      return NextResponse.json(
        { success: false, error: "All required fields must be provided" },
        { status: 400 }
      );
    }

    if (!phoneVerificationToken || typeof phoneVerificationToken !== "string") {
      return NextResponse.json(
        { success: false, error: "Please verify your phone number first." },
        { status: 400 }
      );
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json(
        { success: false, error: passwordError },
        { status: 400 }
      );
    }

    const phoneError = validateUsCanadaPhone(phone);
    if (phoneError) {
      return NextResponse.json(
        { success: false, error: phoneError },
        { status: 400 }
      );
    }

    const normalizedPhone = formatUsCanadaE164(String(phone));
    if (!normalizedPhone) {
      return NextResponse.json(
        { success: false, error: "Enter a valid US or Canada (+1) phone number." },
        { status: 400 }
      );
    }

    try {
      const verified = jwt.verify(phoneVerificationToken, JWT_SECRET) as {
        phone?: string;
        purpose?: string;
      };
      if (verified.purpose !== "phone_verify" || verified.phone !== normalizedPhone) {
        return NextResponse.json(
          { success: false, error: "Phone verification expired. Please verify again." },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { success: false, error: "Phone verification expired. Please verify again." },
        { status: 400 }
      );
    }

    // Check if customer already exists (email or phone)
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { phone: { in: phoneLookupVariants(String(phone)) } },
        ],
      },
      select: { id: true, email: true },
    });

    if (existingCustomer) {
      const sameEmail = existingCustomer.email === email.toLowerCase();
      return NextResponse.json(
        {
          success: false,
          error: sameEmail
            ? "An account with this email already exists"
            : "This phone number is already registered.",
        },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create customer
    const customer = await prisma.customer.create({
      data: {
        firstName,
        lastName,
        email: email.toLowerCase(),
        phone: normalizedPhone,
        password: hashedPassword,
        city: city || null,
        registrationSource: source === "app" ? "app" : "web",
      },
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: customer.id, email: customer.email, type: "customer" },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    return NextResponse.json({
      success: true,
      message: "Account created successfully",
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
    console.error("Register error:", error);
    return NextResponse.json(
      { success: false, error: "Registration failed" },
      { status: 500 }
    );
  }
}
