import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function resolveMapsKey(): string | undefined {
  const server = process.env.GOOGLE_MAPS_SERVER_KEY?.trim();
  if (server) return server;
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || undefined;
}

/**
 * Server proxy for Google Places Autocomplete (mobile + any non-JS clients).
 * Prefer GOOGLE_MAPS_SERVER_KEY (IP-restricted / no HTTP referrer) so calls succeed from Node;
 * NEXT_PUBLIC_* keys are often browser-referrer restricted and will return REQUEST_DENIED here.
 */
export async function GET(req: NextRequest) {
  const key = resolveMapsKey();
  if (!key) {
    return NextResponse.json(
      { success: false, error: "Places API is not configured on the server." },
      { status: 503 }
    );
  }

  const input = (req.nextUrl.searchParams.get("input") || "").trim();
  const session = (req.nextUrl.searchParams.get("session") || "").trim();
  const typesRaw = (req.nextUrl.searchParams.get("types") || "").trim().toLowerCase();
  const worldwide =
    req.nextUrl.searchParams.get("worldwide") === "1" ||
    req.nextUrl.searchParams.get("worldwide") === "true";

  if (input.length < 2) {
    return NextResponse.json({ success: true, predictions: [] });
  }
  if (input.length > 256) {
    return NextResponse.json({ success: false, error: "Input too long." }, { status: 400 });
  }

  // Only allow the known Places Autocomplete type we use for airport composer.
  const types = typesRaw === "airport" ? "airport" : "";

  const params = new URLSearchParams({
    input,
    key,
    language: "en",
  });
  // Default CA bias for normal address search; airport composer may go worldwide.
  if (!worldwide) {
    params.set("components", "country:ca");
  }
  if (types) {
    params.set("types", types);
  }
  if (session.length >= 8 && session.length <= 128) {
    params.set("sessiontoken", session);
  }

  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`;

  try {
    const res = await fetch(url, { next: { revalidate: 0 } });
    const data = (await res.json()) as {
      status: string;
      predictions?: Array<{
        place_id: string;
        description: string;
        structured_formatting?: {
          main_text: string;
          secondary_text: string;
        };
        types?: string[];
      }>;
      error_message?: string;
    };

    if (data.status === "ZERO_RESULTS") {
      return NextResponse.json({ success: true, predictions: [] });
    }

    if (data.status !== "OK" || !data.predictions) {
      return NextResponse.json(
        {
          success: false,
          error: data.error_message || `Places autocomplete: ${data.status}`,
        },
        { status: 502 }
      );
    }

    const predictions = data.predictions.map((p) => ({
      placeId: p.place_id,
      description: p.description,
      mainText: p.structured_formatting?.main_text ?? p.description,
      secondaryText: p.structured_formatting?.secondary_text ?? "",
      types: p.types ?? [],
    }));

    return NextResponse.json({ success: true, predictions });
  } catch {
    return NextResponse.json(
      { success: false, error: "Could not reach Google Places." },
      { status: 502 }
    );
  }
}
