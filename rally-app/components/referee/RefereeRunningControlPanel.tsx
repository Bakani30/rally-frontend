import { useMemo, useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useI18n, type Translator } from '@/hooks/useI18n'
import { refereeMatchDictionary } from '@/lib/i18n/dictionaries/refereeMatch'
import {
  getLatestAlphaRefereeRunningDraft,
  getParticipantDisplayName,
  type AlphaRefereeDutyState,
} from '@/lib/match/matchRules'
import type { RefereeRunningDraftMarkInput } from '@/lib/match/alphaRefereeService'
import type { AlphaRefereeRunningDraft, AlphaRefereeRunningMark, MatchParticipant, MatchWithRelations, Side } from '@/types/match'

type RefereeMatchTranslator = Translator<keyof typeof refereeMatchDictionary>

type RunningDraftResult = {
  draftId: string
  winnerSide: Side | null
  isTie: boolean
}

type RefereeRunningControlPanelProps = {
  match: MatchWithRelations
  state: AlphaRefereeDutyState
  note: string
  savePending: boolean
  submitPending: boolean
  onChangeNote: (note: string) => void
  onOpenHub: () => void
  onSaveMark: (mark: RefereeRunningDraftMarkInput) => Promise<void> | void
  onSubmitFinal: (result: RunningDraftResult) => void
}

export function RefereeRunningControlPanel({
  match,
  state,
  note,
  savePending,
  submitPending,
  onChangeNote,
  onOpenHub,
  onSaveMark,
  onSubmitFinal,
}: RefereeRunningControlPanelProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { t } = useI18n(refereeMatchDictionary)
  const [localStartedAtMs, setLocalStartedAtMs] = useState<number | null>(null)
  const draft = getLatestAlphaRefereeRunningDraft(match)
  const participants = useMemo(
    () => (match.match_participants ?? [])
      .filter((participant) => participant.is_active !== false)
      .sort((a, b) => a.side - b.side || (a.joined_at ?? '').localeCompare(b.joined_at ?? '')),
    [match.match_participants],
  )
  const side0 = participants.find((participant) => participant.side === 0) ?? null
  const side1 = participants.find((participant) => participant.side === 1) ?? null
  const isP0OneVOne = participants.length === 2 && !!side0 && !!side1
  const startBaseMs = getStartBaseMs(draft) ?? localStartedAtMs
  const elapsedMs = startBaseMs == null ? 0 : Math.max(0, Date.now() - startBaseMs)
  const nextCheckpointIndex = nextCheckpoint(draft)
  const result = deriveResult(draft)
  const canEdit = (
    state === 'needs_result' ||
    state === 'live_draft' ||
    state === 'correction_requested'
  ) && match.activity_type === 'running'
  const canSubmit = canEdit && isP0OneVOne && !!result && !savePending && !submitPending

  if (match.activity_type !== 'running') return null
  if (!canEdit && state === 'closed') return null

  async function recordRaceStart() {
    if (!side0 || !side1 || !isP0OneVOne) return
    const now = new Date().toISOString()
    setLocalStartedAtMs(Date.now())
    await onSaveMark({
      type: 'start',
      sideIndex: 0,
      participantUserId: side0.user_id,
      elapsedMs: 0,
      recordedAt: now,
    })
    await onSaveMark({
      type: 'start',
      sideIndex: 1,
      participantUserId: side1.user_id,
      elapsedMs: 0,
      recordedAt: now,
    })
  }

  function recordMark(participant: MatchParticipant, type: 'checkpoint' | 'finish') {
    const checkpointIndex = type === 'checkpoint' ? nextCheckpointIndex : null
    void onSaveMark({
      type,
      sideIndex: participant.side,
      participantUserId: participant.user_id,
      checkpointIndex,
      elapsedMs,
      recordedAt: new Date().toISOString(),
      note: type === 'checkpoint' ? `CP ${checkpointIndex}` : null,
    })
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <MaterialCommunityIcons name="timer-check-outline" size={19} color={theme.green} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.kicker}>{t('runningKicker')}</Text>
          <Text style={styles.title}>{t('runningTitle')}</Text>
          <Text style={styles.subtitle}>{t('runningSubtitle')}</Text>
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

      <View style={styles.timerRow}>
        <View>
          <Text style={styles.timerLabel}>{t('elapsedTime')}</Text>
          <Text style={styles.timerValue}>{formatElapsed(elapsedMs)}</Text>
        </View>
        <PressableScale
          style={[styles.startButton, (!canEdit || savePending || !isP0OneVOne) && styles.disabledButton]}
          onPress={() => void recordRaceStart()}
          disabled={!canEdit || savePending || !isP0OneVOne}
          accessibilityRole="button"
          accessibilityLabel={draft ? t('startRunningAgainA11y') : t('startRunningA11y')}
        >
          <MaterialCommunityIcons name="flag-checkered" size={17} color={theme.bg} />
          <Text style={styles.startButtonText}>{draft ? t('restart') : t('startTimer')}</Text>
        </PressableScale>
      </View>

      {isP0OneVOne ? (
        <View style={styles.runners}>
          {[side0, side1].map((participant) => participant ? (
            <RunnerMarkRow
              key={participant.user_id}
              participant={participant}
              draft={draft}
              disabled={!canEdit || savePending || submitPending || startBaseMs == null}
              onCheckpoint={() => recordMark(participant, 'checkpoint')}
              onFinish={() => recordMark(participant, 'finish')}
              theme={theme}
              styles={styles}
              t={t}
            />
          ) : null)}
        </View>
      ) : (
        <View style={styles.guardBanner}>
          <MaterialCommunityIcons name="account-alert-outline" size={18} color={theme.red} />
          <Text style={styles.guardText}>{t('runningOneVsOneOnly')}</Text>
        </View>
      )}

      <RunningDraftTimeline draft={draft} theme={theme} styles={styles} t={t} />

      {result ? (
        <View style={styles.resultBanner}>
          <MaterialCommunityIcons name="podium" size={17} color={theme.green} />
          <Text style={styles.resultText}>
            {result.isTie
              ? t('runningTie')
              : t('runningSideFinishedFirst', { side: result.winnerSide === 0 ? 'A' : 'B' })}
          </Text>
        </View>
      ) : (
        <View style={styles.resultBannerMuted}>
          <MaterialCommunityIcons name="timer-sand" size={17} color={theme.muted} />
          <Text style={styles.resultMutedText}>{t('runningWaitingFinish')}</Text>
        </View>
      )}

      <View style={styles.noteBlock}>
        <Text style={styles.noteLabel}>{t('refereeNote')}</Text>
        <TextInput
          style={styles.noteInput}
          value={note}
          onChangeText={onChangeNote}
          placeholder={t('runningNotePlaceholder')}
          placeholderTextColor={theme.mutedSoft}
          multiline
          maxLength={800}
          editable={!submitPending}
          selectTextOnFocus
        />
      </View>

      <PressableScale
        style={[styles.submitButton, !canSubmit && styles.disabledButton]}
        onPress={() => result && onSubmitFinal(result)}
        disabled={!canSubmit}
        accessibilityRole="button"
        accessibilityLabel={t('submitRunningForReview')}
      >
        <MaterialCommunityIcons name="send-check" size={17} color={theme.bg} />
        <Text style={styles.submitText}>{submitPending ? t('sending') : t('submitForReview')}</Text>
      </PressableScale>
    </View>
  )
}

function RunnerMarkRow({
  participant,
  draft,
  disabled,
  onCheckpoint,
  onFinish,
  theme,
  styles,
  t,
}: {
  participant: MatchParticipant
  draft: AlphaRefereeRunningDraft | null
  disabled: boolean
  onCheckpoint: () => void
  onFinish: () => void
  theme: SportPalette
  styles: ReturnType<typeof createStyles>
  t: RefereeMatchTranslator
}) {
  const marks = (draft?.marks ?? []).filter((mark) => mark.side_index === participant.side)
  const finish = marks.find((mark) => mark.mark_type === 'finish') ?? null
  const checkpointCount = marks.filter((mark) => mark.mark_type === 'checkpoint').length

  return (
    <View style={styles.runnerRow}>
      <View style={styles.runnerCopy}>
        <Text style={styles.runnerName} numberOfLines={1}>
          {t('runnerName', {
            side: participant.side === 0 ? 'A' : 'B',
            name: getParticipantDisplayName(participant),
          })}
        </Text>
        <Text style={styles.runnerMeta}>
          {t('runnerMeta', {
            count: checkpointCount,
            finish: finish ? t('finishAt', { time: formatElapsed(finish.elapsed_ms) }) : t('notFinished'),
          })}
        </Text>
      </View>
      <View style={styles.markActions}>
        <PressableScale
          style={[styles.iconButton, styles.checkpointButton, disabled && styles.disabledButton]}
          onPress={onCheckpoint}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={t('recordCheckpoint', { side: participant.side === 0 ? 'A' : 'B' })}
        >
          <MaterialCommunityIcons name="map-marker-check-outline" size={18} color={theme.green} />
          <Text style={styles.checkpointButtonText}>CP</Text>
        </PressableScale>
        <PressableScale
          style={[styles.iconButton, styles.finishButton, disabled && styles.disabledButton]}
          onPress={onFinish}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={t('recordFinish', { side: participant.side === 0 ? 'A' : 'B' })}
        >
          <MaterialCommunityIcons name="flag-checkered" size={18} color={theme.red} />
          <Text style={styles.finishButtonText}>{t('finishButton')}</Text>
        </PressableScale>
      </View>
    </View>
  )
}

function RunningDraftTimeline({
  draft,
  theme,
  styles,
  t,
}: {
  draft: AlphaRefereeRunningDraft | null
  theme: SportPalette
  styles: ReturnType<typeof createStyles>
  t: RefereeMatchTranslator
}) {
  const marks = (draft?.marks ?? [])
    .slice()
    .sort((a, b) => a.elapsed_ms - b.elapsed_ms || a.side_index - b.side_index)
    .slice(-4)

  if (marks.length === 0) {
    return (
      <View style={styles.timelineEmpty}>
        <MaterialCommunityIcons name="timeline-clock-outline" size={16} color={theme.muted} />
        <Text style={styles.timelineEmptyText}>{t('noRecordedEvents')}</Text>
      </View>
    )
  }

  return (
    <View style={styles.timeline}>
      <Text style={styles.timelineLabel}>{t('latestEvents')}</Text>
      {marks.map((mark) => (
        <View key={mark.id} style={styles.timelineRow}>
          <View style={styles.timelineSidePill}>
            <Text style={styles.timelineSideText}>{mark.side_index === 0 ? 'A' : 'B'}</Text>
          </View>
          <Text style={styles.timelineType}>
            {formatMarkType(mark, t)}
          </Text>
          <Text style={styles.timelineTime}>{formatElapsed(mark.elapsed_ms)}</Text>
        </View>
      ))}
    </View>
  )
}

function deriveResult(draft: AlphaRefereeRunningDraft | null): RunningDraftResult | null {
  if (!draft) return null
  const side0 = finishMark(draft, 0)
  const side1 = finishMark(draft, 1)
  if (!side0 || !side1) return null
  if (side0.elapsed_ms === side1.elapsed_ms) {
    return { draftId: draft.id, winnerSide: null, isTie: true }
  }
  return {
    draftId: draft.id,
    winnerSide: side0.elapsed_ms < side1.elapsed_ms ? 0 : 1,
    isTie: false,
  }
}

function finishMark(draft: AlphaRefereeRunningDraft, side: Side): AlphaRefereeRunningMark | null {
  return (draft.marks ?? []).find((mark) => mark.side_index === side && mark.mark_type === 'finish') ?? null
}

function getStartBaseMs(draft: AlphaRefereeRunningDraft | null): number | null {
  const start = draft?.marks?.find((mark) => mark.mark_type === 'start') ?? null
  if (!start) return null
  const recordedAt = new Date(start.recorded_at).getTime()
  if (!Number.isFinite(recordedAt)) return null
  return recordedAt - start.elapsed_ms
}

function nextCheckpoint(draft: AlphaRefereeRunningDraft | null): number {
  const indexes = (draft?.marks ?? [])
    .filter((mark) => mark.mark_type === 'checkpoint' && mark.checkpoint_index != null)
    .map((mark) => mark.checkpoint_index ?? 0)
  return Math.max(0, ...indexes) + 1
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const tenths = Math.floor((ms % 1000) / 100)
  return `${minutes}:${String(seconds).padStart(2, '0')}.${tenths}`
}

function formatMarkType(mark: AlphaRefereeRunningMark, t: RefereeMatchTranslator): string {
  if (mark.mark_type === 'start') return t('markStart')
  if (mark.mark_type === 'finish') return t('markFinish')
  return `CP ${mark.checkpoint_index ?? '-'}`
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    card: {
      marginHorizontal: Spacing.lg,
      padding: Spacing.md,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: 'rgba(80, 180, 120, 0.32)',
      backgroundColor: theme.surface,
      gap: Spacing.md,
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    iconBox: {
      width: 36,
      height: 36,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.orangeSoft,
    },
    headerCopy: { flex: 1, minWidth: 0 },
    kicker: { color: theme.orange, fontSize: 11, fontWeight: '900' },
    title: { color: theme.ink, fontSize: 16, lineHeight: 21, fontWeight: '900' },
    subtitle: { color: theme.muted, fontSize: 12, lineHeight: 17, fontWeight: '700' },
    hubButton: {
      width: 34,
      height: 34,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surfaceStrong,
    },
    timerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
    timerLabel: { color: theme.muted, fontSize: 11, fontWeight: '800' },
    timerValue: { color: theme.ink, fontSize: 32, lineHeight: 38, fontWeight: '900', fontVariant: ['tabular-nums'] },
    startButton: {
      minHeight: 44,
      paddingHorizontal: Spacing.md,
      borderRadius: Radius.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.xs,
      backgroundColor: theme.orange,
    },
    startButtonText: { color: theme.bg, fontSize: 13, fontWeight: '900' },
    runners: { gap: Spacing.sm },
    guardBanner: {
      minHeight: 44,
      paddingHorizontal: Spacing.sm,
      borderRadius: Radius.md,
      backgroundColor: theme.redSoft,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    guardText: { flex: 1, color: theme.red, fontSize: 12, lineHeight: 17, fontWeight: '900' },
    runnerRow: {
      minHeight: 62,
      padding: Spacing.sm,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.bg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    runnerCopy: { flex: 1, minWidth: 0 },
    runnerName: { color: theme.ink, fontSize: 14, lineHeight: 18, fontWeight: '900' },
    runnerMeta: { color: theme.muted, fontSize: 12, lineHeight: 17, fontWeight: '700', marginTop: 2 },
    markActions: { flexDirection: 'row', gap: Spacing.xs },
    iconButton: {
      minWidth: 58,
      height: 44,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 3,
      backgroundColor: theme.surfaceStrong,
      borderWidth: 1,
      borderColor: theme.line,
    },
    checkpointButton: {
      backgroundColor: theme.orangeSoft,
      borderColor: `${theme.green}3d`,
    },
    finishButton: {
      backgroundColor: theme.redSoft,
      borderColor: 'rgba(199,63,65,0.24)',
    },
    checkpointButtonText: { color: theme.orange, fontSize: 11, lineHeight: 13, fontWeight: '900' },
    finishButtonText: { color: theme.red, fontSize: 11, lineHeight: 13, fontWeight: '900' },
    timelineEmpty: {
      minHeight: 38,
      paddingHorizontal: Spacing.sm,
      borderRadius: Radius.md,
      backgroundColor: theme.surfaceStrong,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    timelineEmptyText: { flex: 1, color: theme.muted, fontSize: 12, lineHeight: 17, fontWeight: '800' },
    timeline: {
      padding: Spacing.sm,
      borderRadius: Radius.md,
      backgroundColor: theme.bg,
      borderWidth: 1,
      borderColor: theme.line,
      gap: 7,
    },
    timelineLabel: { color: theme.muted, fontSize: 11, lineHeight: 14, fontWeight: '900' },
    timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    timelineSidePill: {
      minWidth: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surfaceStrong,
    },
    timelineSideText: { color: theme.ink, fontSize: 11, lineHeight: 13, fontWeight: '900' },
    timelineType: { flex: 1, color: theme.ink, fontSize: 12, lineHeight: 16, fontWeight: '900' },
    timelineTime: {
      color: theme.muted,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '900',
      fontVariant: ['tabular-nums'],
    },
    resultBanner: {
      minHeight: 38,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      backgroundColor: theme.orangeSoft,
    },
    resultText: { flex: 1, color: theme.green, fontSize: 12, lineHeight: 17, fontWeight: '900' },
    resultBannerMuted: {
      minHeight: 38,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      backgroundColor: theme.surfaceStrong,
    },
    resultMutedText: { flex: 1, color: theme.muted, fontSize: 12, lineHeight: 17, fontWeight: '800' },
    noteBlock: { gap: Spacing.xs },
    noteLabel: { color: theme.muted, fontSize: 11, fontWeight: '900' },
    noteInput: {
      minHeight: 72,
      padding: Spacing.sm,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.bg,
      color: theme.ink,
      fontSize: 13,
      lineHeight: 18,
      textAlignVertical: 'top',
    },
    submitButton: {
      minHeight: 46,
      borderRadius: Radius.md,
      backgroundColor: theme.orange,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: Spacing.xs,
    },
    submitText: { color: theme.bg, fontSize: 14, fontWeight: '900' },
    disabledButton: { opacity: 0.45 },
  })
}
