import { useMemo, useState } from 'react'
import { Alert, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Screen } from '@/components/layout/Screen'
import { PressableScale } from '@/components/motion/PressableScale'
import { ScreenBackButton } from '@/components/navigation/ScreenBackButton'
import { RefereeDutyCard } from '@/components/referee/RefereeDutyCard'
import { RefereeEmptyState } from '@/components/referee/RefereeEmptyState'
import { RefereeApplicationTaskCard } from '@/components/referee/RefereeApplicationTaskCard'
import { RefereeSportIconReel } from '@/components/referee/RefereeSportIconReel'
import { Fonts, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useAuth } from '@/hooks/useAuth'
import {
  useAlphaRefereeDuties,
  useAlphaRefereeEligibility,
  useApplyAlphaReferee,
} from '@/hooks/useAlphaRefereeDuties'
import { useRespondRefereeAssignment } from '@/hooks/useRespondRefereeAssignment'
import { useI18n } from '@/hooks/useI18n'
import { useRefereeSportProfiles } from '@/hooks/useRefereeSportProfiles'
import { refereeDictionary } from '@/lib/i18n/dictionaries/referee'
import { getAlphaRefereeDutyState } from '@/lib/match/matchRules'
import {
  filterRefereeActivityItems,
  refereeNeedsApplication,
  type RefereeActivityFilter,
  type RefereeDutyPresentationState,
} from '@/lib/match/refereeCopy'
import {
  refereePassAccessConditions,
  refereePassActivityLabel,
} from '@/lib/match/refereePassPresentation'
import {
  resolveRefereeDisplayLevel,
  type RefereeActivityKey,
} from '@/lib/match/refereeLevels'
import { guardedRouter } from '@/lib/navigation/guardedRouter'
import type { AlphaRefereeDuty } from '@/types/match'

export default function RefereeScreen() {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { t } = useI18n(refereeDictionary)
  const { user } = useAuth()
  const dutiesQuery = useAlphaRefereeDuties(user?.id)
  const respondRefereeMutation = useRespondRefereeAssignment(undefined, user?.id)
  const eligibility = useAlphaRefereeEligibility(user?.id)
  const applyReferee = useApplyAlphaReferee(user?.id)
  const profiles = useRefereeSportProfiles(user?.id)

  const [selectedActivity, setSelectedActivity] = useState<RefereeActivityFilter>('all')

  const duties = useMemo(() => dutiesQuery.data?.duties ?? [], [dutiesQuery.data?.duties])
  const actionDuties = useMemo(() => actionableDuties(duties, user?.id), [duties, user?.id])
  const visibleDuties = useMemo(
    () => filterRefereeActivityItems(actionDuties, selectedActivity, ({ duty }) => duty.match.activityType),
    [actionDuties, selectedActivity],
  )
  const applicationTasks = useMemo(
    () => selectedActivity === 'all'
      ? []
      : (eligibility.data?.activities ?? []).filter((entry) =>
        refereeNeedsApplication(entry) && entry.activityType === selectedActivity,
      ),
    [eligibility.data?.activities, selectedActivity],
  )
  const visibleTaskCount = visibleDuties.length + applicationTasks.length
  const levelByActivity = useMemo<Record<RefereeActivityKey, number | null>>(() => {
    const appointments = new Map(
      (eligibility.data?.activities ?? []).map((entry) => [entry.activityType, entry.appointedLevel]),
    )
    const levelFor = (earnedLevel: number | null | undefined, appointedLevel: number | null | undefined) => {
      if (!Number.isFinite(earnedLevel) && !Number.isFinite(appointedLevel)) return null
      return resolveRefereeDisplayLevel(earnedLevel ?? 0, [appointedLevel])
    }
    return {
      running: levelFor(undefined, appointments.get('running')),
      basketball: levelFor(profiles.basketball.profile?.level, appointments.get('basketball')),
      badminton: levelFor(profiles.badminton.profile?.level, appointments.get('badminton')),
    }
  }, [
    eligibility.data?.activities,
    profiles.badminton.profile?.level,
    profiles.basketball.profile?.level,
  ])
  const displayedLevel = selectedActivity === 'all' ? null : levelByActivity[selectedActivity]
  const levelState = eligibility.isPending || profiles.isPending
    ? 'loading'
    : eligibility.isError || profiles.isError
      ? 'error'
      : 'ready'

  const goToPass = (activity: RefereeActivityKey) =>
    guardedRouter.push(`/referee/apply?activity=${activity}`, {
      actionKey: `referee:pass:${activity}`,
    })

  const goToProfile = () =>
    guardedRouter.push('/referee/profile', { actionKey: 'referee:profile:open' })

  return (
    <Screen
      edges={['top', 'bottom']}
      topPad={Spacing.md}
      bottomPad={Spacing.xxxl}
      backgroundColor={theme.bg}
      contentContainerStyle={styles.container}
    >
      <View style={styles.block}>
        <View style={styles.headerRow}>
          <ScreenBackButton style={styles.headerBackButton} accessibilityLabel={t('back')} />
          <View style={styles.headerTitleGroup}>
            <Text style={styles.title}>{t('hubTitle')}</Text>
            <Text style={styles.kicker}>{t('stageLabel')}</Text>
          </View>
          <PressableScale
            style={styles.headerButton}
            onPress={goToProfile}
            accessibilityRole="button"
            accessibilityLabel={t('openRefereeProfile')}
            hitSlop={4}
          >
            <MaterialCommunityIcons name="account-outline" size={20} color={theme.muted} />
          </PressableScale>
        </View>
      </View>

      <View style={styles.block}>
        <RefereeSportIconReel value={selectedActivity} onChange={setSelectedActivity} />
      </View>

      <View style={styles.block}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>{t('tasksTitle')}</Text>
            <Text style={styles.sectionMeta}>
              {t(
                selectedActivity === 'all'
                  ? visibleTaskCount === 1 ? 'taskCountAllOne' : 'taskCountAllMany'
                  : visibleTaskCount === 1 ? 'taskCountSportOne' : 'taskCountSportMany',
                { count: visibleTaskCount },
              )}
            </Text>
          </View>
          {selectedActivity !== 'all' ? (
            <PressableScale
              style={styles.levelChip}
              onPress={() => goToPass(selectedActivity)}
              accessibilityRole="button"
              accessibilityLabel={
                levelState === 'ready' && displayedLevel != null
                  ? t('refereeLevelA11y', { level: displayedLevel })
                  : t('openRefereeLevel')
              }
              scaleTo={0.94}
            >
              <MaterialCommunityIcons name="shield-account-outline" size={17} color={theme.orange} />
              <Text style={styles.levelChipText}>
                {levelState === 'loading'
                  ? t('loadingLevelShort')
                  : levelState === 'error' || displayedLevel == null
                    ? t('viewLevel')
                    : `LV ${displayedLevel}`}
              </Text>
              <MaterialCommunityIcons name="chevron-right" size={16} color={theme.mutedSoft} />
            </PressableScale>
          ) : null}
        </View>

        {dutiesQuery.isPending || eligibility.isPending ? (
          <RefereeEmptyState loading title={t('loadingDuties')} compact />
        ) : dutiesQuery.error ? (
          <RefereeEmptyState
            icon="alert-circle-outline"
            title={t('dutiesError')}
            description={t('tryAgainSoon')}
            actionLabel={t('retry')}
            onAction={() => void dutiesQuery.refetch()}
            tone="danger"
          />
        ) : eligibility.isError && visibleDuties.length === 0 ? (
          <RefereeEmptyState
            icon="alert-circle-outline"
            title={t('eligibilityError')}
            actionLabel={t('retry')}
            onAction={() => void eligibility.refetch()}
            tone="danger"
            compact
          />
        ) : visibleTaskCount === 0 ? (
          <RefereeEmptyState
            title={selectedActivity === 'all' ? t('noDuties') : t('noSportDuties')}
            compact
          />
        ) : (
          <View style={styles.cardStack}>
            {applicationTasks.map((entry) => {
              const activity = entry.activityType
              const sport = refereePassActivityLabel(activity, t)
              const pending = applyReferee.isPending && applyReferee.variables === activity
              return (
                <RefereeApplicationTaskCard
                  key={`apply:${activity}`}
                  activity={activity}
                  conditions={refereePassAccessConditions(activity, entry, sport, t)}
                  pending={pending}
                  disabled={applyReferee.isPending}
                  onApply={() => {
                    if (applyReferee.isPending) return
                    applyReferee.mutate(activity, {
                      onError: () => Alert.alert(t('applyErrorTitle'), t('applyErrorMessage')),
                    })
                  }}
                />
              )
            })}
            {visibleDuties.map(({ duty, state }) => (
              <RefereeDutyCard
                key={duty.assignmentId}
                duty={duty}
                state={state}
                onOpenMatch={() =>
                  guardedRouter.push(`/match/${duty.matchId}`, {
                    actionKey: `referee:${duty.matchId}:enter-room`,
                  })
                }
                onSubmit={() =>
                  guardedRouter.push(`/match/${duty.matchId}`, {
                    actionKey: `referee:${duty.matchId}:open-live-board`,
                  })
                }
                onAccept={() => {
                  if (respondRefereeMutation.isPending) return
                  respondRefereeMutation.mutate({ matchId: duty.matchId, response: 'accept' })
                }}
                onDecline={() => {
                  if (respondRefereeMutation.isPending) return
                  respondRefereeMutation.mutate({ matchId: duty.matchId, response: 'decline' })
                }}
                responsePending={respondRefereeMutation.isPending && respondRefereeMutation.variables?.matchId === duty.matchId}
                responseControlsDisabled={respondRefereeMutation.isPending && duty.assignmentStatus === 'invited'}
                responseError={respondRefereeMutation.variables?.matchId === duty.matchId ? respondRefereeMutation.error : null}
              />
            ))}
          </View>
        )}
      </View>

    </Screen>
  )
}

function actionableDuties(duties: AlphaRefereeDuty[], userId: string | undefined) {
  const result: { duty: AlphaRefereeDuty; state: RefereeDutyPresentationState }[] = []
  for (const duty of duties) {
    const state: RefereeDutyPresentationState = duty.assignmentStatus === 'invited'
      ? 'invited'
      : getAlphaRefereeDutyState(duty, userId)
    if (
      state === 'invited' ||
      state === 'needs_result' ||
      state === 'live_draft' ||
      state === 'correction_requested' ||
      state === 'not_ready'
    ) {
      result.push({ duty, state })
    }
  }
  return result
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      paddingHorizontal: Spacing.lg,
      gap: Spacing.lg,
    },
    block: { width: '100%', maxWidth: 420, alignSelf: 'center', gap: Spacing.sm },
    headerRow: {
      width: '100%',
      minHeight: 52,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerBackButton: { position: 'absolute', left: 0, top: 4 },
    headerTitleGroup: { alignItems: 'center' },
    headerButton: {
      position: 'absolute',
      right: 0,
      top: 4,
      width: 44,
      height: 44,
      borderRadius: Radius.lg,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    kicker: { color: theme.orange, fontSize: 9, lineHeight: 13, fontWeight: '900', letterSpacing: 1.1 },
    title: { color: theme.ink, fontSize: 22, lineHeight: 30, fontWeight: '900', fontFamily: Fonts?.thaiHead },
    sectionTitle: { color: theme.ink, fontSize: 17, lineHeight: 25, fontWeight: '900', fontFamily: Fonts?.thaiHead },
    sectionHeaderRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
    sectionMeta: {
      color: theme.muted,
      fontSize: 11,
      lineHeight: 17,
      fontWeight: '700',
      fontFamily: Fonts?.thaiMedium,
    },
    levelChip: {
      minWidth: 92,
      minHeight: 44,
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingHorizontal: Spacing.sm,
    },
    levelChipText: {
      color: theme.ink,
      fontSize: 12,
      lineHeight: 18,
      fontWeight: '900',
      fontFamily: Fonts?.rounded,
      fontVariant: ['tabular-nums'],
    },
    cardStack: { gap: Spacing.sm },
  })
}
