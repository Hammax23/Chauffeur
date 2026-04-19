// Shared TypeScript types

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'user' | 'admin' | 'driver';
  createdAt: Date;
}

export interface Booking {
  id: string;
  userId: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupDate: Date;
  pickupTime: string;
  vehicleType: string;
  status: BookingStatus;
  totalAmount: number;
  createdAt: Date;
}

export type BookingStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'in_progress' 
  | 'completed' 
  | 'cancelled';

export interface Vehicle {
  id: string;
  name: string;
  type: string;
  capacity: number;
  pricePerHour: number;
  image: string;
  features: string[];
}

export interface Service {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  price: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
