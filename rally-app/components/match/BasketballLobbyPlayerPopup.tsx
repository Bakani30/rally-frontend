import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import { Image } from 'expo-image'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { PressableScale } from '@/components/motion/PressableScale'
import { RallyText } from '@/components/ui/RallyText'
import { ProfileAvatar } from '@/components/profile/ProfileAvatar'
import { ProfileFrame } from '@/components/profile/ProfileFrame'
import { TitleFrame } from '@/components/cosmetics/TitleFrame'
import { getSportPalette, Radius, Spacing, TierChipBg, TierColor, type SportPalette } from '@/constants/theme'
import { useAddFriend } from '@/hooks/useFriends'
import { usePublicProfile } from '@/hooks/usePublicProfile'
import { useI18n } from '@/hooks/useI18n'
import { matchesTabDictionary } from '@/lib/i18n/dictionaries/matchesTab'
import { hasTitleFrame } from '@/lib/cosmetics/titleFrameRegistry'
import type { BasketballLobbyCourtParticipant } from '@/lib/match/basketballLobbyCourt'
import { teamColor } from '@/components/match/lobbyStageStyles'
import type { LobbyPlayerPreviewParticipant } from '@/lib/match/lobbyPlayerPreview'
import { guardedRouter } from '@/lib/navigation/guardedRouter'
import { getRankIcon } from '@/lib/ranks/rankAssets'

type BasketballLobbyPlayerPopupProps = {
  visible: boolean
  participant: LobbyPlayerPreviewParticipant | null
  canKick?: boolean
  kickPending?: boolean
  onClose: () => void
  onViewProfile: (userId: string) => void
  onKick: (participant: LobbyPlayerPreviewParticipant) => void
}

// Court-only fields (side) are carried on BasketballLobbyCourtParticipant,
// a structural superset of LobbyPlayerPreviewParticipant — present at runtime
// when this popup is opened from the basketball court, absent (undefined)
// from the running lobby. Cast is type-only; the prop signature stays
// LobbyPlayerPreviewParticipant so call sites are untouched.
type PopupParticipant = LobbyPlayerPreviewParticipant & Partial<Pick<BasketballLobbyCourtParticipant, 'side' | 'positionLabel'>>

const AVATAR_SIZE = 96

export function BasketballLobbyPlayerPopup({
  visible,
  participant,
  canKick = false,
  kickPending = false,
  onClose,
  onViewProfile,
  onKick,
}: BasketballLobbyPlayerPopupProps) {
  const theme = getSportPalette('dark')
  const styles = createStyles(theme)
  const { t } = useI18n(matchesTabDictionary)
  const { width } = useWindowDimensions()
  const translateY = useRef(new Animated.Value(0)).current
  const opacity = useRef(new Animated.Value(0)).current
  const [menuOpen, setMenuOpen] = useState(false)
  const { data: profile, isPending: profilePending } = usePublicProfile({
    userId: visible ? participant?.userId : undefined,
  })

  const panResponder = useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) =>
        gesture.dy > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_event, gesture) => {
        if (gesture.dy > 0) translateY.setValue(gesture.dy)
      },
      onPanResponderRelease: (_event, gesture) => {
        if (gesture.dy > 90 || gesture.vy > 0.8) {
          Animated.timing(translateY, {
            toValue: 260,
            duration: 150,
            useNativeDriver: true,
          }).start(onClose)
          return
        }
        Animated.spring(translateY, {
          toValue: 0,
          damping: 24,
          stiffness: 270,
          mass: 0.85,
          useNativeDriver: true,
        }).start()
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateY, {
          toValue: 0,
          damping: 24,
          stiffness: 270,
          mass: 0.85,
          useNativeDriver: true,
        }).start()
      },
    }),
    [onClose, translateY],
  )

  useEffect(() => {
    if (!visible) {
      opacity.setValue(0)
      translateY.setValue(260)
      return
    }

    translateY.setValue(120)
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        damping: 24,
        stiffness: 270,
        mass: 0.8,
        useNativeDriver: true,
      }),
    ]).start()
  }, [opacity, translateY, visible])

  const addFriend = useAddFriend()

  useEffect(() => {
    addFriend.reset()
    setMenuOpen(false)
  }, [participant?.userId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!participant) return null
  const selectedParticipant = participant as PopupParticipant

  const displayName = profile?.displayName ?? selectedParticipant.name
  const avatarUrl = profile?.avatarUrl ?? selectedParticipant.avatarUrl
  const frameAssetRef = profile?.equippedCosmetics?.frame?.assetRef ?? selectedParticipant.frameAssetRef
  const initials = (displayName || selectedParticipant.initials || '?').slice(0, 1).toUpperCase()
  const rankingPoints = profile?.leaderboardScore ?? selectedParticipant.leaderboardScore
  const rankingLabel = typeof rankingPoints === 'number' ? `${rankingPoints}` : '--'
  const stats = profile?.stats
  const winRate = stats && stats.totalMatches > 0
    ? `${Math.round((stats.totalWins / stats.totalMatches) * 100)}%`
    : profilePending ? '...'
    : '--'
  const totalMatches = stats?.totalMatches ?? 0
  const streakLabel = profile ? `${profile.currentStreak ?? 0}` : '--'
  const tier = selectedParticipant.tier ?? null
  const jerseyNumber = profile?.jerseyNumber ?? null
  const side = selectedParticipant.side
  const positionLabel = selectedParticipant.positionLabel ?? null
  const equippedTitle = profile?.equippedCosmetics?.title ?? null
  const cardWidth = Math.min(width - Spacing.xl * 2, 380)

  function handleViewProfile() {
    onClose()
    onViewProfile(selectedParticipant.userId)
  }

  function handleReport() {
    setMenuOpen(false)
    onClose()
    guardedRouter.push(
      { pathname: '/user/report', params: { id: selectedParticipant.userId } },
      { actionKey: `user:${selectedParticipant.userId}:report` },
    )
  }

  function handleKick() {
    setMenuOpen(false)
    onKick(selectedParticipant)
  }

  const addFriendLabel = addFriend.isPending ? '...' : addFriend.isSuccess ? t('addFriendSentLabel') : addFriend.isError ? t('addFriendFailedLabel') : t('addFriendLabel')
  const showSecondaryActions = !selectedParticipant.isMe

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.floatWrap,
            {
              width: cardWidth,
              opacity,
              transform: [{ translateY }],
            },
          ]}
        >
          <Pressable
            style={styles.card}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.handle} />

            <View style={styles.avatarWrap}>
              <ProfileFrame frameAssetRef={frameAssetRef ?? null} size={AVATAR_SIZE}>
                <ProfileAvatar avatarUrl={avatarUrl ?? null} initials={initials} size={AVATAR_SIZE} />
              </ProfileFrame>
              {selectedParticipant.isHost ? (
                <View style={styles.hostBadge}>
                  <MaterialCommunityIcons name="crown" size={12} color={theme.arcadeCtaText} />
                  <Text style={styles.hostBadgeText}>{t('hostBadgeLabel')}</Text>
                </View>
              ) : null}
              {tier ? (
                <View style={styles.tierPip}>
                  <Image source={getRankIcon(tier)} style={styles.tierPipIcon} contentFit="contain" />
                </View>
              ) : null}
            </View>

            <View style={styles.identity}>
              <RallyText style={styles.name} numberOfLines={1}>{displayName}</RallyText>
              <Text style={styles.meta} numberOfLines={1}>
                {selectedParticipant.accepted ? t('readyStatusLabel') : t('waitingStatusLabel')} | {selectedParticipant.stakePoints} pts {t('stakeSuffixLabel')}
              </Text>
            </View>

            {equippedTitle ? (
              hasTitleFrame(equippedTitle.code) ? (
                <TitleFrame
                  variant="full"
                  code={equippedTitle.code}
                  text={equippedTitle.name}
                  rarity={equippedTitle.rarity}
                />
              ) : (
                <View style={styles.plainTitleChip}>
                  <RallyText style={styles.plainTitleChipText} numberOfLines={1}>{equippedTitle.name}</RallyText>
                </View>
              )
            ) : null}

            <View style={styles.chipsRow}>
              {side != null ? (
                <View style={[styles.chip, { borderColor: teamColor(side) }]}>
                  <Text style={styles.chipTextThai}>{t('teamSideLabel', { side: side === 0 ? 'A' : 'B' })}</Text>
                </View>
              ) : null}
              {positionLabel ? (
                <View style={styles.chip}>
                  <Text style={styles.chipText}>{positionLabel}</Text>
                </View>
              ) : null}
              {jerseyNumber != null ? (
                <View style={styles.chip}>
                  <Text style={styles.chipText}>{`#${jerseyNumber}`}</Text>
                </View>
              ) : null}
              {tier ? (
                <View style={[styles.chip, { borderColor: TierColor[tier] ?? '#c58b4b' }]}>
                  <Text style={styles.chipText}>{`${tier.toUpperCase()} · ${rankingLabel}`}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.statsStrip}>
              <MiniStat label={t('statMatchesLabel')} value={`${totalMatches}`} theme={theme} />
              <MiniStat label={t('statWinRateLabel')} value={winRate} theme={theme} />
              <MiniStat label={t('statStreakLabel')} value={streakLabel} theme={theme} />
            </View>

            <View style={styles.actionRow}>
              <PressableScale
                style={styles.primaryButton}
                onPress={handleViewProfile}
                accessibilityLabel={t('viewProfileLabel')}
              >
                <MaterialCommunityIcons name="account-search-outline" size={16} color={theme.fightInk} />
                <Text style={styles.primaryButtonText}>{t('viewProfileLabel')}</Text>
              </PressableScale>

              {showSecondaryActions ? (
                <>
                  <PressableScale
                    style={[
                      styles.addFriendButton,
                      (addFriend.isPending || addFriend.isSuccess) && styles.disabled,
                      addFriend.isError && styles.addFriendButtonError,
                    ]}
                    onPress={() => addFriend.mutate(selectedParticipant.userId)}
                    disabled={addFriend.isPending || addFriend.isSuccess}
                    accessibilityLabel={t('addFriendLabel')}
                  >
                    <MaterialCommunityIcons
                      name={addFriend.isSuccess ? 'account-check-outline' : addFriend.isError ? 'alert-circle-outline' : 'account-plus-outline'}
                      size={16}
                      color={addFriend.isError ? theme.red : theme.green}
                    />
                    <RallyText variant="head" style={[styles.addFriendButtonText, addFriend.isError && styles.addFriendButtonErrorText]}>
                      {addFriendLabel}
                    </RallyText>
                  </PressableScale>

                  <PressableScale
                    style={styles.menuButton}
                    onPress={() => setMenuOpen((open) => !open)}
                    accessibilityLabel={t('moreMenuLabel')}
                  >
                    <MaterialCommunityIcons name="dots-horizontal" size={18} color={theme.fightMuted} />
                  </PressableScale>
                </>
              ) : null}
            </View>

            {showSecondaryActions && menuOpen ? (
              <View style={styles.menuPanel}>
                {canKick ? (
                  <>
                    <PressableScale
                      style={[styles.menuItem, kickPending && styles.disabled]}
                      onPress={handleKick}
                      disabled={kickPending}
                      accessibilityLabel={t('kickLabel')}
                    >
                      <MaterialCommunityIcons name="account-remove-outline" size={16} color={theme.red} />
                      <Text style={styles.menuItemTextDanger}>{kickPending ? t('kickingLabel') : t('kickLabel')}</Text>
                    </PressableScale>
                    <View style={styles.menuDivider} />
                  </>
                ) : null}
                <PressableScale
                  style={styles.menuItem}
                  onPress={handleReport}
                  accessibilityLabel={t('reportLabel')}
                >
                  <MaterialCommunityIcons name="flag-outline" size={16} color={theme.fightMuted} />
                  <Text style={styles.menuItemText}>{t('reportLabel')}</Text>
                </PressableScale>
              </View>
            ) : null}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  )
}

function MiniStat({ label, value, theme }: { label: string; value: string; theme: SportPalette }) {
  const styles = createStyles(theme)
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniStatLabel}>{label}</Text>
      <Text style={styles.miniStatValue} numberOfLines={1}>{value}</Text>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: 18,
    backgroundColor: 'rgba(0,0,0,0.54)',
  },
  floatWrap: {
    maxWidth: '100%',
  },
  card: {
    overflow: 'hidden',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.xxl,
    borderWidth: 1,
    borderColor: theme.fightLine,
    backgroundColor: theme.fightPanel,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    shadowColor: theme.fightBg,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.34,
    shadowRadius: 24,
    elevation: 9,
  },
  handle: {
    width: 86,
    height: 7,
    borderRadius: Radius.pill,
    backgroundColor: theme.fightLine,
  },
  avatarWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: AVATAR_SIZE + 12,
  },
  hostBadge: {
    position: 'absolute',
    right: -10,
    top: 0,
    minHeight: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    backgroundColor: theme.arcadeCta,
    borderWidth: 1,
    borderColor: theme.arcadeCabinet,
  },
  hostBadgeText: {
    color: theme.arcadeCtaText,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  tierPip: {
    position: 'absolute',
    right: -2,
    bottom: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: TierChipBg,
    borderWidth: 1,
    borderColor: theme.fightBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierPipIcon: {
    width: 20,
    height: 20,
  },
  identity: {
    width: '100%',
    alignItems: 'center',
    gap: 3,
  },
  name: {
    maxWidth: '100%',
    color: theme.fightInk,
    fontSize: 16,
    fontStyle: 'italic',
  },
  meta: {
    color: theme.fightMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  plainTitleChip: {
    maxWidth: '90%',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    backgroundColor: '#eac31a',
  },
  plainTitleChipText: {
    color: '#3a2400',
    fontSize: 11,
    textAlign: 'center',
  },
  chipsRow: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  chip: {
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: theme.line,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
  },
  chipText: {
    color: theme.fightInk,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  chipTextThai: {
    color: theme.fightInk,
    fontSize: 11,
    letterSpacing: 0.4,
  },
  statsStrip: {
    width: '100%',
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  miniStat: {
    flex: 1,
    minHeight: 62,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: theme.surface,
    paddingHorizontal: 6,
  },
  miniStatLabel: {
    color: theme.fightMuted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  miniStatValue: {
    color: theme.fightInk,
    fontSize: 13,
    fontWeight: '900',
  },
  actionRow: {
    width: '100%',
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  primaryButton: {
    minHeight: 48,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: Radius.lg,
    backgroundColor: theme.orange,
    paddingHorizontal: Spacing.md,
  },
  primaryButtonText: {
    color: theme.fightInk,
    fontSize: 14,
    letterSpacing: 0.4,
  },
  addFriendButton: {
    minHeight: 48,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: theme.green,
    backgroundColor: theme.greenSoft,
    paddingHorizontal: Spacing.md,
  },
  addFriendButtonText: {
    color: theme.green,
    fontSize: 14,
    letterSpacing: 0.4,
  },
  addFriendButtonError: {
    borderColor: theme.red,
    backgroundColor: theme.redSoft,
  },
  addFriendButtonErrorText: {
    color: theme.red,
  },
  menuButton: {
    minHeight: 48,
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: theme.fightLine,
    backgroundColor: theme.surface,
  },
  menuPanel: {
    width: '100%',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: theme.surface,
    overflow: 'hidden',
  },
  menuItem: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.md,
  },
  menuDivider: {
    height: 1,
    backgroundColor: theme.line,
  },
  menuItemText: {
    color: theme.fightMuted,
    fontSize: 13,
  },
  menuItemTextDanger: {
    color: theme.red,
    fontSize: 13,
  },
  disabled: {
    opacity: 0.62,
  },
})
}
