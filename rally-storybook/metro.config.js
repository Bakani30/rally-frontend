const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')

const siblingRoot = __dirname
const workspaceRoot = path.resolve(siblingRoot, '..')
const sharedAppRoot = path.resolve(workspaceRoot, 'rally-app')
const sharedStorybookConfigPath = path.resolve(sharedAppRoot, '.rnstorybook')
const sharedRuntimeRoot = path.resolve(workspaceRoot, 'node_modules')

const config = getDefaultConfig(siblingRoot)

config.watchFolders = Array.from(new Set([
  ...(config.watchFolders || []),
  sharedAppRoot,
]))
config.resolver.nodeModulesPaths = [
  path.resolve(siblingRoot, 'node_modules'),
  sharedRuntimeRoot,
]
config.resolver.disableHierarchicalLookup = true
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  '@': sharedAppRoot,
  react: path.resolve(sharedRuntimeRoot, 'react'),
  'react-native': path.resolve(sharedRuntimeRoot, 'react-native'),
}

const { isLocalStorybookRuntime, isStorybookEnabled } = require('../rally-app/scripts/storybook-env.cjs')

if (!isStorybookEnabled()) {
  module.exports = config
} else if (!isLocalStorybookRuntime()) {
  throw new Error('Local Storybook requires STORYBOOK_SERVER=false with no STORYBOOK_WS_* transport settings')
} else {
  module.exports = require('@storybook/react-native/withStorybook').withStorybook(config, {
    configPath: sharedStorybookConfigPath,
    experimental_mcp: false,
  })
}
