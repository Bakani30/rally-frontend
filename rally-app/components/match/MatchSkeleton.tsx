import React from 'react'
import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Skeleton } from '@/components/ui/Skeleton'
import { Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'

export function MatchSkeleton() {
  const theme = useSportTheme()
  const insets = useSafeAreaInsets()
  const styles = createStyles(theme)
  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.lg }]}>
      {/* Top Header Placeholder */}
      <View style={styles.header}>
        <Skeleton width={120} height={32} borderRadius={16} />
        <Skeleton width={40} height={40} borderRadius={20} />
      </View>

      {/* Main Arena / Court Area */}
      <View style={styles.arenaContainer}>
        <Skeleton width="100%" height="100%" borderRadius={32} />
        
        {/* Mock Avatars overlaid on the arena */}
        <View style={styles.avatarRow}>
           <Skeleton width={72} height={72} borderRadius={36} color="rgba(255, 255, 255, 0.15)" />
           <Skeleton width={96} height={96} borderRadius={48} color="rgba(255, 255, 255, 0.2)" />
           <Skeleton width={72} height={72} borderRadius={36} color="rgba(255, 255, 255, 0.15)" />
        </View>
      </View>

      {/* Bottom Action Area */}
      <View style={styles.bottomNav}>
        <Skeleton width="100%" height={72} borderRadius={36} />
        <View style={styles.bottomSecondary}>
          <Skeleton width="48%" height={56} borderRadius={28} />
          <Skeleton width="48%" height={56} borderRadius={28} />
        </View>
      </View>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  arenaContainer: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarRow: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  bottomNav: {
    marginTop: 24,
    gap: 16,
    paddingBottom: 32, // Approximate safe area
  },
  bottomSecondary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  })
}
