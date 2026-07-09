import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { verifySeoPanelAuth, getClientIP } from "@/lib/seo-auth";
import { logSeoAudit } from "@/lib/seo-audit";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

export async function POST(request: NextRequest) {
  const auth = await verifySeoPanelAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    return NextResponse.json({ success: false, error: "Cloudinary is not configured" }, { status: 500 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const folder = (formData.get("folder") as string) || "seo-panel";

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    if (!IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json({ success: false, error: "Invalid file type. Upload JPG, PNG, or WebP" }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: "File too large. Maximum 5MB allowed" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const dataURI = `data:${file.type};base64,${buffer.toString("base64")}`;

    const result = await cloudinary.uploader.upload(dataURI, {
      folder: `sarj/${folder}`,
      resource_type: "image",
      transformation: [
        { width: 1600, height: 1600, crop: "limit" },
        { quality: "auto" },
        { fetch_format: "auto" },
      ],
    });

    await logSeoAudit({
      action: "create",
      entityType: "bulk",
      entityLabel: "Image upload",
      details: { url: result.secure_url, folder },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({ success: true, url: result.secure_url });
  } catch (error) {
    console.error("[SEO Upload]", error);
    return NextResponse.json({ success: false, error: "Failed to upload file" }, { status: 500 });
  }
}
