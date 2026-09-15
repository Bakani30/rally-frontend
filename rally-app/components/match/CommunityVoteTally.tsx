import { StyleSheet, Text, View } from 'react-native'
import { Link } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Sport, Spacing } from '@/constants/theme'
import { useMatchVoteTally, useVoteEligibility } from '@/hooks/useMatchVotes'

type Props = {
  matchId: string
  isParticipant: boolean
}

export function CommunityVoteTally({ matchId, isParticipant }: Props) {
  const tally = useMatchVoteTally(matchId)
  const eligibility = useVoteEligibility(isParticipant ? undefined : matchId)
  const counts = tally.data
  const total = counts?.total_count ?? 0

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <MaterialCommunityIcons name="shield-account-outline" size={14} color={Sport.muted} />
        <Text style={styles.label}>ADMIN REVIEW · launch</Text>
      </View>

      <Text style={styles.note}>
        Dispute ถูก freeze ไว้ให้ admin resolve. Community vote เป็น recommendation/admin tool เท่านั้นใน launch.
      </Text>

      <View style={styles.tallyRow}>
        <TallyCell label="A" value={counts?.side_a_count ?? 0} />
        <TallyCell label="B" value={counts?.side_b_count ?? 0} />
        <TallyCell label="Tie" value={counts?.tie_count ?? 0} />
        <TallyCell label="Invalid" value={counts?.invalid_count ?? 0} />
      </View>

      <Text style={styles.statusText}>
        {tally.isLoading
          ? 'Loading recommendation tally...'
          : total > 0
            ? `${total} recommendation${total === 1 ? '' : 's'} recorded`
            : 'No community recommendation yet'}
      </Text>

      {!isParticipant && eligibility.data === true && (
        <Link href={`/match/${matchId}/vote`} asChild>
          <PressableScale style={styles.voteButton}>
            <MaterialCommunityIcons name="vote-outline" size={14} color={Sport.chalk} />
            <Text style={styles.voteButtonText}>Cast recommendation</Text>
          </PressableScale>
        </Link>
      )}
    </View>
  )
}

function TallyCell({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.tallyCell}>
      <Text style={styles.tallyValue}>{value}</Text>
      <Text style={styles.tallyLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Sport.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Sport.line,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontSize: 10, fontWeight: '900', color: Sport.muted, letterSpacing: 1.4 },
  note: { fontSize: 11, color: Sport.inkSoft, lineHeight: 17 },
  tallyRow: { flexDirection: 'row', gap: Spacing.sm },
  tallyCell: {
    flex: 1,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    backgroundColor: Sport.bgElevated,
    borderWidth: 1,
    borderColor: Sport.line,
  },
  tallyValue: { color: Sport.ink, fontSize: 16, fontWeight: '900', fontVariant: ['tabular-nums'] },
  tallyLabel: { color: Sport.muted, fontSize: 9, fontWeight: '800', letterSpacing: 0.8, marginTop: 2 },
  statusText: { color: Sport.muted, fontSize: 10, fontWeight: '700' },
  voteButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: Radius.lg,
    backgroundColor: Sport.red,
  },
  voteButtonText: { color: Sport.chalk, fontSize: 12, fontWeight: '900', letterSpacing: 0.3 },
})
