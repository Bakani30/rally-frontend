import { Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { PressableScale } from '@/components/motion/PressableScale'
import { PointsIcon } from '@/components/economy/PointsIcon'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useI18n, type Translator } from '@/hooks/useI18n'
import { giftsDictionary } from '@/lib/i18n/dictionaries/gifts'
import type { GiftItem } from '@/lib/gifts/giftTypes'
import { formatGiftOfferEnd, formatVoucherValidity } from '@/lib/gifts/redeemPresentation'
import type { WalletCurrency } from '@/lib/wallet/walletTypes'
import { formatCurrencyPrice } from './redeemCatalog'

type RedeemConfirmSheetProps = {
  visible: boolean
  gift: GiftItem
  currency: WalletCurrency
  price: number
  balanceAfter: number
  pending: boolean
  errorMessage?: string
  onClose: () => void
  onConfirm: () => void
}

type GiftsTranslator = Translator<keyof typeof giftsDictionary>

export function RedeemConfirmSheet({ visible, gift, currency, price, balanceAfter, pending, errorMessage, onClose, onConfirm }: RedeemConfirmSheetProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const insets = useSafeAreaInsets()
  const { t, language } = useI18n(giftsDictionary)
  const title = gift.item_type === 'voucher' && gift.category === 'coupon' ? t('confirmVoucherTitle') : t('confirmTitle')
  const offerEnd = formatGiftOfferEnd(gift, language, {
    redeemBy: (date) => t('redeemBy', { date }),
    notSpecified: t('notSpecified'),
  })
  const voucherValidity = formatVoucherValidity(gift, {
    validFor: (count) => t('voucherValidFor', { count }),
    notSpecified: t('notSpecified'),
  })
  const confirmLabel = pending ? t('redeeming') : t('redeemNow')
  const balanceUnit = currency === 'credit' ? t('creditsUnit') : t('pointsUnit')

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { if (!pending) onClose() }}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.scrim} onPress={onClose} disabled={pending} accessibilityRole="button" accessibilityLabel={t('cancel')} accessibilityState={{ disabled: pending }} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.md }]} accessibilityViewIsModal>
          <View style={styles.handle} />
          <View style={styles.sheetHeader}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name={rewardIcon(gift)} size={22} color={theme.orange} />
            </View>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow} maxFontSizeMultiplier={1.4}>{title}</Text>
              <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={1.6}>{gift.name}</Text>
            </View>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
            {gift.image_url ? <Image source={{ uri: gift.image_url }} style={styles.image} resizeMode="cover" accessibilityLabel={gift.name} /> : null}

            <View style={styles.summaryCard}>
              <SummaryRow icon="currency" currency={currency} label={t('redeemPrice')} value={formatCurrencyPrice(price, currency)} />
              <SummaryRow icon="wallet-outline" label={t('afterRedeem')} value={`${balanceAfter.toLocaleString()} ${balanceUnit}`} />
            </View>

            <View style={styles.factList}>
              <Fact icon="tag-outline" text={rewardCategoryLabel(gift, t)} />
              {gift.stock_quantity !== null ? <Fact icon="archive-outline" text={t('remaining', { count: gift.stock_quantity.toLocaleString() })} /> : null}
              {gift.per_user_limit !== null ? <Fact icon="account-outline" text={t('perUserLimit', { count: gift.per_user_limit.toLocaleString() })} /> : null}
              <Fact icon="calendar-outline" text={`${t('offerAvailability')}: ${offerEnd}`} />
              {gift.item_type === 'voucher' ? <Fact icon="calendar-clock-outline" text={`${t('voucherValidity')}: ${voucherValidity}`} /> : null}
              <Fact icon="information-outline" text={t('conditions')} />
            </View>

            {errorMessage ? <Text style={styles.errorText} accessibilityRole="alert">{errorMessage}</Text> : null}
          </ScrollView>

          <View style={styles.actions}>
            <PressableScale style={styles.cancelButton} onPress={onClose} disabled={pending} accessibilityRole="button" accessibilityLabel={t('cancel')} accessibilityState={{ disabled: pending }}>
              <Text style={styles.cancelText} maxFontSizeMultiplier={1.4}>{t('cancel')}</Text>
            </PressableScale>
            <PressableScale style={styles.confirmButton} onPress={onConfirm} disabled={pending} accessibilityRole="button" accessibilityLabel={confirmLabel} accessibilityState={{ disabled: pending, busy: pending }}>
              <MaterialCommunityIcons name="ticket-confirmation-outline" size={18} color={theme.chalk} />
              <Text style={styles.confirmText} maxFontSizeMultiplier={1.4}>{confirmLabel}</Text>
            </PressableScale>
          </View>
        </View>
      </View>
    </Modal>
  )
}

function rewardCategoryLabel(gift: GiftItem, t: GiftsTranslator): string {
  if (gift.item_type === 'cosmetic') return t('profileItem')
  if (gift.category === 'event') return t('categoryEvent')
  if (gift.category === 'gift') return t('categoryGift')
  return t('categoryCoupon')
}

function rewardIcon(gift: GiftItem): 'ticket-percent-outline' | 'gift-outline' | 'calendar-star' | 'palette-outline' {
  if (gift.item_type === 'cosmetic') return 'palette-outline'
  if (gift.category === 'event') return 'calendar-star'
  if (gift.category === 'gift') return 'gift-outline'
  return 'ticket-percent-outline'
}

function SummaryRow({ icon, currency, label, value }: { icon: 'currency' | 'wallet-outline'; currency?: WalletCurrency; label: string; value: string }) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  return (
    <View style={styles.summaryRow}>
      {icon === 'currency' ? currency === 'credit' ? <MaterialCommunityIcons name="diamond-stone" size={18} color={theme.economy} /> : <PointsIcon size={20} /> : <MaterialCommunityIcons name="wallet-outline" size={18} color={theme.economy} />}
      <Text style={styles.summaryLabel} maxFontSizeMultiplier={1.5}>{label}</Text>
      <Text style={styles.summaryValue} maxFontSizeMultiplier={1.4}>{value}</Text>
    </View>
  )
}

function Fact({ icon, text }: { icon: 'tag-outline' | 'archive-outline' | 'account-outline' | 'calendar-outline' | 'calendar-clock-outline' | 'information-outline'; text: string }) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  return <View style={styles.fact}><MaterialCommunityIcons name={icon} size={15} color={theme.muted} /><Text style={styles.factText} maxFontSizeMultiplier={1.6}>{text}</Text></View>
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    modalRoot: { flex: 1, justifyContent: 'flex-end' },
    scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.52)' },
    sheet: { maxHeight: '92%', flexShrink: 1, gap: Spacing.md, borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl, backgroundColor: theme.bg, paddingHorizontal: Spacing.xl, paddingTop: Spacing.sm, ...Platform.select({ web: { boxShadow: theme.shadowSoft }, default: { elevation: 8 } }) },
    handle: { alignSelf: 'center', width: 42, height: 4, borderRadius: Radius.pill, backgroundColor: theme.line },
    sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    iconCircle: { width: 46, height: 46, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.orangeSoft },
    headerCopy: { flex: 1, gap: 3 },
    eyebrow: { color: theme.orange, fontSize: 11, lineHeight: 15, fontWeight: '900' },
    title: { color: theme.ink, fontSize: 20, lineHeight: 27, fontWeight: '900' },
    body: { flexShrink: 1 },
    bodyContent: { gap: Spacing.md, paddingBottom: Spacing.xs },
    image: { width: '100%', height: 92, borderRadius: Radius.xl },
    summaryCard: { gap: 10, borderRadius: Radius.xl, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface, padding: Spacing.md },
    summaryRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    summaryLabel: { flex: 1, color: theme.muted, fontSize: 13, lineHeight: 18, fontWeight: '700' },
    summaryValue: { flexShrink: 1, color: theme.ink, fontSize: 14, lineHeight: 19, fontWeight: '900', textAlign: 'right' },
    factList: { gap: 8 },
    fact: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    factText: { flex: 1, color: theme.inkSoft, fontSize: 12, lineHeight: 17, fontWeight: '700' },
    errorText: { color: theme.red, fontSize: 13, lineHeight: 18, fontWeight: '800' },
    actions: { flexDirection: 'row', gap: Spacing.sm, paddingTop: Spacing.sm },
    cancelButton: { minHeight: 50, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.lg, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface },
    cancelText: { color: theme.inkSoft, fontSize: 14, lineHeight: 19, fontWeight: '900' },
    confirmButton: { minHeight: 50, flex: 1.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: Radius.lg, backgroundColor: theme.orange },
    confirmText: { color: theme.chalk, fontSize: 14, lineHeight: 19, fontWeight: '900' },
  })
}
