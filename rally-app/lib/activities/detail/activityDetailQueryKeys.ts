export const activityDetailQueryKeys = {
  detail: (id: string | undefined) => ['activity', 'detail', id] as const,
  linkedMatch: (id: string | undefined) => ['activity', 'linked-match', id] as const,
  replayRouteData: (id: string | undefined) => ['activity', 'replay-route-data', id] as const,
}
