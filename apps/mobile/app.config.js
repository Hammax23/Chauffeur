/* eslint-disable @typescript-eslint/no-require-imports */
/** Optional: inject `extra.eas.projectId` from `.env` for push tokens (Expo Go / dev). */
const appJson = require("./app.json");

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function resolveProjectId() {
  const raw = (
    process.env.EAS_PROJECT_ID ||
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
    ""
  ).trim();
  return UUID_RE.test(raw) ? raw : null;
}

module.exports = ({ config }) => {
  const projectId = resolveProjectId();
  const baseExpo = config?.expo ?? appJson.expo;

  return {
    expo: {
      ...baseExpo,
      extra: {
        ...baseExpo.extra,
        ...(projectId
          ? {
              eas: {
                ...(baseExpo.extra?.eas || {}),
                projectId,
              },
            }
          : {}),
      },
    },
  };
};
