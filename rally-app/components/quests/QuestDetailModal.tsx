import { useEffect, useRef } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { BasketballCourtModeCard } from '@/components/home/BasketballCourtModeCard'
import { DailyMissionCard } from '@/components/home/DailyMissionCard'
import { PressableScale } from '@/components/motion/PressableScale'
import { QuestProofDraftPanel } from '@/components/quests/QuestProofDraftPanel'
import { QuestTypeChip } from '@/components/quests/QuestTypeChip'
import { onAccent, Radius, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import type { useBasketballCourtMode } from '@/hooks/useBasketballCourtMode'
import type { useDailyMissionSync } from '@/hooks/useDailyMissionSync'
import { questAccentColor } from '@/lib/daily-quests/questPresentation'
import type { DailyQuestItem } from '@/lib/daily-quests/questTypes'
import type { LocalProofAsset } from '@/lib/match/proofUploadService'

type QuestDetailModalProps = {
  quest: DailyQuestItem | null
  onClose: () => void
  dailyMission: ReturnType<typeof useDailyMissionSync>
  basketballCourtMode: ReturnType<typeof useBasketballCourtMode>
  proofAssets: LocalProofAsset[]
  onProofChange: (assets: LocalProofAsset[]) => void
}

export function QuestDetailModal({
  quest,
  onClose,
  dailyMission,
  basketballCourtMode,
  proofAssets,
  onProofChange,
}: QuestDetailModalProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const accent = quest ? questAccentColor(quest.activity) : theme.orange

  // Auto-sync the daily walk mission as soon as its detail opens — no button tap.
  // Re-fires once per open (guarded by id) so reopening pulls fresh device data.
  const lastAutoSyncedId = useRef<string | null>(null)
  const questId = quest?.id
  const questAction = quest?.action
  const mutateDailyMission = dailyMission.mutate
  useEffect(() => {
    if (questAction !== 'sync_daily_mission' || !questId) {
      lastAutoSyncedId.current = null
      return
    }
    if (lastAutoSyncedId.current === questId) return
    lastAutoSyncedId.current = questId
    mutateDailyMission()
  }, [questId, questAction, mutateDailyMission])

  return (
    <Modal
      transparent
      visible={!!quest}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable style={styles.backdrop} accessibilityLabel="Close quest details" onPress={onClose} />
        {quest && (
          <View style={styles.sheet}>
            <View style={styles.topBar}>
              <PressableScale style={styles.close} accessibilityLabel="Close quest details" onPress={onClose}>
                <MaterialCommunityIcons name="close" size={20} color={theme.ink} />
              </PressableScale>
            </View>
            <View style={[styles.panel, quest.action === 'court_mode' && styles.panelCompact]}>
              <View style={styles.header}>
                <View style={[styles.icon, { backgroundColor: accent }]}>
                  <MaterialCommunityIcons
                    name={quest.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                    size={20}
                    color={onAccent(accent)}
                  />
                </View>
                <View style={styles.copy}>
                  <Text style={styles.title}>{quest.title}</Text>
                  <QuestTypeChip evidenceMode={quest.evidenceMode} />
                </View>
                <View style={styles.pointsPill}>
                  <Text style={styles.pointsText}>+{quest.rewardPoints}</Text>
                </View>
              </View>

              {quest.action === 'sync_daily_mission' && (
                <DailyMissionCard
                  result={dailyMission.data ?? null}
                  isPending={dailyMission.isPending}
                  error={dailyMission.error instanceof Error ? dailyMission.error : null}
                  onSync={() => dailyMission.mutate()}
                />
              )}

              {quest.action === 'court_mode' && (
                <BasketballCourtModeCard
                  phase={basketballCourtMode.phase}
                  elapsedSeconds={basketballCourtMode.elapsedSeconds}
                  remainingSeconds={basketballCourtMode.remainingSeconds}
                  canCancel={basketballCourtMode.canCancel}
                  result={basketballCourtMode.result}
                  isSyncing={basketballCourtMode.isSyncing}
                  error={basketballCourtMode.error}
                  start={basketballCourtMode.start}
                  cancel={basketballCourtMode.cancel}
                  sync={basketballCourtMode.sync}
                  reset={basketballCourtMode.reset}
                  compact
                  showHeader={false}
                />
              )}

              {(quest.action === 'video_submission' || quest.action === 'manual_submission') && (
                <QuestProofDraftPanel quest={quest} assets={proofAssets} onChange={onProofChange} />
              )}
            </View>
          </View>
        )}
      </View>
    </Modal>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    root: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(13,13,13,0.58)',
      paddingHorizontal: 18,
      paddingVertical: 54,
    },
    backdrop: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    sheet: {
      width: '100%',
      maxHeight: '90%',
      borderRadius: Radius.xxl,
      borderWidth: 3,
      borderColor: theme.arcadeCabinetEdge,
      backgroundColor: theme.arcadePanelAlt,
      padding: 10,
      shadowColor: theme.arcadeShadow,
      shadowOpacity: 0.32,
      shadowRadius: 0,
      shadowOffset: { width: 5, height: 7 },
    },
    topBar: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 4 },
    close: {
      width: 40,
      height: 40,
      borderRadius: Radius.lg,
      borderWidth: 2,
      borderColor: theme.arcadeCabinetEdge,
      backgroundColor: theme.panelBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    panel: {
      borderRadius: Radius.xl,
      borderWidth: 2,
      borderColor: theme.arcadeCabinetEdge,
      backgroundColor: theme.panelBg,
      padding: 14,
      gap: 14,
      shadowColor: theme.arcadeShadow,
      shadowOpacity: 0.12,
      shadowRadius: 0,
      shadowOffset: { width: 3, height: 5 },
    },
    panelCompact: { padding: 10, gap: 10 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    icon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    copy: { flex: 1, minWidth: 0, gap: 4 },
    title: { color: theme.ink, fontSize: 18, lineHeight: 22, fontWeight: '900', fontStyle: 'italic' },
    pointsPill: {
      borderRadius: Radius.pill,
      backgroundColor: theme.arcadeCabinet,
      borderWidth: 1,
      borderColor: theme.economy,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    pointsText: { color: theme.economy, fontSize: 13, fontWeight: '900', fontVariant: ['tabular-nums'] },
  })
}
