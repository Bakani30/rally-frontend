import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const testDirectory = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const siblingRoot = resolve(testDirectory, '..')
const appConfigPath = resolve(siblingRoot, 'app.json')
const productionAppConfigPath = resolve(siblingRoot, '../rally-app/app.json')

test('declares an isolated native identity with updates disabled', () => {
  assert.ok(existsSync(appConfigPath), 'rally-storybook/app.json must exist')

  const config = JSON.parse(readFileSync(appConfigPath, 'utf8')).expo
  assert.deepEqual(
    {
      name: config.name,
      slug: config.slug,
      scheme: config.scheme,
      bundleIdentifier: config.ios?.bundleIdentifier,
      androidPackage: config.android?.package,
      updatesEnabled: config.updates?.enabled,
    },
    {
      name: 'Rally Storybook',
      slug: 'rally-storybook',
      scheme: 'rallystorybook',
      bundleIdentifier: 'com.rallyactiver.rally.storybook',
      androidPackage: 'com.rallyactiver.rally.storybook',
      updatesEnabled: false,
    },
  )
})

test('does not inherit production service, update, or native capability configuration', () => {
  assert.ok(existsSync(appConfigPath), 'rally-storybook/app.json must exist')

  const config = JSON.parse(readFileSync(appConfigPath, 'utf8')).expo
  for (const key of ['owner', 'runtimeVersion', 'plugins', 'extra', 'updates']) {
    if (key === 'updates') {
      assert.deepEqual(config.updates, { enabled: false })
      continue
    }
    assert.equal(Object.hasOwn(config, key), false, `app config must not include ${key}`)
  }
  assert.equal(Object.hasOwn(config.ios ?? {}, 'entitlements'), false)
  assert.equal(Object.hasOwn(config.ios ?? {}, 'googleServicesFile'), false)
  assert.equal(Object.hasOwn(config.android ?? {}, 'googleServicesFile'), false)
})

test('declares only Storybook closure native dependencies including the development client', () => {
  const manifest = JSON.parse(readFileSync(resolve(siblingRoot, 'package.json'), 'utf8'))
  assert.equal(manifest.dependencies['expo-dev-client'], '~6.0.21')
  assert.equal(manifest.dependencies['expo-secure-store'], '~15.0.8')
  assert.equal(manifest.dependencies.zustand, '^5.0.12')
  for (const dependency of [
    '@kingstinct/react-native-healthkit',
    '@maplibre/maplibre-react-native',
    'expo-location',
    'expo-notifications',
    'react-native-health-connect',
    'react-native-vision-camera',
  ]) {
    assert.equal(Object.hasOwn(manifest.dependencies, dependency), false, `${dependency} is outside the Storybook closure`)
  }
})

test('exposes only sanitized sibling native commands', () => {
  const manifest = JSON.parse(readFileSync(resolve(siblingRoot, 'package.json'), 'utf8'))
  assert.equal(manifest.scripts.start, 'node ./scripts/storybook-native.mjs start')
  assert.equal(manifest.scripts.ios, 'node ./scripts/storybook-native.mjs ios')
  assert.equal(Object.hasOwn(manifest.scripts, 'android'), false)
})

test('keeps the production app config as a distinct source of truth', () => {
  assert.ok(existsSync(productionAppConfigPath), 'production rally-app/app.json must remain present')
  assert.ok(existsSync(appConfigPath), 'rally-storybook/app.json must exist')

  const production = JSON.parse(readFileSync(productionAppConfigPath, 'utf8')).expo
  const sibling = JSON.parse(readFileSync(appConfigPath, 'utf8')).expo
  assert.notEqual(sibling.name, production.name)
  assert.notEqual(sibling.slug, production.slug)
  assert.notEqual(sibling.ios?.bundleIdentifier, production.ios?.bundleIdentifier)
  assert.notEqual(sibling.android?.package, production.android?.package)
})

test('hides the native status bar in Storybook previews', () => {
  const preview = readFileSync(resolve(siblingRoot, '../rally-app/.rnstorybook/preview.tsx'), 'utf8')
  assert.match(preview, /<StatusBar hidden\s*\/>/)
})

test('Metro watches only shared Storybook source and resolves one root runtime', () => {
  const { getDefaultConfig } = require('expo/metro-config')
  const metro = require(resolve(siblingRoot, 'metro.config.js'))
  const workspaceRoot = resolve(siblingRoot, '..')
  const sharedAppRoot = resolve(workspaceRoot, 'rally-app')
  const sharedRuntimeRoot = resolve(workspaceRoot, 'node_modules')
  const expectedWatchFolders = Array.from(new Set([
    ...(getDefaultConfig(siblingRoot).watchFolders || []),
    sharedAppRoot,
  ]))

  assert.deepEqual(metro.watchFolders, expectedWatchFolders)
  assert.deepEqual(metro.resolver.nodeModulesPaths, [
    resolve(siblingRoot, 'node_modules'),
    sharedRuntimeRoot,
  ])
  assert.equal(metro.resolver.disableHierarchicalLookup, true)
  assert.equal(metro.resolver.extraNodeModules['@'], sharedAppRoot)
  assert.equal(metro.resolver.extraNodeModules.react, resolve(sharedRuntimeRoot, 'react'))
  assert.equal(metro.resolver.extraNodeModules['react-native'], resolve(sharedRuntimeRoot, 'react-native'))

  const entry = readFileSync(resolve(siblingRoot, 'index.js'), 'utf8')
  assert.match(entry, /rally-app\/.rnstorybook\/index/)
  assert.doesNotMatch(entry, /expo-router/)
})

test('sibling package resolution uses the reviewed native closure versions', () => {
  const siblingRequire = createRequire(resolve(siblingRoot, 'package.json'))
  for (const [packageName, expectedVersion] of [
    ['@react-native-community/datetimepicker', '8.4.4'],
    ['@react-native-community/slider', '5.0.1'],
    ['expo', '54.0.35'],
    ['expo-dev-client', '6.0.21'],
    ['react', '19.1.0'],
    ['react-native', '0.81.5'],
  ]) {
    const manifestPath = siblingRequire.resolve(`${packageName}/package.json`)
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    assert.equal(manifest.version, expectedVersion, packageName)
  }
})
