import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Radius, Sport, Spacing } from '@/constants/theme'
import { getParticipantDisplayName } from '@/lib/match/matchRules'
import type { MatchWithRelations } from '@/types/match'

type RelayLeg = {
  legIndex: number
  label: string
  distanceMeters: number
  assignedUserId: string | null
}

type EkidenRelayPlanCardProps = {
  match: MatchWithRelations
}

export function EkidenRelayPlanCard({ match }: EkidenRelayPlanCardProps) {
  const legs = parseRelayLegs(match.rule_params)
  if (legs.length === 0) return null

  const participants = (match.match_participants ?? []).filter((participant) => participant.is_active !== false)
  const participantsByUser = new Map(participants.map((participant) => [participant.user_id, participant]))
  const submittedUserIds = new Set((match.match_submissions ?? []).map((submission) => submission.submitted_by))
  const submittedDistanceMeters = (match.match_submissions ?? []).reduce((sum, submission) => {
    const meters = submission.activity_sessions?.running_activity_details?.distance_meters ?? 0
    return sum + Math.max(0, meters)
  }, 0)
  const targetMeters = getTargetDistance(match.rule_params, legs)
  const progress = targetMeters > 0 ? Math.min(1, submittedDistanceMeters / targetMeters) : 0
  const incompleteRunners = participants.filter((participant) => !submittedUserIds.has(participant.user_id))
  const assignedLegs = legs.filter((leg) => leg.assignedUserId)
  const completedLegs = legs.filter((leg) => leg.assignedUserId && submittedUserIds.has(leg.assignedUserId)).length

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="account-group" size={21} color={Sport.green} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.kicker}>EKIDEN RELAY DRAFT</Text>
          <Text style={styles.title}>42.195K team leg plan</Text>
          <Text style={styles.subtitle}>ตอนนี้ยังใช้ co-op aggregate submission เดิม ไม่มี baton enforcement</Text>
        </View>
      </View>

      <View style={styles.progressBlock}>
        <View style={styles.progressLabels}>
          <Text style={styles.progressValue}>{formatKm(submittedDistanceMeters)} / {formatKm(targetMeters)}</Text>
          <Text style={styles.progressPending}>{completedLegs}/{legs.length} legs</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.trackFill, { width: `${progress * 100}%` }]} />
        </View>
        <View style={styles.metaRail}>
          <View style={styles.metaPill}>
            <MaterialCommunityIcons name="account-check-outline" size={13} color={Sport.green} />
            <Text style={styles.metaPillText}>{assignedLegs.length} assigned</Text>
          </View>
          <View style={styles.metaPill}>
            <MaterialCommunityIcons name="send-clock-outline" size={13} color={Sport.amber} />
            <Text style={styles.metaPillText}>{incompleteRunners.length} runners pending</Text>
          </View>
        </View>
      </View>

      <View style={styles.legList}>
        {legs.map((leg) => {
          const runner = leg.assignedUserId ? participantsByUser.get(leg.assignedUserId) ?? null : null
          const status = getLegStatus(leg, submittedUserIds)
          return (
            <View key={leg.legIndex} style={styles.legRow}>
              <View style={styles.legBadge}>
                <Text style={styles.legBadgeText}>{leg.legIndex}</Text>
              </View>
              <View style={styles.legCopy}>
                <Text style={styles.legTitle} numberOfLines={1}>{leg.label}</Text>
                <Text style={styles.legMeta}>
                  {formatKm(leg.distanceMeters)} · {runner ? getParticipantDisplayName(runner) : 'unassigned'}
                </Text>
              </View>
              <View style={[
                styles.statusPill,
                status === 'done' && styles.statusPillDone,
                status === 'open' && styles.statusPillOpen,
              ]}>
                <Text style={[
                  styles.statusPillText,
                  status === 'done' && styles.statusPillTextDone,
                  status === 'open' && styles.statusPillTextOpen,
                ]}>
                  {status === 'done' ? 'Done' : status === 'pending' ? 'Pending' : 'Open'}
                </Text>
              </View>
            </View>
          )
        })}
      </View>
    </View>
  )
}

function parseRelayLegs(ruleParams: Record<string, unknown>): RelayLeg[] {
  const raw = Array.isArray(ruleParams.relay_legs) ? ruleParams.relay_legs : []
  return raw
    .map((item, index): RelayLeg | null => {
      if (!item || typeof item !== 'object') return null
      const row = item as Record<string, unknown>
      const distanceMeters = numberFrom(row.distanceMeters ?? row.distance_meters)
      if (!distanceMeters || distanceMeters <= 0) return null
      return {
        legIndex: numberFrom(row.legIndex ?? row.leg_index) ?? index + 1,
        label: typeof row.label === 'string' && row.label.trim() ? row.label.trim() : `Leg ${index + 1}`,
        distanceMeters,
        assignedUserId: typeof row.assignedUserId === 'string'
          ? row.assignedUserId
          : typeof row.assigned_user_id === 'string'
            ? row.assigned_user_id
            : null,
      }
    })
    .filter((leg): leg is RelayLeg => leg !== null)
}

function getTargetDistance(ruleParams: Record<string, unknown>, legs: RelayLeg[]): number {
  return numberFrom(ruleParams.target_distance_meters ?? ruleParams.targetDistanceMeters)
    ?? legs.reduce((sum, leg) => sum + leg.distanceMeters, 0)
}

function numberFrom(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) ? parsed : null
}

function formatKm(meters: number): string {
  return `${(Math.max(0, meters) / 1000).toFixed(2)} km`
}

function getLegStatus(leg: RelayLeg, submittedUserIds: Set<string>): 'done' | 'pending' | 'open' {
  if (!leg.assignedUserId) return 'open'
  return submittedUserIds.has(leg.assignedUserId) ? 'done' : 'pending'
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.lg,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: `${Sport.green}52`,
    backgroundColor: Sport.bgElevated,
    gap: Spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Sport.greenSoft,
  },
  headerCopy: { flex: 1, minWidth: 0 },
  kicker: { color: Sport.green, fontSize: 10, lineHeight: 13, fontWeight: '900' },
  title: { color: Sport.ink, fontSize: 17, lineHeight: 22, fontWeight: '900' },
  subtitle: { color: Sport.muted, fontSize: 12, lineHeight: 17, fontWeight: '700' },
  progressBlock: { gap: Spacing.xs },
  progressLabels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  progressValue: { flex: 1, color: Sport.ink, fontSize: 14, lineHeight: 18, fontWeight: '900', fontVariant: ['tabular-nums'] },
  progressPending: { color: Sport.amber, fontSize: 12, lineHeight: 16, fontWeight: '900' },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Sport.surface,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: Sport.green,
  },
  metaRail: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 3 },
  metaPill: {
    minHeight: 28,
    paddingHorizontal: 9,
    borderRadius: 999,
    backgroundColor: Sport.surfaceStrong,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaPillText: { color: Sport.ink, fontSize: 11, lineHeight: 14, fontWeight: '900' },
  legList: { gap: 8 },
  legRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Sport.line,
  },
  legBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Sport.surfaceStrong,
  },
  legBadgeText: { color: Sport.ink, fontSize: 12, fontWeight: '900' },
  legCopy: { flex: 1, minWidth: 0 },
  legTitle: { color: Sport.ink, fontSize: 13, lineHeight: 17, fontWeight: '900' },
  legMeta: { color: Sport.muted, fontSize: 12, lineHeight: 16, fontWeight: '700', marginTop: 1 },
  statusPill: {
    minHeight: 28,
    minWidth: 64,
    paddingHorizontal: 8,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Sport.amberSoft,
  },
  statusPillDone: { backgroundColor: Sport.greenSoft },
  statusPillOpen: { backgroundColor: Sport.surfaceStrong },
  statusPillText: { color: Sport.amber, fontSize: 11, lineHeight: 14, fontWeight: '900' },
  statusPillTextDone: { color: Sport.green },
  statusPillTextOpen: { color: Sport.muted },
})
