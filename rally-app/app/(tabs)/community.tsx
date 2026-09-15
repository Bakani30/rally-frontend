import { StyleSheet, Text, View } from 'react-native'

import { CommunityFriendsCard } from '@/components/friends/CommunityFriendsCard'
import { Screen } from '@/components/layout/Screen'
import { Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useAuth } from '@/hooks/useAuth'
import { useFriends, useIncomingFriendRequests } from '@/hooks/useFriends'
import { guardedRouter } from '@/lib/navigation/guardedRouter'

export default function CommunityScreen() {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { user } = useAuth()
  const enabled = !!user
  const friendsQuery = useFriends(enabled)
  const incomingRequestsQuery = useIncomingFriendRequests(enabled, user?.id)

  const friends = friendsQuery.data ?? []
  const incomingRequests = incomingRequestsQuery.data ?? []

  return (
    <Screen
      edges={['top', 'bottom']}
      topPad={12}
      bottomPad={96}
      backgroundColor={theme.bg}
      contentContainerStyle={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>SOCIAL HUB</Text>
        <Text style={styles.title}>Community</Text>
        <Text style={styles.subtitle}>เชื่อมต่อกับเพื่อนใน Rally</Text>
      </View>

      <CommunityFriendsCard
        friendCount={friends.length}
        requestCount={incomingRequests.length}
        onPress={() => guardedRouter.push('/friends', { actionKey: 'community:friends' })}
      />
    </Screen>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    container: {
      paddingHorizontal: Spacing.lg,
      gap: Spacing.lg,
    },
    header: {
      gap: Spacing.sm,
      paddingTop: Spacing.sm,
    },
    eyebrow: {
      color: theme.orange,
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 1.4,
    },
    title: {
      color: theme.ink,
      fontSize: 30,
      fontWeight: '900',
      letterSpacing: -0.5,
    },
    subtitle: {
      color: theme.muted,
      fontSize: 14,
      fontWeight: '700',
    },
  })
}
