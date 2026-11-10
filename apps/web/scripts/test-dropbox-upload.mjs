/**
 * Smoke-test: upload a tiny PDF into the connected Dropbox app folder.
 * Does not print tokens.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env.local");

function loadEnv(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (!m) continue;
    out[m[1].trim()] = m[2].trim().replace(/^"|"$/g, "");
  }
  return out;
}

function getKey(env) {
  const raw = env.INTEGRATION_TOKEN_ENCRYPTION_KEY || "";
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, "hex");
  return crypto.scryptSync(raw, "sarj-integration-v1", 32);
}

function decryptSecret(payload, key) {
  const parts = String(payload || "").split(":");
  if (parts.length !== 4 || parts[0] !== "v1") throw new Error("bad secret format");
  const iv = Buffer.from(parts[1], "base64");
  const tag = Buffer.from(parts[2], "base64");
  const data = Buffer.from(parts[3], "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

function encryptSecret(plaintext, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

const env = loadEnv(envPath);
const key = getKey(env);
const prisma = new PrismaClient();

const cred = await prisma.integrationCredential.findUnique({
  where: { provider: "DROPBOX" },
});
if (!cred?.encryptedRefreshToken) {
  console.error("FAIL: Dropbox not connected in DB");
  process.exit(1);
}

let accessToken = cred.encryptedAccessToken
  ? decryptSecret(cred.encryptedAccessToken, key)
  : "";
const refreshToken = decryptSecret(cred.encryptedRefreshToken, key);
const expired =
  !cred.accessTokenExpiresAt ||
  new Date(cred.accessTokenExpiresAt).getTime() < Date.now() + 60_000;

if (!accessToken || expired) {
  const tokenRes = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: env.DROPBOX_APP_KEY,
      client_secret: env.DROPBOX_APP_SECRET,
    }),
  });
  const tok = await tokenRes.json();
  if (!tokenRes.ok || !tok.access_token) {
    console.error("FAIL: token refresh", tok.error || tokenRes.status);
    process.exit(1);
  }
  accessToken = tok.access_token;
  await prisma.integrationCredential.update({
    where: { provider: "DROPBOX" },
    data: {
      encryptedAccessToken: encryptSecret(accessToken, key),
      accessTokenExpiresAt: new Date(Date.now() + (tok.expires_in || 14400) * 1000),
    },
  });
  console.log("access token refreshed: OK");
} else {
  console.log("access token: OK (cached)");
}

// Minimal valid-ish PDF bytes
const pdf = Buffer.from(
  `%PDF-1.1
1 0 obj<<>>endobj
2 0 obj<< /Length 44 >>stream
BT /F1 12 Tf 100 700 Td (SARJ Dropbox test) Tj ET
endstream
endobj
3 0 obj<< /Type /Page /Parent 4 0 R /Contents 2 0 R >>endobj
4 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj
5 0 obj<< /Type /Catalog /Pages 4 0 R >>endobj
xref
0 6
trailer<< /Root 5 0 R /Size 6 >>
startxref
0
%%EOF`
);

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const dropboxPath = `/_tests/SARJ_Dropbox_Test_${stamp}.pdf`;

const uploadRes = await fetch("https://content.dropboxapi.com/2/files/upload", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/octet-stream",
    "Dropbox-API-Arg": JSON.stringify({
      path: dropboxPath,
      mode: "add",
      autorename: true,
      mute: true,
    }),
  },
  body: pdf,
});
const uploaded = await uploadRes.json().catch(() => ({}));
if (!uploadRes.ok) {
  console.error("FAIL: upload", uploadRes.status, uploaded.error_summary || uploaded);
  process.exit(1);
}

console.log("UPLOAD: OK");
console.log("path:", uploaded.path_display || dropboxPath);
console.log("Check Dropbox → Apps → SARJ Chauffeur Auto Invoices → _tests/");

await prisma.$disconnect();
