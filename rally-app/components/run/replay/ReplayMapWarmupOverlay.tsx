import { MaterialCommunityIcons } from '@expo/vector-icons'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { RallyBrandMark } from '@/components/run/brand/RallyBrandMark'
import { RallyPalette } from '@/constants/theme'

export type ReplayMapWarmupOverlayProps = {
  visible: boolean
  completed: number
  total: number
  onClose: () => void
}

export function ReplayMapWarmupOverlay({
  visible,
  completed,
  total,
  onClose,
}: ReplayMapWarmupOverlayProps) {
  if (!visible) return null

  const safeTotal = Math.max(0, total)
  const safeCompleted = Math.min(Math.max(0, completed), safeTotal)
  const progress = safeTotal > 0 ? safeCompleted / safeTotal : 0

  return (
    <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="ปิด"
        hitSlop={8}
        style={styles.closeButton}
        onPress={onClose}
      >
        <MaterialCommunityIcons name="close" size={24} color="#23302d" />
      </Pressable>

      <View style={styles.content}>
        <RallyBrandMark size={58} treatment="on-light" />
        <ActivityIndicator size="small" color={RallyPalette.blue} />
        <View style={styles.copy}>
          <Text style={styles.title}>กำลังเตรียม Apple Maps 3D</Text>
          <Text style={styles.note}>โหลดอาคาร ต้นไม้ ถนน และรายละเอียดตลอดเส้นทางก่อนเริ่มรีเพลย์</Text>
        </View>
        {safeTotal > 0 && (
          <View
            style={styles.progressGroup}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: safeTotal, now: safeCompleted }}
          >
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={styles.progressText}>{safeCompleted}/{safeTotal}</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    backgroundColor: '#eef2ec',
    padding: 16,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    paddingHorizontal: 28,
    paddingBottom: 56,
  },
  copy: { alignItems: 'center', gap: 8 },
  title: { color: '#1c2321', fontSize: 20, fontWeight: '900', textAlign: 'center' },
  note: { color: '#5a6b63', fontSize: 13, fontWeight: '600', lineHeight: 19, textAlign: 'center' },
  progressGroup: { width: '100%', maxWidth: 260, alignItems: 'center', gap: 8 },
  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: 'rgba(128,139,195,0.22)',
  },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: RallyPalette.blue },
  progressText: { color: '#5a6b63', fontSize: 12, fontWeight: '800', fontVariant: ['tabular-nums'] },
})
