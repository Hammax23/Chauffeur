import { NextResponse } from "next/server";

export async function GET() {
  try {
    const googleScriptUrl = process.env.GOOGLE_SCRIPT_URL;
    if (!googleScriptUrl) {
      return NextResponse.json({ error: "Google Script URL not configured" }, { status: 500 });
    }

    const res = await fetch(`${googleScriptUrl}?action=get_all`, { cache: "no-store" });
    const data = await res.json();

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Admin reservations error:", error);
    return NextResponse.json({ error: "Failed to fetch reservations" }, { status: 500 });
  }
}
