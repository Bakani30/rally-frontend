import { describe, expect, it } from 'vitest'
import { mapPointTransaction, TXN_TYPE_LABEL } from './walletLedgerFormat'

describe('mapPointTransaction', () => {
  it('returns null for null/garbage rows', () => {
    expect(mapPointTransaction(null)).toBeNull()
    expect(mapPointTransaction({})).toBeNull()
    expect(mapPointTransaction({ id: 1 })).toBeNull()
  })

  it('maps a positive spendable_delta to an earn entry with a known label', () => {
    const out = mapPointTransaction({
      id: 'txn-1',
      type: 'activity_reward',
      amount: 15,
      spendable_delta: 15,
      balance_after: 115,
      created_at: '2026-07-03T00:00:00Z',
      metadata: null,
    })
    expect(out).toEqual({
      id: 'txn-1',
      kind: 'earn',
      label: TXN_TYPE_LABEL.activity_reward,
      amount: 15,
      createdAt: '2026-07-03T00:00:00Z',
    })
  })

  it('maps a negative spendable_delta to a spend entry with a known label', () => {
    const out = mapPointTransaction({
      id: 'txn-2',
      type: 'shop_purchase',
      amount: -50,
      spendable_delta: -50,
      balance_after: 65,
      created_at: '2026-07-03T01:00:00Z',
      metadata: null,
    })
    expect(out).toEqual({
      id: 'txn-2',
      kind: 'spend',
      label: TXN_TYPE_LABEL.shop_purchase,
      amount: -50,
      createdAt: '2026-07-03T01:00:00Z',
    })
  })

  it('humanizes an unrecognized transaction type as a fallback label', () => {
    const out = mapPointTransaction({
      id: 'txn-3',
      type: 'future_mystery_bonus',
      amount: 5,
      spendable_delta: 5,
      balance_after: 10,
      created_at: '2026-07-03T02:00:00Z',
      metadata: null,
    })
    expect(out?.label).toBe('Future Mystery Bonus')
    expect(out?.kind).toBe('earn')
  })
})
