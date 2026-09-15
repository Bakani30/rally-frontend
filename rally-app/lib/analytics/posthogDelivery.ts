const POSTHOG_DELIVERY_ERROR_NAMES = new Set(['PostHogFetchNetworkError', 'PostHogFetchHttpError'])

export function isPostHogDeliveryError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  const candidate = error as { name?: unknown; message?: unknown }
  if (typeof candidate.name === 'string' && POSTHOG_DELIVERY_ERROR_NAMES.has(candidate.name)) return true

  return typeof candidate.message === 'string' && candidate.message.includes('fetching PostHog')
}
