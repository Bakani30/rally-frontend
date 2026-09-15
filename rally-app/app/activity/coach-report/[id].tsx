import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { BasketballAnalysisSheet } from '@/components/coach/analysis/BasketballAnalysisSheet'
import { PressableScale } from '@/components/motion/PressableScale'
import { Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useActivityDetail } from '@/hooks/useActivityDetail'
import { useCoachActivityInsights } from '@/hooks/useCoachActivityInsights'
import { useMatchAnalysisSessionId } from '@/hooks/useMatchAnalysisSessionId'
import { useLanguageStore } from '@/stores/languageStore'
import { normalizeBasketballBenchmarkFormat } from '@/lib/coach/coachReportPresentation'
import type { AppLanguage } from '@/lib/i18n/language'
import type { BasketballStatLine } from '@/lib/coach/coachTypes'
import type { ActivityParticipant, TeamSportActivityDetails } from '@/lib/activities/history/activityHistoryTypes'

export default function BasketballCoachReportRoute() {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const language = useLanguageStore((s) => s.language)
  const { id, matchId } = useLocalSearchParams<{ id: string; matchId?: string; focus?: string | string[] }>()
  // Tap-first navigation: the recap button can land here before the match cache
  // knows the session id. `id === 'by-match'` + matchId resolves it in-screen.
  const byMatch = id === 'by-match'
  const {
    data: resolvedSessionId,
    isPending: resolvePending,
    error: resolveError,
  } = useMatchAnalysisSessionId(byMatch ? (typeof matchId === 'string' ? matchId : undefined) : undefined)
  const sessionId = byMatch ? resolvedSessionId ?? undefined : id
  // Fire the insights fetch as soon as sessionId is known, in parallel with the
  // activity detail fetch below, instead of waiting on it — BasketballAnalysisSheet
  // requests the same query key and hits this cached result instantly.
  useCoachActivityInsights(sessionId)
  const { data: session, isPending, error } = useActivityDetail(sessionId)

  if ((byMatch && resolvePending) || (sessionId && isPending)) {
    return <ActivityIndicator style={styles.loader} color={theme.amber} />
  }

  if (resolveError || error || !session || session.activity_type !== 'basketball') {
    return (
      <View style={styles.center}>
        <MaterialCommunityIcons name="chart-box-outline" size={42} color={theme.muted} />
        <Text style={styles.errorText}>Coach Report unavailable</Text>
        <PressableScale style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>Back</Text>
        </PressableScale>
      </View>
    )
  }

  const result = buildResult(
    session.team_sport_activity_details,
    session.activity_session_participants,
    session.user_id,
  )

  return (
    <BasketballAnalysisSheet
      activitySessionId={session.id}
      benchmarkFormat={normalizeBasketballBenchmarkFormat(
        session.team_sport_activity_details?.format,
        session.team_sport_activity_details?.team_size,
      )}
      dateLabel={formatDateLabel(session.started_at, language)}
      resultLabel={result.resultLabel}
      scoreLine={result.scoreLine}
      opponentStats={extractOpponentStats(session.activity_session_participants, session.user_id)}
    />
  )
}

const OPPONENT_STAT_KEYS: (keyof BasketballStatLine)[] = [
  'points', 'rebounds', 'assists', 'steals', 'blocks', 'twoPointersMade', 'threePointersMade', 'freeThrowsMade',
]

// The opponent's box-score line from this match (no effort/private context).
// Empty until real matches log opponent stats; returns null so the "vs opponent"
// toggle stays disabled rather than comparing against nothing.
function extractOpponentStats(participants: ActivityParticipant[], userId: string): BasketballStatLine | null {
  const opponent = participants.find((p) => p.user_id != null && p.user_id !== userId)
  const stats = opponent?.stats as Record<string, unknown> | undefined
  if (!stats) return null
  const line: BasketballStatLine = {}
  for (const key of OPPONENT_STAT_KEYS) {
    const value = stats[key]
    if (typeof value === 'number' && Number.isFinite(value)) line[key] = value
  }
  return Object.keys(line).length > 0 ? line : null
}

function formatDateLabel(iso: string, language: AppLanguage): string {
  try {
    return new Date(iso).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', { day: 'numeric', month: 'short' })
  } catch {
    return ''
  }
}

function buildResult(
  details: TeamSportActivityDetails | null,
  participants: ActivityParticipant[],
  userId: string,
): { resultLabel: 'WIN' | 'LOSS' | 'TIE' | null; scoreLine: string | null } {
  if (!details) return { resultLabel: null, scoreLine: null }
  const ownSide = participants.find((p) => p.user_id === userId)?.side
  const ownScore = ownSide === 1 ? details.side_1_score : details.side_0_score
  const oppScore = ownSide === 1 ? details.side_0_score : details.side_1_score
  let resultLabel: 'WIN' | 'LOSS' | 'TIE' | null = null
  if (details.winning_side !== null && ownSide != null) {
    resultLabel = details.winning_side === ownSide ? 'WIN' : 'LOSS'
  } else if (details.winning_side === null && (ownScore != null || oppScore != null)) {
    resultLabel = 'TIE'
  }
  const scoreLine = ownScore != null && oppScore != null ? `${ownScore}–${oppScore}` : null
  return { resultLabel, scoreLine }
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    loader: { flex: 1, backgroundColor: '#ffffff' },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.md,
      backgroundColor: '#ffffff',
      padding: Spacing.xl,
    },
    errorText: { color: theme.ink, fontSize: 15, fontWeight: '800' },
    backButton: {
      borderWidth: 1,
      borderColor: theme.line,
      borderRadius: 14,
      paddingVertical: 10,
      paddingHorizontal: 22,
    },
    backText: { color: theme.inkSoft, fontSize: 13, fontWeight: '800' },
  })
}
