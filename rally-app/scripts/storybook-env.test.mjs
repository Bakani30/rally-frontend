import assert from 'node:assert/strict'
import test from 'node:test'

import storybookEnv from './storybook-env.cjs'

const { isLocalStorybookRuntime, isStorybookEnabled } = storybookEnv

test('only the exact true string enables Storybook Metro integration', () => {
  assert.equal(isStorybookEnabled({ STORYBOOK_ENABLED: 'true' }), true)
  for (const value of [undefined, 'false', '1', 'TRUE', ' true', 'true ', 'yes']) {
    assert.equal(isStorybookEnabled({ STORYBOOK_ENABLED: value }), false)
  }
})

test('local Storybook rejects channel and websocket settings while allowing only server false', () => {
  assert.equal(isLocalStorybookRuntime({ STORYBOOK_SERVER: 'false' }), true)

  for (const env of [
    {},
    { STORYBOOK_SERVER: 'true' },
    { STORYBOOK_SERVER: 'false', STORYBOOK_WS_HOST: '127.0.0.1' },
    { STORYBOOK_SERVER: 'false', STORYBOOK_WS_PORT: '7007' },
    { STORYBOOK_SERVER: 'false', STORYBOOK_WS_SECURED: 'true' },
  ]) {
    assert.equal(isLocalStorybookRuntime(env), false)
  }
})
