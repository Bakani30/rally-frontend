import { useMemo } from 'react'
import { ActivityIndicator, Alert, Text, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { ArcadeButton } from '@/components/arcade/ArcadeButton'
import { Screen } from '@/components/layout/Screen'
import { Reveal } from '@/components/motion/Reveal'
import { ScreenBackButton } from '@/components/navigation/ScreenBackButton'
import { RefereeEligibilityStateRow } from '@/components/referee/RefereeEligibilityStateRow'
import { RefereeLevelLadder } from '@/components/referee/RefereeLevelLadder'
import { createRefereePassScreenStyles } from '@/components/referee/refereePassScreenStyles'
import { Spacing } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useAuth } from '@/hooks/useAuth'
import {
  useAlphaRefereeEligibility,
  useApplyAlphaReferee,
} from '@/hooks/useAlphaRefereeDuties'
import { useI18n } from '@/hooks/useI18n'
import { useProfile } from '@/hooks/useProfile'
import { useRefereeSportProfiles } from '@/hooks/useRefereeSportProfiles'
import { refereeDictionary } from '@/lib/i18n/dictionaries/referee'
import {
  REFEREE_ACTIVITY_KEYS,
  refereeSupportsTrust,
  refereeTierByLevel,
  resolveRefereeDisplayLevel,
  type RefereeActivityKey,
} from '@/lib/match/refereeLevels'
import {
  refereePassActivityLabel,
  refereePassApplicationConditions,
  refereePassAvailableAccess,
  refereePassStatusBody,
  refereePassTierLabel,
} from '@/lib/match/refereePassPresentation'
import { getSportReelItem } from '@/lib/match/sportReel'
import type { RefereeSportProfile } from '@/types/match'

type IconName = keyof typeof MaterialCommunityIcons.glyphMap

export default function RefereePassScreen() {
  const theme = useSportTheme()
  const styles = createRefereePassScreenStyles(theme)
  const { t } = useI18n(refereeDictionary)
  const { user } = useAuth()
  const params = useLocalSearchParams<{ activity?: string }>()
  const selected = initialActivity(params.activity)

  const eligibility = useAlphaRefereeEligibility(user?.id)
  const { data: userProfile } = useProfile(user?.id)
  const profiles = useRefereeSportProfiles(user?.id)
  const applyReferee = useApplyAlphaReferee(user?.id)

  const elig = useMemo(
    () => eligibility.data?.activities.find((entry) => entry.activityType === selected) ?? null,
    [eligibility.data?.activities, selected],
  )
  const eligibilityState = eligibility.isPending || (eligibility.isError && eligibility.isFetching)
    ? 'loading'
    : eligibility.isError
      ? 'error'
      : eligibility.isSuccess && elig
        ? 'ready'
        : eligibility.isSuccess
          ? 'unavailable'
          : 'loading'
  const profile = profileFor(profiles, selected)
  const supportsTrust = refereeSupportsTrust(selected)
  const hasLevel = Number.isFinite(profile?.level) || Number.isFinite(elig?.appointedLevel)
  const effectiveLevel = hasLevel
    ? resolveRefereeDisplayLevel(profile?.level ?? 0, [elig?.appointedLevel])
    : 0
  const tier = refereeTierByLevel(effectiveLevel)
  const isApplying = applyReferee.isPending && applyReferee.variables === selected
  const canApply = !!elig && !elig.appliedAt && !elig.eligible && !isApplying
  const sportLabel = refereePassActivityLabel(selected, t)
  const refereeName = userProfile?.handle
    ?? userProfile?.display_name
    ?? user?.user_metadata?.handle
    ?? user?.user_metadata?.display_name
    ?? user?.email?.split('@')[0]
    ?? t('refereeRole')
  const reel = getSportReelItem(selected)
  const showsLevel = supportsTrust
  const applicationConditions = refereePassApplicationConditions(selected, elig, sportLabel, t)
  const availableAccess = refereePassAvailableAccess(selected, elig, sportLabel, t)
  const passConditions = [...applicationConditions, ...availableAccess]

  const handleApply = () => {
    applyReferee.mutate(selected, {
      onError: () => Alert.alert(t('applyErrorTitle'), t('applyErrorMessage')),
    })
  }

  return (
    <Screen
      edges={['top', 'bottom']}
      topPad={Spacing.md}
      bottomPad={Spacing.xxxl}
      backgroundColor={theme.bg}
      contentContainerStyle={styles.container}
    >
      <View style={styles.block}>
        <View style={styles.topBar}>
          <ScreenBackButton style={styles.topBarBack} accessibilityLabel={t('back')} />
          <View style={styles.topBarCopy}>
            <Text style={styles.title}>{t('passTitle')}</Text>
            <Text style={styles.kicker}>{t('stageLabel')}</Text>
          </View>
        </View>
      </View>

      <View style={styles.block}>
        {eligibilityState === 'loading' ? (
          <View style={styles.panel}>
            <RefereeEligibilityStateRow loading label={t('loadingEligibility')} theme={theme} />
          </View>
        ) : eligibilityState === 'error' ? (
          <View style={styles.panel}>
            <RefereeEligibilityStateRow
              label={t('eligibilityError')}
              retryLabel={t('retry')}
              onRetry={() => void eligibility.refetch()}
              theme={theme}
            />
          </View>
        ) : eligibilityState === 'unavailable' ? (
          <View style={styles.panel}>
            <RefereeEligibilityStateRow label={t('eligibilityUnavailable')} theme={theme} />
          </View>
        ) : (
          <View
            style={styles.statusCard}
            accessible
            accessibilityLabel={`${sportLabel}. ${showsLevel ? t('refereeLevelIdentity', { level: effectiveLevel, tier: refereePassTierLabel(tier, t) }) : t('runningOfficialRole')}. ${refereePassStatusBody(selected, elig, t)}`}
          >
            <View style={[styles.sportIcon, { backgroundColor: reel.accent }]}>
              <MaterialCommunityIcons name={reel.icon as IconName} size={22} color={reel.onAccent} />
            </View>
            <View style={styles.statusCopy}>
              {showsLevel ? (
                <>
                  <View style={styles.statusIdentityRow}>
                    <Text style={styles.statusTitle} numberOfLines={1}>{refereeName}</Text>
                    <Text style={styles.statusLevel}>{t('refereeLevelShort', { level: effectiveLevel })}</Text>
                  </View>
                  <Text style={styles.statusTier}>{refereePassTierLabel(tier, t)}</Text>
                </>
              ) : (
                <>
                  <Text style={styles.statusTitle} numberOfLines={1}>{refereeName}</Text>
                  <Text style={styles.statusTier}>{t('runningOfficialRole')}</Text>
                </>
              )}
            </View>
          </View>
        )}

        {canApply ? (
          <ArcadeButton
            label={t('applyButton', { sport: sportLabel })}
            icon="shield-account-outline"
            onPress={handleApply}
            style={styles.applyButton}
          />
        ) : isApplying ? (
          <View style={styles.applyBusy}>
            <ActivityIndicator color={theme.orange} />
          </View>
        ) : null}
      </View>

      {eligibilityState === 'ready' ? (
        <Reveal delay={0} style={styles.detailsStack}>
          {passConditions.length > 0 ? (
            <View style={styles.block}>
            <View style={styles.panel}>
              {passConditions.map((condition, index) => (
                <View
                  key={`${condition.icon}:${condition.text}`}
                  style={[styles.conditionRow, index > 0 && styles.conditionDivider]}
                >
                  <MaterialCommunityIcons
                    name={condition.icon}
                    size={18}
                    color={condition.done ? theme.green : theme.mutedSoft}
                  />
                  <Text style={styles.conditionText}>{condition.text}</Text>
                </View>
              ))}
            </View>
            </View>
          ) : null}

          {supportsTrust ? (
            <View style={styles.block}>
              <RefereeLevelLadder
                currentLevel={effectiveLevel}
                completedMatches={profile?.completed_matches ?? 0}
                rating={profile?.rating ?? 0}
                trustScore={profile?.trust_score ?? 0}
              />
            </View>
          ) : (
            <View style={styles.block}>
              <View style={styles.noteCard}>
                <MaterialCommunityIcons name="timer-sand" size={20} color={theme.mutedSoft} />
                <Text style={styles.conditionText}>{t('performanceLevelUnavailable')}</Text>
              </View>
            </View>
          )}
        </Reveal>
      ) : null}
    </Screen>
  )
}

function initialActivity(raw: string | undefined): RefereeActivityKey {
  return (REFEREE_ACTIVITY_KEYS as readonly string[]).includes(raw ?? '')
    ? (raw as RefereeActivityKey)
    : 'basketball'
}

function profileFor(
  profiles: ReturnType<typeof useRefereeSportProfiles>,
  key: RefereeActivityKey,
): RefereeSportProfile | null {
  if (key === 'basketball') return profiles.basketball.profile
  if (key === 'badminton') return profiles.badminton.profile
  return null
}
