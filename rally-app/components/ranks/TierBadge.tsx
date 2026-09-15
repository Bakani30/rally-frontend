import { StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'

import { Radius, Spacing, TierChipBg, TierColorOnChip } from '@/constants/theme'
import { getRankIcon } from '@/lib/ranks/rankAssets'
import type { Tier } from '@/lib/leaderboard/tierRules'

type Props = {
  tier: Tier
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

const ICON_SIZE: Record<NonNullable<Props['size']>, number> = {
  sm: 16,
  md: 28,
  lg: 44,
}

// Renders the bundled per-tier rank icon (rally-app/assets/ranks) plus an
// optional tier label. Label text has no lineHeight/fontWeight set — tight
// lineHeight drops Thai diacritic marks (repo rule), and label copy here may
// localize to Thai later.
//
// The label sits on a fixed dark chip (TierChipBg), not directly on whatever
// neutral surface the badge is placed on — a raw tier hue (e.g. silver/gold)
// is illegible on a near-white light surface. See constants/theme.ts
// TierChipBg/TierColorOnChip.
export function TierBadge({ tier, size = 'md', showLabel = false }: Props) {
  const iconSize = ICON_SIZE[size]
  const color = TierColorOnChip[tier]
  const label = tier.charAt(0).toUpperCase() + tier.slice(1)

  return (
    <View style={styles.row}>
      <Image source={getRankIcon(tier)} style={{ width: iconSize, height: iconSize }} contentFit="contain" />
      {showLabel && (
        <View style={[styles.labelChip, { backgroundColor: TierChipBg }]}>
          <Text style={[styles.label, { color }]}>{label}</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  labelChip: {
    borderRadius: Radius.pill,
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
  },
  label: {
    fontSize: 12,
    letterSpacing: 0.4,
  },
})
