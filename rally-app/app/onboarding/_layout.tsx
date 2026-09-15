import { useEffect } from 'react'
import { Stack } from 'expo-router'

import { useOnboardingStore } from '@/stores/onboardingStore'

export default function OnboardingLayout() {
  const hydrate = useOnboardingStore((state) => state.hydrate)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        animation: 'slide_from_right',
      }}
    />
  )
}
