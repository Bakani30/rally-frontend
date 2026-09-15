import { StyleSheet, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { AnimatedSelectable } from '@/components/onboarding/AnimatedSelectable'
import { SheetPalette } from '@/components/onboarding/onboardingSheetPalette'
import { RallyText } from '@/components/ui/RallyText'
import { Radius, Spacing } from '@/constants/theme'
import { useI18n } from '@/hooks/useI18n'
import { onboardingDictionary } from '@/lib/i18n/dictionaries/onboarding'
import type { OnboardingSportInfo } from '@/lib/onboarding/onboardingRules'

type SportChipProps = {
  sport: OnboardingSportInfo
  selected: boolean
  onToggle: () => void
}

/**
 * Sport pill for the sports-interest step. `sport.available` sports (Rally
 * already runs matches for them) render bigger with an orange ring border
 * and a "แข่งได้เลย" badge when unselected; interest-only sports render as
 * plain pills. Selected state is the same orange fill for both groups.
 */
export function SportChip({ sport, selected, onToggle }: SportChipProps) {
  const { t } = useI18n(onboardingDictionary)
  const showBadge = sport.available && !selected
  const label = t(`sport_${sport.activity}` as keyof typeof onboardingDictionary)

  return (
    <AnimatedSelectable
      selected={selected}
      style={[
        styles.pill,
        sport.available && styles.pillAvailable,
        selected && styles.pillSelected,
      ]}
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      hitSlop={{ top: 3, bottom: 3, left: 2, right: 2 }}
    >
      <MaterialCommunityIcons
        name={sport.icon as keyof typeof MaterialCommunityIcons.glyphMap}
        size={sport.available ? 18 : 16}
        color={selected ? SheetPalette.onOrange : SheetPalette.ink}
      />
      <RallyText
        variant="body"
        style={[
          styles.pillLabel,
          sport.available && styles.pillLabelAvailable,
          selected && styles.pillLabelSelected,
        ]}
      >
        {label}
      </RallyText>
      {showBadge && (
        <View style={styles.badge}>
          <RallyText variant="body" style={styles.badgeText}>{t('sports_badge_available')}</RallyText>
        </View>
      )}
    </AnimatedSelectable>
  )
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 48,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: SheetPalette.line,
    backgroundColor: SheetPalette.surface,
    paddingHorizontal: Spacing.md,
  },
  pillAvailable: {
    minHeight: 50,
    borderWidth: 1.5,
    borderColor: SheetPalette.orange,
    paddingHorizontal: Spacing.lg,
  },
  pillSelected: {
    backgroundColor: SheetPalette.orange,
    borderColor: SheetPalette.orange,
  },
  pillLabel: { color: SheetPalette.ink, fontSize: 12 },
  pillLabelAvailable: { fontSize: 13 },
  pillLabelSelected: { color: SheetPalette.onOrange },
  badge: {
    backgroundColor: SheetPalette.orangeSoft,
    borderRadius: Radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { color: SheetPalette.orange, fontSize: 9 },
})
