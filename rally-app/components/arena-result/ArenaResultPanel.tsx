import { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, ScrollView, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useReducedMotion } from 'react-native-reanimated'

import { BasketballSelfStatDraftPanel } from '@/components/match/BasketballSelfStatDraftPanel'
import { TeamResultReviewCard } from '@/components/match/TeamResultReviewCard'
import { TeamScoreVault } from '@/components/match/TeamSportSubmitPanel'
import { AnimatedNumber } from '@/components/motion/AnimatedNumber'
import { PressableScale } from '@/components/motion/PressableScale'
import { Reveal } from '@/components/motion/Reveal'
import { StatusPill } from '@/components/ui/StatusPill'
import { ActivityColor, Motion, Spacing } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useArenaResult } from '@/hooks/useArenaResult'
import { useUpsertBasketballPlayerStatDraft } from '@/hooks/useBasketballPlayerStatDraft'
import { deriveArenaResultPresentation } from '@/lib/arena-results/arenaResultPresentation'
import { returnToArenaSession } from '@/lib/arena-results/arenaResultNavigation'
import type { ArenaRoundResultSnapshot } from '@/types/arenaResult'

import { createArenaResultPanelStyles } from './arenaResultPanelStyles'

type ArenaResultPanelProps = {
  matchId: string | undefined
}

export function ArenaResultPanel({ matchId }: ArenaResultPanelProps) {
  const insets = useSafeAreaInsets()
  const theme = useSportTheme()
  const queryClient = useQueryClient()
  const reduceMotion = useReducedMotion()
  const styles = createArenaResultPanelStyles(theme)
  const {
    resultQuery,
    snapshot,
    submitMutation,
    approveMutation,
    correctionMutation,
    cancelMutation,
    hasVersionConflict,
    clearConflict,
    refreshAfterStatSave,
    authoritativeRefresh,
    retryAuthoritativeRefresh,
  } = useArenaResult(matchId)
  const statMutation = useUpsertBasketballPlayerStatDraft(matchId)
  const [side0Score, setSide0Score] = useState('0')
  const [side1Score, setSide1Score] = useState('0')
  const [actionError, setActionError] = useState<string | null>(null)
  const [isReturning, setIsReturning] = useState(false)
  const scoreSeedRef = useRef<string | null>(null)

  const presentation = useMemo(() => {
    if (!snapshot) return null
    try {
      return deriveArenaResultPresentation(snapshot)
    } catch {
      return null
    }
  }, [snapshot])
  const scoreSeed = scoreSeedFor(snapshot, presentation?.score.editable ?? false)

  useEffect(() => {
    if (!presentation?.score.editable || !scoreSeed) return
    if (scoreSeedRef.current === scoreSeed) return

    scoreSeedRef.current = scoreSeed
    setSide0Score(String(presentation.score.side0 ?? 0))
    setSide1Score(String(presentation.score.side1 ?? 0))
  }, [presentation?.score.editable, presentation?.score.side0, presentation?.score.side1, scoreSeed])

  const parsedSide0 = parseScore(side0Score)
  const parsedSide1 = parseScore(side1Score)
  const scoresAreValid = parsedSide0 !== null && parsedSide1 !== null
  const scoresAreTied = scoresAreValid && parsedSide0 === parsedSide1
  const mutationPending = submitMutation.isPending
    || approveMutation.isPending
    || correctionMutation.isPending
    || cancelMutation.isPending
    || statMutation.isPending
  const actionsLocked = hasVersionConflict || authoritativeRefresh.locked || mutationPending
  const teamSizePerSide = Math.max(1, Math.floor((presentation?.readiness.progress.total ?? 2) / 2))
  const submittedResult = snapshot?.currentResult?.kind === 'submitted'
    ? snapshot.currentResult
    : null
  const canSubmit = Boolean(
    presentation?.mutations.submit
    && scoresAreValid
    && !scoresAreTied
    && !actionsLocked,
  )

  async function runAction(action: () => Promise<unknown>) {
    if (actionsLocked) return
    setActionError(null)
    try {
      await action()
    } catch (error) {
      setActionError(isVersionConflict(error)
        ? 'มีผลแข่งเวอร์ชันใหม่ กรุณาตรวจสอบข้อมูลล่าสุดก่อนดำเนินการอีกครั้ง'
        : 'ดำเนินการไม่สำเร็จ กรุณาตรวจการเชื่อมต่อแล้วลองอีกครั้ง')
    }
  }

  function submitScore() {
    if (!presentation?.mutations.submit || !scoresAreValid || scoresAreTied || actionsLocked) return
    void runAction(() => submitMutation.mutateAsync({
      side0Score: parsedSide0!,
      side1Score: parsedSide1!,
    }))
  }

  function approveResult() {
    if (!presentation?.mutations.approve || !submittedResult || actionsLocked) return
    void runAction(() => approveMutation.mutateAsync({
      resultVersion: submittedResult.resultVersion,
      payloadHash: submittedResult.payloadHash,
    }))
  }

  function requestCorrection() {
    if (!presentation?.mutations.requestCorrection || !submittedResult || actionsLocked) return
    void runAction(() => correctionMutation.mutateAsync({
      resultVersion: submittedResult.resultVersion,
      payloadHash: submittedResult.payloadHash,
    }))
  }

  function requestCancel() {
    if (!presentation?.mutations.requestCancel || actionsLocked) return
    void runAction(() => cancelMutation.mutateAsync({ cancelAction: 'request' }))
  }

  function agreeCancel() {
    if (!presentation?.mutations.agreeCancel || actionsLocked) return
    void runAction(() => cancelMutation.mutateAsync({ cancelAction: 'agree' }))
  }

  function declineCancel() {
    if (!presentation?.mutations.declineCancel || actionsLocked) return
    void runAction(() => cancelMutation.mutateAsync({ cancelAction: 'decline' }))
  }

  function withdrawCancel() {
    if (!presentation?.mutations.withdrawCancel || actionsLocked) return
    void runAction(() => cancelMutation.mutateAsync({ cancelAction: 'withdraw' }))
  }

  async function returnToArena() {
    if (!snapshot || isReturning) return
    setIsReturning(true)
    await returnToArenaSession({
      queryClient,
      arenaEventId: snapshot.arenaEventId,
      navigation: {
        canGoBack: () => router.canGoBack(),
        back: () => router.back(),
        replace: (href) => router.replace(href as never),
      },
    })
    setIsReturning(false)
  }

  if (resultQuery.isPending) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={ActivityColor.basketball} />
        <Text style={styles.loadingText}>กำลังโหลดผลการแข่งขัน Arena</Text>
      </View>
    )
  }

  if (!snapshot || !presentation) {
    return (
      <View style={styles.loading}>
        <View style={styles.notice}>
          <View style={styles.noticeRow}>
            <MaterialCommunityIcons name="shield-alert-outline" size={20} color={theme.risk} />
            <Text style={styles.noticeTitle}>เปิดผลการแข่งขันนี้ไม่ได้</Text>
          </View>
          <Text style={styles.noticeDetail}>ข้อมูลผลรอบนี้ไม่พร้อมใช้งาน จึงยังไม่แสดงการส่งหรือยืนยันผล</Text>
          <PressableScale
            style={styles.primaryAction}
            onPress={() => {
              setActionError(null)
              clearConflict()
              void resultQuery.refetch()
            }}
            accessibilityLabel="ลองโหลดผลการแข่งขัน Arena ใหม่"
          >
            <MaterialCommunityIcons name="refresh" size={18} color={theme.bg} />
            <Text style={styles.primaryActionText}>ลองใหม่</Text>
          </PressableScale>
        </View>
      </View>
    )
  }

  const terminal = presentation.terminal
  const showStandaloneCancel = !presentation.consensus
    && (presentation.mutations.requestCancel
      || presentation.mutations.agreeCancel
      || presentation.mutations.declineCancel
      || presentation.mutations.withdrawCancel)
  const isCancelledTerminal = presentation.kind === 'cancelled'
  const terminalIconName = isCancelledTerminal
    ? 'cancel'
    : terminal?.celebrates
      ? 'trophy-outline'
      : 'flag-checkered'
  const terminalIconColor = isCancelledTerminal ? theme.risk : theme.green
  const terminalResult = terminal ? (
    <View style={styles.terminal}>
      <View style={[
        styles.terminalIcon,
        { backgroundColor: isCancelledTerminal ? theme.riskSoft : theme.greenSoft },
      ]}>
        <MaterialCommunityIcons name={terminalIconName} size={27} color={terminalIconColor} />
      </View>
      <Text style={styles.terminalTitle}>{terminal.title}</Text>
      {presentation.score.side0 !== null && presentation.score.side1 !== null ? (
        <Text style={styles.finalScore}>
          {terminal.celebrates && !reduceMotion ? (
            <AnimatedNumber value={presentation.score.side0} duration={Motion.base} animateFromZero />
          ) : presentation.score.side0}
          <Text style={styles.finalDash}>  -  </Text>
          {terminal.celebrates && !reduceMotion ? (
            <AnimatedNumber value={presentation.score.side1} duration={Motion.base} animateFromZero />
          ) : presentation.score.side1}
        </Text>
      ) : null}
      <Text style={styles.terminalDetail}>{terminal.detail}</Text>
      <Text style={[styles.rotation, isCancelledTerminal && { color: theme.muted }]}>{terminal.rotationLabel}</Text>
    </View>
  ) : null

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(Spacing.xxxl, insets.bottom + Spacing.xl) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={[styles.activityIcon, { backgroundColor: ActivityColor.basketball }]}>
            <MaterialCommunityIcons name="basketball" size={25} color={theme.bg} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>ARENA RESULT</Text>
            <Text style={styles.title}>ผลการแข่งขัน Arena</Text>
          </View>
          {reduceMotion ? (
            <View style={styles.staticStatus}>
              <Text style={styles.staticStatusText}>{presentation.status.label}</Text>
            </View>
          ) : (
            <StatusPill status={presentation.status.value} label={presentation.status.label} />
          )}
        </View>

        {resultQuery.isFetching || authoritativeRefresh.isRefreshing ? (
          <View style={styles.reconnecting} accessibilityLiveRegion="polite">
            <MaterialCommunityIcons name="cloud-sync-outline" size={18} color={theme.green} />
            <Text style={styles.reconnectingText}>
              {authoritativeRefresh.isRefreshing ? 'กำลังรอผลยืนยันล่าสุดจาก Arena' : 'กำลังเชื่อมต่อข้อมูลล่าสุด'}
            </Text>
          </View>
        ) : null}

        {hasVersionConflict ? (
          <View style={styles.notice} accessibilityLiveRegion="assertive">
            <View style={styles.noticeRow}>
              <MaterialCommunityIcons name="update" size={20} color={theme.risk} />
              <Text style={styles.noticeTitle}>มีผลแข่งเวอร์ชันใหม่</Text>
            </View>
            <Text style={styles.noticeDetail}>ตรวจสอบข้อมูลล่าสุดก่อนส่งหรือยืนยันผลอีกครั้ง</Text>
            <PressableScale
              style={styles.primaryAction}
              onPress={() => {
                setActionError(null)
                clearConflict()
                void retryAuthoritativeRefresh()
              }}
              accessibilityLabel="โหลดผลแข่งเวอร์ชันใหม่"
            >
              <MaterialCommunityIcons name="refresh" size={18} color={theme.bg} />
              <Text style={styles.primaryActionText}>โหลดข้อมูลล่าสุด</Text>
            </PressableScale>
          </View>
        ) : null}

        {authoritativeRefresh.hasError ? (
          <View style={styles.notice} accessibilityLiveRegion="assertive">
            <View style={styles.noticeRow}>
              <MaterialCommunityIcons name="cloud-alert-outline" size={20} color={theme.risk} />
              <Text style={styles.noticeTitle}>ยังโหลดผลล่าสุดจาก Arena ไม่สำเร็จ</Text>
            </View>
            <Text style={styles.noticeDetail}>
              การดำเนินการอาจสำเร็จแล้ว กำลังรอข้อมูลยืนยันก่อนเปิดให้ส่งหรือยืนยันผลอีกครั้ง
            </Text>
            <PressableScale
              style={styles.primaryAction}
              onPress={() => {
                setActionError(null)
                void retryAuthoritativeRefresh()
              }}
              scaleTo={reduceMotion ? 1 : undefined}
              accessibilityLabel="ลองเชื่อมต่อผลการแข่งขัน Arena ใหม่"
            >
              <MaterialCommunityIcons name="refresh" size={18} color={theme.bg} />
              <Text style={styles.primaryActionText}>ลองเชื่อมต่อใหม่</Text>
            </PressableScale>
          </View>
        ) : null}

        {actionError ? (
          <View style={styles.notice} accessibilityLiveRegion="assertive">
            <View style={styles.noticeRow}>
              <MaterialCommunityIcons name="alert-circle-outline" size={20} color={theme.risk} />
              <Text style={styles.noticeTitle}>{actionError}</Text>
            </View>
          </View>
        ) : null}

        {terminal ? (
          <>
            {terminal.celebrates && !reduceMotion ? (
              <Reveal duration={Motion.base} translateY={Spacing.sm}>
                {terminalResult}
              </Reveal>
            ) : (
              terminalResult
            )}
            {presentation.actorStat ? (
              <BasketballSelfStatDraftPanel
                mode="arena"
                initialStats={presentation.actorStat.initial}
                initialNote={presentation.actorStat.initialNote}
                readinessLabel={presentation.actorStat.readinessLabel}
                ready={presentation.actorStat.ready}
                editable={false}
                longRangePointValue={presentation.actorStat.longRangePointValue}
                longShotLabel={presentation.actorStat.longShotLabel}
              />
            ) : null}
          </>
        ) : (
          <>
            {presentation.cancelPending ? (
              <View style={styles.notice} accessibilityLiveRegion="polite">
                <View style={styles.noticeRow}>
                  <MaterialCommunityIcons name="cancel" size={20} color={theme.risk} />
                  <Text style={styles.noticeTitle}>{presentation.status.label}</Text>
                </View>
                <Text style={styles.noticeDetail}>{presentation.readiness.label}</Text>
              </View>
            ) : null}

            {!presentation.cancelPending && presentation.actorStat ? (
              <BasketballSelfStatDraftPanel
                mode="arena"
                initialStats={presentation.actorStat.initial}
                initialNote={presentation.actorStat.initialNote}
                readinessLabel={presentation.actorStat.readinessLabel}
                ready={presentation.actorStat.ready}
                editable={presentation.actorStat.editable && !actionsLocked}
                pending={statMutation.isPending || authoritativeRefresh.isRefreshing}
                longRangePointValue={presentation.actorStat.longRangePointValue}
                longShotLabel={presentation.actorStat.longShotLabel}
                {...(presentation.actorStat.editable
                  ? {
                      onSaveSelf: async (stats, note) => {
                        if (!matchId || actionsLocked) return
                        await statMutation.mutateAsync({ matchId, stats, note })
                        await refreshAfterStatSave()
                      },
                    }
                  : {})}
              />
            ) : null}

            {!presentation.cancelPending && presentation.consensus ? (
              <TeamResultReviewCard
                mode="arena"
                consensus={{
                  side0Score: presentation.consensus.side0Score,
                  side1Score: presentation.consensus.side1Score,
                  resultVersion: presentation.consensus.resultVersion,
                  approvalLabel: presentation.consensus.approvalLabel,
                  side0Approved: presentation.consensus.side0Approved,
                  side1Approved: presentation.consensus.side1Approved,
                  actorApproved: presentation.consensus.actorAlreadyApproved,
                  canApprove: presentation.mutations.approve,
                  canRequestCorrection: presentation.mutations.requestCorrection,
                }}
                isApproving={approveMutation.isPending}
                correctionBusy={correctionMutation.isPending}
                canRequestCancel={presentation.mutations.requestCancel}
                canAgreeCancel={presentation.mutations.agreeCancel}
                canDeclineCancel={presentation.mutations.declineCancel}
                canWithdrawCancel={presentation.mutations.withdrawCancel}
                cancelBusy={cancelMutation.isPending}
                actionsLocked={actionsLocked}
                reduceMotion={reduceMotion}
                onApprove={approveResult}
                onRequestCorrection={requestCorrection}
                onRequestCancel={requestCancel}
                onAgreeCancel={agreeCancel}
                onDeclineCancel={declineCancel}
                onWithdrawCancel={withdrawCancel}
              />
            ) : !presentation.cancelPending ? (
              <>
                {presentation.score.contextLabel ? (
                  <Text style={styles.helper}>{presentation.score.contextLabel}</Text>
                ) : null}
                <TeamScoreVault
                  activityType="basketball"
                  teamSizePerSide={teamSizePerSide}
                  side0Score={side0Score}
                  side1Score={side1Score}
                  editable={presentation.score.editable && !actionsLocked}
                  onSide0ScoreChange={presentation.mutations.submit && !actionsLocked
                    ? (value) => {
                        setActionError(null)
                        setSide0Score(value.replace(/[^\d]/g, ''))
                      }
                    : undefined}
                  onSide1ScoreChange={presentation.mutations.submit && !actionsLocked
                    ? (value) => {
                        setActionError(null)
                        setSide1Score(value.replace(/[^\d]/g, ''))
                      }
                    : undefined}
                  readinessLabel={presentation.readiness.label}
                  readinessTone={presentation.readiness.tone}
                />
                {presentation.score.tieHelper ? (
                  <Text style={styles.helper}>{presentation.score.tieHelper}</Text>
                ) : null}
                {presentation.mutations.submit ? (
                  <PressableScale
                    style={[styles.primaryAction, !canSubmit && styles.primaryActionDisabled]}
                    onPress={submitScore}
                    disabled={!canSubmit}
                    scaleTo={reduceMotion ? 1 : undefined}
                    accessibilityLabel="ส่งผลการแข่งขัน"
                    accessibilityState={{ disabled: !canSubmit }}
                  >
                    <MaterialCommunityIcons name="send-check-outline" size={18} color={canSubmit ? theme.bg : theme.muted} />
                    <Text style={[styles.primaryActionText, !canSubmit && styles.primaryActionTextDisabled]}>
                      {submitMutation.isPending ? 'กำลังส่งผล…' : 'ส่งผลการแข่งขัน'}
                    </Text>
                  </PressableScale>
                ) : null}
              </>
            ) : null}

            {showStandaloneCancel ? (
              <View style={styles.standaloneActions}>
                {presentation.mutations.requestCancel ? (
                  <PressableScale
                    style={[styles.secondaryAction, styles.dangerAction, actionsLocked && styles.primaryActionDisabled]}
                    onPress={requestCancel}
                    disabled={actionsLocked}
                    scaleTo={reduceMotion ? 1 : undefined}
                    accessibilityLabel="ขอยกเลิกรอบ"
                  >
                    <MaterialCommunityIcons name="cancel" size={16} color={theme.risk} />
                    <Text style={styles.dangerActionText}>ขอยกเลิกรอบ</Text>
                  </PressableScale>
                ) : null}
                {presentation.mutations.agreeCancel ? (
                  <PressableScale
                    style={[styles.secondaryAction, styles.dangerAction, actionsLocked && styles.primaryActionDisabled]}
                    onPress={agreeCancel}
                    disabled={actionsLocked}
                    scaleTo={reduceMotion ? 1 : undefined}
                    accessibilityLabel="ยืนยันการยกเลิกของอีกทีม"
                  >
                    <MaterialCommunityIcons name="cancel" size={16} color={theme.risk} />
                    <Text style={styles.dangerActionText}>ยืนยันการยกเลิกของอีกทีม</Text>
                  </PressableScale>
                ) : null}
                {presentation.mutations.declineCancel ? (
                  <PressableScale
                    style={[styles.secondaryAction, styles.dangerAction, actionsLocked && styles.primaryActionDisabled]}
                    onPress={declineCancel}
                    disabled={actionsLocked}
                    scaleTo={reduceMotion ? 1 : undefined}
                    accessibilityLabel="ปฏิเสธการยกเลิก"
                  >
                    <MaterialCommunityIcons name="close-circle-outline" size={16} color={theme.risk} />
                    <Text style={styles.dangerActionText}>ปฏิเสธการยกเลิก</Text>
                  </PressableScale>
                ) : null}
                {presentation.mutations.withdrawCancel ? (
                  <PressableScale
                    style={[styles.secondaryAction, actionsLocked && styles.primaryActionDisabled]}
                    onPress={withdrawCancel}
                    disabled={actionsLocked}
                    scaleTo={reduceMotion ? 1 : undefined}
                    accessibilityLabel="ถอนคำขอยกเลิก"
                  >
                    <MaterialCommunityIcons name="undo-variant" size={16} color={theme.inkSoft} />
                    <Text style={styles.secondaryActionText}>ถอนคำขอยกเลิก</Text>
                  </PressableScale>
                ) : null}
              </View>
            ) : null}

            {presentation.readOnly ? (
              <Text style={styles.helper}>รอบนี้อยู่ในสถานะอ่านอย่างเดียว</Text>
            ) : null}
          </>
        )}

        {presentation.showReturnToArena ? (
          <PressableScale
            style={styles.returnAction}
            onPress={() => { void returnToArena() }}
            disabled={isReturning}
            scaleTo={reduceMotion ? 1 : undefined}
            accessibilityLabel="กลับ Arena"
          >
            <MaterialCommunityIcons name="arrow-left" size={18} color={theme.ink} />
            <Text style={styles.returnActionText}>{isReturning ? 'กำลังกลับ Arena…' : 'กลับ Arena'}</Text>
          </PressableScale>
        ) : null}
      </ScrollView>
    </View>
  )
}

function parseScore(value: string): number | null {
  if (!/^\d+$/.test(value)) return null
  const score = Number(value)
  return Number.isSafeInteger(score) && score >= 0 ? score : null
}

function scoreSeedFor(snapshot: ArenaRoundResultSnapshot | undefined, editable: boolean): string | null {
  if (!snapshot || !editable) return null
  const result = snapshot.currentResult
  if (result?.kind === 'awaiting_resubmission') {
    return `${snapshot.matchId}:resubmission:${result.resultVersion}:${result.previousSide0Score}:${result.previousSide1Score}`
  }
  return `${snapshot.matchId}:entry:${snapshot.draftReadiness.complete}`
}

function isVersionConflict(error: unknown): boolean {
  return Boolean(
    error
    && typeof error === 'object'
    && 'code' in error
    && (error as { code?: unknown }).code === 'arena_result_version_conflict',
  )
}
