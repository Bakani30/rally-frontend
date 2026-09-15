import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { computeScreenPadding } from '@/lib/design/screenPadding'

type Edge = 'top' | 'bottom'
type Opts = { edges?: Edge[]; topPad?: number; bottomPad?: number }

export function useScreenInsets(opts: Opts = {}): { paddingTop: number; paddingBottom: number } {
  const insets = useSafeAreaInsets()
  return computeScreenPadding({ insets, ...opts })
}
