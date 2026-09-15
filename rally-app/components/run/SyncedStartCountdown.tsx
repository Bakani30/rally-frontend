import { StyleSheet, Text, View } from 'react-native'
import type { RunArenaPalette as RunArenaColors } from '@/constants/theme'

/**
 * Full-screen countdown to a shared multiplayer GO. Unlike the solo 3-2-1, the
 * number is driven by wall-clock seconds remaining to `started_at + buffer`, so
 * every device reaches zero at the same instant. Purely presentational — the
 * screen owns the timer and fires `start()` when the shared moment arrives.
 */
type SyncedStartCountdownProps = {
  visible: boolean
  seconds: number
  /** True once the shared moment passed but this device is still acquiring GPS. */
  waitingForGps?: boolean
  palette: RunArenaColors
}

export function SyncedStartCountdown({ visible, seconds, waitingForGps, palette }: SyncedStartCountdownProps) {
  if (!visible) return null
  return (
    <View style={styles.overlay} pointerEvents="auto">
      <Text style={styles.label}>เริ่มพร้อมกัน</Text>
      {waitingForGps ? (
        <>
          <Text style={[styles.number, { color: palette.primary, fontSize: 40, lineHeight: 46 }]}>รอ GPS…</Text>
          <Text style={styles.caption}>จับตำแหน่งได้แล้วจะเริ่มให้อัตโนมัติ</Text>
        </>
      ) : (
        <>
          <Text style={[styles.number, { color: palette.primary }]}>{Math.max(1, seconds)}</Text>
          <Text style={styles.caption}>ทุกเครื่องนับถอยหลังจากเวลาเดียวกัน</Text>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: 'rgba(18,22,16,0.82)',
  },
  label: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: '#2fe39a',
  },
  number: {
    fontSize: 108,
    fontWeight: '900',
    fontStyle: 'italic',
    lineHeight: 112,
    fontVariant: ['tabular-nums'],
  },
  caption: { fontSize: 12, color: 'rgba(255,255,255,0.72)' },
})
