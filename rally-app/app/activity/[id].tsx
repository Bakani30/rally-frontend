import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Link, router, useLocalSearchParams } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Screen } from '@/components/layout/Screen'
import { ScreenBackButton } from '@/components/navigation/ScreenBackButton'
import { MapLibreRunView } from '@/components/maps/MapLibreRunView'
import { ActivityIcon } from '@/components/ui/ActivityIcon'
import { PressableScale } from '@/components/motion/PressableScale'
import { Reveal } from '@/components/motion/Reveal'
import { ProofViewer } from '@/components/proof/ProofViewer'
import { CoachAnalysisEntryModal } from '@/components/coach/CoachAnalysisEntryModal'
import { ActivityColor, Fonts, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useActivityDetail, useLinkedMatch } from '@/hooks/useActivityDetail'
import { shouldOpenCoachStartInput } from '@/lib/coach/coachActivityNavigation'
import { guardedRouter } from '@/lib/navigation/guardedRouter'
import { normalizeBasketballBenchmarkFormat } from '@/lib/coach/coachReportPresentation'
import { ACTIVITY_LABEL, type Activity } from '@/lib/match/matchConfig'
import type {
  ActivityParticipant,
  RunningActivityDetails,
  TeamSportActivityDetails,
} from '@/lib/activities/history/activityHistoryTypes'
import type { GpsPoint } from '@/lib/run-tracking/gps/gpsTypes'

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function formatDuration(sec: number | null | undefined): string {
  if (!sec || sec <= 0) return '—'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${h}:${pad2(m)}:${pad2(s)}`
  return `${m}:${pad2(s)}`
}

function formatPace(secPerKm: number | null | undefined): string {
  if (!secPerKm || secPerKm <= 0) return '—'
  const m = Math.floor(secPerKm / 60)
  const s = secPerKm % 60
  return `${m}:${pad2(s)} /km`
}

function km(meters: number | null | undefined): string {
  if (meters == null) return '—'
  return `${(meters / 1000).toFixed(2)} km`
}

export default function ActivityDetailScreen() {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { id, coach } = useLocalSearchParams<{ id: string; coach?: string | string[] }>()
  const { data: session, isPending, error } = useActivityDetail(id)
  const { data: linkedMatch } = useLinkedMatch(id, Boolean(session))
  const [scrollEnabled, setScrollEnabled] = useState(true)
  const [entryDismissed, setEntryDismissed] = useState(false)
  const shouldStartCoachInput = shouldOpenCoachStartInput({
    activityType: session?.activity_type,
    coachParam: coach,
  })

  useEffect(() => {
    if (shouldStartCoachInput) setEntryDismissed(false)
  }, [shouldStartCoachInput])

  if (isPending) return <ActivityIndicator style={styles.loader} color={theme.chalk} />

  if (error || !session) {
    return (
      <View style={styles.center}>
        <MaterialCommunityIcons name="run-fast" size={42} color={theme.muted} />
        <Text style={styles.errorText}>ไม่พบ activity นี้</Text>
        <PressableScale
          style={styles.secondaryBtn}
          onPress={() => guardedRouter.replace('/(tabs)/matches', { actionKey: `activity:${id}:error-history` })}
        >
          <Text style={styles.secondaryBtnText}>ย้อนกลับ</Text>
        </PressableScale>
      </View>
    )
  }

  const activitySessionId = session.id
  const accent = ActivityColor[session.activity_type as Activity] ?? theme.red
  const startedAt = new Date(session.started_at)
  const proofPaths = (session.activity_session_media ?? []).map((m) => m.storage_path)
  const runPath =
    (session.running_activity_details?.route_summary as { path?: GpsPoint[] } | null)?.path ?? []

  const ownTeamScore = getOwnTeamScore(
    session.team_sport_activity_details,
    session.activity_session_participants,
    session.user_id,
  )
  const benchmarkFormat = normalizeBasketballBenchmarkFormat(
    session.team_sport_activity_details?.format,
    session.team_sport_activity_details?.team_size,
  )
  const isRunningActivity = session.activity_type === 'running' && Boolean(session.running_activity_details)

  function openRunAnalysisSummary() {
    router.push({
      pathname: '/run/summary/[sessionId]',
      params: { sessionId: activitySessionId, recap: '1' },
    })
  }

  return (
    <Screen
      edges={['top', 'bottom']}
      bottomPad={48}
      backgroundColor={theme.bg}
      scrollEnabled={scrollEnabled}
      contentContainerStyle={styles.container}
    >
      <ScreenBackButton
        onPress={() => guardedRouter.replace('/(tabs)/matches', { actionKey: `activity:${id}:history` })}
      />

      <CoachAnalysisEntryModal
        visible={shouldStartCoachInput && !entryDismissed}
        activitySessionId={activitySessionId}
        startedAt={session.started_at}
        endedAt={session.ended_at}
        durationSeconds={session.duration_seconds}
        ownTeamScore={ownTeamScore}
        benchmarkFormat={benchmarkFormat}
        onDismiss={() => setEntryDismissed(true)}
        onComplete={() => router.push(`/activity/coach-report/${activitySessionId}`)}
      />

      <Reveal delay={0}>
        <View style={[styles.headerCard, { borderColor: `${accent}55` }]}>
          <View style={styles.headerRow}>
            <View style={[styles.iconBox, { backgroundColor: `${accent}22` }]}>
              <ActivityIcon activity={session.activity_type as Activity} size={22} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>
                {session.title || ACTIVITY_LABEL[session.activity_type as Activity] || 'Activity'}
              </Text>
              <Text style={styles.activitySub}>
                {startedAt.toLocaleString()}
                {session.location_name ? ` · ${session.location_name}` : ''}
              </Text>
            </View>
          </View>

          {session.notes && <Text style={styles.notes}>{session.notes}</Text>}

          <View style={styles.metaRow}>
            <Meta theme={theme} icon="clock-outline" label={formatDuration(session.duration_seconds)} />
            {session.verified_at && (
              <Meta theme={theme} icon="check-decagram" label="verified" tone="positive" />
            )}
            <Meta theme={theme} icon="cube-outline" label={`source: ${session.source}`} tone="muted" />
          </View>
        </View>
      </Reveal>

      {session.running_activity_details && (
        <Reveal delay={80}>
          <RunningStats theme={theme} details={session.running_activity_details} accent={accent} />
        </Reveal>
      )}

      {isRunningActivity && (
        <Reveal delay={95}>
          <PressableScale
            style={styles.runAnalysisButton}
            onPress={openRunAnalysisSummary}
            accessibilityRole="button"
            accessibilityLabel="ดูสรุปผลวิเคราะห์การวิ่ง"
          >
            <MaterialCommunityIcons name="chart-timeline-variant" size={16} color={theme.chalk} />
            <Text style={styles.runAnalysisText}>ดูสรุปผลวิเคราะห์การวิ่ง</Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color={theme.chalk} />
          </PressableScale>
        </Reveal>
      )}

      {runPath.length >= 2 && (
        <Reveal delay={110}>
          <View style={styles.section}>
            <View style={styles.sectionHeadingRow}>
              <Text style={styles.sectionLabel}>ROUTE MAP</Text>
              <Text style={styles.sectionMeta}>{runPath.length} GPS pts</Text>
            </View>
            <View
              style={styles.mapContainer}
              onTouchStart={() => setScrollEnabled(false)}
              onTouchEnd={() => setScrollEnabled(true)}
              onTouchCancel={() => setScrollEnabled(true)}
            >
              <MapLibreRunView path={runPath} isLive={false} fitRouteTightly />
            </View>
            <Link href={`/run/share/${activitySessionId}`} asChild>
              <PressableScale style={styles.shareStoryButton}>
                <MaterialCommunityIcons name="instagram" size={16} color={theme.chalk} />
                <Text style={styles.shareStoryText}>Share run story</Text>
                <MaterialCommunityIcons name="chevron-right" size={16} color={theme.chalk} />
              </PressableScale>
            </Link>
          </View>
        </Reveal>
      )}

      {session.team_sport_activity_details && (
        <Reveal delay={80}>
          <TeamSportStats theme={theme} details={session.team_sport_activity_details} accent={accent} />
        </Reveal>
      )}

      <Reveal delay={140}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PROOF · {proofPaths.length}</Text>
          {proofPaths.length === 0 ? (
            <Text style={styles.emptyHint}>ยังไม่มีหลักฐานที่อัปโหลด</Text>
          ) : (
            <ProofViewer paths={proofPaths} />
          )}
          {Platform.OS !== 'web' && proofPaths.some((p) => /\.(mp4|mov|webm|m4v)$/i.test(p)) && (
            <Text style={styles.placeholderNote}>
              * วิดีโอจะเปิดใน browser ภายในแอพ (เร็วๆ นี้จะเล่นใน-app ได้)
            </Text>
          )}
        </View>
      </Reveal>

      {linkedMatch && (
        <Reveal delay={200}>
          <Link href={`/match/${linkedMatch.match_id}`} asChild>
            <PressableScale style={styles.linkCard}>
              <MaterialCommunityIcons name="sword-cross" size={18} color={accent} />
              <View style={{ flex: 1 }}>
                <Text style={styles.linkLabel}>LINKED MATCH</Text>
                <Text style={styles.linkText}>
                  {linkedMatch.activity_type} · {linkedMatch.status}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={18} color={theme.muted} />
            </PressableScale>
          </Link>
        </Reveal>
      )}
    </Screen>
  )
}

function getOwnTeamScore(
  details: TeamSportActivityDetails | null,
  participants: ActivityParticipant[],
  userId: string,
): number | null {
  if (!details) return null
  const ownSide = participants.find((participant) => participant.user_id === userId)?.side
  if (ownSide === 0) return details.side_0_score
  if (ownSide === 1) return details.side_1_score
  const scores = [details.side_0_score, details.side_1_score].filter(
    (score): score is number => typeof score === 'number',
  )
  return scores.length > 0 ? Math.max(...scores) : null
}

function Meta({
  theme,
  icon,
  label,
  tone,
}: {
  theme: SportPalette
  icon: keyof typeof MaterialCommunityIcons.glyphMap
  label: string
  tone?: 'muted' | 'positive'
}) {
  const styles = createStyles(theme)
  const color = tone === 'positive' ? theme.green : tone === 'muted' ? theme.mutedSoft : theme.muted
  const textColor = tone === 'positive' ? theme.green : tone === 'muted' ? theme.mutedSoft : theme.inkSoft
  return (
    <View style={styles.metaPill}>
      <MaterialCommunityIcons name={icon} size={11} color={color} />
      <Text style={[styles.metaText, { color: textColor }]}>{label}</Text>
    </View>
  )
}

function StatBlock({ styles, label, value, accent }: { styles: ReturnType<typeof createStyles>; label: string; value: string; accent: string }) {
  return (
    <View style={styles.statBlock}>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

function RunningStats({ theme, details, accent }: { theme: SportPalette; details: RunningActivityDetails; accent: string }) {
  const styles = createStyles(theme)
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>RUN STATS</Text>
      <View style={styles.statsGrid}>
        <StatBlock styles={styles} label="DISTANCE" value={km(details.distance_meters)} accent={accent} />
        <StatBlock styles={styles} label="MOVING" value={formatDuration(details.moving_time_seconds)} accent={accent} />
        <StatBlock styles={styles} label="PACE" value={formatPace(details.pace_seconds_per_km)} accent={accent} />
      </View>
      {(details.avg_heart_rate || details.calories || details.elevation_gain_meters) && (
        <View style={styles.statsGridSecondary}>
          {details.avg_heart_rate != null && (
            <StatBlock styles={styles} label="AVG HR" value={`${details.avg_heart_rate} bpm`} accent={theme.inkSoft} />
          )}
          {details.calories != null && (
            <StatBlock styles={styles} label="KCAL" value={String(details.calories)} accent={theme.inkSoft} />
          )}
          {details.elevation_gain_meters != null && (
            <StatBlock styles={styles} label="ELEV" value={`${details.elevation_gain_meters} m`} accent={theme.inkSoft} />
          )}
        </View>
      )}
    </View>
  )
}

function TeamSportStats({
  theme,
  details,
  accent,
}: {
  theme: SportPalette
  details: TeamSportActivityDetails
  accent: string
}) {
  const styles = createStyles(theme)
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>SCORE</Text>
      <View style={styles.scoreRow}>
        <Text style={[styles.bigScore, { color: details.winning_side === 0 ? accent : theme.inkSoft }]}>
          {details.side_0_score ?? 0}
        </Text>
        <Text style={styles.scoreSep}>—</Text>
        <Text style={[styles.bigScore, { color: details.winning_side === 1 ? accent : theme.inkSoft }]}>
          {details.side_1_score ?? 0}
        </Text>
      </View>
      <Text style={styles.scoreFormat}>
        {(details.format ?? '').toUpperCase()}
        {details.court_or_field ? ` · ${details.court_or_field}` : ''}
      </Text>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    loader: { flex: 1, backgroundColor: theme.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, backgroundColor: theme.bg, padding: Spacing.xl },
    errorText: { color: theme.ink, fontSize: 15, fontWeight: '700' },
    container: { paddingHorizontal: Spacing.xl, gap: Spacing.md },
    headerCard: {
      backgroundColor: theme.surface,
      borderRadius: Radius.xxl,
      borderWidth: 1,
      padding: Spacing.lg,
      gap: Spacing.md,
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    iconBox: {
      width: 44,
      height: 44,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: { fontSize: 20, fontWeight: '900', color: theme.ink, letterSpacing: -0.3 },
    activitySub: { fontSize: 12, color: theme.muted, marginTop: 2 },
    notes: { fontSize: 13, color: theme.inkSoft, lineHeight: 19 },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    metaPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: Radius.pill,
      backgroundColor: theme.surfaceStrong,
      borderWidth: 1,
      borderColor: theme.line,
    },
    metaText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
    section: {
      backgroundColor: theme.surface,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: theme.line,
      padding: Spacing.lg,
      gap: Spacing.sm,
    },
    sectionLabel: { fontSize: 10, fontWeight: '900', color: theme.muted, letterSpacing: 1.6 },
    sectionHeadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sectionMeta: { color: theme.mutedSoft, fontSize: 11, fontWeight: '800' },
    mapContainer: { height: 300, borderRadius: Radius.lg, overflow: 'hidden', marginTop: 4 },
    shareStoryButton: {
      minHeight: 46,
      borderRadius: Radius.lg,
      backgroundColor: theme.red,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      marginTop: 6,
    },
    shareStoryText: { color: theme.chalk, fontSize: 13, fontWeight: '900' },
    runAnalysisButton: {
      minHeight: 48,
      borderRadius: Radius.lg,
      backgroundColor: theme.green,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      marginTop: 8,
      paddingHorizontal: 14,
    },
    runAnalysisText: { color: theme.chalk, fontSize: 13, fontWeight: '900', flexShrink: 1 },
    emptyHint: { fontSize: 12, color: theme.muted },
    placeholderNote: { fontSize: 10, color: theme.mutedSoft, fontStyle: 'italic' },
    statsGrid: { flexDirection: 'row', gap: Spacing.sm },
    statsGridSecondary: { flexDirection: 'row', gap: Spacing.sm, marginTop: 6 },
    statBlock: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: Spacing.md,
      backgroundColor: theme.surfaceStrong,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: theme.line,
    },
    statValue: {
      fontSize: 18,
      fontWeight: '900',
      fontFamily: Fonts?.rounded,
      fontVariant: ['tabular-nums'],
      letterSpacing: -0.3,
    },
    statLabel: { fontSize: 9, color: theme.muted, marginTop: 4, letterSpacing: 1.4, fontWeight: '800' },
    scoreRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: Spacing.lg },
    bigScore: { fontSize: 56, fontWeight: '900', fontFamily: Fonts?.rounded, fontVariant: ['tabular-nums'], letterSpacing: -2 },
    scoreSep: { color: theme.muted, fontSize: 28, fontWeight: '700' },
    scoreFormat: { textAlign: 'center', color: theme.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
    linkCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      backgroundColor: theme.surface,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: theme.line,
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    linkLabel: { fontSize: 9, fontWeight: '900', color: theme.muted, letterSpacing: 1.4 },
    linkText: { fontSize: 13, color: theme.ink, marginTop: 2, fontWeight: '700', textTransform: 'capitalize' },
    secondaryBtn: {
      borderWidth: 1,
      borderColor: theme.line,
      borderRadius: Radius.lg,
      paddingVertical: 10,
      paddingHorizontal: 24,
    },
    secondaryBtnText: { color: theme.inkSoft, fontSize: 13, fontWeight: '700', letterSpacing: 0.4 },
  })
}
