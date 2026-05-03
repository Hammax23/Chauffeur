import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key";

function getDriverFromToken(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; type: string };
    if (decoded.type !== "driver") return null;
    return decoded;
  } catch {
    return null;
  }
}

// POST - Toggle driver active/inactive status
export async function POST(req: NextRequest) {
  try {
    const tokenData = getDriverFromToken(req);
    if (!tokenData) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { isActive } = body;

    const driver = await prisma.driver.update({
      where: { id: tokenData.id },
      data: {
        isActive: !!isActive,
        status: isActive ? "available" : "offline",
      },
      select: { isActive: true, status: true },
    });

    return NextResponse.json({
      success: true,
      isActive: driver.isActive,
      status: driver.status,
    });
  } catch (error) {
    console.error("Toggle active error:", error);
    return NextResponse.json({ success: false, error: "Failed to toggle status" }, { status: 500 });
  }
}
