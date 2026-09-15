import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * These tests drive the `canAskAgain` surfacing: the screen needs to know
 * whether the OS will still show the system dialog (re-ask) or whether the user
 * must be routed to Settings (iOS after first denial; Android "Don't ask again").
 */
describe('locationPermissions', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  function mockProviderAsReal() {
    vi.doMock('expo-device', () => ({ isDevice: true }))
    vi.doMock('../session/runLocationProvider', () => ({
      isMockRunLocationProvider: () => false,
      requestedRunLocationProviderKind: () => 'expo',
    }))
  }

  it('reports granted with canAskAgain true', async () => {
    mockProviderAsReal()
    vi.doMock('expo-location', () => ({
      getForegroundPermissionsAsync: vi
        .fn()
        .mockResolvedValue({ granted: true, status: 'granted', canAskAgain: true }),
      getBackgroundPermissionsAsync: vi
        .fn()
        .mockResolvedValue({ granted: true, status: 'granted', canAskAgain: true }),
    }))
    const { getRunLocationPermissionState } = await import('./locationPermissions')
    const result = await getRunLocationPermissionState()
    expect(result.foreground).toBe('granted')
    expect(result.background).toBe('granted')
    expect(result.canAskAgain).toBe(true)
  })

  it('surfaces canAskAgain=false on hard denial (must route to Settings)', async () => {
    mockProviderAsReal()
    vi.doMock('expo-location', () => ({
      getForegroundPermissionsAsync: vi
        .fn()
        .mockResolvedValue({ granted: false, status: 'denied', canAskAgain: false }),
      getBackgroundPermissionsAsync: vi
        .fn()
        .mockResolvedValue({ granted: false, status: 'denied', canAskAgain: false }),
    }))
    const { getRunLocationPermissionState } = await import('./locationPermissions')
    const result = await getRunLocationPermissionState()
    expect(result.foreground).toBe('denied')
    expect(result.canAskAgain).toBe(false)
  })

  it('keeps canAskAgain=true when denied but the OS can still prompt (Android first denial)', async () => {
    mockProviderAsReal()
    vi.doMock('expo-location', () => ({
      getForegroundPermissionsAsync: vi
        .fn()
        .mockResolvedValue({ granted: false, status: 'denied', canAskAgain: true }),
      getBackgroundPermissionsAsync: vi
        .fn()
        .mockResolvedValue({ granted: false, status: 'denied', canAskAgain: true }),
    }))
    const { getRunLocationPermissionState } = await import('./locationPermissions')
    const result = await getRunLocationPermissionState()
    expect(result.foreground).toBe('denied')
    expect(result.canAskAgain).toBe(true)
  })

  it('requestRunLocationPermissions surfaces canAskAgain=false when foreground is hard-denied', async () => {
    mockProviderAsReal()
    vi.doMock('expo-location', () => ({
      requestForegroundPermissionsAsync: vi
        .fn()
        .mockResolvedValue({ granted: false, status: 'denied', canAskAgain: false }),
      requestBackgroundPermissionsAsync: vi.fn(),
    }))
    const { requestRunLocationPermissions } = await import('./locationPermissions')
    const result = await requestRunLocationPermissions()
    expect(result.foreground).toBe('denied')
    expect(result.background).toBe('unknown')
    expect(result.canAskAgain).toBe(false)
  })

  it('android: never touches background APIs (no ACCESS_BACKGROUND_LOCATION in manifest) and mirrors foreground', async () => {
    mockProviderAsReal()
    vi.doMock('react-native', () => ({ Platform: { OS: 'android' } }))
    const getBackground = vi.fn()
    vi.doMock('expo-location', () => ({
      getForegroundPermissionsAsync: vi
        .fn()
        .mockResolvedValue({ granted: true, status: 'granted', canAskAgain: true }),
      getBackgroundPermissionsAsync: getBackground,
    }))
    const { getRunLocationPermissionState } = await import('./locationPermissions')
    const result = await getRunLocationPermissionState()
    expect(result.foreground).toBe('granted')
    expect(result.background).toBe('granted')
    expect(getBackground).not.toHaveBeenCalled()
  })

  it('android: request reports background granted after foreground grant without requesting it', async () => {
    mockProviderAsReal()
    vi.doMock('react-native', () => ({ Platform: { OS: 'android' } }))
    const requestBackground = vi.fn()
    vi.doMock('expo-location', () => ({
      requestForegroundPermissionsAsync: vi
        .fn()
        .mockResolvedValue({ granted: true, status: 'granted', canAskAgain: true }),
      requestBackgroundPermissionsAsync: requestBackground,
    }))
    const { requestRunLocationPermissions } = await import('./locationPermissions')
    const result = await requestRunLocationPermissions()
    expect(result.foreground).toBe('granted')
    expect(result.background).toBe('granted')
    expect(requestBackground).not.toHaveBeenCalled()
  })

  it('mock provider grants without touching expo-location', async () => {
    vi.doMock('expo-device', () => ({ isDevice: false }))
    vi.doMock('../session/runLocationProvider', () => ({
      isMockRunLocationProvider: () => true,
      requestedRunLocationProviderKind: () => 'mock',
    }))
    const { getRunLocationPermissionState } = await import('./locationPermissions')
    const result = await getRunLocationPermissionState()
    expect(result.foreground).toBe('granted')
    expect(result.canAskAgain).toBe(true)
  })
})
