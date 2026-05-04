import { NextRequest, NextResponse } from "next/server";
import { updateDriver, deleteDriver, getDriverById } from "@/lib/data-store";
import { verifyAdminAuth } from "@/lib/admin-auth";
import bcrypt from "bcryptjs";

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
    const driver = await getDriverById(id);
    
    if (!driver) {
      return NextResponse.json({ success: false, error: "Driver not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, driver });
  } catch (error: any) {
    console.error("Get driver error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch driver" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    // If password is provided, hash it before updating
    if (body.password && body.password.trim() !== "") {
      body.password = await bcrypt.hash(body.password, 12);
    } else {
      // Remove empty password field to prevent overwriting with empty string
      delete body.password;
    }

    const success = await updateDriver(id, body);
    
    if (!success) {
      return NextResponse.json({ success: false, error: "Driver not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Update driver error:", error);
    return NextResponse.json({ success: false, error: "Failed to update driver" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const success = await deleteDriver(id);
    
    if (!success) {
      return NextResponse.json({ success: false, error: "Driver not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete driver error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete driver" }, { status: 500 });
  }
}
