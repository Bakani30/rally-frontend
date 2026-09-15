import { MaterialCommunityIcons } from '@expo/vector-icons'
import { StyleSheet, Text, View } from 'react-native'

import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useI18n } from '@/hooks/useI18n'
import { partyDictionary } from '@/lib/i18n/dictionaries/party'
import { formatSpendablePoints, getLobbyHeroPartyState } from '@/lib/lobbyHero'
import { formatPartyTeamSize } from '@/lib/party/partyPresentation'
import type { PartySummary } from '@/types/party'

type LobbyHeroCardProps = {
  displayName: string | null
  spendablePoints: number | null
  loading?: boolean
  party: PartySummary | null
  partyLoading?: boolean
  partyError?: boolean
  onCreateParty: () => void
  onOpenParty: (partyId: string) => void
  onRetryParty: () => void
}

function initials(name: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2)
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || '?'
}

export function LobbyHeroCard({
  displayName,
  spendablePoints,
  loading = false,
  party,
  partyLoading = false,
  partyError = false,
  onCreateParty,
  onOpenParty,
  onRetryParty,
}: LobbyHeroCardProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { t } = useI18n(partyDictionary)
  const partyState = getLobbyHeroPartyState(party, partyLoading, partyError)
  const content = (
    <>
      <View style={styles.identityRow}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{initials(displayName)}</Text></View>
        <View style={styles.identityCopy}>
          <Text style={styles.eyebrow}>YOUR ARENA</Text>
          <Text style={styles.name} numberOfLines={1}>{displayName ?? '—'}</Text>
        </View>
        <View style={styles.pointsBlock}>
          <Text style={styles.statLabel}>{t('points')}</Text>
          <Text style={styles.statValue}>{formatSpendablePoints(spendablePoints, loading)}</Text>
        </View>
      </View>

      {partyState.kind === 'active' ? (
        <View style={styles.partyRow}>
          <View style={styles.partyIcon}>
            <MaterialCommunityIcons name="account-group" size={20} color={theme.chalk} />
          </View>
          <View style={styles.partyCopy}>
            <Text style={styles.partyEyebrow}>{t('partyActive')}</Text>
            <Text style={styles.partyName} numberOfLines={1}>{partyState.party.name}</Text>
            <Text style={styles.partyMeta} numberOfLines={1}>
              {t('memberCount', { count: partyState.party.activeMemberCount })} · {formatPartyTeamSize(partyState.party.team_size)}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={theme.ink} />
        </View>
      ) : partyState.kind === 'loading' ? (
        <View style={styles.statusRow}>
          <MaterialCommunityIcons name="loading" size={18} color={theme.muted} />
          <Text style={styles.statusText}>{t('partyStatusLoading')}</Text>
        </View>
      ) : partyState.kind === 'error' ? (
        <View style={styles.statusRow}>
          <MaterialCommunityIcons name="alert-circle-outline" size={18} color={theme.risk} />
          <Text style={styles.statusText}>{t('partyStatusError')}</Text>
          <PressableScale style={styles.smallAction} onPress={onRetryParty} accessibilityRole="button" accessibilityLabel={t('retryPartyStatus')}>
            <Text style={styles.smallActionText}>{t('retryPartyStatus')}</Text>
          </PressableScale>
        </View>
      ) : (
        <PressableScale style={styles.createAction} onPress={onCreateParty} accessibilityRole="button" accessibilityLabel={t('createParty')}>
          <MaterialCommunityIcons name="account-multiple-plus-outline" size={18} color={theme.arcadeCtaText} />
          <Text style={styles.createActionText}>{t('createParty')}</Text>
        </PressableScale>
      )}
    </>
  )

  if (partyState.kind === 'active') {
    return (
      <PressableScale
        style={styles.card}
        onPress={() => onOpenParty(partyState.party.id)}
        accessibilityRole="button"
        accessibilityLabel={`${partyState.party.name}, ${t('memberCount', { count: partyState.party.activeMemberCount })}, ${formatPartyTeamSize(partyState.party.team_size)}`}
      >
        {content}
      </PressableScale>
    )
  }

  return <View style={styles.card}>{content}</View>
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    card: { backgroundColor: theme.arcadePanel, borderRadius: Radius.xl, borderWidth: 1, borderColor: theme.orangeSoft, padding: Spacing.lg, gap: Spacing.md },
    identityRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: theme.orangeSoft, borderWidth: 2, borderColor: theme.orange, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: theme.orange, fontSize: 15, fontWeight: '900', fontStyle: 'italic' },
    identityCopy: { flex: 1, minWidth: 0 },
    eyebrow: { color: theme.trust, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
    name: { color: theme.ink, fontSize: 17, fontWeight: '900', marginTop: 1 },
    pointsBlock: { alignItems: 'flex-end', gap: 1 },
    statLabel: { color: theme.muted, fontSize: 9, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' },
    statValue: { color: theme.ink, fontSize: 23, fontWeight: '900', fontStyle: 'italic', fontVariant: ['tabular-nums'] },
    partyRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderRadius: Radius.lg, backgroundColor: theme.orangeSoft, paddingHorizontal: Spacing.sm, paddingVertical: 8 },
    partyIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.lg, backgroundColor: theme.orange },
    partyCopy: { flex: 1, minWidth: 0 },
    partyEyebrow: { color: theme.orange, fontSize: 9, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' },
    partyName: { color: theme.ink, fontSize: 15, fontWeight: '900' },
    partyMeta: { color: theme.muted, fontSize: 11, fontWeight: '800' },
    statusRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderRadius: Radius.lg, backgroundColor: theme.surface, paddingHorizontal: Spacing.sm },
    statusText: { flex: 1, color: theme.muted, fontSize: 12, fontWeight: '800' },
    smallAction: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.sm },
    smallActionText: { color: theme.orange, fontSize: 12, fontWeight: '900' },
    createAction: { minHeight: 44, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: Radius.lg, backgroundColor: theme.orange, paddingHorizontal: Spacing.md },
    createActionText: { color: theme.arcadeCtaText, fontSize: 13, fontWeight: '900' },
  })
}
