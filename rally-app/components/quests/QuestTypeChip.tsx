import { StyleSheet, Text, View } from 'react-native'
import { Radius, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { questTypeLabel } from '@/lib/daily-quests/questPresentation'
import type { QuestEvidenceMode } from '@/lib/daily-quests/questTypes'

type QuestTypeChipProps =
  | { evidenceMode: QuestEvidenceMode; label?: undefined }
  | { label: string; evidenceMode?: undefined }

export function QuestTypeChip(props: QuestTypeChipProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const text = props.label ?? questTypeLabel(props.evidenceMode!)
  return (
    <View style={styles.chip}>
      <Text style={styles.text}>{text}</Text>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    chip: {
      alignSelf: 'flex-start',
      borderRadius: Radius.pill,
      backgroundColor: theme.surfaceStrong,
      borderWidth: 1,
      borderColor: theme.line,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    text: { color: theme.inkSoft, fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
  })
}
