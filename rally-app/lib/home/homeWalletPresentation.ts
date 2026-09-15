import type { HomeWalletSnapshot } from '@/lib/wallet/homeWalletSnapshot'

type HomeWalletQueryState = {
  data: HomeWalletSnapshot | null | undefined
  isError: boolean
  isPending: boolean
}

export type HomeWalletPresentation = {
  walletPoints: number
  walletStatus: 'loading' | 'ready' | 'unavailable'
  pointsDelta: null
}

export function toHomeWalletPresentation(state: HomeWalletQueryState): HomeWalletPresentation {
  if (state.isError) {
    return { walletPoints: 0, walletStatus: 'unavailable', pointsDelta: null }
  }

  if (state.data) {
    return {
      walletPoints: state.data.available_spendable,
      walletStatus: 'ready',
      pointsDelta: null,
    }
  }

  if (state.isPending) {
    return { walletPoints: 0, walletStatus: 'loading', pointsDelta: null }
  }

  return { walletPoints: 0, walletStatus: 'unavailable', pointsDelta: null }
}
