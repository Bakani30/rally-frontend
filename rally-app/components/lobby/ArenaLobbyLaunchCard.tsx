import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'

type ArenaLobbyLaunchCardProps = {
  onCreate: () => void
  onSearch: () => void
  title?: string
  description?: string
  createLabel?: string
  searchLabel?: string
}

export function ArenaLobbyLaunchCard({
  onCreate,
  onSearch,
  title = 'Stadium',
  description = 'สร้างสนามของคุณ',
  createLabel = 'สร้างอารีน่า',
  searchLabel = 'ค้นหาอารีน่า',
}: ArenaLobbyLaunchCardProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)

  return (
    <PressableScale
      style={styles.card}
      onPress={onCreate}
      accessibilityRole="button"
      accessibilityLabel={createLabel}
    >
      <View style={styles.iconPlate}>
        <MaterialCommunityIcons name="stadium-variant" size={25} color={theme.arcadeCtaText} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <PressableScale
        style={styles.searchAction}
        onPress={(event) => {
          event.stopPropagation()
          onSearch()
        }}
        accessibilityRole="button"
        accessibilityLabel={searchLabel}
      >
        <MaterialCommunityIcons name="magnify" size={18} color={theme.arcadeCtaText} />
        <Text style={styles.searchText}>{searchLabel}</Text>
      </PressableScale>
    </PressableScale>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    card: {
      minHeight: 96,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      borderRadius: Radius.xxl,
      backgroundColor: theme.orange,
      padding: Spacing.md,
      shadowColor: theme.arenaInk,
      shadowOffset: { width: 0, height: 9 },
      shadowOpacity: 0.12,
      shadowRadius: 18,
      elevation: 3,
    },
    iconPlate: {
      width: 48,
      height: 48,
      borderRadius: Radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.18)',
    },
    copy: { flex: 1, minWidth: 0, gap: 2 },
    title: { color: theme.arcadeCtaText, fontSize: 18, lineHeight: 22, fontWeight: '900', fontStyle: 'italic' },
    description: { color: theme.arcadeCtaText, fontSize: 11, lineHeight: 15, fontWeight: '700', opacity: 0.92 },
    searchAction: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.72)',
      backgroundColor: 'rgba(255,255,255,0.13)',
      paddingHorizontal: 9,
    },
    searchText: { color: theme.arcadeCtaText, fontSize: 11, fontWeight: '900' },
  })
}
