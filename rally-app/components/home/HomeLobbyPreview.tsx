import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'

import { HomeShadowFrame } from '@/components/home/HomeShadowFrame'
import { PikaHomeIcon } from '@/components/home/PikaHomeIcon'
import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useI18n } from '@/hooks/useI18n'
import { homeDictionary } from '@/lib/i18n/dictionaries/home'
import type { MatchLobby } from '@/types/match'

type HomeLobbyPreviewProps = {
  lobbies: MatchLobby[]
  isPending: boolean
  error: unknown
  onOpenLobbies: () => void
}

export function HomeLobbyPreview({
  lobbies,
  isPending,
  error,
  onOpenLobbies,
}: HomeLobbyPreviewProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { t } = useI18n(homeDictionary)
  const preview = lobbies.slice(0, 2)

  return (
    <HomeShadowFrame radius={22} offset={{ width: 4, height: 5 }} shadowStyle={styles.shadowSoft}>
      <View style={styles.card}>
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>{t('openLobbiesKicker')}</Text>
            <Text style={styles.title}>{t('lobbyTitle')}</Text>
          </View>
          <PressableScale
            style={styles.viewAllButton}
            onPress={onOpenLobbies}
            accessibilityRole="button"
            accessibilityLabel={t('viewAllLobbies')}
          >
            <Text style={styles.viewAllText}>{t('viewAll')}</Text>
            <Text style={styles.viewAllGlyph}>›</Text>
          </PressableScale>
        </View>

        {isPending ? (
          <View style={styles.stateRow}>
            <ActivityIndicator color={theme.trust} />
            <Text style={styles.stateText}>{t('findingLobbies')}</Text>
          </View>
        ) : error ? (
          <View style={styles.stateRow}>
            <PikaHomeIcon name="manual-proof" size={22} />
            <Text style={styles.stateText}>{t('lobbiesLoadError')}</Text>
          </View>
        ) : preview.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.list}
          >
            {preview.map((lobby) => (
              <LobbyPreviewRow key={lobby.id} lobby={lobby} />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyGrid}>
            <View style={styles.empty}>
              <View style={styles.emptyIconPlate}>
                <PikaHomeIcon name="home-arena-gate" size={24} />
              </View>
              <View style={styles.emptyCopy}>
                <Text style={styles.emptyTitle}>{t('noLobbiesOpen')}</Text>
                <Text style={styles.emptyText}>{t('checkLobbyLater')}</Text>
              </View>
            </View>
            <View style={styles.emptyGhost}>
              <PikaHomeIcon name="home-arena-gate" size={24} />
              <Text style={styles.emptyGhostText}>{t('arenaSlotsWaiting')}</Text>
            </View>
          </View>
        )}
      </View>
    </HomeShadowFrame>
  )
}

function LobbyPreviewRow({ lobby }: { lobby: MatchLobby }) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { t } = useI18n(homeDictionary)
  const creatorName = lobby.creator_display_name || (lobby.creator_handle ? `@${lobby.creator_handle}` : t('rallyPlayerFallback'))
  const capacity = lobby.is_coop
    ? `${lobby.side_a_count}/${lobby.team_size_per_side}`
    : `${lobby.side_a_count + lobby.side_b_count}/${lobby.team_size_per_side * 2}`

  return (
    <View style={styles.row}>
      <View style={styles.activityIcon}>
        <PikaHomeIcon name="home-arena-gate" size={24} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {t('lobbySuffix', { activity: lobby.activity_type })}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {t('hostedBy', { name: creatorName })}
        </Text>
      </View>
      <View style={styles.capacityPill}>
        <Text style={styles.capacityText}>{capacity}</Text>
      </View>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    card: {
      borderRadius: 22,
      backgroundColor: theme.arcadePanel,
      padding: 12,
      gap: 10,
    },
    shadowSoft: { opacity: 0.72 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.sm,
    },
    kicker: {
      color: theme.trust,
      fontSize: 8,
      fontWeight: '900',
      letterSpacing: 0,
    },
    title: {
      color: theme.ink,
      fontSize: 19,
      lineHeight: 23,
      fontWeight: '900',
      letterSpacing: 0,
    },
    viewAllButton: {
      minHeight: 34,
      borderRadius: Radius.lg,
      borderWidth: 1.5,
      borderColor: theme.orange,
      backgroundColor: theme.orangeSoft,
      paddingLeft: 11,
      paddingRight: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    viewAllText: {
      color: theme.orange,
      fontSize: 11,
      fontWeight: '900',
    },
    viewAllGlyph: {
      color: theme.orange,
      fontSize: 20,
      lineHeight: 20,
      fontWeight: '900',
      marginTop: -2,
    },
    list: { gap: 10, paddingRight: 2 },
    row: {
      width: 172,
      minHeight: 96,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.arcadePanel,
      padding: 12,
      gap: 8,
    },
    activityIcon: {
      width: 36,
      height: 36,
      borderRadius: Radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.orangeSoft,
    },
    rowCopy: { minWidth: 0, gap: 2 },
    rowTitle: {
      color: theme.ink,
      fontSize: 13,
      fontWeight: '900',
      textTransform: 'capitalize',
    },
    rowMeta: {
      color: theme.muted,
      fontSize: 11,
      fontWeight: '700',
      marginTop: 2,
    },
    capacityPill: {
      position: 'absolute',
      right: 10,
      bottom: 10,
      minWidth: 42,
      minHeight: 28,
      borderRadius: Radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.greenSoft,
      borderWidth: 1,
      borderColor: theme.trust,
      paddingHorizontal: 8,
    },
    capacityText: {
      color: theme.trust,
      fontSize: 11,
      fontWeight: '900',
      fontVariant: ['tabular-nums'],
    },
    stateRow: {
      minHeight: 58,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.arcadePanel,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    stateText: {
      flex: 1,
      color: theme.muted,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: '800',
    },
    empty: {
      flex: 1,
      minWidth: 0,
      minHeight: 58,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.arcadePanel,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    emptyIconPlate: {
      width: 42,
      height: 42,
      borderRadius: Radius.lg,
      borderWidth: 2,
      borderColor: theme.orange,
      backgroundColor: theme.orange,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    emptyGrid: {
      flexDirection: 'row',
      gap: 10,
    },
    emptyGhost: {
      flex: 1,
      minWidth: 0,
      minHeight: 58,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface,
      padding: 12,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    emptyGhostText: {
      color: theme.muted,
      fontSize: 10,
      lineHeight: 13,
      fontWeight: '800',
      textAlign: 'center',
    },
    emptyCopy: { flex: 1, minWidth: 0, gap: 2 },
    emptyTitle: { color: theme.ink, fontSize: 13, fontWeight: '900' },
    emptyText: { color: theme.muted, fontSize: 11, lineHeight: 16, fontWeight: '700' },
  })
}
