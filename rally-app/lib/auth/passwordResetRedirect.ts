export type AuthRedirectParams = Record<string, string | string[] | undefined>

export type PasswordResetRedirectParams = {
  code?: string
  accessToken?: string
  refreshToken?: string
  authError?: string
}

const ERROR_PARAM_KEYS = ['error_description', 'error', 'error_code'] as const

function firstParam(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value
  return first && first.length > 0 ? first : undefined
}

function firstSearchParam(params: URLSearchParams, key: string): string | undefined {
  const value = params.get(key)
  return value && value.length > 0 ? value : undefined
}

function parseUrlParams(rawUrl: string | null | undefined): URLSearchParams[] {
  if (!rawUrl) return []

  try {
    const url = new URL(rawUrl)
    const params = [url.searchParams]
    const hashParams = parseHashParams(url.hash)
    if (hashParams) params.push(hashParams)
    return params
  } catch {
    const hashStart = rawUrl.indexOf('#')
    if (hashStart === -1) return []
    const hashParams = parseHashParams(rawUrl.slice(hashStart))
    return hashParams ? [hashParams] : []
  }
}

function parseHashParams(hash: string): URLSearchParams | null {
  const body = hash.replace(/^#/, '')
  if (!body) return null

  const queryStart = body.indexOf('?')
  const paramBody = queryStart >= 0 ? body.slice(queryStart + 1) : body
  if (!paramBody.includes('=')) return null
  return new URLSearchParams(paramBody)
}

function resolveParam(
  routeParams: AuthRedirectParams,
  urlParams: URLSearchParams[],
  key: string
): string | undefined {
  return firstParam(routeParams[key]) ?? firstUrlParam(urlParams, key)
}

function firstUrlParam(urlParams: URLSearchParams[], key: string): string | undefined {
  for (const params of urlParams) {
    const value = firstSearchParam(params, key)
    if (value) return value
  }
  return undefined
}

export function resolvePasswordResetRedirectParams(
  routeParams: AuthRedirectParams,
  rawUrl?: string | null
): PasswordResetRedirectParams {
  const urlParams = parseUrlParams(rawUrl)
  const code = resolveParam(routeParams, urlParams, 'code')
  const accessToken = resolveParam(routeParams, urlParams, 'access_token')
  const refreshToken = resolveParam(routeParams, urlParams, 'refresh_token')
  const authError = ERROR_PARAM_KEYS
    .map((key) => resolveParam(routeParams, urlParams, key))
    .find((value): value is string => Boolean(value))

  return { code, accessToken, refreshToken, authError }
}

export function hasPasswordResetSensitiveParams(rawUrl: string): boolean {
  const urlParams = parseUrlParams(rawUrl)
  const sensitiveKeys = ['code', 'error', 'error_description', 'error_code', 'access_token', 'refresh_token']

  return urlParams.some((params) => sensitiveKeys.some((key) => params.has(key)))
}
