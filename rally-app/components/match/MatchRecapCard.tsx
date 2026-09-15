import { Platform, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { RatingDeltaBadge } from '@/components/match/RatingDeltaBadge'
import { Radius, Sport, Spacing } from '@/constants/theme'
import {
  getTeamSportOutcomeSummary,
  getTeamSportScoreboard,
  type TeamSportOutcomeKind,
} from '@/lib/match/teamSportResultMoment'
import { CURRENCY_UNIT } from '@/lib/wallet/walletFormatting'
import type { MatchParticipant, MatchWithRelations } from '@/types/match'

// No exit button by design: this card renders inline on the match detail
// screen, so leaving is the screen's back button — a dedicated "ออก" would
// duplicate it and break the navigation flow.
type MatchRecapCardProps = {
  match: MatchWithRelations
  currentUserId: string
  myParticipant: MatchParticipant | null | undefined
  onRematch?: () => void
  rematchPending?: boolean
  onChallengeAnother?: () => void
  onViewAnalysis?: () => void
}

export function MatchRecapCard({
  match,
  currentUserId,
  myParticipant,
  onRematch,
  rematchPending,
  onChallengeAnother,
  onViewAnalysis,
}: MatchRecapCardProps) {
  const scoreboard = getTeamSportScoreboard(match)
  const outcome = getTeamSportOutcomeSummary(match, currentUserId)
  const view = OUTCOME_VIEW[outcome.kind]
  const pointsDelta = formatPointsDelta(outcome.pointsDelta, CURRENCY_UNIT[match.stake_currency])
  const mySideLabel = outcome.mySide === null ? null : `Side ${outcome.mySide === 0 ? 'A' : 'B'}`

  return (
    <View style={[styles.card, { borderColor: view.border, backgroundColor: view.bg }]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: view.iconBg }]}>
          <MaterialCommunityIcons name={view.icon} size={26} color={view.fg} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eyebrow, { color: view.fg }]}>MATCH RECAP</Text>
          <Text style={styles.title}>{view.title}</Text>
          {mySideLabel && <Text style={styles.subtitle}>{mySideLabel} · {match.activity_type}</Text>}
        </View>
      </View>

      <View style={styles.scoreRow}>
        <ScoreBlock side="A" score={scoreboard.sideAScore} active={outcome.mySide === 0} />
        <Text style={styles.scoreDash}>-</Text>
        <ScoreBlock side="B" score={scoreboard.sideBScore} active={outcome.mySide === 1} />
      </View>

      <View style={styles.impactRow}>
        <View style={styles.impactCell}>
          <Text style={styles.impactLabel}>POINTS</Text>
          <Text style={[styles.impactValue, { color: view.fg }]}>{pointsDelta}</Text>
        </View>
        {myParticipant ? (
          <View style={styles.ratingCell}>
            <Text style={styles.impactLabel}>RATING</Text>
            <RatingDeltaBadge
              ratingBefore={myParticipant.rating_before}
              ratingAfter={myParticipant.rating_after}
              activityLabel={match.activity_type}
            />
          </View>
        ) : null}
      </View>

      <View style={styles.actions}>
        {onChallengeAnother ? (
          <PressableScale style={styles.secondaryAction} onPress={onChallengeAnother}>
            <MaterialCommunityIcons name="account-search-outline" size={16} color={Sport.inkSoft} />
            <Text style={styles.secondaryActionText} numberOfLines={1}>New challenge</Text>
          </PressableScale>
        ) : null}
        {onRematch ? (
          <PressableScale
            style={[styles.secondaryAction, rematchPending && { opacity: 0.6 }]}
            onPress={onRematch}
            disabled={rematchPending}
          >
            <MaterialCommunityIcons name="restart" size={16} color={Sport.inkSoft} />
            <Text style={styles.secondaryActionText} numberOfLines={1}>
              {rematchPending ? 'กำลังส่ง…' : 'ล้างตา'}
            </Text>
          </PressableScale>
        ) : null}
        {onViewAnalysis ? (
          <PressableScale style={[styles.primaryAction, { backgroundColor: view.fg }]} onPress={onViewAnalysis}>
            <MaterialCommunityIcons name="chart-box-outline" size={16} color={Sport.bg} />
            <Text style={styles.primaryActionText}>ดูวิเคราะห์</Text>
          </PressableScale>
        ) : null}
      </View>
    </View>
  )
}

function ScoreBlock({
  side,
  score,
  active,
}: {
  side: 'A' | 'B'
  score: number | null
  active: boolean
}) {
  const color = side === 'A' ? Sport.red : Sport.blue
  return (
    <View style={[styles.scoreBlock, active && { borderColor: color, backgroundColor: `${color}18` }]}>
      <Text style={[styles.scoreSide, { color }]}>SIDE {side}</Text>
      <Text style={styles.scoreValue}>{score ?? '--'}</Text>
      {active && <Text style={styles.youTag}>YOU</Text>}
    </View>
  )
}

function formatPointsDelta(delta: number, unit: string): string {
  if (delta > 0) return `+${delta} ${unit}`
  if (delta < 0) return `${delta} ${unit}`
  return `0 ${unit}`
}

const OUTCOME_VIEW: Record<
  TeamSportOutcomeKind,
  {
    title: string
    icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']
    fg: string
    bg: string
    border: string
    iconBg: string
  }
> = {
  win: {
    title: 'Your team won',
    icon: 'trophy-award',
    fg: Sport.green,
    bg: Sport.greenSoft,
    border: `${Sport.green}55`,
    iconBg: Sport.greenSoft,
  },
  lose: {
    title: 'Your team lost',
    icon: 'shield-off-outline',
    fg: Sport.red,
    bg: Sport.redSoft,
    border: 'rgba(199,63,65,0.34)',
    iconBg: 'rgba(199,63,65,0.18)',
  },
  tie: {
    title: 'Tie - stakes returned',
    icon: 'equal-box',
    fg: Sport.inkSoft,
    bg: Sport.surface,
    border: Sport.line,
    iconBg: Sport.surfaceStrong,
  },
  pending: {
    title: 'Result locked',
    icon: 'shield-check-outline',
    fg: Sport.inkSoft,
    bg: Sport.surface,
    border: Sport.line,
    iconBg: Sport.surfaceStrong,
  },
  spectator: {
    title: 'Match settled',
    icon: 'scoreboard-outline',
    fg: Sport.inkSoft,
    bg: Sport.surface,
    border: Sport.line,
    iconBg: Sport.surfaceStrong,
  },
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Platform.select({
      web: { boxShadow: '0 16px 36px -18px rgba(0,0,0,0.55)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.24,
        shadowRadius: 18,
        elevation: 4,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  title: {
    color: Sport.ink,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: 2,
  },
  subtitle: {
    color: Sport.muted,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.sm,
  },
  scoreDash: {
    alignSelf: 'center',
    color: Sport.muted,
    fontSize: 20,
    fontWeight: '900',
  },
  scoreBlock: {
    flex: 1,
    minHeight: 108,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Sport.line,
    backgroundColor: Sport.bgElevated,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  scoreSide: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  scoreValue: {
    color: Sport.ink,
    fontSize: 36,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    lineHeight: 42,
  },
  youTag: {
    color: Sport.ink,
    backgroundColor: Sport.amber,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    overflow: 'hidden',
  },
  impactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  impactCell: {
    flex: 1,
    minWidth: 128,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Sport.line,
    backgroundColor: Sport.bgElevated,
    padding: Spacing.md,
  },
  ratingCell: {
    flex: 1.25,
    minWidth: 156,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Sport.line,
    backgroundColor: Sport.bgElevated,
    padding: Spacing.md,
    gap: 6,
  },
  impactLabel: {
    color: Sport.muted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  impactValue: {
    fontSize: 24,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  primaryAction: {
    flex: 1,
    minWidth: 116,
    minHeight: 48,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: Spacing.md,
  },
  primaryActionText: {
    color: Sport.bg,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  secondaryAction: {
    flex: 1.15,
    minWidth: 148,
    minHeight: 48,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Sport.line,
    backgroundColor: Sport.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: Spacing.md,
  },
  secondaryActionText: {
    color: Sport.inkSoft,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
})
