import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Alert, Platform, ScrollView, Text, TextInput, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { usePreventRemove } from '@react-navigation/native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { newMatchStyles } from '@/components/match/newMatchStyles'
import {
  MatchManageActionsSheet,
  type MatchManageAction,
} from '@/components/match/MatchManageActionsSheet'
import { MutualCancelCard } from '@/components/match/MutualCancelCard'
import { PressableScale } from '@/components/motion/PressableScale'
import { Reveal } from '@/components/motion/Reveal'
import { useSportTheme } from '@/hooks/useAppTheme'
import { ProofPicker } from '@/components/match/ProofPicker'
import { MatchTimer } from '@/components/match/MatchTimer'
import { TeamSportSubmitPanel } from '@/components/match/TeamSportSubmitPanel'
import { MatchSkeleton } from '@/components/match/MatchSkeleton'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useAuth } from '@/hooks/useAuth'
import { useMatch } from '@/hooks/useMatch'
import { useMatchActions } from '@/hooks/useMatchActions'
import { useSubmitActivity } from '@/hooks/useSubmitActivity'
import { useActivityHistory } from '@/hooks/useActivityHistory'
import { useWearRunCompanion } from '@/hooks/useWearRunCompanion'
import type {
  ContributionEntry,
  SubmissionActivityType,
  TeamSportSubmissionData,
} from '@/lib/activities/submission/submissionTypes'
import type { ActivityHistoryItem } from '@/lib/activities/history/activityHistoryTypes'
import { formatPace } from '@/lib/run-tracking/gps/paceSmoothing'
import {
  formatDistance,
  formatDuration,
} from '@/lib/run-tracking/session/runSessionFormat'
import { formatMatchActionError, logMatchActionError } from '@/lib/match/matchErrorPresentation'
import { uploadProofPhotos, type LocalProofAsset } from '@/lib/match/proofUploadService'
import {
  canRequestMutualCancel,
  canRespondToMutualCancel,
  getPendingCancelRequest,
  shouldBlockBasketballPlayerFinalSubmit,
} from '@/lib/match/matchRules'
import {
  clearActiveMatchLock,
  setActiveMatchLock,
  shouldLockMatchForUser,
} from '@/lib/match/activeMatchLock'
import { getTeamScoreReadiness } from '@/lib/match/teamSportResultMoment'
import type { MatchParticipant } from '@/types/match'
import { useWearScoreDraftStore } from '@/stores/wearScoreDraftStore'
import { guardedRouter } from '@/lib/navigation/guardedRouter'

const TEAM_SPORTS: SubmissionActivityType[] = ['basketball', 'badminton']
const RUNNING_COOP_MARKERS = [
  'โหมดวิ่ง: วิ่งช่วยกันแบบคู่',
  'โหมดวิ่ง: วิ่งช่วยกันแบบกลุ่ม',
]

export default function SubmitActivityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const { data: match, isPending, error } = useMatch(id)
  const { track } = useAnalytics()
  const submitMutation = useSubmitActivity(id, user?.id)
  const { requestMutualCancelMutation, respondToMutualCancelMutation } = useMatchActions(id)
  const { data: activityHistory } = useActivityHistory(user?.id)

  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [distanceKm, setDistanceKm] = useState('')
  const [movingTimeMinutes, setMovingTimeMinutes] = useState('')
  const [claimedWinnerUserId, setClaimedWinnerUserId] = useState<string | null>(null)
  const [isTie, setIsTie] = useState(false)
  const [teamScore, setTeamScore] = useState('')
  const [contributions, setContributions] = useState<ContributionEntry[]>([])
  const [proofAssets, setProofAssets] = useState<LocalProofAsset[]>([])
  const [notes, setNotes] = useState('')
  const [uploading, setUploading] = useState(false)
  const [extrasOpen, setExtrasOpen] = useState(false)
  const [manageOpen, setManageOpen] = useState(false)
  const submitExitAllowedRef = useRef(false)
  const [submitExitAllowed, setSubmitExitAllowed] = useState(false)
  const wearScoreDraft = useWearScoreDraftStore((state) => id ? state.drafts[id] : undefined)
  const ensureWearScoreDraft = useWearScoreDraftStore((state) => state.ensureDraft)
  const applyWearScoreEvent = useWearScoreDraftStore((state) => state.applyScoreEvent)
  const undoWearScoreEvent = useWearScoreDraftStore((state) => state.undoScoreEvent)
  const clearWearScoreDraft = useWearScoreDraftStore((state) => state.clearDraft)

  const allowSubmitExit = useCallback(() => {
    submitExitAllowedRef.current = true
    setSubmitExitAllowed(true)
  }, [])

  const activityType = match?.activity_type as SubmissionActivityType | undefined
  const isRunning = activityType === 'running'
  const isTeamSport = activityType ? TEAM_SPORTS.includes(activityType) : false
  const timerAutoStart = activityType === 'basketball' || activityType === 'badminton'
  const isRunningCoop = isRunning && (
    match?.is_coop === true
    || RUNNING_COOP_MARKERS.some((marker) => match?.rule_text?.includes(marker))
  )
  const runningRuleMode = isRunning && match?.rule_params?.mode === 'sensor' ? 'sensor' : 'manual'
  const usesSensorRunning = isRunning && runningRuleMode === 'sensor'
  const submitExitLocked = shouldLockMatchForUser(match, user?.id)

  useEffect(() => {
    if (!user?.id || !match?.id) return
    if (submitExitLocked) {
      void setActiveMatchLock(user.id, match.id)
    } else {
      void clearActiveMatchLock(user.id, match.id)
    }
  }, [match?.id, submitExitLocked, user?.id])

  usePreventRemove(submitExitLocked && !submitExitAllowed, () => {
    if (submitExitAllowedRef.current || !match || !user) return

    const requestCancel = () => {
      if (!canRequestMutualCancel(match, user.id)) return
      requestMutualCancelMutation.mutate(
        { match, userId: user.id },
        { onError: (e) => showError(e) },
      )
    }

    const canRequestCancelNow = canRequestMutualCancel(match, user.id)
    const message = canRequestCancelNow
      ? 'แมตช์เริ่ม/ล็อกแต้มแล้ว ออกจากหน้านี้ไม่ได้ ถ้าต้องการหยุดให้ส่งคำขอยกเลิกให้อีกฝั่งยืนยัน'
      : 'ต้องส่งผลหรือกลับไปหน้า match ผ่าน flow ของแมตช์นี้ก่อน'

    if (Platform.OS === 'web') {
      if (canRequestCancelNow && globalThis.confirm(`ออกจากหน้าส่งผล?\n\n${message}`)) {
        requestCancel()
      } else if (!canRequestCancelNow) {
        globalThis.alert(message)
      }
      return
    }

    Alert.alert(
      'ออกจากหน้าส่งผล?',
      message,
      canRequestCancelNow
        ? [
            { text: 'อยู่ต่อ', style: 'cancel' },
            { text: 'ขอยกเลิกแมตช์', style: 'destructive', onPress: requestCancel },
          ]
        : [{ text: 'ตกลง', style: 'cancel' }],
    )
  })

  // Co-op running runs live through /run/active — the manual submit form
  // has no shared-team UI and would let one person settle the whole team.
  // Bounce the user back to either the live tracker or the result screen
  // before any state is collected.
  useEffect(() => {
    if (!match) return
    if (!isRunningCoop) return
    if (match.status === 'settled' || match.status === 'submitted' || match.status === 'cancelled') {
      allowSubmitExit()
      guardedRouter.replace(`/match/${match.id}`, { actionKey: `submit:${match.id}:detail` })
      return
    }
    allowSubmitExit()
    guardedRouter.replace(`/run/active?matchId=${match.id}`, { actionKey: `submit:${match.id}:run-active` })
  }, [allowSubmitExit, match, isRunningCoop])

  useEffect(() => {
    if (!match) return
    if (match.status === 'accepted' || match.status === 'in_progress') return
    allowSubmitExit()
    guardedRouter.replace(`/match/${match.id}`, { actionKey: `submit:${match.id}:not-submittable` })
  }, [allowSubmitExit, match])
  const ruleDistanceMeters = typeof match?.rule_params?.distance_meters === 'number'
    ? match.rule_params.distance_meters
    : null

  const participants: MatchParticipant[] = useMemo(
    () => match?.match_participants ?? [],
    [match],
  )

  const mySide = useMemo(
    () => participants.find((p) => p.user_id === user?.id)?.side,
    [participants, user?.id]
  )
  const mySideIndex = mySide === 0 || mySide === 1 ? mySide : null

  const myTeamParticipants = useMemo(
    () => participants.filter((p) => p.side === mySide),
    [participants, mySide]
  )

  const myTeamResultSubmission = useMemo(
    () => (match?.match_team_result_submissions ?? [])
      .find((submission) => submission.side_index === mySide),
    [match?.match_team_result_submissions, mySide],
  )
  const canUseWearScoreDraft =
    activityType === 'basketball' &&
    isTeamSport &&
    match?.status === 'in_progress' &&
    mySideIndex !== null &&
    !myTeamResultSubmission
  const scoreDraftForWear = canUseWearScoreDraft && match?.id && mySideIndex !== null
    ? {
        matchId: match.id,
        sideIndex: mySideIndex,
        teamScore: wearScoreDraft?.teamScore ?? 0,
        eventCount: wearScoreDraft?.events.length ?? 0,
        lastDelta: wearScoreDraft?.events[wearScoreDraft.events.length - 1]?.points ?? null,
      }
    : null
  const handleWearScoreEvent = useCallback((points: 1 | 2 | 3) => {
    if (!match?.id || mySideIndex === null || !canUseWearScoreDraft) return
    applyWearScoreEvent(match.id, mySideIndex, points)
  }, [applyWearScoreEvent, canUseWearScoreDraft, match?.id, mySideIndex])
  const handleWearUndoScoreEvent = useCallback(() => {
    if (!match?.id || !canUseWearScoreDraft) return
    undoWearScoreEvent(match.id)
  }, [canUseWearScoreDraft, match?.id, undoWearScoreEvent])

  useWearRunCompanion({
    sessionId: null,
    status: 'idle',
    distanceMeters: 0,
    durationSeconds: 0,
    paceSecondsPerKm: null,
    heartRate: null,
    matchLabel: match ? `${match.activity_type} scoring` : null,
    guildGoalLabel: null,
    guildGoalProgress: null,
    activeMatchId: canUseWearScoreDraft ? match?.id ?? null : null,
    activeMatchLabel: match ? `${match.activity_type} scoring` : null,
    joinCode: null,
    activeGuildGoalId: null,
    activeGuildGoalLabel: null,
    healthSummary: null,
    scoreDraft: scoreDraftForWear,
    partnerCampaign: null,
    onScoreEvent: handleWearScoreEvent,
    onUndoScoreEvent: handleWearUndoScoreEvent,
  })

  useEffect(() => {
    if (!canUseWearScoreDraft || !match?.id || mySideIndex === null) return
    ensureWearScoreDraft(match.id, mySideIndex)
  }, [canUseWearScoreDraft, ensureWearScoreDraft, match?.id, mySideIndex])

  useEffect(() => {
    if (!canUseWearScoreDraft || !wearScoreDraft) return
    const nextScore = String(wearScoreDraft.teamScore)
    setTeamScore((current) => current === nextScore ? current : nextScore)
  }, [canUseWearScoreDraft, wearScoreDraft])

  useEffect(() => {
    if (!isTeamSport || !myTeamResultSubmission) return
    setTeamScore(String(myTeamResultSubmission.team_score))
    const existing = new Map(
      (match?.match_participant_contributions ?? [])
        .filter((contribution) =>
          myTeamParticipants.some((participant) => participant.user_id === contribution.user_id),
        )
        .map((contribution) => [contribution.user_id, contribution]),
    )
    setContributions(
      myTeamParticipants.map((participant) => {
        const contribution = existing.get(participant.user_id)
        return {
          user_id: participant.user_id,
          points: contribution?.points ?? 0,
          note: contribution?.note ?? null,
        }
      }),
    )
  }, [isTeamSport, match?.match_participant_contributions, myTeamParticipants, myTeamResultSubmission])

  useEffect(() => {
    if (!isTeamSport || myTeamParticipants.length === 0) return
    setContributions((current) => {
      const next = myTeamParticipants.map((participant) => {
        const existing = current.find((entry) => entry.user_id === participant.user_id)
        return {
          user_id: participant.user_id,
          points: existing?.points ?? 0,
          note: existing?.note ?? null,
        }
      })
      if (
        next.length === current.length &&
        next.every((entry, index) =>
          entry.user_id === current[index]?.user_id &&
          entry.points === current[index]?.points &&
          entry.note === current[index]?.note
        )
      ) {
        return current
      }
      return next
    })
  }, [isTeamSport, myTeamParticipants])

  useEffect(() => {
    if (!isTeamSport || myTeamParticipants.length !== 1) return
    const participant = myTeamParticipants[0]
    const parsed = parseInt(teamScore, 10)
    const points = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
    setContributions((current) => {
      const existing = current.find((entry) => entry.user_id === participant.user_id)
      const next = [{ user_id: participant.user_id, points, note: existing?.note ?? null }]
      if (
        current.length === 1 &&
        current[0]?.user_id === next[0].user_id &&
        current[0]?.points === next[0].points &&
        current[0]?.note === next[0].note
      ) {
        return current
      }
      return next
    })
  }, [isTeamSport, myTeamParticipants, teamScore])

  const eligibleRunSessions = useMemo(() => {
    if (!activityHistory || !match) return []
    const notBefore = new Date(match.accepted_at ?? 0).getTime()
    return activityHistory.filter((item) => {
      if (item.activity_type !== 'running') return false
      if (!item.running_activity_details) return false
      if (!['gps_live', 'healthkit', 'health_connect'].includes(item.source)) return false
      if (new Date(item.started_at).getTime() < notBefore) return false
      if (ruleDistanceMeters && (item.running_activity_details.distance_meters ?? 0) < ruleDistanceMeters) return false
      return true
    })
  }, [activityHistory, match, ruleDistanceMeters])

  const selectedRun = useMemo(
    () => eligibleRunSessions.find((item) => item.id === selectedRunId) ?? null,
    [eligibleRunSessions, selectedRunId],
  )

  const theme = useSportTheme()
  const styles = newMatchStyles(theme)

  if (isPending) {
    return <MatchSkeleton />
  }
  if (error || !match || !user) {
    return (
      <View style={{ flex: 1, padding: 24, backgroundColor: theme.bg }}>
        <Text style={{ color: theme.ink }}>Could not load match.</Text>
      </View>
    )
  }

  function showError(err: unknown) {
    logMatchActionError(err)
    const message = formatMatchActionError(err, match?.activity_type)
    if (Platform.OS === 'web') {
      globalThis.alert(`Error\n\n${message}`)
    } else {
      Alert.alert('Error', message)
    }
  }

  function confirmRequestMutualCancel() {
    const action = () => requestMutualCancelMutation.mutate(
      { match: match!, userId: user!.id },
      { onError: (e) => showError(e) },
    )
    if (Platform.OS === 'web') { action(); return }
    Alert.alert(
      'Request Cancel',
      'The match only cancels if the other side agrees within 24 hours. Locked stake is refunded after agreement.',
      [{ text: 'Keep Match', style: 'cancel' }, { text: 'Request Cancel', style: 'destructive', onPress: action }],
    )
  }

  function respondToMutualCancel(agree: boolean) {
    respondToMutualCancelMutation.mutate(
      { match: match!, userId: user!.id, agree },
      {
        onSuccess: () => {
          if (!agree) return
          allowSubmitExit()
          guardedRouter.replace(`/match/${match!.id}`, { actionKey: `submit:${match!.id}:cancelled-detail` })
        },
        onError: (e) => showError(e),
      },
    )
  }

  async function onSubmit() {
    if (!match || !activityType || !user) return

    try {
      let mediaPaths: string[] = []
      if (proofAssets.length > 0) {
        setUploading(true)
        try {
          mediaPaths = await uploadProofPhotos({
            userId: user.id,
            matchId: match.id,
            assets: proofAssets,
          })
        } finally {
          setUploading(false)
        }
      }

      if (isRunning && usesSensorRunning) {
        if (!selectedRun) throw new Error('Pick a recorded GPS/Health run for this match')
        const runDetails = selectedRun.running_activity_details
        const data = {
          distance_meters: Math.round(runDetails?.distance_meters ?? 0),
          moving_time_seconds: Math.round(runDetails?.moving_time_seconds ?? selectedRun.duration_seconds ?? 0),
        }
        await submitMutation.mutateAsync({
          matchId: match.id,
          activityType,
          data,
          activitySessionId: selectedRun.id,
          isTie: isRunningCoop,
          claimedWinnerUserId: null,
          notes: notes.trim() || null,
          mediaPaths,
          contributions: contributions.filter((c) => c.points > 0 || c.note?.trim()),
        })
      } else if (isRunning) {
        const distance = Number.parseFloat(distanceKm)
        const minutes = Number.parseFloat(movingTimeMinutes)
        if (!Number.isFinite(distance) || distance <= 0) throw new Error('Enter running distance')
        if (!Number.isFinite(minutes) || minutes <= 0) throw new Error('Enter moving time')
        if (!isRunningCoop && !isTie && !claimedWinnerUserId) {
          throw new Error('Pick the winner or mark this match as a tie')
        }

        await submitMutation.mutateAsync({
          matchId: match.id,
          activityType,
          data: {
            distance_meters: Math.round(distance * 1000),
            moving_time_seconds: Math.round(minutes * 60),
          },
          activitySessionId: null,
          isTie: isRunningCoop || isTie,
          claimedWinnerUserId: isRunningCoop || isTie ? null : claimedWinnerUserId,
          notes: notes.trim() || null,
          mediaPaths,
          contributions: contributions.filter((c) => c.points > 0 || c.note?.trim()),
        })
      } else if (isTeamSport) {
        const score = parseInt(teamScore, 10)
        if (mySide !== 0 && mySide !== 1) throw new Error('You need to be on a team side to submit')
        if (Number.isNaN(score) || score < 0) throw new Error('Enter your team score')
        const teamContributions = myTeamParticipants.map((participant) => {
          const existing = contributions.find((entry) => entry.user_id === participant.user_id)
          return {
            user_id: participant.user_id,
            points: myTeamParticipants.length === 1 ? score : existing?.points ?? 0,
            note: existing?.note?.trim() || null,
          }
        })
        const contributionTotal = teamContributions.reduce((sum, entry) => sum + entry.points, 0)
        if (contributionTotal !== score) {
          throw new Error(`Player contributions (${contributionTotal}) must equal your team score (${score})`)
        }

        const data: TeamSportSubmissionData = {
          side_index: mySide,
          team_score: score,
        }
        await submitMutation.mutateAsync({
          matchId: match.id,
          activityType,
          data,
          notes: notes.trim() || null,
          mediaPaths,
          contributions: teamContributions,
        })
      } else {
        throw new Error(`Unsupported activity: ${activityType}`)
      }

      if (isTeamSport) clearWearScoreDraft(match.id)
      allowSubmitExit()
      guardedRouter.replace(`/match/${match.id}`, { actionKey: `submit:${match.id}:success` })
    } catch (e) {
      track({
        name: 'score_submit_failed',
        properties: {
          match_id: match.id,
          activity: match.activity_type ?? 'unknown',
          reason: e instanceof Error ? e.message : 'unknown',
        },
      })
      showError(e)
    }
  }

  const canSubmit = match.status === 'accepted' || match.status === 'in_progress'

  if (!canSubmit) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: theme.bg }}>
        <ActivityIndicator color={theme.chalk} />
        <Text style={{ color: theme.ink, marginTop: 12, textAlign: 'center' }}>
          Returning to match…
        </Text>
      </View>
    )
  }

  if (shouldBlockBasketballPlayerFinalSubmit(match)) {
    return (
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Reveal delay={0}>
          <View style={styles.optionCard}>
            <MaterialCommunityIcons name="whistle-outline" size={22} color={theme.green} />
            <View style={{ flex: 1 }}>
              <Text style={styles.optionTitle}>แมตช์นี้ใช้กรรมการส่งผล</Text>
              <Text style={styles.optionHint}>
                ผู้เล่นไม่ต้องกรอกคะแนนเอง รอกรรมการส่งผล แล้วคุณจะยืนยันหรือขอให้แก้ได้จากหน้า match
              </Text>
            </View>
          </View>
        </Reveal>
        <Reveal delay={80}>
          <PressableScale
            style={styles.button}
            onPress={() => guardedRouter.replace(`/match/${match.id}`, {
              actionKey: `submit:${match.id}:referee-required`,
            })}
          >
            <Text style={styles.buttonText}>กลับหน้า MATCH</Text>
          </PressableScale>
        </Reveal>
      </ScrollView>
    )
  }

  const isBusy = submitMutation.isPending || uploading
  const pendingCancelRequest = getPendingCancelRequest(match)
  const canRequestCancel = canRequestMutualCancel(match, user.id)
  const canRespondCancel = canRespondToMutualCancel(match, user.id)
  const parsedTeamScore = parseInt(teamScore, 10)
  const teamScoreForSummary = Number.isFinite(parsedTeamScore) && parsedTeamScore >= 0 ? parsedTeamScore : null
  const contributionTotal = contributions.reduce((sum, entry) => sum + entry.points, 0)
  const teamScoreReadiness = getTeamScoreReadiness({
    scoreText: teamScore,
    contributionTotal,
  })
  const extrasHasContent = proofAssets.length > 0 || notes.trim().length > 0
  const showExtras = extrasOpen || extrasHasContent
  const manageActions: MatchManageAction[] = [
    {
      key: 'request-cancel',
      label: 'ขอยกเลิกแมตช์',
      hint: 'อีกฝั่งต้องยอมรับก่อน stake ถึงจะคืน',
      icon: 'handshake-outline',
      tone: 'warning',
      disabled: !canRequestCancel || !!pendingCancelRequest,
      busy: requestMutualCancelMutation.isPending,
      onPress: confirmRequestMutualCancel,
    },
  ]

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Reveal delay={0}>
        <Text style={styles.label}>Activity</Text>
        <Text style={{ color: theme.ink, fontSize: 16, fontWeight: '700', marginTop: 4 }}>
          {activityType} · {isRunningCoop ? `${match.is_coop ? match.team_size_per_side : match.team_size_per_side * 2} runners` : `${match.team_size_per_side}v${match.team_size_per_side}`}
        </Text>
        {isRunningCoop && (
          <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 18, marginTop: 6 }}>
            Cooperative running challenge · submit the shared result when everyone completes it.
          </Text>
        )}
        {isRunning && !isRunningCoop && (
          <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 18, marginTop: 6 }}>
            {usesSensorRunning
              ? 'Rally rule · server compares verified run sessions to determine the winner.'
              : 'Manual result · submit the activity result and winner yourself.'}
          </Text>
        )}
      </Reveal>

      <Reveal delay={40}>
        <MatchTimer startedAt={match.started_at ?? null} autoStart={timerAutoStart} />
      </Reveal>

      {isRunning && usesSensorRunning && (
        <>
          <Reveal delay={80}>
            <Text style={styles.label}>Recorded run</Text>
            <Text style={styles.hint}>
              ใช้ GPS / Health session ที่บันทึกหลัง match accepted เท่านั้น
              {ruleDistanceMeters ? ` · ระยะอย่างน้อย ${formatDistance(ruleDistanceMeters)}` : ''}
            </Text>
            <View style={{ gap: 8, marginTop: 8 }}>
              {eligibleRunSessions.length === 0 ? (
                <View style={styles.optionCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionTitle}>ยังไม่มี run session ที่ใช้ได้</Text>
                    <Text style={styles.optionHint}>
                      บันทึกด้วย Rally Run หรือ import จาก Health ก่อน แล้วกลับมาส่งผล match นี้
                      {ruleDistanceMeters ? ` ต้องครบ ${formatDistance(ruleDistanceMeters)} ขึ้นไป` : ''}
                    </Text>
                  </View>
                </View>
              ) : (
                eligibleRunSessions.slice(0, 6).map((run) => (
                  <RunSessionOption
                    key={run.id}
                    run={run}
                    active={selectedRunId === run.id}
                    onPress={() => setSelectedRunId(run.id)}
                  />
                ))
              )}
              <PressableScale
                style={[styles.pill, { alignSelf: 'flex-start' }]}
                onPress={() => guardedRouter.push({
                  pathname: '/run/active',
                  params: { matchId: match.id },
                }, { actionKey: `submit:${match.id}:record-run` })}
              >
                <Text style={styles.pillText}>Record new run</Text>
              </PressableScale>
              <PressableScale
                style={[styles.pill, { alignSelf: 'flex-start' }]}
                onPress={() => guardedRouter.push({
                  pathname: '/run/sync',
                  params: { matchId: match.id },
                }, { actionKey: `submit:${match.id}:health-sync` })}
              >
                <Text style={styles.pillText}>Import from Health</Text>
              </PressableScale>
            </View>
          </Reveal>

          {!isRunningCoop && (
            <Reveal delay={120}>
              <Text style={styles.label}>Winner</Text>
              <View style={styles.optionCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionTitle}>Determined by selected run</Text>
                  <Text style={styles.optionHint}>
                    Server waits for every participant, then compares the verified run metric from the match rule.
                  </Text>
                </View>
              </View>
            </Reveal>
          )}

          {isRunningCoop && (
            <Reveal delay={120}>
              <Text style={styles.label}>Challenge result</Text>
              <View style={styles.pill}>
                <Text style={styles.pillText}>Complete together · no winner needed</Text>
              </View>
            </Reveal>
          )}
        </>
      )}

      {isRunning && !usesSensorRunning && (
        <>
          <Reveal delay={80}>
            <Text style={styles.label}>Manual run result</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Distance km"
                placeholderTextColor={theme.mutedSoft}
                keyboardType="decimal-pad"
                value={distanceKm}
                onChangeText={setDistanceKm}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Time min"
                placeholderTextColor={theme.mutedSoft}
                keyboardType="decimal-pad"
                value={movingTimeMinutes}
                onChangeText={setMovingTimeMinutes}
              />
            </View>
          </Reveal>

          {!isRunningCoop && (
            <Reveal delay={120}>
              <Text style={styles.label}>Winner</Text>
              <View style={styles.optionStack}>
                {participants.map((participant) => {
                  const active = claimedWinnerUserId === participant.user_id && !isTie
                  return (
                    <PressableScale
                      key={participant.user_id}
                      style={[styles.optionCard, active && styles.optionCardActive]}
                      onPress={() => {
                        setIsTie(false)
                        setClaimedWinnerUserId(participant.user_id)
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.optionTitle}>{participantLabel(participant)}</Text>
                        <Text style={styles.optionHint}>Side {participant.side + 1}</Text>
                      </View>
                      <Text style={[styles.pillText, active && styles.pillTextActive]}>
                        {active ? 'Winner' : 'Pick'}
                      </Text>
                    </PressableScale>
                  )
                })}
                <PressableScale
                  style={[styles.optionCard, isTie && styles.optionCardActive]}
                  onPress={() => {
                    setIsTie(true)
                    setClaimedWinnerUserId(null)
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionTitle}>Tie</Text>
                    <Text style={styles.optionHint}>No winner for this result</Text>
                  </View>
                  <Text style={[styles.pillText, isTie && styles.pillTextActive]}>
                    {isTie ? 'Selected' : 'Pick'}
                  </Text>
                </PressableScale>
              </View>
            </Reveal>
          )}

          {isRunningCoop && (
            <Reveal delay={120}>
              <Text style={styles.label}>Challenge result</Text>
              <View style={styles.pill}>
                <Text style={styles.pillText}>Complete together · no winner needed</Text>
              </View>
            </Reveal>
          )}
        </>
      )}

      {isTeamSport && activityType && (
        <Reveal delay={80}>
          <TeamSportSubmitPanel
            activityType={activityType}
            teamSizePerSide={match.team_size_per_side}
            mySide={mySide}
            teamScore={teamScore}
            onTeamScoreChange={setTeamScore}
            myTeamParticipants={myTeamParticipants}
            contributions={contributions}
            onContributionsChange={setContributions}
            teamScoreForSummary={teamScoreForSummary}
            readiness={teamScoreReadiness}
            canUseWearScoreDraft={canUseWearScoreDraft}
            wearScoreDraft={wearScoreDraft}
          />
        </Reveal>
      )}

      <Reveal delay={240}>
        <Text style={styles.label}>Proof & notes (optional)</Text>
        <PressableScale style={styles.optionCard} onPress={() => setExtrasOpen((open) => !open)}>
          <MaterialCommunityIcons name="paperclip" size={18} color={theme.muted} />
          <View style={{ flex: 1 }}>
            <Text style={styles.optionTitle}>หลักฐานและโน้ต</Text>
            <Text style={styles.optionHint}>
              {proofAssets.length} photos · {notes.trim() ? 'มี note แล้ว' : 'ยังไม่มี note'}
            </Text>
          </View>
          <MaterialCommunityIcons
            name={showExtras ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={theme.muted}
          />
        </PressableScale>
        {showExtras && (
          <View style={{ gap: 10, marginTop: 8 }}>
            <ProofPicker assets={proofAssets} onChange={setProofAssets} max={5} />
            <TextInput
              style={[styles.input, { height: 76 }]}
              placeholder="How did it go?"
              placeholderTextColor={theme.mutedSoft}
              multiline
              value={notes}
              onChangeText={setNotes}
            />
          </View>
        )}
      </Reveal>

      {pendingCancelRequest && (
        <Reveal delay={300}>
          <MutualCancelCard
            request={pendingCancelRequest}
            participants={participants}
            canRequest={canRequestCancel}
            canRespond={canRespondCancel}
            isRequesting={requestMutualCancelMutation.isPending}
            isResponding={respondToMutualCancelMutation.isPending}
            onRequest={confirmRequestMutualCancel}
            onAgree={() => respondToMutualCancel(true)}
            onDecline={() => respondToMutualCancel(false)}
          />
        </Reveal>
      )}

      <Reveal delay={320}>
        <PressableScale
          style={styles.button}
          onPress={onSubmit}
          disabled={isBusy}
        >
          <Text style={styles.buttonText}>
            {uploading
              ? 'UPLOADING…'
              : submitMutation.isPending
                ? 'SUBMITTING…'
                : isTeamSport
                  ? 'LOCK IN SCORE'
                  : 'SUBMIT RESULT'}
          </Text>
        </PressableScale>
        {canRequestCancel && !pendingCancelRequest && (
          <PressableScale
            style={[styles.secondaryButton, { marginTop: 8 }]}
            onPress={() => setManageOpen(true)}
            disabled={requestMutualCancelMutation.isPending}
          >
            <Text style={styles.secondaryButtonText}>จัดการแมตช์</Text>
          </PressableScale>
        )}
      </Reveal>
      <MatchManageActionsSheet
        visible={manageOpen}
        actions={manageActions}
        onClose={() => setManageOpen(false)}
      />
    </ScrollView>
  )
}

function participantLabel(participant: MatchParticipant): string {
  return participant.users?.display_name
    ?? participant.users?.handle
    ?? participant.users?.email
    ?? participant.user_id.slice(0, 8)
}

function RunSessionOption({
  run,
  active,
  onPress,
}: {
  run: ActivityHistoryItem
  active: boolean
  onPress: () => void
}) {
  const theme = useSportTheme()
  const styles = newMatchStyles(theme)
  const details = run.running_activity_details
  const distance = details?.distance_meters ?? 0
  const duration = details?.moving_time_seconds ?? run.duration_seconds ?? 0
  const pace = details?.pace_seconds_per_km ?? (distance > 0 ? Math.round((duration * 1000) / distance) : null)

  return (
    <PressableScale
      style={[styles.optionCard, active && styles.optionCardActive]}
      onPress={onPress}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.optionTitle}>
          {formatDistance(distance)} · {formatDuration(duration)}
        </Text>
        <Text style={styles.optionHint}>
          {new Date(run.started_at).toLocaleString()} · {run.source}
          {pace ? ` · ${formatPace(pace)}` : ''}
        </Text>
      </View>
      <Text style={[styles.pillText, active && styles.pillTextActive]}>
        {active ? 'Selected' : 'Use'}
      </Text>
    </PressableScale>
  )
}
