const { withAppBuildGradle, createRunOncePlugin } = require('@expo/config-plugins')

// Play Store listing is registered under `online.Rally`, but the native code
// namespace (Kotlin packages, manifest-relative service/receiver names, the
// overlay/FCM classes) stays `com.rallyactiver.rallyapp`. Renaming
// `android.package` would move the namespace too and orphan those relative
// manifest entries at runtime. Instead we keep the namespace and only override
// the installed applicationId, the standard Android way to change an app's id
// without touching its code package.
const APPLICATION_ID = 'online.Rally'

function withAndroidApplicationId(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      throw new Error('with-android-application-id: expected a groovy build.gradle')
    }
    const contents = cfg.modResults.contents
    const next = contents.replace(
      /applicationId\s+(['"])[^'"]+\1/,
      `applicationId '${APPLICATION_ID}'`,
    )
    if (next === contents) {
      throw new Error('with-android-application-id: applicationId line not found in build.gradle')
    }
    cfg.modResults.contents = next
    return cfg
  })
}

module.exports = createRunOncePlugin(withAndroidApplicationId, 'with-android-application-id', '1.0.0')
