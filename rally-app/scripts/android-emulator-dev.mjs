#!/usr/bin/env node

import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, delimiter, resolve } from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const DEFAULT_PORT = 8081
const DEFAULT_READY_TIMEOUT_MS = 45_000
const METRO_STATUS = 'packager-status:running'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(scriptDir, '..')

function usage() {
  console.log(`
Usage: node ./scripts/android-emulator-dev.mjs [options]

Options:
  --device <serial>       Android device/emulator serial. Can be passed multiple times.
  --port <port>           Metro port. Defaults to ${DEFAULT_PORT}.
  --clear                 Clear Metro cache before starting Expo.
  --restart-metro         Restart existing non-localhost Expo Metro on this port.
  --no-launch             Prepare Metro and adb reverse without opening the dev client.
  --no-force-stop         Do not stop the app before opening the dev client.
  -h, --help              Show this help.
`)
}

export function parseArgs(argv) {
  const devices = []
  let clear = false
  let forceStop = true
  let launch = true
  let port = DEFAULT_PORT
  let restartMetro = false

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--device' || arg === '-d') {
      const value = argv[index + 1]
      if (!value) {
        throw new Error('--device requires an Android device serial.')
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

    if (arg === '--restart-metro') {
      restartMetro = true
      continue
    }

    if (arg === '--no-launch') {
      launch = false
      continue
    }

    if (arg === '--no-force-stop') {
      forceStop = false
      continue
    }

    if (arg === '--help' || arg === '-h') {
      usage()
      process.exit(0)
    }

    throw new Error(`Unknown option: ${arg}`)
  }

  return { clear, devices, forceStop, launch, port, restartMetro }
}

export function parseAdbDevices(output) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.toLowerCase().startsWith('list of devices'))
    .map((line) => line.split(/\s+/))
    .filter((parts) => parts[1] === 'device')
    .map((parts) => parts[0])
}

export function chooseAndroidTargets(requestedDevices, availableDevices) {
  if (requestedDevices.length > 0) {
    return requestedDevices
  }

  const emulators = availableDevices.filter((device) => device.startsWith('emulator-'))
  return emulators.length > 0 ? emulators : availableDevices
}

export function buildDevClientUrl(scheme, port) {
  return `${scheme}://expo-development-client/?url=${encodeURIComponent(`http://127.0.0.1:${port}`)}`
}

export function shouldRestartMetro(commandLine, restartRequested) {
  if (!restartRequested) {
    return false
  }

  const normalized = commandLine.toLowerCase()
  if (!normalized.includes('expo') || !normalized.includes('start')) {
    return false
  }

  return !normalized.includes('--localhost') || !normalized.includes('--dev-client')
}

export function resolveExpoInvocation(
  root = projectRoot,
  exists = existsSync,
  platform = process.platform,
  nodePath = process.execPath,
) {
  const localExpoCli = resolve(root, 'node_modules', 'expo', 'bin', 'cli')
  if (exists(localExpoCli)) {
    return { argsPrefix: [localExpoCli], command: nodePath }
  }

  const localExpoBin = resolve(root, 'node_modules', '.bin', platform === 'win32' ? 'expo.cmd' : 'expo')
  if (exists(localExpoBin)) {
    return { argsPrefix: [], command: localExpoBin }
  }

  return { argsPrefix: ['expo'], command: platform === 'win32' ? 'npx.cmd' : 'npx' }
}

function expoStartInvocation(port, clear) {
  const { argsPrefix, command } = resolveExpoInvocation()
  const args = [...argsPrefix, 'start', '--localhost', '--dev-client', '--port', String(port)]

  if (clear) {
    args.push('--clear')
  }

  return { args, command }
}

function readExpoAndroidConfig() {
  const appJson = JSON.parse(readFileSync(resolve(projectRoot, 'app.json'), 'utf8'))
  const schemeConfig = appJson?.expo?.scheme
  const scheme = Array.isArray(schemeConfig) ? schemeConfig[0] : schemeConfig
  const applicationId = appJson?.expo?.android?.package

  if (typeof scheme !== 'string' || scheme.length === 0) {
    throw new Error('No Expo scheme found in app.json. Android dev-client launch needs one.')
  }

  if (typeof applicationId !== 'string' || applicationId.length === 0) {
    throw new Error('No Android package found in app.json. Android dev-client launch needs one.')
  }

  return { applicationId, scheme }
}

function findAdbCommand() {
  const roots = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    process.env.LOCALAPPDATA ? resolve(process.env.LOCALAPPDATA, 'Android', 'Sdk') : null,
    process.env.HOME ? resolve(process.env.HOME, 'AppData', 'Local', 'Android', 'Sdk') : null,
  ].filter(Boolean)

  for (const root of roots) {
    const candidate = resolve(root, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb')
    if (existsSync(candidate)) {
      return candidate
    }
  }

  const result = spawnSync('adb', ['version'], { encoding: 'utf8', timeout: 3_000 })
  if (result.status === 0) {
    return 'adb'
  }

  throw new Error('Could not find adb. Set ANDROID_HOME/ANDROID_SDK_ROOT or add platform-tools to PATH.')
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    timeout: options.timeout ?? 10_000,
    ...options,
  })

  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim()
  if (result.error) {
    const detail = result.error.code === 'ETIMEDOUT' ? `timed out after ${options.timeout ?? 10_000}ms` : result.error.message
    throw new Error(`${command} ${args.join(' ')} ${detail}${output ? `\n${output}` : ''}`)
  }

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}.${output ? `\n${output}` : ''}`)
  }

  return output
}

function listAdbDevices(adbCommand) {
  return parseAdbDevices(run(adbCommand, ['devices']))
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

function getWindowsPortOwners(port) {
  if (process.platform !== 'win32') {
    return []
  }

  const command = [
    `$connections = Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue`,
    '$pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique',
    'foreach ($ownerPid in $pids) {',
    '  $process = Get-CimInstance Win32_Process -Filter "ProcessId = $ownerPid"',
    '  if ($process) { "$($process.ProcessId)`t$($process.CommandLine)" }',
    '}',
  ].join('; ')

  const result = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command], {
    encoding: 'utf8',
    timeout: 5_000,
  })

  if (result.status !== 0 || result.error) {
    return []
  }

  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [pid, ...commandLineParts] = line.split('\t')
      return { commandLine: commandLineParts.join('\t'), pid: Number(pid) }
    })
    .filter((owner) => Number.isInteger(owner.pid) && owner.pid > 0)
}

function stopProcessTree(pid) {
  if (process.platform === 'win32') {
    run('taskkill.exe', ['/PID', String(pid), '/T', '/F'], { timeout: 8_000 })
    return
  }

  process.kill(pid, 'SIGTERM')
}

function startExpo(port, clear) {
  const { args, command } = expoStartInvocation(port, clear)

  const env = {
    ...process.env,
    PATH: [resolve(dirname(findAdbCommand())), process.env.PATH].filter(Boolean).join(delimiter),
    REACT_NATIVE_PACKAGER_HOSTNAME: '127.0.0.1',
  }

  const child = spawn(command, args, {
    cwd: projectRoot,
    env,
    shell: process.platform === 'win32' && command.endsWith('.cmd'),
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  child.stdout?.on('data', (chunk) => {
    process.stdout.write(chunk)
  })
  child.stderr?.on('data', (chunk) => {
    process.stderr.write(chunk)
  })

  return child
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

async function ensureLocalhostMetro(options) {
  let alreadyReady = await isMetroReady(options.port)

  if (alreadyReady) {
    const owners = getWindowsPortOwners(options.port)
    const restartOwners = owners.filter((owner) => shouldRestartMetro(owner.commandLine, options.restartMetro))

    if (restartOwners.length > 0) {
      for (const owner of restartOwners) {
        console.log(`Stopping non-localhost Expo Metro on port ${options.port} (pid ${owner.pid})...`)
        stopProcessTree(owner.pid)
      }

      await new Promise((resolveDelay) => setTimeout(resolveDelay, 1_000))
      alreadyReady = await isMetroReady(options.port)
    } else if (owners.some((owner) => shouldRestartMetro(owner.commandLine, true))) {
      console.warn(`Metro on port ${options.port} appears to be LAN mode. Use --restart-metro if asset URLs still point at a LAN IP.`)
    }
  }

  if (alreadyReady) {
    console.log(`Reusing existing Metro server on localhost:${options.port}.`)
    return null
  }

  console.log(`Starting Expo dev server on localhost:${options.port}...`)
  const child = startExpo(options.port, options.clear)
  await waitForMetro(options.port, child)
  return child
}

function configureReverse(adbCommand, serial, port) {
  run(adbCommand, ['-s', serial, 'reverse', `tcp:${port}`, `tcp:${port}`], { timeout: 8_000 })
  console.log(`adb reverse ready on ${serial}: tcp:${port} -> tcp:${port}`)
}

function isAppInstalled(adbCommand, serial, applicationId) {
  try {
    const output = run(adbCommand, ['-s', serial, 'shell', 'pm', 'path', applicationId], { timeout: 8_000 })
    return output.includes(`package:`)
  } catch {
    return false
  }
}

function launchDevClient(adbCommand, serial, applicationId, url, forceStop) {
  if (!isAppInstalled(adbCommand, serial, applicationId)) {
    console.warn(`Skipping ${serial}: ${applicationId} is not installed. Install the team-provided Android dev client first.`)
    return
  }

  if (forceStop) {
    run(adbCommand, ['-s', serial, 'shell', 'am', 'force-stop', applicationId], { timeout: 8_000 })
  }

  run(
    adbCommand,
    ['-s', serial, 'shell', 'am', 'start', '-W', '-a', 'android.intent.action.VIEW', '-d', url, applicationId],
    { timeout: 12_000 },
  )
  console.log(`Opened Rally dev client on ${serial}.`)
}

function waitForChild(child) {
  return new Promise((resolveChild) => {
    child.once('exit', (code, signal) => {
      resolveChild({ code, signal })
    })
  })
}

function stopChild(child) {
  if (!child || child.killed || child.exitCode !== null) {
    return
  }

  child.kill('SIGINT')
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv)
  const { applicationId, scheme } = readExpoAndroidConfig()
  const adbCommand = findAdbCommand()
  const availableDevices = listAdbDevices(adbCommand)
  const targets = chooseAndroidTargets(options.devices, availableDevices)
  const missingDevices = targets.filter((device) => !availableDevices.includes(device))

  if (availableDevices.length === 0) {
    throw new Error('No Android devices are connected. Start an emulator first.')
  }

  if (missingDevices.length > 0) {
    throw new Error(`Android device(s) not connected: ${missingDevices.join(', ')}`)
  }

  const metroProcess = await ensureLocalhostMetro(options)

  for (const serial of targets) {
    try {
      configureReverse(adbCommand, serial, options.port)
    } catch (error) {
      console.warn(`Could not configure adb reverse for ${serial}: ${error.message}`)
    }
  }

  if (options.launch) {
    const url = buildDevClientUrl(scheme, options.port)
    for (const serial of targets) {
      try {
        launchDevClient(adbCommand, serial, applicationId, url, options.forceStop)
      } catch (error) {
        console.warn(`Could not launch Rally on ${serial}: ${error.message}`)
      }
    }
  }

  if (metroProcess) {
    console.log('Metro is ready. Press Ctrl+C to stop the dev server.')

    for (const signal of ['SIGINT', 'SIGTERM']) {
      process.once(signal, () => {
        stopChild(metroProcess)
      })
    }

    const { code, signal } = await waitForChild(metroProcess)
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
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(resolve(process.argv[1]))
  } catch {
    return import.meta.url === pathToFileURL(resolve(process.argv[1])).href
  }
}

const invokedDirectly = isInvokedDirectly()
if (invokedDirectly) {
  main().catch((error) => {
    console.error(error.message)
    process.exit(1)
  })
}
