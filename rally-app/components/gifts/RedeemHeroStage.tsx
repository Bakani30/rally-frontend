import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { PressableScale } from '@/components/motion/PressableScale'
import { PointsIcon } from '@/components/economy/PointsIcon'
import { Fonts, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useI18n } from '@/hooks/useI18n'
import { giftsDictionary } from '@/lib/i18n/dictionaries/gifts'

type RedeemHeroStageProps = {
  availablePoints: number
  availableCredits: number
  walletStatus: 'loading' | 'ready' | 'unavailable'
  pendingRedemptions: number
  onBack: () => void
  onOpenWallet: () => void
  onOpenHistory: () => void
  onOpenProfileStudio: () => void
}

export function RedeemHeroStage({
  availablePoints,
  availableCredits,
  walletStatus,
  pendingRedemptions,
  onBack,
  onOpenWallet,
  onOpenHistory,
  onOpenProfileStudio,
}: RedeemHeroStageProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { t } = useI18n(giftsDictionary)

  return (
    <View style={styles.wrap}>
      <View style={styles.topBar}>
        <PressableScale
          style={styles.headerIcon}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={t('back')}
        >
          <MaterialCommunityIcons name="chevron-left" size={26} color={theme.ink} />
        </PressableScale>
        <View style={styles.headerSpacer} />
        <View style={styles.headerActions}>
          <PressableScale
            style={styles.headerAction}
            onPress={onOpenProfileStudio}
            accessibilityRole="button"
            accessibilityLabel={t('profileStudio')}
          >
            <MaterialCommunityIcons name="palette-outline" size={20} color={theme.ink} />
          </PressableScale>
          <PressableScale
            style={styles.headerAction}
            onPress={onOpenHistory}
            accessibilityRole="button"
            accessibilityLabel={t('myRewards')}
          >
            <MaterialCommunityIcons name="gift-outline" size={20} color={theme.ink} />
          </PressableScale>
        </View>
      </View>

      <PressableScale
        style={styles.balanceStrip}
        onPress={onOpenWallet}
        accessibilityRole="button"
        accessibilityLabel={
          walletStatus === 'ready'
            ? t('openWalletValues', {
                points: availablePoints.toLocaleString(),
                credits: availableCredits.toLocaleString(),
              })
            : t(walletStatus === 'loading' ? 'walletLoading' : 'walletUnavailable')
        }
      >
        <View style={styles.pointsBalance}>
          <Text style={styles.balanceLabel}>{t('points')}</Text>
          <View style={styles.pointsValueRow}>
            <PointsIcon size={24} />
            <Text style={styles.pointsValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
              {walletStatus === 'ready' ? availablePoints.toLocaleString() : '—'}
            </Text>
            <Text style={styles.pointsUnit}>{t('pointsUnit')}</Text>
          </View>
        </View>

        <View style={styles.balanceDivider} />

        <View style={styles.creditBalance}>
          <Text style={styles.creditLabel}>{t('credits')}</Text>
          <Text style={styles.creditValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {walletStatus === 'ready' ? availableCredits.toLocaleString() : '—'}
          </Text>
        </View>

        <MaterialCommunityIcons name="chevron-right" size={22} color={theme.fightBg} />
      </PressableScale>

      {walletStatus !== 'ready' ? (
        <Text style={[styles.walletStatus, walletStatus === 'unavailable' && styles.walletStatusError]} maxFontSizeMultiplier={1.5} accessibilityRole="alert">
          {walletStatus === 'loading' ? t('walletLoading') : t('walletUnavailable')}
        </Text>
      ) : null}

      {pendingRedemptions > 0 ? (
        <PressableScale
          style={styles.pendingRow}
          onPress={onOpenHistory}
          accessibilityRole="button"
          accessibilityLabel={`${pendingRedemptions} ${t('pending')}`}
        >
          <View style={styles.pendingCopy}>
            <MaterialCommunityIcons name="progress-clock" size={16} color={theme.amber} />
            <Text style={styles.pendingText} maxFontSizeMultiplier={1.4}>{pendingRedemptions} {t('pending')}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={18} color={theme.orange} />
        </PressableScale>
      ) : null}
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    wrap: {
      gap: Spacing.sm,
    },
    topBar: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    headerIcon: {
      width: 44,
      height: 44,
      borderRadius: Radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface,
    },
    headerSpacer: { flex: 1 },
    headerActions: { flexDirection: 'row', gap: 4 },
    headerAction: {
      width: 44,
      height: 44,
      borderRadius: Radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface,
    },
    balanceStrip: {
      minHeight: 88,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      borderRadius: Radius.xl,
      backgroundColor: theme.orange,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
    },
    pointsBalance: {
      flex: 1,
      minWidth: 0,
      gap: 3,
    },
    balanceLabel: {
      color: theme.fightBg,
      fontSize: 10,
      lineHeight: 14,
      fontWeight: '900',
    },
    pointsValueRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 6,
      minWidth: 0,
    },
    pointsValue: {
      flexShrink: 1,
      color: theme.fightBg,
      fontFamily: Fonts?.number,
      fontSize: 32,
      lineHeight: 37,
      fontWeight: '900',
      fontVariant: ['tabular-nums'],
    },
    pointsUnit: {
      color: theme.fightBg,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: '900',
    },
    balanceDivider: {
      width: 1,
      height: 48,
      backgroundColor: theme.fightBg,
      opacity: 0.3,
    },
    creditBalance: {
      flexBasis: 72,
      flexGrow: 0,
      flexShrink: 1,
      minWidth: 54,
      gap: 4,
    },
    creditLabel: {
      color: theme.fightBg,
      fontSize: 10,
      lineHeight: 14,
      fontWeight: '900',
    },
    creditValue: {
      color: theme.fightBg,
      fontFamily: Fonts?.number,
      fontSize: 19,
      lineHeight: 23,
      fontWeight: '900',
      fontVariant: ['tabular-nums'],
    },
    walletStatus: { color: theme.muted, fontSize: 11, lineHeight: 16, fontWeight: '800', paddingHorizontal: Spacing.xs },
    walletStatusError: { color: theme.red },
    pendingRow: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface,
      paddingHorizontal: Spacing.md,
    },
    pendingCopy: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    pendingText: { color: theme.ink, fontSize: 12, lineHeight: 17, fontWeight: '900' },
  })
}
