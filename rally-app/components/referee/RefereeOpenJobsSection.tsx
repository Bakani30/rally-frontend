import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Fonts, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'

export function RefereeOpenJobsSection() {
  const theme = useSportTheme()
  const styles = createStyles(theme)

  return (
    <View style={styles.card}>
      <View style={styles.iconBox}>
        <MaterialCommunityIcons name="store-search-outline" size={20} color={theme.muted} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>รับงานเอง</Text>
        <Text style={styles.hint}>ตอนนี้งานกรรมการยังส่งผ่านคำเชิญจากเจ้าของห้อง</Text>
      </View>
      <View style={styles.comingPill}>
        <Text style={styles.comingText}>เร็ว ๆ นี้</Text>
      </View>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface,
      padding: Spacing.lg,
    },
    iconBox: {
      width: 40,
      height: 40,
      borderRadius: Radius.lg,
      backgroundColor: theme.surfaceStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    copy: { flex: 1, minWidth: 0, gap: 2 },
    title: { color: theme.ink, fontSize: 14, fontWeight: '900', fontFamily: Fonts?.thaiHead },
    hint: { color: theme.muted, fontSize: 12, fontWeight: '700', lineHeight: 18, fontFamily: Fonts?.thaiBody },
    comingPill: {
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: theme.amber,
      backgroundColor: theme.amberSoft,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    comingText: { color: theme.amber, fontSize: 10, fontWeight: '900', fontFamily: Fonts?.thaiMedium },
  })
}
