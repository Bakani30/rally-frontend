import { useEffect, useMemo, useState } from 'react'
import { Text, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { Screen } from '@/components/layout/Screen'
import { ScreenBackButton } from '@/components/navigation/ScreenBackButton'
import { PublicProfileActions } from '@/components/profile/PublicProfileActions'
import { RefereeEmptyState } from '@/components/referee/RefereeEmptyState'
import { RefereeMatchRecordRow } from '@/components/referee/RefereeMatchRecordRow'
import { RefereeProfileHeader } from '@/components/referee/RefereeProfileHeader'
import { RefereeProfileStats } from '@/components/referee/RefereeProfileStats'
import {
  RefereeSportLevelSummary,
  type RefereeSportLevelItem,
} from '@/components/referee/RefereeSportLevelSummary'
import { createRefereeProfileScreenStyles } from '@/components/referee/refereeProfileScreenStyles'
import { Spacing } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useAuth } from '@/hooks/useAuth'
import { useAlphaRefereeEligibility } from '@/hooks/useAlphaRefereeDuties'
import { useI18n } from '@/hooks/useI18n'
import { useProfileSocialActions } from '@/hooks/useProfileSocialActions'
import { usePublicProfile } from '@/hooks/usePublicProfile'
import { useRefereeMatchRecords } from '@/hooks/useRefereeMatchRecords'
import { useRefereeSportProfiles } from '@/hooks/useRefereeSportProfiles'
import { refereeDictionary } from '@/lib/i18n/dictionaries/referee'
import {
  filterRefereeActivityItems,
  refereePublicActivityFilters,
  type RefereeActivityFilter,
} from '@/lib/match/refereeCopy'
import {
  REFEREE_ACTIVITY_KEYS,
  refereePublicSportProfiles,
  resolveRefereeDisplayLevel,
  summarizeRefereeSportProfiles,
  type RefereeActivityKey,
} from '@/lib/match/refereeLevels'
import { guardedRouter } from '@/lib/navigation/guardedRouter'

export default function RefereeProfileScreen() {
  const theme = useSportTheme()
  const styles = createRefereeProfileScreenStyles(theme)
  const { t } = useI18n(refereeDictionary)
  const { user } = useAuth()
  const params = useLocalSearchParams<{ userId?: string }>()

  const viewedId = params.userId ?? user?.id
  const isSelf = !!user?.id && (!params.userId || params.userId === user.id)
  const profileQuery = usePublicProfile({ userId: viewedId })
  const profiles = useRefereeSportProfiles(viewedId)
  const eligibility = useAlphaRefereeEligibility(isSelf ? viewedId : undefined)
  const records = useRefereeMatchRecords(viewedId)
  const social = useProfileSocialActions(viewedId)
  const [selectedActivity, setSelectedActivity] = useState<RefereeActivityFilter>('all')

  const bb = profiles.basketball.profile
  const bd = profiles.badminton.profile
  const summary = useMemo(() => summarizeRefereeSportProfiles([bb, bd]), [bb, bd])
  const publicSportProfiles = useMemo(
    () => refereePublicSportProfiles([bb, bd]),
    [bb, bd],
  )
  const sportItems = useMemo<RefereeSportLevelItem[]>(() => {
    const byActivity = new Map([
      ['basketball', bb],
      ['badminton', bd],
    ] as const)
    const appointments = new Map(
      (eligibility.data?.activities ?? []).map((entry) => [entry.activityType, entry.appointedLevel]),
    )
    const activities = isSelf
      ? REFEREE_ACTIVITY_KEYS
      : publicSportProfiles.map((profile) => profile.activity_type)

    return activities.map((activityType) => {
      const profile = activityType === 'running' ? null : byActivity.get(activityType) ?? null
      const appointedLevel = appointments.get(activityType)
      const hasLevel = Number.isFinite(profile?.level) || Number.isFinite(appointedLevel)
      return {
        activityType,
        level: hasLevel
          ? resolveRefereeDisplayLevel(profile?.level ?? 0, [appointedLevel])
          : null,
        completedMatches: profile?.completed_matches ?? 0,
        rating: profile && profile.completed_matches > 0 ? profile.rating : null,
        disputedMatches: profile?.disputed_matches ?? 0,
      }
    })
  }, [bb, bd, eligibility.data?.activities, isSelf, publicSportProfiles])
  const historyFilters = useMemo(
    () => refereePublicActivityFilters(
      {
        basketball: bb?.completed_matches ?? 0,
        badminton: bd?.completed_matches ?? 0,
      },
      (records.data ?? []).map((record) => record.activityType),
    ),
    [bb?.completed_matches, bd?.completed_matches, records.data],
  )
  const historySportKeys = useMemo(
    () => historyFilters.filter((key): key is RefereeActivityKey => key !== 'all'),
    [historyFilters],
  )
  const profileSportKeys = useMemo(
    () => sportItems.map((item) => item.activityType),
    [sportItems],
  )
  const selectableSportKeys = isSelf ? profileSportKeys : historySportKeys
  const recordList = useMemo(
    () => filterRefereeActivityItems(records.data ?? [], selectedActivity, (record) => record.activityType),
    [records.data, selectedActivity],
  )
  const supportingDataPending = profiles.isPending || (isSelf && eligibility.isPending)
  const supportingDataError = profiles.isError || (isSelf && eligibility.isError)

  useEffect(() => {
    if (selectedActivity === 'all' || selectableSportKeys.includes(selectedActivity)) return
    setSelectedActivity('all')
  }, [selectableSportKeys, selectedActivity])

  const topBar = (
    <View style={styles.topBar}>
      <ScreenBackButton style={styles.topBarBack} accessibilityLabel={t('back')} />
      <Text style={styles.topBarTitle}>{t('profileTitle')}</Text>
    </View>
  )

  if (!viewedId) {
    return (
      <View style={styles.root}>
        <View style={styles.stateBlock}>{topBar}</View>
        <View style={styles.stateBlock}>
          <RefereeEmptyState icon="account-off-outline" title={t('userNotFound')} />
        </View>
      </View>
    )
  }

  if ((profileQuery.isPending || supportingDataPending) && !profileQuery.isError && !supportingDataError) {
    return (
      <View style={styles.root}>
        <View style={styles.stateBlock}>{topBar}</View>
        <View style={styles.stateBlock}>
          <RefereeEmptyState loading title={t('loadingProfile')} />
        </View>
      </View>
    )
  }

  if ((profileQuery.isError && !profileQuery.data) || supportingDataError) {
    return (
      <View style={styles.root}>
        <View style={styles.stateBlock}>{topBar}</View>
        <View style={styles.stateBlock}>
          <RefereeEmptyState
            icon="alert-circle-outline"
            title={supportingDataError ? t('profileLevelError') : t('profileError')}
            description={t('tryAgainSoon')}
            actionLabel={t('retry')}
            onAction={() => {
              void profileQuery.refetch()
              void profiles.refetch()
              if (isSelf) void eligibility.refetch()
            }}
            tone="danger"
          />
        </View>
      </View>
    )
  }

  const publicProfile = profileQuery.data
  const displayName = publicProfile?.displayName ?? t('fallbackPlayer')
  const initials = (displayName[0] ?? '?').toUpperCase()
  return (
    <Screen
      edges={['top', 'bottom']}
      backgroundColor={theme.bg}
      topPad={Spacing.md}
      bottomPad={Spacing.xxxl}
      contentContainerStyle={styles.container}
    >
      <View style={styles.block}>{topBar}</View>

      <View style={styles.block}>
        <RefereeProfileHeader
          displayName={displayName}
          avatarUrl={publicProfile?.avatarUrl}
          initials={initials}
        />
      </View>

      <View style={styles.block}>
        <RefereeProfileStats
          matchesRefereed={summary.matchesRefereed}
          rating={summary.rating}
          cleanPct={summary.cleanPct}
          disputes={summary.disputes}
        />
      </View>

      {sportItems.length > 0 ? (
        <View style={styles.block}>
          <Text style={styles.sectionTitle}>{t('levelsBySport')}</Text>
          <RefereeSportLevelSummary
            items={sportItems}
            selectedActivity={selectedActivity === 'all' ? null : selectedActivity}
            onSelect={(activity) => {
              setSelectedActivity((current) => current === activity ? 'all' : activity)
            }}
          />
        </View>
      ) : null}

      {!isSelf && social.enabled ? (
        <View style={styles.block}>
          <PublicProfileActions
            relation={social.relation}
            isPending={social.actionPending}
            canChallenge={false}
            showKebab
            onPrimary={social.onPrimary}
            onChallenge={() => {}}
            onKebab={social.onSafetyMenu}
          />
        </View>
      ) : null}

      <View style={styles.block}>
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>{t('historyTitle')}</Text>
          {!records.isPending && !records.error ? (
            <Text style={styles.sectionMeta}>
              {t(recordList.length === 1 ? 'recordCountOne' : 'recordCountMany', {
                count: recordList.length,
              })}
            </Text>
          ) : null}
        </View>
        {records.isPending ? (
          <RefereeEmptyState loading title={t('loadingHistory')} compact />
        ) : records.error ? (
          <RefereeEmptyState
            icon="alert-circle-outline"
            title={t('historyError')}
            description={t('tryAgainSoon')}
            actionLabel={t('retry')}
            onAction={() => void records.refetch()}
            tone="danger"
            compact
          />
        ) : recordList.length === 0 ? (
          <RefereeEmptyState
            title={selectedActivity === 'all' ? t('noHistory') : t('noSportHistory')}
            description={
              isSelf
                ? t('selfHistoryHint')
                : t('publicHistoryHint')
            }
            compact
          />
        ) : (
          <View style={styles.cardStack}>
            {recordList.map((record) => (
              <RefereeMatchRecordRow
                key={record.id}
                record={record}
                onPress={() =>
                  guardedRouter.push(`/match/${record.matchId}`, {
                    actionKey: `referee:profile:match:${record.matchId}`,
                  })
                }
              />
            ))}
          </View>
        )}
      </View>
    </Screen>
  )
}
