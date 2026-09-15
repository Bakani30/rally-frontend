import { describe, expect, it } from 'vitest'

import { EdgeFunctionError } from '@/lib/supabase/edgeError'
import { isQuestStartRetryable, questErrorMessageTH } from './questProofErrors'

describe('questErrorMessageTH', () => {
  it('maps internal_error to the Thai transient-server message', () => {
    const error = new EdgeFunctionError('Internal server error', { code: 'internal_error', status: 500 })
    expect(questErrorMessageTH(error)).toBe('เซิร์ฟเวอร์ขัดข้องชั่วคราว ลองใหม่อีกครั้ง')
  })

  it('maps attempts_exhausted to the daily-limit message', () => {
    const error = new EdgeFunctionError('attempts_exhausted', { code: 'attempts_exhausted', status: 409 })
    expect(questErrorMessageTH(error)).toBe('วันนี้ทำเควสนี้ครบแล้ว')
  })

  it('maps invalid media and missing watermark native module errors', () => {
    expect(questErrorMessageTH(new EdgeFunctionError('media_invalid', { code: 'media_invalid', status: 400 })))
      .toBe('ไฟล์วิดีโอเสียหรือรูปแบบไม่รองรับ ลองอัดใหม่')
    expect(questErrorMessageTH(new EdgeFunctionError('watermark_native_module_unavailable', {
      code: 'watermark_native_module_unavailable',
      status: 400,
    }))).toBe('ต้องใช้แอป build ใหม่เพื่อใส่ลายน้ำวิดีโอ')
    expect(questErrorMessageTH(new EdgeFunctionError('quest_media_persist_failed', {
      code: 'quest_media_persist_failed',
    }))).toBe('จัดเก็บไฟล์วิดีโอไม่สำเร็จ ลองอัดใหม่')
  })
})

describe('isQuestStartRetryable', () => {
  it('retries edge 5xx (internal_error)', () => {
    const error = new EdgeFunctionError('Internal server error', { code: 'internal_error', status: 500 })
    expect(isQuestStartRetryable(error)).toBe(true)
  })

  it('retries network send failures (FunctionsFetchError)', () => {
    const error = new Error('Failed to send a request to the Edge Function')
    error.name = 'FunctionsFetchError'
    expect(isQuestStartRetryable(error)).toBe(true)
  })

  it('does not retry business rejections (4xx)', () => {
    const error = new EdgeFunctionError('attempts_exhausted', { code: 'attempts_exhausted', status: 409 })
    expect(isQuestStartRetryable(error)).toBe(false)
  })

  it('does not retry unknown plain errors', () => {
    expect(isQuestStartRetryable(new Error('quest-proof/start returned no data'))).toBe(false)
  })
})
