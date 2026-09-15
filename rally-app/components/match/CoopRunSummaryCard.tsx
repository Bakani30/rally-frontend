import { StyleSheet, Text, View } from 'react-native'
import { Link } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { matchDetailStyles } from '@/components/match/matchDetailStyles'
import { getParticipantDisplayName } from '@/lib/match/matchRules'
import type { MatchParticipant, MatchSubmission } from '@/types/match'

type CoopRunSummaryCardProps = {
  participants: MatchParticipant[]
  submissions: MatchSubmission[]
  requiredCount: number
}

type RunSummary = {
  userId: string
  sessionId: string
  distanceMeters: number
  movingTimeSeconds: number
  pointDelta: number | null
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatPace(distanceMeters: number, seconds: number) {
  if (distanceMeters <= 0 || seconds <= 0) return '--'
  return `${formatDuration(Math.round((seconds * 1000) / distanceMeters))}/km`
}

function expectedTeamReward(distanceMeters: number) {
  // Mirror settle_coop_running_if_ready: 10 pts/km for the first 5 km,
  // 20 pts/km beyond — counted from the first whole kilometre.
  const km = Math.floor(distanceMeters / 1000)
  return Math.min(km, 5) * 10 + Math.max(km - 5, 0) * 20
}

export function CoopRunSummaryCard({
  participants,
  submissions,
  requiredCount,
}: CoopRunSummaryCardProps) {
  const byUser = new Map(participants.map((p) => [p.user_id, p]))
  const runs: RunSummary[] = submissions
    .map((submission) => {
      const session = submission.activity_sessions
      const run = session?.running_activity_details
      if (!session || !run) return null
      return {
        userId: submission.submitted_by,
        sessionId: session.id,
        distanceMeters: run.distance_meters ?? 0,
        movingTimeSeconds: run.moving_time_seconds ?? 0,
        pointDelta: session.point_delta,
      }
    })
    .filter((run): run is RunSummary => run !== null)

  const totalDistanceMeters = runs.reduce((sum, run) => sum + run.distanceMeters, 0)
  const totalMovingSeconds = runs.reduce((sum, run) => sum + run.movingTimeSeconds, 0)
  const submittedCount = runs.length
  const actualReward = runs.length > 0 && runs.every((run) => run.pointDelta != null)
    ? runs.reduce((sum, run) => sum + (run.pointDelta ?? 0), 0)
    : null
  const teamReward = actualReward ?? expectedTeamReward(totalDistanceMeters)
  const rewardEach = submittedCount > 0 ? Math.floor(teamReward / submittedCount) : 0

  const theme = useSportTheme()
  const detail = matchDetailStyles(theme)
  const styles = createStyles(theme)

  return (
    <View style={detail.potCard}>
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name="account-group" size={22} color={theme.green} />
      </View>
      <Text style={detail.potLabel}>TEAM RUN SUMMARY</Text>
      <Text style={[detail.potValue, styles.distanceValue]}>
        {(totalDistanceMeters / 1000).toFixed(2)} km
      </Text>
      <Text style={detail.potUnit}>
        {submittedCount}/{requiredCount} runners · {formatDuration(totalMovingSeconds)}
      </Text>

      <View style={styles.rewardBand}>
        <Text style={styles.rewardLabel}>TEAM REWARD</Text>
        <Text style={styles.rewardValue}>
          {teamReward} pts · {rewardEach} each
        </Text>
      </View>

      <View style={styles.runnerList}>
        {runs.map((run) => {
          const participant = byUser.get(run.userId)
          return (
            <View key={run.sessionId} style={styles.runnerRow}>
              <View style={styles.runnerMain}>
                <Text style={styles.runnerName} numberOfLines={1}>
                  {participant ? getParticipantDisplayName(participant) : 'Runner'}
                </Text>
                <Text style={styles.runnerMeta}>
                  {(run.distanceMeters / 1000).toFixed(2)} km · {formatDuration(run.movingTimeSeconds)} ·{' '}
                  {formatPace(run.distanceMeters, run.movingTimeSeconds)}
                </Text>
              </View>
              <Text style={styles.runnerReward}>
                {run.pointDelta ?? rewardEach} pts
              </Text>
            </View>
          )
        })}
      </View>

      {runs.length > 0 && (
        <Link href={`/activity/${runs[0].sessionId}`} asChild>
          <PressableScale style={styles.viewActivityBtn} accessibilityLabel="View team activity">
            <MaterialCommunityIcons name="chart-box-outline" size={14} color={theme.inkSoft} />
            <Text style={styles.viewActivityText}>ดู activity แรก</Text>
            <MaterialCommunityIcons name="chevron-right" size={14} color={theme.muted} />
          </PressableScale>
        </Link>
      )}
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.greenSoft,
      borderWidth: 1,
      borderColor: 'rgba(50,213,131,0.28)',
      marginBottom: 4,
    },
    distanceValue: { fontSize: 36, lineHeight: 44 },
    rewardBand: {
      marginTop: Spacing.md,
      width: '100%',
      borderWidth: 1,
      borderColor: 'rgba(50,213,131,0.28)',
      borderRadius: Radius.lg,
      backgroundColor: theme.greenSoft,
      padding: Spacing.md,
      alignItems: 'center',
      gap: 4,
    },
    rewardLabel: {
      color: theme.greenVivid,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1.4,
    },
    rewardValue: {
      color: theme.ink,
      fontSize: 18,
      fontWeight: '900',
      fontVariant: ['tabular-nums'],
    },
    runnerList: { width: '100%', marginTop: Spacing.md, gap: 8 },
    runnerRow: {
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: theme.line,
    },
    runnerMain: { flex: 1, minWidth: 0 },
    runnerName: { color: theme.ink, fontSize: 14, fontWeight: '800' },
    runnerMeta: {
      color: theme.muted,
      fontSize: 12,
      fontWeight: '600',
      marginTop: 2,
      fontVariant: ['tabular-nums'],
    },
    runnerReward: {
      color: theme.amber,
      fontSize: 13,
      fontWeight: '900',
      fontVariant: ['tabular-nums'],
    },
    viewActivityBtn: {
      marginTop: Spacing.md,
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: Radius.pill,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.line,
      alignSelf: 'center',
    },
    viewActivityText: { color: theme.inkSoft, fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
  })
}
