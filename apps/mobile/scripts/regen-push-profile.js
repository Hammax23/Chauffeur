const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const pty = require("node-pty");

const privateKey = fs.readFileSync(path.join(".eas-keys", "AuthKey_9D7SV9329Y.p8"), "utf8");
const kid = "9D7SV9329Y";
const iss = "1409c857-382c-4115-b6cc-799d2cfb96a6";
const now = Math.floor(Date.now() / 1000);
function b64url(input) {
  return Buffer.from(input).toString("base64url");
}
const header = b64url(JSON.stringify({ alg: "ES256", kid, typ: "JWT" }));
const payload = b64url(JSON.stringify({ iss, iat: now, exp: now + 1200, aud: "appstoreconnect-v1" }));
const data = header + "." + payload;
const sign = crypto.createSign("SHA256");
sign.update(data);
sign.end();
const token = data + "." + sign.sign({ key: privateKey, dsaEncoding: "ieee-p1363" }).toString("base64url");

async function main() {
  const listRes = await fetch(
    "https://api.appstoreconnect.apple.com/v1/profiles?filter[profileType]=IOS_APP_STORE&limit=50",
    { headers: { Authorization: "Bearer " + token } }
  );
  const list = await listRes.json();
  for (const p of list.data || []) {
    const name = p.attributes?.name || "";
    if (name.includes("com.sarjworldwide.chauffeur")) {
      console.log("Deleting", p.id, name);
      const del = await fetch("https://api.appstoreconnect.apple.com/v1/profiles/" + p.id, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + token },
      });
      console.log("delete", del.status);
    }
  }

  const env = {
    ...process.env,
    EXPO_ASC_API_KEY_PATH: path.join(process.cwd(), ".eas-keys", "AuthKey_9D7SV9329Y.p8"),
    EXPO_ASC_KEY_ID: "9D7SV9329Y",
    EXPO_ASC_ISSUER_ID: "1409c857-382c-4115-b6cc-799d2cfb96a6",
    EXPO_APPLE_TEAM_ID: "DP92UVLHJU",
    EXPO_APPLE_TEAM_TYPE: "INDIVIDUAL",
    EXPO_NO_CAPABILITY_SYNC: "1",
  };
  delete env.CI;

  await new Promise((resolve, reject) => {
    const term = pty.spawn(
      "powershell.exe",
      ["-Command", "npx eas credentials:configure-build -p ios -e production"],
      { name: "xterm-color", cols: 120, rows: 40, cwd: process.cwd(), env }
    );
    let buf = "";
    term.onData((chunk) => {
      buf += chunk;
      process.stdout.write(chunk);
      if (
        /Generate a new Apple Provisioning Profile/i.test(buf) ||
        /\(Y\/n\)/i.test(chunk)
      ) {
        term.write("y\r");
      }
    });
    setTimeout(() => term.write("y\r"), 8000);
    setTimeout(() => term.write("y\r"), 12000);
    setTimeout(() => term.write("y\r"), 16000);
    term.onExit(({ exitCode }) => {
      console.log("\nconfigure exit", exitCode);
      if (exitCode) reject(new Error("configure failed " + exitCode));
      else resolve();
    });
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
