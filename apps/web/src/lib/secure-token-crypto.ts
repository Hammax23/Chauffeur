import "server-only";
import crypto from "crypto";

/**
 * AES-256-GCM encryption for OAuth refresh/access tokens at rest.
 * Key: INTEGRATION_TOKEN_ENCRYPTION_KEY — 32-byte secret as hex (64 chars) or utf8 passphrase
 * derived via scrypt when not hex.
 */
function getKey(): Buffer {
  const raw = process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new Error(
      "INTEGRATION_TOKEN_ENCRYPTION_KEY is not set (required for QuickBooks/Dropbox tokens)."
    );
  }
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }
  return crypto.scryptSync(raw, "sarj-integration-v1", 32);
}

/** Returns ciphertext as `v1:<iv_b64>:<tag_b64>:<data_b64>`. */
export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

export function decryptSecret(payload: string): string {
  const key = getKey();
  const parts = String(payload || "").split(":");
  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("Invalid encrypted secret format");
  }
  const iv = Buffer.from(parts[1], "base64");
  const tag = Buffer.from(parts[2], "base64");
  const data = Buffer.from(parts[3], "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function isEncryptionConfigured(): boolean {
  return Boolean(process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY?.trim());
}
