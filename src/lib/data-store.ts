import prisma from "./prisma";

// Reservation interface for API compatibility
export interface ReservationData {
  bookingId: string;
  dateSubmitted?: string;
  status?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  serviceType: string;
  vehicle: string;
  passengers?: number;
  childSeats?: number;
  childSeatType?: string;
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
  driverLink?: string;
  trackLink?: string;
  assignedDriverId?: string;
  stripeCustomerId?: string;
  stripePaymentMethodId?: string;
  cardType?: string;
  cardLast4?: string;
  paymentStatus?: string;
}

// Driver interface for API compatibility
export interface DriverData {
  id?: string;
  driverId?: string;
  name: string;
  phone: string;
  email: string;
  vehicle: string;
  vehiclePlate: string;
  status?: "available" | "on_trip" | "offline";
  photo?: string;
  rating?: number;
  totalTrips?: number;
  createdAt?: string;
}

// Get all reservations
export async function getReservations() {
  const reservations = await prisma.reservation.findMany({
    orderBy: { createdAt: "desc" },
    include: { assignedDriver: true },
  });
  return reservations.map((r: typeof reservations[number]) => ({
    ...r,
    dateSubmitted: r.dateSubmitted.toISOString(),
    childSeats: r.childSeats || 0,
    childSeatType: r.childSeatType || "",
    stops: r.stops || "",
    distance: r.distance || "",
    duration: r.duration || "",
    airline: r.airline || "",
    flightNumber: r.flightNumber || "",
    flightNote: r.flightNote || "",
    specialRequirements: r.specialRequirements || "",
    driverLink: r.driverLink || "",
    trackLink: r.trackLink || "",
    stripeCustomerId: r.stripeCustomerId || "",
    stripePaymentMethodId: r.stripePaymentMethodId || "",
    cardType: r.cardType || "",
    cardLast4: r.cardLast4 || "",
    paymentStatus: r.paymentStatus || "PENDING",
  }));
}

// Add a new reservation
export async function addReservation(data: ReservationData) {
  const reservation = await prisma.reservation.create({
    data: {
      bookingId: data.bookingId,
      status: data.status || "PENDING",
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      serviceType: data.serviceType,
      vehicle: data.vehicle,
      passengers: data.passengers || 1,
      childSeats: data.childSeats || 0,
      childSeatType: data.childSeatType,
      etr407: data.etr407 || "No",
      serviceDate: data.serviceDate,
      serviceTime: data.serviceTime,
      pickupLocation: data.pickupLocation,
      stops: data.stops,
      dropoffLocation: data.dropoffLocation,
      distance: data.distance,
      duration: data.duration,
      airline: data.airline,
      flightNumber: data.flightNumber,
      flightNote: data.flightNote,
      rideFare: data.rideFare || 0,
      stopCharge: data.stopCharge || 0,
      childSeatCharge: data.childSeatCharge || 0,
      subtotal: data.subtotal || 0,
      hst: data.hst || 0,
      gratuity: data.gratuity || 0,
      total: data.total || 0,
      specialRequirements: data.specialRequirements,
      driverLink: data.driverLink,
      trackLink: data.trackLink,
      stripeCustomerId: data.stripeCustomerId,
      stripePaymentMethodId: data.stripePaymentMethodId,
      cardType: data.cardType,
      cardLast4: data.cardLast4,
      paymentStatus: data.paymentStatus || "PENDING",
    },
  });
  return reservation;
}

// Update reservation status
export async function updateReservationStatus(bookingId: string, status: string) {
  try {
    const updateData: { status: string; completedAt?: Date } = { status };
    
    // Set completedAt timestamp when ride is marked as DONE
    if (status === "DONE") {
      updateData.completedAt = new Date();
    }
    
    await prisma.reservation.update({
      where: { bookingId },
      data: updateData,
    });
    return true;
  } catch {
    return false;
  }
}

// Get reservation by booking ID
export async function getReservationById(bookingId: string) {
  const reservation = await prisma.reservation.findUnique({
    where: { bookingId },
    include: { assignedDriver: true },
  });
  return reservation;
}

// Assign driver to reservation
export async function assignDriverToReservation(bookingId: string, driverId: string) {
  try {
    await prisma.reservation.update({
      where: { bookingId },
      data: { assignedDriverId: driverId },
    });
    return true;
  } catch {
    return false;
  }
}

// Update reservation
export async function updateReservation(bookingId: string, updates: Partial<ReservationData>) {
  try {
    await prisma.reservation.update({
      where: { bookingId },
      data: updates,
    });
    return true;
  } catch {
    return false;
  }
}

// Delete reservation
export async function deleteReservation(bookingId: string) {
  try {
    await prisma.reservation.delete({
      where: { bookingId },
    });
    return true;
  } catch {
    return false;
  }
}

// Get all drivers
export async function getDrivers() {
  const drivers = await prisma.driver.findMany({
    orderBy: { createdAt: "desc" },
  });
  return drivers.map((d: typeof drivers[number]) => ({
    id: d.id,
    driverId: d.driverId,
    name: d.name,
    phone: d.phone,
    email: d.email,
    vehicle: d.vehicle,
    vehiclePlate: d.vehiclePlate,
    status: d.status as "available" | "on_trip" | "offline",
    photo: d.photo,
    rating: d.rating,
    totalTrips: d.totalTrips,
    createdAt: d.createdAt.toISOString(),
  }));
}

// Add a new driver
export async function addDriver(data: Omit<DriverData, "id" | "driverId" | "createdAt">) {
  const driverId = `DRV-${Date.now().toString(36).toUpperCase()}`;
  const driver = await prisma.driver.create({
    data: {
      driverId,
      name: data.name,
      phone: data.phone,
      email: data.email,
      vehicle: data.vehicle,
      vehiclePlate: data.vehiclePlate,
      status: data.status || "available",
      photo: data.photo,
      rating: data.rating || 5.0,
      totalTrips: data.totalTrips || 0,
    },
  });
  return {
    id: driver.id,
    driverId: driver.driverId,
    name: driver.name,
    phone: driver.phone,
    email: driver.email,
    vehicle: driver.vehicle,
    vehiclePlate: driver.vehiclePlate,
    status: driver.status as "available" | "on_trip" | "offline",
    photo: driver.photo,
    rating: driver.rating,
    totalTrips: driver.totalTrips,
    createdAt: driver.createdAt.toISOString(),
  };
}

// Update driver
export async function updateDriver(id: string, updates: Partial<DriverData>) {
  try {
    await prisma.driver.update({
      where: { id },
      data: updates,
    });
    return true;
  } catch {
    return false;
  }
}

// Delete driver
export async function deleteDriver(id: string) {
  try {
    await prisma.driver.delete({
      where: { id },
    });
    return true;
  } catch {
    return false;
  }
}

// Get driver by ID
export async function getDriverById(id: string) {
  const driver = await prisma.driver.findUnique({
    where: { id },
  });
  if (!driver) return null;
  return {
    id: driver.id,
    driverId: driver.driverId,
    name: driver.name,
    phone: driver.phone,
    email: driver.email,
    vehicle: driver.vehicle,
    vehiclePlate: driver.vehiclePlate,
    status: driver.status as "available" | "on_trip" | "offline",
    photo: driver.photo,
    rating: driver.rating,
    totalTrips: driver.totalTrips,
    createdAt: driver.createdAt.toISOString(),
  };
}

// Update driver status
export async function updateDriverStatus(id: string, status: "available" | "on_trip" | "offline") {
  try {
    await prisma.driver.update({
      where: { id },
      data: { status },
    });
    return true;
  } catch {
    return false;
  }
}
