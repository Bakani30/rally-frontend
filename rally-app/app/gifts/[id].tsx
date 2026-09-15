import { useMemo, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { RedeemConfirmSheet } from '@/components/gifts/RedeemConfirmSheet'
import { RedeemRewardArtwork } from '@/components/gifts/RedeemRewardArtwork'
import { RedeemSuccessSheet } from '@/components/gifts/RedeemSuccessSheet'
import { PointsIcon } from '@/components/economy/PointsIcon'
import { formatCurrencyPrice, getGiftPrice, getGiftPriceOptions } from '@/components/gifts/redeemCatalog'
import { Screen } from '@/components/layout/Screen'
import { PressableScale } from '@/components/motion/PressableScale'
import { Fonts, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useAuth } from '@/hooks/useAuth'
import { useGiftItems, useRedeemReward } from '@/hooks/useGifts'
import { useI18n, type Translator } from '@/hooks/useI18n'
import { useWalletSummary } from '@/hooks/useWalletSummary'
import { getRedeemErrorKey } from '@/lib/gifts/redeemError'
import { getDemoReward, isDemoReward } from '@/lib/gifts/redeemDemoCatalog'
import { getProfileStudioSlot } from '@/lib/cosmetics/profileStudio'
import type { GiftItem, RedeemRewardResult } from '@/lib/gifts/giftTypes'
import { balanceFor, getRedeemState, type RedeemState } from '@/lib/gifts/redeemPolicy'
import { formatGiftOfferEnd, formatVoucherValidity } from '@/lib/gifts/redeemPresentation'
import { giftsDictionary } from '@/lib/i18n/dictionaries/gifts'
import { guardedRouter } from '@/lib/navigation/guardedRouter'
import type { WalletCurrency } from '@/lib/wallet/walletTypes'

declare const __DEV__: boolean

type GiftsTranslator = Translator<keyof typeof giftsDictionary>
type DetailRedeemState = RedeemState | 'wallet_loading' | 'wallet_unavailable' | 'demo'

export default function GiftDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const { user } = useAuth()
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const insets = useSafeAreaInsets()
  const { t, language } = useI18n(giftsDictionary)
  const { data: gifts, isPending, error } = useGiftItems(user?.id)
  const { data: walletSummary, isPending: walletPending } = useWalletSummary(user?.id)
  const redeemMutation = useRedeemReward(user?.id)
  const [selectedCurrency, setSelectedCurrency] = useState<WalletCurrency | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [successResult, setSuccessResult] = useState<RedeemRewardResult | null>(null)
  const [redeemError, setRedeemError] = useState<string | undefined>()
  const [copied, setCopied] = useState(false)

  const gift = useMemo(() => (__DEV__ && id ? getDemoReward(id) : undefined) ?? gifts?.find((item) => item.id === id), [gifts, id])
  const demo = gift ? isDemoReward(gift) : false
  const priceOptions = gift ? getGiftPriceOptions(gift) : []
  const activeCurrency = priceOptions.some((option) => option.currency === selectedCurrency)
    ? selectedCurrency!
    : priceOptions[0]?.currency ?? 'leaderboard_point'
  const activePrice = gift ? getGiftPrice(gift, activeCurrency) : null
  const walletReady = Boolean(walletSummary?.wallet)
  const walletStatus = walletReady ? 'ready' : walletPending ? 'loading' : 'unavailable'
  const availablePoints = walletSummary?.wallet?.available_spendable ?? 0
  const availableCredits = walletSummary?.wallet?.available_credits ?? 0
  const canRedeemCreditRewards = walletSummary?.canRedeemCreditRewards ?? false

  if (isPending && !gift) {
    return <DetailState icon="loading" text={t('loadingShelf')} />
  }

  if (!gift) {
    return <DetailState icon="empty" text={t('errorNotFound')} body={error ? t('loadFailedFallback') : undefined} />
  }

  const currentGift = gift
  const studioSlot = getProfileStudioSlot(gift)

  const balance = balanceFor(activeCurrency, availablePoints, availableCredits)
  const offerEnd = formatGiftOfferEnd(gift, language, {
    redeemBy: (date) => t('redeemBy', { date }),
    notSpecified: t('notSpecified'),
  })
  const voucherValidity = formatVoucherValidity(gift, {
    validFor: (count) => t('voucherValidFor', { count }),
    notSpecified: t('notSpecified'),
  })
  const state: DetailRedeemState = demo
    ? 'demo'
    : gift.owned
    ? 'owned'
    : gift.stock_status === 'sold_out' || activePrice === null
      ? 'sold_out'
      : walletStatus === 'loading'
        ? 'wallet_loading'
        : walletStatus === 'unavailable'
          ? 'wallet_unavailable'
          : getRedeemState({ gift, currency: activeCurrency, price: activePrice, balance, canRedeemCreditRewards })
  const footer = footerCopy(state, activePrice, activeCurrency, balance, t)

  function requestRedeem() {
    if (activePrice === null || state !== 'ready') return
    setRedeemError(undefined)
    setConfirmOpen(true)
  }

  function tryOnCosmetic() {
    if (!studioSlot) return
    guardedRouter.push({
      pathname: '/cosmetics',
      params: { tab: studioSlot, previewGiftId: currentGift.id },
    }, { actionKey: `gift-detail:try-on:${currentGift.id}` })
  }

  function confirmRedeem() {
    if (activePrice === null || state !== 'ready') return
    setRedeemError(undefined)
    redeemMutation.mutate(
      { gift: currentGift, currency: activeCurrency },
      {
        onSuccess: (result) => {
          setConfirmOpen(false)
          setCopied(false)
          setSuccessResult(result)
        },
        onError: (redeemErrorValue) => {
          setRedeemError(t(getRedeemErrorKey(redeemErrorValue)))
        },
      },
    )
  }

  async function copyVoucherCode() {
    if (successResult?.kind !== 'voucher') return
    const Clipboard = await import('expo-clipboard')
    await Clipboard.setStringAsync(successResult.shortCode)
    setCopied(true)
  }

  return (
    <>
      <Stack.Screen options={{ title: t('rewardDetail'), headerShown: false }} />
      <View style={styles.root}>
        <Screen edges={['top', 'bottom']} topPad={Spacing.md} bottomPad={132} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <PressableScale style={styles.iconButton} onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/(tabs)') }} accessibilityRole="button" accessibilityLabel={t('back')}>
              <MaterialCommunityIcons name="chevron-left" size={25} color={theme.ink} />
            </PressableScale>
            <PressableScale style={styles.iconButton} onPress={() => guardedRouter.push('/gifts/redemptions', { actionKey: 'gift-detail:history' })} accessibilityRole="button" accessibilityLabel={t('myRewards')}>
              <MaterialCommunityIcons name="gift-outline" size={20} color={theme.orange} />
            </PressableScale>
          </View>

          <View style={styles.heroCard}>
              <RedeemRewardArtwork gift={gift} size="detail" />
              <View style={styles.heroCopy}>
                <View style={styles.heroMetaRow}>
                  <Text style={styles.eyebrow} maxFontSizeMultiplier={1.4}>{rewardCategoryLabel(gift, t)}</Text>
                  <Text style={[styles.statusText, { color: state === 'sold_out' || state === 'short' ? theme.red : state === 'owned' ? theme.greenVivid : state === 'ready' ? theme.trust : theme.muted }]} maxFontSizeMultiplier={1.4}>{statusLabel(state, t)}</Text>
                </View>
                <Text style={styles.title} maxFontSizeMultiplier={1.6}>{gift.name}</Text>
                {gift.description ? <Text style={styles.description} maxFontSizeMultiplier={1.6}>{gift.description}</Text> : null}
              </View>
            </View>

          {demo ? <View style={styles.demoNotice}><MaterialCommunityIcons name="flask-outline" size={17} color={theme.orange} /><Text style={styles.demoNoticeText} maxFontSizeMultiplier={1.6}>{t('sampleDetailNotice')}</Text></View> : null}

          {studioSlot ? (
            <PressableScale
              style={styles.tryOnButton}
              onPress={tryOnCosmetic}
              accessibilityRole="button"
              accessibilityLabel={t('tryOnInStudio')}
            >
              <View style={styles.tryOnIcon}>
                <MaterialCommunityIcons name="eye-outline" size={19} color={theme.orange} />
              </View>
              <Text style={styles.tryOnText} maxFontSizeMultiplier={1.5}>{t('tryOnInStudio')}</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color={theme.muted} />
            </PressableScale>
          ) : null}

          <View style={styles.factGrid}>
              <FactCard icon="tag-outline" label={t('status')} value={statusLabel(state, t)} />
              <FactCard icon="archive-outline" label={t('stock')} value={gift.stock_quantity === null ? t('available') : t('remaining', { count: gift.stock_quantity.toLocaleString() })} />
              <FactCard icon="account-outline" label={t('limit')} value={gift.per_user_limit === null ? t('noLimit') : t('perUserLimit', { count: gift.per_user_limit.toLocaleString() })} />
              <FactCard icon="calendar-outline" label={t('offerAvailability')} value={offerEnd} />
            </View>

          <View style={styles.section}>
              <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.5}>{t('conditions')}</Text>
              <Condition icon="check-circle-outline" text={rewardCategoryLabel(gift, t)} />
              <Condition icon="currency" currency={activeCurrency} text={`${t('redeemPrice')}: ${activePrice === null ? '—' : formatCurrencyPrice(activePrice, activeCurrency)}`} />
              {gift.item_type === 'voucher' ? <Condition icon="calendar-outline" text={`${t('voucherValidity')}: ${voucherValidity}`} /> : null}
            </View>

          <View style={styles.section}>
              <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.5}>{t('chooseCurrency')}</Text>
              <View style={styles.priceOptions}>
                {priceOptions.map((option) => (
                  <PriceOption key={option.currency} currency={option.currency} price={option.amount} selected={activeCurrency === option.currency} balance={balanceFor(option.currency, availablePoints, availableCredits)} walletStatus={walletStatus} canRedeemCreditRewards={canRedeemCreditRewards} onPress={() => setSelectedCurrency(option.currency)} t={t} />
                ))}
              </View>
            </View>
        </Screen>

        <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
          <View style={styles.footerCopy}>
            <Text style={styles.footerLabel} maxFontSizeMultiplier={1.4}>{footer.label}</Text>
            <Text style={styles.footerValue} maxFontSizeMultiplier={1.4}>{footer.value}</Text>
          </View>
          <PressableScale style={[styles.footerButton, state !== 'ready' && styles.footerButtonDisabled]} onPress={requestRedeem} disabled={state !== 'ready' || redeemMutation.isPending} accessibilityRole="button" accessibilityLabel={footer.button} accessibilityState={{ disabled: state !== 'ready' || redeemMutation.isPending, busy: redeemMutation.isPending }}>
            {redeemMutation.isPending ? <ActivityIndicator color={theme.chalk} size="small" /> : <MaterialCommunityIcons name="ticket-confirmation-outline" size={18} color={state === 'ready' ? theme.chalk : theme.muted} />}
            <Text style={[styles.footerButtonText, state !== 'ready' && styles.footerButtonTextDisabled]} maxFontSizeMultiplier={1.4}>{footer.button}</Text>
          </PressableScale>
        </View>

        <RedeemConfirmSheet visible={confirmOpen} gift={gift} currency={activeCurrency} price={activePrice ?? 0} balanceAfter={balance - (activePrice ?? 0)} pending={redeemMutation.isPending} errorMessage={redeemError} onClose={() => setConfirmOpen(false)} onConfirm={confirmRedeem} />
        {successResult ? <RedeemSuccessSheet visible gift={gift} result={successResult} copied={copied} onCopyCode={copyVoucherCode} onClose={() => setSuccessResult(null)} onOpenRewards={() => { setSuccessResult(null); guardedRouter.push('/gifts/redemptions', { actionKey: 'gift-detail:success-rewards' }) }} onOpenProfile={() => { setSuccessResult(null); guardedRouter.push('/cosmetics', { actionKey: 'gift-detail:success-profile-studio' }) }} /> : null}
      </View>
    </>
  )
}

function DetailState({ icon, text, body }: { icon: 'loading' | 'empty'; text: string; body?: string }) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  return <View style={[styles.centerState, { paddingTop: useSafeAreaInsets().top }]}>{icon === 'loading' ? <ActivityIndicator color={theme.orange} /> : <MaterialCommunityIcons name="gift-off-outline" size={36} color={theme.mutedSoft} />}<Text style={styles.centerStateTitle}>{text}</Text>{body ? <Text style={styles.centerStateText}>{body}</Text> : null}</View>
}

function FactCard({ icon, label, value }: { icon: 'tag-outline' | 'archive-outline' | 'account-outline' | 'calendar-outline'; label: string; value: string }) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  return <View style={styles.factCard}><MaterialCommunityIcons name={icon} size={17} color={theme.orange} /><Text style={styles.factLabel} maxFontSizeMultiplier={1.4}>{label}</Text><Text style={styles.factValue} maxFontSizeMultiplier={1.4}>{value}</Text></View>
}

function Condition({ icon, currency, text }: { icon: 'check-circle-outline' | 'currency' | 'calendar-outline'; currency?: WalletCurrency; text: string }) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  return <View style={styles.condition}>{icon === 'currency' ? currency === 'credit' ? <MaterialCommunityIcons name="diamond-stone" size={16} color={theme.trust} /> : <PointsIcon size={18} /> : <MaterialCommunityIcons name={icon} size={16} color={theme.trust} />}<Text style={styles.conditionText} maxFontSizeMultiplier={1.6}>{text}</Text></View>
}

function PriceOption({ currency, price, selected, balance, walletStatus, canRedeemCreditRewards, onPress, t }: { currency: WalletCurrency; price: number; selected: boolean; balance: number; walletStatus: 'ready' | 'loading' | 'unavailable'; canRedeemCreditRewards: boolean; onPress: () => void; t: GiftsTranslator }) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const locked = walletStatus === 'ready' && currency === 'credit' && !canRedeemCreditRewards
  const after = balance - price
  const afterLabel = walletStatus === 'loading' ? t('walletLoading') : walletStatus === 'unavailable' ? t('walletUnavailable') : locked ? t('proRequiredForCredits') : t('afterRedeem')
  const unit = currency === 'credit' ? t('creditsUnit') : t('pointsUnit')
  const afterValue = walletStatus !== 'ready' ? '—' : locked ? t('proMember') : `${after.toLocaleString()} ${unit}`
  return <PressableScale style={[styles.priceOption, selected && styles.priceOptionSelected]} onPress={onPress} accessibilityRole="button" accessibilityLabel={`${currency === 'credit' ? t('credits') : t('points')}: ${formatCurrencyPrice(price, currency)}`} accessibilityState={{ selected }}><View style={[styles.priceIcon, selected && styles.priceIconSelected]}>{currency === 'credit' ? <MaterialCommunityIcons name="diamond-stone" size={17} color={selected ? theme.chalk : theme.economy} /> : <PointsIcon size={19} />}</View><View style={styles.priceCopy}><Text style={styles.priceLabel} maxFontSizeMultiplier={1.4}>{currency === 'credit' ? t('credits') : t('points')}</Text><Text style={styles.priceValue} maxFontSizeMultiplier={1.4}>{formatCurrencyPrice(price, currency)}</Text></View><View style={styles.afterCopy}><Text style={styles.afterLabel} maxFontSizeMultiplier={1.4}>{afterLabel}</Text><Text style={[styles.afterValue, walletStatus === 'ready' && (locked || after < 0) && { color: theme.red }]} maxFontSizeMultiplier={1.4}>{afterValue}</Text></View></PressableScale>
}

function balanceText(state: DetailRedeemState, price: number | null, currency: WalletCurrency, balance: number, t: GiftsTranslator) {
  if (state === 'wallet_loading') return { label: t('status'), value: t('walletLoading'), button: t('walletLoading') }
  if (state === 'wallet_unavailable') return { label: t('status'), value: t('walletUnavailable'), button: t('walletUnavailable') }
  if (state === 'demo') return { label: t('status'), value: t('sample'), button: t('sampleOnly') }
  if (state === 'owned') return { label: t('status'), value: t('owned'), button: t('owned') }
  if (state === 'sold_out') return { label: t('status'), value: t('soldOut'), button: t('soldOut') }
  if (state === 'locked') return { label: t('credits'), value: t('proRequiredForCredits'), button: t('proRequiredForCredits') }
  if (state === 'short' && price !== null) return { label: currency === 'credit' ? t('credits') : t('points'), value: `${(price - balance).toLocaleString()} ${currency === 'credit' ? t('creditsUnit') : t('pointsUnit')}`, button: t('errorInsufficientBalance') }
  return { label: t('status'), value: price === null ? '—' : formatCurrencyPrice(price, currency), button: t('redeemNow') }
}

const footerCopy = balanceText

function statusLabel(state: DetailRedeemState, t: GiftsTranslator) {
  if (state === 'wallet_loading') return t('walletLoading')
  if (state === 'wallet_unavailable') return t('walletUnavailable')
  if (state === 'demo') return t('sample')
  if (state === 'owned') return t('owned')
  if (state === 'sold_out') return t('soldOut')
  if (state === 'locked') return t('proRequiredForCredits')
  if (state === 'short') return t('errorInsufficientBalance')
  return t('available')
}

function rewardCategoryLabel(gift: GiftItem, t: GiftsTranslator): string {
  if (gift.item_type === 'cosmetic') return t('profileItem')
  if (gift.category === 'event') return t('categoryEvent')
  if (gift.category === 'gift') return t('categoryGift')
  return t('categoryCoupon')
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.bg },
    container: { paddingHorizontal: Spacing.xl, gap: Spacing.lg },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.lg, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface },
    heroCard: { gap: Spacing.md },
    heroCopy: { gap: 8 },
    heroMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
    eyebrow: { color: theme.orange, fontSize: 10, lineHeight: 14, fontWeight: '900', fontFamily: Fonts.rounded, letterSpacing: 0.7 },
    title: { color: theme.ink, fontSize: 28, lineHeight: 35, fontWeight: '900', letterSpacing: -0.7 },
    description: { color: theme.muted, fontSize: 13, lineHeight: 19, fontWeight: '700' },
    statusText: { fontSize: 12, lineHeight: 17, fontWeight: '900' },
    demoNotice: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderRadius: Radius.lg, backgroundColor: theme.orangeSoft, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
    demoNoticeText: { flex: 1, color: theme.inkSoft, fontSize: 12, lineHeight: 18, fontWeight: '800' },
    tryOnButton: {
      minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      borderRadius: Radius.xl, borderWidth: 1, borderColor: theme.line,
      backgroundColor: theme.surface, paddingHorizontal: Spacing.md,
    },
    tryOnIcon: {
      width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
      borderRadius: Radius.lg, backgroundColor: theme.orangeSoft,
    },
    tryOnText: { flex: 1, color: theme.ink, fontSize: 14, lineHeight: 20, fontWeight: '900' },
    factGrid: { gap: Spacing.xs, borderRadius: Radius.xl, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface, padding: Spacing.sm },
    factCard: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderRadius: Radius.lg, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs },
    factLabel: { flex: 1, color: theme.muted, fontSize: 11, lineHeight: 16, fontWeight: '800' },
    factValue: { maxWidth: '56%', color: theme.ink, fontSize: 13, lineHeight: 19, fontWeight: '900', textAlign: 'right' },
    section: { gap: Spacing.md },
    sectionTitle: { color: theme.ink, fontSize: 17, lineHeight: 23, fontWeight: '900' },
    condition: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
    conditionText: { flex: 1, color: theme.inkSoft, fontSize: 13, lineHeight: 19, fontWeight: '700' },
    priceOptions: { gap: Spacing.sm },
    priceOption: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderRadius: Radius.xl, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface, padding: Spacing.md },
    priceOptionSelected: { borderColor: theme.orange, backgroundColor: theme.orangeSoft },
    priceIcon: { width: 38, height: 38, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.economySoft },
    priceIconSelected: { backgroundColor: theme.orange },
    priceCopy: { flex: 1, gap: 2 },
    priceLabel: { color: theme.muted, fontSize: 11, lineHeight: 15, fontWeight: '800' },
    priceValue: { color: theme.ink, fontSize: 15, lineHeight: 20, fontWeight: '900', fontFamily: Fonts.rounded },
    afterCopy: { maxWidth: '48%', alignItems: 'flex-end', gap: 2 },
    afterLabel: { color: theme.muted, fontSize: 10, lineHeight: 14, fontWeight: '800', textAlign: 'right' },
    afterValue: { color: theme.trust, fontSize: 13, lineHeight: 18, fontWeight: '900', fontFamily: Fonts.rounded },
    footer: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderTopWidth: 1, borderTopColor: theme.line, backgroundColor: theme.bg, paddingHorizontal: Spacing.xl, paddingTop: Spacing.md },
    footerCopy: { flex: 1, gap: 2 },
    footerLabel: { color: theme.muted, fontSize: 11, lineHeight: 15, fontWeight: '800' },
    footerValue: { color: theme.ink, fontSize: 14, lineHeight: 19, fontWeight: '900' },
    footerButton: { minHeight: 50, minWidth: 148, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: Radius.lg, backgroundColor: theme.orange, paddingHorizontal: Spacing.md },
    footerButtonDisabled: { backgroundColor: theme.surfaceStrong },
    footerButtonText: { color: theme.chalk, fontSize: 13, lineHeight: 18, fontWeight: '900' },
    footerButtonTextDisabled: { color: theme.muted },
    centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: theme.bg, paddingHorizontal: Spacing.xl },
    centerStateTitle: { color: theme.ink, fontSize: 18, lineHeight: 24, fontWeight: '900', textAlign: 'center' },
    centerStateText: { color: theme.muted, fontSize: 13, lineHeight: 19, fontWeight: '700', textAlign: 'center' },
  })
}
