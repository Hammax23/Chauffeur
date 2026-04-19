// Shared constants

export const APP_NAME = 'SARJ Worldwide';

export const BOOKING_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  DRIVER: 'driver',
} as const;

export const VEHICLE_TYPES = {
  SEDAN: 'sedan',
  SUV: 'suv',
  LUXURY: 'luxury',
  VAN: 'van',
  LIMOUSINE: 'limousine',
} as const;

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    ME: '/api/auth/me',
  },
  BOOKINGS: {
    LIST: '/api/bookings',
    CREATE: '/api/bookings',
    GET: (id: string) => `/api/bookings/${id}`,
    UPDATE: (id: string) => `/api/bookings/${id}`,
    CANCEL: (id: string) => `/api/bookings/${id}/cancel`,
  },
  SERVICES: {
    LIST: '/api/services',
    GET: (slug: string) => `/api/services/${slug}`,
  },
  VEHICLES: {
    LIST: '/api/vehicles',
    GET: (id: string) => `/api/vehicles/${id}`,
  },
} as const;

export const COLORS = {
  primary: '#C9A063',
  primaryDark: '#8B7355',
  black: '#1a1a1a',
  white: '#ffffff',
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
} as const;
