import { Pressable, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'

type LeaderboardErrorProps = {
  onRetry: () => void
}

export function LeaderboardError({ onRetry }: LeaderboardErrorProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)

  return (
    <View style={styles.wrap}>
      <MaterialCommunityIcons name="cloud-alert" size={36} color={theme.red} />
      <Text style={styles.title}>โหลด ranking ไม่สำเร็จ</Text>
      <Text style={styles.hint}>เช็กการเชื่อมต่อแล้วลองอีกครั้ง</Text>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="ลองโหลด ranking อีกครั้ง"
        style={({ pressed }) => [styles.button, { opacity: pressed ? 0.78 : 1 }]}
      >
        <MaterialCommunityIcons name="refresh" size={18} color="#FFFFFF" />
        <Text style={styles.buttonText}>ลองใหม่</Text>
      </Pressable>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    wrap: {
      alignItems: 'center',
      paddingHorizontal: 32,
      paddingTop: 40,
      paddingBottom: 32,
      gap: 8,
    },
    title: { fontSize: 16, fontWeight: '800', color: theme.ink, textAlign: 'center' },
    hint: { fontSize: 13, color: theme.muted, textAlign: 'center' },
    button: {
      minHeight: 44,
      marginTop: 8,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: theme.red,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  })
}
