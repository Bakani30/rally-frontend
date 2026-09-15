import { router } from 'expo-router'
import { useEffect } from 'react'
import { ArenaMapStoryBoard } from '@/components/arena-map/ArenaMapStoryBoard'
import { shouldRenderArenaMapPinStory } from '@/lib/arena-map/arenaMapStory'

declare const __DEV__: boolean

/** Authenticated development-only pin reference. It does not mount the production map. */
export default function ArenaMapPinStoryScreen() {
  const canRenderStory = shouldRenderArenaMapPinStory(__DEV__)
  useEffect(() => {
    if (!canRenderStory) router.replace('/arena-map')
  }, [canRenderStory])

  if (!canRenderStory) return null
  return <ArenaMapStoryBoard />
}
