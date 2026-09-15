import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { Fonts, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { getArenaMapStoryMarkerPresentation } from '@/lib/arena-map/arenaMapPresentation'

type ArenaMapStoryPinProps = { label: string; initials: string; selected?: boolean }

/** Presentation-only Conquest marker. It intentionally accepts no runtime pin. */
export function ArenaMapStoryPin({ label, initials, selected = false }: ArenaMapStoryPinProps) {
  const theme = useSportTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const presentation = getArenaMapStoryMarkerPresentation('conquest_arena', selected)
  return <View testID="arena-map-story-conquest" accessibilityLabel={`${label} หมุดพิชิตสนาม`} style={[styles.wrap, { transform: [{ scale: presentation.scale }] }]}>
    <View style={[styles.ring, { borderColor: presentation.keylineColor }]}><Text style={styles.initials}>{initials}</Text></View>
    <View testID="arena-map-story-conquest-crown" style={styles.badge}><MaterialCommunityIcons name="crown" size={15} color={theme.economy} /></View>
    <View style={[styles.pointer, { borderTopColor: presentation.keylineColor }]} />
  </View>
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    wrap: { width: 52, height: 62, alignItems: 'center' },
    ring: { width: 48, height: 48, borderRadius: 24, borderWidth: 4, backgroundColor: theme.fightBg, alignItems: 'center', justifyContent: 'center' },
    initials: { color: theme.fightInk, fontSize: 13, lineHeight: 20, fontFamily: Fonts?.thaiHead },
    badge: { position: 'absolute', right: 0, top: 0, width: 22, height: 22, borderRadius: 11, backgroundColor: theme.bgElevated, alignItems: 'center', justifyContent: 'center' },
    pointer: { width: 0, height: 0, borderLeftWidth: 8, borderRightWidth: 8, borderTopWidth: 12, borderLeftColor: 'transparent', borderRightColor: 'transparent', marginTop: -2 },
  })
}
