import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { lstatSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'

import { apply, inspect, verify } from './expo-cli-localhost-patch.mjs'

const installedCliRoot = new URL('../../node_modules/@expo/cli/', import.meta.url)
const metroRelativePath = 'build/src/start/server/metro/MetroBundlerDevServer.js'
const instantiateRelativePath = 'build/src/start/server/metro/instantiateMetro.js'
const metroOldSnippet = `const parsedOptions = {\n            port: options.port,\n            maxWorkers: options.maxWorkers,\n            resetCache: options.resetDevServer\n        };`
const metroPatchedSnippet = `const parsedOptions = {\n            host: options.location.hostType === 'localhost' ? 'localhost' : undefined,\n            port: options.port,\n            maxWorkers: options.maxWorkers,\n            resetCache: options.resetDevServer\n        };`
const instantiateOldSnippet = `const { server, hmrServer, metro } = await (0, _runServerfork.runServer)(metroBundler, metroConfig, {\n        websocketEndpoints,\n        watch: !isExporting && isWatchEnabled()\n    }, {`
const instantiatePatchedSnippet = `const { server, hmrServer, metro } = await (0, _runServerfork.runServer)(metroBundler, metroConfig, {\n        host: options.host,\n        websocketEndpoints,\n        watch: !isExporting && isWatchEnabled()\n    }, {`

function hash(contents) {
  return createHash('sha256').update(contents, 'utf8').digest('hex')
}

function copyOldRuntimeFixture(sourcePath, targetPath, oldHash, patchedHash, oldSnippet, patchedSnippet) {
  const source = readFileSync(sourcePath, 'utf8')
  const sourceHash = hash(source)
  if (sourceHash === oldHash) {
    writeFileSync(targetPath, source)
    return
  }
  assert.equal(sourceHash, patchedHash, `installed ${sourcePath} must be the known Expo version`)
  writeFileSync(targetPath, source.replace(patchedSnippet, oldSnippet))
}

function makeFixture({ expoVersion = '54.0.35', cliVersion = '54.0.25' } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'rally-expo-localhost-patch-'))
  const expoRoot = join(root, 'node_modules/expo')
  const cliRoot = join(root, 'node_modules/@expo/cli')
  const expoCliPath = join(expoRoot, 'bin/cli.js')

  mkdirSync(dirname(expoCliPath), { recursive: true })
  writeFileSync(expoCliPath, '// fixture Expo CLI\n')
  writeFileSync(join(expoRoot, 'package.json'), JSON.stringify({ name: 'expo', version: expoVersion }))
  mkdirSync(cliRoot, { recursive: true })
  writeFileSync(join(cliRoot, 'package.json'), JSON.stringify({ name: '@expo/cli', version: cliVersion }))
  mkdirSync(dirname(join(cliRoot, metroRelativePath)), { recursive: true })
  copyOldRuntimeFixture(
    new URL(metroRelativePath, installedCliRoot),
    join(cliRoot, metroRelativePath),
    'aab5b451eebbcce2988c777d099905900c44f0e30b8759ac736c77baf437d0f0',
    'c50198e31315be8286e93c24b6d5bd3a2d37635414901c35f3756107f4065850',
    metroOldSnippet,
    metroPatchedSnippet,
  )
  mkdirSync(dirname(join(cliRoot, instantiateRelativePath)), { recursive: true })
  copyOldRuntimeFixture(
    new URL(instantiateRelativePath, installedCliRoot),
    join(cliRoot, instantiateRelativePath),
    'df778c58a8fad6d62f5cf74689d5f1b6286087bbc68071f3cca253aeafd56460',
    'e73202f835cb37138fb779c068b91845b93469a4fb0a38f8c57128b2f3fe09d5',
    instantiateOldSnippet,
    instantiatePatchedSnippet,
  )

  return {
    root,
    expoCliPath,
    metroPath: join(cliRoot, metroRelativePath),
    instantiatePath: join(cliRoot, instantiateRelativePath),
  }
}

function withFixture(run, options) {
  const fixture = makeFixture(options)
  try {
    return run(fixture)
  } finally {
    rmSync(fixture.root, { force: true, recursive: true })
  }
}

function contents(paths) {
  return paths.map((filePath) => readFileSync(filePath, 'utf8'))
}

test('apply changes both real fixture files together, then verify is idempotent', () => withFixture((fixture) => {
  assert.equal(inspect({ expoCliPath: fixture.expoCliPath }).state, 'old')

  const applied = apply({ expoCliPath: fixture.expoCliPath })
  assert.equal(applied.state, 'patched')
  assert.equal(verify({ expoCliPath: fixture.expoCliPath }).state, 'patched')
  assert.match(readFileSync(fixture.metroPath, 'utf8'), /host: options\.location\.hostType === 'localhost' \? 'localhost' : undefined/)
  assert.match(readFileSync(fixture.instantiatePath, 'utf8'), /host: options\.host,/)

  const beforeSecondApply = contents([fixture.metroPath, fixture.instantiatePath])
  assert.equal(apply({ expoCliPath: fixture.expoCliPath }).state, 'patched')
  assert.deepEqual(contents([fixture.metroPath, fixture.instantiatePath]), beforeSecondApply)
}))

test('rejects unsupported Expo or CLI versions before writing either fixture file', () => {
  for (const options of [{ expoVersion: '54.0.34' }, { cliVersion: '54.0.24' }]) {
    withFixture((fixture) => {
      const before = contents([fixture.metroPath, fixture.instantiatePath])
      assert.throws(() => apply({ expoCliPath: fixture.expoCliPath }), /version/i)
      assert.deepEqual(contents([fixture.metroPath, fixture.instantiatePath]), before)
    }, options)
  }
})

test('rejects a wrong hash or changed expected snippet without writing either file', () => {
  for (const mutate of [
    (contents) => `${contents}\n// unexpected change\n`,
    (contents) => contents.replace('port: options.port,', 'port: options.rewrittenPort,'),
  ]) {
    withFixture((fixture) => {
      const before = contents([fixture.metroPath, fixture.instantiatePath])
      const mutatedMetro = mutate(before[0])
      writeFileSync(fixture.metroPath, mutatedMetro)
      assert.throws(() => apply({ expoCliPath: fixture.expoCliPath }), /(hash|snippet)/i)
      assert.equal(readFileSync(fixture.metroPath, 'utf8'), mutatedMetro)
      assert.equal(readFileSync(fixture.instantiatePath, 'utf8'), before[1])
    })
  }
})

test('rejects duplicate patch markers without writing either file', () => withFixture((fixture) => {
  const before = contents([fixture.metroPath, fixture.instantiatePath])
  writeFileSync(fixture.metroPath, before[0].replace(metroOldSnippet, `${metroOldSnippet}\n${metroPatchedSnippet}`))
  assert.throws(() => apply({ expoCliPath: fixture.expoCliPath }), /duplicate|snippet|hash/i)
  assert.equal(readFileSync(fixture.instantiatePath, 'utf8'), before[1])
}))

test('rejects a mixed old and patched pair without writing either file', () => withFixture((fixture) => {
  const before = contents([fixture.metroPath, fixture.instantiatePath])
  writeFileSync(fixture.metroPath, before[0].replace(metroOldSnippet, metroPatchedSnippet))
  assert.throws(() => apply({ expoCliPath: fixture.expoCliPath }), /mixed/i)
  assert.equal(readFileSync(fixture.metroPath, 'utf8'), before[0].replace(metroOldSnippet, metroPatchedSnippet))
  assert.equal(readFileSync(fixture.instantiatePath, 'utf8'), before[1])
}))

test('rejects missing runtime files without writing the surviving file', () => withFixture((fixture) => {
  const beforeMetro = readFileSync(fixture.metroPath, 'utf8')
  unlinkSync(fixture.instantiatePath)
  assert.throws(() => apply({ expoCliPath: fixture.expoCliPath }), /missing|runtime/i)
  assert.equal(readFileSync(fixture.metroPath, 'utf8'), beforeMetro)
}))

test('rejects runtime path escapes without reading or writing the escaped file', () => withFixture((fixture) => {
  const escapedPath = join(fixture.root, 'escaped-MetroBundlerDevServer.js')
  writeFileSync(escapedPath, readFileSync(fixture.metroPath, 'utf8'))
  unlinkSync(fixture.metroPath)
  symlinkSync(escapedPath, fixture.metroPath)

  assert.throws(() => apply({ expoCliPath: fixture.expoCliPath }), /escape|inside/i)
  assert.equal(lstatSync(fixture.metroPath).isSymbolicLink(), true)
  assert.equal(hash(readFileSync(escapedPath, 'utf8')), 'aab5b451eebbcce2988c777d099905900c44f0e30b8759ac736c77baf437d0f0')
}))
