import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { ActivityIcon } from '@/components/ui/ActivityIcon'
import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useI18n } from '@/hooks/useI18n'
import { deriveRunningMode } from '@/lib/match/matchConfig'
import { matchesTabDictionary } from '@/lib/i18n/dictionaries/matchesTab'
import { CURRENCY_UNIT } from '@/lib/wallet/walletFormatting'
import type { MatchLobby, Side } from '@/types/match'

type OpenLobbyCardProps = {
  lobby: MatchLobby
  title?: string
  joiningSide: Side | null
  joinPending: boolean
  onJoin: (side: Side) => void
}

export function OpenLobbyCard({
  lobby,
  title,
  joiningSide,
  joinPending,
  onJoin,
}: OpenLobbyCardProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { t } = useI18n(matchesTabDictionary)
  const runningMode = lobby.running_mode ?? deriveRunningMode(lobby.activity_type, lobby.rule_params, lobby.is_coop)
  const isFfa = runningMode === 'ffa'
  const isCoop = runningMode === 'coop' || lobby.is_coop === true || (lobby.activity_type === 'running' && lobby.stake === 0)
  const hideStake = isCoop && lobby.stake === 0
  const teamLabel = isFfa
    ? t('ffaTeamSize', { count: lobby.team_size_per_side })
    : isCoop
    ? t('coopTeamSizeLabel', { count: lobby.team_size_per_side })
    : lobby.team_size_per_side === 1
      ? '1v1'
      : `${lobby.team_size_per_side}v${lobby.team_size_per_side}`
  const sideAFull = lobby.side_a_count >= lobby.team_size_per_side
  const sideBFull = lobby.side_b_count >= lobby.team_size_per_side
  const unit = CURRENCY_UNIT[lobby.stake_currency]
  const isCredit = lobby.stake_currency === 'credit'
  const creatorName = lobby.creator_display_name || (lobby.creator_handle ? `@${lobby.creator_handle}` : t('unknownHost'))

  return (
    <View style={styles.card}>
      {title ? (
        <View style={styles.titleRow}>
          <MaterialCommunityIcons name="key-variant" size={14} color={theme.economy} />
          <Text style={styles.title}>{title}</Text>
        </View>
      ) : null}

      <View style={styles.headRow}>
        <ActivityIcon activity={lobby.activity_type} size={22} />
        <View style={{ flex: 1 }}>
          <Text style={styles.activity}>
            {lobby.activity_type} · {teamLabel}
          </Text>
          <Text style={styles.meta}>
            <Text style={styles.creator}>{t('hostedByLabel', { name: creatorName })}</Text>
            {!hideStake && (
              <>
                {' · '}
                <Text style={isCredit ? styles.metaCredit : undefined}>
                  {lobby.stake} {unit}
                </Text>
              </>
            )}
            {t('scheduledAtPrefix')}
            {new Date(lobby.deadline).toLocaleString([], {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </Text>
        </View>
      </View>

      <View style={styles.row}>
        <SideBox
          label={isFfa ? t('ffaLabel') : isCoop ? t('soloTeamLabel') : t('teamALabel')}
          count={lobby.side_a_count}
          cap={lobby.team_size_per_side}
          full={sideAFull}
          joining={joinPending && joiningSide === 0}
          accent={theme.orange}
          accentSoft={theme.orangeSoft}
          theme={theme}
          onPress={() => onJoin(0)}
        />
        {!isCoop && !isFfa && (
          <SideBox
            label={t('teamBLabel')}
            count={lobby.side_b_count}
            cap={lobby.team_size_per_side}
            full={sideBFull}
            joining={joinPending && joiningSide === 1}
            accent={theme.blue}
            accentSoft={theme.blueSoft}
            theme={theme}
            onPress={() => onJoin(1)}
          />
        )}
      </View>
    </View>
  )
}

function SideBox({
  label, count, cap, full, joining, accent, accentSoft, theme, onPress,
}: {
  label: string
  count: number
  cap: number
  full: boolean
  joining: boolean
  accent: string
  accentSoft: string
  theme: SportPalette
  onPress: () => void
}) {
  const styles = createStyles(theme)
  const { t } = useI18n(matchesTabDictionary)
  return (
    <View style={[styles.sideBox, { borderColor: theme.lineStrong }]}>
      <Text style={[styles.sideLabel, { color: accent }]}>{label.toUpperCase()}</Text>
      <Text style={styles.sideCount}>
        <Text style={styles.sideCountBig}>{count}</Text>
        <Text style={styles.sideCountSlash}> / {cap}</Text>
      </Text>
      <PressableScale
        style={[
          styles.button,
          { backgroundColor: full ? theme.surfaceStrong : accentSoft, borderColor: full ? theme.line : `${accent}88` },
        ]}
        onPress={onPress}
        disabled={joining || full}
      >
        <Text style={[styles.buttonText, { color: full ? theme.mutedSoft : accent }]}>
          {joining ? t('joiningLabel') : full ? t('fullLabel') : t('joinLabel')}
        </Text>
      </PressableScale>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.arcadePanel,
      borderRadius: Radius.xxl,
      padding: Spacing.lg,
      gap: Spacing.md,
      borderWidth: 1,
      borderColor: theme.line,
      overflow: 'hidden',
      boxShadow: theme.shadowSoft,
    },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    title: { fontSize: 11, fontWeight: '900', color: theme.economy, letterSpacing: 1.5 },
    headRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    activity: { fontSize: 18, fontWeight: '900', color: theme.ink, textTransform: 'capitalize', letterSpacing: 0 },
    meta: { fontSize: 12, color: theme.muted, marginTop: 2, letterSpacing: 0 },
    creator: { color: theme.inkSoft, fontWeight: '900' },
    metaCredit: { color: theme.risk, fontWeight: '900' },
    row: { flexDirection: 'row', gap: Spacing.md },
    sideBox: {
      flex: 1,
      borderWidth: 1,
      borderRadius: Radius.xl,
      padding: Spacing.md,
      gap: Spacing.sm,
      backgroundColor: theme.arcadePanelAlt,
    },
    sideLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
    sideCount: { marginVertical: 2 },
    sideCountBig: { fontSize: 22, fontWeight: '900', color: theme.ink, fontVariant: ['tabular-nums'] },
    sideCountSlash: { fontSize: 13, color: theme.muted },
    button: {
      borderRadius: Radius.pill,
      paddingVertical: 10,
      alignItems: 'center',
      borderWidth: 1,
    },
    buttonText: { fontSize: 12, fontWeight: '900', letterSpacing: 0.8 },
  })
}
