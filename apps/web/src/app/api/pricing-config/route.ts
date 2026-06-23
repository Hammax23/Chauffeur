import { NextResponse } from "next/server";
import { getPricingConfig } from "@/lib/get-pricing-config";

/** Public endpoint to fetch pricing configuration (charges) for client-side calculations */
export async function GET() {
  try {
    const config = await getPricingConfig();
    return NextResponse.json({
      success: true,
      charges: config.charges,
    });
  } catch (error) {
    console.error("[PricingConfig API] Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch pricing config" }, { status: 500 });
  }
}
