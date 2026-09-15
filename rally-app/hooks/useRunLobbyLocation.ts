import { useEffect, useState } from 'react'

import {
  requestRunLocationPermissions,
  type RunLocationPermissionStatus,
} from '@/lib/run-tracking/permissions/locationPermissions'
import { getRunSessionService } from '@/lib/run-tracking/session/runSessionServiceFactory'

type RunLobbyLocation = {
  lat: number
  lng: number
}

type UseRunLobbyLocationOptions = {
  enabled: boolean
}

export type RunLobbyLocationState = {
  permission: RunLocationPermissionStatus
  backgroundPermission: RunLocationPermissionStatus
  warmStartLocation: RunLobbyLocation | null
  error: string | null
  isSearchingGps: boolean
}

const START_READY_ACCURACY_M = 30

export function useRunLobbyLocation({ enabled }: UseRunLobbyLocationOptions): RunLobbyLocationState {
  const [permission, setPermission] = useState<RunLocationPermissionStatus>('unknown')
  const [backgroundPermission, setBackgroundPermission] = useState<RunLocationPermissionStatus>('unknown')
  const [warmStartLocation, setWarmStartLocation] = useState<RunLobbyLocation | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) {
      setWarmStartLocation(null)
      return
    }

    let cancelled = false
    setPermission('requesting')
    setBackgroundPermission('requesting')
    setError(null)

    requestRunLocationPermissions()
      .then((result) => {
        if (cancelled) return
        setPermission(result.foreground)
        setBackgroundPermission(result.background)
        if (result.foreground !== 'granted') {
          setError('Location permission denied')
        }
      })
      .catch(() => {
        if (cancelled) return
        setPermission('denied')
        setBackgroundPermission('unknown')
        setError('Location permission failed')
      })

    return () => {
      cancelled = true
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled || permission !== 'granted') return

    setWarmStartLocation(null)
    void getRunSessionService().prewarm((location) => {
      if (location.accuracy === null || location.accuracy > START_READY_ACCURACY_M) return
      setWarmStartLocation({ lat: location.lat, lng: location.lng })
    })

    return () => {
      void getRunSessionService().cancelPrewarm()
    }
  }, [enabled, permission])

  return {
    permission,
    backgroundPermission,
    warmStartLocation,
    error,
    isSearchingGps: enabled && permission === 'granted' && warmStartLocation === null,
  }
}
