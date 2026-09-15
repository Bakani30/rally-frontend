import { StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { BadgeSlot } from '@/components/profile/BadgeSlot'
import { ProfileFrame } from '@/components/profile/ProfileFrame'
import { TitleFrame } from '@/components/cosmetics/TitleFrame'
import { hasTitleFrame } from '@/lib/cosmetics/titleFrameRegistry'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useI18n } from '@/hooks/useI18n'
import { cosmeticsDictionary } from '@/lib/i18n/dictionaries/cosmetics'
import type { LoadoutSlot } from '@/lib/cosmetics/cosmeticLoadout'
import type { CosmeticRarity, OwnedCosmetic } from '@/lib/cosmetics/cosmeticTypes'

type CosmeticPickerRowProps = {
  slot: LoadoutSlot
  cosmetic: OwnedCosmetic | null
  label: string
  sublabel?: string
  selected: boolean
  committed: boolean
  disabled: boolean
  onPress: () => void
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.md,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface,
    },
    rowDisabled: { opacity: 0.6 },
    preview: { minWidth: 64, alignItems: 'center', justifyContent: 'center' },
    meta: { flex: 1, gap: 2 },
    label: { fontSize: 14, fontWeight: '800', color: theme.ink },
    sub: { fontSize: 12, color: theme.muted, fontWeight: '600' },
    rarity: { fontSize: 9, fontWeight: '900', letterSpacing: 1.2, marginTop: 2 },
    titleChip: {
      paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill, borderWidth: 1,
      maxWidth: 120,
    },
    titleChipText: { fontSize: 10, fontWeight: '900', letterSpacing: 1.6 },
    tag: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.pill,
    },
    tagText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  })
}

function rarityColor(theme: SportPalette, rarity: CosmeticRarity | undefined): string {
  switch (rarity) {
    case 'rare': return theme.blue
    case 'epic': return theme.amber
    case 'legendary': return theme.red
    default: return theme.muted
  }
}

function SlotPreview({ slot, cosmetic, color, styles }: {
  slot: LoadoutSlot
  cosmetic: OwnedCosmetic | null
  color: string
  styles: ReturnType<typeof createStyles>
}) {
  const { width } = useWindowDimensions()
  if (slot === 'badge') {
    return <BadgeSlot badgeAssetRef={cosmetic?.asset_ref ?? null} size={36} />
  }
  if (slot === 'frame') {
    return (
      <ProfileFrame frameAssetRef={cosmetic?.asset_ref ?? null} size={36}>
        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: color }} />
      </ProfileFrame>
    )
  }
  // title
  if (cosmetic && hasTitleFrame(cosmetic.code)) {
    const frameWidth = Math.min(width - 2 * Spacing.xl - 2 * Spacing.md, 200)
    return <TitleFrame code={cosmetic.code} text={cosmetic.asset_ref} rarity={cosmetic.rarity} variant="full" width={frameWidth} />
  }
  return (
    <View style={[styles.titleChip, { borderColor: color }]}>
      <Text style={[styles.titleChipText, { color }]} numberOfLines={1}>
        {(cosmetic?.asset_ref ?? '—').toUpperCase()}
      </Text>
    </View>
  )
}

export function CosmeticPickerRow({
  slot, cosmetic, label, sublabel, selected, committed, disabled, onPress,
}: CosmeticPickerRowProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { t } = useI18n(cosmeticsDictionary)
  const color = rarityColor(theme, cosmetic?.rarity)
  const accent = committed ? theme.green : color

  return (
    <PressableScale
      style={[
        styles.row,
        selected && { borderColor: accent, backgroundColor: `${accent}14` },
        disabled && styles.rowDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <View style={styles.preview}>
        <SlotPreview slot={slot} cosmetic={cosmetic} color={color} styles={styles} />
      </View>
      <View style={styles.meta}>
        <Text style={styles.label} numberOfLines={1}>{label}</Text>
        {sublabel ? <Text style={styles.sub} numberOfLines={2}>{sublabel}</Text> : null}
        {cosmetic ? (
          <Text style={[styles.rarity, { color }]}>{cosmetic.rarity.toUpperCase()}</Text>
        ) : null}
      </View>
      {committed ? (
        <View style={[styles.tag, { backgroundColor: theme.green }]}>
          <MaterialCommunityIcons name="check" size={12} color={theme.chalk} />
          <Text style={[styles.tagText, { color: theme.chalk }]}>{t('equipped')}</Text>
        </View>
      ) : selected ? (
        <View style={[styles.tag, { borderColor: color, borderWidth: 1 }]}>
          <Text style={[styles.tagText, { color }]}>{t('selected')}</Text>
        </View>
      ) : (
        <MaterialCommunityIcons name="chevron-right" size={18} color={theme.mutedSoft} />
      )}
    </PressableScale>
  )
}
