import { Platform, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { PressableScale } from '@/components/motion/PressableScale'
import { PointsIcon } from '@/components/economy/PointsIcon'
import { Fonts, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useI18n, type Translator } from '@/hooks/useI18n'
import { giftsDictionary } from '@/lib/i18n/dictionaries/gifts'
import type { GiftItem } from '@/lib/gifts/giftTypes'
import { getCatalogRedeemState, type RedeemState } from '@/lib/gifts/redeemPolicy'
import { getGiftPriceOptions } from './redeemCatalog'
import { RedeemRewardArtwork } from './RedeemRewardArtwork'

type RedeemRewardCardProps = {
  gift: GiftItem
  width: number
  availablePoints: number
  availableCredits: number
  canRedeemCreditRewards: boolean
  balanceKnown: boolean
  demo?: boolean
  alreadyOwned: boolean
  onOpenDetail: () => void
}

type GiftsTranslator = Translator<keyof typeof giftsDictionary>

export function RedeemRewardCard({
  gift,
  width,
  availablePoints,
  availableCredits,
  canRedeemCreditRewards,
  balanceKnown,
  demo = false,
  alreadyOwned,
  onOpenDetail,
}: RedeemRewardCardProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { t } = useI18n(giftsDictionary)
  const prices = getGiftPriceOptions(gift)
  const primaryPrice = prices[0]
  const redeemability: RedeemState = alreadyOwned
    ? 'owned'
    : gift.stock_status === 'sold_out'
      ? 'sold_out'
      : balanceKnown
        ? getCatalogRedeemState({ gift, availablePoints, availableCredits, canRedeemCreditRewards })
        : 'ready'
  const status = demo && redeemability === 'ready'
    ? null
    : compactStatus(redeemability, t)
  const statusColor = redeemability === 'owned'
    ? theme.greenVivid
    : redeemability === 'locked'
      ? theme.amber
      : theme.redVivid
  const priceLabel = primaryPrice
    ? primaryPrice.currency === 'credit'
      ? t('useCredits', { amount: primaryPrice.amount.toLocaleString() })
      : t('usePoints', { amount: primaryPrice.amount.toLocaleString() })
    : t('notSpecified')

  return (
    <PressableScale
      style={[styles.card, { width }]}
      onPress={onOpenDetail}
      accessibilityRole="button"
      accessibilityLabel={`${t('details')} ${gift.name}, ${priceLabel}`}
    >
      <View style={styles.media}>
        <RedeemRewardArtwork gift={gift} />
        {status ? (
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={styles.statusText} numberOfLines={1} maxFontSizeMultiplier={1.2}>{status}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.copy}>
        <Text style={styles.name} numberOfLines={2} maxFontSizeMultiplier={1.4}>{gift.name}</Text>
        <View style={styles.priceRow}>
          {primaryPrice?.currency === 'credit' ? <MaterialCommunityIcons name="diamond-stone" size={16} color={theme.economy} /> : <PointsIcon size={18} />}
          <Text style={styles.price} numberOfLines={1} maxFontSizeMultiplier={1.3}>{priceLabel}</Text>
          <MaterialCommunityIcons name="arrow-right" size={17} color={theme.orange} />
        </View>
      </View>
    </PressableScale>
  )
}

function compactStatus(
  state: RedeemState,
  t: GiftsTranslator,
): string | null {
  if (state === 'owned') return t('owned')
  if (state === 'sold_out') return t('soldOut')
  if (state === 'locked') return t('proRequiredForCredits')
  return null
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    card: {
      overflow: 'hidden',
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.bgElevated,
      ...Platform.select({ web: { boxShadow: theme.shadowSoft }, default: { elevation: 2 } }),
    },
    media: { position: 'relative', backgroundColor: theme.surfaceStrong },
    statusBadge: {
      position: 'absolute',
      left: Spacing.sm,
      top: Spacing.sm,
      maxWidth: '88%',
      minHeight: 26,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderRadius: Radius.pill,
      backgroundColor: theme.fightBg,
      paddingHorizontal: 9,
      paddingVertical: 4,
    },
    statusDot: { width: 6, height: 6, borderRadius: Radius.pill },
    statusText: { flexShrink: 1, color: theme.fightInk, fontSize: 9, lineHeight: 12, fontWeight: '900' },
    copy: { minHeight: 90, justifyContent: 'space-between', gap: Spacing.sm, padding: Spacing.md },
    name: { color: theme.ink, fontSize: 15, lineHeight: 20, fontWeight: '900' },
    priceRow: { minHeight: 24, flexDirection: 'row', alignItems: 'center', gap: 5 },
    price: {
      flex: 1,
      color: theme.economy,
      fontSize: 11,
      lineHeight: 15,
      fontWeight: '900',
      fontFamily: Fonts.rounded,
      fontVariant: ['tabular-nums'],
    },
  })
}
