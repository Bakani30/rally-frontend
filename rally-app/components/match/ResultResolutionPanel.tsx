import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { summarizeProposedResult } from '@/lib/match/resultCorrection'
import type {
  MatchCancelRequest,
  MatchParticipant,
  MatchResultCorrectionRequest,
  ProposedResultPayload,
} from '@/types/match'
import { MutualCancelCard } from './MutualCancelCard'
import { ScoreCorrectionForm } from './ScoreCorrectionForm'

type ResultResolutionPanelProps = {
  activityType: string
  submittedScoreLabel?: string | null
  correctionRequest: MatchResultCorrectionRequest | null
  cancelRequest: MatchCancelRequest | null
  participants: MatchParticipant[]
  canRequestCorrection: boolean
  canRespondCorrection: boolean
  canRequestCancel: boolean
  canRespondCancel: boolean
  isBusy: boolean
  onRequestCorrection: (proposed: ProposedResultPayload) => void
  onAgreeCorrection: () => void
  onDeclineCorrection: () => void
  onRequestCancel: () => void
  onAgreeCancel: () => void
  onDeclineCancel: () => void
  onEscalateToAdmin: () => void
  isRequestingCorrection?: boolean
  isRespondingCorrection?: boolean
  isRequestingCancel?: boolean
  isRespondingCancel?: boolean
  isEscalating?: boolean
}

export function ResultResolutionPanel({
  activityType,
  submittedScoreLabel,
  correctionRequest,
  cancelRequest,
  participants,
  canRequestCorrection,
  canRespondCorrection,
  canRequestCancel,
  canRespondCancel,
  isBusy,
  onRequestCorrection,
  onAgreeCorrection,
  onDeclineCorrection,
  onRequestCancel,
  onAgreeCancel,
  onDeclineCancel,
  onEscalateToAdmin,
  isRequestingCorrection = false,
  isRespondingCorrection = false,
  isRequestingCancel = false,
  isRespondingCancel = false,
  isEscalating = false,
}: ResultResolutionPanelProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const [showCorrectionForm, setShowCorrectionForm] = useState(false)

  const hasPendingCorrection = correctionRequest !== null
  const hasPendingCancel = cancelRequest !== null
  const showEscalateLink = !hasPendingCorrection && !hasPendingCancel

  const correctionSummary = correctionRequest
    ? summarizeProposedResult(correctionRequest)
    : null

  const expiresLabel = correctionRequest
    ? new Date(correctionRequest.expires_at).toLocaleString()
    : null

  return (
    <View style={styles.panel}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.pill}>
          <Text style={styles.pillText}>ตัดสินผล</Text>
        </View>
        {submittedScoreLabel ? (
          <View style={styles.vaultRow}>
            <MaterialCommunityIcons name="scoreboard-outline" size={13} color={theme.muted} />
            <Text style={styles.vaultLabel}>{submittedScoreLabel}</Text>
          </View>
        ) : null}
      </View>

      {/* Correction section */}
      {hasPendingCorrection && correctionRequest ? (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <MaterialCommunityIcons name="pencil-circle-outline" size={15} color="#eb773c" />
            <Text style={styles.sectionLabel}>คำขอแก้คะแนน</Text>
          </View>

          <View style={styles.correctionCard}>
            <Text style={styles.correctionScore}>{correctionSummary}</Text>
            {!canRespondCorrection && expiresLabel ? (
              <Text style={styles.waitingText}>
                {'รออีกฝ่ายยืนยัน · หมดเวลา '}
                {expiresLabel}
              </Text>
            ) : null}
          </View>

          {canRespondCorrection && (
            <View style={styles.actionRow}>
              <PressableScale
                style={[styles.btn, styles.btnDecline]}
                onPress={onDeclineCorrection}
                disabled={isBusy || isRespondingCorrection}
              >
                <Text style={[styles.btnText, styles.btnDeclineText]}>
                  {isRespondingCorrection ? 'กำลังส่ง…' : 'ปฏิเสธ'}
                </Text>
              </PressableScale>
              <PressableScale
                style={[styles.btn, styles.btnAgree]}
                onPress={onAgreeCorrection}
                disabled={isBusy || isRespondingCorrection}
              >
                <Text style={styles.btnText}>
                  {isRespondingCorrection ? 'กำลังส่ง…' : 'ยอมรับ'}
                </Text>
              </PressableScale>
            </View>
          )}
        </View>
      ) : (
        /* No pending correction — show CTA + form toggle + cancel embed */
        <View style={styles.section}>
          {/* Score correction CTA */}
          {canRequestCorrection && (
            <PressableScale
              style={[
                styles.btn,
                styles.btnOrange,
                (isBusy || !canRequestCorrection) && styles.btnDisabled,
              ]}
              onPress={() => setShowCorrectionForm((v) => !v)}
              disabled={isBusy || !canRequestCorrection}
            >
              <MaterialCommunityIcons
                name={showCorrectionForm ? 'chevron-up' : 'pencil-outline'}
                size={15}
                color={theme.chalk}
              />
              <Text style={styles.btnText}>แก้คะแนน</Text>
            </PressableScale>
          )}

          {showCorrectionForm && (
            <ScoreCorrectionForm
              activityType={activityType}
              isSubmitting={isRequestingCorrection}
              onCancel={() => setShowCorrectionForm(false)}
              onSubmit={(proposed) => {
                onRequestCorrection(proposed)
                setShowCorrectionForm(false)
              }}
            />
          )}

          {/* Mutual cancel sub-section */}
          {(hasPendingCancel || canRequestCancel || canRespondCancel) && (
            <MutualCancelCard
              request={cancelRequest}
              participants={participants}
              canRequest={canRequestCancel}
              canRespond={canRespondCancel}
              isRequesting={isRequestingCancel}
              isResponding={isRespondingCancel}
              onRequest={onRequestCancel}
              onAgree={onAgreeCancel}
              onDecline={onDeclineCancel}
            />
          )}
        </View>
      )}

      {/* Admin escalation footer */}
      {showEscalateLink && (
        <View style={styles.footerRow}>
          <PressableScale
            style={[styles.escalateBtn, (isBusy || isEscalating) && styles.btnDisabled]}
            onPress={onEscalateToAdmin}
            disabled={isBusy || isEscalating}
          >
            <MaterialCommunityIcons name="alert-circle-outline" size={13} color={theme.muted} />
            <Text style={styles.escalateText}>
              {isEscalating ? 'กำลังส่ง…' : 'โต้แย้ง → ส่งแอดมิน'}
            </Text>
          </PressableScale>
        </View>
      )}
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    panel: {
      backgroundColor: '#161616',
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: theme.line,
      padding: Spacing.md,
      gap: Spacing.sm,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.sm,
    },
    pill: {
      backgroundColor: 'rgba(235,119,60,0.15)',
      borderRadius: Radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: 'rgba(235,119,60,0.35)',
    },
    pillText: {
      fontSize: 10,
      fontWeight: '900',
      color: '#eb773c',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    vaultRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    vaultLabel: {
      fontSize: 13,
      fontWeight: '800',
      color: theme.chalk,
      letterSpacing: 0.5,
    },
    section: {
      gap: Spacing.sm,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    sectionLabel: {
      fontSize: 10,
      fontWeight: '900',
      color: '#eb773c',
      letterSpacing: 1.1,
      textTransform: 'uppercase',
    },
    correctionCard: {
      backgroundColor: theme.surface,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: theme.line,
      padding: Spacing.sm,
      gap: 4,
    },
    correctionScore: {
      fontSize: 18,
      fontWeight: '900',
      color: theme.chalk,
      letterSpacing: 0.3,
    },
    waitingText: {
      fontSize: 11,
      color: theme.muted,
      lineHeight: 16,
    },
    actionRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    btn: {
      flex: 1,
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Radius.lg,
      paddingHorizontal: Spacing.sm,
      gap: 5,
    },
    btnOrange: {
      backgroundColor: '#eb773c',
    },
    btnAgree: {
      backgroundColor: theme.orange,
    },
    btnDecline: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.line,
    },
    btnDisabled: {
      opacity: 0.4,
    },
    btnText: {
      fontSize: 12,
      fontWeight: '900',
      color: theme.chalk,
      letterSpacing: 0.4,
    },
    btnDeclineText: {
      color: theme.inkSoft,
    },
    footerRow: {
      alignItems: 'flex-start',
      paddingTop: Spacing.xs,
      borderTopWidth: 1,
      borderTopColor: theme.line,
    },
    escalateBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      minHeight: 36,
      paddingHorizontal: 4,
    },
    escalateText: {
      fontSize: 11,
      color: theme.muted,
      fontWeight: '600',
    },
  })
}
