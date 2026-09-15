import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { PressableScale } from '@/components/motion/PressableScale'
import { RallyText } from '@/components/ui/RallyText'
import { getSportPalette, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { arcadeShadow, lobbyColors, LOBBY_ON_ORANGE, LOBBY_ORANGE, type LobbyColors } from '@/components/match/lobbyStageStyles'
import type { BasketballCourtLiveToggle, BasketballCourtLobbyAction } from '@/components/match/BasketballCourtLobbyStage'

type LobbyActionDockProps = {
  activityType: 'basketball' | 'badminton'
  primaryAction: BasketballCourtLobbyAction
  myStakeLabel?: string | null
  sidecarAction: BasketballCourtLobbyAction | null
  secondaryActions: BasketballCourtLobbyAction[]
  liveToggle?: BasketballCourtLiveToggle
}

export function LobbyActionDock({ primaryAction, myStakeLabel, sidecarAction, secondaryActions, liveToggle }: LobbyActionDockProps) {
  const theme = getSportPalette('dark')
  const c = useMemo(() => lobbyColors(), [])
  const styles = useMemo(() => createStyles(theme, c), [theme, c])
  const hasStake = myStakeLabel != null || sidecarAction != null
  const hasSecondRow = hasStake || secondaryActions.length > 0

  return (
    <View style={styles.dock}>
      {liveToggle ? (
        <View style={styles.primaryRow}>
          <View style={styles.primaryFlex}>
            <ActionButton action={primaryAction} variant="primary" styles={styles} theme={theme} colors={c} />
          </View>
          <LiveToggleSquare toggle={liveToggle} styles={styles} theme={theme} colors={c} />
        </View>
      ) : (
        <ActionButton action={primaryAction} variant="primary" styles={styles} theme={theme} colors={c} />
      )}
      {hasSecondRow ? (
        <View style={styles.secondRow}>
          {hasStake ? (
            <View style={styles.stake}>
              {myStakeLabel != null ? <Text style={styles.stakeValue} numberOfLines={1}>{myStakeLabel}</Text> : null}
              {sidecarAction ? (
                <PressableScale
                  style={[styles.stakeEdit, (sidecarAction.disabled || sidecarAction.busy) && styles.stakeEditOff]}
                  onPress={sidecarAction.onPress}
                  disabled={sidecarAction.disabled || sidecarAction.busy}
                  accessibilityRole="button"
                  accessibilityLabel={sidecarAction.label}
                >
                  <MaterialCommunityIcons name={sidecarAction.busy ? 'dots-horizontal' : sidecarAction.icon} size={16} color={LOBBY_ORANGE} />
                </PressableScale>
              ) : null}
            </View>
          ) : null}
          {secondaryActions.length > 0 ? (
            <View style={styles.secondRight}>
              {secondaryActions.map((action) => (
                <ActionButton key={action.key} action={action} variant="secondary" styles={styles} theme={theme} colors={c} />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

// Always-visible spectator-live toggle — 46px eye square beside the primary CTA.
function LiveToggleSquare({ toggle, styles, theme, colors }: {
  toggle: BasketballCourtLiveToggle
  styles: DockStyles
  theme: SportPalette
  colors: LobbyColors
}) {
  return (
    <PressableScale
      style={[styles.liveSquare, toggle.enabled && styles.liveSquareOn]}
      onPress={toggle.onPress}
      disabled={toggle.busy}
      accessibilityRole="button"
      accessibilityLabel={toggle.enabled ? 'ปิดการดูสด' : 'เปิดให้ดูสด'}
    >
      <MaterialCommunityIcons
        name={toggle.busy ? 'dots-horizontal' : toggle.enabled ? 'eye-outline' : 'eye-off-outline'}
        size={20}
        color={toggle.enabled ? theme.greenVivid : colors.inkSoft}
      />
    </PressableScale>
  )
}

function ActionButton({ action, variant, styles, theme, colors }: {
  action: BasketballCourtLobbyAction
  variant: 'primary' | 'secondary'
  styles: DockStyles
  theme: SportPalette
  colors: LobbyColors
}) {
  const disabled = action.disabled || action.busy
  const primary = variant === 'primary'
  const danger = action.tone === 'danger'
  const iconColor = primary
    ? (disabled ? colors.inkSoft : LOBBY_ON_ORANGE)
    : danger ? theme.risk : disabled ? colors.inkSoft : colors.ink
  return (
    <PressableScale
      style={[
        primary ? styles.primary : styles.secondary,
        danger && styles.danger,
        primary && disabled && styles.primaryOff,
        !primary && disabled && styles.secondaryOff,
      ]}
      onPress={action.onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={action.label}
    >
      <MaterialCommunityIcons name={action.busy ? 'dots-horizontal' : action.icon} size={primary ? 20 : 15} color={iconColor} />
      <RallyText
        variant="head"
        style={[
          primary ? styles.primaryText : styles.secondaryText,
          danger && styles.dangerText,
          primary && disabled && styles.primaryTextOff,
        ]}
        numberOfLines={1}
      >
        {action.busy ? '...' : action.label}
      </RallyText>
    </PressableScale>
  )
}

type DockStyles = ReturnType<typeof createStyles>

function createStyles(theme: SportPalette, c: LobbyColors) {
  return StyleSheet.create({
    dock: {
      marginHorizontal: 14, padding: 9, gap: 9, borderRadius: Radius.xxl, borderWidth: 2,
      borderColor: c.edge, backgroundColor: c.surface, overflow: 'hidden',
      ...arcadeShadow(theme, { width: 5, height: 6 }, 0.2),
    },
    primaryRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
    primaryFlex: { flex: 1 },
    liveSquare: {
      width: 46, height: 46, borderRadius: Radius.md, borderWidth: 1.5, borderColor: c.edge,
      backgroundColor: c.panel, alignItems: 'center', justifyContent: 'center',
    },
    liveSquareOn: { borderColor: theme.greenVivid },
    secondRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    stake: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 46, paddingLeft: 13, paddingRight: 6, borderRadius: Radius.pill, backgroundColor: c.panel, borderWidth: 1.5, borderColor: c.edge },
    stakeValue: { color: LOBBY_ORANGE, fontSize: 14, lineHeight: 16, fontWeight: '900', letterSpacing: 0.3, fontVariant: ['tabular-nums'] },
    stakeEdit: { width: 32, height: 32, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface, borderWidth: 1.5, borderColor: LOBBY_ORANGE },
    stakeEditOff: { borderColor: c.inkSoft },
    secondRight: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: Spacing.sm },
    primary: {
      minHeight: 56, borderRadius: Radius.md, backgroundColor: LOBBY_ORANGE, borderWidth: 2, borderColor: c.edge,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, overflow: 'hidden',
      ...arcadeShadow(theme, { width: 4, height: 5 }, 0.24),
    },
    primaryText: { color: LOBBY_ON_ORANGE, fontSize: 16, letterSpacing: 0.6, textTransform: 'uppercase' },
    primaryOff: { backgroundColor: c.disabledFill, shadowOpacity: 0, elevation: 0 },
    primaryTextOff: { color: c.inkSoft },
    secondary: {
      flex: 1, minHeight: 46, borderRadius: Radius.pill, borderWidth: 1.5, borderColor: c.edge, backgroundColor: c.panel,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 14, overflow: 'hidden',
    },
    secondaryText: { color: c.ink, fontSize: 12, letterSpacing: 0.4 },
    secondaryOff: { opacity: 0.5 },
    danger: { borderColor: theme.risk, backgroundColor: 'rgba(199,63,65,0.16)' },
    dangerText: { color: theme.risk },
  })
}
