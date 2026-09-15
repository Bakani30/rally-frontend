import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { guardedRouter } from '@/lib/navigation/guardedRouter'
import {
  COMING_SOON_FEATURES,
  getComingSoonRoute,
  type ComingSoonFeatureKey,
  type ComingSoonTone,
} from '@/lib/roadmap/comingSoonFeatures'

type ComingSoonEntryCardProps = {
  featureKey: ComingSoonFeatureKey
  compact?: boolean
}

export function ComingSoonEntryCard({ featureKey, compact = false }: ComingSoonEntryCardProps) {
  const feature = COMING_SOON_FEATURES[featureKey]
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const accent = getToneColor(theme, feature.tone)
  const firstChip = feature.chips[0] ?? 'COMING SOON'

  return (
    <PressableScale
      style={[styles.card, compact && styles.cardCompact]}
      onPress={() => guardedRouter.push(getComingSoonRoute(feature.key) as never, { actionKey: `roadmap:${feature.key}` })}
      accessibilityRole="button"
      accessibilityLabel={`${feature.label} coming soon`}
    >
      <View style={[styles.iconBox, { borderColor: accent, backgroundColor: `${accent}18` }]}>
        <MaterialCommunityIcons name={feature.icon as never} size={compact ? 18 : 22} color={accent} />
      </View>
      <View style={styles.copy}>
        <View style={styles.topRow}>
          <Text style={[styles.kicker, { color: accent }]} numberOfLines={1}>
            {firstChip}
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>SOON</Text>
          </View>
        </View>
        <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={1} adjustsFontSizeToFit>
          {feature.label}
        </Text>
        <Text style={styles.body} numberOfLines={compact ? 2 : 3}>
          {feature.body}
        </Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={18} color={theme.mutedSoft} />
    </PressableScale>
  )
}

function getToneColor(theme: SportPalette, tone: ComingSoonTone): string {
  if (tone === 'trust') return theme.trust
  if (tone === 'blue') return theme.blue
  if (tone === 'economy') return theme.economy
  if (tone === 'risk') return theme.risk
  return theme.orange
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    card: {
      width: '100%',
      borderRadius: Radius.xl,
      borderWidth: 2,
      borderColor: theme.arcadeCabinetEdge,
      backgroundColor: theme.arcadePanel,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    cardCompact: {
      padding: 12,
      gap: 10,
    },
    iconBox: {
      width: 44,
      height: 44,
      borderRadius: Radius.lg,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    copy: { flex: 1, minWidth: 0, gap: 3 },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    kicker: {
      flex: 1,
      fontSize: 10,
      lineHeight: 12,
      fontWeight: '900',
      letterSpacing: 0,
    },
    badge: {
      borderRadius: Radius.pill,
      backgroundColor: theme.arcadeCabinet,
      paddingHorizontal: 7,
      paddingVertical: 3,
    },
    badgeText: {
      color: theme.arcadeCtaText,
      fontSize: 9,
      lineHeight: 11,
      fontWeight: '900',
      letterSpacing: 0,
    },
    title: {
      color: theme.ink,
      fontSize: 16,
      lineHeight: 20,
      fontWeight: '900',
    },
    titleCompact: {
      fontSize: 15,
      lineHeight: 18,
    },
    body: {
      color: theme.muted,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: '800',
    },
  })
}
