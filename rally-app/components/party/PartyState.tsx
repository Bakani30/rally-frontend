import { ActivityIndicator, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { PressableScale } from '@/components/motion/PressableScale'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useI18n } from '@/hooks/useI18n'
import { partyDictionary } from '@/lib/i18n/dictionaries/party'
import { createPartyStyles } from './partyStyles'

type PartyStateProps = {
  kind: 'loading' | 'empty' | 'error'
  text: string
  onRetry?: () => void
}

export function PartyState({ kind, text, onRetry }: PartyStateProps) {
  const theme = useSportTheme()
  const styles = createPartyStyles(theme)
  const { t } = useI18n(partyDictionary)
  const icon = kind === 'loading' ? null : kind === 'error' ? 'alert-circle-outline' : 'account-group-outline'

  return (
    <View style={[styles.panel, { alignItems: 'center', paddingVertical: 28 }]}>
      {kind === 'loading' ? <ActivityIndicator color={theme.orange} /> : (
        <MaterialCommunityIcons name={icon!} size={28} color={kind === 'error' ? theme.risk : theme.mutedSoft} />
      )}
      <Text style={{ color: kind === 'error' ? theme.risk : theme.muted, fontSize: 13, textAlign: 'center' }}>{text}</Text>
      {kind === 'error' && onRetry ? (
        <PressableScale
          onPress={onRetry}
          accessibilityRole="button"
          style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 }}
        >
          <Text style={{ color: theme.orange, fontSize: 13, fontWeight: '800' }}>{t('tryAgain')}</Text>
        </PressableScale>
      ) : null}
    </View>
  )
}
