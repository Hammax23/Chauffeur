import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key";

function getAllowedAudiences(): string[] {
  const raw =
    process.env.GOOGLE_OAUTH_CLIENT_IDS ||
    process.env.GOOGLE_OAUTH_CLIENT_ID ||
    "";
  return [...new Set(raw.split(",").map((s) => s.trim()).filter(Boolean))];
}

function issueCustomerJwt(customer: { id: string; email: string }) {
  return jwt.sign(
    { id: customer.id, email: customer.email, type: "customer" },
    JWT_SECRET,
    { expiresIn: "30d" }
  );
}

function customerPayload(customer: {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string | null;
  photo: string | null;
}) {
  return {
    id: customer.id,
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
    phone: customer.phone,
    city: customer.city,
    photo: customer.photo,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();
    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing Google token" },
        { status: 400 }
      );
    }

    const allowedAud = getAllowedAudiences();
    if (allowedAud.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Google Sign In is temporarily unavailable. Please use email login.",
        },
        { status: 503 }
      );
    }

    const client = new OAuth2Client();
    let payload;
    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: allowedAud,
      });
      payload = ticket.getPayload();
    } catch (err: unknown) {
      console.error("[google-oauth] token verify failed", {
        allowedAud,
        message: err instanceof Error ? err.message : String(err),
      });
      return NextResponse.json(
        {
          success: false,
          error: "Sign in with Google failed. Please try again or use email login.",
          ...(process.env.NODE_ENV !== "production"
            ? { allowedAudiences: allowedAud }
            : {}),
        },
        { status: 401 }
      );
    }

    if (!payload?.sub || !payload.email) {
      return NextResponse.json(
        { success: false, error: "Invalid Google token" },
        { status: 401 }
      );
    }

    if (payload.email_verified !== true) {
      return NextResponse.json(
        {
          success: false,
          error: "Google email is not verified. Please verify your email with Google and try again.",
        },
        { status: 403 }
      );
    }

    const oauthProvider = "google";
    const oauthSub = payload.sub;
    const email = payload.email.toLowerCase();

    const existingLinked = await prisma.customer.findFirst({
      where: { oauthProvider, oauthSub },
    });

    if (existingLinked) {
      const token = issueCustomerJwt(existingLinked);
      return NextResponse.json({
        success: true,
        message: "Login successful",
        token,
        customer: customerPayload(existingLinked),
      });
    }

    const existingByEmail = await prisma.customer.findUnique({
      where: { email },
    });
    if (existingByEmail && !existingByEmail.oauthProvider) {
      return NextResponse.json(
        {
          success: false,
          error: "Account already exists with this email. Please login with password.",
        },
        { status: 409 }
      );
    }

    if (existingByEmail?.oauthProvider && existingByEmail.oauthProvider !== "google") {
      return NextResponse.json(
        {
          success: false,
          error:
            "This email is already linked to a different sign-in method. Please use your original login.",
        },
        { status: 409 }
      );
    }

    if (existingByEmail?.oauthProvider === "google" && existingByEmail.oauthSub === oauthSub) {
      const token = issueCustomerJwt(existingByEmail);
      return NextResponse.json({
        success: true,
        message: "Login successful",
        token,
        customer: customerPayload(existingByEmail),
      });
    }

    const randomPassword = crypto.randomBytes(24).toString("base64url");
    const hashedPassword = await bcrypt.hash(randomPassword, 12);

    const firstName =
      (payload.given_name || payload.name?.split(" ")[0] || "Customer").slice(0, 60);
    const lastName =
      (payload.family_name || payload.name?.split(" ").slice(1).join(" ") || "")
        .trim()
        .slice(0, 60);

    const customer = await prisma.customer.create({
      data: {
        firstName,
        lastName,
        email,
        phone: "",
        password: hashedPassword,
        photo: (payload.picture as string | undefined) || null,
        oauthProvider,
        oauthSub,
        registrationSource: "app",
      },
    });

    const token = issueCustomerJwt(customer);
    return NextResponse.json({
      success: true,
      message: "Login successful",
      token,
      customer: customerPayload(customer),
    });
  } catch (error: unknown) {
    console.error("Google OAuth error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Sign in with Google failed. Please try again or use email login.",
        ...(process.env.NODE_ENV !== "production" && error instanceof Error
          ? { details: error.message }
          : {}),
      },
      { status: 500 }
    );
  }
}
