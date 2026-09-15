const { expoRouterBabelPlugin } = require('babel-preset-expo/build/expo-router-plugin')

module.exports = function (api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
    // expo-router is kept in rally-app/node_modules while babel-preset-expo
    // is hoisted to the workspace root, so its auto-detection cannot see it.
    plugins: [
      expoRouterBabelPlugin,
      'react-native-worklets/plugin',
    ],
  }
}
