import { useEffect, useMemo } from 'react'
import { router, Stack } from 'expo-router'

import { RedeemShopView } from '@/components/gifts/RedeemShopView'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useAuth } from '@/hooks/useAuth'
import { useGiftItems, useGiftRedemptions } from '@/hooks/useGifts'
import { useI18n } from '@/hooks/useI18n'
import { useWalletSummary } from '@/hooks/useWalletSummary'
import type { GiftItem } from '@/lib/gifts/giftTypes'
import { chooseRedeemCatalog, resolveRedeemCatalogErrorMode } from '@/lib/gifts/redeemDemoCatalog'
import { giftsDictionary } from '@/lib/i18n/dictionaries/gifts'
import { guardedRouter } from '@/lib/navigation/guardedRouter'

declare const __DEV__: boolean

export default function GiftShopScreen() {
  const { user } = useAuth()
  const { data: gifts, isPending, isError, isFetching, refetch } = useGiftItems(user?.id)
  const { data: redemptions } = useGiftRedemptions(user?.id)
  const { data: walletSummary, isPending: walletPending } = useWalletSummary(user?.id)
  const { track } = useAnalytics()
  const { t } = useI18n(giftsDictionary)

  const catalog = useMemo(() => chooseRedeemCatalog({
    realItems: gifts,
    isPending,
    hasError: isError,
    isDevelopment: __DEV__,
  }), [gifts, isError, isPending])
  useEffect(() => {
    track({ name: 'view_shop' })
  }, [track])

  const catalogErrorMode = resolveRedeemCatalogErrorMode({
    hasError: isError,
    cachedItemCount: catalog.items.length,
  })

  const canRedeemCreditRewards = walletSummary?.canRedeemCreditRewards ?? false
  const wallet = walletSummary?.wallet
  const walletBalanceValid = Boolean(
    wallet &&
    Number.isFinite(wallet.available_spendable) &&
    Number.isFinite(wallet.available_credits),
  )
  const walletStatus = walletBalanceValid ? 'ready' : walletPending ? 'loading' : 'unavailable'
  const availablePoints = walletBalanceValid ? wallet!.available_spendable : 0
  const availableCredits = walletBalanceValid ? wallet!.available_credits : 0
  const pendingRedemptions = redemptions?.filter((r) => r.status === 'pending').length ?? 0

  function openGiftDetail(gift: GiftItem) {
    track({ name: 'view_gift', properties: { gift_id: gift.id } })
    guardedRouter.push({
      pathname: '/gifts/[id]',
      params: { id: gift.id },
    }, { actionKey: `redeem:gift:${gift.id}` })
  }

  return (
    <>
      <Stack.Screen options={{ title: t('screenTitle'), headerShown: false }} />
      <RedeemShopView
        catalog={{ items: catalog.items, isDemo: catalog.isDemo, errorMode: catalogErrorMode, isPending, isFetching }}
        wallet={{ status: walletStatus, availablePoints, availableCredits, canRedeemCreditRewards, pendingRedemptions }}
        onBack={() => { if (router.canGoBack()) router.back(); else router.replace('/(tabs)') }}
        onOpenWallet={() => guardedRouter.push('/wallet', { actionKey: 'redeem:vault-wallet' })}
        onOpenHistory={() => guardedRouter.push('/gifts/redemptions', { actionKey: 'redeem:history' })}
        onOpenProfileStudio={() => guardedRouter.push('/cosmetics', { actionKey: 'redeem:profile-studio' })}
        onOpenStudio={() => guardedRouter.push('/cosmetics', { actionKey: 'redeem:cosmetics-zone' })}
        onRetry={() => refetch()}
        onOpenGiftDetail={openGiftDetail}
      />
    </>
  )
}
