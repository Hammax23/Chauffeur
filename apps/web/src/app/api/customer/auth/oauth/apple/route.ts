import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { createRemoteJWKSet, decodeJwt, jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key";
/** Native iOS bundle id — always accepted as Apple identity-token `aud`. */
const NATIVE_BUNDLE_ID = "com.sarjworldwide.chauffeur";

const APPLE_ISSUER = "https://appleid.apple.com";
const APPLE_JWKS = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

function getAllowedAudiences(): string[] {
  const raw = process.env.APPLE_CLIENT_IDS || process.env.APPLE_CLIENT_ID || "";
  const fromEnv = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // Always accept the native iOS bundle id (Sign in with Apple identity token aud).
  const set = new Set<string>([...fromEnv, NATIVE_BUNDLE_ID]);
  return [...set];
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

/** Apple often omits email after the first consent. Keep a stable unique address. */
function syntheticAppleEmail(oauthSub: string): string {
  const safe =
    oauthSub.replace(/[^a-zA-Z0-9]/g, "").slice(0, 40) ||
    crypto.randomBytes(8).toString("hex");
  return `apple.${safe}@signin.sarjworldwide.ca`;
}

function isPrismaUniqueViolation(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
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

    let payload: Record<string, unknown>;
    try {
      const verified = await jwtVerify(identityToken, APPLE_JWKS, {
        issuer: APPLE_ISSUER,
        audience: allowedAud,
        clockTolerance: 60,
      });
      payload = verified.payload as unknown as Record<string, unknown>;
    } catch (err: unknown) {
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
        (err as { code?: string }).code === "ERR_JWT_CLAIM_VALIDATION_FAILED" &&
        "claim" in err &&
        (err as { claim?: string }).claim === "aud";

      console.error("[apple-oauth] token verify failed", {
        isAudError,
        tokenAudience: decoded?.aud ?? null,
        allowedAud,
        message: err instanceof Error ? err.message : String(err),
      });

      if (isAudError) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Sign in with Apple could not be verified for this app. Please try again or use email login.",
            ...(process.env.NODE_ENV !== "production"
              ? {
                  allowedAudiences: allowedAud,
                  tokenAudience: decoded?.aud ?? null,
                }
              : {}),
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: "Sign in with Apple failed. Please try again or use email login.",
        },
        { status: 401 }
      );
    }

    const sub = payload.sub;
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
        customer: customerPayload(existingLinked),
      });
    }

    // Apple may omit email after the first consent. Still create/link the account.
    const emailRaw = typeof payload.email === "string" ? payload.email.trim() : "";
    const email = (emailRaw || syntheticAppleEmail(oauthSub)).toLowerCase();

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

    if (existingByEmail?.oauthProvider && existingByEmail.oauthProvider !== "apple") {
      return NextResponse.json(
        {
          success: false,
          error:
            "This email is already linked to a different sign-in method. Please use your original login.",
        },
        { status: 409 }
      );
    }

    if (existingByEmail?.oauthProvider === "apple" && existingByEmail.oauthSub !== oauthSub) {
      return NextResponse.json(
        {
          success: false,
          error: "This Apple email is already linked to another account. Please use email login.",
        },
        { status: 409 }
      );
    }

    if (existingByEmail?.oauthProvider === "apple" && existingByEmail.oauthSub === oauthSub) {
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

    const parsedFirst = typeof fullName?.givenName === "string" ? fullName.givenName.trim() : "";
    const parsedLast = typeof fullName?.familyName === "string" ? fullName.familyName.trim() : "";

    const emailLocal =
      email.split("@")[0]?.replace(/[._-]+/g, " ").trim() || "Customer";
    const firstName = (parsedFirst || emailLocal || "Customer").slice(0, 60);
    const lastName = (parsedLast || "User").slice(0, 60);

    let customer;
    try {
      customer = await prisma.customer.create({
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
    } catch (createErr: unknown) {
      // Race: another request linked the same Apple sub or email
      if (isPrismaUniqueViolation(createErr)) {
        const raced = await prisma.customer.findFirst({
          where: {
            OR: [{ oauthProvider, oauthSub }, { email }],
          },
        });
        if (raced) {
          const token = issueCustomerJwt(raced);
          return NextResponse.json({
            success: true,
            message: "Login successful",
            token,
            customer: customerPayload(raced),
          });
        }
      }
      throw createErr;
    }

    const token = issueCustomerJwt(customer);
    return NextResponse.json({
      success: true,
      message: "Login successful",
      token,
      customer: customerPayload(customer),
    });
  } catch (error: unknown) {
    console.error("Apple OAuth error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Sign in with Apple failed. Please try again or use email login.",
        ...(process.env.NODE_ENV !== "production" && error instanceof Error
          ? { details: error.message }
          : {}),
      },
      { status: 500 }
    );
  }
}
