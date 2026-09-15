import { useMemo, useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AnimatedNumber } from '@/components/motion/AnimatedNumber'
import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useI18n, type Translator } from '@/hooks/useI18n'
import { refereeMatchDictionary } from '@/lib/i18n/dictionaries/refereeMatch'
import {
  getAlphaRefereeDraftScoreBySide,
  getAlphaRefereePlayerStatDraft,
  getAlphaRefereePlayerStatDrafts,
  getLatestAlphaRefereeLiveScoreDraft,
  getParticipantDisplayName,
  type AlphaRefereeDutyState,
} from '@/lib/match/matchRules'
import { longRangePointValueForTeamSize } from '@/lib/match/basketballStatSheetControls'
import type { RefereePlayerStatInput } from '@/lib/match/alphaRefereeService'
import type { MatchParticipant, MatchWithRelations, Side } from '@/types/match'
import { RefereePlayerStatSheet } from './RefereePlayerStatSheet'

type RefereeMatchTranslator = Translator<keyof typeof refereeMatchDictionary>

type RefereeLiveControlPanelProps = {
  match: MatchWithRelations
  state: AlphaRefereeDutyState
  note: string
  savePending: boolean
  submitPending: boolean
  onChangeNote: (note: string) => void
  onOpenHub: () => void
  onSavePlayerStat: (playerUserId: string, stats: RefereePlayerStatInput) => Promise<void> | void
  onSubmitFinal: () => void
}

export function RefereeLiveControlPanel({
  match,
  state,
  note,
  savePending,
  submitPending,
  onChangeNote,
  onOpenHub,
  onSavePlayerStat,
  onSubmitFinal,
}: RefereeLiveControlPanelProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { t } = useI18n(refereeMatchDictionary)
  const longRangePointValue = longRangePointValueForTeamSize(match.team_size_per_side)
  const longShotLabel = longRangePointValue === 3 ? '3PM' : '2PT'
  const [selectedPlayer, setSelectedPlayer] = useState<MatchParticipant | null>(null)
  const draft = getLatestAlphaRefereeLiveScoreDraft(match)
  const playerStats = getAlphaRefereePlayerStatDrafts(match)
  const scores = getAlphaRefereeDraftScoreBySide(match)
  const activeParticipants = useMemo(
    () => (match.match_participants ?? []).filter((participant) => participant.is_active !== false),
    [match.match_participants],
  )
  const sideA = activeParticipants.filter((participant) => participant.side === 0)
  const sideB = activeParticipants.filter((participant) => participant.side === 1)
  const canEdit = (
    state === 'needs_result' ||
    state === 'live_draft' ||
    state === 'correction_requested'
  ) && match.activity_type === 'basketball'
  const canSubmitFinal = canEdit && playerStats.length > 0
  const liveStateMeta = LIVE_STATE_META(theme, longShotLabel, t)
  const stateMeta = liveStateMeta[state] ?? liveStateMeta.needs_result

  if (match.activity_type !== 'basketball') return null
  if (!canEdit && state === 'closed') return null

  const selectedDraft = selectedPlayer ? getAlphaRefereePlayerStatDraft(match, selectedPlayer.user_id) : null

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: stateMeta.iconBg }]}>
          <MaterialCommunityIcons name={stateMeta.icon} size={19} color={stateMeta.fg} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={[styles.kicker, { color: stateMeta.fg }]}>{t('liveKicker')}</Text>
          <Text style={styles.title}>{stateMeta.title}</Text>
          <Text style={styles.subtitle}>{stateMeta.subtitle}</Text>
        </View>
        <PressableScale
          style={styles.hubButton}
          onPress={onOpenHub}
          accessibilityRole="button"
          accessibilityLabel={t('openRefereeBoard')}
        >
          <MaterialCommunityIcons name="clipboard-list-outline" size={17} color={theme.inkSoft} />
        </PressableScale>
      </View>

      {draft?.status === 'correction_requested' && draft.correction_note ? (
        <View style={styles.correctionBanner}>
          <MaterialCommunityIcons name="pencil-circle-outline" size={18} color={theme.amber} />
          <View style={styles.correctionCopy}>
            <Text style={styles.correctionTitle}>{t('liveCorrectionTitle')}</Text>
            <Text style={styles.correctionNote}>{draft.correction_note}</Text>
          </View>
        </View>
      ) : null}

      {!canEdit ? (
        <View style={[styles.stateBanner, { backgroundColor: stateMeta.bg, borderColor: stateMeta.border }]}>
          <MaterialCommunityIcons name={stateMeta.icon} size={18} color={stateMeta.fg} />
          <Text style={[styles.stateBannerText, { color: stateMeta.fg }]}>{stateMeta.status}</Text>
        </View>
      ) : null}

      <View style={styles.scoreboard}>
        <ScoreBlock label={t('sideLabel', { side: 'A' })} score={scores[0]} color={theme.red} styles={styles} />
        <Text style={styles.vs}>VS</Text>
        <ScoreBlock label={t('sideLabel', { side: 'B' })} score={scores[1]} color={theme.blue} styles={styles} />
      </View>

      <View style={styles.sides}>
        <SideColumn
          side={0}
          participants={sideA}
          disabled={!canEdit || savePending || submitPending}
          onSelect={setSelectedPlayer}
          match={match}
          longShotLabel={longShotLabel}
          theme={theme}
          styles={styles}
          t={t}
        />
        <SideColumn
          side={1}
          participants={sideB}
          disabled={!canEdit || savePending || submitPending}
          onSelect={setSelectedPlayer}
          match={match}
          longShotLabel={longShotLabel}
          theme={theme}
          styles={styles}
          t={t}
        />
      </View>

      {canEdit ? (
        <>
          <View style={styles.noteBlock}>
            <Text style={styles.noteLabel}>{t('refereeNote')}</Text>
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={onChangeNote}
              placeholder={t('basketballNotePlaceholder')}
              placeholderTextColor={theme.mutedSoft}
              multiline
              maxLength={800}
              editable={!submitPending}
              selectTextOnFocus
            />
          </View>
          {playerStats.length === 0 ? (
            <View style={styles.submitHintRow}>
              <MaterialCommunityIcons name="gesture-tap" size={15} color={theme.amber} />
              <Text style={styles.submitHintText}>{t('statsRequired')}</Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            <PressableScale
              style={[styles.submitButton, (!canSubmitFinal || submitPending) && styles.disabledButton]}
              onPress={onSubmitFinal}
              disabled={!canSubmitFinal || submitPending}
              accessibilityRole="button"
              accessibilityLabel={t('submitForReview')}
            >
              <MaterialCommunityIcons name="send-check" size={17} color={theme.bg} />
              <Text style={styles.submitText}>
                {submitPending ? t('sending') : t('submitForReview')}
              </Text>
            </PressableScale>
          </View>
        </>
      ) : (
        <View style={styles.readOnlyNote}>
          <Text style={styles.readOnlyText}>{stateMeta.readOnlyText}</Text>
        </View>
      )}

      <RefereePlayerStatSheet
        visible={!!selectedPlayer}
        participant={selectedPlayer}
        draft={selectedDraft}
        pending={savePending}
        longRangePointValue={longRangePointValue}
        onClose={() => setSelectedPlayer(null)}
        onSave={async (stats) => {
          if (!selectedPlayer) return
          await onSavePlayerStat(selectedPlayer.user_id, stats)
          setSelectedPlayer(null)
        }}
      />
    </View>
  )
}

function LIVE_STATE_META(
  theme: SportPalette,
  longShotLabel: string,
  t: RefereeMatchTranslator,
): Record<
  AlphaRefereeDutyState,
  {
    title: string
    subtitle: string
    status: string
    readOnlyText: string
    fg: string
    bg: string
    border: string
    iconBg: string
    icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']
  }
> {
  return {
    not_ready: {
      title: t('liveNotReadyTitle'),
      subtitle: t('liveNotReadySubtitle'),
      status: t('liveNotReadyStatus'),
      readOnlyText: t('liveNotReadyReadOnly'),
      fg: theme.amber,
      bg: theme.amberSoft,
      border: `${theme.amber}55`,
      iconBg: theme.bg,
      icon: 'timer-sand',
    },
    needs_result: {
      title: t('liveNeedsResultTitle'),
      subtitle: t('liveNeedsResultSubtitle', { longShotLabel }),
      status: t('liveNeedsResultStatus'),
      readOnlyText: t('liveNeedsResultReadOnly'),
      fg: theme.green,
      bg: theme.greenSoft,
      border: `${theme.green}55`,
      iconBg: theme.greenSoft,
      icon: 'whistle-outline',
    },
    live_draft: {
      title: t('liveDraftTitle'),
      subtitle: t('liveDraftSubtitle'),
      status: t('liveDraftStatus'),
      readOnlyText: t('liveDraftReadOnly'),
      fg: theme.green,
      bg: theme.greenSoft,
      border: `${theme.green}55`,
      iconBg: theme.greenSoft,
      icon: 'scoreboard-outline',
    },
    correction_requested: {
      title: t('liveCorrectionTitle'),
      subtitle: t('liveCorrectionSubtitle'),
      status: t('liveCorrectionStatus'),
      readOnlyText: t('liveCorrectionReadOnly'),
      fg: theme.amber,
      bg: theme.amberSoft,
      border: `${theme.amber}55`,
      iconBg: theme.bg,
      icon: 'pencil-circle-outline',
    },
    waiting_players: {
      title: t('liveWaitingTitle'),
      subtitle: t('liveWaitingSubtitle'),
      status: t('liveWaitingStatus'),
      readOnlyText: t('liveWaitingReadOnly'),
      fg: theme.amber,
      bg: theme.amberSoft,
      border: `${theme.amber}55`,
      iconBg: theme.bg,
      icon: 'account-clock-outline',
    },
    cleared: {
      title: t('liveClearedTitle'),
      subtitle: t('liveClearedSubtitle'),
      status: t('liveClearedStatus'),
      readOnlyText: t('liveClearedReadOnly'),
      fg: theme.green,
      bg: theme.greenSoft,
      border: `${theme.green}55`,
      iconBg: theme.greenSoft,
      icon: 'shield-check',
    },
    superseded: {
      title: t('liveSupersededTitle'),
      subtitle: t('liveSupersededSubtitle'),
      status: t('liveSupersededStatus'),
      readOnlyText: t('liveSupersededReadOnly'),
      fg: theme.red,
      bg: theme.redSoft,
      border: `${theme.red}55`,
      iconBg: theme.bg,
      icon: 'shield-alert-outline',
    },
    closed: {
      title: t('liveClosedTitle'),
      subtitle: t('liveClosedSubtitle'),
      status: t('liveClosedStatus'),
      readOnlyText: t('liveClosedReadOnly'),
      fg: theme.inkSoft,
      bg: theme.surface,
      border: theme.line,
      iconBg: theme.surface,
      icon: 'lock-outline',
    },
  }
}

function ScoreBlock({
  label,
  score,
  color,
  styles,
}: {
  label: string
  score: number
  color: string
  styles: ReturnType<typeof createStyles>
}) {
  return (
    <View style={[styles.scoreBlock, { borderColor: `${color}55`, backgroundColor: `${color}16` }]}>
      <Text style={[styles.scoreLabel, { color }]}>{label}</Text>
      <AnimatedNumber value={score} style={styles.scoreValue} />
    </View>
  )
}

function SideColumn({
  side,
  participants,
  disabled,
  onSelect,
  match,
  longShotLabel,
  theme,
  styles,
  t,
}: {
  side: Side
  participants: MatchParticipant[]
  disabled: boolean
  onSelect: (participant: MatchParticipant) => void
  match: MatchWithRelations
  longShotLabel: string
  theme: SportPalette
  styles: ReturnType<typeof createStyles>
  t: RefereeMatchTranslator
}) {
  const color = side === 0 ? theme.red : theme.blue
  return (
    <View style={styles.sideColumn}>
      <Text style={[styles.sideTitle, { color }]}>{t('sideLabel', { side: side === 0 ? 'A' : 'B' })}</Text>
      {participants.map((participant) => {
        const stat = getAlphaRefereePlayerStatDraft(match, participant.user_id)
        const displayName = getParticipantDisplayName(participant)
        const statLabel = stat
          ? `${stat.points} PTS, ${stat.rebounds} REB, ${stat.assists} AST, ${stat.blocks} BLK, ${stat.three_pointers_made} ${longShotLabel}`
          : t('noStats')
        return (
          <PressableScale
            key={participant.user_id}
            style={[styles.playerRow, disabled && styles.playerRowDisabled]}
            onPress={() => onSelect(participant)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={t('editPlayerStats', { name: displayName, stats: statLabel })}
          >
            <View style={[styles.avatarDot, { backgroundColor: `${color}24`, borderColor: `${color}66` }]}>
              <Text style={[styles.avatarText, { color }]}>
                {displayName.slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View style={styles.playerCopy}>
              <Text style={styles.playerName} numberOfLines={1}>{displayName}</Text>
              <Text style={styles.playerStats} numberOfLines={1}>
                {statLabel.replace(/, /g, ' · ')}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-up" size={18} color={theme.muted} />
          </PressableScale>
        )
      })}
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    card: {
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: `${theme.orange}44`,
      backgroundColor: theme.bg,
      padding: Spacing.lg,
      gap: Spacing.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    iconBox: {
      width: 42,
      height: 42,
      borderRadius: Radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.orangeSoft,
    },
    headerCopy: { flex: 1, minWidth: 0 },
    kicker: {
      color: theme.orange,
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 1,
    },
    title: {
      color: theme.ink,
      fontSize: 17,
      fontWeight: '900',
    },
    subtitle: {
      color: theme.muted,
      fontSize: 12,
      fontWeight: '700',
      marginTop: 2,
    },
    hubButton: {
      width: 44,
      height: 44,
      borderRadius: Radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surface,
    },
    correctionBanner: {
      flexDirection: 'row',
      gap: Spacing.sm,
      borderRadius: Radius.lg,
      backgroundColor: theme.amberSoft,
      borderWidth: 1,
      borderColor: `${theme.amber}55`,
      padding: Spacing.md,
    },
    correctionCopy: { flex: 1 },
    correctionTitle: {
      color: theme.ink,
      fontSize: 13,
      fontWeight: '900',
    },
    correctionNote: {
      color: theme.inkSoft,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 2,
    },
    stateBanner: {
      minHeight: 42,
      borderRadius: Radius.lg,
      borderWidth: 1,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    stateBannerText: {
      flex: 1,
      fontSize: 12,
      fontWeight: '900',
    },
    scoreboard: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: Spacing.sm,
    },
    scoreBlock: {
      flex: 1,
      borderRadius: Radius.xl,
      borderWidth: 1,
      padding: Spacing.md,
      alignItems: 'center',
    },
    scoreLabel: {
      fontSize: 12,
      fontWeight: '900',
    },
    scoreValue: {
      color: theme.ink,
      fontSize: 36,
      fontWeight: '900',
      lineHeight: 42,
    },
    vs: {
      alignSelf: 'center',
      color: theme.muted,
      fontSize: 11,
      fontWeight: '900',
    },
    sides: {
      gap: Spacing.sm,
    },
    sideColumn: {
      gap: Spacing.xs,
    },
    sideTitle: {
      fontSize: 12,
      fontWeight: '900',
    },
    playerRow: {
      minHeight: 58,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface,
      paddingHorizontal: Spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    playerRowDisabled: {
      opacity: 0.64,
    },
    avatarDot: {
      width: 36,
      height: 36,
      borderRadius: Radius.pill,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontSize: 13,
      fontWeight: '900',
    },
    playerCopy: { flex: 1, minWidth: 0 },
    playerName: {
      color: theme.ink,
      fontSize: 13,
      fontWeight: '900',
    },
    playerStats: {
      color: theme.muted,
      fontSize: 11,
      fontWeight: '700',
      marginTop: 2,
    },
    noteBlock: {
      gap: Spacing.xs,
    },
    noteLabel: {
      color: theme.inkSoft,
      fontSize: 12,
      fontWeight: '900',
    },
    noteInput: {
      minHeight: 76,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface,
      color: theme.ink,
      padding: Spacing.md,
      fontSize: 14,
      fontWeight: '700',
      textAlignVertical: 'top',
    },
    submitHintRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: `${theme.amber}44`,
      backgroundColor: theme.amberSoft,
      padding: Spacing.sm,
    },
    submitHintText: {
      flex: 1,
      color: theme.inkSoft,
      fontSize: 12,
      fontWeight: '800',
    },
    readOnlyNote: {
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface,
      padding: Spacing.md,
    },
    readOnlyText: {
      color: theme.inkSoft,
      fontSize: 12,
      lineHeight: 18,
      fontWeight: '800',
    },
    actions: {
      flexDirection: 'row',
    },
    submitButton: {
      flex: 1,
      minHeight: 52,
      borderRadius: Radius.pill,
      backgroundColor: theme.orange,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.xs,
    },
    disabledButton: {
      opacity: 0.62,
    },
    submitText: {
      color: theme.bg,
      fontSize: 14,
      fontWeight: '900',
    },
  })
}
