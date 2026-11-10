import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { getRedis, redisKey } from "@/lib/redis";
import prisma from "@/lib/prisma";

// Secret key for JWT - should be in env variable
const JWT_SECRET = process.env.JWT_SECRET || "sarj-admin-jwt-secret-key-2024-secure";
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.R8YjpYB7pXvN3S"; // Default: "sarj@admin2024"

const COOKIE_NAME = "sarj_admin_token";

/** Persistent until explicit logout — cookie max-age (~10 years) */
export const ADMIN_SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 10;

export function getAdminSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    maxAge: ADMIN_SESSION_COOKIE_MAX_AGE,
    path: "/",
  };
}

type LoginAttempt = { count: number; lastAttempt: number };
const loginAttempts: Map<string, LoginAttempt> = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

function adminLockKey(ip: string): string {
  return redisKey("admin-lock", ip);
}

async function readLoginAttempt(ip: string): Promise<LoginAttempt | null> {
  const redis = getRedis();
  if (redis) {
    try {
      const raw = await redis.get(adminLockKey(ip));
      if (raw) return JSON.parse(raw) as LoginAttempt;
    } catch {
      /* memory fallback */
    }
  }
  return loginAttempts.get(ip) || null;
}

async function writeLoginAttempt(ip: string, attempt: LoginAttempt): Promise<void> {
  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(
        adminLockKey(ip),
        JSON.stringify(attempt),
        "PX",
        LOCKOUT_TIME
      );
      return;
    } catch {
      /* memory fallback */
    }
  }
  loginAttempts.set(ip, attempt);
}

async function deleteLoginAttempt(ip: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    try {
      await redis.del(adminLockKey(ip));
    } catch {
      /* ignore */
    }
  }
  loginAttempts.delete(ip);
}

export interface AdminTokenPayload {
  role: "admin";
  /** AdminUser.id when the per-admin identity flow is in use. Absent for legacy single-admin tokens. */
  sub?: string;
  /** AdminUser.email (lowercase) when available. Used for audit actor. */
  email?: string;
  iat?: number;
  exp?: number;
}

/** Resolved actor for audit logs — email preferred, then AdminUser id, else legacy "admin". */
export type AdminActor = {
  adminId: string | null;
  email: string | null;
  actor: string;
};

export function actorFromPayload(payload: AdminTokenPayload | null): AdminActor {
  if (!payload) return { adminId: null, email: null, actor: "admin" };
  const email = payload.email ? String(payload.email).trim().toLowerCase() : null;
  const adminId = payload.sub ? String(payload.sub) : null;
  return { adminId, email, actor: email || adminId || "admin" };
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT token for admin.
 *
 * Legacy single-admin: pass no args ⇒ token payload = `{ role: "admin" }` (back-compat).
 * Phase 2 per-admin identity: pass `{ adminId, email }` ⇒ token = `{ role, sub, email }`.
 * No JWT expiry — session ends only on logout or JWT_SECRET rotation.
 */
export function generateToken(actor?: { adminId?: string | null; email?: string | null }): string {
  const payload: AdminTokenPayload = { role: "admin" };
  if (actor?.adminId) payload.sub = actor.adminId;
  if (actor?.email) payload.email = String(actor.email).trim().toLowerCase();
  return jwt.sign(payload, JWT_SECRET);
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): AdminTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AdminTokenPayload;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Check rate limiting for login attempts (Redis-backed when configured).
 */
export async function checkRateLimit(
  ip: string
): Promise<{ allowed: boolean; remainingTime?: number }> {
  const now = Date.now();
  const attempt = await readLoginAttempt(ip);

  if (!attempt) {
    return { allowed: true };
  }

  if (now - attempt.lastAttempt > LOCKOUT_TIME) {
    await deleteLoginAttempt(ip);
    return { allowed: true };
  }

  if (attempt.count >= MAX_ATTEMPTS) {
    const remainingTime = Math.ceil(
      (LOCKOUT_TIME - (now - attempt.lastAttempt)) / 1000
    );
    return { allowed: false, remainingTime };
  }

  return { allowed: true };
}

/**
 * Record a failed login attempt
 */
export async function recordFailedAttempt(ip: string): Promise<void> {
  const now = Date.now();
  const attempt = await readLoginAttempt(ip);

  if (!attempt || now - attempt.lastAttempt > LOCKOUT_TIME) {
    await writeLoginAttempt(ip, { count: 1, lastAttempt: now });
  } else {
    await writeLoginAttempt(ip, {
      count: attempt.count + 1,
      lastAttempt: now,
    });
  }
}

/**
 * Clear login attempts after successful login
 */
export async function clearAttempts(ip: string): Promise<void> {
  await deleteLoginAttempt(ip);
}

/**
 * Phase 2 per-admin identity lookup.
 * Returns the AdminUser row if email + password match an active admin, else null.
 * Safe to call even when the AdminUser table is empty (returns null, no throw).
 */
export async function authenticateAdminUser(
  email: string,
  password: string
): Promise<{ id: string; email: string; name: string | null } | null> {
  const emailKey = String(email || "").trim().toLowerCase();
  if (!emailKey || !password) return null;
  try {
    const user = await prisma.adminUser.findUnique({ where: { email: emailKey } });
    if (!user || !user.isActive) return null;
    const ok = await verifyPassword(password, user.password);
    if (!ok) return null;
    // Best-effort lastLoginAt — do not fail the login if the write fails.
    try {
      await prisma.adminUser.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    } catch {
      /* ignore */
    }
    return { id: user.id, email: user.email, name: user.name };
  } catch (err) {
    console.error("[admin-auth] authenticateAdminUser failed", err);
    return null;
  }
}

/**
 * Returns true if at least one AdminUser exists (any status).
 * Used as the "has per-admin identity been bootstrapped?" signal — when false we
 * fall back to the legacy single-admin ADMIN_PASSWORD env flow.
 */
export async function hasAnyAdminUser(): Promise<boolean> {
  try {
    const n = await prisma.adminUser.count();
    return n > 0;
  } catch {
    return false;
  }
}

/**
 * Authenticate admin login.
 *
 * Phase 2 contract:
 *   - If `email` is provided AND an AdminUser matches, log in as that admin
 *     (token encodes `sub`+`email`, audit actor = that email).
 *   - Else fall back to the legacy ADMIN_PASSWORD env flow — only when the
 *     AdminUser table is empty OR no email was supplied, so existing single-admin
 *     deployments keep working without migration.
 */
export async function authenticateAdmin(
  password: string,
  email?: string | null
): Promise<{
  success: boolean;
  token?: string;
  error?: string;
  actor?: { adminId: string | null; email: string | null };
}> {
  const cleanEmail = email ? String(email).trim().toLowerCase() : "";

  // Phase 2 — try AdminUser table first when an email is given.
  if (cleanEmail) {
    const user = await authenticateAdminUser(cleanEmail, password);
    if (user) {
      const token = generateToken({ adminId: user.id, email: user.email });
      return {
        success: true,
        token,
        actor: { adminId: user.id, email: user.email },
      };
    }

    // If an email was supplied but there are AdminUsers configured, do NOT
    // silently fall back to the env password — the explicit email must match.
    const populated = await hasAnyAdminUser();
    if (populated) {
      return { success: false, error: "Invalid admin credentials" };
    }
    // Otherwise (empty AdminUser table) fall through to legacy env check so
    // first-time bootstrap still works.
  }

  // Legacy single-admin env flow (Phase 1 backwards compat).
  const storedHash = process.env.ADMIN_PASSWORD_HASH || ADMIN_PASSWORD_HASH;
  const plainPassword = process.env.ADMIN_PASSWORD;

  let isValid = false;
  if (plainPassword) {
    isValid = password === plainPassword;
  } else {
    isValid = await verifyPassword(password, storedHash);
  }

  if (isValid) {
    const token = generateToken();
    return { success: true, token, actor: { adminId: null, email: null } };
  }

  return { success: false, error: "Invalid password" };
}

/**
 * Get admin token from cookies (for API routes)
 */
export async function getAdminTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME);
  return token?.value || null;
}

/**
 * Verify admin authentication from request.
 *
 * Phase 2: when the token is a per-admin token the return value also carries
 * `adminId`, `email` and a resolved `actor` string for audit logs. Legacy
 * single-admin tokens still authenticate but expose `actor = "admin"`.
 */
export async function verifyAdminAuth(request?: NextRequest): Promise<{
  authenticated: boolean;
  error?: string;
  code?: string;
  adminId?: string | null;
  email?: string | null;
  actor?: string;
  role?: import("@/lib/admin-roles").AdminRole;
}> {
  let token: string | null = null;

  if (request) {
    // Get from cookie in request
    token = request.cookies.get(COOKIE_NAME)?.value || null;

    // Also check Authorization header
    if (!token) {
      const authHeader = request.headers.get("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }
  } else {
    // Get from cookies() for server components
    token = await getAdminTokenFromCookies();
  }

  if (!token) {
    return { authenticated: false, error: "No authentication token" };
  }

  const payload = verifyToken(token);
  if (!payload) {
    return { authenticated: false, error: "Invalid or expired token" };
  }

  const identity = actorFromPayload(payload);
  const { resolveAdminAccess, isBillingAssistantPath } = await import(
    "@/lib/admin-roles"
  );
  const access = await resolveAdminAccess(identity.adminId);
  if (!access.ok) {
    return {
      authenticated: false,
      error:
        access.reason === "INACTIVE"
          ? "Admin account is deactivated."
          : "Admin account not found.",
      code: access.reason === "INACTIVE" ? "INACTIVE" : "UNAUTHORIZED",
      adminId: identity.adminId,
      email: identity.email,
      actor: identity.actor,
    };
  }
  const role = access.role;

  // Hard API/page gate: Billing Assistant → Billing + Bookings only.
  if (request && role === "BILLING_ASSISTANT") {
    try {
      const path = request.nextUrl?.pathname || new URL(request.url).pathname;
      if (!isBillingAssistantPath(path)) {
        return {
          authenticated: false,
          error: "Billing assistants may only use Billing and Bookings.",
          code: "FORBIDDEN_ROLE",
          adminId: identity.adminId,
          email: identity.email,
          actor: identity.actor,
          role,
        };
      }
    } catch {
      return {
        authenticated: false,
        error: "Billing assistants may only use Billing and Bookings.",
        code: "FORBIDDEN_ROLE",
        role,
      };
    }
  }

  return {
    authenticated: true,
    adminId: identity.adminId,
    email: identity.email,
    actor: identity.actor,
    role,
  };
}

/**
 * Get client IP from request
 */
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : request.headers.get("x-real-ip") || "unknown";
  return ip;
}

// Export cookie name for use in login/logout
export { COOKIE_NAME };
