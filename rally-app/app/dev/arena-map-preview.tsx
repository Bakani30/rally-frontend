import { useEffect } from 'react'
import { router, Stack, useLocalSearchParams } from 'expo-router'

import { ArenaMapExpoPreview } from '@/components/arena-map/ArenaMapExpoPreview'
import { canUseArenaMapPreview, parseArenaMapPreviewScenario, parseArenaMapPreviewTheme } from '@/lib/arena-map/arenaMapPreview'

declare const __DEV__: boolean

export default function ArenaMapPreviewScreen() {
  const params = useLocalSearchParams<{ state?: string | string[]; theme?: string | string[] }>()
  const devEnabled = canUseArenaMapPreview(__DEV__)

  useEffect(() => {
    if (!devEnabled) router.replace('/(tabs)' as never)
  }, [devEnabled])

  if (!devEnabled) return null

  return <>
    <Stack.Screen options={{ headerShown: false }} />
    <ArenaMapExpoPreview initialScenario={parseArenaMapPreviewScenario(params.state)} initialTheme={parseArenaMapPreviewTheme(params.theme)} onExit={() => router.back()} />
  </>
}
