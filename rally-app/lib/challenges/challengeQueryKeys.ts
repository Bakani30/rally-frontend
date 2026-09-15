export const challengeQueryKeys = {
  all: ['challenges'] as const,
  list: (status: 'active' | 'all' | 'open' = 'open') => ['challenges', 'list', status] as const,
  detail: (id: string | undefined) => ['challenges', 'detail', id] as const,
  routeAttempts: (id: string | undefined, limit?: number) =>
    limit == null
      ? ['challenges', 'route-attempts', id] as const
      : ['challenges', 'route-attempts', id, limit] as const,
}
