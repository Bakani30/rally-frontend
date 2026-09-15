import type { Translator } from '@/hooks/useI18n'
import { refereeDictionary } from '@/lib/i18n/dictionaries/referee'
import { hasDirectRefereeAppointment } from '@/lib/match/refereeCopy'
import type { AlphaRefereeEligibility } from '@/lib/match/alphaRefereeService'
import type { RefereeActivityKey, RefereeTierMeta } from '@/lib/match/refereeLevels'

export type RefereePassTranslator = Translator<keyof typeof refereeDictionary>
export type RefereePassCondition = {
  icon: 'account-check-outline' | 'progress-clock' | 'whistle-outline' | 'shield-half-full'
  text: string
  done: boolean
}

export function refereePassActivityLabel(
  key: RefereeActivityKey,
  t: RefereePassTranslator,
): string {
  if (key === 'running') return t('sportRunning')
  if (key === 'badminton') return t('sportBadminton')
  return t('sportBasketball')
}

export function refereePassTierLabel(
  tier: RefereeTierMeta,
  t: RefereePassTranslator,
): string {
  if (tier.key === 'court_side') return t('tierCourtSide')
  if (tier.key === 'community') return t('tierCommunity')
  if (tier.key === 'official_ready') return t('tierOfficialReady')
  if (tier.key === 'event_lead') return t('tierEventLead')
  return t('tierCandidate')
}

export function refereePassStatusBody(
  key: RefereeActivityKey,
  eligibility: AlphaRefereeEligibility | null,
  t: RefereePassTranslator,
): string {
  const sport = refereePassActivityLabel(key, t)
  if (hasDirectRefereeAppointment(eligibility) || eligibility?.eligible) {
    return t('readyForWork', { sport })
  }
  if (eligibility?.appliedAt) {
    return t('appliedProgress', {
      settled: eligibility.settledMatchCount,
      required: eligibility.requiredSettledMatches,
    })
  }
  return key === 'running' ? t('manualResultBody') : t('notApplied')
}

export function refereePassAccessConditions(
  key: RefereeActivityKey,
  eligibility: AlphaRefereeEligibility | null,
  sportLabel: string,
  t: RefereePassTranslator,
): RefereePassCondition[] {
  const granted = hasDirectRefereeAppointment(eligibility) || !!eligibility?.eligible
  const conditions: RefereePassCondition[] = []

  if (!granted && !eligibility?.appliedAt) {
    conditions.push({
      icon: 'account-check-outline',
      text: t('applyCondition', { sport: sportLabel }),
      done: false,
    })
  }

  const remaining = Math.max(
    0,
    (eligibility?.requiredSettledMatches ?? 1) - (eligibility?.settledMatchCount ?? 0),
  )
  if (!granted && remaining > 0) {
    conditions.push({
      icon: 'progress-clock',
      text: t('matchConditionProgress', {
        settled: eligibility?.settledMatchCount ?? 0,
        required: eligibility?.requiredSettledMatches ?? 1,
        remaining,
      }),
      done: false,
    })
  }

  conditions.push({
    icon: 'whistle-outline',
    text: t(
      key === 'basketball'
        ? 'capabilityBasketball'
        : key === 'badminton'
          ? 'capabilityBadminton'
          : 'capabilityRunning',
    ),
    done: granted,
  })
  conditions.push({ icon: 'shield-half-full', text: t('integrityRule'), done: false })
  return conditions
}

export function refereePassApplicationConditions(
  key: RefereeActivityKey,
  eligibility: AlphaRefereeEligibility | null,
  sportLabel: string,
  t: RefereePassTranslator,
): RefereePassCondition[] {
  return refereePassAccessConditions(key, eligibility, sportLabel, t)
    .filter((condition) => condition.icon === 'account-check-outline' || condition.icon === 'progress-clock')
}

export function refereePassAvailableAccess(
  key: RefereeActivityKey,
  eligibility: AlphaRefereeEligibility | null,
  sportLabel: string,
  t: RefereePassTranslator,
): RefereePassCondition[] {
  return refereePassAccessConditions(key, eligibility, sportLabel, t)
    .filter((condition) => condition.icon === 'whistle-outline' || condition.icon === 'shield-half-full')
}
