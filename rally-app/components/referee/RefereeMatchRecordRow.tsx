import { StyleSheet, Text, View } from 'react-native'
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
import type { RefereeMatchHistoryItem } from '@/lib/match/refereeMatchRecordsRepository'
import {
  refereePassActivityLabel,
  type RefereePassTranslator,
} from '@/lib/match/refereePassPresentation'
import { getSportReelItem } from '@/lib/match/sportReel'

type FinalStatus = RefereeMatchHistoryItem['finalStatus']

type RefereeMatchRecordRowProps = {
  record: RefereeMatchHistoryItem
  onPress: () => void
}

// One refereed-match in the history list: sport, line-up, score, outcome, and
// the referee's trust impact.
export function RefereeMatchRecordRow({ record, onPress }: RefereeMatchRecordRowProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { t, language } = useI18n(refereeDictionary)
  const reel = getSportReelItem(record.activityType)
  const outcome = outcomeMeta(record.finalStatus, theme, t)
  const sportLabel = refereePassActivityLabel(record.activityType, t)

  const detail = record.detail
  const hasScore = detail.sideAScore != null && detail.sideBScore != null
  const matchup = `${formatSide(detail.sideANames, t('sideA'))} VS ${formatSide(detail.sideBNames, t('sideB'))}`

  const deltaColor =
    record.qualityDelta > 0 ? theme.green : record.qualityDelta < 0 ? theme.red : theme.muted
  const delta = `${record.qualityDelta > 0 ? '+' : ''}${record.qualityDelta}`
  const deltaText = t('trustDelta', { delta })

  return (
    <PressableScale
      style={styles.row}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('historyRecordA11y', { sport: sportLabel, status: outcome.label })}
    >
      <View style={[styles.iconCircle, { backgroundColor: reel.accent }]}>
        <RefereeSourceIcon
          name={refereeSourceIconForActivity(record.activityType)}
          size={18}
          color={reel.onAccent}
        />
      </View>
      <View style={styles.mid}>
        <Text style={styles.matchup} numberOfLines={1}>
          {matchup}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          <Text style={[styles.outcome, { color: outcome.fg }]}>{outcome.label}</Text>
          {` · ${formatDate(record.settledAt, language)}`}
          {record.hadDispute ? ` · ${t('hadDispute')}` : ''}
        </Text>
      </View>
      <View style={styles.right}>
        <View style={styles.scoreVault}>
          <Text style={styles.score} numberOfLines={1}>
            {hasScore ? `${detail.sideAScore} – ${detail.sideBScore}` : '—'}
          </Text>
        </View>
        <Text style={[styles.delta, { color: deltaColor }]} numberOfLines={1}>
          {deltaText}
        </Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={theme.mutedSoft} />
    </PressableScale>
  )
}

function formatSide(names: string[], fallback: string): string {
  if (names.length === 0) return fallback
  const [first, ...rest] = names
  return rest.length ? `${first} +${rest.length}` : first
}

function outcomeMeta(status: FinalStatus, theme: SportPalette, t: RefereePassTranslator) {
  if (status === 'accepted') return { label: t('outcomeAccepted'), fg: theme.green }
  if (status === 'corrected') return { label: t('outcomeCorrected'), fg: theme.amber }
  return { label: t('outcomeDisputed'), fg: theme.red }
}

function formatDate(value: string, language: AppLanguage): string {
  return new Date(value).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.md,
      minHeight: 72,
    },
    iconCircle: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mid: { flex: 1, minWidth: 0, gap: 2 },
    matchup: { color: theme.ink, fontSize: 14, fontWeight: '900', fontFamily: Fonts?.thaiHead },
    sub: { color: theme.muted, fontSize: 11, lineHeight: 16, fontWeight: '700', fontFamily: Fonts?.thaiMedium },
    outcome: { fontWeight: '900' },
    right: { alignItems: 'flex-end', minWidth: 72, gap: 3 },
    scoreVault: {
      minWidth: 72,
      minHeight: 34,
      borderRadius: Radius.md,
      backgroundColor: theme.fightBg,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing.sm,
    },
    score: {
      color: theme.fightInk,
      fontSize: 16,
      fontWeight: '900',
      fontFamily: Fonts?.rounded,
      fontVariant: ['tabular-nums'],
    },
    delta: { fontSize: 9, fontWeight: '900', letterSpacing: 0.4, marginTop: 1 },
  })
}
