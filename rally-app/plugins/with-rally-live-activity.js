const fs = require('fs')
const path = require('path')
const {
  createRunOncePlugin,
  withDangerousMod,
  withEntitlementsPlist,
  withInfoPlist,
  withXcodeProject,
} = require('@expo/config-plugins')

const APP_GROUP_ID = 'group.com.anonymous.rally-app'
const EXTENSION_NAME = 'rallyappLiveActivity'
const EXTENSION_BUNDLE_SUFFIX = 'LiveActivity'

const APP_SOURCES = [
  'RallyLiveActivityAttributes.swift',
  'RallyLiveActivityModule.swift',
  'RallyLiveActivityModuleBridge.m',
]

const EXTENSION_SOURCES = [
  'RallyLiveActivityAttributes.swift',
  'RallyLiveActivityActionIntent.swift',
  'RallyLiveActivityWidget.swift',
  'RallyLiveActivityBundle.swift',
]

function withRallyLiveActivity(config) {
  config = withInfoPlist(config, (nextConfig) => {
    nextConfig.modResults.NSSupportsLiveActivities = true
    nextConfig.modResults.NSSupportsLiveActivitiesFrequentUpdates = true
    return nextConfig
  })

  config = withEntitlementsPlist(config, (nextConfig) => {
    const key = 'com.apple.security.application-groups'
    const groups = new Set(nextConfig.modResults[key] ?? [])
    groups.add(APP_GROUP_ID)
    nextConfig.modResults[key] = Array.from(groups)
    return nextConfig
  })

  config = withDangerousMod(config, ['ios', async (nextConfig) => {
    const iosRoot = nextConfig.modRequest.platformProjectRoot
    const projectName = nextConfig.modRequest.projectName
    const sourceRoot = path.join(nextConfig.modRequest.projectRoot, 'plugins', 'ios-live-activity')

    copyFiles(
      path.join(sourceRoot, 'app'),
      path.join(iosRoot, projectName),
      APP_SOURCES,
    )
    copyFiles(
      path.join(sourceRoot, 'extension'),
      path.join(iosRoot, EXTENSION_NAME),
      [
        ...EXTENSION_SOURCES,
        'Info.plist',
        `${EXTENSION_NAME}.entitlements`,
      ],
    )

    return nextConfig
  }])

  config = withXcodeProject(config, (nextConfig) => {
    const project = nextConfig.modResults
    const projectName = nextConfig.modRequest.projectName
    const bundleIdentifier = nextConfig.ios?.bundleIdentifier ??
      nextConfig.modRequest.ios?.bundleIdentifier ??
      'com.anonymous.rally-app'
    const appTargetUuid = project.getFirstTarget().uuid
    const appGroupKey = project.findPBXGroupKey({ name: projectName }) ??
      project.getFirstProject().firstProject.mainGroup

    for (const filename of APP_SOURCES) {
      addSourceFileOnce(project, `${projectName}/${filename}`, appGroupKey, appTargetUuid)
    }

    const extensionTarget = ensureExtensionTarget(project, bundleIdentifier)
    const extensionGroupKey = ensureExtensionGroup(project)

    for (const filename of EXTENSION_SOURCES) {
      addSourceFileOnce(project, filename, extensionGroupKey, extensionTarget.uuid)
    }
    addFileOnce(project, 'Info.plist', extensionGroupKey)
    addFileOnce(project, `${EXTENSION_NAME}.entitlements`, extensionGroupKey)
    const developmentTeam = nextConfig.ios?.appleTeamId ??
      nextConfig.modRequest.ios?.appleTeamId ??
      null
    configureExtensionTarget(
      project,
      extensionTarget.uuid,
      `${bundleIdentifier}.${EXTENSION_BUNDLE_SUFFIX}`,
      developmentTeam,
      nextConfig.version,
    )

    return nextConfig
  })

  return config
}

function copyFiles(sourceDir, destDir, filenames) {
  fs.mkdirSync(destDir, { recursive: true })
  for (const filename of filenames) {
    fs.copyFileSync(path.join(sourceDir, filename), path.join(destDir, filename))
  }
}

function ensureExtensionTarget(project, bundleIdentifier) {
  const existing = findTarget(project, EXTENSION_NAME)
  if (existing) {
    ensureBuildPhase(project, existing.uuid, 'PBXSourcesBuildPhase', 'Sources')
    ensureBuildPhase(project, existing.uuid, 'PBXFrameworksBuildPhase', 'Frameworks')
    ensureBuildPhase(project, existing.uuid, 'PBXResourcesBuildPhase', 'Resources')
    return existing
  }

  const target = project.addTarget(
    EXTENSION_NAME,
    'app_extension',
    EXTENSION_NAME,
    `${bundleIdentifier}.${EXTENSION_BUNDLE_SUFFIX}`,
  )
  ensureBuildPhase(project, target.uuid, 'PBXSourcesBuildPhase', 'Sources')
  ensureBuildPhase(project, target.uuid, 'PBXFrameworksBuildPhase', 'Frameworks')
  ensureBuildPhase(project, target.uuid, 'PBXResourcesBuildPhase', 'Resources')
  return target
}

function ensureExtensionGroup(project) {
  const existing = project.findPBXGroupKey({ name: EXTENSION_NAME }) ??
    project.findPBXGroupKey({ path: EXTENSION_NAME })
  if (existing) return existing

  const group = project.addPbxGroup([], EXTENSION_NAME, EXTENSION_NAME)
  project.addToPbxGroup(group.uuid, project.getFirstProject().firstProject.mainGroup)
  return group.uuid
}

function addSourceFileOnce(project, filename, groupKey, targetUuid) {
  if (project.hasFile(filename)) return
  project.addSourceFile(filename, { target: targetUuid }, groupKey)
}

function addFileOnce(project, filename, groupKey) {
  if (project.hasFile(filename)) return
  project.addFile(filename, groupKey)
}

function ensureBuildPhase(project, targetUuid, phaseType, name) {
  if (findBuildPhase(project, targetUuid, phaseType)) return
  project.addBuildPhase([], phaseType, name, targetUuid)
}

function findBuildPhase(project, targetUuid, phaseType) {
  const nativeTarget = project.pbxNativeTargetSection()[targetUuid]
  const phases = project.hash.project.objects[phaseType] ?? {}
  return nativeTarget?.buildPhases?.some((phase) => phases[phase.value])
}

function findTarget(project, name) {
  const targets = project.pbxNativeTargetSection()
  for (const uuid of Object.keys(targets)) {
    if (uuid.endsWith('_comment')) continue
    const target = targets[uuid]
    if (target.name === name || target.name === `"${name}"`) {
      return { uuid, pbxNativeTarget: target }
    }
  }
  return null
}

function configureExtensionTarget(project, targetUuid, bundleIdentifier, developmentTeam, appVersion) {
  const settings = {
    ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME: 'AccentColor',
    CODE_SIGN_ENTITLEMENTS: `${EXTENSION_NAME}/${EXTENSION_NAME}.entitlements`,
    CODE_SIGN_STYLE: 'Automatic',
    CURRENT_PROJECT_VERSION: '1',
    GENERATE_INFOPLIST_FILE: 'NO',
    INFOPLIST_FILE: `${EXTENSION_NAME}/Info.plist`,
    IPHONEOS_DEPLOYMENT_TARGET: '16.1',
    LD_RUNPATH_SEARCH_PATHS: '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"',
    MARKETING_VERSION: String(appVersion ?? '1.0.1'),
    PRODUCT_BUNDLE_IDENTIFIER: `"${bundleIdentifier}"`,
    PRODUCT_NAME: '"$(TARGET_NAME)"',
    SKIP_INSTALL: 'YES',
    SWIFT_VERSION: '5.0',
    TARGETED_DEVICE_FAMILY: '"1,2"',
  }
  if (developmentTeam) {
    settings.DEVELOPMENT_TEAM = developmentTeam
  }

  // node-xcode's updateBuildProperty only UPDATES keys that already exist on a
  // target's build configs; for a freshly addTarget()'d app_extension it
  // silently drops brand-new keys (SWIFT_VERSION, DEVELOPMENT_TEAM,
  // CODE_SIGN_ENTITLEMENTS, ...). That left the Live Activity target without a
  // Swift version or signing team, failing `xcodebuild archive` on EAS. Write
  // the settings straight onto each of the extension target's build configs.
  const nativeTarget = project.pbxNativeTargetSection()[targetUuid]
  const configListId = nativeTarget && nativeTarget.buildConfigurationList
  const configList = configListId && project.pbxXCConfigurationList()[configListId]
  if (!configList) {
    throw new Error('with-rally-live-activity: build configuration list not found for the Live Activity extension target')
  }

  const buildConfigs = project.pbxXCBuildConfigurationSection()
  for (const ref of configList.buildConfigurations) {
    const cfg = buildConfigs[ref.value]
    if (!cfg || !cfg.buildSettings) continue
    for (const [key, value] of Object.entries(settings)) {
      cfg.buildSettings[key] = value
    }
  }
}

module.exports = createRunOncePlugin(
  withRallyLiveActivity,
  'with-rally-live-activity',
  '1.0.0',
)
