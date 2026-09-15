import type { AppLanguage } from '@/lib/i18n/language'
import {
  getCoachCardFollowUpPrompt,
  getCoachDisplayDeck,
  getBasketballRoleLabel,
  getCoachInsightHeaderTitle,
  localizeCoachInsightCard,
} from './coachInputPresentation'
import type {
  BasketballRole,
  CoachActivityContextState,
  CoachInsightCard,
  CoachInsightGate,
  CoachInsightScore,
  CoachReportSignal,
  CoachStatBaseline,
  GetCoachActivityInsightsResult,
  BasketballStatLine,
  CoachBenchmarkFormat,
} from './coachTypes'

export type CoachReportStage =
  | CoachReportSummaryStage
  | CoachReportTopicStage
  | CoachReportFinalStage

export type CoachReportSummaryStage = {
  kind: 'summary'
  id: 'summary'
  title: string
  verdict: string
  chips: Array<{ id: string; label: string; tone: 'score' | 'stat' | 'history' | 'sensor' }>
}

export type CoachReportSummaryTakeaway = {
  id: 'scoring_share' | 'assist_turnover' | 'rebound_work' | 'personal_reference' | 'general_reference'
  label: string
  valueLabel: string
  body: string
  tone: 'score' | 'playmaking' | 'risk' | 'neutral'
}

export type CoachReportSummaryMetricCard = {
  key: BasketballFinalDataAxisKey
  label: string
  value: number | null
  valueLabel: string
  referenceLabel: string
  deltaLabel: string | null
  tone: 'positive' | 'risk' | 'neutral' | 'missing'
  highlighted: boolean
}

export type CoachReportProfileFact = {
  id: 'result' | 'format' | 'team_score' | 'sensor' | 'history'
  label: string
  value: string
}

export type CoachReportProfileStat = {
  key: BasketballFinalDataAxisKey
  label: string
  valueLabel: string
}

export type CoachReportProfileHexAxis = {
  key: BasketballFinalDataAxisKey
  label: string
  value: number | null
  valueLabel: string
  referenceValue: number | null
  referenceLabel: string
  score: number | null
  state: 'ready' | 'missing_current' | 'missing_reference'
  stateLabel: string
}

export type CoachReportProfileSummary = {
  eyebrow: string
  title: string
  roleLabel: string
  impactValue: string
  impactUnit: string
  facts: CoachReportProfileFact[]
  stats: CoachReportProfileStat[]
  hexAxes: CoachReportProfileHexAxis[]
}

export type CoachReportTopicStage = {
  kind: 'topic'
  id: string
  topic: CoachReportTopic
  requiredInputs: ReturnType<typeof getTopicRequiredInputs>
}

export type CoachReportFinalStage = {
  kind: 'final'
  id: 'final'
  title: string
  shareLine: string
  primarySignal: string
  nextCue: string
  optionalSections: CoachReportFinalBoardSection[]
}

export type CoachReportFinalBoardSectionId =
  | 'compare'
  | 'missing_inputs'
  | 'other_roles'
  | 'pro_reads'

export type CoachReportFinalBoardItem = {
  id: string
  title: string
  body: string
  sourceLabel: string
  scoreLabel: string | null
  gate: CoachInsightGate
  gateLabel: string | null
  role: BasketballRole | null
  requiredInputs: ReturnType<typeof getTopicRequiredInputs>
  topic: CoachReportTopic
}

export type CoachReportFinalBoardGroup = {
  id: string
  title: string
  role: BasketballRole | null
  items: CoachReportFinalBoardItem[]
}

export type CoachReportFinalBoardSection = {
  id: CoachReportFinalBoardSectionId
  title: string
  groups: CoachReportFinalBoardGroup[]
}

type ReportSectionId = 'summary' | 'compare' | 'role_reads' | 'more_reads' | 'pro_depth'

export type CoachReportSetupPrompt = {
  required: boolean
  needsRole: boolean
  needsStats: boolean
  needsSensorSync: boolean
  title: string
  body: string
  primaryActionLabel: string
}

export type CoachReportPreview = {
  title: string
  summary: string
  chips: CoachReportSignal[]
  ctaLabel: string
}

type CoachReportBenchmarkOptions = {
  benchmarkFormat?: CoachBenchmarkFormat | null
  ownTeamScore?: number | null
}

export type BasketballFinalDataAxisKey = keyof Pick<
  BasketballStatLine,
  | 'points'
  | 'twoPointersMade'
  | 'threePointersMade'
  | 'assists'
  | 'rebounds'
  | 'steals'
  | 'blocks'
  | 'freeThrowsMade'
>

export type BasketballFinalDataAxis = {
  key: BasketballFinalDataAxisKey
  label: string
  value: number | null
  valueLabel: string
  score: number
  referenceLabel: string | null
  state: 'logged' | 'missing'
}

export type BasketballFinalImpactBar = {
  id: BasketballFinalDataAxisKey | 'scoring_share'
  label: string
  value: number
  valueLabel: string
  score: number
  tone: 'score' | 'playmaking' | 'defense' | 'risk' | 'neutral'
}

export type BasketballBenchmarkComparison = {
  id: string
  level: 'web_general' | 'rally_population' | 'web_nba'
  title: string
  metricLabel: string
  valueLabel: string
  referenceLabel: string
  deltaLabel: string | null
  body: string
  status: 'ready' | 'missing'
  tone: 'positive' | 'risk' | 'neutral'
  statRows?: BasketballBenchmarkStatComparison[]
}

export type BasketballBenchmarkStatComparison = {
  key: BasketballFinalDataAxisKey
  label: string
  currentLabel: string
  referenceLabel: string
  deltaLabel: string | null
  status: 'ready' | 'missing_current' | 'missing_reference'
  tone: 'positive' | 'risk' | 'neutral'
}

export type BasketballFinalDataDesign = {
  eyebrow: string
  title: string
  subtitle: string
  axes: BasketballFinalDataAxis[]
  impactBars: BasketballFinalImpactBar[]
  benchmarkComparisons: BasketballBenchmarkComparison[]
  sourceLabels: string[]
}

type BasketballBenchmarkDefinition = {
  value: number
  unit: string
}

export type CoachReportTopic = {
  id: string
  card: CoachInsightCard
  sectionId: ReportSectionId
  title: string
  resultTitle: string
  body: string
  sourceLabel: string
  scoreLabel: string | null
  gate: CoachInsightGate
  gateLabel: string | null
  severity: CoachInsightCard['severity']
}

export type CoachReportSection = {
  id: ReportSectionId
  title: string
  cards: CoachReportTopic[]
}

export type CoachReportDetailBlock = {
  label: 'Verdict' | 'Evidence' | 'Next'
  text: string
}

export function buildCoachReportPreview(
  data: GetCoachActivityInsightsResult,
  language: AppLanguage = 'en',
): CoachReportPreview {
  const signalCount = data.reportSignals.length
  return {
    title: language === 'th' ? 'Coach Report' : 'Coach Report',
    summary:
      signalCount > 0
        ? language === 'th'
          ? `มี ${signalCount} สัญญาณพร้อมอ่าน`
          : `${signalCount} signals ready`
        : language === 'th'
          ? 'เปิดรายงานเพื่อเพิ่มข้อมูลที่ต้องใช้'
          : 'Open the report to add the needed inputs',
    chips: data.reportSignals.slice(0, 3),
    ctaLabel: language === 'th' ? 'เปิดรายงาน' : 'Open report',
  }
}

export function buildCoachReportSummaryTakeaways({
  data,
  ownTeamScore,
  benchmarkFormat,
  language = 'en',
}: {
  data: GetCoachActivityInsightsResult
  ownTeamScore?: number | null
  benchmarkFormat?: CoachBenchmarkFormat | null
  language?: AppLanguage
}): CoachReportSummaryTakeaway[] {
  const stats = data.currentContext?.basketballStats ?? {}
  const role = data.currentContext?.role ?? null
  const rows: CoachReportSummaryTakeaway[] = []
  const points = knownStat(stats.points)
  const teamScore = knownStat(ownTeamScore)
  const preferredFormat = normalizeBasketballBenchmarkFormat(benchmarkFormat)
  const generalSignals = buildRoleBenchmarkSignals({
    stats,
    role,
    level: 'web_general',
    benchmarkFormat: preferredFormat,
    baselines: data.statBaseline.benchmarkBaselines ?? [],
  })
  const generalPrimary = generalSignals[0] ?? null
  const generalRisk = generalSignals.find((signal) => signal.tone === 'risk') ?? null

  if (points != null && teamScore != null && teamScore > 0) {
    const share = clamp(Math.round((points / teamScore) * 100), 0, 100)
    rows.push({
      id: 'scoring_share',
      label: language === 'th' ? 'แต้มทีม' : 'Team points',
      valueLabel: `${share}%`,
      body:
        language === 'th'
          ? `${getBasketballRoleLabel(role ?? 'all_around', language, preferredFormat)} ทำ ${formatMetricNumber(points)} จาก ${formatMetricNumber(teamScore)} แต้มทีม อ่านเป็นสัดส่วนก่อน เพราะเกม Rally สั้นกว่าเกมเต็ม`
          : `${getBasketballRoleLabel(role ?? 'all_around', language, preferredFormat)} scored ${formatMetricNumber(points)} of ${formatMetricNumber(teamScore)} team points. Read share first because Rally games are shorter than full games.`,
      tone: 'score',
    })
  } else {
    const pointsAverage = knownStat(data.statBaseline.averages.points)
    if (points != null && pointsAverage != null) {
      const delta = Number((points - pointsAverage).toFixed(1))
      rows.push({
        id: 'personal_reference',
        label: language === 'th' ? 'เทียบค่าเฉลี่ย' : 'Vs average',
        valueLabel: `${delta >= 0 ? '+' : ''}${formatMetricNumber(delta)} PTS`,
        body:
          language === 'th'
            ? `PTS ${formatMetricNumber(points)} เทียบค่าเฉลี่ย ${formatMetricNumber(pointsAverage)} ของคุณ`
            : `PTS ${formatMetricNumber(points)} versus your ${formatMetricNumber(pointsAverage)} average.`,
        tone: delta >= 0 ? 'score' : 'neutral',
      })
    }
  }

  if (generalPrimary) {
    const formatLabel = benchmarkFormatLabel(preferredFormat, language)
    const roleLabel = getBasketballRoleLabel(role ?? 'all_around', language, preferredFormat)
    rows.push({
      id: 'general_reference',
      label: language === 'th' ? 'เทียบคนทั่วไป' : 'Vs general',
      valueLabel: `${generalPrimary.label} ${generalPrimary.deltaLabel}`,
      body:
        language === 'th'
          ? `${roleLabel} ${formatLabel}: ${benchmarkSignalPhrase(generalPrimary, language)}${generalRisk && generalRisk.id !== generalPrimary.id ? `, แต่ ${benchmarkSignalPhrase(generalRisk, language)}` : ''}`
          : `${roleLabel} ${formatLabel}: ${benchmarkSignalPhrase(generalPrimary, language)}${generalRisk && generalRisk.id !== generalPrimary.id ? `, but ${benchmarkSignalPhrase(generalRisk, language)}` : ''}.`,
      tone: generalPrimary.tone === 'risk' ? 'risk' : generalPrimary.tone === 'positive' ? 'playmaking' : 'neutral',
    })
  }

  const assists = knownStat(stats.assists)
  if (assists != null) {
    const safeAssists = assists ?? 0
    const ratioLabel = `${formatMetricNumber(safeAssists)} AST`
    rows.push({
      id: 'assist_turnover',
      label: language === 'th' ? 'สร้างแต้ม' : 'Playmaking',
      valueLabel: ratioLabel,
      body:
        language === 'th'
          ? `AST ${formatMetricNumber(safeAssists)} เป็นสัญญาณหลักของการสร้างแต้ม`
          : `AST ${formatMetricNumber(safeAssists)} is the main creation signal.`,
      tone: 'playmaking',
    })
  }

  const rebounds = knownStat(stats.rebounds)
  if (rebounds != null) {
    rows.push({
      id: 'rebound_work',
      label: language === 'th' ? 'ครองบอลเพิ่ม' : 'Possession work',
      valueLabel: `REB ${formatMetricNumber(rebounds)}`,
      body:
        language === 'th'
          ? `รีบาวด์ ${formatMetricNumber(rebounds)} คือ possession เพิ่ม ใช้คู่กับแต้มเพื่อดูว่าช่วยทีมครบแค่ไหน`
          : `${formatMetricNumber(rebounds)} rebounds add possessions. Read it with points to judge full team impact.`,
      tone: 'neutral',
    })
  }

  return rows.slice(0, 3)
}

export function buildCoachReportProfileSummary({
  data,
  ownTeamScore,
  benchmarkFormat,
  isWin,
  language = 'en',
}: {
  data: GetCoachActivityInsightsResult
  ownTeamScore?: number | null
  benchmarkFormat?: CoachBenchmarkFormat | null
  isWin?: boolean | null
  language?: AppLanguage
}): CoachReportProfileSummary {
  const stats = data.currentContext?.basketballStats ?? {}
  const role = data.currentContext?.role ?? 'all_around'
  const preferredFormat = normalizeBasketballBenchmarkFormat(benchmarkFormat)
  const primary = profilePrimaryImpact(stats, data, role)
  const statKeys = profileStatKeys(preferredFormat)
  const hexAxes = buildProfileHexAxes({
    stats,
    baseline: data.statBaseline,
    role,
    benchmarkFormat: preferredFormat,
  })

  return {
    eyebrow: language === 'th' ? 'รายงานแมตช์' : 'MATCH REPORT',
    title: language === 'th' ? 'แมตช์นี้ของคุณ' : 'Your Match',
    roleLabel: getBasketballRoleLabel(role, language, preferredFormat),
    impactValue: primary.valueLabel,
    impactUnit: primary.unit,
    facts: [
      {
        id: 'result',
        label: language === 'th' ? 'ผล' : 'RESULT',
        value: profileResultLabel(isWin, language),
      },
      {
        id: 'format',
        label: language === 'th' ? 'รูปแบบ' : 'FORMAT',
        value: profileFormatValue(preferredFormat, language),
      },
      {
        id: 'team_score',
        label: language === 'th' ? 'แต้มทีม' : 'TEAM PTS',
        value: ownTeamScore != null ? formatMetricNumber(ownTeamScore) : (language === 'th' ? 'ยังไม่มี' : 'NO SCORE'),
      },
      {
        id: 'sensor',
        label: language === 'th' ? 'เซนเซอร์' : 'SENSOR',
        value: profileSensorLabel(data.sensorState.status, language),
      },
      {
        id: 'history',
        label: language === 'th' ? 'ประวัติ' : 'HISTORY',
        value: profileHistoryLabel(data.statBaseline.sampleSize, language),
      },
    ],
    stats: statKeys.map((key) => ({
      key,
      label: profileStatLabel(key, preferredFormat),
      valueLabel: statValueLabel(stats[key]),
    })),
    hexAxes,
  }
}

export function buildCoachReportSummaryMetricCards({
  data,
  benchmarkFormat,
  language = 'en',
}: {
  data: GetCoachActivityInsightsResult
  ownTeamScore?: number | null
  benchmarkFormat?: CoachBenchmarkFormat | null
  language?: AppLanguage
}): CoachReportSummaryMetricCard[] {
  const stats = data.currentContext?.basketballStats ?? {}
  const role = data.currentContext?.role ?? 'all_around'
  const preferredFormat = normalizeBasketballBenchmarkFormat(benchmarkFormat)
  const roleOrder = finalImpactOrder(role, preferredFormat)
  const axisByKey = new Map(basketballFinalAxisConfigForFormat(preferredFormat).map((axis) => [axis.key, axis]))

  return roleOrder.map((key, index) => {
    const axis = axisByKey.get(key) ?? { key, label: axisUnit(key), scaleMax: 1 }
    const current = knownStat(stats[key])
    const reference = summaryMetricReference({
      baseline: data.statBaseline,
      metric: key,
      role,
      benchmarkFormat: preferredFormat,
      language,
    })
    const delta = current != null && reference != null ? Number((current - reference.value).toFixed(1)) : null
    return {
      key,
      label: axis.label,
      value: current,
      valueLabel: current == null ? '—' : formatMetricNumber(current),
      referenceLabel: reference?.label ?? (language === 'th' ? 'ยังไม่มีเกณฑ์' : 'No reference'),
      deltaLabel: delta == null ? null : formatSignedMetric(delta),
      tone: current == null ? 'missing' : delta == null ? 'neutral' : statComparisonTone(key, delta),
      highlighted: index < 3,
    }
  })
}

export function buildBasketballFinalDataDesign({
  data,
  ownTeamScore,
  benchmarkFormat,
  language = 'en',
}: {
  data: GetCoachActivityInsightsResult
  ownTeamScore?: number | null
  benchmarkFormat?: CoachBenchmarkFormat | null
  language?: AppLanguage
}): BasketballFinalDataDesign {
  const role = data.currentContext?.role ?? null
  const stats = data.currentContext?.basketballStats ?? {}
  const preferredFormat = normalizeBasketballBenchmarkFormat(benchmarkFormat)
  const axes = basketballFinalAxisConfigForFormat(preferredFormat).map((axis) => {
    const value = knownStat(stats[axis.key])
    const reference = finalDataReference(axis.key, data.statBaseline, language, role, preferredFormat)
    const scaleMax = Math.max(axis.scaleMax, reference?.value ?? 0, value ?? 0, 1)
    return {
      key: axis.key,
      label: axis.label,
      value,
      valueLabel: value == null ? '—' : formatMetricNumber(value),
      score: value == null ? 0 : clamp(Math.round((value / scaleMax) * 100), 0, 100),
      referenceLabel: reference?.label ?? null,
      state: value == null ? 'missing' as const : 'logged' as const,
    }
  })

  const impactBars = buildBasketballFinalImpactBars(stats, role, ownTeamScore, preferredFormat)
  const benchmarkComparisons = buildBasketballBenchmarkComparisons(data, language, ownTeamScore, preferredFormat)
  const sourceLabels = [
    data.statBaseline.sampleSize >= data.statBaseline.minimumSample && data.statBaseline.scope !== 'none'
      ? language === 'th'
        ? `ค่าเฉลี่ยคุณ ${data.statBaseline.sampleSize} เกม`
        : `Personal avg ${data.statBaseline.sampleSize} games`
      : null,
    ...data.statBaseline.benchmarkBaselines
      ?.filter((benchmark) => benchmark.level === 'web_nba' || benchmark.level === 'web_general')
      .map((benchmark) => benchmark.level === 'web_nba' ? 'Pro scale' : 'Web benchmark') ?? [],
  ].filter((label): label is string => Boolean(label))

  return {
    eyebrow: language === 'th' ? 'DATA DESIGN' : 'DATA DESIGN',
    title: language === 'th' ? 'แผงสถิติบาส 8 เหลี่ยม' : 'Basketball octagon board',
    subtitle:
      impactBars.length > 0
        ? language === 'th'
          ? 'กราฟนี้ใช้เฉพาะสถิติที่คุณกรอกจริง'
          : 'This board only uses stats you actually logged.'
        : language === 'th'
          ? 'เพิ่มสถิติหลังเกมเพื่อให้กราฟมีน้ำหนักขึ้น'
          : 'Add post-game stats to power this board.',
    axes,
    impactBars,
    benchmarkComparisons,
    sourceLabels: [...new Set(sourceLabels)].slice(0, 3),
  }
}

export function buildCoachReportStages(
  data: GetCoachActivityInsightsResult,
  language: AppLanguage = 'en',
  options: CoachReportBenchmarkOptions = {},
): CoachReportStage[] {
  const { primaryTopics, extraTopics } = getCoachReportStageTopics(data, language)
  const mainImpactTopics = primaryTopics.filter((topic) => isMainImpactTopic(topic, data.currentContext))
  const mainImpactIds = new Set(mainImpactTopics.map((topic) => topic.id))
  const optionalTopics = normalizeReportTopics(
    [...primaryTopics, ...extraTopics].filter((topic) => !mainImpactIds.has(topic.id)),
  )

  const chips = buildSummaryChips(data, language)

  const summaryStage: CoachReportSummaryStage = {
    kind: 'summary',
    id: 'summary',
    title: language === 'th' ? 'สรุปแมตช์' : 'Match Summary',
    verdict: buildSummaryVerdict(data, language, options),
    chips,
  }

  const finalStage: CoachReportFinalStage = {
    kind: 'final',
    id: 'final',
    title: language === 'th' ? 'จบการวิเคราะห์' : 'Analysis Complete',
    shareLine: language === 'th' ? 'เตรียมแชร์ความก้าวหน้า' : 'Ready to share your progress',
    primarySignal: data.reportSignals[0]?.label ?? (language === 'th' ? 'เกมที่ดี' : 'Good game'),
    nextCue: language === 'th' ? 'ลุยต่อแมตช์หน้า' : 'Ready for the next match',
    optionalSections: buildFinalBoardOptionalSections(optionalTopics, data, language),
  }

  const primaryTopicStages: CoachReportTopicStage[] = mainImpactTopics.map((topic) => ({
    kind: 'topic',
    id: topic.id,
    topic,
    requiredInputs: getTopicRequiredInputs(topic, data.currentContext),
  }))

  return [summaryStage, ...primaryTopicStages, finalStage]
}

function isMainImpactTopic(
  topic: CoachReportTopic,
  context: CoachActivityContextState | null,
): boolean {
  if (topic.gate === 'pro_locked') return false
  if (topic.id === 'sensor_coach_read' && topic.card.source === 'sensor') return true
  if (topic.card.source !== 'context') return false
  if (topic.card.type !== 'training_cue') return false
  if (!topic.id.startsWith('cue_')) return false
  return isRoleTopic(topic.id, context)
}

function buildFinalBoardOptionalSections(
  topics: CoachReportTopic[],
  data: GetCoachActivityInsightsResult,
  language: AppLanguage,
): CoachReportFinalBoardSection[] {
  const context = data.currentContext
  const consumed = new Set<string>()
  const sections: CoachReportFinalBoardSection[] = []

  const proItems = topics
    .filter((topic) => topic.gate === 'pro_locked' || topic.card.locked)
    .map((topic) => toFinalBoardItem(topic, context))
  pushSingleGroupSection({
    sections,
    id: 'pro_reads',
    title: language === 'th' ? 'Pro reads' : 'Pro reads',
    groupTitle: language === 'th' ? 'ล็อกไว้สำหรับ Pro' : 'Locked for Pro',
    items: proItems,
    consumed,
  })

  const missingItems = topics
    .filter((topic) =>
      !consumed.has(topic.id) &&
      topic.gate !== 'none' &&
      topic.gate !== 'pro_locked'
    )
    .map((topic) => toFinalBoardItem(topic, context))
  pushGroupedSection({
    sections,
    id: 'missing_inputs',
    title: language === 'th' ? 'ต้องกรอกเพิ่ม' : 'Needs input',
    groups: groupItemsByRequiredInput(missingItems, language),
    consumed,
  })

  const currentRole = context?.role ?? null
  const offRoleItems = topics
    .filter((topic) => !consumed.has(topic.id))
    .map((topic) => toFinalBoardItem(topic, context))
    .filter((item) => item.role != null && item.role !== currentRole && item.gate === 'none')
  pushGroupedSection({
    sections,
    id: 'other_roles',
    title: language === 'th' ? 'การ์ดสายอื่น' : 'Other role reads',
    groups: groupItemsByRole(offRoleItems, language),
    consumed,
  })

  const compareItems = topics
    .filter((topic) => !consumed.has(topic.id))
    .filter((topic) =>
      topic.card.type === 'form' ||
      topic.card.type === 'head_to_head' ||
      topic.card.source === 'benchmark' ||
      topic.card.source === 'sensor' ||
      topic.card.type === 'effort'
    )
    .map((topic) => toFinalBoardItem(topic, context))
  pushSingleGroupSection({
    sections,
    id: 'compare',
    title: language === 'th' ? 'เทียบตัวเอง / เกณฑ์' : 'Compare',
    groupTitle: language === 'th' ? 'ข้อมูลเทียบ' : 'Comparison reads',
    items: compareItems,
    consumed,
  })

  return sortFinalBoardSections(sections)
}

function toFinalBoardItem(
  topic: CoachReportTopic,
  context: CoachActivityContextState | null,
): CoachReportFinalBoardItem {
  return {
    id: topic.id,
    title: topic.gate === 'none' ? topic.resultTitle : topic.title,
    body: topic.body,
    sourceLabel: topic.sourceLabel,
    scoreLabel: topic.scoreLabel,
    gate: topic.gate,
    gateLabel: topic.gateLabel,
    role: getTopicRole(topic.id),
    requiredInputs: getTopicRequiredInputs(topic, context),
    topic,
  }
}

function pushSingleGroupSection({
  sections,
  id,
  title,
  groupTitle,
  items,
  consumed,
}: {
  sections: CoachReportFinalBoardSection[]
  id: CoachReportFinalBoardSectionId
  title: string
  groupTitle: string
  items: CoachReportFinalBoardItem[]
  consumed: Set<string>
}) {
  if (items.length === 0) return
  for (const item of items) consumed.add(item.id)
  sections.push({
    id,
    title,
    groups: [
      {
        id,
        title: groupTitle,
        role: null,
        items,
      },
    ],
  })
}

function pushGroupedSection({
  sections,
  id,
  title,
  groups,
  consumed,
}: {
  sections: CoachReportFinalBoardSection[]
  id: CoachReportFinalBoardSectionId
  title: string
  groups: CoachReportFinalBoardGroup[]
  consumed: Set<string>
}) {
  const nonEmptyGroups = groups.filter((group) => group.items.length > 0)
  if (nonEmptyGroups.length === 0) return
  for (const group of nonEmptyGroups) {
    for (const item of group.items) consumed.add(item.id)
  }
  sections.push({ id, title, groups: nonEmptyGroups })
}

function groupItemsByRole(
  items: CoachReportFinalBoardItem[],
  language: AppLanguage,
): CoachReportFinalBoardGroup[] {
  const roleOrder: BasketballRole[] = ['handler', 'defender', 'big', 'all_around', 'shooter']
  return roleOrder
    .map((role) => ({
      id: role,
      title: getBasketballRoleLabel(role, language),
      role,
      items: items.filter((item) => item.role === role),
    }))
    .filter((group) => group.items.length > 0)
}

function groupItemsByRequiredInput(
  items: CoachReportFinalBoardItem[],
  language: AppLanguage,
): CoachReportFinalBoardGroup[] {
  const statItems = items.filter((item) => item.requiredInputs.kind === 'stats')
  const roleItems = items.filter((item) => item.requiredInputs.kind === 'role')
  const sensorItems = items.filter((item) => item.requiredInputs.kind === 'sensor')
  const otherItems = items.filter((item) => item.requiredInputs.kind === 'none')
  return [
    {
      id: 'stats',
      title: language === 'th' ? 'เพิ่มสถิติ' : 'Add stats',
      role: null,
      items: statItems,
    },
    {
      id: 'role',
      title: language === 'th' ? 'เลือก Role' : 'Pick role',
      role: null,
      items: roleItems,
    },
    {
      id: 'sensor',
      title: language === 'th' ? 'ซิงก์อุปกรณ์' : 'Sync device',
      role: null,
      items: sensorItems,
    },
    {
      id: 'other_input',
      title: language === 'th' ? 'ข้อมูลเพิ่มเติม' : 'More input',
      role: null,
      items: otherItems,
    },
  ].filter((group) => group.items.length > 0)
}

function sortFinalBoardSections(sections: CoachReportFinalBoardSection[]): CoachReportFinalBoardSection[] {
  const order: Record<CoachReportFinalBoardSectionId, number> = {
    missing_inputs: 0,
    compare: 1,
    other_roles: 2,
    pro_reads: 3,
  }
  return [...sections].sort((a, b) => order[a.id] - order[b.id])
}

function getTopicRole(topicId: string): BasketballRole | null {
  if (topicId.startsWith('cue_handler_')) return 'handler'
  if (topicId.startsWith('cue_shooter_')) return 'shooter'
  if (topicId.startsWith('cue_defender_')) return 'defender'
  if (topicId.startsWith('cue_big_')) return 'big'
  if (topicId.startsWith('cue_all_around_')) return 'all_around'
  return null
}

export function getCoachReportSetupPrompt(
  data: GetCoachActivityInsightsResult,
  language: AppLanguage = 'en',
): CoachReportSetupPrompt {
  const context = data.currentContext
  const stats = context?.basketballStats ?? {}
  const needsRole = !context?.role
  const needsStats = !Object.values(stats).some((value) => typeof value === 'number' && Number.isFinite(value))
  const needsSensorSync = data.sensorState.status === 'needs_sync' || data.sensorState.status === 'needs_permission'
  return {
    required: needsRole || needsStats,
    needsRole,
    needsStats,
    needsSensorSync,
    title: language === 'th' ? 'กรอกข้อมูลก่อนวิเคราะห์' : 'Add inputs before analysis',
    body:
      language === 'th'
        ? 'เลือก Role, ใส่สถิติที่จดไว้จริง และให้ Rally ซิงก์ข้อมูลอุปกรณ์เท่าที่มี'
        : 'Pick a role, add tracked stats, and let Rally sync available device data.',
    primaryActionLabel: language === 'th' ? 'บันทึกแล้วเริ่มอ่าน' : 'Save and start reading',
  }
}

const BASKETBALL_FINAL_AXIS_CONFIG: Array<{
  key: BasketballFinalDataAxisKey
  label: string
  scaleMax: number
}> = [
  { key: 'points', label: 'PTS', scaleMax: 24 },
  { key: 'twoPointersMade', label: '2PT', scaleMax: 8 },
  { key: 'threePointersMade', label: '3PM', scaleMax: 6 },
  { key: 'assists', label: 'AST', scaleMax: 8 },
  { key: 'rebounds', label: 'REB', scaleMax: 12 },
  { key: 'steals', label: 'STL', scaleMax: 4 },
  { key: 'blocks', label: 'BLK', scaleMax: 4 },
  { key: 'freeThrowsMade', label: 'FT', scaleMax: 8 },
]

const PROFILE_HEX_TARGET_SCORE = 70

function basketballFinalAxisConfigForFormat(
  benchmarkFormat?: CoachBenchmarkFormat | null,
): typeof BASKETBALL_FINAL_AXIS_CONFIG {
  if (benchmarkFormat === '3x3') {
    return BASKETBALL_FINAL_AXIS_CONFIG.filter((axis) => axis.key !== 'threePointersMade')
  }
  return BASKETBALL_FINAL_AXIS_CONFIG
}

const MOBILE_GENERAL_PICKUP_ROLE_PRIOR: Record<BasketballRole, Record<BasketballFinalDataAxisKey, number>> = {
  handler: {
    points: 5.5,
    twoPointersMade: 1.1,
    threePointersMade: 0.8,
    assists: 3.5,
    rebounds: 3.0,
    steals: 1.0,
    blocks: 0.3,
    freeThrowsMade: 1.0,
  },
  shooter: {
    points: 7.0,
    twoPointersMade: 0.3,
    threePointersMade: 1.8,
    assists: 1.8,
    rebounds: 2.8,
    steals: 0.8,
    blocks: 0.2,
    freeThrowsMade: 1.1,
  },
  defender: {
    points: 4.5,
    twoPointersMade: 1.2,
    threePointersMade: 0.5,
    assists: 1.8,
    rebounds: 4.0,
    steals: 1.6,
    blocks: 0.9,
    freeThrowsMade: 0.7,
  },
  big: {
    points: 6.0,
    twoPointersMade: 2.1,
    threePointersMade: 0.2,
    assists: 1.2,
    rebounds: 5.8,
    steals: 0.6,
    blocks: 1.3,
    freeThrowsMade: 1.2,
  },
  all_around: {
    points: 5.8,
    twoPointersMade: 1.1,
    threePointersMade: 0.9,
    assists: 2.6,
    rebounds: 3.8,
    steals: 1.0,
    blocks: 0.5,
    freeThrowsMade: 1.0,
  },
}

const MOBILE_GENERAL_FORMAT_MULTIPLIER: Record<Extract<CoachBenchmarkFormat, 'rally_pickup' | '3x3' | '5v5'>, Record<BasketballFinalDataAxisKey, number>> = {
  rally_pickup: {
    points: 1,
    twoPointersMade: 1,
    threePointersMade: 1,
    assists: 1,
    rebounds: 1,
    steals: 1,
    blocks: 1,
    freeThrowsMade: 1,
  },
  '3x3': {
    points: 1.05,
    twoPointersMade: 1.1,
    threePointersMade: 0.95,
    assists: 0.85,
    rebounds: 0.85,
    steals: 0.9,
    blocks: 0.85,
    freeThrowsMade: 0.8,
  },
  '5v5': {
    points: 1.25,
    twoPointersMade: 1.2,
    threePointersMade: 1.25,
    assists: 1.15,
    rebounds: 1.15,
    steals: 1.1,
    blocks: 1.1,
    freeThrowsMade: 1.25,
  },
}

function mobileGeneralRolePrior(
  role: BasketballRole,
  metric: BasketballFinalDataAxisKey,
  benchmarkFormat: CoachBenchmarkFormat,
): number {
  const format = benchmarkFormat === '3x3' || benchmarkFormat === '5v5' ? benchmarkFormat : 'rally_pickup'
  const sourceMetric = format === '3x3' && metric === 'twoPointersMade' ? 'threePointersMade' : metric
  const base = MOBILE_GENERAL_PICKUP_ROLE_PRIOR[role][sourceMetric]
  return Number((base * MOBILE_GENERAL_FORMAT_MULTIPLIER[format][sourceMetric]).toFixed(1))
}

function getCoachReportStageTopics(
  data: GetCoachActivityInsightsResult,
  language: AppLanguage,
): { primaryTopics: CoachReportTopic[]; extraTopics: CoachReportTopic[] } {
  const context = data.currentContext
  const cards = data.entitlement.hasPro ? data.cards : data.previewCards
  const derivedCards = buildDerivedStatTopicCards(context, language)
  const existingIds = new Set(cards.map((card) => card.id))
  const allCards = [
    ...cards,
    ...derivedCards.filter((card) => !existingIds.has(card.id)),
  ]
  const deck = getCoachDisplayDeck({
    cards: allCards,
    context,
    missingInputs: data.missingInputs,
    hasPro: data.entitlement.hasPro,
    language,
  })
  const h2hSparseTopic = buildHeadToHeadSparseTopic(data, language)

  const primaryTopics = normalizeReportTopics(
    deck.visibleCards
      .filter((card) => shouldIncludeReportCard(card, context))
      .map((card) => toReportTopic(card, context, data.missingInputs, language, data.statBaseline)),
  )
  const rawExtraTopics = normalizeReportTopics(
    deck.moreCards
      .filter((card) => shouldIncludeReportCard(card, context))
      .map((card) => toReportTopic(card, context, data.missingInputs, language, data.statBaseline)),
  )
  const benchmarkTopics = rawExtraTopics.filter((topic) => topic.card.source === 'benchmark')
  const extraTopics = rawExtraTopics.filter((topic) => topic.card.source !== 'benchmark')
  primaryTopics.push(...benchmarkTopics)

  if (h2hSparseTopic && ![...primaryTopics, ...extraTopics].some((topic) => topic.card.type === 'head_to_head')) {
    primaryTopics.push(h2hSparseTopic)
  }

  return { primaryTopics, extraTopics }
}

function shouldIncludeReportCard(
  card: CoachInsightCard,
  context: CoachActivityContextState | null,
): boolean {
  if (card.id !== 'cue_free_throws') return true
  return typeof context?.basketballStats?.freeThrowsMade === 'number'
}

function formatMetricNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function statValueLabel(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? formatMetricNumber(value) : '—'
}

function formatSignedMetric(value: number): string {
  if (value === 0) return '0'
  const formatted = formatMetricNumber(value)
  return value > 0 ? `+${formatted}` : formatted
}

function knownStat(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function normalizeBasketballBenchmarkFormat(
  format: string | null | undefined,
  teamSize?: number | null,
): CoachBenchmarkFormat {
  const normalized = format?.trim().toLowerCase().replace(/_/g, '-')
  if (normalized === '5v5' || normalized === '5x5' || teamSize === 5) return '5v5'
  if (normalized === '3v3' || normalized === '3x3' || teamSize === 3) return '3x3'
  if (normalized === 'rally-pickup' || normalized === 'pickup' || normalized === 'rally_pickup') return 'rally_pickup'
  return 'rally_pickup'
}

function benchmarkFormatLabel(format: CoachBenchmarkFormat, language: AppLanguage): string {
  if (format === 'rally_pickup') return language === 'th' ? 'pickup' : 'pickup'
  if (format === '3x3') return '3x3'
  if (format === '5v5') return '5v5'
  return language === 'th' ? 'pickup' : 'pickup'
}

function profilePrimaryImpact(
  stats: BasketballStatLine,
  data: GetCoachActivityInsightsResult,
  role: BasketballRole,
): { valueLabel: string; unit: string } {
  const preferredMetric = role === 'handler'
    ? 'assists'
    : role === 'big'
      ? 'rebounds'
      : role === 'defender'
        ? (knownStat(stats.blocks) != null ? 'blocks' : 'steals')
        : 'points'
  const preferredValue = stats[preferredMetric]
  if (typeof preferredValue === 'number' && Number.isFinite(preferredValue)) {
    return { valueLabel: formatMetricNumber(preferredValue), unit: profileStatLabel(preferredMetric, 'rally_pickup') }
  }

  if (typeof stats.points === 'number' && Number.isFinite(stats.points)) {
    return { valueLabel: formatMetricNumber(stats.points), unit: 'PTS' }
  }

  const sensorSignal = data.reportSignals.find((signal) => signal.id === 'sensor_intensity' && typeof signal.value === 'number')
  if (typeof sensorSignal?.value === 'number' && Number.isFinite(sensorSignal.value)) {
    return { valueLabel: formatMetricNumber(sensorSignal.value), unit: 'EFFORT' }
  }

  return { valueLabel: '—', unit: 'READ' }
}

function profileStatKeys(format: CoachBenchmarkFormat): BasketballFinalDataAxisKey[] {
  return format === '3x3'
    ? ['points', 'twoPointersMade', 'assists', 'rebounds']
    : ['points', 'threePointersMade', 'assists', 'rebounds']
}

function profileHexStatKeys(format: CoachBenchmarkFormat): BasketballFinalDataAxisKey[] {
  return format === '3x3'
    ? ['points', 'twoPointersMade', 'assists', 'rebounds', 'steals', 'blocks']
    : ['points', 'threePointersMade', 'assists', 'rebounds', 'steals', 'blocks']
}

function buildProfileHexAxes({
  stats,
  baseline,
  role,
  benchmarkFormat,
}: {
  stats: BasketballStatLine
  baseline: CoachStatBaseline
  role: BasketballRole
  benchmarkFormat: CoachBenchmarkFormat
}): CoachReportProfileHexAxis[] {
  return profileHexStatKeys(benchmarkFormat).map((key) => {
    const current = knownStat(stats[key])
    const reference = profileHexReference(baseline, key, role, benchmarkFormat)
    const hasReference = reference != null && reference.value > 0
    const score = current != null && hasReference && reference ? profileHexScore(current, reference.value) : null
    const state: CoachReportProfileHexAxis['state'] =
      current == null ? 'missing_current' : hasReference ? 'ready' : 'missing_reference'
    return {
      key,
      label: profileStatLabel(key, benchmarkFormat),
      value: current,
      valueLabel: statValueLabel(current),
      referenceValue: reference?.value ?? null,
      referenceLabel: reference ? `Role scale ${formatMetricNumber(reference.value)}` : 'Role scale pending',
      score,
      state,
      stateLabel: state === 'missing_current' ? 'No data' : state === 'missing_reference' ? 'Role scale pending' : 'Role scale',
    }
  })
}

function profileHexReference(
  baseline: CoachStatBaseline,
  metric: BasketballFinalDataAxisKey,
  role: BasketballRole,
  benchmarkFormat: CoachBenchmarkFormat,
): BasketballBenchmarkDefinition | null {
  const baselines = baseline.benchmarkBaselines ?? []
  const rally = selectBenchmarkForScale(baselines, 'rally_population', metric, role, benchmarkFormat)
  if (rally) return rally
  return selectBenchmarkForScale(baselines, 'web_general', metric, role, benchmarkFormat)
    ?? fallbackBenchmarkForScale('web_general', profileHexFallbackMetric(metric, benchmarkFormat), role, benchmarkFormat)
    ?? selectBenchmarkForScale(baselines, 'web_nba', metric, role, benchmarkFormat)
}

function profileHexFallbackMetric(
  metric: BasketballFinalDataAxisKey,
  benchmarkFormat: CoachBenchmarkFormat,
): BasketballFinalDataAxisKey {
  return benchmarkFormat === '3x3' && metric === 'twoPointersMade' ? 'threePointersMade' : metric
}

function profileHexScore(current: number, reference: number): number {
  if (reference <= 0) return current > 0 ? 100 : 0
  return clamp(Math.round((current / reference) * PROFILE_HEX_TARGET_SCORE), 0, 100)
}

function profileStatLabel(metric: BasketballFinalDataAxisKey, format: CoachBenchmarkFormat): string {
  if (metric === 'points') return 'PTS'
  if (metric === 'twoPointersMade') return format === '3x3' ? '2PT' : '2PT'
  if (metric === 'threePointersMade') return '3PM'
  if (metric === 'assists') return 'AST'
  if (metric === 'rebounds') return 'REB'
  if (metric === 'steals') return 'STL'
  if (metric === 'blocks') return 'BLK'
  if (metric === 'freeThrowsMade') return 'FT'
  return String(metric)
}

function profileResultLabel(isWin: boolean | null | undefined, language: AppLanguage): string {
  if (isWin === true) return language === 'th' ? 'ชนะ' : 'WIN'
  if (isWin === false) return language === 'th' ? 'แพ้' : 'LOSS'
  return language === 'th' ? 'บันทึกแล้ว' : 'RECORDED'
}

function profileFormatValue(format: CoachBenchmarkFormat, language: AppLanguage): string {
  if (format === '3x3') return '3x3'
  if (format === '5v5') return '5v5'
  return benchmarkFormatLabel(format, language).toUpperCase()
}

function profileSensorLabel(status: GetCoachActivityInsightsResult['sensorState']['status'], language: AppLanguage): string {
  if (status === 'available') return language === 'th' ? 'ซิงก์แล้ว' : 'SYNCED'
  if (status === 'needs_permission') return language === 'th' ? 'รออนุญาต' : 'PERMISSION'
  if (status === 'pro_locked') return 'PRO'
  if (status === 'unsupported') return language === 'th' ? 'ไม่รองรับ' : 'UNSUPPORTED'
  return language === 'th' ? 'ยังไม่มี' : 'NO DEVICE'
}

function profileHistoryLabel(sampleSize: number, language: AppLanguage): string {
  if (sampleSize <= 0) return language === 'th' ? 'ยังไม่มี' : 'NO HISTORY'
  if (language === 'th') return `${sampleSize} แมตช์`
  return `${sampleSize} ${sampleSize === 1 ? 'MATCH' : 'MATCHES'}`
}

function finalDataReference(
  metric: BasketballFinalDataAxisKey,
  baseline: CoachStatBaseline,
  language: AppLanguage,
  role: BasketballRole | null,
  benchmarkFormat: CoachBenchmarkFormat,
): { value: number; label: string } | null {
  const hasPersonalBaseline = baseline.sampleSize >= baseline.minimumSample && baseline.scope !== 'none'
  const personalAverage = (baseline.averages ?? {})[metric]
  if (hasPersonalBaseline && typeof personalAverage === 'number' && Number.isFinite(personalAverage)) {
    return {
      value: personalAverage,
      label: `avg ${formatMetricNumber(personalAverage)}`,
    }
  }

  const benchmark = findRoleAwareBenchmark(baseline.benchmarkBaselines ?? [], metric, role, benchmarkFormat)
  if (benchmark) {
    const label =
      benchmark.level === 'rally_population'
        ? `Rally ${getBasketballRoleLabel(role ?? 'all_around', 'en', benchmarkFormat)}`
        : benchmark.level === 'web_nba'
          ? `Pro ${getBasketballRoleLabel(role ?? 'all_around', 'en', benchmarkFormat)}`
          : language === 'th'
            ? 'เว็บ'
            : 'web'
    return {
      value: benchmark.value,
      label: `${label} ${formatMetricNumber(benchmark.value)}`,
    }
  }

  const fallback = role ? fallbackBenchmarkForScale('web_general', metric, role, benchmarkFormat) : null
  if (!fallback) return null
  const label = language === 'th' ? 'เว็บ' : 'web'
  return {
    value: fallback.value,
    label: `${label} ${formatMetricNumber(fallback.value)}`,
  }
}

function summaryMetricReference({
  baseline,
  metric,
  role,
  benchmarkFormat,
  language,
}: {
  baseline: CoachStatBaseline
  metric: BasketballFinalDataAxisKey
  role: BasketballRole
  benchmarkFormat: CoachBenchmarkFormat
  language: AppLanguage
}): { value: number; label: string } | null {
  const hasPersonalBaseline = baseline.sampleSize >= baseline.minimumSample && baseline.scope !== 'none'
  const personalAverage = (baseline.averages ?? {})[metric]
  if (hasPersonalBaseline && typeof personalAverage === 'number' && Number.isFinite(personalAverage)) {
    return {
      value: personalAverage,
      label: `avg ${formatMetricNumber(personalAverage)}`,
    }
  }

  const baselines = baseline.benchmarkBaselines ?? []
  const general = selectBenchmarkForScale(baselines, 'web_general', metric, role, benchmarkFormat)
    ?? fallbackBenchmarkForScale('web_general', metric, role, benchmarkFormat)
  if (general) {
    return {
      value: general.value,
      label: `${benchmarkStatPrefix('web_general', language)} ${formatMetricNumber(general.value)}`,
    }
  }

  const rally = selectBenchmarkForScale(baselines, 'rally_population', metric, role, benchmarkFormat)
  if (rally) {
    return {
      value: rally.value,
      label: `${benchmarkStatPrefix('rally_population', language)} ${formatMetricNumber(rally.value)}`,
    }
  }

  const pro = selectBenchmarkForScale(baselines, 'web_nba', metric, role, benchmarkFormat)
  if (pro) {
    return {
      value: pro.value,
      label: `${benchmarkStatPrefix('web_nba', language)} ${formatMetricNumber(pro.value)}`,
    }
  }

  return null
}

function findRoleAwareBenchmark(
  benchmarks: CoachStatBaseline['benchmarkBaselines'],
  metric: BasketballFinalDataAxisKey,
  role: BasketballRole | null,
  benchmarkFormat: CoachBenchmarkFormat,
) {
  const candidates = (benchmarks ?? []).filter((candidate) =>
    candidate.metric === benchmarkMetricForScale(metric, candidate.level, benchmarkFormat) &&
    (candidate.level === 'rally_population' || candidate.level === 'web_nba' || candidate.level === 'web_general') &&
    candidate.sport === 'basketball'
  ).sort((a, b) => benchmarkLevelPriority(a.level) - benchmarkLevelPriority(b.level))
  if (role != null) {
    return candidates.find((candidate) =>
      candidate.role === role &&
      benchmarkMatchesPreferredFormat(candidate, benchmarkFormat)
    ) ??
      null
  }
  return null
}

function benchmarkLevelPriority(level: NonNullable<CoachStatBaseline['benchmarkBaselines']>[number]['level']): number {
  if (level === 'rally_population') return 0
  if (level === 'web_nba') return 1
  return 2
}

function buildBasketballFinalImpactBars(
  stats: BasketballStatLine,
  role: CoachActivityContextState['role'],
  ownTeamScore: number | null | undefined,
  benchmarkFormat: CoachBenchmarkFormat,
): BasketballFinalImpactBar[] {
  const bars = new Map<BasketballFinalImpactBar['id'], BasketballFinalImpactBar>()
  const points = knownStat(stats.points)
  if (points != null && typeof ownTeamScore === 'number' && ownTeamScore > 0) {
    const share = clamp(Math.round((points / ownTeamScore) * 100), 0, 100)
    bars.set('scoring_share', {
      id: 'scoring_share',
      label: 'PTS share',
      value: share,
      valueLabel: `${share}%`,
      score: share,
      tone: 'score',
    })
  }

  const axisConfig = basketballFinalAxisConfigForFormat(benchmarkFormat)
  for (const key of finalImpactOrder(role, benchmarkFormat)) {
    const axis = axisConfig.find((candidate) => candidate.key === key)
    const value = knownStat(stats[key])
    if (!axis || value == null) continue
    bars.set(key, {
      id: key,
      label: axis.label,
      value,
      valueLabel: formatMetricNumber(value),
      score: clamp(Math.round((value / Math.max(axis.scaleMax, value, 1)) * 100), 0, 100),
      tone: finalImpactTone(key),
    })
  }

  return [...bars.values()].slice(0, 5)
}

function buildBasketballBenchmarkComparisons(
  data: GetCoachActivityInsightsResult,
  language: AppLanguage,
  _ownTeamScore: number | null | undefined,
  benchmarkFormat: CoachBenchmarkFormat,
): BasketballBenchmarkComparison[] {
  const stats = data.currentContext?.basketballStats ?? {}
  const role = data.currentContext?.role ?? null
  const baselines = data.statBaseline.benchmarkBaselines ?? []
  const comparisons: BasketballBenchmarkComparison[] = [
    buildBenchmarkScaleComparison({
      level: 'web_general',
      role,
      stats,
      baselines,
      language,
      benchmarkFormat,
    }),
    buildBenchmarkScaleComparison({
      level: 'rally_population',
      role,
      stats,
      baselines,
      language,
      benchmarkFormat,
    }),
    buildBenchmarkScaleComparison({
      level: 'web_nba',
      role,
      stats,
      baselines,
      language,
      benchmarkFormat,
    }),
  ]

  return comparisons
}

function buildBenchmarkScaleComparison(input: {
  level: BasketballBenchmarkComparison['level']
  role: BasketballRole | null
  stats: BasketballStatLine
  baselines: CoachStatBaseline['benchmarkBaselines']
  language: AppLanguage
  benchmarkFormat: CoachBenchmarkFormat
}): BasketballBenchmarkComparison {
  const role = input.role ?? 'all_around'
  const roleLabel = getBasketballRoleLabel(role, 'en', input.benchmarkFormat)
  const axisConfig = basketballFinalAxisConfigForFormat(input.benchmarkFormat)
  const statRows = input.level === 'rally_population' && !hasLevelBenchmark(input.baselines ?? [], input.level, role, input.benchmarkFormat)
    ? []
    : axisConfig.map((axis) =>
      buildBenchmarkStatComparison({
        level: input.level,
        role,
        metric: axis.key,
        label: axis.label,
        current: knownStat(input.stats[axis.key]),
        baselines: input.baselines ?? [],
        language: input.language,
        benchmarkFormat: input.benchmarkFormat,
      })
    )
  const readyRows = statRows.filter((row) => row.status === 'ready')
  const missingReference = statRows.length === 0 || statRows.every((row) => row.status === 'missing_reference')
  const title = benchmarkScaleTitle(input.level, roleLabel, input.language, input.benchmarkFormat)
  const referenceLabel = benchmarkScaleReferenceLabel(input.level, roleLabel, input.language, input.benchmarkFormat)
  const status: BasketballBenchmarkComparison['status'] = readyRows.length > 0 ? 'ready' : 'missing'

  if (input.level === 'rally_population' && missingReference) {
    return {
      id: 'rally_population_role_stats_missing',
      level: input.level,
      title,
      metricLabel: input.language === 'th' ? 'รอ sample' : 'PENDING',
      valueLabel: input.language === 'th' ? 'ยังไม่เปิดค่าเฉลี่ย' : 'No cohort yet',
      referenceLabel: input.language === 'th' ? 'ต้องมี 30 เกม / 10 คน' : 'Needs 30 matches / 10 users',
      deltaLabel: null,
      body:
        input.language === 'th'
          ? `Rally ยังไม่มี cohort ${roleLabel} ที่ผ่าน privacy guard จึงไม่โชว์ค่าเฉลี่ยหลอก`
          : `Rally does not have a ${roleLabel} cohort past the privacy guard yet, so no average is shown.`,
      status: 'missing',
      tone: 'neutral',
      statRows: [],
    }
  }

  const topSignal = summarizeBenchmarkRows(readyRows)
  const totalRows = axisConfig.length
  return {
    id: `${input.level}_${role}_all_stats`,
    level: input.level,
    title,
    metricLabel: `${readyRows.length}/${totalRows}`,
    valueLabel:
      input.language === 'th'
        ? `${readyRows.length}/${totalRows} สถิติเทียบแล้ว`
        : `${readyRows.length}/${totalRows} stats compared`,
    referenceLabel,
    deltaLabel: topSignal,
    body: benchmarkScaleBody(input.level, input.language),
    status,
    tone: benchmarkRowsTone(readyRows, input.level),
    statRows,
  }
}

function buildBenchmarkStatComparison(input: {
  level: BasketballBenchmarkComparison['level']
  role: BasketballRole
  metric: BasketballFinalDataAxisKey
  label: string
  current: number | null
  baselines: NonNullable<CoachStatBaseline['benchmarkBaselines']>
  language: AppLanguage
  benchmarkFormat: CoachBenchmarkFormat
}): BasketballBenchmarkStatComparison {
  const benchmark = selectBenchmarkForScale(input.baselines, input.level, input.metric, input.role, input.benchmarkFormat)
    ?? fallbackBenchmarkForScale(input.level, input.metric, input.role, input.benchmarkFormat)
  if (!benchmark) {
    return {
      key: input.metric,
      label: input.label,
      currentLabel: input.current == null ? '—' : formatMetricNumber(input.current),
      referenceLabel: input.language === 'th' ? 'ยังไม่มีเกณฑ์' : 'No reference',
      deltaLabel: null,
      status: 'missing_reference',
      tone: 'neutral',
    }
  }
  if (input.current == null) {
    return {
      key: input.metric,
      label: input.label,
      currentLabel: '—',
      referenceLabel: `${benchmarkStatPrefix(input.level, input.language)} ${formatMetricNumber(benchmark.value)}`,
      deltaLabel: null,
      status: 'missing_current',
      tone: 'neutral',
    }
  }

  const delta = Number((input.current - benchmark.value).toFixed(1))
  return {
    key: input.metric,
    label: input.label,
    currentLabel: formatMetricNumber(input.current),
    referenceLabel: `${benchmarkStatPrefix(input.level, input.language)} ${formatMetricNumber(benchmark.value)}`,
    deltaLabel: formatSignedMetric(delta),
    status: 'ready',
    tone: statComparisonTone(input.metric, delta),
  }
}

function hasLevelBenchmark(
  baselines: NonNullable<CoachStatBaseline['benchmarkBaselines']>,
  level: BasketballBenchmarkComparison['level'],
  role: BasketballRole,
  benchmarkFormat: CoachBenchmarkFormat,
): boolean {
  return baselines.some((baseline) =>
    baseline.level === level &&
    baseline.role === role &&
    benchmarkMatchesPreferredFormat(baseline, benchmarkFormat)
  )
}

function selectBenchmarkForScale(
  baselines: NonNullable<CoachStatBaseline['benchmarkBaselines']>,
  level: BasketballBenchmarkComparison['level'],
  metric: BasketballFinalDataAxisKey,
  role: BasketballRole,
  benchmarkFormat: CoachBenchmarkFormat,
): BasketballBenchmarkDefinition | null {
  const benchmarkMetric = benchmarkMetricForScale(metric, level, benchmarkFormat)
  const candidates = baselines
    .filter((baseline) =>
      baseline.level === level &&
      baseline.metric === benchmarkMetric &&
      baseline.sport === 'basketball' &&
      baseline.role === role &&
      benchmarkMatchesPreferredFormat(baseline, benchmarkFormat)
    )

  const selected = candidates[0]
  if (!selected) return null
  return { value: selected.value, unit: axisUnit(metric) }
}

function fallbackBenchmarkForScale(
  level: BasketballBenchmarkComparison['level'],
  metric: BasketballFinalDataAxisKey,
  role: BasketballRole,
  benchmarkFormat: CoachBenchmarkFormat,
): BasketballBenchmarkDefinition | null {
  if (level === 'web_general') {
    return {
      value: mobileGeneralRolePrior(role, metric, benchmarkFormat),
      unit: axisUnit(metric),
    }
  }
  return null
}

function benchmarkMetricForScale(
  metric: BasketballFinalDataAxisKey,
  level: BasketballBenchmarkComparison['level'],
  benchmarkFormat: CoachBenchmarkFormat,
): BasketballFinalDataAxisKey {
  if (
    benchmarkFormat === '3x3' &&
    metric === 'twoPointersMade' &&
    (level === 'web_general' || level === 'web_nba')
  ) {
    return 'threePointersMade'
  }
  return metric
}

function benchmarkMatchesPreferredFormat(
  benchmark: NonNullable<CoachStatBaseline['benchmarkBaselines']>[number],
  benchmarkFormat: CoachBenchmarkFormat,
): boolean {
  const format = benchmark.benchmarkFormat ?? 'unknown'
  if (benchmark.level === 'web_nba') return format === '5v5'
  return format === benchmarkFormat
}

function benchmarkScaleTitle(
  level: BasketballBenchmarkComparison['level'],
  roleLabel: string,
  language: AppLanguage,
  benchmarkFormat: CoachBenchmarkFormat,
): string {
  const formatLabel = benchmarkFormatLabel(benchmarkFormat, language)
  if (level === 'web_general') return language === 'th' ? `คนทั่วไป ${roleLabel} ${formatLabel}` : `General ${roleLabel} ${formatLabel}`
  if (level === 'rally_population') return `Rally ${roleLabel} ${formatLabel}`
  return language === 'th' ? `โปร ${roleLabel}` : `Pro ${roleLabel}`
}

function benchmarkScaleReferenceLabel(
  level: BasketballBenchmarkComparison['level'],
  roleLabel: string,
  language: AppLanguage,
  benchmarkFormat: CoachBenchmarkFormat,
): string {
  const formatLabel = benchmarkFormatLabel(benchmarkFormat, language)
  if (level === 'web_general') {
    return language === 'th' ? `ค่าตั้งต้นคนทั่วไป ${roleLabel} ${formatLabel}` : `General ${roleLabel} ${formatLabel} prior`
  }
  if (level === 'rally_population') {
    return language === 'th' ? `ค่าเฉลี่ย Rally ${roleLabel} ${formatLabel}` : `Rally ${roleLabel} ${formatLabel} cohort`
  }
  return language === 'th' ? `สเกลโปร ${roleLabel} 5v5` : `Pro ${roleLabel} 5v5`
}

function benchmarkScaleBody(level: BasketballBenchmarkComparison['level'], language: AppLanguage): string {
  if (level === 'web_general') {
    return language === 'th'
      ? 'เทียบกับ prior คนทั่วไปแบบ role-aware ใช้เป็นจุดตั้งต้นจนกว่า sample Rally จะพอ'
      : 'Compared with a role-aware general prior while Rally samples are still growing.'
  }
  if (level === 'rally_population') {
    return language === 'th'
      ? 'ใช้เฉพาะ cohort ที่ผ่าน privacy guard แล้ว'
      : 'Uses only cohorts that passed the privacy guard.'
  }
  return language === 'th'
    ? 'เทียบสเกลโปรตาม role เดียวกัน ใช้เป็นบริบท ไม่ใช่คำตัดสินฝีมือ'
    : 'Compared with same-role pro scale for context, not a skill verdict.'
}

function benchmarkStatPrefix(level: BasketballBenchmarkComparison['level'], language: AppLanguage): string {
  if (level === 'web_general') return language === 'th' ? 'ทั่วไป' : 'general'
  if (level === 'rally_population') return 'Rally'
  return language === 'th' ? 'โปร' : 'pro'
}

function summarizeBenchmarkRows(rows: BasketballBenchmarkStatComparison[]): string | null {
  if (rows.length === 0) return null
  const positive = rows.filter((row) => row.tone === 'positive').length
  const risk = rows.filter((row) => row.tone === 'risk').length
  if (positive === 0 && risk === 0) return null
  return `+${positive} / !${risk}`
}

function benchmarkRowsTone(
  rows: BasketballBenchmarkStatComparison[],
  level: BasketballBenchmarkComparison['level'],
): BasketballBenchmarkComparison['tone'] {
  const positive = rows.filter((row) => row.tone === 'positive').length
  const risk = rows.filter((row) => row.tone === 'risk').length
  if (risk > positive && level !== 'web_nba') return 'risk'
  if (positive > 0) return 'positive'
  return 'neutral'
}

function statComparisonTone(
  metric: BasketballFinalDataAxisKey,
  delta: number,
): BasketballBenchmarkStatComparison['tone'] {
  if (Math.abs(delta) < 0.5) return 'neutral'
  return delta > 0 ? 'positive' : 'neutral'
}

function axisUnit(metric: BasketballFinalDataAxisKey): string {
  const axis = BASKETBALL_FINAL_AXIS_CONFIG.find((candidate) => candidate.key === metric)
  return axis?.label ?? metric
}

function finalImpactOrder(
  role: CoachActivityContextState['role'],
  benchmarkFormat?: CoachBenchmarkFormat | null,
): BasketballFinalDataAxisKey[] {
  let order: BasketballFinalDataAxisKey[]
  if (role === 'shooter') {
    order = ['points', 'twoPointersMade', 'threePointersMade', 'assists', 'rebounds', 'steals', 'blocks', 'freeThrowsMade']
  } else if (role === 'handler') {
    order = ['assists', 'points', 'twoPointersMade', 'threePointersMade', 'rebounds', 'blocks', 'steals', 'freeThrowsMade']
  } else if (role === 'defender') {
    order = ['blocks', 'steals', 'rebounds', 'points', 'twoPointersMade', 'threePointersMade', 'assists', 'freeThrowsMade']
  } else if (role === 'big') {
    order = ['rebounds', 'blocks', 'points', 'twoPointersMade', 'assists', 'threePointersMade', 'steals', 'freeThrowsMade']
  } else {
    order = ['points', 'twoPointersMade', 'threePointersMade', 'assists', 'rebounds', 'blocks', 'steals', 'freeThrowsMade']
  }

  if (benchmarkFormat === '3x3') {
    return order.filter((key) => key !== 'threePointersMade')
  }
  return order
}

function finalImpactTone(key: BasketballFinalDataAxisKey): BasketballFinalImpactBar['tone'] {
  if (key === 'points' || key === 'twoPointersMade' || key === 'threePointersMade' || key === 'freeThrowsMade') return 'score'
  if (key === 'assists') return 'playmaking'
  if (key === 'rebounds' || key === 'steals' || key === 'blocks') return 'defense'
  return 'neutral'
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function buildSummaryChips(
  data: GetCoachActivityInsightsResult,
  language: AppLanguage,
): CoachReportSummaryStage['chips'] {
  const chips = data.reportSignals.slice(0, 3).map((sig) => ({
    id: sig.id,
    label: sig.label,
    tone: (sig.type === 'statline' ? 'stat' : sig.type === 'h2h' ? 'history' : sig.type === 'effort' ? 'sensor' : sig.type) as 'score' | 'stat' | 'history' | 'sensor'
  }))
  if (chips.length >= 3) return chips

  const stats = data.currentContext?.basketballStats
  const statChips: CoachReportSummaryStage['chips'] = []
  if (stats?.points != null) statChips.push({ id: 'stat_pts', label: `PTS ${stats.points}`, tone: 'stat' })
  if (stats?.twoPointersMade != null) statChips.push({ id: 'stat_2pt', label: `2PT ${stats.twoPointersMade}`, tone: 'stat' })
  if (stats?.threePointersMade != null) statChips.push({ id: 'stat_3pm', label: `3PM ${stats.threePointersMade}`, tone: 'stat' })
  if (stats?.rebounds != null) statChips.push({ id: 'stat_reb', label: `REB ${stats.rebounds}`, tone: 'stat' })
  if (stats?.assists != null) statChips.push({ id: 'stat_ast', label: `AST ${stats.assists}`, tone: 'stat' })

  const merged = [...chips]
  for (const chip of statChips) {
    if (merged.length >= 3) break
    if (!merged.some((candidate) => candidate.id === chip.id)) merged.push(chip)
  }

  if (merged.length > 0) return merged
  return [
    {
      id: 'score_recorded',
      label: language === 'th' ? 'มีผลแข่งแล้ว' : 'Score recorded',
      tone: 'score',
    },
  ]
}

type RoleBenchmarkSignal = {
  id: BasketballFinalDataAxisKey
  label: string
  delta: number
  deltaLabel: string
  current: number
  reference: number
  tone: BasketballBenchmarkStatComparison['tone']
}

function buildRoleBenchmarkSignals({
  stats,
  role,
  level,
  benchmarkFormat,
  baselines,
}: {
  stats: BasketballStatLine
  role: BasketballRole | null
  level: BasketballBenchmarkComparison['level']
  benchmarkFormat: CoachBenchmarkFormat
  baselines: NonNullable<CoachStatBaseline['benchmarkBaselines']>
}): RoleBenchmarkSignal[] {
  const resolvedRole = role ?? 'all_around'
  return basketballFinalAxisConfigForFormat(benchmarkFormat)
    .map((axis): RoleBenchmarkSignal | null => {
      const current = knownStat(stats[axis.key])
      if (current == null) return null
      const benchmark = selectBenchmarkForScale(baselines, level, axis.key, resolvedRole, benchmarkFormat)
        ?? fallbackBenchmarkForScale(level, axis.key, resolvedRole, benchmarkFormat)
      if (!benchmark) return null
      const delta = Number((current - benchmark.value).toFixed(1))
      return {
        id: axis.key,
        label: axis.label,
        delta,
        deltaLabel: formatSignedMetric(delta),
        current,
        reference: benchmark.value,
        tone: statComparisonTone(axis.key, delta),
      }
    })
    .filter((signal): signal is RoleBenchmarkSignal => Boolean(signal))
    .sort((a, b) => benchmarkSignalPriority(a, resolvedRole) - benchmarkSignalPriority(b, resolvedRole))
}

function benchmarkSignalPriority(signal: RoleBenchmarkSignal, role: BasketballRole): number {
  const roleOrder = finalImpactOrder(role)
  const roleBias = Math.max(0, roleOrder.indexOf(signal.id)) / 1000
  if (signal.tone === 'positive') return 0 - Math.abs(signal.delta) / 100 + roleBias
  if (signal.tone === 'risk') return 1 - Math.abs(signal.delta) / 100 + roleBias
  return 2 - Math.abs(signal.delta) / 100 + roleBias
}

function benchmarkSignalPhrase(signal: RoleBenchmarkSignal, language: AppLanguage): string {
  if (language === 'th') {
    if (signal.tone === 'positive') {
      return `${signal.label} สูงกว่าคนทั่วไป ${signal.deltaLabel}`
    }
    if (signal.tone === 'risk') return `${signal.label} สูงกว่าคนทั่วไป ${signal.deltaLabel}`
    return `${signal.label} ใกล้ค่าเฉลี่ยคนทั่วไป`
  }
  if (signal.tone === 'positive') {
    return `${signal.label} is ${signal.deltaLabel} above general`
  }
  if (signal.tone === 'risk') return `${signal.label} is ${signal.deltaLabel} above general`
  return `${signal.label} is near the general average`
}

function buildSummaryVerdict(
  data: GetCoachActivityInsightsResult,
  language: AppLanguage,
  options: CoachReportBenchmarkOptions = {},
): string {
  const stats = data.currentContext?.basketballStats
  const role = data.currentContext?.role
  const preferredFormat = normalizeBasketballBenchmarkFormat(options.benchmarkFormat)
  const roleLabel = getBasketballRoleLabel(role ?? 'all_around', language, preferredFormat)
  const formatLabel = benchmarkFormatLabel(preferredFormat, language)
  const generalSignals = buildRoleBenchmarkSignals({
    stats: stats ?? {},
    role: role ?? null,
    level: 'web_general',
    benchmarkFormat: preferredFormat,
    baselines: data.statBaseline.benchmarkBaselines ?? [],
  })
  const primaryGeneral = generalSignals[0] ?? null
  const riskGeneral = generalSignals.find((signal) => signal.tone === 'risk') ?? null

  if (primaryGeneral) {
    if (language === 'th') {
      if (riskGeneral && riskGeneral.id !== primaryGeneral.id) {
        return `${roleLabel} ${formatLabel}: ${benchmarkSignalPhrase(primaryGeneral, language)} แต่ ${benchmarkSignalPhrase(riskGeneral, language)}`
      }
      return `${roleLabel} ${formatLabel}: ${benchmarkSignalPhrase(primaryGeneral, language)}`
    }
    if (riskGeneral && riskGeneral.id !== primaryGeneral.id) {
      return `${roleLabel} ${formatLabel}: ${benchmarkSignalPhrase(primaryGeneral, language)}, but ${benchmarkSignalPhrase(riskGeneral, language)}.`
    }
    return `${roleLabel} ${formatLabel}: ${benchmarkSignalPhrase(primaryGeneral, language)}.`
  }
  const hasAssists = typeof stats?.assists === 'number'
  const hasPoints = typeof stats?.points === 'number'
  const hasRebounds = typeof stats?.rebounds === 'number'

  if (hasAssists) {
    return language === 'th' ? 'อ่านการสร้างแต้มจาก AST เป็นหลัก' : 'Playmaking starts from AST'
  }

  if (hasPoints || hasRebounds) {
    return language === 'th'
      ? 'เริ่มอ่านเกมจากสถิติที่กรอก'
      : 'Your statline is ready to read'
  }

  return data.reportSignals.length > 0
    ? language === 'th'
      ? 'มีสัญญาณจากผลแข่งและประวัติแล้ว เพิ่มสถิติถ้าอยากอ่านลึกขึ้น'
      : 'Score and history signals are ready. Add stats for a deeper read.'
    : language === 'th'
      ? 'มีผลแข่งแล้ว เลือก Role และกรอกสถิติที่รู้เพื่อเปิดรายงาน'
      : 'Score is recorded. Pick a role and add known stats to open the report.'
}

export function getTopicRequiredInputs(
  topic: CoachReportTopic,
  context: CoachActivityContextState | null,
): {
  kind: 'none' | 'role' | 'stats' | 'sensor'
  statKeys: Array<keyof BasketballStatLine>
} {
  if (topic.gate === 'none') {
    return { kind: 'none', statKeys: [] }
  }
  if (topic.gate === 'needs_role') {
    return { kind: 'role', statKeys: [] }
  }
  if (topic.gate === 'needs_sensor_sync' || topic.gate === 'needs_permission') {
    return { kind: 'sensor', statKeys: [] }
  }
  const prompt = getCoachCardFollowUpPrompt({ card: topic.card, context, missingInputs: [], language: 'en' })
  if (prompt?.kind === 'statline') {
    return { kind: 'stats', statKeys: prompt.requiredStatKeys ?? prompt.statKeys ?? [] }
  }
  return { kind: 'stats', statKeys: [] }
}

export function formatStageProgress(index: number, total: number): string {
  return `${index} / ${total}`
}

export function getCoachReportSections(input: {
  data: GetCoachActivityInsightsResult
  language?: AppLanguage
}): CoachReportSection[] {
  const language = input.language ?? 'en'
  const data = input.data
  const context = data.currentContext
  const stageTopics = getCoachReportStageTopics(data, language)
  const topics = normalizeReportTopics([...stageTopics.primaryTopics, ...stageTopics.extraTopics])
  const sensorTopic = buildSensorTopic(data, language)
  const h2hSparseTopic = buildHeadToHeadSparseTopic(data, language)
  const comparisonTopics = topics.filter((topic) =>
    topic.card.type === 'form' ||
    topic.card.type === 'head_to_head' ||
    topic.card.source === 'benchmark'
  )
  const sections: CoachReportSection[] = [
    {
      id: 'summary',
      title: language === 'th' ? 'สรุปแมตช์' : 'Match Read Summary',
      cards: topics.filter((topic) => topic.card.type === 'form' || topic.card.type === 'head_to_head').slice(0, 2),
    },
    {
      id: 'compare',
      title: language === 'th' ? 'เทียบกับที่ผ่านมา' : 'Compare',
      cards: [
        ...comparisonTopics,
        ...(h2hSparseTopic && !topics.some((topic) => topic.card.type === 'head_to_head') ? [h2hSparseTopic] : []),
      ],
    },
    {
      id: 'role_reads',
      title: language === 'th' ? 'อ่านตามบทบาท' : 'Role Reads',
      cards: topics.filter((topic) => isRoleTopic(topic.card.id, context)),
    },
    {
      id: 'more_reads',
      title: language === 'th' ? 'หัวข้อเพิ่มเติม' : 'More Reads',
      cards: topics.filter((topic) =>
        topic.card.type === 'training_cue' &&
        topic.card.source !== 'benchmark' &&
        !isRoleTopic(topic.card.id, context)
      ),
    },
    {
      id: 'pro_depth',
      title: language === 'th' ? 'Pro Depth' : 'Pro Depth',
      cards: [
        ...topics.filter((topic) =>
          (topic.card.type === 'effort' || topic.card.source === 'sensor') &&
          topic.id !== 'coach_prompt_effort'
        ),
        ...(sensorTopic ? [sensorTopic] : []),
      ].filter(dedupeTopicById),
    },
  ]

  return sections.map((section) => ({
    ...section,
    cards: section.cards.length > 0 ? section.cards : buildEmptySectionCards(section, data, language),
  }))
}

export function formatCoachTopicScore(
  score: CoachInsightScore | null | undefined,
  language: AppLanguage = 'en',
): string | null {
  if (!score) return null
  if (score.status === 'needs_history') {
    return language === 'th' ? 'ต้องมีประวัติเพิ่ม' : 'Needs more history'
  }
  if (score.scope === 'web_nba' || score.scope === 'web_general' || score.scope === 'rally_population') {
    return formatBenchmarkScore(score, language)
  }
  const delta = score.delta
  const unit = score.unit ? ` ${score.unit}` : ''
  if (delta == null) {
    if (score.status === 'steady') return language === 'th' ? 'ใกล้ค่าเฉลี่ย' : 'Near baseline'
    return null
  }
  const signed = delta > 0 ? `+${formatDelta(delta)}` : formatDelta(delta)
  if (language === 'th') {
    if (score.status === 'up') return `ดีขึ้น ${signed}${unit}`
    if (score.status === 'down') return `ลดลง ${signed}${unit}`
    return `ใกล้ค่าเฉลี่ย ${signed}${unit}`
  }
  if (score.status === 'up') return `Up ${signed}${unit}`
  if (score.status === 'down') return `Down ${signed}${unit}`
  return `Near baseline ${signed}${unit}`
}

export function getCoachReportDetailBlocks(
  topic: CoachReportTopic,
  language: AppLanguage = 'en',
): CoachReportDetailBlock[] {
  return [
    {
      label: 'Evidence',
      text:
        topic.gate === 'needs_sensor_sync'
          ? language === 'th'
            ? 'หัวข้อนี้ต้องใช้ข้อมูลสรุปจาก HealthKit หรือ Health Connect'
            : 'This topic needs a HealthKit or Health Connect summary.'
          : topic.scoreLabel ?? topic.sourceLabel,
    },
  ]
}

function toReportTopic(
  card: CoachInsightCard,
  context: CoachActivityContextState | null,
  missingInputs: Array<'context' | 'sensor' | 'history'>,
  language: AppLanguage,
  baseline?: CoachStatBaseline,
): CoachReportTopic {
  const localized = localizeCoachInsightCard(card, language)
  const prompt = getCoachCardFollowUpPrompt({ card, context, missingInputs, language })
  const gate = card.gate ?? (card.locked ? 'pro_locked' : prompt ? 'needs_stats' : 'none')
  const score = card.score ?? deriveStatScore(card, baseline)
  return {
    id: card.id,
    card,
    sectionId: 'summary',
    title:
      card.id === 'sensor_effort_needs_sync'
        ? language === 'th'
          ? 'ข้อมูลแรงจากวอช'
          : 'Watch effort data'
        : getCoachInsightHeaderTitle(card, false, language),
    resultTitle: localized.title,
    body: localized.body,
    sourceLabel: sourceLabel(localized.source, language),
    scoreLabel: formatCoachTopicScore(score, language),
    gate,
    gateLabel: gateLabel(gate, card, context, language),
    severity: localized.severity,
  }
}

function buildSensorTopic(
  data: GetCoachActivityInsightsResult,
  language: AppLanguage,
): CoachReportTopic | null {
  if (data.sensorState.status === 'available') return null
  const card: CoachInsightCard = {
    id: 'sensor_effort_needs_sync',
    type: 'effort',
    title: 'Watch effort data',
    body: 'No device data attached, so Rally will not judge effort or movement from sensors. Sync watch or phone health data to add that read.',
    severity: 'neutral',
    locked: data.sensorState.status === 'pro_locked',
    source: 'sensor',
    gate: data.sensorState.status === 'pro_locked' ? 'pro_locked' : 'needs_sensor_sync',
  }
  return toReportTopic(card, data.currentContext, data.missingInputs, language, data.statBaseline)
}

function buildHeadToHeadSparseTopic(
  data: GetCoachActivityInsightsResult,
  language: AppLanguage,
): CoachReportTopic | null {
  if (!data.missingInputs.includes('history') && data.statBaseline.matchesNeeded <= 0) return null
  const matchesNeeded = Math.max(1, Math.min(2, data.statBaseline.matchesNeeded || 2))
  const card: CoachInsightCard = {
    id: 'head_to_head_needs_history',
    type: 'head_to_head',
    title: language === 'th' ? 'ข้อมูล H2H ยังไม่พอ' : 'Not enough H2H yet',
    body:
      language === 'th'
        ? `ต้องเจอคู่แข่งนี้อีก ${matchesNeeded} เกมเพื่ออ่าน H2H ให้ชัด`
        : `Play this opponent ${matchesNeeded} more time${matchesNeeded === 1 ? '' : 's'} for a clearer H2H read.`,
    severity: 'neutral',
    locked: false,
    source: 'history',
    score: {
      status: 'needs_history',
      delta: null,
      current: null,
      baseline: null,
      unit: null,
      scope: 'h2h',
    },
  }
  return toReportTopic(card, data.currentContext, data.missingInputs, language, data.statBaseline)
}

function buildDerivedStatTopicCards(
  context: CoachActivityContextState | null,
  language: AppLanguage,
): CoachInsightCard[] {
  const role = context?.role
  const stats = context?.basketballStats ?? {}
  if (role !== 'shooter' || typeof stats.points !== 'number') return []

  const parts = [`PTS ${stats.points}`]
  const metrics: Record<string, number> = { points: stats.points }
  if (typeof stats.twoPointersMade === 'number') {
    parts.push(`2PT ${stats.twoPointersMade}`)
    metrics.two_pointers_made = stats.twoPointersMade
  }
  if (typeof stats.threePointersMade === 'number') {
    parts.push(`3PM ${stats.threePointersMade}`)
    metrics.three_pointers_made = stats.threePointersMade
  }
  if (typeof stats.freeThrowsMade === 'number') {
    parts.push(`FT ${stats.freeThrowsMade}`)
    metrics.free_throws_made = stats.freeThrowsMade
  }

  return [
    {
      id: 'cue_shooter_scoring_profile',
      type: 'training_cue',
      title: 'Scoring profile',
      body:
        language === 'th'
          ? `${parts.join(', ')}: แต้มที่กรอกชี้ว่าบทบาทหลักคือทำแต้ม`
          : `${parts.join(', ')}: logged scoring is the first read for this role.`,
      severity: 'neutral',
      locked: false,
      metrics,
      source: 'context',
    },
  ]
}

function normalizeReportTopics(topics: CoachReportTopic[]): CoachReportTopic[] {
  const hasEffortComparison = topics.some((topic) => topic.id === 'effort_sensor')
  const filtered = hasEffortComparison
    ? topics.filter((topic) => topic.id !== 'verified_effort_sensor')
    : topics
  const uniqueTopics: CoachReportTopic[] = []
  const seenIds = new Set<string>()
  for (const topic of filtered) {
    if (!seenIds.has(topic.id)) {
      seenIds.add(topic.id)
      uniqueTopics.push(topic)
    }
  }
  return uniqueTopics
}

function isRoleTopic(cardId: string, context: CoachActivityContextState | null): boolean {
  const role = context?.role
  if (!role) return cardId.startsWith('cue_')
  if (role === 'all_around') return cardId === 'cue_all_around_balance'
  return cardId.startsWith(`cue_${role}_`)
}

function buildEmptySectionCards(
  section: CoachReportSection,
  data: GetCoachActivityInsightsResult,
  language: AppLanguage,
): CoachReportTopic[] {
  if (section.id !== 'role_reads' || data.currentContext?.role) return []
  const card: CoachInsightCard = {
    id: 'role_setup_needed',
    type: 'training_cue',
    title: language === 'th' ? 'เลือกบทบาทก่อน' : 'Pick your role first',
    body: language === 'th' ? 'เลือก Role เพื่อเปิดหัวข้อประจำสาย' : 'Pick a role to unlock role-specific reads.',
    severity: 'neutral',
    locked: false,
    source: 'context',
    gate: 'needs_role',
  }
  return [toReportTopic(card, data.currentContext, data.missingInputs, language, data.statBaseline)]
}

function sourceLabel(source: CoachInsightCard['source'], language: AppLanguage): string {
  const labels: Record<AppLanguage, Record<CoachInsightCard['source'], string>> = {
    en: {
      history: 'History',
      context: 'Your stats',
      sensor: 'Watch data',
      rating: 'Rating',
      mixed: 'Mixed evidence',
      benchmark: 'Web benchmark',
    },
    th: {
      history: 'ประวัติ',
      context: 'สถิติคุณ',
      sensor: 'ข้อมูลวอช',
      rating: 'เรตติ้ง',
      mixed: 'ข้อมูลรวม',
      benchmark: 'เกณฑ์จากเว็บ',
    },
  }
  return labels[language][source]
}

function gateLabel(
  gate: CoachInsightGate,
  card: CoachInsightCard,
  context: CoachActivityContextState | null,
  language: AppLanguage,
): string | null {
  switch (gate) {
    case 'needs_role':
      return language === 'th' ? 'เลือก Role ก่อน' : 'Pick role'
    case 'needs_stats': {
      const prompt = getCoachCardFollowUpPrompt({ card, context, missingInputs: [], language })
      if (prompt?.kind === 'statline') {
        const labels = (prompt.requiredStatKeys ?? prompt.statKeys ?? [])
          .map((key) => statLabel(key))
          .join(' / ')
        return language === 'th' ? `เพิ่ม ${labels} เพื่ออ่าน` : `Add ${labels} to read`
      }
      return language === 'th' ? 'เพิ่มสถิติก่อนอ่าน' : 'Add stats to read'
    }
    case 'needs_sensor_sync':
      return language === 'th' ? 'ซิงก์ข้อมูลวอช' : 'Sync watch data'
    case 'needs_permission':
      return language === 'th' ? 'เชื่อมต่อ Health' : 'Connect Health'
    case 'pro_locked':
      return language === 'th' ? 'Pro depth' : 'Pro depth'
    case 'none':
      return null
  }
}

function statLabel(key: string): string {
  const labels: Record<string, string> = {
    points: 'PTS',
    rebounds: 'REB',
    assists: 'AST',
    steals: 'STL',
    blocks: 'BLK',
    twoPointersMade: '2PT',
    threePointersMade: '3PM',
    freeThrowsMade: 'FT',
  }
  return labels[key] ?? key
}

function deriveStatScore(
  card: CoachInsightCard,
  baseline: CoachStatBaseline | null | undefined,
): CoachInsightScore | undefined {
  if (!baseline || baseline.scope === 'none') return undefined
  const metrics = card.metrics ?? {}
  const averages = baseline.averages ?? {}
  const scope = baseline.scope

  if (card.id === 'cue_handler_playmaking_balance') {
    return compareMetric(metrics.assists, averages.assists, 'AST', scope)
  }
  if (card.id === 'cue_shooter_scoring_profile') {
    return compareMetric(metrics.points, averages.points, 'PTS', scope)
  }
  if (card.id === 'cue_defender_stat_impact') {
    const hasDefensiveAverage = typeof averages.steals === 'number' || typeof averages.blocks === 'number'
    const baselineValue = hasDefensiveAverage ? (averages.steals ?? 0) + (averages.blocks ?? 0) : null
    return compareMetric(asNumber(metrics.steals) + asNumber(metrics.blocks), baselineValue, 'STL+BLK', scope)
  }
  if (card.id === 'cue_big_rebounds') {
    return compareMetric(metrics.rebounds, averages.rebounds, 'REB', scope)
  }
  if (card.id === 'cue_big_paint_defense_stats') {
    return compareMetric(metrics.blocks, averages.blocks, 'BLK', scope)
  }
  if (card.id === 'cue_free_throws') {
    return compareMetric(metrics.free_throws_made, averages.freeThrowsMade, 'FT', scope)
  }
  if (card.id === 'cue_all_around_balance') {
    return compareMetric(metrics.points, averages.points, 'PTS', scope)
  }
  return undefined
}

function compareMetric(
  currentInput: string | number | null | undefined,
  baselineInput: number | null | undefined,
  unit: string,
  scope: CoachInsightScore['scope'],
): CoachInsightScore | undefined {
  if (currentInput == null || baselineInput == null || !Number.isFinite(baselineInput)) return undefined
  const current = asNumber(currentInput)
  const delta = Number((current - baselineInput).toFixed(1))
  return {
    status: Math.abs(delta) < 0.5 ? 'steady' : delta > 0 ? 'up' : 'down',
    delta,
    current,
    baseline: Number(baselineInput.toFixed(1)),
    unit,
    scope,
  }
}

function formatBenchmarkScore(score: CoachInsightScore, language: AppLanguage): string | null {
  const delta = score.delta
  if (delta == null) return null
  const unit = score.unit ? ` ${score.unit}` : ''
  const amount = `${formatDelta(Math.abs(delta))}${unit}`
  const label =
    score.scope === 'web_nba'
      ? language === 'th'
        ? 'สเกลบาสอาชีพ'
        : 'pro basketball scale'
      : score.scope === 'web_general'
        ? language === 'th'
          ? 'คนทั่วไป'
          : 'general benchmark'
        : language === 'th'
          ? 'ผู้เล่น Rally'
          : 'Rally players'
  if (Math.abs(delta) < 0.5) {
    return language === 'th' ? `ใกล้${label}` : `Near ${label}`
  }
  if (delta > 0) {
    return language === 'th' ? `สูงกว่า${label} ${amount}` : `Above ${label} by ${amount}`
  }
  return language === 'th' ? `ต่ำกว่า${label} ${amount}` : `Below ${label} by ${amount}`
}

function asNumber(value: string | number | null | undefined): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function formatDelta(delta: number): string {
  return Number.isInteger(delta) ? String(delta) : delta.toFixed(1)
}

function dedupeTopicById(topic: CoachReportTopic, index: number, topics: CoachReportTopic[]): boolean {
  return topics.findIndex((candidate) => candidate.id === topic.id) === index
}
