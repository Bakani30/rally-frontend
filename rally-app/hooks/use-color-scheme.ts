import { useThemeMode } from '@/hooks/useAppTheme'

export function useColorScheme() {
  return useThemeMode()
}
