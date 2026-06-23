import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ success: false, error: "Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed." }, { status: 400 });
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ success: false, error: "File too large. Maximum size is 5MB." }, { status: 400 });
    }

    // Generate unique filename
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const filename = `vehicle-${timestamp}-${randomStr}.${ext}`;

    // Ensure fleet directory exists
    const uploadDir = path.join(process.cwd(), "public", "fleet");
    await mkdir(uploadDir, { recursive: true });

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filepath = path.join(uploadDir, filename);
    await writeFile(filepath, buffer);

    // Return the URL path
    const imageUrl = `/fleet/${filename}`;

    return NextResponse.json({
      success: true,
      imageUrl,
      message: "Image uploaded successfully",
    });
  } catch (error: any) {
    console.error("[Upload] Error:", error?.message);
    return NextResponse.json({ success: false, error: "Failed to upload image" }, { status: 500 });
  }
}
