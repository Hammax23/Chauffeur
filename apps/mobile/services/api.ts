import * as SecureStore from "expo-secure-store";

export const API_BASE_URL = __DEV__
  ? "http://192.168.100.246:3000/api"
  : "https://sarjworldwide.ca/api";

const TOKEN_KEY = "sarj_auth_token";
const USER_KEY = "sarj_user_data";

// Token management
export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function removeToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function getStoredUser(): Promise<CustomerProfile | null> {
  try {
    const data = await SecureStore.getItemAsync(USER_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function setStoredUser(user: CustomerProfile): Promise<void> {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function removeStoredUser(): Promise<void> {
  await SecureStore.deleteItemAsync(USER_KEY);
}

// Types
export interface CustomerProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city?: string | null;
  photo?: string | null;
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

// API request helper
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

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
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = (await response.json()) as T;
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
    await setToken(data.token);
    await setStoredUser(data.customer);
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
    await setToken(data.token);
    await setStoredUser(data.customer);
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
    await setToken(data.token);
    await setStoredUser(data.customer);
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
    await setToken(data.token);
    await setStoredUser(data.customer);
  }

  return data;
}

export async function logoutCustomer() {
  await removeToken();
  await removeStoredUser();
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
    await setStoredUser(data.customer);
  }

  return data;
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

export async function cancelReservation(bookingId: string) {
  return apiRequest<{ success: boolean; message: string }>(
    `/customer/reservations/${bookingId}`,
    { method: "DELETE" }
  );
}

// ==================== DRIVER TYPES ====================

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
  createdAt: string;
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
    await setToken(data.token);
    await setStoredUser(data.driver as unknown as CustomerProfile);
  }

  return data;
}

export async function logoutDriver() {
  await removeToken();
  await removeStoredUser();
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
    { method: "DELETE" }
  );
}

export async function acceptRide(bookingId: string) {
  return apiRequest<{ success: boolean; message: string }>(
    `/driver/rides/${bookingId}`,
    { method: "PATCH", body: JSON.stringify({ status: "ON THE WAY" }) }
  );
}

export async function toggleDriverActive(isActive: boolean) {
  return apiRequest<{ success: boolean; isActive: boolean; status: string }>(
    "/driver/toggle-active",
    { method: "POST", body: JSON.stringify({ isActive }) }
  );
}
