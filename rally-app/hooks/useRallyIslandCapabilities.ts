import { useCallback, useEffect, useState } from 'react'
import { AppState } from 'react-native'

import {
  DEFAULT_RALLY_ISLAND_CAPABILITIES,
  readRallyIslandDeviceCapabilities,
  type RallyIslandDeviceCapabilities,
} from '@/lib/overlay/rallyIslandCapabilities'

export function useRallyIslandCapabilities(): RallyIslandDeviceCapabilities & {
  refresh: () => Promise<void>
} {
  const [capabilities, setCapabilities] = useState<RallyIslandDeviceCapabilities>(
    DEFAULT_RALLY_ISLAND_CAPABILITIES,
  )

  const refresh = useCallback(async () => {
    const nextCapabilities = await readRallyIslandDeviceCapabilities()
    setCapabilities(nextCapabilities)
  }, [])

  useEffect(() => {
    void refresh()
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' || state === 'inactive') void refresh()
    })
    return () => subscription.remove()
  }, [refresh])

  return {
    ...capabilities,
    refresh,
  }
}
