const fs = require('fs')
const path = require('path')
const {
  createRunOncePlugin,
  withAndroidManifest,
  withAppBuildGradle,
  withDangerousMod,
  withMainApplication,
} = require('@expo/config-plugins')

function withRallyOverlay(config) {
  config = withAndroidManifest(config, (nextConfig) => {
    const manifest = nextConfig.modResults.manifest
    manifest.$ = manifest.$ ?? {}
    manifest.$['xmlns:tools'] = manifest.$['xmlns:tools'] ?? 'http://schemas.android.com/tools'
    manifest['uses-permission'] = manifest['uses-permission'] ?? []
    const permissions = manifest['uses-permission']
    ensurePermission(permissions, 'android.permission.SYSTEM_ALERT_WINDOW')
    ensurePermission(permissions, 'android.permission.POST_PROMOTED_NOTIFICATIONS')

    const application = manifest.application?.[0]
    if (!application) return nextConfig
    application.service = application.service ?? []
    ensureService(application.service, {
      'android:name': 'expo.modules.notifications.service.ExpoFirebaseMessagingService',
      'tools:node': 'remove',
    })
    ensureService(application.service, {
      'android:name': '.notifications.RallyFirebaseMessagingService',
      'android:exported': 'false',
    }, [{
      action: [{ $: { 'android:name': 'com.google.firebase.MESSAGING_EVENT' } }],
      $: { 'android:priority': '1' },
    }])
    ensureService(application.service, {
      'android:name': '.overlay.RallyOverlayService',
      'android:exported': 'false',
      'android:stopWithTask': 'false',
    })
    application.receiver = application.receiver ?? []
    ensureReceiver(application.receiver, {
      'android:name': '.notifications.RallyNotificationActionReceiver',
      'android:exported': 'false',
    })
    return nextConfig
  })

  config = withMainApplication(config, (nextConfig) => {
    const importLine = 'import com.rallyactiver.rallyapp.overlay.RallyOverlayPackage'
    let contents = nextConfig.modResults.contents
    if (!contents.includes(importLine)) {
      contents = contents.replace(
        /^(package [^\n]+\n)/m,
        `$1\n${importLine}\n`,
      )
    }
    if (!contents.includes('add(RallyOverlayPackage())')) {
      if (contents.includes('add(RallyWearPackage())')) {
        contents = contents.replace(
          'add(RallyWearPackage())',
          'add(RallyOverlayPackage())\n              add(RallyWearPackage())',
        )
      } else {
        contents = contents.replace(
          '// add(MyReactNativePackage())',
          '// add(MyReactNativePackage())\n              add(RallyOverlayPackage())',
        )
      }
    }
    nextConfig.modResults.contents = contents
    return nextConfig
  })

  config = withAppBuildGradle(config, (nextConfig) => {
    let contents = nextConfig.modResults.contents
    // RallyFirebaseMessagingService.kt references com.google.firebase.messaging.RemoteMessage
    // directly, so the app module needs firebase-messaging on its own compile classpath
    // (expo-notifications pulls it transitively but does not expose it). Pin to the same
    // version expo-notifications declares (24.0.1) to avoid a version clash.
    if (!contents.includes('com.google.firebase:firebase-messaging')) {
      contents = contents.replace(
        /dependencies\s*\{/,
        (match) => `${match}\n    implementation("com.google.firebase:firebase-messaging:24.0.1")`,
      )
    }
    nextConfig.modResults.contents = contents
    return nextConfig
  })

  config = withDangerousMod(config, ['android', async (nextConfig) => {
    const sourceDir = path.join(nextConfig.modRequest.projectRoot, 'plugins', 'android-overlay')
    const destDir = path.join(
      nextConfig.modRequest.platformProjectRoot,
      'app',
      'src',
      'main',
      'java',
      'com',
      'rallyactiver',
      'rallyapp',
      'overlay',
    )
    fs.mkdirSync(destDir, { recursive: true })
    for (const filename of [
      'RallyOverlayService.kt',
      'RallyOverlayModule.kt',
      'RallyOverlayPackage.kt',
    ]) {
      fs.copyFileSync(path.join(sourceDir, filename), path.join(destDir, filename))
    }

    const notificationsDestDir = path.join(
      nextConfig.modRequest.platformProjectRoot,
      'app',
      'src',
      'main',
      'java',
      'com',
      'rallyactiver',
      'rallyapp',
      'notifications',
    )
    fs.mkdirSync(notificationsDestDir, { recursive: true })
    for (const filename of [
      'RallyFirebaseMessagingService.kt',
      'RallyNotificationActionReceiver.kt',
      'RallySystemSurfaceNotifier.kt',
    ]) {
      fs.copyFileSync(path.join(sourceDir, filename), path.join(notificationsDestDir, filename))
    }

    const drawableSourceDir = path.join(sourceDir, 'drawable')
    const drawableDestDir = path.join(nextConfig.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'drawable')
    if (fs.existsSync(drawableSourceDir)) {
      fs.mkdirSync(drawableDestDir, { recursive: true })
      for (const filename of fs.readdirSync(drawableSourceDir)) {
        if (filename.endsWith('.xml')) {
          fs.copyFileSync(path.join(drawableSourceDir, filename), path.join(drawableDestDir, filename))
        }
      }
    }
    return nextConfig
  }])

  return config
}

function ensurePermission(permissions, name) {
  const hasPermission = permissions.some(
    (permission) => permission.$?.['android:name'] === name,
  )
  if (!hasPermission) {
    permissions.push({ $: { 'android:name': name } })
  }
}

function ensureService(services, attributes, intentFilter) {
  const existing = services.find(
    (service) => service.$?.['android:name'] === attributes['android:name'],
  )
  const service = existing ?? { $: {} }
  service.$ = {
    ...service.$,
    ...attributes,
  }
  if (intentFilter) {
    service['intent-filter'] = intentFilter
  }
  if (!existing) {
    services.push(service)
  }
}

function ensureReceiver(receivers, attributes) {
  const existing = receivers.find(
    (receiver) => receiver.$?.['android:name'] === attributes['android:name'],
  )
  const receiver = existing ?? { $: {} }
  receiver.$ = {
    ...receiver.$,
    ...attributes,
  }
  if (!existing) {
    receivers.push(receiver)
  }
}

module.exports = createRunOncePlugin(withRallyOverlay, 'with-rally-overlay', '1.0.0')
