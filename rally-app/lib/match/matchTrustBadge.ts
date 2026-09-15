import type { MatchWithRelations, MyMatch, RefereeSportProfile, RefereeTrustTier } from '../../types/match'

export type MatchTrustBadgeState = {
  kind: 'referee_verified' | 'referee_score' | 'referee_assigned' | 'player_score_draft' | 'honor'
  title: string
  subtitle: string
  metric: string
  tone: 'green' | 'amber' | 'blue' | 'neutral'
  icon: 'shield-check' | 'whistle-outline' | 'clipboard-check-outline' | 'account-edit-outline' | 'shield-outline'
}

export type MatchListTrustBadgeState = {
  source: NonNullable<MyMatch['trust_source']>
  label: string
  detail: string
  weight: number
  tone: 'green' | 'amber' | 'blue' | 'neutral'
  icon: 'shield-check' | 'clipboard-check-outline' | 'whistle-outline' | 'account-edit-outline' | 'shield-outline'
}

export function deriveMatchTrustBadge(
  match: MatchWithRelations,
  refereeProfile?: RefereeSportProfile | null,
): MatchTrustBadgeState {
  const record = asArray(match.referee_match_records)[0] ?? null
  if (record) {
    return {
      kind: 'referee_verified',
      title: 'Referee-Verified',
      subtitle: `${formatLevel(record.referee_level_after)} · ${formatTrustTier(record.trust_tier_after)} · ${formatFinalStatus(record.final_status)}`,
      metric: `${Math.max(0, record.quality_delta)}`,
      tone: 'green',
      icon: 'shield-check',
    }
  }

  const hasCurrentRefereeScore = asArray(match.alpha_referee_result_submissions).some((result) =>
    result.status === 'pending_player_action' && result.result_kind === 'team_score'
  )
  if (hasCurrentRefereeScore) {
    return {
      kind: 'referee_score',
      title: 'Referee score',
      subtitle: refereeProfile
        ? `${formatLevel(refereeProfile.level)} · ${formatTrustTier(refereeProfile.trust_tier)} · waiting review`
        : 'Waiting for team review',
      metric: refereeProfile ? refereeProfile.rating.toFixed(1) : 'live',
      tone: 'amber',
      icon: 'clipboard-check-outline',
    }
  }

  const assignment = asArray(match.match_referee_assignments).find((item) => item.status === 'assigned') ?? null
  if (assignment) {
    return {
      kind: 'referee_assigned',
      title: 'Referee assigned',
      subtitle: refereeProfile
        ? `${formatLevel(refereeProfile.level)} · ${formatTrustTier(refereeProfile.trust_tier)} · score source locked`
        : 'Score source locked to referee',
      metric: refereeProfile ? String(refereeProfile.completed_matches) : 'ref',
      tone: 'blue',
      icon: 'whistle-outline',
    }
  }

  const playerDrafts = asArray(match.player_score_drafts)
  const submittedSides = playerDrafts.filter((draft) => draft.status === 'submitted').length
  if (submittedSides > 0) {
    return {
      kind: 'player_score_draft',
      title: 'Player score draft',
      subtitle: `${submittedSides}/2 sides submitted`,
      metric: `${submittedSides}/2`,
      tone: 'amber',
      icon: 'account-edit-outline',
    }
  }

  return {
    kind: 'honor',
    title: 'Honor match',
    subtitle: 'No referee score source',
    metric: 'open',
    tone: 'neutral',
    icon: 'shield-outline',
  }
}

export function deriveMatchListTrustBadge(match: MyMatch): MatchListTrustBadgeState {
  const source = match.trust_source ?? 'honor'
  const weight = Math.max(0, Math.min(100, Math.round(match.trust_weight ?? defaultTrustWeight(match))))

  if (source === 'referee_verified') {
    const finalStatus = match.referee_final_status ? formatFinalStatus(match.referee_final_status) : 'clean'
    const level = typeof match.referee_level === 'number' ? `L${Math.max(0, Math.min(4, match.referee_level))}` : 'Ref'
    const tier = match.referee_trust_tier ? formatTrustTier(match.referee_trust_tier) : 'Verified'
    return {
      source,
      label: match.trust_label ?? 'Referee-Verified',
      detail: `${level} · ${tier} · ${finalStatus}`,
      weight,
      tone: finalStatus === 'disputed' ? 'amber' : 'green',
      icon: 'shield-check',
    }
  }

  if (source === 'referee_score') {
    return {
      source,
      label: match.trust_label ?? 'Referee score',
      detail: 'Neutral score waiting review',
      weight,
      tone: 'amber',
      icon: 'clipboard-check-outline',
    }
  }

  if (source === 'referee_assigned') {
    return {
      source,
      label: match.trust_label ?? 'Referee assigned',
      detail: 'Score source locked',
      weight,
      tone: 'blue',
      icon: 'whistle-outline',
    }
  }

  if (source === 'player_score_draft') {
    return {
      source,
      label: match.trust_label ?? 'Player score draft',
      detail: 'Confirmed by players',
      weight,
      tone: 'amber',
      icon: 'account-edit-outline',
    }
  }

  return {
    source: 'honor',
    label: match.trust_label ?? 'Honor match',
    detail: match.status === 'settled' ? 'Player-confirmed result' : 'No neutral scorer',
    weight,
    tone: 'neutral',
    icon: 'shield-outline',
  }
}

export function formatTrustTier(tier: RefereeTrustTier): string {
  switch (tier) {
    case 'event_lead': return 'Event lead'
    case 'official_ready': return 'Official-ready'
    case 'community': return 'Community'
    case 'court_side': return 'Court-side'
    case 'candidate': return 'Candidate'
  }
}

function formatLevel(level: number): string {
  return `Level ${Math.max(0, Math.min(4, level))}`
}

function formatFinalStatus(status: 'accepted' | 'corrected' | 'disputed'): string {
  if (status === 'accepted') return 'clean'
  if (status === 'corrected') return 'corrected'
  return 'disputed'
}

function defaultTrustWeight(match: MyMatch): number {
  if (match.trust_source === 'referee_verified') return 100
  if (match.trust_source === 'referee_score') return 72
  if (match.trust_source === 'referee_assigned') return 56
  if (match.trust_source === 'player_score_draft') return 44
  return match.status === 'settled' ? 30 : 20
}

function asArray<T>(value: T[] | T | null | undefined): T[] {
  if (Array.isArray(value)) return value
  return value ? [value] : []
}
