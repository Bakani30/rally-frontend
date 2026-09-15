import { Text, View } from 'react-native'

import { PressableScale } from '@/components/motion/PressableScale'
import { ScreenBackButton } from '@/components/navigation/ScreenBackButton'
import { useSportTheme } from '@/hooks/useAppTheme'
import { FriendAvatar } from './FriendAvatar'
import { createFriendsHubStyles } from './friendsHubStyles'

export type FriendsHubHeaderProps = {
  showBackButton: boolean
  avatarUrl: string | null
  initials: string
  onOpenProfile: () => void
}

/** Header treatment for the friends hub with the canonical router-backed back control. */
export function FriendsHubHeader({
  showBackButton,
  avatarUrl,
  initials,
  onOpenProfile,
}: FriendsHubHeaderProps) {
  const theme = useSportTheme()
  const styles = createFriendsHubStyles(theme)

  return (
    <View style={styles.header}>
      <View style={styles.headerSide}>
        {showBackButton ? (
          <ScreenBackButton accessibilityLabel="ย้อนกลับ" />
        ) : null}
      </View>
      <Text style={styles.headerTitle} numberOfLines={1}>
        Add Friends
      </Text>
      <PressableScale
        style={styles.profileButton}
        onPress={onOpenProfile}
        accessibilityRole="button"
        accessibilityLabel="เปิดโปรไฟล์"
      >
        <View style={styles.profileAvatar}>
          <FriendAvatar
            avatarUrl={avatarUrl}
            frameAssetRef={null}
            displayName={initials}
            handle={null}
            size={40}
          />
          <View style={styles.currentDot} />
        </View>
      </PressableScale>
    </View>
  )
}
