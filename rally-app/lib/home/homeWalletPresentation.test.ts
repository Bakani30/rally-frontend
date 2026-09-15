import { describe, expect, it } from 'vitest'

type HomeWalletQueryState = {
  data: { available_spendable: number } | null | undefined
  isError: boolean
  isPending: boolean
}

async function presentWallet(state: HomeWalletQueryState) {
  const { toHomeWalletPresentation } = await import('./homeWalletPresentation')
  return toHomeWalletPresentation(state)
}

describe('toHomeWalletPresentation', () => {
  it('presents a positive server balance as ready', async () => {
    await expect(presentWallet({
      data: { available_spendable: 1_250 },
      isError: false,
      isPending: false,
    })).resolves.toEqual({
      walletPoints: 1_250,
      walletStatus: 'ready',
      pointsDelta: null,
    })
  })

  it('keeps a zero server balance ready', async () => {
    await expect(presentWallet({
      data: { available_spendable: 0 },
      isError: false,
      isPending: false,
    })).resolves.toEqual({
      walletPoints: 0,
      walletStatus: 'ready',
      pointsDelta: null,
    })
  })

  it('presents a pending query without data as loading', async () => {
    await expect(presentWallet({
      data: undefined,
      isError: false,
      isPending: true,
    })).resolves.toEqual({
      walletPoints: 0,
      walletStatus: 'loading',
      pointsDelta: null,
    })
  })

  it('presents an absent snapshot as unavailable', async () => {
    await expect(presentWallet({
      data: null,
      isError: false,
      isPending: false,
    })).resolves.toEqual({
      walletPoints: 0,
      walletStatus: 'unavailable',
      pointsDelta: null,
    })
  })

  it('does not render stale wallet data after a query error', async () => {
    await expect(presentWallet({
      data: { available_spendable: 900 },
      isError: true,
      isPending: false,
    })).resolves.toEqual({
      walletPoints: 0,
      walletStatus: 'unavailable',
      pointsDelta: null,
    })
  })
})
