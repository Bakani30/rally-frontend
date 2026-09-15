import { useRef, useState } from 'react'
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import { Link } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { Reveal } from '@/components/motion/Reveal'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { usePasswordResetEmail } from '@/hooks/useAuthActions'
import { presentAuthError } from '@/lib/auth/authErrorPresentation'
import { resolveEmailInboxUrl } from '@/lib/auth/emailInbox'
import { useI18n } from '@/hooks/useI18n'
import { authForgotPasswordDictionary } from '@/lib/i18n/dictionaries/authForgotPassword'

export default function ForgotPasswordScreen() {
  const { t } = useI18n(authForgotPasswordDictionary)
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const [email, setEmail] = useState('')
  const [sentEmail, setSentEmail] = useState<string | null>(null)
  const [inboxUrl, setInboxUrl] = useState<string | null>(null)
  const emailRef = useRef('')
  const resetMutation = usePasswordResetEmail()

  async function openInbox(url: string) {
    if (Platform.OS === 'web') {
      await Linking.openURL(url)
      return
    }
    await WebBrowser.openBrowserAsync(url)
  }

  async function sendResetEmail() {
    Keyboard.dismiss()
    const trimmedEmail = (email || emailRef.current).trim()
    if (!trimmedEmail) {
      Alert.alert(t('emailRequiredTitle'), t('emailRequiredMessage'))
      return
    }

    try {
      await resetMutation.mutateAsync(trimmedEmail)
      const nextInboxUrl = resolveEmailInboxUrl(trimmedEmail)
      setSentEmail(trimmedEmail)
      setInboxUrl(nextInboxUrl)
      if (nextInboxUrl) {
        void openInbox(nextInboxUrl).catch(() => {
          Alert.alert(t('checkEmailTitle'), t('resetLinkSentMessage'), [
            { text: t('later'), style: 'cancel' },
            { text: t('openInbox'), onPress: () => void openInbox(nextInboxUrl) },
          ])
        })
        return
      }
      Alert.alert(t('checkEmailTitle'), t('resetLinkSentMessage'))
    } catch (error) {
      const presented = presentAuthError(error, 'passwordResetRequest')
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
          <Text style={styles.fieldLabel}>{t('emailFieldLabel')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('emailPlaceholder')}
            placeholderTextColor={theme.mutedSoft}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            importantForAutofill="yes"
            returnKeyType="send"
            onSubmitEditing={sendResetEmail}
            value={email}
            onChangeText={(text) => {
              emailRef.current = text
              setEmail(text)
            }}
            onChange={(e) => {
              emailRef.current = e.nativeEvent.text
            }}
          />
        </Reveal>

        {sentEmail ? (
          <Reveal delay={220}>
            <View style={styles.notice}>
              <MaterialCommunityIcons name="email-check-outline" size={20} color={theme.green} />
              <View style={styles.noticeBody}>
                <Text style={styles.noticeText}>
                  {t('noticeText', { email: sentEmail })}
                </Text>
                {inboxUrl ? (
                  <PressableScale style={styles.inboxButton} onPress={() => void openInbox(inboxUrl)}>
                    <Text style={styles.inboxButtonText}>{t('openInboxButton')}</Text>
                    <MaterialCommunityIcons name="open-in-new" size={15} color={theme.green} />
                  </PressableScale>
                ) : null}
              </View>
            </View>
          </Reveal>
        ) : null}

        <Reveal delay={260}>
          <PressableScale
            style={[styles.button, resetMutation.isPending && styles.buttonDisabled]}
            onPress={sendResetEmail}
            disabled={resetMutation.isPending}
          >
            <Text style={styles.buttonText}>
              {resetMutation.isPending ? t('sending') : sentEmail ? t('sendAgain') : t('sendResetLink')}
            </Text>
            <MaterialCommunityIcons name="email-arrow-right-outline" size={18} color={theme.chalk} />
          </PressableScale>
        </Reveal>

        <Reveal delay={320}>
          <Link href="/(auth)/sign-in" style={styles.link}>
            {t('backTo')} <Text style={styles.linkAccent}>{t('signInLink')}</Text>
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
      backgroundColor: theme.blue,
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
      marginTop: Spacing.lg,
    },
    noticeBody: { flex: 1, gap: 10 },
    noticeText: { color: theme.ink, fontSize: 13, lineHeight: 20 },
    inboxButton: {
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderColor: theme.green,
      borderRadius: Radius.pill,
      paddingHorizontal: 12,
      paddingVertical: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    inboxButtonText: { color: theme.greenVivid, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
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
    link: { textAlign: 'center', color: theme.muted, marginTop: Spacing.md, fontSize: 13 },
    linkAccent: { color: theme.red, fontWeight: '800' },
  })
}
