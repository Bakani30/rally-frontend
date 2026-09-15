import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const Module = require('node:module')
const typescript = require('typescript')
const indexPath = fileURLToPath(new URL('../index.tsx', import.meta.url))
const originalLoad = Module._load
const originalTsLoader = require.extensions['.ts']
const originalTsxLoader = require.extensions['.tsx']
const originalInfo = console.info
const registrations = []
let blocked

function transpileTypeScript(module, filename) {
  const source = readFileSync(filename, 'utf8')
  const output = typescript.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: typescript.JsxEmit.ReactJSX,
      module: typescript.ModuleKind.CommonJS,
      target: typescript.ScriptTarget.ES2022,
    },
    fileName: filename,
  })
  module._compile(output.outputText, filename)
}

require.extensions['.ts'] = transpileTypeScript
require.extensions['.tsx'] = transpileTypeScript
Module._load = function loadStorybookBootstrapProbe(request, parent, isMain) {
  if (request === 'expo') {
    return { registerRootComponent(root) { registrations.push(root) } }
  }
  if (request === './storybook.requires' && parent?.filename === indexPath) {
    try {
      globalThis.fetch('https://example.com/storybook-probe')
      blocked = 'allowed'
    } catch (error) {
      blocked = error.message
    }
    return { view: { getStorybookUI: () => 'storybook-root' } }
  }
  return originalLoad.call(this, request, parent, isMain)
}
console.info = () => {}

try {
  require(indexPath)
  process.stdout.write(`${JSON.stringify({ blocked, registered: registrations[0] })}\n`)
} finally {
  Module._load = originalLoad
  require.extensions['.ts'] = originalTsLoader
  require.extensions['.tsx'] = originalTsxLoader
  console.info = originalInfo
}
