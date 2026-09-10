/** Load app.json and merge Google OAuth IDs from EAS build env (production/TestFlight). */
const appJson = require("./app.json");

function pickEnv(key, fallback) {
  const fromEnv = process.env[key]?.trim();
  if (fromEnv && !fromEnv.includes("REPLACE")) return fromEnv;
  const fromExtra = fallback?.trim();
  if (fromExtra && !fromExtra.includes("REPLACE")) return fromExtra;
  return undefined;
}

/** @type {import('expo/config').ExpoConfig} */
module.exports = () => {
  const base = appJson.expo;
  const extra = { ...(base.extra || {}) };

  const googleKeys = [
    "GOOGLE_EXPO_CLIENT_ID",
    "GOOGLE_IOS_CLIENT_ID",
    "GOOGLE_ANDROID_CLIENT_ID",
    "GOOGLE_WEB_CLIENT_ID",
  ];

  for (const key of googleKeys) {
    const value = pickEnv(key, extra[key]);
    if (value) extra[key] = value;
  }

  return {
    ...base,
    extra,
  };
};
