import { useCallback, useEffect, useRef, useState } from 'react'
import { InteractionManager, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ScreenBackButtonView } from '@/components/navigation/ScreenBackButtonView'
import { LeaderboardEmpty } from '@/components/leaderboard/LeaderboardEmpty'
import { LeaderboardError } from '@/components/leaderboard/LeaderboardError'
import { LeaderboardScopeToggle } from '@/components/leaderboard/LeaderboardScopeToggle'
import { RankingHeader } from '@/components/leaderboard/RankingHeader'
import { RankingPodium } from '@/components/leaderboard/RankingPodium'
import { RankingRowView } from '@/components/leaderboard/RankingRowView'
import { SportAmbient } from '@/components/leaderboard/SportAmbient'
import { useSportTheme, useThemeMode } from '@/hooks/useAppTheme'
import {
  LEADERBOARD_ACTIVITIES,
  type LeaderboardActivity,
  type LeaderboardScope,
} from '@/lib/leaderboard/leaderboardConfig'
import type { LeaderboardEntry } from '@/lib/leaderboard/leaderboardTypes'
import { buildRankingTheme } from '@/lib/leaderboard/rankingTheme'

const RANKING_SKELETON_HOLD_MS = 180
const RANKING_ROWS_READY_DEFER_MS = 0
const RANKING_PERF_LOG_PREFIX = '[RankingPerf]'

export type LeaderboardQueryState = {
  isPending: boolean
  isError: boolean
  isEmpty: boolean
}

export type LeaderboardViewProps = {
  activity: LeaderboardActivity
  scope: LeaderboardScope
  podium: LeaderboardEntry[]
  list: LeaderboardEntry[]
  ownEntry: LeaderboardEntry | undefined
  showOwnEntry: boolean
  queryState: LeaderboardQueryState
  entryCount: number
  currentUserId: string | null
  onScopeChange: (scope: LeaderboardScope) => void
  onRetry: () => void
  onBack: () => void
  onOpenUser: (userId: string) => void
  /** Static adapters can skip the timed first entrance without changing production defaults. */
  initiallyAnimateEntrance?: boolean
}

/** Presentation-only ranking board, including the existing entrance timing. */
export function LeaderboardView({
  activity,
  scope,
  podium,
  list,
  ownEntry,
  showOwnEntry,
  queryState,
  entryCount,
  currentUserId,
  onScopeChange,
  onRetry,
  onBack,
  onOpenUser,
  initiallyAnimateEntrance = true,
}: LeaderboardViewProps) {
  const sport = useSportTheme()
  const mode = useThemeMode()
  const insets = useSafeAreaInsets()
  const activityMeta = LEADERBOARD_ACTIVITIES.find((item) => item.key === activity)
  const accent = activityMeta?.color ?? sport.red
  const theme = buildRankingTheme(mode, accent)
  const perfStartedAtRef = useRef(Date.now())
  const lastPodiumLogKeyRef = useRef<string | null>(null)
  const lastRowsLogKeyRef = useRef<string | null>(null)
  const playedAnimationKeysRef = useRef<Set<string>>(new Set())
  const [renderRows, setRenderRows] = useState(!initiallyAnimateEntrance)
  const [showEntranceSkeleton, setShowEntranceSkeleton] = useState(initiallyAnimateEntrance)
  const [playFullEntrance, setPlayFullEntrance] = useState(initiallyAnimateEntrance)
  const [trigger, setTrigger] = useState(0)
  const animationKey = `${activity}:${scope}`
  const showContent = !queryState.isPending && !queryState.isError && !queryState.isEmpty
  const showRankingSkeleton = (queryState.isPending || showEntranceSkeleton) && !queryState.isError && !queryState.isEmpty
  const showReadyContent = showContent && !showEntranceSkeleton
  const podiumLogKey = `${trigger}:${podium.map((entry) => `${entry.userId}:${entry.rank}:${entry.rating}`).join('|')}`
  const rowsLogKey = `${trigger}:${list.map((entry) => `${entry.userId}:${entry.rank}:${entry.rating}`).join('|')}:${ownEntry?.userId ?? ''}`
  const seasonLabel = `${activityMeta?.label ?? 'BOARD'} · SEASON 1 · TOP 50`

  useEffect(() => {
    const hasPlayedAnimation = playedAnimationKeysRef.current.has(animationKey)
    const shouldPlayFullEntrance = initiallyAnimateEntrance && !hasPlayedAnimation

    perfStartedAtRef.current = Date.now()
    lastPodiumLogKeyRef.current = null
    lastRowsLogKeyRef.current = null
    setRenderRows(!shouldPlayFullEntrance)
    setPlayFullEntrance(shouldPlayFullEntrance)
    setShowEntranceSkeleton(shouldPlayFullEntrance)

    const timeout = setTimeout(() => {
      setShowEntranceSkeleton(false)
      if (shouldPlayFullEntrance) setTrigger((value) => value + 1)
    }, shouldPlayFullEntrance ? RANKING_SKELETON_HOLD_MS : 0)

    markRankingPerf(perfStartedAtRef, 'mode change', { activity, scope, playFullEntrance: shouldPlayFullEntrance })
    return () => clearTimeout(timeout)
  }, [activity, animationKey, initiallyAnimateEntrance, scope])

  useEffect(() => {
    if (!showReadyContent) {
      setRenderRows(false)
      return
    }
    if (!playFullEntrance) {
      setRenderRows(true)
      return
    }

    setRenderRows(false)
    let timeout: ReturnType<typeof setTimeout> | null = null
    const task = InteractionManager.runAfterInteractions(() => {
      timeout = setTimeout(() => setRenderRows(true), RANKING_ROWS_READY_DEFER_MS)
    })
    return () => {
      task.cancel()
      if (timeout) clearTimeout(timeout)
    }
  }, [playFullEntrance, showReadyContent, trigger])

  useEffect(() => {
    if (showReadyContent && playFullEntrance) playedAnimationKeysRef.current.add(animationKey)
  }, [animationKey, playFullEntrance, showReadyContent])

  useEffect(() => {
    if (showReadyContent) {
      markRankingPerf(perfStartedAtRef, 'data ready', { activity, scope, entryCount })
    }
  }, [activity, entryCount, scope, showReadyContent])

  const handlePodiumRendered = useCallback(() => {
    if (lastPodiumLogKeyRef.current === podiumLogKey) return
    lastPodiumLogKeyRef.current = podiumLogKey
    markRankingPerf(perfStartedAtRef, 'podium rendered', { podiumCount: podium.length })
  }, [podium.length, podiumLogKey])

  const handleRowsRendered = useCallback(() => {
    if (lastRowsLogKeyRef.current === rowsLogKey) return
    lastRowsLogKeyRef.current = rowsLogKey
    markRankingPerf(perfStartedAtRef, 'rows rendered', { rowCount: list.length + (showOwnEntry ? 1 : 0) })
  }, [list.length, rowsLogKey, showOwnEntry])

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <SportAmbient activity={activity} />
      <View style={[styles.backRow, { paddingTop: insets.top + 8 }]}>
        <ScreenBackButtonView
          onPress={onBack}
          iconColor={theme.ink}
          backgroundColor={theme.rowBg}
          borderColor={theme.rowBorder}
          accessibilityLabel="กลับ"
        />
      </View>
      <RankingHeader theme={theme} seasonLabel={seasonLabel} trigger={trigger} topPadding={4} />
      <LeaderboardScopeToggle value={scope} onChange={onScopeChange} accent={accent} theme={theme} />
      {showRankingSkeleton && <RankingSkeleton theme={theme} />}
      {queryState.isError && <View style={styles.state}><LeaderboardError onRetry={onRetry} /></View>}
      {queryState.isEmpty && <View style={styles.state}><LeaderboardEmpty /></View>}
      {showReadyContent && (
        <ScrollView contentContainerStyle={styles.scroll}>
          <RankingPodium entries={podium} trigger={trigger} theme={theme} animated={playFullEntrance} playConfetti={playFullEntrance} onRendered={handlePodiumRendered} />
          {renderRows && (
            <View style={styles.list} onLayout={handleRowsRendered}>
              {showOwnEntry && ownEntry && (
                <RankingRowView entry={ownEntry} isYou showDelta={false} index={0} trigger={trigger} theme={theme} animatedEntrance={playFullEntrance} onPress={() => onOpenUser(ownEntry.userId)} />
              )}
              {list.map((entry, index) => (
                <RankingRowView
                  key={entry.userId}
                  entry={entry}
                  isYou={entry.userId === currentUserId}
                  index={showOwnEntry ? index + 1 : index}
                  trigger={trigger}
                  theme={theme}
                  animatedEntrance={playFullEntrance}
                  onPress={() => onOpenUser(entry.userId)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backRow: { paddingHorizontal: 22, paddingBottom: 2 },
  scroll: { paddingBottom: 108 },
  state: { flex: 1, justifyContent: 'flex-start' },
  list: { marginTop: 12, paddingHorizontal: 18, gap: 10 },
  skeleton: { flex: 1, paddingHorizontal: 18, paddingTop: 18 },
  skeletonPodium: { height: 234, marginTop: 18, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 12 },
  skeletonColumn: { borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 },
  skeletonList: { marginTop: 12, gap: 10 },
  skeletonRow: { height: 58, borderRadius: 18 },
})

function RankingSkeleton({ theme }: { theme: ReturnType<typeof buildRankingTheme> }) {
  const fill = theme.mode === 'light' ? 'rgba(10,10,15,0.08)' : 'rgba(255,255,255,0.08)'
  return (
    <View pointerEvents="none" style={styles.skeleton}>
      <View style={styles.skeletonPodium}>
        <View style={[styles.skeletonColumn, { width: 106, height: 148, backgroundColor: fill }]} />
        <View style={[styles.skeletonColumn, { width: 124, height: 194, backgroundColor: fill }]} />
        <View style={[styles.skeletonColumn, { width: 106, height: 124, backgroundColor: fill }]} />
      </View>
      <View style={styles.skeletonList}>
        {Array.from({ length: 5 }, (_, index) => <View key={index} style={[styles.skeletonRow, { backgroundColor: fill }]} />)}
      </View>
    </View>
  )
}

function markRankingPerf(startedAtRef: { current: number }, label: string, details: Record<string, unknown>) {
  if (!__DEV__) return
  console.info(RANKING_PERF_LOG_PREFIX, label, { elapsedMs: Date.now() - startedAtRef.current, ...details })
}
