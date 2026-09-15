export type RouteCommandMethod = 'push' | 'replace' | 'dismissTo' | 'dismiss' | 'back' | 'action'

export type RouteTarget =
  | string
  | {
      pathname?: string
      params?: Record<string, unknown>
      [key: string]: unknown
    }
  | null
  | undefined

export type RouteCommandInput = {
  method: RouteCommandMethod
  target?: RouteTarget
  actionKey?: string | null
  now?: number
  suppressMs?: number
  singleFlight?: boolean
}

export type RouteCommandToken = {
  key: string
  finish: () => void
}

export type RouteCommandGateOptions = {
  now?: () => number
  suppressMs?: number
}

const DEFAULT_SUPPRESS_MS = 700

export class RouteCommandGate {
  private readonly now: () => number
  private readonly defaultSuppressMs: number
  private readonly recent = new Map<string, number>()
  private readonly inFlight = new Set<string>()

  constructor(options: RouteCommandGateOptions = {}) {
    this.now = options.now ?? Date.now
    this.defaultSuppressMs = options.suppressMs ?? DEFAULT_SUPPRESS_MS
  }

  begin(input: RouteCommandInput): RouteCommandToken | null {
    const key = routeCommandKey(input)
    const now = input.now ?? this.now()
    const suppressMs = input.suppressMs ?? this.defaultSuppressMs
    const previous = this.recent.get(key)

    if (input.singleFlight !== false && this.inFlight.has(key)) return null
    if (previous != null && now - previous < suppressMs) return null

    this.recent.set(key, now)
    if (input.singleFlight !== false) this.inFlight.add(key)

    let finished = false
    return {
      key,
      finish: () => {
        if (finished) return
        finished = true
        this.inFlight.delete(key)
      },
    }
  }

  reset() {
    this.recent.clear()
    this.inFlight.clear()
  }
}

export function routeCommandKey(input: RouteCommandInput): string {
  const action = cleanKeyPart(input.actionKey)
  const target = normalizeRouteTarget(input.target)
  return `${input.method}:${action ?? target ?? 'current'}`
}

export function normalizeRouteTarget(target: RouteTarget): string | null {
  if (target == null) return null
  if (typeof target === 'string') return normalizeRouteString(target)
  return stableStringify(target)
}

function normalizeRouteString(route: string): string {
  const trimmed = route.trim()
  if (!trimmed) return '/'

  const [pathAndQuery, hash = ''] = trimmed.split('#', 2)
  const [path, query = ''] = pathAndQuery.split('?', 2)
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const normalizedQuery = normalizeQuery(query)
  return `${normalizedPath}${normalizedQuery}${hash ? `#${hash}` : ''}`
}

function normalizeQuery(query: string): string {
  if (!query) return ''
  const params = new URLSearchParams(query)
  const entries = Array.from(params.entries()).sort(([aKey, aValue], [bKey, bValue]) => {
    if (aKey === bKey) return aValue.localeCompare(bValue)
    return aKey.localeCompare(bKey)
  })
  const sorted = new URLSearchParams()
  for (const [key, value] of entries) sorted.append(key, value)
  const serialized = sorted.toString()
  return serialized ? `?${serialized}` : ''
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    const object = value as Record<string, unknown>
    return `{${Object.keys(object)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

function cleanKeyPart(value: string | null | undefined): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}
