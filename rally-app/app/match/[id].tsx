import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View, Text, Alert, Pressable, ScrollView, Platform, TextInput, Modal,
} from 'react-native'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { Stack, useLocalSearchParams } from 'expo-router'
import { useFocusEffect, usePreventRemove } from '@react-navigation/native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { VictoryOverlay } from '@/components/profile/VictoryOverlay'
import { useEquippedCosmetics } from '@/hooks/useEquippedCosmetics'
import { useLobbyEquippedFrames } from '@/hooks/useLobbyEquippedFrames'
import { useLobbyEquippedTitles } from '@/hooks/useLobbyEquippedTitles'
import { hasSeenVictory, markVictorySeen } from '@/lib/match/seenVictories'
import { longRangePointValueForTeamSize } from '@/lib/match/basketballStatSheetControls'
import { clearRecapSeen, hasSeenRecap, markRecapSeen } from '@/lib/match/seenRecapMoments'
import { buildBasketballRecapMoment } from '@/lib/match/recap/matchRecapMoment'
import { CommunityVoteTally } from '@/components/match/CommunityVoteTally'
import {
  BasketballCourtLobbyStage,
  type BasketballCourtLobbyAction,
} from '@/components/match/BasketballCourtLobbyStage'
import { BasketballFinalSummary } from '@/components/match/result/BasketballFinalSummary'
import { BasketballFinalActionDock } from '@/components/match/result/BasketballFinalActionDock'
import { MatchHistoryImpactError } from '@/components/history/MatchHistoryImpactError'
import { BasketballPinnedHighlightSection } from '@/components/match/result/BasketballPinnedHighlightSection'
import { buildBasketballFinalSummary } from '@/lib/match/finalSummaryPresenter'
import {
  RunningMapLobbyStage,
  type RunningMapLobbyAction,
  type RunningMapLobbyLiveStats,
  type RunningMapLobbyRefereeAction,
} from '@/components/match/RunningMapLobbyStage'
import { BasketballLiveStatSheet } from '@/components/match/BasketballLiveStatSheet'
import { BasketballLiveScoreSheet } from '@/components/match/BasketballLiveScoreSheet'
import { BasketballSelfStatDraftPanel } from '@/components/match/BasketballSelfStatDraftPanel'
import { BasketballLobbyPlayerPopup } from '@/components/match/BasketballLobbyPlayerPopup'
import { EkidenRelayPlanCard } from '@/components/match/EkidenRelayPlanCard'
import { SportFloorBackdrop } from '@/components/match/SportFloorBackdrop'
import { LobbyMoveCooldownBadge } from '@/components/match/LobbyMoveCooldownBadge'
import { ConfirmResultCard } from '@/components/match/ConfirmResultCard'
import { CoopRunSummaryCard } from '@/components/match/CoopRunSummaryCard'
import { matchDetailStyles } from '@/components/match/matchDetailStyles'
import {
  MatchManageActionsSheet,
  type MatchManageAction,
} from '@/components/match/MatchManageActionsSheet'
import { MatchNextAction } from '@/components/match/MatchNextAction'
import { MatchRecapCard } from '@/components/match/MatchRecapCard'
import { MatchRecapMoment } from '@/components/match/recap/MatchRecapMoment'
import { MatchCancelledMoment } from '@/components/match/recap/MatchCancelledMoment'
import { MatchSideCard } from '@/components/match/MatchSideCard'
import {
  NoRefereeScoreDraftPanel,
  type NoRefereeScoreDraftSubmitInput,
} from '@/components/match/NoRefereeScoreDraftPanel'
import { MutualCancelCard } from '@/components/match/MutualCancelCard'
import { ResultResolutionPanel } from '@/components/match/ResultResolutionPanel'
import { ProofPicker } from '@/components/match/ProofPicker'
import { RatingDeltaBadge } from '@/components/match/RatingDeltaBadge'
import { MatchSkeleton } from '@/components/match/MatchSkeleton'
import { RecordedResult } from '@/components/match/RecordedResult'
import { StakeEditor } from '@/components/match/StakeEditor'
import { TeamResultChallengeModal } from '@/components/match/TeamResultChallengeModal'
import { TeamResultReviewCard } from '@/components/match/TeamResultReviewCard'
import { TeamResultReviewSheet } from '@/components/match/TeamResultReviewSheet'
import { TeamResolutionRequestModal } from '@/components/match/TeamResolutionRequestModal'
import { MatchTrustBadge } from '@/components/match/MatchTrustBadge'
import { AnimatedNumber } from '@/components/motion/AnimatedNumber'
import { PressableScale } from '@/components/motion/PressableScale'
import { RefereeActionEntryCard } from '@/components/referee/RefereeActionEntryCard'
import { RefereeInviteResponseCard } from '@/components/referee/RefereeInviteResponseCard'
import { RefereeLiveControlPanel } from '@/components/referee/RefereeLiveControlPanel'
import { RefereeRunningControlPanel } from '@/components/referee/RefereeRunningControlPanel'
import { Reveal } from '@/components/motion/Reveal'
import { ActivityIcon } from '@/components/ui/ActivityIcon'
import { EntryCodeModal } from '@/components/match/EntryCodeModal'
import { InviteFriendSheet } from '@/components/match/invite/InviteFriendSheet'
import { InviteRefereeSheet } from '@/components/match/invite/InviteRefereeSheet'
import type { InvitableFriend, EligibleReferee } from '@/types/invite'
import { StatusPill } from '@/components/ui/StatusPill'
import { ScreenBackButton } from '@/components/navigation/ScreenBackButton'
import { useAnalysisProfile } from '@/hooks/useAnalysisProfile'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useAuth } from '@/hooks/useAuth'
import { useAlphaRunningGate } from '@/hooks/useAlphaRunningGate'
import { resolveAlphaRunningGateKeyForRuleParams } from '@/lib/run-tracking/alphaRunningGate'
import { useMatch } from '@/hooks/useMatch'
import { useMatchHistoryImpacts } from '@/hooks/useMatchHistoryImpacts'
import { useSportPositionsForUsers } from '@/hooks/useSportPositions'
import { basketballPositionShort } from '@/lib/activities/basketball/positions'
import { useRunLobbyLocation } from '@/hooks/useRunLobbyLocation'
import { useTeamRunPresence } from '@/hooks/useTeamRunPresence'
import {
  useAssignMatchReferee,
  useRequestAlphaRefereeResultCorrection,
  useSetAlphaRefereeQuarterBoundaries,
  useSubmitRefereeMatchResult,
  useUpsertAlphaRefereeLiveScoreDraft,
  useUpsertAlphaRefereeRunningDraft,
} from '@/hooks/useAlphaRefereeDuties'
import { useRespondRefereeAssignment } from '@/hooks/useRespondRefereeAssignment'
import { useUpsertBasketballPlayerStatDraft } from '@/hooks/useBasketballPlayerStatDraft'
import { useMatchActions } from '@/hooks/useMatchActions'
import { useLobbyMoveCooldown } from '@/hooks/useLobbyMoveCooldown'
import { useSetMatchSpectators } from '@/hooks/useSpectate'
import { useWatchPresenceCount } from '@/hooks/useWatchPresence'
import { useMatchDetailPolicy } from '@/hooks/useMatchDetailPolicy'
import { useUpsertPlayerScoreDraft } from '@/hooks/usePlayerScoreDraft'
import { useRefereeSportProfile } from '@/hooks/useRefereeTrust'
import { useWearRunCompanion } from '@/hooks/useWearRunCompanion'
import { useWalletSummary } from '@/hooks/useWalletSummary'
import { getMyOutcomePreview, getNextAction } from '@/lib/match/matchNextAction'
import {
  buildTeamSportLobbyCourt,
  type BasketballLobbyCourtParticipant,
  type BasketballLobbyPositionKey,
} from '@/lib/match/basketballLobbyCourt'
import {
  buildBasketballLiveStatsByUser,
  buildNoRefereeBasketballStats,
  canEditBasketballLiveStat,
  canSubmitBasketballEndGame,
  emptyBasketballLiveStatLine,
  getBasketballLiveScoreBySide,
  hasAnyBasketballLiveStat,
  hasBothTeamResultSubmissions,
  isPlayerScoreDraftSubmittedForSide,
  type BasketballLiveStatLine,
  type BasketballLiveStatsByUser,
} from '@/lib/match/basketballLiveScoring'
import {
  buildScoreLogFromQuarters,
  normalizeQuarterBoundaries,
  quarterBoundaryFromScores,
} from '@/lib/match/basketballQuarters'
import { deriveQuarterPills } from '@/lib/match/liveScoreboardPresenter'
import {
  buildBasketballLobbyActions,
  type BasketballLobbyPrimaryAction,
  type BasketballLobbySecondaryAction,
} from '@/lib/match/basketballLobbyActions'
import {
  buildRunningLobbyActions,
  buildRunningLobbyLayout,
  type RunningLobbyParticipantToken,
  type RunningLobbyPrimaryAction,
  type RunningLobbySecondaryAction,
} from '@/lib/match/runningLobbyLayout'
import {
  runningParticipantTokenToLobbyPreview,
  type LobbyPlayerPreviewParticipant,
} from '@/lib/match/lobbyPlayerPreview'
import { uploadProofMedia, type LocalProofAsset } from '@/lib/match/proofUploadService'
import {
  canFinishCoopRunMatch,
  canLeaveCoopRunMatch,
  canRequestMutualCancel,
  canRespondToMutualCancel,
  canRequestResultCorrection,
  canRespondToResultCorrection,
  getPendingCancelRequest,
  getPendingCorrectionRequest,
  getOpenTeamResultChallenge,
  getCurrentAlphaRefereeResult,
  getActiveAlphaRefereeAssignment,
  getRefereeAssignmentInProgress,
  getAlphaRefereeDutyState,
  getAlphaRefereePlayerStatDrafts,
  getLatestAlphaRefereeLiveScoreDraft,
  getBasketballPlayerSelfStatDrafts,
  getMatchDetailState,
  getTeamResultChallengeTargetUserId,
  canRequestTeamResultCorrection,
  getPendingTeamResultCorrection,
  getMyTeamCorrectionToRespond,
  getParticipantDisplayName,
} from '@/lib/match/matchRules'
import {
  clearActiveMatchLock,
  setActiveMatchLock,
  shouldLockMatchForUser,
} from '@/lib/match/activeMatchLock'
import { getCurrentMatchSubmission } from '@/lib/match/matchSubmissions'
import { ACTIVITY_LABEL, deriveRunningMode, type Activity } from '@/lib/match/matchConfig'
import { getProfileLobbyKickEligibility } from '@/lib/match/profileLobbyActions'
import { shouldNotifyRemovedFromRoom } from '@/lib/match/lobbyPresence'
import { shouldAutoEnterActiveMatch } from '@/lib/match/activeMatchEntry'
import { classifyMatchResultAuthority } from '@/lib/match/matchResultAuthority'
import { formatMatchActionError, logMatchActionError } from '@/lib/match/matchErrorPresentation'
import { getWalletStakeLimit } from '@/lib/match/stakeOptions'
import { isEdgeFunctionError } from '@/lib/supabase/edgeError'
import type { LeaderboardActivity } from '@/lib/leaderboard/leaderboardConfig'
import { CURRENCY_ICON, CURRENCY_LABEL, CURRENCY_UNIT } from '@/lib/wallet/walletFormatting'
import type { WalletCurrency } from '@/lib/wallet/walletTypes'
import type { MatchRefereeAssignment, MatchWithRelations, Side } from '@/types/match'
import type { RefereeRunningDraftMarkInput } from '@/lib/match/alphaRefereeService'
import { guardedRouter } from '@/lib/navigation/guardedRouter'
import { buildRematchParams } from '@/lib/match/rematch'
import { useHeadToHead } from '@/hooks/useHeadToHead'
import { useRequestRematch } from '@/hooks/useRequestRematch'
import { HeadToHeadCard } from '@/components/match/HeadToHeadCard'
import { Spacing } from '@/constants/theme'

type BasketballStatSaveState = 'idle' | 'saving' | 'saved' | 'error'

export default function MatchDetailScreen() {
  const { id } = useLocalSearchParams<{
    id: string
  }>()
  const { user } = useAuth()
  const runningAlphaGate = useAlphaRunningGate()
  const theme = useSportTheme()
  const styles = matchDetailStyles(theme)
  const { data: match, isPending, error, refetch } = useMatch(id)
  const resultAuthority = classifyMatchResultAuthority(match?.source)
  const settledBasketballImpactIds = useMemo(
    () => match?.status === 'settled' && match.activity_type === 'basketball' ? [match.id] : [],
    [match?.activity_type, match?.id, match?.status],
  )
  const {
    data: matchHistoryImpacts,
    isError: matchHistoryImpactError,
    isFetching: matchHistoryImpactFetching,
    refetch: refetchMatchHistoryImpact,
  } = useMatchHistoryImpacts(user?.id, settledBasketballImpactIds)
  // Resolve every participant's equipped title once (cheap RPC) so the court
  // markers can render title frames. Kept above the early returns below so the
  // hook order stays stable.
  const lobbyTitleUserIds = useMemo(
    () => (match?.match_participants ?? []).map((p) => p.user_id),
    [match?.match_participants],
  )
  const { data: lobbyTitlesByUser } = useLobbyEquippedTitles(lobbyTitleUserIds)
  const { data: lobbyFrames } = useLobbyEquippedFrames(
    lobbyTitleUserIds,
    (match?.activity_type ?? 'running') as LeaderboardActivity,
  )
  const lobbyFramesByUser = lobbyFrames?.framesByUser
  const lobbyTiersByUser = lobbyFrames?.tiersByUser
  // 1v1/3v3 basketball shows each player's chosen profile position instead of
  // the per-match court slot; resolve every lobby participant's preference
  // once here (above the early returns) so hook order stays stable.
  const lobbyParticipantIds = useMemo(
    () => (match?.match_participants ?? [])
      .filter((p) => p.is_active !== false)
      .map((p) => p.user_id),
    [match?.match_participants],
  )
  const wantsPreferredPositions =
    match?.activity_type === 'basketball' && !match?.is_coop &&
    (match?.team_size_per_side === 1 || match?.team_size_per_side === 3)
  const { data: preferredPositionKeys } = useSportPositionsForUsers(
    lobbyParticipantIds, 'basketball', !!wantsPreferredPositions,
  )
  const {
    startMutation,
    joinMutation,
    confirmMutation,
    disputeMutation,
    cancelMutation,
    requestMutualCancelMutation,
    respondToMutualCancelMutation,
    requestResultCorrectionMutation,
    agreeResultCorrectionMutation,
    declineResultCorrectionMutation,
    leaveMutation,
    finishCoopRunMutation,
    kickParticipantMutation,
    reportResultMutation,
    challengeTeamResultMutation,
    updateParticipantStakeMutation,
    updateLobbyPositionMutation,
    inviteMutation,
    respondInviteMutation,
    acceptMutation,
    acceptTeamResultMutation,
    unacceptMutation,
    cancelInviteMutation,
    requestTeamCorrectionMutation,
    agreeTeamCorrectionMutation,
    declineTeamCorrectionMutation,
  } = useMatchActions(id)
  const lobbyMoveCooldown = useLobbyMoveCooldown()
  const [joining, setJoining] = useState<Side | null>(null)
  const [entrySidePrompt, setEntrySidePrompt] = useState<Side | null>(null)
  const [invitingSide, setInvitingSide] = useState<Side | null>(null)
  const [assigningReferee, setAssigningReferee] = useState(false)
  const [isEditingStake, setIsEditingStake] = useState(false)
  const [reportNote, setReportNote] = useState('')
  const [reportProofAssets, setReportProofAssets] = useState<LocalProofAsset[]>([])
  const [reportUploading, setReportUploading] = useState(false)
  const [teamChallengeOpen, setTeamChallengeOpen] = useState(false)
  const [teamChallengeNote, setTeamChallengeNote] = useState('')
  const [teamChallengeProofAssets, setTeamChallengeProofAssets] = useState<LocalProofAsset[]>([])
  const [teamChallengeUploading, setTeamChallengeUploading] = useState(false)
  const [selectedCourtParticipant, setSelectedCourtParticipant] = useState<BasketballLobbyCourtParticipant | null>(null)
  const [selectedRunningParticipant, setSelectedRunningParticipant] =
    useState<LobbyPlayerPreviewParticipant | null>(null)
  const [selectedBasketballStatParticipant, setSelectedBasketballStatParticipant] =
    useState<BasketballLobbyCourtParticipant | null>(null)
  const [optimisticBasketballStats, setOptimisticBasketballStats] = useState<BasketballLiveStatsByUser>({})
  const [liveScoreSheetOpen, setLiveScoreSheetOpen] = useState(false)
  const setSpectatorsMutation = useSetMatchSpectators()
  const [basketballStatSaveState, setBasketballStatSaveState] =
    useState<Record<string, BasketballStatSaveState>>({})
  const [refereeFinalNote, setRefereeFinalNote] = useState('')
  const [manageOpen, setManageOpen] = useState(false)
  const [victoryDismissed, setVictoryDismissed] = useState<boolean | null>(null)
  const [recapSeen, setRecapSeen] = useState<boolean | null>(null)
  // True only when this screen watched the match transition into 'settled'
  // (fresh post-game settle). Revisits from history arrive already settled and
  // get the inline recap instead of the celebration modal.
  const [settledWhileViewing, setSettledWhileViewing] = useState(false)
  const recapShownFiredRef = useRef<string | null>(null)
  const { track } = useAnalytics()
  const { data: cosmetics } = useEquippedCosmetics(user?.id)
  const { data: walletSummary } = useWalletSummary(user?.id)
  const assignRefereeMutation = useAssignMatchReferee(id, user?.id)
  const upsertRefereeLiveScoreMutation = useUpsertAlphaRefereeLiveScoreDraft(id, user?.id)
  const setQuarterBoundariesMutation = useSetAlphaRefereeQuarterBoundaries(id, user?.id)
  const upsertRefereeRunningDraftMutation = useUpsertAlphaRefereeRunningDraft(id, user?.id)
  const submitRefereeResultMutation = useSubmitRefereeMatchResult(id, user?.id)
  const requestRefereeCorrectionMutation = useRequestAlphaRefereeResultCorrection(id, user?.id)
  const respondRefereeMutation = useRespondRefereeAssignment(id, user?.id)
  const upsertSelfStatDraftMutation = useUpsertBasketballPlayerStatDraft(id)
  const upsertPlayerScoreDraftMutation = useUpsertPlayerScoreDraft(id)
  const activeRefereeAssignmentForProfile = match ? getActiveAlphaRefereeAssignment(match) : null
  const { data: activeRefereeProfile } = useRefereeSportProfile(
    activeRefereeAssignmentForProfile?.referee_user_id,
    match?.activity_type,
  )
  const insets = useSafeAreaInsets()
  const basketballSaveTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const derived = useMemo(() => {
    if (!match || !user) return null
    return getMatchDetailState(match, user.id)
  }, [match, user])
  // Private weight for the recap's display-only calorie estimate.
  const { data: analysisProfile } = useAnalysisProfile(user?.id)
  const recapMoment = useMemo(() => {
    if (!match || !user || match.activity_type !== 'basketball') return null
    return buildBasketballRecapMoment(match, user.id, {
      weightKg: analysisProfile?.weightKg ?? null,
    })
  }, [match, user, analysisProfile?.weightKg])
  // Referee-marked quarter boundaries live on the referee's live-score draft
  // (server-owned, realtime-published) so every device — players included —
  // renders the same quarter breakdown and it survives remounts.
  const quarterBoundaries = useMemo(
    () => normalizeQuarterBoundaries(
      match ? getLatestAlphaRefereeLiveScoreDraft(match)?.quarter_boundaries : null,
    ),
    [match],
  )
  const policy = useMatchDetailPolicy(match, user?.id, walletSummary?.wallet)

  // Stable bool — avoids re-running the effect on every match refetch where
  // derived?.myParticipant would be a new object reference each time.
  const isMyParticipant = !!derived?.myParticipant
  const participantPresenceRef = useRef<{ matchId: string | null; wasParticipant: boolean }>({
    matchId: null,
    wasParticipant: false,
  })
  // Set true the instant the local user fires their own leave/decline so the
  // "host removed you" notice can tell a voluntary exit from a real host kick —
  // both delete the same participant row, so presence alone can't distinguish
  // them. Reset when the room changes or a leave attempt fails (user stays).
  const selfExitInitiatedRef = useRef(false)
  const submittedNavRef = useRef<string | null>(null)
  // Sensor-backed running matches submit through the live tracker (GPS path
  // → submit-run-session → linked to match). All other activities flow
  // through the manual submit screen. Co-op running is always live-tracker
  // driven regardless of rule_params — the manual submit screen has no UI
  // for shared/team results.
  const isCoopRunning = match?.activity_type === 'running' && match?.is_coop === true
  const isSensorRunning =
    match?.activity_type === 'running' &&
    ((match?.rule_params as { mode?: string } | null)?.mode === 'sensor' || isCoopRunning)
  const runningGateFeatureKey = match?.activity_type === 'running'
    ? resolveAlphaRunningGateKeyForRuleParams(match.rule_params as Record<string, unknown> | null, match.is_coop)
    : null
  const canUseRunningMatchAlpha = runningGateFeatureKey
    ? runningAlphaGate.isEnabled(runningGateFeatureKey)
    : runningAlphaGate.enabled
  const showRunningMapLobby =
    match?.activity_type === 'running' &&
    (match.status === 'pending' || match.status === 'accepted')
  const runLobbyLocation = useRunLobbyLocation({
    enabled: !!showRunningMapLobby && canUseRunningMatchAlpha,
  })
  const canViewRunLobbyPresence = Boolean(
    showRunningMapLobby &&
    canUseRunningMatchAlpha &&
    (
      isMyParticipant ||
      activeRefereeAssignmentForProfile?.referee_user_id === user?.id
    ),
  )
  const runLobbyParticipantUserIds = useMemo(
    () =>
      (match?.match_participants ?? [])
        .filter((participant) => participant.accepted_at && (participant as { is_active?: boolean }).is_active !== false)
        .map((participant) => participant.user_id),
    [match?.match_participants],
  )
  const runLobbyPresence = useTeamRunPresence({
    matchId: canViewRunLobbyPresence ? match?.id : null,
    userId: user?.id,
    location: runLobbyLocation.warmStartLocation,
    phase: 'ready',
    enabled: Boolean(
      canViewRunLobbyPresence &&
      isMyParticipant &&
      runLobbyLocation.permission === 'granted' &&
      runLobbyLocation.warmStartLocation,
    ),
    participantUserIds: runLobbyParticipantUserIds,
  })
  const isTeamSportActivity =
    match?.activity_type === 'basketball' ||
    match?.activity_type === 'badminton'
  const myTeamResultSubmitted =
    !!match &&
    !!derived &&
    (
      match.activity_type === 'basketball' ||
      match.activity_type === 'badminton'
    ) &&
    derived.mySide != null &&
    (match.match_team_result_submissions ?? []).some(
      (submission) => submission.side_index === derived.mySide,
    )
  const openTeamResultChallenge = match ? getOpenTeamResultChallenge(match) : null
  const matchExitLocked = shouldLockMatchForUser(match, user?.id)
  const navigationExitAllowedRef = useRef(false)
  const arenaResultRedirectedMatchRef = useRef<string | null>(null)
  const hadOpenTeamChallengeRef = useRef(false)
  const [navigationExitAllowed, setNavigationExitAllowed] = useState(false)
  const wearMatchLabel = match
    ? `${match.activity_type} room`
    : id
      ? 'Match room'
      : null

  useWearRunCompanion({
    sessionId: null,
    status: 'idle',
    distanceMeters: 0,
    durationSeconds: 0,
    paceSecondsPerKm: null,
    heartRate: null,
    matchLabel: wearMatchLabel,
    guildGoalLabel: null,
    guildGoalProgress: null,
    activeMatchId: match?.id ?? null,
    activeMatchLabel: wearMatchLabel,
    joinCode: match && match.created_by === user?.id ? match.join_code : null,
    activeGuildGoalId: null,
    activeGuildGoalLabel: null,
    healthSummary: null,
    scoreDraft: null,
    partnerCampaign: null,
  })

  useEffect(() => {
    return () => {
      Object.values(basketballSaveTimersRef.current).forEach(clearTimeout)
      basketballSaveTimersRef.current = {}
    }
  }, [])

  useEffect(() => {
    Object.values(basketballSaveTimersRef.current).forEach(clearTimeout)
    basketballSaveTimersRef.current = {}
    setOptimisticBasketballStats({})
    setBasketballStatSaveState({})
    setSelectedBasketballStatParticipant(null)
  }, [match?.id])

  const allowRouteReplace = useCallback(() => {
    navigationExitAllowedRef.current = true
    setNavigationExitAllowed(true)
  }, [])

  useEffect(() => {
    if (resultAuthority !== 'arena' || !match?.id) {
      arenaResultRedirectedMatchRef.current = null
      return
    }
    if (arenaResultRedirectedMatchRef.current === match.id) return

    arenaResultRedirectedMatchRef.current = match.id
    allowRouteReplace()
    guardedRouter.replace(`/arena-result/${match.id}` as never, {
      actionKey: `match:${match.id}:arena-result`,
    })
  }, [allowRouteReplace, match?.id, resultAuthority])

  // Leaving a match returns to the open-lobbies page (browse other rooms /
  // create a new one), not the home tab. Name kept for call-site stability.
  // dismissTo (not replace) pops the match OFF the stack back to lobbies, so a
  // cancelled/finished room can't be reached again with the back gesture — it
  // falls back to replace when lobbies isn't already below in the stack.
  const replaceWithHome = useCallback(() => {
    allowRouteReplace()
    guardedRouter.dismissTo('/lobbies', { actionKey: 'match:lobby' })
  }, [allowRouteReplace])

  useFocusEffect(
    useCallback(() => {
      navigationExitAllowedRef.current = false
      setNavigationExitAllowed(false)
      void refetch()
    }, [refetch]),
  )

  const showError = useCallback((error: unknown) => {
    logMatchActionError(error)
    const message = formatMatchActionError(error)
    if (Platform.OS === 'web') {
      globalThis.alert(`Error\n\n${message}`)
      return
    }
    Alert.alert('Error', message)
  }, [])

  useEffect(() => {
    if (!match?.id || !user?.id) {
      participantPresenceRef.current = { matchId: null, wasParticipant: false }
      return
    }

    if (participantPresenceRef.current.matchId !== match.id) {
      participantPresenceRef.current = { matchId: match.id, wasParticipant: false }
      selfExitInitiatedRef.current = false
    }

    if (isMyParticipant) {
      participantPresenceRef.current.wasParticipant = true
      return
    }

    const isPreStartPlayerLobby =
      (isTeamSportActivity || showRunningMapLobby) &&
      (match.status === 'pending' || match.status === 'accepted')
    if (
      !shouldNotifyRemovedFromRoom({
        selfExitInitiated: selfExitInitiatedRef.current,
        wasParticipant: participantPresenceRef.current.wasParticipant,
        isMyParticipant,
        isPreStartPlayerLobby,
      })
    ) {
      return
    }

    participantPresenceRef.current.wasParticipant = false
    void clearActiveMatchLock(user.id, match.id)

    const message = 'The host removed you from this room.'
    if (Platform.OS === 'web') {
      globalThis.alert(message)
      replaceWithHome()
      return
    }

    Alert.alert('Removed from room', message, [
      { text: 'OK', onPress: replaceWithHome },
    ])
  }, [isMyParticipant, isTeamSportActivity, showRunningMapLobby, match?.id, match?.status, replaceWithHome, user?.id])

  useEffect(() => {
    if (!user?.id || !match?.id) return
    if (matchExitLocked) {
      void setActiveMatchLock(user.id, match.id)
    } else {
      void clearActiveMatchLock(user.id, match.id)
    }
  }, [match?.id, matchExitLocked, user?.id])

  useEffect(() => {
    if (openTeamResultChallenge) {
      hadOpenTeamChallengeRef.current = true
      return
    }
    if (!hadOpenTeamChallengeRef.current) return
    hadOpenTeamChallengeRef.current = false
    navigationExitAllowedRef.current = false
    setNavigationExitAllowed(false)
  }, [openTeamResultChallenge])

  usePreventRemove(matchExitLocked && !navigationExitAllowed, () => {
    if (navigationExitAllowedRef.current || !match || !user) return

    const exitToHome = () => {
      void clearActiveMatchLock(user.id, match.id)
      replaceWithHome()
    }

    const showBlockedExit = () => {
      const pendingCancel = getPendingCancelRequest(match)
      const message =
        match.status === 'submitted' || match.status === 'disputed'
          ? 'แมตช์นี้กำลังอยู่ในขั้นตรวจผล ต้องอยู่ในหน้า match จนกว่าจะจบ'
          : pendingCancel
            ? canRespondToMutualCancel(match, user.id)
              ? 'มีคำขอยกเลิกค้างอยู่ ตอบรับหรือปฏิเสธที่การ์ด MUTUAL CANCEL ก่อน'
              : 'ส่งคำขอยกเลิกแล้ว ต้องรออีกฝั่งตอบรับก่อนออกจาก flow นี้'
            : 'แมตช์นี้เริ่มแล้ว จึงออกจากหน้าไม่ได้ในตอนนี้'

      if (Platform.OS === 'web') globalThis.alert(message)
      else Alert.alert('ออกจากแมตช์ไม่ได้', message)
    }

    const leaveOrCancel = () => {
      const pendingInviteId = derived?.myPendingInvite?.id

      if (match.status === 'pending' && pendingInviteId) {
        respondInviteMutation.mutate(
          { match, inviteId: pendingInviteId, action: 'decline' },
          { onSuccess: exitToHome, onError: (e) => showError(e) },
        )
        return
      }

      if (match.status === 'pending' && match.created_by === user.id) {
        cancelMutation.mutate(
          { match, userId: user.id },
          { onSuccess: exitToHome, onError: (e) => showError(e) },
        )
        return
      }

      if (
        match.status === 'pending' ||
        canLeaveCoopRunMatch(match, user.id)
      ) {
        // Mark this as a voluntary exit so the realtime/optimistic removal of
        // our own participant row isn't mistaken for a host kick.
        selfExitInitiatedRef.current = true
        leaveMutation.mutate(
          { match, userId: user.id },
          {
            onSuccess: exitToHome,
            onError: (e) => {
              selfExitInitiatedRef.current = false
              showError(e)
            },
          },
        )
        return
      }

      if (canRequestMutualCancel(match, user.id)) {
        requestMutualCancelMutation.mutate(
          { match, userId: user.id },
          { onSuccess: exitToHome, onError: (e) => showError(e) },
        )
        return
      }

      showBlockedExit()
    }

    const canLeaveOrCancelNow =
      match.status === 'pending' ||
      canLeaveCoopRunMatch(match, user.id) ||
      canRequestMutualCancel(match, user.id)

    if (!canLeaveOrCancelNow) {
      showBlockedExit()
      return
    }

    const title = match.status === 'pending' ? 'ออกจาก lobby?' : 'ออกจากแมตช์?'
    const message = canRequestMutualCancel(match, user.id)
      ? 'แมตช์เริ่ม/ล็อกแต้มแล้ว ออกทันทีไม่ได้ ถ้าต้องการหยุดให้ส่งคำขอยกเลิกให้อีกฝั่งยืนยัน'
      : 'ถ้ายืนยัน ระบบจะพยายามให้คุณออกจาก match ตามสถานะปัจจุบัน'
    const confirmText = canRequestMutualCancel(match, user.id)
      ? 'ขอยกเลิกแมตช์'
      : match.status === 'pending' && match.created_by === user.id
        ? 'ยกเลิก lobby'
        : 'ออกจากแมตช์'

    if (match.status === 'pending') {
      leaveOrCancel()
      return
    }

    if (Platform.OS === 'web') {
      if (globalThis.confirm(`${title}\n\n${message}`)) leaveOrCancel()
      return
    }

    Alert.alert(
      title,
      message,
      [
        { text: 'อยู่ต่อ', style: 'cancel' },
        { text: confirmText, style: 'destructive', onPress: leaveOrCancel },
      ],
    )
  })

  usePreventRemove(
    !!match &&
      !navigationExitAllowed &&
      (
        match.status === 'cancelled' ||
        (match.status === 'settled' && !isTeamSportActivity)
      ),
    () => {
      replaceWithHome()
    },
  )

  useEffect(() => {
    if (resultAuthority === 'arena') return
    if (match?.status === 'cancelled') {
      // Participants see the cancelled moment (with an exit button); only
      // spectators get bounced out automatically.
      if (!isMyParticipant) replaceWithHome()
      return
    }
    if (
      match?.id &&
      shouldAutoEnterActiveMatch({
        status: match.status,
        isMyParticipant,
        isTeamSportActivity,
        myTeamResultSubmitted,
        // While our own start is still in flight the in_progress status is only
        // optimistic — wait for it to settle so a rejected start doesn't push us
        // into the submit / live-GPS screen for a match that rolls back.
        startPending: startMutation.isPending,
        alreadyNavigated: submittedNavRef.current === match.id,
      })
    ) {
      submittedNavRef.current = match.id
      allowRouteReplace()
      if (isSensorRunning && canUseRunningMatchAlpha) {
        guardedRouter.replace(`/run/active?matchId=${match.id}`, {
          actionKey: `match:${match.id}:run-active`,
        })
      } else if (!isSensorRunning) {
        guardedRouter.replace(`/match/${match.id}/submit`, {
          actionKey: `match:${match.id}:submit`,
        })
      }
    }
    if (match?.status !== 'in_progress') {
      submittedNavRef.current = null
    }
  }, [allowRouteReplace, replaceWithHome, match?.status, match?.id, isMyParticipant, isSensorRunning, canUseRunningMatchAlpha, isTeamSportActivity, myTeamResultSubmitted, resultAuthority, startMutation.isPending])

  useEffect(() => {
    if (!match?.id) return
    let cancelled = false
    hasSeenVictory(match.id).then((seen) => {
      if (!cancelled) setVictoryDismissed(seen)
    })
    return () => {
      cancelled = true
    }
  }, [match?.id])

  useEffect(() => {
    if (!match?.id) return
    let cancelled = false
    hasSeenRecap(match.id).then((seen) => {
      if (!cancelled) setRecapSeen(seen)
    })
    return () => {
      cancelled = true
    }
  }, [match?.id])

  // A score correction reopens a previously-settled match (settled -> in_progress).
  // Clear the persisted "recap seen" flag so the next settle shows the recap again.
  // The same watcher marks a fresh settle (non-settled -> settled observed live on
  // this screen), which is the only case that may show the celebration modal.
  const prevStatusForRecapRef = useRef<MatchWithRelations['status'] | null>(null)
  useEffect(() => {
    const prev = prevStatusForRecapRef.current
    if (prev === 'settled' && match?.status === 'in_progress' && match?.id) {
      void clearRecapSeen(match.id)
      setRecapSeen(false)
      recapShownFiredRef.current = null
    }
    if (prev !== null && prev !== 'settled' && match?.status === 'settled') {
      setSettledWhileViewing(true)
    }
    prevStatusForRecapRef.current = match?.status ?? null
  }, [match?.status, match?.id])

  useEffect(() => {
    const ready =
      match?.status === 'settled' &&
      match.activity_type === 'basketball' &&
      !!recapMoment &&
      recapSeen === false &&
      settledWhileViewing
    if (!ready || !match) return
    if (recapShownFiredRef.current === match.id) return
    recapShownFiredRef.current = match.id
    track({
      name: 'recap_moment_shown',
      properties: {
        match_id: match.id,
        activity: match.activity_type,
        outcome: recapMoment.tone,
        tier_change: recapMoment.tier?.change ?? 'none',
      },
    })
  }, [match, recapMoment, recapSeen, settledWhileViewing, track])

  const pendingInviteId = derived?.myPendingInvite?.id ?? null
  useEffect(() => {
    if (!pendingInviteId) return
    guardedRouter.replace('/notifications', {
      actionKey: `pending-invite:${pendingInviteId}:notifications`,
    })
  }, [pendingInviteId])


  const runningMode = deriveRunningMode(match?.activity_type, match?.rule_params, match?.is_coop)
  const isSinglePoolRunning = runningMode === 'coop' || runningMode === 'ffa'
  const acceptedCount = derived ? derived.participants.filter((p) => p.accepted_at).length : 0
  const totalSeats = match ? (isSinglePoolRunning ? match.team_size_per_side : match.team_size_per_side * 2) : 0
  const progressPct = totalSeats > 0 ? (acceptedCount / totalSeats) : 0

  const progressValue = useSharedValue(0)
  useEffect(() => {
    progressValue.value = withTiming(progressPct, { duration: 600, easing: Easing.out(Easing.cubic) })
  }, [progressPct, progressValue])
  const progressStyle = useAnimatedStyle(() => ({
    width: `${Math.round(progressValue.value * 100)}%`,
  }))

  const rematchParams = match ? buildRematchParams(match, user?.id ?? '') : null
  const headToHead = useHeadToHead(rematchParams?.inviteUserId, rematchParams?.activity)

  const requestRematchMutation = useRequestRematch()
  const rematchPending = requestRematchMutation.isPending
  // 1v1 with a known opponent → one-tap server rematch (no /match/new round trip).
  // Anything else (team/FFA/coop, or opponent without a handle) falls back to the
  // create-match flow so the host can re-pick the room.
  const handleRematch = useCallback(
    (navigateToNewMatch: () => void) => {
      const targetMatchId = match?.id
      if (!targetMatchId) return
      if (rematchParams?.inviteUserId) {
        requestRematchMutation.mutate(targetMatchId, {
          onSuccess: () => {
            if (Platform.OS === 'web') globalThis.alert('ส่งคำขอรีแมตช์แล้ว')
            else Alert.alert('รีแมตช์', 'ส่งคำขอรีแมตช์แล้ว')
          },
          onError: (e) => showError(e),
        })
        return
      }
      navigateToNewMatch()
    },
    [match?.id, rematchParams?.inviteUserId, requestRematchMutation, showError],
  )

  // Computed directly off `match` (not the later `isLiveBasketballCourt`
  // const, which is derived after the early returns below) so this hook call
  // stays before every early return and keeps hook order stable.
  const watchPresenceCount = useWatchPresenceCount(
    match?.id,
    match?.activity_type === 'basketball' && match?.status === 'in_progress' && !!match?.allow_spectators,
  )

  if (isPending) return <MatchSkeleton />
  if (error)
    return (
      <View style={styles.center}>
        <View style={styles.loadErrorState}>
          <View style={styles.loadErrorIcon}>
            <MaterialCommunityIcons name="alert-circle-outline" size={28} color={theme.risk} />
          </View>
          <Text style={styles.resultText}>เปิดแมตช์ไม่สำเร็จ</Text>
          <Text style={styles.loadErrorHint}>ตรวจสอบการเชื่อมต่อแล้วลองใหม่ได้ หรือกลับไปเลือก Arena อื่น</Text>
          <PressableScale
            style={styles.loadErrorPrimary}
            onPress={() => { void refetch() }}
            accessibilityRole="button"
            accessibilityLabel="ลองโหลดแมตช์ใหม่"
          >
            <MaterialCommunityIcons name="refresh" size={18} color={theme.chalk} />
            <Text style={styles.loadErrorPrimaryText}>ลองใหม่</Text>
          </PressableScale>
          <PressableScale
            style={styles.secondaryButton}
            onPress={replaceWithHome}
            accessibilityRole="button"
            accessibilityLabel="กลับ Lobby"
          >
            <MaterialCommunityIcons name="arrow-left" size={18} color={theme.inkSoft} />
            <Text style={styles.secondaryButtonText}>กลับ Lobby</Text>
          </PressableScale>
        </View>
      </View>
    )
  if (!match) {
    return (
      <View style={styles.center}>
        <Text style={styles.resultText}>Match not found</Text>
        <PressableScale style={styles.secondaryButton} onPress={replaceWithHome}>
          <Text style={styles.secondaryButtonText}>Back to Home</Text>
        </PressableScale>
      </View>
    )
  }
  if (resultAuthority === 'arena') return <MatchSkeleton />
  if (resultAuthority === 'blocked') {
    return (
      <View style={styles.center}>
        <View style={styles.loadErrorState}>
          <View style={styles.loadErrorIcon}>
            <MaterialCommunityIcons name="shield-alert-outline" size={28} color={theme.risk} />
          </View>
          <Text style={styles.resultText}>เปิดผลการแข่งขันนี้ไม่ได้</Text>
          <Text style={styles.loadErrorHint}>ข้อมูลแหล่งที่มาของผลไม่พร้อมใช้งาน จึงยังไม่แสดงการส่งหรือยืนยันผล</Text>
          <PressableScale
            style={styles.loadErrorPrimary}
            onPress={() => { void refetch() }}
            accessibilityRole="button"
            accessibilityLabel="ลองโหลดผลการแข่งขันใหม่"
          >
            <MaterialCommunityIcons name="refresh" size={18} color={theme.chalk} />
            <Text style={styles.loadErrorPrimaryText}>ลองใหม่</Text>
          </PressableScale>
          <PressableScale
            style={styles.secondaryButton}
            onPress={replaceWithHome}
            accessibilityRole="button"
            accessibilityLabel="กลับ Lobby"
          >
            <MaterialCommunityIcons name="arrow-left" size={18} color={theme.inkSoft} />
            <Text style={styles.secondaryButtonText}>กลับ Lobby</Text>
          </PressableScale>
        </View>
      </View>
    )
  }
  if (!derived || !user || !policy) return null

  const currentUserId = user.id
  const matchHistoryImpact = matchHistoryImpacts.get(match.id) ?? null
  const activeMatch = match
  const matchStake = match.stake
  const currency: WalletCurrency = match.stake_currency
  const currencyIsCredit = currency === 'credit'
  const currentWalletStakeLimit = getWalletStakeLimit(currency, walletSummary?.wallet)
  const currentWalletStakeCap = currentWalletStakeLimit?.limit
  const { participants, myParticipant, mySide, sideA, sideB, potA, potB } = derived

  function viewProfile(userId: string) {
    if (!match) return
    allowRouteReplace()
    guardedRouter.push({
      pathname: '/user/[id]',
      params: { id: userId, fromMatchId: match.id, lockedProfile: '1' },
    }, { actionKey: `match:${match.id}:user:${userId}` })
  }

  // Invite sheets are page-sheet Modals; navigating while one is still presented
  // pushes the route UNDER the modal (looks like the profile never loads). Close
  // the sheet, then navigate once the dismiss has run.
  function openFriendProfileFromInvite(userId: string) {
    setInvitingSide(null)
    setTimeout(() => viewProfile(userId), 350)
  }

  // Referee row → referee-specific profile (trust tier + officiating stats),
  // not the generic player profile.
  function openRefereeProfileFromInvite(userId: string) {
    if (!match) return
    const matchId = match.id
    setAssigningReferee(false)
    setTimeout(() => {
      allowRouteReplace()
      // fromMatchId marks this as an allowed detour so the active-match lock
      // (useActiveMatchResume) doesn't immediately yank us back to the match.
      guardedRouter.push(
        { pathname: '/referee/profile', params: { userId, fromMatchId: matchId } },
        { actionKey: `match:${matchId}:referee-profile:${userId}` },
      )
    }, 350)
  }

  function handleInviteFriend(friend: InvitableFriend) {
    if (!match || invitingSide === null) return
    const side = invitingSide
    setInvitingSide(null)
    inviteMutation.mutate(
      {
        userId: friend.friendId,
        side,
        stake: matchStake,
        handle: friend.handle,
        displayName: friend.displayName,
      },
      {
        onSuccess: () => track({ name: 'invite_sent', properties: { match_id: match.id } }),
        onError: (e) => {
          showError(e)
          const msg = String((e as { message?: string })?.message ?? '')
          track({
            name: 'invite_friend_failed',
            properties: { reason: msg.startsWith('invite_cooldown:') ? 'cooldown' : msg.split(':')[0] || 'unknown' },
          })
        },
      },
    )
  }

  function handleInviteReferee(referee: EligibleReferee) {
    if (!match) return
    setAssigningReferee(false)
    track({
      name: 'invite_referee',
      properties: { match_id: match.id, trust_tier: referee.trustTier, eligible: referee.eligible },
    })
    assignRefereeMutation.mutate(
      { matchId: match.id, refereeUserId: referee.userId },
      {
        onError: (e) => {
          showError(e)
          track({
            name: 'invite_referee_failed',
            properties: { reason: String((e as { message?: string })?.message ?? '').split(':')[0] || 'unknown' },
          })
        },
      },
    )
  }

  function viewCourtParticipantProfile(userId: string) {
    setSelectedCourtParticipant(null)
    viewProfile(userId)
  }

  function viewRunningParticipantProfile(userId: string) {
    setSelectedRunningParticipant(null)
    viewProfile(userId)
  }

  const selectedCourtKickEligibility = getProfileLobbyKickEligibility(
    activeMatch,
    currentUserId,
    selectedCourtParticipant?.userId,
  )
  const selectedRunningKickEligibility = getProfileLobbyKickEligibility(
    activeMatch,
    currentUserId,
    selectedRunningParticipant?.userId,
  )

  const isParticipant = !!myParticipant
  const canJoin = policy.join.allowed
  const canCancel = policy.cancelMatch.allowed
  const canLeaveCoopRun = canLeaveCoopRunMatch(match, currentUserId)
  const canFinishCoopRun = canFinishCoopRunMatch(match, currentUserId)
  const canLeave = policy.leaveMatch.allowed
  const pendingCancelRequest = getPendingCancelRequest(match)
  const pendingCorrectionRequest = getPendingCorrectionRequest(match)
  const canRequestCancel = policy.requestMutualCancel.allowed
  const canRespondCancel = policy.respondMutualCancel.allowed
  const canRequestCorrection = canRequestResultCorrection(match, currentUserId)
  const canRespondCorrection = canRespondToResultCorrection(match, currentUserId)
  const canEditStake = policy.editStake.allowed
  const totalPot = potA + potB
  const submission = getCurrentMatchSubmission(match)
  const submittedScoreLabel = (() => {
    const details = submission?.activity_sessions?.team_sport_activity_details
    if (details && details.side_0_score != null && details.side_1_score != null) {
      return `A ${details.side_0_score} — ${details.side_1_score} B`
    }
    return null
  })()
  const nextAction = getNextAction(match, derived, currentUserId)
  const hideSensorRunningSubmitAction =
    nextAction.kind === 'submit_result' &&
    isSensorRunning &&
    !canUseRunningMatchAlpha
  const canImportHealthWorkout =
    isSensorRunning &&
    canUseRunningMatchAlpha &&
    isParticipant &&
    (match.status === 'accepted' || match.status === 'in_progress')
  const currentAlphaRefereeResult = getCurrentAlphaRefereeResult(match)
  const alphaRefereeDutyState = getAlphaRefereeDutyState(match, currentUserId)
  const refereeInProgress = getRefereeAssignmentInProgress(match)
  const isInvitedRefereeViewer =
    refereeInProgress?.status === 'invited' && refereeInProgress.referee_user_id === currentUserId
  const refereeInviteActivityLabel = ACTIVITY_LABEL[match.activity_type as Activity] ?? match.activity_type
  const refereeInviteResponseNode = isInvitedRefereeViewer ? (
    <RefereeInviteResponseCard
      activityLabel={refereeInviteActivityLabel}
      submitting={respondRefereeMutation.isPending}
      errorText={
        respondRefereeMutation.error
          ? formatMatchActionError(respondRefereeMutation.error, match.activity_type)
          : null
      }
      onAccept={acceptRefereeInvite}
      onDecline={confirmDeclineRefereeInvite}
    />
  ) : null
  const isTeamSportMatch =
    match.activity_type === 'basketball' ||
    match.activity_type === 'badminton'
  const teamResultSubmissions = match.match_team_result_submissions ?? []
  const hasBothTeamResults =
    isTeamSportMatch &&
    hasBothTeamResultSubmissions(teamResultSubmissions)
  const teamChallengeTargetUserId = getTeamResultChallengeTargetUserId(match, currentUserId)
  const isRefereeTeamScoreReview = currentAlphaRefereeResult?.result_kind === 'team_score'
  const teamChallengeBusy =
    challengeTeamResultMutation.isPending ||
    requestRefereeCorrectionMutation.isPending ||
    teamChallengeUploading
  const teamCorrectionToRespond = getMyTeamCorrectionToRespond(match, currentUserId)
  const pendingCancelToRespond =
    !!getPendingCancelRequest(match) && canRespondToMutualCancel(match, currentUserId)
  const teamResolutionModalOpen = !!teamCorrectionToRespond || pendingCancelToRespond
  const myCorrectionDeclined = (match.match_team_result_correction_requests ?? []).some(
    (r) => r.status === 'declined' && r.requested_by === currentUserId,
  )
  const outcomePreview =
    nextAction.kind === 'confirm_result'
      ? getMyOutcomePreview(match, derived, currentUserId)
      : null
  const canReportResultNotConfirmed = policy.reportResultNotConfirmed.allowed
  const reportTargetUserId =
    participants.find((p) => p.user_id !== currentUserId && p.side !== mySide)?.user_id ??
    participants.find((p) => p.user_id !== currentUserId)?.user_id ??
    null

  async function saveRefereePlayerStat(playerUserId: string, stats: {
    points: number
    rebounds: number
    assists: number
    blocks: number
    threePointersMade: number
  }) {
    try {
      await upsertRefereeLiveScoreMutation.mutateAsync({
        matchId: activeMatch.id,
        playerUserId,
        stats,
      })
    } catch (e) {
      showError(e)
      throw e
    }
  }

  async function saveRefereeRunningMark(mark: RefereeRunningDraftMarkInput) {
    try {
      await upsertRefereeRunningDraftMutation.mutateAsync({
        matchId: activeMatch.id,
        mark,
      })
    } catch (e) {
      showError(e)
      throw e
    }
  }

  async function saveNoRefereeScoreDraft(input: NoRefereeScoreDraftSubmitInput) {
    await upsertPlayerScoreDraftMutation.mutateAsync({
      matchId: activeMatch.id,
      submit: input.submit,
      note: input.note,
      proofPaths: input.proofPaths,
      basketballStats: input.basketballStats,
      badmintonSets: input.badmintonSets,
    })
  }

  function addBasketballQuarter() {
    // Quarter control is the assigned referee's alone; player devices render
    // the shared breakdown read-only.
    if (!basketballRefereeCanEdit || setQuarterBoundariesMutation.isPending) return
    const startMs = activeMatch.started_at ? new Date(activeMatch.started_at).getTime() : Date.now()
    const elapsedMs = Math.max(0, Date.now() - startMs)
    setQuarterBoundariesMutation.mutate(
      {
        matchId: activeMatch.id,
        quarterBoundaries: [...quarterBoundaries, quarterBoundaryFromScores(basketballLiveScores, elapsedMs)],
      },
      { onError: (e) => showError(e) },
    )
  }

  function submitRefereeFinalResult() {
    const hasBasketballRefereeStats =
      getAlphaRefereePlayerStatDrafts(activeMatch).length > 0 ||
      hasAnyBasketballLiveStat(optimisticBasketballStats)
    if (activeMatch.activity_type === 'basketball' && !hasBasketballRefereeStats) {
      showError(new Error('กดผู้เล่นเพื่อใส่ stat ก่อนส่งผลให้ผู้เล่นตรวจ'))
      return
    }
    submitRefereeResultMutation.mutate(
      {
        matchId: activeMatch.id,
        result: {
          kind: 'team_score',
          note: refereeFinalNote.trim() || null,
          scoreLog: buildScoreLogFromQuarters(quarterBoundaries, basketballLiveScores),
        },
      },
      {
        onSuccess: () => {
          setRefereeFinalNote('')
          setLiveScoreSheetOpen(false)
        },
        onError: (e) => showError(e),
      },
    )
  }

  function submitRefereeRunningFinalResult(result: {
    draftId: string
    winnerSide: Side | null
    isTie: boolean
  }) {
    submitRefereeResultMutation.mutate(
      {
        matchId: activeMatch.id,
        result: {
          kind: 'manual_running_result',
          winnerSide: result.winnerSide,
          isTie: result.isTie,
          runningDraftId: result.draftId,
          note: refereeFinalNote.trim() || null,
        },
      },
      {
        onSuccess: () => setRefereeFinalNote(''),
        onError: (e) => showError(e),
      },
    )
  }
  const manageActions: MatchManageAction[] = [
    {
      key: 'challenge-team-result',
      label: isRefereeTeamScoreReview ? 'ขอให้กรรมการแก้' : 'โต้แย้งคะแนน',
      hint: isRefereeTeamScoreReview
        ? 'ส่ง note ให้กรรมการแก้คะแนนหรือ stat ก่อนยืนยัน'
        : 'บล็อกการยอมรับผลและส่งให้แอดมินรีวิว',
      icon: isRefereeTeamScoreReview ? 'pencil-circle-outline' : 'alert-circle-outline',
      tone: isRefereeTeamScoreReview ? 'warning' : 'danger',
      disabled: !policy.challengeTeamResult.allowed,
      busy: teamChallengeBusy,
      onPress: () => setTeamChallengeOpen(true),
    },
    {
      key: 'request-cancel',
      label: 'ขอยกเลิกแมตช์',
      hint: 'อีกฝั่งต้องยอมรับก่อน stake ถึงจะคืน',
      icon: 'handshake-outline',
      tone: 'warning',
      disabled: !canRequestCancel,
      busy: requestMutualCancelMutation.isPending,
      onPress: confirmRequestMutualCancel,
    },
    {
      key: 'toggle-spectators',
      label: match.allow_spectators ? 'ปิดการดูสด' : 'เปิดให้ดูสด',
      icon: match.allow_spectators ? 'eye-off-outline' : 'eye-outline',
      tone: 'neutral',
      disabled: !(
        match.created_by === currentUserId &&
        (match.status === 'pending' || match.status === 'accepted' || match.status === 'in_progress')
      ),
      busy: setSpectatorsMutation.isPending,
      onPress: () => setSpectatorsMutation.mutate(
        { matchId: match.id, allow: !match.allow_spectators },
        { onError: (e) => showError(e) },
      ),
    },
  ]

  const matchJoinMode = match.join_mode
  // Coop matches with stake = 0 ("ช่วยกันวิ่ง") suppress all wager UI:
  // pill, pot card, stake editor. Future "coop with bonus" mode will
  // have stake > 0 and these surfaces re-appear naturally.
  const hideStakeUi = match.is_coop && matchStake === 0
  const hideCompetitiveUi =
    match.is_coop &&
    match.activity_type === 'running' &&
    (match.status === 'submitted' || match.status === 'disputed' || match.status === 'settled')
  function joinSide(side: Side, entryCode?: string) {
    if (matchJoinMode === 'code' && !entryCode) {
      setEntrySidePrompt(side)
      return
    }
    if (!hideStakeUi && currentWalletStakeLimit != null && currentWalletStakeLimit.limit < matchStake) {
      const unit = CURRENCY_UNIT[currency]
      if (currency === 'leaderboard_point') {
        Alert.alert(
          'แต้มพร้อมใช้ไม่พอ',
          `ห้องนี้ต้องใช้ ${matchStake} ${unit} แต่คุณมีพร้อมใช้ ${currentWalletStakeLimit.availableSpendable ?? currentWalletStakeLimit.limit} ${unit}`,
        )
        return
      }
      Alert.alert(
        'เข้าไม่ได้',
        `ห้องนี้ต้องใช้ขั้นต่ำ ${matchStake} ${unit} แต่คุณพร้อมเดิมพันได้ ${currentWalletStakeLimit.limit} ${unit}`,
      )
      return
    }
    setJoining(side)
    joinMutation.mutate(
      { userId: currentUserId, side, stake: matchStake, entryCode },
      {
        onSuccess: () => {
          setJoining(null)
          setEntrySidePrompt(null)
        },
        onError: (e) => {
          setJoining(null)
          showError(e)
        },
      }
    )
  }

  // Host kick. Only the match creator can cancel pending invites — the
  // backend RPC is the authority here, but we hide the ✕ button from
  // non-hosts so a tap doesn't get rejected after a confirm dialog.
  function confirmKickCourtParticipant(participant: LobbyPlayerPreviewParticipant) {
    const eligibility = getProfileLobbyKickEligibility(activeMatch, currentUserId, participant.userId)
    if (!eligibility.allowed) return

    const kickAction = () => {
      kickParticipantMutation.mutate(
        {
          match: activeMatch,
          hostUserId: currentUserId,
          targetUserId: participant.userId,
        },
        {
          onSuccess: () => {
            setSelectedCourtParticipant(null)
            setSelectedRunningParticipant(null)
          },
          onError: (e) => showError(e),
        },
      )
    }

    if (Platform.OS === 'web') {
      const confirmKick = (globalThis as typeof globalThis & {
        confirm?: (message: string) => boolean
      }).confirm
      if (!confirmKick || confirmKick(`Kick ${participant.name} from this room?`)) {
        kickAction()
      }
      return
    }

    Alert.alert(
      'Kick player?',
      `Remove ${participant.name} from this room before the match starts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Kick', style: 'destructive', onPress: kickAction },
      ],
    )
  }

  const isHost = match?.created_by === currentUserId
  const onCancelInvite =
    match?.status === 'pending' && isHost
      ? (inviteId: string) => {
          const invite = match?.match_invites?.find((i) => i.id === inviteId)
          const inviteeName =
            invite?.invitee?.display_name ||
            (invite?.invitee?.handle ? `@${invite.invitee.handle}` : 'ผู้ถูกเชิญ')
          Alert.alert(
            'ยกเลิกคำเชิญ?',
            `เตะ ${inviteeName} ออกจากล็อบบี้?`,
            [
              { text: 'ไม่', style: 'cancel' },
              {
                text: 'ยกเลิกคำเชิญ',
                style: 'destructive',
                onPress: () =>
                  cancelInviteMutation.mutate(inviteId, { onError: (e) => showError(e) }),
              },
            ],
          )
        }
      : undefined

  async function copyJoinCode(joinCode: string) {
    try {
      // Lazy-require so the screen doesn't crash if the dev client
      // hasn't been rebuilt with expo-clipboard linked.
      const Clipboard = await import('expo-clipboard')
      await Clipboard.setStringAsync(joinCode)
      if (Platform.OS !== 'web') {
        Alert.alert('คัดลอกแล้ว', `รหัส ${joinCode} อยู่ใน clipboard แล้ว`)
      }
    } catch (e) {
      showError(e)
    }
  }

  function confirmCancelMatch() {
    const pendingMatch = match!
    const cancellingUserId = currentUserId
    const cancelAction = () => {
      cancelMutation.mutate(
        { match: pendingMatch, userId: cancellingUserId },
        {
          onSuccess: () => {
            void clearActiveMatchLock(cancellingUserId, pendingMatch.id)
            replaceWithHome()
          },
          onError: (e) => showError(e),
        }
      )
    }

    if (Platform.OS === 'web') {
      cancelAction()
      return
    }

    Alert.alert(
      'Cancel Match',
      'This will cancel the match before everyone accepts. No points will be locked.',
      [
        { text: 'Keep Match', style: 'cancel' },
        { text: 'Cancel Match', style: 'destructive', onPress: cancelAction },
      ]
    )
  }

  function confirmLeaveMatch() {
    const pendingMatch = match!
    const leavingUserId = currentUserId
    const leaveAction = () => {
      // Mark this as a voluntary exit so the removal of our own participant row
      // isn't mistaken for a host kick ("the host removed you from this room").
      selfExitInitiatedRef.current = true
      leaveMutation.mutate(
        { match: pendingMatch, userId: leavingUserId },
        {
          onSuccess: () => {
            void clearActiveMatchLock(leavingUserId, pendingMatch.id)
            replaceWithHome()
          },
          onError: (e) => {
            selfExitInitiatedRef.current = false
            if (
              isEdgeFunctionError(e) &&
              e.code === 'cannot_leave_after_valid_submission'
            ) {
              const msg =
                'You already contributed to this co-op run, so you will stay in the team result.'
              if (Platform.OS === 'web') globalThis.alert(msg)
              else Alert.alert('ส่งผลแล้ว', msg)
              return
            }
            showError(e)
          },
        },
      )
    }

    const isCoopRunLeave = canLeaveCoopRun && pendingMatch.status !== 'pending'
    if (!isCoopRunLeave) {
      leaveAction()
      return
    }

    const title = isCoopRunLeave ? 'ออกจากแมตช์ co-op?' : 'Leave Lobby'
    const message = isCoopRunLeave
      ? 'คุณจะถูกเอาออกจากทีม run นี้ ทีมที่เหลือยังวิ่งต่อได้'
      : 'You can leave because this match has not started yet. No points are locked.'
    const cta = isCoopRunLeave ? 'ออกจากแมตช์' : 'Leave Lobby'

    if (Platform.OS === 'web') {
      leaveAction()
      return
    }

    Alert.alert(
      title,
      message,
      [
        { text: 'อยู่ต่อ', style: 'cancel' },
        { text: cta, style: 'destructive', onPress: leaveAction },
      ],
    )
  }

  function acceptRefereeInvite() {
    respondRefereeMutation.mutate(
      { matchId: match!.id, response: 'accept' },
      { onError: (e) => showError(e) },
    )
  }

  function confirmDeclineRefereeInvite() {
    const declineAction = () => {
      respondRefereeMutation.mutate(
        { matchId: match!.id, response: 'decline' },
        { onError: (e) => showError(e) },
      )
    }

    if (Platform.OS === 'web') {
      declineAction()
      return
    }

    Alert.alert(
      'ปฏิเสธการเป็นกรรมการ?',
      'หากปฏิเสธ ผู้สร้างจะต้องเลือกกรรมการใหม่',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        { text: 'ปฏิเสธ', style: 'destructive', onPress: declineAction },
      ],
    )
  }

  function confirmFinishCoopRun() {
    const finishingMatch = match!
    const finishAction = () => {
      finishCoopRunMutation.mutate(
        { match: finishingMatch, userId: currentUserId },
        { onError: (e) => showError(e) },
      )
    }

    const title = 'จบการวิ่งทีม?'
    const message =
      'ทีมจะถูกปิดผลทันทีด้วยคนที่วิ่งแล้ว คนที่ยังไม่ส่งผลจะถูกเอาออกจากรอบนี้'

    if (Platform.OS === 'web') {
      if (globalThis.confirm(`${title}\n\n${message}`)) finishAction()
      return
    }

    Alert.alert(
      title,
      message,
      [
        { text: 'ยังก่อน', style: 'cancel' },
        { text: 'จบการวิ่ง', style: 'default', onPress: finishAction },
      ],
    )
  }

  function confirmRequestMutualCancel() {
    const requestMatch = match!
    const requestingUserId = currentUserId
    const action = () => {
      requestMutualCancelMutation.mutate(
        { match: requestMatch, userId: requestingUserId },
        {
          onSuccess: () => {
            void clearActiveMatchLock(requestingUserId, requestMatch.id)
            replaceWithHome()
          },
          onError: (e) => showError(e),
        },
      )
    }

    if (Platform.OS === 'web') {
      action()
      return
    }

    Alert.alert(
      'Request Cancel',
      'The match only cancels if the other side agrees within 24 hours. Locked stake is refunded after agreement.',
      [
        { text: 'Keep Match', style: 'cancel' },
        { text: 'Request Cancel', style: 'destructive', onPress: action },
      ],
    )
  }

  function respondToMutualCancel(agree: boolean) {
    const responseMatch = match!
    const respondingUserId = currentUserId
    respondToMutualCancelMutation.mutate(
      { match: responseMatch, userId: respondingUserId, agree },
      {
        onSuccess: () => {
          if (!agree) return
          void clearActiveMatchLock(respondingUserId, responseMatch.id)
          replaceWithHome()
        },
        onError: (e) => showError(e),
      },
    )
  }

  function confirmDisputeMatch() {
    const submittedMatch = match!
    const disputingUserId = currentUserId
    const disputeAction = () => {
      disputeMutation.mutate(
        { match: submittedMatch, userId: disputingUserId },
        { onError: (e) => showError(e) }
      )
    }

    if (Platform.OS === 'web') {
      disputeAction()
      return
    }

    Alert.alert(
      'Dispute Result',
      'This will mark the submitted result as disputed and notify the other side.',
      [
        { text: 'Keep Reviewing', style: 'cancel' },
        { text: 'Dispute Result', style: 'destructive', onPress: disputeAction },
      ]
    )
  }

  function confirmReportResultNotConfirmed() {
    const submittedMatch = match!
    const reportAction = async () => {
      try {
        let evidencePaths: string[] = []
        if (reportProofAssets.length > 0) {
          setReportUploading(true)
          try {
            evidencePaths = await uploadProofMedia({
              userId: currentUserId,
              matchId: submittedMatch.id,
              assets: reportProofAssets,
              folder: 'reports',
            })
          } finally {
            setReportUploading(false)
          }
        }

        reportResultMutation.mutate(
          {
            match: submittedMatch,
            reporterUserId: currentUserId,
            reportedUserId: reportTargetUserId,
            note: reportNote.trim() || 'Result submitted but opponent has not confirmed.',
            evidencePaths,
          },
          {
            onSuccess: () => {
              setReportNote('')
              setReportProofAssets([])
              if (Platform.OS === 'web') {
                globalThis.alert('Report sent for review.')
                return
              }
              Alert.alert('Report sent', 'This match has been added to the abuse review queue.')
            },
            onError: (e) => showError(e),
          },
        )
      } catch (e) {
        setReportUploading(false)
        showError(e)
      }
    }

    if (Platform.OS === 'web') {
      reportAction()
      return
    }

    Alert.alert(
      'Report Result Review',
      'Use this when the other side is refusing or avoiding result confirmation. You can attach proof; the current match result remains the default while admin review checks the flag.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Report', style: 'destructive', onPress: reportAction },
      ],
    )
  }

  async function submitTeamResultChallenge() {
    const challengeMatch = match!
    const note = teamChallengeNote.trim()
    if (!note) {
      const message = 'ระบุเหตุผลก่อนส่งโต้แย้งคะแนน'
      if (Platform.OS === 'web') globalThis.alert(message)
      else Alert.alert('ยังไม่มีเหตุผล', message)
      return
    }

    if (isRefereeTeamScoreReview) {
      requestRefereeCorrectionMutation.mutate(
        {
          matchId: challengeMatch.id,
          note,
        },
        {
          onSuccess: () => {
            setTeamChallengeOpen(false)
            setTeamChallengeNote('')
            setTeamChallengeProofAssets([])
            void clearActiveMatchLock(currentUserId, challengeMatch.id)
            const message = 'ส่งคำขอแก้ให้กรรมการแล้ว คะแนนเดิมจะรอให้กรรมการตรวจและส่งใหม่'
            if (Platform.OS === 'web') {
              globalThis.alert(message)
              return
            }
            Alert.alert('ขอให้กรรมการแก้แล้ว', message)
          },
          onError: (e) => showError(e),
        },
      )
      return
    }

    try {
      let evidencePaths: string[] = []
      if (teamChallengeProofAssets.length > 0) {
        setTeamChallengeUploading(true)
        try {
          evidencePaths = await uploadProofMedia({
            userId: currentUserId,
            matchId: challengeMatch.id,
            assets: teamChallengeProofAssets,
            folder: 'reports',
          })
        } finally {
          setTeamChallengeUploading(false)
        }
      }

      challengeTeamResultMutation.mutate(
        {
          match: challengeMatch,
          reporterUserId: currentUserId,
          reportedUserId: teamChallengeTargetUserId,
          note,
          evidencePaths,
        },
        {
          onSuccess: () => {
            setTeamChallengeOpen(false)
            setTeamChallengeNote('')
            setTeamChallengeProofAssets([])
            void clearActiveMatchLock(currentUserId, challengeMatch.id)
            allowRouteReplace()
            const message = 'ระบบบล็อกการยอมรับผลไว้แล้ว คุณออกไปเล่นแมตช์อื่นและกลับมายอมรับผลจากหน้า Matches ได้เมื่อมีคะแนนใหม่'
            if (Platform.OS === 'web') {
              globalThis.alert(message)
              return
            }
            Alert.alert('ส่งโต้แย้งแล้ว', message)
          },
          onError: (e) => showError(e),
        },
      )
    } catch (e) {
      setTeamChallengeUploading(false)
      showError(e)
    }
  }

  const teamLabel = runningMode === 'ffa'
    ? `FFA · ${match.team_size_per_side} คน`
    : match.is_coop
    ? `${match.team_size_per_side} คน · ทีมเดียว`
    : match.team_size_per_side === 1 ? '1v1' : `${match.team_size_per_side}v${match.team_size_per_side}`

  const winnerSide = participants.find((p) => p.user_id === match.winner_user_id)?.side
  const iWon = match.status === 'settled' && !match.is_coop && !match.is_tie && (
    runningMode === 'ffa' ? match.winner_user_id === currentUserId : winnerSide === mySide
  )
  const showVictoryOverlay =
    iWon && victoryDismissed === false && match.activity_type !== 'basketball'
  const isRecapTeamSport = isTeamSportActivity
  const showTeamSportRecap = match.status === 'settled' && isParticipant && isRecapTeamSport
  const showRecapMoment =
    match.status === 'settled' &&
    isParticipant &&
    match.activity_type === 'basketball' &&
    !!recapMoment &&
    recapSeen === false &&
    settledWhileViewing
  const showEkidenRelayPlan =
    match.activity_type === 'running' &&
    match.rule_params?.template === 'ekiden_relay' &&
    !showTeamSportRecap
  const showLobbyMeta = match.status === 'pending' || match.status === 'accepted'
  const activeRefereeAssignment = activeRefereeAssignmentForProfile
  const activeRefereeName = formatAssignedRefereeName(activeRefereeAssignment)
  const hasActiveBasketballReferee =
    match.activity_type === 'basketball' &&
    !!activeRefereeAssignment
  const canAssignAlphaReferee =
    match.status === 'pending' &&
    match.created_by === currentUserId &&
    !activeRefereeAssignment
  const runningMapLobbyLayout = buildRunningLobbyLayout(match, derived, currentUserId, {
    refereeAssignment: refereeInProgress,
  })
  const basketballSelfStatDrafts = getBasketballPlayerSelfStatDrafts(match)
  const refereeBasketballStatDrafts = getAlphaRefereePlayerStatDrafts(match)
  const isBasketballReferee =
    match.activity_type === 'basketball' &&
    alphaRefereeDutyState !== 'closed'
  const canUseBasketballSelfStats =
    match.activity_type === 'basketball' &&
    !!activeRefereeAssignment &&
    (match.status === 'accepted' || match.status === 'in_progress')
  const showBasketballSelfStats =
    canUseBasketballSelfStats &&
    (isParticipant || isBasketballReferee)
  const playerScoreDrafts = Array.isArray(match.player_score_drafts)
    ? match.player_score_drafts
    : match.player_score_drafts
      ? [match.player_score_drafts]
      : []
  const myBasketballSideSubmitted =
    mySide != null &&
    isPlayerScoreDraftSubmittedForSide(playerScoreDrafts, mySide)
  const basketballLiveStatsByUser = buildBasketballLiveStatsByUser({
    participants,
    refereeStatDrafts: hasActiveBasketballReferee ? refereeBasketballStatDrafts : [],
    playerScoreDrafts: hasActiveBasketballReferee ? [] : playerScoreDrafts,
    optimisticStats: optimisticBasketballStats,
  })
  const basketballLiveScores = getBasketballLiveScoreBySide(participants, basketballLiveStatsByUser)
  const basketballLivePointsByUser =
    match.activity_type === 'basketball' && match.status === 'in_progress'
      ? Object.fromEntries(
          Object.entries(basketballLiveStatsByUser).map(([userId, stat]) => [userId, stat.points]),
        )
      : undefined
  const preferredPositionShortByUser = preferredPositionKeys
    ? Object.fromEntries(
        Object.entries(preferredPositionKeys)
          .map(([uid, key]) => [uid, basketballPositionShort(key)])
          .filter((entry): entry is [string, string] => entry[1] != null),
      )
    : undefined
  const teamSportCourtLayout = buildTeamSportLobbyCourt(match, derived, currentUserId, {
    livePointsByUser: basketballLivePointsByUser,
    equippedTitlesByUser: lobbyTitlesByUser,
    equippedFramesByUser: lobbyFramesByUser,
    tiersByUser: lobbyTiersByUser,
    preferredPositionShortByUser,
  })
  const basketballActivitySessionId =
    submission?.activity_session_id ??
    submission?.activity_sessions?.id ??
    null
  const showNoRefereeScoreDraft =
    match.status === 'in_progress' &&
    isTeamSportMatch &&
    match.activity_type !== 'basketball' &&
    isParticipant &&
    mySide != null &&
    !activeRefereeAssignment &&
    !hasBothTeamResults

  async function saveBasketballSelfStat(stats: {
    points: number
    rebounds: number
    assists: number
    blocks: number
    threePointersMade: number
  }, note: string | null) {
    await upsertSelfStatDraftMutation.mutateAsync({
      matchId: activeMatch.id,
      stats,
      note,
    })
  }

  const basketballRefereeCanEdit =
    match.activity_type === 'basketball' &&
    hasActiveBasketballReferee &&
    isBasketballReferee
  const basketballEndGameCanSubmit = canSubmitBasketballEndGame({
    matchStatus: match.status,
    hasReferee: hasActiveBasketballReferee,
    refereeCanSubmit: basketballRefereeCanEdit,
    playerCanSubmit: isParticipant && mySide != null && !hasBothTeamResults,
    currentUserSide: mySide,
    ownSideSubmitted: myBasketballSideSubmitted,
    participants,
    statsByUser: basketballLiveStatsByUser,
  })

  function canEditCourtBasketballStat(participant: BasketballLobbyCourtParticipant | null): boolean {
    if (!participant || activeMatch.activity_type !== 'basketball') return false
    const target = participants.find((candidate) => candidate.user_id === participant.userId)
    if (!target) return false
    return canEditBasketballLiveStat({
      matchStatus: activeMatch.status,
      hasReferee: hasActiveBasketballReferee,
      refereeCanEdit: basketballRefereeCanEdit,
      currentUserSide: mySide,
      targetSide: target.side,
      targetIsActive: target.is_active !== false,
      ownSideSubmitted: myBasketballSideSubmitted,
    })
  }

  function handleCourtParticipantPress(participant: BasketballLobbyCourtParticipant) {
    if (canEditCourtBasketballStat(participant)) {
      setSelectedBasketballStatParticipant(participant)
      return
    }
    setSelectedCourtParticipant(participant)
  }

  function updateBasketballLiveStat(playerUserId: string, stats: BasketballLiveStatLine) {
    const nextStats = {
      ...basketballLiveStatsByUser,
      [playerUserId]: stats,
    }
    setOptimisticBasketballStats((current) => ({
      ...current,
      [playerUserId]: stats,
    }))
    queueBasketballLiveStatSave(playerUserId, stats, nextStats)
  }

  function queueBasketballLiveStatSave(
    playerUserId: string,
    stats: BasketballLiveStatLine,
    nextStatsByUser: BasketballLiveStatsByUser,
  ) {
    const existing = basketballSaveTimersRef.current[playerUserId]
    if (existing) clearTimeout(existing)
    setBasketballStatSaveState((current) => ({ ...current, [playerUserId]: 'saving' }))
    basketballSaveTimersRef.current[playerUserId] = setTimeout(() => {
      void saveBasketballLiveStatNow(playerUserId, stats, nextStatsByUser)
    }, 450)
  }

  async function saveBasketballLiveStatNow(
    playerUserId: string,
    stats: BasketballLiveStatLine,
    nextStatsByUser: BasketballLiveStatsByUser,
  ) {
    delete basketballSaveTimersRef.current[playerUserId]
    try {
      if (hasActiveBasketballReferee) {
        await saveRefereePlayerStat(playerUserId, stats)
      } else {
        if (mySide == null) return
        await saveNoRefereeScoreDraft({
          submit: false,
          note: null,
          proofPaths: [],
          basketballStats: buildNoRefereeBasketballStats(participants, mySide, nextStatsByUser),
          badmintonSets: [],
        })
      }
      setBasketballStatSaveState((current) => ({ ...current, [playerUserId]: 'saved' }))
    } catch (e) {
      if (!hasActiveBasketballReferee) showError(e)
      setBasketballStatSaveState((current) => ({ ...current, [playerUserId]: 'error' }))
    }
  }

  async function submitBasketballCourtEndGame() {
    Object.values(basketballSaveTimersRef.current).forEach(clearTimeout)
    basketballSaveTimersRef.current = {}

    if (hasActiveBasketballReferee) {
      try {
        for (const [playerUserId, stats] of Object.entries(optimisticBasketballStats)) {
          await saveRefereePlayerStat(playerUserId, stats)
        }
        submitRefereeFinalResult()
      } catch {
        // saveRefereePlayerStat already presents the action error.
      }
      return
    }

    if (mySide == null) return
    try {
      await saveNoRefereeScoreDraft({
        submit: true,
        note: null,
        proofPaths: [],
        basketballStats: buildNoRefereeBasketballStats(participants, mySide, basketballLiveStatsByUser),
        badmintonSets: [],
      })
    } catch (e) {
      showError(e)
    }
  }

  // Tap-first: navigate immediately even if the submission relation hasn't
  // landed in the match cache yet — the report screen resolves the session by
  // matchId and shows its own loader.
  function viewBasketballAnalysis() {
    allowRouteReplace()
    if (basketballActivitySessionId) {
      guardedRouter.push({
        pathname: '/activity/coach-report/[id]',
        params: { id: basketballActivitySessionId },
      }, { actionKey: `match:${activeMatch.id}:analysis:${basketballActivitySessionId}` })
      return
    }
    guardedRouter.push({
      pathname: '/activity/coach-report/[id]',
      params: { id: 'by-match', matchId: activeMatch.id },
    }, { actionKey: `match:${activeMatch.id}:analysis:by-match` })
  }

  if (nextAction.kind === 'accepting_invite') {
    return (
      <View style={styles.center}>
        <MaterialCommunityIcons name="bell-ring-outline" size={34} color={theme.amber} />
        <Text style={styles.info}>รับคำเชิญจากหน้า Notifications เท่านั้น</Text>
        <PressableScale
          style={styles.secondaryButton}
          onPress={() => guardedRouter.replace('/notifications', {
            actionKey: `pending-invite:${pendingInviteId ?? match.id}:button`,
          })}
        >
          <Text style={styles.secondaryButtonText}>ไปที่ Notifications</Text>
        </PressableScale>
      </View>
    )
  }

  if (runningMapLobbyLayout) {
    const runningMatch = match
    const runningPolicy = policy
    const isCrewRunLobby = runningMapLobbyLayout.mode === 'crew_map'
    const firstJoinSide: Side = isCrewRunLobby
      ? 0
      : !derived.sideAFull
        ? 0
        : !derived.sideBFull
          ? 1
          : 0
    const firstInviteSide: Side = isCrewRunLobby
      ? 0
      : !derived.sideBFull
        ? 1
        : !derived.sideAFull
          ? 0
          : mySide ?? 0
    const isAssignedRunningReferee = activeRefereeAssignment?.referee_user_id === currentUserId
    const hasLobbySlot = runningMapLobbyLayout.openRunnerSlots > 0
    const canJoinRunning = canJoin && hasLobbySlot && !isAssignedRunningReferee && !isInvitedRefereeViewer
    const canInviteIntoRunning = runningMatch.status === 'pending' && isParticipant && hasLobbySlot
    const myAccepted = !!myParticipant?.accepted_at
    const runningActionPlan = buildRunningLobbyActions({
      isParticipant,
      isHost: runningMatch.created_by === currentUserId,
      canJoin: canJoinRunning,
      firstJoinSide,
      canStart: runningPolicy.startMatch.allowed,
      canInvite: canInviteIntoRunning,
      myAccepted,
      canEditStake: canEditStake && !hideStakeUi,
      canLeave,
      canCancel,
    })
    const runningLiveStats = buildRunningLobbyLiveStats(runningMatch, currentUserId)
    const runningParticipantDistanceLabels = buildRunningLobbyParticipantDistanceLabels(runningMatch)
    const runningRefereeAction: RunningMapLobbyRefereeAction | null = runningMapLobbyLayout.refereeSlot
      ? {
        label:
          refereeInProgress?.status === 'assigned' ? (activeRefereeName ?? 'กรรมการ')
          : refereeInProgress?.status === 'invited' ? `รอตอบรับ · ${refereeInProgress.referee?.display_name ?? 'กรรมการ'}`
          : (canAssignAlphaReferee ? 'เพิ่มกรรมการ' : runningMatch.status === 'pending' ? 'Host เท่านั้น' : 'ล็อกแล้ว'),
        status:
          refereeInProgress?.status === 'assigned' ? 'ASSIGNED'
          : refereeInProgress?.status === 'invited' ? 'PENDING'
          : 'REF SLOT',
        icon: refereeInProgress ? 'whistle-outline' : 'account-plus-outline',
        disabled: !canAssignAlphaReferee,
        busy: assignRefereeMutation.isPending,
        onPress: canAssignAlphaReferee ? () => setAssigningReferee(true) : undefined,
      }
      : null

    function handleRunningParticipantPress(participant: RunningLobbyParticipantToken) {
      setSelectedRunningParticipant(runningParticipantTokenToLobbyPreview(participant))
    }

    function mapRunningPrimaryAction(action: RunningLobbyPrimaryAction): RunningMapLobbyAction {
      switch (action.key) {
        case 'join':
          return {
            key: 'join',
            label: isCrewRunLobby ? 'JOIN CREW' : `JOIN ${action.side === 0 ? 'A' : 'B'}`,
            icon: 'login',
            busy: joinMutation.isPending,
            onPress: () => joinSide(action.side),
          }
        case 'start':
          return {
            key: 'start',
            label: startMutation.isPending ? 'STARTING' : 'START RUN',
            icon: 'play-circle',
            disabled: !runningPolicy.startMatch.allowed,
            busy: startMutation.isPending,
            onPress: () =>
              startMutation.mutate(
                { match: runningMatch, userId: currentUserId },
                { onError: (e) => showError(e) },
              ),
          }
        case 'invite':
          return {
            key: 'invite',
            label: 'ชวนเพื่อน',
            icon: 'account-plus-outline',
            onPress: () => setInvitingSide(firstInviteSide),
          }
        case 'ready':
          return {
            key: 'ready',
            label: acceptMutation.isPending ? 'กำลังยอมรับ' : 'ยอมรับ',
            icon: 'check-circle',
            busy: acceptMutation.isPending,
            onPress: () => acceptMutation.mutate({ userId: currentUserId }, { onError: (e) => showError(e) }),
          }
        case 'unready':
          return {
            key: 'unready',
            label: unacceptMutation.isPending ? 'กำลังยกเลิก' : 'ไม่พร้อม',
            icon: 'shield-off-outline',
            busy: unacceptMutation.isPending,
            onPress: () =>
              unacceptMutation.mutate(
                { match: runningMatch, userId: currentUserId },
                { onError: (e) => showError(e) },
              ),
          }
        case 'waiting':
          return {
            key: 'waiting',
            label: runningPolicy.startMatch.message ?? 'WAITING',
            icon: 'clock-outline',
            disabled: true,
            onPress: () => {},
          }
      }
    }

    function mapRunningSecondaryAction(action: RunningLobbySecondaryAction): RunningMapLobbyAction {
      switch (action.key) {
        case 'unready':
          return {
            key: 'unready',
            label: 'ไม่พร้อม',
            icon: 'shield-off-outline',
            busy: unacceptMutation.isPending,
            onPress: () =>
              unacceptMutation.mutate(
                { match: runningMatch, userId: currentUserId },
                { onError: (e) => showError(e) },
              ),
          }
        case 'stake':
          return {
            key: 'stake',
            label: 'แก้เดิมพัน',
            icon: 'pencil-outline',
            onPress: () => setIsEditingStake(true),
          }
        case 'invite':
          return {
            key: 'invite-secondary',
            label: 'ชวน',
            icon: 'account-plus-outline',
            onPress: () => setInvitingSide(firstInviteSide),
          }
        case 'leave':
          return {
            key: 'leave',
            label: isCrewRunLobby && runningMatch.status !== 'pending' ? 'LEAVE RUN' : 'LEAVE',
            icon: 'exit-run',
            tone: 'danger',
            busy: leaveMutation.isPending,
            onPress: confirmLeaveMatch,
          }
        case 'cancel':
          return {
            key: 'cancel',
            label: 'CANCEL',
            icon: 'close-octagon-outline',
            tone: 'danger',
            busy: cancelMutation.isPending,
            onPress: confirmCancelMatch,
          }
      }
    }

    return (
      <View style={[styles.basketballLobbyScreen, { backgroundColor: '#eef4f9' }]}>
        <ScrollView
          style={styles.basketballLobbyScroll}
          scrollEnabled={false}
          bounces={false}
          contentContainerStyle={[
            styles.basketballLobbyContainer,
            {
              paddingTop: 0,
              paddingBottom: 0,
              gap: 0,
            },
          ]}
          {...({ delayContentTouches: false } as object)}
        >
          <Stack.Screen options={{ headerShown: false }} />
          <RunningMapLobbyStage
            layout={runningMapLobbyLayout}
            location={runLobbyLocation}
            potLabel={hideStakeUi ? null : `${totalPot} ${CURRENCY_UNIT[currency]}`}
            joinCode={runningMatch.join_mode !== 'invite' ? runningMatch.join_code : null}
            topInset={insets.top}
            liveStats={runningLiveStats}
            teammates={runLobbyPresence.teammates}
            participantDistanceLabels={runningParticipantDistanceLabels}
            refereeAction={runningRefereeAction}
            primaryAction={mapRunningPrimaryAction(runningActionPlan.primary)}
            sidecarAction={runningActionPlan.sidecar ? mapRunningSecondaryAction(runningActionPlan.sidecar) : null}
            secondaryActions={runningActionPlan.secondary.map(mapRunningSecondaryAction)}
            onCopyCode={runningMatch.join_code ? () => copyJoinCode(runningMatch.join_code!) : undefined}
            onPressParticipant={handleRunningParticipantPress}
          />

          {runningMapLobbyLayout.mode === 'referee_result' && (
            <Reveal delay={90}>
              {isInvitedRefereeViewer ? refereeInviteResponseNode : (
                <RefereeRunningControlPanel
                  match={runningMatch}
                  state={alphaRefereeDutyState}
                  note={refereeFinalNote}
                  savePending={upsertRefereeRunningDraftMutation.isPending}
                  submitPending={submitRefereeResultMutation.isPending}
                  onChangeNote={setRefereeFinalNote}
                  onOpenHub={() => guardedRouter.push('/referee', {
                    actionKey: `match:${runningMatch.id}:referee-hub`,
                  })}
                  onSaveMark={saveRefereeRunningMark}
                  onSubmitFinal={submitRefereeRunningFinalResult}
                />
              )}
            </Reveal>
          )}

          {pendingCancelRequest && (
            <Reveal delay={0}>
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

          <Modal
            transparent
            animationType="fade"
            visible={isEditingStake && canEditStake && !!myParticipant}
            onRequestClose={() => setIsEditingStake(false)}
          >
            <View style={styles.basketballStakeOverlay}>
              <Pressable style={styles.basketballStakeScrim} onPress={() => setIsEditingStake(false)} />
              {myParticipant ? (
                <View style={styles.basketballStakeSheet}>
                  <StakeEditor
                    title="Your stake"
                    currentStake={myParticipant.stake_contribution}
                    minStake={runningMatch.stake}
                    maxStake={currentWalletStakeCap}
                    acceptedCount={acceptedCount}
                    isSaving={updateParticipantStakeMutation.isPending}
                    currencyUnit={CURRENCY_UNIT[currency]}
                    currencyLabel={CURRENCY_LABEL[currency]}
                    onCancel={() => setIsEditingStake(false)}
                    onSubmit={(newStake) => {
                      updateParticipantStakeMutation.mutate(
                        { match: runningMatch, userId: currentUserId, newStake },
                        {
                          onSuccess: () => setIsEditingStake(false),
                          onError: (e) => showError(e),
                        }
                      )
                    }}
                  />
                </View>
              ) : null}
            </View>
          </Modal>

          {invitingSide !== null && (
            <InviteFriendSheet
              visible={invitingSide !== null}
              matchId={match.id}
              onClose={() => setInvitingSide(null)}
              onInvite={handleInviteFriend}
              onOpenProfile={openFriendProfileFromInvite}
            />
          )}
          {assigningReferee && (
            <InviteRefereeSheet
              visible={assigningReferee}
              matchId={match.id}
              activityType={match.activity_type}
              onClose={() => setAssigningReferee(false)}
              onInvite={handleInviteReferee}
              onOpenProfile={openRefereeProfileFromInvite}
            />
          )}
          <EntryCodeModal
            visible={entrySidePrompt !== null}
            pending={joinMutation.isPending}
            errorMessage={joinMutation.error != null ? formatMatchActionError(joinMutation.error) : undefined}
            onSubmit={(code) => entrySidePrompt !== null && joinSide(entrySidePrompt, code)}
            onCancel={() => setEntrySidePrompt(null)}
          />
          <MatchManageActionsSheet
            visible={manageOpen}
            actions={manageActions}
            onClose={() => setManageOpen(false)}
          />
        </ScrollView>
        <BasketballLobbyPlayerPopup
          visible={!!selectedRunningParticipant}
          participant={selectedRunningParticipant}
          canKick={selectedRunningKickEligibility.allowed}
          kickPending={kickParticipantMutation.isPending}
          onClose={() => setSelectedRunningParticipant(null)}
          onViewProfile={viewRunningParticipantProfile}
          onKick={confirmKickCourtParticipant}
        />
        <VictoryOverlay
          visible={showVictoryOverlay}
          animationAssetRef={cosmetics?.victory_animation?.asset_ref ?? null}
          onDismiss={() => {
            setVictoryDismissed(true)
            void markVictorySeen(runningMatch.id)
          }}
        />
      </View>
    )
  }

  // Settled basketball matches return early in the court branch below, before
  // the final render. Render the recap in BOTH places (this shared node) so the
  // post-match moment is not skipped for court-layout matches.
  const recapMomentNode = (
    <MatchRecapMoment
      visible={showRecapMoment}
      viewModel={recapMoment}
      victoryAssetRef={cosmetics?.victory_animation?.asset_ref ?? null}
      onExit={() => {
        if (recapMoment) track({ name: 'recap_action_tapped', properties: { match_id: match.id, action: 'exit', outcome: recapMoment.tone } })
        void markRecapSeen(match.id)
        setRecapSeen(true)
        replaceWithHome()
      }}
      rematchPending={rematchPending}
      onRematch={() => {
        if (recapMoment) track({ name: 'recap_action_tapped', properties: { match_id: match.id, action: 'rematch', outcome: recapMoment.tone } })
        handleRematch(() => {
          void markRecapSeen(match.id)
          setRecapSeen(true)
          allowRouteReplace()
          guardedRouter.push(
            { pathname: '/match/new', params: rematchParams ?? {} },
            { actionKey: `match:${match.id}:rematch` },
          )
        })
      }}
      onViewAnalysis={() => {
        if (recapMoment) track({ name: 'recap_action_tapped', properties: { match_id: match.id, action: 'view_analysis', outcome: recapMoment.tone } })
        void markRecapSeen(match.id)
        setRecapSeen(true)
        viewBasketballAnalysis()
      }}
      onDismiss={() => {
        if (recapMoment) track({ name: 'recap_moment_dismissed', properties: { match_id: match.id, outcome: recapMoment.tone } })
        void markRecapSeen(match.id)
        setRecapSeen(true)
      }}
    />
  )

  if (teamSportCourtLayout) {
    const courtMatch = match
    const courtPolicy = policy
    const firstJoinSide: Side = !derived.sideAFull
      ? 0
      : !derived.sideBFull
        ? 1
        : 0
    const firstInviteSide: Side = isSinglePoolRunning
      ? 0
      : !derived.sideBFull
      ? 1
      : !derived.sideAFull
        ? 0
        : mySide ?? 0
    const hasLobbySlot = isSinglePoolRunning
      ? !derived.sideAFull
      : !derived.sideAFull || !derived.sideBFull
    // The assigned referee runs the game, so they (like the host) may press START
    // once everyone is ready. A match only reaches 'accepted' when every seat has
    // accepted and stakes are locked, so that status alone means "ready to start".
    const isAssignedRefereeViewer =
      !!activeRefereeAssignment && activeRefereeAssignment.referee_user_id === currentUserId
    const canJoinCourt = canJoin && hasLobbySlot && !isAssignedRefereeViewer && !isInvitedRefereeViewer
    const canInviteIntoCourt = match.status === 'pending' && isParticipant && hasLobbySlot
    const hasBothSidesInCourt = derived.sideA.length > 0 && derived.sideB.length > 0
    const myAccepted = !!myParticipant?.accepted_at
    const readyCountLabel = `${acceptedCount}/${totalSeats}`
    const canRefereeStartCourt = isAssignedRefereeViewer && courtMatch.status === 'accepted'
    const canStartCourt = courtPolicy.startMatch.allowed || canRefereeStartCourt
    const actionPlan = buildBasketballLobbyActions({
      isParticipant,
      isHost,
      canJoin: canJoinCourt,
      firstJoinSide,
      canStart: canStartCourt,
      canInvite: canInviteIntoCourt,
      hasBothSides: hasBothSidesInCourt,
      myAccepted,
      canEditStake,
      canLeave,
      canCancel,
    })

    const isBasketballCourt = teamSportCourtLayout.activityType === 'basketball'
    const isLiveBasketballCourt = isBasketballCourt && match.status === 'in_progress'
    const isFinalBasketballCourt = isBasketballCourt && match.status === 'settled'
    const basketballPrimaryAction = isLiveBasketballCourt || isFinalBasketballCourt
      ? mapBasketballLivePrimaryAction()
      : mapBasketballPrimaryAction(actionPlan.primary)
    const basketballSidecarAction = isLiveBasketballCourt || isFinalBasketballCourt
      ? null
      : actionPlan.sidecar ? mapBasketballSecondaryAction(actionPlan.sidecar) : null
    const secondaryActions = isLiveBasketballCourt || isFinalBasketballCourt
      ? []
      : actionPlan.secondary
          .filter((action) => action.key !== 'invite')
          .map(mapBasketballSecondaryAction)
    const refereeSlot = {
      label:
        refereeInProgress?.status === 'assigned' ? (activeRefereeName ?? 'กรรมการ')
        : refereeInProgress?.status === 'invited' ? `รอตอบรับ · ${refereeInProgress.referee?.display_name ?? 'กรรมการ'}`
        : (canAssignAlphaReferee ? 'เพิ่มกรรมการ' : match.status === 'pending' ? 'Host เท่านั้น' : 'ล็อกแล้ว'),
      status:
        refereeInProgress?.status === 'assigned' ? 'ASSIGNED'
        : refereeInProgress?.status === 'invited' ? 'PENDING'
        : 'REF SLOT',
      icon: 'whistle-outline' as const,
      avatarUrl: refereeInProgress?.referee?.avatar_url ?? null,
      disabled: !canAssignAlphaReferee,
      busy: assignRefereeMutation.isPending,
      onPress: canAssignAlphaReferee ? () => setAssigningReferee(true) : undefined,
    }

    function mapBasketballPrimaryAction(action: BasketballLobbyPrimaryAction): BasketballCourtLobbyAction {
      switch (action.key) {
        case 'join':
          return {
            key: 'join',
            label: `JOIN TEAM ${action.side === 0 ? 'A' : 'B'}`,
            icon: 'login',
            busy: joinMutation.isPending,
            onPress: () => joinSide(action.side),
          }
        case 'start':
          return {
            key: 'start',
            label: startMutation.isPending ? 'STARTING' : canStartCourt ? 'START' : 'รอทุกคนพร้อม',
            icon: 'play-circle',
            disabled: !canStartCourt,
            busy: startMutation.isPending,
            onPress: () =>
              startMutation.mutate(
                { match: courtMatch, userId: currentUserId },
                { onError: (e) => showError(e) },
              ),
          }
        case 'invite':
          return {
            key: 'invite',
            label: 'ชวนเพื่อน',
            icon: 'account-plus-outline',
            onPress: () => setInvitingSide(firstInviteSide),
          }
        case 'ready':
          return {
            key: 'ready',
            label: acceptMutation.isPending ? 'กำลังยอมรับ' : 'ยอมรับ',
            icon: 'check-circle',
            busy: acceptMutation.isPending,
            onPress: () => acceptMutation.mutate({ userId: currentUserId }, { onError: (e) => showError(e) }),
          }
        case 'unready':
          return {
            key: 'unready',
            label: unacceptMutation.isPending ? 'กำลังยกเลิก' : 'ยกเลิกยอมรับ',
            icon: 'shield-off-outline',
            busy: unacceptMutation.isPending,
            onPress: () =>
              unacceptMutation.mutate(
                { match: courtMatch, userId: currentUserId },
                { onError: (e) => showError(e) },
              ),
          }
        case 'waiting':
          return {
            key: 'waiting',
            label: courtPolicy.startMatch.message ?? 'WAITING',
            icon: 'clock-outline',
            disabled: true,
            onPress: () => {},
          }
      }
    }

    function mapBasketballLivePrimaryAction(): BasketballCourtLobbyAction {
      if (isFinalBasketballCourt) {
        return {
          key: 'settled',
          label: 'MATCH DONE',
          icon: 'check-decagram-outline',
          disabled: true,
          onPress: () => {},
        }
      }

      if (hasBothTeamResults) {
        return {
          key: 'review-score',
          label: 'ตรวจคะแนน',
          icon: 'clipboard-check-outline',
          disabled: true,
          onPress: () => {},
        }
      }

      if (hasActiveBasketballReferee) {
        return {
          key: 'live-score',
          label: 'LIVE SCORE',
          icon: 'scoreboard-outline',
          busy: submitRefereeResultMutation.isPending,
          onPress: () => setLiveScoreSheetOpen(true),
        }
      }

      if (!isParticipant || mySide == null) {
        return {
          key: 'spectator-live',
          label: 'LIVE SCORING',
          icon: 'scoreboard-outline',
          disabled: true,
          onPress: () => {},
        }
      }

      if (myBasketballSideSubmitted) {
        return {
          key: 'waiting-opponent-score',
          label: 'รออีกทีม',
          icon: 'timer-sand',
          disabled: true,
          onPress: () => {},
        }
      }

      return {
        key: 'end-game-player',
        label: basketballEndGameCanSubmit ? 'จบเกม' : 'ใส่แต้มก่อน',
        icon: 'flag-checkered',
        disabled: !basketballEndGameCanSubmit,
        busy: upsertPlayerScoreDraftMutation.isPending,
        onPress: submitBasketballCourtEndGame,
      }
    }

    function mapBasketballSecondaryAction(action: BasketballLobbySecondaryAction): BasketballCourtLobbyAction {
      switch (action.key) {
        case 'unready':
          return {
            key: 'unready',
            label: 'ไม่พร้อม',
            icon: 'shield-off-outline',
            busy: unacceptMutation.isPending,
            onPress: () =>
              unacceptMutation.mutate(
                { match: courtMatch, userId: currentUserId },
                { onError: (e) => showError(e) },
              ),
          }
        case 'stake':
          return {
            key: 'stake',
            label: 'แก้เดิมพัน',
            icon: 'pencil-outline',
            onPress: () => setIsEditingStake(true),
          }
        case 'invite':
          return {
            key: 'invite-secondary',
            label: 'ชวน',
            icon: 'account-plus-outline',
            onPress: () => setInvitingSide(firstInviteSide),
          }
        case 'leave':
          return {
            key: 'leave',
            label: 'LEAVE',
            icon: 'exit-run',
            tone: 'danger' as const,
            busy: leaveMutation.isPending,
            onPress: confirmLeaveMatch,
          }
        case 'cancel':
          return {
            key: 'cancel',
            label: 'CANCEL',
            icon: 'close-octagon-outline',
            tone: 'danger' as const,
            busy: cancelMutation.isPending,
            onPress: confirmCancelMatch,
          }
      }
    }

    const selectBasketballPosition = (input: { side: Side; positionKey: BasketballLobbyPositionKey }) => {
      // Cooldown-gate moves/swaps so rapid taps don't overlap optimistic + realtime
      // cycles and stutter the court markers. `begin()` no-ops while still settling.
      if (updateLobbyPositionMutation.isPending) return
      if (!lobbyMoveCooldown.begin()) return
      updateLobbyPositionMutation.mutate(
        { match, userId: currentUserId, side: input.side, positionKey: input.positionKey },
        { onError: (e: unknown) => showError(e) },
      )
    }
    const selectedBasketballStatLine = selectedBasketballStatParticipant
      ? basketballLiveStatsByUser[selectedBasketballStatParticipant.userId] ?? emptyBasketballLiveStatLine()
      : emptyBasketballLiveStatLine()
    const selectedBasketballCanEdit = canEditCourtBasketballStat(selectedBasketballStatParticipant)

    return (
      <View style={[styles.basketballLobbyScreen, { backgroundColor: '#000000' }]}>
        <SportFloorBackdrop sportKey={teamSportCourtLayout.activityType} />
        <View pointerEvents="none" style={styles.basketballLobbyDarkScrim} />
        <ScrollView
          style={styles.basketballLobbyScroll}
          contentContainerStyle={[
            styles.basketballLobbyContainer,
            {
              paddingTop: Math.max(insets.top + 4, 38),
              paddingBottom: isFinalBasketballCourt && !showRecapMoment
                ? Math.max(insets.bottom, Spacing.md) + 82
                : styles.basketballLobbyContainer.paddingBottom,
            },
          ]}
          // Lobby/live court is sized to fit one screen — lock scrolling so it
          // can't drag. Settled (final summary / recap) can be tall, keep scroll.
          scrollEnabled={match.status === 'settled'}
          {...({ delayContentTouches: false } as object)}
        >
          <Stack.Screen options={{ headerShown: false }} />
          {isFinalBasketballCourt && !showRecapMoment ? (
            <ScreenBackButton
              style={styles.finalBackButton}
              accessibilityLabel="ย้อนกลับจากหน้าสรุปผล"
              beforeNavigate={allowRouteReplace}
            />
          ) : null}
          {isFinalBasketballCourt && !showRecapMoment ? (
            matchHistoryImpactError ? (
              <MatchHistoryImpactError
                retrying={matchHistoryImpactFetching}
                onRetry={() => { void refetchMatchHistoryImpact() }}
              />
            ) : null
          ) : null}
          {isFinalBasketballCourt && !showRecapMoment ? (
            <BasketballFinalSummary
              model={buildBasketballFinalSummary({
                participants,
                statsByUser: basketballLiveStatsByUser,
                mySide,
                myParticipant,
                match,
                currentUserId,
                displayName: getParticipantDisplayName,
              })}
              impact={matchHistoryImpact}
              courtLayout={teamSportCourtLayout}
              mySide={mySide}
            />
          ) : null}
          {isFinalBasketballCourt && !showRecapMoment ? (
            <BasketballPinnedHighlightSection
              userId={currentUserId}
              matchId={match.id}
              matchLabel={`Basketball ${teamSportCourtLayout.teamSize}V${teamSportCourtLayout.teamSize}`}
            />
          ) : null}
          {!isFinalBasketballCourt ? (
          <BasketballCourtLobbyStage
            formatLabel={`${teamSportCourtLayout.teamSize}v${teamSportCourtLayout.teamSize}`}
            readyCountLabel={readyCountLabel}
            potLabel={hideStakeUi ? null : `${totalPot} ${CURRENCY_UNIT[currency]}`}
            myStakeLabel={isParticipant && !hideStakeUi && myParticipant ? `${Math.max(0, myParticipant.stake_contribution ?? 0)} ${CURRENCY_UNIT[currency]}` : null}
            scoreboard={null}
            liveScoreboard={isLiveBasketballCourt ? {
              formatLabel: `${match.team_size_per_side}V${match.team_size_per_side}`,
              sideAScore: basketballLiveScores[0],
              sideBScore: basketballLiveScores[1],
              mySide,
              startedAt: match.started_at ?? null,
              // Quarters are referee-marked: no active referee → no pills.
              // `quarterBoundaries` is the normalized draft accessor above (L307).
              quarterPills: deriveQuarterPills(hasActiveBasketballReferee ? quarterBoundaries : null),
              liveEnabled: !!match.allow_spectators,
              viewerCount: watchPresenceCount,
            } : null}
            liveToggle={isParticipant && (isLiveBasketballCourt || showLobbyMeta) && match.created_by === currentUserId ? {
              enabled: !!match.allow_spectators,
              busy: setSpectatorsMutation.isPending,
              onPress: () => setSpectatorsMutation.mutate(
                { matchId: match.id, allow: !match.allow_spectators },
                { onError: (e) => showError(e) },
              ),
            } : undefined}
            joinCode={match.join_mode !== 'invite' ? match.join_code : null}
            refereeSlot={refereeSlot}
            layout={teamSportCourtLayout}
            phase={isLiveBasketballCourt ? 'live' : isFinalBasketballCourt ? 'final' : 'lobby'}
            primaryAction={basketballPrimaryAction}
            sidecarAction={basketballSidecarAction}
            secondaryActions={secondaryActions}
            positionBusy={updateLobbyPositionMutation.isPending || lobbyMoveCooldown.coolingDown}
            onSelectPosition={isParticipant && !isLiveBasketballCourt && !isFinalBasketballCourt
              ? selectBasketballPosition
              : undefined}
            onInviteToSlot={canInviteIntoCourt && !isLiveBasketballCourt && !isFinalBasketballCourt
              ? (input) => setInvitingSide(input.side)
              : undefined}
            onPressParticipant={handleCourtParticipantPress}
            onCopyCode={match.join_code ? () => copyJoinCode(match.join_code!) : undefined}
          />
          ) : null}

          {!isLiveBasketballCourt && !isFinalBasketballCourt && (
          <Reveal delay={80}>
            {isInvitedRefereeViewer ? refereeInviteResponseNode : match.activity_type === 'basketball' ? (
              <RefereeLiveControlPanel
                match={match}
                state={alphaRefereeDutyState}
                note={refereeFinalNote}
                savePending={upsertRefereeLiveScoreMutation.isPending}
                submitPending={submitRefereeResultMutation.isPending}
                onChangeNote={setRefereeFinalNote}
                onOpenHub={() => guardedRouter.push('/referee', {
                  actionKey: `match:${match.id}:referee-hub`,
                })}
                onSavePlayerStat={saveRefereePlayerStat}
                onSubmitFinal={submitRefereeFinalResult}
              />
            ) : match.activity_type === 'running' ? (
              <RefereeRunningControlPanel
                match={match}
                state={alphaRefereeDutyState}
                note={refereeFinalNote}
                savePending={upsertRefereeRunningDraftMutation.isPending}
                submitPending={submitRefereeResultMutation.isPending}
                onChangeNote={setRefereeFinalNote}
                onOpenHub={() => guardedRouter.push('/referee', {
                  actionKey: `match:${match.id}:referee-hub`,
                })}
                onSaveMark={saveRefereeRunningMark}
                onSubmitFinal={submitRefereeRunningFinalResult}
              />
            ) : (
              <RefereeActionEntryCard
                state={alphaRefereeDutyState}
                activityType={match.activity_type}
                onSubmit={() => guardedRouter.push(`/match/${match.id}/referee-submit`, {
                  actionKey: `match:${match.id}:referee-submit`,
                })}
                onOpenHub={() => guardedRouter.push('/referee', {
                  actionKey: `match:${match.id}:referee-hub`,
                })}
              />
            )}
          </Reveal>
          )}

          {showBasketballSelfStats && !isLiveBasketballCourt && !isFinalBasketballCourt && (
            <Reveal delay={120}>
              <BasketballSelfStatDraftPanel
                mode="legacy"
                role={isBasketballReferee ? 'referee' : 'player'}
                currentUserId={currentUserId}
                participants={participants}
                drafts={basketballSelfStatDrafts}
                pending={upsertSelfStatDraftMutation.isPending}
                onSaveSelf={isBasketballReferee ? undefined : saveBasketballSelfStat}
              />
            </Reveal>
          )}

          {pendingCancelRequest && (
            <Reveal delay={0}>
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

          {showTeamSportRecap && !isFinalBasketballCourt && !showRecapMoment && (
            <Reveal delay={0}>
              <MatchRecapCard
                match={match}
                currentUserId={currentUserId}
                myParticipant={myParticipant}
                rematchPending={rematchPending}
                onRematch={() => {
                  handleRematch(() => {
                    allowRouteReplace()
                    guardedRouter.push(
                      { pathname: '/match/new', params: rematchParams ?? {} },
                      { actionKey: `match:${match.id}:rematch` },
                    )
                  })
                }}
                onViewAnalysis={match.activity_type === 'basketball' ? viewBasketballAnalysis : undefined}
              />
            </Reveal>
          )}

        <Modal
          transparent
          animationType="fade"
          visible={isEditingStake && canEditStake && !!myParticipant}
          onRequestClose={() => setIsEditingStake(false)}
        >
          <View style={styles.basketballStakeOverlay}>
            <Pressable style={styles.basketballStakeScrim} onPress={() => setIsEditingStake(false)} />
            {myParticipant ? (
              <View style={styles.basketballStakeSheet}>
                <StakeEditor
                  title="Your stake"
                  currentStake={myParticipant.stake_contribution}
                  minStake={match.stake}
                  maxStake={currentWalletStakeCap}
                  acceptedCount={acceptedCount}
                  isSaving={updateParticipantStakeMutation.isPending}
                  currencyUnit={CURRENCY_UNIT[currency]}
                  currencyLabel={CURRENCY_LABEL[currency]}
                  onCancel={() => setIsEditingStake(false)}
                  onSubmit={(newStake) => {
                    updateParticipantStakeMutation.mutate(
                      { match, userId: currentUserId, newStake },
                      {
                        onSuccess: () => setIsEditingStake(false),
                        onError: (e) => showError(e),
                      }
                    )
                  }}
                />
              </View>
            ) : null}
          </View>
        </Modal>

        {invitingSide !== null && (
          <InviteFriendSheet
            visible={invitingSide !== null}
            matchId={match.id}
            onClose={() => setInvitingSide(null)}
            onInvite={handleInviteFriend}
            onOpenProfile={openFriendProfileFromInvite}
          />
        )}
        {assigningReferee && (
          <InviteRefereeSheet
            visible={assigningReferee}
            matchId={match.id}
            activityType={match.activity_type}
            onClose={() => setAssigningReferee(false)}
            onInvite={handleInviteReferee}
            onOpenProfile={openRefereeProfileFromInvite}
          />
        )}
        <EntryCodeModal
          visible={entrySidePrompt !== null}
          pending={joinMutation.isPending}
          errorMessage={joinMutation.error != null ? formatMatchActionError(joinMutation.error) : undefined}
          onSubmit={(code) => entrySidePrompt !== null && joinSide(entrySidePrompt, code)}
          onCancel={() => setEntrySidePrompt(null)}
        />
        </ScrollView>
        {isFinalBasketballCourt && !showRecapMoment ? (
          <BasketballFinalActionDock
            bottomInset={insets.bottom}
            rematchPending={rematchPending}
            onRematch={() => {
              handleRematch(() => {
                allowRouteReplace()
                guardedRouter.push(
                  { pathname: '/match/new', params: rematchParams ?? {} },
                  { actionKey: `match:${match.id}:rematch` },
                )
              })
            }}
            onAnalysis={viewBasketballAnalysis}
          />
        ) : null}
        <LobbyMoveCooldownBadge
          endsAt={lobbyMoveCooldown.endsAt}
          durationMs={lobbyMoveCooldown.durationMs}
          topOffset={insets.top + 8}
        />
        <TeamResultReviewSheet
          mode="legacy"
          // Hide while a child modal (challenge / manage / resolution) is open:
          // iOS cannot present a second Modal over an already-presented one.
          visible={
            match.status === 'in_progress' &&
            hasBothTeamResults &&
            !teamChallengeOpen &&
            !manageOpen &&
            !teamResolutionModalOpen
          }
          submissions={teamResultSubmissions}
          participants={participants}
          contributions={match.match_participant_contributions ?? []}
          mySide={mySide}
          alphaRefereeResult={
            currentAlphaRefereeResult?.result_kind === 'team_score'
              ? currentAlphaRefereeResult
              : null
          }
          refereeStatDrafts={refereeBasketballStatDrafts}
          totalPot={totalPot}
          currencyLabel={CURRENCY_LABEL[currency]}
          isAccepting={acceptTeamResultMutation.isPending}
          challengeOpen={!!openTeamResultChallenge}
          canReviewResult={isParticipant && mySide != null}
          editLabel={isRefereeTeamScoreReview ? 'ขอให้กรรมการแก้' : 'โต้แย้งคะแนน'}
          myCorrectionDeclined={myCorrectionDeclined}
          onAccept={() => acceptTeamResultMutation.mutate(
            { match, userId: currentUserId },
            {
              onError: (e) => showError(e),
            },
          )}
          onEdit={() => setTeamChallengeOpen(true)}
          onOpenManage={() => setManageOpen(true)}
          onRequestCorrection={() => {
            // Guard concurrent fires: a rapid second tap before the pending
            // request lands in local state would hit the unique index server-side.
            if (requestTeamCorrectionMutation.isPending) return
            track({ name: 'result_correction_request', properties: { match_id: match.id } })
            requestTeamCorrectionMutation.mutate(
              { match, userId: currentUserId },
              { onError: (e) => showError(e) },
            )
          }}
          canRequestCorrection={canRequestTeamResultCorrection(match, currentUserId)}
          correctionPending={!!getPendingTeamResultCorrection(match)}
          correctionBusy={requestTeamCorrectionMutation.isPending}
        />
        <BasketballLiveStatSheet
          visible={!!selectedBasketballStatParticipant}
          participant={selectedBasketballStatParticipant}
          stats={selectedBasketballStatLine}
          longRangePointValue={longRangePointValueForTeamSize(match.team_size_per_side)}
          canEdit={selectedBasketballCanEdit}
          saveState={selectedBasketballStatParticipant
            ? basketballStatSaveState[selectedBasketballStatParticipant.userId] ?? 'idle'
            : 'idle'}
          onChangeStats={(nextStats) => {
            if (!selectedBasketballStatParticipant) return
            updateBasketballLiveStat(selectedBasketballStatParticipant.userId, nextStats)
          }}
          onClose={() => setSelectedBasketballStatParticipant(null)}
        />
        <BasketballLiveScoreSheet
          visible={liveScoreSheetOpen}
          isReferee={basketballRefereeCanEdit}
          sideAScore={basketballLiveScores[0]}
          sideBScore={basketballLiveScores[1]}
          startedAt={match.started_at ?? null}
          boundaries={quarterBoundaries}
          addQuarterPending={setQuarterBoundariesMutation.isPending}
          endGamePending={submitRefereeResultMutation.isPending}
          canEndGame={basketballEndGameCanSubmit}
          onAddQuarter={addBasketballQuarter}
          onEndGame={submitBasketballCourtEndGame}
          onClose={() => setLiveScoreSheetOpen(false)}
        />
        <BasketballLobbyPlayerPopup
          visible={!!selectedCourtParticipant}
          participant={selectedCourtParticipant}
          canKick={selectedCourtKickEligibility.allowed}
          kickPending={kickParticipantMutation.isPending}
          onClose={() => setSelectedCourtParticipant(null)}
          onViewProfile={viewCourtParticipantProfile}
          onKick={confirmKickCourtParticipant}
        />
        <TeamResultChallengeModal
          visible={teamChallengeOpen && !teamResolutionModalOpen}
          mode={isRefereeTeamScoreReview ? 'referee_correction' : 'formal_challenge'}
          pending={teamChallengeBusy}
          note={teamChallengeNote}
          assets={teamChallengeProofAssets}
          onChangeNote={setTeamChallengeNote}
          onChangeAssets={setTeamChallengeProofAssets}
          onSubmit={submitTeamResultChallenge}
          onCancel={() => setTeamChallengeOpen(false)}
        />
        <MatchManageActionsSheet
          visible={manageOpen && !teamResolutionModalOpen}
          actions={manageActions}
          onClose={() => setManageOpen(false)}
        />
        <TeamResolutionRequestModal
          visible={teamResolutionModalOpen}
          kind={teamCorrectionToRespond ? 'correction' : 'cancel'}
          pending={
            agreeTeamCorrectionMutation.isPending ||
            declineTeamCorrectionMutation.isPending ||
            respondToMutualCancelMutation.isPending
          }
          onAgree={() => {
            if (teamCorrectionToRespond) {
              track({ name: 'result_correction_agree', properties: { match_id: match.id } })
              agreeTeamCorrectionMutation.mutate(
                { match, userId: currentUserId },
                { onError: (e) => showError(e) },
              )
            } else {
              respondToMutualCancel(true)
            }
          }}
          onDecline={() => {
            if (teamCorrectionToRespond) {
              track({ name: 'result_correction_decline', properties: { match_id: match.id } })
              declineTeamCorrectionMutation.mutate(
                { match, userId: currentUserId },
                { onError: (e) => showError(e) },
              )
            } else {
              respondToMutualCancel(false)
            }
          }}
        />
        <VictoryOverlay
          visible={showVictoryOverlay}
          animationAssetRef={cosmetics?.victory_animation?.asset_ref ?? null}
          onDismiss={() => {
            setVictoryDismissed(true)
            void markVictorySeen(match.id)
          }}
        />
        {/* Settled basketball returns inside this court branch, so the recap
            pop-up must live here too — the copy in the final return below is
            unreachable for team-sport matches. */}
        {recapMomentNode}
      </View>
    )
  }

  return (
    <ScrollView contentContainerStyle={styles.container} {...({ delayContentTouches: false } as object)}>
      <Stack.Screen
        options={{
          headerRight: () => {
            if (match.status !== 'pending' || !isParticipant) return null
            const accepted = !!myParticipant?.accepted_at
            const busy = acceptMutation.isPending || unacceptMutation.isPending
            const fg = accepted ? theme.green : theme.red
            return (
              <Pressable
                onPress={() => {
                  if (busy) return
                  if (accepted) {
                    unacceptMutation.mutate(
                      { match, userId: currentUserId },
                      { onError: (e) => showError(e) },
                    )
                  } else {
                    acceptMutation.mutate({ userId: currentUserId }, { onError: (e) => showError(e) })
                  }
                }}
                disabled={busy}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[
                  styles.acceptBadge,
                  accepted && styles.acceptBadgeAccepted,
                ]}
                accessibilityLabel={accepted ? 'ถอนการยอมรับ' : 'ยอมรับเงื่อนไข'}
              >
                <MaterialCommunityIcons
                  name={accepted ? 'shield-check' : 'shield-check-outline'}
                  size={15}
                  color={fg}
                />
                <Text style={[styles.acceptBadgeText, { color: fg }]}>
                  {busy ? '…' : `${acceptedCount}/${totalSeats}`}
                </Text>
              </Pressable>
            )
          },
        }}
      />

      <Reveal delay={0}>
        <StatusPill status={match.status} />
      </Reveal>

      <Reveal delay={40}>
        {isInvitedRefereeViewer ? refereeInviteResponseNode : match.activity_type === 'basketball' ? (
          <RefereeLiveControlPanel
            match={match}
            state={alphaRefereeDutyState}
            note={refereeFinalNote}
            savePending={upsertRefereeLiveScoreMutation.isPending}
            submitPending={submitRefereeResultMutation.isPending}
            onChangeNote={setRefereeFinalNote}
            onOpenHub={() => guardedRouter.push('/referee', {
              actionKey: `match:${match.id}:referee-hub`,
            })}
            onSavePlayerStat={saveRefereePlayerStat}
            onSubmitFinal={submitRefereeFinalResult}
          />
        ) : match.activity_type === 'running' ? (
          <RefereeRunningControlPanel
            match={match}
            state={alphaRefereeDutyState}
            note={refereeFinalNote}
            savePending={upsertRefereeRunningDraftMutation.isPending}
            submitPending={submitRefereeResultMutation.isPending}
            onChangeNote={setRefereeFinalNote}
            onOpenHub={() => guardedRouter.push('/referee', {
              actionKey: `match:${match.id}:referee-hub`,
            })}
            onSaveMark={saveRefereeRunningMark}
            onSubmitFinal={submitRefereeRunningFinalResult}
          />
        ) : (
          <RefereeActionEntryCard
            state={alphaRefereeDutyState}
            activityType={match.activity_type}
            onSubmit={() => guardedRouter.push(`/match/${match.id}/referee-submit`, {
              actionKey: `match:${match.id}:referee-submit`,
            })}
            onOpenHub={() => guardedRouter.push('/referee', {
              actionKey: `match:${match.id}:referee-hub`,
            })}
          />
        )}
      </Reveal>

      {showBasketballSelfStats && (
        <Reveal delay={70}>
          <BasketballSelfStatDraftPanel
            mode="legacy"
            role={isBasketballReferee ? 'referee' : 'player'}
            currentUserId={currentUserId}
            participants={participants}
            drafts={basketballSelfStatDrafts}
            pending={upsertSelfStatDraftMutation.isPending}
            onSaveSelf={isBasketballReferee ? undefined : saveBasketballSelfStat}
          />
        </Reveal>
      )}

      <Reveal delay={80}>
        <View style={styles.headerRow}>
          <ActivityIcon activity={match.activity_type} size={26} filled />
          <View style={{ flex: 1 }}>
            <Text style={styles.activity}>{match.activity_type}</Text>
            <Text style={styles.teamLabel}>{teamLabel}</Text>
          </View>
        </View>
        {match.status === 'pending' && isParticipant && (
          <View style={[styles.progressTrack, { marginTop: 10 }]}>
            <Animated.View style={[styles.progressFill, progressStyle]} />
          </View>
        )}
      </Reveal>

      <Reveal delay={160}>
        <View style={styles.metaRow}>
          <View style={styles.metaPill}>
            <MaterialCommunityIcons name="clock-outline" size={12} color={theme.muted} />
            <Text style={styles.metaPillText}>
              {new Date(match.deadline).toLocaleDateString()}
            </Text>
          </View>
          {!hideStakeUi && !showTeamSportRecap && (
            <View
              style={[
                styles.metaPill,
                currencyIsCredit && { backgroundColor: theme.amberSoft, borderColor: 'rgba(255,178,61,0.3)' },
              ]}
            >
              <MaterialCommunityIcons
                name={CURRENCY_ICON[currency]}
                size={12}
                color={currencyIsCredit ? theme.amber : theme.muted}
              />
              <Text
                style={[
                  styles.metaPillText,
                  currencyIsCredit && { color: theme.amber, fontWeight: '700' },
                ]}
              >
                min stake {match.stake} {CURRENCY_UNIT[currency]}
              </Text>
            </View>
          )}
          {showLobbyMeta && match.join_mode === 'open' && (
            <View style={styles.metaPill}>
              <MaterialCommunityIcons name="earth" size={12} color={theme.muted} />
              <Text style={styles.metaPillText}>open lobby</Text>
            </View>
          )}
          {showLobbyMeta && match.join_mode !== 'invite' && match.join_code && (
            <PressableScale
              style={styles.codePill}
              onPress={() => copyJoinCode(match.join_code!)}
              accessibilityLabel="คัดลอกรหัสห้อง"
            >
              <MaterialCommunityIcons name="key-variant" size={13} color={theme.amber} />
              <Text style={styles.codePillText}>{match.join_code}</Text>
            </PressableScale>
          )}
        </View>
      </Reveal>

      <Reveal delay={180}>
        <MatchTrustBadge match={match} refereeProfile={activeRefereeProfile} />
      </Reveal>

      {!hideSensorRunningSubmitAction && (
        <MatchNextAction
          action={nextAction}
          onSubmit={() => guardedRouter.push(
            isSensorRunning
              ? `/run/active?matchId=${match.id}`
              : `/match/${match.id}/submit`,
            { actionKey: `match:${match.id}:next-submit` },
          )}
        />
      )}

      {canImportHealthWorkout && (
        <Reveal delay={185}>
          <PressableScale
            style={styles.secondaryButton}
            onPress={() => guardedRouter.push({
              pathname: '/run/sync',
              params: { matchId: match.id },
            }, { actionKey: `match:${match.id}:health-sync` })}
            accessibilityRole="button"
            accessibilityLabel="Import workout from Health"
          >
            <Text style={styles.secondaryButtonText}>IMPORT HEALTH WORKOUT</Text>
          </PressableScale>
        </Reveal>
      )}

      {showNoRefereeScoreDraft && mySide != null && (
        <Reveal delay={190}>
          <NoRefereeScoreDraftPanel
            matchId={match.id}
            activityType={match.activity_type}
            currentUserId={currentUserId}
            mySide={mySide}
            participants={participants}
            longRangePointValue={longRangePointValueForTeamSize(match.team_size_per_side)}
            drafts={playerScoreDrafts}
            pending={upsertPlayerScoreDraftMutation.isPending}
            onSave={saveNoRefereeScoreDraft}
            onOpenPlayer={viewProfile}
          />
        </Reveal>
      )}

      {isEditingStake && canEditStake && myParticipant && (
        <StakeEditor
          title="Your stake"
          currentStake={myParticipant.stake_contribution}
          minStake={match.stake}
          maxStake={currentWalletStakeCap}
          acceptedCount={acceptedCount}
          isSaving={updateParticipantStakeMutation.isPending}
          currencyUnit={CURRENCY_UNIT[currency]}
          currencyLabel={CURRENCY_LABEL[currency]}
          onCancel={() => setIsEditingStake(false)}
          onSubmit={(newStake) => {
            updateParticipantStakeMutation.mutate(
              { match, userId: currentUserId, newStake },
              {
                onSuccess: () => setIsEditingStake(false),
                onError: (e) => showError(e),
              }
            )
          }}
        />
      )}

      {!hideStakeUi && !showTeamSportRecap && !(match.status === 'in_progress' && hasBothTeamResults) && (
        <Reveal delay={220}>
          <View style={styles.potCard}>
            <Text style={styles.potLabel}>POT ON THE LINE</Text>
            <AnimatedNumber
              value={totalPot}
              style={[styles.potValue, currencyIsCredit && { color: theme.amber }]}
            />
            <Text style={styles.potUnit}>{CURRENCY_LABEL[currency].toUpperCase()}</Text>
          </View>
        </Reveal>
      )}

      {match.rule_text ? (
        <Reveal delay={260}>
          <Text style={styles.rule}>“{match.rule_text}”</Text>
        </Reveal>
      ) : null}

      {showEkidenRelayPlan && (
        <Reveal delay={280}>
          <EkidenRelayPlanCard match={match} />
        </Reveal>
      )}

      {!showTeamSportRecap && <View style={styles.divider} />}

      {/*
        Side cards carry value at three lifecycle points:
        - pending: lobby — invite, join, edit stake, cancel invite
        - submitted / disputed: show the submitted score breakdown + trust
        - settled:   final breakdown reference for non-recap matches
        In `in_progress` they're decorative — the live timer and Submit
        CTA are what the user needs. We hide the cards then to keep the
        screen focused (and stop reconciling them on every realtime tick).
      */}
      {match.status !== 'in_progress' && !hideCompetitiveUi && !showTeamSportRecap && (
        <>
          <Reveal delay={340}>
            <MatchSideCard
              label={runningMode === 'ffa' ? 'FFA' : match.is_coop ? 'ทีมเดียว' : 'Team A'}
              side={0}
              participants={sideA}
              pendingInvites={derived.pendingInvitesA}
              pot={potA}
              emptySlots={Math.max(0, match.team_size_per_side - sideA.length)}
              canJoin={canJoin}
              joiningSide={joining}
              joinPending={joinMutation.isPending}
              onJoin={joinSide}
              onInvite={match.status === 'pending' && isParticipant ? setInvitingSide : undefined}
              onCancelInvite={onCancelInvite}
              currentUserId={currentUserId}
              onEditOwnStake={canEditStake ? () => setIsEditingStake(true) : undefined}
              onViewProfile={viewProfile}
              currencyUnit={CURRENCY_UNIT[currency]}
              showStake={!hideStakeUi}
              showTrust={match.status === 'submitted' || match.status === 'disputed'}
            />
          </Reveal>
          {!isSinglePoolRunning && (
            <Reveal delay={400}>
              <MatchSideCard
                label="Team B"
                side={1}
                participants={sideB}
                pendingInvites={derived.pendingInvitesB}
                pot={potB}
                emptySlots={Math.max(0, match.team_size_per_side - sideB.length)}
                canJoin={canJoin}
                joiningSide={joining}
                joinPending={joinMutation.isPending}
                onJoin={joinSide}
                onInvite={match.status === 'pending' && isParticipant ? setInvitingSide : undefined}
                onCancelInvite={onCancelInvite}
                currentUserId={currentUserId}
                onEditOwnStake={canEditStake ? () => setIsEditingStake(true) : undefined}
                onViewProfile={viewProfile}
                currencyUnit={CURRENCY_UNIT[currency]}
                showStake={!hideStakeUi}
                showTrust={match.status === 'submitted' || match.status === 'disputed'}
              />
            </Reveal>
          )}
        </>
      )}

      {match.status === 'disputed' && (
        <Reveal delay={0}>
          <CommunityVoteTally matchId={match.id} isParticipant={isParticipant} />
        </Reveal>
      )}

      {match.status === 'in_progress' && hasBothTeamResults && (
        <Reveal delay={0}>
          <TeamResultReviewCard
            mode="legacy"
            submissions={teamResultSubmissions}
            participants={participants}
            contributions={match.match_participant_contributions ?? []}
            mySide={mySide}
            alphaRefereeResult={
              currentAlphaRefereeResult?.result_kind === 'team_score'
                ? currentAlphaRefereeResult
                : null
            }
            refereeStatDrafts={getAlphaRefereePlayerStatDrafts(match)}
            totalPot={totalPot}
            currencyLabel={CURRENCY_LABEL[currency]}
            isAccepting={acceptTeamResultMutation.isPending}
            challengeOpen={!!openTeamResultChallenge}
            canReviewResult={isParticipant && mySide != null}
            onAccept={() => acceptTeamResultMutation.mutate(
              { match, userId: currentUserId },
              {
                onError: (e) => showError(e),
              },
            )}
            onEdit={() => {
              if (isRefereeTeamScoreReview) {
                setTeamChallengeOpen(true)
                return
              }
              guardedRouter.push(`/match/${match.id}/submit`, {
                actionKey: `match:${match.id}:team-edit`,
              })
            }}
            onOpenManage={() => setManageOpen(true)}
          />
        </Reveal>
      )}

      {pendingCancelRequest &&
        match.status !== 'submitted' &&
        match.status !== 'disputed' && (
        <Reveal delay={0}>
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

      {(match.status === 'submitted' || match.status === 'disputed') && isParticipant && (
        <Reveal delay={0}>
          <ResultResolutionPanel
            activityType={match.activity_type}
            submittedScoreLabel={submittedScoreLabel}
            correctionRequest={pendingCorrectionRequest}
            cancelRequest={pendingCancelRequest}
            participants={participants}
            canRequestCorrection={canRequestCorrection}
            canRespondCorrection={canRespondCorrection}
            canRequestCancel={canRequestCancel}
            canRespondCancel={canRespondCancel}
            isBusy={
              requestResultCorrectionMutation.isPending ||
              agreeResultCorrectionMutation.isPending ||
              declineResultCorrectionMutation.isPending ||
              requestMutualCancelMutation.isPending ||
              respondToMutualCancelMutation.isPending ||
              disputeMutation.isPending
            }
            isRequestingCorrection={requestResultCorrectionMutation.isPending}
            isRespondingCorrection={
              agreeResultCorrectionMutation.isPending ||
              declineResultCorrectionMutation.isPending
            }
            isRequestingCancel={requestMutualCancelMutation.isPending}
            isRespondingCancel={respondToMutualCancelMutation.isPending}
            isEscalating={disputeMutation.isPending}
            onRequestCorrection={(proposed) => {
              requestResultCorrectionMutation.mutate(
                { match, userId: currentUserId, proposed },
                {
                  onSuccess: () => track({ name: 'result_correction_request', properties: { match_id: match.id } }),
                  onError: (e) => showError(e),
                },
              )
            }}
            onAgreeCorrection={() => {
              agreeResultCorrectionMutation.mutate(
                { match, userId: currentUserId },
                {
                  onSuccess: () => track({ name: 'result_correction_agree', properties: { match_id: match.id } }),
                  onError: (e) => showError(e),
                },
              )
            }}
            onDeclineCorrection={() => {
              declineResultCorrectionMutation.mutate(
                { match, userId: currentUserId },
                {
                  onSuccess: () => track({ name: 'result_correction_decline', properties: { match_id: match.id } }),
                  onError: (e) => showError(e),
                },
              )
            }}
            onRequestCancel={() => {
              track({ name: 'mutual_cancel_request', properties: { match_id: match.id } })
              confirmRequestMutualCancel()
            }}
            onAgreeCancel={() => {
              track({ name: 'mutual_cancel_agree', properties: { match_id: match.id } })
              respondToMutualCancel(true)
            }}
            onDeclineCancel={() => {
              track({ name: 'mutual_cancel_decline', properties: { match_id: match.id } })
              respondToMutualCancel(false)
            }}
            onEscalateToAdmin={() => {
              track({ name: 'result_escalate_admin', properties: { match_id: match.id } })
              confirmDisputeMatch()
            }}
          />
        </Reveal>
      )}

      {nextAction.kind === 'confirm_result' && (
        <ConfirmResultCard
          match={match}
          derived={derived}
          submission={nextAction.submission}
          alphaRefereeResult={
            currentAlphaRefereeResult?.result_kind === 'manual_running_result'
              ? currentAlphaRefereeResult
              : null
          }
          outcome={outcomePreview}
          isConfirming={confirmMutation.isPending}
          isDisputing={disputeMutation.isPending}
          onConfirm={() => confirmMutation.mutate(match, {
            ...(!isTeamSportMatch ? { onSuccess: replaceWithHome } : {}),
            onError: (e) => showError(e),
          })}
          onDispute={confirmDisputeMatch}
        />
      )}

      {canReportResultNotConfirmed && (
        <Reveal delay={0}>
          <View style={styles.potCard}>
            <Text style={styles.potLabel}>REPORT REVIEW FLAG</Text>
            <Text style={styles.info}>
              แนบ proof ได้ทั้งรูปและวิดีโอ รายการนี้จะติด flag ให้ admin review ก่อน
              อนาคตสามารถต่อเป็น community review ได้ โดยเบื้องต้นยังยึดตามผลที่ส่งไว้
            </Text>
            <TextInput
              style={[styles.secondaryButton, { color: theme.ink, textAlign: 'left', minHeight: 76 }]}
              placeholder="Note for admin review"
              placeholderTextColor={theme.mutedSoft}
              multiline
              value={reportNote}
              onChangeText={setReportNote}
            />
            <ProofPicker
              assets={reportProofAssets}
              onChange={setReportProofAssets}
              max={5}
              allowVideos
              label="proof files"
            />
            <PressableScale
              style={styles.secondaryButton}
              onPress={confirmReportResultNotConfirmed}
              disabled={reportResultMutation.isPending || reportUploading}
            >
              <Text style={styles.secondaryButtonText}>
                {reportUploading
                  ? 'UPLOADING…'
                  : reportResultMutation.isPending
                    ? 'REPORTING…'
                    : 'REPORT NO CONFIRMATION'}
              </Text>
            </PressableScale>
          </View>
        </Reveal>
      )}

      {showTeamSportRecap && !showRecapMoment && (
        <Reveal delay={0}>
          <MatchRecapCard
            match={match}
            currentUserId={currentUserId}
            myParticipant={myParticipant}
            rematchPending={rematchPending}
            onRematch={() => {
              handleRematch(() => {
                allowRouteReplace()
                guardedRouter.push(
                  { pathname: '/match/new', params: rematchParams ?? {} },
                  { actionKey: `match:${match.id}:rematch` },
                )
              })
            }}
            onChallengeAnother={() => {
              allowRouteReplace()
              guardedRouter.push('/users/search', { actionKey: `match:${match.id}:challenge-another` })
            }}
            onViewAnalysis={match.activity_type === 'basketball' ? viewBasketballAnalysis : undefined}
          />
          {rematchParams?.inviteUserId && headToHead.data ? (
            <HeadToHeadCard record={headToHead.data} />
          ) : null}
        </Reveal>
      )}

      {hideCompetitiveUi ? (
        <CoopRunSummaryCard
          participants={participants}
          submissions={match.match_submissions ?? []}
          requiredCount={participants.length}
        />
      ) : submission?.activity_sessions && (
        <RecordedResult
          mode={showTeamSportRecap ? 'boxScore' : 'full'}
          session={submission.activity_sessions}
          participants={participants}
          contributions={match.match_participant_contributions ?? []}
        />
      )}

      {(match.status === 'pending' || match.status === 'accepted') &&
        match.created_by === currentUserId && (() => {
        const canStart = policy.startMatch.allowed
        const hint = policy.startMatch.message ?? null
        return (
          <PressableScale
            style={[styles.button, styles.startButton, !canStart && styles.startButtonDisabled]}
            onPress={() =>
              startMutation.mutate(
                { match, userId: currentUserId },
                { onError: (e) => showError(e) },
              )
            }
            disabled={!canStart || startMutation.isPending}
            accessibilityLabel="เริ่มแมตช์"
          >
            <Text style={styles.buttonText}>
              {startMutation.isPending ? 'STARTING…' : 'START'}
            </Text>
            {hint && <Text style={styles.startButtonHint}>{hint}</Text>}
          </PressableScale>
        )
      })()}

      {canCancel && (
        <PressableScale
          style={styles.secondaryButton}
          onPress={confirmCancelMatch}
          disabled={cancelMutation.isPending}
        >
          <Text style={styles.secondaryButtonText}>
            {cancelMutation.isPending ? 'CANCELLING…' : 'CANCEL MATCH'}
          </Text>
        </PressableScale>
      )}

      {canFinishCoopRun && (
        <PressableScale
          style={[styles.button, styles.startButton]}
          onPress={confirmFinishCoopRun}
          disabled={finishCoopRunMutation.isPending}
          accessibilityLabel="จบการวิ่งทีม"
        >
          <Text style={styles.buttonText}>
            {finishCoopRunMutation.isPending ? 'FINISHING…' : 'จบการวิ่งทีม'}
          </Text>
          <Text style={styles.startButtonHint}>ปิดผลทีมด้วยคนที่วิ่งแล้ว</Text>
        </PressableScale>
      )}

      {canLeave && (
        <PressableScale
          style={styles.secondaryButton}
          onPress={confirmLeaveMatch}
          disabled={leaveMutation.isPending}
        >
          <Text style={styles.secondaryButtonText}>
            {leaveMutation.isPending
              ? 'LEAVING…'
              : canLeaveCoopRun && match.status !== 'pending'
                ? 'LEAVE CO-OP RUN'
                : 'LEAVE LOBBY'}
          </Text>
        </PressableScale>
      )}

      {match.status === 'settled' && isParticipant && !showTeamSportRecap && (() => {
        const color = match.is_coop ? theme.green : match.is_tie ? theme.inkSoft : iWon ? theme.green : theme.red
        const icon = match.is_coop ? 'account-group' : match.is_tie ? 'equal-box' : iWon ? 'trophy-award' : 'shield-off-outline'
        return (
          <Reveal delay={0}>
            <View style={styles.result}>
              <MaterialCommunityIcons name={icon} size={42} color={color} />
              <Text style={[styles.resultText, { color }]}>
                {match.is_coop
                  ? 'Team run complete.'
                  : match.is_tie
                    ? 'Tie — stakes returned.'
                    : iWon
                      ? 'Your team won!'
                      : 'Your team lost.'}
              </Text>
              {myParticipant && !match.is_coop && (
                <RatingDeltaBadge
                  ratingBefore={myParticipant.rating_before}
                  ratingAfter={myParticipant.rating_after}
                  activityLabel={match.activity_type}
                />
              )}
            </View>
          </Reveal>
        )
      })()}

      {recapMomentNode}

      <VictoryOverlay
        visible={showVictoryOverlay}
        animationAssetRef={cosmetics?.victory_animation?.asset_ref ?? null}
        onDismiss={() => {
          setVictoryDismissed(true)
          void markVictorySeen(match.id)
        }}
      />
      <MatchCancelledMoment
        visible={match.status === 'cancelled' && isParticipant}
        reason={
          (match.match_cancel_requests ?? []).some((r) => r.status === 'agreed') ? 'mutual' : 'system'
        }
        onExit={replaceWithHome}
      />
      {/*
        Mount only while open so useFriends inside doesn't hold an idle
        query subscription (with refetchInterval) for the lifetime of the
        match screen. The modal's internal `visible` prop still drives the
        animated dismissal; conditional render adds a hard unmount when
        the host hasn't tapped the picker.
      */}
      {invitingSide !== null && (
      <InviteFriendSheet
        visible={invitingSide !== null}
        matchId={match.id}
        onClose={() => setInvitingSide(null)}
        onInvite={handleInviteFriend}
        onOpenProfile={openFriendProfileFromInvite}
      />
      )}
      <EntryCodeModal
        visible={entrySidePrompt !== null}
        pending={joinMutation.isPending}
        errorMessage={joinMutation.error != null ? formatMatchActionError(joinMutation.error) : undefined}
        onSubmit={(code) => entrySidePrompt !== null && joinSide(entrySidePrompt, code)}
        onCancel={() => setEntrySidePrompt(null)}
      />
      <TeamResultChallengeModal
        visible={teamChallengeOpen && !teamResolutionModalOpen}
        mode={isRefereeTeamScoreReview ? 'referee_correction' : 'formal_challenge'}
        pending={teamChallengeBusy}
        note={teamChallengeNote}
        assets={teamChallengeProofAssets}
        onChangeNote={setTeamChallengeNote}
        onChangeAssets={setTeamChallengeProofAssets}
        onSubmit={submitTeamResultChallenge}
        onCancel={() => setTeamChallengeOpen(false)}
      />
      <MatchManageActionsSheet
        visible={manageOpen && !teamResolutionModalOpen}
        actions={manageActions}
        onClose={() => setManageOpen(false)}
      />
    </ScrollView>
  )
}

function formatAssignedRefereeName(assignment: MatchRefereeAssignment | null): string | null {
  if (!assignment) return null
  const referee = assignment.referee
  return referee?.display_name || (referee?.handle ? `@${referee.handle}` : null) || 'มีกรรมการแล้ว'
}

function buildRunningLobbyLiveStats(
  match: MatchWithRelations,
  currentUserId: string,
): RunningMapLobbyLiveStats {
  const submissions = match.match_submissions ?? []
  const teammateDistanceMeters = submissions.reduce((sum, submission) => {
    if (submission.submitted_by === currentUserId) return sum
    return sum + (submission.activity_sessions?.running_activity_details?.distance_meters ?? 0)
  }, 0)
  const teamDistanceMeters = submissions.reduce((sum, submission) => (
    sum + (submission.activity_sessions?.running_activity_details?.distance_meters ?? 0)
  ), 0)
  const contributionPoints = (match.match_participant_contributions ?? [])
    .reduce((sum, contribution) => sum + contribution.points, 0)
  const sessionPoints = submissions.reduce((sum, submission) => (
    sum + Math.max(0, submission.activity_sessions?.point_delta ?? 0)
  ), 0)

  return {
    teammateDistanceLabel: formatLobbyDistance(teammateDistanceMeters),
    teamDistanceLabel: formatLobbyDistance(teamDistanceMeters),
    teamPointsLabel: `${contributionPoints || sessionPoints} pts`,
  }
}

function buildRunningLobbyParticipantDistanceLabels(match: MatchWithRelations): Record<string, string> {
  const distanceByUser: Record<string, number> = {}

  match.match_participants
    .filter((participant) => participant.is_active !== false)
    .forEach((participant) => {
      distanceByUser[participant.user_id] = 0
    })

  ;(match.match_submissions ?? []).forEach((submission) => {
    const userId = submission.submitted_by
    if (!userId) return
    const distanceMeters = submission.activity_sessions?.running_activity_details?.distance_meters ?? 0
    distanceByUser[userId] = (distanceByUser[userId] ?? 0) + distanceMeters
  })

  return Object.fromEntries(
    Object.entries(distanceByUser).map(([userId, distanceMeters]) => [
      userId,
      formatLobbyDistance(distanceMeters),
    ]),
  )
}

function formatLobbyDistance(distanceMeters: number): string {
  return `${(Math.max(0, distanceMeters) / 1000).toFixed(2)} km`
}
