import { describe, expect, it } from 'vitest'

import { getWeekWindow, overlapsWeek } from './weekWindow'

const BANGKOK = 'Asia/Bangkok'

describe('getWeekWindow', () => {
  it('returns Monday 00:00 Bangkok through next Monday 00:00 (exclusive)', () => {
    // Friday 2026-07-17 12:00 Bangkok (UTC+7) = 05:00Z
    const now = Date.parse('2026-07-17T05:00:00Z')
    const week = getWeekWindow(now, BANGKOK)
    // Monday 2026-07-13 00:00 Bangkok = 2026-07-12T17:00Z
    expect(new Date(week.startMs).toISOString()).toBe('2026-07-12T17:00:00.000Z')
    expect(new Date(week.endMs).toISOString()).toBe('2026-07-19T17:00:00.000Z')
  })

  it('keeps a Monday inside its own week', () => {
    // Monday 2026-07-13 00:30 Bangkok
    const now = Date.parse('2026-07-12T17:30:00Z')
    const week = getWeekWindow(now, BANGKOK)
    expect(new Date(week.startMs).toISOString()).toBe('2026-07-12T17:00:00.000Z')
  })

  it('assigns a Sunday-night instant to the week that started six days earlier', () => {
    // Sunday 2026-07-19 23:59 Bangkok
    const now = Date.parse('2026-07-19T16:59:00Z')
    const week = getWeekWindow(now, BANGKOK)
    expect(new Date(week.startMs).toISOString()).toBe('2026-07-12T17:00:00.000Z')
    expect(now).toBeLessThan(week.endMs)
  })

  it('handles a UTC instant that is already the next local day in Bangkok', () => {
    // Sunday 2026-07-12 20:00Z = Monday 2026-07-13 03:00 Bangkok
    const now = Date.parse('2026-07-12T20:00:00Z')
    const week = getWeekWindow(now, BANGKOK)
    expect(new Date(week.startMs).toISOString()).toBe('2026-07-12T17:00:00.000Z')
  })

  it('spans exactly seven days', () => {
    const week = getWeekWindow(Date.parse('2026-07-17T05:00:00Z'), BANGKOK)
    expect(week.endMs - week.startMs).toBe(7 * 24 * 3600 * 1000)
  })
})

describe('overlapsWeek', () => {
  const week = getWeekWindow(Date.parse('2026-07-17T05:00:00Z'), BANGKOK)

  it('includes an event fully inside the week', () => {
    expect(overlapsWeek(
      Date.parse('2026-07-15T00:00:00Z'),
      Date.parse('2026-07-16T00:00:00Z'),
      week,
    )).toBe(true)
  })

  it('includes an event straddling the week start', () => {
    expect(overlapsWeek(
      Date.parse('2026-07-01T00:00:00Z'),
      Date.parse('2026-07-14T00:00:00Z'),
      week,
    )).toBe(true)
  })

  it('excludes an event that ended before the week', () => {
    expect(overlapsWeek(
      Date.parse('2026-07-01T00:00:00Z'),
      Date.parse('2026-07-10T00:00:00Z'),
      week,
    )).toBe(false)
  })

  it('excludes an event starting at or after the exclusive week end', () => {
    expect(overlapsWeek(week.endMs, week.endMs + 1000, week)).toBe(false)
  })

  it('rejects non-finite inputs', () => {
    expect(overlapsWeek(NaN, Date.parse('2026-07-16T00:00:00Z'), week)).toBe(false)
  })
})
