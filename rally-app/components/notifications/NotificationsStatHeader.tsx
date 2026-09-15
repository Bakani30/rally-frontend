import { StyleSheet, Text, View } from 'react-native'

import { Reveal } from '@/components/motion/Reveal'
import { ScreenBackButton } from '@/components/navigation/ScreenBackButton'
import { StatVault } from '@/components/arcade/StatVault'
import { Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'

type NotificationsStatHeaderProps = {
  /** Total items that need the user to act (invites + referee + reviews). */
  pendingCount: number
  topInset: number
}

/** Display title + single "งานค้าง" vault — FlashList ListHeaderComponent. */
export function NotificationsStatHeader({ pendingCount, topInset }: NotificationsStatHeaderProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)

  return (
    <Reveal style={[styles.block, { paddingTop: topInset + 12 }]}>
      <ScreenBackButton />
      <Text style={styles.title}>NOTIFICATIONS</Text>
      <View style={styles.vaultRow}>
        <StatVault label="งานค้าง" value={pendingCount} tone="attention" />
      </View>
    </Reveal>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    block: { gap: Spacing.md, paddingBottom: Spacing.lg },
    title: {
      fontSize: 34,
      fontWeight: '900',
      fontStyle: 'italic',
      color: theme.ink,
      letterSpacing: -0.5,
      lineHeight: 36,
    },
    vaultRow: { flexDirection: 'row' },
  })
}
