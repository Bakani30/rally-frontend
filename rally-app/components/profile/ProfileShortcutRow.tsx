import { guardedRouter } from '@/lib/navigation/guardedRouter'
import { ProfileShortcutRowView } from '@/components/profile/ProfileShortcutRowView'

// Two quick links to the match history and the wallet.
export function ProfileShortcutRow() {
  return <ProfileShortcutRowView onOpenMatches={() => guardedRouter.push('/matches', { actionKey: 'profile:matches' })} onOpenWallet={() => guardedRouter.push('/wallet', { actionKey: 'profile:wallet' })} />
}
