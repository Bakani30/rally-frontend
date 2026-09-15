import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { PressableScale } from '@/components/motion/PressableScale'
import { RallyText } from '@/components/ui/RallyText'
import { useSportTheme } from '@/hooks/useAppTheme'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useLanguageStore } from '@/stores/languageStore'
import { APP_LANGUAGE_OPTIONS } from '@/lib/i18n/language'

type LanguageToggleProps = {
  style?: StyleProp<ViewStyle>
}

// Small reusable TH/EN pill switch. Presentational + store-wired only — no
// business logic. Mirrors the inline language pattern in app/settings.tsx
// (shortLabel + label pills) but is self-contained so callers outside
// settings (e.g. sign-in) can mount it without depending on that screen.
export function LanguageToggle({ style }: LanguageToggleProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const language = useLanguageStore((s) => s.language)
  const setLanguage = useLanguageStore((s) => s.setLanguage)

  return (
    <View style={[styles.row, style]}>
      {APP_LANGUAGE_OPTIONS.map((option) => {
        const selected = language === option.value
        return (
          <PressableScale
            key={option.value}
            style={[styles.pill, selected && styles.pillActive]}
            onPress={() => void setLanguage(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
          >
            <Text style={[styles.shortLabel, selected && styles.labelActive]}>
              {option.shortLabel}
            </Text>
            <RallyText variant="body" style={[styles.label, selected && styles.labelActive]}>
              {option.label}
            </RallyText>
          </PressableScale>
        )
      })}
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    row: { flexDirection: 'row', gap: Spacing.xs },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderWidth: 1,
      borderColor: theme.line,
      borderRadius: Radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: theme.surface,
    },
    pillActive: { backgroundColor: theme.red, borderColor: theme.red },
    shortLabel: { color: theme.muted, fontSize: 10, fontWeight: '900', letterSpacing: 0.6 },
    label: { color: theme.muted, fontSize: 12, letterSpacing: 0.2 },
    labelActive: { color: theme.chalk },
  })
}
