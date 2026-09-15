import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { PressableScale } from '@/components/motion/PressableScale'
import { Sport, type RunArenaPalette as RunArenaColors } from '@/constants/theme'
import { useRunArenaTheme } from '@/hooks/useAppTheme'
import type { RunRecapProfileGate } from '@/lib/run-insights'

type RunRecapEntryCardProps = {
  gate: RunRecapProfileGate
  isChecking: boolean
  isOpen: boolean
  onCompleteProfile: () => void
  onOpenRecap: () => void
  onCloseRecap: () => void
}

export function RunRecapEntryCard({
  gate,
  isChecking,
  isOpen,
  onCompleteProfile,
  onOpenRecap,
  onCloseRecap,
}: RunRecapEntryCardProps) {
  const palette = useRunArenaTheme()
  const styles = useMemo(() => createStyles(palette), [palette])
  const locked = !isChecking && gate.status === 'locked'
  const missingPreview = gate.missingFields.slice(0, 3)
  const hiddenMissingCount = Math.max(0, gate.missingFields.length - missingPreview.length)

  return (
    <View style={[styles.card, locked ? styles.cardLocked : null]}>
      <View style={[styles.iconBox, locked ? styles.iconBoxLocked : null]}>
        <MaterialCommunityIcons
          name={locked ? 'lock-outline' : 'clipboard-pulse-outline'}
          size={20}
          color={locked ? Sport.amber : palette.trust}
        />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.eyebrow, locked ? styles.eyebrowLocked : null]}>
          {locked ? 'เพิ่มข้อมูล' : 'โค้ชสรุป'}
        </Text>
        <Text style={[styles.title, locked ? styles.titleLocked : null]}>
          {isChecking
            ? 'กำลังเช็คโปรไฟล์ส่วนตัว'
            : locked
              ? 'เพิ่มข้อมูลเพื่อสรุปแม่นขึ้น'
              : isOpen
                ? 'เปิดสรุปอยู่'
                : 'เปิดวิเคราะห์เมื่อพร้อม'}
        </Text>
        <Text style={[styles.body, locked ? styles.bodyLocked : null]} numberOfLines={2}>
          {locked
            ? 'ดู recap พื้นฐานได้อยู่แล้ว ข้อมูลนี้ช่วยให้คำแนะนำตรงขึ้น'
            : 'พร้อมอ่านเมื่อคุณกดเปิด ไม่ใช้ตัดสินแต้ม อันดับ หรือผลแมตช์'}
        </Text>

        {locked && !isChecking ? (
          <View style={styles.missingRow}>
            {missingPreview.map((field) => (
              <View key={field.id} style={styles.missingChip}>
                <Text style={styles.missingChipText} numberOfLines={1}>{field.label}</Text>
              </View>
            ))}
            {hiddenMissingCount > 0 ? (
              <View style={styles.missingChip}>
                <Text style={styles.missingChipText}>+{hiddenMissingCount}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      <PressableScale
        style={[
          styles.actionButton,
          locked ? styles.actionButtonLocked : null,
          isChecking ? styles.actionButtonDisabled : null,
        ]}
        disabled={isChecking}
        onPress={locked ? onCompleteProfile : isOpen ? onCloseRecap : onOpenRecap}
        accessibilityLabel={locked ? 'เพิ่มข้อมูลส่วนตัวเพื่อให้โค้ชสรุปแม่นขึ้น' : isOpen ? 'ซ่อนสรุปจากโค้ช' : 'เปิดสรุปจากโค้ช'}
      >
        <MaterialCommunityIcons
          name={locked ? 'account-edit-outline' : isOpen ? 'chevron-up' : 'book-open-page-variant-outline'}
          size={17}
          color={locked ? palette.text : palette.chalk}
        />
        <Text style={[styles.actionText, locked ? styles.actionTextLocked : null]} numberOfLines={1}>
          {locked ? 'เพิ่ม' : isOpen ? 'ซ่อน' : 'เปิด'}
        </Text>
      </PressableScale>
    </View>
  )
}

function createStyles(palette: RunArenaColors) {
  return StyleSheet.create({
    card: {
      minHeight: 96,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: palette.primaryLine,
      backgroundColor: palette.surfaceRaised,
      padding: 14,
      marginBottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    cardLocked: {
      borderColor: 'rgba(234,195,26,0.52)',
      backgroundColor: palette.surfaceRaised,
    },
    iconBox: {
      width: 42,
      height: 42,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.primaryLine,
      backgroundColor: palette.trustSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconBoxLocked: {
      borderColor: 'rgba(234,195,26,0.44)',
      backgroundColor: 'rgba(234,195,26,0.14)',
    },
    copy: {
      flex: 1,
      minWidth: 0,
    },
    eyebrow: {
      color: palette.trust,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 0,
    },
    eyebrowLocked: {
      color: Sport.amber,
    },
    title: {
      color: palette.text,
      fontSize: 16,
      fontWeight: '900',
      marginTop: 2,
    },
    titleLocked: {
      color: palette.text,
    },
    body: {
      color: palette.textMuted,
      fontSize: 12,
      fontWeight: '700',
      lineHeight: 17,
      marginTop: 3,
    },
    bodyLocked: {
      color: palette.textMuted,
    },
    missingRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 8,
    },
    missingChip: {
      minHeight: 24,
      maxWidth: 128,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: 'rgba(234,195,26,0.42)',
      backgroundColor: 'rgba(234,195,26,0.10)',
      paddingHorizontal: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    missingChipText: {
      color: palette.text,
      fontSize: 10,
      fontWeight: '900',
    },
    actionButton: {
      minWidth: 78,
      minHeight: 46,
      borderRadius: 16,
      backgroundColor: palette.trust,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
      gap: 2,
    },
    actionButtonLocked: {
      backgroundColor: 'rgba(234,195,26,0.14)',
      borderWidth: 1,
      borderColor: 'rgba(234,195,26,0.48)',
    },
    actionButtonDisabled: {
      opacity: 0.58,
    },
    actionText: {
      color: palette.chalk,
      fontSize: 11,
      fontWeight: '900',
    },
    actionTextLocked: {
      color: palette.text,
    },
  })
}
