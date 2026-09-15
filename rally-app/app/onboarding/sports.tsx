import { Alert, StyleSheet, View } from 'react-native'
import { useRef } from 'react'
import { useLocalSearchParams } from 'expo-router'

import { OnboardingScaffold } from '@/components/onboarding/OnboardingScaffold'
import { SheetPalette } from '@/components/onboarding/onboardingSheetPalette'
import { SheetPrimaryButton } from '@/components/onboarding/SheetPrimaryButton'
import { SportChip } from '@/components/onboarding/SportChip'
import { RallyText } from '@/components/ui/RallyText'
import { Spacing } from '@/constants/theme'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useI18n } from '@/hooks/useI18n'
import { useOnboardingSubmit } from '@/hooks/useOnboardingSubmit'
import { onboardingDictionary } from '@/lib/i18n/dictionaries/onboarding'
import { ONBOARDING_SPORTS, playableSelectedSports, validateSportsStep } from '@/lib/onboarding/onboardingRules'
import { guardedRouter } from '@/lib/navigation/guardedRouter'
import { useOnboardingStore } from '@/stores/onboardingStore'

const AVAILABLE_SPORTS = ONBOARDING_SPORTS.filter((sport) => sport.available)
const INTEREST_SPORTS = ONBOARDING_SPORTS.filter((sport) => !sport.available)

/**
 * Step 3/4 — sport interests (multi-select, at least one). If none of the
 * selected sports are playable in Rally yet, the experience step has
 * nothing to ask — this screen submits directly instead of routing there.
 */
export default function OnboardingSportsScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>()
  const { track } = useAnalytics()
  const { t } = useI18n(onboardingDictionary)
  const draft = useOnboardingStore((state) => state.draft)
  const toggleSport = useOnboardingStore((state) => state.toggleSport)
  const { submit, isPending } = useOnboardingSubmit()
  const navigationLockedRef = useRef(false)

  const hasPlayableSports = playableSelectedSports(draft).length > 0

  async function continueToNext() {
    if (navigationLockedRef.current) return
    const error = validateSportsStep(draft)
    if (error) {
      Alert.alert(t('alert_cannot_continue'), error)
      return
    }
    navigationLockedRef.current = true
    track({ name: 'onboarding_step_completed', properties: { step: 3, step_key: 'sports' } })

    if (hasPlayableSports) {
      guardedRouter.push(
        { pathname: '/onboarding/experience', params: { ...(mode ? { mode } : {}) } },
        { actionKey: 'onboarding:sports-next' },
      )
      return
    }
    const ok = await submit(draft)
    if (ok) {
      guardedRouter.replace(mode === 'edit' ? '/settings' : '/onboarding/done', {
        actionKey: 'onboarding:sports-finish',
      })
    } else {
      navigationLockedRef.current = false
    }
  }

  return (
    <OnboardingScaffold
      step={3}
      title={t('title_sports')}
      subtitle={t('subtitle_sports')}
      headerIcon="trophy"
      headerIconColor={SheetPalette.amber}
      showBack
      footer={
        <SheetPrimaryButton
          label={isPending ? t('button_saving') : hasPlayableSports ? t('button_continue') : t('button_done')}
          onPress={continueToNext}
          loading={isPending}
        />
      }
    >
      <View style={styles.section}>
        <RallyText variant="body" style={styles.groupCaption}>{t('section_available')}</RallyText>
        <View style={styles.grid}>
          {AVAILABLE_SPORTS.map((sport) => (
            <SportChip
              key={sport.activity}
              sport={sport}
              selected={draft.selectedSports.includes(sport.activity)}
              onToggle={() => toggleSport(sport.activity)}
            />
          ))}
        </View>
      </View>

      <View style={styles.grid}>
        {INTEREST_SPORTS.map((sport) => (
          <SportChip
            key={sport.activity}
            sport={sport}
            selected={draft.selectedSports.includes(sport.activity)}
            onToggle={() => toggleSport(sport.activity)}
          />
        ))}
      </View>

      <RallyText variant="body" style={styles.selectedCount}>
        {t('sports_selected_count', { count: draft.selectedSports.length })}
      </RallyText>
    </OnboardingScaffold>
  )
}

const styles = StyleSheet.create({
  section: { gap: Spacing.sm },
  groupCaption: {
    color: SheetPalette.muted,
    fontSize: 10.5,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  selectedCount: {
    color: SheetPalette.muted,
    fontSize: 11,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
})
