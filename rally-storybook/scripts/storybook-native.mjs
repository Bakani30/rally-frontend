import { spawn, spawnSync } from 'node:child_process'
import { dirname } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

import {
  buildStorybookLocalLaunch,
  propagateStorybookChildSignal,
  waitForStorybookLocalChild,
} from '../../rally-app/scripts/storybook-local.mjs'
import { verify as verifyExpoCliLocalhostPatch } from '../../rally-app/scripts/expo-cli-localhost-patch.mjs'

const require = createRequire(import.meta.url)
const siblingRoot = dirname(dirname(fileURLToPath(import.meta.url)))

export function resolveSiblingExpoCli() {
  return require.resolve('expo/bin/cli')
}

export function buildRallyStorybookLaunch({
  mode = 'start',
  inheritedEnv = process.env,
  expoCliPath = resolveSiblingExpoCli(),
  iosDevice,
} = {}) {
  const launch = buildStorybookLocalLaunch({ inheritedEnv, expoCliPath })
  if (mode === 'start') return launch
  if (mode === 'ios') {
    if (typeof iosDevice !== 'string' || iosDevice.trim().length === 0) {
      throw new Error('iOS simulator UDID is required for the Rally Storybook build')
    }
    return {
      ...launch,
      args: [launch.args[0], expoCliPath, 'run:ios', '--no-bundler', '--device', iosDevice],
      env: {
        ...launch.env,
        REACT_NATIVE_PACKAGER_HOSTNAME: '127.0.0.1',
      },
    }
  }
  throw new Error(`Unsupported Rally Storybook command: ${mode}`)
}

export function resolveAvailableIosSimulator({
  iosDevice,
  simctlRunner = spawnSync,
} = {}) {
  const result = simctlRunner('xcrun', ['simctl', 'list', 'devices', 'available', '-j'], {
    encoding: 'utf8',
    shell: false,
  })
  if (result?.error) {
    throw new Error(`iOS simulator discovery failed: ${result.error.message}`)
  }
  if (result?.status !== 0) {
    throw new Error(`iOS simulator discovery failed with exit code ${result?.status ?? 'unknown'}`)
  }

  let payload
  try {
    payload = JSON.parse(result.stdout)
  } catch {
    throw new Error('iOS simulator discovery returned malformed JSON')
  }
  if (!payload || typeof payload !== 'object' || !payload.devices || typeof payload.devices !== 'object') {
    throw new Error('iOS simulator discovery returned malformed devices')
  }
  const deviceGroups = Object.values(payload.devices)
  if (deviceGroups.some((group) => !Array.isArray(group))) {
    throw new Error('iOS simulator discovery returned malformed devices')
  }
  const matches = deviceGroups
    .flat()
    .filter((device) => device && typeof device === 'object')
    .filter((device) => device.udid === iosDevice && device.isAvailable !== false)
  if (matches.length !== 1) {
    throw new Error(`iOS simulator ${iosDevice} must resolve to exactly one available device`)
  }
  return matches[0].udid
}

export function launchRallyStorybook({
  mode = 'start',
  inheritedEnv = process.env,
  expoCliPath = resolveSiblingExpoCli(),
  iosDevice,
  processLike = process,
  spawnProcess = spawn,
  simctlRunner = spawnSync,
  verifyPatch = verifyExpoCliLocalhostPatch,
} = {}) {
  const canonicalIosDevice = mode === 'ios'
    ? resolveAvailableIosSimulator({ iosDevice, simctlRunner })
    : iosDevice
  verifyPatch({ expoCliPath })
  const launch = buildRallyStorybookLaunch({ mode, inheritedEnv, expoCliPath, iosDevice: canonicalIosDevice })
  const child = spawnProcess(launch.executable, launch.args, {
    cwd: siblingRoot,
    env: launch.env,
    shell: false,
    stdio: 'inherit',
  })
  const parentSignalHandlers = new Map([
    ['SIGINT', () => child.kill('SIGINT')],
    ['SIGTERM', () => child.kill('SIGTERM')],
  ])
  for (const [signal, handler] of parentSignalHandlers) {
    processLike.once(signal, handler)
  }

  return waitForStorybookLocalChild(child).finally(() => {
    for (const [signal, handler] of parentSignalHandlers) {
      processLike.removeListener(signal, handler)
    }
  })
}

function runCli(argv = process.argv.slice(2)) {
  const [mode, iosDevice] = argv
  if (mode !== 'start' && mode !== 'ios') {
    throw new Error('usage: storybook-native.mjs start|ios')
  }
  return launchRallyStorybook({ mode, iosDevice })
}

const invokedPath = process.argv[1]
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  runCli().then((exitCode) => {
    process.exitCode = exitCode
  }).catch((error) => {
    if (propagateStorybookChildSignal(error)) return
    console.error(error)
    process.exitCode = 1
  })
}
