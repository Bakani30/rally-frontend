import * as React from 'react'
import { Alert, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { PressableScale } from '@/components/motion/PressableScale'
import { OnAccent, Radius, Spacing, type SportPalette } from '@/constants/theme'
import {
  createArenaTeamRetireConfirmation,
  getArenaTeamContinuationActionScope,
  getArenaTeamContinuationPresentation,
  type ArenaTeamContinuationCurrentAction,
} from '@/lib/arena-sessions/arenaTeamContinuation'
import type {
  ArenaTeamParticipationDecisionInput,
  ArenaTeamParticipationSnapshot,
} from '@/types/arenaSession'

export type ArenaTeamContinuationCardProps = {
  arenaId: string
  actorId?: string
  participation: ArenaTeamParticipationSnapshot
  theme: SportPalette
  actionPending?: boolean
  onDecision?: (input: ArenaTeamParticipationDecisionInput) => void
}

export function ArenaTeamContinuationCard({
  arenaId,
  actorId,
  participation,
  theme,
  actionPending = false,
  onDecision,
}: ArenaTeamContinuationCardProps) {
  const presentation = getArenaTeamContinuationPresentation(participation)
  const scope = getArenaTeamContinuationActionScope(arenaId, actorId, participation)
  const styles = createStyles(theme)
  const canContinue = presentation.kind === 'captain_decision' && presentation.canContinue
  const canRetire = (presentation.kind === 'captain_decision' || presentation.kind === 'captain_waiting')
    && presentation.canRetire
  const latestAction = React.useRef<ArenaTeamContinuationCurrentAction>({
    scope,
    active: true,
    canRetire,
    actionPending,
    onDecision,
  })
  latestAction.current = { scope, active: true, canRetire, actionPending, onDecision }
  React.useEffect(() => () => {
    latestAction.current = {
      scope: null,
      active: false,
      canRetire: false,
      actionPending: true,
      onDecision: undefined,
    }
  }, [])

  if (presentation.kind === 'hidden') return null

  function requestRetire() {
    if (!scope || !canRetire || actionPending || !onDecision) return
    Alert.alert(
      'ถอนทีมจากรอบถัดไป?',
      'ทีมจะไม่ถูกจับคู่ในรอบถัดไป การตัดสินใจนี้ทำโดยกัปตันทีม',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ถอนทีม',
          style: 'destructive',
          onPress: createArenaTeamRetireConfirmation(scope, () => latestAction.current),
        },
      ],
    )
  }

  const isCaptain = presentation.kind === 'captain_decision'
    || presentation.kind === 'captain_waiting'
  const isWaiting = presentation.kind === 'captain_waiting'
    || presentation.kind === 'teammate_waiting'
  return (
    <View style={[styles.card, isCaptain ? styles.captainCard : styles.teammateCard]}>
      <View style={styles.heading}>
        <View style={[styles.icon, isCaptain ? styles.iconCaptain : styles.iconTeammate]}>
          <MaterialCommunityIcons
            name={isCaptain ? 'account-star-outline' : 'account-clock-outline'}
            size={20}
            color={isCaptain ? theme.orange : theme.muted}
          />
        </View>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>{isCaptain ? 'กัปตันทีม' : 'สถานะทีม'}</Text>
          <Text style={styles.title}>
            {presentation.kind === 'captain_decision'
              ? 'ตัดสินใจสำหรับรอบถัดไป'
              : presentation.kind === 'teammate_decision'
                ? 'รอกัปตันตัดสินใจ'
                : presentation.kind === 'captain_waiting'
                  ? 'ทีมยืนยันเล่นต่อแล้ว'
                  : 'รอจับคู่ทีมคู่แข่ง'}
          </Text>
        </View>
      </View>

      <Text style={styles.detail}>
        {presentation.kind === 'captain_decision'
          ? 'เลือกให้ทีมเล่นต่อ หรือถอนทีมออกจากรอบถัดไป'
          : presentation.kind === 'teammate_decision'
            ? 'กัปตันทีมจะตัดสินใจแทนทีม'
            : isWaiting
              ? 'ระบบกำลังรอจับคู่รอบถัดไป'
              : ''}
      </Text>

      {isCaptain ? (
        <View style={styles.actions}>
          {canContinue ? (
            <PressableScale
              style={[styles.continueButton, actionPending && styles.disabled]}
              disabled={actionPending || !onDecision || !scope}
              accessibilityRole="button"
              accessibilityLabel="เล่นต่อในรอบถัดไป"
              accessibilityState={{ disabled: actionPending || !onDecision || !scope, busy: actionPending }}
              onPress={() => scope && onDecision?.({
                arenaId: scope.arenaId,
                participationCycleId: scope.participationCycleId,
                expectedRevision: scope.expectedRevision,
                decision: 'continue',
              })}
            >
              <Text style={styles.continueText}>{actionPending ? 'กำลังบันทึก…' : 'เล่นต่อ'}</Text>
            </PressableScale>
          ) : null}
          {canRetire ? (
            <PressableScale
              style={[styles.retireButton, actionPending && styles.disabled]}
              disabled={actionPending || !onDecision || !scope}
              accessibilityRole="button"
              accessibilityLabel="ถอนทีมจากรอบถัดไป"
              accessibilityState={{ disabled: actionPending || !onDecision || !scope, busy: actionPending }}
              onPress={requestRetire}
            >
              <Text style={styles.retireText}>{actionPending ? 'กำลังบันทึก…' : 'ถอนทีม'}</Text>
            </PressableScale>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    card: { borderRadius: Radius.xl, borderWidth: 1, padding: 14, gap: Spacing.sm },
    captainCard: { borderColor: theme.orange, backgroundColor: theme.orangeSoft },
    teammateCard: { borderColor: theme.line, backgroundColor: theme.surface },
    heading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    icon: { width: 42, height: 42, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
    iconCaptain: { backgroundColor: theme.bgElevated },
    iconTeammate: { backgroundColor: theme.surfaceStrong },
    copy: { flex: 1, minWidth: 0 },
    eyebrow: { color: theme.inkSoft, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
    title: { color: theme.ink, fontSize: 16, lineHeight: 21, fontWeight: '900', marginTop: 1 },
    detail: { color: theme.muted, fontSize: 12, lineHeight: 18, fontWeight: '700' },
    actions: { flexDirection: 'row', gap: 8 },
    continueButton: { flex: 1, minHeight: 48, borderRadius: Radius.lg, backgroundColor: theme.orange, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
    continueText: { color: OnAccent.onLight, fontSize: 13, fontWeight: '900' },
    retireButton: { flex: 1, minHeight: 48, borderRadius: Radius.lg, borderWidth: 1, borderColor: theme.risk, backgroundColor: theme.riskSoft, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
    retireText: { color: theme.risk, fontSize: 13, fontWeight: '900' },
    disabled: { opacity: 0.5 },
  })
}
