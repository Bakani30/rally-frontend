import * as SQLite from 'expo-sqlite'
import type { GpsPoint } from '../gps/gpsTypes'

/**
 * Local persistence for active GPS tracking. Every downsampled point is
 * written transactionally before being acknowledged to the live store, so
 * a crash, OOM kill, or force-quit cannot lose data.
 *
 * Schema:
 *   sessions       — one row per session (status: active|stopped|uploaded)
 *   session_points — append-only point log keyed by (session_id, sequence)
 *
 * Lifecycle:
 *   1. createSession() at start, yields sessionId UUID (= externalWorkoutId).
 *   2. appendPoint() per downsampled point.
 *   3. markStopped() when user taps stop.
 *   4. service reads via loadSession() and submits.
 *   5. markUploaded() on 200 OK; row stays for one upload cycle in case of
 *      audit, then garbage-collected by purgeUploadedOlderThan().
 *   6. If submit fails, status stays 'stopped' and retryQueue picks it up.
 *      Transient failures bump `attempts`; a permanent rejection (or hitting
 *      the attempt cap) moves the row to the terminal 'failed' status with the
 *      rejection `last_error_code`. 'failed' rows are excluded from the retry
 *      pass (see listPendingUpload / countPendingUpload) so a dead run can
 *      never starve fresh runs; the user recovers them via the sync surface
 *      (manual retry → resetSessionForRetry, or discard → discardSession).
 *
 * IMPORTANT: never delete a row in `stopped` status. The retry queue is
 * the only path back to 'uploaded'. A user-initiated discard is the one
 * sanctioned exception (discardSession), and also clears 'failed' rows.
 *
 * See skills/run-tracking/SKILL.md §Offline & connection-drop recovery.
 */

const DB_NAME = 'rally-run-tracking.db'

export type StoredSessionStatus = 'active' | 'stopped' | 'uploaded' | 'failed'

export type StoredSession = {
  sessionId: string
  matchId: string | null
  challengeId?: string | null
  startedAt: Date
  endedAt: Date | null
  status: StoredSessionStatus
  source: 'gps_live'
  pausedDurationSeconds: number
  integrityFlags: string[]
  attempts: number
  lastErrorCode: string | null
}

export type StoredSessionWithPath = StoredSession & {
  path: GpsPoint[]
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME).then(async (db) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;

        CREATE TABLE IF NOT EXISTS sessions (
          session_id TEXT PRIMARY KEY,
          match_id TEXT,
          challenge_id TEXT,
          started_at INTEGER NOT NULL,
          ended_at INTEGER,
          status TEXT NOT NULL CHECK (status IN ('active', 'stopped', 'uploaded', 'failed')),
          source TEXT NOT NULL DEFAULT 'gps_live',
          paused_duration_seconds INTEGER NOT NULL DEFAULT 0,
          integrity_flags TEXT NOT NULL DEFAULT '[]',
          attempts INTEGER NOT NULL DEFAULT 0,
          last_error_code TEXT
        );

        CREATE INDEX IF NOT EXISTS sessions_status_idx ON sessions(status);

        CREATE TABLE IF NOT EXISTS session_points (
          session_id TEXT NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
          sequence INTEGER NOT NULL,
          lat REAL NOT NULL,
          lng REAL NOT NULL,
          accuracy REAL NOT NULL,
          altitude REAL,
          speed REAL,
          timestamp INTEGER NOT NULL,
          is_paused INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY (session_id, sequence)
        );

        -- Raw samples written by the background TaskManager task. Drained
        -- and processed (hygiene + Kalman + downsample) by the foreground
        -- service when the app re-enters active state, or before stop().
        CREATE TABLE IF NOT EXISTS bg_raw_samples (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
          lat REAL NOT NULL,
          lng REAL NOT NULL,
          accuracy REAL,
          altitude REAL,
          speed REAL,
          timestamp INTEGER NOT NULL,
          mocked INTEGER
        );

        CREATE INDEX IF NOT EXISTS bg_raw_samples_session_idx
          ON bg_raw_samples(session_id, timestamp);
      `)
      await ensureSessionsColumns(db)
      return db
    })
  }
  return dbPromise
}

async function ensureSessionsColumns(db: SQLite.SQLiteDatabase): Promise<void> {
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(sessions)`)
  const names = new Set(columns.map((column) => column.name))
  // Additive columns are safe on existing installs via ALTER TABLE ADD COLUMN.
  if (!names.has('match_id')) {
    await db.execAsync(`ALTER TABLE sessions ADD COLUMN match_id TEXT;`)
  }
  if (!names.has('challenge_id')) {
    await db.execAsync(`ALTER TABLE sessions ADD COLUMN challenge_id TEXT;`)
  }
  if (!names.has('attempts')) {
    await db.execAsync(`ALTER TABLE sessions ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0;`)
  }
  if (!names.has('last_error_code')) {
    await db.execAsync(`ALTER TABLE sessions ADD COLUMN last_error_code TEXT;`)
  }
  await ensureFailedStatusAllowed(db)
}

/**
 * The `status` CHECK constraint cannot be widened with ALTER TABLE in SQLite,
 * so an install created before the 'failed' terminal status would reject any
 * UPDATE to it. Detect that by reading the stored table DDL and, only when
 * needed, rebuild the table (a rare one-shot on upgrade). The sessions table
 * holds at most a handful of rows, so the copy is cheap. Foreign keys are
 * disabled for the swap so dropping the old table does not cascade-delete
 * session_points / bg_raw_samples, which are re-linked by name after rename.
 */
async function ensureFailedStatusAllowed(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ sql: string | null }>(
    `SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'sessions'`,
  )
  if (row?.sql && row.sql.includes("'failed'")) return

  await db.execAsync(`
    PRAGMA foreign_keys = OFF;
    BEGIN;
    CREATE TABLE sessions_rebuild (
      session_id TEXT PRIMARY KEY,
      match_id TEXT,
      challenge_id TEXT,
      started_at INTEGER NOT NULL,
      ended_at INTEGER,
      status TEXT NOT NULL CHECK (status IN ('active', 'stopped', 'uploaded', 'failed')),
      source TEXT NOT NULL DEFAULT 'gps_live',
      paused_duration_seconds INTEGER NOT NULL DEFAULT 0,
      integrity_flags TEXT NOT NULL DEFAULT '[]',
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error_code TEXT
    );
    INSERT INTO sessions_rebuild
      (session_id, match_id, challenge_id, started_at, ended_at, status, source,
       paused_duration_seconds, integrity_flags, attempts, last_error_code)
    SELECT
      session_id, match_id, challenge_id, started_at, ended_at, status, source,
      paused_duration_seconds, integrity_flags, attempts, last_error_code
    FROM sessions;
    DROP TABLE sessions;
    ALTER TABLE sessions_rebuild RENAME TO sessions;
    CREATE INDEX IF NOT EXISTS sessions_status_idx ON sessions(status);
    COMMIT;
    PRAGMA foreign_keys = ON;
  `)
}

/** Create a new session row. Returns the session id (= externalWorkoutId). */
export async function createSession(params: {
  sessionId: string
  matchId?: string | null
  challengeId?: string | null
  startedAt: Date
}): Promise<void> {
  const db = await getDb()
  await db.runAsync(
    `INSERT INTO sessions (session_id, match_id, challenge_id, started_at, status, source)
     VALUES (?, ?, ?, ?, 'active', 'gps_live')`,
    params.sessionId,
    params.matchId ?? null,
    params.challengeId ?? null,
    params.startedAt.getTime(),
  )
}

/** Append a point. Called once per downsampled GPS sample (5s+). */
export async function appendPoint(
  sessionId: string,
  sequence: number,
  point: GpsPoint,
): Promise<void> {
  const db = await getDb()
  await db.runAsync(
    `INSERT OR IGNORE INTO session_points
       (session_id, sequence, lat, lng, accuracy, altitude, speed, timestamp, is_paused)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    sessionId,
    sequence,
    point.lat,
    point.lng,
    point.accuracy,
    point.altitude ?? null,
    point.speed ?? null,
    point.timestamp,
    point.isPaused ? 1 : 0,
  )
}

/** Mark session stopped. Called when user taps stop and before submit. */
export async function markStopped(params: {
  sessionId: string
  endedAt: Date
  pausedDurationSeconds: number
  integrityFlags: string[]
}): Promise<void> {
  const db = await getDb()
  await db.runAsync(
    `UPDATE sessions
        SET ended_at = ?, status = 'stopped',
            paused_duration_seconds = ?, integrity_flags = ?
      WHERE session_id = ? AND status = 'active'`,
    params.endedAt.getTime(),
    params.pausedDurationSeconds,
    JSON.stringify(params.integrityFlags),
    params.sessionId,
  )
}

/** Re-open a stopped session when the user continues after a failed submit. */
export async function markActive(sessionId: string): Promise<void> {
  const db = await getDb()
  await db.runAsync(
    `UPDATE sessions
        SET ended_at = NULL, status = 'active'
      WHERE session_id = ? AND status = 'stopped'`,
    sessionId,
  )
}

/** Promote stopped → uploaded after server confirms 200. */
export async function markUploaded(sessionId: string): Promise<void> {
  const db = await getDb()
  await db.runAsync(
    `UPDATE sessions SET status = 'uploaded' WHERE session_id = ?`,
    sessionId,
  )
}

/**
 * Record one more failed retry attempt (transient failure). Persists the
 * latest rejection code so the sync surface can explain a run that later hits
 * the dead-letter cap. Only touches rows still awaiting upload.
 */
export async function incrementSessionAttempt(
  sessionId: string,
  lastErrorCode: string | null,
): Promise<void> {
  const db = await getDb()
  await db.runAsync(
    `UPDATE sessions
        SET attempts = attempts + 1, last_error_code = ?
      WHERE session_id = ? AND status = 'stopped'`,
    lastErrorCode,
    sessionId,
  )
}

/**
 * Dead-letter a stopped run to the terminal 'failed' status with the rejection
 * code. Failed rows are excluded from the retry pass so they cannot starve
 * fresh runs; the user recovers them via resetSessionForRetry or discardSession.
 */
export async function markFailed(sessionId: string, lastErrorCode: string): Promise<void> {
  const db = await getDb()
  await db.runAsync(
    `UPDATE sessions
        SET status = 'failed', last_error_code = ?
      WHERE session_id = ? AND status = 'stopped'`,
    lastErrorCode,
    sessionId,
  )
}

/**
 * Manual retry from the sync surface: return a dead-lettered run to the pending
 * pool with a clean attempt counter so the next retry pass tries it again.
 */
export async function resetSessionForRetry(sessionId: string): Promise<void> {
  const db = await getDb()
  await db.runAsync(
    `UPDATE sessions
        SET status = 'stopped', attempts = 0, last_error_code = NULL
      WHERE session_id = ? AND status = 'failed'`,
    sessionId,
  )
}

/**
 * List dead-lettered runs (terminal 'failed'), newest first, with their path so
 * a caller can derive display distance. Kept separate from listPendingUpload so
 * the retry pass never touches these.
 */
export async function listFailedSessions(): Promise<StoredSessionWithPath[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<SessionRow>(
    `SELECT * FROM sessions WHERE status = 'failed' ORDER BY started_at DESC`,
  )
  const sessions: StoredSessionWithPath[] = []
  for (const row of rows) {
    const points = await db.getAllAsync<{
      lat: number
      lng: number
      accuracy: number
      altitude: number | null
      speed: number | null
      timestamp: number
      is_paused: number
    }>(
      `SELECT lat, lng, accuracy, altitude, speed, timestamp, is_paused
         FROM session_points WHERE session_id = ? ORDER BY sequence ASC`,
      row.session_id,
    )
    sessions.push({
      ...rowToStoredSession(row),
      path: points.map((p) => ({
        lat: p.lat,
        lng: p.lng,
        accuracy: p.accuracy,
        altitude: p.altitude ?? undefined,
        speed: p.speed ?? undefined,
        timestamp: p.timestamp,
        isPaused: p.is_paused === 1,
      })),
    })
  }
  return sessions
}

/** Discard a locally active interrupted session that can never be submitted. */
export async function discardActiveSession(sessionId: string): Promise<void> {
  const db = await getDb()
  const active = await db.getFirstAsync<{ session_id: string }>(
    `SELECT session_id FROM sessions WHERE session_id = ? AND status = 'active'`,
    sessionId,
  )
  if (!active) return

  await db.runAsync(`DELETE FROM bg_raw_samples WHERE session_id = ?`, sessionId)
  await db.runAsync(`DELETE FROM session_points WHERE session_id = ?`, sessionId)
  await db.runAsync(
    `DELETE FROM sessions WHERE session_id = ? AND status = 'active'`,
    sessionId,
  )
}

/**
 * Explicit user discard: delete a not-yet-uploaded session (row + points + bg
 * samples). Unlike `discardActiveSession`, this also removes 'stopped' and
 * terminal 'failed' rows — the ONE sanctioned exception to the "never delete a
 * stopped row" rule above, used when the user explicitly abandons a run (or a
 * dead-lettered run) so the retry queue can never auto-submit it. Uploaded rows
 * are audit history and are left intact.
 */
export async function discardSession(sessionId: string): Promise<void> {
  const db = await getDb()
  const row = await db.getFirstAsync<{ status: StoredSessionStatus }>(
    `SELECT status FROM sessions WHERE session_id = ?`,
    sessionId,
  )
  if (!row || (row.status !== 'active' && row.status !== 'stopped' && row.status !== 'failed')) {
    return
  }

  await db.runAsync(`DELETE FROM bg_raw_samples WHERE session_id = ?`, sessionId)
  await db.runAsync(`DELETE FROM session_points WHERE session_id = ?`, sessionId)
  await db.runAsync(
    `DELETE FROM sessions WHERE session_id = ? AND status IN ('active', 'stopped', 'failed')`,
    sessionId,
  )
}

/** Read session metadata + full path for upload. */
export async function loadSession(sessionId: string): Promise<StoredSessionWithPath | null> {
  const db = await getDb()
  const session = await db.getFirstAsync<SessionRow>(
    `SELECT * FROM sessions WHERE session_id = ?`,
    sessionId,
  )
  if (!session) return null

  const points = await db.getAllAsync<{
    sequence: number
    lat: number
    lng: number
    accuracy: number
    altitude: number | null
    speed: number | null
    timestamp: number
    is_paused: number
  }>(
    `SELECT sequence, lat, lng, accuracy, altitude, speed, timestamp, is_paused
       FROM session_points WHERE session_id = ? ORDER BY sequence ASC`,
    sessionId,
  )

  return {
    ...rowToStoredSession(session),
    path: points.map((p) => ({
      lat: p.lat,
      lng: p.lng,
      accuracy: p.accuracy,
      altitude: p.altitude ?? undefined,
      speed: p.speed ?? undefined,
      timestamp: p.timestamp,
      isPaused: p.is_paused === 1,
    })),
  }
}

/**
 * Append a raw (un-hygiened) sample collected by the background TaskManager.
 * The foreground service drains and re-processes these on resume.
 */
export async function appendBgRawSample(params: {
  sessionId: string
  lat: number
  lng: number
  accuracy: number | null
  altitude: number | null
  speed: number | null
  timestamp: number
  mocked: boolean | null
}): Promise<void> {
  const db = await getDb()
  await db.runAsync(
    `INSERT INTO bg_raw_samples
       (session_id, lat, lng, accuracy, altitude, speed, timestamp, mocked)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    params.sessionId,
    params.lat,
    params.lng,
    params.accuracy,
    params.altitude,
    params.speed,
    params.timestamp,
    params.mocked === null ? null : params.mocked ? 1 : 0,
  )
}

export type BgRawSample = {
  lat: number
  lng: number
  accuracy: number | null
  altitude: number | null
  speed: number | null
  timestamp: number
  mocked: boolean | null
}

/**
 * Read and atomically delete all background raw samples for a session,
 * ordered by timestamp ascending. Caller pushes them through the hygiene
 * pipeline; once returned they are gone from sqlite.
 */
export async function drainBgRawSamples(sessionId: string): Promise<BgRawSample[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<{
    id: number
    lat: number
    lng: number
    accuracy: number | null
    altitude: number | null
    speed: number | null
    timestamp: number
    mocked: number | null
  }>(
    `SELECT id, lat, lng, accuracy, altitude, speed, timestamp, mocked
       FROM bg_raw_samples WHERE session_id = ? ORDER BY timestamp ASC`,
    sessionId,
  )
  if (rows.length === 0) return []
  await db.runAsync(`DELETE FROM bg_raw_samples WHERE session_id = ?`, sessionId)
  return rows.map((r) => ({
    lat: r.lat,
    lng: r.lng,
    accuracy: r.accuracy,
    altitude: r.altitude,
    speed: r.speed,
    timestamp: r.timestamp,
    mocked: r.mocked === null ? null : r.mocked === 1,
  }))
}

/**
 * Returns the active session id (status='active'), or null. Newest wins:
 * `ORDER BY started_at DESC` is defense-in-depth so a stale 'active' row that
 * somehow survived (e.g. a crash mid-cancel) can never hijack the background
 * task's sample attribution away from the current run.
 */
export async function getActiveSessionId(): Promise<string | null> {
  const db = await getDb()
  const row = await db.getFirstAsync<{ session_id: string }>(
    `SELECT session_id FROM sessions WHERE status = 'active' ORDER BY started_at DESC LIMIT 1`,
  )
  return row?.session_id ?? null
}

/** List active sessions that survived a process restart. Oldest first. */
export async function listActiveSessions(): Promise<StoredSession[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<SessionRow>(
    `SELECT * FROM sessions WHERE status = 'active' ORDER BY started_at ASC`,
  )
  return rows.map(rowToStoredSession)
}

/** Count stopped sessions awaiting upload. */
export async function countPendingUpload(): Promise<number> {
  const db = await getDb()
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM sessions WHERE status = 'stopped'`,
  )
  return row?.count ?? 0
}

/**
 * List stopped sessions awaiting upload (oldest first). `excludeSessionId`
 * omits the caller's in-memory current session so a run still sitting on the
 * post-stop summary is not auto-uploaded out from under the user by a retry
 * pass before they decide to submit or discard it.
 */
export async function listPendingUpload(
  limit?: number,
  excludeSessionId?: string | null,
): Promise<StoredSession[]> {
  const db = await getDb()
  const boundedLimit =
    typeof limit === 'number' && Number.isFinite(limit)
      ? Math.max(0, Math.floor(limit))
      : null
  const excludeClause = excludeSessionId ? ` AND session_id != ?` : ''
  const sql = `SELECT * FROM sessions WHERE status = 'stopped'${excludeClause} ORDER BY started_at ASC`
  const params: (string | number)[] = []
  if (excludeSessionId) params.push(excludeSessionId)
  if (boundedLimit !== null) params.push(boundedLimit)
  const rows = await db.getAllAsync<SessionRow>(
    boundedLimit === null ? sql : `${sql} LIMIT ?`,
    ...params,
  )
  return rows.map(rowToStoredSession)
}

/**
 * Garbage collect uploaded sessions older than `olderThanDays`. Runs lazily
 * — caller decides when (e.g. on app boot, no cron).
 */
export async function purgeUploadedOlderThan(olderThanDays: number): Promise<number> {
  const cutoffMs = Date.now() - olderThanDays * 24 * 60 * 60 * 1000
  const db = await getDb()
  const result = await db.runAsync(
    `DELETE FROM sessions WHERE status = 'uploaded' AND started_at < ?`,
    cutoffMs,
  )
  return result.changes
}

type SessionRow = {
  session_id: string
  match_id: string | null
  challenge_id: string | null
  started_at: number
  ended_at: number | null
  status: StoredSessionStatus
  source: 'gps_live'
  paused_duration_seconds: number
  integrity_flags: string
  attempts: number
  last_error_code: string | null
}

function rowToStoredSession(row: SessionRow): StoredSession {
  return {
    sessionId: row.session_id,
    matchId: row.match_id,
    challengeId: row.challenge_id,
    startedAt: new Date(row.started_at),
    endedAt: row.ended_at ? new Date(row.ended_at) : null,
    status: row.status,
    source: row.source,
    pausedDurationSeconds: row.paused_duration_seconds,
    integrityFlags: safeJsonArray(row.integrity_flags),
    attempts: row.attempts ?? 0,
    lastErrorCode: row.last_error_code ?? null,
  }
}

function safeJsonArray(s: string): string[] {
  try {
    const parsed = JSON.parse(s)
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}
