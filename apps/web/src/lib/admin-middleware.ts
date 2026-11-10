import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "./admin-auth";

/**
 * Middleware helper to protect admin API routes
 * Use this in any admin API route to verify authentication
 */
export async function withAdminAuth(
  request: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const auth = await verifyAdminAuth(request);

  if (!auth.authenticated) {
    const forbidden = auth.code === "FORBIDDEN_ROLE";
    return NextResponse.json(
      { 
        success: false, 
        error: auth.error || "Unauthorized. Please login to access this resource.",
        code: auth.code || "UNAUTHORIZED"
      },
      { status: forbidden ? 403 : 401 }
    );
  }

  return handler();
}

/**
 * Create a protected admin route handler
 */
export function createProtectedHandler(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    return withAdminAuth(request, () => handler(request));
  };
}
