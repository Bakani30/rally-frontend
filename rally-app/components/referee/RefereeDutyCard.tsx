import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import {
  RefereeSourceIcon,
  refereeSourceIconForActivity,
} from '@/components/referee/icons/RefereeSourceIcon'
import { Fonts, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useI18n } from '@/hooks/useI18n'
import { refereeDictionary } from '@/lib/i18n/dictionaries/referee'
import type { AppLanguage } from '@/lib/i18n/language'
import { getRefereeDutyCopy, type RefereeDutyPresentationState } from '@/lib/match/refereeCopy'
import {
  refereePassActivityLabel,
  type RefereePassTranslator,
} from '@/lib/match/refereePassPresentation'
import { getSportReelItem } from '@/lib/match/sportReel'
import type { AlphaRefereeDuty } from '@/types/match'

type RefereeDutyCardProps = {
  duty: AlphaRefereeDuty
  state: RefereeDutyPresentationState
  onOpenMatch: () => void
  onSubmit: () => void
  onAccept: () => void
  onDecline: () => void
  responsePending: boolean
  responseControlsDisabled: boolean
  responseError?: unknown
}

export function RefereeDutyCard({
  duty,
  state,
  onOpenMatch,
  onSubmit,
  onAccept,
  onDecline,
  responsePending,
  responseControlsDisabled,
  responseError,
}: RefereeDutyCardProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { t, language } = useI18n(refereeDictionary)
  const copy = getRefereeDutyCopy(state, duty.match.activityType)
  const reel = getSportReelItem(
    duty.match.activityType === 'basketball' ||
      duty.match.activityType === 'badminton' ||
      duty.match.activityType === 'running'
      ? duty.match.activityType
      : 'running',
  )
  const score = formatResult(duty, t)
  const activityLabel = isRefereeActivity(duty.match.activityType)
    ? refereePassActivityLabel(duty.match.activityType, t)
    : t('sportOther')
  const matchLabel = formatMatchLabel(duty)
  const title = state === 'invited' ? t('dutyInvited') : dutyStateTitle(state, t)
  const actionLabel = copy.action === 'accept'
    ? t('acceptDuty')
    : copy.action === 'submit'
      ? t('submitResult')
      : t('enterRoom')
  const actionA11yLabel = copy.action === 'accept'
    ? t('acceptDutyA11y', { sport: activityLabel, match: matchLabel })
    : copy.action === 'submit'
      ? t('submitResultA11y', { sport: activityLabel, match: matchLabel })
      : t('enterRoomA11y', { sport: activityLabel, match: matchLabel })
  const primaryAction = copy.action === 'accept'
    ? onAccept
    : copy.action === 'submit'
      ? onSubmit
      : onOpenMatch
  const primaryColor = copy.action === 'open' ? theme.fightBg : theme.orange
  const primaryInk = copy.action === 'open' ? theme.fightInk : theme.chalk

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={[styles.iconBox, { backgroundColor: reel.accent }]}>
          <RefereeSourceIcon
            name={refereeSourceIconForActivity(duty.match.activityType)}
            size={20}
            color={reel.onAccent}
          />
        </View>
        <View style={styles.copy}>
          <Text style={styles.kicker}>{activityLabel}</Text>
          <Text style={styles.matchMeta}>{matchLabel}</Text>
        </View>
      </View>

      <View style={styles.resultRow}>
        <View style={styles.resultCopy}>
          <Text style={styles.title}>{title}</Text>
        </View>
        {score ? (
          <View style={styles.scoreVault}>
            <Text style={styles.score}>{score}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.detailRow}>
        <View style={styles.detailItem}>
          <MaterialCommunityIcons name="calendar-clock-outline" size={16} color={theme.orange} />
          <Text style={styles.detailText} numberOfLines={2}>
            {formatDeadline(duty.match.deadline, language, t)}
          </Text>
        </View>
        <View style={styles.detailDivider} />
        <View style={styles.detailItemCompact}>
          <MaterialCommunityIcons name="account-group-outline" size={16} color={theme.muted} />
          <Text style={styles.detailText}>
            {t(duty.match.participants.length === 1 ? 'playerCountOne' : 'playerCountMany', {
              count: duty.match.participants.length,
            })}
          </Text>
        </View>
      </View>

      {duty.match.ruleText?.trim() ? (
        <View style={styles.ruleRow}>
          <MaterialCommunityIcons name="clipboard-text-outline" size={16} color={theme.muted} />
          <Text style={styles.ruleText} numberOfLines={2}>{duty.match.ruleText.trim()}</Text>
        </View>
      ) : null}

      {responseError && copy.secondaryAction === 'decline' ? (
        <Text style={styles.errorText}>{t('assignmentResponseError')}</Text>
      ) : null}

      <View style={copy.secondaryAction === 'decline' ? styles.actions : undefined}>
        <PressableScale
          style={[
            copy.secondaryAction === 'decline' ? styles.actionButton : styles.primaryButton,
            { backgroundColor: primaryColor },
            responseControlsDisabled && styles.disabledButton,
          ]}
          onPress={primaryAction}
          disabled={responseControlsDisabled}
          accessibilityRole="button"
          accessibilityLabel={actionA11yLabel}
          accessibilityState={{ disabled: responseControlsDisabled, busy: responsePending }}
        >
          {responsePending && copy.action === 'accept' ? (
            <ActivityIndicator size="small" color={primaryInk} />
          ) : (
            <MaterialCommunityIcons
              name={copy.action === 'submit' ? 'send-check' : copy.action === 'accept' ? 'whistle' : 'door-open'}
              size={18}
              color={primaryInk}
            />
          )}
          <Text style={[styles.primaryText, { color: primaryInk }]}>{actionLabel}</Text>
        </PressableScale>

        {copy.secondaryAction === 'decline' ? (
          <PressableScale
            style={[styles.secondaryButton, responseControlsDisabled && styles.disabledButton]}
            onPress={onDecline}
            disabled={responseControlsDisabled}
            accessibilityRole="button"
            accessibilityLabel={t('declineDutyA11y', { sport: activityLabel, match: matchLabel })}
            accessibilityState={{ disabled: responseControlsDisabled, busy: responsePending }}
          >
            <MaterialCommunityIcons name="close" size={18} color={theme.red} />
            <Text style={styles.secondaryText}>{t('declineDuty')}</Text>
          </PressableScale>
        ) : null}
      </View>
    </View>
  )
}

function formatMatchLabel(duty: AlphaRefereeDuty): string {
  const sideA = duty.match.participants.filter((p) => p.side === 0).length
  const sideB = duty.match.participants.filter((p) => p.side === 1).length
  return `${sideA}v${sideB}`
}

function formatDeadline(
  deadline: string,
  language: AppLanguage,
  t: RefereePassTranslator,
): string {
  const date = new Date(deadline).toLocaleString(language === 'th' ? 'th-TH' : 'en-US', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
  return t('dueBy', { date })
}

function formatResult(duty: AlphaRefereeDuty, t: RefereePassTranslator): string | null {
  const result = duty.latestResult
  if (result?.resultKind === 'team_score') {
    if (result.side0Score == null || result.side1Score == null) return null
    return `${result.side0Score} - ${result.side1Score}`
  }
  if (result?.resultKind === 'manual_running_result') {
    if (result.isTie) return t('tie')
    if (result.winnerSide == null) return null
    return t('sideWins', { side: result.winnerSide === 0 ? 'A' : 'B' })
  }
  const sideA = duty.match.teamResults.find((row) => row.sideIndex === 0)
  const sideB = duty.match.teamResults.find((row) => row.sideIndex === 1)
  if (sideA && sideB) return `${sideA.teamScore} - ${sideB.teamScore}`
  return null
}

function dutyStateTitle(state: Exclude<RefereeDutyPresentationState, 'invited'>, t: RefereePassTranslator): string {
  if (state === 'not_ready') return t('dutyNotReady')
  if (state === 'needs_result') return t('dutyNeedsResult')
  if (state === 'live_draft') return t('dutyLiveDraft')
  if (state === 'waiting_players') return t('dutyWaitingPlayers')
  if (state === 'cleared') return t('dutyCleared')
  if (state === 'superseded') return t('dutySuperseded')
  if (state === 'correction_requested') return t('dutyCorrectionRequested')
  return t('dutyClosed')
}

function isRefereeActivity(activity: string): activity is 'running' | 'basketball' | 'badminton' {
  return activity === 'running' || activity === 'basketball' || activity === 'badminton'
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    card: {
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface,
      padding: Spacing.lg,
      gap: Spacing.md,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.md,
    },
    iconBox: {
      width: 38,
      height: 38,
      borderRadius: Radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    copy: { flex: 1, minWidth: 0, gap: 1 },
    kicker: {
      color: theme.muted,
      fontSize: 11,
      fontWeight: '900',
      fontFamily: Fonts?.thaiMedium,
      lineHeight: 17,
    },
    matchMeta: { color: theme.ink, fontSize: 13, lineHeight: 19, fontWeight: '900', fontFamily: Fonts?.thaiMedium },
    title: {
      color: theme.ink,
      fontSize: 18,
      lineHeight: 26,
      fontWeight: '900',
      fontFamily: Fonts?.thaiHead,
    },
    resultRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    resultCopy: { flex: 1, minWidth: 0 },
    scoreVault: {
      minWidth: 104,
      minHeight: 64,
      borderRadius: Radius.lg,
      backgroundColor: theme.fightBg,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing.md,
    },
    score: {
      color: theme.fightInk,
      fontSize: 26,
      fontWeight: '900',
      fontVariant: ['tabular-nums'],
    },
    detailRow: {
      minHeight: 34,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      borderRadius: Radius.lg,
      backgroundColor: theme.surfaceStrong,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 6,
    },
    detailItem: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    detailItemCompact: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    detailDivider: { width: StyleSheet.hairlineWidth, height: 18, backgroundColor: theme.lineStrong },
    detailText: {
      color: theme.inkSoft,
      fontSize: 11,
      lineHeight: 17,
      fontWeight: '800',
      fontFamily: Fonts?.thaiMedium,
    },
    ruleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    ruleText: {
      flex: 1,
      minWidth: 0,
      color: theme.muted,
      fontSize: 11,
      lineHeight: 17,
      fontWeight: '700',
      fontFamily: Fonts?.thaiBody,
    },
    primaryButton: {
      width: '100%',
      minHeight: 48,
      borderRadius: Radius.pill,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
    },
    actions: { flexDirection: 'row', gap: Spacing.sm },
    actionButton: {
      flex: 1,
      minHeight: 48,
      borderRadius: Radius.pill,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
    },
    secondaryButton: {
      flex: 1,
      minHeight: 48,
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surfaceStrong,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
    },
    secondaryText: { color: theme.inkSoft, fontSize: 14, lineHeight: 20, fontWeight: '900', fontFamily: Fonts?.thaiHead },
    disabledButton: { opacity: 0.55 },
    errorText: { color: theme.red, fontSize: 12, lineHeight: 18, fontFamily: Fonts?.thaiMedium },
    primaryText: { fontSize: 14, lineHeight: 20, fontWeight: '900', fontFamily: Fonts?.thaiHead },
  })
}
