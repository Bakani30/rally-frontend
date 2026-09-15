import { StyleSheet, TextInput, View } from 'react-native'

import { SheetPalette } from '@/components/onboarding/onboardingSheetPalette'
import { RallyText } from '@/components/ui/RallyText'
import { Radius, Spacing } from '@/constants/theme'

type SheetSuffixInputProps = {
  label: string
  suffix: string
  value: string
  onChange: (value: string) => void
  accessibilityLabel: string
}

/** Boxed numeric field with a muted unit suffix (height/weight on the sheet). */
export function SheetSuffixInput({
  label,
  suffix,
  value,
  onChange,
  accessibilityLabel,
}: SheetSuffixInputProps) {
  return (
    <View style={styles.box}>
      <RallyText variant="body" style={styles.label}>{label}</RallyText>
      <View style={styles.row}>
        <TextInput
          style={styles.field}
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          placeholder="—"
          placeholderTextColor={SheetPalette.mutedSoft}
          accessibilityLabel={accessibilityLabel}
        />
        <RallyText variant="body" style={styles.suffix}>{suffix}</RallyText>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: SheetPalette.line,
    backgroundColor: SheetPalette.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    gap: 2,
  },
  label: {
    color: SheetPalette.muted,
    fontSize: 9.5,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  field: { flex: 1, color: SheetPalette.ink, fontSize: 18, fontWeight: '800', padding: 0 },
  suffix: { color: SheetPalette.muted, fontSize: 12 },
})
