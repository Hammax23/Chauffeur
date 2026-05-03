import { createSwaggerSpec } from "next-swagger-doc";

export const getApiDocs = async () => {
  const spec = createSwaggerSpec({
    apiFolder: "src/lib",
    definition: {
      openapi: "3.0.0",
      info: {
        title: "SARJ Worldwide Chauffeur API",
        version: "1.0.0",
        description: "API documentation for SARJ Worldwide Chauffeur Services - Premium luxury transportation platform",
        contact: {
          name: "SARJ Worldwide",
          url: "https://sarjworldwide.com",
        },
      },
      servers: [
        {
          url: "http://localhost:3000",
          description: "Development Server",
        },
        {
          url: "https://sarjworldwide.com",
          description: "Production Server",
        },
      ],
      tags: [
        { name: "Auth", description: "Authentication endpoints" },
        { name: "Reservations", description: "Booking/Reservation management" },
        { name: "Drivers", description: "Driver management" },
        { name: "Quotes", description: "Quote requests" },
        { name: "Customers", description: "Customer management" },
        { name: "Payments", description: "Stripe payment processing" },
        { name: "Admin", description: "Admin dashboard endpoints" },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
          cookieAuth: {
            type: "apiKey",
            in: "cookie",
            name: "sarj_admin_token",
          },
        },
        schemas: {
          Reservation: {
            type: "object",
            properties: {
              id: { type: "string" },
              bookingId: { type: "string", example: "SARJ-ABC123" },
              status: { type: "string", enum: ["PENDING", "ON THE WAY", "ARRIVED", "CIC", "DONE"] },
              firstName: { type: "string" },
              lastName: { type: "string" },
              email: { type: "string", format: "email" },
              phone: { type: "string" },
              serviceType: { type: "string" },
              vehicle: { type: "string" },
              passengers: { type: "integer" },
              serviceDate: { type: "string" },
              serviceTime: { type: "string" },
              pickupLocation: { type: "string" },
              dropoffLocation: { type: "string" },
              total: { type: "number" },
            },
          },
          Driver: {
            type: "object",
            properties: {
              id: { type: "string" },
              driverId: { type: "string", example: "DRV-XYZ789" },
              name: { type: "string" },
              email: { type: "string", format: "email" },
              phone: { type: "string" },
              vehicle: { type: "string" },
              vehiclePlate: { type: "string" },
              status: { type: "string", enum: ["available", "on_trip", "offline"] },
              rating: { type: "number" },
              totalTrips: { type: "integer" },
            },
          },
          Quote: {
            type: "object",
            properties: {
              id: { type: "string" },
              quoteId: { type: "string" },
              status: { type: "string", enum: ["NEW", "CONTACTED", "CONVERTED", "CLOSED"] },
              passengerName: { type: "string" },
              email: { type: "string", format: "email" },
              phone: { type: "string" },
              serviceType: { type: "string" },
              pickupLocation: { type: "string" },
              dropoffLocation: { type: "string" },
            },
          },
          ApiResponse: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
              data: { type: "object" },
              error: { type: "string" },
            },
          },
        },
      },
    },
  });
  return spec;
};
