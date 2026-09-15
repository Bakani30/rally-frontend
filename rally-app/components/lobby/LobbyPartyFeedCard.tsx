import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useI18n } from '@/hooks/useI18n'
import { partyDictionary } from '@/lib/i18n/dictionaries/party'
import { formatPartyTeamSize, getPartyActivityLabel } from '@/lib/party/partyPresentation'
import type { PartySummary } from '@/types/party'

type LobbyPartyFeedCardProps = {
  party: PartySummary
  requestPending?: boolean
  requestSent?: boolean
  onPress: () => void
  onRequestJoin: () => void
}

export function LobbyPartyFeedCard({ party, requestPending = false, requestSent = false, onPress, onRequestJoin }: LobbyPartyFeedCardProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { t, language } = useI18n(partyDictionary)
  return (
    <View style={styles.root}>
      <Pressable style={styles.main} onPress={onPress} accessibilityRole="button" accessibilityLabel={t('openParty', { name: party.name })}>
        <View style={styles.icon}><MaterialCommunityIcons name={party.activity_type === 'basketball' ? 'basketball' : 'badminton'} size={21} color={theme.chalk} /></View>
        <View style={styles.copy}>
          <Text style={styles.title} numberOfLines={1}>{party.name}</Text>
          <Text style={styles.meta} numberOfLines={1}>{getPartyActivityLabel(party.activity_type, language)} · {formatPartyTeamSize(party.team_size)} · {t('memberCount', { count: party.activeMemberCount })}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={theme.muted} />
      </Pressable>
      <Pressable style={styles.request} onPress={onRequestJoin} disabled={requestPending || requestSent} accessibilityRole="button" accessibilityLabel={requestSent ? t('requestPending') : t('requestToJoin', { name: party.name })}>
        {requestPending ? <ActivityIndicator size="small" color={theme.orange} /> : <MaterialCommunityIcons name={requestSent ? 'clock-check-outline' : 'account-plus-outline'} size={20} color={theme.orange} />}
      </Pressable>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    root: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderRadius: Radius.xl, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.bgElevated, padding: Spacing.sm },
    main: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 3 },
    icon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.lg, backgroundColor: theme.orange },
    copy: { flex: 1, minWidth: 0, gap: 3 },
    title: { color: theme.ink, fontSize: 14, fontWeight: '900' },
    meta: { color: theme.muted, fontSize: 11, fontWeight: '700' },
    request: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.lg, backgroundColor: theme.orangeSoft },
  })
}
