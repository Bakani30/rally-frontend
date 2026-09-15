import { describe, expect, it } from 'vitest'
import { EdgeFunctionError } from '@/lib/supabase/edgeError'
import {
  ARENA_SESSION_ERROR_CODES,
  presentArenaSessionError,
} from './arenaSessionError'

describe('presentArenaSessionError', () => {
  it('covers every approved stable Arena error code with recovery intent', () => {
    expect(ARENA_SESSION_ERROR_CODES).toHaveLength(16)
    const recoveryIntents = new Set<string>()

    for (const locale of ['th', 'en'] as const) {
      for (const code of ARENA_SESSION_ERROR_CODES) {
        const presentation = presentArenaSessionError(new EdgeFunctionError('raw server text', { code }), locale)

        expect(presentation.code).toBe(code)
        expect(presentation.title).not.toBe('')
        expect(presentation.message).not.toBe('')
        expect(['inline', 'refresh', 'retry', 'decision', 'back_to_arena']).toContain(presentation.recoveryIntent)
        recoveryIntents.add(presentation.recoveryIntent)
      }
    }

    expect(recoveryIntents).toEqual(new Set(['inline', 'refresh', 'retry', 'decision', 'back_to_arena']))
  })

  it('extracts codes from common Edge error envelopes without trusting raw text', () => {
    expect(presentArenaSessionError({ error: { code: 'arena_queue_version_conflict' } }, 'en').code)
      .toBe('arena_queue_version_conflict')
    expect(presentArenaSessionError({ data: { error: { code: 'arena_session_draining' } } }, 'th').code)
      .toBe('arena_session_draining')
  })

  it('uses private generic copy for unknown errors and redacts raw SQL or messages', () => {
    const rawSql = 'SQLSTATE 23505: insert into arena_rounds; RPC failed: secret details'
    const presentation = presentArenaSessionError(new Error(rawSql), 'en')

    expect(presentation).toEqual({
      code: 'unknown',
      title: 'That did not work',
      message: 'Try again. If it still does not work, return to the arena.',
      recoveryIntent: 'retry',
    })
    expect(JSON.stringify(presentation)).not.toContain(rawSql)
    expect(JSON.stringify(presentation)).not.toContain('SQLSTATE')
    expect(JSON.stringify(presentation)).not.toContain('RPC')
  })

  it('keeps the player copy concise and actionable in both locales', () => {
    expect(presentArenaSessionError({ code: 'arena_presence_out_of_range' }, 'th')).toEqual({
      code: 'arena_presence_out_of_range',
      title: 'อยู่นอกพื้นที่สนาม',
      message: 'ขยับเข้าใกล้สนาม แล้วลองยืนยันตำแหน่งอีกครั้ง',
      recoveryIntent: 'retry',
    })
    expect(presentArenaSessionError({ code: 'network_unavailable' }, 'en')).toEqual({
      code: 'network_unavailable',
      title: 'Connection lost',
      message: 'Check your connection and try again.',
      recoveryIntent: 'retry',
    })
  })

  it('does not treat an unknown code as player-facing copy', () => {
    const presentation = presentArenaSessionError(
      { error: { code: 'drop_table_arena_rounds', message: 'DROP TABLE arena_rounds' } },
      'th',
    )

    expect(presentation.code).toBe('unknown')
    expect(presentation.title).toBe('ทำรายการไม่สำเร็จ')
    expect(presentation.message).toBe('ลองอีกครั้ง หากยังไม่สำเร็จให้กลับไปที่สนาม')
    expect(presentation.message).not.toContain('DROP TABLE')
  })
})
