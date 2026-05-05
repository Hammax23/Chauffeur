import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { createRemoteJWKSet, decodeJwt, jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key";

const APPLE_ISSUER = "https://appleid.apple.com";
const APPLE_JWKS = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

function getAllowedAudiences() {
  const raw =
    process.env.APPLE_CLIENT_IDS ||
    process.env.APPLE_CLIENT_ID ||
    "com.sarjworldwide.chauffeur";
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
    const { identityToken, fullName } = await req.json();
    if (!identityToken || typeof identityToken !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing Apple token" },
        { status: 400 }
      );
    }

    const allowedAud = getAllowedAudiences();
    if (allowedAud.length === 0) {
      return NextResponse.json(
        { success: false, error: "Apple OAuth is not configured" },
        { status: 500 }
      );
    }

    let payload: Record<string, unknown>;
    try {
      const verified = await jwtVerify(identityToken, APPLE_JWKS, {
        issuer: APPLE_ISSUER,
        audience: allowedAud,
        // tolerate small device/server clock skew
        clockTolerance: 5,
      });
      payload = verified.payload as unknown as Record<string, unknown>;
    } catch (err: unknown) {
      // Helpful diagnostics for audience mismatches (common in Apple Sign-in setups)
      const decoded = (() => {
        try {
          return decodeJwt(identityToken) as Record<string, unknown>;
        } catch {
          return null;
        }
      })();

      const isAudError =
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as any).code === "ERR_JWT_CLAIM_VALIDATION_FAILED" &&
        "claim" in err &&
        (err as any).claim === "aud";

      if (isAudError) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Apple audience mismatch. Add the token 'aud' value to APPLE_CLIENT_IDS in apps/web/.env.local and restart the server.",
            allowedAudiences: allowedAud,
            tokenAudience: decoded?.aud ?? null,
            tokenIssuer: decoded?.iss ?? null,
          },
          { status: 400 }
        );
      }

      throw err;
    }

    const sub = payload.sub;
    const emailRaw = payload.email;
    if (!sub || typeof sub !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid Apple token" },
        { status: 401 }
      );
    }

    const oauthProvider = "apple";
    const oauthSub = sub;

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

    // Apple email may be absent after first consent; require it for first-time creation
    if (!emailRaw || typeof emailRaw !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Apple did not provide an email for this account. Please try again.",
        },
        { status: 400 }
      );
    }

    const email = emailRaw.toLowerCase();

    const existingByEmail = await prisma.customer.findUnique({ where: { email } });
    if (existingByEmail && !existingByEmail.oauthProvider) {
      return NextResponse.json(
        {
          success: false,
          error: "Account already exists with this email. Please login with password.",
        },
        { status: 409 }
      );
    }

    const randomPassword = crypto.randomBytes(24).toString("base64url");
    const hashedPassword = await bcrypt.hash(randomPassword, 12);

    const parsedFirst = typeof fullName?.givenName === "string" ? fullName.givenName.trim() : "";
    const parsedLast = typeof fullName?.familyName === "string" ? fullName.familyName.trim() : "";

    // Apple only returns name on first consent; afterwards fullName is often null.
    // Use fullName when present; otherwise fallback to email local-part for a better default than "Customer".
    const emailLocal = email.split("@")[0]?.replace(/[._-]+/g, " ").trim() || "Customer";
    const firstName = (parsedFirst || emailLocal || "Customer").slice(0, 60);
    const lastName = parsedLast.slice(0, 60);

    const customer =
      existingByEmail && existingByEmail.oauthProvider
        ? await prisma.customer.update({
            where: { id: existingByEmail.id },
            data: {
              oauthProvider,
              oauthSub,
              ...(parsedFirst && existingByEmail.firstName === "Customer"
                ? { firstName, lastName }
                : {}),
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
  } catch (error: unknown) {
    console.error("Apple OAuth error:", error);
    const details =
      process.env.NODE_ENV !== "production"
        ? error instanceof Error
          ? error.message
          : String(error)
        : undefined;
    return NextResponse.json(
      { success: false, error: "Apple login failed", ...(details ? { details } : {}) },
      { status: 500 }
    );
  }
}

