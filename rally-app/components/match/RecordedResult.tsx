import { useEffect, useState } from 'react'
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Link } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { matchDetailStyles } from '@/components/match/matchDetailStyles'
import { getRecordedResultActivityHref } from '@/lib/coach/coachActivityNavigation'
import { getSignedProofUrl } from '@/lib/match/proofUploadService'
import { getParticipantDisplayName } from '@/lib/match/matchRules'
import type {
  ActivitySessionMedia,
  MatchParticipant,
  MatchParticipantContribution,
  MatchSubmissionActivity,
  ScoreLogPeriod,
} from '@/types/match'

type Props = {
  session: MatchSubmissionActivity
  participants: MatchParticipant[]
  contributions: MatchParticipantContribution[]
  mode?: 'full' | 'boxScore'
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function periodLabelFor(format: string | null | undefined): string {
  if (format === 'basketball') return 'Q'
  if (format === 'badminton') return 'G'
  return 'P'
}

export function RecordedResult({ session, participants, contributions, mode = 'full' }: Props) {
  const team = session.team_sport_activity_details
  const run = session.running_activity_details
  const media = session.activity_session_media ?? []
  const isBoxScoreMode = mode === 'boxScore'

  const theme = useSportTheme()
  const detail = matchDetailStyles(theme)
  const styles = createStyles(theme)

  return (
    <View style={[detail.potCard, isBoxScoreMode && styles.boxScoreCard]}>
      <Text style={detail.potLabel}>
        {isBoxScoreMode ? 'BOX SCORE' : 'RECORDED RESULT'}
      </Text>

      {team && !isBoxScoreMode && (
        <>
          <Text style={[detail.potValue, { fontSize: 36 }]}>
            {team.side_0_score ?? 0}
            {'  —  '}
            {team.side_1_score ?? 0}
          </Text>
          <Text style={detail.potUnit}>
            {(team.format ?? 'match').toUpperCase()}
            {team.team_size ? ` · ${team.team_size}v${team.team_size}` : ''}
          </Text>
          <ScoreLogView log={team.score_log ?? []} format={team.format} styles={styles} />
        </>
      )}

      {team && isBoxScoreMode && (
        <ScoreLogView log={team.score_log ?? []} format={team.format} styles={styles} />
      )}

      {run && (
        <>
          <Text style={[detail.potValue, { fontSize: 28 }]}>
            {((run.distance_meters ?? 0) / 1000).toFixed(2)} km
          </Text>
          {run.moving_time_seconds != null && (
            <Text style={detail.potUnit}>
              {formatDuration(run.moving_time_seconds)}
            </Text>
          )}
        </>
      )}

      {contributions.length > 0 && (
        <ContributionsView
          participants={participants}
          contributions={contributions}
          theme={theme}
          styles={styles}
        />
      )}

      {media.length > 0 && <ProofGallery media={media} styles={styles} />}

      <Link href={getRecordedResultActivityHref(session)} asChild>
        <PressableScale style={styles.viewActivityBtn} accessibilityLabel="View full activity">
          <MaterialCommunityIcons name="chart-box-outline" size={14} color={theme.inkSoft} />
          <Text style={styles.viewActivityText}>ดู activity เต็ม</Text>
          <MaterialCommunityIcons name="chevron-right" size={14} color={theme.muted} />
        </PressableScale>
      </Link>
    </View>
  )
}

function ScoreLogView({
  log,
  format,
  styles,
}: {
  log: ScoreLogPeriod[]
  format: string | null | undefined
  styles: RecordedResultStyles
}) {
  if (log.length === 0) return null
  const prefix = periodLabelFor(format)
  return (
    <View style={styles.logRow}>
      {log.map((p) => (
        <View key={p.period} style={styles.logChip}>
          <Text style={styles.logLabel}>{prefix}{p.period}</Text>
          <Text style={styles.logScore}>
            {p.side_0}–{p.side_1}
          </Text>
        </View>
      ))}
    </View>
  )
}

function ContributionsView({
  participants,
  contributions,
  theme,
  styles,
}: {
  participants: MatchParticipant[]
  contributions: MatchParticipantContribution[]
  theme: SportPalette
  styles: RecordedResultStyles
}) {
  const byUser = new Map(contributions.map((c) => [c.user_id, c]))
  return (
    <View style={styles.contribBlock}>
      <Text style={styles.sectionLabel}>PLAYER STATS</Text>
      {participants.map((p) => {
        const c = byUser.get(p.user_id)
        if (!c) return null
        return (
          <View key={p.user_id} style={styles.contribRow}>
            <Text style={[styles.contribSide, { color: p.side === 0 ? theme.red : theme.blue }]}>
              {p.side === 0 ? 'A' : 'B'}
            </Text>
            <Text style={styles.contribName} numberOfLines={1}>
              {getParticipantDisplayName(p)}
            </Text>
            <Text style={styles.contribPts}>{c.points} pts</Text>
            {c.note ? <Text style={styles.contribNote} numberOfLines={1}>{c.note}</Text> : null}
          </View>
        )
      })}
    </View>
  )
}

function ProofGallery({ media, styles }: { media: ActivitySessionMedia[]; styles: RecordedResultStyles }) {
  const [urls, setUrls] = useState<(string | null)[]>([])

  useEffect(() => {
    let cancelled = false
    Promise.all(
      media.map((m) =>
        getSignedProofUrl(m.storage_path).catch(() => null),
      ),
    ).then((out) => {
      if (!cancelled) setUrls(out)
    })
    return () => { cancelled = true }
  }, [media])

  return (
    <View style={styles.proofBlock}>
      <Text style={styles.sectionLabel}>PROOF</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.proofRow}>
        {urls.map((url, i) =>
          url ? (
            <Image key={i} source={{ uri: url }} style={styles.proofImg} />
          ) : (
            <View key={i} style={[styles.proofImg, styles.proofMissing]} />
          ),
        )}
      </ScrollView>
    </View>
  )
}

type RecordedResultStyles = ReturnType<typeof createStyles>

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    boxScoreCard: {
      alignItems: 'stretch',
    },
    viewActivityBtn: {
      marginTop: Spacing.md,
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
    logRow: {
      flexDirection: 'row', flexWrap: 'wrap', gap: 6,
      marginTop: 12, justifyContent: 'center',
    },
    logChip: {
      backgroundColor: theme.surface,
      borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
      borderWidth: 1, borderColor: theme.line,
      alignItems: 'center',
    },
    logLabel: { color: theme.muted, fontSize: 10, fontWeight: '700' },
    logScore: { color: theme.ink, fontSize: 13, fontWeight: '600' },
    contribBlock: { marginTop: 16, width: '100%' },
    sectionLabel: {
      color: theme.muted, fontSize: 11, fontWeight: '700',
      letterSpacing: 1.2, marginBottom: 8,
    },
    contribRow: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingVertical: 6,
    },
    contribSide: { fontSize: 11, fontWeight: '700', width: 16 },
    contribName: { color: theme.ink, fontSize: 13, fontWeight: '600', flex: 1 },
    contribPts: { color: theme.amber, fontSize: 13, fontWeight: '700' },
    contribNote: { color: theme.muted, fontSize: 11, flex: 1.2, textAlign: 'right' },
    proofBlock: { marginTop: 16, width: '100%' },
    proofRow: { gap: 8 },
    proofImg: { width: 96, height: 96, borderRadius: 10, backgroundColor: theme.surface },
    proofMissing: { opacity: 0.4 },
  })
}
