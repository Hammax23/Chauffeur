import { NextResponse } from "next/server";

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const PLACE_QUERY = "SARJ Chauffeur";

let cachedReviews: unknown = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

export async function GET() {
  try {
    // Return cached reviews if fresh
    if (cachedReviews && Date.now() - cacheTimestamp < CACHE_DURATION) {
      return NextResponse.json(cachedReviews);
    }

    if (!GOOGLE_API_KEY) {
      return NextResponse.json(
        { error: "Google API key not configured" },
        { status: 500 }
      );
    }

    // Step 1: Find Place ID
    const findPlaceUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(PLACE_QUERY)}&inputtype=textquery&fields=place_id&key=${GOOGLE_API_KEY}`;
    const findRes = await fetch(findPlaceUrl);
    const findData = await findRes.json();

    if (
      findData.status !== "OK" ||
      !findData.candidates ||
      findData.candidates.length === 0
    ) {
      return NextResponse.json(
        { error: "Place not found", details: findData.status },
        { status: 404 }
      );
    }

    const placeId = findData.candidates[0].place_id;

    // Step 2: Get Place Details with reviews
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,user_ratings_total,reviews&reviews_sort=newest&key=${GOOGLE_API_KEY}`;
    const detailsRes = await fetch(detailsUrl);
    const detailsData = await detailsRes.json();

    if (detailsData.status !== "OK" || !detailsData.result) {
      return NextResponse.json(
        { error: "Failed to fetch place details", details: detailsData.status },
        { status: 500 }
      );
    }

    const { name, rating, user_ratings_total, reviews } = detailsData.result;

    const response = {
      name,
      rating,
      totalReviews: user_ratings_total,
      reviews: (reviews || []).slice(0, 5).map(
        (review: {
          author_name: string;
          rating: number;
          text: string;
          relative_time_description: string;
          time: number;
          profile_photo_url: string;
        }) => ({
          author: review.author_name,
          rating: review.rating,
          text: review.text,
          relativeTime: review.relative_time_description,
          time: review.time,
          profilePhoto: review.profile_photo_url,
        })
      ),
    };

    // Cache the response
    cachedReviews = response;
    cacheTimestamp = Date.now();

    return NextResponse.json(response);
  } catch (error) {
    console.error("Google Reviews API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}
