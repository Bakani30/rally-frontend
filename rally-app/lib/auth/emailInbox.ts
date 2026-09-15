const INBOX_URL_BY_DOMAIN: Record<string, string> = {
  'gmail.com': 'https://mail.google.com/mail/u/0/#inbox',
  'googlemail.com': 'https://mail.google.com/mail/u/0/#inbox',
  'outlook.com': 'https://outlook.live.com/mail/0/inbox',
  'hotmail.com': 'https://outlook.live.com/mail/0/inbox',
  'live.com': 'https://outlook.live.com/mail/0/inbox',
  'msn.com': 'https://outlook.live.com/mail/0/inbox',
  'yahoo.com': 'https://mail.yahoo.com',
  'ymail.com': 'https://mail.yahoo.com',
  'rocketmail.com': 'https://mail.yahoo.com',
  'icloud.com': 'https://www.icloud.com/mail',
  'me.com': 'https://www.icloud.com/mail',
  'mac.com': 'https://www.icloud.com/mail',
  'proton.me': 'https://mail.proton.me/u/0/inbox',
  'protonmail.com': 'https://mail.proton.me/u/0/inbox',
  'pm.me': 'https://mail.proton.me/u/0/inbox',
  'zoho.com': 'https://mail.zoho.com',
}

export function resolveEmailInboxUrl(email: string): string | null {
  const domain = email.trim().toLowerCase().split('@').at(1)
  if (!domain) return null
  return INBOX_URL_BY_DOMAIN[domain] ?? null
}
