/**
 * Single source of truth for run-session pause accounting.
 *
 * A run can be paused three ways — the user tapping pause, the auto-pause
 * detector latching (runner stationary), and the vehicle-motion detector
 * latching (moving at vehicle-class speed). Historically each was folded into
 * pausedDurationSeconds independently, which (a) double-counted overlapping
 * auto+vehicle spans and (b) collapsed to ~0s during a background-backlog drain
 * because the fold used wall-clock at replay time instead of the sample's own
 * timestamp.
 *
 * This ledger fixes both by recording spans and reporting the duration of their
 * *union*:
 *
 *   - Timestamps are epoch-ms. Detector spans (auto/vehicle) are keyed on the
 *     triggering GPS sample's timestamp; manual spans on wall-clock. GPS
 *     timestamps are wall-clock epoch ms too, so the two domains are directly
 *     comparable and can be merged.
 *   - At most one open span per kind. Opening an already-open kind is a no-op;
 *     closing a kind that is not open is a no-op.
 *   - totalPausedSeconds(nowTs) merges all spans (closed + in-progress up to
 *     nowTs) so overlapping pause reasons are never counted twice.
 *
 * Pure module: no React / React Native / Expo / Zustand imports.
 */

export type PauseKind = 'manual' | 'auto' | 'vehicle'

export type PauseSpan = {
  kind: PauseKind
  /** Span start (epoch ms). */
  startTs: number
  /** Span end (epoch ms), or null while the span is still open. */
  endTs: number | null
}

export class PauseLedger {
  private readonly spans: PauseSpan[] = []
  private readonly openByKind = new Map<PauseKind, PauseSpan>()

  /** Open a span for `kind` at `startTs`. No-op if one is already open. */
  openSpan(kind: PauseKind, startTs: number): void {
    if (this.openByKind.has(kind)) return
    const span: PauseSpan = { kind, startTs, endTs: null }
    this.spans.push(span)
    this.openByKind.set(kind, span)
  }

  /** Close the open span for `kind` at `endTs`. No-op if none is open. */
  closeSpan(kind: PauseKind, endTs: number): void {
    const span = this.openByKind.get(kind)
    if (!span) return
    span.endTs = endTs
    this.openByKind.delete(kind)
  }

  /** Close every open span at `endTs` — call on stop() to freeze the total. */
  closeAll(endTs: number): void {
    for (const span of this.openByKind.values()) {
      span.endTs = endTs
    }
    this.openByKind.clear()
  }

  hasOpenSpan(kind: PauseKind): boolean {
    return this.openByKind.has(kind)
  }

  /**
   * Duration of the union of all spans, in whole seconds. Open spans extend to
   * `nowTs`. Overlapping spans (any kind) are merged so time is never
   * double-counted. Spans whose end precedes their start (clock skew) count as
   * zero, never negative.
   */
  totalPausedSeconds(nowTs: number): number {
    if (this.spans.length === 0) return 0

    const intervals = this.spans
      .map((s) => {
        const end = s.endTs ?? nowTs
        return { start: s.startTs, end: Math.max(s.startTs, end) }
      })
      .sort((a, b) => a.start - b.start)

    let totalMs = 0
    let mergedStart = intervals[0].start
    let mergedEnd = intervals[0].end
    for (let i = 1; i < intervals.length; i++) {
      const iv = intervals[i]
      if (iv.start <= mergedEnd) {
        // Overlaps or touches the current merged interval — extend it.
        if (iv.end > mergedEnd) mergedEnd = iv.end
      } else {
        totalMs += mergedEnd - mergedStart
        mergedStart = iv.start
        mergedEnd = iv.end
      }
    }
    totalMs += mergedEnd - mergedStart

    return Math.floor(totalMs / 1000)
  }

  /**
   * True when `ts` falls inside any recorded span. Closed spans are inclusive
   * on both bounds; an open span extends forward from its start unboundedly.
   * Task 4 uses this to exclude drained background samples that land inside a
   * pause span from counting as active movement.
   */
  isInsidePauseSpan(ts: number): boolean {
    for (const span of this.spans) {
      const end = span.endTs ?? Number.POSITIVE_INFINITY
      if (ts >= span.startTs && ts <= end) return true
    }
    return false
  }

  /** Serializable copy of all spans (open spans carry endTs: null). */
  snapshot(): PauseSpan[] {
    return this.spans.map((s) => ({ ...s }))
  }
}
