import { useEffect } from 'react'
import { Stack } from 'expo-router'

import { ComingSoonFeatureShell } from '@/components/roadmap/ComingSoonFeatureShell'
import { useAnalytics } from '@/hooks/useAnalytics'
import { COMING_SOON_FEATURES } from '@/lib/roadmap/comingSoonFeatures'

export default function ProScreen() {
  const { track } = useAnalytics()

  useEffect(() => {
    track({ name: 'view_pro_waitlist' })
  }, [track])

  return (
    <>
      <Stack.Screen options={{ title: 'Rally Pro', headerShown: false }} />
      <ComingSoonFeatureShell feature={COMING_SOON_FEATURES.pro} />
    </>
  )
}
