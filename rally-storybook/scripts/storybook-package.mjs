import { createHash } from 'node:crypto'
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, statfsSync, writeFileSync, copyFileSync, chmodSync, mkdtempSync, rmSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'

const storybookRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const repositoryRoot = dirname(storybookRoot)
const outputRoot = join(repositoryRoot, 'outputs', 'rally-storybook')
const expectedIdentity = {
  bundleIdentifier: 'com.rallyactiver.rally.storybook',
  platform: 'iPhoneSimulator',
  architectures: ['arm64'],
  dtPlatformName: 'iphonesimulator',
  dtSdkName: 'iphonesimulator26.2',
}
const fixedEnvironment = {
  NODE_ENV: 'production',
  STORYBOOK_ENABLED: 'true',
  STORYBOOK_SERVER: 'false',
  STORYBOOK_DISABLE_TELEMETRY: 'true',
  EXPO_NO_DOTENV: '1',
  EXPO_OFFLINE: '1',
  EXPO_NO_TELEMETRY: '1',
}
const allowedDirtyPaths = new Set([
  'rally-storybook/package.json',
  'rally-storybook/scripts/storybook-package.mjs',
  'rally-storybook/tests/storybook-package.test.mjs',
  'rally-storybook/distribution/Install Rally Storybook.command',
  'rally-storybook/README.md',
  'docs/devops/storybook-local.md',
])
const sourceInputs = [
  'package-lock.json',
  'rally-storybook/app.json',
  'rally-storybook/package.json',
  'rally-storybook/index.js',
  'rally-storybook/metro.config.js',
  'rally-storybook/ios/RallyStorybook.xcodeproj/project.pbxproj',
  'rally-storybook/ios/RallyStorybook/Info.plist',
  'rally-storybook/ios/.xcode.env',
  'rally-storybook/ios/.xcode.env.local',
  'rally-app/.rnstorybook/index.tsx',
]
const forbiddenBundleStrings = [
  'RALLY_STORYBOOK_SENTINEL',
  'ltrdptqotnioajnlesqy',
  'xovofmkyzyqjxvmvogsw',
  'ktpuwnzhinwilrdkbrfx',
  'SUPABASE_SERVICE_ROLE_KEY',
  'EXPO_PUBLIC_SUPABASE',
  'SENTRY_DSN',
  'POSTHOG_API_KEY',
]

function fail(message) {
  throw new Error(`Rally Storybook packaging refused: ${message}`)
}

export function buildPackagingEnvironment(inheritedEnv = process.env) {
  const sanitized = {}
  for (const key of ['HOME', 'USER', 'LOGNAME', 'TMPDIR', 'LANG']) {
    if (typeof inheritedEnv[key] === 'string' && inheritedEnv[key].length > 0) sanitized[key] = inheritedEnv[key]
  }
  return {
    ...sanitized,
    PATH: `${dirname(process.execPath)}:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin`,
    ...fixedEnvironment,
  }
}

export function resolveNamedIosSimulator({ payload, simulatorName }) {
  if (typeof simulatorName !== 'string' || simulatorName.trim().length === 0) {
    fail('an exact simulator name is required; use the dedicated “Rally Storybook” simulator')
  }
  if (!payload || typeof payload !== 'object' || !payload.devices || typeof payload.devices !== 'object') {
    fail('simulator discovery returned malformed JSON')
  }
  const matches = []
  for (const [runtime, devices] of Object.entries(payload.devices)) {
    if (!runtime.startsWith('com.apple.CoreSimulator.SimRuntime.iOS-') || !Array.isArray(devices)) continue
    for (const device of devices) {
      if (device && device.name === simulatorName && device.isAvailable !== false && typeof device.udid === 'string') {
        matches.push({ udid: device.udid, runtime, name: device.name })
      }
    }
  }
  if (matches.length !== 1) {
    fail(`simulator “${simulatorName}” must resolve to exactly one available iOS simulator. Create or rename one simulator, then try again.`)
  }
  return matches[0]
}

export function validateXcodeEnvironment({ iosDirectory, nodeBinary = process.execPath }) {
  const files = readdirSync(iosDirectory).filter((name) => name.startsWith('.xcode.env'))
  if (files.some((name) => name !== '.xcode.env' && name !== '.xcode.env.local')) {
    fail('an unsupported .xcode.env override file is present')
  }
  for (const required of ['.xcode.env', '.xcode.env.local']) {
    if (!files.includes(required)) fail(`${required} is missing`)
  }
  const expected = new Map([
    ['.xcode.env', 'export NODE_BINARY=$(command -v node)'],
    ['.xcode.env.local', `export NODE_BINARY=${nodeBinary}`],
  ])
  for (const [name, allowedLine] of expected) {
    const executableLines = readFileSync(join(iosDirectory, name), 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
    if (executableLines.length !== 1 || executableLines[0] !== allowedLine) {
      fail(`${name} contains unsafe or non-reproducible Node configuration`)
    }
  }
}

export function assertOutputRunDirectory({ outputRoot: root = outputRoot, runId, trustedRoot }) {
  if (typeof runId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(runId)) {
    fail('run id must be a simple directory name')
  }
  const resolvedRoot = resolve(root)
  assertNoSymlinkAncestors({
    path: resolvedRoot,
    trustedRoot: trustedRoot ?? (resolvedRoot === resolve(outputRoot) ? repositoryRoot : dirname(resolvedRoot)),
  })
  const runDirectory = resolve(resolvedRoot, runId)
  if (!runDirectory.startsWith(`${resolvedRoot}${sep}`)) fail('output run escapes outputs/rally-storybook')
  if (existsSync(runDirectory)) fail(`output target already exists: ${runDirectory}`)
  return runDirectory
}

export function prepareOutputRoot({ outputRoot: root = outputRoot, trustedRoot }) {
  const resolvedRoot = resolve(root)
  const resolvedTrustedRoot = trustedRoot ?? (resolvedRoot === resolve(outputRoot) ? repositoryRoot : dirname(resolvedRoot))
  assertNoSymlinkAncestors({ path: resolvedRoot, trustedRoot: resolvedTrustedRoot })
  try {
    mkdirSync(resolvedRoot, { recursive: true })
  } catch (error) {
    fail(`could not create output parent: ${error.message}`)
  }
  assertNoSymlinkAncestors({ path: resolvedRoot, trustedRoot: resolvedTrustedRoot })
  if (!lstatSync(resolvedRoot).isDirectory()) fail('output parent is not a directory')
  return resolvedRoot
}

function assertNoSymlinkAncestors({ path, trustedRoot }) {
  let current
  try {
    current = realpathSync(trustedRoot)
  } catch (error) {
    fail(`output trusted root is unavailable: ${error.message}`)
  }
  const target = resolve(path)
  const suffix = relative(current, target)
  if (suffix === '..' || suffix.startsWith(`..${sep}`) || resolve(current, suffix) !== target) {
    fail('output path escapes its trusted root')
  }
  for (const segment of suffix.split(sep).filter(Boolean)) {
    current = join(current, segment)
    if (existsSync(current) && lstatSync(current).isSymbolicLink()) fail(`output path contains a symbolic link: ${current}`)
  }
}

export function assertMinimumFreeDisk({ directory, statfs = statfsSync }) {
  let stats
  try {
    stats = statfs(directory)
  } catch (error) {
    fail(`free-disk check failed: ${error.message}`)
  }
  const availableBytes = Number(stats.bavail) * Number(stats.bsize)
  if (!Number.isFinite(availableBytes) || availableBytes < 15 * 1024 ** 3) {
    fail('at least 15 GiB of free disk space is required before building')
  }
  return availableBytes
}

export function buildXcodebuildLaunch({ simulator, derivedDataPath, inheritedEnv = process.env }) {
  return {
    executable: '/usr/bin/xcodebuild',
    args: [
      '-workspace', join(storybookRoot, 'ios', 'RallyStorybook.xcworkspace'),
      '-scheme', 'RallyStorybook',
      '-configuration', 'Release',
      '-sdk', 'iphonesimulator',
      '-destination', `platform=iOS Simulator,id=${simulator.udid}`,
      '-derivedDataPath', derivedDataPath,
      'ARCHS=arm64',
      'ONLY_ACTIVE_ARCH=NO',
      'CODE_SIGNING_ALLOWED=NO',
      '-jobs', '2',
    ],
    env: buildPackagingEnvironment(inheritedEnv),
  }
}

function hashBuffer(value) {
  return createHash('sha256').update(value).digest('hex')
}

function collectFiles(directory, prefix = '') {
  const records = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name)
    const entryName = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isSymbolicLink()) fail(`native app contains unsupported symbolic link: ${entryName}`)
    if (entry.isDirectory()) records.push(...collectFiles(entryPath, entryName))
    else if (entry.isFile()) records.push(entryName)
  }
  return records
}

export function createAppTreeHash(appPath) {
  if (!existsSync(appPath) || !lstatSync(appPath).isDirectory()) fail('native app is missing')
  const records = collectFiles(appPath).sort().map((entryName) => {
    const absolutePath = join(appPath, entryName)
    return `${hashBuffer(readFileSync(absolutePath))}  ./${entryName}\n`
  })
  return hashBuffer(records.join(''))
}

export function parseBuildVersion(otoolOutput) {
  const blocks = otoolOutput.split(/(?=^Load command \d+$)/m)
  const block = blocks.find((candidate) => /^\s*cmd\s+LC_BUILD_VERSION$/m.test(candidate))
  if (!block) fail('LC_BUILD_VERSION is missing from the native executable')
  const platformNumber = /^\s*platform\s+(\d+)$/m.exec(block)?.[1]
  const minimumOsVersion = /^\s*minos\s+([0-9.]+)$/m.exec(block)?.[1]
  const sdkVersion = /^\s*sdk\s+([0-9.]+)$/m.exec(block)?.[1]
  if (platformNumber !== '7') fail('LC_BUILD_VERSION platform is not iOS Simulator')
  if (!minimumOsVersion || !sdkVersion) fail('LC_BUILD_VERSION minimum OS or SDK is missing')
  if (sdkVersion !== '26.2') fail('LC_BUILD_VERSION SDK is not the governed iOS Simulator 26.2')
  return { platform: 'iOS Simulator', minimumOsVersion, sdkVersion }
}

export function validateArtifact({ appPath, metadata, expectedAppHash }) {
  if (!existsSync(join(appPath, 'main.jsbundle'))) fail('main.jsbundle is missing')
  const bundle = readFileSync(join(appPath, 'main.jsbundle'))
  if (!bundle.includes(Buffer.from('RALLY_STORYBOOK_SENTINEL'))) fail('Storybook sentinel is missing from main.jsbundle')
  for (const forbidden of forbiddenBundleStrings.slice(1)) {
    if (bundle.includes(Buffer.from(forbidden))) fail(`forbidden production reference found in main.jsbundle: ${forbidden}`)
  }
  if (metadata.bundleIdentifier !== expectedIdentity.bundleIdentifier) fail('unexpected bundle identifier')
  if (metadata.platform !== expectedIdentity.platform) fail('unexpected platform')
  if (typeof metadata.version !== 'string' || metadata.version.length === 0 || typeof metadata.build !== 'string' || metadata.build.length === 0) fail('artifact version or build is missing')
  if (!Array.isArray(metadata.architectures) || metadata.architectures.length !== 1 || metadata.architectures[0] !== 'arm64') fail('unexpected executable architecture')
  if (metadata.updatesEnabled !== false) fail('Expo updates must be disabled')
  if (metadata.updatesUrl) fail('Expo updates URL must be absent')
  if (metadata.minimumOsVersion !== '15.1') fail('unexpected minimum OS version')
  if (metadata.dtPlatformName !== expectedIdentity.dtPlatformName) fail('unexpected DTPlatformName')
  if (metadata.dtSdkName !== expectedIdentity.dtSdkName) fail('unexpected DTSDKName')
  if (!metadata.buildVersion || metadata.buildVersion.platform !== 'iOS Simulator' || metadata.buildVersion.minimumOsVersion !== '15.1' || metadata.buildVersion.sdkVersion !== '26.2') {
    fail('unexpected LC_BUILD_VERSION platform, minimum OS, or SDK')
  }
  const bundleHash = createAppTreeHash(appPath)
  if (expectedAppHash && expectedAppHash !== bundleHash) fail('native app checksum mismatch')
  return { ...metadata, bundleHash }
}

function runTool(executable, args, { trim = true, ...options } = {}) {
  const result = spawnSync(executable, args, { encoding: 'utf8', shell: false, ...options })
  if (result.error) fail(`${executable} failed: ${result.error.message}`)
  if (result.status !== 0) fail(`${executable} failed with exit code ${result.status ?? 'unknown'}: ${(result.stderr || '').trim()}`)
  return trim ? result.stdout.trim() : result.stdout
}

function readArtifactMetadata(appPath) {
  const info = join(appPath, 'Info.plist')
  const expo = join(appPath, 'Expo.plist')
  const value = (key) => runTool('/usr/libexec/PlistBuddy', ['-c', `Print :${key}`, info])
  const optionalExpoValue = (key) => {
    const result = spawnSync('/usr/libexec/PlistBuddy', ['-c', `Print :${key}`, expo], { encoding: 'utf8', shell: false })
    return result.status === 0 ? result.stdout.trim() : null
  }
  const executable = value('CFBundleExecutable')
  return {
    bundleIdentifier: value('CFBundleIdentifier'),
    platform: value('CFBundleSupportedPlatforms:0'),
    version: value('CFBundleShortVersionString'),
    build: value('CFBundleVersion'),
    architectures: runTool('/usr/bin/lipo', ['-archs', join(appPath, executable)]).split(/\s+/).filter(Boolean),
    updatesEnabled: (() => {
      const encoded = runTool('/usr/bin/plutil', ['-extract', 'EXUpdatesEnabled', 'xml1', '-o', '-', expo])
      if (/<false\s*\/>/.test(encoded)) return false
      if (/<true\s*\/>/.test(encoded)) return true
      return 'invalid'
    })(),
    updatesUrl: optionalExpoValue('EXUpdatesURL'),
    minimumOsVersion: value('MinimumOSVersion'),
    dtPlatformName: value('DTPlatformName'),
    dtSdkName: value('DTSDKName'),
    buildVersion: parseBuildVersion(runTool('/usr/bin/otool', ['-l', join(appPath, executable)])),
  }
}

function resolveBuiltApp(derivedDataPath) {
  const products = join(derivedDataPath, 'Build', 'Products', 'Release-iphonesimulator')
  if (!existsSync(products)) fail('Release iPhoneSimulator products directory is missing')
  const apps = readdirSync(products).filter((entry) => entry.endsWith('.app') && lstatSync(join(products, entry)).isDirectory())
  if (apps.length !== 1) fail('Release build must produce exactly one simulator .app')
  return join(products, apps[0])
}

export function parseGitStatus(status) {
  const records = status.split('\0').filter(Boolean)
  return records.map((record) => ({ state: record.slice(0, 2), path: record.slice(3) }))
}

function isIgnorableStatus(record) {
  return /(?:^|\/)\.DS_Store$/.test(record.path) || /(?:^|\/)\.expo[^/]*\.log$/.test(record.path) || /(?:^|\/)mcp\.log$/.test(record.path)
}

function collectSourceEvidence() {
  const sourceCommit = runTool('/usr/bin/git', ['rev-parse', 'HEAD'], { cwd: repositoryRoot })
  const status = runTool('/usr/bin/git', ['status', '--porcelain=v1', '-z', '--untracked-files=all'], { cwd: repositoryRoot, trim: false })
  const dirtyOwnedFiles = []
  for (const record of parseGitStatus(status)) {
    if (isIgnorableStatus(record)) continue
    if (record.path.startsWith('rally-app/') || record.path.startsWith('rally-storybook/') || record.path.startsWith('packages/') || record.path === 'package.json' || record.path === 'package-lock.json') {
      if (!allowedDirtyPaths.has(record.path)) fail(`unrelated runtime-source diff is present: ${record.path}`)
      const absolutePath = join(repositoryRoot, record.path)
      dirtyOwnedFiles.push({ path: record.path, status: record.state, sha256: existsSync(absolutePath) ? hashBuffer(readFileSync(absolutePath)) : null })
    }
  }
  return {
    sourceCommit,
    dirtyOwnedFiles,
    inputs: Object.fromEntries(sourceInputs.map((path) => [path, hashBuffer(readFileSync(join(repositoryRoot, path)))])),
  }
}

export function assertSameSourceEvidence(before, after) {
  if (JSON.stringify(before) !== JSON.stringify(after)) fail('source evidence changed during native build; refusing to package')
}

function createChecksums({ packageDirectory, appName, installerName }) {
  const appHash = createAppTreeHash(join(packageDirectory, appName))
  const installerHash = hashBuffer(readFileSync(join(packageDirectory, installerName)))
  const checksums = `${appHash}\t${appName}\n${installerHash}\t${installerName}\n`
  writeFileSync(join(packageDirectory, 'checksums.txt'), checksums)
  return { appHash, installerHash }
}

export function assertExactPackageLayout({
  rootEntries,
  packageEntries,
  packageName = 'Rally Storybook',
  appName = 'RallyStorybook.app',
  installerName = 'Install Rally Storybook.command',
}) {
  const exact = (actual, expected, label) => {
    const sortedActual = [...actual].sort()
    const sortedExpected = [...expected].sort()
    if (sortedActual.some((name) => name === '__MACOSX' || name.startsWith('._'))) fail(`${label} contains AppleDouble or __MACOSX metadata`)
    if (JSON.stringify(sortedActual) !== JSON.stringify(sortedExpected)) fail(`unexpected ${label}`)
  }
  exact(rootEntries, [packageName], 'top-level ZIP entries')
  exact(packageEntries, [appName, installerName, 'checksums.txt', 'manifest.json'], 'direct package entries')
}

function verifyZipRoundTrip({ zipPath, packageName, appName, expectedHash }) {
  const scratch = mkdtempSync(join(tmpdir(), 'rally-storybook-zip-'))
  try {
    runTool('/usr/bin/ditto', ['-x', '-k', zipPath, scratch])
    const rootEntries = readdirSync(scratch)
    if (rootEntries.length !== 1) fail('ZIP round-trip produced unexpected top-level entries')
    const packageRoot = join(scratch, packageName)
    const packageEntries = existsSync(packageRoot) ? readdirSync(packageRoot) : []
    assertExactPackageLayout({ rootEntries, packageEntries, packageName, appName })
    const roundTrippedApp = join(scratch, packageName, appName)
    if (createAppTreeHash(roundTrippedApp) !== expectedHash) fail('ZIP round-trip checksum mismatch')
    if ((lstatSync(join(roundTrippedApp, 'RallyStorybook')).mode & 0o111) === 0) fail('ZIP round-trip lost executable permission')
    const installer = join(scratch, packageName, 'Install Rally Storybook.command')
    if ((lstatSync(installer).mode & 0o111) === 0) fail('ZIP round-trip lost installer executable permission')
    const checksumRows = readFileSync(join(scratch, packageName, 'checksums.txt'), 'utf8').trim().split('\n').map((line) => line.split('\t'))
    const installerHash = checksumRows.find(([, name]) => name === 'Install Rally Storybook.command')?.[0]
    if (!installerHash || hashBuffer(readFileSync(installer)) !== installerHash) fail('ZIP round-trip installer checksum mismatch')
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
}

export function createManifest({ packagingContext, simulator, nativeArtifact, packageInfo }) {
  return {
    format: 1,
    packagingContext,
    artifactSourceBinding: 'current-worktree',
    simulator,
    nativeArtifact,
    package: packageInfo,
  }
}

export function parseCli(argv) {
  const options = {}
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index]
    if (!['--simulator', '--run-id'].includes(key) || options[key]) fail('usage: storybook-package.mjs --simulator <exact name> --run-id <unique id>')
    options[key] = argv[++index]
  }
  if (!options['--simulator'] || !options['--run-id']) fail('usage: storybook-package.mjs --simulator <exact name> --run-id <unique id>')
  return { simulatorName: options['--simulator'], runId: options['--run-id'] }
}

export function packageStorybook({ simulatorName, runId, inheritedEnv = process.env }) {
  const discovery = JSON.parse(runTool('/usr/bin/xcrun', ['simctl', 'list', 'devices', 'available', '-j']))
  const simulator = resolveNamedIosSimulator({ payload: discovery, simulatorName })
  prepareOutputRoot({ outputRoot })
  const runDirectory = assertOutputRunDirectory({ runId })
  assertMinimumFreeDisk({ directory: repositoryRoot })
  validateXcodeEnvironment({ iosDirectory: join(storybookRoot, 'ios') })
  const packagingContext = collectSourceEvidence()
  mkdirSync(runDirectory, { recursive: false })
  const derivedDataPath = join(runDirectory, 'DerivedData')
  const sourceAppPath = (() => {
    const launch = buildXcodebuildLaunch({ simulator, derivedDataPath, inheritedEnv })
    const result = spawnSync(launch.executable, launch.args, { cwd: storybookRoot, env: launch.env, shell: false, stdio: 'inherit' })
    if (result.error || result.status !== 0) fail(`xcodebuild Release simulator build failed${result.error ? `: ${result.error.message}` : ''}`)
    assertSameSourceEvidence(packagingContext, collectSourceEvidence())
    return resolveBuiltApp(derivedDataPath)
  })()
  const artifact = validateArtifact({ appPath: sourceAppPath, metadata: readArtifactMetadata(sourceAppPath) })
  const packageName = 'Rally Storybook'
  const appName = 'RallyStorybook.app'
  const installerName = 'Install Rally Storybook.command'
  const packageDirectory = join(runDirectory, packageName)
  mkdirSync(packageDirectory)
  runTool('/usr/bin/ditto', [sourceAppPath, join(packageDirectory, appName)])
  copyFileSync(join(storybookRoot, 'distribution', installerName), join(packageDirectory, installerName))
  chmodSync(join(packageDirectory, installerName), 0o755)
  const checksums = createChecksums({ packageDirectory, appName, installerName })
  if (checksums.appHash !== artifact.bundleHash) fail('copied app checksum mismatch')
  const manifest = createManifest({
    packagingContext,
    simulator: { name: simulator.name, udid: simulator.udid, runtime: simulator.runtime },
    nativeArtifact: artifact,
    packageInfo: { appName, installerName, checksums },
  })
  writeFileSync(join(packageDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  const safeVersion = artifact.version.replace(/[^A-Za-z0-9._-]/g, '_')
  const safeBuild = artifact.build.replace(/[^A-Za-z0-9._-]/g, '_')
  const zipPath = join(runDirectory, `Rally-Storybook-${safeVersion}-${safeBuild}.zip`)
  runTool('/usr/bin/ditto', ['-c', '-k', '--norsrc', '--keepParent', packageDirectory, zipPath])
  verifyZipRoundTrip({ zipPath, packageName, appName, expectedHash: artifact.bundleHash })
  return { runDirectory, zipPath, manifest }
}

function runCli() {
  const options = parseCli(process.argv.slice(2))
  const result = packageStorybook(options)
  console.log(`Verified ZIP: ${result.zipPath}`)
}

const invokedPath = process.argv[1]
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  try {
    runCli()
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
