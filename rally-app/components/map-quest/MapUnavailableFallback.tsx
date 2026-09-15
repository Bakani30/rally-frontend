/**
 * MapUnavailableFallback — shown when the MapLibre native module fails to load.
 * Occurs in Expo Go / simulator builds without the native MapLibre module.
 */

import { Pressable, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'

import type { SportPalette } from '@/constants/theme'
import type { MapQuestStyles } from './mapQuestStyles'

export type MapUnavailableFallbackProps = {
  styles: MapQuestStyles
  theme: SportPalette
}

export function MapUnavailableFallback({ styles, theme }: MapUnavailableFallbackProps) {
  return (
    <View style={[styles.root, styles.centred]}>
      <MaterialCommunityIcons name="map-outline" size={32} color={theme.muted} />
      <Text style={styles.emptyTitle}>Map unavailable</Text>
      <Text style={styles.emptySubtitle}>Requires native EAS build</Text>
      <Pressable style={styles.retryBtn} onPress={() => router.back()}>
        <Text style={styles.retryBtnText}>Back</Text>
      </Pressable>
    </View>
  )
}
