const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')

// This package's deps are NOT hoisted to the monorepo root, so Metro must serve
// from this project (rally-app), not the workspace root — otherwise the root
// package.json `workspaces` field makes Expo root the dev server at the repo and
// `expo-router/entry` fails to resolve, breaking the whole bundle. Must be set
// before getDefaultConfig(), which computes the server root via getMetroServerRoot.
if (!process.env.EXPO_NO_METRO_WORKSPACE_ROOT) {
  process.env.EXPO_NO_METRO_WORKSPACE_ROOT = '1'
}

const config = getDefaultConfig(__dirname)
const workspaceRoot = path.resolve(__dirname, '..')

config.maxWorkers = 2
config.resolver.assetExts = Array.from(new Set([
  ...config.resolver.assetExts,
  'wasm',
]))
config.watchFolders = Array.from(new Set([
  ...(config.watchFolders || []),
  workspaceRoot,
]))
config.resolver.nodeModulesPaths = Array.from(new Set([
  path.resolve(__dirname, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
  ...(config.resolver.nodeModulesPaths || []),
]))

// Simulator-only escape hatch: dev clients built before the vision-camera
// native module crash at startup when the JS imports it. Run Metro with
// RALLY_SIM_STUB_VISION_CAMERA=1 to alias the package to a harmless stub
// (metro-stubs/react-native-vision-camera.js). Never set for device/EAS
// builds — camera features do not work with the stub.
if (process.env.RALLY_SIM_STUB_VISION_CAMERA === '1') {
  const STUBBED_MODULES = {
    'react-native-vision-camera': 'metro-stubs/react-native-vision-camera.js',
    'expo-video': 'metro-stubs/expo-video.js',
  }
  const defaultResolveRequest = config.resolver.resolveRequest
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (STUBBED_MODULES[moduleName]) {
      return {
        type: 'sourceFile',
        filePath: path.resolve(__dirname, STUBBED_MODULES[moduleName]),
      }
    }
    return defaultResolveRequest
      ? defaultResolveRequest(context, moduleName, platform)
      : context.resolveRequest(context, moduleName, platform)
  }
}

const { isLocalStorybookRuntime, isStorybookEnabled } = require('./scripts/storybook-env.cjs')

if (!isStorybookEnabled()) {
  module.exports = config
} else if (!isLocalStorybookRuntime()) {
  throw new Error('Local Storybook requires STORYBOOK_SERVER=false with no STORYBOOK_WS_* transport settings')
} else {
  module.exports = require('@storybook/react-native/withStorybook').withStorybook(config, {
    experimental_mcp: false,
  })
}
