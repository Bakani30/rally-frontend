type ExternalNetworkGlobal = {
  fetch?: (...args: never[]) => unknown
  XMLHttpRequest?: {
    prototype: {
      open?: (...args: never[]) => unknown
    }
  }
  WebSocket?: new (...args: never[]) => unknown
}

const installedGlobals = new WeakSet<object>()

function isLoopbackHost(hostname: string): boolean {
  const normalized = hostname.replace(/^\[|\]$/g, '').toLowerCase()
  return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1'
}

function requestUrl(value: unknown): string {
  if (typeof value === 'string') return value
  if (value instanceof URL) return value.href
  if (typeof value === 'object' && value !== null && 'url' in value && typeof value.url === 'string') {
    return value.url
  }
  return String(value)
}

function isAllowedNetworkUrl(value: unknown): boolean {
  const urlValue = requestUrl(value)
  if (urlValue.trim() === '' || urlValue.startsWith('//')) return false

  try {
    const url = new URL(urlValue)
    if (url.username || url.password || !isLoopbackHost(url.hostname)) return false
    return url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'ws:' || url.protocol === 'wss:'
  } catch {
    return false
  }
}

function networkError(value: unknown): Error {
  return new Error(`[StorybookNetworkGuard] blocked ${requestUrl(value)}`)
}

/**
 * This is intentionally process-lifetime. Story decorators may mount and
 * unmount while users change stories, so they cannot own the global guard.
 */
export function installExternalNetworkGuard(globalLike: ExternalNetworkGlobal = globalThis): void {
  if (installedGlobals.has(globalLike)) return

  const originalFetch = globalLike.fetch
  const originalXmlHttpRequest = globalLike.XMLHttpRequest
  const originalOpen = originalXmlHttpRequest?.prototype.open
  const originalWebSocket = globalLike.WebSocket

  if (originalFetch) {
    globalLike.fetch = (...args: unknown[]) => {
      if (!isAllowedNetworkUrl(args[0])) throw networkError(args[0])
      return Reflect.apply(originalFetch, globalLike, args)
    }
  }
  if (originalOpen && originalXmlHttpRequest) {
    originalXmlHttpRequest.prototype.open = function guardedOpen(this: unknown, ...args: unknown[]) {
      if (!isAllowedNetworkUrl(args[1])) throw networkError(args[1])
      return Reflect.apply(originalOpen, this, args)
    }
  }
  if (originalWebSocket) {
    globalLike.WebSocket = new Proxy(originalWebSocket, {
      construct(target, args, newTarget) {
        if (!isAllowedNetworkUrl(args[0])) throw networkError(args[0])
        return Reflect.construct(target, args, newTarget)
      },
    })
  }

  installedGlobals.add(globalLike)
}
