#!/usr/bin/env node

import { spawn, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const DEFAULT_DEVICE = 'Rally iPhone 12 B'
const DEFAULT_PORT = 8081
const DEFAULT_READY_TIMEOUT_MS = 45_000
const METRO_STATUS = 'packager-status:running'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(scriptDir, '..')

function usage() {
  console.log(`
Usage: node ./scripts/ios-simulator-dev.mjs [options]

Options:
  --device <name-or-udid>  Boot and launch a simulator. Can be passed multiple times.
  --port <port>           Metro port. Defaults to ${DEFAULT_PORT}.
  --clear                 Clear Metro cache before starting Expo.
  --no-launch             Start/wait for Metro without opening the dev client.
  -h, --help              Show this help.
`)
}

export function parseArgs(argv) {
  const devices = []
  let port = DEFAULT_PORT
  let clear = false
  let launch = true

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--device' || arg === '-d') {
      const value = argv[index + 1]
      if (!value) {
        throw new Error('--device requires a simulator name or UDID.')
      }
      devices.push(value)
      index += 1
      continue
    }

    if (arg === '--port' || arg === '-p') {
      const value = Number(argv[index + 1])
      if (!Number.isInteger(value) || value <= 0) {
        throw new Error('--port requires a positive integer.')
      }
      port = value
      index += 1
      continue
    }

    if (arg === '--clear') {
      clear = true
      continue
    }

    if (arg === '--no-launch') {
      launch = false
      continue
    }

    if (arg === '--help' || arg === '-h') {
      usage()
      process.exit(0)
    }

    throw new Error(`Unknown option: ${arg}`)
  }

  return {
    clear,
    devices: devices.length > 0 ? devices : [DEFAULT_DEVICE],
    launch,
    port,
  }
}

function npxCommand() {
  return process.platform === 'win32' ? 'npx.cmd' : 'npx'
}

export function buildDevClientUrl(scheme, port) {
  return `${scheme}://expo-development-client/?url=${encodeURIComponent(`http://127.0.0.1:${port}`)}`
}

function readExpoIosConfig() {
  const appJson = JSON.parse(readFileSync(resolve(projectRoot, 'app.json'), 'utf8'))
  const schemeConfig = appJson?.expo?.scheme
  const scheme = Array.isArray(schemeConfig) ? schemeConfig[0] : schemeConfig
  const bundleIdentifier = appJson?.expo?.ios?.bundleIdentifier

  if (typeof scheme === 'string' && scheme.length > 0) {
    return { bundleIdentifier, scheme }
  }

  throw new Error('No Expo scheme found in app.json. Dev-client launch needs one.')
}

function waitForSimulatorBoot(device) {
  const result = spawnSync('xcrun', ['simctl', 'bootstatus', device, '-b'], {
    encoding: 'utf8',
    timeout: 60_000,
  })

  if (result.status === 0) {
    return null
  }

  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim()
  const timedOut = result.error?.code === 'ETIMEDOUT'
  const outputLines = output.split(/\r?\n/).filter(Boolean)
  const outputTail = outputLines.slice(-8).join('\n')

  return [
    `Simulator "${device}" did not report a complete boot${timedOut ? ' within 60s' : ''}. Continuing because Metro can still run.`,
    'If Rally does not open, restart Simulator and run npm run ios again.',
    outputTail,
  ]
    .filter(Boolean)
    .join('\n')
}

function bootSimulator(device) {
  const result = spawnSync('xcrun', ['simctl', 'boot', device], {
    encoding: 'utf8',
  })

  if (result.status === 0) {
    return true
  }

  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`

  if (/current state:\s+Booted|already booted/i.test(output)) {
    return false
  }

  throw new Error(`Could not boot iOS Simulator "${device}".\n${output.trim()}`)
}

function openSimulatorApp() {
  const child = spawn('open', ['-a', 'Simulator'], {
    detached: true,
    stdio: 'ignore',
  })
  child.unref()
}

async function isMetroReady(port) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 1_500)

  try {
    const response = await fetch(`http://127.0.0.1:${port}/status`, {
      signal: controller.signal,
    })
    const body = await response.text()
    return body.includes(METRO_STATUS)
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}

function startExpo(port, clear) {
  const args = ['expo', 'start', '--localhost', '--dev-client', '--port', String(port)]

  if (clear) {
    args.push('--clear')
  }

  return spawn(npxCommand(), args, {
    cwd: projectRoot,
    env: process.env,
    stdio: 'inherit',
  })
}

async function waitForMetro(port, child) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < DEFAULT_READY_TIMEOUT_MS) {
    if (await isMetroReady(port)) {
      return
    }

    if (child?.exitCode !== null) {
      throw new Error(`Expo dev server exited before Metro became ready (exit code ${child.exitCode}).`)
    }

    await new Promise((resolveDelay) => setTimeout(resolveDelay, 500))
  }

  throw new Error(`Metro did not become ready on port ${port} within ${DEFAULT_READY_TIMEOUT_MS / 1000}s.`)
}

function launchBundle(device, bundleIdentifier) {
  if (!bundleIdentifier) {
    return false
  }

  const result = spawnSync('xcrun', ['simctl', 'launch', device, bundleIdentifier], {
    encoding: 'utf8',
    timeout: 20_000,
  })

  if (result.status === 0) {
    console.warn(`Opened Rally on ${device} by bundle id after URL open timed out.`)
    return true
  }

  return false
}

function launchDevClient(device, scheme, port, bundleIdentifier) {
  const launchUrl = buildDevClientUrl(scheme, port)
  const result = spawnSync('xcrun', ['simctl', 'openurl', device, launchUrl], {
    encoding: 'utf8',
    timeout: 20_000,
  })

  if (result.status === 0) {
    console.log(`Opened Rally dev client on ${device}.`)
    return
  }

  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim()
  const timedOut = result.error?.code === 'ETIMEDOUT' || /Operation timed out|NSPOSIXErrorDomain, code=60/i.test(output)
  const installHint = bundleIdentifier
    ? `If ${bundleIdentifier} is not installed, run: npm run ios:build`
    : 'If the iOS dev client is not installed, run: npm run ios:build'

  if (timedOut && launchBundle(device, bundleIdentifier)) {
    return
  }

  throw new Error(
    [
      `Could not open Rally dev client on "${device}".`,
      timedOut
        ? 'CoreSimulator timed out opening a URL. Restart the simulator, then run npm run ios again.'
        : installHint,
      timedOut ? installHint : null,
      output,
    ]
      .filter(Boolean)
      .join('\n'),
  )
}

function waitForChild(child) {
  return new Promise((resolve) => {
    child.once('exit', (code, signal) => {
      resolve({ code, signal })
    })
  })
}

function stopChild(child) {
  if (!child || child.killed || child.exitCode !== null) {
    return
  }

  child.kill('SIGINT')
}

async function main() {
  if (process.platform !== 'darwin') {
    throw new Error('iOS Simulator scripts require macOS.')
  }

  const options = parseArgs(process.argv.slice(2))
  const { bundleIdentifier, scheme } = readExpoIosConfig()
  const devicesStartedByScript = []

  for (const device of options.devices) {
    console.log(`Booting ${device}...`)
    if (bootSimulator(device)) {
      devicesStartedByScript.push(device)
    }
  }

  openSimulatorApp()

  for (const device of devicesStartedByScript) {
    const bootWarning = waitForSimulatorBoot(device)
    if (bootWarning) {
      console.warn(bootWarning)
    }
  }

  let expoProcess = null
  const alreadyReady = await isMetroReady(options.port)

  if (!alreadyReady) {
    console.log(`Starting Expo dev server on localhost:${options.port}...`)
    expoProcess = startExpo(options.port, options.clear)
    await waitForMetro(options.port, expoProcess)
  } else {
    console.log(`Reusing existing Metro server on localhost:${options.port}.`)
  }

  if (options.launch) {
    for (const device of options.devices) {
      console.log(`Opening Rally on ${device}...`)
      try {
        launchDevClient(device, scheme, options.port, bundleIdentifier)
      } catch (error) {
        console.warn(error.message)
      }
    }
  }

  if (expoProcess) {
    console.log('Metro is ready. Press Ctrl+C to stop the dev server.')

    for (const signal of ['SIGINT', 'SIGTERM']) {
      process.once(signal, () => {
        stopChild(expoProcess)
      })
    }

    const { code, signal } = await waitForChild(expoProcess)
    if (signal) {
      process.kill(process.pid, signal)
    }
    process.exit(code ?? 0)
  }
}

function isInvokedDirectly() {
  if (!process.argv[1]) {
    return false
  }

  try {
    return fileURLToPath(import.meta.url) === resolve(process.argv[1])
  } catch {
    return import.meta.url === pathToFileURL(resolve(process.argv[1])).href
  }
}

if (isInvokedDirectly()) {
  main().catch((error) => {
    console.error(error.message)
    process.exit(1)
  })
}
