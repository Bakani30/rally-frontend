import { Link, type Href } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Platform, StyleSheet, Text, View, type ViewStyle } from 'react-native'
import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import type { ActivityHistoryItem } from '@/lib/activities/history/activityHistoryTypes'
import { ACTIVITY_LABEL, type Activity } from '@/lib/match/matchConfig'
import { getSportReelItem, type SportReelKey } from '@/lib/match/sportReel'

type GlyphName = keyof typeof MaterialCommunityIcons.glyphMap

type ActivityMemoryCardProps = {
  item: ActivityHistoryItem
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return 'manual'
  const mins = Math.round(seconds / 60)
  if (mins < 60) return `${mins} min`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

function metricFor(item: ActivityHistoryItem): string {
  const run = item.running_activity_details
  if (run?.distance_meters) return `${(run.distance_meters / 1000).toFixed(2)} km`

  const team = item.team_sport_activity_details
  if (team) return `${team.side_0_score ?? 0} - ${team.side_1_score ?? 0}`

  return formatDuration(item.duration_seconds)
}

export function ActivityMemoryCard({ item }: ActivityMemoryCardProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const activity = item.activity_type as Activity
  const reel = getSportReelItem(activity as SportReelKey)
  const proofCount = item.activity_session_media?.length ?? 0
  // Runs have their own restyled recap (app/run/summary/[sessionId].tsx) —
  // send them straight there instead of the generic activity-detail screen
  // so the run history feed doesn't send users through two run summary UIs.
  const href = (activity === 'running' ? `/run/summary/${item.id}` : `/activity/${item.id}`) as unknown as Href

  return (
    <Link href={href} asChild>
      <PressableScale style={styles.card}>
        <View style={[styles.iconBox, { backgroundColor: reel.accent }]}>
          <MaterialCommunityIcons name={reel.icon as GlyphName} size={20} color={reel.onAccent} />
        </View>
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={1}>
            {item.title || ACTIVITY_LABEL[activity] || 'Activity'}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {formatDate(item.started_at)} · {formatDuration(item.duration_seconds)}
            {item.location_name ? ` · ${item.location_name}` : ''}
          </Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.metric}>{metricFor(item)}</Text>
          {proofCount > 0 ? (
            <View style={styles.proofRow}>
              <MaterialCommunityIcons name="image-outline" size={11} color={theme.mutedSoft} />
              <Text style={styles.proofText}>{proofCount}</Text>
            </View>
          ) : null}
        </View>
        <MaterialCommunityIcons name="chevron-right" size={18} color={theme.mutedSoft} />
      </PressableScale>
    </Link>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    card: {
      width: '100%',
      minHeight: 72,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.arcadePanel,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      ...rowShadow(theme),
    },
    iconBox: {
      width: 44,
      height: 44,
      borderRadius: Radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: { flex: 1, minWidth: 0 },
    title: { color: theme.ink, fontSize: 14, fontWeight: '900' },
    meta: { color: theme.muted, fontSize: 12, marginTop: 3 },
    right: { alignItems: 'flex-end', gap: 4 },
    metric: { color: theme.ink, fontSize: 14, fontWeight: '900', fontStyle: 'italic', fontVariant: ['tabular-nums'] },
    proofRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    proofText: { color: theme.mutedSoft, fontSize: 11, fontWeight: '800' },
  })
}

function rowShadow(theme: SportPalette): ViewStyle {
  if (Platform.OS === 'web') {
    return { boxShadow: `0 6px 16px ${theme.arcadeShadow}` } as unknown as ViewStyle
  }
  return {
    shadowColor: theme.arcadeShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2,
  }
}
