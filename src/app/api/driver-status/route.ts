import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get("bookingId");

    if (!bookingId) {
      return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });
    }

    const googleScriptUrl = process.env.GOOGLE_SCRIPT_URL;
    if (!googleScriptUrl) {
      return NextResponse.json({ error: "Google Script URL not configured" }, { status: 500 });
    }

    const res = await fetch(`${googleScriptUrl}?action=get_status&bookingId=${encodeURIComponent(bookingId)}`);
    const data = await res.json();

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Driver status GET error:", error);
    return NextResponse.json({ error: "Failed to get status" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, status } = body;

    if (!bookingId || !status) {
      return NextResponse.json({ error: "Missing bookingId or status" }, { status: 400 });
    }

    const validStatuses = ["PENDING", "ON THE WAY", "ARRIVED", "CIC", "DONE"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const googleScriptUrl = process.env.GOOGLE_SCRIPT_URL;
    if (!googleScriptUrl) {
      return NextResponse.json({ error: "Google Script URL not configured" }, { status: 500 });
    }

    const res = await fetch(googleScriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_status", bookingId, status }),
    });
    const data = await res.json();

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Driver status POST error:", error);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}
