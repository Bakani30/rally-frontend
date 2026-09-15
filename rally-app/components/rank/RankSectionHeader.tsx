import { StyleSheet, View } from 'react-native'
import { RallyText } from '@/components/ui/RallyText'
import { type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'

type RankSectionHeaderProps = {
  /** Thai section title (e.g. "RP ล่าสุด"). */
  title: string
  /** English caps sublabel (e.g. "recent matches"). */
  sub: string
}

// Section heading used across the rank page: Thai title left, English
// uppercase sublabel right.
export function RankSectionHeader({ title, sub }: RankSectionHeaderProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  return (
    <View style={styles.row}>
      <RallyText variant="head" lang="th" style={styles.title}>{title}</RallyText>
      <RallyText variant="head" lang="en" style={styles.sub}>{sub.toUpperCase()}</RallyText>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 18,
      marginBottom: 8,
      paddingHorizontal: 2,
    },
    // No fontWeight/fontStyle here — RallyText head+th applies Prompt bold; a
    // forced weight/lineHeight clips Thai marks (repo rule).
    title: { color: theme.ink, fontSize: 13, letterSpacing: 0.6 },
    sub: { color: theme.mutedSoft, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  })
}
