import { ActivityIndicator, Alert, Modal, Platform, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
// eslint-disable-next-line import/no-unresolved -- hoisted to monorepo root node_modules; resolved by tsc + Metro
import * as AppleAuthentication from 'expo-apple-authentication'
import { AppleSignInCancelledError } from '@/lib/auth/appleAuth'
import { isDeletedAccountError, OAuthSignInDismissedError } from '@/lib/auth/authService'
import { presentAuthError } from '@/lib/auth/authErrorPresentation'
import { guardedRouter } from '@/lib/navigation/guardedRouter'
import { resolveSocialAuthOptions } from '@/lib/auth/socialAuthProviders'
import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme, useThemeMode } from '@/hooks/useAppTheme'
import { useAppleSignIn, useOAuthSignIn } from '@/hooks/useAuthActions'
import { useI18n } from '@/hooks/useI18n'
import { socialAuthDictionary } from '@/lib/i18n/dictionaries/socialAuth'

const SOCIAL = resolveSocialAuthOptions({
  platform: Platform.OS,
  googleEnabled: process.env.EXPO_PUBLIC_ENABLE_GOOGLE_AUTH === 'true',
})

export function SocialAuthButtons() {
  const { t } = useI18n(socialAuthDictionary)
  const theme = useSportTheme()
  const mode = useThemeMode()
  const styles = createStyles(theme)
  const oauthMutation = useOAuthSignIn()
  const appleMutation = useAppleSignIn()

  if (!SOCIAL.any) return null

  const busy = oauthMutation.isPending || appleMutation.isPending

  async function signInGoogle() {
    try {
      await oauthMutation.mutateAsync('google')
    } catch (error) {
      // Browser dismissed — either a real cancel (stay on this screen) or the
      // /auth/callback route is finishing the sign-in. Never alert for it.
      if (error instanceof OAuthSignInDismissedError) return
      if (isDeletedAccountError(error)) {
        const presented = presentAuthError(error, 'signIn')
        Alert.alert(presented.title, presented.message, [
          { text: 'สมัครใหม่', onPress: () => guardedRouter.replace('/(auth)/sign-up') },
          { text: 'ปิด', style: 'cancel' },
        ])
        return
      }
      const message = error instanceof Error ? error.message : 'Could not continue.'
      Alert.alert('Sign in failed', message)
    }
  }

  async function signInApple() {
    try {
      await appleMutation.mutateAsync()
    } catch (error) {
      // User dismissed the Apple sheet — benign, no alert.
      if (error instanceof AppleSignInCancelledError) return
      if (isDeletedAccountError(error)) {
        const presented = presentAuthError(error, 'signIn')
        Alert.alert(presented.title, presented.message, [
          { text: 'สมัครใหม่', onPress: () => guardedRouter.replace('/(auth)/sign-up') },
          { text: 'ปิด', style: 'cancel' },
        ])
        return
      }
      const message = error instanceof Error ? error.message : 'Could not continue.'
      Alert.alert('Sign in failed', message)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.dividerRow}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.divider} />
      </View>

      <View style={styles.buttons}>
        {SOCIAL.apple ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={
              mode === 'dark'
                ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            }
            cornerRadius={Radius.lg}
            style={styles.appleButton}
            onPress={signInApple}
          />
        ) : null}

        {SOCIAL.google ? (
          <PressableScale style={styles.socialButton} onPress={signInGoogle} disabled={busy}>
            <MaterialCommunityIcons name="google" size={20} color={theme.ink} />
            <Text style={styles.socialButtonText}>
              {oauthMutation.isPending ? 'Opening...' : 'Continue with Google'}
            </Text>
          </PressableScale>
        ) : null}
      </View>

      {/* Full-screen progress while the provider flow + code exchange run, so
          returning from the browser never lands on an idle-looking sign-in
          form right before the app jumps to home. */}
      {busy ? (
        <Modal transparent statusBarTranslucent animationType="fade" visible>
          <View style={styles.busyOverlay}>
            <ActivityIndicator size="large" color={theme.orange} />
            <Text style={styles.busyText}>{t('signingIn')}</Text>
          </View>
        </Modal>
      ) : null}
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    container: { marginTop: Spacing.lg, gap: Spacing.md },
    dividerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    divider: { flex: 1, height: 1, backgroundColor: theme.line },
    dividerText: { color: theme.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1.6 },
    buttons: { gap: Spacing.sm },
    appleButton: { height: 50, width: '100%' },
    socialButton: {
      minHeight: 50,
      borderWidth: 1,
      borderColor: theme.lineStrong,
      borderRadius: Radius.lg,
      backgroundColor: theme.surfaceStrong,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      ...Platform.select({
        web: { transitionDuration: '160ms' },
      }),
    },
    socialButtonText: { color: theme.ink, fontSize: 14, fontWeight: '900' },
    busyOverlay: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.md,
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    // Thai text: no lineHeight/fontWeight — tight metrics drop tone marks.
    busyText: { color: '#ffffff', fontSize: 15 },
  })
}
