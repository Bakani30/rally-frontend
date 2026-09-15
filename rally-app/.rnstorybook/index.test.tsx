import { describe, expect, it, vi } from 'vitest'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, URL as NodeURL } from 'node:url'

import { registerStorybookRoot } from './storybookRoot'

describe('Storybook entry', () => {
  it('registers the generated Storybook root when Metro swaps Expo Router entry', () => {
    const registerRootComponent = vi.fn()
    const getStorybookUI = vi.fn(() => 'storybook-root')

    const StorybookRoot = registerStorybookRoot(
      { getStorybookUI },
      registerRootComponent,
    )

    expect(StorybookRoot).toBe('storybook-root')
    expect(getStorybookUI).toHaveBeenCalledWith({
      enableWebsockets: false,
      onDeviceUI: true,
      shouldPersistSelection: false,
      initialSelection: 'home-home--ready',
    })
    expect(registerRootComponent).toHaveBeenCalledWith('storybook-root')
  })

  it('installs the guard before a generated story module can make an external request', () => {
    const probePath = fileURLToPath(new NodeURL('./test-fixtures/storybook-bootstrap-probe.mjs', import.meta.url))
    const result = spawnSync(process.execPath, [probePath], { encoding: 'utf8' })

    expect(result.status).toBe(0)
    expect(JSON.parse(result.stdout)).toEqual({
      blocked: '[StorybookNetworkGuard] blocked https://example.com/storybook-probe',
      registered: 'storybook-root',
    })
  })
})
