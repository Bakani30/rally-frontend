import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useI18n } from '@/hooks/useI18n'
import { giftsDictionary } from '@/lib/i18n/dictionaries/gifts'

export type RedeemStoreMode = 'rewards' | 'cosmetics'

type RedeemStoreModeSwitchProps = {
  value: RedeemStoreMode
  onChange: (value: RedeemStoreMode) => void
}

export function RedeemStoreModeSwitch({ value, onChange }: RedeemStoreModeSwitchProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { t } = useI18n(giftsDictionary)

  return (
    <View style={styles.switchRoot} accessibilityRole="tablist">
      <ModeButton
        active={value === 'rewards'}
        icon="shopping-outline"
        label={t('productsMode')}
        onPress={() => onChange('rewards')}
      />
      <ModeButton
        active={value === 'cosmetics'}
        icon="palette-outline"
        label={t('cosmeticsMode')}
        onPress={() => onChange('cosmetics')}
      />
    </View>
  )
}

function ModeButton({
  active,
  icon,
  label,
  onPress,
}: {
  active: boolean
  icon: 'shopping-outline' | 'palette-outline'
  label: string
  onPress: () => void
}) {
  const theme = useSportTheme()
  const styles = createStyles(theme)

  return (
    <PressableScale
      style={[styles.modeButton, active && styles.modeButtonActive]}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
    >
      <MaterialCommunityIcons name={icon} size={18} color={active ? theme.fightBg : theme.inkSoft} />
      <Text style={[styles.modeLabel, active && styles.modeLabelActive]} numberOfLines={1} maxFontSizeMultiplier={1.15}>
        {label}
      </Text>
    </PressableScale>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    switchRoot: {
      minHeight: 54,
      flexDirection: 'row',
      gap: 4,
      borderRadius: Radius.xl,
      backgroundColor: theme.surfaceStrong,
      padding: 4,
    },
    modeButton: {
      flex: 1,
      minWidth: 0,
      minHeight: 46,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      borderRadius: Radius.lg,
      paddingHorizontal: Spacing.sm,
    },
    modeButtonActive: { backgroundColor: theme.orange },
    modeLabel: { flexShrink: 1, color: theme.inkSoft, fontSize: 13, lineHeight: 18, fontWeight: '900' },
    modeLabelActive: { color: theme.fightBg },
  })
}
