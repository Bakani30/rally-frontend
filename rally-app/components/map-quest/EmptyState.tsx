/**
 * EmptyState — shown when no active quest spots are near the user.
 */

import { Pressable, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'

import type { SportPalette } from '@/constants/theme'
import type { MapQuestStyles } from './mapQuestStyles'

export type EmptyStateProps = {
  styles: MapQuestStyles
  theme: SportPalette
}

export function EmptyState({ styles, theme }: EmptyStateProps) {
  return (
    <View style={[styles.root, styles.centred]}>
      <MaterialCommunityIcons name="map-search-outline" size={32} color={theme.muted} />
      <Text style={styles.emptyTitle}>No active spots nearby</Text>
      <Pressable
        style={styles.retryBtn}
        onPress={() => router.back()}
        accessibilityLabel="Go back"
      >
        <Text style={styles.retryBtnText}>Back</Text>
      </Pressable>
    </View>
  )
}
