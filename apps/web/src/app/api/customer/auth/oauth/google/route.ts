import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key";

function getAllowedAudiences() {
  const raw =
    process.env.GOOGLE_OAUTH_CLIENT_IDS ||
    process.env.GOOGLE_OAUTH_CLIENT_ID ||
    "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function issueCustomerJwt(customer: { id: string; email: string }) {
  return jwt.sign(
    { id: customer.id, email: customer.email, type: "customer" },
    JWT_SECRET,
    { expiresIn: "30d" }
  );
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
        { success: false, error: "Google OAuth is not configured" },
        { status: 500 }
      );
    }

    const client = new OAuth2Client();
    const ticket = await client.verifyIdToken({
      idToken,
      audience: allowedAud,
    });

    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) {
      return NextResponse.json(
        { success: false, error: "Invalid Google token" },
        { status: 401 }
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
        customer: {
          id: existingLinked.id,
          firstName: existingLinked.firstName,
          lastName: existingLinked.lastName,
          email: existingLinked.email,
          phone: existingLinked.phone,
          city: existingLinked.city,
          photo: existingLinked.photo,
        },
      });
    }

    // Prevent silent takeover of password-based accounts
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

    // Create a new customer (or attach provider to an already-provider account with same email)
    const randomPassword = crypto.randomBytes(24).toString("base64url");
    const hashedPassword = await bcrypt.hash(randomPassword, 12);

    const firstName =
      (payload.given_name || payload.name?.split(" ")[0] || "Customer").slice(0, 60);
    const lastName =
      (payload.family_name || payload.name?.split(" ").slice(1).join(" ") || "")
        .trim()
        .slice(0, 60);

    const customer =
      existingByEmail && existingByEmail.oauthProvider
        ? await prisma.customer.update({
            where: { id: existingByEmail.id },
            data: {
              oauthProvider,
              oauthSub,
              photo: existingByEmail.photo || (payload.picture as string | undefined) || null,
              registrationSource: existingByEmail.registrationSource || "app",
            },
          })
        : await prisma.customer.create({
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
    console.error("Google OAuth error:", error);
    return NextResponse.json(
      { success: false, error: "Google login failed" },
      { status: 500 }
    );
  }
}

