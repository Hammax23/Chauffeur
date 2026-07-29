import { NextRequest, NextResponse } from "next/server";
import { verifyConciergeToken } from "@/lib/concierge-auth";

export async function POST(req: NextRequest) {
  const auth = await verifyConciergeToken(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  // Stateless JWT — client clears token
  return NextResponse.json({ success: true });
}
