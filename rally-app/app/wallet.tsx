import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { Link } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { Screen } from '@/components/layout/Screen'
import { PressableScale } from '@/components/motion/PressableScale'
import { ScreenBackButton } from '@/components/navigation/ScreenBackButton'
import { RallyText } from '@/components/ui/RallyText'
import { WalletLedger } from '@/components/wallet/WalletLedger'
import { WalletVaultCard } from '@/components/wallet/WalletVaultCard'
import { walletTheme } from '@/components/wallet/walletVaultStyles'
import { Arcade, onAccent, RallyAccent, Radius, Spacing } from '@/constants/theme'
import { useAuth } from '@/hooks/useAuth'
import { useDailyEarnCap } from '@/hooks/useDailyEarnCap'
import { useWalletSummary } from '@/hooks/useWalletSummary'
import { useWalletTransactions } from '@/hooks/useWalletTransactions'

// Wallet is an economy/stake surface: it renders as a fixed DARK vault in both
// light and dark app-theme mode (see rally-app/CLAUDE.md palette rules), so
// every color below comes from `walletTheme` (constants/theme.ts, forced dark)
// rather than useSportTheme().
export default function WalletScreen() {
  const { user } = useAuth()
  const { data, isPending, error } = useWalletSummary(user?.id)
  const { data: cap, isError: capIsError } = useDailyEarnCap(user?.id)
  const { data: transactions, isPending: txnPending, isError: txnIsError } = useWalletTransactions(user?.id)

  const wallet = data?.wallet
  const hasPro = data?.hasPro ?? false
  const proExpiresAt = data?.proSubscription?.current_period_ends_at ?? null

  if (isPending) {
    return <ActivityIndicator style={styles.loader} color={walletTheme.chalk} />
  }
  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          {error instanceof Error ? error.message : 'Could not load wallet.'}
        </Text>
      </View>
    )
  }

  return (
    <Screen
      edges={['top', 'bottom']}
      backgroundColor={walletTheme.bg}
      bottomPad={48}
      contentContainerStyle={styles.container}
    >
      <ScreenBackButton
        iconColor={walletTheme.ink}
        backgroundColor={walletTheme.surface}
        borderColor={walletTheme.line}
      />

      <View style={styles.headerRow}>
        <View>
          <RallyText variant="head" lang="en" style={styles.titleEn}>
            Your Wallet
          </RallyText>
          <RallyText variant="body" style={styles.titleTh}>
            กระเป๋าตังของคุณ
          </RallyText>
        </View>
        <View style={[styles.statusPill, hasPro ? styles.statusPro : styles.statusFree]}>
          <MaterialCommunityIcons
            name={hasPro ? 'crown' : 'crown-outline'}
            size={12}
            color={hasPro ? walletTheme.economy : walletTheme.muted}
          />
          <Text style={[styles.statusText, { color: hasPro ? walletTheme.economy : walletTheme.muted }]}>
            {hasPro ? 'PRO' : 'FREE'}
          </Text>
        </View>
      </View>

      <WalletVaultCard
        totalPoints={wallet?.spendable_points ?? 0}
        availablePoints={wallet?.available_spendable ?? 0}
        lockedPoints={wallet?.locked_points ?? 0}
        cap={cap}
        capIsError={capIsError}
      />

      {hasPro && proExpiresAt && (
        <Text style={styles.subHint}>Pro renews {new Date(proExpiresAt).toLocaleDateString()}</Text>
      )}

      <View style={styles.actionsRow}>
        <Link href="/quests" asChild>
          <PressableScale style={styles.actionEarn}>
            <RallyText variant="head" lang="en" style={styles.actionEarnEn}>
              Earn
            </RallyText>
            <RallyText variant="body" style={styles.actionEarnTh}>
              หาแต้ม
            </RallyText>
          </PressableScale>
        </Link>
        <Link href="/redeem" asChild>
          <PressableScale style={styles.actionRedeem}>
            <RallyText variant="head" lang="en" style={styles.actionRedeemEn}>
              Redeem
            </RallyText>
            <RallyText variant="body" style={styles.actionRedeemTh}>
              แลกของ
            </RallyText>
          </PressableScale>
        </Link>
      </View>

      <WalletLedger transactions={transactions} isLoading={txnPending} isError={txnIsError} />
    </Screen>
  )
}

const REDEEM_INK = onAccent(RallyAccent.indigo)

const styles = StyleSheet.create({
  loader: { flex: 1, backgroundColor: walletTheme.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl, backgroundColor: walletTheme.bg },
  errorText: { color: walletTheme.red },
  container: { paddingHorizontal: Spacing.xl, gap: Spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  titleEn: { fontSize: 22, color: walletTheme.ink, letterSpacing: -0.3 },
  titleTh: { fontSize: 11, color: walletTheme.muted, marginTop: 3 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: Radius.pill, borderWidth: 1,
  },
  statusPro: { backgroundColor: walletTheme.economySoft, borderColor: `${walletTheme.economy}66` },
  statusFree: { backgroundColor: walletTheme.surface, borderColor: walletTheme.line },
  statusText: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  subHint: { fontSize: 12, color: walletTheme.muted, textAlign: 'center', letterSpacing: 0.3 },
  actionsRow: { flexDirection: 'row', gap: Spacing.sm },
  actionEarn: {
    flex: 1, minHeight: Arcade.cta.height, borderRadius: Radius.lg,
    backgroundColor: walletTheme.economy,
    alignItems: 'center', justifyContent: 'center', gap: 1,
  },
  actionEarnEn: { color: walletTheme.onEconomy, fontSize: 13 },
  actionEarnTh: { color: walletTheme.onEconomy, fontSize: 9, opacity: 0.85 },
  actionRedeem: {
    flex: 1, minHeight: Arcade.cta.height, borderRadius: Radius.lg,
    backgroundColor: RallyAccent.indigo,
    alignItems: 'center', justifyContent: 'center', gap: 1,
  },
  actionRedeemEn: { color: REDEEM_INK, fontSize: 13 },
  actionRedeemTh: { color: REDEEM_INK, fontSize: 9, opacity: 0.85 },
})
