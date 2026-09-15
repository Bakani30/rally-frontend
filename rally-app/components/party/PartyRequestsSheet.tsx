import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Spacing } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useI18n } from '@/hooks/useI18n'
import { partyDictionary } from '@/lib/i18n/dictionaries/party'
import type { PartyPendingMemberView } from '@/types/party'

type PartyRequestsSheetProps = {
  visible: boolean
  pendingMembers: PartyPendingMemberView[]
  busy: boolean
  onClose: () => void
  onApprove: (userId: string) => void
  onOpenInvitePicker: () => void
}

export function PartyRequestsSheet({
  visible,
  pendingMembers,
  busy,
  onClose,
  onApprove,
  onOpenInvitePicker,
}: PartyRequestsSheetProps) {
  const theme = useSportTheme()
  const { t } = useI18n(partyDictionary)

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: theme.bg }]}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: theme.ink }]}>{t('requestsAndInvites')}</Text>
            <Text style={[styles.subtitle, { color: theme.muted }]}>{t('pendingRequests')}</Text>
          </View>
          <PressableScale style={[styles.close, { backgroundColor: theme.surface }]} onPress={onClose} accessibilityLabel={t('close')}>
            <MaterialCommunityIcons name="close" size={20} color={theme.ink} />
          </PressableScale>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          {pendingMembers.length === 0 ? (
            <Text style={[styles.empty, { color: theme.muted }]}>{t('noPendingRequests')}</Text>
          ) : pendingMembers.map((pending) => (
            <View key={pending.membershipId} style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.line }]}>
              <View style={[styles.avatar, { backgroundColor: theme.orangeSoft }]}>
                <Text style={{ color: theme.orange, fontWeight: '900' }}>{initials(pending.profile)}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.name, { color: theme.ink }]} numberOfLines={1}>{pending.profile.displayName ?? pending.profile.handle ?? pending.profile.userId}</Text>
                <Text style={[styles.status, { color: theme.muted }]}>{pending.status === 'requested' ? t('pendingRequests') : t('invitedMembers')}</Text>
              </View>
              {pending.status === 'requested' ? (
                <Pressable
                  style={[styles.approve, { backgroundColor: theme.orange }]}
                  onPress={() => onApprove(pending.profile.userId)}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel={t('approveRequest')}
                >
                  <Text style={{ color: theme.chalk, fontSize: 12, fontWeight: '900' }}>{t('approve')}</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
          <PressableScale style={[styles.invite, { borderColor: theme.orange, backgroundColor: theme.orangeSoft }]} onPress={onOpenInvitePicker} accessibilityRole="button">
            <MaterialCommunityIcons name="account-plus-outline" size={18} color={theme.orange} />
            <Text style={{ color: theme.orange, fontSize: 13, fontWeight: '900' }}>{t('openInvitePicker')}</Text>
          </PressableScale>
        </ScrollView>
      </View>
    </Modal>
  )
}

function initials(profile: PartyPendingMemberView['profile']) {
  return (profile.displayName ?? profile.handle ?? '?').trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || '?'
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg },
  title: { fontSize: 19, fontWeight: '900' },
  subtitle: { marginTop: 3, fontSize: 12, fontWeight: '700' },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  content: { gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingBottom: 48 },
  empty: { paddingVertical: Spacing.lg, textAlign: 'center', fontSize: 13 },
  row: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.sm },
  avatar: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  name: { fontSize: 13, fontWeight: '900' },
  status: { marginTop: 3, fontSize: 11, fontWeight: '700' },
  approve: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.md, paddingHorizontal: Spacing.sm },
  invite: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderWidth: 1, borderRadius: Radius.lg },
})
