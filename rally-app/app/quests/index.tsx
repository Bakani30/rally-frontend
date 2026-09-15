import { useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { router } from 'expo-router'

import { ChallengeEventsBlock } from '@/components/challenges/ChallengeEventsBlock'
import { Screen } from '@/components/layout/Screen'
import { QuestDetailPopup } from '@/components/quests/QuestDetailPopup'
import { QuestEmptyPanel } from '@/components/quests/QuestEmptyPanel'
import { QuestHubHeader } from '@/components/quests/QuestHubHeader'
import { QuestSportTabs } from '@/components/quests/QuestSportTabs'
import { QuestTemplateCard } from '@/components/quests/QuestTemplateCard'
import { onAccent, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useAuth } from '@/hooks/useAuth'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useQuestDoneInputs } from '@/hooks/useQuestDoneInputs'
import { useQuestDailyState } from '@/hooks/useQuestDailyState'
import { useQuestTemplates } from '@/hooks/useQuestTemplates'
import { questErrorMessageTH } from '@/lib/quest-proof/questProofErrors'
import { groupBySport } from '@/lib/quest-proof/questSportGrouping'
import { countDone, isQuestDone } from '@/lib/quest-proof/questDoneState'
import type { QuestActivity } from '@/lib/daily-quests/questTypes'
import type { QuestTemplateView } from '@/lib/quest-proof/questProofTypes'

function navigateBackOrHome() {
  if (router.canGoBack()) {
    router.back()
    return
  }
  router.replace('/(tabs)')
}

export default function QuestHubScreen() {
  const { user } = useAuth()
  const theme = useSportTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const { data, isPending, isError, error, refetch } = useQuestTemplates()
  const daily = useQuestDailyState(user?.id)
  const { inputs } = useQuestDoneInputs(user?.id)
  const { track } = useAnalytics()

  const sections = useMemo(() => groupBySport(data ?? []), [data])
  const [activeSport, setActiveSport] = useState<QuestActivity>(
    sections[0]?.activity ?? 'running',
  )
  const [popupView, setPopupView] = useState<QuestTemplateView | null>(null)

  // When templates first load, default to first available sport
  useEffect(() => {
    if (sections.length > 0 && !sections.find((s) => s.activity === activeSport)) {
      setActiveSport(sections[0].activity)
    }
  }, [sections, activeSport])

  const activeSection = sections.find((s) => s.activity === activeSport)

  const total = data?.length ?? 0
  const doneCount = useMemo(() => countDone(data ?? [], inputs), [data, inputs])
  // earnedToday: sum rewardPoints of done quests — stand-in (no direct earnedToday hook).
  const earnedToday = useMemo(
    () =>
      (data ?? [])
        .filter((v) => isQuestDone(v, inputs))
        .reduce((sum, v) => sum + v.rewardPoints, 0),
    [data, inputs],
  )

  // Fire once when templates load successfully.
  const hubViewedFiredRef = useRef(false)
  useEffect(() => {
    if (!data || hubViewedFiredRef.current) return
    hubViewedFiredRef.current = true
    track({ name: 'quest_proof_hub_viewed', properties: { quest_count: data.length } })
  }, [data, track])

  if (isPending) {
    return (
      <Screen
        edges={['top', 'bottom']}
        bottomPad={40}
        backgroundColor={theme.bg}
        contentContainerStyle={styles.container}
      >
        <QuestHubHeader total={0} doneCount={0} earnedToday={0} onBack={navigateBackOrHome} />
        <ChallengeEventsBlock currentUserId={user?.id} />
        <View style={styles.board}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.skeleton} />
          ))}
        </View>
      </Screen>
    )
  }

  if (isError) {
    return (
      <Screen
        edges={['top', 'bottom']}
        bottomPad={40}
        backgroundColor={theme.bg}
        contentContainerStyle={styles.container}
      >
        <QuestHubHeader total={0} doneCount={0} earnedToday={0} onBack={navigateBackOrHome} />
        <ChallengeEventsBlock currentUserId={user?.id} />
        <View style={styles.board}>
          <View style={styles.errorPanel}>
            <Text style={styles.errorText}>{questErrorMessageTH(error)}</Text>
            <Pressable style={styles.retryBtn} onPress={() => refetch()}>
              <Text style={styles.retryText}>ลองใหม่</Text>
            </Pressable>
          </View>
        </View>
      </Screen>
    )
  }

  return (
    <Screen
      edges={['top', 'bottom']}
      bottomPad={40}
      backgroundColor={theme.bg}
      contentContainerStyle={styles.container}
    >
      <QuestHubHeader
        total={total}
        doneCount={doneCount}
        earnedToday={earnedToday}
        onBack={navigateBackOrHome}
      />
      {daily.isError && (
        <Pressable style={styles.dailyErrorStrip} onPress={() => daily.refetch()}>
          <Text style={styles.dailyErrorText}>โหลดสถานะรายวันไม่ได้ — แตะเพื่อลองใหม่</Text>
        </Pressable>
      )}
      <ChallengeEventsBlock currentUserId={user?.id} />
      {sections.length > 1 && (
        <QuestSportTabs
          sections={sections}
          active={activeSport}
          onChange={setActiveSport}
        />
      )}
      <View style={styles.board}>
        {sections.length === 0 ? (
          <QuestEmptyPanel filter="all" />
        ) : activeSection == null ? (
          <QuestEmptyPanel filter="all" />
        ) : (
          <View style={styles.sections}>
            <Animated.View entering={FadeInDown.delay(0)}>
              <View style={styles.list}>
                {activeSection.views.map((view) => {
                  const state = daily.data?.[view.templateId]
                  return (
                    <QuestTemplateCard
                      key={view.templateId}
                      view={view}
                      doneToday={isQuestDone(view, inputs)}
                      dailyStatus={state?.status ?? 'none'}
                      onPress={() => setPopupView(data?.find((v) => v.templateId === view.templateId) ?? null)}
                    />
                  )
                })}
              </View>
            </Animated.View>
          </View>
        )}
      </View>
      <QuestDetailPopup view={popupView} onClose={() => setPopupView(null)} />
    </Screen>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    container: { paddingHorizontal: 16, gap: 14 },
    board: {
      borderRadius: Radius.xxl,
      borderWidth: 3,
      borderColor: theme.arcadeCabinetEdge,
      backgroundColor: theme.arcadePanelAlt,
      padding: 12,
      gap: 14,
      shadowColor: theme.arcadeShadow,
      shadowOpacity: 0.16,
      shadowRadius: 0,
      shadowOffset: { width: 4, height: 6 },
    },
    sections: { gap: 18 },
    list: { gap: Spacing.md },
    skeleton: {
      height: 84,
      borderRadius: Radius.xl,
      backgroundColor: theme.surfaceStrong,
    },
    errorPanel: {
      minHeight: 104,
      borderRadius: Radius.xl,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: theme.line,
      padding: Spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.md,
    },
    errorText: { color: theme.ink, fontSize: 14, fontWeight: '700', textAlign: 'center' },
    retryBtn: {
      borderRadius: Radius.pill,
      backgroundColor: theme.orange,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
    },
    retryText: { color: onAccent(theme.orange), fontSize: 13, fontWeight: '900' },
    dailyErrorStrip: {
      borderRadius: Radius.xl,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: theme.line,
      backgroundColor: theme.arcadePanelAlt,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      alignItems: 'center',
    },
    dailyErrorText: { color: theme.inkSoft, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  })
}
