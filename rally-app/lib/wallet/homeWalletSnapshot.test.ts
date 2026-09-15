import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as walletRepository from './walletRepository'
import { getHomeWalletSnapshot } from './homeWalletSnapshot'
import type { UserWallet } from './walletTypes'

vi.mock('./walletRepository', () => ({
  getUserWalletRecord: vi.fn(),
}))

const wallet: UserWallet = {
  user_id: 'actor-1',
  leaderboard_score: 100,
  spendable_points: 80,
  locked_points: 0,
  available_spendable: 80,
  credit_balance: 10,
  locked_credits: 0,
  available_credits: 10,
}

const getUserWalletRecord = walletRepository.getUserWalletRecord as ReturnType<typeof vi.fn>

describe('getHomeWalletSnapshot', () => {
  beforeEach(() => {
    getUserWalletRecord.mockReset()
  })

  it('returns only a valid positive server spendable balance after one authenticated read', async () => {
    getUserWalletRecord.mockResolvedValue(wallet)

    await expect(getHomeWalletSnapshot('actor-1')).resolves.toEqual({ available_spendable: 80 })
    expect(getUserWalletRecord).toHaveBeenCalledTimes(1)
    expect(getUserWalletRecord).toHaveBeenCalledWith('actor-1')
  })

  it('keeps a zero server balance as a valid Home snapshot', async () => {
    getUserWalletRecord.mockResolvedValue({ ...wallet, available_spendable: 0 })

    await expect(getHomeWalletSnapshot('actor-1')).resolves.toEqual({ available_spendable: 0 })
  })

  it('returns null only when the authenticated wallet row is absent', async () => {
    getUserWalletRecord.mockResolvedValue(null)

    await expect(getHomeWalletSnapshot('actor-1')).resolves.toBeNull()
  })

  it.each([
    ['negative', -1],
    ['fractional', 1.5],
    ['NaN', Number.NaN],
    ['infinite', Number.POSITIVE_INFINITY],
    ['wrong type', '80'],
  ])('rejects a %s available spendable value instead of displaying a replacement', async (_label, value) => {
    getUserWalletRecord.mockResolvedValue({ ...wallet, available_spendable: value })

    await expect(getHomeWalletSnapshot('actor-1')).rejects.toThrow('Home wallet snapshot is invalid')
  })

  it('rejects a wallet row for another actor instead of exposing its balance', async () => {
    getUserWalletRecord.mockResolvedValue({ ...wallet, user_id: 'actor-2' })

    await expect(getHomeWalletSnapshot('actor-1')).rejects.toThrow('Home wallet snapshot is invalid')
  })
})
