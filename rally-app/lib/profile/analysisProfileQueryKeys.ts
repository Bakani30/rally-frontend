export const analysisProfileQueryKeys = {
  detail: (userId: string | undefined) => ['analysis-profile', userId] as const,
}
