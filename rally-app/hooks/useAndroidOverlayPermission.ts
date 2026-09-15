import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppState } from 'react-native'

import {
  isAndroidOverlayAvailable,
  isAndroidOverlayPermissionGranted,
  openAndroidOverlaySettings,
} from '@/lib/overlay/androidOverlayBridge'

export function useAndroidOverlayPermission() {
  const isAvailable = useMemo(() => isAndroidOverlayAvailable(), [])
  const [isGranted, setIsGranted] = useState<boolean | null>(isAvailable ? null : false)

  const refresh = useCallback(async () => {
    if (!isAvailable) {
      setIsGranted(false)
      return false
    }
    const granted = await isAndroidOverlayPermissionGranted()
    setIsGranted(granted)
    return granted
  }, [isAvailable])

  const openSettings = useCallback(async () => {
    if (!isAvailable) return
    await openAndroidOverlaySettings()
  }, [isAvailable])

  useEffect(() => {
    void refresh()
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh()
    })
    return () => subscription.remove()
  }, [refresh])

  return {
    isAvailable,
    isGranted,
    refresh,
    openSettings,
  }
}
