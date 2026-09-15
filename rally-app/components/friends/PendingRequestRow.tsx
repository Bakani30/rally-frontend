import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { Radius, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import type { FriendRequest } from '@/types/friends'
import { FriendAvatar } from './FriendAvatar'
import { createFriendRowStyles } from './friendsRowStyles'

type PendingRequestRowProps = {
  request: FriendRequest
}

/** Outgoing request awaiting the other side — passive, status-only. */
export function PendingRequestRow({ request }: PendingRequestRowProps) {
  const theme = useSportTheme()
  const rowStyles = createFriendRowStyles(theme)
  const styles = createStyles(theme)

  return (
    <View style={rowStyles.row}>
      <FriendAvatar
        avatarUrl={request.avatarUrl}
        frameAssetRef={request.frameAssetRef}
        displayName={request.displayName}
        handle={request.handle}
      />
      <View style={rowStyles.mid}>
        <Text style={rowStyles.name} numberOfLines={1}>
          {request.displayName ?? 'Player'}
        </Text>
        {request.handle ? (
          <Text style={rowStyles.handle} numberOfLines={1}>
            @{request.handle}
          </Text>
        ) : null}
      </View>
      <View style={styles.pendingPill}>
        <MaterialCommunityIcons name="clock-outline" size={12} color={theme.muted} />
        <Text style={styles.pendingText}>รอรับ</Text>
      </View>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    pendingPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      minHeight: 44,
      paddingHorizontal: 10,
      borderRadius: Radius.pill,
      backgroundColor: theme.surfaceStrong,
      borderWidth: 1,
      borderColor: theme.line,
    },
    pendingText: { color: theme.muted, fontSize: 11, fontWeight: '800' },
  })
}
