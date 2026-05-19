import { NextRequest, NextResponse } from "next/server";
import { verifyOperationalManagerAuth } from "@/lib/operational-manager-auth";

export async function GET(request: NextRequest) {
  const auth = await verifyOperationalManagerAuth(request);
  return NextResponse.json({
    authenticated: auth.authenticated,
    error: auth.error,
  });
}
