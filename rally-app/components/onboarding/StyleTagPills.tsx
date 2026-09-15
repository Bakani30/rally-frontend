import { StyleSheet, View } from 'react-native'

import { AnimatedSelectable } from '@/components/onboarding/AnimatedSelectable'
import { SheetPalette } from '@/components/onboarding/onboardingSheetPalette'
import { RallyText } from '@/components/ui/RallyText'
import { Radius, Spacing } from '@/constants/theme'
import type { PlayStyleOption } from '@/lib/onboarding/onboardingRules'

type StyleTagPillsProps = {
  options: PlayStyleOption[]
  values: string[]
  maxSelected: number
  /** Resolves an option's translated display label — this component is
   * shared by play-styles and positions (basketball/badminton), and each
   * uses a different i18n key prefix, so the caller supplies it. */
  labelFor: (value: string) => string
  onToggle: (value: string) => void
}

/** Multi-select "สาย" tag pills; selection beyond maxSelected is ignored. */
export function StyleTagPills({ options, values, maxSelected, labelFor, onToggle }: StyleTagPillsProps) {
  return (
    <View style={styles.wrap}>
      {options.map((option) => {
        const selected = values.includes(option.value)
        const disabled = !selected && values.length >= maxSelected
        const label = labelFor(option.value)
        return (
          <AnimatedSelectable
            key={option.value}
            selected={selected}
            style={[
              styles.pill,
              selected && styles.pillSelected,
              disabled && styles.pillDisabled,
            ]}
            onPress={() => {
              if (!disabled) onToggle(option.value)
            }}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={label}
          >
            <RallyText variant="body" style={[styles.pillText, selected && styles.pillTextSelected]}>
              {label}
            </RallyText>
          </AnimatedSelectable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  pill: {
    minHeight: 44,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: SheetPalette.line,
    backgroundColor: SheetPalette.surface,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillSelected: {
    backgroundColor: SheetPalette.orange,
    borderColor: SheetPalette.orange,
  },
  pillDisabled: { opacity: 0.45 },
  pillText: { color: SheetPalette.ink, fontSize: 12.5 },
  pillTextSelected: { color: SheetPalette.onOrange },
})
