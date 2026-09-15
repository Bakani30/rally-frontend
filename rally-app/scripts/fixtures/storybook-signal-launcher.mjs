import { fileURLToPath } from 'node:url'

import {
  propagateStorybookChildSignal,
  startStorybookLocal,
} from '../storybook-local.mjs'

const childPath = fileURLToPath(new URL('./storybook-send-sigterm.mjs', import.meta.url))

try {
  await startStorybookLocal({ expoCliPath: childPath, verifyPatch() {} })
} catch (error) {
  if (!propagateStorybookChildSignal(error)) {
    console.error(error)
    process.exitCode = 1
  }
}
