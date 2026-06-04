import { NextResponse } from "next/server";

/** SARJ Google Business — optional override in .env (Place Details place_id). */
const DEFAULT_PLACE_ID = process.env.GOOGLE_PLACE_ID?.trim() || "";

const PLACE_QUERIES = [
  "SARJ Chauffeur",
  "SARJ Worldwide Chauffeur",
  "SARJ Worldwide Chauffeur Services",
];

function resolveGoogleKey(): string | undefined {
  const server = process.env.GOOGLE_MAPS_SERVER_KEY?.trim();
  if (server) return server;
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || undefined;
}

type GoogleReview = {
  author: string;
  rating: number;
  text: string;
  relativeTime: string;
  time: number;
  profilePhoto: string;
};

type ReviewsPayload = {
  name: string;
  rating: number;
  totalReviews: number;
  reviews: GoogleReview[];
  source?: "google" | "fallback" | "cache";
};

/** Shown when Google API is unavailable — keeps homepage stable. */
const FALLBACK_RESPONSE: ReviewsPayload = {
  name: "SARJ Worldwide Chauffeur Services",
  rating: 5,
  totalReviews: 0,
  reviews: [],
  source: "fallback",
};

let cachedReviews: ReviewsPayload | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

async function findPlaceId(apiKey: string): Promise<string | null> {
  if (DEFAULT_PLACE_ID) return DEFAULT_PLACE_ID;

  for (const query of PLACE_QUERIES) {
    const findUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=place_id&key=${apiKey}`;
    const findRes = await fetch(findUrl, { next: { revalidate: 3600 } });
    const findData = (await findRes.json()) as {
      status: string;
      candidates?: { place_id: string }[];
      error_message?: string;
    };

    if (findData.status === "OK" && findData.candidates?.[0]?.place_id) {
      return findData.candidates[0].place_id;
    }
    console.warn("[google-reviews] findPlace:", query, findData.status, findData.error_message || "");

    const textUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;
    const textRes = await fetch(textUrl, { next: { revalidate: 3600 } });
    const textData = (await textRes.json()) as {
      status: string;
      results?: { place_id: string }[];
      error_message?: string;
    };

    if (textData.status === "OK" && textData.results?.[0]?.place_id) {
      return textData.results[0].place_id;
    }
    console.warn("[google-reviews] textSearch:", query, textData.status, textData.error_message || "");
  }
  return null;
}

export async function GET() {
  try {
    if (cachedReviews && Date.now() - cacheTimestamp < CACHE_DURATION && cachedReviews.reviews.length > 0) {
      return NextResponse.json({ ...cachedReviews, source: "cache" });
    }

    const apiKey = resolveGoogleKey();
    if (!apiKey) {
      console.warn("[google-reviews] No API key (GOOGLE_MAPS_SERVER_KEY or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)");
      return NextResponse.json({ ...FALLBACK_RESPONSE, error: "not_configured" });
    }

    const placeId = await findPlaceId(apiKey);
    if (!placeId) {
      console.warn("[google-reviews] Place ID not found — set GOOGLE_PLACE_ID in .env");
      return NextResponse.json({ ...FALLBACK_RESPONSE, error: "place_not_found" });
    }

    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,user_ratings_total,reviews&reviews_sort=newest&key=${apiKey}`;
    const detailsRes = await fetch(detailsUrl, { next: { revalidate: 3600 } });
    const detailsData = (await detailsRes.json()) as {
      status: string;
      result?: {
        name?: string;
        rating?: number;
        user_ratings_total?: number;
        reviews?: Array<{
          author_name: string;
          rating: number;
          text: string;
          relative_time_description: string;
          time: number;
          profile_photo_url: string;
        }>;
      };
      error_message?: string;
    };

    if (detailsData.status !== "OK" || !detailsData.result) {
      console.warn(
        "[google-reviews] Place details failed:",
        detailsData.status,
        detailsData.error_message || ""
      );
      return NextResponse.json({ ...FALLBACK_RESPONSE, error: "details_failed" });
    }

    const { name, rating, user_ratings_total, reviews } = detailsData.result;

    const response: ReviewsPayload = {
      name: name || FALLBACK_RESPONSE.name,
      rating: rating ?? 5,
      totalReviews: user_ratings_total ?? 0,
      reviews: (reviews || []).slice(0, 6).map((review) => ({
        author: review.author_name,
        rating: review.rating,
        text: review.text,
        relativeTime: review.relative_time_description,
        time: review.time,
        profilePhoto: review.profile_photo_url,
      })),
      source: "google",
    };

    if (response.reviews.length > 0) {
      cachedReviews = response;
      cacheTimestamp = Date.now();
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("[google-reviews] API error:", error);
    return NextResponse.json({ ...FALLBACK_RESPONSE, error: "exception" });
  }
}
