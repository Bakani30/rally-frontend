import { Platform, StyleSheet } from 'react-native'

import { Arcade, Radius, Spacing, getSportPalette, type SportPalette } from '@/constants/theme'

// Wallet is an economy/stake surface — per rally-app/CLAUDE.md palette rules it stays a
// fixed DARK vault regardless of the device's light/dark mode. Every wallet component
// imports this same palette instance instead of useSportTheme()/useThemeMode(), mirroring
// the pattern already used for other stake surfaces (see components/match/LobbyVaultHeader.tsx).
export const walletTheme: SportPalette = getSportPalette('dark')

// "Panel" shell shared by the daily-cap meter, credits card, and ledger — a bordered
// dark card with a hairline edge and small internal gap between rows.
export const walletPanelStyles = StyleSheet.create({
  panel: {
    backgroundColor: walletTheme.bgElevated,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: walletTheme.line,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skeletonBlock: {
    height: 12,
    borderRadius: Radius.sm,
    backgroundColor: walletTheme.surfaceStrong,
  },
})

// Hard-edge arcade shadow, forced to the wallet's fixed dark palette — used by the
// hero points vault. Mirrors the arcadeShadow() helper in components/match/lobbyStageStyles.ts.
export const WALLET_HERO_SHADOW = Platform.select({
  web: { boxShadow: `${Arcade.shadow.hardOffset.width}px ${Arcade.shadow.hardOffset.height}px 0 ${walletTheme.arcadeShadow}` },
  default: {
    shadowColor: walletTheme.arcadeCabinetEdge,
    shadowOffset: Arcade.shadow.hardOffset,
    shadowOpacity: 0.35,
    shadowRadius: Arcade.shadow.radius,
    elevation: 5,
  },
})
