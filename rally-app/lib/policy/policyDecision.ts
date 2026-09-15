export type AllowedPolicyDecision = {
  allowed: true
  cta?: string
  message?: string
}

export type DeniedPolicyDecision<Reason extends string = string> = {
  allowed: false
  reason: Reason
  cta?: string
  message?: string
}

export type PolicyDecision<Reason extends string = string> =
  | AllowedPolicyDecision
  | DeniedPolicyDecision<Reason>

type PolicyDisplay = Pick<AllowedPolicyDecision, 'cta' | 'message'>

export function allowPolicy(display: PolicyDisplay = {}): AllowedPolicyDecision {
  return {
    allowed: true,
    ...display,
  }
}

export function denyPolicy<Reason extends string>(
  reason: Reason,
  display: PolicyDisplay = {},
): DeniedPolicyDecision<Reason> {
  return {
    allowed: false,
    reason,
    ...display,
  }
}

export function policyFromBoolean<Reason extends string>(
  allowed: boolean,
  reason: Reason,
  display: PolicyDisplay = {},
): PolicyDecision<Reason> {
  return allowed ? allowPolicy(display) : denyPolicy(reason, display)
}

export function requireAllowedPolicy(
  decision: PolicyDecision,
): AllowedPolicyDecision | null {
  return decision.allowed ? decision : null
}
