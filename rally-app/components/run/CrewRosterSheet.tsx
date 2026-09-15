import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { RallyPalette, type RunArenaPalette as RunArenaColors } from '@/constants/theme'
import { formatPace } from '@/lib/run-tracking/gps/paceSmoothing'
import {
  type CrewMemberStatus,
  type CrewRosterRow,
} from '@/lib/run-tracking/team/crewRoster'

/** Bright "online" green — livelier than the trust badge green. */
const ONLINE_GREEN = '#2fe39a'

type CrewRosterSheetProps = {
  rows: CrewRosterRow[]
  connected: boolean
  palette: RunArenaColors
  teamGoal?: { currentMeters: number; targetMeters: number } | null
}

export function CrewRosterSheet({ rows, connected, palette, teamGoal }: CrewRosterSheetProps) {
  const styles = useMemo(() => createStyles(palette), [palette])

  return (
    <View style={styles.sheet}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>สมาชิก</Text>
          <Text style={styles.count}>{rows.length} คน</Text>
        </View>
        <View style={styles.connWrap} accessibilityLabel={connected ? 'เชื่อมต่อแล้ว' : 'หลุดการเชื่อมต่อ'}>
          <View style={[styles.connDot, { backgroundColor: connected ? ONLINE_GREEN : palette.textMuted }]} />
        </View>
      </View>

      {teamGoal ? <CrewGoalBar goal={teamGoal} palette={palette} styles={styles} /> : null}

      <View style={styles.list}>
        {rows.map((row) => (
          <CrewRow key={row.userId} row={row} palette={palette} styles={styles} />
        ))}
      </View>
    </View>
  )
}

function CrewGoalBar({
  goal,
  palette,
  styles,
}: {
  goal: { currentMeters: number; targetMeters: number }
  palette: RunArenaColors
  styles: CrewRosterStyles
}) {
  const ratio = goal.targetMeters > 0 ? Math.min(1, goal.currentMeters / goal.targetMeters) : 0
  return (
    <View style={styles.goal}>
      <View style={styles.goalRow}>
        <Text style={styles.goalLabel}>เป้าทีม</Text>
        <Text style={styles.goalValue}>
          {formatKm(goal.currentMeters)} / {formatKm(goal.targetMeters)} กม.
        </Text>
      </View>
      <View style={styles.goalTrack}>
        <View style={[styles.goalFill, { width: `${Math.round(ratio * 100)}%`, backgroundColor: palette.primary }]} />
      </View>
    </View>
  )
}

function CrewRow({
  row,
  palette,
  styles,
}: {
  row: CrewRosterRow
  palette: RunArenaColors
  styles: CrewRosterStyles
}) {
  const status = statusMeta(row.status, row.lastSeenSecondsAgo, palette)
  const avatarBg = avatarColor(row.relation, row.status, palette)
  const avatarInk = row.relation === 'self' && row.status !== 'weak' ? palette.onPrimary : '#ffffff'
  const dim = row.status === 'weak'

  return (
    <View style={[styles.row, dim && styles.rowDim]}>
      <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
        <Text style={[styles.avatarText, { color: avatarInk }]}>{row.initials}</Text>
      </View>
      <View style={styles.rowMid}>
        <Text style={styles.name} numberOfLines={1}>{row.name}</Text>
        <View style={[styles.pill, { backgroundColor: status.bg }]}>
          <Text style={[styles.pillText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.distance}>{formatKm(row.distanceMeters)} กม.</Text>
        <Text style={styles.pace}>{row.paceSecondsPerKm != null ? formatPace(row.paceSecondsPerKm) : '—'}</Text>
      </View>
    </View>
  )
}

function formatKm(meters: number): string {
  return (Math.max(0, meters) / 1000).toFixed(2)
}

function avatarColor(
  relation: CrewRosterRow['relation'],
  status: CrewMemberStatus,
  palette: RunArenaColors,
): string {
  if (status === 'weak') return palette.textMuted
  if (relation === 'self') return palette.primary
  if (relation === 'rival') return palette.danger
  return RallyPalette.blue
}

function statusMeta(
  status: CrewMemberStatus,
  lastSeenSecondsAgo: number | null,
  palette: RunArenaColors,
): { label: string; color: string; bg: string } {
  if (status === 'paused') return { label: 'พักอยู่', color: palette.warning, bg: palette.warningSoft }
  if (status === 'weak') {
    const secs = lastSeenSecondsAgo != null && lastSeenSecondsAgo > 0 ? ` ${lastSeenSecondsAgo}วิ` : ''
    return { label: `สัญญาณอ่อน${secs}`, color: palette.textMuted, bg: palette.primarySoft }
  }
  return { label: 'วิ่งอยู่', color: palette.trust, bg: palette.trustSoft }
}

type CrewRosterStyles = ReturnType<typeof createStyles>

function createStyles(palette: RunArenaColors) {
  return StyleSheet.create({
    sheet: { gap: 10 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
    title: {
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: palette.textMuted,
    },
    count: { fontSize: 11, fontWeight: '900', color: palette.text },
    connWrap: { padding: 4 },
    connDot: { width: 11, height: 11, borderRadius: 999 },
    goal: { gap: 6 },
    goalRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
    goalLabel: {
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: palette.textMuted,
    },
    goalValue: { fontSize: 12, fontWeight: '800', color: palette.text, fontVariant: ['tabular-nums'] },
    goalTrack: { height: 9, borderRadius: 999, backgroundColor: palette.primaryLine, overflow: 'hidden' },
    goalFill: { height: '100%', borderRadius: 999 },
    list: { gap: 7 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
    rowDim: { opacity: 0.6 },
    avatar: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 12, fontWeight: '900', fontStyle: 'italic' },
    rowMid: { flex: 1, gap: 3, minWidth: 0 },
    name: { fontSize: 13, fontWeight: '900', fontStyle: 'italic', color: palette.text },
    pill: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
    pillText: { fontSize: 9.5, fontWeight: '900', letterSpacing: 0.4, textTransform: 'uppercase' },
    rowRight: { alignItems: 'flex-end', gap: 2 },
    distance: {
      fontSize: 13.5,
      fontWeight: '900',
      fontStyle: 'italic',
      color: palette.text,
      fontVariant: ['tabular-nums'],
    },
    pace: { fontSize: 10.5, color: palette.textMuted, fontVariant: ['tabular-nums'] },
  })
}
