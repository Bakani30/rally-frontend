import test from 'node:test'
import assert from 'node:assert/strict'
import { validateBuildRecord, validateStaticTarget } from './check-alpha-release.mjs'

const target = {
  channel: 'alpha',
  environment: 'production',
  appVersion: '1.0.1',
  runtimeVersion: '1.0.1',
  baseGitCommit: 'baseline',
  builds: {
    ios: { id: 'ios-build', platform: 'IOS', appBuildVersion: '57' },
    android: { id: 'android-build', platform: 'ANDROID', appBuildVersion: '24' },
  },
}

function validStatic(overrides = {}) {
  return validateStaticTarget({
    appConfig: { expo: { version: '1.0.1', runtimeVersion: { policy: 'appVersion' } } },
    easConfig: { build: { alpha: { channel: 'alpha', environment: 'production', env: { EXPO_PUBLIC_ENABLE_RUNNING_GPS: 'true' } } } },
    target,
    gitStatus: '',
    isBaseAncestor: () => true,
    ...overrides,
  })
}

test('accepts a clean alpha target with matching runtime config', () => {
  assert.deepEqual(validStatic(), [])
})

test('rejects a dirty checkout and missing platform target', () => {
  const failures = validStatic({
    gitStatus: ' M app.json',
    isBaseAncestor: () => false,
    target: { ...target, builds: { ...target.builds, android: { ...target.builds.android, id: null } } },
  })
  assert.equal(failures.length, 3)
  assert.match(failures.join('\n'), /dirty|not descended|android Alpha build id/)
})

test('rejects an EAS build on the wrong channel or runtime', () => {
  const failures = validateBuildRecord({
    record: { platform: 'IOS', channel: 'production', runtimeVersion: '1.0.0', appVersion: '1.0.0', appBuildVersion: '57', gitCommitHash: 'other' },
    expected: target.builds.ios,
    target,
    isBuildAncestor: () => true,
  })
  assert.equal(failures.length, 3)
  assert.match(failures.join('\n'), /channel|runtimeVersion|appVersion/)
})
