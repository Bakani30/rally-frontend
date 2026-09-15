import { memo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AcceptDot } from '@/components/ui/AcceptDot'
import { TrustMiniCard } from '@/components/profile/TrustMiniCard'
import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Sport, Spacing } from '@/constants/theme'
import { getInviteeName, getParticipantDisplayName } from '@/lib/match/matchRules'
import type { MatchInvite, MatchParticipant, Side } from '@/types/match'

type MatchSideCardProps = {
  label: string
  side: Side
  participants: MatchParticipant[]
  pendingInvites: MatchInvite[]
  pot: number
  emptySlots: number
  canJoin: boolean
  joiningSide: Side | null
  joinPending: boolean
  onJoin: (side: Side) => void
  onInvite?: (side: Side) => void
  onCancelInvite?: (inviteId: string) => void
  currentUserId: string
  onEditOwnStake?: () => void
  onViewProfile?: (userId: string) => void
  currencyUnit?: string
  showStake?: boolean
  showTrust?: boolean
}

function MatchSideCardInner({
  label,
  side,
  participants,
  pendingInvites,
  pot,
  emptySlots,
  canJoin,
  joiningSide,
  joinPending,
  onJoin,
  onInvite,
  onCancelInvite,
  currentUserId,
  onEditOwnStake,
  onViewProfile,
  currencyUnit = 'pts',
  showStake = true,
  showTrust = false,
}: MatchSideCardProps) {
  const accentColor = side === 0 ? Sport.red : Sport.blue
  const accentSoft = side === 0 ? Sport.redSoft : Sport.blueSoft

  return (
    <View style={[styles.sideCard, { borderColor: Sport.line }]}>
      <View style={styles.sideHeader}>
        <View style={styles.sideTitleRow}>
          <View style={[styles.sideTag, { backgroundColor: accentSoft, borderColor: `${accentColor}44` }]}>
            <Text style={[styles.sideTagText, { color: accentColor }]}>{label.toUpperCase()}</Text>
          </View>
        </View>
        {showStake && <Text style={styles.sidePot}>{pot} {currencyUnit}</Text>}
      </View>

      {participants.map((participant) => {
        const isMe = participant.user_id === currentUserId
        const canEdit = isMe && !!onEditOwnStake
        const rowContent = (
          <>
            <Text style={styles.playerName}>
              {getParticipantDisplayName(participant)}
              {isMe ? <Text style={styles.youTag}>  YOU</Text> : null}
            </Text>
            <View style={styles.playerMeta}>
              {showStake && (
                <>
                  <Text style={[styles.stakeText, canEdit && styles.stakeTextEditable]}>
                    {participant.stake_contribution}
                  </Text>
                  {canEdit && (
                    <MaterialCommunityIcons name="pencil" size={13} color={accentColor} />
                  )}
                </>
              )}
              <AcceptDot accepted={!!participant.accepted_at} size={16} />
            </View>
          </>
        )

        const trustBadge = showTrust ? (
          <View style={styles.trustWrap}>
            <TrustMiniCard userId={participant.user_id} compact />
          </View>
        ) : null

        if (canEdit) {
          return (
            <View key={participant.user_id}>
              <PressableScale
                style={[styles.playerRow, styles.playerRowEditable, { borderColor: `${accentColor}44` }]}
                onPress={onEditOwnStake}
                accessibilityLabel="Edit your stake"
              >
                {rowContent}
              </PressableScale>
              {trustBadge}
            </View>
          )
        }

        return (
          <View key={participant.user_id}>
            <PressableScale
              style={styles.playerRow}
              onPress={() => onViewProfile?.(participant.user_id)}
              accessibilityLabel="View profile"
            >
              {rowContent}
            </PressableScale>
            {trustBadge}
          </View>
        )
      })}

      {Array.from({ length: emptySlots }).map((_, index) =>
        onInvite ? (
          <PressableScale
            key={`empty-${index}`}
            style={[styles.inviteSlot, { borderColor: `${accentColor}44` }]}
            onPress={() => onInvite(side)}
            accessibilityLabel="เชิญเพื่อน"
          >
            <MaterialCommunityIcons name="account-plus-outline" size={14} color={accentColor} />
            <Text style={[styles.inviteSlotText, { color: accentColor }]}>เชิญเพื่อน</Text>
          </PressableScale>
        ) : (
          <View key={`empty-${index}`} style={styles.emptySlot}>
            <MaterialCommunityIcons name="account-plus-outline" size={14} color={Sport.mutedSoft} />
            <Text style={styles.emptySlotText}>open slot</Text>
          </View>
        )
      )}

      {canJoin && emptySlots > 0 && (
        <PressableScale
          style={[styles.joinBtn, { borderColor: `${accentColor}55`, backgroundColor: accentSoft }]}
          onPress={() => onJoin(side)}
          disabled={joinPending}
        >
          <Text style={[styles.joinBtnText, { color: accentColor }]}>
            {joiningSide === side ? 'Joining…' : `Join ${label}`}
          </Text>
        </PressableScale>
      )}

      {pendingInvites.length > 0 && (
        <View style={styles.pendingStrip}>
          <MaterialCommunityIcons name="email-fast-outline" size={13} color={Sport.mutedSoft} />
          <Text style={styles.pendingStripLabel}>รอตอบรับ</Text>
          <View style={styles.pendingChips}>
            {pendingInvites.map((invite) => (
              <PressableScale
                key={invite.id}
                style={styles.pendingChip}
                onPress={() => onViewProfile?.(invite.invitee_user_id)}
                accessibilityLabel="View invited player profile"
              >
                <Text style={styles.pendingChipName} numberOfLines={1}>
                  {getInviteeName(invite)}
                </Text>
                {onCancelInvite && (
                  <PressableScale
                    onPress={() => onCancelInvite(invite.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityLabel="ยกเลิกคำเชิญ"
                  >
                    <MaterialCommunityIcons name="close-circle" size={16} color={Sport.red} />
                  </PressableScale>
                )}
              </PressableScale>
            ))}
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  sideCard: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Sport.surface,
  },
  sideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sideTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sideTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  sideTagText: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  sidePot: { fontSize: 14, fontWeight: '700', color: Sport.inkSoft, letterSpacing: 0.5 },
  playerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginHorizontal: -10,
  },
  playerRowEditable: {
    borderWidth: 1,
    borderRadius: Radius.md,
    backgroundColor: Sport.surfaceStrong,
    marginHorizontal: -4,
    paddingHorizontal: 10,
    marginVertical: 2,
  },
  playerName: { fontSize: 14, color: Sport.ink },
  pendingStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  pendingStripLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Sport.mutedSoft,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  pendingChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, flexShrink: 1 },
  pendingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Sport.line,
    maxWidth: 160,
  },
  pendingChipName: { fontSize: 12, color: Sport.mutedSoft, flexShrink: 1 },
  youTag: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    color: Sport.muted,
  },
  playerMeta: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  stakeText: { fontSize: 13, color: Sport.muted, fontVariant: ['tabular-nums'] },
  stakeTextEditable: { fontSize: 15, fontWeight: '800', color: Sport.ink },
  emptySlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  emptySlotText: { fontSize: 12, color: Sport.mutedSoft, fontStyle: 'italic', letterSpacing: 0.3 },
  inviteSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 10,
    marginHorizontal: -10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    marginVertical: 2,
  },
  inviteSlotText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.2 },
  joinBtn: {
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  joinBtnText: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  trustWrap: { paddingHorizontal: 10, paddingBottom: 6, marginTop: -4 },
})

// Match detail re-renders on every realtime channel firing (5 channels).
// Most updates only touch one side card — memoize so the other side
// avoids reconciliation when its props are referentially unchanged.
export const MatchSideCard = memo(MatchSideCardInner)
