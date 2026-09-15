import { StyleSheet, View } from 'react-native'
import { ShineSweep } from '@/components/motion/ShineSweep'

type PodiumBarShineProps = {
  isFirst: boolean
  animated: boolean
  trigger: number
  contentDelay: number
}

/**
 * Arcade shine clipped to a podium bar's rounded shape. Lives in its own clip
 * view so the parent bar keeps its drop shadow (overflow:hidden on a shadowed
 * view drops the shadow on iOS). The champion loops; 2nd/3rd sweep once on entry.
 */
export function PodiumBarShine({ isFirst, animated, trigger, contentDelay }: PodiumBarShineProps) {
  return (
    <View style={[StyleSheet.absoluteFill, styles.clip]}>
      {isFirst ? (
        <ShineSweep
          loop
          delayMs={contentDelay + 300}
          loopDelayMs={3000}
          durationMs={760}
          bandWidth={54}
          color="rgba(255,255,255,0.5)"
        />
      ) : (
        <ShineSweep
          trigger={trigger}
          play={animated}
          delayMs={contentDelay + 150}
          durationMs={680}
          color="rgba(255,255,255,0.34)"
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  clip: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    overflow: 'hidden',
  },
})
