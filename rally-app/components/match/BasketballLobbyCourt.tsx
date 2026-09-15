import { memo, useMemo, useState } from 'react'
import { Image } from 'expo-image'
import { StyleSheet, Text, useWindowDimensions, View, type ViewStyle } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { PressableScale } from '@/components/motion/PressableScale'
import { SportCourtSurface } from '@/components/court/SportCourtSurface'
import { RallyText } from '@/components/ui/RallyText'
import { ProfileFrame } from '@/components/profile/ProfileFrame'
import { courtAspect } from '@/lib/match/courtGeometry'
import { getSportPalette, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useI18n } from '@/hooks/useI18n'
import { matchesTabDictionary } from '@/lib/i18n/dictionaries/matchesTab'
import { getSportReelItem, type SportReelItem } from '@/lib/match/sportReel'
import {
  formatLobbyPositionJersey,
  getLobbyEmptySlotLabel,
} from '@/lib/match/basketballLobbyCourt'
import type {
  BasketballLobbyCourtLayout,
  BasketballLobbyCourtParticipant,
  BasketballLobbyCourtSpot,
  BasketballLobbyPositionKey,
} from '@/lib/match/basketballLobbyCourt'
import type { Side } from '@/types/match'
import { LOBBY_ON_ORANGE, LOBBY_ORANGE, teamColor } from '@/components/match/lobbyStageStyles'

// Lobby: stake/pos affordances for slot selection. Live/final: score is what
// matters, so markers swap to a compact nameplate (see PlayerMarker).
export type BasketballCourtPhase = 'lobby' | 'live' | 'final'

type BasketballLobbyCourtProps = {
  layout: BasketballLobbyCourtLayout
  selecting?: boolean
  phase?: BasketballCourtPhase
  onSelectPosition?: (input: { side: Side; positionKey: BasketballLobbyPositionKey }) => void
  onInviteToSlot?: (input: { side: Side; positionKey: BasketballLobbyPositionKey }) => void
  onPressParticipant?: (participant: BasketballLobbyCourtParticipant) => void
  canPressParticipant?: (participant: BasketballLobbyCourtParticipant) => boolean
}

// Neutral dark scrim values that sit OVER the court image (not brand colors).
const MARKER_FILL = 'rgba(18,18,18,0.92)'
const MARKER_SHADOW = 'rgba(0,0,0,0.5)'

function getSideStyle(side: 0 | 1, sport: SportReelItem) {
  return {
    label: side === 0 ? 'A' : 'B',
    color: sport.cardText,
    markerFill: MARKER_FILL,
    markerText: sport.cardText,
    shadow: MARKER_SHADOW,
  } as const
}

const SLOT_INK_MUTED = 'rgba(203,203,203,0.62)'
const SLOT_INK_AVAILABLE = 'rgba(203,203,203,0.78)'
const SLOT_FILL_AVAILABLE = 'rgba(31,31,31,0.58)'
const SLOT_FILL_MUTED = 'rgba(18,18,18,0.38)'
const SLOT_BORDER_AVAILABLE = 'rgba(203,203,203,0.56)'
const SLOT_BORDER_MUTED = 'rgba(179,179,179,0.34)'
const MARKER_FILL_MUTED = 'rgba(18,18,18,0.58)'

// Place the slot chooser so it never spills outside the (overflow-hidden) court:
// lower-half slots open upward, upper-half open downward; edge slots shift inward.
const CHOOSER_WIDTH = 150
function chooserPlacement(spot: { x: number; y: number }): ViewStyle {
  const horizontal: ViewStyle = spot.x < 26
    ? { left: `${spot.x}%`, marginLeft: -14 }
    : spot.x > 74
      ? { left: `${spot.x}%`, marginLeft: -(CHOOSER_WIDTH - 14) }
      : { left: `${spot.x}%`, marginLeft: -(CHOOSER_WIDTH / 2) }
  const vertical: ViewStyle = spot.y > 50
    ? { bottom: `${100 - spot.y}%`, marginBottom: 12 }
    : { top: `${spot.y}%`, marginTop: 12 }
  return { ...horizontal, ...vertical }
}

export const BasketballLobbyCourt = memo(function BasketballLobbyCourt({
  layout,
  selecting = false,
  phase = 'lobby',
  onSelectPosition,
  onInviteToSlot,
  onPressParticipant,
  canPressParticipant,
}: BasketballLobbyCourtProps) {
  const theme = getSportPalette('dark')
  const { t } = useI18n(matchesTabDictionary)
  const sport = useMemo(() => getSportReelItem(layout.activityType), [layout.activityType])
  const styles = useMemo(() => createStyles(theme, sport), [theme, sport])
  const [chooserSpotKey, setChooserSpotKey] = useState<string | null>(null)
  const canInvite = !!onInviteToSlot
  const chooserSpot = chooserSpotKey
    ? layout.spots.find((s) => `${s.side}:${s.positionKey}` === chooserSpotKey) ?? null
    : null

  const handleEmptySlot = (spot: BasketballLobbyCourtSpot) => {
    const canMove = spot.selectable && !!onSelectPosition
    if (canMove && canInvite) {
      setChooserSpotKey(`${spot.side}:${spot.positionKey}`)
      return
    }
    if (canMove) {
      onSelectPosition?.({ side: spot.side, positionKey: spot.positionKey })
      return
    }
    if (canInvite) {
      onInviteToSlot?.({ side: spot.side, positionKey: spot.positionKey })
    }
  }
  const { height, width: screenWidth } = useWindowDimensions()
  const isBasketball = layout.activityType === 'basketball'
  // Basketball: full-bleed photo court. Image + markers share one full
  // FIBA-aspect layer (markers stay locked to the real hoops), but the panel is
  // capped to ~one screen and clips the empty baselines equally top & bottom —
  // so the whole lobby (court + cards + dock) fits without scrolling.
  const courtWidth = isBasketball ? screenWidth : 0
  const fullCourtHeight = isBasketball ? courtWidth * courtAspect('full') : 0
  const courtHeight = isBasketball
    ? Math.min(fullCourtHeight, Math.min(Math.max(height * 0.60, 440), 560))
    : Math.min(Math.max(height * 0.62, 460), 580)
  const courtCropOffset = isBasketball ? (fullCourtHeight - courtHeight) / 2 : 0

  return (
    <View style={[
      styles.shell,
      layout.activityType === 'badminton' ? styles.badmintonShell : styles.basketballShell,
      { height: courtHeight },
    ]}>
      {layout.activityType === 'badminton' ? (
        <SportCourtSurface
          activityType="badminton"
          cropHeight={courtHeight}
          withShading
        />
      ) : (
        <SportCourtSurface
          activityType="basketball"
          width={courtWidth}
          height={fullCourtHeight}
          cropHeight={courtHeight}
          withShading={false}
        />
      )}

      {isBasketball && (
        <>
          <View style={[styles.teamChip, styles.teamChipA]}>
            <Text style={styles.teamChipTextA}>{t('teamSideLabel', { side: 'A' })}</Text>
          </View>
          <View style={[styles.teamChip, styles.teamChipB]}>
            <Text style={styles.teamChipTextB}>{t('teamSideLabel', { side: 'B' })}</Text>
          </View>
        </>
      )}

      <View style={isBasketball ? { position: 'absolute', top: -courtCropOffset, alignSelf: 'center', width: courtWidth, height: fullCourtHeight } : StyleSheet.absoluteFillObject}>


        {layout.spots.map((spot) => (
          <CourtSpot
            key={`${spot.side}:${spot.positionKey}`}
            spot={spot}
            compact={layout.teamSize === 5}
            selecting={selecting}
            phase={phase}
            canSelectPosition={!!onSelectPosition}
            canInvite={canInvite}
            usePreferredPositionLabels={layout.usePreferredPositionLabels}
            onSelect={() => handleEmptySlot(spot)}
            onPressParticipant={onPressParticipant}
            canPressParticipant={canPressParticipant}
            styles={styles}
            sport={sport}
          />
        ))}

        {chooserSpot ? (
          <>
            <PressableScale
              style={styles.chooserBackdrop}
              onPress={() => setChooserSpotKey(null)}
              accessibilityRole="button"
              accessibilityLabel={t('closeMenuLabel')}
            />
            <View style={[styles.slotChooser, chooserPlacement(chooserSpot)]}>
              <PressableScale
                style={styles.slotChooserBtn}
                onPress={() => {
                  onInviteToSlot?.({ side: chooserSpot.side, positionKey: chooserSpot.positionKey })
                  setChooserSpotKey(null)
                }}
                accessibilityRole="button"
                accessibilityLabel={t('inviteFriendLabel')}
              >
                <MaterialCommunityIcons name="account-plus-outline" size={16} color={sport.accent} />
                <Text style={styles.slotChooserText}>{t('inviteFriendLabel')}</Text>
              </PressableScale>
              <View style={styles.slotChooserDivider} />
              <PressableScale
                style={styles.slotChooserBtn}
                onPress={() => {
                  onSelectPosition?.({ side: chooserSpot.side, positionKey: chooserSpot.positionKey })
                  setChooserSpotKey(null)
                }}
                accessibilityRole="button"
                accessibilityLabel={layout.usePreferredPositionLabels ? 'ย้ายมาฝั่งนี้' : t('swapPositionLabel')}
              >
                <MaterialCommunityIcons name="swap-horizontal" size={16} color={sport.cardText} />
                <Text style={styles.slotChooserText}>
                  {layout.usePreferredPositionLabels ? 'ย้ายมาฝั่งนี้' : t('swapPositionLabel')}
                </Text>
              </PressableScale>
            </View>
          </>
        ) : null}
      </View>

      {layout.invites.length > 0 && (
        <View style={styles.bench}>
          <MaterialCommunityIcons name="account-clock-outline" size={13} color={sport.accent} />
          <Text style={styles.benchText}>{t('pendingInvitesLabel', { count: layout.invites.length })}</Text>
        </View>
      )}
    </View>
  )
})

function CourtSpot({
  spot,
  compact,
  selecting,
  phase,
  canSelectPosition,
  canInvite,
  usePreferredPositionLabels,
  onSelect,
  onPressParticipant,
  canPressParticipant,
  styles,
  sport,
}: {
  spot: BasketballLobbyCourtSpot
  compact: boolean
  selecting: boolean
  phase: BasketballCourtPhase
  canSelectPosition: boolean
  canInvite: boolean
  usePreferredPositionLabels: boolean
  onSelect: () => void
  onPressParticipant?: (participant: BasketballLobbyCourtParticipant) => void
  canPressParticipant?: (participant: BasketballLobbyCourtParticipant) => boolean
  styles: CourtStyles
  sport: SportReelItem
}) {
  const { t } = useI18n(matchesTabDictionary)
  const side = getSideStyle(spot.side, sport)
  const participant = spot.participant
  const isMe = participant?.isMe === true
  const selectableEmpty = !participant && spot.selectable
  const emptyPositionLabel = getLobbyEmptySlotLabel(usePreferredPositionLabels, spot.shortLabel)
  const committed = participant?.accepted === true
  const spotTextColor = participant ? sport.cardText : selectableEmpty ? SLOT_INK_AVAILABLE : SLOT_INK_MUTED
  const spotBorderColor = participant
    ? committed ? teamColor(spot.side) : SLOT_BORDER_MUTED
    : selectableEmpty ? SLOT_BORDER_AVAILABLE : SLOT_BORDER_MUTED
  const spotFill = participant
    ? committed ? side.markerFill : MARKER_FILL_MUTED
    : selectableEmpty ? SLOT_FILL_AVAILABLE : SLOT_FILL_MUTED
  const participantPressable = !!participant && !!onPressParticipant && (canPressParticipant?.(participant) ?? true)
  // `selecting` is the move cooldown — it should only freeze empty-slot moves/invites,
  // never block tapping a player to open their profile.
  const disabled = participant
    ? !participantPressable
    : selecting || !((spot.selectable && canSelectPosition) || canInvite)

  return (
    <PressableScale
      disabledOpacity={1}
      style={[
        styles.spot,
        compact && styles.spotCompact,
        participant && styles.occupiedSpot,
        participant && compact && styles.occupiedSpotCompact,
        {
          left: `${spot.x}%`,
          top: `${spot.y}%`,
          zIndex: isMe ? 12 : participant ? 8 : 3,
          // Occupied markers (committed or still pending) drop the plate,
          // border, and drop shadow behind the avatar entirely — the rank
          // frame ring is the only chrome; empty/selectable slots keep theirs.
          borderColor: participant ? 'transparent' : spotBorderColor,
          backgroundColor: participant ? 'transparent' : spotFill,
          borderStyle: participant || selectableEmpty ? 'solid' : 'dashed',
          shadowColor: participant ? 'transparent' : side.shadow,
        },
        participant && !committed && styles.pendingSpot,
        !participant && styles.emptySpot,
        !participant && spot.selectable && styles.selectableSpot,
        disabled && !participant && styles.disabledSpot,
      ]}
      onPress={() => {
        if (participant) {
          onPressParticipant?.(participant)
          return
        }
        onSelect()
      }}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={participant ? `${participant.name} ${t('teamSideLabel', { side: side.label })}` : `${spot.label} ${t('teamSideLabel', { side: side.label })}`}
    >
      {participant ? (
        <PlayerMarker
          participant={participant}
          compact={compact}
          committed={committed}
          phase={phase}
          styles={styles}
        />
      ) : (
        <>
          {emptyPositionLabel && (
            <Text style={[styles.emptyPosition, compact && styles.emptyPositionCompact, { color: spotTextColor }]}>
              {emptyPositionLabel}
            </Text>
          )}
          <MaterialCommunityIcons name="plus" size={compact ? 9 : 11} color={spotTextColor} />
        </>
      )}
    </PressableScale>
  )
}

function PlayerMarker({
  participant,
  compact,
  committed,
  phase,
  styles,
}: {
  participant: BasketballLobbyCourtParticipant
  compact: boolean
  committed: boolean
  phase: BasketballCourtPhase
  styles: CourtStyles
}) {
  const [failed, setFailed] = useState(false)
  const avatarSize = markerAvatarSize(participant, compact)
  const badgeValue = participant.livePoints ?? participant.stakePoints
  const badgeUnit = 'PTS'
  const showLobbyPlates = phase === 'lobby'

  const avatar = (
    <ProfileFrame frameAssetRef={participant.frameAssetRef} size={avatarSize}>
      {participant.avatarUrl && !failed ? (
        <Image
          source={{ uri: participant.avatarUrl }}
          style={{ width: avatarSize, height: avatarSize }}
          contentFit="cover"
          transition={150}
          onError={() => setFailed(true)}
        />
      ) : (
        <View style={[styles.initialsAvatar, { width: avatarSize, height: avatarSize }]}>
          <RallyText style={[
            styles.initialsText,
            !committed && styles.pendingBadgeText,
            compact && styles.initialsTextCompact,
          ]}>{participant.initials}</RallyText>
        </View>
      )}
    </ProfileFrame>
  )

  return (
    <>
      {!showLobbyPlates && (
        <View style={styles.namePlate}>
          <RallyText style={styles.namePlateText} numberOfLines={1}>
            {firstWord(participant.name).toUpperCase()} · {participant.livePoints ?? 0} PTS
          </RallyText>
        </View>
      )}
      <View style={[styles.profileFrameSlot, !committed && styles.pendingFrame]}>
        {avatar}
        {showLobbyPlates && (
          <View style={[styles.jerseyCornerChip, !committed && styles.pendingBadge]}>
            <Text style={[
              styles.jerseyCornerChipText,
              !committed && styles.pendingBadgeText,
            ]} numberOfLines={1}>
              {formatLobbyPositionJersey(participant.positionLabel, participant.jerseyNumber)}
            </Text>
          </View>
        )}
      </View>
      {showLobbyPlates ? (
        <View style={styles.belowAvatarRow}>
          <View style={[styles.stakeBadge, compact && styles.stakeBadgeCompact, !committed && styles.pendingBadge]}>
            <Text style={[
              styles.stakeBadgeAmountText,
              compact && styles.stakeBadgeAmountTextCompact,
              !committed && styles.pendingBadgeText,
            ]}>
              {formatScore(badgeValue)}
            </Text>
            <Text style={[
              styles.stakeBadgeUnitText,
              compact && styles.stakeBadgeUnitTextCompact,
              !committed && styles.pendingBadgeText,
            ]}>
              {badgeUnit}
            </Text>
            {participant.isHost && (
              <MaterialCommunityIcons
                name="crown"
                size={compact ? 9 : 10}
                color={committed ? LOBBY_ON_ORANGE : SLOT_INK_MUTED}
              />
            )}
          </View>
        </View>
      ) : null}
    </>
  )
}

function markerAvatarSize(
  _participant: BasketballLobbyCourtParticipant,
  compact: boolean,
): number {
  // Every player renders at the same size — no "bigger YOU" affordance.
  return compact ? 50 : 56
}

function firstWord(value: string): string {
  return value.trim().split(/\s+/)[0] ?? value
}

function formatScore(value: number | null): string {
  if (value == null) return '0'
  return `${value}`
}

type CourtStyles = ReturnType<typeof createStyles>

function createStyles(theme: SportPalette, sport: SportReelItem) {
  return StyleSheet.create({
  shell: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 28,
    backgroundColor: '#d8a460',
    borderWidth: 0,
    borderColor: 'transparent',
    shadowColor: MARKER_SHADOW,
    shadowOffset: { width: 0, height: 13 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 4,
  },
  badmintonShell: {
    backgroundColor: '#042d19',
  },
  basketballShell: {
    backgroundColor: '#0d0d10',
  },
  courtImageWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  teamChip: {
    position: 'absolute',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    zIndex: 4,
  },
  teamChipA: {
    top: 10,
    left: 10,
    backgroundColor: '#ff8a00',
  },
  teamChipB: {
    bottom: 10,
    left: 10,
    backgroundColor: '#808bc3',
  },
  teamChipTextA: {
    fontSize: 12,
    color: '#3a2400',
  },
  teamChipTextB: {
    fontSize: 12,
    color: '#10141f',
  },
  dimLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  topShade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 82,
    backgroundColor: 'transparent',
  },
  bottomShade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 118,
    backgroundColor: 'transparent',
  },
  spot: {
    position: 'absolute',
    width: 58,
    height: 58,
    marginLeft: -29,
    marginTop: -29,
    borderRadius: 21,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.36,
    shadowRadius: 12,
    elevation: 5,
  },
  spotCompact: {
    width: 52,
    height: 52,
    marginLeft: -26,
    marginTop: -26,
    borderRadius: 19,
    borderWidth: 3,
  },
  // Every occupied marker shares one size (self and others alike).
  occupiedSpot: {
    width: 74,
    height: 88,
    marginLeft: -37,
    marginTop: -44,
    borderRadius: 24,
    borderWidth: 4,
    shadowOpacity: 0.44,
    shadowRadius: 14,
  },
  occupiedSpotCompact: {
    width: 66,
    height: 78,
    marginLeft: -33,
    marginTop: -39,
    borderRadius: 22,
    borderWidth: 2,
  },
  selectableSpot: {
    shadowColor: 'rgba(0,0,0,0.42)',
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  emptySpot: {
    borderWidth: 2,
    opacity: 0.7,
    shadowOpacity: 0,
    elevation: 0,
  },
  disabledSpot: {
    opacity: 1,
  },
  pendingSpot: {
    opacity: 0.58,
    shadowOpacity: 0.12,
    elevation: 1,
  },
  emptyPosition: {
    fontSize: 15,
    lineHeight: 17,
    fontWeight: '900',
  },
  emptyPositionCompact: {
    fontSize: 13,
    lineHeight: 15,
  },
  // Row child inside `belowAvatarRow` now (moved below the avatar) — no
  // absolute positioning of its own.
  stakeBadge: {
    minWidth: 50,
    minHeight: 23,
    borderRadius: Radius.pill,
    backgroundColor: LOBBY_ORANGE,
    borderWidth: 2,
    borderColor: '#0d0d10',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 8,
  },
  stakeBadgeCompact: {
    minWidth: 44,
    minHeight: 21,
    paddingHorizontal: 7,
  },
  stakeBadgeAmountText: {
    color: LOBBY_ON_ORANGE,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
    letterSpacing: 0.2,
    fontVariant: ['tabular-nums'],
  },
  stakeBadgeAmountTextCompact: {
    fontSize: 9,
    lineHeight: 11,
  },
  stakeBadgeUnitText: {
    color: LOBBY_ON_ORANGE,
    fontSize: 8,
    lineHeight: 10,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  stakeBadgeUnitTextCompact: {
    fontSize: 7,
    lineHeight: 9,
  },
  pendingBadge: {
    borderColor: SLOT_BORDER_MUTED,
    backgroundColor: MARKER_FILL_MUTED,
  },
  pendingBadgeText: {
    color: SLOT_INK_MUTED,
  },
  profileFrameSlot: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  pendingFrame: {
    opacity: 0.72,
  },
  initialsAvatar: {
    backgroundColor: sport.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    color: sport.cardText,
    fontSize: 12,
  },
  initialsTextCompact: {
    fontSize: 10,
  },
  // Tucked in tight against the rank frame's edge, top-right — where the
  // host crown used to sit; the crown now lives inline in the stake pill.
  jerseyCornerChip: {
    position: 'absolute',
    right: 1,
    top: 1,
    minWidth: 20,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    backgroundColor: sport.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    zIndex: 8,
  },
  jerseyCornerChipText: {
    color: sport.cardText,
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  // Single stake pill (crown inline when host) sits below the avatar.
  belowAvatarRow: {
    position: 'absolute',
    top: '100%',
    marginTop: -6,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  namePlate: {
    backgroundColor: '#161616',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginTop: 3,
    maxWidth: 96,
  },
  // Thai-capable name: no fontWeight (clips marks). Emphasis comes from color/size.
  namePlateText: {
    color: '#ffffff',
    fontSize: 10,
    fontVariant: ['tabular-nums'],
  },
  // Title-frame label sits below the position badge, centered under the
  // marker. left/right:0 spans the spot so the wider frame overflows evenly.
  selfLabel: {
    position: 'absolute',
    width: 124,
    left: '50%',
    marginLeft: -62,
    borderRadius: Radius.md,
    paddingHorizontal: 9,
    paddingVertical: 6,
    backgroundColor: sport.cardBackground,
    borderWidth: 1,
    borderColor: theme.line,
  },
  selfLabelAbove: {
    bottom: 68,
  },
  selfLabelBelow: {
    top: 68,
  },
  selfLabelLeft: {
    marginLeft: -118,
  },
  selfLabelRight: {
    marginLeft: -6,
  },
  selfName: {
    color: sport.cardText,
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '900',
  },
  selfScore: {
    marginTop: 1,
    color: sport.accent,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
    fontVariant: ['tabular-nums'],
  },
  bench: {
    position: 'absolute',
    left: Spacing.md,
    bottom: Spacing.md,
    minHeight: 32,
    borderRadius: Radius.pill,
    paddingHorizontal: 11,
    backgroundColor: sport.cardBackground,
    borderWidth: 2,
    borderColor: sport.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  // Thai-capable ("รอตอบรับ"): no lineHeight (tight leading clips upper marks). Emphasis from weight/color.
  benchText: {
    color: sport.accent,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  chooserBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
  },
  slotChooser: {
    position: 'absolute',
    width: 150,
    borderRadius: Radius.lg,
    backgroundColor: sport.cardBackground,
    borderWidth: 1,
    borderColor: theme.line,
    boxShadow: theme.shadowSoft,
    overflow: 'hidden',
    zIndex: 50,
  },
  slotChooserBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    minHeight: 42,
  },
  slotChooserText: {
    color: sport.cardText,
    fontSize: 12,
  },
  slotChooserDivider: {
    height: 1,
    backgroundColor: theme.line,
  },
  })
}
