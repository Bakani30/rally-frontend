import { useCallback, useState } from 'react'
import * as Location from 'expo-location'

/**
 * Foreground location for weekly event discovery, requested only on explicit
 * user intent (never on mount). Coordinates live in React state for the
 * session only — never persisted, never sent to analytics.
 */

export type DiscoveryLocationStatus =
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'unavailable'

export type DiscoveryLocation = {
  status: DiscoveryLocationStatus
  coords: { lat: number; lng: number } | null
  request: () => Promise<void>
}

export function useDiscoveryLocation(): DiscoveryLocation {
  const [status, setStatus] = useState<DiscoveryLocationStatus>('idle')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)

  const request = useCallback(async () => {
    setStatus('requesting')
    try {
      const permission = await Location.requestForegroundPermissionsAsync()
      if (permission.status !== 'granted') {
        setStatus('denied')
        return
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })
      setCoords({ lat: position.coords.latitude, lng: position.coords.longitude })
      setStatus('granted')
    } catch {
      setStatus('unavailable')
    }
  }, [])

  return { status, coords, request }
}
