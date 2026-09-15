import { View, Text, StyleSheet } from 'react-native'
import { Image } from 'expo-image'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { TierColorOnChip } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { getRankIcon } from '@/lib/ranks/rankAssets'
import type { Tier } from '@/lib/leaderboard/tierRules'

type Props = {
  tier: string | null | undefined
  size?: number
  showLabel?: boolean
}

// Compact tier badge — no dark chip backing, so the rank art reads as the icon
// it is. When `tier` is one of the seven rank tiers it renders the real per-tier
// rank icon (rally-app/assets/ranks); otherwise (e.g. referee trust tiers like
// "candidate"/"trusted") it falls back to a neutral medal glyph. Label hue uses
// TierColorOnChip — tier colors tuned to stay legible on the app's dark
// surfaces. Label text has no lineHeight (tight lineHeight drops Thai marks).
export function TierBadge({ tier, size = 16, showLabel = false }: Props) {
  const theme = useSportTheme()
  const color = tier ? TierColorOnChip[tier] ?? theme.muted : theme.muted
  const label = tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : '—'
  const isRankTier = !!tier && !!TierColorOnChip[tier]

  return (
    <View style={styles.row}>
      {isRankTier ? (
        <Image
          source={getRankIcon(tier as Tier)}
          style={{ width: size, height: size }}
          contentFit="contain"
        />
      ) : (
        <MaterialCommunityIcons name="medal-outline" size={size} color={color} />
      )}
      {showLabel && <Text style={[styles.label, { color }]}>{label}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
})
