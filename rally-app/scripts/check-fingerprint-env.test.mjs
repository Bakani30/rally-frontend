import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import {
  classifyNodeModulesDir,
  inspectNodeModulesDir,
  runCheck,
} from './check-fingerprint-env.mjs'

test('classifyNodeModulesDir fails on a symlinked node_modules', () => {
  const verdict = classifyNodeModulesDir({
    exists: true,
    isSymlink: true,
    resolvedPath: '/anywhere',
    workspaceRoot: '/repo',
  })
  assert.deepEqual(verdict, { level: 'fail', reason: 'symlink' })
})

test('classifyNodeModulesDir fails when the dir resolves outside the workspace', () => {
  const verdict = classifyNodeModulesDir({
    exists: true,
    isSymlink: false,
    resolvedPath: '/other-repo/node_modules',
    workspaceRoot: '/repo',
  })
  assert.deepEqual(verdict, { level: 'fail', reason: 'outside_workspace' })
})

test('classifyNodeModulesDir warns when node_modules is missing', () => {
  const verdict = classifyNodeModulesDir({
    exists: false,
    isSymlink: false,
    resolvedPath: '/repo/node_modules',
    workspaceRoot: '/repo',
  })
  assert.deepEqual(verdict, { level: 'warn', reason: 'missing' })
})

test('classifyNodeModulesDir accepts a real in-workspace directory', () => {
  const verdict = classifyNodeModulesDir({
    exists: true,
    isSymlink: false,
    resolvedPath: '/repo/rally-app/node_modules',
    workspaceRoot: '/repo',
  })
  assert.deepEqual(verdict, { level: 'ok', reason: 'ok' })
})

test('inspectNodeModulesDir + runCheck catch the PR #52 worktree-symlink trap end-to-end', () => {
  const base = mkdtempSync(path.join(tmpdir(), 'fp-env-'))
  try {
    // "main checkout" with a real node_modules
    const mainRepo = path.join(base, 'main')
    mkdirSync(path.join(mainRepo, 'node_modules'), { recursive: true })

    // worktree whose root node_modules symlinks to the main checkout —
    // exactly the setup that broke CONFIGURE_EXPO_UPDATES
    const worktree = path.join(base, 'worktree')
    const appDir = path.join(worktree, 'rally-app')
    mkdirSync(path.join(appDir, 'node_modules'), { recursive: true })
    symlinkSync(path.join(mainRepo, 'node_modules'), path.join(worktree, 'node_modules'))

    const { failures, warnings } = runCheck({ workspaceRoot: worktree, appDir })
    assert.equal(failures.length, 1)
    assert.match(failures[0], /symlink/)
    assert.equal(warnings.length, 0)

    // healthy layout passes clean
    rmSync(path.join(worktree, 'node_modules'))
    mkdirSync(path.join(worktree, 'node_modules'))
    const healthy = runCheck({ workspaceRoot: worktree, appDir })
    assert.deepEqual(healthy, { failures: [], warnings: [] })
  } finally {
    rmSync(base, { recursive: true, force: true })
  }
})

test('symlinks INSIDE node_modules stay allowed (expo-router hoist fix)', () => {
  const base = mkdtempSync(path.join(tmpdir(), 'fp-env-inner-'))
  try {
    const workspace = path.join(base, 'repo')
    const appDir = path.join(workspace, 'rally-app')
    mkdirSync(path.join(appDir, 'node_modules', 'expo-router'), { recursive: true })
    mkdirSync(path.join(workspace, 'node_modules'), { recursive: true })
    // root node_modules/expo-router -> rally-app's copy (legit monorepo fix)
    symlinkSync(
      path.join(appDir, 'node_modules', 'expo-router'),
      path.join(workspace, 'node_modules', 'expo-router'),
    )

    const { failures, warnings } = runCheck({ workspaceRoot: workspace, appDir })
    assert.deepEqual({ failures, warnings }, { failures: [], warnings: [] })
  } finally {
    rmSync(base, { recursive: true, force: true })
  }
})
