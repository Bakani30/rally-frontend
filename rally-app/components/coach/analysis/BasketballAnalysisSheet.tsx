import { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { ScreenBackButton } from '@/components/navigation/ScreenBackButton'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useCoachActivityInsights } from '@/hooks/useCoachActivityInsights'
import { useLanguageStore } from '@/stores/languageStore'
import { getBasketballRoleLabel } from '@/lib/coach/coachInputPresentation'
import { buildStatHexagon, type StatComparison } from '@/lib/coach/analysis/basketballStatHexagon'
import { buildRevealBeats } from '@/lib/coach/analysis/analysisRevealBeats'
import { groupAnalysisCards, type AnalysisSectionId } from '@/lib/coach/analysis/analysisCardSections'
import { resolveArchetype } from '@/lib/coach/analysis/basketballArchetype'
import type { BasketballStatLine, CoachBenchmarkFormat } from '@/lib/coach/coachTypes'
import { guardedRouter } from '@/lib/navigation/guardedRouter'
import { BasketballStatReport } from './BasketballStatReport'
import { AnalysisCardSection } from './AnalysisCardSection'
import { AnalysisRevealPopup } from './AnalysisRevealPopup'
import { AnalysisTrendSection } from './AnalysisTrendSection'
import { A, analysisStyles } from './basketballAnalysisStyles'

// Activities whose entry reveal has played this session — don't replay on back-nav.
const revealSeen = new Set<string>()

const SECTION_TITLE: Record<AnalysisSectionId, { en: string; th: string }> = {
  strengths: { en: 'STRENGTHS', th: 'จุดแข็ง' },
  improve: { en: 'TO IMPROVE', th: 'ควรพัฒนา' },
  versus: { en: 'VS OPPONENT', th: 'พบคู่แข่ง' },
}

function formatLabelFor(format: CoachBenchmarkFormat): string {
  if (format === '5v5') return '5v5'
  if (format === '3x3') return '3x3'
  return ''
}

type BasketballAnalysisSheetProps = {
  activitySessionId: string
  benchmarkFormat: CoachBenchmarkFormat
  dateLabel: string
  resultLabel: 'WIN' | 'LOSS' | 'TIE' | null
  scoreLine: string | null
  opponentStats?: BasketballStatLine | null
}

export function BasketballAnalysisSheet({
  activitySessionId, benchmarkFormat, dateLabel, resultLabel, scoreLine, opponentStats = null,
}: BasketballAnalysisSheetProps) {
  const language = useLanguageStore((s) => s.language)
  const insets = useSafeAreaInsets()
  const { track } = useAnalytics()
  const { data, isPending, error } = useCoachActivityInsights(activitySessionId)
  const firedRef = useRef<string | null>(null)
  const [comparison, setComparison] = useState<StatComparison>('average')
  const [revealed, setRevealed] = useState(() => revealSeen.has(activitySessionId))
  const hasOpponent = !!opponentStats && Object.values(opponentStats).some((v) => typeof v === 'number')

  const hexagon = useMemo(
    () => (data ? buildStatHexagon(data, benchmarkFormat, comparison, opponentStats) : null),
    [data, benchmarkFormat, comparison, opponentStats],
  )

  useEffect(() => {
    if (!data || firedRef.current === activitySessionId) return
    firedRef.current = activitySessionId
    track({ name: 'analysis_sheet_viewed', properties: { activity_session_id: activitySessionId, has_pro: data.entitlement.hasPro } })
  }, [data, activitySessionId, track])

  if (isPending) return <View style={analysisStyles.page}><ActivityIndicator style={{ flex: 1 }} color={A.orange} /></View>
  if (error || !data || !hexagon) {
    return (
      <View style={[analysisStyles.page, { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }]}>
        <ScreenBackButton
          style={{ position: 'absolute', top: insets.top + 12, left: 18 }}
          backgroundColor={A.surface}
          borderColor={A.border}
          iconColor={A.ink}
        />
        <MaterialCommunityIcons name="chart-box-outline" size={42} color={A.muted} />
        <Text style={analysisStyles.stateText}>{language === 'th' ? 'ยังไม่มีข้อมูลวิเคราะห์' : 'Analysis unavailable'}</Text>
      </View>
    )
  }

  const role = resolveArchetype(
    data.currentContext?.basketballStats ?? {},
    data.statBaseline?.averages,
    data.currentContext?.role,
  )
  const roleLabel = getBasketballRoleLabel(role, language, benchmarkFormat)
  const matches = data.statBaseline.sampleSize
  const mastery = { roleLabel, level: Math.floor(matches / 5) + 1, matches }
  const hasPro = data.entitlement.hasPro
  // No stat line entered for this match → no coach reads to ground advice in,
  // so the advice/upsell cards stay hidden until stats exist.
  const hasStats = Object.values(data.currentContext?.basketballStats ?? {}).some(
    (value) => typeof value === 'number',
  )
  const sections = hasStats ? groupAnalysisCards(hasPro ? data.cards : data.previewCards) : []
  const beats = buildRevealBeats({ resultLabel, scoreLine, hexagon, mastery, language })
  const dismissReveal = () => {
    revealSeen.add(activitySessionId)
    setRevealed(true)
  }

  return (
    <View style={{ flex: 1 }}>
    <ScrollView style={analysisStyles.page} contentContainerStyle={[analysisStyles.content, { paddingTop: insets.top + 12 }]} showsVerticalScrollIndicator={false}>
      <ScreenBackButton
        style={{ marginLeft: 18, marginBottom: 4 }}
        backgroundColor={A.surface}
        borderColor={A.border}
        iconColor={A.ink}
      />
      <BasketballStatReport
        roleLabel={roleLabel}
        formatLabel={formatLabelFor(benchmarkFormat)}
        dateLabel={dateLabel}
        resultLabel={resultLabel}
        scoreLine={scoreLine}
        hexagon={hexagon}
        mastery={mastery}
        comparison={comparison}
        onComparisonChange={setComparison}
        hasOpponent={hasOpponent}
      />

      {data.statTrend && <AnalysisTrendSection trend={data.statTrend} />}

      {sections.map((section) => (
        <AnalysisCardSection
          key={section.id}
          title={language === 'th' ? SECTION_TITLE[section.id].th : SECTION_TITLE[section.id].en}
          cards={section.cards}
        />
      ))}

      {hasStats && !hasPro && data.lockedCardCount > 0 && (
        <PressableScale style={analysisStyles.lockRow} onPress={() => guardedRouter.push('/pro', { actionKey: 'analysis:pro' })}>
          <MaterialCommunityIcons name="crown-outline" size={18} color={A.ink} />
          <Text style={analysisStyles.lockText}>
            {language === 'th' ? `ปลดล็อก ${data.lockedCardCount} การ์ดด้วย Pro` : `Unlock ${data.lockedCardCount} more cards with Pro`}
          </Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={A.muted} />
        </PressableScale>
      )}

      {sections.length === 0 && (
        <Text style={analysisStyles.stateText}>
          {hasStats
            ? language === 'th' ? 'เล่นอีกสักสองสามแมตช์เพื่อปลดการ์ดโค้ช' : 'Play a few more matches to unlock coach cards.'
            : language === 'th' ? 'กรอกสแตทส์แมตช์นี้เพื่อรับการ์ดโค้ช' : 'Add this match’s stats to get coach cards.'}
        </Text>
      )}
    </ScrollView>
    {!revealed && beats.length > 0 && <AnalysisRevealPopup beats={beats} onDone={dismissReveal} />}
    </View>
  )
}
