import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminAuth } from "@/lib/admin-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const app = await prisma.driverApplication.findUnique({
      where: { id },
      include: {
        documents: {
          orderBy: { key: "asc" },
        },
      },
    });
    if (!app) {
      return NextResponse.json({ success: false, error: "Application not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, application: app });
  } catch (error: any) {
    console.error("Get driver application error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch application" }, { status: 500 });
  }
}

