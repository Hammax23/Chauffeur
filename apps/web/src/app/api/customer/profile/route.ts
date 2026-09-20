import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { customerInactiveHttpResponse } from "@/lib/customer-auth";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key";

function getCustomerFromToken(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; type: string };
    if (decoded.type !== "customer") return null;
    return decoded;
  } catch {
    return null;
  }
}

// GET - Get customer profile
export async function GET(req: NextRequest) {
  try {
    const tokenData = getCustomerFromToken(req);
    if (!tokenData) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const customer = await prisma.customer.findUnique({
      where: { id: tokenData.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        city: true,
        photo: true,
        accountStatus: true,
        deactivatedAt: true,
        oauthProvider: true,
        createdAt: true,
      },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Customer not found" },
        { status: 404 }
      );
    }

    const inactive = customerInactiveHttpResponse(customer);
    if (inactive) {
      return NextResponse.json(inactive.body, { status: inactive.status });
    }

    const { accountStatus: _s, deactivatedAt: _d, oauthProvider: _o, ...safeCustomer } = customer;
    return NextResponse.json({ success: true, customer: safeCustomer });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

// PATCH - Update customer profile
export async function PATCH(req: NextRequest) {
  try {
    const tokenData = getCustomerFromToken(req);
    if (!tokenData) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const existing = await prisma.customer.findUnique({
      where: { id: tokenData.id },
      select: {
        id: true,
        accountStatus: true,
        deactivatedAt: true,
        oauthProvider: true,
      },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Customer not found" },
        { status: 404 }
      );
    }
    const inactive = customerInactiveHttpResponse(existing);
    if (inactive) {
      return NextResponse.json(inactive.body, { status: inactive.status });
    }

    const body = await req.json();
    const { firstName, lastName, phone, city, photo } = body;

    const updateData: Record<string, string> = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phone) updateData.phone = phone;
    if (city !== undefined) updateData.city = city;
    if (photo !== undefined) updateData.photo = photo;

    const customer = await prisma.customer.update({
      where: { id: tokenData.id },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        city: true,
        photo: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      customer,
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
