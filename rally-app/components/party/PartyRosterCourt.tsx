import { Image } from 'expo-image'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { PressableScale } from '@/components/motion/PressableScale'
import { SportCourtSurface } from '@/components/court/SportCourtSurface'
import { Radius, Spacing } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { buildPartyCourtLayout, type PartyCourtSlot } from '@/lib/party/partyCourt'
import { partyDictionary } from '@/lib/i18n/dictionaries/party'
import { useI18n } from '@/hooks/useI18n'
import type { PartyActivity, PartyProfile, PartyTeamSize } from '@/types/party'

type PartyRosterCourtProps = {
  activityType: PartyActivity
  teamSize: PartyTeamSize
  activeRoster: PartyProfile[]
  hostUserId: string | null
  canManage: boolean
  onEmptySlot: (slot: PartyCourtSlot) => void
  onMemberPress: (userId: string) => void
  onRemoveMember: (profile: PartyProfile) => void
}

export function PartyRosterCourt({
  activityType,
  teamSize,
  activeRoster,
  hostUserId,
  canManage,
  onEmptySlot,
  onMemberPress,
  onRemoveMember,
}: PartyRosterCourtProps) {
  const theme = useSportTheme()
  const { t } = useI18n(partyDictionary)
  const layout = buildPartyCourtLayout(activityType, teamSize, activeRoster)

  return (
    <View style={styles.root} accessibilityLabel={`${t('roster')} ${t('activeMembers', { count: activeRoster.length, size: teamSize })}`}>
      <SportCourtSurface
        activityType={activityType}
        withShading={activityType === 'badminton'}
      />
      <View style={styles.courtOverlay} pointerEvents="box-none">
        {layout.slots.map((slot) => (
          <CourtSlot
            key={slot.positionKey}
            slot={slot}
            canManage={canManage}
            hostUserId={hostUserId}
            onEmptySlot={onEmptySlot}
            onMemberPress={onMemberPress}
            onRemoveMember={onRemoveMember}
          />
        ))}
      </View>
      {layout.bench.length > 0 ? (
        <View style={[styles.bench, { backgroundColor: 'rgba(12, 12, 15, 0.78)' }]}>
          <Text style={[styles.benchLabel, { color: theme.chalk }]}>{t('bench')}</Text>
          <View style={styles.benchMembers}>
            {layout.bench.map((profile) => (
              <View key={profile.userId} style={styles.benchRow}>
                <PressableScale
                  style={styles.benchMember}
                  onPress={() => onMemberPress(profile.userId)}
                  accessibilityRole="button"
                  accessibilityLabel={profile.displayName ?? profile.handle ?? profile.userId}
                >
                  <Avatar profile={profile} size={30} />
                  <Text style={[styles.benchName, { color: theme.chalk }]} numberOfLines={1}>
                    {profile.displayName ?? profile.handle ?? t('you')}
                  </Text>
                </PressableScale>
                {canManage && profile.userId !== hostUserId ? (
                  <Pressable
                    style={styles.benchRemove}
                    onPress={() => onRemoveMember(profile)}
                    accessibilityRole="button"
                    accessibilityLabel={t('removeMember')}
                  >
                    <MaterialCommunityIcons name="close-circle" size={24} color={theme.risk} />
                  </Pressable>
                ) : null}
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  )
}

function CourtSlot({
  slot,
  canManage,
  hostUserId,
  onEmptySlot,
  onMemberPress,
  onRemoveMember,
}: {
  slot: PartyCourtSlot
  canManage: boolean
  hostUserId: string | null
  onEmptySlot: (slot: PartyCourtSlot) => void
  onMemberPress: (userId: string) => void
  onRemoveMember: (profile: PartyProfile) => void
}) {
  const theme = useSportTheme()
  const { t } = useI18n(partyDictionary)
  const profile = slot.member
  const positionStyle = { left: `${slot.x}%`, top: `${slot.y}%` } as const

  if (!profile) {
    return (
      <Pressable
        style={[styles.slot, styles.emptySlot, positionStyle, { borderColor: theme.chalk }]} 
        onPress={() => canManage && onEmptySlot(slot)}
        disabled={!canManage}
        accessibilityRole="button"
        accessibilityLabel={t('emptySlot')}
      >
        <MaterialCommunityIcons name="plus" size={22} color={theme.chalk} />
        <Text style={[styles.slotText, { color: theme.chalk }]}>{t('emptySlot')}</Text>
      </Pressable>
    )
  }

  return (
    <View style={[styles.memberSlot, positionStyle]}>
      <PressableScale
        style={[styles.slot, { backgroundColor: theme.bgElevated, borderColor: theme.orange }]}
        onPress={() => onMemberPress(profile.userId)}
        accessibilityRole="button"
        accessibilityLabel={profile.displayName ?? profile.handle ?? profile.userId}
      >
        <Avatar profile={profile} size={42} />
        <Text style={[styles.slotText, { color: theme.ink }]} numberOfLines={1}>
          {profile.displayName ?? profile.handle ?? t('you')}
        </Text>
        {profile.userId === hostUserId ? (
          <Text style={[styles.hostLabel, { color: theme.orange }]}>{t('host')}</Text>
        ) : null}
      </PressableScale>
      {canManage && profile.userId !== hostUserId ? (
        <Pressable
          style={styles.removeButton}
          onPress={() => onRemoveMember(profile)}
          accessibilityRole="button"
          accessibilityLabel={t('removeMember')}
        >
          <View style={[styles.removeVisual, { backgroundColor: theme.risk }]}>
            <MaterialCommunityIcons name="close" size={13} color={theme.chalk} />
          </View>
        </Pressable>
      ) : null}
    </View>
  )
}

function Avatar({ profile, size }: { profile: PartyProfile; size: number }) {
  const theme = useSportTheme()
  const initials = (profile.displayName ?? profile.handle ?? '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?'

  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: theme.orangeSoft }]}>
      {profile.avatarUrl ? (
        <Image source={{ uri: profile.avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <Text style={[styles.avatarText, { color: theme.orange, fontSize: Math.max(10, size * 0.34) }]}>{initials}</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    minHeight: 360,
    overflow: 'hidden',
    borderRadius: Radius.xl,
    backgroundColor: '#111116',
  },
  courtOverlay: { flex: 1, minHeight: 360 },
  slot: {
    minWidth: 78,
    minHeight: 78,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: Radius.lg,
    borderWidth: 2,
    paddingHorizontal: 6,
    paddingVertical: 5,
  },
  memberSlot: {
    position: 'absolute',
    alignItems: 'center',
    transform: [{ translateX: -39 }, { translateY: -39 }],
  },
  emptySlot: {
    position: 'absolute',
    transform: [{ translateX: -39 }, { translateY: -39 }],
    backgroundColor: 'rgba(12, 12, 15, 0.58)',
    borderStyle: 'dashed',
  },
  slotText: { maxWidth: 70, fontSize: 10, fontWeight: '900' },
  hostLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 0.6, textTransform: 'uppercase' },
  removeButton: {
    position: 'absolute',
    top: -14,
    right: -14,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeVisual: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  avatar: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarText: { fontWeight: '900' },
  bench: {
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  benchLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' },
  benchMembers: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  benchRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', maxWidth: '100%' },
  benchMember: { minHeight: 44, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  benchRemove: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  benchName: { flexShrink: 1, fontSize: 11, fontWeight: '800' },
})
