import { memo } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Sport } from '@/constants/theme'

type Props = {
  visible: boolean
  onDismiss: () => void
  /** Open the OS battery-optimization surface (No restrictions / ไม่จำกัด). */
  onRequestNoRestrictions: () => void
}

function BatteryOptModalInner({ visible, onDismiss, onRequestNoRestrictions }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconRow}>
            <MaterialCommunityIcons name="battery-alert" size={28} color={Sport.amber} />
          </View>
          <Text style={styles.title}>Rally อาจถูกหยุดระหว่างวิ่ง</Text>
          <Text style={styles.body}>
            มือถือของคุณมีการปิดแอพที่ทำงานอยู่เบื้องหลังเพื่อประหยัดแบตฯ ซึ่งอาจทำให้ GPS ขาดหายระหว่างวิ่ง
          </Text>
          <Text style={styles.body}>
            {'กด "ไม่จำกัดแบต" แล้วเลือก Rally → "No restrictions" หรือ "ไม่จำกัด" เพื่อให้ GPS ต่อเนื่องตลอดการวิ่ง'}
          </Text>
          <View style={styles.actions}>
            <Pressable style={[styles.button, styles.btnSecondary]} onPress={onDismiss}>
              <Text style={styles.secondaryText}>เข้าใจแล้ว</Text>
            </Pressable>
            <Pressable style={[styles.button, styles.btnPrimary]} onPress={onRequestNoRestrictions}>
              <MaterialCommunityIcons name="battery-heart-variant" size={18} color={Sport.bg} />
              <Text style={styles.primaryText}>ไม่จำกัดแบต</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    backgroundColor: Sport.bgElevated,
    borderWidth: 1,
    borderColor: Sport.amber,
    padding: 20,
    gap: 14,
  },
  iconRow: { alignItems: 'center' },
  title: { color: Sport.ink, fontSize: 18, fontWeight: '900', textAlign: 'center' },
  body: { color: Sport.inkSoft, fontSize: 13, fontWeight: '700', lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  button: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  btnPrimary: { backgroundColor: Sport.amber },
  btnSecondary: { backgroundColor: Sport.bgElevated, borderWidth: 1, borderColor: Sport.line },
  primaryText: { color: Sport.bg, fontSize: 15, fontWeight: '900' },
  secondaryText: { color: Sport.ink, fontSize: 14, fontWeight: '800' },
})

export const BatteryOptModal = memo(BatteryOptModalInner)
