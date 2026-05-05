import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
const DOCUMENT_TYPES = [...IMAGE_TYPES, "application/pdf"];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = (formData.get("type") as string) || "misc";

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    const isDriverDocument = type === "driver-document";
    const allowedTypes = isDriverDocument ? DOCUMENT_TYPES : IMAGE_TYPES;

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: isDriverDocument
            ? "Invalid file type. Upload JPG, PNG, WebP, or PDF"
            : "Invalid file type. Please upload JPG, PNG, or WebP",
        },
        { status: 400 }
      );
    }

    const maxBytes = isDriverDocument ? 12 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json(
        {
          success: false,
          error: `File too large. Maximum ${isDriverDocument ? "12MB" : "5MB"} allowed`,
        },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    const dataURI = `data:${file.type};base64,${base64}`;

    const folder = `sarj/${isDriverDocument ? "driver-documents" : type || "misc"}`;
    const isPdf = file.type === "application/pdf";

    const result = await cloudinary.uploader.upload(dataURI, {
      folder,
      resource_type: isPdf ? "raw" : "image",
      ...(isPdf
        ? {}
        : {
            transformation: [
              { width: 1600, height: 1600, crop: "limit" },
              { quality: "auto" },
              { fetch_format: "auto" },
            ],
          }),
    });

    return NextResponse.json({ success: true, url: result.secure_url });
  } catch (error: unknown) {
    console.error("Upload error:", error);
    return NextResponse.json({ success: false, error: "Failed to upload file" }, { status: 500 });
  }
}
