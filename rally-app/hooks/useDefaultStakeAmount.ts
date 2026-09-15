import { useEffect, useState } from 'react'
import { analytics } from '@/lib/analytics/analytics-service'
import {
  getDefaultStakeAmountFlag,
  type DefaultStakeAmount,
} from '@/lib/analytics/featureFlags'

export function useDefaultStakeAmount(): DefaultStakeAmount {
  const [amount, setAmount] = useState<DefaultStakeAmount>(() => getDefaultStakeAmountFlag())

  useEffect(() => {
    return analytics.onFeatureFlags(() => {
      setAmount(getDefaultStakeAmountFlag())
    })
  }, [])

  return amount
}
