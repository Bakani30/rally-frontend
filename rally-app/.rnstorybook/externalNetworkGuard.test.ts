import { describe, expect, it } from 'vitest'

import { installExternalNetworkGuard } from './externalNetworkGuard'

describe('Storybook process-lifetime network guard', () => {
  it('blocks external fetch, XHR, and WebSocket calls before originals but permits loopback', () => {
    const events: string[] = []
    class FakeXmlHttpRequest {
      open(_method: string, url: string) {
        events.push(`xhr:${url}`)
      }
    }
    class FakeWebSocket {
      constructor(url: string) {
        events.push(`ws:${url}`)
      }
    }
    const globalLike = {
      fetch(url: string) {
        events.push(`fetch:${url}`)
        return 'fetch-result'
      },
      XMLHttpRequest: FakeXmlHttpRequest,
      WebSocket: FakeWebSocket,
    }

    installExternalNetworkGuard(globalLike)
    const firstGuard = globalLike.fetch
    installExternalNetworkGuard(globalLike)

    expect(globalLike.fetch).toBe(firstGuard)
    expect(globalLike.fetch('http://127.0.0.1:8081/status')).toBe('fetch-result')
    new globalLike.XMLHttpRequest().open('GET', 'http://localhost:8081/status')
    new globalLike.WebSocket('ws://[::1]:8081')
    expect(() => globalLike.fetch('https://images.example.com/avatar.png')).toThrow(
      '[StorybookNetworkGuard] blocked https://images.example.com/avatar.png',
    )
    expect(() => new globalLike.XMLHttpRequest().open('GET', 'https://images.example.com/avatar.png')).toThrow(
      '[StorybookNetworkGuard] blocked https://images.example.com/avatar.png',
    )
    expect(() => new globalLike.WebSocket('wss://images.example.com/socket')).toThrow(
      '[StorybookNetworkGuard] blocked wss://images.example.com/socket',
    )
    expect(events).toEqual([
      'fetch:http://127.0.0.1:8081/status',
      'xhr:http://localhost:8081/status',
      'ws:ws://[::1]:8081',
    ])
  })
})
