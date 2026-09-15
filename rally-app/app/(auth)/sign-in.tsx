import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  Image,
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
import { LanguageToggle } from '@/components/onboarding/LanguageToggle'
import { PressableScale } from '@/components/motion/PressableScale'
import { Reveal } from '@/components/motion/Reveal'
import { Fonts, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useSignIn } from '@/hooks/useAuthActions'
import { toMatchEntryParams } from '@/lib/match/matchEntry'
import { toRallyCoinEntryRoute } from '@/lib/rally-coin/rallyCoinEntry'
import { useMatchEntryStore } from '@/stores/matchEntryStore'
import { useRallyCoinEntryStore } from '@/stores/rallyCoinEntryStore'
import { presentAuthError } from '@/lib/auth/authErrorPresentation'
import { isDeletedAccountError } from '@/lib/auth/authService'
import { guardedRouter } from '@/lib/navigation/guardedRouter'
import { useI18n } from '@/hooks/useI18n'
import { authSignInDictionary } from '@/lib/i18n/dictionaries/authSignIn'
import { socialAuthDictionary } from '@/lib/i18n/dictionaries/socialAuth'

export default function SignInScreen() {
  const { t } = useI18n(authSignInDictionary)
  const { t: tSocialAuth } = useI18n(socialAuthDictionary)
  const { oauthError } = useLocalSearchParams<{ oauthError?: string }>()
  const oauthErrorShownRef = useRef(false)
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const emailRef = useRef('')
  const passwordRef = useRef('')
  const passwordInputRef = useRef<TextInput>(null)
  const signInMutation = useSignIn()
  const consumePendingEntry = useMatchEntryStore((state) => state.consumePendingEntry)
  const consumePendingCoinEntry = useRallyCoinEntryStore((state) => state.consumePendingEntry)

  // The OAuth callback route lands here with oauthError=1 when the code
  // exchange failed and no session exists — surface it instead of leaving the
  // user staring at the sign-in form with no explanation.
  useEffect(() => {
    if (oauthError !== '1' || oauthErrorShownRef.current) return
    oauthErrorShownRef.current = true
    Alert.alert(
      tSocialAuth('oauthCallbackFailedTitle'),
      tSocialAuth('oauthCallbackFailedMessage'),
    )
  }, [oauthError, tSocialAuth])

  function syncEmailInput(text: string) {
    emailRef.current = text
    setEmail(text)
  }

  function syncPasswordInput(text: string) {
    passwordRef.current = text
    setPassword(text)
  }

  async function signIn() {
    if (signInMutation.isPending) return
    Keyboard.dismiss()
    // Refs first: they are synced synchronously in onChangeText/onChange, so
    // they cover both Android autofill (GPM skips onChangeText) and keyboard
    // "Go" firing before the last keystroke's state commit. State-first here
    // used to submit a password missing its final characters — the server
    // answered invalid_credentials on a correctly typed password.
    const trimmedEmail = (emailRef.current || email).trim()
    const finalPassword = passwordRef.current || password
    if (!trimmedEmail) {
      Alert.alert(t('emailRequiredTitle'), t('emailRequiredMessage'))
      return
    }
    if (!finalPassword) {
      Alert.alert(t('passwordRequiredTitle'), t('passwordRequiredMessage'))
      return
    }
    try {
      await signInMutation.mutateAsync({ email: trimmedEmail, password: finalPassword })
    } catch (error) {
      const presented = presentAuthError(error, 'signIn')
      Alert.alert(
        presented.title,
        presented.message,
        isDeletedAccountError(error)
          ? [
              { text: 'สมัครใหม่', onPress: () => guardedRouter.replace('/(auth)/sign-up') },
              { text: 'ปิด', style: 'cancel' },
            ]
          : undefined,
      )
      return
    }
    // Navigation stays outside the try: sign-in already succeeded, so a
    // navigation hiccup must not surface as a "sign in failed" alert.
    // Navigate explicitly: GPM auto-submit can race AuthGate's segment-based
    // redirect, leaving the user stranded on this screen with a live session.
    const pendingCoinEntry = consumePendingCoinEntry()
    if (pendingCoinEntry) {
      guardedRouter.replace(toRallyCoinEntryRoute(pendingCoinEntry), { actionKey: 'sign-in:coin-entry' })
      return
    }
    const pendingEntry = consumePendingEntry()
    guardedRouter.replace(
      pendingEntry
        ? { pathname: '/(tabs)', params: toMatchEntryParams(pendingEntry) }
        : '/(tabs)',
      { actionKey: 'sign-in:home-entry' },
    )
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
        <Reveal delay={0} style={styles.topRow}>
          <LanguageToggle style={styles.languageToggle} />
        </Reveal>

        <Reveal delay={40}>
          <View style={styles.brand}>
            <Image source={require('@/assets/images/icon.png')} style={styles.logo} />
            <Text style={styles.title}>RALLY</Text>
          </View>
        </Reveal>

        <Reveal delay={80} style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder={t('emailPlaceholder')}
            accessibilityLabel={t('emailPlaceholder')}
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
            onChangeText={syncEmailInput}
            onChange={(e) => {
              syncEmailInput(e.nativeEvent.text)
            }}
          />

          <View style={styles.passwordRow}>
            <TextInput
              ref={passwordInputRef}
              style={[styles.input, styles.passwordInput]}
              placeholder={t('passwordPlaceholder')}
              accessibilityLabel={t('passwordPlaceholder')}
              placeholderTextColor={theme.mutedSoft}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              textContentType="password"
              importantForAutofill="yes"
              returnKeyType="go"
              onSubmitEditing={signIn}
              value={password}
              onChangeText={syncPasswordInput}
              onChange={(e) => {
                syncPasswordInput(e.nativeEvent.text)
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
          <Link href="/(auth)/forgot-password" style={styles.forgotLink}>
            {t('forgotPassword')}
          </Link>
        </Reveal>

        <Reveal delay={160}>
          <PressableScale
            style={[styles.button, signInMutation.isPending && styles.buttonDisabled]}
            onPress={signIn}
            disabled={signInMutation.isPending}
          >
            <Text style={styles.buttonText}>
              {signInMutation.isPending ? t('signingIn') : t('signIn')}
            </Text>
            <MaterialCommunityIcons name="arrow-right" size={18} color={theme.chalk} />
          </PressableScale>
        </Reveal>

        <Reveal delay={220}>
          <SocialAuthButtons />
        </Reveal>

        <Reveal delay={280}>
          <Link href="/(auth)/sign-up" style={styles.link}>
            {t('noAccountPrompt')} <Text style={styles.linkAccent}>{t('signUpLink')}</Text>
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
      left: -60,
      width: 260,
      height: 260,
      borderRadius: 130,
      backgroundColor: theme.orange,
      opacity: 0.1,
    },
    container: { flex: 1, justifyContent: 'center', padding: Spacing.xl, gap: Spacing.sm },
    topRow: { alignItems: 'flex-end' },
    languageToggle: { marginBottom: Spacing.sm },
    brand: { alignSelf: 'flex-start', marginBottom: Spacing.lg },
    logo: {
      width: 56,
      height: 56,
      borderRadius: Radius.md,
      marginBottom: Spacing.sm,
    },
    title: {
      fontSize: 56,
      fontWeight: '900',
      color: theme.ink,
      letterSpacing: 0,
      fontFamily: Fonts?.rounded,
      lineHeight: 58,
    },
    form: { gap: Spacing.md },
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
    forgotLink: {
      alignSelf: 'flex-end',
      color: theme.blue,
      fontSize: 12,
      fontWeight: '800',
      marginTop: Spacing.xs,
    },
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
