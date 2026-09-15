import { useState } from 'react'
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
import { router } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useRequestAccountDeletion } from '@/hooks/useAccountDeletion'

export default function DeleteAccountScreen() {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const [reason, setReason] = useState('')
  const mutation = useRequestAccountDeletion()

  function confirmAndSubmit() {
    Alert.alert(
      'ยืนยันการลบบัญชี',
      'หลังกดยืนยัน บัญชีจะถูกลบหลังครบ 14 วัน เข้ามา login ภายในช่วงนี้เพื่อยกเลิกได้\n\nต้องการดำเนินการต่อ?',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        { text: 'ยืนยันลบบัญชี', style: 'destructive', onPress: submit },
      ],
    )
  }

  async function submit() {
    try {
      const result = await mutation.mutateAsync(reason || null)
      const scheduled = new Date(result.scheduledFor).toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
      Alert.alert(
        result.reused ? 'มีคำขออยู่แล้ว' : 'รับเรื่องลบบัญชีแล้ว',
        `บัญชีจะถูกลบในวันที่ ${scheduled}\nหากเปลี่ยนใจ กรุณาติดต่อทีมงานก่อนวันดังกล่าว`,
        [{ text: 'ตกลง', onPress: () => router.back() }],
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'ส่งคำขอไม่สำเร็จ'
      Alert.alert('ลบบัญชีไม่สำเร็จ', friendlyError(message))
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.iconBlock}>
          <MaterialCommunityIcons name="account-remove-outline" size={42} color={theme.red} />
          <Text style={styles.title}>ลบบัญชี Rally</Text>
        </View>

        <Text style={styles.body}>
          การลบบัญชีจะทำให้แต้ม สถิติ ประวัติแมตช์ และของรางวัลที่ยังไม่ได้แลก
          ทั้งหมดของคุณถูกลบอย่างถาวรหลังครบช่วงรอ 14 วัน
        </Text>

        <View style={styles.bullet}>
          <MaterialCommunityIcons name="information-outline" size={16} color={theme.muted} />
          <Text style={styles.bulletText}>
            บัญชีจะลบหลังครบ <Text style={styles.bold}>14 วัน</Text> นับจากวันที่กดยืนยัน
          </Text>
        </View>
        <View style={styles.bullet}>
          <MaterialCommunityIcons name="alert-outline" size={16} color={theme.muted} />
          <Text style={styles.bulletText}>
            หากมี <Text style={styles.bold}>แมตช์ที่ยังไม่จบ</Text> หรือ
            <Text style={styles.bold}> แต้มล็อกในเดิมพัน</Text> จะลบไม่ได้
            กรุณาจบ/ยกเลิกแมตช์ก่อน
          </Text>
        </View>
        <View style={styles.bullet}>
          <MaterialCommunityIcons name="restore" size={16} color={theme.muted} />
          <Text style={styles.bulletText}>
            ภายใน 14 วัน ติดต่อทีมงานเพื่อยกเลิกการลบได้
          </Text>
        </View>

        <Text style={styles.label}>เหตุผลที่ลบ (ทางเลือก)</Text>
        <TextInput
          style={styles.input}
          placeholder="ช่วยบอกทีมงานหน่อย เพื่อนำไปปรับปรุง..."
          placeholderTextColor={theme.muted}
          value={reason}
          onChangeText={setReason}
          multiline
          maxLength={2000}
          editable={!mutation.isPending}
        />
        <Text style={styles.charCount}>{reason.length} / 2000</Text>

        <PressableScale
          style={[styles.submit, mutation.isPending && styles.submitDisabled]}
          disabled={mutation.isPending}
          onPress={confirmAndSubmit}
        >
          {mutation.isPending ? (
            <ActivityIndicator color={theme.chalk} />
          ) : (
            <Text style={styles.submitText}>ส่งคำขอลบบัญชี</Text>
          )}
        </PressableScale>

        <PressableScale style={styles.cancel} onPress={() => router.back()}>
          <Text style={styles.cancelText}>กลับ</Text>
        </PressableScale>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function friendlyError(message: string): string {
  if (message.includes('active matches')) {
    return 'มีแมตช์ที่ยังไม่จบ กรุณาจบหรือยกเลิกแมตช์ก่อนแล้วค่อยลองอีกครั้ง'
  }
  if (message.includes('locked')) {
    return 'มีแต้มล็อกอยู่ในเดิมพัน รอให้แมตช์เคลียร์ก่อน'
  }
  if (message.includes('rate_limited')) {
    return 'ส่งคำขอบ่อยเกินไป กรุณาลองอีกครั้งภายหลัง'
  }
  return message.slice(0, 200)
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  container: { padding: Spacing.xl, gap: Spacing.sm, paddingBottom: 48 },
  iconBlock: { alignItems: 'center', gap: 8, marginBottom: Spacing.md },
  title: { fontSize: 20, color: theme.ink, fontWeight: '900', letterSpacing: -0.3 },
  body: { fontSize: 14, color: theme.inkSoft, lineHeight: 20, marginBottom: Spacing.sm },
  bullet: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  bulletText: { flex: 1, fontSize: 13, color: theme.inkSoft, lineHeight: 19 },
  bold: { fontWeight: '900', color: theme.ink },
  label: {
    fontSize: 11,
    color: theme.muted,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginTop: Spacing.lg,
  },
  input: {
    minHeight: 90,
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
  cancel: { alignItems: 'center', paddingVertical: 12 },
  cancelText: { color: theme.muted, fontSize: 13, fontWeight: '700' },
  })
}
