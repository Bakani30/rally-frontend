import { Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { PressableScale } from '@/components/motion/PressableScale'
import { Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useI18n } from '@/hooks/useI18n'
import {
  formatPartyExpiry,
  formatPartyTeamSize,
  getPartyActivityLabel,
  getPartyStatusLabel,
  getPartyVisibilityLabel,
} from '@/lib/party/partyPresentation'
import { partyDictionary } from '@/lib/i18n/dictionaries/party'
import type { PartySummary } from '@/types/party'
import { createPartyStyles } from './partyStyles'

type PartyCardProps = {
  party: PartySummary
  onPress?: (party: PartySummary) => void
  discoverable?: boolean
  requestBusy?: boolean
  onRequestJoin?: (party: PartySummary) => void
}

export function PartyCard({ party, onPress, discoverable = false, requestBusy = false, onRequestJoin }: PartyCardProps) {
  const theme = useSportTheme()
  const styles = createPartyStyles(theme)
  const { t, language } = useI18n(partyDictionary)
  const icon = party.activity_type === 'basketball' ? 'basketball' : 'badminton'

  return (
    <View style={[styles.panel, { gap: Spacing.md, borderWidth: 1, borderColor: discoverable ? theme.orangeSoft : theme.line }]}>
      <PressableScale
        onPress={onPress ? () => onPress(party) : undefined}
        disabled={!onPress}
        accessibilityRole="button"
        accessibilityLabel={t('openParty', { name: party.name })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
          <View style={{ width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: theme.orange }}>
            <MaterialCommunityIcons name={icon} size={22} color={theme.chalk} />
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
            <Text style={{ color: theme.ink, fontSize: 16, fontWeight: '900' }} numberOfLines={1}>{party.name}</Text>
            <Text style={{ color: theme.muted, fontSize: 12, fontWeight: '700' }} numberOfLines={1}>
              {getPartyActivityLabel(party.activity_type, language)} · {formatPartyTeamSize(party.team_size)}
            </Text>
          </View>
          {onPress ? <MaterialCommunityIcons name="chevron-right" size={22} color={theme.muted} /> : null}
        </View>
      </PressableScale>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm }}>
        <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.sm }}>
          <PartyMeta icon="clock-outline" text={formatPartyExpiry(party.expires_at, new Date(), language)} theme={theme} />
          <PartyMeta icon="account-group-outline" text={`${formatPartyTeamSize(party.team_size)} · ${getPartyStatusLabel(party.status, language)}`} theme={theme} />
          <PartyMeta icon="earth" text={getPartyVisibilityLabel(party.visibility, language)} theme={theme} />
        </View>
        {discoverable && onRequestJoin ? (
          <PressableScale style={{ minHeight: 44, justifyContent: 'center', borderRadius: 10, backgroundColor: theme.orange, paddingHorizontal: Spacing.sm }} onPress={() => onRequestJoin(party)} disabled={requestBusy} accessibilityRole="button" accessibilityLabel={t('requestToJoin', { name: party.name })}>
            <Text style={{ color: theme.chalk, fontSize: 11, fontWeight: '900' }}>{requestBusy ? t('sending') : t('requestToJoinAction')}</Text>
          </PressableScale>
        ) : null}
      </View>
    </View>
  )
}

function PartyMeta({ icon, text, theme }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; text: string; theme: SportPalette }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <MaterialCommunityIcons name={icon} size={14} color={theme.muted} />
      <Text style={{ color: theme.muted, fontSize: 11, fontWeight: '700' }} numberOfLines={1}>{text}</Text>
    </View>
  )
}
