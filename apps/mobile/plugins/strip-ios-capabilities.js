const { withEntitlementsPlist } = require("expo/config-plugins");

/**
 * First TestFlight build: provisioning profile was created without Push / Sign in with Apple.
 * Remove those entitlements so the profile matches. Re-enable after profile is regenerated.
 */
module.exports = function withStripIosCapabilities(config) {
  return withEntitlementsPlist(config, (config) => {
    delete config.modResults["aps-environment"];
    delete config.modResults["com.apple.developer.applesignin"];
    return config;
  });
};
