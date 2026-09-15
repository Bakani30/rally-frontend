const { withDangerousMod } = require('expo/config-plugins')
const fs = require('fs')
const path = require('path')

// EAS regenerates ios/ via `expo prebuild`, so the entry fix must be applied as
// a config plugin (a committed edit to ios/.xcode.env would be wiped).
//
// Problem: the native "Bundle React Native code" phase (expo export:embed) resolves
// the JS entry via @expo/config's resolveEntryPoint, which in this monorepo doubles
// the path — the build dies with
//   ".../rally-app/rally-app/node_modules/expo-router/entry.js was not found"
// expo-router is nested under rally-app, and the root node_modules/expo-router
// symlink (which lets the hoisted babel-preset-expo detect expo-router) confuses
// resolveEntryPoint's relative-path math. export:embed honors --entry-file when set,
// so we pin ENTRY_FILE in .xcode.env (sourced before the bundle script computes it).
//
// The pin is pure shell using $PROJECT_DIR (a real Xcode build var) — an earlier
// node `require.resolve` version with process.env.PROJECT_DIR came out empty on EAS
// because PROJECT_DIR isn't exported into the node child there. node fallback (with
// PROJECT_DIR passed as argv) only runs if the nested entry file isn't present.
const ENTRY_FILE_FIX = `
# Pin JS entry — see plugins/withEntryFileFix.js. Avoids @expo/config
# resolveEntryPoint doubling the monorepo path (.../rally-app/rally-app/...).
if [ -z "$ENTRY_FILE" ] && [ -n "$PROJECT_DIR" ]; then
  if [ -f "$PROJECT_DIR/../node_modules/expo-router/entry.js" ]; then
    export ENTRY_FILE="$PROJECT_DIR/../node_modules/expo-router/entry.js"
  else
    export ENTRY_FILE="$("$NODE_BINARY" -e "console.log(require.resolve('expo-router/entry',{paths:[process.argv[1]]}))" "$PROJECT_DIR/.." 2>/dev/null)"
  fi
fi
`

module.exports = function withEntryFileFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const envPath = path.join(cfg.modRequest.platformProjectRoot, '.xcode.env')
      let content = ''
      try {
        content = fs.readFileSync(envPath, 'utf8')
      } catch {
        content = 'export NODE_BINARY=$(command -v node)\n'
      }
      if (!content.includes('ENTRY_FILE')) {
        fs.writeFileSync(envPath, content + ENTRY_FILE_FIX)
      }
      return cfg
    },
  ])
}
