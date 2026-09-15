import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { PressableScale } from '@/components/motion/PressableScale'
import { type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useI18n, type Translator } from '@/hooks/useI18n'
import {
  BASKETBALL_COURT_MODE_REWARD_POINTS,
  type BasketballCourtModeEvaluation,
  type BasketballCourtModeSignalKey,
  type BasketballCourtModeSignalResult,
} from '@/lib/activities/basketball/courtModeTypes'
import type { BasketballCourtModeClaimResult } from '@/lib/activities/basketball/courtModeRepository'
import { homeDictionary } from '@/lib/i18n/dictionaries/home'
import { isEdgeFunctionError } from '@/lib/supabase/edgeError'
import type {
  BasketballCourtModePhase,
  BasketballCourtModeState,
} from '@/hooks/useBasketballCourtMode'

type HomeTranslator = Translator<keyof typeof homeDictionary>

type BasketballCourtModeCardProps = Pick<
  BasketballCourtModeState,
  | 'phase'
  | 'elapsedSeconds'
  | 'remainingSeconds'
  | 'canCancel'
  | 'result'
  | 'isSyncing'
  | 'error'
  | 'start'
  | 'cancel'
  | 'sync'
  | 'reset'
> & {
  compact?: boolean
  showHeader?: boolean
}

function getEmptySignals(t: HomeTranslator): BasketballCourtModeSignalResult[] {
  return [
    {
      key: 'workout',
      label: t('signalLabelWorkout'),
      passed: false,
      progress: 0,
      currentText: '0:00',
      targetText: t('signalTargetWorkout'),
      detail: t('signalDetailWorkout'),
    },
    {
      key: 'effort',
      label: t('signalLabelEffort'),
      passed: false,
      progress: 0,
      currentText: t('signalCurrentNoHR'),
      targetText: t('signalTargetEffort'),
      detail: t('signalDetailEffort'),
    },
    {
      key: 'footwork',
      label: t('signalLabelFootwork'),
      passed: false,
      progress: 0,
      currentText: t('signalCurrentZeroSteps'),
      targetText: t('signalTargetFootwork'),
      detail: t('signalDetailFootwork'),
    },
    {
      key: 'movement',
      label: t('signalLabelMovement'),
      passed: false,
      progress: 0,
      currentText: '0 m',
      targetText: t('signalTargetMovement'),
      detail: t('signalDetailMovement'),
    },
  ]
}

const SIGNAL_ICON: Record<BasketballCourtModeSignalKey, keyof typeof MaterialCommunityIcons.glyphMap> = {
  workout: 'watch-variant',
  effort: 'heart-pulse',
  footwork: 'shoe-print',
  movement: 'run-fast',
}

export function BasketballCourtModeCard({
  phase,
  elapsedSeconds,
  remainingSeconds,
  canCancel,
  result,
  isSyncing,
  error,
  start,
  cancel,
  sync,
  reset,
  compact = false,
  showHeader = true,
}: BasketballCourtModeCardProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { t } = useI18n(homeDictionary)
  const evaluation = result?.evaluation ?? null
  const signals = evaluation?.signals ?? getEmptySignals(t)
  const status = getStatusText(t, phase, evaluation, result?.claim ?? null)
  const helper = getHelperText(t, phase, result)
  const timerText = phase === 'idle' || phase === 'synced'
    ? '15:00'
    : formatClock(remainingSeconds)
  const timerLabel = phase === 'pending_sync'
    ? t('timerReady')
    : phase === 'synced'
      ? t('timerSynced')
      : t('timerLabel')

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      {showHeader && (
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <MaterialCommunityIcons name="basketball" size={22} color={theme.arcadeCtaText} />
          </View>
          <View style={styles.titleWrap}>
            <Text style={styles.eyebrow}>{t('courtQuestEyebrow')}</Text>
            <Text style={styles.title}>{t('courtModeTitle')}</Text>
          </View>
          <View style={styles.rewardPill}>
            <Text style={styles.rewardText}>+{BASKETBALL_COURT_MODE_REWARD_POINTS}</Text>
          </View>
        </View>
      )}

      <View style={[styles.timerPanel, compact && styles.timerPanelCompact]}>
        <View>
          <Text style={styles.timerLabel}>{timerLabel}</Text>
          <Text style={[styles.timer, compact && styles.timerCompact]}>{timerText}</Text>
        </View>
        <View style={[styles.statusWrap, compact && styles.statusWrapCompact]}>
          <Text style={[styles.status, compact && styles.statusCompact]}>{status}</Text>
          <Text
            style={[styles.helper, compact && styles.helperCompact]}
            numberOfLines={compact ? 1 : undefined}
          >
            {helper}
          </Text>
        </View>
      </View>

      <View style={[styles.signalGrid, compact && styles.signalGridCompact]}>
        {signals.map((signal) => (
          <SignalCard key={signal.key} signal={signal} compact={compact} theme={theme} />
        ))}
      </View>

      {phase === 'active' && (
        <View style={styles.lockNotice}>
          <MaterialCommunityIcons name="lock-clock" size={15} color={theme.amber} />
          <Text style={styles.lockText}>
            {t('windowLocked', { elapsed: formatClock(elapsedSeconds) })}
          </Text>
        </View>
      )}

      {error && <Text style={styles.errorText}>{formatCourtModeError(t, error)}</Text>}

      <View style={styles.actions}>
        {phase === 'idle' && (
          <PressableScale style={[styles.primaryButton, compact && styles.primaryButtonCompact]} onPress={start}>
            <MaterialCommunityIcons name="play" size={18} color={theme.arcadeCtaText} />
            <Text style={styles.primaryText}>{t('startQuest')}</Text>
          </PressableScale>
        )}

        {phase === 'active' && (
          <>
            <View style={[styles.primaryButton, compact && styles.primaryButtonCompact, styles.disabledButton]}>
              <MaterialCommunityIcons name="timer-sand" size={18} color={theme.arcadeCtaText} />
              <Text style={styles.primaryText}>{t('timerRunning')}</Text>
            </View>
            <PressableScale
              style={[styles.secondaryButton, !canCancel && styles.secondaryButtonDisabled]}
              onPress={cancel}
              disabled={!canCancel}
            >
              <Text style={styles.secondaryText}>{canCancel ? t('cancelAction') : t('lockedAction')}</Text>
            </PressableScale>
          </>
        )}

        {phase === 'pending_sync' && (
          <PressableScale
            style={[styles.primaryButton, compact && styles.primaryButtonCompact]}
            onPress={() => void sync()}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <ActivityIndicator color={theme.arcadeCtaText} />
            ) : (
              <>
                <MaterialCommunityIcons name="sync" size={18} color={theme.arcadeCtaText} />
                <Text style={styles.primaryText}>{t('syncResult')}</Text>
              </>
            )}
          </PressableScale>
        )}

        {phase === 'synced' && (
          <PressableScale style={styles.secondaryButton} onPress={reset}>
            <Text style={styles.secondaryText}>{t('newSession')}</Text>
          </PressableScale>
        )}
      </View>
    </View>
  )
}

function SignalCard({
  signal,
  compact,
  theme,
}: {
  signal: BasketballCourtModeSignalResult
  compact: boolean
  theme: SportPalette
}) {
  const styles = createStyles(theme)
  return (
    <View style={[styles.signalCard, compact && styles.signalCardCompact, signal.passed && styles.signalCardPassed]}>
      <View style={[styles.signalTop, compact && styles.signalTopCompact]}>
        <MaterialCommunityIcons
          name={SIGNAL_ICON[signal.key]}
          size={compact ? 14 : 16}
          color={signal.passed ? theme.green : theme.muted}
        />
        <Text style={[styles.signalLabel, signal.passed && styles.signalLabelPassed]}>
          {signal.label}
        </Text>
        {signal.passed && <MaterialCommunityIcons name="check-bold" size={13} color={theme.green} />}
      </View>
      <Text style={[styles.signalValue, compact && styles.signalValueCompact]}>{signal.currentText}</Text>
      <Text style={styles.signalTarget} numberOfLines={compact ? 1 : undefined}>{signal.targetText}</Text>
      <View style={styles.signalTrack}>
        <View style={[styles.signalFill, { width: `${signal.progress * 100}%` }]} />
      </View>
      <Text style={styles.signalDetail} numberOfLines={compact ? 2 : undefined}>{signal.detail}</Text>
    </View>
  )
}

function getStatusText(
  t: HomeTranslator,
  phase: BasketballCourtModePhase,
  evaluation: BasketballCourtModeEvaluation | null,
  claim: BasketballCourtModeClaimResult | null,
): string {
  if (phase === 'active') return t('statusLiveTimer')
  if (phase === 'pending_sync') return t('statusPendingSync')
  if (phase === 'synced') {
    if (claim?.rewardGranted) return t('statusRewardGranted', { pts: claim.pointsAwarded })
    if (claim?.alreadyClaimed) return t('statusAlreadyClaimed')
    if (claim?.eligible === false) return t('statusNotEligible')
    return evaluation?.verificationBadge ?? t('statusSyncedDefault')
  }
  return t('statusSoloCourt')
}

function getHelperText(
  t: HomeTranslator,
  phase: BasketballCourtModePhase,
  result: BasketballCourtModeState['result'],
): string {
  if (phase === 'active') return t('helperActive')
  if (phase === 'pending_sync') return t('helperPendingSync')
  if (phase !== 'synced') return t('helperIdle')
  if (result?.claim?.rewardGranted) return t('helperPassedBy', { signal: result.evaluation.passedByLabel ?? result.claim.passedBy ?? 'signal' })
  if (result?.claim?.alreadyClaimed) return t('helperAlreadyClaimed')
  if (result?.claim?.eligible === false) return t('helperNotEligible')
  if (!result?.evaluation.passed) return t('helperNotReached')
  return result?.evaluation.summary ?? t('helperSyncComplete')
}

function formatCourtModeError(t: HomeTranslator, error: Error): string {
  if (isEdgeFunctionError(error) && error.code === 'daily_cap') return t('errorDailyCapFull')
  return error.message
}

function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds))
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.arcadePanel,
      borderWidth: 1,
      borderColor: theme.line,
      borderRadius: 24,
      padding: 16,
      gap: 14,
      boxShadow: theme.shadowSoft,
    },
    cardCompact: {
      padding: 10,
      gap: 9,
      borderRadius: 20,
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    iconWrap: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: theme.amber,
      borderWidth: 2,
      borderColor: theme.ink,
      alignItems: 'center',
      justifyContent: 'center',
    },
    titleWrap: { flex: 1 },
    eyebrow: { color: theme.amber, fontSize: 10, fontWeight: '900', letterSpacing: 0 },
    title: { color: theme.ink, fontSize: 17, fontWeight: '900' },
    rewardPill: {
      minWidth: 44,
      height: 34,
      borderRadius: 17,
      backgroundColor: theme.red,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 10,
    },
    rewardText: { color: theme.chalk, fontSize: 13, fontWeight: '900' },
    timerPanel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      borderRadius: 18,
      backgroundColor: theme.orange,
      borderWidth: 2,
      borderColor: theme.ink,
      padding: 14,
    },
    timerPanelCompact: {
      borderRadius: 16,
      padding: 10,
      gap: 10,
    },
    timerLabel: { color: theme.arcadeCtaText, fontSize: 10, fontWeight: '900', letterSpacing: 0 },
    timer: {
      color: theme.chalk,
      fontSize: 38,
      lineHeight: 42,
      fontWeight: '900',
      fontVariant: ['tabular-nums'],
    },
    timerCompact: {
      fontSize: 31,
      lineHeight: 35,
    },
    statusWrap: { flex: 1, gap: 3 },
    statusWrapCompact: { gap: 1 },
    status: { color: theme.arcadeCtaText, fontSize: 13, fontWeight: '900' },
    statusCompact: { fontSize: 12 },
    helper: { color: theme.chalk, fontSize: 12, fontWeight: '800', lineHeight: 17 },
    helperCompact: { fontSize: 11, lineHeight: 14 },
    signalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    signalGridCompact: { gap: 8 },
    signalCard: {
      width: '48%',
      minWidth: 0,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.lineStrong,
      backgroundColor: theme.surface,
      padding: 10,
      gap: 5,
    },
    signalCardCompact: {
      borderRadius: 14,
      padding: 8,
      gap: 3,
    },
    signalCardPassed: {
      borderColor: theme.green,
      backgroundColor: theme.greenSoft,
    },
    signalTop: { minHeight: 22, flexDirection: 'row', alignItems: 'center', gap: 6 },
    signalTopCompact: { minHeight: 18, gap: 5 },
    signalLabel: { flex: 1, color: theme.inkSoft, fontSize: 12, fontWeight: '900' },
    signalLabelPassed: { color: theme.greenVivid },
    signalValue: { color: theme.ink, fontSize: 15, fontWeight: '900', fontVariant: ['tabular-nums'] },
    signalValueCompact: { fontSize: 14 },
    signalTarget: { color: theme.muted, fontSize: 10, fontWeight: '800' },
    signalTrack: {
      height: 6,
      borderRadius: 3,
      overflow: 'hidden',
      backgroundColor: theme.surfaceStrong,
    },
    signalFill: { height: '100%', borderRadius: 3, backgroundColor: theme.amber },
    signalDetail: { color: theme.mutedSoft, fontSize: 10, fontWeight: '700', lineHeight: 13 },
    lockNotice: {
      minHeight: 38,
      borderRadius: 14,
      backgroundColor: theme.amberSoft,
      borderWidth: 1,
      borderColor: theme.lineStrong,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    lockText: { flex: 1, color: theme.inkSoft, fontSize: 12, fontWeight: '800' },
    errorText: { color: theme.red, fontSize: 12, fontWeight: '800', lineHeight: 17 },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    primaryButton: {
      flex: 1,
      minHeight: 48,
      borderRadius: 14,
      backgroundColor: theme.amber,
      borderWidth: 2,
      borderColor: theme.ink,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    primaryButtonCompact: {
      minHeight: 44,
      borderRadius: 13,
    },
    disabledButton: { opacity: 0.72 },
    primaryText: { color: theme.arcadeCtaText, fontSize: 14, fontWeight: '900' },
    secondaryButton: {
      minHeight: 48,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.lineStrong,
      backgroundColor: theme.surfaceStrong,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    secondaryButtonDisabled: { opacity: 0.48 },
    secondaryText: { color: theme.inkSoft, fontSize: 13, fontWeight: '900' },
  })
}
