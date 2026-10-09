import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { customerInactiveHttpResponse } from "@/lib/customer-auth";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key";

const VALID_KINDS = new Set(["HOME", "OFFICE"]);

function getCustomerFromToken(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      type: string;
    };
    if (decoded.type !== "customer") return null;
    return decoded;
  } catch {
    return null;
  }
}

async function assertActiveCustomer(id: string) {
  const existing = await prisma.customer.findUnique({
    where: { id },
    select: { id: true, accountStatus: true, deactivatedAt: true },
  });
  if (!existing) {
    return {
      error: NextResponse.json(
        { success: false, error: "Customer not found" },
        { status: 404 }
      ),
    };
  }
  const inactive = customerInactiveHttpResponse(existing);
  if (inactive) {
    return { error: NextResponse.json(inactive.body, { status: inactive.status }) };
  }
  return { error: null };
}

function normalizeKind(raw: unknown): string | null {
  const kind = String(raw || "").trim().toUpperCase();
  return VALID_KINDS.has(kind) ? kind : null;
}

// GET - list saved places for the customer
export async function GET(req: NextRequest) {
  try {
    const tokenData = getCustomerFromToken(req);
    if (!tokenData) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const guard = await assertActiveCustomer(tokenData.id);
    if (guard.error) return guard.error;

    const rows = await prisma.customerSavedPlace.findMany({
      where: { customerId: tokenData.id },
      select: { kind: true, address: true, lat: true, lng: true },
    });

    return NextResponse.json({ success: true, places: rows });
  } catch (error) {
    console.error("Saved places fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch saved places" },
      { status: 500 }
    );
  }
}

// PUT - upsert a saved place by kind
export async function PUT(req: NextRequest) {
  try {
    const tokenData = getCustomerFromToken(req);
    if (!tokenData) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const guard = await assertActiveCustomer(tokenData.id);
    if (guard.error) return guard.error;

    const body = await req.json();
    const kind = normalizeKind(body?.kind);
    if (!kind) {
      return NextResponse.json(
        { success: false, error: "Invalid kind. Use HOME or OFFICE." },
        { status: 400 }
      );
    }
    const address = String(body?.address || "").trim();
    if (address.length < 3) {
      return NextResponse.json(
        { success: false, error: "Address is required." },
        { status: 400 }
      );
    }
    const lat = typeof body?.lat === "number" ? body.lat : null;
    const lng = typeof body?.lng === "number" ? body.lng : null;

    const place = await prisma.customerSavedPlace.upsert({
      where: { customerId_kind: { customerId: tokenData.id, kind } },
      create: { customerId: tokenData.id, kind, address, lat, lng },
      update: { address, lat, lng },
      select: { kind: true, address: true, lat: true, lng: true },
    });

    return NextResponse.json({ success: true, place });
  } catch (error) {
    console.error("Saved place upsert error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save place" },
      { status: 500 }
    );
  }
}

// DELETE - remove a saved place by ?kind=HOME|OFFICE
export async function DELETE(req: NextRequest) {
  try {
    const tokenData = getCustomerFromToken(req);
    if (!tokenData) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const guard = await assertActiveCustomer(tokenData.id);
    if (guard.error) return guard.error;

    const kind = normalizeKind(req.nextUrl.searchParams.get("kind"));
    if (!kind) {
      return NextResponse.json(
        { success: false, error: "Invalid kind. Use HOME or OFFICE." },
        { status: 400 }
      );
    }

    await prisma.customerSavedPlace.deleteMany({
      where: { customerId: tokenData.id, kind },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Saved place delete error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete place" },
      { status: 500 }
    );
  }
}
