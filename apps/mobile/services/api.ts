import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { Platform } from "react-native";

function normalizeApiBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}

/**
 * Production + dev-safe API origin.
 * In Expo Go (__DEV__), prefer Metro's debugger host so a stale .env LAN IP
 * does not hang the app when Wi‑Fi / PC IP changes.
 */
function resolveApiBaseUrl(): string {
  const defaultProd = "https://sarjworldwide.ca/api";
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

  // Release builds: allow EAS env (preview/staging/prod) to override the API host.
  if (!__DEV__) {
    return normalizeApiBaseUrl(fromEnv || defaultProd);
  }

  const dbg =
    Constants.expoGoConfig?.debuggerHost ??
    (Constants.manifest2 as { extra?: { expoClient?: { debuggerHost?: string } } } | null)?.extra?.expoClient
      ?.debuggerHost ??
    (Constants.manifest as { debuggerHost?: string } | undefined)?.debuggerHost;

  if (dbg) {
    const hostOnly = dbg.split(":")[0]?.trim();
    if (hostOnly) {
      const metroUrl = `http://${hostOnly}:3000/api`;
      if (fromEnv) {
        const envNorm = normalizeApiBaseUrl(fromEnv);
        if (envNorm !== metroUrl) {
          console.warn(
            `[API] Ignoring stale EXPO_PUBLIC_API_BASE_URL (${envNorm}); using Metro host ${metroUrl}`
          );
        }
      }
      return metroUrl;
    }
  }

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const raw = hostUri.replace(/^exp[+a-z]*:\/\//i, "").replace(/^\/\//, "");
    const hostOnly = raw.split(":")[0]?.split("/")[0];
    if (hostOnly && hostOnly !== "localhost" && hostOnly !== "127.0.0.1") {
      return `http://${hostOnly}:3000/api`;
    }
  }

  if (fromEnv) {
    return normalizeApiBaseUrl(fromEnv);
  }

  if (Platform.OS === "android") {
    return "http://10.0.2.2:3000/api";
  }

  console.warn(
    "[API] iPhone/Expo Go: create apps/mobile/.env with EXPO_PUBLIC_API_BASE_URL=http://YOUR_PC_IP:3000/api"
  );

  return "http://127.0.0.1:3000/api";
}

export const API_BASE_URL = resolveApiBaseUrl();

if (__DEV__) {
  console.log("[API] Using base URL:", API_BASE_URL);
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 12_000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error(
        __DEV__
          ? `Request timed out (${timeoutMs}ms). Is apps/web running on ${API_BASE_URL}?`
          : "Request timed out. Check your connection."
      );
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

type UnauthorizedRole = "customer" | "driver" | "concierge";
type UnauthorizedListener = (role: UnauthorizedRole) => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

function emitUnauthorized(role: UnauthorizedRole) {
  unauthorizedListeners.forEach((fn) => {
    try {
      fn(role);
    } catch {
      /* ignore */
    }
  });
}

// Types — declared early so session helpers can reference them
export interface CustomerProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city?: string | null;
  photo?: string | null;
}

export interface DriverProfile {
  id: string;
  driverId: string;
  name: string;
  email: string;
  phone: string;
  vehicle: string;
  vehiclePlate: string;
  vehicleCode: string | null;
  status: string;
  isActive: boolean;
  photo: string | null;
  rating: number;
  totalTrips: number;
}

export interface ConciergeProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  hotelId: string;
  hotelName: string;
  hotelCommissionPercent: number;
}

export type AuthRole = "customer" | "driver" | "concierge";

const LEGACY_TOKEN_KEY = "sarj_auth_token";
const LEGACY_USER_KEY = "sarj_user_data";
const CUSTOMER_TOKEN_KEY = "sarj_customer_token";
const DRIVER_TOKEN_KEY = "sarj_driver_token";
const CONCIERGE_TOKEN_KEY = "sarj_concierge_token";
const CUSTOMER_USER_KEY = "sarj_customer_user";
const DRIVER_USER_KEY = "sarj_driver_user";
const CONCIERGE_USER_KEY = "sarj_concierge_user";
const ACTIVE_ROLE_KEY = "sarj_active_auth_role";

async function safeGet(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function safeSet(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value);
}

async function safeDel(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    /* ignore */
  }
}

async function clearLegacyAuthKeys(): Promise<void> {
  await safeDel(LEGACY_TOKEN_KEY);
  await safeDel(LEGACY_USER_KEY);
}

export async function getActiveAuthRole(): Promise<AuthRole | null> {
  const role = await safeGet(ACTIVE_ROLE_KEY);
  if (role === "customer" || role === "driver" || role === "concierge") return role;
  return null;
}

export async function setActiveAuthRole(role: AuthRole): Promise<void> {
  await safeSet(ACTIVE_ROLE_KEY, role);
}

export async function getCustomerToken(): Promise<string | null> {
  return safeGet(CUSTOMER_TOKEN_KEY);
}

export async function getDriverToken(): Promise<string | null> {
  return safeGet(DRIVER_TOKEN_KEY);
}

export async function getConciergeToken(): Promise<string | null> {
  return safeGet(CONCIERGE_TOKEN_KEY);
}

/** Resolves Bearer token for an API call (prefers endpoint role, else active role). */
export async function getToken(endpoint?: string): Promise<string | null> {
  if (endpoint?.startsWith("/driver")) return getDriverToken();
  if (endpoint?.startsWith("/concierge")) return getConciergeToken();
  if (endpoint?.startsWith("/customer")) return getCustomerToken();

  const role = await getActiveAuthRole();
  if (role === "driver") return getDriverToken();
  if (role === "concierge") return getConciergeToken();
  if (role === "customer") return getCustomerToken();

  // Migration fallback: legacy single key
  return safeGet(LEGACY_TOKEN_KEY);
}

export async function getStoredCustomer(): Promise<CustomerProfile | null> {
  try {
    const data = await safeGet(CUSTOMER_USER_KEY);
    return data ? (JSON.parse(data) as CustomerProfile) : null;
  } catch {
    return null;
  }
}

export async function getStoredDriver(): Promise<DriverProfile | null> {
  try {
    const data = await safeGet(DRIVER_USER_KEY);
    return data ? (JSON.parse(data) as DriverProfile) : null;
  } catch {
    return null;
  }
}

export async function getStoredConcierge(): Promise<ConciergeProfile | null> {
  try {
    const data = await safeGet(CONCIERGE_USER_KEY);
    return data ? (JSON.parse(data) as ConciergeProfile) : null;
  } catch {
    return null;
  }
}

/** @deprecated Prefer getStoredCustomer / getStoredDriver */
export async function getStoredUser(): Promise<CustomerProfile | null> {
  const role = await getActiveAuthRole();
  if (role === "driver") {
    const d = await getStoredDriver();
    return d as unknown as CustomerProfile | null;
  }
  if (role === "concierge") {
    const c = await getStoredConcierge();
    return c as unknown as CustomerProfile | null;
  }
  const customer = await getStoredCustomer();
  if (customer) return customer;
  try {
    const legacy = await safeGet(LEGACY_USER_KEY);
    return legacy ? (JSON.parse(legacy) as CustomerProfile) : null;
  } catch {
    return null;
  }
}

export async function setCustomerSession(token: string, user: CustomerProfile): Promise<void> {
  await clearDriverSession();
  await clearConciergeSession();
  await safeSet(CUSTOMER_TOKEN_KEY, token);
  await safeSet(CUSTOMER_USER_KEY, JSON.stringify(user));
  await setActiveAuthRole("customer");
  await clearLegacyAuthKeys();
}

export async function setDriverSession(token: string, driver: DriverProfile): Promise<void> {
  await clearCustomerSession();
  await clearConciergeSession();
  await safeSet(DRIVER_TOKEN_KEY, token);
  await safeSet(DRIVER_USER_KEY, JSON.stringify(driver));
  await setActiveAuthRole("driver");
  await clearLegacyAuthKeys();
}

export async function setConciergeSession(token: string, concierge: ConciergeProfile): Promise<void> {
  await clearCustomerSession();
  await clearDriverSession();
  await safeSet(CONCIERGE_TOKEN_KEY, token);
  await safeSet(CONCIERGE_USER_KEY, JSON.stringify(concierge));
  await setActiveAuthRole("concierge");
  await clearLegacyAuthKeys();
}

export async function clearCustomerSession(): Promise<void> {
  await safeDel(CUSTOMER_TOKEN_KEY);
  await safeDel(CUSTOMER_USER_KEY);
  const role = await getActiveAuthRole();
  if (role === "customer") await safeDel(ACTIVE_ROLE_KEY);
}

export async function clearDriverSession(): Promise<void> {
  await safeDel(DRIVER_TOKEN_KEY);
  await safeDel(DRIVER_USER_KEY);
  const role = await getActiveAuthRole();
  if (role === "driver") await safeDel(ACTIVE_ROLE_KEY);
}

export async function clearConciergeSession(): Promise<void> {
  await safeDel(CONCIERGE_TOKEN_KEY);
  await safeDel(CONCIERGE_USER_KEY);
  const role = await getActiveAuthRole();
  if (role === "concierge") await safeDel(ACTIVE_ROLE_KEY);
}

/** Update cached profile without touching the other role's session. */
export async function persistCustomerProfile(user: CustomerProfile): Promise<void> {
  await safeSet(CUSTOMER_USER_KEY, JSON.stringify(user));
}

export async function persistDriverProfile(driver: DriverProfile): Promise<void> {
  await safeSet(DRIVER_USER_KEY, JSON.stringify(driver));
}

export async function persistConciergeProfile(concierge: ConciergeProfile): Promise<void> {
  await safeSet(CONCIERGE_USER_KEY, JSON.stringify(concierge));
}

/** @deprecated Prefer setCustomerSession / setDriverSession */
export async function setToken(token: string): Promise<void> {
  const role = (await getActiveAuthRole()) || "customer";
  if (role === "driver") await safeSet(DRIVER_TOKEN_KEY, token);
  else if (role === "concierge") await safeSet(CONCIERGE_TOKEN_KEY, token);
  else await safeSet(CUSTOMER_TOKEN_KEY, token);
}

/** @deprecated */
export async function removeToken(): Promise<void> {
  await clearCustomerSession();
  await clearDriverSession();
  await clearConciergeSession();
  await clearLegacyAuthKeys();
  await safeDel(ACTIVE_ROLE_KEY);
}

/** @deprecated Prefer role-specific setters */
export async function setStoredUser(user: CustomerProfile): Promise<void> {
  const role = await getActiveAuthRole();
  if (role === "driver") {
    await safeSet(DRIVER_USER_KEY, JSON.stringify(user));
  } else if (role === "concierge") {
    await safeSet(CONCIERGE_USER_KEY, JSON.stringify(user));
  } else {
    await safeSet(CUSTOMER_USER_KEY, JSON.stringify(user));
  }
}

/** @deprecated */
export async function removeStoredUser(): Promise<void> {
  await clearCustomerSession();
  await clearDriverSession();
  await clearConciergeSession();
  await clearLegacyAuthKeys();
}

/** Which home to open after splash (validates tokens exist). */
export async function resolveBootDestination(): Promise<
  "/customer" | "/driver" | "/concierge" | "/login"
> {
  const role = await getActiveAuthRole();
  if (role === "customer" && (await getCustomerToken())) return "/customer";
  if (role === "driver" && (await getDriverToken())) return "/driver";
  if (role === "concierge" && (await getConciergeToken())) return "/concierge";
  if (await getCustomerToken()) {
    await setActiveAuthRole("customer");
    return "/customer";
  }
  if (await getDriverToken()) {
    await setActiveAuthRole("driver");
    return "/driver";
  }
  if (await getConciergeToken()) {
    await setActiveAuthRole("concierge");
    return "/concierge";
  }
  // Legacy migration: if old token exists, force re-login for clean split
  if (await safeGet(LEGACY_TOKEN_KEY)) {
    await clearLegacyAuthKeys();
  }
  return "/login";
}

export interface ReservationDriver {
  name: string;
  phone: string;
  photo: string | null;
  vehicle: string;
  vehiclePlate: string;
  rating: number;
}

export interface Reservation {
  id: string;
  bookingId: string;
  status: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  serviceType: string;
  vehicle: string;
  passengers: number;
  childSeats: number;
  etr407: string;
  serviceDate: string;
  serviceTime: string;
  pickupLocation: string;
  stops: string;
  dropoffLocation: string;
  distance: string;
  duration: string;
  rideFare: number;
  subtotal: number;
  hst: number;
  gratuity: number;
  total: number;
  paymentStatus: string;
  statusUpdatedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  driver: ReservationDriver | null;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

function apiUnreachableMessage(status: number): string {
  if (__DEV__) {
    return `Cannot reach the API (${status}). In apps/mobile/.env set EXPO_PUBLIC_API_BASE_URL=http://YOUR_PC_IP:3000/api, then run "npm run dev" in apps/web on the same Wi‑Fi.`;
  }
  return "Server is unavailable. Please try again in a moment.";
}

async function parseResponseBody<T>(response: Response): Promise<T> {
  const text = await response.text();
  const trimmed = text.trim();

  if (!trimmed) {
    throw new Error(
      response.ok
        ? "Empty response from server"
        : apiUnreachableMessage(response.status)
    );
  }

  if (trimmed.startsWith("<")) {
    throw new Error(apiUnreachableMessage(response.status));
  }

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    throw new Error(`Invalid server response (${response.status}). Please try again.`);
  }
}

// API request helper
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken(endpoint);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetchWithTimeout(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error(
      __DEV__
        ? `Network error. Confirm EXPO_PUBLIC_API_BASE_URL (${API_BASE_URL}) and that apps/web is running.`
        : "Network error. Check your connection and try again."
    );
  }

  const data = await parseResponseBody<T & { error?: string }>(response);

  if (response.status === 401) {
    if (endpoint.startsWith("/driver")) {
      await clearDriverSession();
      emitUnauthorized("driver");
    } else if (endpoint.startsWith("/concierge")) {
      await clearConciergeSession();
      emitUnauthorized("concierge");
    } else if (endpoint.startsWith("/customer")) {
      await clearCustomerSession();
      emitUnauthorized("customer");
    }
  }

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data;
}

// API request helper that returns JSON even on non-2xx (for OAuth flows where server returns useful fields)
async function apiRequestWithResponse<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ ok: boolean; status: number; data: T }> {
  const token = await getToken(endpoint);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetchWithTimeout(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: { ...headers, Accept: "application/json" },
    });
  } catch {
    throw new Error(
      __DEV__
        ? `Network error. Confirm EXPO_PUBLIC_API_BASE_URL (${API_BASE_URL}).`
        : "Network error. Check your connection and try again."
    );
  }

  const data = await parseResponseBody<T>(response);

  if (response.status === 401) {
    if (endpoint.startsWith("/driver")) {
      await clearDriverSession();
      emitUnauthorized("driver");
    } else if (endpoint.startsWith("/concierge")) {
      await clearConciergeSession();
      emitUnauthorized("concierge");
    } else if (endpoint.startsWith("/customer")) {
      await clearCustomerSession();
      emitUnauthorized("customer");
    }
  }

  return { ok: response.ok, status: response.status, data };
}

// ==================== AUTH API ====================

export async function loginCustomer(email: string, password: string) {
  const data = await apiRequest<{
    success: boolean;
    token: string;
    customer: CustomerProfile;
    error?: string;
  }>("/customer/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (data.success && data.token) {
    await setCustomerSession(data.token, data.customer);
  }

  return data;
}

export async function loginCustomerWithGoogle(idToken: string) {
  const res = await apiRequestWithResponse<{
    success: boolean;
    token: string;
    customer: CustomerProfile;
    error?: string;
    allowedAudiences?: string[];
    tokenAudience?: string | string[] | null;
  }>("/customer/auth/oauth/google", {
    method: "POST",
    body: JSON.stringify({ idToken }),
  });

  const data = res.data;

  if (res.ok && data.success && data.token) {
    await setCustomerSession(data.token, data.customer);
  }

  return data;
}

export async function loginCustomerWithApple(params: {
  identityToken: string;
  fullName?: { givenName?: string | null; familyName?: string | null } | null;
}) {
  const res = await apiRequestWithResponse<{
    success: boolean;
    token: string;
    customer: CustomerProfile;
    error?: string;
    allowedAudiences?: string[];
    tokenAudience?: string | string[] | null;
    tokenIssuer?: string | null;
  }>("/customer/auth/oauth/apple", {
    method: "POST",
    body: JSON.stringify(params),
  });

  const data = res.data;

  if (res.ok && data.success && data.token) {
    await setCustomerSession(data.token, data.customer);
  }

  return data;
}

export async function registerCustomer(params: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  city?: string;
}) {
  const data = await apiRequest<{
    success: boolean;
    token: string;
    customer: CustomerProfile;
    error?: string;
  }>("/customer/auth/register", {
    method: "POST",
    body: JSON.stringify({ ...params, source: "app" }),
  });

  if (data.success && data.token) {
    await setCustomerSession(data.token, data.customer);
  }

  return data;
}

export async function forgotPassword(email: string) {
  return apiRequestWithResponse<{
    success: boolean;
    message?: string;
    sessionId?: string;
    emailMasked?: string;
    error?: string;
  }>("/customer/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function verifyResetOtp(sessionId: string, otp: string) {
  return apiRequestWithResponse<{
    success: boolean;
    message?: string;
    resetToken?: string;
    error?: string;
  }>("/customer/auth/verify-reset-otp", {
    method: "POST",
    body: JSON.stringify({ sessionId, otp }),
  });
}

export async function resetPassword(resetToken: string, newPassword: string) {
  return apiRequestWithResponse<{
    success: boolean;
    message?: string;
    error?: string;
  }>("/customer/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ resetToken, newPassword }),
  });
}

export async function logoutCustomer() {
  await clearCustomerSession();
  await clearLegacyAuthKeys();
}

// ==================== PROFILE API ====================

export async function getProfile() {
  return apiRequest<{ success: boolean; customer: CustomerProfile }>(
    "/customer/profile"
  );
}

export async function updateProfile(params: {
  firstName?: string;
  lastName?: string;
  phone?: string;
  city?: string;
  photo?: string;
}) {
  const data = await apiRequest<{
    success: boolean;
    customer: CustomerProfile;
  }>("/customer/profile", {
    method: "PATCH",
    body: JSON.stringify(params),
  });

  if (data.success && data.customer) {
    await persistCustomerProfile(data.customer);
  }

  return data;
}

// ==================== PUBLIC FLEET (no auth) ====================

export interface FleetVehicleDto {
  id: string;
  name: string;
  dropdownName: string;
  description: string;
  image: string;
  imageUrl: string;
  category: string;
  seating: string;
  luggage: string;
  /** Hourly rate, used when the booking is hourly. */
  price: number;
  /** Public per-kilometre rate shown on fleet preview cards. */
  pricePerKm: number;
}

export interface AppFleetVehicleDto {
  id: string;
  tierId: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  imageUrl: string;
  group: string;
  category: string;
  seating: string;
  luggage: string;
  pricePerKm: number;
  hourlyRate: number;
  price: number;
  showOnHome?: boolean;
  sortOrder?: number;
}

export type AppFleetPricingDto = {
  baseDistanceKm: number;
  extraKmRate: number;
};

export async function getFleetVehicles(): Promise<{ success: boolean; vehicles: FleetVehicleDto[] }> {
  let response: Response;
  try {
    response = await fetchWithTimeout(`${API_BASE_URL}/fleet`, {
      headers: { Accept: "application/json" },
    });
  } catch (e) {
    throw new Error(
      e instanceof Error
        ? e.message
        : __DEV__
          ? `Network error. Confirm EXPO_PUBLIC_API_BASE_URL (${API_BASE_URL}).`
          : "Network error. Check your connection and try again."
    );
  }

  const data = await parseResponseBody<{
    success: boolean;
    vehicles?: FleetVehicleDto[];
    error?: string;
  }>(response);

  if (!response.ok || !data.success || !data.vehicles?.length) {
    throw new Error(data.error || "Failed to load fleet");
  }
  return { success: true, vehicles: data.vehicles };
}

/** App reservation fleet (admin-managed App Fleets). */
export async function getAppFleetVehicles(options?: {
  homeOnly?: boolean;
}): Promise<{
  success: boolean;
  vehicles: AppFleetVehicleDto[];
  pricing?: AppFleetPricingDto;
  source?: string;
}> {
  const qs = options?.homeOnly ? "?home=1" : "";
  let response: Response;
  try {
    response = await fetchWithTimeout(`${API_BASE_URL}/app-fleet${qs}`, {
      headers: { Accept: "application/json" },
    });
  } catch (e) {
    throw new Error(
      e instanceof Error
        ? e.message
        : __DEV__
          ? `Network error. Confirm EXPO_PUBLIC_API_BASE_URL (${API_BASE_URL}).`
          : "Network error. Check your connection and try again."
    );
  }

  const data = await parseResponseBody<{
    success: boolean;
    vehicles?: AppFleetVehicleDto[];
    pricing?: AppFleetPricingDto;
    source?: string;
    error?: string;
  }>(response);

  if (!response.ok || !data.success || !data.vehicles?.length) {
    throw new Error(data.error || "Failed to load app fleet");
  }
  return {
    success: true,
    vehicles: data.vehicles,
    pricing: data.pricing,
    source: data.source,
  };
}

// ==================== RESERVATIONS API ====================

export async function getReservations() {
  return apiRequest<{ success: boolean; reservations: Reservation[] }>(
    "/customer/reservations"
  );
}

export async function getReservationById(bookingId: string) {
  return apiRequest<{ success: boolean; reservation: Reservation }>(
    `/customer/reservations/${bookingId}`
  );
}

export async function createReservation(params: {
  serviceType: string;
  vehicle: string;
  vehicleId?: string;
  passengers?: number;
  childSeats?: number;
  etr407?: string;
  serviceDate: string;
  serviceTime: string;
  pickupLocation: string;
  stops?: string;
  dropoffLocation: string;
  distance?: string;
  duration?: string;
  distanceMeters?: number;
  pricePerKm?: number;
  gratuityPercent?: number;
  airline?: string;
  flightNumber?: string;
  flightNote?: string;
  rideFare?: number;
  stopCharge?: number;
  childSeatCharge?: number;
  subtotal?: number;
  hst?: number;
  gratuity?: number;
  total?: number;
  specialRequirements?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  stripePaymentMethodId?: string;
  stripeCustomerId?: string;
  cardType?: string;
  cardLast4?: string;
}) {
  return apiRequest<{
    success: boolean;
    bookingId: string;
    reservationId: string;
  }>("/customer/reservations", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function getDriverLiveLocation(bookingId: string) {
  return apiRequest<{
    success: boolean;
    status?: string;
    location: {
      lat: number;
      lng: number;
      updatedAt: string | null;
      driverName: string;
    } | null;
  }>(`/customer/reservations/${bookingId}/driver-location`);
}

export async function cancelReservation(bookingId: string) {
  return apiRequest<{ success: boolean; message: string }>(
    `/customer/reservations/${bookingId}`,
    { method: "DELETE" }
  );
}

// ==================== DRIVER TYPES ====================

export interface DriverRide {
  id: string;
  bookingId: string;
  status: string;
  customerName: string;
  phone: string;
  email: string;
  serviceType: string;
  vehicle: string;
  passengers: number;
  childSeats: number;
  serviceDate: string;
  serviceTime: string;
  pickupLocation: string;
  stops: string;
  dropoffLocation: string;
  distance: string;
  duration: string;
  total: number;
  specialRequirements?: string;
  createdAt: string;
  /** ISO — trip timer starts here (first ON THE WAY). */
  driverOnTheWayAt?: string | null;
  /** JSON array of { start, end? } stop intervals (Stop → Continue). */
  driverStopPeriodsJson?: string | null;
  completedAt?: string | null;
  /** Live Auto Mode marketplace offer (not yet assigned). */
  liveOffer?: boolean;
}

// ==================== DRIVER AUTH API ====================

export async function loginDriver(email: string, password: string) {
  const data = await apiRequest<{
    success: boolean;
    token: string;
    driver: DriverProfile;
    error?: string;
  }>("/driver/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (data.success && data.token) {
    await setDriverSession(data.token, data.driver);
  }

  return data;
}

export async function logoutDriver() {
  await clearDriverSession();
  await clearLegacyAuthKeys();
}

// ==================== DRIVER PROFILE API ====================

export async function getDriverProfile() {
  return apiRequest<{ success: boolean; driver: DriverProfile }>(
    "/driver/profile"
  );
}

// ==================== DRIVER RIDES API ====================

export async function getDriverRides(tab: "requests" | "upcoming" | "completed" = "requests") {
  return apiRequest<{ success: boolean; rides: DriverRide[] }>(
    `/driver/rides?tab=${tab}`
  );
}

export async function getDriverRideDetail(bookingId: string) {
  return apiRequest<{ success: boolean; ride: DriverRide }>(
    `/driver/rides/${bookingId}`
  );
}

export async function updateRideStatus(bookingId: string, status: string) {
  return apiRequest<{ success: boolean; message: string }>(
    `/driver/rides/${bookingId}`,
    { method: "PATCH", body: JSON.stringify({ status }) }
  );
}

export async function rejectRide(bookingId: string) {
  return apiRequest<{ success: boolean; message: string }>(
    `/driver/rides/${bookingId}`,
    { method: "PATCH", body: JSON.stringify({ action: "reject" }) }
  );
}

export async function acceptRide(bookingId: string) {
  return apiRequest<{ success: boolean; message: string }>(
    `/driver/rides/${bookingId}`,
    { method: "PATCH", body: JSON.stringify({ status: "ACCEPTED" }) }
  );
}

export type ChatSenderType = "CUSTOMER" | "DRIVER" | "ADMIN";

export type ChatMessage = {
  id: string;
  senderType: ChatSenderType;
  senderId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
};

export type ChatThreadPayload = {
  success: boolean;
  threadId: string | null;
  messages: ChatMessage[];
  canSend: boolean;
  status: string;
  error?: string;
};

export async function getDriverChat(bookingId: string, since?: string) {
  const qs = since ? `?since=${encodeURIComponent(since)}` : "";
  return apiRequest<ChatThreadPayload>(`/driver/rides/${bookingId}/chat${qs}`);
}

export async function sendDriverChatMessage(bookingId: string, body: string) {
  return apiRequest<{ success: boolean; message: ChatMessage; error?: string }>(
    `/driver/rides/${bookingId}/chat`,
    { method: "POST", body: JSON.stringify({ body }) }
  );
}

export async function getCustomerChat(bookingId: string, since?: string) {
  const qs = since ? `?since=${encodeURIComponent(since)}` : "";
  return apiRequest<ChatThreadPayload>(`/customer/reservations/${bookingId}/chat${qs}`);
}

export async function sendCustomerChatMessage(bookingId: string, body: string) {
  return apiRequest<{ success: boolean; message: ChatMessage; error?: string }>(
    `/customer/reservations/${bookingId}/chat`,
    { method: "POST", body: JSON.stringify({ body }) }
  );
}

export async function toggleDriverActive(isActive: boolean) {
  return apiRequest<{ success: boolean; isActive: boolean; status: string }>(
    "/driver/toggle-active",
    { method: "POST", body: JSON.stringify({ isActive }) }
  );
}

export async function updateDriverLocation(params: {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
}) {
  return apiRequest<{ success: boolean }>(
    "/driver/location",
    { method: "POST", body: JSON.stringify(params) }
  );
}

// ==================== CONCIERGE TYPES ====================

export type ConciergeVehicleRequestRule = "SEDAN" | "SEDAN_ONLY" | "SUV" | "CADILLAC_ONLY";
export type ConciergeGuestPaymentMethod = "CASH" | "APP" | "UNSET";
export type ConciergeRideStatus =
  | "OPEN"
  | "ASSIGNED"
  | "ON_THE_WAY"
  | "ARRIVED"
  | "IN_TRIP"
  | "COMPLETED"
  | "CANCELLED";

export interface ConciergeCommission {
  id?: string;
  rideId?: string;
  conciergeClaim: string;
  driverClaim: string;
  matched: boolean;
  disputeOpen: boolean;
}

export interface ConciergeRideDriver {
  name: string;
  phone: string;
  vehicle?: string;
  vehiclePlate?: string;
  rating?: number;
  lastLatitude?: number | null;
  lastLongitude?: number | null;
  lastLocationUpdatedAt?: string | null;
}

export interface ConciergeRide {
  id: string;
  requestCode: string;
  status: ConciergeRideStatus | string;
  guestName: string;
  guestPhone: string;
  pickupLocation: string;
  dropoffLocation: string;
  notes?: string | null;
  vehicleRequestRule: ConciergeVehicleRequestRule | string;
  guestPaymentMethod: ConciergeGuestPaymentMethod | string;
  fare: number;
  platformFee: number;
  hotelCommission: number;
  completedAt?: string | null;
  createdAt: string;
  hotel?: { name: string; commissionPercent?: number; city?: string };
  concierge?: { name: string; phone: string };
  assignedDriverProfile?: {
    id: string;
    driver?: ConciergeRideDriver | null;
  } | null;
  commission?: ConciergeCommission | null;
  ratings?: Array<{
    id: string;
    fromRole: string;
    toRole: string;
    stars: number;
    note?: string | null;
  }>;
}

export interface ConciergeDashboard {
  activeRequests: number;
  completedTrips: number;
  pendingCommissions: number;
  commissionHistory?: unknown[];
  driverRatings?: unknown[];
}

export interface ConciergeDriverProfile {
  id: string;
  driverId: string;
  availability: "ONLINE" | "OFFLINE" | "BUSY" | string;
  membershipStatus: string;
  membershipExpiresAt?: string | null;
  vehicleClass?: string;
  vehicleLabel?: string | null;
  referralEarnings?: number;
  driver?: { name: string; phone: string; rating: number };
}

export interface DriverConciergeEarnings {
  completedTrips: number;
  grossFare: number;
  platformFees: number;
  netEarnings: number;
  hotelCommissions: number;
  referralEarnings: number;
}

// ==================== CONCIERGE AUTH API ====================

export async function loginConcierge(email: string, password: string) {
  const data = await apiRequest<{
    success: boolean;
    token: string;
    concierge: ConciergeProfile;
    error?: string;
  }>("/concierge/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (data.success && data.token) {
    await setConciergeSession(data.token, data.concierge);
  }

  return data;
}

export async function logoutConcierge() {
  await clearConciergeSession();
  await clearLegacyAuthKeys();
}

export async function getConciergeMe() {
  return apiRequest<{ success: boolean; concierge: ConciergeProfile }>(
    "/concierge/auth/me"
  );
}

export async function getConciergeDashboard() {
  return apiRequest<{ success: boolean; dashboard: ConciergeDashboard }>(
    "/concierge/dashboard"
  );
}

export async function getConciergeRides(status?: "active" | "completed" | string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiRequest<{ success: boolean; rides: ConciergeRide[] }>(
    `/concierge/rides${qs}`
  );
}

export async function createConciergeRide(body: {
  guestName?: string;
  guestPhone?: string;
  pickupLocation: string;
  dropoffLocation?: string;
  notes?: string;
  vehicleRequestRule: ConciergeVehicleRequestRule;
  guestPaymentMethod?: ConciergeGuestPaymentMethod;
  fare?: number;
}) {
  return apiRequest<{ success: boolean; ride: ConciergeRide; error?: string }>(
    "/concierge/rides",
    { method: "POST", body: JSON.stringify(body) }
  );
}

export async function getConciergeRide(id: string) {
  return apiRequest<{ success: boolean; ride: ConciergeRide }>(
    `/concierge/rides/${id}`
  );
}

export async function patchConciergeRide(
  id: string,
  body:
    | { action: "cancel" }
    | { action: "set_payment"; guestPaymentMethod: "CASH" | "APP" }
    | { action: "commission"; conciergeClaim: "RECEIVED" | "NOT_RECEIVED" }
    | { action: "rate"; stars: number; note?: string }
) {
  return apiRequest<{
    success: boolean;
    ride?: ConciergeRide;
    commission?: ConciergeCommission;
    rating?: unknown;
    error?: string;
  }>(`/concierge/rides/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function createConciergePaymentIntent(rideId: string) {
  return apiRequest<{
    success: boolean;
    clientSecret: string | null;
    platformFee: number;
    amount: number;
  }>("/concierge/rides/payment-intent", {
    method: "POST",
    body: JSON.stringify({ rideId }),
  });
}

export async function createConciergeCheckout(rideId: string, returnBaseUrl: string) {
  return apiRequest<{
    success: boolean;
    url: string | null;
    sessionId: string;
    platformFee: number;
    amount: number;
    demoHint?: string;
  }>("/concierge/rides/checkout", {
    method: "POST",
    body: JSON.stringify({ rideId, returnBaseUrl }),
  });
}

export async function confirmConciergePayment(rideId: string, paymentIntentId: string) {
  return apiRequest<{ success: boolean; ride: ConciergeRide }>(
    "/concierge/rides/confirm-payment",
    {
      method: "POST",
      body: JSON.stringify({ rideId, paymentIntentId }),
    }
  );
}

/** Web origin for Stripe success/cancel pages (API base without /api). */
export function getConciergePayWebOrigin(): string {
  return API_BASE_URL.replace(/\/api\/?$/, "");
}

// ==================== DRIVER CONCIERGE API ====================

export async function getDriverConciergeRides(tab: "open" | "mine" = "open") {
  return apiRequest<{
    success: boolean;
    enrolled: boolean;
    profile: ConciergeDriverProfile | null;
    openRequests?: ConciergeRide[];
    myRides?: ConciergeRide[];
  }>(`/driver/concierge/rides?tab=${tab}`);
}

export async function patchDriverConcierge(
  body:
    | { action: "set_availability"; availability: "ONLINE" | "OFFLINE" }
    | { action: "accept"; rideId: string }
    | { action: "reject"; rideId: string }
    | {
        action: "status";
        rideId: string;
        status: "ON_THE_WAY" | "ARRIVED" | "IN_TRIP" | "COMPLETED" | "CANCELLED";
      }
    | { action: "commission"; rideId: string; driverClaim: "PAID" | "NOT_PAID" }
    | { action: "rate"; rideId: string; stars: number; note?: string }
) {
  return apiRequest<{
    success: boolean;
    profile?: ConciergeDriverProfile;
    ride?: ConciergeRide;
    commission?: ConciergeCommission;
    rating?: unknown;
    error?: string;
  }>("/driver/concierge/rides", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function getDriverConciergeEarnings() {
  return apiRequest<{
    success: boolean;
    enrolled: boolean;
    profile?: {
      membershipStatus: string;
      membershipExpiresAt?: string | null;
      availability: string;
      vehicleClass: string;
      referralEarnings: number;
    };
    earnings: DriverConciergeEarnings;
  }>("/driver/concierge/earnings");
}
