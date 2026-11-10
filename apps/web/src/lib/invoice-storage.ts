import "server-only";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export function isInvoiceStorageConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
      process.env.CLOUDINARY_API_KEY?.trim() &&
      process.env.CLOUDINARY_API_SECRET?.trim()
  );
}

/** Durable primary PDF archive (Dropbox is secondary). Never hard-delete from app flows. */
export async function uploadInvoicePdf(opts: {
  buffer: Buffer;
  invoiceNumber: string;
  bookingId: string;
}): Promise<{ url: string; storageKey: string }> {
  if (!isInvoiceStorageConfigured()) {
    throw new Error("Cloudinary is not configured for invoice PDF storage.");
  }
  const safeInv = opts.invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeBook = opts.bookingId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const publicId = `sarj/invoices/${safeBook}/${safeInv}`;

  const result = await new Promise<{ secure_url: string; public_id: string }>(
    (resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: undefined,
          public_id: publicId,
          resource_type: "raw",
          format: "pdf",
          overwrite: false,
          invalidate: false,
        },
        (err, res) => {
          if (err || !res) reject(err || new Error("Cloudinary upload failed"));
          else
            resolve({
              secure_url: res.secure_url,
              public_id: res.public_id,
            });
        }
      );
      stream.end(opts.buffer);
    }
  );

  return { url: result.secure_url, storageKey: result.public_id };
}
