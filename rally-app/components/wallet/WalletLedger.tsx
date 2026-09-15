import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { RallyText } from '@/components/ui/RallyText'
import { Fonts, Radius, Spacing } from '@/constants/theme'
import type { WalletTxn } from '@/lib/wallet/walletTypes'
import { walletPanelStyles, walletTheme } from './walletVaultStyles'

type WalletLedgerProps = {
  transactions: WalletTxn[] | undefined
  isLoading: boolean
  isError: boolean
}

/**
 * Recent earn/spend ledger — gives the balance a story via +/− colored rows.
 * Presentational: the screen owns useWalletTransactions and passes the
 * query snapshot down.
 */
export function WalletLedger({ transactions, isLoading, isError }: WalletLedgerProps) {
  return (
    <View style={walletPanelStyles.panel}>
      <View style={walletPanelStyles.rowBetween}>
        <RallyText variant="head" lang="en" style={styles.headEn}>
          Recent
        </RallyText>
        <RallyText variant="body" style={styles.headTh}>
          รายการล่าสุด
        </RallyText>
      </View>

      {isLoading ? (
        [0, 1, 2].map((key) => (
          <View key={key} style={styles.row}>
            <View style={styles.skeletonIcon} />
            <View style={styles.skeletonLines}>
              <View style={[walletPanelStyles.skeletonBlock, { width: '60%' }]} />
              <View style={[walletPanelStyles.skeletonBlock, { width: '35%', marginTop: 4 }]} />
            </View>
          </View>
        ))
      ) : isError ? (
        <View style={styles.messageRow}>
          <MaterialCommunityIcons name="alert-circle-outline" size={14} color={walletTheme.muted} />
          <RallyText variant="body" style={styles.messageText}>
            โหลดรายการล่าสุดไม่ได้
          </RallyText>
        </View>
      ) : !transactions || transactions.length === 0 ? (
        <RallyText variant="body" style={styles.messageText}>
          ยังไม่มีรายการ
        </RallyText>
      ) : (
        transactions.map((txn) => <LedgerRow key={txn.id} txn={txn} />)
      )}
    </View>
  )
}

function LedgerRow({ txn }: { txn: WalletTxn }) {
  const isEarn = txn.kind === 'earn'
  const amountColor = isEarn ? walletTheme.greenVivid : walletTheme.red
  const amountText = `${isEarn ? '+' : '−'}${Math.abs(txn.amount).toLocaleString()}`

  return (
    <View style={styles.row}>
      <View style={styles.icon}>
        <MaterialCommunityIcons
          name={isEarn ? 'arrow-up-bold-circle-outline' : 'arrow-down-bold-circle-outline'}
          size={16}
          color={amountColor}
        />
      </View>
      <View style={styles.mid}>
        <RallyText variant="head" lang="en" style={styles.title} numberOfLines={1}>
          {txn.label}
        </RallyText>
        <RallyText variant="body" style={styles.subtitle}>
          {formatTxnDay(txn.createdAt)}
        </RallyText>
      </View>
      <Text style={[styles.amount, { color: amountColor }]}>{amountText}</Text>
    </View>
  )
}

// Pure Thai relative-day caption for a ledger row — cosmetic UI formatting
// (not a business rule), so it stays local to this component instead of a
// lib/ util (see components/CLAUDE.md).
function formatTxnDay(iso: string): string {
  const created = new Date(iso)
  if (Number.isNaN(created.getTime())) return ''
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(created)) / 86_400_000)
  if (diffDays <= 0) return 'วันนี้'
  if (diffDays === 1) return 'เมื่อวาน'
  return `${diffDays} วันก่อน`
}

const styles = StyleSheet.create({
  headEn: {
    color: walletTheme.ink,
    fontSize: 14,
  },
  headTh: {
    color: walletTheme.muted,
    fontSize: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: walletTheme.line,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    backgroundColor: walletTheme.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeletonIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    backgroundColor: walletTheme.surfaceStrong,
  },
  skeletonLines: {
    flex: 1,
    gap: 4,
  },
  mid: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  title: {
    fontSize: 13,
    color: walletTheme.ink,
  },
  subtitle: {
    fontSize: 10,
    color: walletTheme.muted,
  },
  amount: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: Fonts?.rounded,
    fontVariant: ['tabular-nums'],
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  messageText: {
    color: walletTheme.muted,
    fontSize: 11,
  },
})
