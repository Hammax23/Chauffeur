/**
 * Hit /api/cron/invoice-jobs with Bearer CRON_SECRET.
 * Use from crontab / Task Scheduler / CI every 5–15 minutes.
 *
 *   node scripts/hit-invoice-cron.mjs
 *   CRON_BASE_URL=https://your.domain npm run cron:invoice-jobs
 *
 * Does not print the secret.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

const envLocal = loadEnv(path.join(__dirname, "..", ".env.local"));
const envFile = loadEnv(path.join(__dirname, "..", ".env"));
const env = { ...envFile, ...envLocal, ...process.env };

const secret = (env.CRON_SECRET || "").trim();
if (!secret) {
  console.error("CRON_SECRET is not set");
  process.exit(1);
}

const base = (env.CRON_BASE_URL || env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000")
  .trim()
  .replace(/\/$/, "");
const url = `${base}/api/cron/invoice-jobs`;

const res = await fetch(url, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${secret}`,
    Accept: "application/json",
  },
});

const text = await res.text();
let body;
try {
  body = JSON.parse(text);
} catch {
  body = { raw: text.slice(0, 200) };
}

if (!res.ok) {
  console.error("invoice-cron failed", res.status, body);
  process.exit(1);
}

console.log(
  JSON.stringify({
    ok: true,
    status: res.status,
    claimed: body.claimed ?? null,
    done: body.done ?? null,
    failed: body.failed ?? null,
    at: body.at ?? null,
  })
);
