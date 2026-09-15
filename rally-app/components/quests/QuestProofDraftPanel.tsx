import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { ProofPicker } from '@/components/match/ProofPicker'
import { Radius, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import type { DailyQuestItem } from '@/lib/daily-quests/questTypes'
import type { LocalProofAsset } from '@/lib/match/proofUploadService'

type QuestProofDraftPanelProps = {
  quest: DailyQuestItem
  assets: LocalProofAsset[]
  onChange: (assets: LocalProofAsset[]) => void
}

export function QuestProofDraftPanel({ quest, assets, onChange }: QuestProofDraftPanelProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const allowVideos = quest.evidenceMode === 'video_proof'
  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <MaterialCommunityIcons
          name={allowVideos ? 'video-outline' : 'file-document-edit-outline'}
          size={18}
          color={theme.economy}
        />
        <Text style={styles.title}>{allowVideos ? 'Video proof' : 'Proof draft'}</Text>
      </View>
      <ProofPicker
        assets={assets}
        onChange={onChange}
        max={3}
        allowVideos={allowVideos}
        label={allowVideos ? 'proof videos' : 'proof files'}
      />
      <View style={styles.action}>
        <Text style={styles.status}>Proof review pending</Text>
      </View>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    panel: {
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.arcadePanelAlt,
      padding: 14,
      gap: 12,
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { color: theme.ink, fontSize: 15, fontWeight: '900' },
    action: {
      minHeight: 40,
      borderRadius: Radius.lg,
      backgroundColor: theme.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    status: { color: theme.muted, fontSize: 12, fontWeight: '900' },
  })
}
