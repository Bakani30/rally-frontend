import { useMemo, useState, type ComponentProps } from 'react'
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { RedeemCampaignBanner } from '@/components/gifts/RedeemCampaignBanner'
import { RedeemCosmeticsZone } from '@/components/gifts/RedeemCosmeticsZone'
import { RedeemFilterBar } from '@/components/gifts/RedeemFilterBar'
import { RedeemHeroStage } from '@/components/gifts/RedeemHeroStage'
import { RedeemRewardCard } from '@/components/gifts/RedeemRewardCard'
import { RedeemStoreModeSwitch, type RedeemStoreMode } from '@/components/gifts/RedeemStoreModeSwitch'
import {
  matchesRewardQuery,
  matchesRewardCategory,
  type CategoryKey,
  splitRedeemCatalog,
} from '@/components/gifts/redeemCatalog'
import { Screen } from '@/components/layout/Screen'
import { PressableScale } from '@/components/motion/PressableScale'
import { Skeleton } from '@/components/ui/Skeleton'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useI18n } from '@/hooks/useI18n'
import type { GiftItem } from '@/lib/gifts/giftTypes'
import { giftsDictionary } from '@/lib/i18n/dictionaries/gifts'

export type RedeemShopViewProps = {
  catalog: {
    items: GiftItem[]
    isDemo: boolean
    errorMode: 'none' | 'inline' | 'blocking'
    isPending: boolean
    isFetching: boolean
  }
  wallet: {
    status: 'loading' | 'ready' | 'unavailable'
    availablePoints: number
    availableCredits: number
    canRedeemCreditRewards: boolean
    pendingRedemptions: number
  }
  onBack: () => void
  onOpenWallet: () => void
  onOpenHistory: () => void
  onOpenProfileStudio: () => void
  onOpenStudio: () => void
  onRetry: () => void | Promise<unknown>
  onOpenGiftDetail: (gift: GiftItem) => void
}

/**
 * Presentation-only redeem catalog. The route provides catalog/error/wallet
 * authority and navigation intents; this View owns existing local filters.
 */
export function RedeemShopView({
  catalog,
  wallet,
  onBack,
  onOpenWallet,
  onOpenHistory,
  onOpenProfileStudio,
  onOpenStudio,
  onRetry,
  onOpenGiftDetail,
}: RedeemShopViewProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { t } = useI18n(giftsDictionary)
  const { width } = useWindowDimensions()
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('all')
  const [storeMode, setStoreMode] = useState<RedeemStoreMode>('rewards')
  const [query, setQuery] = useState('')
  const rewardCardWidth = Math.floor((width - (Spacing.xl * 2) - Spacing.md) / 2)

  const catalogZones = useMemo(() => splitRedeemCatalog(catalog.items), [catalog.items])
  const visibleForSearch = useMemo(() => {
    return catalogZones.rewards.filter((gift) => matchesRewardQuery(gift, query))
  }, [catalogZones.rewards, query])
  const filteredGifts = useMemo(() => {
    return visibleForSearch.filter((gift) => matchesRewardCategory(gift, activeCategory))
  }, [visibleForSearch, activeCategory])

  function openCampaignCategory(category: CategoryKey) {
    setStoreMode('rewards')
    setQuery('')
    setActiveCategory(category)
  }

  return (
    <Screen
      edges={['top', 'bottom']}
      bottomPad={112}
      backgroundColor={theme.bg}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <RedeemHeroStage
        availablePoints={wallet.availablePoints}
        availableCredits={wallet.availableCredits}
        walletStatus={wallet.status}
        pendingRedemptions={wallet.pendingRedemptions}
        onBack={onBack}
        onOpenWallet={onOpenWallet}
        onOpenHistory={onOpenHistory}
        onOpenProfileStudio={onOpenProfileStudio}
      />

      <RedeemCampaignBanner
        onOpenGifts={() => openCampaignCategory('gift')}
        onOpenEvents={() => openCampaignCategory('event')}
      />

      {catalog.isDemo ? (
        <View style={styles.demoNotice} accessibilityRole="alert">
          <MaterialCommunityIcons name="flask-outline" size={16} color={theme.orange} />
          <Text style={styles.demoNoticeText} maxFontSizeMultiplier={1.5}>{t('sampleCatalogNotice')}</Text>
        </View>
      ) : null}

      <RedeemStoreModeSwitch value={storeMode} onChange={setStoreMode} />

      {storeMode === 'rewards' ? (
        <>
          <RedeemFilterBar
            query={query}
            activeCategory={activeCategory}
            loading={catalog.isPending}
            onQueryChange={setQuery}
            onCategoryChange={setActiveCategory}
          />

          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <MaterialCommunityIcons name="ticket-percent-outline" size={18} color={theme.orange} />
              <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.2}>{t('productsZoneTitle')}</Text>
            </View>
            <Text style={styles.sectionCount} maxFontSizeMultiplier={1.2}>{t('itemCount', { count: filteredGifts.length.toLocaleString() })}</Text>
          </View>

          {catalog.errorMode === 'inline' ? (
            <View style={styles.retryBanner} accessibilityRole="alert">
              <MaterialCommunityIcons name="cloud-alert-outline" size={20} color={theme.red} />
              <Text style={styles.retryBannerText}>{t('loadFailedFallback')}</Text>
              <PressableScale
                style={[styles.retryBannerAction, catalog.isFetching && styles.actionDisabled]}
                onPress={() => { void onRetry() }}
                accessibilityRole="button"
                disabled={catalog.isFetching}
              >
                <Text style={styles.retryBannerActionText}>{t(catalog.isFetching ? 'retrying' : 'retry')}</Text>
              </PressableScale>
            </View>
          ) : null}

          {catalog.isPending && filteredGifts.length === 0 ? (
            <View style={styles.loadingList} accessibilityLabel={t('loadingShelf')}>
              <Skeleton width={rewardCardWidth} height={208} borderRadius={Radius.xl} color={theme.surfaceStrong} />
              <Skeleton width={rewardCardWidth} height={208} borderRadius={Radius.xl} color={theme.surfaceStrong} />
            </View>
          ) : catalog.errorMode === 'blocking' ? (
            <EmptyState
              icon="alert-circle-outline"
              title={t('loadFailedTitle')}
              body={t('loadFailedFallback')}
              actionLabel={t(catalog.isFetching ? 'retrying' : 'retry')}
              onAction={() => { void onRetry() }}
              actionDisabled={catalog.isFetching}
            />
          ) : filteredGifts.length === 0 ? (
            <EmptyState
              icon="gift-off-outline"
              title={query.trim() ? t('noSearchResultsTitle') : activeCategory === 'all' ? t('noItemsTitle') : t('noCategoryItemsTitle')}
              body={query.trim() ? t('noSearchResultsBody') : t('noItemsBody')}
              actionLabel={query.trim() ? t('clearSearch') : undefined}
              onAction={query.trim() ? () => setQuery('') : undefined}
            />
          ) : (
            <View style={styles.list}>
              {filteredGifts.map((gift) => (
                <RedeemRewardCard
                  key={gift.id}
                  gift={gift}
                  width={rewardCardWidth}
                  availablePoints={wallet.availablePoints}
                  availableCredits={wallet.availableCredits}
                  canRedeemCreditRewards={wallet.canRedeemCreditRewards}
                  balanceKnown={wallet.status === 'ready'}
                  demo={catalog.isDemo}
                  alreadyOwned={gift.owned}
                  onOpenDetail={() => onOpenGiftDetail(gift)}
                />
              ))}
            </View>
          )}
        </>
      ) : (
        <RedeemCosmeticsZone
          gifts={catalogZones.cosmetics}
          cardWidth={rewardCardWidth}
          availablePoints={wallet.availablePoints}
          availableCredits={wallet.availableCredits}
          canRedeemCreditRewards={wallet.canRedeemCreditRewards}
          balanceKnown={wallet.status === 'ready'}
          demo={catalog.isDemo}
          onOpenDetail={onOpenGiftDetail}
          onOpenStudio={onOpenStudio}
        />
      )}
    </Screen>
  )
}

function EmptyState({
  icon,
  title,
  body,
  actionLabel,
  onAction,
  actionDisabled = false,
}: {
  icon: ComponentProps<typeof MaterialCommunityIcons>['name']
  title: string
  body: string
  actionLabel?: string
  onAction?: () => void
  actionDisabled?: boolean
}) {
  const theme = useSportTheme()
  const styles = createStyles(theme)

  return (
    <View style={styles.emptyCard}>
      <MaterialCommunityIcons name={icon} size={34} color={theme.mutedSoft} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {actionLabel && onAction ? (
        <PressableScale
          style={[styles.emptyAction, actionDisabled && styles.actionDisabled]}
          onPress={onAction}
          accessibilityRole="button"
          disabled={actionDisabled}
        >
          <Text style={styles.emptyActionText} maxFontSizeMultiplier={1.5}>{actionLabel}</Text>
        </PressableScale>
      ) : null}
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    container: { paddingHorizontal: Spacing.xl, gap: Spacing.md },
    demoNotice: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderRadius: Radius.lg, backgroundColor: theme.orangeSoft, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
    demoNoticeText: { flex: 1, color: theme.inkSoft, fontSize: 11, lineHeight: 16, fontWeight: '800' },
    retryBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderRadius: Radius.lg, borderWidth: 1, borderColor: theme.redSoft, backgroundColor: theme.surface, padding: Spacing.sm },
    retryBannerText: { flex: 1, color: theme.inkSoft, fontSize: 11, lineHeight: 16, fontWeight: '700' },
    retryBannerAction: { minHeight: 44, justifyContent: 'center', borderRadius: Radius.md, backgroundColor: theme.orange, paddingHorizontal: Spacing.md },
    retryBannerActionText: { color: theme.chalk, fontSize: 11, fontWeight: '900' },
    actionDisabled: { opacity: 0.55 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md, marginTop: Spacing.xs },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    sectionTitle: { color: theme.ink, fontSize: 18, lineHeight: 23, fontWeight: '900', letterSpacing: 0 },
    sectionCount: { color: theme.inkSoft, fontSize: 12, lineHeight: 15, fontWeight: '800', letterSpacing: 0 },
    loadingList: { flexDirection: 'row', gap: Spacing.md },
    emptyCard: { alignItems: 'center', gap: Spacing.sm, borderRadius: Radius.xl, borderWidth: 1, borderColor: theme.line, borderStyle: 'dashed', backgroundColor: theme.surface, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xxl },
    emptyTitle: { color: theme.ink, fontSize: 16, lineHeight: 20, fontWeight: '900', letterSpacing: 0 },
    emptyBody: { color: theme.muted, fontSize: 13, lineHeight: 18, fontWeight: '700', letterSpacing: 0, textAlign: 'center' },
    emptyAction: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.lg, backgroundColor: theme.orange, paddingHorizontal: Spacing.lg, marginTop: Spacing.sm },
    emptyActionText: { color: theme.chalk, fontSize: 13, lineHeight: 18, fontWeight: '900' },
    list: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  })
}
