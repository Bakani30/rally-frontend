import { describe, expect, it } from 'vitest'
import { resolveEmailInboxUrl } from './emailInbox'

describe('resolveEmailInboxUrl', () => {
  it('opens common webmail inboxes from the email domain', () => {
    expect(resolveEmailInboxUrl('runner@gmail.com')).toBe('https://mail.google.com/mail/u/0/#inbox')
    expect(resolveEmailInboxUrl('runner@outlook.com')).toBe('https://outlook.live.com/mail/0/inbox')
    expect(resolveEmailInboxUrl('runner@yahoo.com')).toBe('https://mail.yahoo.com')
    expect(resolveEmailInboxUrl('runner@icloud.com')).toBe('https://www.icloud.com/mail')
    expect(resolveEmailInboxUrl('runner@proton.me')).toBe('https://mail.proton.me/u/0/inbox')
  })

  it('normalizes case and whitespace', () => {
    expect(resolveEmailInboxUrl('  Runner@GMAIL.COM  ')).toBe('https://mail.google.com/mail/u/0/#inbox')
  })

  it('returns null when the provider does not have a safe inbox URL', () => {
    expect(resolveEmailInboxUrl('runner@example.com')).toBeNull()
    expect(resolveEmailInboxUrl('not-an-email')).toBeNull()
  })
})
