const fs = require("fs");
const { spawnSync } = require("child_process");

function pick(src, key) {
  const m = src.match(new RegExp("^" + key + "=(.*)$", "m"));
  if (!m) return null;
  return m[1].trim().replace(/^"|"$/g, "");
}

const url = pick(fs.readFileSync(".env.local", "utf8"), "DATABASE_URL");
if (!url) {
  console.error("NO_DATABASE_URL");
  process.exit(1);
}

const env = { ...process.env, DATABASE_URL: url };
const r = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  env,
  stdio: "inherit",
  shell: true,
});
process.exit(r.status || 0);
