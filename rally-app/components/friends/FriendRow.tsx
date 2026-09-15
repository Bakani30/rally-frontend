import { Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { PressableScale } from '@/components/motion/PressableScale'
import { SwipeableRow } from '@/components/ui/SwipeableRow'
import { OnAccent } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import type { Friend } from '@/types/friends'
import { FriendAvatar } from './FriendAvatar'
import { createFriendRowStyles } from './friendsRowStyles'

type FriendRowProps = {
  friend: Friend
  onOpen: (friend: Friend) => void
  onChallenge: (friend: Friend) => void
  onRemove: (friend: Friend) => void
  nudge?: boolean
}

/** Friend row: tap opens profile, swipe-left (affirmative) challenges, swipe-right (destructive) removes. */
export function FriendRow({ friend, onOpen, onChallenge, onRemove, nudge }: FriendRowProps) {
  const theme = useSportTheme()
  const rowStyles = createFriendRowStyles(theme)

  return (
    <SwipeableRow
      nudge={nudge}
      affirmAction={{
        icon: 'sword-cross',
        label: 'ท้า',
        bg: theme.orange,
        fg: OnAccent.onColor,
        onAction: () => onChallenge(friend),
        accessibilityLabel: 'ท้าแข่ง',
      }}
      destroyAction={{
        icon: 'trash-can-outline',
        label: 'ลบ',
        bg: theme.actionDecline,
        fg: theme.actionDeclineInk,
        onAction: () => onRemove(friend),
        accessibilityLabel: 'ลบเพื่อน',
      }}
    >
      <PressableScale style={rowStyles.row} onPress={() => onOpen(friend)}>
        <FriendAvatar
          avatarUrl={friend.avatarUrl}
          frameAssetRef={friend.frameAssetRef}
          displayName={friend.displayName}
          handle={friend.handle}
        />
        <View style={rowStyles.mid}>
          <Text style={rowStyles.name} numberOfLines={1}>
            {friend.displayName ?? 'Player'}
          </Text>
          {friend.handle ? (
            <Text style={rowStyles.handle} numberOfLines={1}>
              @{friend.handle}
            </Text>
          ) : null}
        </View>
        <View style={rowStyles.trailingAffordance} pointerEvents="none">
          <MaterialCommunityIcons name="message-processing-outline" size={21} color={theme.ink} />
        </View>
      </PressableScale>
    </SwipeableRow>
  )
}
