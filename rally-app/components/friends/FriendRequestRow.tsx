import { Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { PressableScale } from '@/components/motion/PressableScale'
import { SwipeableRow } from '@/components/ui/SwipeableRow'
import { useSportTheme } from '@/hooks/useAppTheme'
import type { FriendRequest } from '@/types/friends'
import { FriendAvatar } from './FriendAvatar'
import { createFriendRowStyles } from './friendsRowStyles'

type FriendRequestRowProps = {
  request: FriendRequest
  pending: boolean
  onOpen: (request: FriendRequest) => void
  onAccept: (request: FriendRequest) => void
  onDecline: (request: FriendRequest) => void
  nudge?: boolean
}

/** Incoming request: tap opens profile, swipe-left accepts, swipe-right declines. */
export function FriendRequestRow({
  request,
  pending,
  onOpen,
  onAccept,
  onDecline,
  nudge,
}: FriendRequestRowProps) {
  const theme = useSportTheme()
  const rowStyles = createFriendRowStyles(theme)

  return (
    <SwipeableRow
      enabled={!pending}
      nudge={nudge}
      affirmAction={{
        icon: 'check-bold',
        label: 'รับ',
        bg: theme.actionAccept,
        fg: theme.actionAcceptInk,
        onAction: () => onAccept(request),
        accessibilityLabel: 'ยอมรับคำขอ',
      }}
      destroyAction={{
        icon: 'account-cancel-outline',
        label: 'ปฏิเสธ',
        bg: theme.actionDecline,
        fg: theme.actionDeclineInk,
        onAction: () => onDecline(request),
        accessibilityLabel: 'ปฏิเสธคำขอ',
      }}
    >
      <PressableScale style={rowStyles.row} onPress={() => onOpen(request)}>
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
        <View style={rowStyles.trailingAffordance} pointerEvents="none">
          <MaterialCommunityIcons name="chevron-right" size={22} color={theme.muted} />
        </View>
      </PressableScale>
    </SwipeableRow>
  )
}
