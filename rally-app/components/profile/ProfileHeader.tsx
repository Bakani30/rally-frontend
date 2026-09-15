import { router } from 'expo-router'

import { ProfileHeaderView, type ProfileHeaderViewProps } from '@/components/profile/ProfileHeaderView'

type ProfileHeaderProps = ProfileHeaderViewProps

// Top bar of the profile screen: centered title + member card + settings.
export function ProfileHeader({
  title,
  cardOpen,
  onToggleCard,
  onOpenSettings,
  onBack,
  showBackButton,
}: ProfileHeaderProps) {
  const fallbackBack = () => {
    if (router.canGoBack()) router.back()
    else router.replace('/(tabs)')
  }
  return <ProfileHeaderView title={title} cardOpen={cardOpen} onToggleCard={onToggleCard} onOpenSettings={onOpenSettings} onBack={onBack ?? fallbackBack} showBackButton={showBackButton} />
}
