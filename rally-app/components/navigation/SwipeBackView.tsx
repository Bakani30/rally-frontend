import type { ReactNode } from 'react'
import { router } from 'expo-router'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { runOnJS, useSharedValue } from 'react-native-reanimated'

type SwipeBackViewProps = {
  children: ReactNode
  /** Override navigation. Defaults to back, falling back to Home when there is no back stack. */
  onBack?: () => void
  style?: StyleProp<ViewStyle>
}

/** A drag must begin within this many px of the left edge to count as a back swipe. */
const EDGE_WIDTH = 32
/** Horizontal travel that dismisses on a slow drag. */
const TRIGGER_DISTANCE = 72
/** Rightward flick speed (px/s) that dismisses even on a short drag. */
const TRIGGER_VELOCITY = 600

/**
 * Left-edge swipe-back affordance for screens that live inside the tab navigator
 * and therefore lack the native stack's swipe-to-go-back gesture. Mirrors the
 * router fallback of `ScreenBackButton` so a screen offers the same way out by
 * tap and by swipe. Navigation primitive — owns the back-stack bookkeeping so
 * host screens stay declarative.
 */
export function SwipeBackView({ children, onBack, style }: SwipeBackViewProps) {
  // Captured at gesture start so we only honour drags that originate at the edge,
  // leaving the rest of the surface free for taps and vertical scrolling.
  const startedAtEdge = useSharedValue(false)

  function goBack() {
    if (onBack) {
      onBack()
      return
    }
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/(tabs)')
    }
  }

  const pan = Gesture.Pan()
    .activeOffsetX(12) // only claim rightward horizontal drags…
    .failOffsetY([-14, 14]) // …and yield to vertical scroll
    .onBegin((event) => {
      startedAtEdge.value = event.x <= EDGE_WIDTH
    })
    .onEnd((event) => {
      if (
        startedAtEdge.value &&
        (event.translationX > TRIGGER_DISTANCE || event.velocityX > TRIGGER_VELOCITY)
      ) {
        runOnJS(goBack)()
      }
    })

  return (
    <GestureDetector gesture={pan}>
      <View style={[styles.fill, style]}>{children}</View>
    </GestureDetector>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
})
