import { StyleSheet, Text, TextInput, View } from 'react-native'
import { Sport } from '@/constants/theme'
import type { MatchParticipant } from '@/types/match'
import type { ContributionEntry } from '@/lib/activities/submission/submissionTypes'
import { getParticipantDisplayName } from '@/lib/match/matchRules'

type Props = {
  participants: MatchParticipant[]
  contributions: ContributionEntry[]
  onChange: (contributions: ContributionEntry[]) => void
  teamScore?: number | null
}

export function ContributionEditor({ participants, contributions, onChange, teamScore }: Props) {
  const total = contributions.reduce((sum, entry) => sum + entry.points, 0)
  const remaining = typeof teamScore === 'number' ? teamScore - total : null

  function upsert(userId: string, patch: Partial<ContributionEntry>) {
    const existing = contributions.find((c) => c.user_id === userId)
    if (existing) {
      onChange(contributions.map((c) => (c.user_id === userId ? { ...c, ...patch } : c)))
    } else {
      onChange([...contributions, { user_id: userId, points: 0, ...patch }])
    }
  }

  return (
    <View style={styles.block}>
      {remaining !== null && (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>รวม {total}/{teamScore} pts</Text>
          <Text style={[styles.summaryText, remaining === 0 ? styles.summaryOk : styles.summaryWarn]}>
            {remaining === 0 ? 'ครบแล้ว' : remaining > 0 ? `เหลือ ${remaining} pts` : `เกิน ${Math.abs(remaining)} pts`}
          </Text>
        </View>
      )}
      {participants.map((p) => {
        const entry = contributions.find((c) => c.user_id === p.user_id)
        const sideLabel = p.side === 0 ? 'A' : 'B'
        const sideColor = p.side === 0 ? Sport.red : Sport.blue
        return (
          <View key={p.user_id} style={styles.row}>
            <View style={[styles.sideBadge, { backgroundColor: `${sideColor}22`, borderColor: `${sideColor}55` }]}>
              <Text style={[styles.sideText, { color: sideColor }]}>{sideLabel}</Text>
            </View>
            <Text style={styles.name} numberOfLines={1}>
              {getParticipantDisplayName(p)}
            </Text>
            <TextInput
              style={styles.points}
              value={entry ? String(entry.points) : ''}
              onChangeText={(t) => upsert(p.user_id, { points: parseInt(t || '0', 10) || 0 })}
              keyboardType="number-pad"
              placeholder="pts"
              placeholderTextColor={Sport.mutedSoft}
            />
            <TextInput
              style={styles.note}
              value={entry?.note ?? ''}
              onChangeText={(t) => upsert(p.user_id, { note: t })}
              placeholder="note (optional)"
              placeholderTextColor={Sport.mutedSoft}
              maxLength={200}
            />
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  block: { gap: 8 },
  summaryRow: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderRadius: 12,
    backgroundColor: Sport.surface,
    paddingHorizontal: 12,
  },
  summaryText: { color: Sport.muted, fontSize: 12, fontWeight: '800' },
  summaryOk: { color: Sport.green },
  summaryWarn: { color: Sport.amber },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sideBadge: {
    width: 24, height: 24, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  sideText: { fontSize: 11, fontWeight: '700' },
  name: { color: Sport.ink, fontSize: 13, fontWeight: '600', width: 100 },
  points: {
    width: 56,
    backgroundColor: Sport.surface,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    color: Sport.ink,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: Sport.line,
  },
  note: {
    flex: 1,
    backgroundColor: Sport.surface,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    color: Sport.ink,
    fontSize: 12,
    borderWidth: 1,
    borderColor: Sport.line,
  },
})
