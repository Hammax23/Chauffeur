import { NextResponse } from "next/server";
import { getAllCities } from "@/lib/managed-cities";
import { getAllServices } from "@/lib/managed-services";

export const revalidate = 300;

export async function GET() {
  const [cities, services] = await Promise.all([
    getAllCities(),
    getAllServices(),
  ]);

  return NextResponse.json({
    cities: cities.map((c) => ({ slug: c.slug, label: c.label })),
    services: services.map((s) => ({ slug: s.slug, title: s.title, shortDesc: s.shortDesc })),
  });
}
