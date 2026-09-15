import { useColorScheme as useRNColorScheme } from 'react-native'

import { getRunArenaPalette, getSportPalette, type ThemeMode } from '@/constants/theme'
import { useThemeStore } from '@/stores/themeStore'

export function useThemeMode(): ThemeMode {
  const preference = useThemeStore((state) => state.preference)
  const systemMode = useRNColorScheme()

  if (preference === 'system') return systemMode === 'light' ? 'light' : 'dark'
  return preference
}

export function useSportTheme() {
  return getSportPalette(useThemeMode())
}

export function useRunArenaTheme() {
  return getRunArenaPalette(useThemeMode())
}
