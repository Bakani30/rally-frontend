import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { router, useLocalSearchParams, type Href } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useQueryClient } from '@tanstack/react-query'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { HeadToHeadCard } from '@/components/match/HeadToHeadCard'
import { InviteFriendSheet } from '@/components/match/invite/InviteFriendSheet'
import { useFriends } from '@/hooks/useFriends'
import type { InvitableFriend } from '@/types/invite'
import { SchedulePicker } from '@/components/match/SchedulePicker'
import { SportFloorBackdrop } from '@/components/match/SportFloorBackdrop'
import { createNewMatchStyles } from '@/components/match/newMatchStyles'
import { PressableScale } from '@/components/motion/PressableScale'
import { Reveal } from '@/components/motion/Reveal'
import { RunArenaDark } from '@/constants/theme'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useAuth } from '@/hooks/useAuth'
import { useI18n, type Translator } from '@/hooks/useI18n'
import { matchesTabDictionary } from '@/lib/i18n/dictionaries/matchesTab'
import { useAlphaRunningGate } from '@/hooks/useAlphaRunningGate'
import { useCreateMatch } from '@/hooks/useCreateMatch'
import { QUICK_MATCH_PRESET_QUERY_KEY } from '@/hooks/useQuickMatch'
import { useDefaultStakeAmount } from '@/hooks/useDefaultStakeAmount'
import { useHeadToHead } from '@/hooks/useHeadToHead'
import { useMyMatches } from '@/hooks/useMyMatches'
import { useSetMatchSpectators } from '@/hooks/useSpectate'
import { useUserActivityRatings } from '@/hooks/useUserActivityRatings'
import { useWalletSummary } from '@/hooks/useWalletSummary'
import {
  RUNNING_1V1_5K_PACE_ALPHA_FEATURE_KEY,
  RUNNING_CREW_MAP_ALPHA_FEATURE_KEY,
  RUNNING_REFEREE_RESULT_ALPHA_FEATURE_KEY,
  RUNNING_SOLO_GPS_ALPHA_FEATURE_KEY,
  type AlphaRunningFeatureKey,
  type AlphaFeatureGateState,
} from '@/lib/run-tracking/alphaRunningGate'
import {
  TEAM_SIZE_OPTIONS,
  ACTIVITY_LABEL,
  MIN_STAKE,
  MAX_SCHEDULE_DAYS,
  COOP_RUNNING_MIN_RUNNERS,
  FFA_RUNNING_MIN_RUNNERS,
  RUNNING_CHALLENGE_MODES,
  RUNNING_GROUP_MAX_RUNNERS,
  getDefaultUnscheduledLobbyDeadline,
  isVisibleActivity,
  type Activity,
  type RunningChallengeMode,
} from '@/lib/match/matchConfig'
import { isCompleteEntryCode, normalizeEntryCode } from '@/lib/match/joinCode'
import { getNewActivityEntryRoute } from '@/lib/match/newMatchEntryRoute'
import { getNewMatchGuidanceCopy, type NewMatchSetupStep } from '@/lib/match/newMatchGuidance'
import { getNewMatchHistoryRows, getNewMatchRatingPreview } from '@/lib/match/newMatchPreview'
import { buildRunningLobbyModeCards, type RunningLobbyModeCard } from '@/lib/match/runningLobbyLayout'
import {
  getRoomFirstDefaultDraft,
  getRoomFirstDraftStorageKey,
  isFlexibleTeamStartActivity,
  normalizeRoomFirstDraft,
  type RoomFirstDraftSettings,
  type RoomFirstLobbyMode,
  type RunningResultMode,
} from '@/lib/match/roomFirstDraft'
import {
  buildCoopRunRuleParams,
  buildRunningRaceRuleParams,
  getRunningResultShortLabel,
  getRunningRulePreset,
} from '@/lib/match/runningRulePresets'
import {
  LAST_SPORT_REEL_KEY,
  getNextSportReelKey,
  getSportReelItem,
  resolveStoredSportReelKey,
  SPORT_REEL_ITEMS,
  type SportReelItem,
  type SportReelKey,
} from '@/lib/match/sportReel'
import { buildQuickStakes, getWalletStakeLimit, type WalletStakeLimit } from '@/lib/match/stakeOptions'
import { isEdgeFunctionError } from '@/lib/supabase/edgeError'
import type { JoinMode } from '@/types/match'
import { guardedRouter } from '@/lib/navigation/guardedRouter'
import { formatMatchActionError } from '@/lib/match/matchErrorPresentation'

type MaterialCommunityIconName = keyof typeof MaterialCommunityIcons.glyphMap
type MatchesT = Translator<keyof typeof matchesTabDictionary>
const RUNNING_ENTRY_THEME = RunArenaDark

const HOME_ROUTE = '/(tabs)' as Href

type DraftAccessMode = 'public' | 'private' | 'code'
type SelectedInvitee = {
  userId: string
  handle: string
  displayName: string | null
}

const ACCESS_MODE_ORDER: DraftAccessMode[] = ['public', 'private', 'code']
const RUNNING_MODE_CYCLE: RunningChallengeMode[] = ['race', 'coop']
const ALPHA_RUNNING_CHALLENGE_MODES = RUNNING_CHALLENGE_MODES.filter((mode) => mode.key !== 'ffa')
const ALPHA_RUNNING_RACE_RESULT_MODES: RunningResultMode[] = ['sensor_pace_5k', 'manual']
const MAX_STAKE_DIGITS = 6
const SPORT_REEL_SLIDE_DURATION_MS = 260
const SPORT_REEL_SLOT_RADIUS = 12
const ACCESS_MODE_ICON: Record<DraftAccessMode, MaterialCommunityIconName> = {
  public: 'earth',
  private: 'lock-outline',
  code: 'dialpad',
}
const ACCESS_MODE_LABEL_KEY: Record<DraftAccessMode, keyof typeof matchesTabDictionary> = {
  public: 'accessPublicLabel',
  private: 'accessPrivateLabel',
  code: 'accessCodeLabel',
}
function getAccessModeMeta(t: MatchesT, mode: DraftAccessMode): { label: string; icon: MaterialCommunityIconName } {
  return { label: t(ACCESS_MODE_LABEL_KEY[mode]), icon: ACCESS_MODE_ICON[mode] }
}

const ACTIVITY_ICON: Record<Activity, 'run-fast' | 'basketball' | 'badminton'> = {
  running: 'run-fast',
  basketball: 'basketball',
  badminton: 'badminton',
}

const RUNNING_RESULT_ICON: Record<RunningResultMode, MaterialCommunityIconName> = {
  sensor_distance_5k: 'timer-outline',
  sensor_time_30m: 'map-marker-distance',
  sensor_pace_5k: 'speedometer',
  manual_timer_race: 'timer-check-outline',
  manual_checkpoint_race: 'map-marker-check-outline',
  manual: 'clipboard-edit-outline',
}

// FFA and co-op both use one people stepper, but only co-op is isCoop.
const RUNNING_GROUP_MODES = new Set<RunningChallengeMode>(['ffa', 'coop'])

const SETUP_STEP_ICON: Record<NewMatchSetupStep, 'whistle-outline' | 'account-multiple-plus' | 'medal-outline' | 'shield-check-outline'> = {
  sport: 'whistle-outline',
  opponent: 'account-multiple-plus',
  stake: 'medal-outline',
  confirm: 'shield-check-outline',
}

type NewMatchStyles = ReturnType<typeof createNewMatchStyles>

type SportReelLogoProps = {
  item: SportReelItem
  itemIndex: number
  itemCount: number
  progress: SharedValue<number>
  trackWidth: number
  selected: boolean
  styles: NewMatchStyles
  theme: ReturnType<typeof useSportTheme>
  onPress: () => void
}

function SportReelLogo({
  item,
  itemIndex,
  itemCount,
  progress,
  trackWidth,
  selected,
  styles,
  theme,
  onPress,
}: SportReelLogoProps) {
  const { t } = useI18n(matchesTabDictionary)
  const animatedStyle = useAnimatedStyle(() => {
    let distance = itemIndex - progress.value
    const half = itemCount / 2
    if (distance > half) distance -= itemCount
    if (distance < -half) distance += itemCount

    const absDistance = Math.abs(distance)
    const slotGap = trackWidth > 0
      ? Math.max(76, Math.min(96, (trackWidth - 58) / 2.35))
      : 82
    const size = interpolate(absDistance, [0, 1, 1.18], [58, 42, 34], Extrapolation.CLAMP)

    return {
      opacity: interpolate(absDistance, [0, 1, 1.18], [1, 0.66, 0], Extrapolation.CLAMP),
      width: size,
      height: size,
      borderRadius: SPORT_REEL_SLOT_RADIUS,
      left: trackWidth / 2 - size / 2 + distance * slotGap,
      top: 38 - size / 2,
      zIndex: Math.round((4 - absDistance) * 10),
    }
  }, [itemCount, itemIndex, trackWidth])

  const active = selected
  const color = item.isEnabled ? item.accent : theme.muted
  const iconColor = active && item.isEnabled ? item.onAccent : color

  return (
    <PressableScale
      style={[
        styles.reelIconSlot,
        styles.reelIconSlotFloating,
        active && styles.reelIconSlotActive,
        !item.isEnabled && styles.reelIconSlotLocked,
        { borderColor: color },
        active && { backgroundColor: item.isEnabled ? item.accent : theme.surfaceStrong },
        animatedStyle,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${item.label}${item.isEnabled ? '' : t('lockedSuffixLabel')}`}
    >
      <MaterialCommunityIcons
        name={item.icon as MaterialCommunityIconName}
        size={active ? 28 : 20}
        color={iconColor}
      />
      {!item.isEnabled && (
        <View style={styles.reelLockBadge}>
          <MaterialCommunityIcons name="lock" size={8} color={theme.arcadeCtaText} />
        </View>
      )}
    </PressableScale>
  )
}

function analyticsErrorReason(error: unknown): string {
  if (isEdgeFunctionError(error)) return error.code ?? `http_${error.status ?? 'unknown'}`
  if (error instanceof Error) return error.name || 'error'
  return 'unknown_error'
}

function formatRankingScore(value: number | undefined): string {
  return new Intl.NumberFormat('en-US').format(Math.max(0, value ?? 0))
}

function buildStakeLimitAlert(t: MatchesT, requiredStake: number, limit: WalletStakeLimit | undefined) {
  if (limit?.limitedBy === 'available_spendable') {
    return {
      title: t('rpNotEnoughTitle'),
      message: t('rpNotEnoughMessage', {
        required: formatRankingScore(requiredStake),
        available: formatRankingScore(limit.availableSpendable ?? limit.limit),
      }),
    }
  }
  return {
    title: t('stakeNotAllowedTitle'),
    message: t('stakeNotAllowedMessage', { limit: formatRankingScore(limit?.limit) }),
  }
}

function getRunningGateLockedCopy(t: MatchesT, featureKey: AlphaRunningFeatureKey): { title: string; message: string } {
  switch (featureKey) {
    case RUNNING_SOLO_GPS_ALPHA_FEATURE_KEY:
      return { title: t('soloGpsLockedTitle'), message: t('soloGpsLockedMessage') }
    case RUNNING_CREW_MAP_ALPHA_FEATURE_KEY:
      return { title: t('crewMapLockedTitle'), message: t('crewMapLockedMessage') }
    case RUNNING_1V1_5K_PACE_ALPHA_FEATURE_KEY:
      return { title: t('paceRaceLockedTitle'), message: t('paceRaceLockedMessage') }
    case RUNNING_REFEREE_RESULT_ALPHA_FEATURE_KEY:
      return { title: t('refereeResultLockedTitle'), message: t('refereeResultLockedMessage') }
    default:
      return { title: t('runningAlphaLockedTitle'), message: t('runningAlphaLockedMessage') }
  }
}

function getGateStatusLabel(t: MatchesT, gate: AlphaFeatureGateState | undefined): string {
  if (!gate) return t('lockedStatusLabel')
  return gate.status === 'open' ? t('openStatusLabel') : gate.status.toUpperCase()
}

function getSportReelIndex(key: SportReelKey): number {
  const index = SPORT_REEL_ITEMS.findIndex((item) => item.key === key)
  return index >= 0 ? index : 0
}

function withHexAlpha(color: string, alpha: string): string {
  return /^#[0-9a-f]{6}$/i.test(color) ? `${color}${alpha}` : color
}

export default function NewMatchScreen() {
  const theme = useSportTheme()
  const runTheme = RUNNING_ENTRY_THEME
  const { t, language } = useI18n(matchesTabDictionary)
  const styles = useMemo(() => createNewMatchStyles(theme, runTheme, language), [theme, runTheme, language])
  const guidance = useMemo(() => getNewMatchGuidanceCopy(), [])
  const { session, user } = useAuth()
  const runningAlphaGate = useAlphaRunningGate()
  const canUseSoloGpsAlpha = runningAlphaGate.isEnabled(RUNNING_SOLO_GPS_ALPHA_FEATURE_KEY)
  const canUseCrewMapAlpha = runningAlphaGate.isEnabled(RUNNING_CREW_MAP_ALPHA_FEATURE_KEY)
  const canUseOneVOne5kPaceAlpha = runningAlphaGate.isEnabled(RUNNING_1V1_5K_PACE_ALPHA_FEATURE_KEY)
  const canUseRefereeRunResultAlpha = runningAlphaGate.isEnabled(RUNNING_REFEREE_RESULT_ALPHA_FEATURE_KEY)
  const params = useLocalSearchParams<{
    scheduled?: string
    activity?: string
    invite?: string
    inviteName?: string
    inviteUserId?: string
    stake?: string
    teamSize?: string
    rematchOf?: string
    kind?: string
    source?: string
  }>()
  const initialActivity = isVisibleActivity(params.activity) ? params.activity : null
  // A 'challenge' deep-link (from a profile "ท้าแข่ง") flags the pre-filled
  // invitee so the invite-participant edge fn records it as a challenge.
  const isChallengeInvite = params.kind === 'challenge'
  const isQuickCustomize = params.source === 'quick'
  const isScheduled = params.scheduled === 'true'
  const defaultStakeAmount = useDefaultStakeAmount()
  const initialDraft = useMemo(
    () => getRoomFirstDefaultDraft(initialActivity ?? 'running', defaultStakeAmount),
    [defaultStakeAmount, initialActivity],
  )
  const [sportPage, setSportPage] = useState<Activity | null>(null)
  const [activity, setActivity] = useState<Activity>(initialActivity ?? 'running')
  const [selectedSportKey, setSelectedSportKey] = useState<SportReelKey>(initialActivity ?? 'running')
  const [tabActiveSportKey, setTabActiveSportKey] = useState<SportReelKey>(initialActivity ?? 'running')
  const [reelTrackWidth, setReelTrackWidth] = useState(0)
  const [runningMode, setRunningMode] = useState<RunningChallengeMode | null>(initialDraft.runningMode)
  const [runningResultMode, setRunningResultMode] = useState<RunningResultMode>(initialDraft.runningResultMode)
  const [teamSize, setTeamSize] = useState<number>(() => {
    const fromParam = Number(params.teamSize)
    return Number.isInteger(fromParam) && fromParam > 0 ? fromParam : initialDraft.teamSize
  })
  const [runningGroupSize, setRunningGroupSize] = useState(initialDraft.runningGroupSize)
  const [coopTargetKm, setCoopTargetKm] = useState(5)
  const [lobbyMode, setLobbyMode] = useState<RoomFirstLobbyMode>(initialDraft.lobbyMode)
  const [isLocked, setIsLocked] = useState(initialDraft.isLocked)
  const [allowSpectators, setAllowSpectators] = useState(initialDraft.allowSpectators)
  const [entryCode, setEntryCode] = useState('')
  const [scheduledAt, setScheduledAt] = useState(() => new Date())
  const [stake, setStake] = useState(() =>
    params.stake && Number(params.stake) >= MIN_STAKE ? params.stake : String(initialDraft.stake),
  )
  const [isMinStakeEnabled, setIsMinStakeEnabled] = useState(false)
  const [isStakeDialogVisible, setStakeDialogVisible] = useState(false)
  const [stakeDialogValue, setStakeDialogValue] = useState(() => String(Math.max(MIN_STAKE, initialDraft.stake)))
  const [runningRoomExpanded, setRunningRoomExpanded] = useState(false)
  const [selectedInvitee, setSelectedInvitee] = useState<SelectedInvitee | null>(() =>
    params.invite && params.inviteUserId
      ? { userId: params.inviteUserId, handle: params.invite, displayName: params.inviteName ?? null }
      : null,
  )
  const [invitePickerVisible, setInvitePickerVisible] = useState(false)
  const inviteFriendsQuery = useFriends(invitePickerVisible)
  const invitableFriends = useMemo<InvitableFriend[]>(
    () =>
      (inviteFriendsQuery.data ?? []).map((f) => ({
        friendId: f.friendId,
        displayName: f.displayName,
        handle: f.handle,
        avatarUrl: f.avatarUrl,
        frameAssetRef: f.frameAssetRef,
        rating: 500,
        recentlyPlayed: false,
        suggested: false,
        inviteStatus: 'none',
        lastInvitedAt: null,
      })),
    [inviteFriendsQuery.data],
  )
  const [ruleText, setRuleText] = useState('')
  const createMatchMutation = useCreateMatch()
  const setSpectatorsMutation = useSetMatchSpectators()
  const queryClient = useQueryClient()
  const { track } = useAnalytics()
  const { data: walletSummary } = useWalletSummary(user?.id)
  const activityRatingsQuery = useUserActivityRatings(user?.id)
  const myMatchesQuery = useMyMatches(user?.id)
  const headToHead = useHeadToHead(selectedInvitee?.userId, activity)
  const cardPulse = useSharedValue(0)
  const reelIndexProgress = useSharedValue(getSportReelIndex(initialActivity ?? 'running'))

  const prefillFromParams = !!(params.invite || params.stake || params.teamSize || params.rematchOf)
  const completedRef = useRef(false)
  const submittingRef = useRef(false)
  const stakeTouchedRef = useRef(false)
  const hasClampedStake = useRef(false)
  const lastActivityRef = useRef<Activity>(activity)
  const lastActivityParamRef = useRef<string | undefined>(undefined)
  const draftLoadSeqRef = useRef(0)
  const initialPrefillHandled = useRef(false)
  useEffect(() => {
    lastActivityRef.current = activity
  }, [activity])

  const applyDraftSettings = useCallback((draft: RoomFirstDraftSettings, source: 'default' | 'stored', preservePrefill?: boolean) => {
    setRunningMode(draft.runningMode)
    setRunningResultMode(draft.runningResultMode)
    setRunningGroupSize(draft.runningGroupSize)
    setLobbyMode(draft.lobbyMode)
    setIsLocked(draft.isLocked)
    setAllowSpectators(draft.allowSpectators)
    setEntryCode('')
    setStakeDialogVisible(false)
    setStakeDialogValue(String(Math.max(MIN_STAKE, draft.stake)))
    setInvitePickerVisible(false)
    if (!preservePrefill) {
      setTeamSize(draft.teamSize)
      setStake(String(draft.stake))
      setIsMinStakeEnabled(false)
      setSelectedInvitee(null)
      stakeTouchedRef.current = source === 'stored'
    } else {
      // Param-driven seeds already applied via useState initializers; mark stake as user-touched
      stakeTouchedRef.current = true
    }
  }, [])

  const applyActivitySelection = useCallback((a: Activity, preservePrefill?: boolean) => {
    setActivity(a)
    if (a === 'running') {
      setRunningRoomExpanded(false)
    }
    const sequence = draftLoadSeqRef.current + 1
    draftLoadSeqRef.current = sequence
    applyDraftSettings(getRoomFirstDefaultDraft(a, defaultStakeAmount), 'default', preservePrefill)
    AsyncStorage.getItem(getRoomFirstDraftStorageKey(a))
      .then((value) => {
        if (draftLoadSeqRef.current !== sequence || !value) return
        const parsed = JSON.parse(value) as unknown
        applyDraftSettings(normalizeRoomFirstDraft(a, parsed, defaultStakeAmount), 'stored', preservePrefill)
      })
      .catch(() => {})
  }, [applyDraftSettings, defaultStakeAmount])

  useEffect(() => {
    if (lastActivityParamRef.current === params.activity) return
    lastActivityParamRef.current = params.activity
    if (!initialActivity) {
      setSportPage(null)
      return
    }
    const shouldPreservePrefill = prefillFromParams && !initialPrefillHandled.current
    if (shouldPreservePrefill) initialPrefillHandled.current = true
    applyActivitySelection(initialActivity, shouldPreservePrefill)
    setSelectedSportKey(initialActivity)
    setTabActiveSportKey(initialActivity)
    reelIndexProgress.value = getSportReelIndex(initialActivity)
    setSportPage(null)
  }, [applyActivitySelection, initialActivity, params.activity, prefillFromParams, reelIndexProgress])

  useEffect(() => {
    if (initialActivity) return
    let mounted = true
    AsyncStorage.getItem(LAST_SPORT_REEL_KEY)
      .then((value) => {
        if (!mounted) return
        const restoredKey = resolveStoredSportReelKey(value)
        setSelectedSportKey(restoredKey)
        setTabActiveSportKey(restoredKey)
        reelIndexProgress.value = getSportReelIndex(restoredKey)
        const restoredItem = getSportReelItem(restoredKey)
        if (restoredItem.activity) {
          const shouldPreservePrefill = prefillFromParams && !initialPrefillHandled.current
          if (shouldPreservePrefill) initialPrefillHandled.current = true
          applyActivitySelection(restoredItem.activity, shouldPreservePrefill)
        }
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [applyActivitySelection, initialActivity, prefillFromParams, reelIndexProgress])

  useEffect(() => {
    cardPulse.value = 0
    cardPulse.value = withSequence(
      withTiming(1, { duration: 150, easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: 130, easing: Easing.out(Easing.cubic) }),
    )
  }, [cardPulse, selectedSportKey])

  useEffect(() => {
    if (!stakeTouchedRef.current) {
      setStake(String(defaultStakeAmount))
      setIsMinStakeEnabled(false)
    }
  }, [defaultStakeAmount])

  useEffect(() => {
    track({ name: 'start_create_match', properties: { activity: 'running' } })
    return () => {
      if (!completedRef.current) {
        track({
          name: 'drop_off_create_match_step',
          properties: { step: 'before_submit', activity: lastActivityRef.current },
        })
      }
    }
  }, [track])
  function commitSportPageKey(key: SportReelKey) {
    setSelectedSportKey(key)
    const item = getSportReelItem(key)
    if (item.activity) {
      applyActivitySelection(item.activity)
    }
    AsyncStorage.setItem(LAST_SPORT_REEL_KEY, key).catch(() => {})
  }

  function selectSportReelKey(key: SportReelKey, direction: -1 | 0 | 1 = 0) {
    if (key === selectedSportKey) return

    setTabActiveSportKey(key)
    commitSportPageKey(key)
    cancelAnimation(reelIndexProgress)

    const itemCount = SPORT_REEL_ITEMS.length
    const rawTargetIndex = getSportReelIndex(key)
    let targetIndex = rawTargetIndex
    const currentIndex = reelIndexProgress.value
    const half = itemCount / 2
    while (targetIndex - currentIndex > half) targetIndex -= itemCount
    while (targetIndex - currentIndex < -half) targetIndex += itemCount

    reelIndexProgress.value = withTiming(targetIndex, {
      duration: direction === 0 ? SPORT_REEL_SLIDE_DURATION_MS * 0.85 : SPORT_REEL_SLIDE_DURATION_MS,
      easing: Easing.out(Easing.cubic),
    }, () => {
      reelIndexProgress.value = rawTargetIndex
    })
  }

  function moveSportReel(direction: -1 | 1) {
    selectSportReelKey(getNextSportReelKey(selectedSportKey, direction), direction)
  }

  function onBackPress() {
    if (sportPage) {
      setSportPage(null)
      return
    }
    if (isQuickCustomize) {
      guardedRouter.dismissTo(HOME_ROUTE, { actionKey: 'match-new:quick-back-home' })
      return
    }
    if (router.canGoBack()) {
      guardedRouter.back({ actionKey: 'match-new:back-previous' })
      return
    }
    guardedRouter.replace(HOME_ROUTE, { actionKey: 'match-new:back-home' })
  }

  const usesRunningPeopleStepper = !!runningMode && RUNNING_GROUP_MODES.has(runningMode)
  // Cooperative running has no opponent — players collaborate to hit a
  // shared goal, so locking points has no settlement meaning. Hide the
  // stake card entirely and submit with stake = 0.
  const isCoopRun = activity === 'running' && runningMode === 'coop'
  const isFfaRun = activity === 'running' && runningMode === 'ffa'
  const usesRunningSensorRule =
    canUseOneVOne5kPaceAlpha &&
    activity === 'running' &&
    !isFfaRun &&
    !isCoopRun &&
    runningResultMode === 'sensor_pace_5k'
  const selectedRunningFeatureKey = activity === 'running'
    ? isCoopRun
      ? RUNNING_CREW_MAP_ALPHA_FEATURE_KEY
      : runningResultMode === 'sensor_pace_5k'
        ? RUNNING_1V1_5K_PACE_ALPHA_FEATURE_KEY
        : RUNNING_REFEREE_RESULT_ALPHA_FEATURE_KEY
    : null
  const selectedRunningGateEnabled = selectedRunningFeatureKey
    ? runningAlphaGate.isEnabled(selectedRunningFeatureKey)
    : true

  useEffect(() => {
    if (activity !== 'running') return
    if (runningMode === 'ffa') {
      setRunningMode('race')
      return
    }
    if (runningMode === 'coop' && !canUseCrewMapAlpha && (canUseOneVOne5kPaceAlpha || canUseRefereeRunResultAlpha)) {
      setRunningMode('race')
      return
    }
    if (runningMode === 'race' && !ALPHA_RUNNING_RACE_RESULT_MODES.includes(runningResultMode)) {
      setRunningResultMode(canUseOneVOne5kPaceAlpha ? 'sensor_pace_5k' : 'manual')
      return
    }
    if (runningMode === 'race' && runningResultMode === 'sensor_pace_5k' && !canUseOneVOne5kPaceAlpha && canUseRefereeRunResultAlpha) {
      setRunningResultMode('manual')
      return
    }
    if (runningMode === 'race' && runningResultMode !== 'sensor_pace_5k' && !canUseRefereeRunResultAlpha && canUseOneVOne5kPaceAlpha) {
      setRunningResultMode('sensor_pace_5k')
    }
  }, [
    activity,
    canUseCrewMapAlpha,
    canUseOneVOne5kPaceAlpha,
    canUseRefereeRunResultAlpha,
    runningMode,
    runningResultMode,
  ])

  function onRunningModeChange(mode: RunningChallengeMode) {
    if (mode === 'ffa') return
    if (mode === 'coop' && !canUseCrewMapAlpha) {
      const copy = getRunningGateLockedCopy(t, RUNNING_CREW_MAP_ALPHA_FEATURE_KEY)
      Alert.alert(copy.title, copy.message)
      return
    }
    if (mode === 'race' && !canUseOneVOne5kPaceAlpha && !canUseRefereeRunResultAlpha) {
      const copy = getRunningGateLockedCopy(t, RUNNING_1V1_5K_PACE_ALPHA_FEATURE_KEY)
      Alert.alert(copy.title, copy.message)
      return
    }
    setRunningMode(mode)
    const isGroup = RUNNING_GROUP_MODES.has(mode)
    const minGroupSize = COOP_RUNNING_MIN_RUNNERS
    const first = isGroup
      ? Math.max(minGroupSize, runningGroupSize)
      : RUNNING_CHALLENGE_MODES.find((m) => m.key === mode)!.teamSizes![0]
    if (mode === 'race' && runningResultMode !== 'sensor_pace_5k' && !canUseRefereeRunResultAlpha && canUseOneVOne5kPaceAlpha) {
      setRunningResultMode('sensor_pace_5k')
    }
    if (isGroup) setRunningGroupSize(first)
    setTeamSize(first)
  }

  function cycleRunningMode() {
    const modeCycle = RUNNING_MODE_CYCLE.filter((mode) =>
      mode === 'coop'
        ? canUseCrewMapAlpha
        : canUseOneVOne5kPaceAlpha || canUseRefereeRunResultAlpha
    )
    if (modeCycle.length === 0) {
      const copy = getRunningGateLockedCopy(t, RUNNING_1V1_5K_PACE_ALPHA_FEATURE_KEY)
      Alert.alert(copy.title, copy.message)
      return
    }
    const currentIndex = runningMode ? modeCycle.indexOf(runningMode) : -1
    const nextMode = modeCycle[(currentIndex + 1) % modeCycle.length] ?? 'race'
    onRunningModeChange(nextMode)
  }

  function cycleRunningResultMode() {
    if (isFfaRun) return
    setRunningResultMode((current) => {
      const modes = ALPHA_RUNNING_RACE_RESULT_MODES.filter((mode) =>
        mode === 'sensor_pace_5k' ? canUseOneVOne5kPaceAlpha : canUseRefereeRunResultAlpha
      )
      if (modes.length === 0) return current
      const currentIndex = modes.indexOf(current)
      return modes[(currentIndex + 1) % modes.length] ?? 'manual'
    })
  }

  function selectRunningLobbyModeCard(card: RunningLobbyModeCard) {
    if (!card.enabled) {
      const copy = getRunningGateLockedCopy(t, card.featureKey)
      Alert.alert(copy.title, copy.message)
      return
    }

    setRunningMode(card.next.runningMode)
    setRunningResultMode(card.next.runningResultMode)
    if (card.next.runningMode === 'coop') {
      const nextGroupSize = Math.max(card.next.minGroupSize ?? COOP_RUNNING_MIN_RUNNERS, runningGroupSize)
      setRunningGroupSize(nextGroupSize)
      setTeamSize(nextGroupSize)
      return
    }

    setTeamSize(card.next.teamSize)
  }

  function changeRunningGroupSize(delta: number) {
    const minSize = runningMode === 'ffa' ? FFA_RUNNING_MIN_RUNNERS : COOP_RUNNING_MIN_RUNNERS
    const nextSize = Math.max(minSize, Math.min(RUNNING_GROUP_MAX_RUNNERS, runningGroupSize + delta))
    setRunningGroupSize(nextSize)
    setTeamSize(nextSize)
  }

  function onTeamSizeChange(n: number) {
    setTeamSize(n)
  }

  function changeTeamSizeOption(delta: -1 | 1) {
    if (sizeOptions.length === 0) return
    const currentIndex = sizeOptions.indexOf(teamSize)
    const safeIndex = currentIndex >= 0 ? currentIndex : 0
    const nextIndex = Math.max(0, Math.min(sizeOptions.length - 1, safeIndex + delta))
    const nextSize = sizeOptions[nextIndex]
    if (nextSize !== undefined) onTeamSizeChange(nextSize)
  }

  function cycleTeamSizeOption() {
    if (sizeOptions.length === 0) return
    const currentIndex = sizeOptions.indexOf(teamSize)
    const safeIndex = currentIndex >= 0 ? currentIndex : 0
    const nextIndex = (safeIndex + 1) % sizeOptions.length
    const nextSize = sizeOptions[nextIndex]
    if (nextSize !== undefined) onTeamSizeChange(nextSize)
  }

  function onStakeChange(value: string) {
    stakeTouchedRef.current = true
    setIsMinStakeEnabled(true)
    setStake(value.replace(/[^\d]/g, ''))
  }

  function openMinStakeDialog() {
    const parsedStake = parseInt(stake, 10)
    const safeStake = Number.isFinite(parsedStake) && parsedStake >= MIN_STAKE ? parsedStake : MIN_STAKE
    setStakeDialogValue(String(safeStake))
    setStakeDialogVisible(true)
  }

  function closeMinStakeDialog() {
    setStakeDialogVisible(false)
  }

  function turnOffMinStake() {
    stakeTouchedRef.current = true
    setIsMinStakeEnabled(false)
    setStake(String(MIN_STAKE))
    setStakeDialogVisible(false)
  }

  function confirmMinStakeDialog() {
    const parsedStake = parseInt(stakeDialogValue, 10)
    if (!Number.isInteger(parsedStake) || parsedStake < MIN_STAKE) return
    const nextStake = parsedStake
    if (typeof availableStakePoints === 'number' && nextStake > availableStakePoints) {
      const copy = buildStakeLimitAlert(t, nextStake, availableStakeLimit)
      Alert.alert(copy.title, copy.message)
      return
    }
    stakeTouchedRef.current = true
    setIsMinStakeEnabled(true)
    setStake(String(nextStake))
    setStakeDialogValue(String(nextStake))
    setStakeDialogVisible(false)
  }

  function selectStakePreset(nextStake: number) {
    setStakeDialogValue(String(nextStake))
  }

  function pressStakeDialogDigit(digit: string) {
    setStakeDialogValue((current) => {
      const next = `${current}${digit}`.replace(/^0+(?=\d)/, '')
      if (next.length > MAX_STAKE_DIGITS) return current
      return next
    })
  }

  function clearStakeDialogValue() {
    setStakeDialogValue('')
  }

  function backspaceStakeDialogValue() {
    setStakeDialogValue((current) => current.slice(0, -1))
  }

  async function onSubmit() {
    const activityEntryRoute = getNewActivityEntryRoute(activity)
    if (activityEntryRoute) {
      router.replace(activityEntryRoute)
      return
    }

    // Synchronous re-entry guard. `disabled={createMatchMutation.isPending}` only
    // takes effect after React commits the next render, leaving a window where a
    // second tap fires a duplicate create-match (confirmed in prod: ~87 duplicate
    // rooms from double-taps, some 2.3s apart). Mirrors the updateLobbyPosition
    // guard in app/match/[id].tsx. Set true just before the network call (all
    // validation above is synchronous, so no tap can interleave) and released in
    // the finally so a failed attempt can be retried.
    if (submittingRef.current) return
    if (!user || !session) {
      track({
        name: 'create_match_validation_failed',
        properties: { reason: 'signed_out', activity, step: 'auth' },
      })
      Alert.alert(t('signInRequiredTitle'), t('signInRequiredMessage'))
      return
    }
    if (activity === 'running' && !runningMode) {
      track({
        name: 'create_match_validation_failed',
        properties: { reason: 'running_mode_missing', activity, step: 'running_mode' },
      })
      Alert.alert(t('selectRunningModeTitle'), t('selectRunningModeMessage'))
      return
    }
    if (activity === 'running' && selectedRunningFeatureKey && !selectedRunningGateEnabled) {
      track({
        name: 'create_match_validation_failed',
        properties: { reason: 'alpha_running_gate_closed', activity, step: 'running_mode' },
      })
      const copy = getRunningGateLockedCopy(t, selectedRunningFeatureKey)
      Alert.alert(copy.title, copy.message)
      return
    }

    const stakeNum = isCoopRun ? 0 : isMinStakeEnabled ? parseInt(stake, 10) : MIN_STAKE
    if (!isCoopRun && (isNaN(stakeNum) || stakeNum < MIN_STAKE)) {
      track({
        name: 'create_match_validation_failed',
        properties: { reason: 'stake_invalid', activity, step: 'stake' },
      })
      Alert.alert(t('invalidStakeTitle'), t('invalidStakeMessage', { min: MIN_STAKE }))
      return
    }
    const submitStakeLimit = getWalletStakeLimit('leaderboard_point', walletSummary?.wallet)
    if (!isCoopRun && submitStakeLimit != null && stakeNum > submitStakeLimit.limit) {
      track({
        name: 'create_match_validation_failed',
        properties: { reason: 'stake_insufficient_points', activity, step: 'stake' },
      })
      const copy = buildStakeLimitAlert(t, stakeNum, submitStakeLimit)
      Alert.alert(copy.title, copy.message)
      return
    }
    if (lobbyMode === 'public' && isLocked && !isCompleteEntryCode(entryCode)) {
      track({
        name: 'create_match_validation_failed',
        properties: { reason: 'entry_code_invalid', activity, step: 'entry_code' },
      })
      Alert.alert(t('invalidEntryCodeTitle'), t('invalidEntryCodeMessage'))
      return
    }

    const deadline = isScheduled ? scheduledAt : getDefaultUnscheduledLobbyDeadline()
    const maxScheduledAt = new Date(Date.now() + MAX_SCHEDULE_DAYS * 24 * 3600 * 1000)
    if (deadline.getTime() > maxScheduledAt.getTime()) {
      track({
        name: 'create_match_validation_failed',
        properties: { reason: 'schedule_too_far', activity, step: 'schedule' },
      })
      Alert.alert(t('scheduleTooFarTitle'), t('scheduleTooFarMessage', { days: MAX_SCHEDULE_DAYS }))
      return
    }

    const joinMode: JoinMode =
      lobbyMode === 'private_code' ? 'private'
      : isLocked ? 'code'
      : 'open'

    submittingRef.current = true
    try {
      const selectedRunningMode = RUNNING_CHALLENGE_MODES.find((mode) => mode.key === runningMode)
      const selectedRunningRule = getRunningRulePreset(runningResultMode)
      const trimmedRuleText = ruleText.trim()
      const runningMeta = runningMode && RUNNING_GROUP_MODES.has(runningMode)
        ? `${selectedRunningMode?.label} (${runningGroupSize} คน)`
        : selectedRunningMode?.label
      const runningRuleLabel = usesRunningSensorRule
        ? isFfaRun
          ? 'กติกา: FFA 5K winner takes pot'
          : `กติกา: ${selectedRunningRule?.label ?? 'sensor race'}`
        : activity === 'running'
          ? isCoopRun
            ? 'กติกา: Crew Map Run shared progress'
            : 'กติกา: Referee Run Result'
          : null
      const finalRuleText = activity === 'running' && selectedRunningMode
        ? `โหมดวิ่ง: ${runningMeta}${runningRuleLabel ? ` · ${runningRuleLabel}` : ''}${trimmedRuleText ? ` · ${trimmedRuleText}` : ''}`
        : trimmedRuleText || undefined
      const ruleParams = activity === 'running'
        ? isCoopRun
          ? buildCoopRunRuleParams(coopTargetKm * 1000)
          : isFfaRun
          ? {
              running_mode: 'ffa',
              mode: 'sensor',
              metric: 'pace_seconds_per_km',
              compare: 'min',
              distance_meters: 5000,
              winner_policy: 'winner_takes_pot',
              label: 'FFA 5K best pace wins',
            }
          : usesRunningSensorRule
          ? buildRunningRaceRuleParams(runningResultMode) ?? { running_mode: 'race', mode: 'manual', cooperative: false }
          : { running_mode: 'race', mode: 'manual', cooperative: false, label: 'Referee Run Result' }
        : isFlexibleTeamStartActivity(activity)
          ? { flexible_team_start: true }
          : {}

      const { matchId } = await createMatchMutation.mutateAsync({
        activity,
        teamSize,
        minStake: stakeNum,
        creatorStake: stakeNum,
        ruleText: finalRuleText,
        ruleParams,
        joinMode,
        entryCode: joinMode === 'code' ? entryCode : undefined,
        deadline,
        invitees: selectedInvitee && !isFfaRun
          ? [{ handle: selectedInvitee.handle, side: isCoopRun ? 0 : 1, kind: isChallengeInvite ? 'challenge' : 'open' }]
          : undefined,
        creatorUserId: user.id,
        isCoop: isCoopRun,
        creatorProfile: { id: user.id, email: user.email ?? '', display_name: null },
      })

      await AsyncStorage.setItem(
        getRoomFirstDraftStorageKey(activity),
        JSON.stringify({
          runningMode: runningMode ?? 'race',
          runningResultMode,
          teamSize,
          runningGroupSize,
          lobbyMode,
          isLocked,
          stake: stakeNum || MIN_STAKE,
          allowSpectators,
        }),
      ).catch(() => {})
      queryClient.invalidateQueries({ queryKey: QUICK_MATCH_PRESET_QUERY_KEY })

      if (allowSpectators) {
        setSpectatorsMutation.mutate(
          { matchId, allow: true },
          {
            onError: () => {
              Alert.alert(t('spectateFailedTitle'), t('spectateFailedMessage'))
            },
          },
        )
      }

      completedRef.current = true
      track({
        name: 'complete_create_match',
        properties: {
          match_id: matchId,
          activity,
          stake: stakeNum,
          participant_count: 1,
          flexible_team_start: isFlexibleTeamStartActivity(activity),
        },
      })

      guardedRouter.replace(`/match/${matchId}`, { actionKey: `match-new:${matchId}` })
    } catch (e) {
      track({
        name: 'create_match_api_failed',
        properties: {
          reason: analyticsErrorReason(e),
          activity,
          join_mode: joinMode,
          stake_currency: 'points',
          is_coop: isCoopRun,
        },
      })
      const message = formatMatchActionError(e, activity)
      Alert.alert(t('errorTitle'), message)
      // Release the guard ONLY on failure so the user can retry. On success we
      // navigate away (guardedRouter.replace unmounts this screen), so releasing
      // it there would reopen a duplicate-create window during the nav
      // transition while isPending has also dropped back to false.
      submittingRef.current = false
    }
  }

  const availableRunningChallengeModes = ALPHA_RUNNING_CHALLENGE_MODES
  const selectedRunningMode = availableRunningChallengeModes.find((mode) => mode.key === runningMode)
  const runningModeCards = useMemo(() => buildRunningLobbyModeCards({
    runningMode,
    runningResultMode,
    canUseCrewMapAlpha,
    canUseOneVOne5kPaceAlpha,
    canUseRefereeRunResultAlpha,
    gateLabels: {
      [RUNNING_CREW_MAP_ALPHA_FEATURE_KEY]: getGateStatusLabel(t, runningAlphaGate.gates[RUNNING_CREW_MAP_ALPHA_FEATURE_KEY]),
      [RUNNING_1V1_5K_PACE_ALPHA_FEATURE_KEY]: getGateStatusLabel(t, runningAlphaGate.gates[RUNNING_1V1_5K_PACE_ALPHA_FEATURE_KEY]),
      [RUNNING_REFEREE_RESULT_ALPHA_FEATURE_KEY]: getGateStatusLabel(t, runningAlphaGate.gates[RUNNING_REFEREE_RESULT_ALPHA_FEATURE_KEY]),
    },
  }), [
    canUseCrewMapAlpha,
    canUseOneVOne5kPaceAlpha,
    canUseRefereeRunResultAlpha,
    runningAlphaGate.gates,
    runningMode,
    runningResultMode,
    t,
  ])
  const selectedRunningModeCard = runningModeCards.find((card) => card.selected) ?? null
  const hasSelectedRunningMode = activity !== 'running' || !!runningMode
  const isRunningGroupMode = activity === 'running' && !!runningMode && RUNNING_GROUP_MODES.has(runningMode)
  const sizeOptions = activity === 'running' ? (selectedRunningMode?.teamSizes ?? []) : TEAM_SIZE_OPTIONS[activity]
  const teamSizeOptionIndex = Math.max(0, sizeOptions.indexOf(teamSize))
  const canDecreaseTeamSize = sizeOptions.length > 0 && teamSizeOptionIndex > 0
  const canIncreaseTeamSize = sizeOptions.length > 0 && teamSizeOptionIndex < sizeOptions.length - 1
  const teamLabel = isRunningGroupMode
    ? `${runningGroupSize} ${t('peopleUnit')}`
    : teamSize === 1 ? '1v1' : `${teamSize}v${teamSize}`
  const cockpitTeamLabel = activity === 'running' && !isRunningGroupMode && teamSize === 1 ? t('duelLabel') : teamLabel
  const runningCountLabel = isRunningGroupMode ? t('peopleWordLabel') : t('teamWordLabel')
  const runningGroupMinSize = runningMode === 'ffa' ? FFA_RUNNING_MIN_RUNNERS : COOP_RUNNING_MIN_RUNNERS
  const canDecreaseRunningCount = isRunningGroupMode ? runningGroupSize > runningGroupMinSize : canDecreaseTeamSize
  const canIncreaseRunningCount = isRunningGroupMode ? runningGroupSize < RUNNING_GROUP_MAX_RUNNERS : canIncreaseTeamSize
  const activitySport = getSportReelItem(activity)
  const activityAccent = activitySport.accent
  const selectedSport = getSportReelItem(selectedSportKey)
  const selectedSportLocked = !selectedSport.isEnabled
  const sportRatingPreview = useMemo(
    () => getNewMatchRatingPreview(selectedSport.activity, activityRatingsQuery.data),
    [activityRatingsQuery.data, selectedSport.activity],
  )
  const floorHistoryRows = useMemo(
    () => getNewMatchHistoryRows({
      matches: myMatchesQuery.data,
      userId: user?.id,
      activity: selectedSport.activity,
      limit: 2,
    }),
    [myMatchesQuery.data, selectedSport.activity, user?.id],
  )
  const sportEloScore = selectedSportLocked || !activityRatingsQuery.data
    ? '--'
    : formatRankingScore(sportRatingPreview.rating)
  const sportEloMeta = selectedSportLocked
    ? t('lockedArenaMetaLabel')
    : activityRatingsQuery.data
      ? sportRatingPreview.meta
      : t('syncingEloLabel')
  const availableStakeLimit = getWalletStakeLimit('leaderboard_point', walletSummary?.wallet)
  const availableStakePoints = availableStakeLimit?.limit
  const availableStakeLabel = typeof availableStakePoints === 'number'
    ? formatRankingScore(availableStakePoints)
    : '--'
  const stakeQuickButtons = buildQuickStakes(MIN_STAKE, availableStakePoints)
  const stakeForMeter = isMinStakeEnabled ? parseInt(stake, 10) : MIN_STAKE
  const stakeDialogHasValue = stakeDialogValue.length > 0
  const stakeDialogNumber = parseInt(stakeDialogValue, 10)
  const stakeExceedsAvailable =
    typeof availableStakePoints === 'number' &&
    !Number.isNaN(stakeForMeter) &&
    stakeForMeter > availableStakePoints
  const stakeDialogBelowMinimum =
    stakeDialogHasValue &&
    (!Number.isInteger(stakeDialogNumber) || stakeDialogNumber < MIN_STAKE)
  const stakeDialogExceedsAvailable =
    typeof availableStakePoints === 'number' &&
    Number.isInteger(stakeDialogNumber) &&
    stakeDialogNumber > availableStakePoints
  const stakeDialogHasError = stakeDialogBelowMinimum || stakeDialogExceedsAvailable
  const canConfirmStakeDialog =
    stakeDialogHasValue &&
    !stakeDialogHasError
  const stakeDialogDisplay = stakeDialogHasValue ? stakeDialogValue : '0'
  const stakeDialogCurrentValue = isMinStakeEnabled && !Number.isNaN(stakeForMeter) ? stakeForMeter : MIN_STAKE
  const stakeDialogHint = (() => {
    const maxPart = typeof availableStakePoints === 'number' ? t('stakeDialogMaxPart', { available: availableStakeLabel }) : ''
    if (!stakeDialogHasValue) return t('stakeDialogCurrentHint', { current: stakeDialogCurrentValue, min: MIN_STAKE, max: maxPart })
    if (stakeDialogBelowMinimum) return t('stakeDialogBelowMinHint', { min: MIN_STAKE })
    if (stakeDialogExceedsAvailable) {
      return t('stakeDialogExceedsHint', { available: availableStakeLabel })
    }
    return t('stakeDialogCurrentHint', { current: stakeDialogCurrentValue, min: MIN_STAKE, max: maxPart })
  })()
  useEffect(() => {
    if (hasClampedStake.current || !params.stake || typeof availableStakePoints !== 'number') return
    const wanted = Number(params.stake)
    if (!Number.isFinite(wanted)) return
    const clamped = Math.max(MIN_STAKE, Math.min(wanted, availableStakePoints))
    if (clamped !== wanted) setStake(String(clamped))
    hasClampedStake.current = true
    // run once when the wallet ceiling first resolves
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableStakePoints])

  const setupStepReady: Record<NewMatchSetupStep, boolean> = {
    sport: true,
    opponent: hasSelectedRunningMode,
    stake: hasSelectedRunningMode && (isCoopRun || (!Number.isNaN(stakeForMeter) && stakeForMeter >= MIN_STAKE && !stakeExceedsAvailable)),
    confirm: hasSelectedRunningMode,
  }
  const pageBackground = sportPage ? activitySport.background : selectedSport.background
  const topTitleColor = sportPage ? activitySport.screenText : selectedSport.screenText
  const topTitle = sportPage ? ACTIVITY_LABEL[activity] : t('startMatchTitle')
  const pagePatternSport = sportPage ? activitySport : selectedSport
  const isRunningCockpitPage = pagePatternSport.activity === 'running'
  const selectedCardBorderSoft = withHexAlpha(selectedSport.cardBorder, 'a8')
  const selectedCardBorderFaint = withHexAlpha(selectedSport.cardBorder, '72')
  const showRunningEntrySplit = !selectedSportLocked && selectedSport.activity === 'running'
  const showRoomCockpit =
    !selectedSportLocked &&
    !!selectedSport.activity &&
    (activity !== 'running' || runningRoomExpanded)
  const runningRoomModeLabel =
    runningMode === 'race' ? t('raceLabel')
    : runningMode === 'ffa' ? t('ffaLabel')
    : t('coopModeLabel')
  const runningRoomSummary = runningRoomModeLabel
  const runningResultLabel = runningResultMode === 'manual'
    ? t('refereeLabel')
    : getRunningResultShortLabel(runningResultMode)
  const canInviteFriendFromDraft = activity === 'running' && (runningMode === 'race' || runningMode === 'coop')
  const minStakeLabel = isCoopRun
    ? t('noRpLabel')
    : isMinStakeEnabled ? t('minStakeOnLabel') : t('minStakeOffLabel')
  const minStakeMeta = isMinStakeEnabled && !Number.isNaN(stakeForMeter)
    ? `${formatRankingScore(stakeForMeter)} pts`
    : null
  const accessMode: DraftAccessMode =
    lobbyMode === 'private_code' ? 'private'
    : isLocked ? 'code'
    : 'public'
  const accessMeta = getAccessModeMeta(t, accessMode)
  function setDraftAccessMode(next: DraftAccessMode) {
    if (next === 'private') {
      setLobbyMode('private_code')
      setIsLocked(false)
      setEntryCode('')
      return
    }
    setLobbyMode('public')
    setIsLocked(next === 'code')
    if (next !== 'code') setEntryCode('')
  }
  function cycleDraftAccessMode() {
    const currentIndex = ACCESS_MODE_ORDER.indexOf(accessMode)
    const next = ACCESS_MODE_ORDER[(currentIndex + 1) % ACCESS_MODE_ORDER.length] ?? 'public'
    setDraftAccessMode(next)
  }
  const reelCardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(cardPulse.value, [0, 1], [0, -5]) },
      { scale: interpolate(cardPulse.value, [0, 1], [1, 1.035]) },
    ],
  }))
  function getSelectDirection(itemIndex: number): -1 | 0 | 1 {
    const selectedIndex = getSportReelIndex(selectedSportKey)
    if (itemIndex === selectedIndex) return 0
    const itemCount = SPORT_REEL_ITEMS.length
    const forwardDistance = (itemIndex - selectedIndex + itemCount) % itemCount
    const backwardDistance = (selectedIndex - itemIndex + itemCount) % itemCount
    return forwardDistance <= backwardDistance ? 1 : -1
  }

  return (
    <View style={[styles.screen, { backgroundColor: pageBackground }]}>
      {isRunningCockpitPage ? <StatusBar style="light" /> : null}
      <SportFloorBackdrop sportKey={pagePatternSport.key} />

      <ScrollView
        style={styles.scroller}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
      <Reveal delay={0}>
        <View style={styles.topBar}>
          <PressableScale
            style={[
              styles.topBackButton,
              isRunningCockpitPage && styles.runningTopBackButton,
            ]}
            onPress={onBackPress}
            accessibilityRole="button"
            accessibilityLabel={t('backLabel')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={22}
              color={isRunningCockpitPage ? runTheme.primary : theme.ink}
            />
          </PressableScale>
          <Text style={[styles.topTitle, { color: topTitleColor }]}>{topTitle}</Text>
          <View style={styles.topSpacer} />
        </View>
      </Reveal>

      {!sportPage && (
        <>
          <Reveal delay={20}>
            <View style={styles.reelShell}>
              <View style={styles.reelControls}>
                <PressableScale
                  style={[
                    styles.reelArrowButton,
                    isRunningCockpitPage && styles.runningReelArrowButton,
                  ]}
                  onPress={() => moveSportReel(-1)}
                  accessibilityRole="button"
                  accessibilityLabel={t('previousSportLabel')}
                >
                  <MaterialCommunityIcons
                    name="chevron-left"
                    size={28}
                    color={isRunningCockpitPage ? runTheme.text : theme.fightInk}
                  />
                </PressableScale>
                <View
                  style={styles.reelTrack}
                  onLayout={(event) => setReelTrackWidth(event.nativeEvent.layout.width)}
                >
                  {SPORT_REEL_ITEMS.map((item, index) => (
                    <SportReelLogo
                      key={item.key}
                      item={item}
                      itemIndex={index}
                      itemCount={SPORT_REEL_ITEMS.length}
                      progress={reelIndexProgress}
                      trackWidth={reelTrackWidth}
                      selected={item.key === tabActiveSportKey}
                      styles={styles}
                      theme={theme}
                      onPress={() => selectSportReelKey(item.key, getSelectDirection(index))}
                    />
                  ))}
                </View>
                <PressableScale
                  style={[
                    styles.reelArrowButton,
                    isRunningCockpitPage && styles.runningReelArrowButton,
                  ]}
                  onPress={() => moveSportReel(1)}
                  accessibilityRole="button"
                  accessibilityLabel={t('nextSportLabel')}
                >
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={28}
                    color={isRunningCockpitPage ? runTheme.text : theme.fightInk}
                  />
                </PressableScale>
              </View>

              {showRunningEntrySplit && (
                <Animated.View
                  style={[
                    styles.runningEntryPanel,
                    reelCardAnimatedStyle,
                  ]}
                >
                  <View style={styles.runningEntryRow}>
                    <PressableScale
                      style={[
                        styles.runningEntryCard,
                        styles.runningSoloEntryCard,
                        !canUseSoloGpsAlpha && { opacity: 0.62 },
                      ]}
                      onPress={() => {
                        if (!canUseSoloGpsAlpha) {
                          const copy = getRunningGateLockedCopy(t, RUNNING_SOLO_GPS_ALPHA_FEATURE_KEY)
                          Alert.alert(copy.title, copy.message)
                          return
                        }
                        guardedRouter.push('/run/active', { actionKey: 'match-new:solo-run' })
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={t('soloRunA11y')}
                    >
                      <View style={styles.runningEntryCardTop}>
                        <View
                          style={[
                            styles.runningEntryIcon,
                            styles.runningSoloEntryIcon,
                          ]}
                        >
                          <MaterialCommunityIcons name={canUseSoloGpsAlpha ? 'run-fast' : 'lock-outline'} size={21} color={runTheme.onPrimary} />
                        </View>
                        <MaterialCommunityIcons name={canUseSoloGpsAlpha ? 'arrow-right' : 'lock'} size={18} color={runTheme.primary} />
                      </View>
                      <View style={styles.runningEntryCopy}>
                        <Text
                          style={[styles.runningEntryTitle, styles.runningSoloEntryTitle]}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                        >
                          {t('soloRunCardTitle')}
                        </Text>
                        <Text style={[styles.runningEntryMeta, { color: runTheme.primary }]}>
                          {canUseSoloGpsAlpha ? 'GPS' : getGateStatusLabel(t, runningAlphaGate.gates[RUNNING_SOLO_GPS_ALPHA_FEATURE_KEY])}
                        </Text>
                      </View>
                    </PressableScale>

                    <PressableScale
                      style={[
                        styles.runningEntryCard,
                        styles.runningRoomEntryCard,
                        { backgroundColor: selectedSport.cardBackground },
                        runningRoomExpanded && styles.runningEntryCardActive,
                        { borderColor: runningRoomExpanded ? selectedCardBorderSoft : selectedCardBorderFaint },
                      ]}
                      onPress={() => setRunningRoomExpanded((expanded) => !expanded)}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: runningRoomExpanded }}
                      accessibilityLabel={t('roomMatchA11y')}
                    >
                      <View style={styles.runningEntryCardTop}>
                        <View style={[styles.runningEntryIcon, styles.runningEntryRoomIcon]}>
                          <MaterialCommunityIcons name="account-multiple-plus" size={20} color={selectedSport.cardLabel} />
                        </View>
                        <MaterialCommunityIcons
                          name={runningRoomExpanded ? 'chevron-up' : 'chevron-down'}
                          size={20}
                          color={selectedSport.cardLabel}
                        />
                      </View>
                      <View style={styles.runningEntryCopy}>
                        <Text style={styles.runningEntryTitle} numberOfLines={1} adjustsFontSizeToFit>
                          {t('roomMatchTitle')}
                        </Text>
                        <Text
                          style={[styles.runningEntryMeta, { color: selectedSport.cardLabel }]}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.78}
                        >
                          {runningRoomSummary}
                        </Text>
                      </View>
                    </PressableScale>
                  </View>
                </Animated.View>
              )}

              {showRoomCockpit && (
                <Animated.View
                  style={[
                    styles.cockpitPanel,
                    {
                      backgroundColor: selectedSport.cardBackground,
                      borderColor: selectedCardBorderSoft,
                    },
                    reelCardAnimatedStyle,
                  ]}
                >
                  <View style={styles.cockpitHeaderRow}>
                    <View style={[styles.cockpitSportBadge, { borderColor: selectedSport.cardBorder }]}>
                      <MaterialCommunityIcons
                        name={selectedSport.icon as MaterialCommunityIconName}
                        size={20}
                        color={selectedSport.cardLabel}
                      />
                    </View>
                    <View style={styles.cockpitTitleBlock}>
                      <Text style={[styles.cockpitEyebrow, { color: selectedSport.cardLabel }]}>{t('roomSetupEyebrow')}</Text>
                      <Text style={styles.cockpitTitle}>{ACTIVITY_LABEL[activity]}</Text>
                      <View style={styles.cockpitMetaRow}>
                        <View style={styles.cockpitMetaPill}>
                          <MaterialCommunityIcons name={accessMeta.icon} size={11} color={selectedSport.cardLabel} />
                          <Text style={[styles.cockpitMetaText, { color: selectedSport.cardLabel }]}>{accessMeta.label}</Text>
                        </View>
                        <View style={styles.cockpitMetaPill}>
                          <MaterialCommunityIcons name="account-group-outline" size={11} color={selectedSport.cardLabel} />
                          <Text style={[styles.cockpitMetaText, { color: selectedSport.cardLabel }]}>{cockpitTeamLabel}</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View style={styles.cockpitPresetGrid}>
                    {activity === 'running' ? (
                      <>
                        <PressableScale
                          style={styles.cockpitPresetTile}
                          onPress={cycleRunningMode}
                          accessibilityRole="button"
                          accessibilityLabel={t('cycleRunningModeA11y')}
                        >
                          <MaterialCommunityIcons name="timer-outline" size={16} color={selectedSport.cardLabel} />
                          <Text style={styles.cockpitPresetValue}>{runningRoomModeLabel}</Text>
                        </PressableScale>
                        <PressableScale
                          style={styles.cockpitPresetTile}
                          onPress={cycleDraftAccessMode}
                          accessibilityRole="button"
                          accessibilityLabel={t('cycleAccessModeA11y')}
                        >
                          <MaterialCommunityIcons name={accessMeta.icon} size={16} color={selectedSport.cardLabel} />
                          <Text style={styles.cockpitPresetValue}>{accessMeta.label}</Text>
                        </PressableScale>
                        {!isCoopRun && (
                          <PressableScale
                            style={styles.cockpitPresetTile}
                            onPress={openMinStakeDialog}
                            accessibilityRole="button"
                            accessibilityState={{ checked: isMinStakeEnabled }}
                            accessibilityLabel={isMinStakeEnabled ? t('minStakeCurrentA11y', { amount: stakeForMeter }) : t('openMinStakeA11y')}
                          >
                            <MaterialCommunityIcons
                              name={isMinStakeEnabled ? 'toggle-switch' : 'toggle-switch-off-outline'}
                              size={16}
                              color={selectedSport.cardLabel}
                            />
                            <View style={styles.cockpitPresetCopy}>
                              <Text style={styles.cockpitPresetValue}>{minStakeLabel}</Text>
                              {minStakeMeta ? (
                                <Text style={[styles.cockpitPresetMeta, { color: selectedSport.cardLabel }]}>
                                  {minStakeMeta}
                                </Text>
                              ) : null}
                            </View>
                          </PressableScale>
                        )}
                        {!isCoopRun && (
                          <PressableScale
                            style={styles.cockpitPresetTile}
                            onPress={cycleRunningResultMode}
                            accessibilityRole="button"
                            accessibilityLabel={t('cycleResultMethodA11y')}
                          >
                            <MaterialCommunityIcons
                              name={RUNNING_RESULT_ICON[runningResultMode]}
                              size={16}
                              color={selectedSport.cardLabel}
                            />
                            <Text style={styles.cockpitPresetValue}>{runningResultLabel}</Text>
                          </PressableScale>
                        )}
                      </>
                    ) : (
                      <>
                        <PressableScale
                          style={styles.cockpitPresetTile}
                          onPress={cycleTeamSizeOption}
                          accessibilityRole="button"
                          accessibilityLabel={t('teamSizeA11y', { size: cockpitTeamLabel })}
                        >
                          <MaterialCommunityIcons name="account-multiple-outline" size={16} color={selectedSport.cardLabel} />
                          <Text style={styles.cockpitPresetValue}>{cockpitTeamLabel}</Text>
                        </PressableScale>
                        <PressableScale
                          style={styles.cockpitPresetTile}
                          onPress={cycleDraftAccessMode}
                          accessibilityRole="button"
                          accessibilityLabel={t('cycleAccessModeA11y')}
                        >
                          <MaterialCommunityIcons name={accessMeta.icon} size={16} color={selectedSport.cardLabel} />
                          <Text style={styles.cockpitPresetValue}>{accessMeta.label}</Text>
                        </PressableScale>
                        <PressableScale
                          style={styles.cockpitPresetTile}
                          onPress={openMinStakeDialog}
                          accessibilityRole="button"
                          accessibilityState={{ checked: isMinStakeEnabled }}
                          accessibilityLabel={isMinStakeEnabled ? t('minStakeCurrentA11y', { amount: stakeForMeter }) : t('openMinStakeA11y')}
                        >
                          <MaterialCommunityIcons
                            name={isMinStakeEnabled ? 'toggle-switch' : 'toggle-switch-off-outline'}
                            size={16}
                            color={selectedSport.cardLabel}
                          />
                          <View style={styles.cockpitPresetCopy}>
                            <Text style={styles.cockpitPresetValue}>{minStakeLabel}</Text>
                            {minStakeMeta ? (
                              <Text style={[styles.cockpitPresetMeta, { color: selectedSport.cardLabel }]}>
                                {minStakeMeta}
                              </Text>
                            ) : null}
                          </View>
                        </PressableScale>
                      </>
                    )}
                  </View>

                  <View style={styles.cockpitControlStack}>
                    {activity === 'running' && (
                      <View style={styles.cockpitQuickStepperRow}>
                        <Text style={[styles.cockpitQuickStepperLabel, { color: selectedSport.cardLabel }]}>
                          {runningCountLabel}
                        </Text>
                        <View style={[styles.cockpitStepper, styles.cockpitQuickStepperControl]}>
                          <PressableScale
                            style={[
                              styles.cockpitStepperButton,
                              !canDecreaseRunningCount && styles.stepperButtonDisabled,
                            ]}
                            onPress={() => {
                              if (isRunningGroupMode) changeRunningGroupSize(-1)
                              else changeTeamSizeOption(-1)
                            }}
                            disabled={!canDecreaseRunningCount}
                            accessibilityRole="button"
                            accessibilityLabel={t('decreaseCountA11y')}
                          >
                            <MaterialCommunityIcons name="minus" size={16} color={selectedSport.cardLabel} />
                          </PressableScale>
                          <Text style={[styles.cockpitStepperValue, styles.cockpitStepperValueWide]}>
                            {cockpitTeamLabel}
                          </Text>
                          <PressableScale
                            style={[
                              styles.cockpitStepperButton,
                              !canIncreaseRunningCount && styles.stepperButtonDisabled,
                            ]}
                            onPress={() => {
                              if (isRunningGroupMode) changeRunningGroupSize(1)
                              else changeTeamSizeOption(1)
                            }}
                            disabled={!canIncreaseRunningCount}
                            accessibilityRole="button"
                            accessibilityLabel={t('increaseCountA11y')}
                          >
                            <MaterialCommunityIcons name="plus" size={16} color={selectedSport.cardLabel} />
                          </PressableScale>
                        </View>
                      </View>
                    )}

                    {accessMode === 'code' && (
                      <View style={styles.cockpitInlineCodeRow}>
                        <MaterialCommunityIcons name="dialpad" size={15} color={selectedSport.cardLabel} />
                        <TextInput
                          style={styles.cockpitInlineCodeInput}
                          placeholder="000000"
                          placeholderTextColor={theme.fightMuted}
                          keyboardType="number-pad"
                          value={entryCode}
                          onChangeText={(text) => setEntryCode(normalizeEntryCode(text))}
                          maxLength={6}
                        />
                      </View>
                    )}

                  </View>

                  {isScheduled && (
                    <SchedulePicker
                      value={scheduledAt}
                      onChange={setScheduledAt}
                      maxDays={MAX_SCHEDULE_DAYS + 1}
                    />
                  )}

                  <PressableScale
                    style={[styles.button, styles.cockpitOpenRoomButton]}
                    onPress={onSubmit}
                    disabled={createMatchMutation.isPending}
                    accessibilityRole="button"
                    accessibilityLabel={t('openMatchRoomA11y')}
                  >
                    <MaterialCommunityIcons name="sword-cross" size={18} color={theme.onEconomy} />
                    <Text style={styles.buttonText}>
                      {createMatchMutation.isPending ? t('openingLabel') : guidance.ctaLabel}
                    </Text>
                    <MaterialCommunityIcons name="arrow-right" size={18} color={theme.onEconomy} />
                  </PressableScale>
                </Animated.View>
              )}

              <Animated.View
                style={[
                  styles.floorPreview,
                  {
                    backgroundColor: 'rgba(10, 14, 11, 0.86)',
                    borderColor: selectedCardBorderFaint,
                  },
                  selectedSportLocked && styles.floorPreviewLocked,
                  reelCardAnimatedStyle,
                ]}
              >
                <View style={styles.floorHudRow}>
                  <View style={styles.floorScoreBlock}>
                    <Text style={[styles.floorEyebrow, { color: selectedSport.cardLabel }]}>{t('sportEloEyebrowLabel')}</Text>
                    <View style={styles.floorScoreRow}>
                      <MaterialCommunityIcons name="chart-line-variant" size={18} color={theme.economy} />
                      <Text style={styles.floorScore}>{sportEloScore}</Text>
                      <Text style={styles.floorScoreUnit}>{t('eloUnitLabel')}</Text>
                    </View>
                  </View>
                  <View style={[styles.floorSportBadge, { borderColor: selectedSport.cardBorder }]}>
                    <MaterialCommunityIcons
                      name={selectedSport.icon as MaterialCommunityIconName}
                      size={18}
                      color={selectedSport.isEnabled ? selectedSport.cardLabel : theme.muted}
                    />
                  </View>
                </View>

                <View style={[styles.floorSelfRow, { borderColor: selectedSport.cardBorder }]}>
                  <View style={[styles.floorSelfRank, { backgroundColor: selectedSport.cardLabel }]}>
                    <Text style={styles.floorSelfRankText}>{t('youLabel')}</Text>
                  </View>
                  <View style={styles.floorSelfAvatar}>
                    <Text style={styles.floorSelfAvatarText}>R</Text>
                  </View>
                  <View style={styles.floorSelfCopy}>
                    <Text style={styles.floorSelfName}>{t('rallyPlayerLabel')}</Text>
                    <Text style={[styles.floorSelfMeta, { color: selectedSport.cardLabel }]}>{sportEloMeta}</Text>
                  </View>
                  <View style={styles.floorSelfScoreVault}>
                    <Text style={[styles.floorSelfScore, { color: selectedSportLocked ? theme.fightMuted : selectedSport.cardLabel }]}>
                      {sportEloScore}
                    </Text>
                  </View>
                </View>

                <View style={styles.floorHistoryRow}>
                  {floorHistoryRows.map((match, index) => {
                    const isWin = match.tone === 'win'
                    const isLoss = match.tone === 'loss'
                    const historyColor = isLoss
                      ? theme.risk
                      : isWin
                        ? selectedSport.cardLabel
                        : theme.fightMuted
                    return (
                      <View
                        key={`${selectedSport.key}-history-${match.meta}-${index}`}
                        style={[
                          styles.floorHistoryItem,
                          {
                            borderColor: isLoss ? theme.risk : selectedSport.cardBorder,
                            backgroundColor: isLoss ? theme.riskSoft : 'rgba(249,246,240,0.08)',
                          },
                        ]}
                      >
                        <View style={[styles.floorHistoryResultBadge, { borderColor: historyColor }]}>
                          <Text style={[styles.floorHistoryResult, { color: historyColor }]}>
                            {match.result}
                          </Text>
                        </View>
                        <View style={styles.floorHistoryTextBlock}>
                          <Text style={styles.floorHistoryScore}>{match.score}</Text>
                          <Text style={[styles.floorHistoryMeta, { color: selectedSport.cardLabel }]}>{match.meta}</Text>
                        </View>
                        <Text style={[styles.floorHistoryDelta, { color: historyColor }]}>
                          {match.delta}
                        </Text>
                      </View>
                    )
                  })}
                  {floorHistoryRows.length === 0 && (
                    <View
                      style={[
                        styles.floorHistoryItem,
                        {
                          borderColor: selectedSportLocked ? theme.line : selectedSport.cardBorder,
                          backgroundColor: 'rgba(249,246,240,0.06)',
                        },
                      ]}
                    >
                      <View style={[styles.floorHistoryResultBadge, { borderColor: theme.fightMuted }]}>
                        <MaterialCommunityIcons
                          name={selectedSportLocked ? 'lock' : 'history'}
                          size={12}
                          color={theme.fightMuted}
                        />
                      </View>
                      <View style={styles.floorHistoryTextBlock}>
                        <Text style={styles.floorHistoryScore}>
                          {selectedSportLocked
                            ? t('arenaLockedLabel')
                            : myMatchesQuery.data
                              ? t('noRealMatchesLabel')
                              : t('syncingHistoryLabel')}
                        </Text>
                        <Text style={[styles.floorHistoryMeta, { color: selectedSport.cardLabel }]}>
                          {selectedSportLocked ? t('comingSoonBadgeLabel') : t('playThisModeLabel')}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </Animated.View>
            </View>
          </Reveal>
        </>
      )}

      {sportPage && (
      <>
      <Reveal delay={20}>
        <View style={styles.heroCard}>
          <View style={styles.heroSurface} pointerEvents="none" />
          <View style={styles.heroTopRow}>
            <View style={styles.heroIcon}>
              <MaterialCommunityIcons name="sword-cross" size={22} color={theme.onEconomy} />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>{guidance.heroTitle}</Text>
            </View>
          </View>
          <View style={styles.setupMeter}>
            {guidance.setupSteps.map((step, index) => {
              const ready = setupStepReady[step]
              return (
                <View key={step} style={styles.setupStepWrap}>
                  <View style={[styles.setupNode, ready && styles.setupNodeReady]}>
                    <MaterialCommunityIcons
                      name={SETUP_STEP_ICON[step]}
                      size={17}
                      color={ready ? theme.onEconomy : theme.fightMuted}
                    />
                  </View>
                  {index < guidance.setupSteps.length - 1 && (
                    <View style={[styles.setupConnector, ready && styles.setupConnectorReady]} />
                  )}
                </View>
              )
            })}
          </View>
          <View style={styles.heroStatusRow}>
            <View style={styles.heroStatusPill}>
              <MaterialCommunityIcons name={ACTIVITY_ICON[activity]} size={13} color={activityAccent} />
              <Text style={[styles.heroStatusText, { color: activityAccent }]}>{ACTIVITY_LABEL[activity]}</Text>
            </View>
            <View style={styles.heroStatusPill}>
              <MaterialCommunityIcons name={isCoopRun ? 'heart-outline' : 'sword-cross'} size={13} color={theme.economy} />
              <Text style={[styles.heroStatusText, { color: theme.economy }]}>{isCoopRun ? t('coopBadgeLabel') : `${stakeForMeter || MIN_STAKE} ${t('ptsUnit')}`}</Text>
            </View>
          </View>
        </View>
      </Reveal>

      {activity === 'running' && (
        <Reveal delay={60}>
          <PressableScale
            style={[styles.soloRunCard, !canUseSoloGpsAlpha && { opacity: 0.62 }]}
            onPress={() => {
              if (!canUseSoloGpsAlpha) {
                const copy = getRunningGateLockedCopy(t, RUNNING_SOLO_GPS_ALPHA_FEATURE_KEY)
                Alert.alert(copy.title, copy.message)
                return
              }
              guardedRouter.push('/run/active', { actionKey: 'match-new:solo-run' })
            }}
          >
            <View style={styles.soloRunIcon}>
              <MaterialCommunityIcons name={canUseSoloGpsAlpha ? 'run' : 'lock-outline'} size={20} color={theme.red} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.soloRunTitle}>{t('soloGpsRunTitle')}</Text>
              <View style={styles.soloRunBadges}>
                <Text style={styles.soloRunBadge}>{canUseSoloGpsAlpha ? 'GPS' : getGateStatusLabel(t, runningAlphaGate.gates[RUNNING_SOLO_GPS_ALPHA_FEATURE_KEY])}</Text>
                <Text style={styles.soloRunBadge}>{t('zeroStakeLabel')}</Text>
              </View>
            </View>
            <MaterialCommunityIcons name={canUseSoloGpsAlpha ? 'chevron-right' : 'lock'} size={20} color={theme.muted} />
          </PressableScale>
        </Reveal>
      )}

      {activity === 'running' && (
        <Reveal delay={90}>
          <View style={styles.sectionPanel}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionNumber}>
              <Text style={styles.sectionNumberText}>R</Text>
            </View>
            <View style={styles.sectionCopy}>
              <Text style={styles.label}>{t('runModesLabel')}</Text>
              <Text style={styles.sectionTitle}>{t('selectRunRoomTitle')}</Text>
            </View>
          </View>
          <View style={styles.optionStack}>
            {runningModeCards.map((card) => {
              const iconName = card.enabled ? card.icon : 'lock-outline'
              return (
                <PressableScale
                  key={card.key}
                  style={[
                    styles.optionCard,
                    !card.enabled && { opacity: 0.58 },
                    card.selected && styles.optionCardActive,
                  ]}
                  onPress={() => selectRunningLobbyModeCard(card)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: card.selected, disabled: !card.enabled }}
                >
                  <MaterialCommunityIcons
                    name={iconName}
                    size={18}
                    color={card.selected ? theme.red : theme.muted}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionTitle}>{card.title}</Text>
                    <Text style={styles.optionHint} numberOfLines={2}>{card.hint}</Text>
                    <View style={styles.optionMetaRow}>
                      {card.badges.map((item) => (
                        <Text key={item} style={styles.optionMetaPill}>{item}</Text>
                      ))}
                      {card.lockedLabel ? (
                        <Text style={styles.optionMetaPill}>{card.lockedLabel}</Text>
                      ) : null}
                    </View>
                  </View>
                  <MaterialCommunityIcons
                    name={card.selected ? 'check-circle' : card.enabled ? 'chevron-right' : 'lock'}
                    size={18}
                    color={card.selected ? theme.red : theme.muted}
                  />
                </PressableScale>
              )
            })}
          </View>
          {selectedRunningModeCard && (
            <View style={styles.modeSignal}>
              <MaterialCommunityIcons
                name={selectedRunningModeCard.key === 'crew_map' ? 'account-group-outline' : selectedRunningModeCard.icon}
                size={13}
                color={theme.trust}
              />
              <Text style={styles.modeSignalText}>{selectedRunningModeCard.title}</Text>
            </View>
          )}
          </View>
        </Reveal>
      )}

      {hasSelectedRunningMode && (
      <Reveal delay={100}>
        <Text style={styles.label}>
          {isRunningGroupMode ? t('peopleCountLabel') : t('teamSizeLabel')} · {teamLabel}
        </Text>
        {activity === 'running' && usesRunningPeopleStepper ? (
          <View style={styles.stepper}>
            <PressableScale
              style={[styles.stepperButton, runningGroupSize <= runningGroupMinSize && styles.stepperButtonDisabled]}
              onPress={() => changeRunningGroupSize(-1)}
              disabled={runningGroupSize <= runningGroupMinSize}
            >
              <MaterialCommunityIcons name="minus" size={18} color={runningGroupSize <= runningGroupMinSize ? theme.mutedSoft : theme.red} />
            </PressableScale>
            <View style={styles.stepperValue}>
              <Text style={styles.stepperNumber}>{runningGroupSize}</Text>
              <Text style={styles.stepperLabel}>{t('peopleUnit')}</Text>
            </View>
            <PressableScale
              style={[styles.stepperButton, runningGroupSize >= RUNNING_GROUP_MAX_RUNNERS && styles.stepperButtonDisabled]}
              onPress={() => changeRunningGroupSize(1)}
              disabled={runningGroupSize >= RUNNING_GROUP_MAX_RUNNERS}
            >
              <MaterialCommunityIcons name="plus" size={18} color={runningGroupSize >= RUNNING_GROUP_MAX_RUNNERS ? theme.mutedSoft : theme.red} />
            </PressableScale>
          </View>
        ) : (
          <View style={styles.pills}>
            {sizeOptions.map((n) => {
              const active = teamSize === n
              return (
                <PressableScale
                  key={n}
                  style={[
                    styles.pill,
                    active && { backgroundColor: theme.arcadePanel, borderColor: activityAccent, borderWidth: 1 },
                  ]}
                  onPress={() => onTeamSizeChange(n)}
                >
                  <Text style={[styles.pillText, active && { color: activityAccent }]}>
                    {n === 1 ? '1v1' : `${n}v${n}`}
                  </Text>
                </PressableScale>
              )
            })}
          </View>
        )}
      </Reveal>
      )}

      {hasSelectedRunningMode && isCoopRun && (
      <Reveal delay={140}>
        <Text style={styles.label}>{t('teamTargetDistanceLabel')}</Text>
        <View style={styles.pills}>
          {[3, 5, 10, 21].map((km) => {
            const active = coopTargetKm === km
            return (
              <PressableScale
                key={km}
                style={[
                  styles.pill,
                  active && { backgroundColor: theme.arcadePanel, borderColor: activityAccent, borderWidth: 1 },
                ]}
                onPress={() => setCoopTargetKm(km)}
              >
                <Text style={[styles.pillText, active && { color: activityAccent }]}>{km} {t('kmUnit')}</Text>
              </PressableScale>
            )
          })}
        </View>
      </Reveal>
      )}

      {/* ── LOBBY ── */}
      {hasSelectedRunningMode && (
      <Reveal delay={180}>
        <View style={styles.sectionPanel}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionNumber}>
            <Text style={styles.sectionNumberText}>2</Text>
          </View>
          <View style={styles.sectionCopy}>
              <Text style={styles.label}>{t('rivalLabel')}</Text>
            <Text style={styles.sectionTitle}>{t('selectRivalTitle')}</Text>
          </View>
        </View>
        <View style={styles.duelPreview}>
          <View style={styles.duelSide}>
            <MaterialCommunityIcons name="account" size={18} color={theme.arcadeCtaText} />
          </View>
          <Text style={styles.duelVs}>{t('vsLabel')}</Text>
          <View style={[styles.duelSide, styles.duelSidePending]}>
            <MaterialCommunityIcons name={lobbyMode === 'private_code' ? 'lock-outline' : 'account-question-outline'} size={18} color={theme.muted} />
          </View>
        </View>
        {canInviteFriendFromDraft && (
          <View style={styles.inviteeRow}>
            <Text style={styles.sideBadge}>{isCoopRun ? t('friendBadgeLabel') : t('rivalBadgeLabel')}</Text>
            <PressableScale
              style={[styles.inviteePicker, selectedInvitee && styles.inviteePickerActive]}
              onPress={() => setInvitePickerVisible(true)}
              accessibilityRole="button"
              accessibilityLabel={t('selectFriendA11y')}
            >
              <MaterialCommunityIcons
                name={selectedInvitee ? 'account-check-outline' : 'account-plus-outline'}
                size={16}
                color={selectedInvitee ? theme.red : theme.muted}
              />
              <Text
                style={[styles.inviteePickerText, selectedInvitee && styles.inviteePickerTextActive]}
                numberOfLines={1}
              >
                {selectedInvitee
                  ? selectedInvitee.displayName ?? `@${selectedInvitee.handle}`
                  : isCoopRun ? t('inviteFriendCoopLabel') : t('inviteFriend1v1Label')}
              </Text>
            </PressableScale>
            {selectedInvitee && (
              <PressableScale
                style={styles.clearInviteeButton}
                onPress={() => setSelectedInvitee(null)}
                accessibilityRole="button"
                accessibilityLabel={t('removeSelectedFriendA11y')}
              >
                <MaterialCommunityIcons name="close" size={16} color={theme.muted} />
              </PressableScale>
            )}
          </View>
        )}
        {canInviteFriendFromDraft && selectedInvitee && headToHead.data ? (
          <HeadToHeadCard record={headToHead.data} />
        ) : null}
        <View style={styles.lobbyRow}>
          <PressableScale
            style={[styles.lobbyChip, lobbyMode === 'public' && styles.lobbyChipActive]}
            onPress={() => setLobbyMode('public')}
            accessibilityRole="button"
            accessibilityLabel={t('openLobbyA11y')}
          >
            <MaterialCommunityIcons name="account-multiple-plus" size={15} color={lobbyMode === 'public' ? theme.orange : theme.muted} />
            <Text style={[styles.lobbyChipText, lobbyMode === 'public' && { color: theme.orange }]}>{t('openLobbyLabel')}</Text>
          </PressableScale>
          <PressableScale
            style={[styles.lobbyChip, lobbyMode === 'private_code' && styles.lobbyChipActive]}
            onPress={() => setLobbyMode('private_code')}
            accessibilityRole="button"
            accessibilityLabel={t('privateCodeA11y')}
          >
            <MaterialCommunityIcons name="lock-outline" size={15} color={lobbyMode === 'private_code' ? theme.orange : theme.muted} />
            <Text style={[styles.lobbyChipText, lobbyMode === 'private_code' && { color: theme.orange }]}>{t('privateCodeLabel')}</Text>
          </PressableScale>
        </View>

        {/* Lock toggle — only when Public */}
        {lobbyMode === 'public' && (
          <PressableScale
            style={[styles.lockRow, isLocked && styles.lockRowActive]}
            onPress={() => { if (isLocked) setEntryCode(''); setIsLocked(!isLocked) }}
            accessibilityLabel={isLocked ? t('disablePasswordA11y') : t('enablePasswordA11y')}
          >
            <MaterialCommunityIcons
              name={isLocked ? 'lock' : 'lock-open-outline'}
              size={15}
              color={isLocked ? theme.economy : theme.mutedSoft}
            />
            <Text style={[styles.lockRowText, isLocked && { color: theme.economy }]}>
              {isLocked ? t('entryCodeOnLabel') : t('entryCodeOffLabel')}
            </Text>
            <MaterialCommunityIcons
              name={isLocked ? 'toggle-switch' : 'toggle-switch-off-outline'}
              size={22}
              color={isLocked ? theme.economy : theme.mutedSoft}
            />
          </PressableScale>
        )}

        {lobbyMode === 'public' && isLocked && (
          <TextInput
            style={[styles.input, styles.codeInput]}
            placeholder={t('entryCodePlaceholder')}
            placeholderTextColor={theme.mutedSoft}
            keyboardType="number-pad"
            value={entryCode}
            onChangeText={(text) => setEntryCode(normalizeEntryCode(text))}
            maxLength={6}
            autoFocus
          />
        )}

        {activity === 'basketball' && (
          <PressableScale
            style={[styles.lockRow, allowSpectators && styles.lockRowActive]}
            onPress={() => setAllowSpectators(!allowSpectators)}
            accessibilityRole="switch"
            accessibilityState={{ checked: allowSpectators }}
            accessibilityLabel={t('allowSpectateLabel')}
          >
            <MaterialCommunityIcons
              name={allowSpectators ? 'eye-outline' : 'eye-off-outline'}
              size={15}
              color={allowSpectators ? theme.economy : theme.mutedSoft}
            />
            {/* NO fontWeight/lineHeight on this Thai label — combining marks
                (สระ/วรรณยุกต์) get dropped when iOS squeezes the line box;
                styles.lockRowText carries fontWeight for the English ENTRY
                CODE row above, so this label uses its own plain style. */}
            <Text style={[styles.spectateRowText, allowSpectators && { color: theme.economy }]}>
              {t('allowSpectateLabel')}
            </Text>
            <MaterialCommunityIcons
              name={allowSpectators ? 'toggle-switch' : 'toggle-switch-off-outline'}
              size={22}
              color={allowSpectators ? theme.economy : theme.mutedSoft}
            />
          </PressableScale>
        )}
        </View>
      </Reveal>
      )}

      {/* ── SCHEDULE ── */}
      {hasSelectedRunningMode && isScheduled && (
        <Reveal delay={220}>
          <Text style={styles.label}>{t('scheduleDateTimeLabel')}</Text>
          <SchedulePicker
            value={scheduledAt}
            onChange={setScheduledAt}
            maxDays={MAX_SCHEDULE_DAYS + 1}
          />
        </Reveal>
      )}

      {/* ── STAKE ── */}
      {hasSelectedRunningMode && !isCoopRun && (
      <Reveal delay={300}>
        <View style={styles.sectionPanel}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionNumber}>
            <Text style={styles.sectionNumberText}>3</Text>
          </View>
          <View style={styles.sectionCopy}>
            <Text style={styles.label}>{t('stakeLabelWord')}</Text>
            <Text style={styles.sectionTitle}>{t('setStakeTitle')}</Text>
          </View>
        </View>
        <View style={styles.stakeCard}>
          <View style={styles.stakeRow}>
            <View style={[styles.pill, { backgroundColor: `${theme.economy}22`, borderColor: `${theme.economy}55` }]}>
              <MaterialCommunityIcons name="medal-outline" size={14} color={theme.economy} />
              <Text style={[styles.pillText, { color: theme.economy }]}>{t('ptsUnit')}</Text>
            </View>
          </View>
          <TextInput
            style={[styles.input, styles.stakeAmountInput]}
            placeholder="50"
            placeholderTextColor={theme.mutedSoft}
            keyboardType="numeric"
            value={stake}
            onChangeText={onStakeChange}
          />
          <Text style={styles.stakeUnit}>
            {t('ptsPerPlayerLabel')}
          </Text>
        </View>
        </View>
      </Reveal>
      )}

      {/* ── RULE ── */}
      {hasSelectedRunningMode && (
      <Reveal delay={340}>
        <View style={styles.sectionPanel}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionNumber}>
            <Text style={styles.sectionNumberText}>4</Text>
          </View>
          <View style={styles.sectionCopy}>
            <Text style={styles.label}>{t('consentLabel')}</Text>
            <Text style={styles.sectionTitle}>{t('rulesConsentTitle')}</Text>
          </View>
        </View>
        <TextInput
          style={[styles.input, { height: 80 }]}
          placeholder={activity === 'running' ? t('rulesPlaceholderRunning') : t('rulesPlaceholderOther')}
          placeholderTextColor={theme.mutedSoft}
          multiline
          value={ruleText}
          onChangeText={setRuleText}
        />
        <View style={styles.readyGrid}>
          <View style={[styles.readyTile, styles.readyTileActive]}>
            <MaterialCommunityIcons name="account-check" size={18} color={theme.trust} />
            <Text style={styles.readyTileText}>{t('youLabel')}</Text>
          </View>
          <View style={styles.readyVs}>
            <MaterialCommunityIcons name="swap-horizontal-bold" size={18} color={theme.arcadeCabinetEdge} />
          </View>
          <View style={styles.readyTile}>
            <MaterialCommunityIcons name="account-clock-outline" size={18} color={theme.muted} />
            <Text style={styles.readyTileTextMuted}>{t('rivalBadgeLabel')}</Text>
          </View>
        </View>
        </View>
      </Reveal>
      )}

      {hasSelectedRunningMode && (
      <Reveal delay={480}>
        <PressableScale
          style={styles.button}
          onPress={onSubmit}
          disabled={createMatchMutation.isPending}
          accessibilityRole="button"
          accessibilityLabel={t('createMatchLobbyA11y')}
        >
          <MaterialCommunityIcons name="sword-cross" size={18} color={theme.onEconomy} />
          <Text style={styles.buttonText}>
            {createMatchMutation.isPending ? t('creatingLabel') : guidance.ctaLabel}
          </Text>
          <MaterialCommunityIcons name="arrow-right" size={18} color={theme.onEconomy} />
        </PressableScale>
      </Reveal>
      )}
      </>
      )}
      </ScrollView>

      {canInviteFriendFromDraft && (
        <InviteFriendSheet
          visible={invitePickerVisible}
          matchId={undefined}
          staticItems={invitableFriends}
          onClose={() => setInvitePickerVisible(false)}
          onInvite={(friend) => {
            setSelectedInvitee({
              userId: friend.friendId,
              handle: friend.handle ?? '',
              displayName: friend.displayName,
            })
            setInvitePickerVisible(false)
          }}
        />
      )}

      <Modal
        transparent
        visible={isStakeDialogVisible}
        animationType="fade"
        onRequestClose={closeMinStakeDialog}
      >
        <Pressable style={styles.stakeDialogBackdrop} onPress={closeMinStakeDialog}>
          <Pressable
            style={[
              styles.stakeDialogCard,
              {
                backgroundColor: selectedSport.cardBackground,
                borderColor: stakeDialogHasError ? theme.risk : selectedCardBorderSoft,
              },
            ]}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.stakeDialogHeader}>
              <View style={styles.stakeDialogTitleBlock}>
                <Text style={styles.stakeDialogTitle}>{t('minStakeDialogTitle')}</Text>
                <Text
                  style={[styles.stakeDialogSubtitle, { color: selectedSport.cardLabel }]}
                  numberOfLines={1}
                >
                  {t('availableRpLabel', { amount: availableStakeLabel })}
                </Text>
              </View>
              <PressableScale
                style={styles.stakeDialogClose}
                onPress={closeMinStakeDialog}
                accessibilityRole="button"
                accessibilityLabel={t('closeLabel')}
              >
                <MaterialCommunityIcons name="close" size={18} color={theme.fightInk} />
              </PressableScale>
            </View>

            <View style={styles.stakeDialogDisplayCard}>
              <Text style={styles.stakeDialogDisplayLabel}>{t('newMinLabel')}</Text>
              <Text
                style={[
                  styles.stakeDialogDisplayValue,
                  !stakeDialogHasValue && styles.stakeDialogDisplayValueEmpty,
                  (stakeDialogBelowMinimum || stakeDialogExceedsAvailable) && styles.stakeDialogDisplayValueRisk,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
              >
                {stakeDialogDisplay}
              </Text>
              <Text style={styles.stakeDialogDisplayUnit}>{t('rallyPointUnitLabel')}</Text>
            </View>

            {stakeQuickButtons.length > 0 && (
              <View style={styles.stakeDialogQuickRow}>
                {stakeQuickButtons.map((stakeOption) => {
                  const selected = stakeDialogNumber === stakeOption
                  return (
                    <PressableScale
                      key={stakeOption}
                      style={[styles.stakeDialogQuickChip, selected && styles.stakeDialogQuickChipSelected]}
                      onPress={() => selectStakePreset(stakeOption)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={t('selectMinStakeA11y', { amount: stakeOption })}
                    >
                      <Text
                        style={[styles.stakeDialogQuickText, selected && styles.stakeDialogQuickTextSelected]}
                      >
                        {formatRankingScore(stakeOption)}
                      </Text>
                    </PressableScale>
                  )
                })}
              </View>
            )}

            <Text
              style={[
                styles.stakeDialogHint,
                (stakeDialogBelowMinimum || stakeDialogExceedsAvailable) && styles.stakeDialogHintRisk,
              ]}
            >
              {stakeDialogHint}
            </Text>

            <View style={styles.stakeDialogKeypad}>
              <View style={styles.stakeDialogKeypadRow}>
                {[1, 2, 3].map((numberKey) => (
                  <PressableScale
                    key={numberKey}
                    style={styles.stakeDialogKey}
                    onPress={() => pressStakeDialogDigit(String(numberKey))}
                    accessibilityRole="button"
                    accessibilityLabel={t('pressDigitA11y', { digit: numberKey })}
                  >
                    <Text style={styles.stakeDialogKeyText}>{numberKey}</Text>
                  </PressableScale>
                ))}
              </View>
              <View style={styles.stakeDialogKeypadRow}>
                {[4, 5, 6].map((numberKey) => (
                  <PressableScale
                    key={numberKey}
                    style={styles.stakeDialogKey}
                    onPress={() => pressStakeDialogDigit(String(numberKey))}
                    accessibilityRole="button"
                    accessibilityLabel={t('pressDigitA11y', { digit: numberKey })}
                  >
                    <Text style={styles.stakeDialogKeyText}>{numberKey}</Text>
                  </PressableScale>
                ))}
              </View>
              <View style={styles.stakeDialogKeypadRow}>
                {[7, 8, 9].map((numberKey) => (
                  <PressableScale
                    key={numberKey}
                    style={styles.stakeDialogKey}
                    onPress={() => pressStakeDialogDigit(String(numberKey))}
                    accessibilityRole="button"
                    accessibilityLabel={t('pressDigitA11y', { digit: numberKey })}
                  >
                    <Text style={styles.stakeDialogKeyText}>{numberKey}</Text>
                  </PressableScale>
                ))}
              </View>
              <View style={styles.stakeDialogKeypadRow}>
                <PressableScale
                  style={[styles.stakeDialogKey, styles.stakeDialogKeyMuted, !stakeDialogHasValue && styles.stakeDialogKeyDisabled]}
                  onPress={clearStakeDialogValue}
                  disabled={!stakeDialogHasValue}
                  accessibilityRole="button"
                  accessibilityLabel={t('clearValueA11y')}
                >
                  <Text style={[styles.stakeDialogKeyText, styles.stakeDialogKeyMutedText]}>C</Text>
                </PressableScale>
                <PressableScale
                  style={styles.stakeDialogKey}
                  onPress={() => pressStakeDialogDigit('0')}
                  accessibilityRole="button"
                  accessibilityLabel={t('pressDigitA11y', { digit: 0 })}
                >
                  <Text style={styles.stakeDialogKeyText}>0</Text>
                </PressableScale>
                <PressableScale
                  style={[styles.stakeDialogKey, styles.stakeDialogKeyMuted, !stakeDialogHasValue && styles.stakeDialogKeyDisabled]}
                  onPress={backspaceStakeDialogValue}
                  disabled={!stakeDialogHasValue}
                  accessibilityRole="button"
                  accessibilityLabel={t('backspaceA11y')}
                >
                  <MaterialCommunityIcons
                    name="backspace-outline"
                    size={24}
                    color={stakeDialogHasValue ? theme.fightInk : theme.fightMuted}
                  />
                </PressableScale>
              </View>
            </View>

            <View style={styles.stakeDialogActions}>
              <PressableScale
                style={styles.stakeDialogSecondaryButton}
                onPress={isMinStakeEnabled ? turnOffMinStake : closeMinStakeDialog}
                accessibilityRole="button"
              >
                <Text style={styles.stakeDialogSecondaryText}>
                  {isMinStakeEnabled ? t('minOffLabel') : t('cancelLabel')}
                </Text>
              </PressableScale>
              <PressableScale
                style={[
                  styles.stakeDialogPrimaryButton,
                  !canConfirmStakeDialog && styles.stakeDialogPrimaryButtonDisabled,
                ]}
                onPress={confirmMinStakeDialog}
                disabled={!canConfirmStakeDialog}
                accessibilityRole="button"
                accessibilityLabel={t('confirmMinStakeA11y')}
              >
                <Text style={styles.stakeDialogPrimaryText}>{t('saveLabel')}</Text>
              </PressableScale>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}
