import { describe, expect, it } from 'vitest'
import { PauseLedger } from './pauseLedger'

// Timestamps are epoch-ms. Detector spans (auto/vehicle) carry the triggering
// GPS sample's ts; manual spans carry wall-clock. Both domains are comparable
// so the ledger can merge them into one union.
const T0 = 1_700_000_000_000

describe('PauseLedger — per-kind open/close', () => {
  it('starts empty: zero total, no open spans, empty snapshot', () => {
    const ledger = new PauseLedger()
    expect(ledger.totalPausedSeconds(T0)).toBe(0)
    expect(ledger.hasOpenSpan('manual')).toBe(false)
    expect(ledger.snapshot()).toEqual([])
  })

  it('counts a single closed span by its own duration', () => {
    const ledger = new PauseLedger()
    ledger.openSpan('manual', T0)
    ledger.closeSpan('manual', T0 + 7_000)
    expect(ledger.totalPausedSeconds(T0 + 999_999)).toBe(7)
    expect(ledger.hasOpenSpan('manual')).toBe(false)
  })

  it('counts an in-progress (open) span up to nowTs', () => {
    const ledger = new PauseLedger()
    ledger.openSpan('auto', T0)
    expect(ledger.hasOpenSpan('auto')).toBe(true)
    expect(ledger.totalPausedSeconds(T0 + 42_000)).toBe(42)
    // Advancing nowTs grows the open span.
    expect(ledger.totalPausedSeconds(T0 + 100_000)).toBe(100)
  })

  it('opening an already-open kind is a no-op (keeps the earlier start)', () => {
    const ledger = new PauseLedger()
    ledger.openSpan('auto', T0)
    ledger.openSpan('auto', T0 + 30_000) // ignored
    expect(ledger.totalPausedSeconds(T0 + 30_000)).toBe(30)
  })

  it('closing a non-open kind is a no-op', () => {
    const ledger = new PauseLedger()
    ledger.closeSpan('vehicle', T0 + 5_000) // nothing open
    expect(ledger.totalPausedSeconds(T0 + 10_000)).toBe(0)
    expect(ledger.snapshot()).toEqual([])
  })

  it('a span that closes before it starts contributes zero, never negative', () => {
    const ledger = new PauseLedger()
    ledger.openSpan('manual', T0 + 5_000)
    ledger.closeSpan('manual', T0) // clock skew: end < start
    expect(ledger.totalPausedSeconds(T0 + 100_000)).toBe(0)
  })
})

describe('PauseLedger — union across kinds (never double-count)', () => {
  it('non-overlapping spans of different kinds sum', () => {
    const ledger = new PauseLedger()
    ledger.openSpan('manual', T0)
    ledger.closeSpan('manual', T0 + 600_000) // 10 min
    ledger.openSpan('auto', T0 + 700_000)
    ledger.closeSpan('auto', T0 + 1_000_000) // 5 min, disjoint
    expect(ledger.totalPausedSeconds(T0 + 2_000_000)).toBe(15 * 60)
  })

  it('an auto span fully inside a vehicle span is counted once', () => {
    const ledger = new PauseLedger()
    ledger.openSpan('vehicle', T0)
    ledger.openSpan('auto', T0 + 10_000)
    ledger.closeSpan('auto', T0 + 20_000)
    ledger.closeSpan('vehicle', T0 + 60_000)
    // Union is just the vehicle span: 60s, not 60 + 10.
    expect(ledger.totalPausedSeconds(T0 + 999_999)).toBe(60)
  })

  it('partially overlapping spans merge into one interval', () => {
    const ledger = new PauseLedger()
    ledger.openSpan('manual', T0)
    ledger.closeSpan('manual', T0 + 40_000)
    ledger.openSpan('auto', T0 + 30_000) // overlaps last 10s
    ledger.closeSpan('auto', T0 + 70_000)
    // Union [T0, T0+70_000] = 70s.
    expect(ledger.totalPausedSeconds(T0 + 999_999)).toBe(70)
  })

  it('an open span merges with earlier closed spans up to nowTs', () => {
    const ledger = new PauseLedger()
    ledger.openSpan('manual', T0)
    ledger.closeSpan('manual', T0 + 20_000)
    ledger.openSpan('auto', T0 + 10_000) // still open, overlaps manual
    // Union [T0, nowTs=T0+50_000] = 50s.
    expect(ledger.totalPausedSeconds(T0 + 50_000)).toBe(50)
  })
})

describe('PauseLedger — isInsidePauseSpan', () => {
  it('is true inside a closed span (inclusive bounds), false outside', () => {
    const ledger = new PauseLedger()
    ledger.openSpan('auto', T0)
    ledger.closeSpan('auto', T0 + 10_000)
    expect(ledger.isInsidePauseSpan(T0 - 1)).toBe(false)
    expect(ledger.isInsidePauseSpan(T0)).toBe(true)
    expect(ledger.isInsidePauseSpan(T0 + 5_000)).toBe(true)
    expect(ledger.isInsidePauseSpan(T0 + 10_000)).toBe(true)
    expect(ledger.isInsidePauseSpan(T0 + 10_001)).toBe(false)
  })

  it('treats an open span as extending forward from its start', () => {
    const ledger = new PauseLedger()
    ledger.openSpan('vehicle', T0)
    expect(ledger.isInsidePauseSpan(T0 - 1)).toBe(false)
    expect(ledger.isInsidePauseSpan(T0)).toBe(true)
    expect(ledger.isInsidePauseSpan(T0 + 10_000_000)).toBe(true)
  })
})

describe('PauseLedger — snapshot', () => {
  it('exposes a serializable copy of all spans', () => {
    const ledger = new PauseLedger()
    ledger.openSpan('manual', T0)
    ledger.closeSpan('manual', T0 + 5_000)
    ledger.openSpan('auto', T0 + 10_000)
    const snap = ledger.snapshot()
    expect(snap).toEqual([
      { kind: 'manual', startTs: T0, endTs: T0 + 5_000 },
      { kind: 'auto', startTs: T0 + 10_000, endTs: null },
    ])
    // Snapshot must be JSON-serializable (no class instances / functions).
    expect(JSON.parse(JSON.stringify(snap))).toEqual(snap)
  })

  it('snapshot is a copy — mutating it does not affect the ledger', () => {
    const ledger = new PauseLedger()
    ledger.openSpan('manual', T0)
    ledger.closeSpan('manual', T0 + 5_000)
    const snap = ledger.snapshot() as { kind: string; startTs: number; endTs: number | null }[]
    snap.push({ kind: 'auto', startTs: 0, endTs: 0 })
    expect(ledger.snapshot()).toHaveLength(1)
  })
})

describe('PauseLedger — closeAll', () => {
  it('closes every open span at the given ts, freezing the total', () => {
    const ledger = new PauseLedger()
    ledger.openSpan('manual', T0)
    ledger.openSpan('auto', T0 + 10_000)
    ledger.closeAll(T0 + 30_000)
    expect(ledger.hasOpenSpan('manual')).toBe(false)
    expect(ledger.hasOpenSpan('auto')).toBe(false)
    // Union [T0, T0+30_000] = 30s, frozen regardless of later nowTs.
    expect(ledger.totalPausedSeconds(T0 + 30_000)).toBe(30)
    expect(ledger.totalPausedSeconds(T0 + 9_999_999)).toBe(30)
  })
})
