import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { Fonts, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { arenaMapPinAccessibilityLabel, getArenaMapMarkerPresentation } from '@/lib/arena-map/arenaMapPresentation'
import type { ArenaMapPinSummary } from '@/types/arenaMap'

type ArenaMapPinProps = { pin: ArenaMapPinSummary; selected: boolean; onPress: () => void }

export function ArenaMapPin({ pin, selected, onPress }: ArenaMapPinProps) {
  const theme = useSportTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const marker = getArenaMapMarkerPresentation(pin, selected)
  const isOfficial = marker.badgeIcon === 'star'
  const badge = isOfficial ? 'star' : marker.badgeIcon === 'flash' ? 'lightning-bolt' : 'basketball'

  return <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={arenaMapPinAccessibilityLabel(pin, selected)}
    accessibilityHint="แตะเพื่อดูรายละเอียดสนาม"
    accessibilityState={{ selected }}
    style={styles.hit}
  >
    <View style={{ transform: [{ scale: marker.scale }], alignItems: 'center' }}>
      <View style={[styles.halo, marker.halo && styles.haloVisible]} />
      <View style={[
        styles.pin,
        { width: marker.size, height: marker.size, borderRadius: marker.size / 2, borderColor: marker.keylineColor },
        marker.shadowStrength === 'strong' && styles.shadowStrong,
      ]}>
        {marker.imageUrl
          ? <Image source={marker.imageUrl} style={styles.image} contentFit="cover" />
          : <View style={styles.fallback}>
              <Text style={styles.initials}>{pin.publicIdentity.initials}</Text>
              <MaterialCommunityIcons name="basketball" size={13} color={theme.orange} />
            </View>}
        <View style={[
          styles.badge,
          { borderColor: marker.keylineColor },
          isOfficial && styles.officialBadge,
        ]}>
          <MaterialCommunityIcons name={badge} size={12} color={isOfficial ? theme.economy : marker.keylineColor} />
        </View>
      </View>
      <View style={[styles.pointer, { borderTopColor: marker.keylineColor }]} />
    </View>
  </Pressable>
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    hit: { width: 60, height: 70, alignItems: 'center', justifyContent: 'flex-start' },
    halo: { position: 'absolute', top: -3, width: 56, height: 56, borderRadius: 28, backgroundColor: 'transparent' },
    haloVisible: { backgroundColor: theme.orangeSoft },
    pin: { marginTop: 2, borderWidth: 3, backgroundColor: theme.bgElevated, alignItems: 'center', justifyContent: 'center', shadowColor: theme.ink, shadowOffset: { width: 0, height: 4 }, shadowOpacity: .2, shadowRadius: 8, elevation: 5 },
    shadowStrong: { shadowOpacity: .38, shadowRadius: 14, elevation: 8 },
    image: { width: 38, height: 38, borderRadius: 19 },
    fallback: { width: 38, height: 38, borderRadius: 19, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 1 },
    initials: { fontSize: 10, lineHeight: 15, fontFamily: Fonts?.thaiHead, color: theme.ink },
    badge: { position: 'absolute', right: -4, bottom: -3, width: 20, height: 20, borderRadius: 10, backgroundColor: theme.bgElevated, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
    officialBadge: { backgroundColor: theme.fightBg },
    pointer: { marginTop: -1, width: 0, height: 0, borderLeftWidth: 8, borderRightWidth: 8, borderTopWidth: 11, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  })
}
