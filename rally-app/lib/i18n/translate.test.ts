import { describe, expect, it } from 'vitest'

import { translate, type Dictionary } from './translate'

const dictionary = {
  greeting: { th: 'สวัสดี', en: 'Hello' },
  welcome: { th: 'ยินดีต้อนรับ {name}', en: 'Welcome {name}' },
  thaiOnly: { th: 'ไทยเท่านั้น', en: '' },
} satisfies Dictionary

describe('translate', () => {
  it('returns the requested language', () => {
    expect(translate(dictionary, 'greeting', 'en')).toBe('Hello')
    expect(translate(dictionary, 'greeting', 'th')).toBe('สวัสดี')
  })

  it('falls back to Thai when the entry has an empty string', () => {
    expect(translate(dictionary, 'thaiOnly', 'en')).toBe('ไทยเท่านั้น')
  })

  it('falls back to the key when the key is missing', () => {
    const dynamic = dictionary as Dictionary
    expect(translate(dynamic, 'missing-key', 'en')).toBe('missing-key')
  })

  it('interpolates {name} params', () => {
    expect(translate(dictionary, 'welcome', 'en', { name: 'Rally' })).toBe('Welcome Rally')
    expect(translate(dictionary, 'welcome', 'th', { name: 'Rally' })).toBe('ยินดีต้อนรับ Rally')
  })

  it('keeps unknown placeholders visible when params are missing', () => {
    expect(translate(dictionary, 'welcome', 'en', {})).toBe('Welcome {name}')
  })

  it('supports numeric params', () => {
    const dict = { count: { th: 'มี {n} รายการ', en: '{n} items' } } satisfies Dictionary
    expect(translate(dict, 'count', 'en', { n: 3 })).toBe('3 items')
  })
})
