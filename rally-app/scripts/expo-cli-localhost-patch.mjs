import { createHash } from 'node:crypto'
import { existsSync, lstatSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, isAbsolute, join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)

const EXPECTED_EXPO_VERSION = '54.0.35'
const EXPECTED_CLI_VERSION = '54.0.25'

const PATCHES = [
  {
    relativePath: 'build/src/start/server/metro/MetroBundlerDevServer.js',
    oldHash: 'aab5b451eebbcce2988c777d099905900c44f0e30b8759ac736c77baf437d0f0',
    patchedHash: 'c50198e31315be8286e93c24b6d5bd3a2d37635414901c35f3756107f4065850',
    oldSnippet: `const parsedOptions = {\n            port: options.port,\n            maxWorkers: options.maxWorkers,\n            resetCache: options.resetDevServer\n        };`,
    patchedSnippet: `const parsedOptions = {\n            host: options.location.hostType === 'localhost' ? 'localhost' : undefined,\n            port: options.port,\n            maxWorkers: options.maxWorkers,\n            resetCache: options.resetDevServer\n        };`,
  },
  {
    relativePath: 'build/src/start/server/metro/instantiateMetro.js',
    oldHash: 'df778c58a8fad6d62f5cf74689d5f1b6286087bbc68071f3cca253aeafd56460',
    patchedHash: 'e73202f835cb37138fb779c068b91845b93469a4fb0a38f8c57128b2f3fe09d5',
    oldSnippet: `const { server, hmrServer, metro } = await (0, _runServerfork.runServer)(metroBundler, metroConfig, {\n        websocketEndpoints,\n        watch: !isExporting && isWatchEnabled()\n    }, {`,
    patchedSnippet: `const { server, hmrServer, metro } = await (0, _runServerfork.runServer)(metroBundler, metroConfig, {\n        host: options.host,\n        websocketEndpoints,\n        watch: !isExporting && isWatchEnabled()\n    }, {`,
  },
]

function fail(message) {
  throw new Error(`Expo localhost patch: ${message}`)
}

function sha256(contents) {
  return createHash('sha256').update(contents, 'utf8').digest('hex')
}

function countOccurrences(contents, snippet) {
  return contents.split(snippet).length - 1
}

function assertInside(parentPath, childPath, label) {
  const childRelativePath = relative(parentPath, childPath)
  if (childRelativePath === '' || (!childRelativePath.startsWith('..') && !isAbsolute(childRelativePath))) return
  fail(`${label} escapes the resolved @expo/cli package`)
}

function readJson(filePath, label) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'))
  } catch (error) {
    fail(`cannot read ${label}: ${error.message}`)
  }
}

function resolvePackagePaths(expoCliPath) {
  if (typeof expoCliPath !== 'string' || expoCliPath.length === 0) {
    fail('expoCliPath is required')
  }
  if (!existsSync(expoCliPath)) fail(`Expo CLI entry is missing: ${expoCliPath}`)

  const activeExpoCliPath = realpathSync(expoCliPath)
  const expoRequire = createRequire(activeExpoCliPath)
  let expoPackagePath
  let cliPackagePath
  try {
    expoPackagePath = expoRequire.resolve('expo/package.json')
    cliPackagePath = expoRequire.resolve('@expo/cli/package.json')
  } catch (error) {
    fail(`cannot resolve active Expo CLI packages from ${expoCliPath}: ${error.message}`)
  }

  const expoPackage = readJson(expoPackagePath, 'Expo package.json')
  const cliPackage = readJson(cliPackagePath, '@expo/cli package.json')
  if (expoPackage.version !== EXPECTED_EXPO_VERSION) {
    fail(`unsupported Expo version ${expoPackage.version}; expected ${EXPECTED_EXPO_VERSION}`)
  }
  if (cliPackage.version !== EXPECTED_CLI_VERSION) {
    fail(`unsupported @expo/cli version ${cliPackage.version}; expected ${EXPECTED_CLI_VERSION}`)
  }

  return { cliRoot: realpathSync(dirname(cliPackagePath)) }
}

function readPatchFile(cliRoot, patch) {
  const requestedPath = join(cliRoot, patch.relativePath)
  if (!existsSync(requestedPath)) fail(`runtime file is missing: ${requestedPath}`)
  if (lstatSync(requestedPath).isSymbolicLink()) {
    const resolvedPath = realpathSync(requestedPath)
    assertInside(cliRoot, resolvedPath, `runtime file ${patch.relativePath}`)
  }
  const filePath = realpathSync(requestedPath)
  assertInside(cliRoot, filePath, `runtime file ${patch.relativePath}`)
  const contents = readFileSync(filePath, 'utf8')
  const oldSnippetCount = countOccurrences(contents, patch.oldSnippet)
  const patchedSnippetCount = countOccurrences(contents, patch.patchedSnippet)

  if (oldSnippetCount !== 1 && patchedSnippetCount !== 1) {
    fail(`expected exactly one old or patched snippet in ${patch.relativePath}; found old=${oldSnippetCount}, patched=${patchedSnippetCount}`)
  }
  if (oldSnippetCount === 1 && patchedSnippetCount === 1) {
    fail(`duplicate or mixed patch snippets in ${patch.relativePath}`)
  }

  const state = oldSnippetCount === 1 ? 'old' : 'patched'
  const expectedHash = state === 'old' ? patch.oldHash : patch.patchedHash
  const actualHash = sha256(contents)
  if (actualHash !== expectedHash) {
    fail(`unexpected ${state} hash for ${patch.relativePath}: ${actualHash}`)
  }

  return { ...patch, contents, filePath, state }
}

export function inspect({ expoCliPath = require.resolve('expo/bin/cli') } = {}) {
  const { cliRoot } = resolvePackagePaths(expoCliPath)
  const files = PATCHES.map((patch) => readPatchFile(cliRoot, patch))
  const state = files[0].state
  if (files.some((file) => file.state !== state)) {
    fail('mixed old and patched runtime files; refusing to write')
  }
  return { expoCliPath, state, files: files.map(({ filePath, relativePath: runtimeFile }) => ({ filePath, runtimeFile })) }
}

export function apply({ expoCliPath = require.resolve('expo/bin/cli') } = {}) {
  const inspection = inspect({ expoCliPath })
  if (inspection.state === 'patched') return inspection

  // inspect has read and validated both full files before either write starts.
  const { cliRoot } = resolvePackagePaths(expoCliPath)
  const files = PATCHES.map((patch) => readPatchFile(cliRoot, patch))
  for (const file of files) {
    writeFileSync(file.filePath, file.contents.replace(file.oldSnippet, file.patchedSnippet), 'utf8')
  }
  return inspect({ expoCliPath })
}

export function verify({ expoCliPath = require.resolve('expo/bin/cli') } = {}) {
  const inspection = inspect({ expoCliPath })
  if (inspection.state !== 'patched') fail('patch is not applied')
  return inspection
}

export function runCli(argv = process.argv.slice(2), expoCliPath = require.resolve('expo/bin/cli')) {
  const [action] = argv
  if (action === 'apply') return apply({ expoCliPath })
  if (action === 'verify') return verify({ expoCliPath })
  fail('usage: expo-cli-localhost-patch.mjs apply|verify')
}

const invokedPath = process.argv[1]
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  try {
    const result = runCli()
    console.log(`Expo localhost patch ${result.state}`)
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
