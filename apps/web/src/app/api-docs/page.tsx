"use client";

import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="bg-[#1a1a1a] text-white py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">SARJ Worldwide API</h1>
            <p className="text-gray-400 text-sm">Chauffeur Services API Documentation</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm">
              v1.0.0
            </span>
            <a 
              href="/" 
              className="text-[#C9A063] hover:underline text-sm"
            >
              ← Back to Website
            </a>
          </div>
        </div>
      </div>
      <SwaggerUI url="/api/docs" />
    </div>
  );
}
