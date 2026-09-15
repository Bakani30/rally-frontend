import { useState } from 'react'
import { ActivityIndicator, Alert, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { Fonts, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useAuth } from '@/hooks/useAuth'
import { useChangeUsername } from '@/hooks/useChangeUsername'
import { USERNAME_REGEX } from '@/types/username'
import { guardedRouter } from '@/lib/navigation/guardedRouter'
import { useI18n, type Translator } from '@/hooks/useI18n'
import { authSetUsernameDictionary } from '@/lib/i18n/dictionaries/authSetUsername'

function friendlyError(t: Translator<keyof typeof authSetUsernameDictionary>, message: string): string {
  if (message.includes('username_taken')) return t('usernameTakenError')
  if (message.includes('username_invalid_format')) return t('usernameInvalidFormatError')
  if (message.includes('username_unchanged')) return t('usernameUnchangedError')
  return message
}

export default function SetUsernameScreen() {
  const { t } = useI18n(authSetUsernameDictionary)
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { user } = useAuth()
  const [username, setUsername] = useState('')
  const mutation = useChangeUsername(user?.id)

  async function submit() {
    Keyboard.dismiss()
    const name = username.trim()
    if (!USERNAME_REGEX.test(name)) {
      Alert.alert(t('usernameInvalidTitle'), t('usernameInvalidMessage'))
      return
    }
    try {
      await mutation.mutateAsync({ username: name })
      guardedRouter.replace('/(tabs)', { actionKey: 'set-username:home' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('genericError')
      Alert.alert(t('setUsernameFailedTitle'), friendlyError(t, msg))
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}
    >
      <View style={styles.container}>
        <MaterialCommunityIcons name="account-circle-outline" size={56} color={theme.red} />
        <Text style={styles.title}>{t('title')}</Text>
        <Text style={styles.subtitle}>
          {t('subtitle')}
        </Text>

        <View style={styles.inputRow}>
          <Text style={styles.at}>@</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={t('usernamePlaceholder')}
            placeholderTextColor={theme.muted}
            maxLength={20}
            editable={!mutation.isPending}
          />
        </View>
        <Text style={styles.hint}>{t('hint')}</Text>

        <PressableScale
          style={[styles.submit, mutation.isPending && styles.submitDisabled]}
          onPress={submit}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <ActivityIndicator color={theme.chalk} />
          ) : (
            <Text style={styles.submitText}>{t('confirm')}</Text>
          )}
        </PressableScale>
      </View>
    </KeyboardAvoidingView>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.bg },
    container: {
      flex: 1,
      padding: Spacing.xl,
      justifyContent: 'center',
      alignItems: 'center',
      gap: Spacing.md,
    },
    title: {
      fontSize: 28,
      fontWeight: '900',
      color: theme.ink,
      fontFamily: Fonts?.rounded,
      letterSpacing: -0.5,
      marginTop: Spacing.sm,
    },
    subtitle: {
      fontSize: 13,
      color: theme.muted,
      textAlign: 'center',
      paddingHorizontal: Spacing.lg,
      marginBottom: Spacing.md,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      width: '100%',
      maxWidth: 360,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: Radius.lg,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.line,
    },
    at: { fontSize: 18, color: theme.muted, fontWeight: '800' },
    input: {
      flex: 1,
      fontSize: 16,
      color: theme.ink,
      fontWeight: '700',
      padding: 0,
    },
    hint: { fontSize: 11, color: theme.muted, marginTop: -4 },
    submit: {
      width: '100%',
      maxWidth: 360,
      minHeight: 50,
      borderRadius: Radius.lg,
      backgroundColor: theme.red,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: Spacing.md,
    },
    submitDisabled: { opacity: 0.6 },
    submitText: {
      color: theme.chalk,
      fontSize: 14,
      fontWeight: '900',
      letterSpacing: 0.5,
    },
  })
}
