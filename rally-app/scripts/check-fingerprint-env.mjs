#!/usr/bin/env node
/**
 * Preflight guard for `eas update` / `eas build`: fail fast when the local
 * @expo/fingerprint inputs cannot match what the EAS builder will compute.
 *
 * Incident (2026-07-06, PR #52 follow-up build): a git worktree had its
 * node_modules symlinked to the main checkout to speed up vitest/tsc. The
 * local fingerprint then hashed sources at paths OUTSIDE the project root
 * (diff `{ op: "removed", filePath: "../.." }`) while the EAS builder
 * installs node_modules inside the project — so `runtimeVersion.policy:
 * "fingerprint"` computed e4dfb36a… locally vs 5c444535… on the builder and
 * the build failed in phase CONFIGURE_EXPO_UPDATES with "Runtime version
 * calculated on local machine not equal to runtime version calculated
 * during build". The same mismatch can also strand an OTA on a runtime no
 * build ships.
 *
 * Rule enforced here: the node_modules DIRECTORIES themselves (workspace
 * root + rally-app) must be real directories resolving inside the
 * workspace. Symlinks *inside* node_modules are fine — the monorepo
 * intentionally links root node_modules/expo-router → rally-app's copy.
 *
 * Wired as preupdate:preview / preupdate:alpha. Run manually before any
 * `eas build`:  npm run check:fingerprint-env
 */
import { existsSync, lstatSync, realpathSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Pure verdict for one node_modules directory.
 * exists/isSymlink/resolvedPath come from the fs probe; workspaceRoot must
 * already be realpath'd so containment comparison is apples-to-apples.
 */
export function classifyNodeModulesDir({ exists, isSymlink, resolvedPath, workspaceRoot }) {
  if (!exists) return { level: 'warn', reason: 'missing' }
  if (isSymlink) return { level: 'fail', reason: 'symlink' }
  const rel = path.relative(workspaceRoot, resolvedPath)
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    return { level: 'fail', reason: 'outside_workspace' }
  }
  return { level: 'ok', reason: 'ok' }
}

/** Probe one dir with real fs and classify it. */
export function inspectNodeModulesDir(dir, workspaceRoot) {
  if (!existsSync(dir)) {
    return classifyNodeModulesDir({ exists: false, isSymlink: false, resolvedPath: dir, workspaceRoot })
  }
  const isSymlink = lstatSync(dir).isSymbolicLink()
  return classifyNodeModulesDir({
    exists: true,
    isSymlink,
    resolvedPath: realpathSync(dir),
    workspaceRoot,
  })
}

const MESSAGES = {
  symlink: (label) =>
    `${label} เป็น symlink — fingerprint ที่คำนวณบนเครื่องจะไม่ตรงกับ EAS builder ` +
    '(EAS install ของจริงใน project) ทำให้ build fail ที่ CONFIGURE_EXPO_UPDATES ' +
    'หรือ OTA หลุด runtime. แก้: ลบ symlink แล้วรัน npm install จริงใน checkout นี้',
  outside_workspace: (label) =>
    `${label} resolve ออกไปนอก workspace — fingerprint จะเห็น source คนละชุดกับ EAS builder. ` +
    'แก้: ให้ node_modules เป็นโฟลเดอร์จริงใน workspace (npm install)',
  missing: (label) =>
    `${label} ยังไม่มี — รัน npm install ก่อน ไม่งั้น eas-cli จะ fail แบบอ่านยาก`,
}

export function runCheck({ workspaceRoot, appDir }) {
  // Compare realpath-to-realpath: on macOS tmp/worktree paths, /var/... and
  // /private/var/... are the same dir and must not read as "outside".
  if (existsSync(workspaceRoot)) workspaceRoot = realpathSync(workspaceRoot)
  const targets = [
    { label: `workspace root node_modules (${path.join(workspaceRoot, 'node_modules')})`, dir: path.join(workspaceRoot, 'node_modules') },
    { label: `rally-app node_modules (${path.join(appDir, 'node_modules')})`, dir: path.join(appDir, 'node_modules') },
  ]
  const failures = []
  const warnings = []
  for (const target of targets) {
    const verdict = inspectNodeModulesDir(target.dir, workspaceRoot)
    if (verdict.level === 'fail') failures.push(MESSAGES[verdict.reason](target.label))
    if (verdict.level === 'warn') warnings.push(MESSAGES[verdict.reason](target.label))
  }
  return { failures, warnings }
}

function main() {
  const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const workspaceRoot = realpathSync(path.resolve(appDir, '..'))
  const { failures, warnings } = runCheck({ workspaceRoot, appDir: realpathSync(appDir) })

  for (const warning of warnings) console.warn(`[fingerprint-env] คำเตือน: ${warning}`)
  if (failures.length > 0) {
    for (const failure of failures) console.error(`[fingerprint-env] ❌ ${failure}`)
    console.error('[fingerprint-env] ยกเลิกก่อนยิง EAS — กันซ้ำเคส runtime version mismatch (PR #52 follow-up, 2026-07-06)')
    process.exit(1)
  }
  console.log('[fingerprint-env] ✅ node_modules เป็นของจริงใน workspace — fingerprint ฝั่ง local เชื่อถือได้')
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main()
}
