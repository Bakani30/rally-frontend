import { Modal, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Sport, Spacing } from '@/constants/theme'
import type { RunRecapProfileGate } from '@/lib/run-insights'

type RunAnalysisGateModalProps = {
  visible: boolean
  gate: RunRecapProfileGate
  onDismiss: () => void
  onFillProfile: () => void
}

export function RunAnalysisGateModal({
  visible,
  gate,
  onDismiss,
  onFillProfile,
}: RunAnalysisGateModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <View style={styles.icon}>
              <MaterialCommunityIcons name="lock-check-outline" size={22} color={Sport.green} />
            </View>
            <PressableScale
              style={styles.closeButton}
              onPress={onDismiss}
              accessibilityRole="button"
              accessibilityLabel="ปิดหน้ากรอกข้อมูลวิเคราะห์"
            >
              <MaterialCommunityIcons name="close" size={18} color={Sport.inkSoft} />
            </PressableScale>
          </View>

          <Text style={styles.eyebrow}>วิเคราะห์การวิ่ง</Text>
          <Text style={styles.title}>เพิ่มข้อมูลเพื่อให้สรุปตรงขึ้น</Text>
          <Text style={styles.body}>
            ดูสรุปพื้นฐานได้อยู่แล้ว ข้อมูลส่วนตัวเหล่านี้ช่วยให้ Rally อ่าน pace, goal
            และ context ได้เฉพาะตัวขึ้น ข้อมูลนี้ไม่ใช้ตัดสินแต้ม อันดับ หรือผลแมตช์
          </Text>

          <View style={styles.progressRow}>
            <Text style={styles.progressText}>
              กรอกแล้ว {gate.completedCount}/{gate.requiredCount}
            </Text>
            <Text style={styles.progressMeta}>กรอกเท่าที่อยากให้ใช้ปรับคำแนะนำ</Text>
          </View>

          <View style={styles.missingRow}>
            {gate.missingFields.map((field) => (
              <View key={field.id} style={styles.missingChip}>
                <Text style={styles.missingText} numberOfLines={1}>
                  {field.label}
                </Text>
              </View>
            ))}
          </View>

          <PressableScale
            style={styles.primaryButton}
            onPress={onFillProfile}
            accessibilityRole="button"
            accessibilityLabel="เพิ่มข้อมูลเพื่อให้สรุปวิเคราะห์การวิ่งตรงขึ้น"
          >
            <MaterialCommunityIcons name="account-edit-outline" size={17} color={Sport.chalk} />
            <Text style={styles.primaryText}>เพิ่มข้อมูลส่วนตัว</Text>
          </PressableScale>
          <PressableScale style={styles.secondaryButton} onPress={onDismiss}>
            <Text style={styles.secondaryText}>ไว้ทีหลัง</Text>
          </PressableScale>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.74)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  modal: {
    width: '100%',
    maxWidth: 360,
    borderRadius: Radius.xxl,
    borderWidth: 1,
    borderColor: `${Sport.green}a3`,
    backgroundColor: Sport.bgElevated,
    padding: Spacing.lg,
    shadowColor: Sport.green,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.34,
    shadowRadius: 18,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Sport.greenSoft,
    borderWidth: 1,
    borderColor: `${Sport.green}85`,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Sport.surfaceStrong,
    borderWidth: 1,
    borderColor: Sport.line,
  },
  eyebrow: { color: Sport.green, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: Sport.ink, fontSize: 21, fontWeight: '900', marginTop: 4, lineHeight: 26 },
  body: { color: Sport.inkSoft, fontSize: 13, fontWeight: '700', lineHeight: 19, marginTop: 8 },
  progressRow: {
    marginTop: 14,
    padding: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Sport.line,
    backgroundColor: Sport.surface,
  },
  progressText: { color: Sport.ink, fontSize: 13, fontWeight: '900' },
  progressMeta: { color: Sport.muted, fontSize: 11, fontWeight: '800', marginTop: 3 },
  missingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  missingChip: {
    minHeight: 28,
    maxWidth: '100%',
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: Sport.surfaceStrong,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missingText: { color: Sport.ink, fontSize: 11, fontWeight: '900' },
  primaryButton: {
    minHeight: 48,
    borderRadius: Radius.lg,
    backgroundColor: Sport.green,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 14,
  },
  primaryText: { color: Sport.chalk, fontSize: 14, fontWeight: '900' },
  secondaryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  secondaryText: { color: Sport.muted, fontSize: 13, fontWeight: '800' },
})
