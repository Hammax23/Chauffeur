import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string; // 'driver' or other types

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Invalid file type. Please upload JPG, PNG, or WebP" },
        { status: 400 }
      );
    }

    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "File too large. Maximum 5MB allowed" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create unique filename
    const timestamp = Date.now();
    const ext = file.name.split(".").pop() || "jpg";
    const filename = `${type || "upload"}_${timestamp}.${ext}`;

    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), "public", "uploads", type || "misc");
    await mkdir(uploadDir, { recursive: true });

    // Write file
    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);

    // Return public URL
    const publicUrl = `/uploads/${type || "misc"}/${filename}`;

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
