import { Spacing } from '@/constants/theme'

type Edge = 'top' | 'bottom'
type Args = {
  insets: { top: number; bottom: number }
  edges?: Edge[]
  topPad?: number
  bottomPad?: number
}

export function computeScreenPadding({
  insets,
  edges = ['top'],
  topPad = Spacing.lg,
  bottomPad = Spacing.xl,
}: Args): { paddingTop: number; paddingBottom: number } {
  return {
    paddingTop: (edges.includes('top') ? insets.top : 0) + topPad,
    paddingBottom: (edges.includes('bottom') ? insets.bottom : 0) + bottomPad,
  }
}
