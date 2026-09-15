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
import * as Linking from 'expo-linking'
import { useLocalSearchParams } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { Reveal } from '@/components/motion/Reveal'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useExchangeAuthCode, useSetRecoverySessionFromTokens, useUpdatePassword } from '@/hooks/useAuthActions'
import { useAuthStore } from '@/stores/authStore'
import { presentAuthError } from '@/lib/auth/authErrorPresentation'
import { guardedRouter } from '@/lib/navigation/guardedRouter'
import {
  hasPasswordResetSensitiveParams,
  resolvePasswordResetRedirectParams,
  type AuthRedirectParams,
} from '@/lib/auth/passwordResetRedirect'
import { useI18n } from '@/hooks/useI18n'
import { authResetPasswordDictionary } from '@/lib/i18n/dictionaries/authResetPassword'

export default function ResetPasswordScreen() {
  const { t } = useI18n(authResetPasswordDictionary)
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const params = useLocalSearchParams()
  const redirectUrl = Linking.useURL()
  const session = useAuthStore((state) => state.session)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [didExchangeCode, setDidExchangeCode] = useState(false)
  const [isPasswordUpdated, setIsPasswordUpdated] = useState(false)
  const [resetLinkError, setResetLinkError] = useState<string | null>(null)
  const passwordRef = useRef('')
  const confirmPasswordRef = useRef('')
  const confirmInputRef = useRef<TextInput>(null)
  const exchangeMutation = useExchangeAuthCode()
  const tokenSessionMutation = useSetRecoverySessionFromTokens()
  const updateMutation = useUpdatePassword()
  const webUrl = Platform.OS === 'web' && typeof window !== 'undefined'
    ? window.location.href
    : null

  const { code, accessToken, refreshToken, authError } = resolvePasswordResetRedirectParams(
    params as AuthRedirectParams,
    redirectUrl ?? webUrl
  )
  const resetError = authError
    ? presentAuthError(authError, 'passwordResetVerify').message
    : resetLinkError

  useEffect(() => {
    if (authError || didExchangeCode) return

    const prepareSession = code
      ? exchangeMutation.mutateAsync(code)
      : accessToken && refreshToken
        ? tokenSessionMutation.mutateAsync({ accessToken, refreshToken })
        : null
    if (!prepareSession) return

    setDidExchangeCode(true)
    setResetLinkError(null)
    void prepareSession.catch((error) => {
      const presented = presentAuthError(error, 'passwordResetVerify')
      setResetLinkError(presented.message)
      Alert.alert(presented.title, presented.message)
    })
  }, [accessToken, authError, code, didExchangeCode, exchangeMutation, refreshToken, tokenSessionMutation])

  // Scrub recovery code from the browser URL once the session is established —
  // otherwise the token persists in history and the Referer header sent to any
  // third-party assets loaded on this page.
  useEffect(() => {
    if (Platform.OS !== 'web' || !session) return
    if (typeof window === 'undefined' || !hasPasswordResetSensitiveParams(window.location.href)) return
    const url = new URL(window.location.href)
    url.searchParams.delete('code')
    url.searchParams.delete('error')
    url.searchParams.delete('error_description')
    url.searchParams.delete('error_code')
    url.hash = ''
    window.history.replaceState(null, '', url.pathname + (url.search ? url.search : '') + url.hash)
  }, [session])

  async function savePassword() {
    Keyboard.dismiss()
    const finalPassword = password || passwordRef.current
    const finalConfirmPassword = confirmPassword || confirmPasswordRef.current

    if (resetError) {
      Alert.alert(t('invalidResetLinkTitle'), resetError)
      return
    }
    if (!session) {
      Alert.alert(t('resetLinkNotReadyTitle'), t('resetLinkNotReadyMessage'))
      return
    }
    if (finalPassword.length < 8) {
      Alert.alert(t('passwordTooShortTitle'), t('passwordTooShortMessage'))
      return
    }
    const sessionEmail = session.user?.email?.trim().toLowerCase()
    if (sessionEmail && finalPassword.trim().toLowerCase() === sessionEmail) {
      Alert.alert(t('passwordTooWeakTitle'), t('passwordTooWeakMessage'))
      return
    }
    if (finalPassword !== finalConfirmPassword) {
      Alert.alert(t('passwordsMismatchTitle'), t('passwordsMismatchMessage'))
      return
    }

    try {
      await updateMutation.mutateAsync(finalPassword)
      setIsPasswordUpdated(true)
      Alert.alert(t('passwordUpdatedTitle'), t('passwordUpdatedMessage'))
    } catch (error) {
      const presented = presentAuthError(error, 'passwordUpdate')
      Alert.alert(presented.title, presented.message)
    }
  }

  const isPreparingSession = Boolean(
    (code && exchangeMutation.isPending) ||
    (accessToken && refreshToken && tokenSessionMutation.isPending)
  )
  const canSubmit =
    Boolean(session) &&
    !resetError &&
    !exchangeMutation.isPending &&
    !tokenSessionMutation.isPending &&
    !updateMutation.isPending

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
          <Text style={styles.kicker}>
            {isPreparingSession
              ? t('preparingSession')
              : t('setNewPasswordKicker')}
          </Text>
        </Reveal>

        {resetError ? <Text style={styles.errorText}>{resetError}</Text> : null}

        {isPasswordUpdated ? (
          <>
            <Reveal delay={180}>
              <View style={styles.notice}>
                <MaterialCommunityIcons name="lock-check-outline" size={20} color={theme.green} />
                <Text style={styles.noticeText}>
                  {t('passwordChangedNotice')}
                </Text>
              </View>
            </Reveal>

            <Reveal delay={260}>
              <PressableScale
                style={styles.button}
                onPress={() => guardedRouter.replace('/(tabs)', { actionKey: 'reset-password:home' })}
              >
                <Text style={styles.buttonText}>{t('continueToRally')}</Text>
                <MaterialCommunityIcons name="arrow-right" size={18} color={theme.chalk} />
              </PressableScale>
            </Reveal>
          </>
        ) : (
          <>
            <Reveal delay={180} style={styles.form}>
              <Text style={styles.fieldLabel}>{t('newPasswordFieldLabel')}</Text>
              <View style={styles.passwordRow}>
                <TextInput
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
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => confirmInputRef.current?.focus()}
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

              <Text style={styles.fieldLabel}>{t('confirmPasswordFieldLabel')}</Text>
              <TextInput
                ref={confirmInputRef}
                style={styles.input}
                placeholder={t('confirmPasswordPlaceholder')}
                placeholderTextColor={theme.mutedSoft}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                textContentType="newPassword"
                importantForAutofill="yes"
                passwordRules="minlength: 8;"
                returnKeyType="go"
                onSubmitEditing={savePassword}
                value={confirmPassword}
                onChangeText={(text) => {
                  confirmPasswordRef.current = text
                  setConfirmPassword(text)
                }}
                onChange={(e) => {
                  confirmPasswordRef.current = e.nativeEvent.text
                }}
              />
            </Reveal>

            <Reveal delay={260}>
              <PressableScale
                style={[styles.button, !canSubmit && styles.buttonDisabled]}
                onPress={savePassword}
                disabled={!canSubmit}
              >
                <Text style={styles.buttonText}>
                  {updateMutation.isPending ? t('updating') : t('updatePassword')}
                </Text>
                <MaterialCommunityIcons name="lock-check-outline" size={18} color={theme.chalk} />
              </PressableScale>
            </Reveal>
          </>
        )}
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
      backgroundColor: theme.green,
      opacity: 0.1,
    },
    container: { flex: 1, justifyContent: 'center', padding: Spacing.xl, gap: Spacing.sm },
    eyebrow: { fontSize: 10, fontWeight: '900', color: theme.muted, letterSpacing: 2.4 },
    title: {
      fontSize: 40,
      fontWeight: '900',
      color: theme.ink,
      letterSpacing: 0,
      marginTop: 4,
    },
    kicker: { fontSize: 13, color: theme.muted, marginTop: 6, lineHeight: 20 },
    errorText: { color: theme.red, fontSize: 13, lineHeight: 20, marginTop: Spacing.lg },
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
    notice: {
      borderWidth: 1,
      borderColor: theme.lineStrong,
      borderRadius: Radius.lg,
      backgroundColor: theme.greenSoft,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      marginTop: Spacing.xl,
    },
    noticeText: { flex: 1, color: theme.ink, fontSize: 13, lineHeight: 20 },
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
      backgroundColor: theme.red,
      borderRadius: Radius.lg,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      marginTop: Spacing.xl,
    },
    buttonDisabled: { opacity: 0.55 },
    buttonText: { color: theme.chalk, fontSize: 14, fontWeight: '900', letterSpacing: 1.2 },
  })
}
