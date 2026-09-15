import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildDevClientUrl,
  chooseAndroidTargets,
  parseArgs,
  parseAdbDevices,
  resolveExpoInvocation,
  shouldRestartMetro,
} from './android-emulator-dev.mjs'

test('parseArgs accepts multiple Android device serials and flags', () => {
  assert.deepEqual(
    parseArgs(['--device', 'emulator-5554', '-d', 'emulator-5556', '--port', '8090', '--clear', '--no-launch']),
    {
      clear: true,
      devices: ['emulator-5554', 'emulator-5556'],
      forceStop: true,
      launch: false,
      port: 8090,
      restartMetro: false,
    },
  )
})

test('parseAdbDevices ignores offline devices and headers', () => {
  assert.deepEqual(
    parseAdbDevices(`List of devices attached
emulator-5554\tdevice
emulator-5556\toffline
R58N123456\tdevice
`),
    ['emulator-5554', 'R58N123456'],
  )
})

test('chooseAndroidTargets defaults to emulators when they are present', () => {
  assert.deepEqual(
    chooseAndroidTargets([], ['emulator-5554', 'R58N123456', 'emulator-5556']),
    ['emulator-5554', 'emulator-5556'],
  )
})

test('chooseAndroidTargets respects explicit serial order', () => {
  assert.deepEqual(
    chooseAndroidTargets(['R58N123456', 'emulator-5554'], ['emulator-5554', 'R58N123456']),
    ['R58N123456', 'emulator-5554'],
  )
})

test('buildDevClientUrl points the dev client at localhost for adb reverse', () => {
  assert.equal(
    buildDevClientUrl('rallyapp', 8081),
    'rallyapp://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081',
  )
})

test('shouldRestartMetro only restarts LAN Metro when requested', () => {
  const lanCommand = 'node ./node_modules/expo/bin/cli start --host lan --port 8081'
  const localhostCommand = 'node ./node_modules/expo/bin/cli start --localhost --dev-client --port 8081'
  const localhostClassicCommand = 'node ./node_modules/expo/bin/cli start --localhost --port 8081'

  assert.equal(shouldRestartMetro(lanCommand, false), false)
  assert.equal(shouldRestartMetro(lanCommand, true), true)
  assert.equal(shouldRestartMetro(localhostCommand, true), false)
  assert.equal(shouldRestartMetro(localhostClassicCommand, true), true)
})

test('resolveExpoInvocation prefers the local Expo CLI JS entrypoint', () => {
  const exists = (filePath) => filePath.endsWith('node_modules\\expo\\bin\\cli')

  assert.deepEqual(resolveExpoInvocation('C:\\repo\\rally-app', exists, 'win32', 'C:\\node\\node.exe'), {
    argsPrefix: ['C:\\repo\\rally-app\\node_modules\\expo\\bin\\cli'],
    command: 'C:\\node\\node.exe',
  })
})
