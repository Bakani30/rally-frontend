import { ComingSoonFeatureShell } from '@/components/roadmap/ComingSoonFeatureShell'
import { COMING_SOON_FEATURES } from '@/lib/roadmap/comingSoonFeatures'

export default function GuildTabScreen() {
  return <ComingSoonFeatureShell feature={COMING_SOON_FEATURES.guild} showBack={false} />
}
