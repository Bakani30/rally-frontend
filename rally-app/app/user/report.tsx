import { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useReportUser } from '@/hooks/useUserSafety'
import type { ReportReason } from '@/lib/users/userSafetyTypes'

const REASONS: { value: ReportReason; label: string; description: string }[] = [
  { value: 'harassment', label: 'การคุกคาม / กลั่นแกล้ง', description: 'พฤติกรรมข่มขู่ คุกคาม หรือพูดจารุนแรง' },
  { value: 'cheating', label: 'โกง / แต้มไม่ชอบมาพากล', description: 'ผลแมตช์ปลอม ใช้บอท หรือเล่นไม่ตรงกติกา' },
  { value: 'impersonation', label: 'ปลอมตัว', description: 'แอบอ้างเป็นบุคคลอื่นหรือทีมอื่น' },
  { value: 'spam', label: 'สแปม / โฆษณา', description: 'ส่งข้อความสแปม โฆษณา หรือลิงก์ไม่พึงประสงค์' },
  { value: 'inappropriate_content', label: 'เนื้อหาไม่เหมาะสม', description: 'รูปโปรไฟล์ ชื่อ หรือเนื้อหาที่ขัดกับกติกาชุมชน' },
  { value: 'underage', label: 'ผู้เยาว์', description: 'สงสัยว่าเป็นผู้ใช้ที่อายุต่ำกว่าเกณฑ์' },
  { value: 'other', label: 'อื่นๆ', description: 'กรุณาระบุรายละเอียดในช่องบันทึก' },
]

export default function ReportUserScreen() {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { id } = useLocalSearchParams<{ id: string }>()
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [note, setNote] = useState('')
  const mutation = useReportUser()

  const canSubmit = useMemo(
    () => !!reason && !!id && !mutation.isPending,
    [reason, id, mutation.isPending],
  )

  async function submit() {
    if (!id || !reason) return
    try {
      await mutation.mutateAsync({
        reportedUserId: id,
        reason,
        note: note.trim() || null,
      })
      Alert.alert(
        'รายงานเรียบร้อย',
        'ทีมงานได้รับเรื่องแล้วและจะทบทวนตามขั้นตอน ขอบคุณที่ช่วยดูแลชุมชน',
        [{ text: 'ตกลง', onPress: () => router.back() }],
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'ส่งรายงานไม่สำเร็จ'
      Alert.alert('ส่งรายงานไม่สำเร็จ', friendlyError(message))
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <MaterialCommunityIcons name="alert-octagon-outline" size={20} color={theme.red} />
          <Text style={styles.headerText}>เลือกเหตุผลที่จะรายงาน</Text>
        </View>

        <View style={styles.list}>
          {REASONS.map((r) => {
            const selected = reason === r.value
            return (
              <PressableScale
                key={r.value}
                onPress={() => setReason(r.value)}
                style={[styles.reasonRow, selected && styles.reasonRowActive]}
              >
                <View style={styles.reasonIcon}>
                  <MaterialCommunityIcons
                    name={selected ? 'radiobox-marked' : 'radiobox-blank'}
                    size={20}
                    color={selected ? theme.red : theme.muted}
                  />
                </View>
                <View style={styles.reasonText}>
                  <Text style={[styles.reasonLabel, selected && styles.reasonLabelActive]}>
                    {r.label}
                  </Text>
                  <Text style={styles.reasonDesc}>{r.description}</Text>
                </View>
              </PressableScale>
            )
          })}
        </View>

        <Text style={styles.noteLabel}>รายละเอียดเพิ่มเติม (ทางเลือก)</Text>
        <TextInput
          style={styles.noteInput}
          placeholder="ช่วยเล่าให้ทีมงานเข้าใจ เช่น เกิดเมื่อไร เกี่ยวกับแมตช์ไหน..."
          placeholderTextColor={theme.muted}
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={2000}
          editable={!mutation.isPending}
        />
        <Text style={styles.charCount}>{note.length} / 2000</Text>

        <PressableScale
          style={[styles.submit, !canSubmit && styles.submitDisabled]}
          disabled={!canSubmit}
          onPress={submit}
        >
          {mutation.isPending ? (
            <ActivityIndicator color={theme.chalk} />
          ) : (
            <Text style={styles.submitText}>ส่งรายงาน</Text>
          )}
        </PressableScale>

        <Text style={styles.disclaimer}>
          การรายงานเท็จซ้ำๆ อาจทำให้บัญชีของคุณถูกจำกัดสิทธิ์
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function friendlyError(message: string): string {
  if (message.includes('rate_limited')) return 'รายงานบ่อยเกินไป กรุณาลองอีกครั้งภายหลัง'
  if (message.includes('cannot report yourself')) return 'รายงานตัวเองไม่ได้'
  if (message.includes('not_found')) return 'ไม่พบผู้ใช้ที่จะรายงาน'
  return message.slice(0, 200)
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.bg },
    container: { padding: Spacing.xl, gap: Spacing.sm, paddingBottom: 48 },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: Spacing.sm,
    },
    headerText: { fontSize: 14, color: theme.ink, fontWeight: '900', letterSpacing: 0.3 },
    list: { gap: 8 },
    reasonRow: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: Radius.lg,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.line,
    },
    reasonRowActive: {
      borderColor: theme.red,
      backgroundColor: theme.surface,
    },
    reasonIcon: { paddingTop: 2 },
    reasonText: { flex: 1, gap: 2 },
    reasonLabel: { fontSize: 14, color: theme.ink, fontWeight: '800' },
    reasonLabelActive: { color: theme.red },
    reasonDesc: { fontSize: 12, color: theme.muted, lineHeight: 16 },
    noteLabel: {
      fontSize: 11,
      color: theme.muted,
      fontWeight: '900',
      letterSpacing: 1.4,
      marginTop: Spacing.md,
    },
    noteInput: {
      minHeight: 100,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: Radius.lg,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.line,
      color: theme.ink,
      fontSize: 14,
      textAlignVertical: 'top',
    },
    charCount: { fontSize: 11, color: theme.muted, alignSelf: 'flex-end' },
    submit: {
      minHeight: 50,
      borderRadius: Radius.lg,
      backgroundColor: theme.red,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: Spacing.md,
    },
    submitDisabled: { opacity: 0.5 },
    submitText: { color: theme.chalk, fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
    disclaimer: {
      fontSize: 11,
      color: theme.muted,
      textAlign: 'center',
      marginTop: Spacing.sm,
      lineHeight: 16,
    },
  })
}
