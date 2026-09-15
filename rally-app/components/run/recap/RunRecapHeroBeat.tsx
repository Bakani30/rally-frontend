import { Text, View } from 'react-native'
import { useReducedMotion } from 'react-native-reanimated'
import { AnimatedNumber } from '@/components/motion/AnimatedNumber'
import { Reveal } from '@/components/motion/Reveal'
import { formatDuration } from '@/lib/run-tracking/session/runSessionFormat'
import { formatPace } from '@/lib/run-tracking/gps/paceSmoothing'
import type { RunRecapViewModel } from '@/lib/run-tracking/recap/runRecapMoment'
import type { RunRecapStyles, RunRecapTonePresentation } from './runRecapMomentStyles'

type RunRecapHeroBeatProps = {
  viewModel: RunRecapViewModel
  tone: RunRecapTonePresentation
  styles: RunRecapStyles
}

export function RunRecapHeroBeat({ viewModel, tone, styles }: RunRecapHeroBeatProps) {
  const reduceMotion = useReducedMotion()
  const { distanceMeters, movingTimeSeconds, paceSecondsPerKm } = viewModel

  const subParts: string[] = []
  if (movingTimeSeconds != null) subParts.push(formatDuration(movingTimeSeconds))
  if (paceSecondsPerKm != null) subParts.push(`PACE ${formatPace(paceSecondsPerKm)}`)

  return (
    <Reveal delay={reduceMotion ? 0 : 50} style={styles.heroBeat}>
      <View style={styles.heroTopRow}>
        <Text style={styles.eyebrow}>วิ่งจบแล้ว</Text>
        <View style={[styles.tonePill, { backgroundColor: tone.pillBg }]}>
          <Text style={[styles.tonePillText, { color: tone.pillText }]}>{tone.label}</Text>
        </View>
      </View>
      <View style={styles.heroNumberRow}>
        {distanceMeters != null ? (
          <AnimatedNumber
            value={Math.round(distanceMeters)}
            duration={900}
            animateFromZero={!reduceMotion}
            style={[styles.heroNumber, { color: tone.heroColor }]}
            formatter={(m) => (m / 1000).toFixed(2)}
          />
        ) : (
          <Text style={[styles.heroNumber, { color: tone.heroColor }]}>--</Text>
        )}
        <Text style={styles.heroUnit}>กม.</Text>
      </View>
      {subParts.length > 0 && <Text style={styles.heroSub}>{subParts.join(' · ')}</Text>}
    </Reveal>
  )
}
