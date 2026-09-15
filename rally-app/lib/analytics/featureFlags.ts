import { analytics } from './analytics-service'

export const AnalyticsFeatureFlag = {
  defaultStakeAmount: 'default_stake_amount',
} as const

export type DefaultStakeAmount = 50 | 100

export function getDefaultStakeAmountFlag(): DefaultStakeAmount {
  return parseDefaultStakeAmount(analytics.getFeatureFlag(AnalyticsFeatureFlag.defaultStakeAmount))
}

export function parseDefaultStakeAmount(value: unknown): DefaultStakeAmount {
  return value === 100 || value === '100' ? 100 : 50
}
