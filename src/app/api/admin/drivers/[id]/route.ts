import { NextRequest, NextResponse } from "next/server";
import { updateDriver, deleteDriver, getDriverById } from "@/lib/data-store";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
  try {
    const { id } = await params;
    const body = await request.json();

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
