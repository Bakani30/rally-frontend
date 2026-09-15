import { Platform, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { Reveal } from '@/components/motion/Reveal'
import { Radius, Sport, Spacing } from '@/constants/theme'
import { getParticipantDisplayName } from '@/lib/match/matchRules'
import { CURRENCY_UNIT } from '@/lib/wallet/walletFormatting'
import type { MatchDetailState } from '@/lib/match/matchRules'
import type { Outcome } from '@/lib/match/matchNextAction'
import type { AlphaRefereeResultSubmission, MatchSubmission, MatchWithRelations } from '@/types/match'

type Props = {
  match: MatchWithRelations
  derived: MatchDetailState
  submission: MatchSubmission
  alphaRefereeResult?: AlphaRefereeResultSubmission | null
  outcome: Outcome | null
  isConfirming: boolean
  isDisputing: boolean
  onConfirm: () => void
  onDispute: () => void
}

export function ConfirmResultCard({
  match,
  derived,
  submission,
  alphaRefereeResult,
  outcome,
  isConfirming,
  isDisputing,
  onConfirm,
  onDispute,
}: Props) {
  const manualRefereeResult = alphaRefereeResult?.result_kind === 'manual_running_result'
    ? alphaRefereeResult
    : null
  const submitter = derived.participants.find((p) => p.user_id === submission.submitted_by)
  const submitterSide = submitter?.side
  const isOwnSideSubmission = derived.mySide !== null && (submitterSide === derived.mySide || submission.submitted_by === derived.myParticipant?.user_id)
  const submitterName = manualRefereeResult
    ? getRefereeDisplayName(manualRefereeResult)
    : submitter ? getParticipantDisplayName(submitter) : 'Opponent'
  const unit = CURRENCY_UNIT[match.stake_currency]

  const meta = describeOutcome(outcome, unit)

  return (
    <Reveal delay={0}>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <MaterialCommunityIcons name="gavel" size={16} color={Sport.amber} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>
              {manualRefereeResult ? 'ผลจากกรรมการ' : 'ผลรอการยืนยัน'}
            </Text>
            <Text style={styles.headline}>
              {manualRefereeResult
                ? `${submitterName} ส่งผลในฐานะกรรมการ ตรวจดูแล้วยืนยันได้เลย`
                : `${submitterName} ส่งผลมา ตรวจดูแล้วยืนยันได้เลย`}
            </Text>
          </View>
        </View>

        <View style={[styles.outcomeRow, { borderColor: meta.border, backgroundColor: meta.bg }]}>
          <MaterialCommunityIcons name={meta.icon} size={26} color={meta.fg} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.outcomeLabel, { color: meta.fg }]}>{meta.title}</Text>
            <Text style={styles.outcomeSub}>{meta.sub}</Text>
          </View>
          {meta.deltaText && (
            <Text style={[styles.delta, { color: meta.fg }]}>{meta.deltaText}</Text>
          )}
        </View>

        <Text style={styles.helper}>
          {manualRefereeResult
            ? 'กรรมการช่วยบันทึกผลให้ ผู้เล่นยังต้องยืนยันหรือโต้แย้งก่อนแต้มขยับ'
            : 'ดูรายละเอียดผล + หลักฐานด้านล่าง ถ้าไม่ตรงกับความเป็นจริงให้กดโต้แย้งผล'}
        </Text>

        <View style={styles.actions}>
          {!isOwnSideSubmission && (
            <PressableScale
              style={[styles.disputeButton, (isConfirming || isDisputing) && { opacity: 0.6 }]}
              onPress={onDispute}
              disabled={isConfirming || isDisputing}
            >
              <MaterialCommunityIcons name="alert-octagon-outline" size={16} color={Sport.red} />
              <Text style={styles.disputeButtonText}>
                {isDisputing ? 'กำลังโต้แย้ง…' : 'โต้แย้งผล'}
              </Text>
            </PressableScale>
          )}

          <PressableScale
            style={[styles.button, (isConfirming || isDisputing) && { opacity: 0.6 }]}
            onPress={onConfirm}
            disabled={isConfirming || isDisputing}
          >
            <MaterialCommunityIcons name="check-bold" size={16} color={Sport.bg} />
            <Text style={styles.buttonText}>
              {isConfirming ? 'กำลังยืนยัน…' : 'ยืนยันผล'}
            </Text>
          </PressableScale>
        </View>
      </View>
    </Reveal>
  )
}

function getRefereeDisplayName(result: AlphaRefereeResultSubmission | null | undefined): string {
  const referee = result?.referee
  return referee?.display_name || (referee?.handle ? `@${referee.handle}` : null) || 'กรรมการ'
}

type OutcomeView = {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']
  title: string
  sub: string
  deltaText: string | null
  fg: string
  bg: string
  border: string
}

function describeOutcome(outcome: Outcome | null, unit: string): OutcomeView {
  if (!outcome) {
    return {
      icon: 'help-circle-outline',
      title: 'รอข้อมูลผลให้ครบ',
      sub: 'จะอัปเดตผลให้ครบเมื่อระบบประมวลแล้ว',
      deltaText: null,
      fg: Sport.inkSoft,
      bg: Sport.surface,
      border: Sport.line,
    }
  }
  if (outcome.kind === 'tie') {
    return {
      icon: 'equal-box',
      title: 'เสมอ',
      sub: 'ทุกคนได้แต้มเดิมพันคืนเต็มจำนวน',
      deltaText: null,
      fg: Sport.inkSoft,
      bg: Sport.surface,
      border: Sport.line,
    }
  }
  if (outcome.kind === 'win') {
    return {
      icon: 'trophy-award',
      title: 'ฝั่งคุณชนะ',
      sub: 'ยืนยันเพื่อรับแต้มจากฝั่งตรงข้าม',
      deltaText: `+${outcome.delta} ${unit}`,
      fg: Sport.green,
      bg: Sport.greenSoft,
      border: 'rgba(50,213,131,0.3)',
    }
  }
  return {
    icon: 'shield-off-outline',
    title: 'ฝั่งคุณแพ้',
    sub: 'ยืนยันเพื่อจ่ายแต้มเดิมพันให้ผู้ชนะ',
    deltaText: `${outcome.delta} ${unit}`,
    fg: Sport.red,
    bg: Sport.redSoft,
    border: 'rgba(255,77,61,0.3)',
  }
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Sport.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Sport.lineStrong,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Platform.select({
      web: { boxShadow: '0 12px 30px -12px rgba(0,0,0,0.5)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 18,
        elevation: 4,
      },
    }),
  },
  header: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  headerIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Sport.amberSoft,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '900',
    color: Sport.amber,
    letterSpacing: 1.6,
  },
  headline: { fontSize: 14, fontWeight: '700', color: Sport.ink, marginTop: 2, lineHeight: 19 },
  outcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  outcomeLabel: { fontSize: 14, fontWeight: '900', letterSpacing: -0.2 },
  outcomeSub: { fontSize: 12, color: Sport.muted, marginTop: 2 },
  delta: { fontSize: 18, fontWeight: '900', fontVariant: ['tabular-nums'] },
  helper: { fontSize: 12, color: Sport.muted, lineHeight: 17 },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  button: {
    flex: 1,
    minWidth: 140,
    backgroundColor: Sport.orange,
    borderRadius: Radius.lg,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  buttonText: { color: Sport.bg, fontSize: 14, fontWeight: '900', letterSpacing: 0.6 },
  disputeButton: {
    flex: 1,
    minWidth: 140,
    backgroundColor: Sport.redSoft,
    borderColor: 'rgba(255,77,61,0.35)',
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  disputeButtonText: { color: Sport.red, fontSize: 14, fontWeight: '900', letterSpacing: 0.6 },
})
