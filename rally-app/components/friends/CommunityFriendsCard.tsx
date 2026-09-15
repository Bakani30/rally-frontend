import { Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { PressableScale } from '@/components/motion/PressableScale'
import { useSportTheme } from '@/hooks/useAppTheme'
import { createFriendsHubStyles } from './friendsHubStyles'

export type CommunityFriendsCardProps = {
  friendCount: number
  requestCount: number
  onPress: () => void
}

/** Compact community entry point for the friends and requests surfaces. */
export function CommunityFriendsCard({
  friendCount,
  requestCount,
  onPress,
}: CommunityFriendsCardProps) {
  const theme = useSportTheme()
  const styles = createFriendsHubStyles(theme)

  return (
    <PressableScale
      style={styles.communityCard}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Friends ${friendCount}, Requests ${requestCount}`}
    >
      <View style={styles.communityCopy}>
        <Text style={styles.communityTitle}>Friends</Text>
        <Text style={styles.communityMeta}>{friendCount} friends</Text>
      </View>
      <View style={styles.communityRequest}>
        <Text style={styles.communityRequestLabel}>Requests</Text>
        <Text style={styles.communityRequestCount}>{requestCount}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color={theme.muted} />
    </PressableScale>
  )
}
