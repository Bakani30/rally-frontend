import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

import {
  buildStorybookLocalLaunch,
  isStorybookChildSignalError,
  startStorybookLocal,
  waitForStorybookLocalChild,
} from './storybook-local.mjs'

test('buildStorybookLocalLaunch isolates Storybook from inherited application and channel environment', () => {
  const launch = buildStorybookLocalLaunch({
    inheritedEnv: {
      STORYBOOK_SERVER: 'true',
      STORYBOOK_OTHER_CHANNEL_FLAG: 'true',
      STORYBOOK_WS_HOST: '192.168.1.20',
      STORYBOOK_WS_PORT: '7007',
      STORYBOOK_WS_SECURED: 'true',
      EXPO_PUBLIC_SUPABASE_URL: 'https://ltrdptqotnioajnlesqy.supabase.co',
      EXPO_PUBLIC_ENABLE_RUNNING_GPS: 'true',
      SUPABASE_URL: 'https://ltrdptqotnioajnlesqy.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'should-not-reach-storybook',
      POSTHOG_API_KEY: 'should-not-reach-storybook',
      SENTRY_DSN: 'should-not-reach-storybook',
      REACT_NATIVE_PACKAGER_HOSTNAME: '10.0.2.2',
      EXPO_PACKAGER_PROXY_URL: 'https://proxy.example.test',
      NODE_OPTIONS: '--dns-result-order=verbatim --require hostile-hook',
      KEEP_ME: 'present',
    },
    expoCliPath: '/fixture/expo-cli.js',
  })

  assert.equal(launch.executable, process.execPath)
  assert.deepEqual(launch.args, ['--dns-result-order=ipv4first', '/fixture/expo-cli.js', 'start', '--localhost', '--dev-client'])
  assert.equal(launch.env.STORYBOOK_ENABLED, 'true')
  assert.equal(launch.env.STORYBOOK_SERVER, 'false')
  assert.equal(launch.env.EXPO_NO_DOTENV, '1')
  assert.equal(launch.env.EXPO_OFFLINE, '1')
  assert.equal(launch.env.EXPO_NO_TELEMETRY, '1')
  assert.equal(launch.env.KEEP_ME, 'present')

  for (const key of [
    'STORYBOOK_WS_HOST',
    'STORYBOOK_WS_PORT',
    'STORYBOOK_WS_SECURED',
    'STORYBOOK_OTHER_CHANNEL_FLAG',
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_ENABLE_RUNNING_GPS',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'POSTHOG_API_KEY',
    'SENTRY_DSN',
    'REACT_NATIVE_PACKAGER_HOSTNAME',
    'EXPO_PACKAGER_PROXY_URL',
    'NODE_OPTIONS',
  ]) {
    assert.equal(Object.hasOwn(launch.env, key), false, `${key} must not reach Storybook`)
  }
})

test('waitForStorybookLocalChild returns the child failure exit code', async () => {
  const listeners = new Map()
  const child = { once(event, listener) { listeners.set(event, listener); return child } }

  const completion = waitForStorybookLocalChild(child)
  listeners.get('exit')(1, null)

  assert.equal(await completion, 1)
})

test('waitForStorybookLocalChild rejects a spawn error', async () => {
  const listeners = new Map()
  const child = { once(event, listener) { listeners.set(event, listener); return child } }
  const failure = new Error('spawn failed')

  const completion = waitForStorybookLocalChild(child)
  listeners.get('error')(failure)

  await assert.rejects(completion, failure)
})

test('waitForStorybookLocalChild reports the child termination signal without self-signaling', async () => {
  const listeners = new Map()
  const child = { once(event, listener) { listeners.set(event, listener); return child } }
  const completion = waitForStorybookLocalChild(child)
  listeners.get('exit')(null, 'SIGTERM')

  await assert.rejects(completion, (error) => {
    assert.equal(isStorybookChildSignalError(error), true)
    assert.equal(error.signal, 'SIGTERM')
    return true
  })
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  test(`direct launcher process exits with the actual child ${signal}`, () => {
  const launcherPath = fileURLToPath(new URL('./fixtures/storybook-signal-launcher.mjs', import.meta.url))
  const result = spawnSync(process.execPath, [launcherPath], {
    env: { ...process.env, RALLY_TEST_SIGNAL: signal },
  })

  assert.equal(result.signal, signal)
  assert.equal(result.status, null)
  })
}

test('startStorybookLocal forwards parent termination to Metro and removes its signal handlers', async () => {
  const parentListeners = new Map()
  const removed = []
  const childListeners = new Map()
  const sentSignals = []
  const spawned = []
  const child = {
    once(event, listener) { childListeners.set(event, listener); return child },
    kill(signal) { sentSignals.push(signal) },
  }
  const processLike = {
    once(signal, listener) { parentListeners.set(signal, listener) },
    removeListener(signal, listener) { removed.push([signal, listener]) },
  }

  const completion = startStorybookLocal({
    inheritedEnv: {
      KEEP_ME: 'present',
      STORYBOOK_WS_HOST: 'forbidden',
      REACT_NATIVE_PACKAGER_HOSTNAME: '10.0.2.2',
      EXPO_PACKAGER_PROXY_URL: 'https://proxy.example.test',
      NODE_OPTIONS: '--dns-result-order=verbatim',
    },
    expoCliPath: '/fixture/expo-cli.js',
    processLike,
    spawnProcess(...args) { spawned.push(args); return child },
    verifyPatch() {},
  })

  parentListeners.get('SIGTERM')()
  childListeners.get('exit')(0, null)

  assert.equal(await completion, 0)
  assert.deepEqual(spawned, [[
    process.execPath,
    ['--dns-result-order=ipv4first', '/fixture/expo-cli.js', 'start', '--localhost', '--dev-client'],
    {
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
  assert.deepEqual(sentSignals, ['SIGTERM'])
  assert.deepEqual(removed.map(([signal]) => signal).sort(), ['SIGINT', 'SIGTERM'])
})

test('startStorybookLocal verifies the same nested Expo CLI before spawn and leaves it untouched on failure', () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'rally-storybook-local-'))
  const expoCliPath = join(fixtureRoot, 'node_modules/expo/bin/cli.js')
  mkdirSync(join(fixtureRoot, 'node_modules/expo/bin'), { recursive: true })
  writeFileSync(expoCliPath, '// fake nested Expo CLI\n', 'utf8')
  const original = readFileSync(expoCliPath, 'utf8')
  let verifiedPath
  let spawned = false

  try {
    assert.throws(() => startStorybookLocal({
      expoCliPath,
      verifyPatch({ expoCliPath: path }) {
        verifiedPath = path
        throw new Error('localhost patch missing')
      },
      spawnProcess() {
        spawned = true
        throw new Error('must not spawn when verification fails')
      },
    }), /localhost patch missing/)
    assert.equal(verifiedPath, expoCliPath)
    assert.equal(spawned, false)
    assert.equal(readFileSync(expoCliPath, 'utf8'), original)
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true })
  }
})
