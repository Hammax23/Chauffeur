const path = require("path");
const fs = require("fs");

/** Load KEY=value lines from .env-style files into a plain object for PM2. */
function loadEnvFile(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

// VPS path from your screenshot — change if your deploy folder differs
const webDir = process.env.SARJ_WEB_DIR || "/var/www/sarjworldwide/apps/web";

const envFromFiles = {
  ...loadEnvFile(path.join(webDir, ".env")),
  ...loadEnvFile(path.join(webDir, ".env.local")),
  ...loadEnvFile(path.join(webDir, ".env.production")),
};

module.exports = {
  apps: [
    {
      name: "sarj-worldwide",
      script: "npm",
      args: "start",
      cwd: webDir,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        ...envFromFiles,
      },
    },
  ],
};
