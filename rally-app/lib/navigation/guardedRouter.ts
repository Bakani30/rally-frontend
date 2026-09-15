import { router, type Href } from 'expo-router'
import { RouteCommandGate, type RouteCommandInput, type RouteTarget } from './routeCommandGate'

const gate = new RouteCommandGate()

export type GuardedRouteOptions = Omit<RouteCommandInput, 'method' | 'target'>

export const guardedRouter = {
  push(target: Href, options?: GuardedRouteOptions) {
    runRouteCommand('push', target, options, () => router.push(target))
  },

  replace(target: Href, options?: GuardedRouteOptions) {
    runRouteCommand('replace', target, options, () => router.replace(target))
  },

  dismissTo(target: Href, options?: GuardedRouteOptions) {
    const dismissTo = router.dismissTo
    if (typeof dismissTo === 'function') {
      runRouteCommand('dismissTo', target, options, () => dismissTo(target))
      return
    }
    runRouteCommand('replace', target, options, () => router.replace(target))
  },

  dismiss(options?: GuardedRouteOptions) {
    runRouteCommand('dismiss', null, options, () => router.dismiss())
  },

  back(options?: GuardedRouteOptions) {
    runRouteCommand('back', null, options, () => router.back())
  },

  resetGate() {
    gate.reset()
  },
}

export async function runGuardedNavigationAction<T>(
  input: Omit<RouteCommandInput, 'method'> & { target?: RouteTarget },
  action: () => Promise<T>,
): Promise<T | null> {
  const token = gate.begin({ ...input, method: 'action' })
  if (!token) return null
  try {
    return await action()
  } finally {
    token.finish()
  }
}

function runRouteCommand(
  method: 'push' | 'replace' | 'dismissTo' | 'dismiss' | 'back',
  target: RouteTarget,
  options: GuardedRouteOptions | undefined,
  command: () => void,
) {
  const token = gate.begin({
    ...options,
    method,
    target,
    singleFlight: options?.singleFlight ?? false,
  })
  if (!token) return
  try {
    command()
  } finally {
    token.finish()
  }
}
