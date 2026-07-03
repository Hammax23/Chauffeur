import { NextResponse } from "next/server";
import { SEO_PANEL_COOKIE_NAME } from "@/lib/seo-auth";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(SEO_PANEL_COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
