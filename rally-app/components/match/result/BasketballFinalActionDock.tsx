import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'

type BasketballFinalActionDockProps = {
  bottomInset: number
  rematchPending: boolean
  onRematch: () => void
  onAnalysis: () => void
}

export function BasketballFinalActionDock({
  bottomInset,
  rematchPending,
  onRematch,
  onAnalysis,
}: BasketballFinalActionDockProps) {
  const theme = useSportTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  return (
    <View
      pointerEvents="box-none"
      style={[styles.bottomPositioner, { bottom: Math.max(bottomInset, Spacing.sm) }]}
    >
      <View style={styles.dock} accessibilityLabel="เมนูผลการแข่งขัน">
          <PressableScale
            style={styles.secondaryAction}
            onPress={onRematch}
            disabled={rematchPending}
            accessibilityRole="button"
            accessibilityLabel={rematchPending ? 'กำลังส่งคำขอรีแมตช์' : 'รีแมตช์'}
            accessibilityState={{ disabled: rematchPending, busy: rematchPending }}
          >
            <MaterialCommunityIcons
              name={rematchPending ? 'clock-outline' : 'restart'}
              size={20}
              color={theme.chalk}
            />
            <Text style={styles.secondaryLabel} numberOfLines={1}>
              {rematchPending ? 'กำลังส่ง…' : 'รีแมตช์'}
            </Text>
          </PressableScale>

          <PressableScale
            style={styles.primaryAction}
            onPress={onAnalysis}
            accessibilityRole="button"
            accessibilityLabel="ดูวิเคราะห์การแข่งขัน"
          >
            <MaterialCommunityIcons name="chart-box-outline" size={20} color={theme.chalk} />
            <Text style={styles.primaryLabel}>วิเคราะห์</Text>
          </PressableScale>
      </View>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    bottomPositioner: {
      position: 'absolute',
      left: Spacing.md,
      right: Spacing.md,
      zIndex: 30,
    },
    dock: {
      minHeight: 64,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      borderRadius: Radius.xxl,
      borderWidth: 1,
      borderColor: theme.lineStrong,
      backgroundColor: theme.fightPanel,
      padding: 6,
      boxShadow: theme.shadowSoft,
    },
    secondaryAction: {
      flex: 1,
      minWidth: 0,
      minHeight: 50,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: theme.lineStrong,
      backgroundColor: theme.surfaceStrong,
      paddingHorizontal: Spacing.sm,
    },
    secondaryLabel: { color: theme.chalk, fontSize: 12, fontWeight: '900' },
    primaryAction: {
      flex: 1.08,
      minWidth: 0,
      minHeight: 50,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderRadius: Radius.lg,
      backgroundColor: theme.orange,
      paddingHorizontal: Spacing.sm,
    },
    primaryLabel: { color: theme.chalk, fontSize: 12, fontWeight: '900' },
  })
}
