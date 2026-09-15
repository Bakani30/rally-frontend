import { useMemo } from 'react'
import { Image } from 'expo-image'
import { StyleSheet, Text, View } from 'react-native'

import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import type { BasketballLobbyCourtLayout } from '@/lib/match/basketballLobbyCourt'
import type { Side } from '@/types/match'

type BasketballFinalCourtProps = {
  layout: BasketballLobbyCourtLayout
  mySide: Side | null
}

type Token = {
  key: string
  initials: string
  role: string
  x: number
  y: number
  mine: boolean
  side: Side
}

const ROLE_LABEL: Record<string, string> = {
  duel: 'GUARD',
  pg: 'GUARD',
  sg: 'WING',
  sf: 'WING',
  left: 'WING',
  right: 'WING',
  pf: 'BIG',
  c: 'BIG',
}

// Keep the final lineup visually continuous with lobby/live play by using the
// exact same full-court source image and horizontal crop.
const BASKETBALL_COURT = require('../../../assets/images/courts/basketball-court-5v5.png')
const BASKETBALL_COURT_ZOOM_X = 1.08

export function BasketballFinalCourt({ layout, mySide }: BasketballFinalCourtProps) {
  const theme = useSportTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const tokens = useMemo(() => buildTokens(layout, mySide), [layout, mySide])
  const isSpectator = mySide === null
  const firstSide = isSpectator ? 0 : mySide
  const secondSide = firstSide === 0 ? 1 : 0
  const myInitials = tokens.filter((token) => token.side === firstSide).map((token) => token.initials).join(' ')
  const opponentInitials = tokens.filter((token) => token.side === secondSide).map((token) => token.initials).join(' ')
  const expectedPlayers = layout.teamSize * 2
  const lineupLabel = tokens.length === expectedPlayers
    ? `ทั้งสองทีม · ${layout.teamSize}V${layout.teamSize}`
    : `ผู้เล่น ${tokens.length}/${expectedPlayers} · ${layout.teamSize}V${layout.teamSize}`

  return (
    <View style={styles.panel}>
      <View style={styles.headingRow}>
        <Text style={styles.heading}>ตำแหน่งในสนาม</Text>
        <Text style={styles.format}>{lineupLabel}</Text>
      </View>

      <View
        style={styles.courtFrame}
        accessibilityRole="image"
        accessibilityLabel={`สนามบาสแบบเดียวกับตอนแข่ง แสดงผู้เล่นทั้งสองทีม ${tokens.length} คน`}
      >
        <Image
          source={BASKETBALL_COURT}
          style={[StyleSheet.absoluteFill, styles.courtImage]}
          contentFit="cover"
          contentPosition="center"
        />
        <View pointerEvents="none" style={styles.courtScrim} />

        {tokens.map((token) => (
          <View
            key={token.key}
            pointerEvents="none"
            style={[styles.tokenWrap, { left: `${token.x}%`, top: `${token.y}%` }]}
          >
            <View style={[
              styles.token,
              { borderColor: isSpectator ? (token.side === 0 ? theme.orange : theme.blue) : (token.mine ? theme.orange : theme.blue) },
            ]}>
              <Text style={styles.tokenInitials}>{token.initials}</Text>
            </View>
            <Text style={styles.tokenRole}>{token.role}</Text>
          </View>
        ))}
      </View>

      <View style={styles.legend}>
        <LegendItem color={theme.orange} label={`${isSpectator ? 'ทีม A' : 'ทีมคุณ'} · ${myInitials || '—'}`} styles={styles} />
        <LegendItem color={theme.blue} label={`${isSpectator ? 'ทีม B' : 'คู่แข่ง'} · ${opponentInitials || '—'}`} styles={styles} />
      </View>
    </View>
  )
}

function buildTokens(layout: BasketballLobbyCourtLayout, mySide: Side | null): Token[] {
  return layout.spots.flatMap((spot) => {
    if (!spot.participant) return []
    return [{
      key: `${spot.side}:${spot.positionKey}:${spot.participant.userId}`,
      initials: spot.participant.initials.slice(0, 2).toUpperCase(),
      role: ROLE_LABEL[spot.positionKey] ?? spot.shortLabel.toUpperCase(),
      x: spot.x,
      y: spot.y,
      mine: mySide !== null && spot.side === mySide,
      side: spot.side,
    }]
  })
}

function LegendItem({
  color,
  label,
  styles,
}: {
  color: string
  label: string
  styles: ReturnType<typeof createStyles>
}) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendToken, { borderColor: color }]} />
      <Text style={styles.legendLabel} numberOfLines={1}>{label}</Text>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    panel: {
      borderRadius: Radius.xxl,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface,
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.md,
      paddingBottom: Spacing.sm,
      gap: Spacing.sm,
      boxShadow: theme.shadowSoft,
    },
    headingRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: Spacing.sm },
    heading: { color: theme.ink, fontSize: 14, fontWeight: '900' },
    format: { color: theme.muted, fontSize: 9, fontWeight: '700' },
    courtFrame: {
      height: 300,
      overflow: 'hidden',
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: theme.lineStrong,
      backgroundColor: '#171717',
    },
    courtImage: { transform: [{ scaleX: BASKETBALL_COURT_ZOOM_X }] },
    courtScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.12)' },
    tokenWrap: {
      position: 'absolute',
      width: 62,
      alignItems: 'center',
      transform: [{ translateX: -31 }, { translateY: -24 }],
    },
    token: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 3,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(18,18,18,0.94)',
      boxShadow: '0 4px 10px rgba(0,0,0,0.36)',
    },
    tokenInitials: { color: '#ffffff', fontSize: 11, fontWeight: '900' },
    tokenRole: {
      marginTop: 3,
      color: '#ffffff',
      fontSize: 8,
      fontWeight: '900',
      textShadowColor: 'rgba(0,0,0,0.9)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    legend: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.line,
      paddingTop: Spacing.sm,
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
    legendToken: { width: 12, height: 12, borderRadius: 6, borderWidth: 3, backgroundColor: '#171717' },
    legendLabel: { color: theme.inkSoft, fontSize: 9, fontWeight: '800', maxWidth: 145 },
  })
}
