// TanStack Query keys for quest-proof data. Mirrors lib/challenges/challengeQueryKeys.ts.

export const questProofQueryKeys = {
  all: ['quest-proof'] as const,
  templates: () => ['quest-proof', 'templates'] as const,
  sessions: (userId: string | undefined) => ['quest-proof', 'sessions', userId] as const,
  session: (sessionId: string) => ['quest-proof', 'session', sessionId] as const,
}
