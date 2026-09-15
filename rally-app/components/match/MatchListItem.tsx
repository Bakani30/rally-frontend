import { memo } from 'react'
import { Link } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { StatusPill } from '@/components/ui/StatusPill'
import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useI18n, type Translator } from '@/hooks/useI18n'
import { deriveRunningMode } from '@/lib/match/matchConfig'
import { deriveMatchListTrustBadge } from '@/lib/match/matchTrustBadge'
import { getSportReelItem, type SportReelKey } from '@/lib/match/sportReel'
import { getTeamSportScoreboard } from '@/lib/match/teamSportResultMoment'
import { matchesTabDictionary } from '@/lib/i18n/dictionaries/matchesTab'
import { CURRENCY_UNIT } from '@/lib/wallet/walletFormatting'
import type { MyMatch } from '@/types/match'

type GlyphName = keyof typeof MaterialCommunityIcons.glyphMap

function statusLabel(status: string, t: Translator<keyof typeof matchesTabDictionary>): string {
  switch (status) {
    case 'pending': return t('statusPendingLabel')
    case 'accepted':
    case 'in_progress': return t('statusLiveLabel')
    case 'submitted': return t('statusAwaitingLabel')
    case 'verified': return t('statusSettlingLabel')
    case 'settled': return t('statusSettledLabel')
    case 'disputed': return t('statusDisputedLabel')
    case 'cancelled': return t('statusCancelledLabel')
    default: return status
  }
}

/** Pin affordance rendered inside the card (top-right) — no separate button column. */
type MatchListItemPin = {
  pinned: boolean
  /** Owner is at the server pin cap — mutes the star but keeps it tappable so the cap error surfaces. */
  atCap: boolean
  /** True while an add/remove mutation is in flight — disables the star to avoid double-taps. */
  pending: boolean
  onToggle: (matchId: string) => void
}

type MatchListItemProps = {
  match: MyMatch
  currentUserId: string | undefined
  navigationEnabled?: boolean
  pin?: MatchListItemPin
}

export const MatchListItem = memo(MatchListItemImpl)

function MatchListItemImpl({ match, currentUserId, navigationEnabled = true, pin }: MatchListItemProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { t } = useI18n(matchesTabDictionary)

  const reel = getSportReelItem(match.activity_type as SportReelKey)
  const isCreator = match.created_by === currentUserId
  const isSettled = match.status === 'settled'
  const isWinner = isSettled && !match.is_tie && match.winner_user_id === currentUserId
  const isTie = isSettled && match.is_tie
  const isLoser = isSettled && !match.is_tie && match.winner_user_id !== currentUserId

  const runningMode = match.running_mode ?? deriveRunningMode(match.activity_type, match.rule_params, match.is_coop)
  const hideStake = runningMode === 'coop' && match.stake === 0
  const activityLabel = runningMode ? `${match.activity_type} · ${runningMode.toUpperCase()}` : match.activity_type

  const trustBadge = deriveMatchListTrustBadge(match)
  const trustFg = trustToneColor(theme, trustBadge.tone)

  const dateLabel = new Date(match.deadline).toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const stakeLabel = hideStake ? null : `${match.stake} ${CURRENCY_UNIT[match.stake_currency]}`

  const resultColor = isWinner ? theme.green : isLoser ? theme.red : theme.inkSoft
  const resultBg = isWinner ? theme.greenSoft : isLoser ? theme.redSoft : theme.surfaceStrong
  const resultLabel = isWinner ? t('resultWinLabel') : isTie ? t('resultTieLabel') : t('resultLossLabel')

  // Settled team-sport rows show the real score under the header. MyMatch rows
  // carry match_team_result_submissions (RPC) but never match_submissions.
  const isTeamSportActivity =
    match.activity_type === 'basketball' || match.activity_type === 'badminton'
  const scoreboard =
    isSettled && isTeamSportActivity
      ? getTeamSportScoreboard({
          match_submissions: [],
          match_team_result_submissions: match.match_team_result_submissions ?? [],
        })
      : null
  const hasScore = scoreboard !== null && scoreboard.sideAScore !== null && scoreboard.sideBScore !== null

  const pinMutedByCap = !!pin && !pin.pinned && pin.atCap

  const content = (
    <>
      <View style={styles.headerRow}>
        <View style={[styles.iconTile, { backgroundColor: reel.accent }]}>
          <MaterialCommunityIcons name={reel.icon as GlyphName} size={22} color={reel.onAccent} />
        </View>

        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text style={styles.activity} numberOfLines={1}>
              {activityLabel}
            </Text>
            {isCreator && (
              <View style={styles.hostTag}>
                <Text style={styles.hostTagText}>{t('hostBadgeLabel')}</Text>
              </View>
            )}
          </View>

          <Text style={styles.meta} numberOfLines={1}>
            {dateLabel}
            {stakeLabel ? ` · ${stakeLabel}` : ''}
          </Text>

          <View style={styles.trustRow}>
            <MaterialCommunityIcons name={trustBadge.icon} size={13} color={trustFg} />
            <Text style={styles.trustLabel} numberOfLines={1}>
              {trustBadge.label}
            </Text>
          </View>
        </View>

        <View style={styles.trailing}>
          {pin ? (
            <PressableScale
              style={styles.pinStar}
              onPress={() => pin.onToggle(match.id)}
              disabled={pin.pending}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={pin.pinned ? t('unpinMatchLabel') : t('pinMatchLabel')}
            >
              <MaterialCommunityIcons
                name={pin.pinned ? 'star' : 'star-outline'}
                size={20}
                color={pin.pinned ? theme.amber : pinMutedByCap ? theme.mutedSoft : theme.muted}
              />
            </PressableScale>
          ) : isSettled ? (
            <View style={[styles.resultBadge, { backgroundColor: resultBg }]}>
              <Text style={[styles.resultText, { color: resultColor }]}>{resultLabel}</Text>
            </View>
          ) : (
            <StatusPill status={match.status} label={statusLabel(match.status, t)} />
          )}
          {navigationEnabled && !pin && (
            <MaterialCommunityIcons name="chevron-right" size={18} color={theme.mutedSoft} />
          )}
        </View>
      </View>

      {isSettled && (hasScore || pin) && (
        <View style={styles.scoreRow}>
          {hasScore && scoreboard ? (
            <Text style={styles.scoreText} numberOfLines={1}>
              {`${scoreboard.sideAScore} - ${scoreboard.sideBScore}`}
            </Text>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          <View style={styles.scoreTrailing}>
            {pin && (
              <View style={[styles.resultBadge, { backgroundColor: resultBg }]}>
                <Text style={[styles.resultText, { color: resultColor }]}>{resultLabel}</Text>
              </View>
            )}
            {navigationEnabled && pin && (
              <MaterialCommunityIcons name="chevron-right" size={18} color={theme.mutedSoft} />
            )}
          </View>
        </View>
      )}
    </>
  )

  if (!navigationEnabled) {
    return <View style={styles.card}>{content}</View>
  }

  return (
    <Link href={`/match/${match.id}`} asChild>
      <PressableScale style={styles.card}>{content}</PressableScale>
    </Link>
  )
}

function trustToneColor(theme: SportPalette, tone: 'green' | 'amber' | 'blue' | 'neutral'): string {
  if (tone === 'green') return theme.green
  if (tone === 'amber') return theme.amber
  if (tone === 'blue') return theme.blue
  return theme.mutedSoft
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    card: {
      gap: Spacing.sm,
      backgroundColor: theme.arcadePanel,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: theme.line,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.md,
      boxShadow: theme.shadowSoft,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    scoreRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.line,
      paddingTop: Spacing.sm,
    },
    scoreText: {
      flex: 1,
      color: theme.ink,
      fontSize: 20,
      fontWeight: '900',
      fontStyle: 'italic',
      letterSpacing: 0.4,
      fontVariant: ['tabular-nums'],
    },
    scoreTrailing: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    pinStar: {
      minWidth: 32,
      minHeight: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconTile: {
      width: 44,
      height: 44,
      borderRadius: Radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    info: { flex: 1, minWidth: 0, gap: 4 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    activity: {
      flexShrink: 1,
      fontSize: 16,
      fontWeight: '900',
      fontStyle: 'italic',
      color: theme.ink,
      textTransform: 'capitalize',
      letterSpacing: 0.2,
    },
    hostTag: {
      backgroundColor: theme.surfaceStrong,
      borderRadius: Radius.sm,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    hostTagText: { fontSize: 9, fontWeight: '900', color: theme.inkSoft, letterSpacing: 1.2 },
    meta: {
      fontSize: 12.5,
      fontWeight: '600',
      color: theme.muted,
      letterSpacing: 0.2,
      fontVariant: ['tabular-nums'],
    },
    trustRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
    trustLabel: {
      flexShrink: 1,
      fontSize: 11,
      fontWeight: '700',
      color: theme.mutedSoft,
      letterSpacing: 0.2,
    },
    trailing: { alignItems: 'flex-end', gap: Spacing.sm, flexDirection: 'row' },
    resultBadge: {
      minWidth: 58,
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: Radius.pill,
    },
    resultText: {
      fontSize: 13,
      fontWeight: '900',
      fontStyle: 'italic',
      letterSpacing: 1.4,
    },
  })
}
