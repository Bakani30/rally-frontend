import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { AnimatedNumber } from '@/components/motion/AnimatedNumber'
import { RallyText } from '@/components/ui/RallyText'
import { Arcade, Fonts, Radius, Spacing } from '@/constants/theme'
import type { DailyEarnCap } from '@/lib/wallet/walletTypes'
import { WALLET_HERO_SHADOW, walletTheme } from './walletVaultStyles'

type WalletVaultCardProps = {
  totalPoints: number
  availablePoints: number
  lockedPoints: number
  /** Daily earn cap snapshot; undefined while loading (strip shows track only). */
  cap?: DailyEarnCap
  capIsError?: boolean
}

/**
 * Hero "Score Vault" — headline Points balance, available-vs-locked split
 * (points-economy §2), and the daily earn cap fused into the card itself:
 * the card's TOP EDGE is the cap progress line (full line + glow + chip =
 * cap reached). v2 per founder direction — no separate cap card, and no
 * mid-card ratio bar (it duplicated the split numbers).
 * Presentational only: the screen resolves hooks and passes data down.
 */
export function WalletVaultCard({
  totalPoints,
  availablePoints,
  lockedPoints,
  cap,
  capIsError = false,
}: WalletVaultCardProps) {
  const available = Math.max(availablePoints, 0)
  const locked = Math.max(lockedPoints, 0)
  const capReached = cap?.capReached ?? false
  const capPct = cap && cap.capPoints > 0 ? Math.min(100, (cap.earnedTodayPoints / cap.capPoints) * 100) : 0

  return (
    <View style={styles.card}>
      {/* Top edge = daily-cap progress line (เส้นเต็ม = เต็มเพดานวันนี้) */}
      <View style={styles.capStrip}>
        {cap ? (
          <View
            style={[styles.capStripFill, capReached ? styles.capStripFillFull : { width: `${capPct}%` }]}
          />
        ) : null}
      </View>

      <View style={styles.body}>
        <View pointerEvents="none" style={styles.glow} />

        <View style={styles.capRow}>
          <View style={styles.coin}>
            <MaterialCommunityIcons name="medal-outline" size={13} color={walletTheme.onEconomy} />
          </View>
          <RallyText variant="head" lang="en" style={styles.capEn}>
            Points
          </RallyText>
          <RallyText variant="body" style={styles.capTh}>
            แต้ม
          </RallyText>
          <View style={styles.capReadout}>
            {capReached ? (
              <View style={styles.capFullChip}>
                <MaterialCommunityIcons name="check" size={11} color={walletTheme.onEconomy} />
                <RallyText variant="body" style={styles.capFullChipText}>
                  เต็มเพดานวันนี้
                </RallyText>
              </View>
            ) : cap ? (
              <RallyText variant="body" style={styles.capNumLine}>
                <Text style={styles.capNumEarned}>{cap.earnedTodayPoints.toLocaleString()}</Text>
                <Text style={styles.capNum}>/{cap.capPoints.toLocaleString()}</Text>
                {' · เหลืออีก '}
                <Text style={styles.capNum}>{cap.remainingPoints.toLocaleString()}</Text>
              </RallyText>
            ) : capIsError ? (
              <RallyText variant="body" style={styles.capErrorText}>
                โหลดเพดานไม่ได้
              </RallyText>
            ) : null}
          </View>
        </View>

        <View style={styles.amountRow}>
          <AnimatedNumber value={totalPoints} style={styles.amount} />
          <Text style={styles.unit}>pts</Text>
        </View>

        <View style={styles.splitRow}>
          <View style={styles.splitCol}>
            <RallyText variant="head" lang="en" style={styles.splitEn}>
              Available
            </RallyText>
            <RallyText variant="body" style={styles.splitTh}>
              แต้มที่ใช้ได้
            </RallyText>
            <Text style={styles.splitValue}>{available.toLocaleString()}</Text>
          </View>
          <View style={styles.splitCol}>
            <View style={styles.splitLockedLabel}>
              <MaterialCommunityIcons name="lock" size={10} color={walletTheme.muted} />
              <RallyText variant="head" lang="en" style={styles.splitEn}>
                Locked
              </RallyText>
            </View>
            <RallyText variant="body" style={styles.splitTh}>
              แต้มที่ล็อกอยู่ (เดิมพัน)
            </RallyText>
            <Text style={[styles.splitValue, styles.splitValueLocked]}>{locked.toLocaleString()}</Text>
          </View>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xxl,
    borderWidth: Arcade.border.panel,
    borderColor: walletTheme.arcadeCabinetEdge,
    backgroundColor: walletTheme.bgElevated,
    overflow: 'hidden',
    ...WALLET_HERO_SHADOW,
  },
  capStrip: {
    height: 6,
    backgroundColor: walletTheme.surface,
  },
  capStripFill: {
    height: '100%',
    backgroundColor: walletTheme.economy,
  },
  capStripFillFull: {
    width: '100%',
    shadowColor: walletTheme.economy,
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  body: {
    padding: Spacing.lg,
  },
  glow: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: walletTheme.economyGlow,
  },
  capRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  coin: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: walletTheme.economy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  capEn: {
    color: walletTheme.economy,
    fontSize: 13,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  capTh: {
    color: walletTheme.muted,
    fontSize: 11,
  },
  capReadout: {
    flex: 1,
    alignItems: 'flex-end',
  },
  // Mixed Thai + numbers: Thai base via RallyText body; digits nested in
  // Fonts.rounded + tabular (numbers never inherit the Thai face). No
  // lineHeight on Thai text — iOS drops combining marks (see HomeShortcutRail).
  capNumLine: {
    fontSize: 11,
    color: walletTheme.muted,
  },
  capNum: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Fonts?.rounded,
    fontVariant: ['tabular-nums'],
    color: walletTheme.muted,
  },
  capNumEarned: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: Fonts?.rounded,
    fontVariant: ['tabular-nums'],
    color: walletTheme.economy,
  },
  capFullChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: walletTheme.economy,
    borderRadius: Radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  capFullChipText: {
    fontSize: 10,
    color: walletTheme.onEconomy,
  },
  capErrorText: {
    fontSize: 10,
    color: walletTheme.mutedSoft,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.xs + 2,
    marginTop: Spacing.sm,
  },
  amount: {
    fontSize: 52,
    lineHeight: 52,
    fontWeight: '900',
    fontStyle: 'italic',
    fontFamily: Fonts?.rounded,
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
    color: walletTheme.economy,
  },
  unit: {
    fontSize: 15,
    fontWeight: '700',
    color: walletTheme.muted,
    marginBottom: 6,
  },
  splitRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: walletTheme.line,
  },
  splitCol: {
    flex: 1,
    gap: 1,
  },
  splitLockedLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  splitEn: {
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: walletTheme.muted,
  },
  splitTh: {
    fontSize: 9,
    color: walletTheme.mutedSoft,
  },
  splitValue: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
    fontFamily: Fonts?.rounded,
    fontVariant: ['tabular-nums'],
    color: walletTheme.ink,
  },
  splitValueLocked: {
    color: walletTheme.muted,
  },
})
