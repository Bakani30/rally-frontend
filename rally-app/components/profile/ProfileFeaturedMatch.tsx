import { ActivityIndicator } from 'react-native'
import { FeaturedMatchCard } from '@/components/match/FeaturedMatchCard'
import { ProfileFeaturedMatchView } from '@/components/profile/ProfileFeaturedMatchView'
import { ProfileHighlightVideo } from '@/components/profile/ProfileHighlightVideo'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useProfilePinnedMatches } from '@/hooks/useProfilePinnedMatches'
import { guardedRouter } from '@/lib/navigation/guardedRouter'

type ProfileFeaturedMatchProps = {
  userId: string
  // Only the profile owner can pin/unpin, so only they see the "+ Pin a
  // match" slot when they have room left.
  isOwner?: boolean
}

// Pinned-matches section for a profile: up to 3 curated highlights from
// history. Renders nothing for viewers when the owner has pinned nothing (so
// there's no empty placeholder on someone else's profile); shows a spinner
// while loading.
export function ProfileFeaturedMatch({ userId, isOwner = false }: ProfileFeaturedMatchProps) {
  const theme = useSportTheme()
  const { data, isPending, error } = useProfilePinnedMatches(userId)

  if (isPending) return <ActivityIndicator color={theme.chalk} />
  if (error) return null

  return <ProfileFeaturedMatchView pins={data ?? []} isOwner={isOwner} onOpenPinPicker={() => guardedRouter.push(`/user/${userId}/matches`, { actionKey: `user:${userId}:pin-match` })} renderMatch={(pin) => <FeaturedMatchCard match={pin} />} renderHighlight={(pin, index) => <ProfileHighlightVideo userId={userId} matchId={pin.matchId} isOwner={isOwner} pinNumber={index + 1} matchLabel={activityLabel(pin.activityType)} />} />
}

function activityLabel(activityType: string): string {
  if (activityType === 'basketball') return 'Basketball'
  if (activityType === 'badminton') return 'Badminton'
  if (activityType === 'football') return 'Football'
  if (activityType === 'running') return 'Running'
  return 'แมตช์นี้'
}
