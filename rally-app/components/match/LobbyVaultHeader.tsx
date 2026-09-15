import { useEffect, useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated'

import { AnimatedNumber } from '@/components/motion/AnimatedNumber'
import { PressableScale } from '@/components/motion/PressableScale'
import { RallyText } from '@/components/ui/RallyText'
import { getSportPalette, Radius, type SportPalette } from '@/constants/theme'
import { getRoomAvatarInitials } from '@/lib/match/basketballLobbyCourt'
import { arcadeShadow, lobbyColors, LOBBY_ORANGE, type LobbyColors } from '@/components/match/lobbyStageStyles'
import { RunningMapLobbyArena } from '@/components/match/runningMapLobbyStageStyles'
import type { BasketballCourtLobbyRefereeSlot, BasketballCourtLobbyScoreboard } from '@/components/match/BasketballCourtLobbyStage'

type LobbyVaultHeaderProps = {
  activityType: 'basketball' | 'badminton'
  sportLabel: string
  formatLabel: string
  readyCountLabel: string
  potLabel: string | null
  scoreboard?: BasketballCourtLobbyScoreboard | null
  joinCode: string | null
  refereeSlot?: BasketballCourtLobbyRefereeSlot
  onCopyCode?: () => void
}

export function LobbyVaultHeader({
  formatLabel,
  readyCountLabel,
  potLabel,
  scoreboard,
  joinCode,
  refereeSlot,
  onCopyCode,
}: LobbyVaultHeaderProps) {
  const theme = getSportPalette('dark')
  const c = useMemo(() => lobbyColors(), [])
  const styles = useMemo(() => createStyles(theme, c), [theme, c])
  const pulse = useSharedValue(1)
  const { value: potValue, unit: potUnit } = useMemo(() => parsePotLabel(potLabel), [potLabel])
  const scorePulse = scoreboard ? scoreboard.sideAScore + scoreboard.sideBScore : potValue

  useEffect(() => {
    pulse.value = withSequence(
      withTiming(1.03, { duration: 180, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }),
    )
  }, [scorePulse, pulse])

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    shadowOpacity: 0.22 + ((pulse.value - 1) * 2.2),
  }))

  return (
    <Animated.View style={[styles.card, animStyle]}>
      <View style={styles.leftZone}>
        <View style={styles.titleBlock}>
          <Text style={styles.format} numberOfLines={1}>{scoreboard?.label ?? formatLabel.toUpperCase()}</Text>
          <View style={styles.formatRule} />
        </View>
        {scoreboard ? (
          <View style={styles.scoreRail}>
            <Text style={styles.scoreValue}>{scoreboard.sideAScore}</Text>
            <Text style={styles.scoreDivider}>-</Text>
            <Text style={styles.scoreValue}>{scoreboard.sideBScore}</Text>
          </View>
        ) : (
          <View style={styles.potRail}>
            <AnimatedNumber value={potValue} duration={760} style={styles.potValue} formatter={(n) => n.toLocaleString()} />
            <Text style={styles.potUnit}>{potUnit}</Text>
          </View>
        )}
        <View style={styles.chipsRow}>
          <View style={styles.chip}>
            <MaterialCommunityIcons name="circle-slice-8" size={11} color={LOBBY_ORANGE} />
            <Text style={styles.chipText} numberOfLines={1}>{readyCountLabel}</Text>
          </View>
          {joinCode && onCopyCode ? (
            <PressableScale style={styles.codeChip} onPress={onCopyCode} accessibilityRole="button" accessibilityLabel={`คัดลอกรหัส ${joinCode}`}>
              <MaterialCommunityIcons name="pound" size={11} color={LOBBY_ORANGE} />
              <Text style={styles.codeText} numberOfLines={1}>{joinCode}</Text>
            </PressableScale>
          ) : null}
        </View>
      </View>

      <View style={styles.divider} />

      <RefereeMarker slot={refereeSlot} styles={styles} />
    </Animated.View>
  )
}

function RefereeMarker({ slot, styles }: { slot?: BasketballCourtLobbyRefereeSlot; styles: VaultStyles }) {
  const [avatarFailed, setAvatarFailed] = useState(false)
  const disabled = !slot?.onPress || slot.disabled || slot.busy
  const filled = slot?.status === 'ASSIGNED'
  const pending = slot?.status === 'PENDING'
  const name = slot?.label ?? 'เพิ่มกรรมการ'
  const showPhoto = (filled || pending) && !!slot?.avatarUrl && !avatarFailed
  // Pending uses the shared warning tone — yellow/amber is reserved for
  // points/reward/economy per the Rally palette rules.
  const markerColor = pending ? RunningMapLobbyArena.warning : LOBBY_ORANGE
  return (
    <PressableScale
      style={[styles.refPanel, disabled && styles.refDisabled]}
      onPress={slot?.onPress ?? (() => {})}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={name}
    >
      <View style={[
        styles.refAvatar,
        filled ? styles.refAvatarFilled : pending ? styles.refAvatarPending : styles.refAvatarEmpty,
      ]}>
        {filled || pending ? (
          showPhoto ? (
            <Image
              source={{ uri: slot?.avatarUrl ?? undefined }}
              style={{ width: 46, height: 46, borderRadius: 15, opacity: pending ? 0.75 : 1 }}
              contentFit="cover"
              transition={150}
              onError={() => setAvatarFailed(true)}
            />
          ) : (
            <RallyText style={styles.refInitials}>{getRoomAvatarInitials(name)}</RallyText>
          )
        ) : (
          <MaterialCommunityIcons name={slot?.busy ? 'dots-horizontal' : 'whistle-outline'} size={18} color={markerColor} />
        )}
        <View style={[styles.refWhistle, pending && styles.refWhistlePending]}>
          <MaterialCommunityIcons name={pending ? 'clock-outline' : 'whistle-outline'} size={10} color={markerColor} />
        </View>
      </View>
      <View style={[styles.refChip, pending && styles.refChipPending]}><Text style={styles.refChipText}>REF</Text></View>
      <RallyText style={styles.refName} numberOfLines={1}>{name}</RallyText>
    </PressableScale>
  )
}

function parsePotLabel(label: string | null): { value: number; unit: string } {
  if (!label) return { value: 0, unit: 'PTS' }
  const numeric = Number(label.replace(/[^0-9.]/g, ''))
  const unit = label.replace(/[0-9.,\s]/g, '').trim().toUpperCase()
  return { value: Number.isFinite(numeric) ? numeric : 0, unit: unit || 'PTS' }
}

type VaultStyles = ReturnType<typeof createStyles>

function createStyles(theme: SportPalette, c: LobbyColors) {
  return StyleSheet.create({
    card: {
      marginHorizontal: 14, borderRadius: Radius.xxl, borderWidth: 2, borderColor: c.edge,
      backgroundColor: c.surface, flexDirection: 'row', alignItems: 'stretch', gap: 11,
      paddingHorizontal: 13, paddingVertical: 10, overflow: 'hidden',
      ...arcadeShadow(theme, { width: 5, height: 6 }, 0.22),
    },
    leftZone: { flex: 1, justifyContent: 'space-between', gap: 7 },
    titleBlock: { gap: 3 },
    format: { color: LOBBY_ORANGE, fontSize: 19, lineHeight: 21, fontWeight: '900', fontStyle: 'italic', letterSpacing: 1 },
    formatRule: { width: 26, height: 2.5, borderRadius: 2, backgroundColor: LOBBY_ORANGE, opacity: 0.9 },
    potRail: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
    potValue: { color: c.ink, fontSize: 40, lineHeight: 44, fontWeight: '900', fontStyle: 'italic', fontVariant: ['tabular-nums'] },
    potUnit: { color: LOBBY_ORANGE, fontSize: 18, lineHeight: 20, fontWeight: '900', marginBottom: 5 },
    scoreRail: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    scoreValue: { color: c.ink, fontSize: 36, lineHeight: 40, fontWeight: '900', fontStyle: 'italic', fontVariant: ['tabular-nums'] },
    scoreDivider: { color: LOBBY_ORANGE, fontSize: 22, fontWeight: '900' },
    chipsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    chip: { minHeight: 26, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, borderRadius: Radius.pill, backgroundColor: c.panel },
    chipText: { color: c.ink, fontSize: 11, lineHeight: 13, fontWeight: '900', letterSpacing: 0.3, fontVariant: ['tabular-nums'] },
    codeChip: { minHeight: 26, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, borderRadius: Radius.pill, backgroundColor: c.panel },
    codeText: { color: LOBBY_ORANGE, fontSize: 11, lineHeight: 13, fontWeight: '900', letterSpacing: 1, fontVariant: ['tabular-nums'] },
    divider: { width: 1.5, alignSelf: 'stretch', marginVertical: 2, borderRadius: 1, backgroundColor: c.edge, opacity: 0.7 },
    refPanel: { width: 86, alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: c.panel, borderRadius: 14, paddingVertical: 9, paddingHorizontal: 4 },
    refDisabled: { opacity: 0.85 },
    refAvatar: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface },
    refAvatarFilled: { borderWidth: 2, borderColor: LOBBY_ORANGE },
    refAvatarPending: { borderWidth: 2, borderColor: RunningMapLobbyArena.warning },
    refAvatarEmpty: { borderWidth: 2, borderStyle: 'dashed', borderColor: LOBBY_ORANGE },
    refInitials: { color: c.ink, fontSize: 15 },
    refWhistle: { position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: 9, backgroundColor: c.surface, borderWidth: 1.5, borderColor: LOBBY_ORANGE, alignItems: 'center', justifyContent: 'center' },
    refWhistlePending: { borderColor: RunningMapLobbyArena.warning },
    refChip: { borderRadius: Radius.pill, backgroundColor: c.surface, borderWidth: 1, borderColor: LOBBY_ORANGE, paddingHorizontal: 9, minHeight: 18, alignItems: 'center', justifyContent: 'center' },
    refChipPending: { borderColor: RunningMapLobbyArena.warning },
    refChipText: { color: c.ink, fontSize: 10, lineHeight: 12, fontWeight: '900', letterSpacing: 0.6 },
    refName: { color: c.inkSoft, fontSize: 9, maxWidth: 78, textAlign: 'center' },
  })
}
