import { ProfileEntryGridView } from '@/components/profile/ProfileEntryGridView'
import { guardedRouter } from '@/lib/navigation/guardedRouter'

type ProfileEntryGridProps = {
  checkinOpen: boolean
  checkedInToday: boolean
  onToggleCheckin: () => void
}

// Three feature cards: Referee path, daily check-in (expands), cosmetics.
export function ProfileEntryGrid({
  checkinOpen,
  checkedInToday,
  onToggleCheckin,
}: ProfileEntryGridProps) {
  return <ProfileEntryGridView checkinOpen={checkinOpen} checkedInToday={checkedInToday} onToggleCheckin={onToggleCheckin} onOpenReferee={() => guardedRouter.push('/referee', { actionKey: 'profile:referee' })} onOpenCosmetics={() => guardedRouter.push('/cosmetics?tab=frame', { actionKey: 'profile:cosmetics' })} />
}
