import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { ProofPicker } from '@/components/match/ProofPicker'
import { getSportPalette, Radius, Spacing, type SportPalette } from '@/constants/theme'
import type { LocalProofAsset } from '@/lib/match/proofUploadService'

type TeamResultChallengeModalProps = {
  visible: boolean
  mode?: 'formal_challenge' | 'referee_correction'
  pending?: boolean
  note: string
  assets: LocalProofAsset[]
  onChangeNote: (note: string) => void
  onChangeAssets: (assets: LocalProofAsset[]) => void
  onSubmit: () => void
  onCancel: () => void
}

export function TeamResultChallengeModal({
  visible,
  mode = 'formal_challenge',
  pending = false,
  note,
  assets,
  onChangeNote,
  onChangeAssets,
  onSubmit,
  onCancel,
}: TeamResultChallengeModalProps) {
  const theme = getSportPalette('dark')
  const styles = createStyles(theme)

  const canSubmit = note.trim().length > 0 && !pending
  const isCorrection = mode === 'referee_correction'

  function handleCancel() {
    if (!pending) onCancel()
  }

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={handleCancel}>
      <View style={styles.backdrop}>
        <Pressable style={styles.scrim} onPress={handleCancel} />
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={[styles.iconBadge, isCorrection && styles.iconBadgeCorrection]}>
              <MaterialCommunityIcons
                name={isCorrection ? 'pencil-circle-outline' : 'shield-alert-outline'}
                size={20}
                color={isCorrection ? theme.amber : theme.red}
              />
            </View>
            <View style={styles.titleBlock}>
              <Text style={styles.title}>{isCorrection ? 'ขอให้กรรมการแก้' : 'รายงานปัญหา'}</Text>
              <Text style={styles.hint}>
                {isCorrection
                  ? 'ส่ง note ให้กรรมการตรวจและส่งผลใหม่ก่อนยืนยัน'
                  : 'ส่งเหตุผลให้แอดมินรีวิว คะแนนและ stake จะค้างไว้ก่อน'}
              </Text>
            </View>
          </View>

          <TextInput
            value={note}
            onChangeText={onChangeNote}
            placeholder={isCorrection ? 'บอกคะแนนหรือ stat ที่ต้องแก้' : 'ระบุคะแนนที่ถูกต้องหรือจุดที่ไม่ตรง'}
            placeholderTextColor={theme.mutedSoft}
            style={styles.noteInput}
            multiline
            textAlignVertical="top"
            editable={!pending}
          />

          {isCorrection ? null : (
            <ProofPicker
              assets={assets}
              onChange={onChangeAssets}
              max={5}
              allowVideos
              label="proof files"
            />
          )}

          <View style={styles.actions}>
            <PressableScale style={styles.cancelButton} onPress={handleCancel} disabled={pending}>
              <Text style={styles.cancelText}>ปิด</Text>
            </PressableScale>
            <PressableScale
              style={[styles.submitButton, !canSubmit && styles.disabled]}
              onPress={onSubmit}
              disabled={!canSubmit}
            >
              <Text style={styles.submitText}>{pending ? 'กำลังส่ง…' : isCorrection ? 'ส่งให้กรรมการ' : 'รีพอต'}</Text>
            </PressableScale>
          </View>
        </View>
      </View>
    </Modal>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.66)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing.lg,
    },
    scrim: {
      ...StyleSheet.absoluteFillObject,
    },
    card: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: theme.bgElevated,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: theme.line,
      padding: Spacing.lg,
      gap: Spacing.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    iconBadge: {
      width: 42,
      height: 42,
      borderRadius: Radius.lg,
      backgroundColor: theme.redSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconBadgeCorrection: {
      backgroundColor: theme.amberSoft,
    },
    titleBlock: { flex: 1, gap: 2 },
    title: {
      color: theme.ink,
      fontSize: 18,
      fontWeight: '900',
    },
    hint: {
      color: theme.muted,
      fontSize: 12,
      lineHeight: 17,
    },
    noteInput: {
      minHeight: 112,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surfaceStrong,
      color: theme.ink,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      fontSize: 14,
      lineHeight: 20,
    },
    actions: {
      flexDirection: 'row',
      gap: 10,
    },
    cancelButton: {
      flex: 1,
      minHeight: 46,
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surfaceStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelText: {
      color: theme.inkSoft,
      fontSize: 13,
      fontWeight: '900',
    },
    submitButton: {
      flex: 1,
      minHeight: 46,
      borderRadius: Radius.pill,
      backgroundColor: theme.red,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitText: {
      color: theme.ink,
      fontSize: 13,
      fontWeight: '900',
    },
    disabled: { opacity: 0.6 },
  })
}
