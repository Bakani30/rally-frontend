import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Link, useLocalSearchParams } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons'
import { PressableScale } from '@/components/motion/PressableScale'
import { Reveal } from '@/components/motion/Reveal'
import { Fonts, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useSignUp } from '@/hooks/useAuthActions'
import { presentAuthError } from '@/lib/auth/authErrorPresentation'
import { isValidUsername, normalizeUsernameInput } from '@/lib/auth/usernameInput'
import { guardedRouter } from '@/lib/navigation/guardedRouter'
import { useI18n } from '@/hooks/useI18n'
import { authSignUpDictionary } from '@/lib/i18n/dictionaries/authSignUp'

export default function SignUpScreen() {
  const { t } = useI18n(authSignUpDictionary)
  const { accountDeleted } = useLocalSearchParams<{ accountDeleted?: string }>()
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const emailRef = useRef('')
  const passwordRef = useRef('')
  const nameRef = useRef('')
  const emailInputRef = useRef<TextInput>(null)
  const passwordInputRef = useRef<TextInput>(null)
  const signUpMutation = useSignUp()

  useEffect(() => {
    if (accountDeleted === '1') {
      Alert.alert(
        'ไม่พบบัญชีนี้แล้ว',
        'เซสชันเดิมถูกออกจากระบบแล้ว กรุณาสมัครสมาชิกใหม่',
      )
    }
  }, [accountDeleted])

  async function signUp() {
    Keyboard.dismiss()
    // Refs first — synced synchronously in onChangeText/onChange, so they beat
    // stale state when autofill or keyboard "Go" submits in the same tick
    // (same fix as sign-in: state-first dropped trailing characters).
    const trimmedName = normalizeUsernameInput(nameRef.current || displayName)
    const trimmedEmail = (emailRef.current || email).trim()
    const finalPassword = passwordRef.current || password
    if (!trimmedName) {
      Alert.alert(t('usernameRequiredTitle'), t('usernameRequiredMessage'))
      return
    }
    if (!isValidUsername(trimmedName)) {
      Alert.alert(t('usernameInvalidTitle'), t('usernameInvalidMessage'))
      return
    }
    if (!trimmedEmail) {
      Alert.alert(t('emailRequiredTitle'), t('emailRequiredMessage'))
      return
    }
    if (finalPassword.length < 8) {
      Alert.alert(t('passwordTooShortTitle'), t('passwordTooShortMessage'))
      return
    }
    if (finalPassword.trim().toLowerCase() === trimmedEmail.toLowerCase()) {
      Alert.alert(t('passwordTooWeakTitle'), t('passwordTooWeakMessage'))
      return
    }
    try {
      const outcome = await signUpMutation.mutateAsync({
        email: trimmedEmail,
        password: finalPassword,
        displayName: trimmedName,
      })
      if (outcome.kind === 'session') {
        Alert.alert(t('welcomeTitle'), t('welcomeMessage', { name: trimmedName }))
        guardedRouter.replace('/(tabs)', { actionKey: 'sign-up:home' })
        return
      }
      if (outcome.kind === 'already_registered') {
        Alert.alert(
          t('alreadyRegisteredTitle'),
          t('alreadyRegisteredMessage'),
          [
            { text: t('cancel'), style: 'cancel' },
            { text: t('goToSignIn'), onPress: () => guardedRouter.replace('/(auth)/sign-in', { actionKey: 'sign-up:sign-in' }) },
          ],
        )
        return
      }
      Alert.alert(t('checkEmailTitle'), t('checkEmailMessage'))
    } catch (error) {
      const presented = presentAuthError(error, 'signUp')
      Alert.alert(presented.title, presented.message)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.glow} />
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Reveal delay={0}>
          <Text style={styles.eyebrow}>{t('eyebrow')}</Text>
        </Reveal>
        <Reveal delay={80}>
          <Text style={styles.title}>{t('title')}</Text>
          <Text style={styles.kicker}>{t('kicker')}</Text>
        </Reveal>

        <Reveal delay={180} style={styles.form}>
          <Text style={styles.fieldLabel}>{t('usernameFieldLabel')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('usernamePlaceholder')}
            placeholderTextColor={theme.mutedSoft}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username-new"
            textContentType="username"
            importantForAutofill="yes"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => emailInputRef.current?.focus()}
            maxLength={20}
            value={displayName}
            onChangeText={(text) => {
              nameRef.current = text
              setDisplayName(text)
            }}
            onChange={(e) => {
              nameRef.current = e.nativeEvent.text
            }}
          />

          <Text style={styles.fieldLabel}>{t('emailFieldLabel')}</Text>
          <TextInput
            ref={emailInputRef}
            style={styles.input}
            placeholder={t('emailPlaceholder')}
            placeholderTextColor={theme.mutedSoft}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            importantForAutofill="yes"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => passwordInputRef.current?.focus()}
            value={email}
            onChangeText={(text) => {
              emailRef.current = text
              setEmail(text)
            }}
            onChange={(e) => {
              emailRef.current = e.nativeEvent.text
            }}
          />

          <Text style={styles.fieldLabel}>{t('passwordFieldLabel')}</Text>
          <View style={styles.passwordRow}>
            <TextInput
              ref={passwordInputRef}
              style={[styles.input, styles.passwordInput]}
              placeholder={t('passwordPlaceholder')}
              placeholderTextColor={theme.mutedSoft}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              textContentType="newPassword"
              importantForAutofill="yes"
              passwordRules="minlength: 8;"
              returnKeyType="go"
              onSubmitEditing={signUp}
              value={password}
              onChangeText={(text) => {
                passwordRef.current = text
                setPassword(text)
              }}
              onChange={(e) => {
                passwordRef.current = e.nativeEvent.text
              }}
            />
            <PressableScale style={styles.eyeBtn} onPress={() => setShowPassword((v) => !v)}>
              <MaterialCommunityIcons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={theme.muted}
              />
            </PressableScale>
          </View>
        </Reveal>

        <Reveal delay={260}>
          <PressableScale
            style={[styles.button, signUpMutation.isPending && styles.buttonDisabled]}
            onPress={signUp}
            disabled={signUpMutation.isPending}
          >
            <Text style={styles.buttonText}>
              {signUpMutation.isPending ? t('creatingButton') : t('createAccountButton')}
            </Text>
            <MaterialCommunityIcons name="arrow-right" size={18} color={theme.chalk} />
          </PressableScale>
        </Reveal>

        <Reveal delay={300}>
          <SocialAuthButtons />
        </Reveal>

        <Reveal delay={340}>
          <Link href="/(auth)/sign-in" style={styles.link}>
            {t('alreadyHaveAccountPrompt')} <Text style={styles.linkAccent}>{t('signInLink')}</Text>
          </Link>
        </Reveal>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.bg },
    glow: {
      position: 'absolute',
      top: -60,
      right: -60,
      width: 240,
      height: 240,
      borderRadius: 120,
      backgroundColor: theme.orange,
      opacity: 0.1,
    },
    container: { flex: 1, justifyContent: 'center', padding: Spacing.xl, gap: Spacing.sm },
    eyebrow: { fontSize: 10, fontWeight: '900', color: theme.muted, letterSpacing: 2.4 },
    title: {
      fontSize: 40,
      fontWeight: '900',
      color: theme.ink,
      letterSpacing: 0,
      fontFamily: Fonts?.rounded,
      marginTop: 4,
    },
    kicker: { fontSize: 13, color: theme.muted, marginTop: 6 },
    form: { gap: Spacing.xs, marginTop: Spacing.xl },
    fieldLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: theme.muted,
      letterSpacing: 1.6,
      marginTop: Spacing.md,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.line,
      borderRadius: Radius.lg,
      padding: 14,
      fontSize: 15,
      color: theme.ink,
      backgroundColor: theme.surface,
    },
    passwordRow: { position: 'relative', justifyContent: 'center' },
    passwordInput: { paddingRight: 52 },
    eyeBtn: {
      position: 'absolute',
      right: 8,
      top: 0,
      bottom: 0,
      justifyContent: 'center',
      paddingHorizontal: 10,
    },
    button: {
      backgroundColor: theme.orange,
      borderRadius: Radius.lg,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      marginTop: Spacing.xl,
      ...Platform.select({
        web: { boxShadow: '0 20px 40px -10px rgba(255,90,61,0.42)' },
        default: {
          shadowColor: theme.orange,
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.4,
          shadowRadius: 22,
          elevation: 6,
        },
      }),
    },
    buttonDisabled: { opacity: 0.55 },
    buttonText: { color: theme.chalk, fontSize: 14, fontWeight: '900', letterSpacing: 1.2 },
    link: { textAlign: 'center', color: theme.muted, marginTop: Spacing.md, fontSize: 13 },
    linkAccent: { color: theme.orange, fontWeight: '800' },
  })
}
