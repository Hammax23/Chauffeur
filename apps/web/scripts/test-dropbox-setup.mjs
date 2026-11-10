/**
 * Local Dropbox setup smoke test — does not print secrets.
 * Usage: node scripts/test-dropbox-setup.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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

const env = loadEnv(envPath);
const key = env.DROPBOX_APP_KEY || "";
const secret = env.DROPBOX_APP_SECRET || "";
const redirect = env.DROPBOX_REDIRECT_URI || "";

console.log("DROPBOX_APP_KEY set:", Boolean(key), `(len ${key.length})`);
console.log("DROPBOX_APP_SECRET set:", Boolean(secret), `(len ${secret.length})`);
console.log("DROPBOX_REDIRECT_URI:", redirect || "(missing)");
console.log(
  "INTEGRATION_TOKEN_ENCRYPTION_KEY set:",
  Boolean(env.INTEGRATION_TOKEN_ENCRYPTION_KEY)
);
console.log("DROPBOX_ALLOW_NON_PROD:", env.DROPBOX_ALLOW_NON_PROD || "(unset)");

if (!key || !secret) {
  console.error("FAIL: missing app key/secret");
  process.exit(1);
}

const basic = Buffer.from(`${key}:${secret}`).toString("base64");
const checkRes = await fetch("https://api.dropboxapi.com/2/check/app", {
  method: "POST",
  headers: {
    Authorization: `Basic ${basic}`,
    "Content-Type": "application/json",
  },
  body: "{}",
});
console.log("check/app status:", checkRes.status, checkRes.ok ? "OK" : "FAIL");
if (!checkRes.ok) {
  console.log("check/app body:", await checkRes.text());
  process.exit(1);
}

const authUrl = new URL("https://www.dropbox.com/oauth2/authorize");
authUrl.searchParams.set("client_id", key);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("token_access_type", "offline");
authUrl.searchParams.set("redirect_uri", redirect);
authUrl.searchParams.set("state", "sarj-setup-test");

const authPage = await fetch(authUrl.toString(), { redirect: "follow" });
const html = await authPage.text();
const invalidRedirect = /invalid redirect_uri|Redirect URI.*mismatch|redirect_uri.*not match/i.test(
  html
);
console.log("authorize page status:", authPage.status);
console.log(
  "redirect_uri accepted:",
  invalidRedirect ? "NO — add exact URI in Dropbox Settings" : "YES (page does not show invalid redirect)"
);

try {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  const row = await prisma.integrationCredential.findUnique({
    where: { provider: "DROPBOX" },
  });
  console.log("DB Dropbox connected:", Boolean(row));
  if (row) {
    console.log("  connectedAt:", row.connectedAt?.toISOString?.() || row.connectedAt);
    console.log("  folderPath:", row.folderPath || "(default)");
  }
  await prisma.$disconnect();
} catch (e) {
  console.log("DB check skipped:", e.message);
}

console.log("\nNext: open /admin/billing as Owner → Dropbox Connect (browser OAuth).");
