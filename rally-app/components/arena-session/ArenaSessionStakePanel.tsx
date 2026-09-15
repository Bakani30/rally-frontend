import { useEffect, useMemo, useState } from 'react'
import {
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { PressableScale } from '@/components/motion/PressableScale'
import { OnAccent, Radius, Spacing, type SportPalette } from '@/constants/theme'
import {
  formatArenaStakeDeadline,
  getArenaSessionStakeControlState,
  getValidActorProposalAmount,
  parseArenaStakeAmount,
} from '@/lib/arena-sessions/arenaSessionStake'
import type { AppLanguage } from '@/lib/i18n/language'
import type {
  ArenaRoundPhase,
  ArenaSessionActorRoundState,
  ArenaSessionLiveRoundStake,
} from '@/types/arenaSession'

export type ArenaSessionStakePanelProps = {
  phase: ArenaRoundPhase
  roundId: string
  roundState: ArenaSessionActorRoundState
  stake: ArenaSessionLiveRoundStake
  opponentLabel: string
  language: AppLanguage
  theme: SportPalette
  controlsFresh: boolean
  actionPending?: boolean
  onUpdateStakeProposal?: (input: {
    roundId: string
    amount: number
    expectedStakeVersion: number
  }) => void
  onConfirmFinalStake?: (input: {
    roundId: string
    stakeVersion: number
    maxLoss: number
  }) => void
  onStartRound?: (input: {
    roundId: string
    expectedStakeVersion: number
  }) => void
}

export function ArenaSessionStakePanel({
  phase,
  roundId,
  roundState,
  stake,
  opponentLabel,
  language,
  theme,
  controlsFresh,
  actionPending = false,
  onUpdateStakeProposal,
  onConfirmFinalStake,
  onStartRound,
}: ArenaSessionStakePanelProps) {
  const styles = createStyles(theme)
  const [draftText, setDraftText] = useState('')
  const proposalKey = `${roundId}:${stake.version}:${roundState.proposalAmount ?? 'none'}`

  useEffect(() => {
    const proposalAmount = getValidActorProposalAmount(roundState.proposalAmount)
    setDraftText(proposalAmount === null ? '' : String(proposalAmount))
  }, [proposalKey, roundState.proposalAmount])

  const draftAmount = parseArenaStakeAmount(draftText)
  const controlState = useMemo(() => getArenaSessionStakeControlState({
    phase,
    roundState,
    draftAmount,
    controlsFresh,
  }), [controlsFresh, draftAmount, phase, roundState])
  const isInvalidDraft = draftText.length > 0 && draftAmount === null
  const deadlineLabel = formatArenaStakeDeadline(stake.confirmationDeadlineAt, language)
  const statusLabel = phase === 'ready_to_start'
    ? language === 'th' ? 'พร้อมเริ่มรอบ' : 'Ready to start'
    : language === 'th' ? 'รอยืนยันเดิมพัน' : 'Confirm round stake'
  const startLabel = language === 'th' ? 'เริ่มรอบ' : 'Start round'
  const confirmLabel = actionPending
    ? language === 'th' ? 'กำลังยืนยัน…' : 'Confirming…'
    : language === 'th' ? 'ยืนยันเดิมพัน' : 'Confirm stake'
  const saveLabel = actionPending
    ? language === 'th' ? 'กำลังบันทึก…' : 'Saving…'
    : language === 'th' ? 'บันทึกข้อเสนอ' : 'Save proposal'
  const startDisabledLabel = controlState.startDisabledReason === 'captain'
    ? language === 'th' ? 'เฉพาะกัปตันทีม' : 'Captain only'
    : language === 'th' ? 'รอทุกคนยืนยัน' : 'Waiting for confirmations'

  function saveProposal() {
    if (!controlState.canSaveProposal || draftAmount === null || actionPending) return
    onUpdateStakeProposal?.({
      roundId,
      amount: draftAmount,
      expectedStakeVersion: stake.version,
    })
  }

  function confirmStake() {
    const maxLoss = controlState.ownProposalAmount
    if (!controlState.canConfirmStake || maxLoss === null || actionPending) return
    onConfirmFinalStake?.({
      roundId,
      stakeVersion: stake.version,
      maxLoss,
    })
  }

  function startRound() {
    if (!controlState.canStartRound || actionPending) return
    onStartRound?.({
      roundId,
      expectedStakeVersion: stake.version,
    })
  }

  return (
    <View style={styles.panel}>
      <View style={styles.heading}>
        <View style={styles.headingCopy}>
          <Text style={styles.eyebrow}>ROUND STAKE</Text>
          <Text style={styles.title}>{statusLabel}</Text>
        </View>
        <View style={styles.statusPill}>
          <MaterialCommunityIcons name="cash-check" size={15} color={theme.risk} />
          <Text style={styles.statusText}>{stake.confirmedCount}/{stake.requiredCount}</Text>
        </View>
      </View>

      <View style={styles.opponentRow}>
        <MaterialCommunityIcons name="account-group-outline" size={16} color={theme.muted} />
        <Text style={styles.opponentText} numberOfLines={1}>
          {language === 'th' ? `คู่แข่ง: ${opponentLabel}` : `Opponent: ${opponentLabel}`}
        </Text>
        <Text style={styles.versionText}>v{stake.version}</Text>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <MaterialCommunityIcons name="clock-outline" size={15} color={theme.muted} />
          <Text style={styles.metaText}>{deadlineLabel}</Text>
        </View>
        <Text style={styles.metaText}>{stake.confirmedCount}/{stake.requiredCount} {language === 'th' ? 'ยืนยันแล้ว' : 'confirmed'}</Text>
      </View>

      <View style={styles.ownProposalBlock}>
        <View style={styles.ownProposalHeading}>
          <Text style={styles.ownProposalLabel}>{language === 'th' ? 'ข้อเสนอของคุณ' : 'Your proposal'}</Text>
          {roundState.confirmed ? (
            <View style={styles.confirmedMark}>
              <MaterialCommunityIcons name="check-circle" size={15} color={theme.trust} />
              <Text style={styles.confirmedText}>{language === 'th' ? 'ยืนยันแล้ว' : 'Confirmed'}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.inputRow}>
          <TextInput
            value={draftText}
            onChangeText={setDraftText}
            onSubmitEditing={() => saveProposal()}
            editable={controlsFresh && !actionPending && roundState.capabilities.canEditOwnStake}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={theme.mutedSoft}
            style={[styles.input, isInvalidDraft && styles.inputInvalid]}
            accessibilityLabel={language === 'th' ? 'ข้อเสนอแต้มเดิมพันของคุณ' : 'Your round stake proposal'}
          />
          <Text style={styles.unit}>RP</Text>
          <PressableScale
            style={[styles.saveButton, (!controlState.canSaveProposal || actionPending || !onUpdateStakeProposal) && styles.buttonDisabled]}
            onPress={saveProposal}
            disabled={!controlState.canSaveProposal || actionPending || !onUpdateStakeProposal}
            accessibilityRole="button"
            accessibilityState={{ disabled: !controlState.canSaveProposal || actionPending || !onUpdateStakeProposal, busy: actionPending }}
          >
            <MaterialCommunityIcons name="content-save-outline" size={17} color={theme.ink} />
            <Text style={styles.saveText}>{saveLabel}</Text>
          </PressableScale>
        </View>
        {isInvalidDraft ? <Text style={styles.validationText}>{language === 'th' ? 'ใส่จำนวนเต็มมากกว่า 0' : 'Enter a positive whole number'}</Text> : null}
        {controlState.hasUnsavedProposal && !isInvalidDraft ? <Text style={styles.validationText}>{language === 'th' ? 'บันทึกข้อเสนอก่อนยืนยัน' : 'Save your proposal before confirming'}</Text> : null}
      </View>

      <PressableScale
        style={[styles.confirmButton, (!controlState.canConfirmStake || actionPending || !onConfirmFinalStake) && styles.buttonDisabled]}
        onPress={confirmStake}
        disabled={!controlState.canConfirmStake || actionPending || !onConfirmFinalStake}
        accessibilityRole="button"
        accessibilityState={{ disabled: !controlState.canConfirmStake || actionPending || !onConfirmFinalStake, busy: actionPending }}
      >
        <MaterialCommunityIcons name="shield-check-outline" size={18} color={OnAccent.onLight} />
        <Text style={styles.confirmButtonText}>{confirmLabel}</Text>
      </PressableScale>

      <PressableScale
        style={[styles.startButton, (!controlState.canStartRound || actionPending || !onStartRound) && styles.buttonDisabled]}
        onPress={startRound}
        disabled={!controlState.canStartRound || actionPending || !onStartRound}
        accessibilityRole="button"
        accessibilityState={{ disabled: !controlState.canStartRound || actionPending || !onStartRound, busy: actionPending }}
      >
        <MaterialCommunityIcons name="play-circle-outline" size={18} color={controlState.canStartRound ? theme.orange : theme.mutedSoft} />
        <Text style={[styles.startButtonText, !controlState.canStartRound && styles.startButtonTextDisabled]}>
          {controlState.canStartRound ? startLabel : startDisabledLabel}
        </Text>
      </PressableScale>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    panel: { borderRadius: Radius.xl, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.bgElevated, padding: 14, gap: 11 },
    heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
    headingCopy: { flex: 1, minWidth: 0 },
    eyebrow: { color: theme.inkSoft, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    title: { color: theme.ink, fontSize: 16, lineHeight: 21, fontWeight: '900', marginTop: 2 },
    statusPill: { minHeight: 32, borderRadius: Radius.pill, backgroundColor: theme.riskSoft, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9 },
    statusText: { color: theme.risk, fontSize: 12, fontWeight: '900', fontVariant: ['tabular-nums'] },
    opponentRow: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 6 },
    opponentText: { flex: 1, minWidth: 0, color: theme.ink, fontSize: 12, fontWeight: '900' },
    versionText: { color: theme.muted, fontSize: 11, fontWeight: '900', fontVariant: ['tabular-nums'] },
    metaRow: { minHeight: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
    metaText: { color: theme.muted, fontSize: 11, fontWeight: '800' },
    ownProposalBlock: { gap: 7 },
    ownProposalHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    ownProposalLabel: { color: theme.ink, fontSize: 12, fontWeight: '900' },
    confirmedMark: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    confirmedText: { color: theme.trust, fontSize: 11, fontWeight: '900' },
    inputRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 7 },
    input: { flex: 1, minHeight: 44, borderRadius: Radius.md, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface, color: theme.ink, paddingHorizontal: 11, fontSize: 16, fontWeight: '900', fontVariant: ['tabular-nums'] },
    inputInvalid: { borderColor: theme.risk },
    unit: { color: theme.muted, fontSize: 11, fontWeight: '900' },
    saveButton: { minHeight: 44, borderRadius: Radius.md, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 9 },
    saveText: { color: theme.ink, fontSize: 11, fontWeight: '900' },
    validationText: { color: theme.risk, fontSize: 11, lineHeight: 15, fontWeight: '800' },
    confirmButton: { minHeight: 48, borderRadius: Radius.lg, backgroundColor: theme.orange, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 12 },
    confirmButtonText: { color: OnAccent.onLight, fontSize: 13, fontWeight: '900' },
    startButton: { minHeight: 48, borderRadius: Radius.lg, borderWidth: 1, borderColor: theme.orange, backgroundColor: theme.bgElevated, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 12 },
    startButtonText: { color: theme.orange, fontSize: 13, fontWeight: '900' },
    startButtonTextDisabled: { color: theme.mutedSoft },
    buttonDisabled: { opacity: 0.5 },
  })
}
