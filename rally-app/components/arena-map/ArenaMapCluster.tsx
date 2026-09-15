import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { Fonts, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { arenaMapClusterAccessibilityLabel } from '@/lib/arena-map/arenaMapPresentation'

type ArenaMapClusterProps = { count: number; typeMix: Record<string, number>; onPress?: () => void }

const MIX = [
  { type: 'official_venue', icon: 'star' as const, color: 'economy' as const },
  { type: 'community_venue', icon: 'basketball' as const, color: 'orange' as const },
  { type: 'ad_hoc_arena', icon: 'lightning-bolt' as const, color: 'blue' as const },
]

/** Interactive aggregate; communicates only count and pin-type mix. */
export function ArenaMapCluster({ count, typeMix, onPress }: ArenaMapClusterProps) {
  const theme = useSportTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const content = <>
    <Text style={styles.count}>{count}</Text>
    <View style={styles.mix} importantForAccessibility="no-hide-descendants">
      {MIX.filter(({ type }) => (typeMix[type] ?? 0) > 0).map(({ type, icon, color }) => <View key={type} style={styles.mixItem}>
        <MaterialCommunityIcons name={icon} size={9} color={theme[color]} />
        <Text style={styles.mixCount}>{typeMix[type]}</Text>
      </View>)}
    </View>
  </>

  const accessibilityLabel = arenaMapClusterAccessibilityLabel(count, typeMix)
  if (!onPress) return <View accessibilityLabel={accessibilityLabel} style={styles.root}>{content}</View>
  return <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    accessibilityHint="แตะเพื่อขยายบริเวณนี้"
    style={({ pressed }) => [styles.root, pressed && styles.pressed]}
  >{content}</Pressable>
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    root: { width: 56, height: 56, borderRadius: 28, backgroundColor: theme.fightBg, borderWidth: 2, borderColor: theme.chalk, alignItems: 'center', justifyContent: 'center', shadowColor: theme.ink, shadowOpacity: .24, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8, elevation: 5 },
    pressed: { transform: [{ scale: .96 }], opacity: .9 },
    count: { color: theme.fightInk, fontFamily: Fonts?.rounded, fontWeight: '900', fontSize: 16, lineHeight: 18, fontVariant: ['tabular-nums'] },
    mix: { flexDirection: 'row', gap: 3, marginTop: 1 },
    mixItem: { flexDirection: 'row', alignItems: 'center', gap: 1 },
    mixCount: { color: theme.fightInkSoft, fontFamily: Fonts?.rounded, fontSize: 8, fontWeight: '900', fontVariant: ['tabular-nums'] },
  })
}
