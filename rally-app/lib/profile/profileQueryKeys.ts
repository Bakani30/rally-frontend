export const profileQueryKeys = {
  summary: (userId: string | undefined) => ['profile', 'summary', userId] as const,
  detail: (userId: string | undefined) => ['profile', 'detail', userId] as const,
  stats: (userId: string | undefined) => ['user-stats', userId] as const,
  public: (key: string | undefined) => ['profile', 'public', key] as const,
}
