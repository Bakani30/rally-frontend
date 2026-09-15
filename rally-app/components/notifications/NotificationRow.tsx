import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { PressableScale } from '@/components/motion/PressableScale'
import { SwipeableRow } from '@/components/ui/SwipeableRow'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import {
  describeInviter,
  formatActivity,
  inviteKindCopy,
  refereeStateCopy,
  reviewStatusLabel,
  sideLabel,
} from '@/lib/notifications/notificationCopy'
import { TIER_LABEL } from '@/lib/cosmetics/rankFrameGating'
import type { AlphaRefereeDutyState } from '@/lib/match/matchRules'
import type { TierEvent } from '@/lib/ranks/tierEventTypes'
import type { AlphaRefereeDuty, MyMatch, MyPendingInvite } from '@/types/match'

export type NotificationRowData =
  | { kind: 'header'; title: string; count?: number; tone?: 'neutral' | 'attention' }
  | { kind: 'submitted'; match: MyMatch }
  | { kind: 'team_review'; match: MyMatch; scoreLabel: string }
  | { kind: 'referee'; duty: AlphaRefereeDuty; state: AlphaRefereeDutyState }
  | { kind: 'invite'; invite: MyPendingInvite }
  // Quiet demotion notice (Rank Identity v1) — never a push, never a
  // full-screen moment (see PromotionMoment.tsx / tierEventTriage.ts);
  // just a low-key row here that marks itself seen once rendered.
  | { kind: 'demotion'; event: TierEvent }

type NotificationRowProps = {
  row: NotificationRowData
  respondPending: boolean
  onOpenMatch: (matchId: string, actionKey: string) => void
  onOpenReferee: (assignmentId: string) => void
  onAccept: (invite: MyPendingInvite) => void
  onDecline: (invite: MyPendingInvite) => void
}

/** Renders one notification row from the discriminated union (no local state — FlashList-safe). */
export function NotificationRow({
  row,
  respondPending,
  onOpenMatch,
  onOpenReferee,
  onAccept,
  onDecline,
}: NotificationRowProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)

  if (row.kind === 'header') {
    return <SectionLabel title={row.title} count={row.count} tone={row.tone} style={styles.header} />
  }

  if (row.kind === 'submitted') {
    const m = row.match
    return (
      <PressableScale
        style={styles.row}
        onPress={() => onOpenMatch(m.id, `notifications:submitted:${m.id}`)}
      >
        <View style={[styles.bar, { backgroundColor: theme.orange }]} />
        <View style={styles.mid}>
          <Text style={styles.title} numberOfLines={1}>
            {formatActivity(m.activity_type)} · ตรวจผล
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {reviewStatusLabel(m.status)}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={theme.muted} />
      </PressableScale>
    )
  }

  if (row.kind === 'team_review') {
    const m = row.match
    return (
      <PressableScale
        style={styles.row}
        onPress={() => onOpenMatch(m.id, `notifications:team-review:${m.id}`)}
      >
        <View style={[styles.bar, { backgroundColor: theme.orange }]} />
        <View style={styles.mid}>
          <Text style={styles.title} numberOfLines={1}>
            {formatActivity(m.activity_type)} · {row.scoreLabel}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            คะแนนถูกแก้แล้ว แตะเพื่อตรวจผลรวม
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={theme.muted} />
      </PressableScale>
    )
  }

  if (row.kind === 'demotion') {
    const e = row.event
    return (
      <View style={styles.row}>
        <View style={[styles.bar, { backgroundColor: theme.muted }]} />
        <View style={styles.mid}>
          <Text style={styles.title} numberOfLines={1}>
            {formatActivity(e.activityType)} · ตกขั้น
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {TIER_LABEL[e.fromTier]} → {TIER_LABEL[e.toTier]}
          </Text>
        </View>
      </View>
    )
  }

  if (row.kind === 'referee') {
    const copy = refereeStateCopy(row.state)
    return (
      <PressableScale style={styles.row} onPress={() => onOpenReferee(row.duty.assignmentId)}>
        <View style={[styles.bar, { backgroundColor: theme.green }]} />
        <View style={styles.mid}>
          <Text style={styles.title} numberOfLines={1}>
            {copy.title}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {formatActivity(row.duty.match.activityType)} · {copy.sub}
          </Text>
        </View>
        <MaterialCommunityIcons name="whistle-outline" size={20} color={theme.green} />
      </PressableScale>
    )
  }

  const inv = row.invite
  const activityLabel = formatActivity(inv.match.activityType)
  const inviteCopy = inviteKindCopy(inv.kind, describeInviter(inv.inviter), activityLabel)
  const kindTag = inv.kind === 'challenge' ? 'ท้า' : inv.kind === 'rematch' ? 'รีแมตช์' : null
  return (
    <SwipeableRow
      enabled={!respondPending}
      affirmAction={{
        icon: 'login-variant',
        label: 'รับ',
        bg: theme.actionAccept,
        fg: theme.actionAcceptInk,
        onAction: () => onAccept(inv),
        accessibilityLabel: 'ตอบรับและเข้าแมตช์',
      }}
      destroyAction={{
        icon: 'close-circle-outline',
        label: 'ปฏิเสธ',
        bg: theme.actionDecline,
        fg: theme.actionDeclineInk,
        onAction: () => onDecline(inv),
        accessibilityLabel: 'ปฏิเสธคำเชิญ',
      }}
    >
      <PressableScale
        style={styles.row}
        onPress={() => onOpenMatch(inv.matchId, `notifications:invite-open:${inv.inviteId}`)}
      >
        <View style={[styles.bar, { backgroundColor: theme.orange }]} />
        <View style={styles.mid}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {inviteCopy.title}
            </Text>
            {kindTag ? <Text style={styles.kindChip}>{kindTag}</Text> : null}
          </View>
          <Text style={styles.sub} numberOfLines={1}>
            {activityLabel} · TEAM {sideLabel(inv.side)} · {inv.match.stake} pts
          </Text>
        </View>
      </PressableScale>
    </SwipeableRow>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    header: { paddingTop: Spacing.sm },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      backgroundColor: theme.surface,
      borderRadius: Radius.xl,
      paddingVertical: 12,
      paddingHorizontal: Spacing.md,
      borderWidth: 1,
      borderColor: theme.line,
    },
    bar: { width: 5, alignSelf: 'stretch', borderRadius: Radius.pill },
    mid: { flex: 1, minWidth: 0 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    title: { flexShrink: 1, fontSize: 15, fontWeight: '900', color: theme.ink },
    kindChip: {
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 0.5,
      color: theme.chalk,
      backgroundColor: theme.red,
      borderRadius: Radius.pill,
      paddingHorizontal: 8,
      paddingVertical: 2,
      overflow: 'hidden',
    },
    sub: { fontSize: 12, color: theme.muted, marginTop: 2, fontWeight: '700' },
  })
}
