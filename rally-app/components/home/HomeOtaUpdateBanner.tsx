import { useMemo } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useI18n } from '@/hooks/useI18n'
import { homeDictionary } from '@/lib/i18n/dictionaries/home'

type HomeOtaUpdateBannerProps = {
  /** Reload is in flight — freeze the button so it isn't double-tapped. */
  applying: boolean
  /** A live run blocks the reload; explain instead of offering the button. */
  runSessionLive: boolean
  onApply: () => void
}

/**
 * Shown after a pull-to-refresh downloaded a new OTA bundle. Applying reloads
 * the JS bundle in place, so the action is explicit — never automatic.
 */
export function HomeOtaUpdateBanner({ applying, runSessionLive, onApply }: HomeOtaUpdateBannerProps) {
  const theme = useSportTheme()
  const { t } = useI18n(homeDictionary)
  const styles = useMemo(() => createStyles(theme), [theme])

  return (
    <View style={styles.wrap}>
      <MaterialCommunityIcons name="rocket-launch-outline" size={18} color={theme.orange} />
      <View style={styles.copy}>
        <Text style={styles.title}>{t('otaUpdateTitle')}</Text>
        <Text style={styles.body}>
          {runSessionLive
            ? t('otaUpdateBodyLive')
            : t('otaUpdateBodyReady')}
        </Text>
      </View>
      {!runSessionLive && (
        <Pressable
          accessibilityRole="button"
          style={styles.button}
          disabled={applying}
          onPress={onApply}
        >
          {applying
            ? <ActivityIndicator size="small" color={theme.arcadePanel} />
            : <Text style={styles.buttonText}>{t('otaInstallNow')}</Text>}
        </Pressable>
      )}
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 1,
      borderColor: theme.orange,
      backgroundColor: theme.arcadePanel,
      borderRadius: 16,
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    copy: { flex: 1, gap: 2 },
    title: { fontSize: 14, fontWeight: '800', color: theme.ink },
    body: { fontSize: 12, color: theme.muted },
    button: {
      backgroundColor: theme.orange,
      borderRadius: 12,
      paddingVertical: 8,
      paddingHorizontal: 14,
      minWidth: 76,
      alignItems: 'center',
    },
    buttonText: { fontSize: 13, fontWeight: '800', color: theme.arcadePanel },
  })
}
