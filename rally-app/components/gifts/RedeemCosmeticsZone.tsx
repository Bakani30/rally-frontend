import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { RedeemRewardCard } from '@/components/gifts/RedeemRewardCard'
import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useI18n } from '@/hooks/useI18n'
import type { GiftItem } from '@/lib/gifts/giftTypes'
import { giftsDictionary } from '@/lib/i18n/dictionaries/gifts'
import {
  COSMETIC_CATEGORY_OPTIONS,
  matchesCosmeticCategory,
  type CosmeticCategoryKey,
} from './redeemCatalog'

type RedeemCosmeticsZoneProps = {
  gifts: GiftItem[]
  cardWidth: number
  availablePoints: number
  availableCredits: number
  canRedeemCreditRewards: boolean
  balanceKnown: boolean
  demo: boolean
  onOpenDetail: (gift: GiftItem) => void
  onOpenStudio: () => void
}

export function RedeemCosmeticsZone({
  gifts,
  cardWidth,
  availablePoints,
  availableCredits,
  canRedeemCreditRewards,
  balanceKnown,
  demo,
  onOpenDetail,
  onOpenStudio,
}: RedeemCosmeticsZoneProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { t } = useI18n(giftsDictionary)
  const [activeCategory, setActiveCategory] = useState<CosmeticCategoryKey>('all')
  const visibleGifts = useMemo(
    () => gifts.filter((gift) => matchesCosmeticCategory(gift, activeCategory)),
    [activeCategory, gifts],
  )

  return (
    <View style={styles.zone}>
      <View style={styles.headingSurface}>
        <View style={styles.headingCopy}>
          <View style={styles.titleRow}>
            <MaterialCommunityIcons name="palette-outline" size={20} color={theme.orange} />
            <Text style={styles.title} maxFontSizeMultiplier={1.2}>{t('cosmeticsZoneTitle')}</Text>
          </View>
          <Text style={styles.body} maxFontSizeMultiplier={1.4}>{t('cosmeticsZoneBody')}</Text>
        </View>
        <PressableScale
          style={styles.studioButton}
          onPress={onOpenStudio}
          accessibilityRole="button"
          accessibilityLabel={t('openProfileStudio')}
        >
          <Text style={styles.studioButtonText} maxFontSizeMultiplier={1.2}>{t('tryInStudio')}</Text>
          <MaterialCommunityIcons name="arrow-right" size={17} color={theme.fightBg} />
        </PressableScale>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRow}
      >
        {COSMETIC_CATEGORY_OPTIONS.map((category) => {
          const active = activeCategory === category.key
          return (
            <PressableScale
              key={category.key}
              style={[styles.categoryChip, active && styles.categoryChipActive]}
              onPress={() => setActiveCategory(category.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <MaterialCommunityIcons
                name={category.icon}
                size={16}
                color={active ? theme.fightBg : theme.inkSoft}
              />
              <Text style={[styles.categoryLabel, active && styles.categoryLabelActive]} maxFontSizeMultiplier={1.15}>
                {t(category.labelKey)}
              </Text>
            </PressableScale>
          )
        })}
      </ScrollView>

      <View style={styles.sectionMeta}>
        <Text style={styles.sectionLabel} maxFontSizeMultiplier={1.2}>{t('cosmeticsCatalog')}</Text>
        <Text style={styles.count} maxFontSizeMultiplier={1.2}>
          {t('itemCount', { count: visibleGifts.length.toLocaleString() })}
        </Text>
      </View>

      {visibleGifts.length > 0 ? (
        <View style={styles.list}>
          {visibleGifts.map((gift) => (
            <RedeemRewardCard
              key={gift.id}
              gift={gift}
              width={cardWidth}
              availablePoints={availablePoints}
              availableCredits={availableCredits}
              canRedeemCreditRewards={canRedeemCreditRewards}
              balanceKnown={balanceKnown}
              demo={demo}
              alreadyOwned={gift.owned}
              onOpenDetail={() => onOpenDetail(gift)}
            />
          ))}
        </View>
      ) : (
        <Text style={styles.emptyText} maxFontSizeMultiplier={1.4}>
          {t(activeCategory === 'all' ? 'noCosmeticsBody' : 'noCosmeticsCategory')}
        </Text>
      )}
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    zone: {
      gap: Spacing.md,
    },
    headingSurface: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      borderRadius: Radius.xl,
      backgroundColor: theme.orangeSoft,
      padding: Spacing.md,
    },
    headingCopy: { flex: 1, minWidth: 0, gap: 4 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    title: { flex: 1, color: theme.ink, fontSize: 18, lineHeight: 24, fontWeight: '900' },
    body: { color: theme.inkSoft, fontSize: 11, lineHeight: 16, fontWeight: '700' },
    studioButton: {
      minWidth: 84,
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      borderRadius: Radius.pill,
      backgroundColor: theme.orange,
      paddingHorizontal: Spacing.md,
    },
    studioButtonText: { color: theme.fightBg, fontSize: 11, lineHeight: 15, fontWeight: '900' },
    categoryRow: { flexDirection: 'row', gap: Spacing.sm, paddingRight: Spacing.sm, paddingVertical: 2 },
    categoryChip: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: theme.lineStrong,
      backgroundColor: theme.bgElevated,
      paddingHorizontal: 14,
    },
    categoryChipActive: { borderColor: theme.orange, backgroundColor: theme.orange },
    categoryLabel: { color: theme.ink, fontSize: 12, lineHeight: 17, fontWeight: '900' },
    categoryLabelActive: { color: theme.fightBg },
    sectionMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
    sectionLabel: { flex: 1, color: theme.ink, fontSize: 15, lineHeight: 20, fontWeight: '900' },
    count: { color: theme.inkSoft, fontSize: 12, lineHeight: 16, fontWeight: '800' },
    list: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
    emptyText: { color: theme.muted, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  })
}
