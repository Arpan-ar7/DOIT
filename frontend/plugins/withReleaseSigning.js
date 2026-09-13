const { withAppBuildGradle, withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Expo config plugin that configures release signing for Android.
 * - Copies unisync.keystore into android/app/ during prebuild
 * - Adds a 'release' signingConfig block to build.gradle
 * - Points the release buildType to signingConfigs.release
 */
function withReleaseSigning(config) {
  // Step 1: Copy the keystore file into android/app/ during prebuild
  config = withDangerousMod(config, [
    "android",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const src = path.join(projectRoot, "unisync.keystore");
      const dest = path.join(
        projectRoot,
        "android",
        "app",
        "unisync.keystore"
      );

      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
      } else {
        console.warn(
          "[withReleaseSigning] unisync.keystore not found at project root!"
        );
      }

      return config;
    },
  ]);

  // Step 2: Modify build.gradle to add release signing config
  config = withAppBuildGradle(config, (config) => {
    let buildGradle = config.modResults.contents;

    // Only modify if we haven't already added the release signing config
    if (buildGradle.includes("signingConfigs.release")) {
      return config;
    }

    // Insert the release signing config after the closing brace of the debug block
    // Match: debug { ... } followed by closing of signingConfigs }
    // We look for the debug block's closing "}" followed by the signingConfigs closing "}"
    const releaseSigningBlock = `        release {
            storeFile file('unisync.keystore')
            storePassword 'pandamilan'
            keyAlias 'unisync'
            keyPassword 'pandamilan'
        }`;

    // Find "keyPassword 'android'" (last line of debug config) and insert release block after the next "}"
    buildGradle = buildGradle.replace(
      /(keyPassword\s+'android'\s*\n\s*\})/,
      `$1\n${releaseSigningBlock}`
    );

    // Change release buildType to use signingConfigs.release instead of signingConfigs.debug
    buildGradle = buildGradle.replace(
      /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig\s+signingConfigs\.debug/,
      "$1signingConfig signingConfigs.release"
    );

    config.modResults.contents = buildGradle;
    return config;
  });

  return config;
}

module.exports = withReleaseSigning;
