import { useEffect } from 'react'
import { Text, View, type StyleProp, type TextStyle } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { getSportPalette } from '@/constants/theme'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AnimatedNumber } from '@/components/motion/AnimatedNumber'
import { Reveal } from '@/components/motion/Reveal'
import type { RecapMomentViewModel } from '@/lib/match/recap/matchRecapMoment'
import {
  createRecapMomentStyles,
  recapAccent,
  RECAP_ORANGE,
  RECAP_NAVY,
  RECAP_INK_SOFT,
  RECAP_TILE,
} from './matchRecapMomentStyles'

function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`
}

// Hero impact number: rolls up from zero (ไหล) and pops with a back-eased
// bounce (เด้ง) when it lands. Bounce delay aligns with the count-up settling.
function BouncyNumber({ value, color, style, delay }: {
  value: number
  color: string
  style: StyleProp<TextStyle>
  delay: number
}) {
  const scale = useSharedValue(0.7)
  useEffect(() => {
    scale.value = withDelay(
      delay,
      withSequence(
        withTiming(1.22, { duration: 300, easing: Easing.out(Easing.back(3)) }),
        withTiming(1, { duration: 170, easing: Easing.out(Easing.quad) }),
      ),
    )
  }, [scale, delay])
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))
  return (
    <Animated.View style={animatedStyle}>
      <AnimatedNumber value={value} duration={460} animateFromZero style={[style, { color }]} formatter={signed} />
    </Animated.View>
  )
}

type RecapImpactBeatProps = {
  viewModel: RecapMomentViewModel
}

export function RecapImpactBeat({ viewModel }: RecapImpactBeatProps) {
  const theme = getSportPalette('dark')
  const styles = createRecapMomentStyles(theme)
  const reduceMotion = useReducedMotion()
  const accent = recapAccent(viewModel.tone)
  const { pointsDelta, currencyUnit, ratingDelta, ratingBefore, ratingAfter, tier } = viewModel

  return (
    // Snappy: the impact numbers used to land ~1s after the recap (260ms reveal
    // + 800ms count-up), so a quick "ออก" tap missed them. Tighten both.
    <Reveal delay={reduceMotion ? 0 : 90}>
      <View style={styles.divider} />
      <View style={[styles.impactRow, { marginTop: 16 }]}>
        <View style={styles.impactTile}>
          <Text style={styles.impactLabel}>POINTS</Text>
          {reduceMotion ? (
            <Text style={[styles.impactValue, { color: theme.amber }]}>{signed(pointsDelta)}</Text>
          ) : (
            <BouncyNumber value={pointsDelta} color={theme.amber} style={styles.impactValue} delay={120} />
          )}
          <Text style={styles.impactSub}>{currencyUnit}</Text>
        </View>

        {ratingDelta !== null && (
          <View style={styles.impactTile}>
            <Text style={styles.impactLabel}>RATING</Text>
            {reduceMotion ? (
              <Text style={[styles.impactValue, { color: accent }]}>{signed(ratingDelta)}</Text>
            ) : (
              <BouncyNumber value={ratingDelta} color={accent} style={styles.impactValue} delay={220} />
            )}
            <Text style={styles.impactSub}>{`${ratingBefore} → ${ratingAfter}`}</Text>
          </View>
        )}
      </View>

      {tier && (
        <View style={[styles.tierRow, { marginTop: 8 }]}>
          <View>
            <Text style={styles.impactLabel}>TIER</Text>
            <Text style={styles.tierValue}>
              {tier.change === 'none'
                ? tier.after.toUpperCase()
                : `${tier.before.toUpperCase()} → ${tier.after.toUpperCase()}`}
            </Text>
          </View>
          {tier.change === 'promote' && (
            <View style={[styles.promotePill, { backgroundColor: RECAP_ORANGE }]}>
              <MaterialCommunityIcons name="arrow-up-bold" size={14} color={RECAP_NAVY} />
              <Text style={[styles.promotePillText, { color: RECAP_NAVY }]}>เลื่อนขั้น</Text>
            </View>
          )}
          {tier.change === 'demote' && (
            <View style={[styles.promotePill, { backgroundColor: RECAP_TILE }]}>
              <MaterialCommunityIcons name="arrow-down-bold" size={14} color={RECAP_INK_SOFT} />
              <Text style={[styles.promotePillText, { color: RECAP_INK_SOFT }]}>หล่นขั้น</Text>
            </View>
          )}
        </View>
      )}

      {/* Display-only energy estimate — kept muted and away from the points/
          rating tiles so it never reads as part of the economy numbers. */}
      {viewModel.estimatedCalories !== null && (
        <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <MaterialCommunityIcons name="fire" size={14} color={RECAP_INK_SOFT} />
          <Text style={styles.impactSub}>
            {`~${viewModel.estimatedCalories} kcal · โดยประมาณ ไม่มีผลต่อแต้ม`}
          </Text>
        </View>
      )}
    </Reveal>
  )
}
