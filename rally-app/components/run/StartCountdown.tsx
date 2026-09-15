import { memo, useEffect, useRef, useState } from 'react'
import { Animated, Easing, Platform, Pressable, StyleSheet, Text } from 'react-native'
import * as Haptics from 'expo-haptics'
import { Sport } from '@/constants/theme'

type Props = {
  visible: boolean
  /** Fired once countdown reaches 0. Caller starts the actual run. */
  onComplete: () => void
  /** User aborted before the countdown finished. */
  onCancel: () => void
  /** Override for tests. Default is 3-2-1-GO (3s total). */
  startFrom?: number
}

const DEFAULT_START = 3

function StartCountdownInner({ visible, onComplete, onCancel, startFrom = DEFAULT_START }: Props) {
  const [n, setN] = useState(startFrom)
  const scale = useRef(new Animated.Value(0.6)).current
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!visible) {
      setN(startFrom)
      scale.setValue(0.6)
      opacity.setValue(0)
      return
    }
    setN(startFrom)
  }, [visible, startFrom, scale, opacity])

  useEffect(() => {
    if (!visible) return

    if (Platform.OS === 'ios') {
      void Haptics.impactAsync(
        n === 0 ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Medium,
      )
    }

    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1,
        duration: 380,
        easing: Easing.out(Easing.back(2)),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start()

    const id = setTimeout(() => {
      if (n === 0) {
        onComplete()
        return
      }
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 0.6,
          duration: 220,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => setN((v) => v - 1))
    }, 800)

    return () => clearTimeout(id)
  }, [visible, n, scale, opacity, onComplete])

  if (!visible) return null

  return (
    <Pressable style={styles.backdrop} onPress={onCancel}>
      <Animated.View
        style={[
          styles.numberWrap,
          { transform: [{ scale }], opacity },
        ]}
      >
        <Text style={styles.number}>{n === 0 ? 'GO' : n}</Text>
      </Animated.View>
      <Text style={styles.hint}>แตะที่ใดก็ได้เพื่อยกเลิก</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  numberWrap: { alignItems: 'center', justifyContent: 'center' },
  number: {
    fontSize: 168,
    fontWeight: '900',
    color: Sport.chalk,
    letterSpacing: -4,
    textAlign: 'center',
  },
  hint: {
    position: 'absolute',
    bottom: 60,
    color: Sport.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
})

export const StartCountdown = memo(StartCountdownInner)
