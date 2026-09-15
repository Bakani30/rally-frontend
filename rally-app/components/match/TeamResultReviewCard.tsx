import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { getSportPalette, ActivityColor, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { getParticipantDisplayName } from '@/lib/match/matchRules'
import type {
  AlphaRefereeResultSubmission,
  AlphaRefereePlayerStatDraft,
  MatchParticipant,
  MatchParticipantContribution,
  MatchTeamResultSubmission,
  Side,
} from '@/types/match'

export type LegacyTeamResultReviewCardProps = {
  mode: 'legacy'
  submissions: MatchTeamResultSubmission[]
  participants: MatchParticipant[]
  contributions: MatchParticipantContribution[]
  mySide: Side | null
  alphaRefereeResult?: AlphaRefereeResultSubmission | null
  refereeStatDrafts?: AlphaRefereePlayerStatDraft[]
  totalPot?: number
  currencyLabel?: string
  isAccepting?: boolean
  challengeOpen?: boolean
  canReviewResult?: boolean
  editLabel?: string
  myCorrectionDeclined?: boolean
  onAccept: () => void
  onEdit: () => void
  onOpenManage: () => void
  onRequestCorrection?: () => void
  canRequestCorrection?: boolean
  correctionPending?: boolean
  correctionBusy?: boolean
}

export type ArenaConsensusReview = {
  side0Score: number
  side1Score: number
  resultVersion: number
  approvalLabel: string
  side0Approved: boolean
  side1Approved: boolean
  actorApproved: boolean
  canApprove: boolean
  canRequestCorrection: boolean
}

export type ArenaTeamResultReviewCardProps = {
  mode: 'arena'
  consensus: ArenaConsensusReview
  isApproving: boolean
  correctionBusy: boolean
  canRequestCancel: boolean
  canAgreeCancel: boolean
  canDeclineCancel: boolean
  canWithdrawCancel: boolean
  cancelBusy: boolean
  actionsLocked: boolean
  reduceMotion: boolean
  onApprove: () => void
  onRequestCorrection: () => void
  onRequestCancel: () => void
  onAgreeCancel: () => void
  onDeclineCancel: () => void
  onWithdrawCancel: () => void
}

export type TeamResultReviewCardProps =
  | LegacyTeamResultReviewCardProps
  | ArenaTeamResultReviewCardProps

export function TeamResultReviewCard(props: TeamResultReviewCardProps) {
  const arenaTheme = useSportTheme()

  if (props.mode === 'arena') {
    const styles = createStyles(arenaTheme)
    const {
      consensus,
      isApproving,
      correctionBusy,
      canRequestCancel,
      canAgreeCancel,
      canDeclineCancel,
      canWithdrawCancel,
      cancelBusy,
      actionsLocked,
      reduceMotion,
      onApprove,
      onRequestCorrection,
      onRequestCancel,
      onAgreeCancel,
      onDeclineCancel,
      onWithdrawCancel,
    } = props
    const showApprove = consensus.canApprove && !consensus.actorApproved
    const hasActions = showApprove
      || consensus.canRequestCorrection
      || canRequestCancel
      || canAgreeCancel
      || canDeclineCancel
      || canWithdrawCancel

    return (
      <View style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.arenaHeaderCopy}>
            <Text style={styles.kicker}>CAPTAIN CONSENSUS</Text>
            <Text style={styles.arenaVersionLabel}>ผลแข่งเวอร์ชัน {consensus.resultVersion}</Text>
          </View>
          <View style={styles.arenaVersionPill}>
            <MaterialCommunityIcons name="shield-check-outline" size={14} color={arenaTheme.green} />
            <Text style={styles.arenaVersionPillText}>รอยืนยัน</Text>
          </View>
        </View>

        <Text style={styles.score} accessibilityLabel={`คะแนน ฝ่าย A ${consensus.side0Score} ต่อ ฝ่าย B ${consensus.side1Score}`}>
          {consensus.side0Score}
          <Text style={styles.dash}>  -  </Text>
          {consensus.side1Score}
        </Text>

        <View style={styles.acceptanceRow}>
          <View style={[
            styles.arenaStatusChip,
            { borderColor: arenaTheme.orange, backgroundColor: arenaTheme.orangeSoft },
          ]}>
            <Text style={[styles.arenaStatusText, { color: arenaTheme.orange }]}>
              ฝ่าย A · {consensus.side0Approved ? 'ยืนยันแล้ว' : 'รอยืนยัน'}
            </Text>
          </View>
          <View style={[
            styles.arenaStatusChip,
            { borderColor: arenaTheme.blue, backgroundColor: arenaTheme.blueSoft },
          ]}>
            <Text style={[styles.arenaStatusText, { color: arenaTheme.blue }]}>
              ฝ่าย B · {consensus.side1Approved ? 'ยืนยันแล้ว' : 'รอยืนยัน'}
            </Text>
          </View>
        </View>
        <Text style={styles.arenaApprovalLabel}>{consensus.approvalLabel}</Text>

        {consensus.actorApproved ? (
          <View style={styles.arenaActorApproved}>
            <MaterialCommunityIcons name="check-circle" size={16} color={arenaTheme.green} />
            <Text style={styles.arenaActorApprovedText}>คุณยืนยันผลแล้ว</Text>
          </View>
        ) : null}

        {hasActions ? (
          <View style={styles.actionDock}>
            {showApprove ? (
              <PressableScale
                style={[
                  styles.reviewActionButton,
                  styles.acceptButton,
                  (actionsLocked || isApproving || !consensus.canApprove) && styles.acceptButtonDisabled,
                ]}
                onPress={onApprove}
                disabled={actionsLocked || isApproving || !consensus.canApprove}
                scaleTo={reduceMotion ? 1 : undefined}
                accessibilityLabel={actionsLocked ? 'กำลังอัปเดตผลการแข่งขัน' : 'ยืนยันผล'}
              >
                <MaterialCommunityIcons
                  name="check-bold"
                  size={16}
                  color={actionsLocked || isApproving || !consensus.canApprove ? arenaTheme.inkSoft : arenaTheme.bg}
                />
                <Text style={[
                  styles.acceptText,
                  (actionsLocked || isApproving || !consensus.canApprove) && styles.acceptTextDisabled,
                ]}>
                  {actionsLocked ? 'กำลังอัปเดต…' : isApproving ? 'กำลังยืนยัน…' : 'ยืนยันผล'}
                </Text>
              </PressableScale>
            ) : null}
            {consensus.canRequestCorrection ? (
              <PressableScale
                style={[styles.reviewActionButton, styles.editButton, (actionsLocked || correctionBusy) && styles.disabled]}
                onPress={onRequestCorrection}
                disabled={actionsLocked || correctionBusy}
                scaleTo={reduceMotion ? 1 : undefined}
                accessibilityLabel={actionsLocked ? 'กำลังอัปเดตผลการแข่งขัน' : 'ขอแก้ผล'}
              >
                <MaterialCommunityIcons name="pencil" size={15} color={arenaTheme.inkSoft} />
                <Text style={styles.editText}>{actionsLocked ? 'กำลังอัปเดต…' : correctionBusy ? 'กำลังส่งคำขอ…' : 'ขอแก้ผล'}</Text>
              </PressableScale>
            ) : null}
            {canRequestCancel ? (
              <PressableScale
                style={[styles.reviewActionButton, styles.cancelButton, (actionsLocked || cancelBusy) && styles.disabled]}
                onPress={onRequestCancel}
                disabled={actionsLocked || cancelBusy}
                scaleTo={reduceMotion ? 1 : undefined}
                accessibilityLabel={actionsLocked ? 'กำลังอัปเดตผลการแข่งขัน' : 'ขอยกเลิกรอบ'}
              >
                <MaterialCommunityIcons name="cancel" size={15} color={arenaTheme.red} />
                <Text style={styles.cancelText}>{actionsLocked ? 'กำลังอัปเดต…' : cancelBusy ? 'กำลังส่งคำขอ…' : 'ขอยกเลิกรอบ'}</Text>
              </PressableScale>
            ) : null}
            {canAgreeCancel ? (
              <PressableScale
                style={[styles.reviewActionButton, styles.cancelButton, (actionsLocked || cancelBusy) && styles.disabled]}
                onPress={onAgreeCancel}
                disabled={actionsLocked || cancelBusy}
                scaleTo={reduceMotion ? 1 : undefined}
                accessibilityLabel={actionsLocked ? 'กำลังอัปเดตผลการแข่งขัน' : 'ยืนยันการยกเลิกของอีกทีม'}
              >
                <MaterialCommunityIcons name="cancel" size={15} color={arenaTheme.red} />
                <Text style={styles.cancelText}>{actionsLocked ? 'กำลังอัปเดต…' : cancelBusy ? 'กำลังยืนยัน…' : 'ยืนยันการยกเลิกของอีกทีม'}</Text>
              </PressableScale>
            ) : null}
            {canDeclineCancel ? (
              <PressableScale
                style={[styles.reviewActionButton, styles.cancelButton, (actionsLocked || cancelBusy) && styles.disabled]}
                onPress={onDeclineCancel}
                disabled={actionsLocked || cancelBusy}
                scaleTo={reduceMotion ? 1 : undefined}
                accessibilityLabel={actionsLocked ? 'กำลังอัปเดตผลการแข่งขัน' : 'ปฏิเสธการยกเลิก'}
              >
                <MaterialCommunityIcons name="close-circle-outline" size={15} color={arenaTheme.red} />
                <Text style={styles.cancelText}>{actionsLocked ? 'กำลังอัปเดต…' : cancelBusy ? 'กำลังส่งคำตอบ…' : 'ปฏิเสธการยกเลิก'}</Text>
              </PressableScale>
            ) : null}
            {canWithdrawCancel ? (
              <PressableScale
                style={[styles.reviewActionButton, styles.editButton, (actionsLocked || cancelBusy) && styles.disabled]}
                onPress={onWithdrawCancel}
                disabled={actionsLocked || cancelBusy}
                scaleTo={reduceMotion ? 1 : undefined}
                accessibilityLabel={actionsLocked ? 'กำลังอัปเดตผลการแข่งขัน' : 'ถอนคำขอยกเลิก'}
              >
                <MaterialCommunityIcons name="undo-variant" size={15} color={arenaTheme.inkSoft} />
                <Text style={styles.editText}>{actionsLocked ? 'กำลังอัปเดต…' : cancelBusy ? 'กำลังถอนคำขอ…' : 'ถอนคำขอยกเลิก'}</Text>
              </PressableScale>
            ) : null}
          </View>
        ) : (
          <Text style={styles.arenaReadOnly}>รอสถานะใหม่จาก Arena</Text>
        )}
      </View>
    )
  }

  const {
    submissions,
    participants,
    contributions,
    mySide,
    alphaRefereeResult,
    refereeStatDrafts = [],
    totalPot,
    currencyLabel = 'points',
    isAccepting = false,
    challengeOpen = false,
    canReviewResult = true,
    editLabel,
    myCorrectionDeclined = false,
    onAccept,
    onEdit,
    onOpenManage,
    onRequestCorrection = () => {},
    canRequestCorrection = false,
    correctionPending = false,
    correctionBusy = false,
  } = props
  const theme = getSportPalette('dark')
  const styles = createStyles(theme)

  const sideA = submissions.find((s) => s.side_index === 0)
  const sideB = submissions.find((s) => s.side_index === 1)
  if (!sideA || !sideB) return null

  const mySubmission = mySide == null
    ? null
    : submissions.find((submission) => submission.side_index === mySide)
  const myAccepted = !!mySubmission?.accepted_at
  const acceptDisabled = myAccepted || isAccepting || challengeOpen || mySide == null
  const isRefereeScore = alphaRefereeResult?.result_kind === 'team_score'
  const refereeName = getRefereeDisplayName(alphaRefereeResult)

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.kicker}>{isRefereeScore ? 'REFEREE SCORE REVIEW' : 'FINAL SCORE REVIEW'}</Text>
        <View style={styles.headerActions}>
          {isRefereeScore ? (
            <View style={styles.refereePill}>
              <MaterialCommunityIcons name="account-tie-outline" size={12} color={theme.green} />
              <Text style={styles.refereePillText} numberOfLines={1}>กรรมการส่งคะแนน</Text>
            </View>
          ) : null}
          {typeof totalPot === 'number' && (
            <View style={styles.potPill}>
              <MaterialCommunityIcons name="lock-outline" size={12} color={theme.amber} />
              <Text style={styles.potPillText}>{totalPot} {currencyLabel}</Text>
            </View>
          )}
          <PressableScale
            style={styles.menuButton}
            onPress={onOpenManage}
            accessibilityLabel="เปิดเมนูจัดการผลแมตช์"
          >
            <MaterialCommunityIcons name="dots-horizontal" size={20} color={theme.inkSoft} />
          </PressableScale>
        </View>
      </View>
      <Text style={styles.score}>
        {sideA.team_score}
        <Text style={styles.dash}>  -  </Text>
        {sideB.team_score}
      </Text>
      <View style={styles.acceptanceRow}>
        <StatusChip side={0} accepted={!!sideA.accepted_at} theme={theme} styles={styles} />
        <StatusChip side={1} accepted={!!sideB.accepted_at} theme={theme} styles={styles} />
      </View>
      {isRefereeScore ? (
        <View style={styles.refereeNotice}>
          <MaterialCommunityIcons name="gavel" size={16} color={theme.green} />
          <Text style={styles.refereeNoticeTitle} numberOfLines={1}>คะแนนจากกรรมการ · {refereeName}</Text>
        </View>
      ) : null}

      <ContributionSummary
        participants={participants}
        contributions={contributions}
        refereeStatDrafts={refereeStatDrafts}
        theme={theme}
        styles={styles}
      />

      {challengeOpen ? (
        <View style={styles.challengeStatus}>
          <MaterialCommunityIcons name="shield-alert-outline" size={17} color={theme.amber} />
          <View style={styles.challengeStatusCopy}>
            <Text style={styles.challengeStatusTitle}>
              {isRefereeScore ? 'รอกรรมการแก้คะแนน' : 'รอแอดมินรีวิวคะแนน'}
            </Text>
            <Text style={styles.challengeStatusHint}>
              {isRefereeScore
                ? 'รอกรรมการแก้และส่งผลใหม่ก่อนยืนยัน'
                : 'แต้มยังค้างในกองกลางจนกว่าจะรีวิวหรือมีคะแนนใหม่'}
            </Text>
          </View>
        </View>
      ) : null}

      {canReviewResult ? (
        <View style={styles.actionDock}>
          <PressableScale
            style={[
              styles.reviewActionButton,
              styles.acceptButton,
              acceptDisabled && styles.acceptButtonDisabled,
            ]}
            onPress={onAccept}
            disabled={acceptDisabled}
          >
            <MaterialCommunityIcons
              name={myAccepted ? 'check-circle' : 'check-bold'}
              size={16}
              color={acceptDisabled ? theme.inkSoft : theme.bg}
            />
            <Text style={[styles.acceptText, acceptDisabled && styles.acceptTextDisabled]}>
              {myAccepted ? 'ยอมรับแล้ว' : 'ยอมรับผล'}
            </Text>
          </PressableScale>
          {myCorrectionDeclined ? (
            <PressableScale
              style={[styles.reviewActionButton, styles.editButton]}
              onPress={onEdit}
            >
              <MaterialCommunityIcons name="flag-outline" size={15} color={theme.inkSoft} />
              <Text style={styles.editText}>{editLabel ?? 'รีพอต'}</Text>
            </PressableScale>
          ) : (
            <PressableScale
              style={[styles.reviewActionButton, styles.editButton]}
              onPress={onRequestCorrection}
              disabled={!canRequestCorrection || correctionPending || correctionBusy}
            >
              <MaterialCommunityIcons name="pencil" size={15} color={theme.inkSoft} />
              <Text style={styles.editText}>{correctionPending ? 'รอตอบรับ' : 'ขอแก้คะแนน'}</Text>
            </PressableScale>
          )}
        </View>
      ) : null}
    </View>
  )
}

function getRefereeDisplayName(result: AlphaRefereeResultSubmission | null | undefined): string {
  const referee = result?.referee
  return referee?.display_name || (referee?.handle ? `@${referee.handle}` : null) || 'กรรมการ'
}

function StatusChip({
  side,
  accepted,
  theme,
  styles,
}: {
  side: Side
  accepted: boolean
  theme: SportPalette
  styles: ReturnType<typeof createStyles>
}) {
  const color = side === 0 ? ActivityColor.basketball : theme.blue
  return (
    <View style={[styles.statusChip, { borderColor: `${color}55`, backgroundColor: `${color}18` }]}>
      <Text style={[styles.statusText, { color }]}>
        Side {side === 0 ? 'A' : 'B'} · {accepted ? 'locked' : 'reviewing'}
      </Text>
    </View>
  )
}

function ContributionSummary({
  participants,
  contributions,
  refereeStatDrafts,
  theme,
  styles,
}: {
  participants: MatchParticipant[]
  contributions: MatchParticipantContribution[]
  refereeStatDrafts: AlphaRefereePlayerStatDraft[]
  theme: SportPalette
  styles: ReturnType<typeof createStyles>
}) {
  const byUser = new Map(contributions.map((contribution) => [contribution.user_id, contribution]))
  const statByUser = new Map(refereeStatDrafts.map((stat) => [stat.user_id, stat]))
  const visible = participants.filter((participant) => byUser.has(participant.user_id) || statByUser.has(participant.user_id))
  if (visible.length === 0) return null

  return (
    <View style={styles.contribBlock}>
      <Text style={styles.sectionLabel}>PLAYER STATS</Text>
      {visible.map((participant) => {
        const contribution = byUser.get(participant.user_id)
        const stat = statByUser.get(participant.user_id)
        const sideColor = participant.side === 0 ? ActivityColor.basketball : theme.blue
        return (
          <View key={participant.user_id} style={styles.contribRow}>
            <Text style={[styles.sideText, { color: sideColor }]}>
              {participant.side === 0 ? 'A' : 'B'}
            </Text>
            <Text style={styles.contribName} numberOfLines={1}>
              {getParticipantDisplayName(participant)}
            </Text>
            <Text style={styles.contribPoints}>
              {stat
                ? `${stat.points} PTS · ${stat.rebounds} REB · ${stat.assists} AST · ${stat.blocks} BLK · ${stat.three_pointers_made} 3PM`
                : `${contribution?.points ?? 0} pts`}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.surface,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: theme.line,
      padding: Spacing.lg,
      gap: Spacing.sm,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.sm,
      flexWrap: 'wrap',
    },
    arenaHeaderCopy: { flex: 1, minWidth: 0, gap: Spacing.xs },
    arenaVersionLabel: {
      color: theme.ink,
      fontSize: 14,
      fontWeight: '900',
    },
    arenaVersionPill: {
      minHeight: 32,
      borderRadius: Radius.pill,
      backgroundColor: theme.greenSoft,
      borderWidth: 1,
      borderColor: theme.line,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      paddingHorizontal: Spacing.sm,
    },
    arenaVersionPillText: { color: theme.green, fontSize: 11, fontWeight: '900' },
    kicker: {
      color: theme.muted,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1.1,
      flexShrink: 1,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexShrink: 1,
    },
    refereePill: {
      minHeight: 28,
      maxWidth: 150,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: `${theme.green}55`,
      backgroundColor: theme.greenSoft,
      paddingHorizontal: 10,
    },
    refereePillText: {
      color: theme.green,
      fontSize: 11,
      fontWeight: '900',
      flexShrink: 1,
    },
    potPill: {
      minHeight: 28,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: `${theme.amber}55`,
      backgroundColor: theme.amberSoft,
      paddingHorizontal: 10,
    },
    potPillText: {
      color: theme.amber,
      fontSize: 11,
      fontWeight: '900',
      flexShrink: 1,
    },
    menuButton: {
      width: 44,
      height: 44,
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    score: {
      color: theme.ink,
      fontSize: 42,
      fontWeight: '900',
      fontStyle: 'italic',
      fontVariant: ['tabular-nums'],
      textAlign: 'center',
    },
    dash: { color: theme.muted },
    acceptanceRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    statusChip: {
      borderWidth: 1,
      borderRadius: Radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    statusText: { fontSize: 11, fontWeight: '800' },
    arenaStatusChip: {
      borderWidth: 1,
      borderRadius: Radius.pill,
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs,
    },
    arenaStatusText: { fontSize: 11, fontWeight: '800' },
    arenaApprovalLabel: {
      color: theme.muted,
      fontSize: 12,
      fontWeight: '800',
      textAlign: 'center',
    },
    arenaActorApproved: {
      minHeight: 40,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.greenSoft,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.md,
    },
    arenaActorApprovedText: { color: theme.green, fontSize: 13, fontWeight: '900' },
    arenaReadOnly: {
      color: theme.muted,
      fontSize: 13,
      fontWeight: '800',
      textAlign: 'center',
      paddingVertical: Spacing.sm,
    },
    refereeNotice: {
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: `${theme.green}55`,
      backgroundColor: theme.greenSoft,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
    },
    refereeNoticeTitle: {
      flex: 1,
      color: theme.green,
      fontSize: 13,
      fontWeight: '900',
    },
    contribBlock: { marginTop: Spacing.sm, gap: 4 },
    sectionLabel: {
      color: theme.muted,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1,
    },
    contribRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 3,
    },
    sideText: { width: 16, fontSize: 11, fontWeight: '800' },
    contribName: { flex: 1, color: theme.ink, fontSize: 13, fontWeight: '700' },
    contribPoints: { color: theme.amber, fontSize: 13, fontWeight: '800' },
    challengeStatus: {
      minHeight: 52,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: `${theme.amber}66`,
      backgroundColor: theme.amberSoft,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: Spacing.sm,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
    },
    challengeStatusCopy: { flex: 1, gap: 2 },
    challengeStatusTitle: {
      color: theme.amber,
      fontSize: 13,
      fontWeight: '900',
    },
    challengeStatusHint: {
      color: theme.inkSoft,
      fontSize: 11,
      lineHeight: 15,
    },
    actionDock: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: Spacing.sm,
    },
    reviewActionButton: {
      flex: 1,
      minWidth: 132,
      minHeight: 50,
      borderRadius: Radius.pill,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingHorizontal: Spacing.md,
    },
    editButton: {
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surfaceStrong,
    },
    editText: { color: theme.inkSoft, fontSize: 13, fontWeight: '900' },
    cancelButton: {
      borderWidth: 1,
      borderColor: `${theme.red}55`,
      backgroundColor: theme.redSoft,
    },
    cancelText: { color: theme.red, fontSize: 13, fontWeight: '900' },
    acceptButton: {
      backgroundColor: theme.orange,
    },
    acceptButtonDisabled: {
      borderWidth: 1,
      borderColor: `${theme.greenVivid}55`,
      backgroundColor: theme.greenSoft,
    },
    acceptText: { color: theme.bg, fontSize: 13, fontWeight: '900' },
    acceptTextDisabled: { color: theme.inkSoft },
    disabled: { opacity: 0.6 },
  })
}
