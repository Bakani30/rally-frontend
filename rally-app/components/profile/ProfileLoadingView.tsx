import { ActivityIndicator, StyleSheet } from 'react-native'

import { type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'

/** Exact visual loading state used before ProfileScreen has profile data. */
export function ProfileLoadingView() {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  return <ActivityIndicator style={styles.loader} color={theme.ink} />
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({ loader: { flex: 1, backgroundColor: theme.bg } })
}
