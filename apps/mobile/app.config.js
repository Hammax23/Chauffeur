/* eslint-disable @typescript-eslint/no-require-imports */
const appJson = require("./app.json");

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function resolveProjectId(baseExpo) {
  const fromEnv = (
    process.env.EAS_PROJECT_ID ||
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
    ""
  ).trim();

  if (UUID_RE.test(fromEnv)) return fromEnv;

  const fromJson = String(baseExpo?.extra?.eas?.projectId ?? "").trim();
  if (UUID_RE.test(fromJson)) return fromJson;

  return null;
}

module.exports = ({ config }) => {
  const baseExpo = config?.expo ?? appJson.expo;
  const projectId = resolveProjectId(baseExpo);

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
