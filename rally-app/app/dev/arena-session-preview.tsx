import { useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { router, Stack, useLocalSearchParams } from 'expo-router'

import { ArenaSessionBoard } from '@/components/arena-session/ArenaSessionBoard'
import { PressableScale } from '@/components/motion/PressableScale'
import { useScreenInsets } from '@/components/layout/useScreenInsets'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import {
  ARENA_LIFECYCLE_STATES,
  canUseArenaLifecyclePreview,
  getArenaLifecycleFixture,
  transitionArenaLifecyclePreview,
  nextArenaLifecycleState,
  parseArenaLifecycleState,
  type ArenaLifecyclePreviewAction,
  type ArenaLifecyclePreviewState,
  type ArenaLifecycleState,
} from '@/lib/dev-preview/arenaLifecyclePreview'
import { getArenaSessionMatchPreviewRoute } from '@/lib/dev-preview/arenaSessionMatchPreviewRoute'
import { useSportTheme } from '@/hooks/useAppTheme'

declare const __DEV__: boolean

const PREVIEW_ARENA_ACTOR_ID = 'preview-arena-actor'

export default function ArenaSessionPreviewScreen() {
  const params = useLocalSearchParams<{ state?: string | string[] }>()
  const devEnabled = canUseArenaLifecyclePreview(__DEV__)
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { paddingTop } = useScreenInsets({ edges: ['top'], topPad: Spacing.sm })
  const [preview, setPreview] = useState<ArenaLifecyclePreviewState>(() => ({
    state: parseArenaLifecycleState(params.state),
    actionLog: [],
  }))
  const fixture = useMemo(() => getArenaLifecycleFixture(preview.state), [preview.state])

  useEffect(() => {
    if (!devEnabled) router.replace('/(tabs)' as never)
  }, [devEnabled])

  if (!devEnabled) return null

  function selectState(nextState: ArenaLifecycleState) {
    setPreview({ state: nextState, actionLog: [] })
  }

  function perform(action: ArenaLifecyclePreviewAction) {
    setPreview((current) => transitionArenaLifecyclePreview(current, action))
  }

  function recordLocalAction(action: string) {
    setPreview((current) => ({
      ...current,
      actionLog: [...current.actionLog, `Local preview action: ${action}`],
    }))
  }

  function goToMatch(activeMatchId: string) {
    const href = getArenaSessionMatchPreviewRoute(activeMatchId)
    if (href) router.push(href as never)
  }

  return (
    <View style={[styles.root, { paddingTop }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>DEV PREVIEW</Text>
          <Text style={styles.title}>Arena Session lifecycle</Text>
          <Text style={styles.detail}>{fixture.detail}</Text>
        </View>
        <View style={styles.marker} accessibilityLabel="Development preview only">
          <Text style={styles.markerText}>DEV</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.switcher}
        accessibilityLabel="Arena lifecycle state switcher"
      >
        {ARENA_LIFECYCLE_STATES.map((candidate) => {
          const selected = candidate === preview.state
          return (
            <PressableScale
              key={candidate}
              style={[styles.stateButton, selected && styles.stateButtonSelected]}
              onPress={() => selectState(candidate)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Show ${candidate.replaceAll('_', ' ')}`}
            >
              <Text style={[styles.stateButtonText, selected && styles.stateButtonTextSelected]}>
                {candidate.replaceAll('_', ' ').toUpperCase()}
              </Text>
            </PressableScale>
          )
        })}
      </ScrollView>

      <View style={styles.currentStateRow}>
        <Text style={styles.currentState}>{fixture.label}</Text>
        <PressableScale
          style={styles.nextButton}
          onPress={() => selectState(nextArenaLifecycleState(preview.state))}
          accessibilityRole="button"
          accessibilityLabel="Show next arena lifecycle state"
        >
          <Text style={styles.nextButtonText}>NEXT STATE</Text>
        </PressableScale>
      </View>

      {preview.actionLog.at(-1) ? <Text style={styles.actionIndicator}>{preview.actionLog.at(-1)}</Text> : null}

      <ArenaSessionBoard
        snapshot={fixture.snapshot}
        actorUserId={PREVIEW_ARENA_ACTOR_ID}
        roundControlsFresh
        onRetry={() => recordLocalAction('retry')}
        onRecordPresence={() => recordLocalAction('record_presence')}
        onReady={() => recordLocalAction('ready')}
        onStageParty={() => recordLocalAction('stage_party')}
        onUpdateStakeProposal={() => perform('update_stake_proposal')}
        onConfirmFinalStake={() => perform('confirm_final_stake')}
        onStartRound={() => perform('start_round')}
        onChooseTeamParticipation={(input) => perform(input.decision)}
        onLeave={() => recordLocalAction('leave')}
        onGoToArenaList={() => recordLocalAction('go_to_arena_list')}
        onGoToMatch={goToMatch}
      />
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.arenaPage },
    header: {
      paddingHorizontal: 16,
      paddingBottom: 10,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    headerCopy: { flex: 1, gap: 3 },
    eyebrow: { color: theme.orange, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
    title: { color: theme.ink, fontSize: 20, fontWeight: '900' },
    detail: { color: theme.muted, fontSize: 12, lineHeight: 18, fontWeight: '700' },
    marker: {
      minWidth: 54,
      minHeight: 44,
      borderRadius: Radius.pill,
      backgroundColor: theme.orange,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 10,
    },
    markerText: { color: theme.fightInk, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
    switcher: { paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
    stateButton: {
      minHeight: 44,
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.bgElevated,
      justifyContent: 'center',
      paddingHorizontal: 13,
    },
    stateButtonSelected: { backgroundColor: theme.ink, borderColor: theme.ink },
    stateButtonText: { color: theme.ink, fontSize: 11, fontWeight: '900' },
    stateButtonTextSelected: { color: theme.bgElevated },
    currentStateRow: {
      minHeight: 44,
      paddingHorizontal: 16,
      paddingBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    currentState: { flex: 1, color: theme.ink, fontSize: 13, fontWeight: '900' },
    nextButton: {
      minHeight: 44,
      borderRadius: Radius.md,
      backgroundColor: theme.orange,
      justifyContent: 'center',
      paddingHorizontal: 12,
    },
    nextButtonText: { color: theme.fightInk, fontSize: 11, fontWeight: '900' },
    actionIndicator: {
      marginHorizontal: 16,
      marginBottom: 10,
      borderRadius: Radius.md,
      backgroundColor: theme.trustSoft,
      color: theme.trust,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 11,
      fontWeight: '800',
    },
  })
}
