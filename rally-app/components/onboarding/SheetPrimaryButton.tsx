import { ActivityIndicator, StyleSheet } from 'react-native'

import { PressableScale } from '@/components/motion/PressableScale'
import { SheetPalette } from '@/components/onboarding/onboardingSheetPalette'
import { RallyText } from '@/components/ui/RallyText'
import { Radius } from '@/constants/theme'

type SheetPrimaryButtonProps = {
  label: string
  onPress: () => void
  disabled?: boolean
  loading?: boolean
}

/**
 * Full-width near-black pill CTA used by every onboarding sheet step — the
 * primary action against the sheet's white surface (founder feedback round
 * 3: inverted from the earlier white-on-dark). Not `ArcadeButton`: the
 * wizard sheet has its own fixed-light voice (`SheetPalette`).
 */
export function SheetPrimaryButton({ label, onPress, disabled, loading }: SheetPrimaryButtonProps) {
  const isDisabled = disabled || loading

  return (
    <PressableScale
      style={[styles.button, isDisabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={isDisabled}
      scaleTo={0.97}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator size="small" color={SheetPalette.ctaText} />
      ) : (
        <RallyText variant="body" style={styles.label}>{label}</RallyText>
      )}
    </PressableScale>
  )
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: Radius.pill,
    backgroundColor: SheetPalette.ctaBg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    shadowColor: SheetPalette.ctaBg,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 3,
  },
  buttonDisabled: { opacity: 0.5 },
  label: { color: SheetPalette.ctaText, fontSize: 16 },
})
