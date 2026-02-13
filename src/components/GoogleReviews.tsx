"use client";

import { useState, useEffect } from "react";
import { Star, ExternalLink } from "lucide-react";

interface Review {
  author: string;
  rating: number;
  text: string;
  relativeTime: string;
  time: number;
  profilePhoto: string;
}

interface ReviewsData {
  name: string;
  rating: number;
  totalReviews: number;
  reviews: Review[];
}

const GoogleReviews = () => {
  const [data, setData] = useState<ReviewsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await fetch("/api/google-reviews");
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Error fetching Google reviews:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, []);

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? "text-yellow-400 fill-yellow-400"
                : star - 0.5 <= rating
                ? "text-yellow-400 fill-yellow-400/50"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <section className="py-16 sm:py-20 bg-[#FAFAFA]">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="flex flex-col items-center gap-6">
            <div className="w-48 h-6 bg-gray-200 rounded-lg animate-pulse" />
            <div className="w-72 h-10 bg-gray-200 rounded-lg animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full mt-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-6 h-52 animate-pulse border border-gray-100" />
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!data || !data.reviews || data.reviews.length === 0) return null;

  return (
    <section className="py-16 sm:py-20 bg-[#FAFAFA]">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-gray-200 bg-white mb-6">
            <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span className="text-[13px] font-medium text-gray-600 tracking-wide uppercase">Google Reviews</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-gray-900 mb-4">
            What Our Clients Say
          </h2>

          {/* Overall Rating */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <div className="flex items-center gap-1.5">
              <span className="text-3xl font-bold text-gray-900">{data.rating?.toFixed(1)}</span>
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${
                        star <= Math.round(data.rating)
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[13px] text-gray-500">
                  {data.totalReviews} reviews on Google
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {data.reviews
            .filter((r) => !r.author.toLowerCase().includes("zaid"))
            .sort((a, b) => (a.author.toLowerCase().includes("alexandra") ? -1 : b.author.toLowerCase().includes("alexandra") ? 1 : 0))
            .slice(0, 4)
            .map((review, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-7 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 flex flex-col"
            >
              {/* Author Row */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-[#C9A063]/20 to-[#C9A063]/5 border border-[#C9A063]/10">
                  {review.profilePhoto ? (
                    <img
                      src={review.profilePhoto}
                      alt={review.author}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#C9A063] font-semibold text-lg">
                      {review.author.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[15px] font-semibold text-gray-900 truncate">{review.author}</h4>
                  <p className="text-[12px] text-gray-400">{review.relativeTime}</p>
                </div>
              </div>

              {/* Stars */}
              <div className="mb-3">
                {renderStars(review.rating)}
              </div>

              {/* Review Text */}
              <p className="text-[14px] text-gray-600 leading-relaxed flex-1 line-clamp-4">
                {review.text || "Great experience!"}
              </p>
            </div>
          ))}
        </div>

        {/* View All on Google */}
        <div className="text-center mt-10">
          <a
            href="https://www.google.com/maps/place/SARJ+Chauffeur/@43.5075535,-79.6693308,17z/data=!4m8!3m7!1s0xa415b193b964f1a7:0x897cefc473b0f490!8m2!3d43.5075535!4d-79.6693308!9m1!1b1!16s%2Fg%2F11ltb61n1w"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-gray-200 bg-white text-gray-700 font-medium text-[14px] hover:border-[#C9A063] hover:text-[#C9A063] transition-all duration-300 shadow-sm hover:shadow-md"
          >
            View All Reviews on Google
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
};

export default GoogleReviews;
