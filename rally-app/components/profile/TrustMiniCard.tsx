import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Radius } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useDisputeHistory } from '@/hooks/useDisputeHistory'

type Props = {
  userId: string
  compact?: boolean
}

export function TrustMiniCard({ userId, compact = false }: Props) {
  const theme = useSportTheme()
  const { data, isPending } = useDisputeHistory(userId)
  if (isPending || !data) return null

  const totalKnown = data.total_settled + data.total_disputed
  if (totalKnown === 0 && data.disputes_filed === 0 && data.disputes_against === 0) return null

  const disputeRate =
    totalKnown > 0 ? Math.round((data.total_disputed / totalKnown) * 100) : 0
  const tone = disputeRate >= 30 ? 'risk' : disputeRate >= 10 ? 'warn' : 'ok'
  const accent = tone === 'risk' ? theme.red : tone === 'warn' ? theme.amber : theme.green
  const icon =
    tone === 'risk' ? 'shield-alert' : tone === 'warn' ? 'shield-half-full' : 'shield-check'

  return (
    <View
      style={[
        compact ? styles.compact : styles.card,
        { borderColor: `${accent}55`, backgroundColor: `${accent}11` },
      ]}
    >
      <MaterialCommunityIcons name={icon} size={compact ? 11 : 13} color={accent} />
      <Text style={[styles.text, { color: accent }]}>
        {data.total_settled} settled
        {data.total_disputed > 0 ? ` · ${data.total_disputed} disputed` : ''}
        {data.disputes_against > 0 ? ` · ${data.disputes_against} reported` : ''}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  compact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
})
