const { withEntitlementsPlist } = require("expo/config-plugins");

/**
 * Sign in with Apple is not yet enabled on the App ID / provisioning profile.
 * Strip the entitlement so App Store / TestFlight builds succeed.
 *
 * When ready: enable "Sign In with Apple" for com.sarjworldwide.chauffeur in
 * Apple Developer → Identifiers, then:
 * 1) Set ios.usesAppleSignIn: true
 * 2) Add "expo-apple-authentication" to plugins
 * 3) Remove the delete below
 * 4) Regenerate the iOS provisioning profile in EAS credentials
 * 5) Rebuild
 *
 * Do NOT strip `aps-environment` — remote push requires it.
 */
module.exports = function withStripIosCapabilities(config) {
  return withEntitlementsPlist(config, (config) => {
    delete config.modResults["com.apple.developer.applesignin"];
    return config;
  });
};
