import { describe, expect, it } from 'vitest'
import {
  normalizeRouteTarget,
  routeCommandKey,
  RouteCommandGate,
} from './routeCommandGate'

describe('RouteCommandGate', () => {
  it('suppresses duplicate route commands inside the short window', () => {
    const gate = new RouteCommandGate({ now: () => 1000, suppressMs: 700 })

    const first = gate.begin({ method: 'push', target: '/notifications' })
    first?.finish()

    expect(first).not.toBeNull()
    expect(gate.begin({ method: 'push', target: '/notifications', now: 1200 })).toBeNull()
    expect(gate.begin({ method: 'push', target: '/notifications', now: 1800 })).not.toBeNull()
  })

  it('keeps async actions single-flight by action key', () => {
    const gate = new RouteCommandGate({ now: () => 1000 })

    const first = gate.begin({
      method: 'action',
      actionKey: 'accept_invite:invite-1',
      target: '/match/match-1',
    })

    expect(first).not.toBeNull()
    expect(gate.begin({
      method: 'action',
      actionKey: 'accept_invite:invite-1',
      target: '/match/match-1',
      now: 1001,
    })).toBeNull()

    first?.finish()

    expect(gate.begin({
      method: 'action',
      actionKey: 'accept_invite:invite-1',
      target: '/match/match-1',
      now: 1800,
    })).not.toBeNull()
  })

  it('normalizes object targets with stable key order', () => {
    const left = { pathname: '/(tabs)', params: { b: '2', a: '1' } }
    const right = { params: { a: '1', b: '2' }, pathname: '/(tabs)' }

    expect(normalizeRouteTarget(left)).toBe(normalizeRouteTarget(right))
    expect(routeCommandKey({ method: 'replace', target: left })).toBe(
      routeCommandKey({ method: 'replace', target: right }),
    )
  })

  it('normalizes string query params for stable comparisons', () => {
    expect(normalizeRouteTarget('/match/1?b=2&a=1')).toBe('/match/1?a=1&b=2')
    expect(normalizeRouteTarget('notifications')).toBe('/notifications')
  })
})
