import { type ComponentProps, type ReactNode, useEffect, useRef } from 'react'
import { type AccessibilityActionEvent, StyleSheet, Text, View } from 'react-native'
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
} from 'react-native-reanimated'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

export type SwipeAction = {
  icon: IconName
  label: string
  /** Solid fill of the action card revealed behind the row. */
  bg: string
  /** Contrast colour for the icon + label on top of `bg`. */
  fg: string
  onAction: () => void
  accessibilityLabel?: string
}

type SwipeableRowProps = {
  children: ReactNode
  /** The affirmative action (accept / challenge / invite) — revealed by a swipe-LEFT (finger right→left). */
  affirmAction?: SwipeAction
  /** The destructive action (decline / remove) — revealed by a swipe-RIGHT (finger left→right). */
  destroyAction?: SwipeAction
  enabled?: boolean
  /** Play the one-time discovery nudge on mount (visual only — never fires). */
  nudge?: boolean
}

/** Width of the gesture catch zone on each side. */
const ACTION_WIDTH = 84
/** How far the first-run nudge slides the row to flash each action card. */
const NUDGE_DISTANCE = 64
const NUDGE_SPRING = { damping: 18, stiffness: 220, mass: 0.5 }

/**
 * Wraps a list row with directional gestures over a layered action card: the
 * opaque row sits on top, and swiping (or the one-time `nudge`) slides the whole
 * row to reveal the colour + icon of the card behind — swipe-left past the
 * threshold fires the affirmative action, swipe-right the destructive one. The
 * row is opaque so nothing bleeds through its text. The nudge animates a private
 * layer and never opens the swipeable, so it can't fire an action.
 */
export function SwipeableRow({
  children,
  affirmAction,
  destroyAction,
  enabled = true,
  nudge = false,
}: SwipeableRowProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const ref = useRef<SwipeableMethods>(null)
  const nudgeX = useSharedValue(0)

  useEffect(() => {
    if (!nudge) return
    nudgeX.value = withSequence(
      withDelay(260, withSpring(NUDGE_DISTANCE, NUDGE_SPRING)),
      withDelay(120, withSpring(0, NUDGE_SPRING)),
      withSpring(-NUDGE_DISTANCE, NUDGE_SPRING),
      withDelay(120, withSpring(0, NUDGE_SPRING)),
    )
  }, [nudge, nudgeX])

  const nudgeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: nudgeX.value }] }))

  if (!enabled || (!affirmAction && !destroyAction)) return <>{children}</>

  function handleWillOpen(direction: 'left' | 'right') {
    // `direction` from ReanimatedSwipeable is the swipe MOTION — the INVERSE of
    // the revealed side (gesture-handler ReanimatedSwipeable.tsx:161: a positive
    // translation reveals the LEFT card yet reports 'right'). We render the
    // destructive card on the LEFT edge and the affirmative card on the RIGHT,
    // so fire by the card that is actually visible — never by physical side —
    // or the label and the effect silently diverge (ท้า would remove a friend):
    //   swipe-right → 'right' → LEFT card  → destroyAction
    //   swipe-left  → 'left'  → RIGHT card → affirmAction
    const action = direction === 'right' ? destroyAction : affirmAction
    ref.current?.close()
    action?.onAction()
  }

  function handleA11yAction(event: AccessibilityActionEvent) {
    if (event.nativeEvent.actionName === 'affirm') affirmAction?.onAction()
    else if (event.nativeEvent.actionName === 'destroy') destroyAction?.onAction()
  }

  const a11yActions = [
    ...(affirmAction ? [{ name: 'affirm', label: affirmAction.accessibilityLabel ?? affirmAction.label }] : []),
    ...(destroyAction ? [{ name: 'destroy', label: destroyAction.accessibilityLabel ?? destroyAction.label }] : []),
  ]

  function renderActionHalf(action: SwipeAction, side: 'left' | 'right') {
    return (
      <View style={[styles.cardHalf, side === 'left' ? styles.cardHalfLeft : styles.cardHalfRight, { backgroundColor: action.bg }]}>
        <MaterialCommunityIcons name={action.icon} size={22} color={action.fg} />
        <Text style={[styles.cardText, { color: action.fg }]} numberOfLines={1}>
          {action.label}
        </Text>
      </View>
    )
  }

  /** Transparent spacer — gives the swipeable a catch zone while the colour comes from the card behind. */
  function renderSpacer() {
    return <View style={styles.spacer} />
  }

  return (
    <View style={styles.container}>
      <View style={styles.actionCard} pointerEvents="none">
        {destroyAction ? renderActionHalf(destroyAction, 'left') : <View style={styles.cardHalf} />}
        {affirmAction ? renderActionHalf(affirmAction, 'right') : <View style={styles.cardHalf} />}
      </View>
      <ReanimatedSwipeable
        ref={ref}
        friction={2}
        leftThreshold={ACTION_WIDTH * 0.5}
        rightThreshold={ACTION_WIDTH * 0.5}
        overshootLeft={false}
        overshootRight={false}
        onSwipeableWillOpen={handleWillOpen}
        containerStyle={styles.swipeable}
        renderLeftActions={destroyAction ? renderSpacer : undefined}
        renderRightActions={affirmAction ? renderSpacer : undefined}
      >
        <Animated.View
          style={[styles.foreground, nudgeStyle]}
          accessibilityActions={a11yActions}
          onAccessibilityAction={handleA11yAction}
        >
          {children}
        </Animated.View>
      </ReanimatedSwipeable>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    container: { position: 'relative', borderRadius: Radius.xl, overflow: 'hidden' },
    actionCard: { ...StyleSheet.absoluteFillObject, flexDirection: 'row' },
    cardHalf: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.lg },
    cardHalfLeft: { justifyContent: 'flex-start' },
    cardHalfRight: { justifyContent: 'flex-end' },
    cardText: {
      fontSize: 12,
      fontWeight: '900',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    swipeable: { backgroundColor: 'transparent' },
    spacer: { width: ACTION_WIDTH },
    foreground: { backgroundColor: theme.bg, borderRadius: Radius.xl },
  })
}
