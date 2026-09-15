/**
 * Pure decision for showing the battery "No restrictions" prompt.
 * Kept expo-free so the table is unit-testable; batteryOptEducation.ts
 * gathers the inputs from the device.
 */
export type BatteryOptPromptInput = {
  isAndroid: boolean
  /** true = optimization applies, false = already unrestricted, null = unreadable. */
  optimizationEnabled: boolean | null
  /** OEM known to aggressively kill background GPS (MIUI, Oppo, …). */
  affectedManufacturer: boolean
  /** User already dismissed the prompt once. */
  dismissed: boolean
}

export function resolveBatteryOptPromptDecision(input: BatteryOptPromptInput): boolean {
  if (!input.isAndroid) return false
  // Verified unrestricted — nothing to educate, never nag.
  if (input.optimizationEnabled === false) return false
  // State unreadable (older binary): only the known-aggressive OEMs warrant a prompt.
  if (input.optimizationEnabled === null && !input.affectedManufacturer) return false
  return !input.dismissed
}
