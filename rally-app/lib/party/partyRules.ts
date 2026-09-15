export const PARTY_NAME_MIN_LENGTH = 2
export const PARTY_NAME_MAX_LENGTH = 40

export function normalizePartyName(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

export function isPartyNameValid(value: string): boolean {
  const normalized = normalizePartyName(value)
  return normalized.length >= PARTY_NAME_MIN_LENGTH && normalized.length <= PARTY_NAME_MAX_LENGTH
}

export function createPartyCreateAttempt(createKey: () => string) {
  let currentKey: string | null = null

  return {
    key() {
      currentKey ??= createKey()
      return currentKey
    },
    complete() {
      currentKey = null
    },
  }
}
