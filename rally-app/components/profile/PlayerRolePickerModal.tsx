import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, type SportPalette, Spacing } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useI18n } from '@/hooks/useI18n'
import type { PlayerRole } from '@/lib/activities/playerRoles'
import { onboardingDictionary } from '@/lib/i18n/dictionaries/onboarding'
import { profileTabDictionary } from '@/lib/i18n/dictionaries/profileTab'

type PlayerRolePickerModalProps = {
  visible: boolean
  title: string
  options: readonly PlayerRole[]
  currentKey: string | null
  onSelect: (key: string) => void
  onClose: () => void
}

// Picker for a player's preferred role/play-style on an activity
// (basketball position, running style, badminton role). Controlled by the
// parent; selecting a row commits and closes.
export function PlayerRolePickerModal({
  visible,
  title,
  options,
  currentKey,
  onSelect,
  onClose,
}: PlayerRolePickerModalProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { t } = useI18n(profileTabDictionary)
  const { t: tOnboarding } = useI18n(onboardingDictionary)
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.list}>
            {options.map((option) => {
              const selected = option.key === currentKey
              return (
                <PressableScale
                  key={option.key}
                  style={[styles.row, selected ? styles.rowSelected : null]}
                  onPress={() => onSelect(option.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${tOnboarding(option.labelKey)} (${option.short})`}
                >
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{option.short}</Text>
                  </View>
                  <Text style={styles.rowLabel} numberOfLines={1}>
                    {tOnboarding(option.labelKey)}
                  </Text>
                  {selected ? (
                    <MaterialCommunityIcons name="check-circle" size={20} color={theme.red} />
                  ) : null}
                </PressableScale>
              )
            })}
          </View>
          <PressableScale style={styles.dismiss} onPress={onClose}>
            <Text style={styles.dismissText}>{t('rolePickerClose')}</Text>
          </PressableScale>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing.xl,
    },
    card: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: theme.bgElevated,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: theme.line,
      padding: Spacing.xl,
      gap: Spacing.sm,
      ...Platform.select({
        web: { boxShadow: '0 24px 60px -10px rgba(0,0,0,0.6)' },
        default: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 18 },
          shadowOpacity: 0.45,
          shadowRadius: 24,
          elevation: 12,
        },
      }),
    },
    title: {
      color: theme.ink,
      fontSize: 18,
      fontWeight: '900',
      letterSpacing: -0.2,
      marginBottom: Spacing.xs,
    },
    list: { gap: Spacing.xs },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      minHeight: 48,
      paddingHorizontal: Spacing.sm,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface,
    },
    rowSelected: { borderColor: theme.red },
    badge: {
      width: 44,
      height: 32,
      borderRadius: 10,
      backgroundColor: theme.arcadeCabinet,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: { color: theme.chalk, fontSize: 12, fontWeight: '900', letterSpacing: 0.4 },
    rowLabel: { flex: 1, color: theme.ink, fontSize: 15, fontWeight: '800' },
    dismiss: { alignItems: 'center', paddingVertical: Spacing.sm, marginTop: Spacing.xs },
    dismissText: { color: theme.muted, fontSize: 13, fontWeight: '800' },
  })
}
