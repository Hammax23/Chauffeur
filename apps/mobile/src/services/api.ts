import * as SecureStore from "expo-secure-store";
import { API_ENDPOINTS } from "@chauffeur/shared";
import type { User, Booking, Service, ApiResponse } from "@chauffeur/shared";

// Base URL - Update this to your production URL
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "https://sarjworldwide.com";

async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await SecureStore.getItemAsync("auth_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = await getAuthHeaders();
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  const data: ApiResponse<T> = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || "An error occurred");
  }

  return data.data as T;
}

export const api = {
  auth: {
    login: async (email: string, password: string) => {
      return fetchApi<{ token: string; user: User }>(API_ENDPOINTS.AUTH.LOGIN, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
    },

    register: async (name: string, email: string, password: string) => {
      return fetchApi<{ token: string; user: User }>(API_ENDPOINTS.AUTH.REGISTER, {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
    },

    me: async () => {
      return fetchApi<User>(API_ENDPOINTS.AUTH.ME);
    },
  },

  bookings: {
    list: async () => {
      return fetchApi<Booking[]>(API_ENDPOINTS.BOOKINGS.LIST);
    },

    get: async (id: string) => {
      return fetchApi<Booking>(API_ENDPOINTS.BOOKINGS.GET(id));
    },

    create: async (bookingData: Partial<Booking>) => {
      return fetchApi<Booking>(API_ENDPOINTS.BOOKINGS.CREATE, {
        method: "POST",
        body: JSON.stringify(bookingData),
      });
    },

    cancel: async (id: string) => {
      return fetchApi<Booking>(API_ENDPOINTS.BOOKINGS.CANCEL(id), {
        method: "POST",
      });
    },
  },

  services: {
    list: async () => {
      return fetchApi<Service[]>(API_ENDPOINTS.SERVICES.LIST);
    },

    get: async (slug: string) => {
      return fetchApi<Service>(API_ENDPOINTS.SERVICES.GET(slug));
    },
  },
};
