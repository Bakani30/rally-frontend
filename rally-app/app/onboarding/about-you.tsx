import { Alert, Keyboard, StyleSheet, View } from 'react-native'
import { useRef } from 'react'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useLocalSearchParams } from 'expo-router'

import { AnimatedSelectable } from '@/components/onboarding/AnimatedSelectable'
import { DateOfBirthField } from '@/components/onboarding/DateOfBirthField'
import { OnboardingScaffold } from '@/components/onboarding/OnboardingScaffold'
import { SheetPalette } from '@/components/onboarding/onboardingSheetPalette'
import { SheetPrimaryButton } from '@/components/onboarding/SheetPrimaryButton'
import { SheetSuffixInput } from '@/components/onboarding/SheetSuffixInput'
import { RallyText } from '@/components/ui/RallyText'
import { Radius, Spacing } from '@/constants/theme'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useI18n } from '@/hooks/useI18n'
import { onboardingDictionary } from '@/lib/i18n/dictionaries/onboarding'
import { GENDER_OPTIONS, validateAboutYouStep } from '@/lib/onboarding/onboardingRules'
import { guardedRouter } from '@/lib/navigation/guardedRouter'
import { useOnboardingStore } from '@/stores/onboardingStore'

/** Step 2/4 — DOB, gender, height, weight (all feeding recap analysis). */
export default function OnboardingAboutYouScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>()
  const { track } = useAnalytics()
  const { t } = useI18n(onboardingDictionary)
  const draft = useOnboardingStore((state) => state.draft)
  const patchDraft = useOnboardingStore((state) => state.patchDraft)
  const navigationLockedRef = useRef(false)

  function continueToNext() {
    if (navigationLockedRef.current) return
    Keyboard.dismiss()
    const error = validateAboutYouStep(draft, new Date())
    if (error) {
      Alert.alert(t('alert_cannot_continue'), error)
      return
    }
    navigationLockedRef.current = true
    track({ name: 'onboarding_step_completed', properties: { step: 2, step_key: 'about_you' } })
    guardedRouter.push(
      { pathname: '/onboarding/sports', params: { ...(mode ? { mode } : {}) } },
      { actionKey: 'onboarding:about-you-next' },
    )
  }

  return (
    <OnboardingScaffold
      step={2}
      title={t('title_about')}
      titleIcon="account"
      subtitle={t('subtitle_about')}
      showBack
      footer={<SheetPrimaryButton label={t('button_continue')} onPress={continueToNext} />}
    >
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="calendar-blank-outline" size={16} color={SheetPalette.ink} />
          <RallyText variant="body" style={styles.sectionTitle}>{t('section_dob')}</RallyText>
        </View>
        <DateOfBirthField
          year={draft.birthYear}
          month={draft.birthMonth}
          onChange={patchDraft}
        />
      </View>

      <View style={styles.section}>
        <RallyText variant="body" style={styles.sectionTitle}>{t('section_gender')}</RallyText>
        <View style={styles.genderRow}>
          {GENDER_OPTIONS.map((option) => {
            const selected = draft.gender === option.value
            const label = t(`gender_${option.value}`)
            return (
              <AnimatedSelectable
                key={option.value}
                selected={selected}
                style={[styles.genderPill, selected && styles.genderPillSelected]}
                onPress={() => patchDraft({ gender: option.value })}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={label}
                hitSlop={{ top: 2, bottom: 2, left: 2, right: 2 }}
              >
                <RallyText variant="body" style={[styles.genderText, selected && styles.genderTextSelected]}>
                  {label}
                </RallyText>
              </AnimatedSelectable>
            )
          })}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.privacyRow}>
          <MaterialCommunityIcons name="lock-outline" size={13} color={SheetPalette.muted} />
          <RallyText variant="body" style={styles.privacyText}>{t('privacy_note')}</RallyText>
        </View>
        <View style={styles.bodyRow}>
          <SheetSuffixInput
            label={t('field_height')}
            suffix={t('unit_cm')}
            value={draft.heightCm}
            onChange={(value) => patchDraft({ heightCm: value })}
            accessibilityLabel={t('a11y_height')}
          />
          <SheetSuffixInput
            label={t('field_weight')}
            suffix={t('unit_kg')}
            value={draft.weightKg}
            onChange={(value) => patchDraft({ weightKg: value })}
            accessibilityLabel={t('a11y_weight')}
          />
        </View>
      </View>
    </OnboardingScaffold>
  )
}

const styles = StyleSheet.create({
  section: { gap: Spacing.xs },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { color: SheetPalette.ink, fontSize: 14 },
  genderRow: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
  genderPill: {
    flexGrow: 1,
    minHeight: 42,
    minWidth: 68,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: SheetPalette.line,
    backgroundColor: SheetPalette.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  genderPillSelected: {
    backgroundColor: SheetPalette.orange,
    borderColor: SheetPalette.orange,
  },
  genderText: { color: SheetPalette.ink, fontSize: 12.5 },
  genderTextSelected: { color: SheetPalette.onOrange },
  privacyRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  privacyText: { color: SheetPalette.muted, fontSize: 11 },
  bodyRow: { flexDirection: 'row', gap: Spacing.sm },
})
