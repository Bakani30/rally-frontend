import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { PressableScale } from '@/components/motion/PressableScale'
import { ProfileFrame } from '@/components/profile/ProfileFrame'
import { SwipeableRow } from '@/components/ui/SwipeableRow'
import { Fonts, Radius, Sport, Spacing } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'

type InviteAction = {
  onInvite: () => void
  enabled: boolean
  nudge?: boolean
}

type InviteUserRowProps = {
  displayName: string | null
  handle: string | null
  frameAssetRef: string | null
  /** When provided, tapping the avatar/name opens the user's profile. */
  onOpenProfile?: () => void
  /** Trailing affordance: cooldown label, trust badge, etc. */
  rightSlot: ReactNode
  /**
   * When provided, wraps the row in SwipeableRow so the user can swipe-left
   * (the affirmative direction) to invite. When omitted the plain card is rendered (legacy/non-swipe mode).
   */
  inviteAction?: InviteAction
}

/**
 * Shared row for the invite sheets: avatar + name + handle on the left, a
 * caller-supplied trailing slot on the right. When `inviteAction` is given the
 * row becomes swipe-first (swipe-left = เชิญ, the affirmative direction) via SwipeableRow. The identity
 * area is tappable only when `onOpenProfile` is given.
 */
export function InviteUserRow({
  displayName,
  handle,
  frameAssetRef,
  onOpenProfile,
  rightSlot,
  inviteAction,
}: InviteUserRowProps) {
  const theme = useSportTheme()
  const initials = (displayName ?? handle ?? '?')[0]?.toUpperCase() ?? '?'

  const identity = (
    <>
      <ProfileFrame frameAssetRef={frameAssetRef} size={40}>
        <Text style={styles.avatarText}>{initials}</Text>
      </ProfileFrame>
      <View style={styles.mid}>
        <Text style={styles.name} numberOfLines={1}>
          {displayName ?? 'Player'}
        </Text>
        {handle && (
          <Text style={styles.handle} numberOfLines={1}>
            @{handle}
          </Text>
        )}
      </View>
    </>
  )

  const card = (
    <View style={styles.row}>
      {onOpenProfile ? (
        <PressableScale style={styles.identity} onPress={onOpenProfile} accessibilityLabel="ดูโปรไฟล์">
          {identity}
        </PressableScale>
      ) : (
        <View style={styles.identity}>{identity}</View>
      )}
      <View style={styles.right}>{rightSlot}</View>
    </View>
  )

  if (!inviteAction) return card

  return (
    <SwipeableRow
      enabled={inviteAction.enabled}
      nudge={inviteAction.nudge}
      affirmAction={{
        icon: 'account-plus-outline',
        label: 'เชิญ',
        bg: theme.actionAccept,
        fg: theme.actionAcceptInk,
        onAction: inviteAction.onInvite,
        accessibilityLabel: 'เชิญ',
      }}
    >
      {card}
    </SwipeableRow>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    // Opaque dark so the SwipeableRow foreground (theme.bg, light in light mode)
    // never bleeds through — invite is a dark-only match surface.
    backgroundColor: Sport.bgElevated,
    borderRadius: Radius.xl,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Sport.line,
  },
  identity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minWidth: 0 },
  mid: { flex: 1, minWidth: 0 },
  name: { fontSize: 14, fontWeight: '700', color: Sport.ink },
  handle: { fontSize: 12, color: Sport.muted, marginTop: 1 },
  avatarText: {
    color: Sport.ink,
    fontSize: 14,
    fontWeight: '900',
    fontFamily: Fonts?.rounded,
    letterSpacing: -0.5,
  },
  right: { flexShrink: 0 },
})
