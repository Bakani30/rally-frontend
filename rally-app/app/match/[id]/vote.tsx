import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Link, useLocalSearchParams } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useCastVote, useMatchVoteTally, useVoteEligibility } from '@/hooks/useMatchVotes'
import type { VoteChoice } from '@/lib/votes/voteService'
import { guardedRouter } from '@/lib/navigation/guardedRouter'
import { formatMatchActionError } from '@/lib/match/matchErrorPresentation'

const CHOICES: { value: VoteChoice; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
  { value: 'side_a', label: 'Side A', icon: 'alpha-a-circle-outline' },
  { value: 'side_b', label: 'Side B', icon: 'alpha-b-circle-outline' },
  { value: 'tie', label: 'Tie', icon: 'equal-box' },
  { value: 'invalid', label: 'Invalid proof', icon: 'alert-circle-outline' },
]

export default function MatchVoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const [selected, setSelected] = useState<VoteChoice | null>(null)
  const eligibility = useVoteEligibility(id)
  const tally = useMatchVoteTally(id)
  const vote = useCastVote(id)

  const canSubmit = eligibility.data === true && selected !== null && !vote.isPending

  async function submitVote() {
    if (!selected) return
    await vote.mutateAsync(
      { vote: selected, reason: null },
      { onSuccess: () => guardedRouter.replace(`/match/${id}`, { actionKey: `vote:${id}:match` }) },
    )
  }

  return (
    <View style={styles.center}>
      <MaterialCommunityIcons name="shield-account-outline" size={42} color={theme.muted} />
      <Text style={styles.title}>Community recommendation</Text>
      <Text style={styles.hint}>
        Your vote helps admin review a disputed match. It does not settle points by itself.
      </Text>

      <View style={styles.tally}>
        <Text style={styles.tallyText}>
          {tally.data?.total_count ?? 0} recommendation{(tally.data?.total_count ?? 0) === 1 ? '' : 's'} recorded
        </Text>
      </View>

      {eligibility.data === false && (
        <Text style={styles.warning}>
          You are not eligible for this vote. Participants and users with open review flags cannot vote.
        </Text>
      )}

      <View style={styles.choiceGrid}>
        {CHOICES.map((choice) => {
          const active = selected === choice.value
          return (
            <PressableScale
              key={choice.value}
              style={[styles.choice, active && styles.choiceActive]}
              onPress={() => setSelected(choice.value)}
              disabled={eligibility.data !== true || vote.isPending}
            >
              <MaterialCommunityIcons
                name={choice.icon}
                size={20}
                color={active ? theme.chalk : theme.inkSoft}
              />
              <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{choice.label}</Text>
            </PressableScale>
          )
        })}
      </View>

      {vote.error != null && <Text style={styles.warning}>{formatMatchActionError(vote.error)}</Text>}

      <PressableScale
        style={[styles.submitButton, !canSubmit && styles.disabled]}
        onPress={submitVote}
        disabled={!canSubmit}
      >
        <Text style={styles.submitText}>{vote.isPending ? 'Submitting...' : 'Submit recommendation'}</Text>
      </PressableScale>

      <Link href={`/match/${id}`} asChild>
        <PressableScale style={styles.backButton}>
          <MaterialCommunityIcons name="chevron-left" size={16} color={theme.chalk} />
          <Text style={styles.backText}>Back to match</Text>
        </PressableScale>
      </Link>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      padding: Spacing.xl,
      backgroundColor: theme.bg,
    },
    title: {
      color: theme.ink,
      fontSize: 18,
      fontWeight: '900',
      textAlign: 'center',
    },
    hint: {
      color: theme.muted,
      fontSize: 13,
      lineHeight: 19,
      textAlign: 'center',
      maxWidth: 320,
    },
    warning: {
      color: theme.amber,
      fontSize: 12,
      lineHeight: 18,
      textAlign: 'center',
      maxWidth: 320,
    },
    tally: {
      minHeight: 38,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 14,
      borderRadius: Radius.pill,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.line,
    },
    tallyText: { color: theme.inkSoft, fontSize: 12, fontWeight: '800' },
    choiceGrid: {
      width: '100%',
      maxWidth: 360,
      gap: Spacing.sm,
      marginTop: Spacing.sm,
    },
    choice: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      borderRadius: Radius.lg,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.line,
    },
    choiceActive: { backgroundColor: theme.red, borderColor: theme.red },
    choiceText: { color: theme.inkSoft, fontSize: 13, fontWeight: '900' },
    choiceTextActive: { color: theme.chalk },
    submitButton: {
      width: '100%',
      maxWidth: 360,
      minHeight: 46,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Radius.lg,
      backgroundColor: theme.red,
    },
    disabled: { opacity: 0.45 },
    submitText: { color: theme.chalk, fontSize: 13, fontWeight: '900' },
    backButton: {
      marginTop: Spacing.sm,
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      borderRadius: Radius.lg,
      backgroundColor: theme.red,
    },
    backText: {
      color: theme.chalk,
      fontSize: 13,
      fontWeight: '900',
    },
  })
}
