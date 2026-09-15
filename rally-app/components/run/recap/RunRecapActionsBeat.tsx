import { Pressable, Text, View } from 'react-native'
import { useReducedMotion } from 'react-native-reanimated'
import { Reveal } from '@/components/motion/Reveal'
import type { RunRecapColors, RunRecapStyles } from './runRecapMomentStyles'

type RunRecapActionsBeatProps = {
  colors: RunRecapColors
  styles: RunRecapStyles
  onViewDetails: () => void
  onShare: () => void
  onHome: () => void
}

export function RunRecapActionsBeat({ colors, styles, onViewDetails, onShare, onHome }: RunRecapActionsBeatProps) {
  const reduceMotion = useReducedMotion()
  return (
    <Reveal delay={reduceMotion ? 0 : 580} style={styles.actionsBeat}>
      <Pressable
        style={[styles.primaryButton, { backgroundColor: colors.accent }]}
        onPress={onViewDetails}
        accessibilityRole="button"
        accessibilityLabel="ดูรายละเอียดการวิ่ง"
      >
        <Text style={[styles.primaryButtonText, { color: colors.onAccent }]}>ดูรายละเอียด</Text>
      </Pressable>
      <View style={styles.secondaryRow}>
        <Pressable
          style={[styles.secondaryButton, { borderColor: colors.secondaryBorder }]}
          onPress={onShare}
          accessibilityRole="button"
          accessibilityLabel="แชร์การวิ่ง"
        >
          <Text style={[styles.secondaryButtonText, { color: colors.secondaryText }]}>แชร์</Text>
        </Pressable>
        <Pressable
          style={[styles.secondaryButton, { borderColor: colors.secondaryBorder }]}
          onPress={onHome}
          accessibilityRole="button"
          accessibilityLabel="กลับหน้าหลัก"
        >
          <Text style={[styles.secondaryButtonText, { color: colors.secondaryText }]}>หน้าหลัก</Text>
        </Pressable>
      </View>
    </Reveal>
  )
}
