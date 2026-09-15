import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Text, View } from 'react-native'

import { PressableScale } from '@/components/motion/PressableScale'
import { Spacing } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useI18n } from '@/hooks/useI18n'
import {
  formatPartyExpiry,
  formatPartyTeamSize,
  getPartyActivityLabel,
  getPartyViewerState,
  type PartyViewerState,
} from '@/lib/party/partyPresentation'
import { partyDictionary } from '@/lib/i18n/dictionaries/party'
import type { PartyDetail, PartyProfile } from '@/types/party'
import { createPartyStyles } from './partyStyles'
import { PartyRosterCourt } from './PartyRosterCourt'

type PartyDetailPanelProps = {
  party: PartyDetail
  actorUserId?: string
  busy: boolean
  onRequestJoin: () => void
  onAcceptInvite: () => void
  onOpenMembershipSheet: () => void
  onOpenInvitePicker: () => void
  onLeave: () => void
  onDissolve: () => void
  onRemoveMember: (profile: PartyProfile) => void
  onMemberPress: (userId: string) => void
  onEmptySlot: () => void
}

export function PartyDetailPanel({
  party,
  actorUserId,
  busy,
  onRequestJoin,
  onAcceptInvite,
  onOpenMembershipSheet,
  onOpenInvitePicker,
  onLeave,
  onDissolve,
  onRemoveMember,
  onMemberPress,
  onEmptySlot,
}: PartyDetailPanelProps) {
  const theme = useSportTheme()
  const styles = createPartyStyles(theme)
  const { t, language } = useI18n(partyDictionary)
  const core = party.party
  const hostUserId = party.host?.userId ?? party.host_user_id
  const viewerState = getPartyViewerState(party, actorUserId)
  const isHost = viewerState === 'host'
  const isActive = viewerState === 'host' || viewerState === 'active'
  const pendingCount = party.pendingMembers?.length ?? 0
  const canManage = isHost && core.status === 'forming'

  return (
    <View style={[styles.panel, { gap: Spacing.lg }]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md }}>
        <View style={{ width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.orange }}>
          <MaterialCommunityIcons name={core.activity_type === 'basketball' ? 'basketball' : 'badminton'} size={27} color={theme.chalk} />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Text style={{ color: theme.ink, fontSize: 21, fontWeight: '900' }} numberOfLines={2}>{core.name}</Text>
          <Text style={{ color: theme.muted, fontSize: 12 }}>
            {getPartyActivityLabel(core.activity_type, language)} · {formatPartyTeamSize(core.team_size)} · {formatPartyExpiry(core.expires_at, new Date(), language)}
          </Text>
        </View>
        <View style={{ minHeight: 30, borderRadius: 999, backgroundColor: isHost ? theme.orangeSoft : theme.surface, paddingHorizontal: Spacing.sm, justifyContent: 'center' }}>
          <Text style={{ color: isHost ? theme.orange : theme.muted, fontSize: 11, fontWeight: '800' }}>{viewerStatusLabel(viewerState, language, t)}</Text>
        </View>
      </View>

      {party.host ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.orangeSoft, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialCommunityIcons name="crown-outline" size={17} color={theme.orange} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.muted, fontSize: 10, fontWeight: '800' }}>{t('host')}</Text>
            <Text style={{ color: theme.ink, fontSize: 13, fontWeight: '900' }} numberOfLines={1}>
              {party.host.displayName ?? party.host.handle ?? party.host.userId}
            </Text>
          </View>
        </View>
      ) : null}

      <View style={{ gap: Spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: theme.ink, fontSize: 15, fontWeight: '900' }}>{t('roster')}</Text>
          <Text style={{ color: theme.muted, fontSize: 12, fontWeight: '800' }}>
            {t('activeMembers', { count: party.activeRoster.length, size: core.team_size })}
          </Text>
        </View>
        <PartyRosterCourt
          activityType={core.activity_type}
          teamSize={core.team_size}
          activeRoster={party.activeRoster}
          hostUserId={hostUserId}
          canManage={canManage}
          onEmptySlot={onEmptySlot}
          onMemberPress={onMemberPress}
          onRemoveMember={onRemoveMember}
        />
        <Text style={{ color: theme.muted, fontSize: 11 }}>{t('tapPlayer')}</Text>
      </View>

      {canManage ? (
        <View style={{ gap: Spacing.sm }}>
          <PressableScale style={[styles.createCta, { backgroundColor: theme.surfaceStrong }]} onPress={onOpenMembershipSheet} disabled={busy} accessibilityRole="button">
            <MaterialCommunityIcons name="account-clock-outline" size={19} color={theme.orange} />
            <Text style={[styles.createCtaText, { color: theme.orange }]}>{t('requestsAndInvites')}{pendingCount > 0 ? ` (${pendingCount})` : ''}</Text>
          </PressableScale>
          <PressableScale style={[styles.createCta, { backgroundColor: theme.surfaceStrong }]} onPress={onOpenInvitePicker} disabled={busy} accessibilityRole="button">
            <MaterialCommunityIcons name="account-plus-outline" size={19} color={theme.orange} />
            <Text style={[styles.createCtaText, { color: theme.orange }]}>{t('openInvitePicker')}</Text>
          </PressableScale>
        </View>
      ) : null}

      {viewerState === 'visitor' && core.visibility === 'discoverable' && core.status === 'forming' ? (
        <ActionButton label={t('requestToJoinAction')} icon="account-plus-outline" busy={busy} onPress={onRequestJoin} />
      ) : null}
      {viewerState === 'invited' ? <ActionButton label={t('acceptInvite')} icon="email-check-outline" busy={busy} onPress={onAcceptInvite} /> : null}
      {viewerState === 'requested' ? <StatusLine icon="clock-outline" text={t('joinRequestSent')} /> : null}
      {isActive ? (
        <View style={{ gap: Spacing.sm }}>
          <ActionButton label={t('leaveParty')} icon="exit-run" busy={busy} onPress={onLeave} destructive={false} />
          {isHost ? <ActionButton label={t('dissolveParty')} icon="close-octagon-outline" busy={busy} onPress={onDissolve} destructive /> : null}
        </View>
      ) : null}
    </View>
  )
}

function ActionButton({
  label,
  icon,
  busy,
  onPress,
  destructive = false,
}: {
  label: string
  icon: keyof typeof MaterialCommunityIcons.glyphMap
  busy: boolean
  onPress: () => void
  destructive?: boolean
}) {
  const theme = useSportTheme()
  const styles = createPartyStyles(theme)
  return (
    <PressableScale style={[styles.createCta, { backgroundColor: destructive ? theme.risk : theme.orange }]} onPress={onPress} disabled={busy} accessibilityRole="button">
      <MaterialCommunityIcons name={icon} size={19} color={theme.chalk} />
      <Text style={styles.createCtaText}>{label}</Text>
    </PressableScale>
  )
}

function StatusLine({ icon, text }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; text: string }) {
  const theme = useSportTheme()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm }}>
      <MaterialCommunityIcons name={icon} size={18} color={theme.trust} />
      <Text style={{ flex: 1, color: theme.muted, fontSize: 12, lineHeight: 17 }}>{text}</Text>
    </View>
  )
}

function viewerStatusLabel(state: PartyViewerState, language: 'th' | 'en', t: (key: keyof typeof partyDictionary, params?: Record<string, string | number>) => string) {
  if (state === 'host') return t('detailsStatusHost')
  if (state === 'active') return t('joinedStatus')
  if (state === 'invited') return t('invitedStatus')
  if (state === 'requested') return t('requestStatus')
  return language === 'th' ? 'เปิดรับสมาชิก' : 'Open'
}
