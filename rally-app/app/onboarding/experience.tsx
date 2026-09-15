import { useEffect, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import type { MaterialCommunityIcons } from '@expo/vector-icons'
import { useLocalSearchParams } from 'expo-router'

import { LevelOptionList } from '@/components/onboarding/LevelOptionList'
import { OnboardingScaffold } from '@/components/onboarding/OnboardingScaffold'
import { SheetPalette } from '@/components/onboarding/onboardingSheetPalette'
import { SheetPrimaryButton } from '@/components/onboarding/SheetPrimaryButton'
import { StyleTagPills } from '@/components/onboarding/StyleTagPills'
import { RallyText } from '@/components/ui/RallyText'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useI18n } from '@/hooks/useI18n'
import { useOnboardingSubmit } from '@/hooks/useOnboardingSubmit'
import { onboardingDictionary } from '@/lib/i18n/dictionaries/onboarding'
import {
  EXPERIENCE_LEVEL_OPTIONS,
  hasExperienceDetailPage,
  MAX_PLAY_STYLES,
  ONBOARDING_SPORTS,
  PLAY_STYLE_OPTIONS,
  POSITION_OPTIONS,
  playableSelectedSports,
} from '@/lib/onboarding/onboardingRules'
import { useOnboardingStore } from '@/stores/onboardingStore'
import { guardedRouter } from '@/lib/navigation/guardedRouter'

type Phase = 'level' | 'styles'

/**
 * Step 4/4 — per playable sport (บาส/แบด/วิ่ง only — interest-only sports are
 * never asked), split into two pages: page A = ระดับ, page B = สาย +
 * ตำแหน่ง. Pages through sports one at a time, submits
 * everything atomically on the last page of the last sport.
 */
export default function OnboardingExperienceScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>()
  const { track } = useAnalytics()
  const { t } = useI18n(onboardingDictionary)
  const draft = useOnboardingStore((state) => state.draft)
  const patchSportAnswer = useOnboardingStore((state) => state.patchSportAnswer)
  const { submit, isPending } = useOnboardingSubmit()
  const [sportIndex, setSportIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('level')
  const navigationLockedRef = useRef(false)

  const sports = playableSelectedSports(draft)
  const activity = sports[sportIndex]
  const sportInfo = ONBOARDING_SPORTS.find((s) => s.activity === activity)
  const answer = activity ? draft.sportAnswers[activity] : undefined
  const isLastSport = sportIndex >= sports.length - 1

  // Gate re-entry with no playable sport left (e.g. deep relaunch, or every
  // selected sport was interest-only) — bounce back.
  const missingSelection = !activity || !sportInfo
  useEffect(() => {
    if (missingSelection) guardedRouter.replace('/onboarding/sports', { actionKey: 'onboarding:missing-sports' })
  }, [missingSelection])
  if (missingSelection) return null

  const playStyleOptions = PLAY_STYLE_OPTIONS[activity]
  const positionOptions = POSITION_OPTIONS[activity]
  const sportHasDetailPage = hasExperienceDetailPage(activity)
  const isFinalPage = isLastSport && (phase === 'styles' || !sportHasDetailPage)

  /** Fires once per sport (after its last page), then advances or submits. */
  async function finishSport() {
    if (navigationLockedRef.current) return
    navigationLockedRef.current = true
    track({ name: 'onboarding_step_completed', properties: { step: 4, step_key: 'experience' } })
    if (!isLastSport) {
      setSportIndex((index) => index + 1)
      setPhase('level')
      return
    }
    const ok = await submit(draft)
    if (!ok) {
      navigationLockedRef.current = false
      return
    }
    guardedRouter.replace(mode === 'edit' ? '/settings' : '/onboarding/done', {
      actionKey: 'onboarding:experience-finish',
    })
  }

  async function continueOrSubmit() {
    if (phase === 'level') {
      if (!answer?.experienceLevel) return // CTA is disabled until a level is picked
      if (sportHasDetailPage) {
        setPhase('styles')
        return
      }
      await finishSport()
      return
    }
    // phase === 'styles' — สาย/ตำแหน่ง are optional, always allowed to proceed
    await finishSport()
  }

  function goBack() {
    if (phase === 'styles') {
      setPhase('level')
      return
    }
    if (sportIndex > 0) {
      const previousActivity = sports[sportIndex - 1]
      setSportIndex((index) => index - 1)
      setPhase(hasExperienceDetailPage(previousActivity) ? 'styles' : 'level')
      return
    }
    guardedRouter.back({ actionKey: 'onboarding:experience-back' })
  }

  return (
    <OnboardingScaffold
      step={4}
      title={t(`sport_${activity}`)}
      subtitle={
        phase === 'level' ? t('experience_subtitle_level') : t('experience_subtitle_styles')
      }
      headerIcon={sportInfo.icon as keyof typeof MaterialCommunityIcons.glyphMap}
      headerIconColor={SheetPalette.orange}
      headerIconSize={44}
      headerIconBackground={SheetPalette.orangeSoft}
      showBack
      onBack={goBack}
      footer={
        <SheetPrimaryButton
          label={isPending ? t('button_saving') : isFinalPage ? t('button_done') : t('button_continue')}
          onPress={continueOrSubmit}
          disabled={phase === 'level' && !answer?.experienceLevel}
          loading={isPending}
        />
      }
    >
      {sports.length > 1 && (
        <RallyText variant="body" style={styles.pageIndicator}>
          {t('experience_sport_pager', { index: sportIndex + 1, total: sports.length })}
        </RallyText>
      )}

      {phase === 'level' ? (
        <View style={styles.section}>
          <RallyText variant="body" style={styles.sectionTitle}>{t('section_level')}</RallyText>
          <LevelOptionList
            options={EXPERIENCE_LEVEL_OPTIONS}
            value={answer?.experienceLevel}
            onSelect={(level) => patchSportAnswer(activity, { experienceLevel: level })}
          />
        </View>
      ) : (
        <>
          {playStyleOptions && (
            <View style={styles.section}>
              <RallyText variant="body" style={styles.sectionTitle}>
                {t('section_styles', { max: MAX_PLAY_STYLES })}
              </RallyText>
              <StyleTagPills
                options={playStyleOptions}
                values={answer?.playStyles ?? []}
                maxSelected={MAX_PLAY_STYLES}
                labelFor={(value) => t(`style_${value}` as keyof typeof onboardingDictionary)}
                onToggle={(value) => {
                  const current = answer?.playStyles ?? []
                  patchSportAnswer(activity, {
                    playStyles: current.includes(value)
                      ? current.filter((style) => style !== value)
                      : [...current, value],
                  })
                }}
              />
            </View>
          )}

          {positionOptions && (
            <View style={styles.section}>
              <RallyText variant="body" style={styles.sectionTitle}>{t('section_position')}</RallyText>
              <StyleTagPills
                options={positionOptions}
                values={answer?.positionKey ? [answer.positionKey] : []}
                maxSelected={1}
                labelFor={(value) =>
                  t(
                    (activity === 'badminton' ? `bmpos_${value}` : `position_${value}`) as keyof typeof onboardingDictionary,
                  )
                }
                onToggle={(value) =>
                  patchSportAnswer(activity, {
                    positionKey: answer?.positionKey === value ? null : value,
                  })
                }
              />
            </View>
          )}
        </>
      )}
    </OnboardingScaffold>
  )
}

const styles = StyleSheet.create({
  pageIndicator: {
    alignSelf: 'center',
    color: SheetPalette.muted,
    fontSize: 11,
  },
  section: { gap: 8 },
  sectionTitle: { color: SheetPalette.ink, fontSize: 13 },
})
