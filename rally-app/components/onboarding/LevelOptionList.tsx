import { StyleSheet, View } from 'react-native'

import { AnimatedSelectable } from '@/components/onboarding/AnimatedSelectable'
import { SheetPalette } from '@/components/onboarding/onboardingSheetPalette'
import { RallyText } from '@/components/ui/RallyText'
import { Radius, Spacing } from '@/constants/theme'
import { useI18n } from '@/hooks/useI18n'
import { onboardingDictionary } from '@/lib/i18n/dictionaries/onboarding'
import type { OnboardingExperienceLevel } from '@/lib/onboarding/onboardingTypes'

type LevelOption = { value: OnboardingExperienceLevel }

type LevelOptionListProps = {
  options: LevelOption[]
  value: OnboardingExperienceLevel | null | undefined
  onSelect: (value: OnboardingExperienceLevel) => void
}

/** Full-width single-select rows for the experience-level step. */
export function LevelOptionList({ options, value, onSelect }: LevelOptionListProps) {
  const { t } = useI18n(onboardingDictionary)

  return (
    <View style={styles.list}>
      {options.map((option) => {
        const selected = value === option.value
        const label = t(`level_${option.value}` as keyof typeof onboardingDictionary)
        const helper = t(`level_helper_${option.value}` as keyof typeof onboardingDictionary)
        return (
          <AnimatedSelectable
            key={option.value}
            selected={selected}
            style={[styles.row, selected && styles.rowSelected]}
            onPress={() => onSelect(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={label}
          >
            <RallyText variant="head" style={[styles.label, selected && styles.labelSelected]}>
              {label}
            </RallyText>
            <RallyText variant="body" style={styles.helper}>{helper}</RallyText>
          </AnimatedSelectable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  list: { gap: Spacing.sm },
  row: {
    minHeight: 52,
    justifyContent: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: SheetPalette.line,
    backgroundColor: SheetPalette.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    gap: 1,
  },
  rowSelected: {
    borderColor: SheetPalette.orange,
    backgroundColor: SheetPalette.orangeSoft,
  },
  label: { color: SheetPalette.ink, fontSize: 14 },
  labelSelected: { color: SheetPalette.orange },
  helper: { color: SheetPalette.muted, fontSize: 11 },
})
