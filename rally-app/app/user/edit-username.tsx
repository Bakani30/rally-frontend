import { useState } from 'react'
import { ActivityIndicator, Alert, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { Fonts, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useAuth } from '@/hooks/useAuth'
import { useChangeUsername } from '@/hooks/useChangeUsername'
import { useProfile } from '@/hooks/useProfile'
import { priceForNextChange } from '@/lib/username/usernamePricing'
import { USERNAME_REGEX } from '@/types/username'

function friendlyError(message: string): string {
  if (message.includes('username_taken')) return 'ชื่อนี้ถูกใช้แล้ว ลองชื่ออื่น'
  if (message.includes('username_invalid_format')) return 'ใช้ a–z, 0–9, _ ความยาว 3–20 ตัว'
  if (message.includes('username_unchanged')) return 'เลือกชื่อใหม่ที่ต่างจากเดิม'
  if (message.includes('insufficient_points') || message.includes('Insufficient')) {
    return 'แต้ม spendable ไม่พอ'
  }
  return message
}

export default function EditUsernameScreen() {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { user } = useAuth()
  const { data: profile } = useProfile(user?.id)
  const [username, setUsername] = useState('')
  const mutation = useChangeUsername(user?.id)

  const price = profile
    ? priceForNextChange({
        usernameSetAt: profile.username_set_at,
        changesUsed: profile.username_changes_used,
      })
    : 'free'
  const isFreeRename =
    !!profile && profile.username_set_at !== null && profile.username_changes_used === 0
  const balance = profile?.spendable_points ?? 0
  const insufficient = price !== 'free' && balance < price

  async function submit() {
    Keyboard.dismiss()
    const name = username.trim()
    if (!USERNAME_REGEX.test(name)) {
      Alert.alert('Username ไม่ถูกต้อง', 'ใช้ A–Z, a–z, 0–9, _ ความยาว 3–20 ตัวอักษร')
      return
    }
    if (name === profile?.handle) {
      Alert.alert('ชื่อเดิม', 'เลือกชื่อใหม่ที่ต่างจากเดิม')
      return
    }

    const confirm = await askConfirm({
      isFreeRename,
      price,
    })
    if (!confirm) return

    try {
      await mutation.mutateAsync({ username: name })
      Alert.alert(
        'เปลี่ยนชื่อสำเร็จ',
        price === 'free'
          ? 'เปลี่ยนชื่อโดยไม่เสียแต้ม'
          : `หัก ${price.toLocaleString()} pts จาก spendable`,
      )
      router.back()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด'
      Alert.alert('เปลี่ยนชื่อไม่สำเร็จ', friendlyError(msg))
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}
    >
      <View style={styles.container}>
        <Text style={styles.label}>ชื่อปัจจุบัน</Text>
        <Text style={styles.current}>@{profile?.handle ?? '—'}</Text>

        <View style={styles.inputRow}>
          <Text style={styles.at}>@</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="ชื่อใหม่"
            placeholderTextColor={theme.muted}
            maxLength={20}
            editable={!mutation.isPending}
          />
        </View>
        <Text style={styles.hint}>a–z, 0–9, _ ความยาว 3–20 ตัว</Text>

        <View style={styles.priceCard}>
          {price === 'free' ? (
            <>
              <MaterialCommunityIcons name="gift-outline" size={20} color={theme.green} />
              <Text style={styles.priceTextFree}>
                {isFreeRename ? 'ครั้งนี้ฟรี! (โควต้าใหม่)' : 'ฟรี'}
              </Text>
            </>
          ) : (
            <>
              <MaterialCommunityIcons name="cash-multiple" size={20} color={theme.amber} />
              <Text style={styles.priceText}>
                ค่าเปลี่ยน: {price.toLocaleString()} pts
              </Text>
            </>
          )}
        </View>

        <PressableScale
          style={[
            styles.submit,
            (mutation.isPending || insufficient) && styles.submitDisabled,
          ]}
          onPress={submit}
          disabled={mutation.isPending || insufficient}
        >
          {mutation.isPending ? (
            <ActivityIndicator color={theme.chalk} />
          ) : (
            <Text style={styles.submitText}>
              {insufficient ? 'แต้มไม่พอ' : 'ยืนยันเปลี่ยนชื่อ'}
            </Text>
          )}
        </PressableScale>
      </View>
    </KeyboardAvoidingView>
  )
}

function askConfirm(params: {
  isFreeRename: boolean
  price: 'free' | 500 | 1000 | 2000
}): Promise<boolean> {
  return new Promise((resolve) => {
    if (params.isFreeRename) {
      Alert.alert(
        'ยืนยันการเปลี่ยนชื่อ',
        'การเปลี่ยนครั้งนี้ฟรี (โควต้าผู้ใช้ใหม่) ครั้งต่อไปต้องเสียแต้ม',
        [
          { text: 'ยกเลิก', style: 'cancel', onPress: () => resolve(false) },
          { text: 'เปลี่ยน', onPress: () => resolve(true) },
        ],
      )
      return
    }
    if (params.price === 'free') {
      resolve(true)
      return
    }
    Alert.alert(
      'ยืนยันการเปลี่ยนชื่อ',
      `จะหัก ${params.price.toLocaleString()} pts จาก spendable`,
      [
        { text: 'ยกเลิก', style: 'cancel', onPress: () => resolve(false) },
        { text: 'จ่ายและเปลี่ยน', onPress: () => resolve(true) },
      ],
    )
  })
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.bg },
    container: { flex: 1, padding: Spacing.xl, gap: Spacing.sm },
    label: { fontSize: 11, color: theme.muted, fontWeight: '900', letterSpacing: 1.4 },
    current: {
      fontSize: 20,
      color: theme.ink,
      fontWeight: '800',
      fontFamily: Fonts?.rounded,
      marginBottom: Spacing.md,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: Radius.lg,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.line,
    },
    at: { fontSize: 18, color: theme.muted, fontWeight: '800' },
    input: { flex: 1, fontSize: 16, color: theme.ink, fontWeight: '700', padding: 0 },
    hint: { fontSize: 11, color: theme.muted, marginBottom: Spacing.sm },
    priceCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: Radius.lg,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.line,
    },
    priceText: { color: theme.ink, fontSize: 13, fontWeight: '800', flex: 1 },
    priceTextFree: { color: theme.greenVivid, fontSize: 13, fontWeight: '900', flex: 1 },
    submit: {
      minHeight: 50,
      borderRadius: Radius.lg,
      backgroundColor: theme.red,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: Spacing.md,
    },
    submitDisabled: { opacity: 0.5 },
    submitText: {
      color: theme.chalk,
      fontSize: 14,
      fontWeight: '900',
      letterSpacing: 0.5,
    },
  })
}
