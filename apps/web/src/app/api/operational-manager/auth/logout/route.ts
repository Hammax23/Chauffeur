import { NextResponse } from "next/server";
import { OPERATIONAL_MANAGER_COOKIE_NAME } from "@/lib/operational-manager-auth";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(OPERATIONAL_MANAGER_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });
  return response;
}
