import { describe, expect, it } from 'vitest'
import { classifyRetryError } from './classifyRetryError'
import { RunSessionSubmitBlockedError } from '../session/runSessionSubmitRules'

describe('classifyRetryError', () => {
  it('treats a code-less transport/network error as transient', () => {
    expect(classifyRetryError(new Error('Network request failed'))).toEqual({
      kind: 'transient',
    })
    expect(classifyRetryError(undefined)).toEqual({ kind: 'transient' })
    expect(classifyRetryError(null)).toEqual({ kind: 'transient' })
  })

  it('treats internal_error as transient (server may recover on the same payload)', () => {
    expect(classifyRetryError({ code: 'internal_error' })).toEqual({ kind: 'transient' })
  })

  it('treats rate_limited as transient (rate window passes without a payload change)', () => {
    expect(classifyRetryError({ code: 'rate_limited' })).toEqual({ kind: 'transient' })
  })

  it('treats unauthorized as transient (session token refreshes out of band)', () => {
    expect(classifyRetryError({ code: 'unauthorized' })).toEqual({ kind: 'transient' })
  })

  it('dead-letters a genuine validation rejection immediately', () => {
    expect(classifyRetryError({ code: 'path_too_sparse' })).toEqual({
      kind: 'permanent',
      code: 'path_too_sparse',
    })
    expect(classifyRetryError({ code: 'distance_too_short' })).toEqual({
      kind: 'permanent',
      code: 'distance_too_short',
    })
  })

  it('dead-letters retryable-flagged codes whose SAME payload always fails', () => {
    // These carry `retryable: true` in the copy map ("could succeed after an app
    // fix") but retrying the identical payload fails identically forever, so the
    // QUEUE must treat them as permanent — this is the Task 2 review pitfall.
    expect(classifyRetryError({ code: 'hash_mismatch' })).toEqual({
      kind: 'permanent',
      code: 'hash_mismatch',
    })
    expect(classifyRetryError({ code: 'path_too_dense' })).toEqual({
      kind: 'permanent',
      code: 'path_too_dense',
    })
  })

  it('dead-letters a client-side RunSessionSubmitBlockedError immediately (its .code is a permanent rejection)', () => {
    // Regression: a <100m run is rejected by the client precheck, not the
    // server. Before the error carried a `.code`, this was misread as a
    // code-less transient failure and retried until the `max_retries` sentinel.
    expect(classifyRetryError(new RunSessionSubmitBlockedError('distance_too_short'))).toEqual({
      kind: 'permanent',
      code: 'distance_too_short',
    })
  })

  it('extracts a known code embedded in a plain error message', () => {
    expect(classifyRetryError(new Error('RPC failed: distance_too_long'))).toEqual({
      kind: 'permanent',
      code: 'distance_too_long',
    })
  })

  it('retries a present-but-unknown code until the attempt cap rather than dead-lettering on a code it cannot explain', () => {
    expect(classifyRetryError({ code: 'some_brand_new_server_code' })).toEqual({
      kind: 'transient',
    })
  })
})
