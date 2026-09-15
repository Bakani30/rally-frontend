// Ambient module for static `import x from '*.png'` (Metro resolves these to
// an ImageSourcePropType-compatible value at build time). Needed by
// lib/ranks/rankAssets.ts, which uses ESM import (not require()) so its PNG
// asset map can be exercised under Vitest via vi.mock.
declare module '*.png' {
  import type { ImageSourcePropType } from 'react-native'
  const value: ImageSourcePropType
  export default value
}

declare module '*.svg' {
  import type { ImageSourcePropType } from 'react-native'
  const value: ImageSourcePropType
  export default value
}
