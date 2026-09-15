import { MaterialCommunityIcons } from '@expo/vector-icons'
import { StyleSheet, Text, View } from 'react-native'

import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'

export function MatchHistoryImpactError({
  retrying,
  onRetry,
}: {
  retrying: boolean
  onRetry: () => void
}) {
  const theme = useSportTheme()
  const styles = createStyles(theme)

  return (
    <View style={styles.banner} accessibilityRole="alert">
      <MaterialCommunityIcons name="cloud-alert-outline" size={18} color={theme.red} />
      <Text style={styles.message}>ยังโหลดแต้ม เดิมพัน และแรงค์ของประวัตินี้ไม่ได้</Text>
      <PressableScale
        style={[styles.retry, retrying && styles.disabled]}
        onPress={onRetry}
        disabled={retrying}
        accessibilityRole="button"
      >
        <Text style={styles.retryText}>{retrying ? 'กำลังลองใหม่…' : 'ลองอีกครั้ง'}</Text>
      </PressableScale>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      minHeight: 52,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: theme.redSoft,
      backgroundColor: theme.surface,
      padding: Spacing.sm,
    },
    message: { flex: 1, color: theme.inkSoft, fontSize: 11, lineHeight: 16, fontWeight: '700' },
    retry: {
      minHeight: 44,
      justifyContent: 'center',
      borderRadius: Radius.md,
      backgroundColor: theme.orange,
      paddingHorizontal: Spacing.md,
    },
    retryText: { color: theme.chalk, fontSize: 11, fontWeight: '900' },
    disabled: { opacity: 0.55 },
  })
}
