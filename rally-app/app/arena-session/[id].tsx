import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Alert, StyleSheet, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { router, Stack, useLocalSearchParams } from 'expo-router'

import { ArenaSessionBoard } from '@/components/arena-session/ArenaSessionBoard'
import { ArenaSessionHostControlsSheet } from '@/components/arena-session/ArenaSessionHostControlsSheet'
import { PressableScale } from '@/components/motion/PressableScale'
import { useScreenInsets } from '@/components/layout/useScreenInsets'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useAuth } from '@/hooks/useAuth'
import { useMyParties, useParty } from '@/hooks/useParty'
import { useRunLobbyLocation } from '@/hooks/useRunLobbyLocation'
import { useArenaSessionFlow } from '@/hooks/useArenaSessionFlow'
import { useSportTheme } from '@/hooks/useAppTheme'
import { mapArenaSessionSnapshot } from '@/lib/arena-sessions/arenaSessionService'
import { getArenaTeamContinuationErrorCopy } from '@/lib/arena-sessions/arenaTeamContinuation'
import { selectPartyForArenaSession } from '@/lib/party/partyService'

export default function ArenaSessionDetailScreen() {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { paddingTop } = useScreenInsets({ edges: ['top'], topPad: Spacing.sm })
  const params = useLocalSearchParams<{ id?: string | string[]; partyId?: string | string[] }>()
  const arenaId = firstParam(params.id)
  const requestedPartyId = firstParam(params.partyId)
  const { user } = useAuth()
  const flow = useArenaSessionFlow({
    userId: user?.id,
    arenaId,
    enabled: Boolean(user && arenaId),
  })
  const myPartiesQuery = useMyParties({ enabled: Boolean(user) })
  const selectedPartySummary = useMemo(() => {
    if (!flow.snapshot) return null
    return selectPartyForArenaSession(myPartiesQuery.data ?? [], {
      hostUserId: user?.id,
      activityType: flow.snapshot.session.activityType,
      teamSize: flow.snapshot.session.teamSize,
      requestedPartyId,
    })
  }, [flow.snapshot, myPartiesQuery.data, requestedPartyId, user?.id])
  const selectedPartyId = selectedPartySummary?.id
  const { partyQuery } = useParty(selectedPartyId, { enabled: Boolean(selectedPartyId) })
  const { recordPresence } = flow
  const [presenceRequestId, setPresenceRequestId] = useState(0)
  const [presenceSubmitting, setPresenceSubmitting] = useState(false)
  const [actionError, setActionError] = useState<unknown>(null)
  const [hostControlsVisible, setHostControlsVisible] = useState(false)
  const [hostControlsTargetArenaId, setHostControlsTargetArenaId] = useState<string | null>(null)
  const location = useRunLobbyLocation({ enabled: presenceRequestId > 0 })
  const boardModel = flow.snapshot
    ? mapArenaSessionSnapshot(flow.snapshot, { actorUserId: user?.id, party: partyQuery.data })
    : null
  const hostControlsArenaId = arenaId
    && flow.snapshot?.session.arenaEventId === arenaId
    && flow.snapshot.actor.role === 'host'
    ? arenaId
    : null
  const hostControlsMounted = Boolean(
    hostControlsArenaId
    && hostControlsVisible
    && hostControlsTargetArenaId === hostControlsArenaId,
  )
  const hostControlsBindingRef = useRef<{ arenaId: string } | null>(null)
  const roundControlsFresh = Boolean(
    flow.snapshot
    && !flow.isReconnecting
    && !flow.snapshotQuery.isFetching
    && !flow.snapshotQuery.error,
  )
  useEffect(() => {
    if (!presenceRequestId || !location.warmStartLocation || presenceSubmitting || !arenaId) return

    setPresenceSubmitting(true)
    void recordPresence({
      arenaEventId: arenaId,
      currentLat: location.warmStartLocation.lat,
      currentLng: location.warmStartLocation.lng,
      accuracyM: 30,
    })
      .catch((error: unknown) => setActionError(error))
      .finally(() => {
        setPresenceSubmitting(false)
        setPresenceRequestId(0)
      })
  }, [arenaId, location.warmStartLocation, presenceRequestId, presenceSubmitting, recordPresence])

  useEffect(() => {
    if (!presenceRequestId || !location.error) return
    setActionError(location.error)
    setPresenceRequestId(0)
  }, [location.error, presenceRequestId])

  useEffect(() => {
    if (hostControlsArenaId && hostControlsTargetArenaId === hostControlsArenaId) return
    setHostControlsVisible(false)
    setHostControlsTargetArenaId(null)
  }, [hostControlsArenaId, hostControlsTargetArenaId])

  useLayoutEffect(() => {
    if (!hostControlsArenaId || !hostControlsMounted) {
      hostControlsBindingRef.current = null
      return
    }

    const binding = { arenaId: hostControlsArenaId }
    hostControlsBindingRef.current = binding
    return () => {
      if (hostControlsBindingRef.current === binding) hostControlsBindingRef.current = null
    }
  }, [hostControlsArenaId, hostControlsMounted])

  const actionPending = useMemo(() => [
    flow.openMutation,
    flow.readyMutation,
    flow.stagePartyMutation,
    flow.advanceQueueMutation,
    flow.reorderQueueMutation,
    flow.updateStakeProposalMutation,
    flow.confirmFinalStakeMutation,
    flow.startRoundMutation,
    flow.chooseTeamParticipationMutation,
    flow.leaveMutation,
    flow.beginDrainMutation,
    flow.closeMutation,
  ].some((mutation) => mutation.isPending) || presenceSubmitting, [
    flow.beginDrainMutation,
    flow.closeMutation,
    flow.leaveMutation,
    flow.openMutation,
    flow.readyMutation,
    flow.stagePartyMutation,
    flow.advanceQueueMutation,
    flow.reorderQueueMutation,
    flow.updateStakeProposalMutation,
    flow.confirmFinalStakeMutation,
    flow.startRoundMutation,
    flow.chooseTeamParticipationMutation,
    presenceSubmitting,
  ]) || presenceRequestId > 0

  function run(action: () => Promise<unknown>) {
    setActionError(null)
    void action().catch((error: unknown) => setActionError(error))
  }

  function runTeamParticipation(action: () => Promise<unknown>) {
    setActionError(null)
    void action().catch((error: unknown) => {
      setActionError(new Error(getArenaTeamContinuationErrorCopy(error)))
    })
  }

  function requestPresence() {
    if (actionPending || presenceRequestId > 0) return
    setActionError(null)
    setPresenceRequestId((value) => value + 1)
  }

  function goBack() {
    if (router.canGoBack()) router.back()
    else router.replace('/arenas' as never)
  }

  function confirm(title: string, message: string, action: () => void) {
    Alert.alert(title, message, [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'ยืนยัน', style: 'destructive', onPress: action },
    ])
  }

  function hasCurrentHostControlsBinding(expectedArenaId: string) {
    return hostControlsBindingRef.current?.arenaId === expectedArenaId
  }

  const queuedTeams = useMemo(
    () => (flow.snapshot?.teams ?? [])
      .filter((team) => team.status === 'queued')
      .sort((a, b) => (a.queuePosition ?? Number.MAX_SAFE_INTEGER) - (b.queuePosition ?? Number.MAX_SAFE_INTEGER)),
    [flow.snapshot?.teams],
  )
  const isHost = Boolean(hostControlsArenaId)
  const isParticipatingNonHost = flow.snapshot?.session.arenaEventId === arenaId
    && flow.snapshot?.actor.role === 'member'
    && flow.snapshot.actor.memberState !== 'left'
  const isOpenQueue = flow.snapshot?.session.mode === 'casual'
    && (flow.snapshot.session.sessionState === 'open' || flow.snapshot.session.sessionState === 'draining')
  const isDrainingExpired = flow.snapshot?.session.sessionState === 'draining'
    && (!flow.snapshot.session.drainDeadlineAt || new Date(flow.snapshot.session.drainDeadlineAt).getTime() <= Date.now())

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.topbar, { paddingTop }]}>
        <PressableScale style={styles.backButton} onPress={goBack} accessibilityLabel="กลับรายการ Arena">
          <MaterialCommunityIcons name="chevron-left" size={25} color={theme.ink} />
        </PressableScale>
        {isHost || isParticipatingNonHost ? (
          <PressableScale
            style={[styles.hostControlsButton, !isHost && styles.hostControlsButtonDisabled]}
            onPress={() => {
              if (!hostControlsArenaId) return
              setHostControlsTargetArenaId(hostControlsArenaId)
              setHostControlsVisible(true)
            }}
            disabled={!isHost}
            accessibilityLabel="จัดการสนาม"
            accessibilityState={{ disabled: !isHost }}
          >
            <MaterialCommunityIcons name="dots-horizontal-circle-outline" size={25} color={isHost ? theme.ink : theme.mutedSoft} />
          </PressableScale>
        ) : null}
      </View>
      <ArenaSessionBoard
        snapshot={flow.snapshot}
        party={partyQuery.data}
        actorUserId={user?.id}
        isSyncing={flow.snapshotQuery.isFetching}
        isReconnecting={flow.isReconnecting}
        error={actionError ?? flow.snapshotQuery.error ?? myPartiesQuery.error ?? partyQuery.error}
        actionPending={actionPending}
        presencePending={presenceRequestId > 0 || presenceSubmitting}
        roundControlsFresh={roundControlsFresh}
        onRetry={() => {
          setActionError(null)
          void flow.snapshotQuery.refetch()
          void myPartiesQuery.refetch()
          if (selectedPartyId) void partyQuery.refetch()
        }}
        onRecordPresence={requestPresence}
        onReady={() => {
          if (boardModel?.team?.teamId) run(() => flow.readyMutation.mutateAsync(boardModel.team!.teamId))
        }}
        onStageParty={(input) => {
          if (arenaId) run(() => flow.stagePartyMutation.mutateAsync({ arenaEventId: arenaId, ...input }))
        }}
        onUpdateStakeProposal={(input) => {
          run(() => flow.updateStakeProposalMutation.mutateAsync(input))
        }}
        onConfirmFinalStake={(input) => {
          run(() => flow.confirmFinalStakeMutation.mutateAsync(input))
        }}
        onStartRound={(input) => {
          run(() => flow.startRoundMutation.mutateAsync(input))
        }}
        onChooseTeamParticipation={(input) => runTeamParticipation(() => flow.chooseTeamParticipationMutation.mutateAsync(input))}
        onLeave={() => {
          if (arenaId) run(() => flow.leaveMutation.mutateAsync(arenaId))
        }}
        onGoToArenaList={() => router.replace('/arenas' as never)}
        onGoToMatch={(matchId) => router.push(`/arena-result/${matchId}` as never)}
      />
      {hostControlsMounted ? (
        <ArenaSessionHostControlsSheet
          visible={hostControlsVisible}
          queuedTeams={queuedTeams}
          canOpen={Boolean(hostControlsArenaId && boardModel?.canOpen)}
          canAdvance={Boolean(hostControlsArenaId && isOpenQueue && !isDrainingExpired)}
          canReorder={Boolean(hostControlsArenaId && isOpenQueue && !isDrainingExpired)}
          canBeginDrain={Boolean(hostControlsArenaId && boardModel?.canBeginDrain)}
          canClose={Boolean(hostControlsArenaId && boardModel?.canClose)}
          pending={actionPending}
          onCloseSheet={() => {
            setHostControlsVisible(false)
            setHostControlsTargetArenaId(null)
          }}
          onOpen={() => {
            if (!hostControlsArenaId || !hasCurrentHostControlsBinding(hostControlsArenaId)) return
            run(() => flow.openMutation.mutateAsync(hostControlsArenaId))
          }}
          onAdvanceQueue={() => {
            if (!hostControlsArenaId || !hasCurrentHostControlsBinding(hostControlsArenaId)) return
            run(() => flow.advanceQueueMutation.mutateAsync(hostControlsArenaId))
          }}
          onReorderQueue={(input) => {
            if (!hostControlsArenaId || !hasCurrentHostControlsBinding(hostControlsArenaId)) return
            run(async () => {
              await flow.reorderQueueMutation.mutateAsync({ arenaId: hostControlsArenaId, ...input })
              setHostControlsVisible(false)
              setHostControlsTargetArenaId(null)
            })
          }}
          onBeginDrain={() => confirm('เริ่มปิดสนาม?', 'จะหยุดรับทีมใหม่ และให้เวลาสนามปิดภายใน 20 นาที', () => {
            if (!hostControlsArenaId || !hasCurrentHostControlsBinding(hostControlsArenaId)) return
            run(() => flow.beginDrainMutation.mutateAsync(hostControlsArenaId))
          })}
          onCloseSession={() => confirm('ปิด Session?', 'การปิดสนามเป็นการกระทำสุดท้ายของ Session นี้', () => {
            if (!hostControlsArenaId || !hasCurrentHostControlsBinding(hostControlsArenaId)) return
            run(() => flow.closeMutation.mutateAsync({ arenaEventId: hostControlsArenaId, cancel: false }))
          })}
        />
      ) : null}
    </View>
  )
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.arenaPage },
    topbar: { minHeight: 60, paddingHorizontal: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: theme.arenaPage },
    backButton: { width: 44, height: 44, borderRadius: Radius.lg, borderWidth: 1, borderColor: theme.line, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bgElevated },
    hostControlsButton: { width: 44, height: 44, marginLeft: 'auto', borderRadius: Radius.lg, borderWidth: 1, borderColor: theme.line, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bgElevated },
    hostControlsButtonDisabled: { borderColor: theme.mutedSoft, backgroundColor: theme.surface },
  })
}
