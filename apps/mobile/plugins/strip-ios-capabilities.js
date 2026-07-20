const { withEntitlementsPlist } = require("expo/config-plugins");

/**
 * First TestFlight: Sign in with Apple was not on the provisioning profile.
 * Keep stripping Apple Sign In until that capability is added in Apple Developer.
 *
 * IMPORTANT: Do NOT strip `aps-environment` — remote push (WhatsApp-style
 * notifications while the app is closed) requires it.
 */
module.exports = function withStripIosCapabilities(config) {
  return withEntitlementsPlist(config, (config) => {
    delete config.modResults["com.apple.developer.applesignin"];
    return config;
  });
};
