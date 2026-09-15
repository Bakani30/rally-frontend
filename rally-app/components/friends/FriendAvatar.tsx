import { Image } from 'expo-image'
import { Text } from 'react-native'

import { ProfileFrame } from '@/components/profile/ProfileFrame'
import { useSportTheme } from '@/hooks/useAppTheme'
import { createFriendRowStyles } from './friendsRowStyles'

type FriendAvatarProps = {
  avatarUrl: string | null
  frameAssetRef: string | null
  displayName: string | null
  handle: string | null
  size?: number
}

/** Framed avatar with initials fallback, shared by all friends-list rows. */
export function FriendAvatar({
  avatarUrl,
  frameAssetRef,
  displayName,
  handle,
  size = 44,
}: FriendAvatarProps) {
  const theme = useSportTheme()
  const styles = createFriendRowStyles(theme)
  const initials = (displayName ?? handle ?? '?').trim().slice(0, 2).toUpperCase() || '?'

  return (
    <ProfileFrame frameAssetRef={frameAssetRef} size={size}>
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: size, height: size }}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <Text style={styles.avatarText} numberOfLines={1}>
          {initials}
        </Text>
      )}
    </ProfileFrame>
  )
}
