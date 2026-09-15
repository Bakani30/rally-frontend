import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { TierBadge } from '@/components/ui/TierBadge'
import { Sport, Spacing } from '@/constants/theme'
import { tierByRating } from '@/lib/match/recap/matchRecapMoment'
import { useFirstRunNudgeId } from '@/hooks/useFirstRunNudgeId'
import { useInvitableFriends } from '@/hooks/useInvitableFriends'
import { useInviteCooldown } from '@/hooks/useInviteCooldown'
import type { InvitableFriend } from '@/types/invite'
import { InviteSheetShell } from './InviteSheetShell'
import { InviteUserRow } from './InviteUserRow'

type InviteFriendSheetProps = {
  visible: boolean
  matchId: string | undefined
  onClose: () => void
  onInvite: (friend: InvitableFriend) => void
  onOpenProfile?: (userId: string) => void
  /**
   * When provided (e.g. match-create screen with no match id yet), this list is
   * shown instead of querying the server.
   */
  staticItems?: InvitableFriend[]
}

export function InviteFriendSheet({
  visible,
  matchId,
  onClose,
  onInvite,
  onOpenProfile,
  staticItems,
}: InviteFriendSheetProps) {
  const [query, setQuery] = useState('')
  const friendsQuery = useInvitableFriends(matchId, visible && !staticItems)
  const trimmed = query.trim().toLowerCase()

  const filtered = useMemo(() => {
    const list = staticItems ?? friendsQuery.data ?? []
    if (!trimmed) return list
    return list.filter(
      (f) =>
        (f.handle ?? '').toLowerCase().includes(trimmed) ||
        (f.displayName ?? '').toLowerCase().includes(trimmed),
    )
  }, [staticItems, friendsQuery.data, trimmed])

  const recent = filtered.filter((f) => f.recentlyPlayed)
  const suggested = filtered.filter((f) => f.suggested && !f.recentlyPlayed)
  const others = filtered.filter((f) => !f.recentlyPlayed && !f.suggested)

  // First swipeable row across the full filtered list gets a one-time discovery nudge.
  const nudgeId = useFirstRunNudgeId(true, [filtered[0]?.friendId])

  const handleClose = () => {
    setQuery('')
    onClose()
  }

  return (
    <InviteSheetShell
      visible={visible}
      title="เชิญเพื่อนเข้าห้อง"
      searchValue={query}
      onSearch={setQuery}
      searchPlaceholder="ค้นหาเพื่อน"
      onClose={handleClose}
      loading={!staticItems && friendsQuery.isPending}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: Spacing.lg, paddingBottom: 60 }}
      >
        {filtered.length === 0 && (
          <Text style={styles.dim}>
            {trimmed ? 'ไม่มีเพื่อนตรงกับคำค้น' : 'ยังไม่มีเพื่อนในลิสต์'}
          </Text>
        )}
        <FriendSection title="เล่นล่าสุด" items={recent} onInvite={onInvite} onOpenProfile={onOpenProfile} nudgeId={nudgeId} />
        <FriendSection title="แนะนำ" items={suggested} onInvite={onInvite} onOpenProfile={onOpenProfile} nudgeId={nudgeId} />
        <FriendSection
          title={`เพื่อนทั้งหมด (${others.length})`}
          items={others}
          onInvite={onInvite}
          onOpenProfile={onOpenProfile}
          nudgeId={nudgeId}
        />
      </ScrollView>
    </InviteSheetShell>
  )
}

function FriendSection({
  title,
  items,
  onInvite,
  onOpenProfile,
  nudgeId,
}: {
  title: string
  items: InvitableFriend[]
  onInvite: (friend: InvitableFriend) => void
  onOpenProfile?: (userId: string) => void
  nudgeId: string | null
}) {
  if (items.length === 0) return null
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={{ gap: Spacing.sm }}>
        {items.map((friend) => (
          <FriendInviteRow
            key={friend.friendId}
            friend={friend}
            onInvite={onInvite}
            onOpenProfile={onOpenProfile}
            nudge={friend.friendId === nudgeId}
          />
        ))}
      </View>
    </View>
  )
}

/**
 * Per-row component so `useInviteCooldown` can be called per item (hooks cannot
 * be called inside a .map()).
 */
function FriendInviteRow({
  friend,
  onInvite,
  onOpenProfile,
  nudge,
}: {
  friend: InvitableFriend
  onInvite: (friend: InvitableFriend) => void
  onOpenProfile?: (userId: string) => void
  nudge: boolean
}) {
  const cooldown = useInviteCooldown(friend.lastInvitedAt)
  return (
    <InviteUserRow
      displayName={friend.displayName}
      handle={friend.handle}
      frameAssetRef={friend.frameAssetRef}
      onOpenProfile={onOpenProfile ? () => onOpenProfile(friend.friendId) : undefined}
      rightSlot={
        <View style={styles.rightWrap}>
          <TierBadge tier={tierByRating(friend.rating)} size={15} showLabel />
          {!cooldown.canInvite && (
            <Text style={styles.cooldown}>เชิญแล้ว · {cooldown.remaining}s</Text>
          )}
        </View>
      }
      inviteAction={{
        onInvite: () => onInvite(friend),
        enabled: cooldown.canInvite,
        nudge,
      }}
    />
  )
}

const styles = StyleSheet.create({
  section: { gap: Spacing.sm },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: Sport.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: 4,
  },
  dim: { color: Sport.muted, fontSize: 13, paddingHorizontal: 4 },
  rightWrap: { alignItems: 'flex-end', gap: 4 },
  cooldown: { color: Sport.muted, fontSize: 12, fontWeight: '700' },
})
