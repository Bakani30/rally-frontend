import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, View } from 'react-native'
import { Link } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Sport, Spacing } from '@/constants/theme'
import { useCoachActivityInsights, useSaveCoachContext } from '@/hooks/useCoachActivityInsights'
import { useLanguageStore } from '@/stores/languageStore'
import {
  getCoachCardFollowUpPrompt,
  getCoachCardsSectionLabel,
  getCoachContextInitial,
  getCoachContextToggleCopy,
  getCoachDisplayDeck,
  getCoachReadStage,
  mergeCoachContextPatch,
  shouldShowCoachSensorSyncInCard,
  summarizeCoachInputSignalsCompact,
  type CoachContextPatch,
  type CoachInputSignalState,
} from '@/lib/coach/coachInputPresentation'
import type { CoachBenchmarkFormat } from '@/lib/coach/coachTypes'
import { CoachInsightCard } from './CoachInsightCard'
import { CoachInsightFollowUpPrompt } from './CoachInsightFollowUpPrompt'
import { BasketballCoachSensorSyncCard } from './BasketballCoachSensorSyncCard'
import { BasketballCoachContextCard } from './BasketballCoachContextCard'

export function BasketballCoachReadSection({
  activitySessionId,
  startedAt,
  endedAt,
  ownTeamScore,
  benchmarkFormat = null,
}: {
  activitySessionId: string
  startedAt: string
  endedAt: string | null
  ownTeamScore?: number | null
  benchmarkFormat?: CoachBenchmarkFormat | null
}) {
  const { data, isPending, error } = useCoachActivityInsights(activitySessionId)
  const language = useLanguageStore((state) => state.language)
  const patchMutation = useSaveCoachContext(activitySessionId)
  const [savedSummary, setSavedSummary] = useState<string | null>(null)
  const [contextOpenOverride, setContextOpenOverride] = useState<boolean | null>(null)
  const [activeCardId, setActiveCardId] = useState<string | null>(null)
  const [showMoreReads, setShowMoreReads] = useState(false)
  const [optimisticContext, setOptimisticContext] = useState<CoachInputSignalState | null>(null)
  const contextInitial = useMemo(
    () => getCoachContextInitial(data?.currentContext),
    [data?.currentContext],
  )
  const effectiveContext = optimisticContext ?? contextInitial

  useEffect(() => {
    if (contextInitial) setOptimisticContext(contextInitial)
  }, [contextInitial])

  if (isPending) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>COACH READ</Text>
        <ActivityIndicator color={Sport.amber} />
      </View>
    )
  }

  if (error || !data) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>COACH READ</Text>
        <Text style={styles.empty}>
          {error instanceof Error ? error.message : language === 'th' ? 'ยังอ่าน coach ไม่ได้' : 'Coach read unavailable.'}
        </Text>
      </View>
    )
  }

  const { entitlement, cards, previewCards, lockedCardCount, missingInputs } = data
  const persistedSummary = effectiveContext ? summarizeCoachInputSignalsCompact(effectiveContext, language) : null
  const stage = getCoachReadStage({ missingInputs, savedSummary: savedSummary ?? persistedSummary, language })
  const showFull = entitlement.hasPro && cards.length > 0
  const deckCards = showFull ? cards : previewCards
  const deck = getCoachDisplayDeck({
    cards: deckCards,
    context: effectiveContext,
    missingInputs,
    hasPro: entitlement.hasPro,
    language,
  })
  const moreCardIds = new Set(deck.moreCards.map((card) => card.id))
  const visibleCards = showMoreReads ? [...deck.visibleCards, ...deck.moreCards] : deck.visibleCards
  const hasHiddenReads = deck.moreCards.length > 0
  const defaultContextOpen = stage.kind === 'needs_context'
  const showForm = contextOpenOverride ?? defaultContextOpen
  const toggleCopy = getCoachContextToggleCopy({ isOpen: showForm, stageKind: stage.kind, language })

  function toggleContextForm() {
    setContextOpenOverride((open) => !(open ?? defaultContextOpen))
  }

  function saveContextPatch(patch: CoachContextPatch) {
    const merged = mergeCoachContextPatch(effectiveContext, patch)
    patchMutation.mutate(
      { activitySessionId, ...merged },
      {
        onSuccess: () => {
          setOptimisticContext(merged)
          setSavedSummary(summarizeCoachInputSignalsCompact(merged, language))
        },
        onError: (err) => {
          const msg = err instanceof Error ? err.message : language === 'th' ? 'บันทึกข้อมูลไม่ได้' : 'Could not save coach context'
          if (Platform.OS === 'web') globalThis.alert(msg)
          else Alert.alert(language === 'th' ? 'บันทึกไม่สำเร็จ' : 'Save failed', msg)
        },
      },
    )
  }

  function renderCoachCard(card: (typeof deck.visibleCards)[number]) {
    const prompt = getCoachCardFollowUpPrompt({
      card,
      context: effectiveContext,
      missingInputs,
      language,
    })
    const showSensorSync = shouldShowCoachSensorSyncInCard(card)
    return (
      <CoachInsightCard
        key={card.id}
        card={card}
        expanded={activeCardId === card.id}
        onToggle={() => setActiveCardId((id) => (id === card.id ? null : card.id))}
        requiresInput={Boolean(prompt)}
      >
        {prompt ? (
          <CoachInsightFollowUpPrompt
            prompt={prompt}
            role={effectiveContext?.role ?? null}
            ownTeamScore={ownTeamScore}
            isSaving={patchMutation.isPending}
            onSave={saveContextPatch}
            onCancel={() => setActiveCardId(null)}
          />
        ) : null}
        {showSensorSync ? (
          <BasketballCoachSensorSyncCard
            activitySessionId={activitySessionId}
            startedAt={startedAt}
            endedAt={endedAt}
            surface="inline"
          />
        ) : null}
      </CoachInsightCard>
    )
  }

  return (
    <View style={styles.section}>
      <View style={styles.headingBlock}>
        <View style={styles.labelRow}>
          <Text style={styles.sectionLabel}>COACH READ</Text>
          <Text style={styles.proBadge}>{entitlement.hasPro ? 'PRO' : 'PREVIEW'}</Text>
        </View>
        <Text style={styles.sectionTitle}>{language === 'th' ? 'ทำ recap ให้อ่านเกมได้' : 'Make recap useful'}</Text>
      </View>

      <PressableScale
        style={[styles.statusPanel, stage.kind === 'updated' && styles.statusPanelDone]}
        onPress={toggleContextForm}
        accessibilityRole="button"
        accessibilityLabel={toggleCopy.label}
        accessibilityState={{ expanded: showForm }}
      >
        <View style={styles.statusIcon}>
          <MaterialCommunityIcons
            name={stage.kind === 'updated' ? 'check-decagram' : 'lightning-bolt'}
            size={15}
            color={stage.kind === 'updated' ? Sport.green : Sport.amber}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.statusEyebrow}>{stage.eyebrow}</Text>
          <Text style={styles.statusTitle}>{stage.title}</Text>
          {stage.body ? <Text style={styles.statusBody}>{stage.body}</Text> : null}
          {stage.savedSummary ? <Text style={styles.statusSummary}>{stage.savedSummary}</Text> : null}
        </View>
        <MaterialCommunityIcons name={toggleCopy.icon} size={17} color={Sport.muted} />
      </PressableScale>

      {showForm ? (
        <View style={styles.inputShell}>
          <BasketballCoachContextCard
            activitySessionId={activitySessionId}
            title="QUICK CONTEXT"
            submitLabel={stage.primaryActionLabel}
            surface="embedded"
            showInlineSaved={false}
            showIntro={false}
            ownTeamScore={ownTeamScore}
            benchmarkFormat={benchmarkFormat}
            initial={effectiveContext ?? undefined}
            onSaved={(summary, input) => {
              setSavedSummary(summarizeCoachInputSignalsCompact(input, language))
              setOptimisticContext(input)
              setContextOpenOverride(false)
            }}
          />
        </View>
      ) : null}

      {visibleCards.length > 0 && (
        <View style={styles.cardsBlock}>
          <Text style={styles.subLabel}>{getCoachCardsSectionLabel(stage.kind, language)}</Text>
          {visibleCards.map(renderCoachCard)}
          {hasHiddenReads ? (
            <PressableScale
              style={styles.moreReadsButton}
              onPress={() => {
                if (showMoreReads) {
                  setActiveCardId((id) => (id && moreCardIds.has(id) ? null : id))
                }
                setShowMoreReads((value) => !value)
              }}
              accessibilityRole="button"
              accessibilityState={{ expanded: showMoreReads }}
            >
              <Text style={styles.moreReadsText}>
                {showMoreReads
                  ? language === 'th'
                    ? 'ซ่อนหัวข้อเพิ่มเติม'
                    : 'Hide more reads'
                  : language === 'th'
                    ? 'ดูหัวข้อเพิ่มเติม'
                    : 'Show more reads'}
              </Text>
              <MaterialCommunityIcons
                name={showMoreReads ? 'chevron-up' : 'chevron-down'}
                size={17}
                color={Sport.muted}
              />
            </PressableScale>
          ) : null}
        </View>
      )}

      {!entitlement.hasPro && lockedCardCount > 0 && (
        <Link href="/pro" asChild>
          <PressableScale style={styles.lockedCta}>
            <MaterialCommunityIcons name="crown" size={15} color={Sport.amber} />
            <Text style={styles.lockedCtaText}>
              {language === 'th'
                ? `ปลดล็อกอีก ${lockedCardCount} การ์ดด้วย Pro`
                : `${lockedCardCount} deeper ${lockedCardCount === 1 ? 'card' : 'cards'} with Pro`}
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color={Sport.amber} />
          </PressableScale>
        </Link>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: Sport.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Sport.line,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  headingBlock: { gap: 4 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionLabel: { fontSize: 10, fontWeight: '900', color: Sport.muted, letterSpacing: 1.6 },
  sectionTitle: { color: Sport.ink, fontSize: 16, fontWeight: '900', marginTop: 4, lineHeight: 20 },
  proBadge: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
    color: Sport.amber,
    backgroundColor: Sport.amberSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  statusPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,178,61,0.32)',
    backgroundColor: 'rgba(255,178,61,0.09)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  statusPanelDone: {
    borderColor: `${Sport.green}73`,
    backgroundColor: Sport.greenSoft,
  },
  statusIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Sport.surfaceStrong,
  },
  statusEyebrow: { color: Sport.muted, fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  statusTitle: { color: Sport.ink, fontSize: 13, fontWeight: '900', lineHeight: 16, marginTop: 1 },
  statusBody: { color: Sport.inkSoft, fontSize: 11, lineHeight: 15, marginTop: 3 },
  statusSummary: { color: Sport.green, fontSize: 11, fontWeight: '900', marginTop: 3 },
  inputShell: {
    borderTopWidth: 1,
    borderTopColor: Sport.line,
    paddingTop: Spacing.md,
  },
  cardsBlock: { gap: Spacing.sm },
  subLabel: { color: Sport.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  moreReadsButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Sport.line,
    backgroundColor: Sport.surfaceStrong,
  },
  moreReadsText: { color: Sport.inkSoft, fontSize: 12, fontWeight: '900' },
  lockedCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Sport.amberSoft,
    borderWidth: 1,
    borderColor: 'rgba(255,178,61,0.34)',
  },
  lockedCtaText: { flex: 1, color: Sport.amber, fontSize: 12, fontWeight: '800' },
  empty: { fontSize: 12, color: Sport.muted, marginTop: 4 },
})
