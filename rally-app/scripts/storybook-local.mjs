import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import { pathToFileURL } from 'node:url'

import { verify as verifyExpoCliLocalhostPatch } from './expo-cli-localhost-patch.mjs'

const require = createRequire(import.meta.url)

export class StorybookChildSignalError extends Error {
  constructor(signal) {
    super(`Storybook local process ended with ${signal}`)
    this.name = 'StorybookChildSignalError'
    this.signal = signal
  }
}

export function isStorybookChildSignalError(error) {
  return error instanceof StorybookChildSignalError
}

export function propagateStorybookChildSignal(error, processLike = process) {
  if (!isStorybookChildSignalError(error)) return false
  processLike.kill(processLike.pid, error.signal)
  return true
}

export function buildStorybookLocalLaunch({ inheritedEnv, expoCliPath }) {
  const env = { ...inheritedEnv }

  for (const key of Object.keys(env)) {
    if (
      key.startsWith('STORYBOOK_')
      || key.startsWith('EXPO_PUBLIC_')
      || key.startsWith('POSTHOG_')
      || key.startsWith('SENTRY_')
    ) {
      delete env[key]
    }
  }
  delete env.SUPABASE_URL
  delete env.SUPABASE_SERVICE_ROLE_KEY
  delete env.REACT_NATIVE_PACKAGER_HOSTNAME
  delete env.EXPO_PACKAGER_PROXY_URL
  delete env.NODE_OPTIONS

  Object.assign(env, {
    STORYBOOK_ENABLED: 'true',
    STORYBOOK_SERVER: 'false',
    EXPO_NO_DOTENV: '1',
    EXPO_OFFLINE: '1',
    EXPO_NO_TELEMETRY: '1',
  })

  return {
    executable: process.execPath,
    args: ['--dns-result-order=ipv4first', expoCliPath, 'start', '--localhost', '--dev-client'],
    env,
  }
}

export function waitForStorybookLocalChild(child) {
  return new Promise((resolve, reject) => {
    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (signal) {
        reject(new StorybookChildSignalError(signal))
        return
      }
      resolve(code ?? 1)
    })
  })
}

export function startStorybookLocal({
  inheritedEnv = process.env,
  expoCliPath = require.resolve('expo/bin/cli'),
  processLike = process,
  spawnProcess = spawn,
  verifyPatch = verifyExpoCliLocalhostPatch,
} = {}) {
  verifyPatch({ expoCliPath })
  const launch = buildStorybookLocalLaunch({ inheritedEnv, expoCliPath })
  const child = spawnProcess(launch.executable, launch.args, {
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

const invokedPath = process.argv[1]
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  startStorybookLocal().then((exitCode) => {
    process.exitCode = exitCode
  }).catch((error) => {
    if (propagateStorybookChildSignal(error)) return
    console.error(error)
    process.exitCode = 1
  })
}
