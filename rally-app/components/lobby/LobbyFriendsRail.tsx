import { Image, ScrollView, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { PressableScale } from '@/components/motion/PressableScale'
import { Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import type { Friend } from '@/types/friends'

type LobbyFriendsRailProps = {
  friends: Friend[]
  onChallenge: (friend: Friend) => void
  onAddFriend: () => void
}

function initials(name: string | null, handle: string | null): string {
  const source = name ?? handle ?? ''
  const parts = source.trim().split(/\s+/).filter(Boolean).slice(0, 2)
  const joined = parts.map((part) => part[0]?.toUpperCase() ?? '').join('')
  return joined || '?'
}

export function LobbyFriendsRail({ friends, onChallenge, onAddFriend }: LobbyFriendsRailProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>เพื่อน</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {friends.map((friend) => (
          <PressableScale
            key={friend.friendId}
            style={styles.tile}
            onPress={() => onChallenge(friend)}
            accessibilityRole="button"
            accessibilityLabel={`ชวน ${friend.displayName ?? friend.handle ?? 'เพื่อน'} เล่น`}
          >
            {friend.avatarUrl ? (
              <Image source={{ uri: friend.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarText}>{initials(friend.displayName, friend.handle)}</Text>
              </View>
            )}
            <Text style={styles.tileName} numberOfLines={1}>
              {friend.displayName ?? (friend.handle ? `@${friend.handle}` : '—')}
            </Text>
          </PressableScale>
        ))}

        <PressableScale
          style={styles.tile}
          onPress={onAddFriend}
          accessibilityRole="button"
          accessibilityLabel="เพิ่มเพื่อน"
        >
          <View style={[styles.avatar, styles.addAvatar]}>
            <MaterialCommunityIcons name="plus" size={20} color={theme.muted} />
          </View>
          <Text style={styles.tileName} numberOfLines={1}>ชวน</Text>
        </PressableScale>
      </ScrollView>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    wrap: {
      gap: Spacing.sm,
    },
    label: {
      color: theme.muted,
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 1.2,
      paddingHorizontal: 2,
    },
    row: {
      flexDirection: 'row',
      gap: Spacing.md,
      paddingHorizontal: 2,
    },
    tile: {
      width: 56,
      alignItems: 'center',
      gap: 4,
    },
    avatar: {
      width: 46,
      height: 46,
      borderRadius: 23,
    },
    avatarFallback: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      color: theme.ink,
      fontSize: 14,
      fontWeight: '900',
    },
    addAvatar: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.line,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
    },
    tileName: {
      color: theme.muted,
      fontSize: 10,
      fontWeight: '700',
      maxWidth: 56,
      textAlign: 'center',
    },
  })
}
