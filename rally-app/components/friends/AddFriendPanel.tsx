import { ActivityIndicator, Platform, StyleSheet, Text, TextInput, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { PressableScale } from '@/components/motion/PressableScale'
import { Arcade, OnAccent, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'

type AddFriendPanelProps = {
  value: string
  pending: boolean
  onChangeText: (value: string) => void
  onSubmit: () => void
  onClear: () => void
}

/** UID / @handle entry + add CTA. Placeholder carries the hint — no help copy. */
export function AddFriendPanel({ value, pending, onChangeText, onSubmit, onClear }: AddFriendPanelProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)

  return (
    <View style={styles.panel}>
      <View style={styles.inputRow}>
        <MaterialCommunityIcons name="account-plus-outline" size={18} color={theme.muted} />
        <TextInput
          style={styles.input}
          placeholder="วาง UID หรือ @handle"
          placeholderTextColor={theme.mutedSoft}
          autoCapitalize="none"
          autoCorrect={false}
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          returnKeyType="done"
        />
        {value.length > 0 ? (
          <PressableScale onPress={onClear} accessibilityLabel="ล้าง">
            <MaterialCommunityIcons name="close-circle" size={18} color={theme.mutedSoft} />
          </PressableScale>
        ) : null}
      </View>
      <PressableScale
        style={[styles.addBtn, pending && styles.disabled]}
        onPress={onSubmit}
        disabled={pending}
        accessibilityLabel="เพิ่มเพื่อน"
      >
        {pending ? (
          <ActivityIndicator color={OnAccent.onColor} />
        ) : (
          <>
            <MaterialCommunityIcons name="account-plus" size={18} color={OnAccent.onColor} />
            <Text style={styles.addText}>เพิ่มเพื่อน</Text>
          </>
        )}
      </PressableScale>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    panel: {
      gap: Spacing.sm,
      padding: Spacing.md,
      borderRadius: Radius.xl,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.line,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 11,
      borderRadius: Radius.lg,
      backgroundColor: theme.bgElevated,
      borderWidth: 1,
      borderColor: theme.line,
    },
    input: { flex: 1, color: theme.ink, fontSize: 14, paddingVertical: 0 },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      minHeight: 48,
      borderRadius: Radius.lg,
      backgroundColor: theme.orange,
      borderWidth: Arcade.border.panel,
      borderColor: theme.arcadeCabinetEdge,
      ...Platform.select({
        web: { boxShadow: `4px 5px 0 ${theme.arcadeShadow}` },
        default: {
          shadowColor: theme.arcadeCabinetEdge,
          shadowOffset: { width: 4, height: 5 },
          shadowOpacity: 0.24,
          shadowRadius: 0,
          elevation: 4,
        },
      }),
    },
    addText: {
      color: OnAccent.onColor,
      fontSize: 13,
      fontWeight: '900',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    disabled: { opacity: 0.6 },
  })
}
