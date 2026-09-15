import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator, Alert, Platform, StyleSheet, Text, View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useNavigation } from 'expo-router'
import { usePreventRemove } from '@react-navigation/native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Screen } from '@/components/layout/Screen'
import { ScreenBackButton } from '@/components/navigation/ScreenBackButton'
import { PressableScale } from '@/components/motion/PressableScale'
import { Reveal } from '@/components/motion/Reveal'
import { CosmeticPickerRow } from '@/components/cosmetics/CosmeticPickerRow'
import { CosmeticPreviewCard } from '@/components/cosmetics/CosmeticPreviewCard'
import { ProfileStudioCatalogRow } from '@/components/cosmetics/ProfileStudioCatalogRow'
import { RankFramePicker } from '@/components/cosmetics/RankFramePicker'
import { RedeemConfirmSheet } from '@/components/gifts/RedeemConfirmSheet'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { useCosmeticLoadout } from '@/hooks/useCosmeticLoadout'
import { useGiftItems, useRedeemReward } from '@/hooks/useGifts'
import { useI18n } from '@/hooks/useI18n'
import { useUserActivityRatings } from '@/hooks/useUserActivityRatings'
import { useRankFrameCatalog } from '@/hooks/useRankFrameCatalog'
import { useWalletSummary } from '@/hooks/useWalletSummary'
import { LOADOUT_SLOTS, type LoadoutSlot } from '@/lib/cosmetics/cosmeticLoadout'
import { buildRankFrameCells, type RankFrameTab } from '@/lib/cosmetics/rankFrameGating'
import { mapCosmeticErrorMessage } from '@/lib/cosmetics/cosmeticErrorMessages'
import {
  filterProfileStudioItems,
  findProfileStudioItemByGiftId,
  mergeProfileStudioItems,
  studioItemToResolved,
  type ProfileStudioItem,
  type ProfileStudioOwnershipFilter,
} from '@/lib/cosmetics/profileStudio'
import { formatCurrencyPrice, getGiftPriceOptions } from '@/components/gifts/redeemCatalog'
import { chooseRedeemCatalog, isDemoReward } from '@/lib/gifts/redeemDemoCatalog'
import { getRedeemErrorKey } from '@/lib/gifts/redeemError'
import { getRedeemState, type RedeemState } from '@/lib/gifts/redeemPolicy'
import { cosmeticsDictionary } from '@/lib/i18n/dictionaries/cosmetics'
import { giftsDictionary } from '@/lib/i18n/dictionaries/gifts'
import { LEADERBOARD_ACTIVITIES } from '@/lib/leaderboard/leaderboardConfig'
import { RANK_FRAME_CODE_BY_TIER } from '@/lib/ranks/rankAssets'
import type { Tier } from '@/lib/leaderboard/tierRules'
import type { GiftItem } from '@/lib/gifts/giftTypes'
import type { WalletCurrency } from '@/lib/wallet/walletTypes'
import { guardedRouter } from '@/lib/navigation/guardedRouter'

declare const __DEV__: boolean

const TAB_LABEL_KEY = { frame: 'frame', title: 'title', badge: 'badge' } as const
const NONE_LABEL_KEY = { frame: 'noFrame', title: 'noTitle', badge: 'noBadge' } as const
const EMPTY_ICON: Record<LoadoutSlot, keyof typeof MaterialCommunityIcons.glyphMap> = {
  frame: 'shape-circle-plus', title: 'label-off-outline', badge: 'shield-star-outline',
}

// Thai labels for the frame-tab category selector. Derived keys come from
// LEADERBOARD_ACTIVITIES (leaderboardConfig.ts) — this map only supplies the
// Locker-local Thai copy, it does not define the activity key list itself.
const RANK_FRAME_TAB_LABEL_KEY = {
  profile: 'profile', basketball: 'basketball', badminton: 'badminton', running: 'running',
} as const

const CODE_TO_TIER: Record<string, Tier> = Object.fromEntries(
  Object.entries(RANK_FRAME_CODE_BY_TIER).map(([tier, code]) => [code, tier as Tier]),
)

function isLoadoutSlot(value: unknown): value is LoadoutSlot {
  return value === 'frame' || value === 'title' || value === 'badge'
}

function isRankFrameTab(value: unknown): value is RankFrameTab {
  return value === 'profile' || value === 'running' || value === 'basketball' || value === 'badminton'
}

export default function CosmeticsScreen() {
  const theme = useSportTheme()
  const insets = useSafeAreaInsets()
  const styles = createStyles(theme)
  const params = useLocalSearchParams<{ tab?: string; category?: string; previewGiftId?: string }>()
  const navigation = useNavigation()
  const { user } = useAuth()
  const { track } = useAnalytics()
  const { t } = useI18n(cosmeticsDictionary)
  const { t: giftT } = useI18n(giftsDictionary)
  const { data: profile } = useProfile(user?.id)
  const { data: activityRatings } = useUserActivityRatings(user?.id)
  const { data: rankFrameCatalog } = useRankFrameCatalog()

  const [tab, setTab] = useState<LoadoutSlot>(isLoadoutSlot(params.tab) ? params.tab : 'frame')
  // `category` deep-links the frame tab straight to an activity (e.g. the
  // PromotionMoment CTA "ใส่กรอบ <tier> เลย" for that sport) — defaults to
  // 'profile' like before when absent/invalid.
  const [frameCategory, setFrameCategory] = useState<RankFrameTab>(
    isRankFrameTab(params.category) ? params.category : 'profile',
  )

  const loadoutActivity = frameCategory === 'profile' ? undefined : frameCategory
  const loadout = useCosmeticLoadout(user?.id, loadoutActivity)
  const shopQuery = useGiftItems(user?.id)
  const redeemMutation = useRedeemReward(user?.id)
  const { data: walletSummary, isPending: walletPending } = useWalletSummary(user?.id)
  const [ownershipFilter, setOwnershipFilter] = useState<ProfileStudioOwnershipFilter>('all')
  const [previewBySlot, setPreviewBySlot] = useState<Partial<Record<LoadoutSlot, ProfileStudioItem>>>({})
  const [confirmGift, setConfirmGift] = useState<GiftItem | null>(null)
  const [confirmCurrency, setConfirmCurrency] = useState<WalletCurrency>('leaderboard_point')
  const [redeemError, setRedeemError] = useState<string | undefined>()
  const [studioNotice, setStudioNotice] = useState<'unlocked' | 'pending' | 'sampleNotice' | null>(null)
  const handledPreviewGiftId = useRef<string | null>(null)

  const shopCatalog = useMemo(() => chooseRedeemCatalog({
    realItems: shopQuery.data,
    isPending: shopQuery.isPending,
    hasError: shopQuery.isError,
    isDevelopment: __DEV__,
  }), [shopQuery.data, shopQuery.isError, shopQuery.isPending])

  const studioItems = useMemo(
    () => mergeProfileStudioItems(shopCatalog.items, loadout.owned),
    [loadout.owned, shopCatalog.items],
  )
  const visibleStudioItems = useMemo(
    () => filterProfileStudioItems(studioItems, tab, ownershipFilter),
    [ownershipFilter, studioItems, tab],
  )
  const previewItem = previewBySlot[tab]
  const previewDraft = useMemo(
    () => previewItem ? { ...loadout.draft, [tab]: studioItemToResolved(previewItem) } : loadout.draft,
    [loadout.draft, previewItem, tab],
  )

  useEffect(() => {
    const previewGiftId = params.previewGiftId
    if (!previewGiftId || handledPreviewGiftId.current === previewGiftId) return
    const item = findProfileStudioItemByGiftId(studioItems, previewGiftId)
    if (!item) return

    handledPreviewGiftId.current = previewGiftId
    setTab(item.slot)
    if (item.slot === 'frame') setFrameCategory('profile')
    setOwnershipFilter('all')
    setStudioNotice(null)
    setPreviewBySlot((current) => ({ ...current, [item.slot]: item }))
  }, [params.previewGiftId, studioItems])

  const walletReady = Boolean(walletSummary?.wallet)
  const availablePoints = walletSummary?.wallet?.available_spendable ?? 0
  const availableCredits = walletSummary?.wallet?.available_credits ?? 0
  const canRedeemCreditRewards = walletSummary?.canRedeemCreditRewards ?? false
  const confirmPrice = confirmGift
    ? getGiftPriceOptions(confirmGift).find((option) => option.currency === confirmCurrency)?.amount ?? 0
    : 0
  const confirmBalance = confirmCurrency === 'credit' ? availableCredits : availablePoints

  const RANK_FRAME_TABS: RankFrameTab[] = useMemo(
    () => ['profile', ...LEADERBOARD_ACTIVITIES.map((a) => a.key)],
    [],
  )

  const userTiers = useMemo(() => {
    const map: Partial<Record<typeof LEADERBOARD_ACTIVITIES[number]['key'], Tier>> = {}
    for (const r of activityRatings ?? []) {
      if (r.activity === 'running' || r.activity === 'basketball' || r.activity === 'badminton') {
        map[r.activity] = r.tier
      }
    }
    return map
  }, [activityRatings])

  const initials = (profile?.display_name ?? user?.email ?? '?')[0].toUpperCase()
  const displayName = profile?.display_name ?? user?.email ?? 'Rally Player'

  const draftId = loadout.draft[tab]?.id ?? null
  const equippedId = loadout.equipped?.[tab]?.id ?? null

  const draftFrameTier = tab === 'frame' && loadout.draft.frame ? CODE_TO_TIER[loadout.draft.frame.code] ?? null : null
  const equippedFrameTier = tab === 'frame' && loadout.equipped?.frame ? CODE_TO_TIER[loadout.equipped.frame.code] ?? null : null
  const rankFrameCells = useMemo(
    () => buildRankFrameCells(userTiers, frameCategory, equippedFrameTier),
    [userTiers, frameCategory, equippedFrameTier],
  )

  usePreventRemove(loadout.isDirty && !loadout.isCommitting, ({ data }) => {
    Alert.alert(
      t('unsavedTitle'),
      t('unsavedBody'),
      [
        { text: t('stay'), style: 'cancel' },
        { text: t('leave'), style: 'destructive', onPress: () => navigation.dispatch(data.action) },
      ],
    )
  })

  function showError(error: unknown) {
    const message = mapCosmeticErrorMessage(error)
    if (Platform.OS === 'web') { globalThis.alert(message); return }
    Alert.alert('Error', message)
  }

  function trackFrameEquipped(success: boolean) {
    if (!loadout.dirtySlots.includes('frame') || !draftFrameTier) return
    track({
      name: 'rank_frame_equipped',
      properties: { activity: frameCategory, tier: draftFrameTier, slot: 'frame', success },
    })
  }

  function onConfirm() {
    loadout.commit().then(
      () => trackFrameEquipped(true),
      (error) => {
        trackFrameEquipped(false)
        showError(error)
      },
    )
  }

  function onSelectRankFrameTier(tier: Tier | null) {
    setPreviewBySlot((current) => ({ ...current, frame: undefined }))
    if (tier === null) {
      loadout.setSlot('frame', null)
      return
    }
    const code = RANK_FRAME_CODE_BY_TIER[tier]
    const catalogEntry = rankFrameCatalog?.[code] ?? null
    if (!catalogEntry) return
    // Rank frames have no `user_cosmetics` ownership row, only a catalog row
    // (see cosmeticRepository.getCosmeticCatalogByCode). `acquired_at`/
    // `acquired_via` are unused by the equip path (ownedToResolved only reads
    // id/code/asset_ref/name/rarity) — filled with placeholders to satisfy
    // the shared OwnedCosmetic shape.
    loadout.setSlot('frame', {
      ...catalogEntry,
      type: 'frame',
      description: '',
      is_default: false,
      acquired_at: new Date(0).toISOString(),
      acquired_via: 'default',
    })
  }

  function previewStudioItem(item: ProfileStudioItem) {
    setStudioNotice(null)
    setPreviewBySlot((current) => ({ ...current, [item.slot]: item }))
  }

  function chooseOwnedItem(item: ProfileStudioItem) {
    if (!item.ownedCosmetic || loadout.isOwnedError) return
    loadout.setSlot(item.slot, item.ownedCosmetic)
    setPreviewBySlot((current) => ({ ...current, [item.slot]: undefined }))
  }

  function requestStudioRedeem(item: ProfileStudioItem) {
    const gift = item.gift
    if (!gift) return
    if (isDemoReward(gift)) {
      previewStudioItem(item)
      setStudioNotice('sampleNotice')
      return
    }
    const option = getGiftPriceOptions(gift)[0]
    if (!option) return
    const state = studioRedeemState(gift, option.currency, {
      walletReady,
      walletPending,
      availablePoints,
      availableCredits,
      canRedeemCreditRewards,
    })
    if (state !== 'ready') return
    setRedeemError(undefined)
    setConfirmCurrency(option.currency)
    setConfirmGift(gift)
  }

  function confirmStudioRedeem() {
    if (!confirmGift) return
    redeemMutation.mutate(
      { gift: confirmGift, currency: confirmCurrency },
      {
        onSuccess: async (result) => {
          setConfirmGift(null)
          if (result.kind !== 'cosmetic' || result.status !== 'fulfilled') {
            setStudioNotice('pending')
            return
          }
          const refreshed = await loadout.refetchOwned()
          const ownsReward = refreshed.data?.some((item) => item.id === confirmGift.reward_cosmetic?.id)
          setStudioNotice(ownsReward ? 'unlocked' : 'pending')
        },
        onError: (error) => setRedeemError(giftT(getRedeemErrorKey(error))),
      },
    )
  }

  function getStudioAction(item: ProfileStudioItem, equipped: boolean) {
    if (item.owned) {
      if (equipped) return { label: t('equipped'), disabled: true }
      if (!item.ownedCosmetic || loadout.isOwnedError) return { label: t('owned'), disabled: true }
      return { label: t('wear'), disabled: loadout.isCommitting }
    }

    const gift = item.gift
    if (!gift) return { label: t('soldOut'), disabled: true }
    const option = getGiftPriceOptions(gift)[0]
    if (!option) return { label: t('soldOut'), disabled: true }
    if (isDemoReward(gift)) {
      return {
        label: t('redeem', { amount: formatCurrencyPrice(option.amount, option.currency) }),
        disabled: false,
      }
    }
    if (!walletReady) return { label: t('checkingBalance'), disabled: true }

    const state = studioRedeemState(gift, option.currency, {
      walletReady,
      walletPending,
      availablePoints,
      availableCredits,
      canRedeemCreditRewards,
    })
    if (state === 'sold_out') return { label: t('soldOut'), disabled: true }
    if (state === 'locked') return { label: t('proLocked'), disabled: true }
    if (state === 'short') return { label: t('insufficient'), disabled: true }
    return { label: t('redeem', { amount: formatCurrencyPrice(option.amount, option.currency) }), disabled: redeemMutation.isPending }
  }

  return (
    <>
      <View style={styles.root}>
        <Screen
          edges={['top', 'bottom']}
          bottomPad={120}
          contentContainerStyle={styles.container}
        >
          <View style={styles.headerRow}>
            <ScreenBackButton />
            <View style={styles.headerCopy}>
              <Text style={styles.headerEyebrow}>{t('screenEyebrow')}</Text>
              <Text style={styles.headerTitle}>{t('screenTitle')}</Text>
            </View>
          </View>
          <Reveal delay={0}>
            <CosmeticPreviewCard
              displayName={displayName}
              initials={initials}
              avatarUrl={profile?.avatar_url}
              draft={previewDraft}
            />
          </Reveal>

          {studioNotice ? (
            <View style={styles.notice} accessibilityRole="alert">
              <MaterialCommunityIcons
                name={studioNotice === 'unlocked' ? 'check-circle' : studioNotice === 'sampleNotice' ? 'flask-outline' : 'progress-clock'}
                size={18}
                color={studioNotice === 'unlocked' ? theme.greenVivid : theme.amber}
              />
              <Text style={styles.noticeText}>{t(studioNotice)}</Text>
            </View>
          ) : null}

          {loadout.isOwnedError ? (
            <View style={styles.notice} accessibilityRole="alert">
              <MaterialCommunityIcons name="alert-circle-outline" size={18} color={theme.red} />
              <Text style={styles.noticeText}>{t('inventoryUnavailable')}</Text>
            </View>
          ) : null}

          <Reveal delay={60}>
            <View style={styles.tabs}>
              {LOADOUT_SLOTS.map((slot) => {
                const active = slot === tab
                return (
                  <PressableScale
                    key={slot}
                    style={[styles.tab, active && { backgroundColor: theme.ink }]}
                    onPress={() => {
                      if (slot === 'frame' && tab !== 'frame') {
                        track({ name: 'rank_frame_locker_viewed', properties: { source: 'locker_tab' } })
                      }
                      setTab(slot)
                    }}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.tabText, { color: active ? theme.bg : theme.muted }]}>
                      {t(TAB_LABEL_KEY[slot])}
                    </Text>
                  </PressableScale>
                )
              })}
            </View>
          </Reveal>

          {tab === 'frame' ? (
            <>
              <Reveal delay={120}>
                <View style={styles.tabs}>
                  {RANK_FRAME_TABS.map((rfTab) => {
                    const active = rfTab === frameCategory
                    return (
                      <PressableScale
                        key={rfTab}
                        style={[styles.tab, active && { backgroundColor: theme.ink }]}
                        onPress={() => setFrameCategory(rfTab)}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: active }}
                      >
                        <Text style={[styles.tabText, { color: active ? theme.bg : theme.muted }]} numberOfLines={1}>
                          {t(RANK_FRAME_TAB_LABEL_KEY[rfTab])}
                        </Text>
                      </PressableScale>
                    )
                  })}
                </View>
              </Reveal>

              {loadout.isPending ? (
                <ActivityIndicator color={theme.orange} style={{ marginTop: Spacing.xl }} />
              ) : (
                <Reveal delay={180}>
                  <RankFramePicker
                    cells={rankFrameCells}
                    selectedTier={draftFrameTier}
                    onSelect={onSelectRankFrameTier}
                    disabled={loadout.isCommitting}
                  />
                </Reveal>
              )}
            </>
          ) : (
            <Reveal delay={120}>
              <CosmeticPickerRow
                slot={tab}
                cosmetic={null}
                label={t(NONE_LABEL_KEY[tab])}
                selected={!previewItem && draftId === null}
                committed={equippedId === null}
                disabled={loadout.isCommitting}
                onPress={() => {
                  loadout.setSlot(tab, null)
                  setPreviewBySlot((current) => ({ ...current, [tab]: undefined }))
                }}
              />
            </Reveal>
          )}

          {tab !== 'frame' || frameCategory === 'profile' ? <>
          <View style={styles.catalogHeader}>
            <View>
              <Text style={styles.catalogTitle}>{t('catalogTitle')}</Text>
              <Text style={styles.catalogHint}>{t('previewOnly')}</Text>
            </View>
            <Text style={styles.catalogCount}>{visibleStudioItems.length}</Text>
          </View>

          <View style={styles.ownershipTabs}>
            {(['all', 'owned', 'unowned'] as const).map((filter) => {
              const active = ownershipFilter === filter
              const label = filter === 'owned' ? t('filterMine') : filter === 'unowned' ? t('filterUnowned') : t('filterAll')
              return (
                <PressableScale
                  key={filter}
                  style={[styles.ownershipTab, active && styles.ownershipTabActive]}
                  onPress={() => setOwnershipFilter(filter)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.ownershipText, active && styles.ownershipTextActive]}>{label}</Text>
                </PressableScale>
              )
            })}
          </View>

          {loadout.isPending || shopQuery.isPending ? (
            <ActivityIndicator color={theme.orange} style={{ marginTop: Spacing.xl }} />
          ) : visibleStudioItems.length === 0 ? (
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name={EMPTY_ICON[tab]} size={24} color={theme.mutedSoft} />
              <Text style={styles.emptyText}>{t('noItems')}</Text>
            </View>
          ) : (
            <View style={styles.catalogList}>
              {visibleStudioItems.map((item) => {
                const equipped = equippedId === item.cosmeticId
                const selected = previewItem?.cosmeticId === item.cosmeticId || (!previewItem && draftId === item.cosmeticId)
                const action = getStudioAction(item, equipped)
                const gift = item.gift
                const price = gift ? getGiftPriceOptions(gift)[0] : null
                return (
                  <ProfileStudioCatalogRow
                    key={item.cosmeticId}
                    item={item}
                    selected={selected}
                    equipped={equipped}
                    priceLabel={!item.owned && price ? formatCurrencyPrice(price.amount, price.currency) : null}
                    metaLabel={item.owned ? (equipped ? t('equipped') : t('owned')) : item.rarity.toUpperCase()}
                    actionLabel={action.label}
                    previewLabel={t('tryOn')}
                    detailsLabel={giftT('details')}
                    actionDisabled={action.disabled}
                    onPreview={() => previewStudioItem(item)}
                    onOpenDetails={gift ? () => guardedRouter.push({
                      pathname: '/gifts/[id]',
                      params: { id: gift.id },
                    }, { actionKey: `profile-studio:gift:${gift.id}` }) : undefined}
                    onAction={() => item.owned ? chooseOwnedItem(item) : requestStudioRedeem(item)}
                  />
                )
              })}
            </View>
          )}
          </> : null}
        </Screen>

        {confirmGift ? (
          <RedeemConfirmSheet
            visible
            gift={confirmGift}
            currency={confirmCurrency}
            price={confirmPrice}
            balanceAfter={confirmBalance - confirmPrice}
            pending={redeemMutation.isPending}
            errorMessage={redeemError}
            onClose={() => { if (!redeemMutation.isPending) setConfirmGift(null) }}
            onConfirm={confirmStudioRedeem}
          />
        ) : null}

        <View style={[styles.confirmBar, { paddingBottom: insets.bottom + Spacing.lg }]}>
          <PressableScale
            style={[styles.confirmBtn, !loadout.isDirty && styles.confirmBtnDisabled]}
            onPress={onConfirm}
            disabled={!loadout.isDirty || loadout.isCommitting}
            accessibilityRole="button"
            accessibilityLabel={loadout.isDirty ? t('confirmCount', { count: loadout.dirtySlots.length }) : t('confirm')}
            accessibilityState={{ disabled: !loadout.isDirty || loadout.isCommitting, busy: loadout.isCommitting }}
          >
            {loadout.isCommitting ? (
              <ActivityIndicator color={theme.chalk} />
            ) : (
              <Text style={styles.confirmText}>
                {loadout.isDirty ? t('confirmCount', { count: loadout.dirtySlots.length }) : t('confirm')}
              </Text>
            )}
          </PressableScale>
        </View>
      </View>
    </>
  )
}

function studioRedeemState(
  gift: GiftItem,
  currency: WalletCurrency,
  wallet: {
    walletReady: boolean
    walletPending: boolean
    availablePoints: number
    availableCredits: number
    canRedeemCreditRewards: boolean
  },
): RedeemState {
  if (!wallet.walletReady || wallet.walletPending) return 'locked'
  const price = getGiftPriceOptions(gift).find((option) => option.currency === currency)?.amount
  if (price === undefined) return 'sold_out'
  const balance = currency === 'credit' ? wallet.availableCredits : wallet.availablePoints
  return getRedeemState({
    gift,
    currency,
    price,
    balance,
    canRedeemCreditRewards: wallet.canRedeemCreditRewards,
  })
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.bg },
    container: { paddingHorizontal: Spacing.xl, gap: Spacing.sm },
    headerRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    headerCopy: { flex: 1, minWidth: 0 },
    headerEyebrow: { color: theme.orange, fontSize: 10, lineHeight: 14, fontWeight: '900' },
    headerTitle: { color: theme.ink, fontSize: 23, lineHeight: 29, fontWeight: '900', letterSpacing: -0.4 },
    notice: {
      minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      borderRadius: Radius.lg, borderWidth: 1, borderColor: theme.line,
      backgroundColor: theme.bgElevated, paddingHorizontal: Spacing.md,
    },
    noticeText: { flex: 1, color: theme.inkSoft, fontSize: 12, lineHeight: 17, fontWeight: '800' },
    tabs: {
      flexDirection: 'row',
      gap: 6,
      padding: 4,
      borderRadius: Radius.pill,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.line,
      marginVertical: Spacing.sm,
    },
    tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: Radius.pill },
    tabText: { fontSize: 13, fontWeight: '900', letterSpacing: 0.4 },
    catalogHeader: { marginTop: Spacing.md, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: Spacing.md },
    catalogTitle: { color: theme.ink, fontSize: 19, lineHeight: 24, fontWeight: '900' },
    catalogHint: { color: theme.muted, fontSize: 11, lineHeight: 16, fontWeight: '700' },
    catalogCount: { color: theme.orange, fontSize: 15, lineHeight: 20, fontWeight: '900' },
    ownershipTabs: { flexDirection: 'row', gap: Spacing.sm, paddingVertical: Spacing.xs },
    ownershipTab: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.pill, borderWidth: 1, borderColor: theme.lineStrong, backgroundColor: theme.bgElevated, paddingHorizontal: Spacing.md },
    ownershipTabActive: { borderColor: theme.orange, backgroundColor: theme.orange },
    ownershipText: { color: theme.inkSoft, fontSize: 12, lineHeight: 17, fontWeight: '900' },
    ownershipTextActive: { color: theme.chalk },
    catalogList: { gap: Spacing.sm, paddingBottom: Spacing.md },
    emptyCard: {
      alignItems: 'center', gap: Spacing.sm, padding: Spacing.xl,
      borderRadius: Radius.xl, borderWidth: 1, borderColor: theme.line,
      borderStyle: 'dashed', marginTop: Spacing.lg,
    },
    emptyText: { fontSize: 13, color: theme.inkSoft, fontWeight: '700' },
    confirmBar: {
      position: 'absolute', left: 0, right: 0, bottom: 0,
      padding: Spacing.lg,
      backgroundColor: theme.bg,
      borderTopWidth: 1, borderTopColor: theme.line,
    },
    confirmBtn: {
      alignItems: 'center', justifyContent: 'center',
      paddingVertical: 14, borderRadius: Radius.lg, backgroundColor: theme.orange,
      minHeight: 50,
    },
    confirmBtnDisabled: { backgroundColor: theme.line },
    confirmText: { color: theme.chalk, fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
  })
}
