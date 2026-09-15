import type { ReactNode } from 'react'
import { ScrollView, View, type StyleProp, type ViewStyle, type ScrollViewProps } from 'react-native'
import { useScreenInsets } from './useScreenInsets'

type Edge = 'top' | 'bottom'
type ScreenProps = {
  children: ReactNode
  scroll?: boolean
  edges?: Edge[]
  topPad?: number
  bottomPad?: number
  contentContainerStyle?: StyleProp<ViewStyle>
  backgroundColor?: string
} & Pick<
  ScrollViewProps,
  | 'showsVerticalScrollIndicator'
  | 'keyboardShouldPersistTaps'
  | 'bounces'
  | 'scrollEnabled'
  | 'refreshControl'
>

export function Screen({
  children,
  scroll = true,
  edges = ['top'],
  topPad,
  bottomPad,
  contentContainerStyle,
  backgroundColor,
  ...scrollProps
}: ScreenProps) {
  const { paddingTop, paddingBottom } = useScreenInsets({ edges, topPad, bottomPad })
  const bg = backgroundColor ? { backgroundColor } : null

  // Inset padding is the LAST element of the style array so it wins over any
  // paddingTop/paddingBottom the caller put in contentContainerStyle (RN
  // flattens left-to-right; and, being the last object flattened, its explicit
  // paddingTop/paddingBottom keys overwrite any padding the caller set (RN
  // flattens style arrays last-write-wins per key, not by CSS specificity)).
  // children stay DIRECT children of the content container so
  // the caller's `gap` / `flexGrow` / `alignItems` still apply between them —
  // do NOT re-introduce an inner wrapper View (it makes `gap` a no-op).
  if (!scroll) {
    return (
      <View style={[{ flex: 1 }, bg, contentContainerStyle, { paddingTop, paddingBottom }]}>
        {children}
      </View>
    )
  }
  return (
    <ScrollView
      style={[{ flex: 1 }, bg]}
      contentContainerStyle={[contentContainerStyle, { paddingTop, paddingBottom }]}
      {...scrollProps}
    >
      {children}
    </ScrollView>
  )
}
