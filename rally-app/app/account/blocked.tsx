import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Image } from 'expo-image'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { useScreenInsets } from '@/components/layout/useScreenInsets'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useBlockedUsers, useSetUserBlock } from '@/hooks/useUserSafety'
import type { BlockedUser } from '@/lib/users/userSafetyTypes'

export default function BlockedUsersScreen() {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { paddingBottom } = useScreenInsets({ edges: ['bottom'], bottomPad: 48 })

  const blocked = useBlockedUsers()
  const unblock = useSetUserBlock()

  if (blocked.isPending) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={theme.orange} />
      </View>
    )
  }

  if (blocked.error) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={styles.errorText}>
          {blocked.error instanceof Error
            ? blocked.error.message.slice(0, 200)
            : 'โหลดไม่สำเร็จ'}
        </Text>
        <PressableScale style={styles.retryBtn} onPress={() => void blocked.refetch()}>
          <Text style={styles.retryText}>ลองใหม่</Text>
        </PressableScale>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <FlatList<BlockedUser>
        data={blocked.data ?? []}
        keyExtractor={(item) => item.blockedId}
        contentContainerStyle={[styles.list, { paddingBottom }]}
        ListEmptyComponent={<View style={styles.emptyBlock} />}
        renderItem={({ item }) => (
          <BlockedUserRow item={item} unblock={unblock} theme={theme} styles={styles} />
        )}
      />
    </View>
  )
}

type RowProps = {
  item: BlockedUser
  unblock: ReturnType<typeof useSetUserBlock>
  theme: SportPalette
  styles: ReturnType<typeof createStyles>
}

function BlockedUserRow({ item, unblock, theme, styles }: RowProps) {
  const initials = (item.displayName ?? item.handle ?? '?')[0]?.toUpperCase() ?? '?'
  const isPending = unblock.isPending

  return (
    <View style={styles.row}>
      <View style={styles.avatarBox}>
        {item.avatarUrl ? (
          <Image
            source={{ uri: item.avatarUrl }}
            style={styles.avatarImg}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <Text style={styles.avatarText}>{initials}</Text>
        )}
      </View>

      <View style={styles.mid}>
        <Text style={styles.name} numberOfLines={1}>
          {item.displayName ?? 'Player'}
        </Text>
        {item.handle ? (
          <Text style={styles.handle} numberOfLines={1}>
            @{item.handle}
          </Text>
        ) : null}
      </View>

      <PressableScale
        style={[styles.unblockBtn, isPending && styles.unblockBtnDisabled]}
        disabled={isPending}
        onPress={() =>
          unblock.mutate({ targetUserId: item.blockedId, action: 'unblock' })
        }
      >
        <MaterialCommunityIcons name="account-cancel-outline" size={13} color={theme.muted} />
        <Text style={styles.unblockText}>เลิกบล็อก</Text>
      </PressableScale>
    </View>
  )
}

const AVATAR_SIZE = 44

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.bg },
    center: { alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
    list: { padding: Spacing.lg, gap: Spacing.sm },
    emptyBlock: { flex: 1 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      backgroundColor: theme.surface,
      borderRadius: Radius.xl,
      paddingVertical: 10,
      paddingHorizontal: Spacing.md,
      borderWidth: 1,
      borderColor: theme.line,
    },
    avatarBox: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: Radius.pill,
      backgroundColor: theme.surfaceStrong,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImg: { width: AVATAR_SIZE, height: AVATAR_SIZE },
    avatarText: { fontSize: 16, fontWeight: '900', color: theme.ink },
    mid: { flex: 1, minWidth: 0 },
    name: { fontSize: 14, fontWeight: '800', color: theme.ink },
    handle: { fontSize: 12, color: theme.muted, marginTop: 1 },
    unblockBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: Radius.pill,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.line,
    },
    unblockBtnDisabled: { opacity: 0.4 },
    unblockText: { fontSize: 11, fontWeight: '700', color: theme.muted },
    errorText: { fontSize: 13, color: theme.red, textAlign: 'center' },
    retryBtn: {
      paddingHorizontal: Spacing.md,
      paddingVertical: 8,
      borderRadius: Radius.lg,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.line,
    },
    retryText: { fontSize: 13, fontWeight: '700', color: theme.ink },
  })
}
