import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildDevClientUrl,
  parseArgs,
} from './ios-simulator-dev.mjs'

test('parseArgs defaults to Rally iPhone 12 B and localhost Metro', () => {
  assert.deepEqual(parseArgs([]), {
    clear: false,
    devices: ['Rally iPhone 12 B'],
    launch: true,
    port: 8081,
  })
})

test('parseArgs accepts multiple iOS devices and flags', () => {
  assert.deepEqual(
    parseArgs(['--device', 'Rally iPhone 12 A', '-d', 'Rally iPhone 12 B', '--port', '8090', '--clear', '--no-launch']),
    {
      clear: true,
      devices: ['Rally iPhone 12 A', 'Rally iPhone 12 B'],
      launch: false,
      port: 8090,
    },
  )
})

test('buildDevClientUrl points the iOS dev client at localhost', () => {
  assert.equal(
    buildDevClientUrl('rallyapp', 8081),
    'rallyapp://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081',
  )
})
