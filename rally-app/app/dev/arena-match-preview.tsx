import { useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { router, Stack, useLocalSearchParams } from 'expo-router'

import { TeamResultReviewCard } from '@/components/match/TeamResultReviewCard'
import { TeamScoreVault } from '@/components/match/TeamSportSubmitPanel'
import { PressableScale } from '@/components/motion/PressableScale'
import { useScreenInsets } from '@/components/layout/useScreenInsets'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { deriveArenaResultPresentation } from '@/lib/arena-results/arenaResultPresentation'
import { ARENA_MATCH_LIFECYCLE_STATES, canUseArenaMatchLifecyclePreview, createArenaMatchPreviewState, getArenaMatchLifecycleCopy, getArenaMatchLifecycleFixture, getArenaMatchPreviewActions, getArenaSessionCancelledPreviewRoute, getArenaSessionSettlementPreviewRoute, isArenaMatchCancelableState, parseArenaMatchPreviewRoute, serializeArenaMatchPreviewRoute, transitionArenaMatchPreview, type ArenaMatchPreviewAction, type ArenaMatchPreviewCaptain, type ArenaMatchPreviewState } from '@/lib/dev-preview/arenaMatchLifecyclePreview'

declare const __DEV__: boolean

export default function ArenaMatchPreviewScreen() {
  const params = useLocalSearchParams<{ state?: string | string[]; matchId?: string | string[]; captain?: string | string[]; side0Score?: string | string[]; side1Score?: string | string[]; reviewEpoch?: string | string[]; cancelledFrom?: string | string[] }>()
  const devEnabled = canUseArenaMatchLifecyclePreview(__DEV__)
  const routeKey = JSON.stringify(params)
  const route = useMemo(
    () => parseArenaMatchPreviewRoute(JSON.parse(routeKey) as { state?: unknown; matchId?: unknown; captain?: unknown; side0Score?: unknown; side1Score?: unknown; reviewEpoch?: unknown; cancelledFrom?: unknown }),
    [routeKey],
  )
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { paddingTop } = useScreenInsets({ edges: ['top'], topPad: Spacing.sm })
  const [localPreview, setPreview] = useState<ArenaMatchPreviewState | null>(() => route.kind === 'preview' ? route.preview : null)

  useEffect(() => {
    if (!devEnabled) router.replace('/(tabs)' as never)
  }, [devEnabled])

  useEffect(() => {
    setPreview(route.kind === 'preview' ? route.preview : null)
  }, [route])

  const preview = route.kind === 'preview' && localPreview ? route.preview : null
  const previewMatchId = route.kind === 'preview' ? route.matchId : null
  const fixture = useMemo(() => preview && previewMatchId ? getArenaMatchLifecycleFixture(preview, previewMatchId) : null, [preview, previewMatchId])
  const presentation = useMemo(() => fixture ? deriveArenaResultPresentation(fixture.snapshot) : null, [fixture])

  if (!devEnabled) return null
  if (route.kind !== 'preview' || !preview || !previewMatchId || !fixture || !presentation) {
    return <InvalidLinkView detail={readOnlyCopy(route)} paddingTop={paddingTop} styles={styles} />
  }

  const activePreview = preview
  const activePresentation = presentation
  const activeMatchId = previewMatchId
  const copy = getArenaMatchLifecycleCopy(activePreview.state)
  const scoresAreValid = Number.isInteger(activePreview.score.sideA) && Number.isInteger(activePreview.score.sideB) && activePreview.score.sideA >= 0 && activePreview.score.sideB >= 0 && activePreview.score.sideA <= 10_000 && activePreview.score.sideB <= 10_000
  const scoresAreTied = activePreview.score.sideA === activePreview.score.sideB
  const canSubmitResult = activePresentation.mutations.submit && scoresAreValid && !scoresAreTied
  const captainALink = serializeArenaMatchPreviewRoute({ matchId: activeMatchId, preview: activePreview, captain: 'a' })
  const captainBLink = serializeArenaMatchPreviewRoute({ matchId: activeMatchId, preview: activePreview, captain: 'b' })

  function synchronize(next: ArenaMatchPreviewState, captain = next.captain) {
    const href = serializeArenaMatchPreviewRoute({ matchId: activeMatchId, preview: next, captain })
    if (!href) return
    setPreview({ ...next, captain })
    router.replace(href as never)
  }

  function perform(action: ArenaMatchPreviewAction) {
    synchronize(transitionArenaMatchPreview(activePreview, action, { canSubmit: canSubmitResult }))
  }

  function selectState(state: (typeof ARENA_MATCH_LIFECYCLE_STATES)[number]) {
    const needsOrigin = state.startsWith('cancel_requested_')
    const cancelledFrom = needsOrigin && isArenaMatchCancelableState(activePreview.state)
      ? activePreview.state
      : undefined
    if (needsOrigin && !cancelledFrom) return
    synchronize(createArenaMatchPreviewState(state, activePreview.captain, activePreview.score, cancelledFrom, needsOrigin ? activePreview.reviewEpoch + 1 : undefined))
  }

  function updateScore(side: 'sideA' | 'sideB', value: string) {
    if (!/^\d+$/.test(value)) return
    const score = Number(value)
    if (!Number.isSafeInteger(score) || score > 10_000) return
    synchronize({ ...activePreview, score: { ...activePreview.score, [side]: score } })
  }

  function openCaptainLink(captain: ArenaMatchPreviewCaptain) {
    const href = captain === 'a' ? captainALink : captainBLink
    if (href) router.replace(href as never)
  }

  const showScoreVault = presentation.kind === 'ready_to_submit' || presentation.kind === 'awaiting_resubmission'
  const showTerminalReturn = presentation.kind === 'settled' || presentation.kind === 'cancelled'

  return (
    <View style={[styles.root, { paddingTop }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerCopy}><Text style={styles.eyebrow}>DEV PREVIEW</Text><Text style={styles.title}>Arena result lifecycle</Text><Text style={styles.detail}>{copy.detail}</Text></View>
          <View style={styles.marker} accessibilityLabel="Development preview only"><Text style={styles.markerText}>DEV</Text></View>
        </View>
        <View style={styles.rolePill}><Text style={styles.roleText}>CAPTAIN {preview.captain.toUpperCase()} · SIDE {preview.captain === 'a' ? 0 : 1}</Text></View>
        <View style={styles.linksCard}>
          <Text style={styles.linksTitle}>CAPTAIN URLs</Text>
          <LocalActionButton label="OPEN CAPTAIN A URL" onPress={() => openCaptainLink('a')} theme={theme} disabled={!captainALink} />
          <Text style={styles.linkText} selectable>{captainALink}</Text>
          <LocalActionButton label="OPEN CAPTAIN B URL" onPress={() => openCaptainLink('b')} theme={theme} disabled={!captainBLink} />
          <Text style={styles.linkText} selectable>{captainBLink}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.switcher} accessibilityLabel="Arena result lifecycle state switcher">
          {ARENA_MATCH_LIFECYCLE_STATES.map((candidate) => <PressableScale key={candidate} style={[styles.stateButton, candidate === preview.state && styles.stateButtonSelected]} onPress={() => selectState(candidate)} accessibilityRole="button" accessibilityState={{ selected: candidate === preview.state }} accessibilityLabel={`Show ${candidate.replaceAll('_', ' ')}`}><Text style={[styles.stateButtonText, candidate === preview.state && styles.stateButtonTextSelected]}>{candidate.replaceAll('_', ' ').toUpperCase()}</Text></PressableScale>)}
        </ScrollView>
        <View style={styles.currentStateRow}><Text style={styles.currentState}>{copy.label}</Text><Text style={styles.scoreLabel}>{preview.score.sideA} - {preview.score.sideB}</Text></View>
        {showScoreVault ? <><TeamScoreVault activityType="basketball" teamSizePerSide={fixture.teamSizePerSide} side0Score={String(preview.score.sideA)} side1Score={String(preview.score.sideB)} editable={presentation.score.editable} onSide0ScoreChange={(value) => updateScore('sideA', value)} onSide1ScoreChange={(value) => updateScore('sideB', value)} readinessLabel={scoresAreTied ? 'คะแนนเสมอ ต้องส่งแต้มตัดสิน' : presentation.readiness.label} readinessTone={scoresAreTied ? 'risk' : presentation.readiness.tone} /><LocalActionButton label={presentation.kind === 'awaiting_resubmission' ? 'SUBMIT NEW RESULT' : 'SUBMIT RESULT'} onPress={() => perform('submit_result')} theme={theme} disabled={!canSubmitResult} /></> : null}
        {presentation.cancelPending ? <View style={styles.readOnlyCard} accessibilityLiveRegion="polite"><Text style={styles.readOnlyKicker}>{presentation.status.label.toUpperCase()}</Text><Text style={styles.readOnlyCopy}>{presentation.readiness.label}</Text>{presentation.mutations.agreeCancel ? <LocalActionButton label="AGREE TO CANCEL" onPress={() => perform('agree_cancel')} theme={theme} /> : null}{presentation.mutations.declineCancel ? <LocalActionButton label="DECLINE CANCELLATION" onPress={() => perform('decline_cancel')} theme={theme} /> : null}{presentation.mutations.withdrawCancel ? <LocalActionButton label="WITHDRAW CANCELLATION REQUEST" onPress={() => perform('withdraw_cancel')} theme={theme} /> : null}</View> : null}
        {presentation.consensus ? <TeamResultReviewCard mode="arena" consensus={{ side0Score: presentation.consensus.side0Score, side1Score: presentation.consensus.side1Score, resultVersion: presentation.consensus.resultVersion, approvalLabel: presentation.consensus.approvalLabel, side0Approved: presentation.consensus.side0Approved, side1Approved: presentation.consensus.side1Approved, actorApproved: presentation.consensus.actorAlreadyApproved, canApprove: presentation.mutations.approve, canRequestCorrection: presentation.mutations.requestCorrection }} isApproving={false} correctionBusy={false} canRequestCancel={presentation.mutations.requestCancel} canAgreeCancel={presentation.mutations.agreeCancel} canDeclineCancel={presentation.mutations.declineCancel} canWithdrawCancel={presentation.mutations.withdrawCancel} cancelBusy={false} actionsLocked={false} reduceMotion onApprove={() => perform('approve_result')} onRequestCorrection={() => perform('request_correction')} onRequestCancel={() => perform('request_cancel')} onAgreeCancel={() => perform('agree_cancel')} onDeclineCancel={() => perform('decline_cancel')} onWithdrawCancel={() => perform('withdraw_cancel')} /> : null}
        {presentation.kind === 'held' ? <View style={styles.readOnlyCard}><Text style={styles.readOnlyKicker}>HELD · READ ONLY</Text><Text style={styles.readOnlyCopy}>ผลรอบนี้อยู่ระหว่างตรวจสอบ จึงไม่มีปุ่มส่ง ยืนยัน หรือยกเลิกใน preview</Text></View> : null}
        {showTerminalReturn ? <View style={styles.terminalMarker}><Text style={styles.terminalTitle}>{presentation.terminal?.title ?? copy.label}</Text><Text style={styles.terminalDetail}>{presentation.terminal?.detail ?? 'Local preview only. ไม่มีการเขียน settlement จริง'}</Text><LocalActionButton label="RETURN TO ARENA SESSION" onPress={() => router.push((presentation.kind === 'cancelled' ? getArenaSessionCancelledPreviewRoute() : getArenaSessionSettlementPreviewRoute()) as never)} theme={theme} /></View> : null}
        {preview.actionLog.length > 0 ? <View style={styles.logCard}><Text style={styles.logTitle}>LOCAL ACTION LOG</Text>{preview.actionLog.map((entry, index) => <Text key={`${entry}-${index}`} style={styles.logEntry}>{index + 1}. {entry}</Text>)}</View> : null}
        <Text style={styles.authorityNote}>DEV only · {getArenaMatchPreviewActions(preview.state, preview.captain).length} production action(s) available · no backend calls</Text>
      </ScrollView>
    </View>
  )
}

function InvalidLinkView({ detail, paddingTop, styles }: { detail: string; paddingTop: number; styles: ReturnType<typeof createStyles> }) {
  return <View style={[styles.root, { paddingTop }]}><Stack.Screen options={{ headerShown: false }} /><View style={styles.invalidLinkCard}><Text style={styles.eyebrow}>DEV PREVIEW · READ ONLY</Text><Text style={styles.title}>Invalid Arena preview link</Text><Text style={styles.detail}>{detail}</Text></View></View>
}

function readOnlyCopy(route: ReturnType<typeof parseArenaMatchPreviewRoute>): string {
  if (route.kind === 'preview') return ''
  if (route.reason === 'missing_cancelled_from') return 'ลิงก์ cancellation ต้องมี cancelledFrom ที่ระบุสถานะก่อนขอยกเลิก'
  if (route.reason === 'duplicate') return 'ลิงก์ส่ง query key ซ้ำ จึงเปิดได้แบบอ่านอย่างเดียว'
  return 'ลิงก์ Arena preview ไม่ครบหรือไม่ถูกต้อง จึงเปิดได้แบบอ่านอย่างเดียว'
}

function LocalActionButton({ label, onPress, theme, disabled = false }: { label: string; onPress: () => void; theme: SportPalette; disabled?: boolean }) {
  return <PressableScale style={{ minHeight: 44, borderRadius: Radius.lg, backgroundColor: theme.orange, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.md, opacity: disabled ? 0.45 : 1 }} onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled }} accessibilityLabel={label}><Text style={{ color: theme.fightInk, fontSize: 12, fontWeight: '900', letterSpacing: 0.8 }}>{label}</Text></PressableScale>
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({ root: { flex: 1, backgroundColor: theme.arenaPage }, content: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl, gap: Spacing.md }, header: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm }, headerCopy: { flex: 1, gap: 3 }, eyebrow: { color: theme.orange, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }, title: { color: theme.ink, fontSize: 21, fontWeight: '900' }, detail: { color: theme.muted, fontSize: 12, lineHeight: 18, fontWeight: '700' }, marker: { minWidth: 54, minHeight: 44, borderRadius: Radius.pill, backgroundColor: theme.orange, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 }, markerText: { color: theme.fightInk, fontSize: 12, fontWeight: '900', letterSpacing: 1 }, rolePill: { alignSelf: 'flex-start', minHeight: 32, borderRadius: Radius.pill, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.bgElevated, justifyContent: 'center', paddingHorizontal: Spacing.sm }, roleText: { color: theme.muted, fontSize: 11, fontWeight: '800' }, linksCard: { borderRadius: Radius.lg, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.bgElevated, padding: Spacing.sm, gap: Spacing.xs }, linksTitle: { color: theme.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1 }, linkText: { color: theme.muted, fontSize: 9, fontWeight: '700' }, invalidLinkCard: { margin: Spacing.md, borderRadius: Radius.xl, borderWidth: 1, borderColor: theme.risk, backgroundColor: theme.bgElevated, padding: Spacing.lg, gap: Spacing.sm }, switcher: { gap: Spacing.xs }, stateButton: { minHeight: 44, borderRadius: Radius.pill, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.bgElevated, justifyContent: 'center', paddingHorizontal: 13 }, stateButtonSelected: { backgroundColor: theme.ink, borderColor: theme.ink }, stateButtonText: { color: theme.ink, fontSize: 10, fontWeight: '900' }, stateButtonTextSelected: { color: theme.bgElevated }, currentStateRow: { minHeight: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm }, currentState: { color: theme.ink, fontSize: 13, fontWeight: '900' }, scoreLabel: { color: theme.amber, fontSize: 16, fontWeight: '900', fontVariant: ['tabular-nums'] }, readOnlyCard: { borderRadius: Radius.xl, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.bgElevated, padding: Spacing.md, gap: Spacing.xs }, readOnlyKicker: { color: theme.risk, fontSize: 11, fontWeight: '900', letterSpacing: 1 }, readOnlyCopy: { color: theme.ink, fontSize: 12, lineHeight: 18, fontWeight: '700' }, terminalMarker: { borderRadius: Radius.xl, borderWidth: 1, borderColor: theme.green, backgroundColor: theme.trustSoft, padding: Spacing.md, gap: Spacing.sm }, terminalTitle: { color: theme.green, fontSize: 12, fontWeight: '900', letterSpacing: 0.8 }, terminalDetail: { color: theme.muted, fontSize: 12, lineHeight: 18, fontWeight: '700' }, logCard: { borderRadius: Radius.lg, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.bgElevated, padding: Spacing.sm, gap: 4 }, logTitle: { color: theme.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1 }, logEntry: { color: theme.ink, fontSize: 11, fontWeight: '700' }, authorityNote: { color: theme.muted, fontSize: 10, fontWeight: '700', textAlign: 'center' } })
}
