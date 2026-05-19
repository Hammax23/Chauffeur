import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function resolveMapsKey(): string | undefined {
  const server = process.env.GOOGLE_MAPS_SERVER_KEY?.trim();
  if (server) return server;
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || undefined;
}

/** Resolve place_id to canonical formatted_address (used after autocomplete pick). */
export async function GET(req: NextRequest) {
  const key = resolveMapsKey();
  if (!key) {
    return NextResponse.json(
      { success: false, error: "Places API is not configured on the server." },
      { status: 503 }
    );
  }

  const placeId = (req.nextUrl.searchParams.get("placeId") || "").trim();
  const session = (req.nextUrl.searchParams.get("session") || "").trim();

  if (!placeId || placeId.length > 256) {
    return NextResponse.json({ success: false, error: "Invalid placeId." }, { status: 400 });
  }

  const params = new URLSearchParams({
    place_id: placeId,
    key,
    fields: "formatted_address,geometry/location,name",
    language: "en",
  });
  if (session.length >= 8 && session.length <= 128) {
    params.set("sessiontoken", session);
  }

  const url = `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`;

  try {
    const res = await fetch(url, { next: { revalidate: 0 } });
    const data = (await res.json()) as {
      status: string;
      result?: {
        formatted_address?: string;
        name?: string;
        geometry?: { location?: { lat: number; lng: number } };
      };
      error_message?: string;
    };

    if (data.status !== "OK" || !data.result?.formatted_address) {
      return NextResponse.json(
        {
          success: false,
          error: data.error_message || `Place details: ${data.status}`,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      formattedAddress: data.result.formatted_address,
      name: data.result.name,
      location: data.result.geometry?.location ?? null,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Could not reach Google Places." },
      { status: 502 }
    );
  }
}
