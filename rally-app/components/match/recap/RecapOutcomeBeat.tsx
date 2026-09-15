import { useEffect } from 'react'
import { getSportPalette } from '@/constants/theme'
import { Text, View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AnimatedNumber } from '@/components/motion/AnimatedNumber'
import { Reveal } from '@/components/motion/Reveal'
import { RECAP_TONE_COPY } from '@/lib/match/recap/recapToneCopy'
import type { RecapMomentViewModel } from '@/lib/match/recap/matchRecapMoment'
import { createRecapMomentStyles, recapAccent } from './matchRecapMomentStyles'

const VICTORY_ICON: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  'victory/confetti': 'party-popper',
  'victory/fire': 'fire',
}

type RecapOutcomeBeatProps = {
  viewModel: RecapMomentViewModel
  victoryAssetRef: string | null
}

export function RecapOutcomeBeat({ viewModel, victoryAssetRef }: RecapOutcomeBeatProps) {
  const theme = getSportPalette('dark')
  const styles = createRecapMomentStyles(theme)
  const reduceMotion = useReducedMotion()
  const accent = recapAccent(viewModel.tone)
  const copy = RECAP_TONE_COPY[viewModel.tone]
  const pop = useSharedValue(reduceMotion ? 1 : 0)

  useEffect(() => {
    if (reduceMotion) {
      pop.value = 1
      return
    }
    pop.value = withSequence(
      withTiming(1.12, { duration: 180, easing: Easing.out(Easing.back(2)) }),
      withTiming(1, { duration: 140 }),
    )
  }, [pop, reduceMotion])

  const titleStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }], opacity: pop.value }))
  const winIcon = victoryAssetRef ? VICTORY_ICON[victoryAssetRef] ?? 'trophy-award' : 'trophy-award'

  return (
    <Reveal delay={reduceMotion ? 0 : 60}>
      <Text style={[styles.eyebrow, { color: accent }]}>{copy.eyebrow}</Text>
      <Animated.Text style={[styles.title, { color: accent }, titleStyle]}>{copy.title}</Animated.Text>
      {copy.confetti && (
        <View style={styles.celebrateRow}>
          <MaterialCommunityIcons name={winIcon} size={22} color={theme.amber} />
          <MaterialCommunityIcons name="party-popper" size={22} color={accent} />
          <MaterialCommunityIcons name="star-four-points" size={20} color={theme.amber} />
        </View>
      )}
      <View style={[styles.scoreRow, { marginTop: 12 }]}>
        <ScoreBlock label="SIDE A" score={viewModel.sideAScore} active={viewModel.mySide === 0} accent={accent} reduceMotion={reduceMotion} styles={styles} />
        <Text style={styles.scoreDash}>-</Text>
        <ScoreBlock label="SIDE B" score={viewModel.sideBScore} active={viewModel.mySide === 1} accent={accent} reduceMotion={reduceMotion} styles={styles} />
      </View>
    </Reveal>
  )
}

function ScoreBlock({ label, score, active, accent, reduceMotion, styles }: {
  label: string
  score: number | null
  active: boolean
  accent: string
  reduceMotion: boolean
  styles: ReturnType<typeof createRecapMomentStyles>
}) {
  return (
    <View style={[styles.scoreBlock, active && { borderColor: accent, backgroundColor: `${accent}1f` }]}>
      <Text style={styles.scoreSide}>{label}</Text>
      {score === null ? (
        <Text style={styles.scoreValue}>--</Text>
      ) : reduceMotion ? (
        <Text style={styles.scoreValue}>{score}</Text>
      ) : (
        <AnimatedNumber value={score} duration={900} animateFromZero style={styles.scoreValue} />
      )}
      {active && <Text style={styles.youTag}>YOU</Text>}
    </View>
  )
}
