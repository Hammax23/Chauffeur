import { NextResponse } from "next/server";
import { verifySeoPanelAuth } from "@/lib/seo-auth";

export async function GET() {
  const auth = await verifySeoPanelAuth();
  return NextResponse.json({ authenticated: auth.authenticated, error: auth.error });
}
