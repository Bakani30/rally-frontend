import { Redirect, Stack, useLocalSearchParams } from 'expo-router'

import { ComingSoonFeatureShell } from '@/components/roadmap/ComingSoonFeatureShell'
import { getComingSoonFeature } from '@/lib/roadmap/comingSoonFeatures'

export default function ComingSoonFeatureScreen() {
  const params = useLocalSearchParams<{ feature?: string }>()
  const feature = getComingSoonFeature(params.feature)

  if (!feature) {
    return <Redirect href="/(tabs)" />
  }

  return (
    <>
      <Stack.Screen options={{ title: feature.label, headerShown: false }} />
      <ComingSoonFeatureShell feature={feature} />
    </>
  )
}
