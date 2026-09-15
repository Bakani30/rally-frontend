import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const testDirectory = dirname(fileURLToPath(import.meta.url))
const siblingRoot = resolve(testDirectory, '..')
const launcherPath = resolve(siblingRoot, 'scripts/storybook-native.mjs')

async function loadLauncher() {
  assert.ok(existsSync(launcherPath), 'sibling Storybook launcher must exist')
  return import(launcherPath)
}

test('buildRallyStorybookLaunch strips hostile settings and resolves native commands as argument arrays', async () => {
  const { buildRallyStorybookLaunch } = await loadLauncher()
  const inheritedEnv = {
    EXPO_PUBLIC_SUPABASE_URL: 'https://production.example.test',
    STORYBOOK_WS_HOST: '192.168.0.4',
    STORYBOOK_WS_PORT: '7007',
    POSTHOG_API_KEY: 'production-key',
    SENTRY_DSN: 'production-dsn',
    SUPABASE_SERVICE_ROLE_KEY: 'production-service-role',
    REACT_NATIVE_PACKAGER_HOSTNAME: '10.0.2.2',
    EXPO_PACKAGER_PROXY_URL: 'https://proxy.example.test',
    NODE_OPTIONS: '--require hostile-hook',
    KEEP_ME: 'present',
  }

  const start = buildRallyStorybookLaunch({
    mode: 'start',
    inheritedEnv,
    expoCliPath: '/sibling/node_modules/expo/bin/cli.js',
  })
  const ios = buildRallyStorybookLaunch({
    mode: 'ios',
    inheritedEnv,
    expoCliPath: '/sibling/node_modules/expo/bin/cli.js',
    iosDevice: '1D71D5AB-0332-4892-858A-CCEC19991143',
  })

  assert.deepEqual(start.args, [
    '--dns-result-order=ipv4first',
    '/sibling/node_modules/expo/bin/cli.js',
    'start',
    '--localhost',
    '--dev-client',
  ])
  assert.deepEqual(ios.args, [
    '--dns-result-order=ipv4first',
    '/sibling/node_modules/expo/bin/cli.js',
    'run:ios',
    '--no-bundler',
    '--device',
    '1D71D5AB-0332-4892-858A-CCEC19991143',
  ])
  assert.equal(start.env.REACT_NATIVE_PACKAGER_HOSTNAME, undefined)
  assert.equal(ios.env.REACT_NATIVE_PACKAGER_HOSTNAME, '127.0.0.1')
  assert.equal(start.env.KEEP_ME, 'present')
  assert.equal(start.env.STORYBOOK_ENABLED, 'true')
  assert.equal(start.env.STORYBOOK_SERVER, 'false')
  for (const key of [
    'EXPO_PUBLIC_SUPABASE_URL',
    'STORYBOOK_WS_HOST',
    'STORYBOOK_WS_PORT',
    'POSTHOG_API_KEY',
    'SENTRY_DSN',
    'SUPABASE_SERVICE_ROLE_KEY',
    'REACT_NATIVE_PACKAGER_HOSTNAME',
    'EXPO_PACKAGER_PROXY_URL',
    'NODE_OPTIONS',
  ]) {
    assert.equal(Object.hasOwn(start.env, key), false, `${key} must not reach the native command`)
  }
})

test('buildRallyStorybookLaunch requires an explicit simulator target for iOS', async () => {
  const { buildRallyStorybookLaunch } = await loadLauncher()

  assert.throws(() => buildRallyStorybookLaunch({
    mode: 'ios',
    expoCliPath: '/sibling/node_modules/expo/bin/cli.js',
  }), /iOS simulator UDID is required/)
})

test('launchRallyStorybook verifies the sibling Expo CLI before spawning from the sibling directory', async () => {
  const { launchRallyStorybook } = await loadLauncher()
  const childListeners = new Map()
  const child = { once(event, listener) { childListeners.set(event, listener); return child } }
  const spawned = []
  const verified = []
  const parentListeners = new Map()
  const removedSignals = []

  const completion = launchRallyStorybook({
    mode: 'start',
    inheritedEnv: { KEEP_ME: 'present' },
    expoCliPath: '/sibling/node_modules/expo/bin/cli.js',
    verifyPatch({ expoCliPath }) { verified.push(expoCliPath) },
    processLike: {
      once(signal, listener) { parentListeners.set(signal, listener) },
      removeListener(signal) { removedSignals.push(signal) },
    },
    spawnProcess(...args) { spawned.push(args); return child },
  })

  childListeners.get('exit')(0, null)

  assert.equal(await completion, 0)
  assert.deepEqual(verified, ['/sibling/node_modules/expo/bin/cli.js'])
  assert.deepEqual(spawned, [[
    process.execPath,
    ['--dns-result-order=ipv4first', '/sibling/node_modules/expo/bin/cli.js', 'start', '--localhost', '--dev-client'],
    {
      cwd: siblingRoot,
      env: {
        KEEP_ME: 'present',
        STORYBOOK_ENABLED: 'true',
        STORYBOOK_SERVER: 'false',
        EXPO_NO_DOTENV: '1',
        EXPO_OFFLINE: '1',
        EXPO_NO_TELEMETRY: '1',
      },
      shell: false,
      stdio: 'inherit',
    },
  ]])
  assert.deepEqual(removedSignals.sort(), ['SIGINT', 'SIGTERM'])
  assert.equal(parentListeners.size, 2)
})

test('launchRallyStorybook does not spawn if sibling CLI patch verification fails', async () => {
  const { launchRallyStorybook } = await loadLauncher()
  let spawned = false

  assert.throws(() => launchRallyStorybook({
    expoCliPath: '/sibling/node_modules/expo/bin/cli.js',
    verifyPatch() { throw new Error('localhost patch missing') },
    spawnProcess() { spawned = true },
  }), /localhost patch missing/)
  assert.equal(spawned, false)
})

test('launchRallyStorybook validates one available simulator before patch verification and Expo spawn', async () => {
  const { launchRallyStorybook } = await loadLauncher()
  const events = []
  const childListeners = new Map()
  const child = { once(event, listener) { childListeners.set(event, listener); return child } }
  const completion = launchRallyStorybook({
    mode: 'ios',
    iosDevice: '1D71D5AB-0332-4892-858A-CCEC19991143',
    expoCliPath: '/sibling/node_modules/expo/bin/cli.js',
    simctlRunner(...args) {
      events.push(['simctl', ...args])
      return {
        status: 0,
        stdout: JSON.stringify({
          devices: {
            'com.apple.CoreSimulator.SimRuntime.iOS-18-0': [
              { udid: '1D71D5AB-0332-4892-858A-CCEC19991143', isAvailable: true },
            ],
          },
        }),
      }
    },
    verifyPatch() { events.push(['verify']) },
    processLike: { once() {}, removeListener() {} },
    spawnProcess(...args) { events.push(['spawn', ...args]); return child },
  })

  childListeners.get('exit')(0, null)
  assert.equal(await completion, 0)
  assert.deepEqual(events[0], [
    'simctl',
    'xcrun',
    ['simctl', 'list', 'devices', 'available', '-j'],
    { encoding: 'utf8', shell: false },
  ])
  assert.deepEqual(events.slice(1, 3).map(([event]) => event), ['verify', 'spawn'])
  assert.deepEqual(events[2][2].slice(-2), ['--device', '1D71D5AB-0332-4892-858A-CCEC19991143'])
})

test('launchRallyStorybook rejects invalid simulator discovery before verification or spawn', async () => {
  const { launchRallyStorybook } = await loadLauncher()
  const fixtures = [
    ['name', { status: 0, stdout: JSON.stringify({ devices: { runtime: [{ udid: 'OTHER', isAvailable: true }] } }) }],
    ['unavailable', { status: 0, stdout: JSON.stringify({ devices: { runtime: [{ udid: 'TARGET', isAvailable: false }] } }) }],
    ['malformed JSON', { status: 0, stdout: '{' }],
    ['command error', { status: 1, stdout: '', stderr: 'xcrun failed' }],
    ['missing xcrun', { error: new Error('ENOENT') }],
    ['duplicate', { status: 0, stdout: JSON.stringify({ devices: { one: [{ udid: 'TARGET', isAvailable: true }], two: [{ udid: 'TARGET', isAvailable: true }] } }) }],
  ]

  for (const [label, result] of fixtures) {
    let verified = false
    let spawned = false
    assert.throws(() => launchRallyStorybook({
      mode: 'ios',
      iosDevice: 'TARGET',
      simctlRunner() { return result },
      verifyPatch() { verified = true },
      spawnProcess() { spawned = true },
    }), /simulator/i, label)
    assert.equal(verified, false, `${label} must reject before patch verification`)
    assert.equal(spawned, false, `${label} must reject before Expo spawn`)
  }
})

test('launchRallyStorybook start mode never invokes simulator discovery', async () => {
  const { launchRallyStorybook } = await loadLauncher()
  const childListeners = new Map()
  const child = { once(event, listener) { childListeners.set(event, listener); return child } }
  let discoveryCalled = false

  const completion = launchRallyStorybook({
    mode: 'start',
    expoCliPath: '/sibling/node_modules/expo/bin/cli.js',
    simctlRunner() { discoveryCalled = true; throw new Error('must not run') },
    verifyPatch() {},
    processLike: { once() {}, removeListener() {} },
    spawnProcess() { return child },
  })

  childListeners.get('exit')(0, null)
  assert.equal(await completion, 0)
  assert.equal(discoveryCalled, false)
})
