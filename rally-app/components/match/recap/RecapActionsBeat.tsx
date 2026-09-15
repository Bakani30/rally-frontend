import { Text } from 'react-native'
import { useReducedMotion } from 'react-native-reanimated'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { Reveal } from '@/components/motion/Reveal'
import { useSportTheme } from '@/hooks/useAppTheme'
import { createRecapMomentStyles, RECAP_ORANGE, RECAP_NAVY, RECAP_INK_SOFT } from './matchRecapMomentStyles'

type RecapActionsBeatProps = {
  accent: string
  onExit: () => void
  onRematch: () => void
  rematchPending?: boolean
  onViewAnalysis?: () => void
  onSaveImage: () => void
  isSaving?: boolean
}

export function RecapActionsBeat({
  accent, onExit, onRematch, rematchPending, onViewAnalysis, onSaveImage, isSaving,
}: RecapActionsBeatProps) {
  const theme = useSportTheme()
  const styles = createRecapMomentStyles(theme)
  const reduceMotion = useReducedMotion()

  return (
    <Reveal delay={reduceMotion ? 0 : 460} style={styles.actions}>
      <PressableScale style={styles.actionBtn} onPress={onExit}>
        <MaterialCommunityIcons name="exit-to-app" size={16} color={RECAP_INK_SOFT} />
        <Text style={styles.actionText} numberOfLines={1}>ออก</Text>
      </PressableScale>
      <PressableScale style={[styles.actionBtn, isSaving && { opacity: 0.6 }]} onPress={onSaveImage} disabled={isSaving}>
        <MaterialCommunityIcons name="content-save-outline" size={16} color={RECAP_INK_SOFT} />
        <Text style={styles.actionText} numberOfLines={1}>{isSaving ? 'กำลังบันทึก…' : 'บันทึกภาพ'}</Text>
      </PressableScale>
      <PressableScale
        style={[styles.actionBtn, styles.actionPrimary, { backgroundColor: accent }, rematchPending && { opacity: 0.6 }]}
        onPress={onRematch}
        disabled={rematchPending}
      >
        <MaterialCommunityIcons name="restart" size={16} color={RECAP_NAVY} />
        <Text style={styles.actionPrimaryText} numberOfLines={1}>{rematchPending ? 'กำลังส่ง…' : 'Rematch'}</Text>
      </PressableScale>
      {onViewAnalysis && (
        <PressableScale style={[styles.actionBtn, styles.actionPrimary, { backgroundColor: RECAP_ORANGE }]} onPress={onViewAnalysis}>
          <MaterialCommunityIcons name="chart-box-outline" size={16} color={RECAP_NAVY} />
          <Text style={styles.actionPrimaryText} numberOfLines={1}>ดูวิเคราะห์</Text>
        </PressableScale>
      )}
    </Reveal>
  )
}
