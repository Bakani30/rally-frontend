import { describe, expect, it, vi } from 'vitest'
import { createRefetchCoalescer, type CoalescerTimers } from './refetchCoalescer'

function makeFakeTimers() {
  let seq = 0
  let now = 0
  const scheduled = new Map<number, { cb: () => void; at: number }>()
  const timers: CoalescerTimers = {
    setTimeout(cb, ms) {
      const id = ++seq
      scheduled.set(id, { cb, at: now + ms })
      return id
    },
    clearTimeout(handle) {
      scheduled.delete(handle as number)
    },
  }
  function advance(ms: number) {
    now += ms
    for (const [id, task] of [...scheduled]) {
      if (task.at <= now) {
        scheduled.delete(id)
        task.cb()
      }
    }
  }
  return { timers, advance }
}

describe('createRefetchCoalescer', () => {
  it('runs once, windowMs after a single schedule', () => {
    const { timers, advance } = makeFakeTimers()
    const run = vi.fn()
    const c = createRefetchCoalescer(run, 350, timers)

    c.schedule()
    expect(run).not.toHaveBeenCalled() // not synchronous

    advance(349)
    expect(run).not.toHaveBeenCalled() // still inside the window

    advance(1)
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('collapses a burst of schedules into a single run', () => {
    const { timers, advance } = makeFakeTimers()
    const run = vi.fn()
    const c = createRefetchCoalescer(run, 350, timers)

    for (let i = 0; i < 20; i++) c.schedule()
    advance(350)

    expect(run).toHaveBeenCalledTimes(1) // 20 events → 1 refetch
  })

  it('starts a fresh window for a schedule after the previous run fired', () => {
    const { timers, advance } = makeFakeTimers()
    const run = vi.fn()
    const c = createRefetchCoalescer(run, 350, timers)

    c.schedule()
    advance(350)
    expect(run).toHaveBeenCalledTimes(1)

    c.schedule() // a new burst, after the first fired
    advance(350)
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('scheduleLeading() runs immediately when idle', () => {
    const { timers, advance } = makeFakeTimers()
    const run = vi.fn()
    const c = createRefetchCoalescer(run, 350, timers)

    c.scheduleLeading()
    expect(run).toHaveBeenCalledTimes(1) // synchronous fast-path

    advance(1000)
    expect(run).toHaveBeenCalledTimes(1) // no trailing echo without more events
  })

  it('scheduleLeading() burst is bounded to one run per window after the first', () => {
    const { timers, advance } = makeFakeTimers()
    const run = vi.fn()
    const c = createRefetchCoalescer(run, 350, timers)

    // A spoofing client flooding broadcasts: 1 event every 10ms for ~1.05s.
    for (let i = 0; i < 105; i++) {
      c.scheduleLeading()
      advance(10)
    }

    // t=0 immediate, then one per 350ms window close (t=350, 700, 1050).
    expect(run.mock.calls.length).toBeLessThanOrEqual(4)
    expect(run.mock.calls.length).toBeGreaterThanOrEqual(3)
  })

  it('scheduleLeading() during a trailing window collapses into the trailing run', () => {
    const { timers, advance } = makeFakeTimers()
    const run = vi.fn()
    const c = createRefetchCoalescer(run, 350, timers)

    c.schedule()
    c.scheduleLeading() // must NOT bypass the armed window
    expect(run).not.toHaveBeenCalled()

    advance(350)
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('schedule() after a leading run waits for the cooldown, then runs once', () => {
    const { timers, advance } = makeFakeTimers()
    const run = vi.fn()
    const c = createRefetchCoalescer(run, 350, timers)

    c.scheduleLeading()
    expect(run).toHaveBeenCalledTimes(1)

    c.schedule()
    advance(349)
    expect(run).toHaveBeenCalledTimes(1) // still inside the cooldown window

    advance(1)
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('cancel() clears a pending leading follow-up', () => {
    const { timers, advance } = makeFakeTimers()
    const run = vi.fn()
    const c = createRefetchCoalescer(run, 350, timers)

    c.scheduleLeading()
    c.scheduleLeading() // queued for the window close
    c.cancel()
    advance(1000)
    expect(run).toHaveBeenCalledTimes(1) // only the immediate one

    c.scheduleLeading() // usable again after cancel
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('cancel() prevents a pending run', () => {
    const { timers, advance } = makeFakeTimers()
    const run = vi.fn()
    const c = createRefetchCoalescer(run, 350, timers)

    c.schedule()
    c.cancel()
    advance(1000)

    expect(run).not.toHaveBeenCalled()
  })

  it('can be re-scheduled after cancel()', () => {
    const { timers, advance } = makeFakeTimers()
    const run = vi.fn()
    const c = createRefetchCoalescer(run, 350, timers)

    c.schedule()
    c.cancel()
    c.schedule()
    advance(350)

    expect(run).toHaveBeenCalledTimes(1)
  })
})
