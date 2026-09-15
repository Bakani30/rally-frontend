import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Alert, Image, Keyboard, StyleSheet, Text, TextInput, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useLocalSearchParams } from 'expo-router'
import Animated, { ZoomIn } from 'react-native-reanimated'

import { PressableScale } from '@/components/motion/PressableScale'
import { OnboardingScaffold } from '@/components/onboarding/OnboardingScaffold'
import { SheetPalette } from '@/components/onboarding/onboardingSheetPalette'
import { SheetPrimaryButton } from '@/components/onboarding/SheetPrimaryButton'
import { RallyText } from '@/components/ui/RallyText'
import { Fonts, Radius, Spacing } from '@/constants/theme'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useAuth } from '@/hooks/useAuth'
import { useChangeUsername } from '@/hooks/useChangeUsername'
import { useI18n } from '@/hooks/useI18n'
import { useProfile } from '@/hooks/useProfile'
import { useUpdateAvatar } from '@/hooks/useUpdateAvatar'
import { onboardingDictionary } from '@/lib/i18n/dictionaries/onboarding'
import { USERNAME_REGEX } from '@/types/username'
import { guardedRouter } from '@/lib/navigation/guardedRouter'

const USERNAME_MAX_LENGTH = 20

/**
 * Step 1/4 — Welcome: optional avatar + display name (unified username).
 * Naming (set or change) always happens inline in this sheet — never routes
 * out to /user/edit-username (founder feedback round 5).
 */
export default function OnboardingWelcomeScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>()
  const { user } = useAuth()
  const { data: profile } = useProfile(user?.id)
  const avatarMutation = useUpdateAvatar(user?.id)
  const usernameMutation = useChangeUsername(user?.id)
  const { track } = useAnalytics()
  const { t } = useI18n(onboardingDictionary)
  const startTrackedRef = useRef(false)
  const navigationLockedRef = useRef(false)

  function friendlyUsernameError(message: string): string {
    if (message.includes('username_taken')) return t('error_username_taken')
    if (message.includes('username_invalid_format')) return t('error_username_format')
    return message
  }

  const usernameAlreadySet = !!profile && profile.username_set_at !== null
  const currentHandle = profile?.handle ?? profile?.display_name ?? ''
  const [username, setUsername] = useState('')
  const [editingUsername, setEditingUsername] = useState(false)
  const showInput = !usernameAlreadySet || editingUsername

  useEffect(() => {
    if (startTrackedRef.current) return
    startTrackedRef.current = true
    track({ name: 'onboarding_started' })
  }, [track])

  async function changeAvatar() {
    try {
      await avatarMutation.mutateAsync()
    } catch (error) {
      Alert.alert(t('alert_avatar_failed'), error instanceof Error ? error.message : t('error_try_again'))
    }
  }

  function startEditingUsername() {
    setUsername(currentHandle)
    setEditingUsername(true)
  }

  function cancelEditingUsername() {
    setEditingUsername(false)
    setUsername('')
  }

  async function continueToNext() {
    if (navigationLockedRef.current) return
    Keyboard.dismiss()
    if (showInput) {
      const name = username.trim()
      const unchanged = usernameAlreadySet && name === currentHandle
      if (!unchanged) {
        if (!USERNAME_REGEX.test(name)) {
          Alert.alert(t('alert_name_invalid'), t('error_username_format'))
          return
      }
      navigationLockedRef.current = true
      try {
        await usernameMutation.mutateAsync({ username: name })
      } catch (error) {
        navigationLockedRef.current = false
        const message = error instanceof Error ? error.message : t('error_try_again')
          Alert.alert(t('alert_name_set_failed'), friendlyUsernameError(message))
          return
        }
      }
      setEditingUsername(false)
    }
    navigationLockedRef.current = true
    track({ name: 'onboarding_step_completed', properties: { step: 1, step_key: 'welcome' } })
    guardedRouter.push(
      {
        pathname: '/onboarding/about-you',
        params: { ...(mode ? { mode } : {}) },
      },
      { actionKey: 'onboarding:welcome-next' },
    )
  }

  const busy = avatarMutation.isPending || usernameMutation.isPending

  return (
    <OnboardingScaffold
      step={1}
      title={t('title_welcome')}
      titleIcon="hand-wave"
      subtitle={t('subtitle_welcome')}
      showBack={mode === 'edit'}
      onBack={
        mode === 'edit'
          ? () => guardedRouter.replace('/settings', { actionKey: 'onboarding:edit-exit' })
          : undefined
      }
      footer={
        <SheetPrimaryButton
          label={t('button_continue')}
          onPress={continueToNext}
          disabled={busy}
          loading={usernameMutation.isPending}
        />
      }
    >
      <View style={styles.avatarWrap}>
        <PressableScale
          style={styles.avatar}
          onPress={changeAvatar}
          disabled={avatarMutation.isPending}
          accessibilityLabel={t('a11y_pick_avatar')}
        >
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
          ) : (
            <MaterialCommunityIcons name="account" size={52} color={SheetPalette.mutedSoft} />
          )}
          <Animated.View entering={ZoomIn.delay(150).springify().damping(14)} style={styles.cameraBadge}>
            {avatarMutation.isPending ? (
              <ActivityIndicator size="small" color={SheetPalette.ctaText} />
            ) : (
              <MaterialCommunityIcons name="camera" size={15} color={SheetPalette.ctaText} />
            )}
          </Animated.View>
        </PressableScale>
      </View>

      <View style={styles.nameSection}>
        <RallyText variant="body" style={styles.sectionLabel}>{t('section_name')}</RallyText>

        {showInput ? (
          <>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.nameInput}
                value={username}
                onChangeText={(text) => setUsername(text.slice(0, USERNAME_MAX_LENGTH))}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus={editingUsername}
                placeholder={t('name_placeholder')}
                placeholderTextColor={SheetPalette.mutedSoft}
                maxLength={USERNAME_MAX_LENGTH}
                editable={!usernameMutation.isPending}
                accessibilityLabel={t('a11y_username_field')}
              />
              <Text style={styles.charCounter}>{`${username.length}/${USERNAME_MAX_LENGTH}`}</Text>
            </View>
            {editingUsername && (
              <PressableScale
                style={styles.cancelLink}
                onPress={cancelEditingUsername}
                accessibilityLabel={t('a11y_cancel_rename')}
              >
                <RallyText variant="body" style={styles.cancelLinkText}>{t('button_cancel')}</RallyText>
              </PressableScale>
            )}
          </>
        ) : (
          <View style={styles.nameConfirmed}>
            <Text style={styles.nameConfirmedText}>{currentHandle}</Text>
            <PressableScale onPress={startEditingUsername} accessibilityLabel={t('a11y_change_name')}>
              <RallyText variant="body" style={styles.nameChangeLink}>{t('change_name')}</RallyText>
            </PressableScale>
          </View>
        )}

        <RallyText variant="body" style={styles.hint}>{t('name_hint')}</RallyText>
      </View>
    </OnboardingScaffold>
  )
}

const styles = StyleSheet.create({
  avatarWrap: { alignItems: 'center', paddingTop: Spacing.md },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: SheetPalette.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: { width: 120, height: 120, borderRadius: 60 },
  cameraBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: SheetPalette.ctaBg,
    borderWidth: 2,
    borderColor: SheetPalette.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameSection: { gap: Spacing.sm },
  sectionLabel: { color: SheetPalette.ink, fontSize: 14 },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: SheetPalette.line,
    backgroundColor: SheetPalette.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    gap: Spacing.sm,
  },
  nameInput: { flex: 1, color: SheetPalette.ink, fontSize: 16, fontFamily: Fonts.thaiMedium, padding: 0 },
  charCounter: { color: SheetPalette.muted, fontSize: 12, fontWeight: '700' },
  cancelLink: { alignSelf: 'flex-end' },
  cancelLinkText: { color: SheetPalette.muted, fontSize: 12 },
  nameConfirmed: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 50,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: SheetPalette.line,
    backgroundColor: SheetPalette.surface,
    paddingHorizontal: Spacing.lg,
  },
  nameConfirmedText: { color: SheetPalette.ink, fontSize: 14, fontFamily: Fonts.thaiMedium },
  nameChangeLink: { color: SheetPalette.orange, fontSize: 13 },
  hint: { color: SheetPalette.muted, fontSize: 11 },
})
