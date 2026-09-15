import { useEffect, useMemo, useState } from 'react'
import { Image } from 'expo-image'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { ArenaSessionStakePanel } from '@/components/arena-session/ArenaSessionStakePanel'
import { ArenaTeamContinuationCard } from '@/components/arena-session/ArenaTeamContinuationCard'
import { useScreenInsets } from '@/components/layout/useScreenInsets'
import { PressableScale } from '@/components/motion/PressableScale'
import { ArenaSessionCourtPreview, ArenaSessionLiveCourt } from '@/components/arena-session/ArenaSessionLiveCourt'
import { OnAccent, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { presentArenaSessionError, type ArenaSessionErrorPresentation } from '@/lib/arena-sessions/arenaSessionError'
import {
  canStagePartySelection,
  getActivePartyMemberIds,
  mapArenaSessionSnapshot,
} from '@/lib/arena-sessions/arenaSessionService'
import { useLanguageStore } from '@/stores/languageStore'
import type {
  ArenaSessionSnapshot,
  ArenaTeamParticipationDecision,
  ArenaTeamParticipationDecisionInput,
} from '@/types/arenaSession'
import type { PartyDetail } from '@/types/party'

export type ArenaSessionBoardProps = {
  snapshot?: ArenaSessionSnapshot | null
  party?: PartyDetail | null
  /** Authenticated production user or deterministic dev-preview actor only. */
  actorUserId?: string
  isSyncing?: boolean
  isReconnecting?: boolean
  error?: unknown
  actionPending?: boolean
  presencePending?: boolean
  roundControlsFresh?: boolean
  onRetry?: () => void
  onRecordPresence?: () => void
  onReady?: () => void
  onStageParty?: (input: { partyId: string; memberUserIds: string[] }) => void
  onUpdateStakeProposal?: (input: { roundId: string; amount: number; expectedStakeVersion: number }) => void
  onConfirmFinalStake?: (input: { roundId: string; stakeVersion: number; maxLoss: number }) => void
  onStartRound?: (input: { roundId: string; expectedStakeVersion: number }) => void
  onChooseTeamParticipation?: (input: ArenaTeamParticipationDecisionInput) => void
  onLeave?: () => void
  onGoToArenaList?: () => void
  onGoToMatch?: (matchId: string) => void
}

const TEAM_STATUS_COPY: Record<string, string> = {
  forming: 'กำลังจัดทีม',
  queued: 'อยู่ในคิว',
  on_deck: 'รอเข้าสนาม',
  active: 'กำลังแข่ง',
  champion: 'แชมป์สนาม',
  disputed: 'ตรวจสอบผล',
  retired: 'พักการแข่ง',
  removed: 'ออกจากสนาม',
}

export function ArenaSessionBoard({
  snapshot,
  party,
  actorUserId,
  isSyncing = false,
  isReconnecting = false,
  error,
  actionPending = false,
  presencePending = false,
  roundControlsFresh = false,
  onRetry,
  onRecordPresence,
  onReady,
  onStageParty,
  onUpdateStakeProposal,
  onConfirmFinalStake,
  onStartRound,
  onChooseTeamParticipation,
  onLeave,
  onGoToArenaList,
  onGoToMatch,
}: ArenaSessionBoardProps) {
  const language = useLanguageStore((state) => state.language)
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { paddingTop, paddingBottom } = useScreenInsets({
    edges: ['top', 'bottom'],
    topPad: Spacing.md,
    bottomPad: 120,
  })
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [detailsExpanded, setDetailsExpanded] = useState(false)
  const errorPresentation = error ? presentArenaSessionError(error, language) : null
  const errorRecovery = errorPresentation ? recoveryAction(errorPresentation, language, { onRetry, onGoToArenaList }) : null

  const activePartyMemberIds = useMemo(() => getActivePartyMemberIds(party), [party])
  const teamSize = snapshot?.session.teamSize ?? party?.team_size ?? 0

  useEffect(() => {
    setSelectedMemberIds((current) => current.filter((id) => activePartyMemberIds.includes(id)))
  }, [activePartyMemberIds])

  if (!snapshot) {
    return (
      <BoardState
        styles={styles}
        theme={theme}
        icon={errorPresentation ? 'alert-circle-outline' : 'sync'}
        title={errorPresentation?.title ?? (isReconnecting ? 'กำลังเชื่อมต่อ...' : isSyncing ? 'กำลังซิงก์ Session...' : 'กำลังเตรียม Session...')}
        detail={errorPresentation?.message ?? 'กำลังอ่านสถานะล่าสุดจากสนาม'}
        actionLabel={errorRecovery?.label}
        onAction={errorRecovery?.onPress}
        paddingTop={paddingTop}
      />
    )
  }

  const currentSnapshot = snapshot

  const model = mapArenaSessionSnapshot(snapshot, {
    actorUserId,
    party,
  })
  const activeRound = snapshot.rounds.at(-1)
  const liveRoundRecord = snapshot.liveRound
    ? snapshot.rounds.find((round) => round.roundId === snapshot.liveRound?.roundId) ?? null
    : null
  const orderedTeams = orderTeamsForDisplay(snapshot.teams)
  const queuedTeamCount = snapshot.teams.filter((team) => team.status === 'queued' || team.status === 'on_deck').length
  const showStaging = model.canStage
  const showMemberActions = model.actorRole === 'member' || model.actorRole === 'host'
  const isTerminal = model.status === 'closed' || model.status === 'cancelled'
  const stakePanelRound = snapshot.liveRound
  const opponentTeam = stakePanelRound && snapshot.actor.teamId
    ? snapshot.actor.teamId === stakePanelRound.champion.teamId
      ? snapshot.teams.find((team) => team.teamId === stakePanelRound.challenger.teamId) ?? null
      : snapshot.actor.teamId === stakePanelRound.challenger.teamId
        ? snapshot.teams.find((team) => team.teamId === stakePanelRound.champion.teamId) ?? null
        : null
    : null

  function toggleMember(userId: string) {
    setSelectedMemberIds((current) => {
      if (current.includes(userId)) return current.filter((id) => id !== userId)
      if (current.length >= 5) return current
      return [...current, userId]
    })
  }

  function confirm(title: string, message: string, action: () => void) {
    Alert.alert(title, message, [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'ยืนยัน', style: 'destructive', onPress: action },
    ])
  }

  function forwardTeamParticipationDecision(input: ArenaTeamParticipationDecisionInput) {
    const expected = getArenaSessionTeamParticipationAction(currentSnapshot, input.decision)
    if (
      !expected
      || expected.arenaId !== input.arenaId
      || expected.participationCycleId !== input.participationCycleId
      || expected.expectedRevision !== input.expectedRevision
    ) return
    onChooseTeamParticipation?.(expected)
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.container, { paddingTop, paddingBottom }]}
    >
      <View style={styles.arenaOverview}>
        {!snapshot.liveRound ? <ArenaSessionCourtPreview activityType={snapshot.session.activityType} /> : null}
        <View style={styles.arenaFacts}>
          <View style={styles.arenaFact}>
            <MaterialCommunityIcons name={activityIcon(snapshot.session.activityType)} size={18} color={theme.orange} />
            <Text style={styles.arenaFactText}>{activityLabel(snapshot.session.activityType)}</Text>
          </View>
          <View style={styles.arenaFact}>
            <Text style={styles.arenaFactText}>{snapshot.session.teamSize} V {snapshot.session.teamSize}</Text>
          </View>
        </View>
      </View>

      {isReconnecting || (isSyncing && !isTerminal) ? (
        <View style={styles.syncBanner}>
          <ActivityIndicator size="small" color={theme.trust} />
          <Text style={styles.syncText}>{isReconnecting ? 'กำลังเชื่อมต่อใหม่...' : 'กำลังซิงก์สถานะ...'}</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorBanner}>
          <MaterialCommunityIcons name="alert-circle-outline" size={18} color={theme.risk} />
          <View style={styles.errorCopy}>
            <Text style={styles.errorTitle}>{errorPresentation?.title}</Text>
            <Text style={styles.errorText}>{errorPresentation?.message}</Text>
          </View>
          {errorPresentation ? <ErrorRecoveryButton presentation={errorPresentation} language={language} onRetry={onRetry} onGoToArenaList={onGoToArenaList} styles={styles} theme={theme} /> : null}
        </View>
      ) : null}

      {snapshot.liveRound ? (
        <ArenaSessionLiveCourt
          liveRound={snapshot.liveRound}
          teams={snapshot.teams}
          activityType={snapshot.session.activityType}
          startedAt={liveRoundRecord?.startedAt}
          endedAt={liveRoundRecord?.submittedAt ?? liveRoundRecord?.settledAt}
        />
      ) : null}

      {stakePanelRound && model.roundState && model.roundId && model.stake
        && (model.roundPhase === 'stake_confirmation' || model.roundPhase === 'ready_to_start') ? (
        <ArenaSessionStakePanel
          phase={model.roundPhase}
          roundId={model.roundId}
          roundState={model.roundState}
          stake={model.stake}
          opponentLabel={opponentTeam?.name ?? (language === 'th' ? 'ทีมคู่แข่ง' : 'Opponent')}
          language={language}
          theme={theme}
          controlsFresh={roundControlsFresh}
          actionPending={actionPending}
          onUpdateStakeProposal={onUpdateStakeProposal}
          onConfirmFinalStake={onConfirmFinalStake}
          onStartRound={onStartRound}
        />
      ) : null}

      {!isTerminal ? (
        <ArenaTeamContinuationCard
          participation={snapshot.teamParticipation}
          arenaId={snapshot.session.arenaEventId}
          actorId={actorUserId}
          theme={theme}
          actionPending={actionPending}
          onDecision={forwardTeamParticipationDecision}
        />
      ) : null}

      {model.activeMatchId ? (
        <PrimaryButton
          label="เข้าสู่แมตช์"
          icon="sword-cross"
          disabled={actionPending}
          onPress={() => onGoToMatch?.(model.activeMatchId!)}
          styles={styles}
          theme={theme}
        />
      ) : null}

      {showStaging ? (
        <View style={styles.panel}>
          <View style={styles.panelHeading}>
            <View>
              <Text style={styles.panelEyebrow}>YOUR PARTY</Text>
              <Text style={styles.panelTitle}>เลือกทีมเข้าสนาม</Text>
            </View>
            <Text style={styles.panelCount}>{selectedMemberIds.length}/{teamSize}</Text>
          </View>
          {party ? (
            <>
              <Text style={styles.panelHint}>{party.name} · เลือกสมาชิกให้ครบ {teamSize} คน (สูงสุด 5 คน)</Text>
              <View style={styles.memberList}>
                {activePartyMemberIds.map((userId, index) => {
                  const selected = selectedMemberIds.includes(userId)
                  return (
                    <PressableScale
                      key={userId}
                      style={[styles.memberRow, selected && styles.memberRowSelected]}
                      onPress={() => toggleMember(userId)}
                      accessibilityRole="button"
                      accessibilityLabel={`เลือกสมาชิก ${index + 1}`}
                    >
                      <View style={[styles.memberAvatar, selected && styles.memberAvatarSelected]}>
                        <Text style={styles.memberAvatarText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.memberName} numberOfLines={1}>สมาชิก {index + 1}</Text>
                      <MaterialCommunityIcons
                        name={selected ? 'check-circle' : 'circle-outline'}
                        size={22}
                        color={selected ? theme.trust : theme.mutedSoft}
                      />
                    </PressableScale>
                  )
                })}
              </View>
              <PrimaryButton
                label="พา Party เข้าห้องนี้"
                icon="account-group"
                disabled={actionPending || !canStagePartySelection(selectedMemberIds, teamSize)}
                onPress={() => party && onStageParty?.({ partyId: party.id, memberUserIds: selectedMemberIds })}
                styles={styles}
                theme={theme}
              />
            </>
          ) : (
            <Text style={styles.panelHint}>สร้าง Party ที่ตรงกับกีฬาและขนาดทีม แล้วกลับมาที่ห้องนี้เพื่อจัดทีม</Text>
          )}
        </View>
      ) : null}

      {showMemberActions ? (
        <View style={styles.panel}>
          <View style={styles.panelHeading}>
            <View>
              <Text style={styles.panelEyebrow}>YOUR STATUS</Text>
              <Text style={styles.panelTitle}>{model.team ? 'ยืนยันเพื่อเข้าคิว' : 'สถานะผู้เปิดสนาม'}</Text>
            </View>
            <MaterialCommunityIcons name="account-check-outline" size={22} color={theme.trust} />
          </View>
          <View style={styles.factRow}>
            <Fact label="บทบาท" value={roleLabel(model.actorRole)} styles={styles} />
            <Fact label="ตำแหน่ง" value={presenceLabel(model.presenceStatus)} styles={styles} />
            <Fact
              label={model.team ? 'พร้อม' : 'ทีมแข่ง'}
              value={model.team ? (model.actorMemberState === 'ready' ? 'แล้ว' : 'ยัง') : 'ไม่ได้ลง'}
              styles={styles}
            />
          </View>
          {model.canRecordPresence ? (
            <PrimaryButton
              label={presencePending ? 'กำลังตรวจตำแหน่ง…' : model.status === 'member_unavailable' ? 'ยืนยันตำแหน่งใหม่' : 'ยืนยันตำแหน่ง'}
              icon="map-marker-check-outline"
              disabled={actionPending || presencePending}
              onPress={onRecordPresence}
              styles={styles}
              theme={theme}
            />
          ) : model.presenceStatus === 'valid' ? (
            <View style={styles.confirmedRow}>
              <MaterialCommunityIcons name="check-circle" size={18} color={theme.trust} />
              <Text style={styles.confirmedText}>ยืนยันตำแหน่งแล้ว</Text>
            </View>
          ) : null}
          {model.canReady ? (
            <PrimaryButton
              label="ยืนยันพร้อม"
              icon="check-bold"
              disabled={actionPending}
              onPress={onReady}
              styles={styles}
              theme={theme}
            />
          ) : model.actorMemberState === 'ready' ? (
            <View style={styles.confirmedRow}>
              <MaterialCommunityIcons name="check-bold" size={18} color={theme.trust} />
              <Text style={styles.confirmedText}>คุณพร้อมแล้ว</Text>
            </View>
          ) : null}
          {model.canLeave ? (
            <SecondaryButton
              label="ออกจาก Session"
              icon="exit-run"
              disabled={actionPending}
              onPress={() => confirm('ออกจาก Session?', 'คุณจะต้องยืนยันตำแหน่งใหม่เมื่อต้องการกลับเข้า', () => onLeave?.())}
              styles={styles}
              theme={theme}
              danger
            />
          ) : null}
        </View>
      ) : model.canJoin ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>เปิดรับสมาชิก</Text>
          <Text style={styles.panelHint}>ให้ Host จัดคุณเข้า Party ก่อน แล้วคุณจะยืนยันตำแหน่งและความพร้อมด้วยตัวเอง</Text>
        </View>
      ) : null}

      <View style={styles.sheet}>
        <PressableScale
          style={styles.sheetSummary}
          onPress={() => setDetailsExpanded((value) => !value)}
          accessibilityRole="button"
          accessibilityState={{ expanded: detailsExpanded }}
          accessibilityLabel={detailsExpanded ? 'ย่อรายละเอียดคิว' : 'ขยายรายละเอียดคิว'}
        >
          <View style={styles.sheetIcon}>
            <MaterialCommunityIcons name="format-list-numbered" size={21} color={theme.orange} />
          </View>
          <View style={styles.sheetSummaryCopy}>
            <Text style={styles.sheetEyebrow}>QUEUE</Text>
            <Text style={styles.sheetTitle} numberOfLines={1}>{queueSummary(model.team, queuedTeamCount)}</Text>
          </View>
          <View style={styles.sheetMeta}>
            <Text style={styles.sheetMetaText}>{snapshot.teams.length} ทีม</Text>
            <MaterialCommunityIcons
              name={detailsExpanded ? 'chevron-up' : 'chevron-down'}
              size={22}
              color={theme.ink}
            />
          </View>
        </PressableScale>

        {detailsExpanded ? (
          <View style={styles.sheetBody}>
            {model.team ? (
              <View style={styles.rosterBlock}>
                <View style={styles.panelHeading}>
                  <View>
                    <Text style={styles.panelEyebrow}>YOUR TEAM</Text>
                    <Text style={styles.panelTitle}>{model.team.name}</Text>
                  </View>
                  <Text style={styles.panelCount}>{model.team.members.length}/{snapshot.session.teamSize}</Text>
                </View>
                <View style={styles.memberList}>
                  {model.team.members.map((member, index) => (
                    <View key={`${member.handle ?? member.displayName ?? 'member'}-${index}`} style={styles.rosterRow}>
                      <View style={styles.memberAvatar}>
                        {member.avatarUrl ? (
                          <Image source={{ uri: member.avatarUrl }} style={styles.memberAvatarImage} contentFit="cover" transition={120} />
                        ) : (
                          <Text style={styles.memberAvatarText}>{memberInitials(member, index)}</Text>
                        )}
                      </View>
                      <View style={styles.teamCopy}>
                        <Text style={styles.memberName} numberOfLines={1}>{memberLabel(member, index)}</Text>
                        {member.handle ? <Text style={styles.teamMeta} numberOfLines={1}>@{member.handle.replace(/^@/, '')}</Text> : null}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={styles.queueHeader}>
              <Text style={styles.panelTitle}>ทุกทีมในห้อง</Text>
              <Text style={styles.panelCount}>{orderedTeams.length}</Text>
            </View>
            {orderedTeams.length === 0 ? (
              <Text style={styles.panelHint}>ยังไม่มีทีมที่จัดเข้า Session</Text>
            ) : (
              orderedTeams.map((team) => (
                <View key={team.teamId} style={[styles.teamRow, team.teamId === model.team?.teamId && styles.teamRowOwn]}>
                  <View style={styles.teamBadge}>
                    <MaterialCommunityIcons
                      name={team.status === 'champion' ? 'crown-outline' : 'shield-outline'}
                      size={18}
                      color={team.status === 'champion' ? theme.economy : theme.orange}
                    />
                  </View>
                  <View style={styles.teamCopy}>
                    <Text style={styles.teamName} numberOfLines={1}>{team.name}</Text>
                    <Text style={styles.teamMeta} numberOfLines={1}>
                      {team.partyName ? `${team.partyName} · ` : ''}{team.members.length}/{snapshot.session.teamSize} คน · {TEAM_STATUS_COPY[team.status] ?? team.status}
                    </Text>
                  </View>
                  {team.queuePosition ? <Text style={styles.queuePosition}>#{team.queuePosition}</Text> : null}
                </View>
              ))
            )}

            {activeRound ? (
              <View style={styles.roundRow}>
                <MaterialCommunityIcons name="basketball" size={18} color={theme.orange} />
                <Text style={styles.roundText}>รอบล่าสุด · {roundLabel(activeRound.status)}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      {isTerminal && onGoToArenaList ? (
        <PrimaryButton label="กลับรายการ Arena" icon="format-list-bulleted" onPress={onGoToArenaList} styles={styles} theme={theme} />
      ) : null}
    </ScrollView>
  )
}

export function getArenaSessionTeamParticipationAction(
  snapshot: ArenaSessionSnapshot,
  decision: ArenaTeamParticipationDecision,
): ArenaTeamParticipationDecisionInput | null {
  const participation = snapshot.teamParticipation
  if (!('participationCycleId' in participation)) return null
  return {
    arenaId: snapshot.session.arenaEventId,
    participationCycleId: participation.participationCycleId,
    expectedRevision: participation.revision,
    decision,
  }
}

function BoardState({
  styles,
  theme,
  icon,
  title,
  detail,
  actionLabel,
  onAction,
  paddingTop,
}: {
  styles: ReturnType<typeof createStyles>
  theme: SportPalette
  icon: keyof typeof MaterialCommunityIcons.glyphMap
  title: string
  detail: string
  actionLabel?: string
  onAction?: () => void
  paddingTop: number
}) {
  return (
    <View style={[styles.root, styles.stateRoot, { paddingTop }]}>
      <View style={styles.stateCard}>
        <MaterialCommunityIcons name={icon} size={34} color={theme.orange} />
        <Text style={styles.stateTitle}>{title}</Text>
        <Text style={styles.stateDetail}>{detail}</Text>
        {actionLabel && onAction ? <PrimaryButton label={actionLabel} icon="refresh" onPress={onAction} styles={styles} theme={theme} /> : null}
      </View>
    </View>
  )
}

function PrimaryButton({ label, icon, onPress, disabled, styles }: ButtonProps) {
  return (
    <PressableScale
      style={[styles.primaryButton, disabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityRole="button"
    >
      <MaterialCommunityIcons name={icon} size={18} color={OnAccent.onLight} />
      <Text style={styles.primaryButtonText}>{label}</Text>
    </PressableScale>
  )
}

function SecondaryButton({ label, icon, onPress, disabled, styles, theme, danger = false }: ButtonProps & { danger?: boolean }) {
  return (
    <PressableScale
      style={[styles.secondaryButton, danger && styles.secondaryButtonDanger, disabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityRole="button"
    >
      <MaterialCommunityIcons name={icon} size={18} color={danger ? theme.risk : theme.ink} />
      <Text style={[styles.secondaryButtonText, danger && styles.secondaryButtonTextDanger]}>{label}</Text>
    </PressableScale>
  )
}

function SmallButton({ label, onPress, styles, theme }: { label: string; onPress: () => void; styles: ReturnType<typeof createStyles>; theme: SportPalette }) {
  return <PressableScale style={styles.smallButton} onPress={onPress}><Text style={[styles.smallButtonText, { color: theme.ink }]}>{label}</Text></PressableScale>
}

function ErrorRecoveryButton({
  presentation,
  language,
  onRetry,
  onGoToArenaList,
  styles,
  theme,
}: {
  presentation: ArenaSessionErrorPresentation
  language: 'th' | 'en'
  onRetry?: () => void
  onGoToArenaList?: () => void
  styles: ReturnType<typeof createStyles>
  theme: SportPalette
}) {
  const action = recoveryAction(presentation, language, { onRetry, onGoToArenaList })
  if (!action.label || !action.onPress) return null
  return <SmallButton label={action.label} onPress={action.onPress} styles={styles} theme={theme} />
}

function recoveryAction(
  presentation: ArenaSessionErrorPresentation,
  language: 'th' | 'en',
  callbacks: { onRetry?: () => void; onGoToArenaList?: () => void },
): { label?: string; onPress?: () => void } {
  if (presentation.recoveryIntent === 'back_to_arena') {
    return { label: language === 'th' ? 'กลับสนาม' : 'Back to arena', onPress: callbacks.onGoToArenaList }
  }
  if (presentation.recoveryIntent === 'refresh' || presentation.recoveryIntent === 'retry') {
    return { label: language === 'th' ? 'ลองใหม่' : 'Try again', onPress: callbacks.onRetry }
  }
  return {}
}

function Fact({ label, value, styles }: { label: string; value: string; styles: ReturnType<typeof createStyles> }) {
  return <View style={styles.fact}><Text style={styles.factLabel}>{label}</Text><Text style={styles.factValue}>{value}</Text></View>
}

type ButtonProps = {
  label: string
  icon: keyof typeof MaterialCommunityIcons.glyphMap
  onPress?: () => void
  disabled?: boolean
  styles: ReturnType<typeof createStyles>
  theme: SportPalette
}

function roleLabel(role: ArenaSessionSnapshot['actor']['role']): string {
  return role === 'host' ? 'Host' : role === 'member' ? 'สมาชิก' : 'ผู้ชม'
}

function activityLabel(activity: ArenaSessionSnapshot['session']['activityType']): string {
  return activity === 'basketball' ? 'Basketball' : 'Badminton'
}

function activityIcon(activity: ArenaSessionSnapshot['session']['activityType']): keyof typeof MaterialCommunityIcons.glyphMap {
  return activity === 'basketball' ? 'basketball' : 'badminton'
}

function queueSummary(
  team: ArenaSessionSnapshot['teams'][number] | null,
  queuedTeamCount: number,
): string {
  if (!team) return queuedTeamCount > 0 ? `${queuedTeamCount} ทีมกำลังรอ` : 'ยังไม่มีทีมรอคิว'
  if (team.status === 'active' || team.status === 'champion') return `${team.name} อยู่บนสนาม`
  if (team.status === 'on_deck') return `${team.name} รอลงสนาม`
  if (team.queuePosition) return `คิว #${team.queuePosition} · ${team.name}`
  return `${team.name} · ${TEAM_STATUS_COPY[team.status] ?? team.status}`
}

function orderTeamsForDisplay(teams: ArenaSessionSnapshot['teams']): ArenaSessionSnapshot['teams'] {
  const weight: Record<string, number> = {
    champion: 0,
    active: 1,
    on_deck: 2,
    queued: 3,
    forming: 4,
    disputed: 5,
    retired: 6,
    removed: 7,
  }
  return [...teams].sort((a, b) => {
    const statusOrder = (weight[a.status] ?? 99) - (weight[b.status] ?? 99)
    if (statusOrder !== 0) return statusOrder
    return (a.queuePosition ?? Number.MAX_SAFE_INTEGER) - (b.queuePosition ?? Number.MAX_SAFE_INTEGER)
  })
}

function memberLabel(
  member: ArenaSessionSnapshot['teams'][number]['members'][number],
  index: number,
): string {
  return member.displayName ?? member.handle ?? `สมาชิก ${index + 1}`
}

function memberInitials(
  member: ArenaSessionSnapshot['teams'][number]['members'][number],
  index: number,
): string {
  return memberLabel(member, index).trim().slice(0, 2).toUpperCase()
}

function presenceLabel(status: ArenaSessionSnapshot['actor']['presenceStatus']): string {
  return status === 'valid' ? 'ยืนยันแล้ว' : status === 'revoked' ? 'ต้องยืนยันใหม่' : 'ยังไม่ยืนยัน'
}

function roundLabel(status: string): string {
  return {
    stake_acceptance: 'รอรับรองแต้มเดิมพัน',
    in_progress: 'กำลังแข่ง',
    result_pending: 'รอส่งผล',
    disputed: 'ผลถูกโต้แย้ง',
    settled: 'ปิดผลแล้ว',
    cancelled: 'รอบถูกยกเลิก',
  }[status] ?? status
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.arenaPage },
    container: { paddingHorizontal: 16, gap: Spacing.md },
    stateRoot: { justifyContent: 'center', paddingHorizontal: 20 },
    stateCard: {
      alignItems: 'center',
      gap: 10,
      borderRadius: Radius.xxl,
      borderWidth: 1,
      borderColor: theme.line,
      padding: 24,
      backgroundColor: theme.bgElevated,
    },
    stateTitle: { color: theme.ink, fontSize: 20, fontWeight: '900', textAlign: 'center' },
    stateDetail: { color: theme.muted, fontSize: 13, lineHeight: 19, fontWeight: '700', textAlign: 'center' },
    arenaOverview: { gap: Spacing.sm },
    arenaFacts: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm },
    arenaFact: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: Radius.pill, backgroundColor: theme.bgElevated, paddingHorizontal: 13 },
    arenaFactText: { color: theme.ink, fontSize: 13, fontWeight: '900' },
    syncBanner: { minHeight: 40, borderRadius: Radius.lg, backgroundColor: theme.trustSoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    syncText: { color: theme.trust, fontSize: 12, fontWeight: '800' },
    errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: Radius.lg, borderWidth: 1, borderColor: theme.risk, backgroundColor: theme.riskSoft, padding: 10 },
    errorCopy: { flex: 1, minWidth: 0, gap: 2 },
    errorTitle: { color: theme.risk, fontSize: 12, lineHeight: 16, fontWeight: '900' },
    errorText: { color: theme.risk, fontSize: 11, lineHeight: 16, fontWeight: '700' },
    smallButton: { minHeight: 44, borderRadius: Radius.md, backgroundColor: theme.bgElevated, justifyContent: 'center', paddingHorizontal: 12 },
    smallButtonText: { fontSize: 11, fontWeight: '900' },
    panel: {
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.bgElevated,
      padding: 14,
      gap: 11,
    },
    panelHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    panelEyebrow: { color: theme.inkSoft, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    panelTitle: { color: theme.ink, fontSize: 16, fontWeight: '900' },
    panelCount: { color: theme.ink, fontSize: 14, fontWeight: '900' },
    panelHint: { color: theme.muted, fontSize: 12, lineHeight: 18, fontWeight: '700' },
    memberList: { gap: 8 },
    memberRow: { minHeight: 52, borderRadius: Radius.lg, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10 },
    memberRowSelected: { borderColor: theme.trust, backgroundColor: theme.trustSoft },
    memberAvatar: { width: 32, height: 32, borderRadius: Radius.pill, backgroundColor: theme.fightPanel, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
    memberAvatarImage: { width: '100%', height: '100%' },
    memberAvatarSelected: { backgroundColor: theme.trust },
    memberAvatarText: { color: theme.fightInk, fontSize: 10, fontWeight: '900' },
    memberName: { flex: 1, color: theme.ink, fontSize: 13, fontWeight: '900' },
    factRow: { flexDirection: 'row', gap: 8 },
    fact: { flex: 1, minHeight: 54, borderRadius: Radius.md, backgroundColor: theme.surface, justifyContent: 'center', paddingHorizontal: 9 },
    factLabel: { color: theme.muted, fontSize: 10, fontWeight: '800' },
    factValue: { color: theme.ink, fontSize: 12, fontWeight: '900', marginTop: 2 },
    confirmedRow: { minHeight: 44, borderRadius: Radius.md, backgroundColor: theme.trustSoft, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10 },
    confirmedText: { color: theme.ink, fontSize: 12, fontWeight: '900' },
    primaryButton: { minHeight: 52, borderRadius: Radius.lg, backgroundColor: theme.orange, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 14 },
    primaryButtonText: { color: OnAccent.onLight, fontSize: 13, fontWeight: '900' },
    secondaryButton: { minHeight: 48, borderRadius: Radius.lg, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 14 },
    secondaryButtonDanger: { borderColor: theme.risk, backgroundColor: theme.riskSoft },
    secondaryButtonText: { color: theme.ink, fontSize: 13, fontWeight: '900' },
    secondaryButtonTextDanger: { color: theme.risk },
    buttonDisabled: { opacity: 0.5 },
    sheet: { borderRadius: Radius.xxl, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.bgElevated, overflow: 'hidden' },
    sheetSummary: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 14 },
    sheetIcon: { width: 42, height: 42, borderRadius: Radius.lg, backgroundColor: theme.orangeSoft, alignItems: 'center', justifyContent: 'center' },
    sheetSummaryCopy: { flex: 1, minWidth: 0 },
    sheetEyebrow: { color: theme.inkSoft, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    sheetTitle: { color: theme.ink, fontSize: 15, lineHeight: 20, fontWeight: '900', marginTop: 2 },
    sheetMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    sheetMetaText: { color: theme.muted, fontSize: 11, fontWeight: '800' },
    sheetBody: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line, gap: 14, padding: 14 },
    rosterBlock: { gap: 10 },
    rosterRow: { minHeight: 48, borderRadius: Radius.lg, backgroundColor: theme.surface, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10 },
    queueHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 2 },
    teamRow: { minHeight: 58, borderRadius: Radius.lg, backgroundColor: theme.surface, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10 },
    teamRowOwn: { borderWidth: 1, borderColor: theme.trust, backgroundColor: theme.trustSoft },
    teamBadge: { width: 34, height: 34, borderRadius: Radius.md, backgroundColor: theme.bgElevated, alignItems: 'center', justifyContent: 'center' },
    teamCopy: { flex: 1, minWidth: 0 },
    teamName: { color: theme.ink, fontSize: 13, fontWeight: '900' },
    teamMeta: { color: theme.muted, fontSize: 11, fontWeight: '700', marginTop: 2 },
    queuePosition: { color: theme.ink, fontSize: 16, fontWeight: '900', fontVariant: ['tabular-nums'] },
    roundRow: { minHeight: 46, borderRadius: Radius.lg, backgroundColor: theme.orangeSoft, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 11 },
    roundText: { color: theme.muted, fontSize: 13, fontWeight: '800' },
  })
}
