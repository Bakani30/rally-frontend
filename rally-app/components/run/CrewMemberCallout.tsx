import { StyleSheet, Text, View } from 'react-native'
import { RallyPalette, type RunArenaPalette as RunArenaColors } from '@/constants/theme'
import { formatPace } from '@/lib/run-tracking/gps/paceSmoothing'
import type { CrewRosterRow } from '@/lib/run-tracking/team/crewRoster'

/**
 * Compact round profile shown when a teammate marker is tapped on the run map:
 * a quick glance at who they are and how they are doing, then it dismisses
 * itself. Purely presentational — the screen owns the tap + auto-dismiss timer.
 */
type CrewMemberCalloutProps = {
  member: CrewRosterRow
  palette: RunArenaColors
}

export function CrewMemberCallout({ member, palette }: CrewMemberCalloutProps) {
  const styles = createStyles(palette)
  const ringColor = accentColor(member, palette)
  const ringInk = member.relation === 'self' && member.status !== 'weak' ? palette.onPrimary : '#ffffff'
  const status = statusMeta(member, palette)
  const gap = formatGap(member.gapVsSelfMeters)

  return (
    <View style={styles.card}>
      <View style={[styles.ring, { backgroundColor: ringColor }]}>
        <Text style={[styles.ringText, { color: ringInk }]}>{member.initials}</Text>
      </View>
      <Text style={styles.name} numberOfLines={1}>{member.name}</Text>
      <View style={[styles.pill, { backgroundColor: status.bg }]}>
        <Text style={[styles.pillText, { color: status.color }]}>{status.label}</Text>
      </View>
      <View style={styles.metrics}>
        <Text style={styles.distance}>{(Math.max(0, member.distanceMeters) / 1000).toFixed(2)} กม.</Text>
        <Text style={styles.pace}>{member.paceSecondsPerKm != null ? formatPace(member.paceSecondsPerKm) : '—'}</Text>
      </View>
      {member.relation === 'rival' && gap ? (
        <Text style={[styles.gap, { color: gap.ahead ? palette.danger : palette.trust }]}>{gap.label}</Text>
      ) : null}
    </View>
  )
}

function formatGap(meters: number): { label: string; ahead: boolean } | null {
  if (meters === 0) return null
  const ahead = meters > 0
  const abs = Math.abs(meters)
  const dist = abs < 1000 ? `${Math.round(abs)} ม.` : `${(abs / 1000).toFixed(1)} กม.`
  return { label: `${ahead ? '▲ นำ' : '▼ ตาม'} ${dist}`, ahead }
}

function accentColor(member: CrewRosterRow, palette: RunArenaColors): string {
  if (member.status === 'weak') return palette.textMuted
  if (member.relation === 'self') return palette.primary
  if (member.relation === 'rival') return palette.danger
  return RallyPalette.blue
}

function statusMeta(member: CrewRosterRow, palette: RunArenaColors): { label: string; color: string; bg: string } {
  if (member.status === 'paused') return { label: 'พักอยู่', color: palette.warning, bg: palette.warningSoft }
  if (member.status === 'weak') {
    const secs = member.lastSeenSecondsAgo != null && member.lastSeenSecondsAgo > 0 ? ` ${member.lastSeenSecondsAgo}วิ` : ''
    return { label: `สัญญาณอ่อน${secs}`, color: palette.textMuted, bg: palette.primarySoft }
  }
  return { label: 'วิ่งอยู่', color: palette.trust, bg: palette.trustSoft }
}

function createStyles(palette: RunArenaColors) {
  return StyleSheet.create({
    card: {
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 12,
      borderRadius: 20,
      backgroundColor: palette.surfaceRaised,
      borderWidth: 1,
      borderColor: palette.primaryLine,
      shadowColor: '#000',
      shadowOpacity: 0.22,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
      minWidth: 140,
    },
    ring: { width: 54, height: 54, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
    ringText: { fontSize: 19, fontWeight: '900', fontStyle: 'italic' },
    name: { fontSize: 14, fontWeight: '900', fontStyle: 'italic', color: palette.text },
    pill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2 },
    pillText: { fontSize: 9.5, fontWeight: '900', letterSpacing: 0.4, textTransform: 'uppercase' },
    metrics: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 2 },
    distance: { fontSize: 14, fontWeight: '900', fontStyle: 'italic', color: palette.text, fontVariant: ['tabular-nums'] },
    pace: { fontSize: 11, color: palette.textMuted, fontVariant: ['tabular-nums'] },
    gap: { fontSize: 10.5, fontWeight: '900', letterSpacing: 0.3, fontVariant: ['tabular-nums'] },
  })
}
