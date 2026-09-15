import { describe, expect, it } from 'vitest'

import {
  RUN_SUBMIT_ERROR_CODES,
  describeRunSubmitError,
  describeRunSubmitErrorWithFallback,
  extractRunSubmitErrorCode,
  getRunSubmitErrorMessage,
  isKnownRunSubmitErrorCode,
} from './runSubmitErrorMessages'

describe('runSubmitErrorMessages map', () => {
  it('covers every enumerated code with Thai title + detail and a retryable verdict', () => {
    expect(RUN_SUBMIT_ERROR_CODES.length).toBeGreaterThan(0)
    for (const code of RUN_SUBMIT_ERROR_CODES) {
      const message = getRunSubmitErrorMessage(code)
      expect(message.title.length, code).toBeGreaterThan(0)
      expect(message.detail.length, code).toBeGreaterThan(0)
      // ทุกข้อความต้องเป็นไทยที่ผู้ใช้อ่านรู้เรื่อง ไม่ใช่ code/อังกฤษดิบ
      expect(message.title, code).toMatch(/[ก-๙]/)
      expect(message.detail, code).toMatch(/[ก-๙]/)
      expect(typeof message.retryable, code).toBe('boolean')
    }
  })

  it('has no duplicate codes in the exported list', () => {
    expect(new Set(RUN_SUBMIT_ERROR_CODES).size).toBe(RUN_SUBMIT_ERROR_CODES.length)
  })

  it('includes the client-visible match-link codes handled ad hoc today', () => {
    expect(RUN_SUBMIT_ERROR_CODES).toContain('coop_min_distance_not_met')
    expect(RUN_SUBMIT_ERROR_CODES).toContain('coop_team_distance_not_met')
  })

  it('includes forward-compat codes for upcoming integrity checks', () => {
    expect(RUN_SUBMIT_ERROR_CODES).toContain('teleport_detected')
    expect(RUN_SUBMIT_ERROR_CODES).toContain('segment_speed_exceeded')
    expect(RUN_SUBMIT_ERROR_CODES).toContain('background_gap_distance_excluded')
    expect(RUN_SUBMIT_ERROR_CODES).toContain('health_import_not_allowed_for_ffa')
  })

  it('tells a runner their session can no longer be submitted', () => {
    expect(RUN_SUBMIT_ERROR_CODES).toContain('activity_session_not_submittable')
    const message = getRunSubmitErrorMessage('activity_session_not_submittable')
    expect(message.retryable).toBe(false)
    // ต้องบอกให้ใช้การวิ่งครั้งใหม่ ไม่ใช่ retry เซสชันเดิม
    expect(`${message.title} ${message.detail}`).toContain('ครั้งใหม่')
  })

  it('tells a runner flagged for vehicle-like pace what happened and what to do', () => {
    const message = getRunSubmitErrorMessage('pace_too_fast')
    expect(message.retryable).toBe(false)
    // ต้องบอกว่าระบบไม่รับผล + แนะนำการกดพักเมื่อโดยสารรถ
    expect(message.detail).toContain('ไม่รับผล')
    expect(`${message.title} ${message.detail}`).toContain('พัก')
  })

  it('keeps the advisory background-gap entry informational (result still recorded)', () => {
    const message = getRunSubmitErrorMessage('background_gap_distance_excluded')
    expect(`${message.title} ${message.detail}`).toContain('บันทึก')
  })

  it('gives the max_retries dead-letter sentinel friendly copy instead of leaking the raw code', () => {
    // `max_retries` is an internal sentinel the retry queue writes when a run
    // exhausts its attempt cap with no server code (genuine network outage). It
    // must NOT surface as the raw-code fallback "(โค้ด max_retries)".
    expect(isKnownRunSubmitErrorCode('max_retries')).toBe(true)
    const message = getRunSubmitErrorMessage('max_retries')
    expect(message.title).toMatch(/[ก-๙]/)
    expect(message.detail).toMatch(/[ก-๙]/)
    expect(`${message.title} ${message.detail}`).not.toContain('max_retries')
  })

  it('falls back honestly for an unknown code, showing the raw code', () => {
    const message = getRunSubmitErrorMessage('mystery_new_code')
    expect(message.title).toMatch(/[ก-๙]/)
    expect(message.detail).toContain('mystery_new_code')
    expect(message.retryable).toBe(true)
  })

  it('identifies known codes', () => {
    expect(isKnownRunSubmitErrorCode('pace_too_fast')).toBe(true)
    expect(isKnownRunSubmitErrorCode('mystery_new_code')).toBe(false)
  })
})

describe('extractRunSubmitErrorCode', () => {
  it('prefers a structured .code property (EdgeFunctionError shape)', () => {
    const err = Object.assign(new Error('Pace is unrealistically fast'), { code: 'pace_too_fast' })
    expect(extractRunSubmitErrorCode(err)).toBe('pace_too_fast')
  })

  it('falls back to scanning the message for a known code token', () => {
    expect(extractRunSubmitErrorCode(new Error('rpc failed: pace_too_slow')))
      .toBe('pace_too_slow')
  })

  it('matches the longest code first when one is a substring of another', () => {
    expect(extractRunSubmitErrorCode(new Error('paused_duration_invalid')))
      .toBe('paused_duration_invalid')
  })

  it('returns an unknown structured code as-is (fallback copy shows it)', () => {
    const err = Object.assign(new Error('boom'), { code: 'brand_new_server_code' })
    expect(extractRunSubmitErrorCode(err)).toBe('brand_new_server_code')
  })

  it('returns null for network-style errors so offline copy stays intact', () => {
    expect(extractRunSubmitErrorCode(new Error('Network request failed'))).toBeNull()
    expect(extractRunSubmitErrorCode(new Error('fetch timeout'))).toBeNull()
    expect(extractRunSubmitErrorCode(null)).toBeNull()
  })
})

describe('describeRunSubmitError (strict — read/verify surfaces)', () => {
  it('formats a known coded error as one Thai sentence (title + detail)', () => {
    const err = Object.assign(new Error('x'), { code: 'distance_too_short' })
    const message = getRunSubmitErrorMessage('distance_too_short')
    expect(describeRunSubmitError(err)).toBe(`${message.title} ${message.detail}`)
  })

  it('returns null for an unknown coded error so the caller keeps its own context', () => {
    // Regression: a data-load PostgrestError (e.g. PGRST116) must not be
    // reworded as a submit rejection by callers like toReadableRunError.
    const err = Object.assign(new Error('x'), { code: 'PGRST116' })
    expect(describeRunSubmitError(err)).toBeNull()
  })

  it('returns null for a brand-new unmapped server code', () => {
    const err = Object.assign(new Error('x'), { code: 'brand_new_server_code' })
    expect(describeRunSubmitError(err)).toBeNull()
  })

  it('returns null when no code is present (caller keeps its own copy)', () => {
    expect(describeRunSubmitError(new Error('Network request failed'))).toBeNull()
    expect(describeRunSubmitError(undefined)).toBeNull()
  })
})

describe('describeRunSubmitErrorWithFallback (lenient — true submit surfaces)', () => {
  it('formats a known coded error as one Thai sentence (title + detail)', () => {
    const err = Object.assign(new Error('x'), { code: 'distance_too_short' })
    const message = getRunSubmitErrorMessage('distance_too_short')
    expect(describeRunSubmitErrorWithFallback(err)).toBe(`${message.title} ${message.detail}`)
  })

  it('still describes an unknown coded error, exposing the raw code', () => {
    const err = Object.assign(new Error('x'), { code: 'brand_new_server_code' })
    expect(describeRunSubmitErrorWithFallback(err)).toContain('brand_new_server_code')
  })

  it('returns null when no code is present (caller keeps its own offline copy)', () => {
    expect(describeRunSubmitErrorWithFallback(new Error('Network request failed'))).toBeNull()
    expect(describeRunSubmitErrorWithFallback(undefined)).toBeNull()
  })
})
