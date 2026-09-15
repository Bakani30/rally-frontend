import { StyleSheet, Text, TextInput, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Sport, Spacing } from '@/constants/theme'
import {
  parseNullableBasketballStatInput,
  stepNullableBasketballStat,
  type NullableBasketballStatValue,
} from '@/lib/coach/basketballNullableStatInput'

type Props = {
  label: string
  language: 'en' | 'th'
  value: NullableBasketballStatValue
  onChange: (value: NullableBasketballStatValue) => void
  disabled?: boolean
}

export function BasketballNullableStatInput({
  label,
  language,
  value,
  onChange,
  disabled = false,
}: Props) {
  const isUnknown = value == null
  const decrementDisabled = disabled || isUnknown || (value != null && value <= 0)
  const incrementDisabled = disabled || (value != null && value >= 200)
  const unknownLabel = language === 'th' ? `${label}: ไม่ทราบหรือไม่ได้ระบุ` : `${label}: unknown or not recorded`

  return (
    <View style={styles.cell}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <PressableScale
          style={[styles.unknownButton, isUnknown && styles.unknownButtonSelected]}
          onPress={() => onChange(null)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={unknownLabel}
          accessibilityState={{ disabled, selected: isUnknown }}
        >
          <Text style={[styles.unknownText, isUnknown && styles.unknownTextSelected]}>—</Text>
        </PressableScale>
      </View>

      <View style={styles.controlRow}>
        <PressableScale
          style={[styles.stepButton, decrementDisabled && styles.buttonDisabled]}
          onPress={() => onChange(stepNullableBasketballStat(value, -1))}
          disabled={decrementDisabled}
          accessibilityRole="button"
          accessibilityLabel={language === 'th' ? `ลด ${label}` : `Decrease ${label}`}
          accessibilityState={{ disabled: decrementDisabled }}
        >
          <MaterialCommunityIcons name="minus" size={18} color={Sport.inkSoft} />
        </PressableScale>

        <TextInput
          style={styles.input}
          value={value == null ? '' : String(value)}
          onChangeText={(raw) => onChange(parseNullableBasketballStatInput(raw, value))}
          editable={!disabled}
          keyboardType="number-pad"
          placeholder="—"
          placeholderTextColor={Sport.mutedSoft}
          maxLength={3}
          selectTextOnFocus
          accessibilityLabel={language === 'th' ? `กรอก ${label}` : `Enter ${label}`}
          accessibilityHint={
            language === 'th'
              ? 'กรอกศูนย์เมื่อยืนยันว่าไม่มี หรือเลือกขีดเมื่อไม่ทราบ'
              : 'Enter zero when confirmed, or select the dash when unknown.'
          }
        />

        <PressableScale
          style={[styles.stepButton, incrementDisabled && styles.buttonDisabled]}
          onPress={() => onChange(stepNullableBasketballStat(value, 1))}
          disabled={incrementDisabled}
          accessibilityRole="button"
          accessibilityLabel={language === 'th' ? `เพิ่ม ${label}` : `Increase ${label}`}
          accessibilityState={{ disabled: incrementDisabled }}
        >
          <MaterialCommunityIcons name="plus" size={18} color={Sport.inkSoft} />
        </PressableScale>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  cell: {
    width: '48%',
    minWidth: 142,
    flexGrow: 1,
    minHeight: 104,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Sport.line,
    backgroundColor: Sport.surfaceStrong,
    padding: Spacing.xs,
    gap: 4,
  },
  header: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    color: Sport.muted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  unknownButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unknownButtonSelected: {
    backgroundColor: Sport.surface,
    borderWidth: 1,
    borderColor: Sport.lineStrong,
  },
  unknownText: {
    color: Sport.muted,
    fontSize: 18,
    fontWeight: '900',
  },
  unknownTextSelected: { color: Sport.inkSoft },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stepButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Sport.line,
    backgroundColor: Sport.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.38 },
  input: {
    flex: 1,
    minWidth: 42,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Sport.line,
    backgroundColor: Sport.bg,
    color: Sport.ink,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '900',
    paddingHorizontal: 2,
    paddingVertical: 0,
  },
})
