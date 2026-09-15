import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import type { MatchCancelRequest, MatchParticipant } from '@/types/match'
import { getParticipantDisplayName } from '@/lib/match/matchRules'

type Props = {
  request: MatchCancelRequest | null
  participants: MatchParticipant[]
  canRequest: boolean
  canRespond: boolean
  isRequesting: boolean
  isResponding: boolean
  onRequest: () => void
  onAgree: () => void
  onDecline: () => void
}

export function MutualCancelCard({
  request,
  participants,
  canRequest,
  canRespond,
  isRequesting,
  isResponding,
  onRequest,
  onAgree,
  onDecline,
}: Props) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  if (!request && !canRequest) return null

  const requester = request
    ? participants.find((participant) => participant.user_id === request.requested_by)
    : null
  const requesterName = requester ? getParticipantDisplayName(requester) : 'The other side'

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <MaterialCommunityIcons name="handshake-outline" size={16} color={theme.amber} />
        <Text style={styles.label}>MUTUAL CANCEL</Text>
      </View>

      {request ? (
        <>
          <Text style={styles.copy}>
            {requesterName} requested a no-fault cancel. If the other side agrees, the match is cancelled and locked stake is refunded.
          </Text>
          <Text style={styles.deadline}>Expires {new Date(request.expires_at).toLocaleString()}</Text>
          {canRespond && (
            <View style={styles.actionRow}>
              <PressableScale style={[styles.button, styles.decline]} onPress={onDecline} disabled={isResponding}>
                <Text style={[styles.buttonText, styles.declineText]}>
                  {isResponding ? 'SENDING...' : 'DECLINE'}
                </Text>
              </PressableScale>
              <PressableScale style={[styles.button, styles.agree]} onPress={onAgree} disabled={isResponding}>
                <Text style={styles.buttonText}>{isResponding ? 'SENDING...' : 'AGREE & REFUND'}</Text>
              </PressableScale>
            </View>
          )}
        </>
      ) : (
        <>
          <Text style={styles.copy}>
            Ask the other side to cancel before settlement. Nothing changes unless they agree within 24 hours.
          </Text>
          <PressableScale style={[styles.button, styles.request]} onPress={onRequest} disabled={isRequesting}>
            <Text style={styles.buttonText}>{isRequesting ? 'REQUESTING...' : 'REQUEST CANCEL'}</Text>
          </PressableScale>
        </>
      )}
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
  card: {
    backgroundColor: theme.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: theme.line,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontSize: 10, fontWeight: '900', color: theme.amber, letterSpacing: 1.2 },
  copy: { color: theme.inkSoft, fontSize: 12, lineHeight: 18 },
  deadline: { color: theme.muted, fontSize: 11 },
  actionRow: { flexDirection: 'row', gap: Spacing.sm },
  button: {
    minHeight: 42,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.lg,
    paddingHorizontal: 12,
  },
  request: { backgroundColor: theme.amber },
  agree: { backgroundColor: theme.orange },
  decline: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line },
  buttonText: { color: theme.chalk, fontSize: 12, fontWeight: '900', letterSpacing: 0.4 },
  declineText: { color: theme.inkSoft },
  })
}
