import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuthWithRole } from "@/lib/admin-rbac";

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminAuthWithRole(request);

    if (!auth.authenticated) {
      return NextResponse.json(
        { authenticated: false, error: auth.error },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      role: auth.role,
      email: auth.email,
      adminId: auth.adminId,
    });
  } catch (error: unknown) {
    console.error("Auth verification error:", error);
    return NextResponse.json(
      { authenticated: false, error: "Verification failed" },
      { status: 500 }
    );
  }
}
