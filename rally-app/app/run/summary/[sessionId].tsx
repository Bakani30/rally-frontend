import { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

import { MapLibreRunView } from '@/components/maps/MapLibreRunView'
import { RunSummaryHeroCard } from '@/components/run/summary/RunSummaryHeroCard'
import { type SportPalette } from '@/constants/theme'
import { useSportTheme, useThemeMode } from '@/hooks/useAppTheme'
import { useGuildGoalContributionForSession } from '@/hooks/useActiveGuildGoal'
import { useActivityDetail, useLinkedMatch } from '@/hooks/useActivityDetail'
import { useActivityHistory } from '@/hooks/useActivityHistory'
import { useAnalysisProfile } from '@/hooks/useAnalysisProfile'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useAuth } from '@/hooks/useAuth'
import { useChallenge } from '@/hooks/useChallenge'
import { useFitnessTrend } from '@/hooks/useFitnessTrend'
import { useHealthWriteBack } from '@/hooks/useHealthWriteBack'
import { useMyRouteAttempts } from '@/hooks/useMyRouteAttempts'
import { useRunBodyMetrics } from '@/hooks/useRunBodyMetrics'
import { useRunDayContext } from '@/hooks/useRunDayContext'
import { useRunGpxExport } from '@/hooks/useRunGpxExport'
import { useRunSummaryExport } from '@/hooks/useRunSummaryExport'
import { useVerifyRouteMatch } from '@/hooks/useVerifyRouteMatch'
import { buildRunInsightInputFromActivity } from '@/lib/run-insights'
import type { RouteQualityGateResult } from '@/lib/run-tracking/routes/routeQualityGate'
import { formatPace } from '@/lib/run-tracking/gps/paceSmoothing'
import type { GpsPoint, Split } from '@/lib/run-tracking/gps/gpsTypes'
import {
  formatDistance,
  formatDuration,
  computeSplitDurationSeconds,
} from '@/lib/run-tracking/session/runSessionFormat'
import { describeRunSubmitError } from '@/lib/run-tracking/session/runSubmitErrorMessages'
import { formatRunResultDateTime } from '@/lib/run-tracking/summary/runResultMetrics'
import { guardedRouter } from '@/lib/navigation/guardedRouter'
import { RunRecapMoment } from '@/components/run/recap/RunRecapMoment'
import { createRunRecapColors, type RunRecapColors } from '@/components/run/recap/runRecapMomentStyles'
import { HeartRateCard } from '@/components/run/summary/HeartRateCard'
import { RunFormCard, hasRunFormData } from '@/components/run/summary/RunFormCard'
import { DayContextCard, hasDayContextData } from '@/components/run/summary/DayContextCard'
import { ExpandableInsightRow } from '@/components/run/summary/ExpandableInsightRow'
import { HealthSyncBar } from '@/components/run/summary/HealthSyncBar'
import { RunSummaryShareSheet } from '@/components/run/summary/RunSummaryShareSheet'
import {
  buildSoloRunRecapMoment,
  type RunPrSample,
  type RunRecapViewModel,
} from '@/lib/run-tracking/recap/runRecapMoment'

/**
 * Mode-aware theme binding for this screen. The whole page renders on the
 * RunRecapColors palette (radius 10 / border 1.5 / no shadow); `Sport` stays
 * only for semantic hues that RunRecapColors doesn't carry (match blue, guild
 * green, destructive red) — never for card surfaces/borders/body text.
 */
function useSummaryTheme() {
  const Sport = useSportTheme()
  const themeMode = useThemeMode()
  const recapColors = useMemo(() => createRunRecapColors(themeMode), [themeMode])
  const styles = useMemo(
    () => createStyles(Sport, recapColors),
    [Sport, recapColors],
  )
  return { styles, Sport, recapColors }
}

// Splits card lives directly above the new heart-rate / form / day-context
// cards, so it shares the same RunRecapColors palette (surfaceCard/tileBorder
// baked into styles.splitsCard) — the shared `sectionTitle`/`sectionMeta`
// StyleSheet keys stay untouched since mapCard reuses them too.
function PaceSplitsCard({ splits }: { splits: Split[] }) {
  const { styles, recapColors } = useSummaryTheme()
  if (splits.length === 0) return null

  const maxPace = Math.max(...splits.map((split) => split.paceSecondsPerKm))
  const fastestPace = Math.min(...splits.map((split) => split.paceSecondsPerKm))

  return (
    <View style={styles.splitsCard}>
      <View style={styles.sectionHeadingRow}>
        <Text style={styles.sectionTitle}>PACE รายกิโล</Text>
        <Text style={styles.sectionMeta}>{splits.length} km</Text>
      </View>
      <View style={styles.chartBars}>
        {splits.map((split) => {
          const heightPct = Math.max(12, (split.paceSecondsPerKm / maxPace) * 100)

          return (
            <View key={split.km} style={styles.barColumn}>
              <Text style={styles.barLabelTop}>
                {formatPace(split.paceSecondsPerKm)}
              </Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { height: `${heightPct}%` }]} />
              </View>
              <Text style={styles.barLabelBottom}>{split.km}</Text>
            </View>
          )
        })}
      </View>
      <View style={styles.splitsDivider} />
      <View style={styles.splitSubheadingRow}>
        <Text style={styles.splitSubheading}>เวลารายกิโล</Text>
      </View>
      <View style={styles.splitHeaderRow}>
        <Text style={[styles.splitCell, styles.splitKmCol, styles.splitHeaderText]}>กม.</Text>
        <Text style={[styles.splitCell, styles.splitTimeCol, styles.splitHeaderText]}>เวลา</Text>
        <Text style={[styles.splitCell, styles.splitPaceCol, styles.splitHeaderText]}>PACE</Text>
      </View>
      {splits.map((split, i) => {
        const isFastest = split.paceSecondsPerKm === fastestPace
        return (
          <View
            key={split.km}
            style={[
              styles.splitRow,
              isFastest && { backgroundColor: `${recapColors.accent}22` },
            ]}
          >
            <Text
              style={[
                styles.splitCell,
                styles.splitKmCol,
                styles.splitValue,
                isFastest && { color: recapColors.accent },
              ]}
            >
              {split.km}
            </Text>
            <Text style={[styles.splitCell, styles.splitTimeCol, styles.splitValue]}>
              {formatDuration(computeSplitDurationSeconds(splits, i))}
            </Text>
            <Text
              style={[
                styles.splitCell,
                styles.splitPaceCol,
                styles.splitValue,
                isFastest && { color: recapColors.accent },
              ]}
            >
              {formatPace(split.paceSecondsPerKm)}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

export default function RunSummaryScreen() {
  const { styles, Sport, recapColors } = useSummaryTheme()
  const themeMode = useThemeMode()
  const mapTone = themeMode === 'dark' ? 'runDark' : 'runLight'
  const {
    sessionId,
    challengeId,
    matchId,
    moment,
    routeRewardPoints,
  } = useLocalSearchParams<{
    sessionId: string
    challengeId?: string
    matchId?: string
    moment?: string
    routeRewardPoints?: string
  }>()
  const { data: activity, isPending, error } = useActivityDetail(sessionId)
  const { user } = useAuth()
  const { data: analysisProfile } = useAnalysisProfile(user?.id)
  const { data: match } = useLinkedMatch(sessionId)
  const { data: activityHistory, isPending: isActivityHistoryPending } = useActivityHistory(user?.id)
  const { data: guildContribution } = useGuildGoalContributionForSession(sessionId)
  const { data: challenge } = useChallenge(challengeId)
  const { data: routeAttempts, isPending: isRouteAttemptsPending } = useMyRouteAttempts(challengeId, 5)
  const healthWriteBack = useHealthWriteBack(activity)
  const verifyMutation = useVerifyRouteMatch()
  const routeVerifyData = verifyMutation.data
  const routeVerifyIsPending = verifyMutation.isPending
  const verifyRoute = verifyMutation.mutate
  const { track } = useAnalytics()
  const runSummaryExport = useRunSummaryExport()
  const runGpxExport = useRunGpxExport()
  const [scrollEnabled, setScrollEnabled] = useState(true)
  const [isSharePopupOpen, setIsSharePopupOpen] = useState(false)
  const campaignRecapTrackedKey = useRef<string | null>(null)
  const autoVerifyKeyRef = useRef<string | null>(null)
  const resultCardCaptureRef = useRef<View>(null)
  const runDetails = activity?.running_activity_details ?? null
  const path = (runDetails?.route_summary as { path?: GpsPoint[] } | null)?.path ?? []
  const splits = (runDetails?.splits ?? []) as Split[]

  const priorRunSamples = useMemo<RunPrSample[]>(() => {
    if (!activity || !activityHistory) return []
    return activityHistory
      .filter((item) =>
        item.id !== activity.id &&
        item.activity_type === 'running' &&
        Boolean(item.running_activity_details),
      )
      .map((item) => ({
        distanceMeters: item.running_activity_details?.distance_meters ?? null,
        movingTimeSeconds: item.running_activity_details?.moving_time_seconds ?? null,
        paceSecondsPerKm: item.running_activity_details?.pace_seconds_per_km ?? null,
      }))
  }, [activity, activityHistory])

  const recapViewModel = useMemo<RunRecapViewModel | null>(() => {
    if (!runDetails) return null
    return buildSoloRunRecapMoment({
      distanceMeters: runDetails.distance_meters ?? null,
      movingTimeSeconds: runDetails.moving_time_seconds ?? null,
      paceSecondsPerKm: runDetails.pace_seconds_per_km ?? null,
      pointDelta: activity?.point_delta ?? null,
      splits,
      priorRuns: priorRunSamples,
    })
  }, [runDetails, activity?.point_delta, splits, priorRunSamples])

  // Body metrics (HR zones, calories, cadence) need the run's real wall-clock
  // window to read HealthKit/Health Connect samples; ended_at is only set
  // once the session record is fully written server-side.
  const activityWindow = useMemo(() => {
    if (!activity?.started_at || !activity?.ended_at) return null
    return { start: new Date(activity.started_at), end: new Date(activity.ended_at) }
  }, [activity?.started_at, activity?.ended_at])

  const bodyMetrics = useRunBodyMetrics({
    sessionId,
    window: activityWindow,
    movingTimeSeconds: runDetails?.moving_time_seconds ?? null,
    distanceMeters: runDetails?.distance_meters ?? null,
    paceSecondsPerKm: runDetails?.pace_seconds_per_km ?? null,
    pedometerSteps: runDetails?.steps ?? null,
    deviceCalories: runDetails?.calories ?? null,
  })
  const fitnessTrend = useFitnessTrend(7)
  const dayContext = useRunDayContext(runDetails?.steps ?? null)

  const [isMomentOpen, setIsMomentOpen] = useState(false)
  const momentShownRef = useRef(false)
  const bodyViewedTrackedRef = useRef(false)

  const runHistoryInputs = useMemo(() => {
    if (!activity || !activityHistory) return undefined
    return activityHistory
      .filter((item) =>
        item.id !== activity.id &&
        item.activity_type === 'running' &&
        Boolean(item.running_activity_details)
      )
      .map((item) => buildRunInsightInputFromActivity(item, analysisProfile))
  }, [activity, activityHistory, analysisProfile])
  const insightInput = useMemo(() => {
    if (!activity?.running_activity_details) return null
    const input = buildRunInsightInputFromActivity(activity, analysisProfile)
    return runHistoryInputs ? { ...input, history: runHistoryInputs } : input
  }, [activity, analysisProfile, runHistoryInputs])
  const routeQuality = insightInput?.routeQuality ?? null
  const campaign = challenge?.campaigns ?? null
  const campaignSkin = campaign?.skin ?? {}
  const campaignAccent = campaignSkin.accentColor ?? campaignSkin.primaryColor ?? Sport.red
  const localRouteRewardPoints = readPositiveIntegerParam(routeRewardPoints)

  useEffect(() => {
    if (!challengeId || !sessionId || path.length === 0) return
    if (routeVerifyData || routeVerifyIsPending) return

    const key = `${challengeId}:${sessionId}`
    if (autoVerifyKeyRef.current === key) return

    autoVerifyKeyRef.current = key
    verifyRoute({ challengeId, activitySessionId: sessionId })
  }, [
    challengeId,
    path.length,
    routeVerifyData,
    routeVerifyIsPending,
    sessionId,
    verifyRoute,
  ])

  useEffect(() => {
    if (!campaign?.id || !challengeId || !activity) return
    const key = `${campaign.id}:${activity.id}:recap`
    if (campaignRecapTrackedKey.current === key) return
    campaignRecapTrackedKey.current = key
    track({
      name: 'screen_viewed',
      properties: {
        event_schema_version: 2,
        source: 'client',
        surface: 'run_summary',
        campaign_id: campaign.id,
        campaign_slug: campaign.slug,
        challenge_id: challengeId,
        entrypoint: 'run_summary',
        screen: 'run_summary',
        has_campaign_skin: true,
      },
    })
    track({
      name: 'flow_step_completed',
      properties: {
        event_schema_version: 2,
        source: 'client',
        surface: 'run_summary',
        campaign_id: campaign.id,
        campaign_slug: campaign.slug,
        challenge_id: challengeId,
        entrypoint: 'run_summary',
        flow: 'recap_continuation',
        step: 'recap_viewed',
      },
    })
  }, [activity, campaign, challengeId, track])

  useEffect(() => {
    if (matchId) return
    if (moment !== '1') return
    if (momentShownRef.current) return
    if (!activity || !recapViewModel) return
    if (user?.id && isActivityHistoryPending) return
    momentShownRef.current = true
    setIsMomentOpen(true)
    track({
      name: 'run_recap_moment_shown',
      properties: {
        tone: recapViewModel.tone,
        point_delta: recapViewModel.pointDelta,
        has_pr: recapViewModel.prs.length > 0,
        pr_kinds: recapViewModel.prs,
        has_splits: recapViewModel.splitPaces.length >= 2,
      },
    })
  }, [matchId, moment, activity, recapViewModel, user?.id, isActivityHistoryPending, track])

  useEffect(() => {
    if (!isMomentOpen) return
    if (bodyViewedTrackedRef.current) return
    if (!bodyMetrics.data) return
    bodyViewedTrackedRef.current = true
    track({
      name: 'recap_body_viewed',
      properties: {
        has_hr: bodyMetrics.data.avgBpm != null,
        intensity_level: bodyMetrics.data.intensityLevel,
      },
    })
  }, [isMomentOpen, bodyMetrics.data, track])

  if (isPending) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={recapColors.accent} />
      </SafeAreaView>
    )
  }

  if (error || !activity) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <MaterialCommunityIcons name="alert-circle-outline" size={28} color={Sport.red} />
        <Text style={styles.errorText}>{toReadableRunError(error, 'เปิดข้อมูลการวิ่งไม่ได้ ลองใหม่อีกครั้ง')}</Text>
        <Pressable
          style={[styles.button, styles.btnPrimary]}
          onPress={() => guardedRouter.dismissTo('/', { actionKey: 'run-summary:error-home' })}
        >
          <Text style={styles.buttonTextPrimary}>กลับหน้าหลัก</Text>
        </Pressable>
      </SafeAreaView>
    )
  }

  const finishLocation = path.length > 0 ? path[path.length - 1] : null
  const isShortRun = (runDetails?.distance_meters ?? 0) < 1000
  const latestRouteAttempt = routeAttempts?.attempts[0] ?? null
  const bestRouteScore =
    verifyMutation.data?.bestMatchScore ??
    routeAttempts?.bestMatchScore ??
    latestRouteAttempt?.matchScore ??
    null
  const myChallengeParticipation =
    challenge?.participants.find((participant) => participant.user_id === user?.id) ?? null
  const challengeProgressRatio =
    challenge && (verifyMutation.data || myChallengeParticipation)
      ? Math.min(1, (verifyMutation.data?.progress ?? myChallengeParticipation?.progress ?? 0) / challenge.goal_value)
      : null
  const isChallengeComplete =
    Boolean(verifyMutation.data?.challengeCompleted) || Boolean(myChallengeParticipation?.completed_at)

  const resultDateTimeText = formatRunResultDateTime(activity.started_at)
  const heroCaloriesKcal = runDetails?.calories ?? bodyMetrics.data?.caloriesKcal ?? null
  const activityStartedAt = activity.started_at
  // Border-only override so RunFormCard/DayContextCard read as "expanded" when
  // nested inside ExpandableInsightRow, without introducing a second nested
  // border around them.
  const insightAccentColors = { ...recapColors, tileBorder: recapColors.accent }

  function handleExportSummaryImage() {
    track({ name: 'run_summary_image_export_attempted' })
    runSummaryExport.saveToGallery(resultCardCaptureRef).then((result) => {
      if (result === 'saved') {
        track({ name: 'run_summary_image_export_succeeded' })
      } else {
        track({
          name: 'run_summary_image_export_failed',
          properties: { reason: runSummaryExport.errorMessage ?? 'unknown' },
        })
      }
    })
  }

  function handleExportGpx() {
    track({ name: 'run_summary_gpx_export_attempted' })
    runGpxExport.exportGpx({
      name: `Rally Run · ${resultDateTimeText}`,
      startedAtIso: activityStartedAt,
      points: path,
    }).then((result) => {
      if (result === 'shared') {
        track({ name: 'run_summary_gpx_export_succeeded' })
      } else {
        track({
          name: 'run_summary_gpx_export_failed',
          properties: { reason: runGpxExport.errorMessage ?? 'unknown' },
        })
      }
    })
  }

  function handleShareSheetShare() {
    if (campaign?.id) {
      track({
        name: 'interaction_performed',
        properties: {
          event_schema_version: 2,
          source: 'client',
          surface: 'run_summary',
          campaign_id: campaign.id,
          campaign_slug: campaign.slug,
          challenge_id: challengeId,
          entrypoint: 'run_summary',
          interaction: 'recap_share',
          target: 'share_run',
        },
      })
    }
    setIsSharePopupOpen(false)
    guardedRouter.push({
      pathname: '/run/share/[sessionId]',
      params: { sessionId },
    }, { actionKey: `run-summary:${sessionId}:share` })
  }

  function handleShareSheetSaveImage() {
    setIsSharePopupOpen(false)
    handleExportSummaryImage()
  }

  function handleShareSheetExportGpx() {
    setIsSharePopupOpen(false)
    handleExportGpx()
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView scrollEnabled={scrollEnabled} contentContainerStyle={styles.scrollContent}>
        <View style={styles.topBar}>
          <Pressable
            style={styles.iconButton}
            onPress={() => guardedRouter.dismissTo('/', { actionKey: `run-summary:${sessionId}:close-home` })}
            accessibilityRole="button"
            accessibilityLabel="ปิด"
          >
            <MaterialCommunityIcons name="close" size={18} color={recapColors.heroInk} />
          </Pressable>
        </View>

        {runDetails ? (
          <>
            <View ref={resultCardCaptureRef} collapsable={false}>
              <RunSummaryHeroCard
                dateTimeText={resultDateTimeText}
                distanceMeters={runDetails.distance_meters}
                movingTimeSeconds={runDetails.moving_time_seconds}
                paceSecondsPerKm={runDetails.pace_seconds_per_km}
                caloriesKcal={heroCaloriesKcal}
                pointDelta={activity.point_delta}
                routeRewardPoints={localRouteRewardPoints}
                colors={recapColors}
              />
            </View>

            <View style={[styles.mapCard, isShortRun && styles.mapCardCompact]}>
              <View style={styles.sectionHeadingRow}>
                <Text style={styles.sectionTitle}>แผนที่เส้นทาง</Text>
              </View>
              <View
                style={[styles.mapContainer, isShortRun && styles.mapContainerCompact]}
                onTouchStart={() => setScrollEnabled(false)}
                onTouchEnd={() => setScrollEnabled(true)}
                onTouchCancel={() => setScrollEnabled(true)}
              >
                <MapLibreRunView
                  path={path}
                  warmStartLocation={finishLocation}
                  isLive={false}
                  fitRouteTightly
                  tightRoutePaddingPx={18}
                  showStylePicker
                  showRecenterControl={false}
                  tone={mapTone}
                  mapBorderRadius={18}
                />
              </View>
              {splits.length === 0 && (
                <View style={styles.splitHint}>
                  <MaterialCommunityIcons name="chart-bar" size={14} color={recapColors.subText} />
                  <Text style={styles.splitHintText}>สปลิตเริ่มนับหลังครบ 1 กม.</Text>
                </View>
              )}
            </View>

            {bodyMetrics.data && <HeartRateCard body={bodyMetrics.data} colors={recapColors} />}
            <PaceSplitsCard splits={splits} />
            <ExpandableInsightRow
              formHasData={Boolean(bodyMetrics.data && hasRunFormData(bodyMetrics.data))}
              dayHasData={hasDayContextData(dayContext.data.stepsPercentOfDay, fitnessTrend.data)}
              formCard={
                bodyMetrics.data ? (
                  <RunFormCard body={bodyMetrics.data} colors={insightAccentColors} />
                ) : null
              }
              dayCard={
                <DayContextCard
                  percent={dayContext.data.stepsPercentOfDay}
                  trend={fitnessTrend.data}
                  colors={insightAccentColors}
                />
              }
              colors={recapColors}
            />

            {healthWriteBack.canWriteBack && (
              <HealthSyncBar
                targetName={healthWriteBack.targetName}
                status={healthWriteBack.status}
                isLoadingStatus={healthWriteBack.isLoadingStatus}
                isSaving={healthWriteBack.isSaving}
                onSave={healthWriteBack.save}
                syncColor={Sport.greenVivid}
                errorColor={Sport.red}
                colors={recapColors}
              />
            )}
          </>
        ) : (
          <View style={styles.emptyPanel}>
            <MaterialCommunityIcons name="run-fast" size={18} color={Sport.muted} />
            <Text style={styles.emptyText}>ยังไม่มีรายละเอียดการวิ่ง</Text>
          </View>
        )}

        {match && (
          <View style={styles.linkedCard}>
            <View style={styles.sectionHeadingRow}>
              <Text style={styles.linkedLabel}>แมตช์ที่ผูกไว้</Text>
              <MaterialCommunityIcons name="sword-cross" size={16} color={Sport.blue} />
            </View>
            <Text style={styles.linkedText}>ประเภทกิจกรรม: {match.activity_type}</Text>
            <Text style={styles.linkedText}>สถานะ: {match.status}</Text>
          </View>
        )}

        {guildContribution && (
          <View style={styles.guildContributionCard}>
            <View style={styles.sectionHeadingRow}>
              <Text style={styles.guildContributionLabel}>
                {guildContribution.partner
                  ? `เป้าหมายกิลด์พันธมิตร · ${guildContribution.partner.name}`
                  : 'เป้าหมายกิลด์'}
              </Text>
              <MaterialCommunityIcons name="shield-star-outline" size={16} color={Sport.green} />
            </View>
            <Text style={styles.guildContributionTitle}>{guildContribution.goalLabel}</Text>
            <Text style={styles.guildContributionText}>
              +{formatGuildContributionAmount(guildContribution.amount, guildContribution.metric)} · {' '}
              {Math.round(guildContribution.progressRatio * 100)}% สำเร็จ
            </Text>
          </View>
        )}

        {campaign && (
          <View style={[styles.campaignRecapCard, { borderColor: `${campaignAccent}66`, backgroundColor: campaignSkin.backgroundColor ?? recapColors.surfaceCard }]}>
            <View style={styles.sectionHeadingRow}>
              <Text style={styles.campaignRecapLabel}>{campaign.title}</Text>
              <MaterialCommunityIcons name="flag-variant" size={16} color={campaignAccent} />
            </View>
            <Text style={styles.campaignRecapText}>
              {campaignSkin.recapCopy || campaignSkin.eventStoryCopy || campaign.short_prompt}
            </Text>
            <Pressable
              style={[styles.button, styles.btnOutline, { borderColor: `${campaignAccent}66` }]}
              onPress={() => {
                track({
                  name: 'interaction_performed',
                  properties: {
                    event_schema_version: 2,
                    source: 'client',
                    surface: 'run_summary',
                    campaign_id: campaign.id,
                    campaign_slug: campaign.slug,
                    challenge_id: challengeId,
                    entrypoint: 'run_summary',
                    interaction: 'recap_next_challenge',
                    target: 'campaign_hub',
                  },
                })
                guardedRouter.push(`/campaigns/${campaign.slug}`, { actionKey: `run-summary:${sessionId}:campaign` })
              }}
            >
              <MaterialCommunityIcons name="arrow-right-circle-outline" size={18} color={campaignAccent} />
              <Text style={[styles.buttonTextOutline, { color: campaignAccent }]}>
                {campaignSkin.ctaLabel || 'ชาเลนจ์ถัดไป'}
              </Text>
            </Pressable>
          </View>
        )}

        {challengeId && path.length > 0 && (
          <View style={styles.verifyCard}>
            <View style={styles.sectionHeadingRow}>
              <Text style={styles.verifyLabel}>ชาเลนจ์เส้นทาง</Text>
              <View style={styles.verifyStatusPill}>
                {verifyMutation.isPending ? (
                  <ActivityIndicator size="small" color={Sport.green} />
                ) : (
                  <MaterialCommunityIcons name="map-check-outline" size={14} color={Sport.green} />
                )}
                <Text style={styles.verifyStatusText}>
                  {verifyMutation.isPending
                    ? 'กำลังตรวจ'
                    : verifyMutation.data?.match.passed
                      ? 'ผ่านแล้ว'
                      : verifyMutation.data
                        ? 'ต้องลองใหม่'
                        : verifyMutation.error
                          ? 'ลองใหม่'
                          : 'เข้าคิว'}
                </Text>
              </View>
            </View>

            {verifyMutation.data ? (
              <View style={styles.verifyGrid}>
                <VerifyMetric
                  label="รอบนี้"
                  value={formatPercent(verifyMutation.data.match.matchScore)}
                />
                <VerifyMetric
                  label="คะแนนดีสุด"
                  value={bestRouteScore == null ? '--' : formatPercent(bestRouteScore)}
                />
                <VerifyMetric
                  label="อยู่ในเกณฑ์"
                  value={formatPercent(verifyMutation.data.match.withinToleranceRatio)}
                />
                <VerifyMetric
                  label="ครอบคลุม"
                  value={formatPercent(verifyMutation.data.match.lengthCoverage)}
                />
                <VerifyMetric
                  label="ทิศทาง"
                  value={formatPercent(verifyMutation.data.match.waypointOrderScore)}
                />
                <VerifyMetric
                  label="ออกนอกเส้นทาง"
                  value={`${verifyMutation.data.match.diagnostics.outOfBoundsExcursionCount} ครั้ง`}
                />
                <VerifyMetric
                  label="ช่วงหลุดยาวสุด"
                  value={formatMeters(verifyMutation.data.match.diagnostics.longestExcursionMeters)}
                />
                {challengeProgressRatio != null && (
                  <VerifyMetric
                    label="คืบหน้าชาเลนจ์"
                    value={`${formatPercent(challengeProgressRatio)}${isChallengeComplete ? ' สำเร็จ' : ''}`}
                  />
                )}
                <VerifyMetric
                  label="จุด GPS"
                  value={`${verifyMutation.data.match.diagnostics.pointsWithinTolerance}/${verifyMutation.data.match.diagnostics.pointsTotal}`}
                />
                {routeQuality && routeQuality.status !== 'good' && routeQuality.message ? (
                  <Text style={styles.verifyQualityNote}>
                    {formatRouteQualityChallengeNote(routeQuality)}
                  </Text>
                ) : null}
                <Text
                  style={[
                    styles.verifyResult,
                    { color: verifyMutation.data.match.passed ? Sport.green : Sport.red },
                  ]}
                >
                  {verifyMutation.data.match.passed
                    ? verifyMutation.data.alreadyExists
                      ? 'ผ่านแล้ว · เส้นทางนี้บันทึกไว้ก่อนแล้ว'
                      : 'ผ่านแล้ว · อัปเดตความคืบหน้าแล้ว'
                    : 'ยังไม่ผ่าน ลองวิ่งเส้นทางนี้ใหม่ หรือกดลองใหม่ถ้า GPS เพี้ยน'}
                </Text>
              </View>
            ) : verifyMutation.error ? (
              <Text style={[styles.verifyText, { color: Sport.red }]}>
                {toReadableRunError(verifyMutation.error, 'ตรวจเส้นทางไม่สำเร็จ กดลองใหม่อีกครั้ง')}
              </Text>
            ) : verifyMutation.isPending ? (
              <Text style={styles.verifyText}>
                กำลังเทียบการวิ่งนี้กับเส้นทางที่วางไว้ และอัปเดตความคืบหน้าชาเลนจ์
              </Text>
            ) : (
              <Text style={styles.verifyText}>คิวตรวจเส้นทางของการวิ่งนี้ไว้แล้ว</Text>
            )}

            {latestRouteAttempt && !verifyMutation.data && (
              <Text style={styles.verifyText}>
                สถิติเดิม: {bestRouteScore == null ? '--' : formatPercent(bestRouteScore)}
                {isRouteAttemptsPending ? '' : ` · รอบล่าสุด ${formatPercent(latestRouteAttempt.matchScore)}`}
              </Text>
            )}

            {verifyMutation.error && (
              <Pressable
                disabled={verifyMutation.isPending}
                style={[
                  styles.button,
                  styles.btnPrimary,
                  styles.verifyButton,
                  verifyMutation.isPending && styles.buttonDisabled,
                ]}
                onPress={() => verifyMutation.mutate({ challengeId, activitySessionId: sessionId })}
              >
                <MaterialCommunityIcons name="map-check-outline" size={18} color={recapColors.onAccent} />
                <Text style={styles.buttonTextPrimary}>
                  {verifyMutation.isPending ? 'กำลังตรวจ' : 'ตรวจเส้นทางอีกครั้ง'}
                </Text>
              </Pressable>
            )}
          </View>
        )}

        <View style={styles.actionsRow}>
          <Pressable
            style={[styles.actionBtn, styles.actionBtnPrimary]}
            onPress={() => setIsSharePopupOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="เปิดเมนูแชร์"
          >
            <MaterialCommunityIcons name="share-variant" size={18} color={recapColors.onAccent} />
            <Text style={styles.actionBtnPrimaryText}>แชร์</Text>
          </Pressable>
          {matchId && !match ? (
            <Pressable
              style={[styles.actionBtn, styles.actionBtnBordered]}
              onPress={() => guardedRouter.replace(`/match/${matchId}/submit`, {
                actionKey: `run-summary:${sessionId}:use-match:${matchId}`,
              })}
            >
              <MaterialCommunityIcons name="account-check-outline" size={18} color={recapColors.heroInk} />
              <Text style={styles.actionBtnBorderedText}>ใช้กับแมตช์</Text>
            </Pressable>
          ) : match ? (
            <Pressable
              style={[styles.actionBtn, styles.actionBtnBordered]}
              onPress={() => guardedRouter.replace(`/match/${match.match_id}`, {
                actionKey: `run-summary:${sessionId}:match:${match.match_id}`,
              })}
            >
              <MaterialCommunityIcons name="sword-cross" size={18} color={recapColors.heroInk} />
              <Text style={styles.actionBtnBorderedText}>ดูแมตช์</Text>
            </Pressable>
          ) : path.length >= 10 ? (
            <Pressable
              style={[styles.actionBtn, styles.actionBtnBordered]}
              onPress={() => guardedRouter.push({
                pathname: '/run/replay/[sessionId]',
                params: { sessionId },
              }, { actionKey: `run-summary:${sessionId}:replay` })}
            >
              <MaterialCommunityIcons name="cube-scan" size={18} color={recapColors.heroInk} />
              <Text style={styles.actionBtnBorderedText}>3D Replay</Text>
            </Pressable>
          ) : null}
        </View>

        {runSummaryExport.status === 'saved' && (
          <Text style={styles.exportFeedbackText}>บันทึกลงแกลเลอรีแล้ว</Text>
        )}
        {runSummaryExport.status === 'failed' && runSummaryExport.errorMessage && (
          <Text style={[styles.exportFeedbackText, styles.exportFeedbackError]}>
            {runSummaryExport.errorMessage}
          </Text>
        )}
        {runGpxExport.status === 'shared' && (
          <Text style={styles.exportFeedbackText}>เปิดหน้าต่างแชร์ไฟล์ GPX แล้ว</Text>
        )}
        {runGpxExport.status === 'failed' && runGpxExport.errorMessage && (
          <Text style={[styles.exportFeedbackText, styles.exportFeedbackError]}>
            {runGpxExport.errorMessage}
          </Text>
        )}

        <Pressable
          style={styles.homeLink}
          onPress={() => guardedRouter.dismissTo('/', { actionKey: `run-summary:${sessionId}:home` })}
        >
          <MaterialCommunityIcons name="home-outline" size={16} color={recapColors.subText} />
          <Text style={styles.homeLinkText}>กลับหน้าหลัก</Text>
        </Pressable>
      </ScrollView>
      <RunSummaryShareSheet
        visible={isSharePopupOpen}
        onClose={() => setIsSharePopupOpen(false)}
        onShare={handleShareSheetShare}
        onSaveImage={handleShareSheetSaveImage}
        onExportGpx={handleShareSheetExportGpx}
        showGpxOption={path.length >= 2}
        isSavingImage={runSummaryExport.isSaving}
        isExportingGpx={runGpxExport.isExporting}
        colors={recapColors}
      />
      <RunRecapMoment
        visible={isMomentOpen}
        viewModel={recapViewModel}
        body={bodyMetrics.data}
        onViewDetails={() => {
          if (recapViewModel) track({ name: 'run_recap_action_tapped', properties: { action: 'details', tone: recapViewModel.tone } })
          setIsMomentOpen(false)
        }}
        onShare={() => {
          if (recapViewModel) track({ name: 'run_recap_action_tapped', properties: { action: 'share', tone: recapViewModel.tone } })
          setIsMomentOpen(false)
          guardedRouter.push({
            pathname: '/run/share/[sessionId]',
            params: { sessionId },
          }, { actionKey: `run-summary:${sessionId}:recap-share` })
        }}
        onHome={() => {
          if (recapViewModel) track({ name: 'run_recap_action_tapped', properties: { action: 'home', tone: recapViewModel.tone } })
          guardedRouter.dismissTo('/', { actionKey: `run-summary:${sessionId}:recap-home` })
        }}
        onDismiss={() => setIsMomentOpen(false)}
      />
    </SafeAreaView>
  )
}

function readPositiveIntegerParam(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw) return 0
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function VerifyMetric({ label, value }: { label: string; value: string }) {
  const { styles } = useSummaryTheme()
  return (
    <View style={styles.verifyMetric}>
      <Text style={styles.verifyMetricLabel}>{label}</Text>
      <Text style={styles.verifyMetricValue}>{value}</Text>
    </View>
  )
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function formatMeters(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)} km`
  return `${Math.round(value)} m`
}

function formatRouteQualityChallengeNote(routeQuality: RouteQualityGateResult): string {
  // routeQuality.message มาจาก lib (routeQualityGate) ที่ยังเป็นอังกฤษและถูก test ล็อกไว้
  return `${routeQuality.message} ผลชาเลนจ์ยังตัดสินจากตัวจับคู่เส้นทางของ Rally`
}

// error ที่มี code (edge envelope / RPC) แปลผ่าน central map เป็นไทยก่อน;
// ข้อความที่เป็นไทยอยู่แล้วส่งผ่านได้ ที่เหลือ (อังกฤษ/technical) ใช้ fallback
function toReadableRunError(error: unknown, fallback: string): string {
  const coded = describeRunSubmitError(error)
  if (coded) return coded
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : undefined
  if (message && /[ก-๙]/.test(message)) return message
  return fallback
}

function formatGuildContributionAmount(amount: number, metric: string): string {
  if (metric === 'distance_meters') return formatDistance(amount)
  if (metric === 'duration_seconds') return formatDuration(amount)
  if (metric === 'sessions') return `${amount} ครั้ง`
  return String(amount)
}

function createStyles(Sport: SportPalette, recap: RunRecapColors) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: recap.cardBg },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: recap.cardBg,
    padding: 20,
    gap: 14,
  },
  scrollContent: { padding: 20, paddingBottom: 36 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 14,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: recap.tileBg,
    borderWidth: 1.5,
    borderColor: recap.tileBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapCard: {
    minHeight: 338,
    padding: 14,
    borderRadius: 10,
    backgroundColor: recap.surfaceCard,
    borderWidth: 1.5,
    borderColor: recap.tileBorder,
    marginBottom: 18,
  },
  mapCardCompact: {
    minHeight: 300,
    marginBottom: 14,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: { color: recap.heroInk, fontSize: 17, fontWeight: '900' },
  sectionMeta: { color: recap.subText, fontSize: 12, fontWeight: '800' },
  mapContainer: { flex: 1, minHeight: 260, borderRadius: 8, overflow: 'hidden', marginTop: 12 },
  mapContainerCompact: { minHeight: 220 },
  splitHint: {
    minHeight: 34,
    marginTop: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: recap.tileBg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  splitHintText: { color: recap.subText, fontSize: 11, fontWeight: '800', flex: 1 },
  splitsCard: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: recap.surfaceCard,
    borderWidth: 1.5,
    borderColor: recap.tileBorder,
    marginBottom: 18,
  },
  chartBars: {
    flexDirection: 'row',
    height: 154,
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingTop: 14,
  },
  barColumn: { alignItems: 'center', flex: 1, minWidth: 42 },
  barTrack: {
    width: 24,
    height: 100,
    backgroundColor: recap.sparkMuted,
    borderRadius: 12,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    marginVertical: 8,
  },
  barFill: { width: '100%', backgroundColor: recap.accent, borderRadius: 12 },
  barLabelTop: { fontSize: 10, color: recap.subText, fontWeight: '800' },
  barLabelBottom: { fontSize: 12, color: recap.heroInk, fontWeight: '900' },
  splitsDivider: {
    height: 1,
    backgroundColor: recap.tileBorder,
    marginTop: 2,
    marginBottom: 12,
  },
  splitSubheadingRow: {
    minHeight: 22,
    justifyContent: 'center',
  },
  splitSubheading: { color: recap.heroInk, fontSize: 15, fontWeight: '900' },
  splitHeaderRow: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  splitRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  splitCell: {
    fontSize: 13,
    fontWeight: '800',
  },
  splitKmCol: { width: 36 },
  splitTimeCol: { flex: 1 },
  splitPaceCol: { flex: 1, textAlign: 'right' },
  splitHeaderText: { color: recap.subText, fontSize: 11 },
  splitValue: { color: recap.heroInk },
  emptyPanel: {
    padding: 18,
    borderRadius: 10,
    backgroundColor: recap.surfaceCard,
    borderWidth: 1.5,
    borderColor: recap.tileBorder,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  emptyText: { color: recap.subText, fontSize: 13, fontWeight: '700', flex: 1 },
  linkedCard: {
    padding: 16,
    borderRadius: 10,
    backgroundColor: recap.surfaceCard,
    borderWidth: 1.5,
    borderColor: recap.tileBorder,
    marginBottom: 16,
  },
  linkedLabel: { color: Sport.blue, fontSize: 14, fontWeight: '900' },
  linkedText: { color: recap.subText, fontSize: 13, fontWeight: '700', marginTop: 8 },
  guildContributionCard: {
    padding: 16,
    borderRadius: 10,
    backgroundColor: recap.surfaceCard,
    borderWidth: 1.5,
    borderColor: recap.tileBorder,
    marginBottom: 16,
  },
  campaignRecapCard: {
    backgroundColor: recap.surfaceCard,
    borderRadius: 10,
    borderWidth: 1.5,
    padding: 14,
    gap: 10,
  },
  campaignRecapLabel: { color: recap.heroInk, fontWeight: '900', fontSize: 13, letterSpacing: 0 },
  campaignRecapText: { color: recap.subText, fontSize: 13, lineHeight: 19, fontWeight: '700' },
  guildContributionLabel: { color: Sport.green, fontSize: 14, fontWeight: '900' },
  guildContributionTitle: { color: recap.heroInk, fontSize: 16, fontWeight: '900', marginTop: 10 },
  guildContributionText: { color: recap.subText, fontSize: 13, fontWeight: '800', marginTop: 6 },
  verifyCard: {
    padding: 16,
    borderRadius: 10,
    backgroundColor: recap.surfaceCard,
    borderWidth: 1.5,
    borderColor: recap.tileBorder,
    marginBottom: 16,
  },
  verifyLabel: { color: Sport.green, fontSize: 14, fontWeight: '900' },
  verifyStatusPill: {
    minHeight: 30,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: recap.tileBg,
    borderWidth: 1.5,
    borderColor: recap.tileBorder,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  verifyStatusText: {
    color: recap.heroInk,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  verifyText: { color: recap.subText, fontSize: 13, fontWeight: '700', marginTop: 12 },
  verifyQualityNote: {
    color: recap.subText,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
    marginTop: 4,
  },
  verifyGrid: { marginTop: 12, gap: 8 },
  verifyMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  verifyMetricLabel: { color: recap.subText, fontSize: 12, fontWeight: '800' },
  verifyMetricValue: { color: recap.heroInk, fontSize: 13, fontWeight: '900' },
  verifyResult: { fontSize: 14, fontWeight: '900', marginTop: 4 },
  verifyButton: { marginTop: 14 },
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 2 },
  actionBtn: {
    flex: 1,
    minHeight: 52,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  actionBtnPrimary: { backgroundColor: recap.accent },
  actionBtnBordered: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: recap.accent,
  },
  actionBtnPrimaryText: { color: recap.onAccent, fontSize: 15, fontWeight: '900' },
  actionBtnBorderedText: { color: recap.heroInk, fontSize: 15, fontWeight: '900' },
  exportFeedbackText: {
    color: recap.accent,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 10,
  },
  exportFeedbackError: { color: Sport.red },
  homeLink: {
    minHeight: 44,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  homeLinkText: { color: recap.subText, fontSize: 14, fontWeight: '800' },
  button: {
    minHeight: 52,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  btnPrimary: { backgroundColor: recap.accent },
  btnOutline: {
    backgroundColor: recap.tileBg,
    borderWidth: 1.5,
    borderColor: recap.tileBorder,
  },
  buttonDisabled: { opacity: 0.55 },
  buttonTextPrimary: { color: recap.onAccent, fontSize: 16, fontWeight: '900' },
  buttonTextOutline: { color: recap.subText, fontSize: 16, fontWeight: '900' },
  errorText: { color: recap.heroInk, fontSize: 15, textAlign: 'center', fontWeight: '700' },
  })
}
