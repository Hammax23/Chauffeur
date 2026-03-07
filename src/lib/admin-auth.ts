import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

// Secret key for JWT - should be in env variable
const JWT_SECRET = process.env.JWT_SECRET || "sarj-admin-jwt-secret-key-2024-secure";
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.R8YjpYB7pXvN3S"; // Default: "sarj@admin2024"

// Token expiration time (24 hours)
const TOKEN_EXPIRY = "24h";
const COOKIE_NAME = "sarj_admin_token";

// Rate limiting storage (in production, use Redis)
const loginAttempts: Map<string, { count: number; lastAttempt: number }> = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

export interface AdminTokenPayload {
  role: "admin";
  iat: number;
  exp: number;
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
 * Generate JWT token for admin
 */
export function generateToken(): string {
  return jwt.sign(
    { role: "admin" },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
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
 * Check rate limiting for login attempts
 */
export function checkRateLimit(ip: string): { allowed: boolean; remainingTime?: number } {
  const now = Date.now();
  const attempt = loginAttempts.get(ip);

  if (!attempt) {
    return { allowed: true };
  }

  // Reset if lockout time has passed
  if (now - attempt.lastAttempt > LOCKOUT_TIME) {
    loginAttempts.delete(ip);
    return { allowed: true };
  }

  // Check if locked out
  if (attempt.count >= MAX_ATTEMPTS) {
    const remainingTime = Math.ceil((LOCKOUT_TIME - (now - attempt.lastAttempt)) / 1000);
    return { allowed: false, remainingTime };
  }

  return { allowed: true };
}

/**
 * Record a failed login attempt
 */
export function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const attempt = loginAttempts.get(ip);

  if (!attempt || now - attempt.lastAttempt > LOCKOUT_TIME) {
    loginAttempts.set(ip, { count: 1, lastAttempt: now });
  } else {
    loginAttempts.set(ip, { count: attempt.count + 1, lastAttempt: now });
  }
}

/**
 * Clear login attempts after successful login
 */
export function clearAttempts(ip: string): void {
  loginAttempts.delete(ip);
}

/**
 * Authenticate admin login
 */
export async function authenticateAdmin(password: string): Promise<{ success: boolean; token?: string; error?: string }> {
  // Get stored hash from env or use default
  const storedHash = process.env.ADMIN_PASSWORD_HASH || ADMIN_PASSWORD_HASH;
  
  // For backward compatibility, also check plain text password from env
  const plainPassword = process.env.ADMIN_PASSWORD;
  
  let isValid = false;
  
  if (plainPassword) {
    // If plain password is set in env, compare directly (for easy setup)
    isValid = password === plainPassword;
  } else {
    // Otherwise use bcrypt hash comparison
    isValid = await verifyPassword(password, storedHash);
  }

  if (isValid) {
    const token = generateToken();
    return { success: true, token };
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
 * Verify admin authentication from request
 */
export async function verifyAdminAuth(request?: NextRequest): Promise<{ authenticated: boolean; error?: string }> {
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

  return { authenticated: true };
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
