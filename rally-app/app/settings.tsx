import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Linking,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Link, type Href } from 'expo-router'
import Constants from 'expo-constants'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Screen } from '@/components/layout/Screen'
import { PressableScale } from '@/components/motion/PressableScale'
import { ScreenBackButton } from '@/components/navigation/ScreenBackButton'
import { Fonts, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useJerseyNumber } from '@/hooks/useJerseyNumber'
import { useSignOut } from '@/hooks/useAuthActions'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { useThemeStore, type ThemePreference } from '@/stores/themeStore'
import { useLanguageStore } from '@/stores/languageStore'
import { APP_LANGUAGE_OPTIONS } from '@/lib/i18n/language'
import { guardedRouter } from '@/lib/navigation/guardedRouter'
import { useI18n } from '@/hooks/useI18n'
import { settingsDictionary } from '@/lib/i18n/dictionaries/settings'

const THEME_OPTIONS: { value: ThemePreference; labelKey: 'themeSystem' | 'themeLight' | 'themeDark'; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
  { value: 'system', labelKey: 'themeSystem', icon: 'theme-light-dark' },
  { value: 'light', labelKey: 'themeLight', icon: 'white-balance-sunny' },
  { value: 'dark', labelKey: 'themeDark', icon: 'weather-night' },
]

const SUPPORT_SETTINGS_HREF = {
  pathname: '/support',
  params: { screen: 'settings' },
} as unknown as Href

const PLAYER_ROLE_HREF = {
  pathname: '/player-role',
  params: { from: 'settings' },
} as unknown as Href

const TERMS_URL = 'https://bakani30.github.io/rally-legal/terms.html'
const PRIVACY_URL = 'https://bakani30.github.io/rally-legal/privacy.html'

export default function SettingsScreen() {
  const { t } = useI18n(settingsDictionary)
  const { user } = useAuth()
  const { data: profile } = useProfile(user?.id)
  const jerseyNumberMutation = useJerseyNumber(user?.id)
  const signOutMutation = useSignOut()
  const [uidCopied, setUidCopied] = useState(false)
  const [jerseyDraft, setJerseyDraft] = useState('')
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const appVersion = Constants.expoConfig?.version ?? '—'
  const themePreference = useThemeStore((state) => state.preference)
  const setThemePreference = useThemeStore((state) => state.setPreference)
  const languagePreference = useLanguageStore((state) => state.language)
  const setLanguagePreference = useLanguageStore((state) => state.setLanguage)

  useEffect(() => {
    if (profile?.jersey_number == null) return
    setJerseyDraft(String(profile.jersey_number))
  }, [profile?.jersey_number])

  async function copyUid() {
    if (!user?.id) return
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { setStringAsync } = require('expo-clipboard') as typeof import('expo-clipboard')
      await setStringAsync(user.id)
      setUidCopied(true)
      setTimeout(() => setUidCopied(false), 1400)
    } catch {
      Alert.alert(t('uidAlertTitle'), user.id)
    }
  }

  function saveJerseyNumber() {
    const next = Number.parseInt(jerseyDraft.trim(), 10)
    if (!Number.isInteger(next) || next < 0 || next > 99) {
      Alert.alert(t('jerseyNumberAlertTitle'), t('jerseyNumberRangeError'))
      return
    }
    jerseyNumberMutation.mutate(next, {
      onError: (e) => {
        Alert.alert(t('errorTitle'), e instanceof Error ? e.message : t('jerseyUpdateError'))
      },
    })
  }

  async function signOut() {
    try {
      await signOutMutation.mutateAsync()
    } catch (error) {
      Alert.alert(t('errorTitle'), error instanceof Error ? error.message : t('signOutError'))
    }
  }

  return (
    <Screen
      edges={['top', 'bottom']}
      topPad={Spacing.md}
      bottomPad={Spacing.xxxl}
      backgroundColor={theme.bg}
      contentContainerStyle={styles.container}
    >
      <View style={styles.topBar}>
        <ScreenBackButton
          style={styles.topBarBack}
          onPress={() => guardedRouter.dismissTo('/profile', { actionKey: 'settings:exit-profile' })}
          accessibilityLabel={t('back')}
        />
        <Text style={styles.screenTitle}>{t('screenTitle')}</Text>
      </View>

      <Text style={styles.sectionLabel}>{t('sectionAccount')}</Text>

      {user?.id && (
        <View style={styles.row}>
          <MaterialCommunityIcons name="identifier" size={15} color={theme.mutedSoft} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>UID</Text>
            <Text style={styles.rowSub} numberOfLines={1}>{user.id}</Text>
          </View>
          <PressableScale onPress={copyUid} style={styles.copyBtn} accessibilityLabel={t('copyUidLabel')}>
            <MaterialCommunityIcons
              name={uidCopied ? 'check' : 'content-copy'}
              size={15}
              color={uidCopied ? theme.green : theme.muted}
            />
            <Text style={[styles.copyBtnText, uidCopied && { color: theme.greenVivid }]}>
              {uidCopied ? t('copied') : t('copy')}
            </Text>
          </PressableScale>
        </View>
      )}

      <Link href="/user/edit-username" asChild>
        <PressableScale style={styles.row}>
          <MaterialCommunityIcons name="pencil-outline" size={15} color={theme.mutedSoft} />
          <Text style={[styles.rowLabel, { flex: 1 }]}>{t('editUsername')}</Text>
          <MaterialCommunityIcons name="chevron-right" size={16} color={theme.mutedSoft} />
        </PressableScale>
      </Link>

      <View style={styles.row}>
        <MaterialCommunityIcons name="tshirt-crew-outline" size={15} color={theme.mutedSoft} />
        <View style={{ flex: 1 }}>
          <Text style={styles.rowLabel}>{t('jerseyNumber')}</Text>
          <Text style={styles.rowSub}>{t('jerseyNumberHint')}</Text>
        </View>
        <TextInput
          style={styles.jerseyInput}
          value={jerseyDraft}
          onChangeText={(value) => setJerseyDraft(value.replace(/[^\d]/g, '').slice(0, 2))}
          keyboardType="number-pad"
          maxLength={2}
          placeholder="0"
          placeholderTextColor={theme.mutedSoft}
          selectTextOnFocus
        />
        <PressableScale
          style={styles.copyBtn}
          onPress={saveJerseyNumber}
          disabled={jerseyNumberMutation.isPending}
          accessibilityLabel={t('saveJerseyNumberLabel')}
        >
          <Text style={styles.copyBtnText}>
            {jerseyNumberMutation.isPending ? '...' : t('save')}
          </Text>
        </PressableScale>
      </View>

      <Text style={[styles.sectionLabel, { marginTop: Spacing.md }]}>{t('sectionTheme')}</Text>
      <View style={styles.themeChoices}>
        {THEME_OPTIONS.map((option) => {
          const active = themePreference === option.value
          const optionLabel = t(option.labelKey)
          return (
            <PressableScale
              key={option.value}
              style={[styles.themeChoice, active && styles.themeChoiceActive]}
              onPress={() => void setThemePreference(option.value)}
              accessibilityLabel={t('useThemeLabel', { theme: optionLabel })}
            >
              <MaterialCommunityIcons
                name={option.icon}
                size={15}
                color={active ? theme.chalk : theme.muted}
              />
              <Text style={[styles.themeChoiceText, active && styles.themeChoiceTextActive]}>
                {optionLabel}
              </Text>
            </PressableScale>
          )
        })}
      </View>

      <Text style={[styles.sectionLabel, { marginTop: Spacing.md }]}>{t('sectionLanguage')}</Text>
      <View style={styles.themeChoices}>
        {APP_LANGUAGE_OPTIONS.map((option) => {
          const active = languagePreference === option.value
          return (
            <PressableScale
              key={option.value}
              style={[styles.themeChoice, active && styles.themeChoiceActive]}
              onPress={() => void setLanguagePreference(option.value)}
              accessibilityLabel={t('useLanguageLabel', { language: option.label })}
            >
              <Text style={[styles.languageShort, active && styles.themeChoiceTextActive]}>
                {option.shortLabel}
              </Text>
              <Text style={[styles.themeChoiceText, active && styles.themeChoiceTextActive]}>
                {option.label}
              </Text>
            </PressableScale>
          )
        })}
      </View>

      <Text style={[styles.sectionLabel, { marginTop: Spacing.md }]}>{t('sectionProfile')}</Text>
      <PressableScale
        style={styles.row}
        onPress={() => guardedRouter.replace('/onboarding/edit', { actionKey: 'settings:edit-profile' })}
      >
        <MaterialCommunityIcons name="account-edit-outline" size={15} color={theme.green} />
        <View style={{ flex: 1 }}>
          <Text style={styles.rowLabel}>{t('personalInfoRow')}</Text>
          <Text style={styles.rowSub}>{t('personalInfoHint')}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={16} color={theme.mutedSoft} />
      </PressableScale>

      <Link href={PLAYER_ROLE_HREF} asChild>
        <PressableScale style={styles.row}>
          <MaterialCommunityIcons name="basketball" size={15} color={theme.green} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>{t('playerRoleRow')}</Text>
            <Text style={styles.rowSub}>{t('playerRoleHint')}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={16} color={theme.mutedSoft} />
        </PressableScale>
      </Link>

      <Text style={[styles.sectionLabel, { marginTop: Spacing.md }]}>{t('sectionHelp')}</Text>
      <Link href={SUPPORT_SETTINGS_HREF} asChild>
        <PressableScale style={styles.row}>
          <MaterialCommunityIcons name="lifebuoy" size={15} color={theme.blue} />
          <Text style={[styles.rowLabel, { flex: 1 }]}>{t('supportRow')}</Text>
          <MaterialCommunityIcons name="chevron-right" size={16} color={theme.mutedSoft} />
        </PressableScale>
      </Link>

      <Text style={[styles.sectionLabel, { marginTop: Spacing.md }]}>{t('sectionAbout')}</Text>
      <View style={styles.row}>
        <MaterialCommunityIcons name="information-outline" size={15} color={theme.mutedSoft} />
        <Text style={[styles.rowLabel, { flex: 1 }]}>{t('appVersion')}</Text>
        <Text style={styles.rowSub}>{appVersion}</Text>
      </View>
      <PressableScale style={styles.row} onPress={() => void Linking.openURL(TERMS_URL)}>
        <MaterialCommunityIcons name="file-document-outline" size={15} color={theme.mutedSoft} />
        <Text style={[styles.rowLabel, { flex: 1 }]}>{t('termsRow')}</Text>
        <MaterialCommunityIcons name="open-in-new" size={15} color={theme.mutedSoft} />
      </PressableScale>
      <PressableScale style={styles.row} onPress={() => void Linking.openURL(PRIVACY_URL)}>
        <MaterialCommunityIcons name="shield-lock-outline" size={15} color={theme.mutedSoft} />
        <Text style={[styles.rowLabel, { flex: 1 }]}>{t('privacyPolicyRow')}</Text>
        <MaterialCommunityIcons name="open-in-new" size={15} color={theme.mutedSoft} />
      </PressableScale>

      <Text style={[styles.sectionLabel, { marginTop: Spacing.md }]}>{t('sectionManageAccount')}</Text>
      <PressableScale style={styles.row} onPress={signOut} disabled={signOutMutation.isPending}>
        <MaterialCommunityIcons name="logout-variant" size={15} color={theme.mutedSoft} />
        {signOutMutation.isPending ? (
          <ActivityIndicator size="small" color={theme.muted} style={{ marginLeft: 4 }} />
        ) : (
          <Text style={[styles.rowLabel, { flex: 1 }]}>{t('signOut')}</Text>
        )}
      </PressableScale>

      <Link href="/account/blocked" asChild>
        <PressableScale style={styles.row}>
          <MaterialCommunityIcons name="account-cancel-outline" size={15} color={theme.mutedSoft} />
          <Text style={[styles.rowLabel, { flex: 1 }]}>{t('blockedUsers')}</Text>
          <MaterialCommunityIcons name="chevron-right" size={16} color={theme.mutedSoft} />
        </PressableScale>
      </Link>

      <Link href="/account/delete" asChild>
        <PressableScale style={styles.row}>
          <MaterialCommunityIcons name="trash-can-outline" size={15} color={theme.red} />
          <Text style={[styles.rowLabel, { flex: 1, color: theme.red }]}>{t('deleteAccount')}</Text>
          <MaterialCommunityIcons name="chevron-right" size={16} color={theme.mutedSoft} />
        </PressableScale>
      </Link>

      <View style={{ height: 32 }} />
    </Screen>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    container: { paddingHorizontal: 20 },
    topBar: {
      width: '100%',
      minHeight: 52,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.md,
    },
    topBarBack: { position: 'absolute', left: 0, top: 4 },
    screenTitle: {
      fontSize: 22,
      lineHeight: 30,
      fontWeight: '900',
      fontFamily: Fonts?.thaiHead,
      color: theme.ink,
      textAlign: 'center',
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '900',
      color: theme.muted,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: Radius.lg,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.line,
      marginBottom: 8,
    },
    rowLabel: { fontSize: 14, fontWeight: '700', color: theme.ink },
    rowSub: { fontSize: 11, color: theme.muted, marginTop: 1, fontVariant: ['tabular-nums'] },
    rowToggle: { fontSize: 12, fontWeight: '900', color: theme.amber, letterSpacing: 0.5 },
    copyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: Radius.md,
      backgroundColor: theme.bgElevated,
      borderWidth: 1,
      borderColor: theme.line,
    },
    copyBtnText: { fontSize: 11, fontWeight: '800', color: theme.muted },
    jerseyInput: {
      width: 46,
      minHeight: 32,
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.bgElevated,
      color: theme.ink,
      fontSize: 15,
      fontWeight: '900',
      textAlign: 'center',
      fontVariant: ['tabular-nums'],
    },
    themeChoices: { flexDirection: 'row', gap: Spacing.xs, marginBottom: 8 },
    themeChoice: {
      flex: 1,
      minHeight: 40,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface,
    },
    themeChoiceActive: { backgroundColor: theme.red, borderColor: theme.red },
    themeChoiceText: { color: theme.muted, fontSize: 12, fontWeight: '900', letterSpacing: 0.2 },
    themeChoiceTextActive: { color: theme.chalk },
    languageShort: { color: theme.muted, fontSize: 10, fontWeight: '900', letterSpacing: 0.6 },
  })
}
