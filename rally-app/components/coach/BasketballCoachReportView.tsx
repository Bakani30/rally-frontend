import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Svg, { Path, Circle, Defs, G, LinearGradient, Polygon, Stop, Line, Text as SvgText } from 'react-native-svg'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Sport, Spacing } from '@/constants/theme'
import { useAutoBasketballCoachSensorSync } from '@/hooks/useAutoBasketballCoachSensorSync'
import { useCoachActivityInsights } from '@/hooks/useCoachActivityInsights'
import {
  buildCoachReportStages,
  buildCoachReportProfileSummary,
  buildCoachReportSummaryTakeaways,
  formatStageProgress,
  getCoachReportSetupPrompt,
  getCoachReportDetailBlocks,
  type CoachReportStage,
  type CoachReportTopicStage,
  type CoachReportSummaryStage,
  type CoachReportFinalStage,
  type CoachReportFinalBoardItem,
  type CoachReportFinalBoardSection,
  type CoachReportProfileHexAxis,
  type CoachReportSummaryTakeaway,
} from '@/lib/coach/coachReportPresentation'
import {
  getCoachContextInitial,
  type CoachInputSignalState,
} from '@/lib/coach/coachInputPresentation'
import type {
  GetCoachActivityInsightsResult,
  CoachInsightCard,
  CoachStatBaseline,
  CoachInsightScore,
  BasketballStatLine,
  CoachBenchmarkFormat,
} from '@/lib/coach/coachTypes'
import { useLanguageStore } from '@/stores/languageStore'
import { CoachAnalysisEntryModal } from './CoachAnalysisEntryModal'
import { BasketballCoachContextCard } from './BasketballCoachContextCard'
import { BasketballCoachSensorSyncCard } from './BasketballCoachSensorSyncCard'
import { BasketballFinalDataBoard } from './BasketballFinalDataBoard'

type BasketballCoachReportViewProps = {
  activitySessionId: string
  startedAt: string
  endedAt: string | null
  durationSeconds?: number | null
  ownTeamScore?: number | null
  benchmarkFormat?: CoachBenchmarkFormat | null
  isWin?: boolean | null
  initialFocus?: string | null
}

export function BasketballCoachReportView({
  activitySessionId,
  startedAt,
  endedAt,
  durationSeconds = null,
  ownTeamScore = null,
  benchmarkFormat = null,
  isWin = null,
  initialFocus = null,
}: BasketballCoachReportViewProps) {
  const language = useLanguageStore((state) => state.language)
  const { data, isPending, error } = useCoachActivityInsights(activitySessionId)
  const [stageIndex, setStageIndex] = useState(0)
  const [showIndexSheet, setShowIndexSheet] = useState(false)
  const [optimisticContext, setOptimisticContext] = useState<CoachInputSignalState | null>(null)
  const [focusConsumed, setFocusConsumed] = useState(false)
  const [setupDismissed, setSetupDismissed] = useState(false)
  const [activeOptionalStage, setActiveOptionalStage] = useState<CoachReportTopicStage | null>(null)
  const contextInitial = useMemo(() => getCoachContextInitial(data?.currentContext), [data?.currentContext])
  const insets = useSafeAreaInsets()

  useEffect(() => {
    if (contextInitial) setOptimisticContext(contextInitial)
  }, [contextInitial])

  useAutoBasketballCoachSensorSync({
    activitySessionId,
    startedAt,
    endedAt,
    sensorState: data?.sensorState.status,
    enabled: Boolean(data),
  })

  if (isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Sport.amber} />
        <Text style={styles.muted}>{language === 'th' ? 'กำลังเตรียมรายงาน' : 'Preparing report'}</Text>
      </View>
    )
  }

  if (error || !data) {
    return (
      <View style={styles.center}>
        <MaterialCommunityIcons name="chart-bar" size={38} color={Sport.muted} />
        <Text style={styles.muted}>{language === 'th' ? 'เปิด Coach Report ไม่ได้' : 'Coach Report unavailable.'}</Text>
      </View>
    )
  }

  const effectiveData: GetCoachActivityInsightsResult = {
    ...data,
    currentContext: optimisticContext ?? data.currentContext,
  }

  const stages = buildCoachReportStages(effectiveData, language, { benchmarkFormat, ownTeamScore })
  const setupPrompt = getCoachReportSetupPrompt(effectiveData, language)
  const focusedStageIndex =
    !focusConsumed && stageIndex === 0 && initialFocus ? getInitialFocusStageIndex(stages, initialFocus) : -1
  const activeStageIndex = focusedStageIndex > 0 ? focusedStageIndex : stageIndex
  const currentStage = stages[activeStageIndex]
  const inputGateStage = activeOptionalStage
  const isFirst = activeStageIndex === 0
  const isLast = activeStageIndex === stages.length - 1
  const nextLabel = getBottomNextLabel({
    activeStageIndex,
    currentStage,
    stages,
    language,
  })

  function handleNext() {
    if (isLast) return
    setFocusConsumed(true)
    setStageIndex(activeStageIndex + 1)
  }
  function handlePrev() {
    if (isFirst) return
    setFocusConsumed(true)
    setStageIndex(activeStageIndex - 1)
  }

  function handleOptionalItemPress(item: CoachReportFinalBoardItem) {
    if (item.gate === 'none') return
    setActiveOptionalStage({
      kind: 'topic',
      id: item.id,
      topic: item.topic,
      requiredInputs: item.requiredInputs,
    })
  }

  function handleContextSaved(input?: CoachInputSignalState) {
    if (input) setOptimisticContext(input)
    setSetupDismissed(true)
    if (activeOptionalStage) {
      setActiveOptionalStage(null)
    }
  }

  function handleContextSaveFailed() {
    setOptimisticContext(contextInitial ?? null)
  }

  return (
    <View style={styles.root}>
      {currentStage.kind === 'topic' && (
        <CoachReportProgressBar
          currentIndex={activeStageIndex}
          total={stages.length}
          language={language}
        />
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          currentStage.kind !== 'final' && {
            paddingBottom: 104 + Math.max(insets.bottom, 12),
          },
        ]}
      >
        {currentStage.kind === 'summary' && (
          <CoachReportSummaryView
            stage={currentStage}
            data={effectiveData}
            ownTeamScore={ownTeamScore}
            benchmarkFormat={benchmarkFormat}
            isWin={isWin}
          />
        )}
        {currentStage.kind === 'topic' && (
          <CoachReportTopicView
            stage={currentStage}
            data={effectiveData}
            activitySessionId={activitySessionId}
            startedAt={startedAt}
            endedAt={endedAt}
            onRequestInput={() => setActiveOptionalStage(currentStage)}
          />
        )}
        {currentStage.kind === 'final' && (
          <CoachReportFinalCard
            stage={currentStage}
            data={effectiveData}
            ownTeamScore={ownTeamScore}
            benchmarkFormat={benchmarkFormat}
            onBack={() => {
              if (router.canGoBack()) router.back()
              else router.replace(`/activity/${activitySessionId}`)
            }}
            onSelectOptionalItem={handleOptionalItemPress}
          />
        )}
      </ScrollView>

      {currentStage.kind !== 'final' ? (
        <View style={[styles.bottomNavBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <PressableScale
            disabled={isFirst}
            style={[styles.bottomNavSecondary, isFirst && styles.bottomNavDisabled]}
            onPress={handlePrev}
            accessibilityRole="button"
            accessibilityLabel={language === 'th' ? 'ย้อนกลับหัวข้อก่อนหน้า' : 'Back to previous report stage'}
            accessibilityState={{ disabled: isFirst }}
          >
            <Text style={styles.bottomNavSecondaryText}>{language === 'th' ? 'ย้อนกลับ' : 'Back'}</Text>
          </PressableScale>

          <PressableScale
            style={styles.bottomNavTopics}
            onPress={() => setShowIndexSheet(true)}
            accessibilityRole="button"
            accessibilityLabel={language === 'th' ? 'ดูหัวข้อทั้งหมด' : 'View all report topics'}
            accessibilityState={{ expanded: showIndexSheet }}
          >
            <MaterialCommunityIcons name="format-list-bulleted" size={12} color={Sport.muted} />
            <Text style={styles.indexTriggerText}>{language === 'th' ? 'หัวข้อ' : 'Topics'}</Text>
          </PressableScale>

          <PressableScale
            style={styles.bottomNavPrimary}
            onPress={handleNext}
            accessibilityRole="button"
            accessibilityLabel={nextLabel}
            accessibilityState={{ disabled: isLast }}
          >
            <Text style={styles.primaryBtnText}>{nextLabel}</Text>
            <MaterialCommunityIcons name="arrow-right" size={13} color={Sport.bg} />
          </PressableScale>
        </View>
      ) : null}

      <CoachReportTopicIndexSheet
        visible={showIndexSheet}
        stages={stages}
        currentIndex={activeStageIndex}
        onSelect={(idx) => {
          setFocusConsumed(true)
          setStageIndex(idx)
          setShowIndexSheet(false)
        }}
        onClose={() => setShowIndexSheet(false)}
      />

      <CoachAnalysisEntryModal
        visible={setupPrompt.required && !setupDismissed}
        activitySessionId={activitySessionId}
        startedAt={startedAt}
        endedAt={endedAt}
        durationSeconds={durationSeconds}
        ownTeamScore={ownTeamScore}
        benchmarkFormat={benchmarkFormat}
        onSaveStarted={(input) => setOptimisticContext(input)}
        onSaveFailed={handleContextSaveFailed}
        onDismiss={() => setSetupDismissed(true)}
        onComplete={(_, input) => handleContextSaved(input)}
      />

      <CoachReportInputGateModal
        visible={!setupPrompt.required || setupDismissed}
        stage={inputGateStage}
        data={effectiveData}
        activitySessionId={activitySessionId}
        startedAt={startedAt}
        endedAt={endedAt}
        ownTeamScore={ownTeamScore}
        benchmarkFormat={benchmarkFormat}
        onSaveStarted={(input) => setOptimisticContext(input)}
        onSaveFailed={handleContextSaveFailed}
        onSaved={handleContextSaved}
        onSkip={() => {
          setActiveOptionalStage(null)
        }}
      />
    </View>
  )
}

function getBottomNextLabel({
  activeStageIndex,
  currentStage,
  stages,
  language,
}: {
  activeStageIndex: number
  currentStage: CoachReportStage
  stages: CoachReportStage[]
  language: string
}): string {
  const nextStage = stages[activeStageIndex + 1]
  if (currentStage.kind === 'summary') {
    if (nextStage?.kind === 'topic') return language === 'th' ? 'ดูหัวข้อหลัก' : 'Read key topic'
    return language === 'th' ? 'ไปหน้าสรุปข้อมูล' : 'Open data board'
  }
  if (nextStage?.kind === 'final') return language === 'th' ? 'ไปหน้าสรุปข้อมูล' : 'Open data board'
  return language === 'th' ? 'ถัดไป' : 'Next'
}

function CoachReportInputGateModal({
  visible,
  stage,
  data,
  activitySessionId,
  startedAt,
  endedAt,
  ownTeamScore,
  benchmarkFormat,
  onSaved,
  onSaveStarted,
  onSaveFailed,
  onSkip,
}: {
  visible: boolean
  stage: CoachReportTopicStage | null
  data: GetCoachActivityInsightsResult
  activitySessionId: string
  startedAt: string
  endedAt: string | null
  ownTeamScore: number | null
  benchmarkFormat: CoachBenchmarkFormat | null
  onSaved: (input?: CoachInputSignalState) => void
  onSaveStarted: (input: CoachInputSignalState) => void
  onSaveFailed: (input: CoachInputSignalState, error: unknown) => void
  onSkip: () => void
}) {
  const language = useLanguageStore((state) => state.language)
  const show = visible && stage != null
  const isSensor = stage?.requiredInputs.kind === 'sensor'
  const isProLocked = stage?.topic.gate === 'pro_locked'
  return (
    <Modal visible={show} transparent animationType="fade" onRequestClose={onSkip}>
      <KeyboardAvoidingView
        style={styles.modalKeyboardAvoider}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalBackdropCenter}>
          <View style={styles.inputGateSheet}>
            <ScrollView
              bounces={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.inputGateContent}
            >
              <View style={styles.popupHeaderRow}>
                <View style={styles.popupIcon}>
                  <MaterialCommunityIcons name={isProLocked ? 'lock' : isSensor ? 'clock' : 'pencil'} size={14} color={Sport.bg} />
                </View>
                <View style={styles.popupHeaderCopy}>
                  <Text style={styles.eyebrow}>{language === 'th' ? 'ต้องมีข้อมูลก่อน' : 'INPUT NEEDED'}</Text>
                  <Text style={styles.popupTitle}>
                    {stage?.topic.gateLabel ?? (language === 'th' ? 'กรอกก่อนอ่านการ์ดนี้' : 'Add this before reading')}
                  </Text>
                </View>
              </View>

              {stage && !isSensor && !isProLocked ? (
                <BasketballCoachContextCard
                  activitySessionId={activitySessionId}
                  surface="embedded"
                  showIntro={false}
                  showInlineSaved={false}
                  submitLabel={language === 'th' ? 'บันทึกแล้วโชว์การ์ด' : 'Save and show card'}
                  ownTeamScore={ownTeamScore}
                  benchmarkFormat={benchmarkFormat}
                  initial={data.currentContext ?? undefined}
                  statKeys={stage.requiredInputs.statKeys}
                  requiredStatKeys={stage.requiredInputs.statKeys}
                  onSaveStarted={onSaveStarted}
                  onSaveFailed={onSaveFailed}
                  onSaved={(_, input) => onSaved(input)}
                />
              ) : null}

              {stage && isProLocked ? (
                <View style={styles.proGateBox}>
                  <MaterialCommunityIcons name="lock" size={22} color={Sport.amber} />
                  <Text style={styles.proGateTitle}>
                    {language === 'th' ? 'การ์ดนี้เป็น Pro read' : 'This is a Pro read'}
                  </Text>
                  <Text style={styles.proGateBody}>
                    {language === 'th'
                      ? 'การ์ดหลังสรุปจะล็อกไว้สำหรับฟีเจอร์ลึก ถ้าอยากอ่านให้เปิด Pro ก่อน'
                      : 'Extra deep cards stay locked for Pro. Unlock Pro to read this topic.'}
                  </Text>
                  <PressableScale
                    style={styles.primaryBtn}
                    onPress={() => router.push('/pro')}
                    accessibilityRole="button"
                    accessibilityLabel={language === 'th' ? 'ดู Pro' : 'View Pro'}
                  >
                    <Text style={styles.primaryBtnText}>{language === 'th' ? 'ดู Pro' : 'View Pro'}</Text>
                  </PressableScale>
                </View>
              ) : null}

              {stage && isSensor ? (
                <View style={styles.sensorGateStack}>
                  <BasketballCoachSensorSyncCard
                    activitySessionId={activitySessionId}
                    startedAt={startedAt}
                    endedAt={endedAt}
                    surface="inline"
                  />
                  <PressableScale
                    style={styles.primaryBtn}
                    onPress={onSkip}
                    accessibilityRole="button"
                    accessibilityLabel={language === 'th' ? 'อ่านต่อ' : 'Continue'}
                  >
                    <Text style={styles.primaryBtnText}>{language === 'th' ? 'อ่านต่อ' : 'Continue'}</Text>
                  </PressableScale>
                </View>
              ) : null}

              <PressableScale
                style={styles.skipTopicButton}
                onPress={onSkip}
                accessibilityRole="button"
                accessibilityLabel={language === 'th' ? 'ข้ามหัวข้อนี้ก่อน' : 'Skip this topic for now'}
              >
                <Text style={styles.skipTopicText}>{language === 'th' ? 'ข้ามหัวข้อนี้ก่อน' : 'Skip this topic for now'}</Text>
              </PressableScale>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

function CoachReportProgressBar({ currentIndex, total, language }: { currentIndex: number; total: number, language: string }) {
  const progressText = formatStageProgress(currentIndex, total - 1)

  return (
    <View style={styles.progressContainer}>
      <Text style={styles.progressText}>STEP {progressText}</Text>
      <View style={styles.progressTrackRow}>
        {Array.from({ length: total - 2 }).map((_, i) => (
          <View key={i} style={[styles.progressSegment, i < currentIndex ? styles.progressSegmentActive : null]} />
        ))}
      </View>
    </View>
  )
}

function getInitialFocusStageIndex(stages: CoachReportStage[], focus: string): number {
  if (focus === 'summary') return 0
  const normalizedFocus = focus.toLowerCase()
  const foundIndex = stages.findIndex((stage) => {
    if (stage.kind !== 'topic') return false
    if (normalizedFocus === 'role') return stage.topic.card.type === 'training_cue'
    if (normalizedFocus === 'watch') return stage.topic.card.source === 'sensor' || stage.topic.card.type === 'effort'
    if (normalizedFocus === 'form') return stage.topic.card.type === 'form'
    return stage.id === normalizedFocus || stage.topic.id === normalizedFocus
  })
  return foundIndex
}

function renderHighlightedText(text: string) {
  const keywords = [
    'ดีขึ้น', 'เพิ่ม', 'ระวัง', 'ลดลง', 'ชนะ', 'แพ้', 'สำเร็จ', 'เป้าหมาย', 'แข็งแกร่ง', 'สถิติ',
    'improved', 'increased', 'caution', 'decreased', 'warning', 'win', 'lose', 'steady', 'excellent', 'goals', 'achieved', 'success', 'target'
  ]
  const regex = new RegExp(`(${keywords.join('|')})`, 'gi')
  const parts = text.split(regex)

  return parts.map((part, index) => {
    const isKeyword = keywords.some(k => k.toLowerCase() === part.toLowerCase())
    return (
      <Text key={index} style={isKeyword ? { color: Sport.amber } : undefined}>
        {part}
      </Text>
    )
  })
}

function CoachReportSummaryView({
  stage, data, ownTeamScore, benchmarkFormat, isWin
}: {
  stage: CoachReportSummaryStage
  data: GetCoachActivityInsightsResult
  ownTeamScore: number | null
  benchmarkFormat: CoachBenchmarkFormat | null
  isWin: boolean | null
}) {
  const language = useLanguageStore((state) => state.language)
  const accentColor = isWin === true ? Sport.green : isWin === false ? Sport.red : Sport.line;
  const currentStats = data.currentContext?.basketballStats ?? {}
  const profile = buildCoachReportProfileSummary({ data, ownTeamScore, benchmarkFormat, isWin, language })
  const summaryTakeaways = buildCoachReportSummaryTakeaways({ data, ownTeamScore, benchmarkFormat, language })
  const compareRows = buildSummaryCompareRows(currentStats, data.statBaseline)
  const hasTrendChart = hasSummaryTrendChart(currentStats, data.statBaseline)
  const hasComparableStats = compareRows.some((row) => row.current != null && row.average != null)

  return (
    <View style={styles.summaryContainer}>
      <View style={[styles.playerSummaryCard, { borderColor: accentColor }]}>
        <View style={styles.playerSummaryTop}>
          <View style={styles.playerSummaryIdentity}>
            <Text style={styles.playerSummaryEyebrow}>{profile.eyebrow}</Text>
            <Text style={styles.playerSummaryTitle} maxFontSizeMultiplier={1.08}>
              {profile.title}
            </Text>
            <Text style={styles.playerSummaryRole}>{profile.roleLabel}</Text>
            <View style={styles.playerSummaryFacts}>
              {profile.facts.map((fact) => (
                <View key={fact.id} style={styles.playerSummaryFactRow}>
                  <Text style={styles.playerSummaryFactLabel}>{fact.label}</Text>
                  <Text style={styles.playerSummaryFactValue} numberOfLines={1}>
                    {fact.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>
          <View style={styles.playerSummaryHero}>
            <Text style={styles.playerSummaryImpact} adjustsFontSizeToFit numberOfLines={1}>
              {profile.impactValue}
            </Text>
            <Text style={styles.playerSummaryImpactUnit}>{profile.impactUnit}</Text>
            <SummaryImpactHexagon axes={profile.hexAxes} />
          </View>
        </View>

        <View style={styles.playerSummaryStatStrip}>
          {profile.stats.map((stat, index) => (
            <View
              key={stat.key}
              style={[
                styles.playerSummaryStatCell,
                index > 0 ? styles.playerSummaryStatCellDivider : null,
              ]}
            >
              <Text style={styles.playerSummaryStatLabel}>{stat.label}</Text>
              <Text style={styles.playerSummaryStatValue} adjustsFontSizeToFit numberOfLines={1}>
                {stat.valueLabel}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.playerSummaryCoachNote}>
          <Text style={styles.playerSummaryCoachLabel}>{language === 'th' ? 'COACH READ' : 'COACH READ'}</Text>
          <Text style={styles.playerSummaryCoachText}>
            {renderHighlightedText(stage.verdict)}
          </Text>
        </View>
      </View>

      {summaryTakeaways.length > 0 ? (
        <View style={styles.takeawayCard}>
          <View style={styles.chartHeader}>
            <MaterialCommunityIcons name="clipboard-list-outline" size={12} color={Sport.amber} />
            <Text style={styles.chartTitle}>{language === 'th' ? 'สิ่งที่ตัวเลขบอก' : 'WHAT THE NUMBERS SAY'}</Text>
          </View>
          {summaryTakeaways.map((takeaway) => (
            <SummaryTakeawayRow key={takeaway.id} takeaway={takeaway} />
          ))}
        </View>
      ) : null}

      {/* SCORING TREND Line Chart */}
      {hasTrendChart ? (
        <View style={styles.trendChartCard}>
          <View style={styles.chartHeader}>
            <MaterialCommunityIcons name="chart-line" size={12} color={Sport.amber} />
            <Text style={styles.chartTitle}>{language === 'th' ? 'เทียบกับค่าเฉลี่ย' : 'STAT BASELINE'}</Text>
            <Text style={styles.chartSubtitle}>{formatBaselineScope(data.statBaseline)}</Text>
          </View>

          <StatBaselineLineChart
            label="PTS"
            previous={data.statBaseline.previousStatline?.points}
            average={data.statBaseline.averages.points}
            current={currentStats.points}
          />
        </View>
      ) : null}

      {hasComparableStats ? (
        <View style={styles.compareCard}>
          <View style={styles.chartHeader}>
            <MaterialCommunityIcons name="progress-check" size={12} color={Sport.amber} />
            <Text style={styles.chartTitle}>{language === 'th' ? 'สถิติแมตช์นี้' : 'MATCH INPUT VS BASELINE'}</Text>
          </View>
          {compareRows.map((row) => (
            <BaselineCompareRow key={row.label} {...row} />
          ))}
        </View>
      ) : null}
    </View>
  )
}

function SummaryImpactHexagon({ axes }: { axes: CoachReportProfileHexAxis[] }) {
  const chartAxes = axes.slice(0, 6)
  const total = chartAxes.length
  const center = 58
  const radius = 36
  const targetRadius = radius * 0.7
  const labelRadius = 50
  const hasLoggedStat = chartAxes.some((axis) => axis.state === 'ready')
  const outerPoints = chartAxes.map((_, index) => summaryHexPointString(index, total, center, radius)).join(' ')
  const targetPoints = chartAxes.map((_, index) => summaryHexPointString(index, total, center, targetRadius)).join(' ')
  const statPoints = chartAxes
    .map((axis, index) => {
      const score = axis.score ?? 0
      const pointRadius = axis.score == null ? 6 : Math.max(radius * (score / 100), 7)
      return summaryHexPointString(index, total, center, pointRadius)
    })
    .join(' ')

  return (
    <View
      style={styles.playerSummaryMarker}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Impact shape on role scale"
    >
      <Text style={styles.playerSummaryMarkerTitle}>Impact shape</Text>
      <Svg width="100%" height={104} viewBox="0 0 116 108">
        <Polygon points={outerPoints} fill="rgba(22,22,22,0.04)" stroke="rgba(22,22,22,0.34)" strokeWidth="1.2" />
        <Polygon points={targetPoints} fill="transparent" stroke="rgba(234,195,26,0.68)" strokeWidth="1.2" strokeDasharray="3,3" />
        {chartAxes.map((axis, index) => {
          const [x, y] = summaryHexPoint(index, total, center, radius)
          const [labelX, labelY] = summaryHexPoint(index, total, center, labelRadius)
          const isMissing = axis.score == null
          return (
            <G key={axis.key}>
              <Line x1={center} y1={center} x2={x} y2={y} stroke="rgba(22,22,22,0.12)" strokeWidth="1" />
              <SvgText
                x={labelX}
                y={labelY + 3}
                fill={isMissing ? 'rgba(22,22,22,0.38)' : Sport.arcadeCabinet}
                fontSize="7.5"
                fontWeight="900"
                textAnchor="middle"
              >
                {axis.label}
              </SvgText>
            </G>
          )
        })}
        {hasLoggedStat ? (
          <Polygon points={statPoints} fill="rgba(234,195,26,0.34)" stroke={Sport.amber} strokeWidth="2.4" />
        ) : null}
        {chartAxes.map((axis, index) => {
          const score = axis.score ?? 0
          const pointRadius = axis.score == null ? 6 : Math.max(radius * (score / 100), 7)
          const [x, y] = summaryHexPoint(index, total, center, pointRadius)
          const isMissing = axis.score == null
          return (
            <Circle
              key={axis.key}
              cx={x}
              cy={y}
              r={isMissing ? 2.5 : 3.6}
              fill={isMissing ? 'transparent' : Sport.amber}
              stroke={isMissing ? 'rgba(22,22,22,0.28)' : Sport.arcadeCabinet}
              strokeWidth="1.4"
            />
          )
        })}
      </Svg>
      <Text style={styles.playerSummaryMarkerScale}>{hasLoggedStat ? 'Role scale' : 'No data'}</Text>
    </View>
  )
}

function summaryHexPointString(index: number, total: number, center: number, radius: number): string {
  const [x, y] = summaryHexPoint(index, total, center, radius)
  return `${x},${y}`
}

function summaryHexPoint(index: number, total: number, center: number, radius: number): [number, number] {
  const safeTotal = Math.max(total, 1)
  const angle = -Math.PI / 2 + (Math.PI * 2 * index) / safeTotal
  const x = center + Math.cos(angle) * radius
  const y = center + Math.sin(angle) * radius
  return [Number(x.toFixed(1)), Number(y.toFixed(1))]
}

function SummaryTakeawayRow({ takeaway }: { takeaway: CoachReportSummaryTakeaway }) {
  const colors = summaryTakeawayColors[takeaway.tone] ?? summaryTakeawayColors.neutral
  return (
    <View style={styles.takeawayRow}>
      <View style={[styles.takeawayValuePill, { borderColor: colors.solid, backgroundColor: colors.soft }]}>
        <Text style={[styles.takeawayValueText, { color: colors.solid }]}>{takeaway.valueLabel}</Text>
      </View>
      <View style={styles.takeawayCopy}>
        <Text style={styles.takeawayLabel}>{takeaway.label}</Text>
        <Text style={styles.takeawayBody}>{takeaway.body}</Text>
      </View>
    </View>
  )
}

const summaryTakeawayColors = {
  score: { solid: Sport.amber, soft: Sport.amberSoft },
  playmaking: { solid: Sport.green, soft: Sport.greenSoft },
  risk: { solid: Sport.red, soft: Sport.redSoft },
  neutral: { solid: Sport.blue, soft: Sport.blueSoft },
}

type CompareRow = {
  label: string
  current: number | null
  average: number | null
  tone: 'good' | 'risk' | 'neutral'
}

type EvidenceChartDatum = {
  label: string
  value: number
  isCurrent: boolean
  isBaseline?: boolean
  isLocked?: boolean
}

function buildSummaryCompareRows(
  currentStats: BasketballStatLine,
  baseline: CoachStatBaseline,
): CompareRow[] {
  return [
    { label: 'PTS', current: knownNumber(currentStats.points), average: knownNumber(baseline.averages.points), tone: 'good' },
    { label: 'AST', current: knownNumber(currentStats.assists), average: knownNumber(baseline.averages.assists), tone: 'good' },
    { label: 'BLK', current: knownNumber(currentStats.blocks), average: knownNumber(baseline.averages.blocks), tone: 'neutral' },
    { label: 'REB', current: knownNumber(currentStats.rebounds), average: knownNumber(baseline.averages.rebounds), tone: 'neutral' },
  ]
}

function hasSummaryTrendChart(
  currentStats: BasketballStatLine,
  baseline: CoachStatBaseline,
): boolean {
  return [
    currentStats.points,
    baseline.averages.points,
    baseline.previousStatline?.points,
  ].filter((value) => typeof value === 'number').length >= 2
}

function knownNumber(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function formatMetricValue(value: number | null): string {
  if (value == null) return '—'
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function formatBaselineScope(baseline: CoachStatBaseline): string {
  if (baseline.scope === 'none' || baseline.sampleSize <= 0) return 'NEEDS HISTORY'
  return `${baseline.scope.toUpperCase()} AVG · ${baseline.sampleSize} MATCHES`
}

function StatBaselineLineChart({
  label,
  previous,
  average,
  current,
}: {
  label: string
  previous?: number | null
  average?: number | null
  current?: number | null
}) {
  const points = [
    { label: 'PREV', value: knownNumber(previous) },
    { label: 'AVG', value: knownNumber(average) },
    { label: 'THIS', value: knownNumber(current) },
  ].filter((point): point is { label: string; value: number } => point.value != null)

  if (points.length < 2) {
    return (
      <View style={styles.chartEmpty}>
        <MaterialCommunityIcons name="chart-line" size={18} color={Sport.mutedSoft} />
        <Text style={styles.chartEmptyText}>Add stats or play more matches to draw this chart.</Text>
      </View>
    )
  }

  const xPositions = points.map((_, index) => 38 + index * (224 / Math.max(points.length - 1, 1)))
  const maxVal = Math.max(...points.map((point) => point.value), 1)
  const yPositions = points.map((point) => 18 + 74 - (point.value / maxVal) * 74)
  const path = points
    .map((_, index) => `${index === 0 ? 'M' : 'L'} ${xPositions[index]} ${yPositions[index]}`)
    .join(' ')
  const areaPath = `${path} L ${xPositions[xPositions.length - 1]} 96 L ${xPositions[0]} 96 Z`

  return (
    <View style={styles.chartSvgWrap}>
      <Svg width="100%" height={124} viewBox="0 0 300 124">
        <Defs>
          <LinearGradient id="summaryAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={Sport.amber} stopOpacity="0.24" />
            <Stop offset="1" stopColor={Sport.amber} stopOpacity="0.00" />
          </LinearGradient>
        </Defs>
        <Line x1="30" y1="18" x2="270" y2="18" stroke="rgba(255,255,255,0.06)" strokeDasharray="3,3" />
        <Line x1="30" y1="56" x2="270" y2="56" stroke="rgba(255,255,255,0.06)" strokeDasharray="3,3" />
        <Line x1="30" y1="96" x2="270" y2="96" stroke="rgba(255,255,255,0.14)" />
        <Path d={areaPath} fill="url(#summaryAreaGrad)" />
        <Path d={path} stroke={Sport.amber} strokeWidth={3} fill="none" />
        {points.map((point, index) => (
          <Circle
            key={point.label}
            cx={xPositions[index]}
            cy={yPositions[index]}
            r={4}
            fill={Sport.amber}
            stroke="#121212"
            strokeWidth={2}
          />
        ))}
        <SvgText x="14" y="22" fill="rgba(255,255,255,0.42)" fontSize="8" fontWeight="800" textAnchor="middle">
          {formatMetricValue(maxVal)}
        </SvgText>
        <SvgText x="14" y="99" fill="rgba(255,255,255,0.42)" fontSize="8" fontWeight="800" textAnchor="middle">
          0
        </SvgText>
        {points.map((point, index) => (
          <SvgText key={point.label} x={xPositions[index]} y="116" fill="rgba(255,255,255,0.52)" fontSize="9" fontWeight="800" textAnchor="middle">
            {point.label}
          </SvgText>
        ))}
        <SvgText x="270" y="22" fill={Sport.amber} fontSize="9" fontWeight="900" textAnchor="end">
          {label}
        </SvgText>
      </Svg>
    </View>
  )
}

function BaselineCompareRow({ label, current, average, tone }: CompareRow) {
  const hasBoth = current != null && average != null
  const max = Math.max(current ?? 0, average ?? 0, 1)
  const currentWidth = `${Math.max(((current ?? 0) / max) * 100, current == null ? 0 : 5)}%` as `${number}%`
  const averageWidth = `${Math.max(((average ?? 0) / max) * 100, average == null ? 0 : 5)}%` as `${number}%`
  const color = tone === 'risk' ? Sport.red : tone === 'good' ? Sport.green : Sport.blue

  return (
    <View style={styles.compareRow}>
      <View style={styles.compareHeader}>
        <Text style={styles.compareLabel}>{label}</Text>
        <Text style={styles.compareValue}>
          {current == null ? '—' : formatMetricValue(current)}
          <Text style={styles.compareMuted}> / avg {average == null ? '—' : formatMetricValue(average)}</Text>
        </Text>
      </View>
      <View style={styles.compareTrack}>
        <View style={[styles.compareAverageFill, { width: averageWidth }]} />
        <View style={[styles.compareCurrentFill, { width: currentWidth, backgroundColor: hasBoth ? color : Sport.lineStrong }]} />
      </View>
    </View>
  )
}

function getPrimaryStatKeyForTopic(topicId: string): keyof BasketballStatLine | null {
  if (topicId === 'cue_handler_playmaking_balance') return 'assists'
  if (topicId === 'cue_shooter_scoring_profile') return 'points'
  if (topicId === 'cue_defender_stat_impact') return 'steals'
  if (topicId === 'cue_big_rebounds') return 'rebounds'
  if (topicId === 'cue_big_paint_defense_stats') return 'blocks'
  if (topicId === 'cue_free_throws') return 'freeThrowsMade'
  if (topicId === 'cue_all_around_balance') return 'points'
  return null
}

function getStatShortLabel(key: keyof BasketballStatLine): string {
  const labels: Partial<Record<keyof BasketballStatLine, string>> = {
    points: 'PTS',
    rebounds: 'REB',
    assists: 'AST',
    steals: 'STL',
    blocks: 'BLK',
    twoPointersMade: '2PT',
    threePointersMade: '3PM',
    freeThrowsMade: 'FT',
  }
  return labels[key] ?? String(key)
}

function buildEvidenceChartData({
  previous,
  baseline,
  current,
  lockCurrent = false,
}: {
  previous: number | null
  baseline: number | null
  current: number | null
  lockCurrent?: boolean
}): EvidenceChartDatum[] {
  const rows: EvidenceChartDatum[] = []
  if (previous != null) rows.push({ label: 'PREV', value: previous, isCurrent: false })
  if (baseline != null) rows.push({ label: 'AVG', value: baseline, isCurrent: false, isBaseline: true })
  if (current != null) rows.push({ label: 'THIS', value: current, isCurrent: true })
  else if (lockCurrent) rows.push({ label: 'THIS', value: 0, isCurrent: true, isLocked: true })
  return rows
}

const severityColors = {
  positive: Sport.green,
  warning: Sport.red,
  neutral: Sport.mutedSoft,
}

function getTopicSourceIcon(source: string) {
  switch (source) {
    case 'sensor':
      return 'heart-pulse'
    case 'history':
      return 'gavel'
    case 'context':
      return 'basketball'
    case 'benchmark':
      return 'chart-bar'
    default:
      return 'lightning-bolt'
  }
}

function getEffectiveScore(
  card: CoachInsightCard,
  baseline: CoachStatBaseline | null | undefined
): CoachInsightScore | undefined {
  if (card.score) return card.score
  if (!baseline || baseline.scope === 'none') return undefined
  const averages = baseline.averages
  const scope = baseline.scope
  const metrics = card.metrics ?? {}

  const asNumber = (value: any): number => {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : 0
    }
    return 0
  }

  const compareMetric = (
    currentVal: any,
    baselineVal: number | null | undefined,
    unit: string
  ): CoachInsightScore | undefined => {
    if (currentVal == null || baselineVal == null || !Number.isFinite(baselineVal)) return undefined
    const current = asNumber(currentVal)
    const delta = Number((current - baselineVal).toFixed(1))
    return {
      status: Math.abs(delta) < 0.5 ? 'steady' : delta > 0 ? 'up' : 'down',
      delta,
      current,
      baseline: Number(baselineVal.toFixed(1)),
      unit,
      scope,
    }
  }

  if (card.id === 'cue_handler_playmaking_balance') {
    return compareMetric(metrics.assists, averages.assists, 'AST')
  }
  if (card.id === 'cue_shooter_scoring_profile') {
    return compareMetric(metrics.points, averages.points, 'PTS')
  }
  if (card.id === 'cue_defender_stat_impact') {
    const hasDefensiveAverage = typeof averages.steals === 'number' || typeof averages.blocks === 'number'
    const baselineValue = hasDefensiveAverage ? (averages.steals ?? 0) + (averages.blocks ?? 0) : null
    return compareMetric(asNumber(metrics.steals) + asNumber(metrics.blocks), baselineValue, 'STL+BLK')
  }
  if (card.id === 'cue_big_rebounds') {
    return compareMetric(metrics.rebounds, averages.rebounds, 'REB')
  }
  if (card.id === 'cue_big_paint_defense_stats') {
    return compareMetric(metrics.blocks, averages.blocks, 'BLK')
  }
  if (card.id === 'cue_free_throws') {
    return compareMetric(metrics.free_throws_made, averages.freeThrowsMade, 'FT')
  }
  if (card.id === 'cue_all_around_balance') {
    return compareMetric(metrics.points, averages.points, 'PTS')
  }
  return undefined
}

function CoachReportTopicView({
  stage, data, activitySessionId, startedAt, endedAt, onRequestInput,
}: {
  stage: CoachReportTopicStage
  data: GetCoachActivityInsightsResult
  activitySessionId: string
  startedAt: string
  endedAt: string | null
  onRequestInput: () => void
}) {
  const language = useLanguageStore((state) => state.language)
  const blocks = getCoachReportDetailBlocks(stage.topic, language)
  const gate = stage.topic.gate
  const needsHistory = stage.topic.card.score?.status === 'needs_history'
  const hasInputGate = gate !== 'none'
  const isLocked = hasInputGate || needsHistory
  const headline = isLocked ? stage.topic.title : stage.topic.resultTitle
  const shouldShowBlocks = !isLocked

  const accentColor = severityColors[stage.topic.severity] || Sport.line;
  const sampleSize = data.statBaseline?.sampleSize ?? 0
  const minimumSample = data.statBaseline?.minimumSample ?? 3

  const score = useMemo(() => getEffectiveScore(stage.topic.card, data.statBaseline), [stage.topic.card, data.statBaseline])

  // Extract / calculate metrics for rendering
  const { currentVal, baselineVal, unit, deltaText, showChart, chartData, deltaStyles } = useMemo(() => {
    let currentVal: string | number = '?'
    let baselineVal: string | number = '?'
    let unit = ''
    let deltaText = ''
    let deltaStatus: 'up' | 'down' | 'steady' | 'none' = 'none'
    let showChart = false
    let chartData: EvidenceChartDatum[] = []

    const averages = data.statBaseline?.averages ?? {}
    const primaryStatKey = getPrimaryStatKeyForTopic(stage.topic.id)
    const previousStatline = data.statBaseline?.previousStatline ?? null

    if (score && score.status !== 'needs_history') {
      currentVal = score.current ?? 0
      baselineVal = score.baseline ?? 0
      unit = score.unit ?? ''
      const delta = score.delta ?? 0
      deltaText = delta === 0 ? 'Steady' : (delta > 0 ? `+${delta}` : `${delta}`)
      deltaStatus = score.status
      showChart = true

      const previous = primaryStatKey ? knownNumber(previousStatline?.[primaryStatKey]) : null
      chartData = buildEvidenceChartData({
        previous,
        baseline: knownNumber(typeof baselineVal === 'number' ? baselineVal : null),
        current: knownNumber(typeof currentVal === 'number' ? currentVal : null),
      })
    } else {
      // Determine the primary stat key we are gating or analyzing
      const statKey = primaryStatKey

      if (statKey) {
        unit = getStatShortLabel(statKey)
        baselineVal = averages[statKey] ?? '?'
        currentVal = '?'
        const previous = knownNumber(previousStatline?.[statKey])
        chartData = buildEvidenceChartData({
          previous,
          baseline: knownNumber(averages[statKey]),
          current: null,
          lockCurrent: true,
        })
        showChart = chartData.length > 0
      } else if (stage.topic.card.type === 'effort' || stage.topic.card.source === 'sensor') {
        unit = 'SYNC'
        currentVal = '?'
        baselineVal = '?'
        showChart = false
        chartData = []
      }
    }

    let deltaStyles = null
    if (deltaStatus !== 'none') {
      const isPositiveUp = true
      if (deltaStatus === 'steady') {
        deltaStyles = {
          color: Sport.amber,
          bgColor: Sport.amberSoft,
          icon: 'minus' as const,
        }
      } else {
        const isGood = (deltaStatus === 'up' && isPositiveUp) || (deltaStatus === 'down' && !isPositiveUp)
        if (isGood) {
          deltaStyles = {
            color: Sport.green,
            bgColor: Sport.greenSoft,
            icon: 'trending-up' as const,
          }
        } else {
          deltaStyles = {
            color: Sport.red,
            bgColor: Sport.redSoft,
            icon: 'trending-down' as const,
          }
        }
      }
    }

    return { currentVal, baselineVal, unit, deltaText, showChart, chartData, deltaStyles }
  }, [score, stage.topic, data.statBaseline])

  return (
    <View style={[styles.topicCard, { borderTopColor: accentColor }]}>
      <View style={styles.topicHeaderRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
          <MaterialCommunityIcons name={getTopicSourceIcon(stage.topic.card.source)} size={12} color={accentColor} style={styles.topicHeaderIcon} />
          <Text style={styles.eyebrow}>{stage.topic.sourceLabel}</Text>
        </View>
        {needsHistory && (
          <View style={styles.lockBadge}>
            <MaterialCommunityIcons name="chart-line" size={10} color={Sport.amber} />
            <Text style={styles.lockBadgeText}>
              {sampleSize}/{minimumSample}
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.topicTitle} maxFontSizeMultiplier={1.12}>{headline}</Text>
      {stage.topic.scoreLabel ? <Text style={styles.topicScore}>{stage.topic.scoreLabel}</Text> : null}

      {needsHistory ? (
        <CoachReportHistoryGate
          sampleSize={sampleSize}
          minimumSample={minimumSample}
          matchesNeeded={data.statBaseline?.matchesNeeded ?? Math.max(minimumSample - sampleSize, 0)}
          body={stage.topic.body}
          language={language}
        />
      ) : null}

      {shouldShowBlocks ? (
        <View style={styles.blocks}>
          {blocks.map((block) => {
          if (block.label === 'Evidence') {
            return (
              <View key={block.label} style={styles.evidenceContainer}>
                <View style={styles.evidenceTitleRow}>
                  <MaterialCommunityIcons name="chart-bar" size={10} color={Sport.amber} />
                  <Text style={styles.evidenceTitle}>
                    {language === 'th' ? 'หลักฐานและการวิเคราะห์' : 'THE EVIDENCE & ANALYSIS'}
                  </Text>
                </View>

                {/* Side-by-side metric boxes */}
                <View style={styles.evidenceMetricsRow}>
                  <View style={[
                    styles.evidenceMetricCard,
                    !isLocked && styles.evidenceMetricCardActive
                  ]}>
                    <View style={styles.evidenceMetricCardHeader}>
                      <Text style={styles.evidenceMetricLabel}>
                        {language === 'th' ? 'แมตช์นี้' : 'THIS MATCH'}
                      </Text>
                      {!isLocked && deltaStyles ? (
                        <View style={[
                          styles.evidenceDeltaBadge,
                          { backgroundColor: deltaStyles.bgColor }
                        ]}>
                          <MaterialCommunityIcons name={deltaStyles.icon} size={8} color={deltaStyles.color} />
                          <Text style={[styles.evidenceDeltaText, { color: deltaStyles.color }]}>
                            {deltaText}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2, marginTop: 4 }}>
                      <Text style={styles.evidenceMetricValue}>
                        {currentVal}
                      </Text>
                      {unit ? <Text style={styles.evidenceMetricUnit}>{unit}</Text> : null}
                    </View>
                  </View>

                  <View style={styles.evidenceMetricCard}>
                    <View style={styles.evidenceMetricCardHeader}>
                      <Text style={styles.evidenceMetricLabel}>
                        {language === 'th' ? 'ค่าเฉลี่ย' : 'BASELINE'}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2, marginTop: 4 }}>
                      <Text style={styles.evidenceMetricValue}>
                        {baselineVal}
                      </Text>
                      {unit ? <Text style={styles.evidenceMetricUnit}>{unit}</Text> : null}
                    </View>
                  </View>
                </View>

                {/* Vertical Bar Chart comparison */}
                {showChart && (
                  <View style={styles.evidenceChartCard}>
                    <Text style={styles.evidenceChartTitle}>
                      {language === 'th' ? 'แนวโน้มสถิติ' : 'STATISTICAL TREND'}
                    </Text>

                    <View style={styles.evidenceChartBody}>
                      <View style={styles.chartGridLine} />
                      <View style={[styles.chartGridLine, { top: '50%' }]} />

                      <View style={styles.evidenceBarsRow}>
                        {chartData.map((item, idx) => {
                          const maxVal = Math.max(...chartData.map(d => d.value), 1.0)
                          const barHeight = maxVal > 0 ? (item.value / maxVal) * 50 : 4

                          return (
                            <View key={idx} style={styles.evidenceBarColumn}>
                              <Text style={[
                                styles.evidenceBarValue,
                                item.isCurrent && { color: Sport.amber, fontWeight: '900' }
                              ]}>
                                {item.isLocked ? '?' : item.value}
                              </Text>

                              <View style={styles.evidenceBarTrack}>
                                {item.isLocked ? (
                                  <View style={[
                                    styles.evidenceBarFillLocked,
                                    { height: 20 }
                                  ]}>
                                    <MaterialCommunityIcons name="lock" size={8} color={Sport.mutedSoft} />
                                  </View>
                                ) : (
                                  <View style={[
                                    styles.evidenceBarFill,
                                    { height: Math.max(barHeight, 4) },
                                    item.isCurrent ? styles.evidenceBarFillCurrent : (item.isBaseline ? styles.evidenceBarFillBaseline : null)
                                  ]} />
                                )}
                              </View>

                              <Text style={[
                                styles.evidenceBarLabel,
                                item.isCurrent && { color: Sport.amber, fontWeight: '900' }
                              ]}>
                                {item.label}
                              </Text>
                            </View>
                          )
                        })}
                      </View>
                    </View>
                  </View>
                )}

                {/* Compact description text matching fallback/score text below the graphic */}
                <Text style={{ color: Sport.mutedSoft, fontSize: 11, fontWeight: '700', lineHeight: 16, marginTop: 4 }}>
                  {block.text}
                </Text>
              </View>
            )
          }

          return (
            <View key={block.label} style={styles.block}>
              <Text style={styles.blockLabel}>
                {block.label === 'Verdict'
                  ? (language === 'th' ? 'คำตัดสินของโค้ช' : 'COACH VERDICT')
                  : (block.label === 'Next' ? (language === 'th' ? 'คำแนะนำถัดไป' : 'COACH\'S ADVICE') : block.label)}
              </Text>
              <Text style={styles.blockText}>{block.text}</Text>
            </View>
          )
        })}
        </View>
      ) : null}

      {hasInputGate && !needsHistory ? (
        <View style={styles.gateNotice}>
          <View style={styles.gateNoticeCopy}>
            <MaterialCommunityIcons name={gate === 'needs_sensor_sync' || gate === 'needs_permission' ? 'watch-variant' : 'pencil'} size={13} color={Sport.amber} />
            <Text style={styles.gateNoticeText}>
              {stage.topic.gateLabel ?? (language === 'th' ? 'เพิ่มข้อมูลเฉพาะหัวข้อนี้ก่อนอ่าน' : 'Add the required input to read this topic.')}
            </Text>
          </View>
          {gate !== 'needs_sensor_sync' && gate !== 'needs_permission' ? (
            <PressableScale
              style={styles.gateNoticeButton}
              onPress={onRequestInput}
              accessibilityRole="button"
              accessibilityLabel={language === 'th' ? 'เพิ่มข้อมูลเพื่ออ่านหัวข้อนี้' : 'Add data to read this topic'}
            >
              <Text style={styles.gateNoticeButtonText}>
                {gate === 'pro_locked'
                  ? language === 'th' ? 'ดู Pro' : 'View Pro'
                  : language === 'th' ? 'เพิ่มข้อมูล' : 'Add data'}
              </Text>
            </PressableScale>
          ) : null}
        </View>
      ) : null}

      {gate === 'needs_sensor_sync' || gate === 'needs_permission' ? (
        <BasketballCoachSensorSyncCard
          activitySessionId={activitySessionId}
          startedAt={startedAt}
          endedAt={endedAt}
          surface="inline"
        />
      ) : null}
    </View>
  )
}

function CoachReportHistoryGate({
  sampleSize,
  minimumSample,
  matchesNeeded,
  body,
  language,
}: {
  sampleSize: number
  minimumSample: number
  matchesNeeded: number
  body: string
  language: string
}) {
  const progress = minimumSample > 0 ? Math.min(sampleSize / minimumSample, 1) : 0
  const progressWidth = `${Math.round(progress * 100)}%` as `${number}%`
  return (
    <View style={styles.historyGate}>
      <View style={styles.historyGateTop}>
        <View>
          <Text style={styles.historyGateLabel}>{language === 'th' ? 'ประวัติที่มี' : 'HISTORY READY'}</Text>
          <Text style={styles.historyGateTitle}>
            {language === 'th'
              ? matchesNeeded > 0
                ? `ต้องมีอีก ${matchesNeeded} แมตช์`
                : 'พร้อมอ่านแนวโน้ม'
              : matchesNeeded > 0
                ? `${matchesNeeded} more matches needed`
                : 'Trend ready'}
          </Text>
        </View>
        <Text style={styles.historyGateCount}>{sampleSize}/{minimumSample}</Text>
      </View>
      <View style={styles.historyGateTrack}>
        <View style={[styles.historyGateFill, { width: progressWidth }]} />
      </View>
      <Text style={styles.historyGateBody}>{body}</Text>
    </View>
  )
}

function CoachReportFinalCard({
  stage,
  data,
  ownTeamScore,
  benchmarkFormat,
  onBack,
  onSelectOptionalItem,
}: {
  stage: CoachReportFinalStage
  data: GetCoachActivityInsightsResult
  ownTeamScore: number | null
  benchmarkFormat: CoachBenchmarkFormat | null
  onBack: () => void
  onSelectOptionalItem: (item: CoachReportFinalBoardItem) => void
}) {
  const language = useLanguageStore((state) => state.language)

  return (
    <View style={styles.finalContainer}>
      <BasketballFinalDataBoard data={data} ownTeamScore={ownTeamScore} benchmarkFormat={benchmarkFormat} language={language} />
      <CoachReportOptionalSections
        sections={stage.optionalSections}
        onSelectItem={onSelectOptionalItem}
      />

      {/* Action Buttons */}
      <View style={styles.finalActions}>
        <PressableScale style={[styles.primaryBtn, { width: '100%' }]} onPress={() => Alert.alert(language === 'th' ? 'กำลังมา' : 'Coming Soon', language === 'th' ? 'แชร์เป็นรูปจะมาในรอบถัดไป' : 'Sharing summary as image will be available soon.')}>
          <MaterialCommunityIcons name="share-variant" size={16} color={Sport.bg} />
          <Text style={styles.primaryBtnText}>{language === 'th' ? 'แชร์สรุป' : 'Share Summary'}</Text>
        </PressableScale>

        <PressableScale style={[styles.primaryBtn, { backgroundColor: Sport.surfaceStrong, width: '100%' }]} onPress={() => Alert.alert(language === 'th' ? 'เร็วๆ นี้' : 'Soon', language === 'th' ? 'ท้าอีกครั้งจะมาเร็วๆนี้' : 'Rematch is coming soon.')}>
          <MaterialCommunityIcons name="rotate-right" size={16} color={Sport.ink} />
          <Text style={[styles.primaryBtnText, { color: Sport.ink }]}>{language === 'th' ? 'ท้าอีกครั้ง' : 'Rematch'}</Text>
        </PressableScale>

        <PressableScale style={styles.secondaryBtn} onPress={onBack}>
          <Text style={styles.secondaryBtnText}>{language === 'th' ? 'กลับ Activity' : 'Back to Activity'}</Text>
        </PressableScale>
      </View>
    </View>
  )
}

function CoachReportOptionalSections({
  sections,
  onSelectItem,
}: {
  sections: CoachReportFinalBoardSection[]
  onSelectItem: (item: CoachReportFinalBoardItem) => void
}) {
  const language = useLanguageStore((state) => state.language)
  if (sections.length === 0) {
    return (
      <View style={styles.optionalEmptyCard}>
        <MaterialCommunityIcons name="check-circle" size={14} color={Sport.green} />
        <Text style={styles.optionalEmptyText}>
          {language === 'th' ? 'ไม่มีการ์ดอื่นที่ต้องรบกวนตอนนี้' : 'No extra reads need attention right now.'}
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.optionalSections}>
      <View style={styles.optionalHeader}>
        <Text style={styles.eyebrow}>{language === 'th' ? 'อ่านเพิ่ม' : 'OPTIONAL READS'}</Text>
        <Text style={styles.optionalHeaderTitle}>
          {language === 'th' ? 'เลื่อนดูต่อเมื่ออยากเจาะเพิ่ม' : 'Scroll only when you want more detail'}
        </Text>
      </View>
      {sections.map((section) => (
        <View key={section.id} style={styles.optionalSection}>
          <View style={styles.optionalSectionTitleRow}>
            <MaterialCommunityIcons name={optionalSectionIcon(section.id)} size={12} color={Sport.amber} />
            <Text style={styles.optionalSectionTitle}>{section.title}</Text>
          </View>
          {section.groups.map((group) => (
            <View key={group.id} style={styles.optionalGroup}>
              <Text style={styles.optionalGroupTitle}>{group.title}</Text>
              {group.items.map((item) => (
                <CoachReportOptionalItemCard
                  key={item.id}
                  item={item}
                  onPress={() => onSelectItem(item)}
                />
              ))}
            </View>
          ))}
        </View>
      ))}
    </View>
  )
}

function CoachReportOptionalItemCard({
  item,
  onPress,
}: {
  item: CoachReportFinalBoardItem
  onPress: () => void
}) {
  const language = useLanguageStore((state) => state.language)
  const locked = item.gate !== 'none'
  const meta = optionalItemMeta(item, language)
  return (
    <PressableScale
      style={[styles.optionalItemCard, locked ? styles.optionalItemCardLocked : null]}
      onPress={locked ? onPress : undefined}
      scaleTo={locked ? 0.97 : 1}
    >
      <View style={styles.optionalItemIcon}>
        <MaterialCommunityIcons name={optionalItemIcon(item)} size={12} color={locked ? Sport.amber : Sport.ink} />
      </View>
      <View style={styles.optionalItemCopy}>
        <View style={styles.optionalItemTitleRow}>
          <Text style={styles.optionalItemTitle} numberOfLines={2}>{item.title}</Text>
          {item.scoreLabel ? <Text style={styles.optionalScoreLabel}>{item.scoreLabel}</Text> : null}
        </View>
        <Text style={styles.optionalItemBody} numberOfLines={2}>
          {locked ? meta : item.body}
        </Text>
      </View>
      <View style={[styles.optionalItemBadge, locked ? styles.optionalItemBadgeLocked : null]}>
        <MaterialCommunityIcons
          name={locked ? 'lock' : 'chart-bar'}
          size={9}
          color={locked ? Sport.bg : Sport.amber}
        />
        <Text style={[styles.optionalItemBadgeText, locked ? styles.optionalItemBadgeTextLocked : null]}>
          {meta}
        </Text>
      </View>
    </PressableScale>
  )
}

function optionalSectionIcon(sectionId: CoachReportFinalBoardSection['id']) {
  switch (sectionId) {
    case 'missing_inputs':
      return 'pencil'
    case 'other_roles':
      return 'account-group'
    case 'pro_reads':
      return 'lock'
    case 'compare':
      return 'chart-line'
  }
}

function optionalItemIcon(item: CoachReportFinalBoardItem) {
  if (item.gate === 'pro_locked') return 'lock'
  if (item.gate !== 'none') return 'pencil'
  if (item.topic.card.source === 'benchmark') return 'chart-bar'
  if (item.topic.card.source === 'history') return 'history'
  if (item.topic.card.source === 'sensor') return 'heart-pulse'
  return 'basketball'
}

function optionalItemMeta(item: CoachReportFinalBoardItem, language: string): string {
  if (item.gate === 'pro_locked') return language === 'th' ? 'Pro' : 'Pro'
  if (item.requiredInputs.kind === 'stats') {
    const labels = item.requiredInputs.statKeys.map((key) => optionalStatLabel(key)).join(' / ')
    return language === 'th' ? `ต้องมี ${labels}` : `${labels} needed`
  }
  if (item.requiredInputs.kind === 'role') {
    return language === 'th' ? 'เลือก Role' : 'Pick role'
  }
  if (item.requiredInputs.kind === 'sensor') {
    return language === 'th' ? 'ซิงก์ก่อน' : 'Sync needed'
  }
  return item.scoreLabel ?? item.sourceLabel
}

function optionalStatLabel(key: keyof BasketballStatLine): string {
  const labels: Partial<Record<keyof BasketballStatLine, string>> = {
    points: 'PTS',
    rebounds: 'REB',
    assists: 'AST',
    steals: 'STL',
    blocks: 'BLK',
    twoPointersMade: '2PT',
    threePointersMade: '3PM',
    freeThrowsMade: 'FT',
  }
  return labels[key] ?? String(key)
}

function CoachReportTopicIndexSheet({
  visible, stages, currentIndex, onSelect, onClose
}: {
  visible: boolean, stages: CoachReportStage[], currentIndex: number, onSelect: (idx: number) => void, onClose: () => void
}) {
  const language = useLanguageStore((state) => state.language)
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{language === 'th' ? 'หัวข้อทั้งหมด' : 'Topic Index'}</Text>
          <ScrollView>
            {stages.map((st, idx) => {
              const isCurrent = idx === currentIndex
              const title = st.kind === 'summary' ? (language === 'th' ? 'สรุปแมตช์' : 'Summary')
                          : st.kind === 'final' ? (language === 'th' ? 'จบการวิเคราะห์' : 'Final')
                          : st.topic.resultTitle
              return (
                <PressableScale key={idx} style={[styles.indexRow, isCurrent && styles.indexRowActive]} onPress={() => onSelect(idx)}>
                  <Text style={[styles.indexText, isCurrent && styles.indexTextActive]}>{title}</Text>
                  {isCurrent && <Text style={styles.indexCurrentTag}>CURRENT</Text>}
                </PressableScale>
              )
            })}
          </ScrollView>
          <PressableScale style={styles.closeButtonFull} onPress={onClose}>
            <MaterialCommunityIcons name="chevron-down" size={16} color={Sport.inkSoft} />
            <Text style={styles.closeButtonText}>DISMISS</Text>
          </PressableScale>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Sport.bg },
  scrollView: { flex: 1 },
  scrollContent: { padding: Spacing.lg, paddingTop: 12, paddingBottom: 72, gap: Spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Sport.bg },
  muted: { color: Sport.muted, fontSize: 13, fontWeight: '800' },
  progressContainer: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, gap: 8 },
  progressText: { color: Sport.amber, fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
  progressTrackRow: { flexDirection: 'row', gap: 5 },
  progressSegment: {
    flex: 1,
    height: 6,
    backgroundColor: Sport.bgElevated,
    borderWidth: 1,
    borderColor: Sport.lineStrong,
    borderRadius: Radius.pill,
  },
  progressSegmentActive: {
    backgroundColor: Sport.amber,
    borderColor: Sport.amber,
  },
  playerSummaryCard: {
    backgroundColor: Sport.chalk,
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: Sport.arcadeShadow,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.26,
    shadowRadius: 24,
    elevation: 8,
  },
  playerSummaryTop: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 360,
    paddingHorizontal: 24,
    paddingTop: 26,
    gap: 12,
  },
  playerSummaryIdentity: {
    flex: 1,
    minWidth: 0,
    paddingBottom: 18,
  },
  playerSummaryEyebrow: {
    color: 'rgba(22,22,22,0.56)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  playerSummaryTitle: {
    color: Sport.arcadeCabinet,
    fontSize: 35,
    fontWeight: '900',
    lineHeight: 39,
  },
  playerSummaryRole: {
    color: 'rgba(22,22,22,0.58)',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.2,
    marginTop: 20,
    marginBottom: 26,
    textTransform: 'uppercase',
  },
  playerSummaryHero: {
    width: 118,
    alignItems: 'flex-end',
  },
  playerSummaryImpact: {
    color: Sport.arcadeCabinet,
    fontSize: 82,
    fontWeight: '900',
    lineHeight: 86,
    includeFontPadding: false,
  },
  playerSummaryImpactUnit: {
    color: 'rgba(22,22,22,0.52)',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginTop: 4,
  },
  playerSummaryMarker: {
    width: 116,
    height: 142,
    marginTop: 'auto',
    marginBottom: 12,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(22,22,22,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(22,22,22,0.08)',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  playerSummaryMarkerTitle: {
    color: 'rgba(22,22,22,0.58)',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  playerSummaryMarkerScale: {
    color: 'rgba(22,22,22,0.54)',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  playerSummaryFacts: {
    gap: 0,
  },
  playerSummaryFactRow: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1.2,
    borderColor: 'rgba(22,22,22,0.9)',
    gap: 12,
  },
  playerSummaryFactLabel: {
    color: Sport.arcadeCabinet,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.1,
  },
  playerSummaryFactValue: {
    color: Sport.arcadeCabinet,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
  },
  playerSummaryStatStrip: {
    minHeight: 88,
    flexDirection: 'row',
    borderTopWidth: 1.2,
    borderBottomWidth: 1.2,
    borderColor: 'rgba(22,22,22,0.9)',
    backgroundColor: 'rgba(22,22,22,0.035)',
  },
  playerSummaryStatCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    gap: 5,
  },
  playerSummaryStatCellDivider: {
    borderLeftWidth: 1,
    borderColor: 'rgba(22,22,22,0.12)',
  },
  playerSummaryStatLabel: {
    color: Sport.arcadeCabinet,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  playerSummaryStatValue: {
    color: Sport.arcadeCabinet,
    fontSize: 30,
    fontWeight: '900',
    includeFontPadding: false,
  },
  playerSummaryCoachNote: {
    paddingHorizontal: 22,
    paddingVertical: 18,
    gap: 6,
  },
  playerSummaryCoachLabel: {
    color: 'rgba(22,22,22,0.54)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.3,
  },
  playerSummaryCoachText: {
    color: Sport.arcadeCabinet,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 21,
  },
  summaryCard: {
    backgroundColor: Sport.bgElevated,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Sport.line,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  eyebrow: { color: Sport.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1.7, marginBottom: 4 },
  verdictText: { color: Sport.ink, fontSize: 23, fontWeight: '900', lineHeight: 31, marginBottom: 6 },
  signalRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  signalChip: {
    minHeight: 28,
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingLeft: 14,
    paddingRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  signalChipAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  signalChipIcon: {
    marginRight: 6,
  },
  signalText: { fontSize: 11, fontWeight: '900' },
  topicCard: {
    backgroundColor: Sport.bgElevated,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Sport.line,
    borderTopWidth: 3,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  topicHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  topicHeaderIcon: {
    marginBottom: 4,
  },
  topicTitle: { color: Sport.ink, fontSize: 20, fontWeight: '900', lineHeight: 26 },
  topicScore: { color: Sport.amber, fontSize: 13, fontWeight: '900', marginBottom: 6 },
  blocks: { gap: Spacing.sm, marginTop: 0 },
  block: { backgroundColor: Sport.surface, borderRadius: Radius.lg, padding: Spacing.md, gap: 6 },
  blockLabel: { color: Sport.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
  blockText: { color: Sport.ink, fontSize: 14, fontWeight: '700', lineHeight: 22 },
  promptWrap: { marginTop: Spacing.sm, padding: Spacing.md, backgroundColor: Sport.surface, borderRadius: Radius.lg },
  gateNotice: {
    gap: Spacing.sm,
    backgroundColor: Sport.amberSoft,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  gateNoticeCopy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  gateNoticeText: { color: Sport.ink, fontSize: 12, fontWeight: '900', flex: 1 },
  gateNoticeButton: {
    minHeight: 44,
    borderRadius: Radius.lg,
    backgroundColor: Sport.amber,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  gateNoticeButtonText: { color: Sport.bg, fontSize: 13, fontWeight: '900' },

  bottomNavBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: 'rgba(22,22,22,0.94)',
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  bottomNavSecondary: {
    minHeight: 44,
    minWidth: 78,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  bottomNavSecondaryText: { color: Sport.inkSoft, fontSize: 13, fontWeight: '800' },
  bottomNavDisabled: { opacity: 0.42 },
  bottomNavTopics: {
    minHeight: 44,
    minWidth: 74,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Sport.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
  },
  bottomNavPrimary: {
    minHeight: 44,
    flex: 1,
    backgroundColor: Sport.amber,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Sport.amber,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryBtn: {
    backgroundColor: Sport.amber,
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    // glowing primary button glow
    shadowColor: Sport.amber,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryBtnText: { color: Sport.bg, fontSize: 14, fontWeight: '900' },
  secondaryBtn: {
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { color: Sport.inkSoft, fontSize: 14, fontWeight: '700' },
  indexTriggerBtn: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  indexTriggerText: { color: Sport.muted, fontSize: 12, fontWeight: '800' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalKeyboardAvoider: { flex: 1 },
  modalBackdropCenter: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.74)',
    padding: Spacing.lg,
  },
  inputGateSheet: {
    backgroundColor: '#101010',
    borderRadius: Radius.xxl,
    borderWidth: 1,
    borderColor: Sport.amber,
    maxHeight: '88%',
    overflow: 'hidden',
  },
  inputGateContent: { padding: Spacing.lg, gap: Spacing.md },
  popupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  popupIcon: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    backgroundColor: Sport.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupHeaderCopy: { flex: 1 },
  popupTitle: { color: Sport.ink, fontSize: 18, fontWeight: '900', marginTop: 2 },
  sensorGateStack: { gap: Spacing.md },
  proGateBox: {
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Sport.line,
    backgroundColor: Sport.surface,
    padding: Spacing.lg,
  },
  proGateTitle: { color: Sport.ink, fontSize: 17, fontWeight: '900', textAlign: 'center' },
  proGateBody: { color: Sport.inkSoft, fontSize: 12, fontWeight: '700', lineHeight: 18, textAlign: 'center' },
  skipTopicButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Sport.line,
  },
  skipTopicText: { color: Sport.inkSoft, fontSize: 12, fontWeight: '800' },
  sheet: {
    maxHeight: '75%',
    backgroundColor: Sport.bgElevated,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    padding: Spacing.xl,
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Sport.lineStrong, alignSelf: 'center', marginBottom: Spacing.lg },
  sheetTitle: { color: Sport.ink, fontSize: 18, fontWeight: '900', marginBottom: Spacing.lg },
  indexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: Sport.line,
  },
  indexRowActive: { borderColor: Sport.amber },
  indexText: { color: Sport.inkSoft, fontSize: 15, fontWeight: '700' },
  indexTextActive: { color: Sport.amber },
  indexCurrentTag: { color: Sport.amber, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  closeButtonFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginTop: Spacing.md,
  },
  closeButtonText: { color: Sport.inkSoft, fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },

  // Final Card 9:16 layout styles
  finalContainer: {
    alignItems: 'center',
    width: '100%',
    gap: Spacing.xl,
  },
  optionalSections: {
    width: '100%',
    gap: Spacing.md,
  },
  optionalHeader: {
    width: '100%',
    gap: 2,
  },
  optionalHeaderTitle: {
    color: Sport.ink,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 22,
  },
  optionalEmptyCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Sport.line,
    backgroundColor: Sport.surface,
    padding: Spacing.md,
  },
  optionalEmptyText: {
    color: Sport.inkSoft,
    fontSize: 12,
    fontWeight: '800',
    flex: 1,
  },
  optionalSection: {
    width: '100%',
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Sport.line,
    backgroundColor: Sport.bgElevated,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  optionalSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionalSectionTitle: {
    color: Sport.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  optionalGroup: {
    gap: Spacing.sm,
  },
  optionalGroupTitle: {
    color: Sport.muted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  optionalItemCard: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Sport.line,
    backgroundColor: Sport.surface,
    padding: Spacing.md,
  },
  optionalItemCardLocked: {
    borderColor: 'rgba(234,195,26,0.34)',
    backgroundColor: 'rgba(234,195,26,0.07)',
  },
  optionalItemIcon: {
    width: 30,
    height: 30,
    borderRadius: Radius.md,
    backgroundColor: Sport.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionalItemCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  optionalItemTitleRow: {
    gap: 4,
  },
  optionalItemTitle: {
    color: Sport.ink,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  optionalScoreLabel: {
    color: Sport.amber,
    fontSize: 10,
    fontWeight: '900',
  },
  optionalItemBody: {
    color: Sport.inkSoft,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
  },
  optionalItemBadge: {
    maxWidth: 92,
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(234,195,26,0.38)',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  optionalItemBadgeLocked: {
    backgroundColor: Sport.amber,
    borderColor: Sport.amber,
  },
  optionalItemBadgeText: {
    color: Sport.amber,
    fontSize: 9,
    fontWeight: '900',
  },
  optionalItemBadgeTextLocked: {
    color: Sport.bg,
  },
  shareCard: {
    width: '100%',
    aspectRatio: 9 / 16,
    backgroundColor: '#121212',
    borderWidth: 2,
    borderColor: Sport.amber,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    justifyContent: 'space-between',
    overflow: 'hidden',
    shadowColor: Sport.amber,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  shareCardHeader: {
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  shareCardBrand: {
    color: Sport.ink,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 4,
  },
  shareCardSubtitle: {
    color: Sport.amber,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 4,
  },
  shareCardBody: {
    alignItems: 'center',
    marginVertical: Spacing.xl,
  },
  shareCardVerdictLabel: {
    color: Sport.muted,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: Spacing.xs,
  },
  shareCardVerdict: {
    color: Sport.ink,
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  shareCardDesc: {
    color: Sport.inkSoft,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
  },
  shareCardGraphContainer: {
    width: '100%',
    backgroundColor: '#1c1c1c',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  graphTitle: {
    color: Sport.muted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  shareSignalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  shareSignalCell: {
    minWidth: '45%',
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(234,195,26,0.34)',
    backgroundColor: 'rgba(234,195,26,0.08)',
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  shareSignalLabel: { color: Sport.amber, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  shareSignalValue: { color: Sport.ink, fontSize: 26, fontWeight: '900', marginTop: 2 },
  shareSignalEmpty: { color: Sport.muted, fontSize: 12, fontWeight: '800', lineHeight: 18 },
  shareSourceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: Spacing.sm },
  shareSourceText: {
    color: Sport.mutedSoft,
    borderWidth: 1,
    borderColor: Sport.line,
    borderRadius: Radius.sm,
    paddingHorizontal: 7,
    paddingVertical: 4,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  finalActions: {
    width: '100%',
    gap: Spacing.md,
    alignItems: 'center',
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Sport.amberSoft,
    borderColor: 'rgba(234,195,26,0.34)',
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  lockBadgeText: {
    color: Sport.amber,
    fontSize: 10,
    fontWeight: '900',
  },
  summaryContainer: {
    gap: Spacing.md,
    width: '100%',
  },
  metricCardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    justifyContent: 'space-between',
    width: '100%',
  },
  metricCard: {
    width: '23%',
    minWidth: 70,
    flexGrow: 1,
    backgroundColor: Sport.bgElevated,
    borderColor: Sport.line,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    alignItems: 'center',
    gap: 4,
  },
  metricCardHighlighted: {
    borderColor: Sport.amber,
    borderWidth: 1.5,
    backgroundColor: 'rgba(234,195,26,0.06)',
    shadowColor: Sport.amber,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 3,
  },
  metricCardLabel: {
    color: Sport.mutedSoft,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  metricCardValue: {
    color: Sport.ink,
    fontSize: 23,
    fontWeight: '900',
  },
  metricCardMissing: { color: Sport.mutedSoft },
  metricCardHint: {
    color: Sport.mutedSoft,
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  metricCardDeltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricCardDeltaText: {
    fontSize: 10,
    fontWeight: '800',
  },
  takeawayCard: {
    backgroundColor: Sport.bgElevated,
    borderColor: Sport.line,
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  takeawayRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  takeawayValuePill: {
    minWidth: 86,
    minHeight: 36,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  takeawayValueText: {
    fontSize: 12,
    fontWeight: '900',
  },
  takeawayCopy: {
    flex: 1,
    gap: 2,
  },
  takeawayLabel: {
    color: Sport.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  takeawayBody: {
    color: Sport.inkSoft,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
  },
  trendChartCard: {
    backgroundColor: Sport.bgElevated,
    borderColor: Sport.line,
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chartTitle: {
    color: Sport.ink,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    flex: 1,
  },
  chartSubtitle: {
    color: Sport.mutedSoft,
    fontSize: 9,
    fontWeight: '800',
  },
  chartSvgWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  chartEmpty: {
    minHeight: 118,
    borderWidth: 1,
    borderColor: Sport.line,
    borderStyle: 'dashed',
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  chartEmptyText: {
    color: Sport.mutedSoft,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
  },
  compareCard: {
    backgroundColor: Sport.bgElevated,
    borderColor: Sport.line,
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  compareRow: { gap: 7 },
  compareHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  compareLabel: { color: Sport.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  compareValue: { color: Sport.ink, fontSize: 12, fontWeight: '900' },
  compareMuted: { color: Sport.mutedSoft, fontSize: 10, fontWeight: '800' },
  compareTrack: {
    height: 12,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(0,0,0,0.34)',
    overflow: 'hidden',
    position: 'relative',
  },
  compareAverageFill: {
    position: 'absolute',
    left: 0,
    top: 3,
    height: 6,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  compareCurrentFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: 12,
    borderRadius: Radius.pill,
  },
  historyGate: {
    backgroundColor: Sport.surface,
    borderWidth: 1,
    borderColor: Sport.line,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  historyGateTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  historyGateLabel: {
    color: Sport.muted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  historyGateTitle: {
    color: Sport.ink,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  historyGateCount: {
    color: Sport.amber,
    fontSize: 16,
    fontWeight: '900',
  },
  historyGateTrack: {
    height: 8,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(0,0,0,0.32)',
    overflow: 'hidden',
  },
  historyGateFill: {
    height: 8,
    borderRadius: Radius.pill,
    backgroundColor: Sport.amber,
  },
  historyGateBody: {
    color: Sport.inkSoft,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },

  // Topic Evidence data analysis graphic styling
  evidenceContainer: {
    backgroundColor: Sport.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Sport.line,
  },
  evidenceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  evidenceTitle: {
    color: Sport.ink,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  evidenceMetricsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    justifyContent: 'space-between',
    width: '100%',
  },
  evidenceMetricCard: {
    flex: 1,
    backgroundColor: Sport.bg,
    borderColor: Sport.line,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    gap: 4,
  },
  evidenceMetricCardActive: {
    borderColor: 'rgba(234,195,26,0.3)',
    backgroundColor: 'rgba(234,195,26,0.03)',
  },
  evidenceMetricCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  evidenceMetricLabel: {
    color: Sport.mutedSoft,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },
  evidenceMetricValue: {
    color: Sport.ink,
    fontSize: 22,
    fontWeight: '900',
  },
  evidenceMetricUnit: {
    color: Sport.muted,
    fontSize: 10,
    fontWeight: '800',
    marginLeft: 2,
  },
  evidenceLockIndicator: {
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  evidenceDeltaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderRadius: Radius.sm,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  evidenceDeltaText: {
    fontSize: 8,
    fontWeight: '900',
  },
  evidenceChartCard: {
    backgroundColor: Sport.bg,
    borderColor: Sport.line,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  evidenceChartTitle: {
    color: Sport.mutedSoft,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },
  evidenceChartBody: {
    height: 78,
    justifyContent: 'flex-end',
    position: 'relative',
    paddingTop: 10,
  },
  chartGridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  evidenceBarsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    width: '100%',
    height: '100%',
  },
  evidenceBarColumn: {
    alignItems: 'center',
    width: 45,
  },
  evidenceBarValue: {
    color: Sport.mutedSoft,
    fontSize: 8,
    fontWeight: '800',
    marginBottom: 4,
  },
  evidenceBarTrack: {
    height: 52,
    width: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  evidenceBarFill: {
    width: '100%',
    backgroundColor: Sport.mutedSoft,
    borderRadius: 6,
  },
  evidenceBarFillCurrent: {
    backgroundColor: Sport.amber,
    shadowColor: Sport.amber,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  evidenceBarFillBaseline: {
    backgroundColor: Sport.inkSoft,
  },
  evidenceBarFillLocked: {
    width: '100%',
    borderColor: Sport.lineStrong,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  evidenceBarLabel: {
    color: Sport.mutedSoft,
    fontSize: 8,
    fontWeight: '800',
    marginTop: 4,
  },
})
