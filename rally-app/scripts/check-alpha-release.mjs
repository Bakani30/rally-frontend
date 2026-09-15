#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = path.resolve(appDir, '..')

export function validateStaticTarget({ appConfig, easConfig, target, gitStatus, isBaseAncestor, mode = 'update' }) {
  const failures = []
  const expo = appConfig?.expo ?? {}
  const alpha = easConfig?.build?.alpha ?? {}

  if (expo.version !== target.appVersion) {
    failures.push(`app.json version ${expo.version ?? '<missing>'} != target ${target.appVersion}`)
  }
  if (expo.runtimeVersion?.policy !== 'appVersion') {
    failures.push('runtimeVersion.policy must be appVersion')
  }
  if (alpha.channel !== target.channel) {
    failures.push(`eas alpha channel ${alpha.channel ?? '<missing>'} != target ${target.channel}`)
  }
  if (alpha.environment !== target.environment) {
    failures.push(`eas alpha environment ${alpha.environment ?? '<missing>'} != target ${target.environment}`)
  }
  if (alpha.env?.EXPO_PUBLIC_ENABLE_RUNNING_GPS !== 'true') {
    failures.push('eas alpha must set EXPO_PUBLIC_ENABLE_RUNNING_GPS=true')
  }
  if (gitStatus.trim() !== '') {
    failures.push('release checkout is dirty; commit the exact reviewed release before publishing')
  }
  if (!isBaseAncestor(target.baseGitCommit)) {
    failures.push(`release HEAD is not descended from Alpha baseline ${target.baseGitCommit}`)
  }
  if (mode === 'update') {
    for (const platform of ['ios', 'android']) {
      if (!target.builds?.[platform]?.id) {
        failures.push(`missing ${platform} Alpha build id for runtime ${target.runtimeVersion}`)
      }
    }
  }
  return failures
}

export function validateBuildRecord({ record, expected, target, isBuildAncestor }) {
  const failures = []
  if (!record) return ['EAS build record is missing']
  const expectedFields = {
    platform: expected.platform,
    channel: target.channel,
    runtimeVersion: target.runtimeVersion,
    appVersion: target.appVersion,
    appBuildVersion: expected.appBuildVersion,
  }
  for (const [field, expectedValue] of Object.entries(expectedFields)) {
    if (String(record[field] ?? '') !== String(expectedValue ?? '')) {
      failures.push(`${expected.platform} build ${field} ${record[field] ?? '<missing>'} != ${expectedValue ?? '<missing>'}`)
    }
  }
  if (record.gitCommitHash && !isBuildAncestor(record.gitCommitHash)) {
    failures.push(`${expected.platform} build commit is not an ancestor of this release checkout`)
  }
  return failures
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'))
}

function git(args) {
  const result = spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8' })
  if (result.status !== 0) throw new Error(result.stderr.trim() || `git ${args.join(' ')} failed`)
  return result.stdout.trim()
}

function isAncestor(ancestor, descendant) {
  return spawnSync('git', ['merge-base', '--is-ancestor', ancestor, descendant], { cwd: repoRoot }).status === 0
}

function readEasBuild(buildId) {
  const result = spawnSync(
    'npx',
    ['--yes', 'eas-cli@latest', 'build:view', buildId, '--json'],
    { cwd: appDir, encoding: 'utf8' },
  )
  if (result.status !== 0) throw new Error(result.stderr.trim() || `could not read EAS build ${buildId}`)
  const start = result.stdout.indexOf('{')
  if (start < 0) throw new Error(`EAS build ${buildId} did not return JSON`)
  return JSON.parse(result.stdout.slice(start))
}

function main() {
  const modeFlagIndex = process.argv.indexOf('--mode')
  const mode = modeFlagIndex >= 0
    ? process.argv[modeFlagIndex + 1]
    : process.argv.find((arg) => arg.startsWith('--mode='))?.split('=')[1] ?? 'update'
  if (!['prebuild', 'update'].includes(mode)) throw new Error(`unsupported mode: ${mode}`)

  const target = readJson(path.join(appDir, 'release/alpha-target.json'))
  const appConfig = readJson(path.join(appDir, 'app.json'))
  const easConfig = readJson(path.join(appDir, 'eas.json'))
  const head = git(['rev-parse', 'HEAD'])
  const failures = validateStaticTarget({
    appConfig,
    easConfig,
    target,
    gitStatus: git(['status', '--porcelain=v1', '--untracked-files=all']),
    isBaseAncestor: (sha) => isAncestor(sha, head),
    mode,
  })

  if (mode === 'update' && failures.length === 0) {
    for (const platform of ['ios', 'android']) {
      const expected = target.builds[platform]
      try {
        failures.push(...validateBuildRecord({
          record: readEasBuild(expected.id),
          expected,
          target,
          isBuildAncestor: (sha) => isAncestor(sha, head),
        }))
      } catch (error) {
        failures.push(error instanceof Error ? error.message : String(error))
      }
    }
  }

  if (failures.length > 0) {
    for (const failure of failures) console.error(`[alpha-release] ❌ ${failure}`)
    process.exit(1)
  }
  console.log(`[alpha-release] ✅ ${mode} target matches channel=${target.channel}, runtime=${target.runtimeVersion}, app=${target.appVersion}`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
