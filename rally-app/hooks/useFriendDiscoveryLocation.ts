import { useCallback, useEffect, useState } from 'react'
import * as Location from 'expo-location'
import { AppState } from 'react-native'

import { openAppSettings } from '@/lib/permissions/appSettings'
import {
  toFriendDiscoveryCell,
  type FriendDiscoveryCell,
} from '@/lib/users/friendDiscoveryLocation'
import {
  getFriendDiscoveryLocationEnabled,
  setFriendDiscoveryLocation,
} from '@/lib/users/friendDiscoveryLocationRepository'

export type FriendDiscoveryLocationStatus =
  | 'idle'
  | 'restricted'
  | 'hydrating'
  | 'requesting'
  | 'enabled'
  | 'denied'
  | 'unavailable'

export type FriendDiscoveryLocation = {
  status: FriendDiscoveryLocationStatus
  enabled: boolean
  request: () => Promise<boolean>
  disable: () => Promise<boolean>
  openSettings: () => Promise<void>
}

/**
 * Opt-in foreground location for Friends discovery. The hook converts the
 * device fix to a coarse cell before the repository call and never stores the
 * raw coordinates in React state or analytics.
 */
export function useFriendDiscoveryLocation(
  userId?: string,
  locationAgeEligible = false,
): FriendDiscoveryLocation {
  const [status, setStatus] = useState<FriendDiscoveryLocationStatus>('idle')
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    let cancelled = false
    setEnabled(false)

    if (!userId || !locationAgeEligible) {
      setStatus(userId && !locationAgeEligible ? 'restricted' : 'idle')
      return () => {
        cancelled = true
      }
    }

    setStatus('hydrating')
    void getFriendDiscoveryLocationEnabled()
      .then((isEnabled) => {
        if (cancelled) return
        setEnabled(isEnabled)
        setStatus(isEnabled ? 'enabled' : 'idle')
      })
      .catch(() => {
        if (cancelled) return
        setEnabled(false)
        setStatus('unavailable')
      })

    return () => {
      cancelled = true
    }
  }, [locationAgeEligible, userId])

  const refreshPermission = useCallback(async (): Promise<void> => {
    if (!userId || !locationAgeEligible) return

    try {
      const permission = await Location.getForegroundPermissionsAsync()
      if (permission.status === 'granted') {
        setStatus((current) => {
          if (current === 'hydrating' || current === 'requesting') return current
          return enabled ? 'enabled' : 'idle'
        })
        return
      }

      setStatus((current) => {
        if (current === 'hydrating' || current === 'requesting') return current
        return permission.canAskAgain === false ? 'denied' : 'idle'
      })
    } catch {
      setStatus((current) => {
        if (current === 'hydrating' || current === 'requesting') return current
        return 'unavailable'
      })
    }
  }, [enabled, locationAgeEligible, userId])

  useEffect(() => {
    if (!userId || !locationAgeEligible) return

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') void refreshPermission()
    })

    return () => subscription.remove()
  }, [locationAgeEligible, refreshPermission, userId])

  const request = useCallback(async (): Promise<boolean> => {
    if (!userId || !locationAgeEligible) {
      setStatus(userId && !locationAgeEligible ? 'restricted' : 'unavailable')
      return false
    }

    setStatus('requesting')
    try {
      const permission = await Location.requestForegroundPermissionsAsync()
      if (permission.status !== 'granted') {
        setStatus(permission.canAskAgain === false ? 'denied' : 'idle')
        return false
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })
      const cell: FriendDiscoveryCell = toFriendDiscoveryCell({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      })
      await setFriendDiscoveryLocation(cell)
      setEnabled(true)
      setStatus('enabled')
      return true
    } catch {
      setEnabled(false)
      setStatus('unavailable')
      return false
    }
  }, [locationAgeEligible, userId])

  const disable = useCallback(async (): Promise<boolean> => {
    try {
      await setFriendDiscoveryLocation(null)
      setEnabled(false)
      setStatus('idle')
      return true
    } catch {
      setStatus('unavailable')
      return false
    }
  }, [])

  return {
    status,
    enabled,
    request,
    disable,
    openSettings: openAppSettings,
  }
}
