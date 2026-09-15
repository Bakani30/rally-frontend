import { useRef } from 'react'
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { PressableScale } from '@/components/motion/PressableScale'
import { remainingDailyMissionKm } from '@/lib/daily-mission/dailyMissionProgress'
import { DAILY_MISSION_DISTANCE_METERS } from '@/lib/daily-mission/dailyMissionTypes'
import { onAccent, Radius, type SportPalette } from '@/constants/theme'
import { useSportTheme, useThemeMode } from '@/hooks/useAppTheme'
import { useI18n } from '@/hooks/useI18n'
import { homeDictionary } from '@/lib/i18n/dictionaries/home'
import type { QuestDailyState } from '@/lib/quest-proof/questDailyState'
import type { QuestTemplateView } from '@/lib/quest-proof/questProofTypes'

type HomeDailyQuestsProps = {
  views: QuestTemplateView[]
  onSelectQuest: (view: QuestTemplateView) => void
  onOpenQuests: () => void
  loading?: boolean
  dailyWalkSyncing?: boolean
  /** Storybook presentation state until the health-sync failure contract is wired. */
  dailyWalkSyncFailed?: boolean
  dailyWalkDistanceMeters?: number
  dailyWalkSteps?: number
  dailyState?: Record<string, QuestDailyState>
}

const FEATURED_MISSION_OFFSET = 159
const MISSION_SNAP_INTERVAL = 239

/** Horizontal mission cards follow the New Home weekly-mission strip. */
export function HomeDailyQuests({
  views,
  onSelectQuest,
  onOpenQuests,
  loading,
  dailyWalkSyncing,
  dailyWalkSyncFailed,
  dailyWalkDistanceMeters,
  dailyWalkSteps,
  dailyState,
}: HomeDailyQuestsProps) {
  const theme = useSportTheme()
  const isDark = useThemeMode() === 'dark'
  const styles = createStyles(theme)
  const { t } = useI18n(homeDictionary)
  const empty = !loading && views.length === 0
  // The Figma rail opens with the featured mission centered and partial
  // neighboring cards visible on both edges. Repeat the boundary cards so the
  // user can continue swiping in either direction; the rail then returns to
  // its corresponding real card without creating a new mission.
  const carouselViews = views.length > 1 ? [views[views.length - 1], ...views, views[0]] : views
  const showSiblingPeek = views.length > 1
  const missionSnapOffsets = carouselViews.map((_, index) => Math.max(0, FEATURED_MISSION_OFFSET + (index - 1) * MISSION_SNAP_INTERVAL))
  const railRef = useRef<ScrollView>(null)
  const hasPositionedFeaturedMission = useRef(false)

  const positionFeaturedMission = () => {
    if (!showSiblingPeek || hasPositionedFeaturedMission.current) return
    railRef.current?.scrollTo({ x: FEATURED_MISSION_OFFSET, y: 0, animated: false })
    hasPositionedFeaturedMission.current = true
  }

  const handleMissionMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!showSiblingPeek) return

    const offsetX = event.nativeEvent.contentOffset.x
    const lastActualOffset = FEATURED_MISSION_OFFSET + (views.length - 1) * MISSION_SNAP_INTERVAL
    const trailingDuplicateOffset = FEATURED_MISSION_OFFSET + views.length * MISSION_SNAP_INTERVAL

    if (offsetX < FEATURED_MISSION_OFFSET) {
      railRef.current?.scrollTo({ x: lastActualOffset, y: 0, animated: false })
      return
    }
    if (offsetX >= trailingDuplicateOffset - 1) {
      railRef.current?.scrollTo({ x: FEATURED_MISSION_OFFSET, y: 0, animated: false })
    }
  }

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>Weekly Missions</Text>
        <PressableScale style={styles.seeAllButton} onPress={onOpenQuests} accessibilityRole="button" accessibilityLabel={t('openAllQuests')}>
          <Text style={styles.seeAllText}>{t('seeAll')}</Text>
        </PressableScale>
      </View>

      {loading && views.length === 0 ? (
        <View style={styles.statusCard}><ActivityIndicator color={theme.orange} /></View>
      ) : empty ? (
        <View style={styles.statusCard}><Text style={styles.emptyText}>{t('questsEmpty')}</Text></View>
      ) : (
        <ScrollView
          ref={railRef}
          style={styles.rail}
          horizontal
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          snapToOffsets={missionSnapOffsets}
          contentOffset={showSiblingPeek ? { x: FEATURED_MISSION_OFFSET, y: 0 } : undefined}
          contentContainerStyle={styles.track}
          onContentSizeChange={positionFeaturedMission}
          onMomentumScrollEnd={handleMissionMomentumEnd}
        >
          {carouselViews.map((view, index) => (
            <MissionCard
              key={`${view.templateId}:${index}`}
              view={view}
              onPress={() => onSelectQuest(view)}
              dailyWalkSyncing={dailyWalkSyncing}
              dailyWalkSyncFailed={dailyWalkSyncFailed}
              dailyWalkDistanceMeters={dailyWalkDistanceMeters}
              dailyWalkSteps={dailyWalkSteps}
              dailyState={dailyState}
              isDark={isDark}
            />
          ))}
        </ScrollView>
      )}
    </View>
  )
}

function MissionCard({
  view,
  onPress,
  dailyWalkSyncing = false,
  dailyWalkSyncFailed = false,
  dailyWalkDistanceMeters,
  dailyWalkSteps,
  dailyState,
  isDark,
}: {
  view: QuestTemplateView
  onPress: () => void
  dailyWalkSyncing?: boolean
  dailyWalkSyncFailed?: boolean
  dailyWalkDistanceMeters?: number
  dailyWalkSteps?: number
  dailyState?: Record<string, QuestDailyState>
  isDark: boolean
}) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { t } = useI18n(homeDictionary)
  const isRunningHealthCard = view.verifier === 'sensor_sync' && view.activity === 'running'
  const state = dailyState?.[view.templateId]
  const remainingKm = remainingDailyMissionKm(dailyWalkDistanceMeters ?? 0)
  const complete = isRunningHealthCard ? remainingKm <= 0 : Boolean(state?.doneToday)
  const progress = isRunningHealthCard ? Math.min((dailyWalkDistanceMeters ?? 0) / DAILY_MISSION_DISTANCE_METERS, 1) : complete ? 1 : 0
  const missionStatus = presentMissionStatus({
    isRunningHealthCard,
    syncing: dailyWalkSyncing,
    syncFailed: dailyWalkSyncFailed,
    complete,
    remainingKm,
    state,
    evidenceTH: view.evidenceTH,
    t,
  })
  const progressPercent = Math.round(progress * 100)
  const accessibilityLabel = `${view.titleTH}, ${missionStatus.label}, ${missionStatus.detail}, ${progressPercent}%`

  return (
    <PressableScale style={styles.mission} onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
      <Image source={isDark ? missionCardDark : missionCardLight} style={styles.missionArtwork} resizeMode="cover" />
      <View style={[styles.iconWrap, { backgroundColor: view.accentColor }]}>
        {isRunningHealthCard && dailyWalkSyncing ? <ActivityIndicator color={onAccent(view.accentColor)} /> : <MaterialCommunityIcons name={view.icon as keyof typeof MaterialCommunityIcons.glyphMap} size={22} color={onAccent(view.accentColor)} />}
      </View>
      <Text style={styles.missionTitle} numberOfLines={2}>{view.titleTH}</Text>
      <View style={[styles.statusChip, statusChipStyle(styles, missionStatus.tone)]}>
        <Text style={[styles.statusText, statusTextStyle(styles, missionStatus.tone)]} numberOfLines={1}>{missionStatus.label}</Text>
      </View>
      {isRunningHealthCard && !dailyWalkSyncing && <Text style={styles.steps}>{(dailyWalkSteps ?? 0).toLocaleString()} {t('stepsUnit')}</Text>}
      <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: view.accentColor }]} /></View>
    </PressableScale>
  )
}

function presentMissionStatus({
  isRunningHealthCard,
  syncing,
  syncFailed,
  complete,
  remainingKm,
  state,
  evidenceTH,
  t,
}: {
  isRunningHealthCard: boolean
  syncing: boolean
  syncFailed: boolean
  complete: boolean
  remainingKm: number
  state: QuestDailyState | undefined
  evidenceTH: string
  t: (key: 'questSyncing' | 'questDistanceComplete' | 'questDistanceRemaining' | 'questDoneToday', values?: { km: string }) => string
}) {
  if (isRunningHealthCard) {
    if (syncFailed) return { label: 'ซิงก์ไม่สำเร็จ', detail: 'ลองซิงก์อีกครั้ง', tone: 'risk' as const }
    if (syncing) return { label: 'กำลังซิงก์', detail: t('questSyncing'), tone: 'pending' as const }
    if (complete) return { label: 'สำเร็จแล้ววันนี้', detail: t('questDistanceComplete'), tone: 'success' as const }
    return { label: 'กำลังทำ', detail: t('questDistanceRemaining', { km: remainingKm.toFixed(1) }), tone: 'active' as const }
  }

  if (complete) return { label: 'สำเร็จแล้ววันนี้', detail: t('questDoneToday'), tone: 'success' as const }
  if (state?.status === 'needs_review' || state?.status === 'analyzing') return { label: 'รอตรวจสอบ', detail: evidenceTH, tone: 'pending' as const }
  if (state?.status === 'failed') return { label: 'ส่งใหม่ได้', detail: evidenceTH, tone: 'risk' as const }
  if (state?.status === 'live_session') return { label: 'กำลังทำ', detail: evidenceTH, tone: 'active' as const }
  return { label: 'พร้อมเริ่ม', detail: evidenceTH, tone: 'ready' as const }
}

type MissionStatusTone = 'ready' | 'active' | 'pending' | 'success' | 'risk'

function statusChipStyle(styles: ReturnType<typeof createStyles>, tone: MissionStatusTone) {
  return tone === 'ready' ? styles.statusChipReady
    : tone === 'pending' ? styles.statusChipPending
      : tone === 'success' ? styles.statusChipSuccess
        : tone === 'risk' ? styles.statusChipRisk
          : styles.statusChipActive
}

function statusTextStyle(styles: ReturnType<typeof createStyles>, tone: MissionStatusTone) {
  return tone === 'ready' ? styles.statusTextReady
    : tone === 'pending' ? styles.statusTextPending
      : tone === 'success' ? styles.statusTextSuccess
        : tone === 'risk' ? styles.statusTextRisk
          : styles.statusTextActive
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    section: { gap: 7 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
    title: { color: theme.ink, fontSize: 20, lineHeight: 25, fontWeight: '900', letterSpacing: -0.2 },
    seeAllButton: { minHeight: 30, paddingHorizontal: 8, justifyContent: 'center' },
    seeAllText: { color: theme.ink, fontSize: 12, lineHeight: 15, fontWeight: '900' },
    rail: { marginHorizontal: -20 },
    track: { gap: 19, paddingBottom: 4 },
    statusCard: { minHeight: 120, borderRadius: Radius.xl, backgroundColor: theme.arcadePanel, alignItems: 'center', justifyContent: 'center' },
    emptyText: { color: theme.muted, fontSize: 12, fontWeight: '800' },
    mission: { width: 220, height: 200, borderRadius: Radius.xl, backgroundColor: theme.arcadePanel, overflow: 'hidden', borderWidth: 1, borderColor: theme.line },
    missionArtwork: { position: 'absolute', top: 0, left: 0, right: 0, height: 100, width: 220 },
    iconWrap: { position: 'absolute', left: 16, top: 108, width: 40, height: 40, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
    missionTitle: { position: 'absolute', left: 66, right: 16, top: 114, color: theme.ink, fontSize: 15, lineHeight: 17, fontWeight: '900' },
    statusChip: { position: 'absolute', left: 20, top: 160, maxWidth: 142, minHeight: 20, borderRadius: Radius.pill, justifyContent: 'center', paddingHorizontal: 8 },
    statusChipReady: { backgroundColor: theme.orangeSoft },
    statusChipActive: { backgroundColor: theme.surfaceStrong },
    statusChipPending: { backgroundColor: theme.amberSoft },
    statusChipSuccess: { backgroundColor: theme.greenSoft },
    statusChipRisk: { backgroundColor: theme.redSoft },
    statusText: { color: theme.ink, fontSize: 10, lineHeight: 13, fontWeight: '900' },
    statusTextReady: { color: theme.orange },
    statusTextActive: { color: theme.ink },
    statusTextPending: { color: theme.amber },
    statusTextSuccess: { color: theme.green },
    statusTextRisk: { color: theme.red },
    steps: { position: 'absolute', right: 20, top: 163, color: theme.inkSoft, fontSize: 12, lineHeight: 15, fontWeight: '700' },
    progressTrack: { position: 'absolute', left: 20, right: 20, bottom: 11, height: 6, borderRadius: Radius.pill, overflow: 'hidden', backgroundColor: theme.lineStrong },
    progressFill: { height: 6, borderRadius: Radius.pill },
  })
}

const missionCardLight = require('../../assets/images/home/figma-mission-card-light.png')
const missionCardDark = require('../../assets/images/home/figma-mission-card-dark.png')
