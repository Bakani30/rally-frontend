import { useEffect, useRef } from 'react'
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Screen } from '@/components/layout/Screen'
import { ActivityIcon } from '@/components/ui/ActivityIcon'
import { PressableScale } from '@/components/motion/PressableScale'
import { Reveal } from '@/components/motion/Reveal'
import { ScreenBackButton } from '@/components/navigation/ScreenBackButton'
import { ActivityColor, Fonts, onAccent, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useAuth } from '@/hooks/useAuth'
import { useAlphaRunningGate } from '@/hooks/useAlphaRunningGate'
import { useChallenge } from '@/hooks/useChallenge'
import { useChallengeActions } from '@/hooks/useChallengeActions'
import { useAnalytics } from '@/hooks/useAnalytics'
import { extractPlannedRouteGeometry } from '@/lib/maps/plannedRouteGeometry'
import { ACTIVITY_LABEL } from '@/lib/match/matchConfig'
import type { ChallengeGoalType, ChallengeParticipant } from '@/types/challenge'
import { guardedRouter } from '@/lib/navigation/guardedRouter'

const GOAL_UNIT: Record<ChallengeGoalType, string> = {
  distance_km: 'km',
  sessions: 'ครั้ง',
  minutes: 'นาที',
  custom: 'ภารกิจ',
}

export default function ChallengeDetailScreen() {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const runningAlphaGate = useAlphaRunningGate()
  const { track } = useAnalytics()
  const { data: challenge, isPending, error } = useChallenge(id)
  const screenTrackedRef = useRef<string | null>(null)
  const {
    claimRewardMutation,
    joinMutation,
    leaveMutation,
    updateProgressMutation,
  } = useChallengeActions(id, user?.id)

  useEffect(() => {
    const campaign = challenge?.campaigns
    if (!challenge || !campaign?.id) return
    const key = `${campaign.id}:${challenge.id}`
    if (screenTrackedRef.current === key) return
    screenTrackedRef.current = key
    track({
      name: 'screen_viewed',
      properties: {
        event_schema_version: 2,
        source: 'client',
        surface: 'challenge_detail',
        campaign_id: campaign.id,
        campaign_slug: campaign.slug,
        challenge_id: challenge.id,
        entrypoint: 'challenge_detail',
        screen: 'challenge_detail',
        has_campaign_skin: true,
      },
    })
  }, [challenge, track])

  if (isPending) return <ActivityIndicator style={styles.loader} color={theme.red} />

  if (error || !challenge) {
    return (
      <View style={styles.center}>
        <MaterialCommunityIcons name="flag-off-outline" size={42} color={theme.muted} />
        <Text style={styles.errorText}>ไม่พบ challenge นี้</Text>
        <PressableScale style={styles.secondaryBtn} onPress={() => router.back()}>
          <Text style={styles.secondaryBtnText}>ย้อนกลับ</Text>
        </PressableScale>
      </View>
    )
  }

  const accent = ActivityColor[challenge.activity_type] ?? theme.red
  const campaign = challenge.campaigns ?? null
  const skin = campaign?.skin ?? {}
  const campaignAccent = skin.accentColor ?? skin.primaryColor ?? accent
  const myParticipation = challenge.participants.find((p) => p.user_id === user?.id) ?? null
  const isJoined = !!myParticipation
  const isCreator = challenge.creator_id === user?.id
  const max = challenge.max_participants
  const isFull = !!max && challenge.participants.length >= max
  const goalUnit = GOAL_UNIT[challenge.goal_type]
  // A 1-unit custom goal is pass/fail (e.g. "finish the official route") —
  // a numeric progress bar reads as broken there, so render status instead.
  const isBinaryGoal = challenge.goal_type === 'custom' && challenge.goal_value === 1
  const isCoop = challenge.challenge_mode === 'cooperative'
  const teamProgress = challenge.progress_summary?.team_progress
    ?? challenge.participants.reduce((sum, participant) => sum + participant.progress, 0)
  const teamCompleted = challenge.progress_summary?.team_completed
    ?? teamProgress >= challenge.goal_value
  const isEnded = new Date(challenge.end_at).getTime() <= Date.now()
  const hasRenderableRoute = !!extractPlannedRouteGeometry(challenge.planned_route_geojson)
  const completedAt = myParticipation?.completed_at ?? null
  const rewardClaimedAt = myParticipation?.reward_claimed_at ?? null
  const canClaimReward = !!completedAt && !rewardClaimedAt
  const rewardLabel =
    challenge.reward_points && challenge.reward_points > 0
      ? `รับรางวัล +${challenge.reward_points} PTS`
      : 'รับรางวัล'

  function showError(e: unknown) {
    const message = e instanceof Error ? e.message : 'Something went wrong.'
    if (Platform.OS === 'web') {
      globalThis.alert(`Error\n\n${message}`)
      return
    }
    Alert.alert('Error', message)
  }

  function onJoin() {
    if (campaign?.id) {
      track({
        name: 'interaction_performed',
        properties: {
          event_schema_version: 2,
          source: 'client',
          surface: 'challenge_detail',
          campaign_id: campaign.id,
          campaign_slug: campaign.slug,
          challenge_id: challenge!.id,
          entrypoint: 'challenge_detail',
          interaction: 'challenge_join',
          target: 'join_button',
        },
      })
    }
    joinMutation.mutate(challenge!.id, { onError: showError })
  }

  function onLeave() {
    const action = () => leaveMutation.mutate(challenge!.id, { onError: showError })
    if (Platform.OS === 'web') return action()
    Alert.alert('Leave Challenge', 'แน่ใจว่าจะออกจาก challenge นี้?', [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'ออก', style: 'destructive', onPress: action },
    ])
  }

  function onSyncProgress() {
    updateProgressMutation.mutate(
      challenge!.id,
      { onError: showError },
    )
  }

  function onClaimReward() {
    claimRewardMutation.mutate(challenge!.id, { onError: showError })
  }

  return (
    <Screen
      edges={['top', 'bottom']}
      bottomPad={48}
      backgroundColor={theme.bg}
      contentContainerStyle={styles.container}
    >
      <ScreenBackButton />
      {campaign && (
        <Reveal delay={0}>
          <PressableScale
            style={[styles.campaignBanner, { borderColor: `${campaignAccent}66`, backgroundColor: skin.backgroundColor ?? theme.surface }]}
            onPress={() => guardedRouter.push(`/campaigns/${campaign.slug}`, { actionKey: `challenge:${challenge.id}:campaign` })}
          >
            <View style={[styles.campaignIcon, { backgroundColor: `${campaignAccent}22` }]}>
              <MaterialCommunityIcons name="flag-variant" size={15} color={campaignAccent} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.campaignTitle} numberOfLines={1}>{campaign.title}</Text>
              <Text style={styles.campaignPrompt} numberOfLines={1}>{campaign.short_prompt}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={18} color={theme.muted} />
          </PressableScale>
        </Reveal>
      )}
      <Reveal delay={0}>
        <View style={[styles.headerCard, { borderColor: `${campaignAccent}55`, backgroundColor: skin.backgroundColor ?? theme.surface }]}>
          <View style={styles.headerRow}>
            <View style={[styles.iconBox, { backgroundColor: `${accent}22` }]}>
              <ActivityIcon activity={challenge.activity_type} size={22} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{challenge.title}</Text>
              <Text style={styles.activity}>{ACTIVITY_LABEL[challenge.activity_type]}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Meta
              theme={theme}
              icon="bullseye-arrow"
              label={isBinaryGoal ? 'วิ่งครบเส้นทาง = สำเร็จ' : `เป้าหมาย ${challenge.goal_value} ${goalUnit}`}
            />
            {isCoop && <Meta theme={theme} icon="account-multiple-check" label="co-op" />}
            {challenge.planned_route_geojson && <Meta theme={theme} icon="map-marker-path" label="เส้นทาง official" />}
            <Meta
              theme={theme}
              icon="account-group"
              label={`${challenge.participants.length}${max ? `/${max}` : ''} คน`}
            />
            <Meta
              theme={theme}
              icon="clock-outline"
              label={`สิ้นสุด ${new Date(challenge.end_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}`}
            />
            {isEnded && <Meta theme={theme} icon="flag-checkered" label="หมดเวลาแล้ว" tone="muted" />}
          </View>

          {!!challenge.description && (
            <Text style={styles.description}>{challenge.description}</Text>
          )}
        </View>
      </Reveal>

      {hasRenderableRoute && (
        <Reveal delay={70}>
          <PressableScale
            style={[styles.secondaryBtn, { flexDirection: 'row', justifyContent: 'center', gap: 8 }]}
            accessibilityRole="button"
            accessibilityLabel="ดูเส้นทาง official ของ event นี้"
            onPress={() =>
              guardedRouter.push(`/challenges/map/${challenge.id}`, {
                actionKey: `challenge-detail:map:${challenge.id}`,
              })
            }
          >
            <MaterialCommunityIcons name="map-outline" size={16} color={theme.inkSoft} />
            <Text style={styles.secondaryBtnText}>ดูเส้นทาง</Text>
          </PressableScale>
        </Reveal>
      )}

      {!isCreator && !isEnded && (
        <Reveal delay={80}>
          {isJoined ? (
            <PressableScale
              style={styles.secondaryBtn}
              onPress={onLeave}
              disabled={leaveMutation.isPending}
            >
              <Text style={styles.secondaryBtnText}>
                {leaveMutation.isPending ? 'กำลังออก…' : 'ออกจาก EVENT'}
              </Text>
            </PressableScale>
          ) : (
            <PressableScale
              style={[styles.primaryBtn, { backgroundColor: accent }, isFull && styles.disabledBtn]}
              onPress={onJoin}
              disabled={joinMutation.isPending || isFull}
            >
              <MaterialCommunityIcons name="flag-plus" size={16} color={onAccent(accent)} />
              <Text style={[styles.primaryBtnText, { color: onAccent(accent) }]}>
                {isFull ? 'เต็มแล้ว' : joinMutation.isPending ? 'กำลังเข้าร่วม…' : 'เข้าร่วม EVENT'}
              </Text>
            </PressableScale>
          )}
        </Reveal>
      )}

      {isJoined && !isEnded && challenge.planned_route_geojson && runningAlphaGate.enabled && (
        <Reveal delay={100}>
          <PressableScale
            style={[styles.primaryBtn, { backgroundColor: accent }]}
            accessibilityRole="button"
            accessibilityLabel="Run this route"
            onPress={() =>
              {
                if (campaign?.id) {
                  track({
                    name: 'interaction_performed',
                    properties: {
                      event_schema_version: 2,
                      source: 'client',
                      surface: 'challenge_detail',
                      campaign_id: campaign.id,
                      campaign_slug: campaign.slug,
                      challenge_id: challenge.id,
                      entrypoint: 'challenge_detail',
                      interaction: 'activity_start',
                      target: 'run_route_button',
                    },
                  })
                }
              guardedRouter.push({
                pathname: '/run/active',
                params: { challengeId: challenge.id },
              }, { actionKey: `challenge:${challenge.id}:run` })
              }
            }
          >
            <MaterialCommunityIcons name="map-marker-path" size={16} color={onAccent(accent)} />
            <Text style={[styles.primaryBtnText, { color: onAccent(accent) }]}>วิ่งเส้นทางนี้</Text>
          </PressableScale>
        </Reveal>
      )}

      {isCoop && (
        <Reveal delay={115}>
          <View style={styles.teamProgressCard}>
            <View style={styles.teamProgressHeader}>
              <View>
                <Text style={styles.sectionLabel}>TEAM PROGRESS</Text>
                <Text style={styles.teamProgressMeta}>
                  {challenge.progress_summary?.participant_count ?? challenge.participants.length} players
                </Text>
              </View>
              {teamCompleted && (
                <View style={styles.teamCompletePill}>
                  <MaterialCommunityIcons name="check-decagram" size={13} color={theme.green} />
                  <Text style={styles.teamCompleteText}>complete</Text>
                </View>
              )}
            </View>
            <View style={styles.progressRow}>
              <Text style={[styles.progressValue, { color: theme.greenVivid }]}>
                {formatProgressValue(teamProgress)}
              </Text>
              <Text style={styles.progressGoal}>
                / {challenge.goal_value} {goalUnit}
              </Text>
            </View>
            <ProgressBar styles={styles} value={teamProgress} max={challenge.goal_value} accent={theme.green} />
          </View>
        </Reveal>
      )}

      {isJoined && (
        <Reveal delay={120}>
          <View style={styles.progressCard}>
            <Text style={styles.sectionLabel}>YOUR PROGRESS</Text>
            {isBinaryGoal ? (
              <View style={styles.binaryStatusRow}>
                <MaterialCommunityIcons
                  name={myParticipation!.progress >= 1 ? 'check-decagram' : 'progress-clock'}
                  size={18}
                  color={myParticipation!.progress >= 1 ? theme.greenVivid : theme.muted}
                />
                <Text
                  style={[
                    styles.binaryStatusText,
                    { color: myParticipation!.progress >= 1 ? theme.greenVivid : theme.inkSoft },
                  ]}
                >
                  {myParticipation!.progress >= 1
                    ? 'สำเร็จแล้ว'
                    : 'ยังไม่สำเร็จ — วิ่งให้ครบเส้นทางเพื่อปลดล็อก'}
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.progressRow}>
                  <Text style={[styles.progressValue, { color: accent }]}>
                    {myParticipation!.progress}
                  </Text>
                  <Text style={styles.progressGoal}>
                    / {challenge.goal_value} {goalUnit}
                  </Text>
                </View>
                <ProgressBar
                  styles={styles}
                  value={myParticipation!.progress}
                  max={challenge.goal_value}
                  accent={accent}
                />
              </>
            )}
            {completedAt && (
              <View style={styles.completeBanner}>
                <MaterialCommunityIcons name="trophy-award" size={14} color={theme.green} />
                <Text style={styles.completeText}>ทำสำเร็จเมื่อ {new Date(completedAt).toLocaleDateString()}</Text>
              </View>
            )}
            {canClaimReward && (
              <PressableScale
                style={styles.claimBtn}
                onPress={onClaimReward}
                disabled={claimRewardMutation.isPending}
              >
                <MaterialCommunityIcons name="gift-open-outline" size={15} color={theme.onEconomy} />
                <Text style={styles.claimBtnText}>
                  {claimRewardMutation.isPending ? 'กำลังรับรางวัล…' : rewardLabel}
                </Text>
              </PressableScale>
            )}
            {rewardClaimedAt && (
              <View style={styles.claimedBanner}>
                <MaterialCommunityIcons name="check-decagram" size={14} color={theme.economy} />
                <Text style={styles.claimedText}>รับรางวัลแล้ว</Text>
              </View>
            )}
            <View style={styles.progressActionRow}>
              <PressableScale
                style={styles.updateBtn}
                onPress={onSyncProgress}
                disabled={updateProgressMutation.isPending}
              >
                <MaterialCommunityIcons name="sync" size={14} color={theme.bg} />
                <Text style={styles.updateBtnText}>
                  {updateProgressMutation.isPending ? 'กำลังอัปเดต…' : 'อัปเดตความคืบหน้า'}
                </Text>
              </PressableScale>
            </View>
          </View>
        </Reveal>
      )}

      <Reveal delay={160}>
        <View style={[styles.section, { marginTop: Spacing.sm }]}>
          <Text style={styles.sectionLabel}>PARTICIPANTS · {challenge.participants.length}</Text>
          {challenge.participants.length === 0 && (
            <Text style={styles.emptyHint}>ยังไม่มีผู้เข้าร่วม</Text>
          )}
          {challenge.participants.map((p) => (
            <ParticipantRow
              key={p.user_id}
              styles={styles}
              participant={p}
              goal={challenge.goal_value}
              accent={accent}
              isMe={p.user_id === user?.id}
              unit={goalUnit}
              isBinaryGoal={isBinaryGoal}
            />
          ))}
        </View>
      </Reveal>
    </Screen>
  )
}

function formatProgressValue(value: number): string {
  if (!Number.isFinite(value)) return '0'
  if (Math.abs(value - Math.round(value)) < 0.005) return String(Math.round(value))
  return value.toFixed(value >= 10 ? 1 : 2)
}

function Meta({
  theme,
  icon,
  label,
  tone,
}: {
  theme: SportPalette
  icon: keyof typeof MaterialCommunityIcons.glyphMap
  label: string
  tone?: 'muted'
}) {
  const styles = createStyles(theme)
  const color = tone === 'muted' ? theme.mutedSoft : theme.muted
  const textColor = tone === 'muted' ? theme.mutedSoft : theme.inkSoft
  return (
    <View style={styles.metaPill}>
      <MaterialCommunityIcons name={icon} size={11} color={color} />
      <Text style={[styles.metaText, { color: textColor }]}>{label}</Text>
    </View>
  )
}

function ProgressBar({ styles, value, max, accent }: { styles: ReturnType<typeof createStyles>; value: number; max: number; accent: string }) {
  const pct = Math.min(1, max > 0 ? value / max : 0)
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: accent }]} />
    </View>
  )
}

function ParticipantRow({
  styles,
  participant,
  goal,
  accent,
  isMe,
  unit,
  isBinaryGoal,
}: {
  styles: ReturnType<typeof createStyles>
  participant: ChallengeParticipant
  goal: number
  accent: string
  isMe: boolean
  unit: string
  isBinaryGoal: boolean
}) {
  const name = participant.users?.display_name ?? 'Unknown'
  const handle = participant.users?.handle
  const pct = Math.round(Math.min(1, goal > 0 ? participant.progress / goal : 0) * 100)
  const binaryDone = participant.progress >= goal
  return (
    <View style={styles.participantRow}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.participantName} numberOfLines={1}>
          {name}
          {isMe && <Text style={styles.youTag}>  YOU</Text>}
        </Text>
        {handle && <Text style={styles.participantHandle} numberOfLines={1}>@{handle}</Text>}
      </View>
      {isBinaryGoal ? (
        <Text style={[styles.participantStatus, { color: binaryDone ? accent : undefined }]}>
          {binaryDone ? 'สำเร็จแล้ว' : 'ยังไม่สำเร็จ'}
        </Text>
      ) : (
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.participantProgress, { color: accent }]}>
            {participant.progress} {unit}
          </Text>
          <Text style={styles.participantPct}>{pct}%</Text>
        </View>
      )}
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    loader: { flex: 1, backgroundColor: theme.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, backgroundColor: theme.bg, padding: Spacing.xl },
    errorText: { color: theme.ink, fontSize: 15, fontWeight: '700' },
    container: { paddingHorizontal: Spacing.xl, gap: Spacing.md },
    headerCard: {
      backgroundColor: theme.surface,
      borderRadius: Radius.xxl,
      borderWidth: 1,
      padding: Spacing.lg,
      gap: Spacing.md,
    },
    campaignBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      borderRadius: Radius.xl,
      borderWidth: 1,
      padding: Spacing.md,
    },
    campaignIcon: {
      width: 34,
      height: 34,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    campaignTitle: { color: theme.ink, fontSize: 13, fontWeight: '900' },
    campaignPrompt: { color: theme.muted, fontSize: 11, fontWeight: '700', marginTop: 1 },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    iconBox: {
      width: 44,
      height: 44,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: { fontSize: 20, fontFamily: Fonts?.thaiHead, color: theme.ink, letterSpacing: -0.3 },
    activity: { fontSize: 12, color: theme.muted, marginTop: 2, textTransform: 'capitalize' },
    description: { fontSize: 13, color: theme.inkSoft, lineHeight: 21, fontFamily: Fonts?.thaiBody },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    metaPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: Radius.pill,
      backgroundColor: theme.surfaceStrong,
      borderWidth: 1,
      borderColor: theme.line,
    },
    metaText: { fontSize: 11, fontFamily: Fonts?.thaiMedium, letterSpacing: 0.2 },
    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.red,
      borderRadius: Radius.lg,
      paddingVertical: 14,
    },
    primaryBtnText: { color: theme.chalk, fontFamily: Fonts?.thaiHead, fontSize: 13, letterSpacing: 0.4 },
    disabledBtn: { opacity: 0.5 },
    secondaryBtn: {
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface,
      borderRadius: Radius.lg,
      paddingVertical: 12,
      alignItems: 'center',
    },
    secondaryBtnText: { color: theme.inkSoft, fontFamily: Fonts?.thaiMedium, fontSize: 12, letterSpacing: 0.4 },
    progressCard: {
      backgroundColor: theme.surface,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: theme.line,
      padding: Spacing.lg,
      gap: Spacing.sm,
    },
    teamProgressCard: {
      backgroundColor: theme.surface,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: `${theme.green}44`,
      padding: Spacing.lg,
      gap: Spacing.sm,
    },
    teamProgressHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: Spacing.md,
    },
    teamProgressMeta: { marginTop: 2, fontSize: 11, color: theme.muted, fontWeight: '700' },
    teamCompletePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: Radius.pill,
      backgroundColor: theme.greenSoft,
    },
    teamCompleteText: { fontSize: 10, color: theme.greenVivid, fontWeight: '900', letterSpacing: 0 },
    sectionLabel: { fontSize: 10, fontWeight: '900', color: theme.muted, letterSpacing: 1.6 },
    progressRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
    progressValue: {
      fontSize: 32,
      fontWeight: '900',
      fontFamily: Fonts?.rounded,
      fontVariant: ['tabular-nums'],
      letterSpacing: -1,
    },
    progressGoal: { fontSize: 12, color: theme.muted, fontWeight: '700', marginBottom: 4 },
    binaryStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
    binaryStatusText: { fontSize: 14, fontFamily: Fonts?.thaiMedium, flexShrink: 1 },
    participantStatus: { fontSize: 12, fontFamily: Fonts?.thaiMedium, color: theme.muted, letterSpacing: 0.2 },
    progressTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.surfaceStrong,
      overflow: 'hidden',
    },
    progressFill: { height: '100%' },
    completeBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: Radius.pill,
      backgroundColor: theme.greenSoft,
      alignSelf: 'flex-start',
    },
    completeText: { fontSize: 11, color: theme.greenVivid, fontWeight: '800', letterSpacing: 0.4 },
    claimBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.economy,
      borderRadius: Radius.lg,
      paddingVertical: 12,
    },
    claimBtnText: {
      color: theme.onEconomy,
      fontSize: 12,
      fontWeight: '900',
      letterSpacing: 0.8,
    },
    claimedBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: Radius.pill,
      backgroundColor: theme.economySoft,
      alignSelf: 'flex-start',
    },
    claimedText: { fontSize: 11, color: theme.economy, fontWeight: '900', letterSpacing: 0.4 },
    progressActionRow: { flexDirection: 'row', marginTop: 4 },
    updateBtn: {
      flexDirection: 'row',
      gap: 6,
      backgroundColor: theme.ink,
      paddingHorizontal: 18,
      paddingVertical: 11,
      borderRadius: Radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    updateBtnText: { color: theme.bg, fontFamily: Fonts?.thaiMedium, fontSize: 12, letterSpacing: 0.3 },
    section: {
      backgroundColor: theme.surface,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: theme.line,
      padding: Spacing.lg,
      gap: Spacing.sm,
    },
    emptyHint: { fontSize: 12, color: theme.muted },
    participantRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.line,
    },
    participantName: { fontSize: 14, color: theme.ink, fontWeight: '700' },
    participantHandle: { fontSize: 11, color: theme.muted, marginTop: 1 },
    participantProgress: { fontSize: 14, fontWeight: '900', fontVariant: ['tabular-nums'] },
    participantPct: { fontSize: 10, color: theme.muted, fontWeight: '700', letterSpacing: 0.4 },
    youTag: { fontSize: 9, fontWeight: '900', letterSpacing: 1, color: theme.muted },
  })
}
