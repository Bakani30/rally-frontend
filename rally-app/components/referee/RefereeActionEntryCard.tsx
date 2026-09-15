import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useI18n, type Translator } from '@/hooks/useI18n'
import { refereeMatchDictionary } from '@/lib/i18n/dictionaries/refereeMatch'
import type { AlphaRefereeDutyState } from '@/lib/match/matchRules'

type RefereeMatchTranslator = Translator<keyof typeof refereeMatchDictionary>

type RefereeActionEntryCardProps = {
  state: AlphaRefereeDutyState
  activityType: string
  onSubmit: () => void
  onOpenHub: () => void
}

export function RefereeActionEntryCard({
  state,
  activityType,
  onSubmit,
  onOpenHub,
}: RefereeActionEntryCardProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { t } = useI18n(refereeMatchDictionary)
  if (state === 'closed') return null

  const meta = STATE_META(theme, t)[state]
  const activityLabel = activityType === 'running'
    ? t('activityRunning')
    : activityType === 'basketball'
      ? t('activityBasketball')
      : activityType === 'badminton'
        ? t('activityBadminton')
        : t('activityOther')
  const supportsInlineSubmit = activityType === 'basketball'
  const hasActionableState = (
    state === 'needs_result' ||
    state === 'live_draft' ||
    state === 'correction_requested'
  )
  const canSubmit = supportsInlineSubmit && hasActionableState
  const unsupportedAction = !supportsInlineSubmit && hasActionableState
  const title = unsupportedAction ? t('unsupportedSubmitTitle') : meta.title
  const hint = unsupportedAction
    ? t('unsupportedSubmitHint')
    : meta.hint
  const ctaLabel = canSubmit ? t('submitResult') : unsupportedAction ? t('unsupportedSubmitCta') : meta.cta
  const ctaIcon = canSubmit ? 'send-check' : unsupportedAction ? 'lock-outline' : 'clock-outline'

  return (
    <View style={[styles.card, { borderColor: meta.border, backgroundColor: meta.bg }]}>
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: meta.iconBg }]}>
          <MaterialCommunityIcons name={meta.icon} size={20} color={meta.fg} />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.kicker, { color: meta.fg }]}>{t('refereeDutyKicker')}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.hint}>{activityLabel} · {hint}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <PressableScale
          style={[styles.secondaryButton]}
          onPress={onOpenHub}
          accessibilityRole="button"
          accessibilityLabel={t('openRefereeBoard')}
        >
          <MaterialCommunityIcons name="clipboard-list-outline" size={16} color={theme.inkSoft} />
          <Text style={styles.secondaryText}>{t('refereeBoard')}</Text>
        </PressableScale>
        <PressableScale
          style={[styles.primaryButton, !canSubmit && styles.primaryDisabled]}
          onPress={onSubmit}
          disabled={!canSubmit}
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}
        >
          <MaterialCommunityIcons name={ctaIcon} size={16} color={canSubmit ? theme.bg : theme.inkSoft} />
          <Text style={[styles.primaryText, !canSubmit && styles.primaryTextDisabled]}>
            {ctaLabel}
          </Text>
        </PressableScale>
      </View>
    </View>
  )
}

function STATE_META(theme: SportPalette, t: RefereeMatchTranslator): Record<
  Exclude<AlphaRefereeDutyState, 'closed'>,
  {
    title: string
    hint: string
    cta: string
    fg: string
    bg: string
    border: string
    iconBg: string
    icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']
  }
> {
  return {
    not_ready: {
      title: t('actionNotReadyTitle'),
      hint: t('actionNotReadyHint'),
      cta: t('actionNotReadyCta'),
      fg: theme.amber,
      bg: theme.amberSoft,
      border: `${theme.amber}55`,
      iconBg: theme.bg,
      icon: 'timer-sand',
    },
    needs_result: {
      title: t('actionNeedsResultTitle'),
      hint: t('actionNeedsResultHint'),
      cta: t('actionNeedsResultCta'),
      fg: theme.orange,
      bg: theme.orangeSoft,
      border: `${theme.orange}55`,
      iconBg: theme.bg,
      icon: 'whistle-outline',
    },
    live_draft: {
      title: t('actionLiveDraftTitle'),
      hint: t('actionLiveDraftHint'),
      cta: t('actionLiveDraftCta'),
      fg: theme.orange,
      bg: theme.orangeSoft,
      border: `${theme.orange}55`,
      iconBg: theme.bg,
      icon: 'scoreboard-outline',
    },
    waiting_players: {
      title: t('actionWaitingPlayersTitle'),
      hint: t('actionWaitingPlayersHint'),
      cta: t('actionWaitingPlayersCta'),
      fg: theme.amber,
      bg: theme.amberSoft,
      border: `${theme.amber}55`,
      iconBg: theme.bg,
      icon: 'account-clock-outline',
    },
    cleared: {
      title: t('actionClearedTitle'),
      hint: t('actionClearedHint'),
      cta: t('actionClearedCta'),
      fg: theme.green,
      bg: theme.greenSoft,
      border: `${theme.green}55`,
      iconBg: theme.bg,
      icon: 'shield-check',
    },
    superseded: {
      title: t('actionSupersededTitle'),
      hint: t('actionSupersededHint'),
      cta: t('actionSupersededCta'),
      fg: theme.red,
      bg: theme.redSoft,
      border: `${theme.red}55`,
      iconBg: theme.bg,
      icon: 'shield-alert-outline',
    },
    correction_requested: {
      title: t('actionCorrectionTitle'),
      hint: t('actionCorrectionHint'),
      cta: t('actionCorrectionCta'),
      fg: theme.amber,
      bg: theme.amberSoft,
      border: `${theme.amber}55`,
      iconBg: theme.bg,
      icon: 'pencil-circle-outline',
    },
  }
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    card: {
      borderRadius: Radius.xl,
      borderWidth: 1,
      padding: Spacing.lg,
      gap: Spacing.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.md,
    },
    iconBox: {
      width: 42,
      height: 42,
      borderRadius: Radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    copy: { flex: 1, minWidth: 0 },
    kicker: {
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 1.2,
    },
    title: {
      color: theme.ink,
      fontSize: 16,
      fontWeight: '900',
      marginTop: 2,
    },
    hint: {
      color: theme.inkSoft,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 2,
    },
    actions: {
      flexDirection: 'row',
      gap: Spacing.sm,
      flexWrap: 'wrap',
    },
    secondaryButton: {
      flex: 1,
      minWidth: 120,
      minHeight: 48,
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    secondaryText: {
      color: theme.inkSoft,
      fontSize: 13,
      fontWeight: '900',
    },
    primaryButton: {
      flex: 1,
      minWidth: 120,
      minHeight: 48,
      borderRadius: Radius.pill,
      backgroundColor: theme.orange,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    primaryDisabled: {
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surfaceStrong,
    },
    primaryText: {
      color: theme.bg,
      fontSize: 13,
      fontWeight: '900',
    },
    primaryTextDisabled: { color: theme.inkSoft },
  })
}
