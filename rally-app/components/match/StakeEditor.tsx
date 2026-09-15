import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Sport, Spacing } from '@/constants/theme'
import { buildQuickStakes } from '@/lib/match/stakeOptions'

const MAX_DIGITS = 6

type Props = {
  title: string
  currentStake: number
  minStake: number
  maxStake?: number
  acceptedCount: number
  onSubmit: (newStake: number) => void
  onCancel: () => void
  isSaving: boolean
  currencyUnit?: string
  currencyLabel?: string
}

export function StakeEditor({
  title,
  currentStake,
  minStake,
  maxStake,
  acceptedCount,
  onSubmit,
  onCancel,
  isSaving,
  currencyUnit = 'pts',
  currencyLabel = 'POINTS',
}: Props) {
  const [digits, setDigits] = useState('')

  const newStake = digits.length > 0 ? parseInt(digits, 10) : NaN
  const isInteger = Number.isInteger(newStake)
  const aboveMin = isInteger && newStake >= minStake
  const withinMax = maxStake == null || (isInteger && newStake <= maxStake)
  const newStakeValid = aboveMin && withinMax
  const isSame = newStakeValid && newStake === currentStake
  const canSave = newStakeValid && !isSame && !isSaving

  function pressDigit(d: string) {
    setDigits((prev) => {
      const next = (prev + d).replace(/^0+/, '')
      if (next.length > MAX_DIGITS) return prev
      return next
    })
  }

  function pressBackspace() {
    setDigits((prev) => prev.slice(0, -1))
  }

  function pressClear() {
    setDigits('')
  }

  function handleSave() {
    if (!canSave) return
    onSubmit(newStake)
  }

  const display = digits.length > 0 ? digits : '0'
  const quickStakes = buildQuickStakes(minStake, maxStake)
  const displayColor = !digits
    ? Sport.mutedSoft
    : newStakeValid
      ? Sport.ink
      : Sport.red

  const hint = (() => {
    if (!digits) {
      const maxPart = maxStake != null ? ` Max · ${maxStake} ${currencyUnit}.` : ''
      return `Current · ${currentStake} ${currencyUnit}. Min · ${minStake} ${currencyUnit}.${maxPart}`
    }
    if (!aboveMin) return `เดิมพันต้อง ≥ ${minStake} ${currencyUnit}`
    if (!withinMax) return `เกินวงเงินเดิมพัน — ได้สูงสุด ${maxStake} ${currencyUnit}`
    if (isSame) return 'Same as your current stake.'
    return acceptedCount > 0
      ? `Saving will revoke ${acceptedCount} accept${acceptedCount > 1 ? 's' : ''} — everyone must accept again.`
      : 'No one has accepted yet.'
  })()

  return (
    <View style={s.wrap}>
      <View style={s.header}>
        <Text style={s.title}>{title}</Text>
        <PressableScale style={s.closeBtn} onPress={onCancel} accessibilityLabel="Close">
          <MaterialCommunityIcons name="close" size={18} color={Sport.inkSoft} />
        </PressableScale>
      </View>

      <View style={s.displayCard}>
        <Text style={s.displayLabel}>NEW STAKE</Text>
        <Text style={[s.displayValue, { color: displayColor }]}>{display}</Text>
        <Text style={s.displayUnit}>{currencyLabel.toUpperCase()}</Text>
      </View>

      {quickStakes.length > 0 && (
        <View style={s.quickRow}>
          {quickStakes.map((stake) => {
            const selected = newStake === stake
            return (
              <PressableScale
                key={stake}
                style={[s.quickChip, selected && s.quickChipSelected]}
                onPress={() => setDigits(String(stake))}
                disabled={isSaving}
                accessibilityLabel={`เลือก stake ${stake} ${currencyUnit}`}
              >
                <Text style={[s.quickChipText, selected && s.quickChipTextSelected]}>
                  {stake}
                </Text>
              </PressableScale>
            )
          })}
        </View>
      )}

      <Text style={[s.hint, digits && !newStakeValid ? { color: Sport.red } : null]}>{hint}</Text>

      <View style={s.keypad}>
        <View style={s.keypadRow}>
          <Key label="1" onPress={() => pressDigit('1')} />
          <Key label="2" onPress={() => pressDigit('2')} />
          <Key label="3" onPress={() => pressDigit('3')} />
        </View>
        <View style={s.keypadRow}>
          <Key label="4" onPress={() => pressDigit('4')} />
          <Key label="5" onPress={() => pressDigit('5')} />
          <Key label="6" onPress={() => pressDigit('6')} />
        </View>
        <View style={s.keypadRow}>
          <Key label="7" onPress={() => pressDigit('7')} />
          <Key label="8" onPress={() => pressDigit('8')} />
          <Key label="9" onPress={() => pressDigit('9')} />
        </View>
        <View style={s.keypadRow}>
          <Key label="C" onPress={pressClear} muted disabled={!digits} />
          <Key label="0" onPress={() => pressDigit('0')} />
          <Key
            icon="backspace-outline"
            onPress={pressBackspace}
            muted
            disabled={!digits}
            accessibilityLabel="Backspace"
          />
        </View>
      </View>

      <PressableScale
        style={[s.saveButton, !canSave && s.saveButtonDisabled]}
        onPress={handleSave}
        disabled={!canSave}
      >
        <Text style={[s.saveButtonText, !canSave && s.saveButtonTextDisabled]}>
          {isSaving ? 'SAVING…' : 'SAVE'}
        </Text>
      </PressableScale>
    </View>
  )
}

type KeyProps = {
  label?: string
  icon?: 'backspace-outline'
  onPress: () => void
  muted?: boolean
  disabled?: boolean
  accessibilityLabel?: string
}

function Key({ label, icon, onPress, muted, disabled, accessibilityLabel }: KeyProps) {
  return (
    <PressableScale
      style={[s.key, muted && s.keyMuted, disabled && s.keyDisabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
    >
      {icon ? (
        <MaterialCommunityIcons
          name={icon}
          size={26}
          color={disabled ? Sport.mutedSoft : muted ? Sport.inkSoft : Sport.ink}
        />
      ) : (
        <Text
          style={[
            s.keyText,
            muted && s.keyTextMuted,
            disabled && s.keyTextDisabled,
          ]}
        >
          {label}
        </Text>
      )}
    </PressableScale>
  )
}

const s = StyleSheet.create({
  wrap: {
    backgroundColor: Sport.bgElevated,
    borderWidth: 1,
    borderColor: Sport.lineStrong,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 15,
    fontWeight: '900',
    color: Sport.ink,
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    backgroundColor: Sport.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Sport.line,
  },
  displayCard: {
    backgroundColor: Sport.surface,
    borderWidth: 1,
    borderColor: Sport.line,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 2,
  },
  displayLabel: {
    fontSize: 10,
    color: Sport.muted,
    letterSpacing: 2,
    fontWeight: '800',
  },
  displayValue: {
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
    lineHeight: 58,
  },
  displayUnit: {
    fontSize: 11,
    color: Sport.muted,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  quickChip: {
    minWidth: 66,
    minHeight: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    backgroundColor: 'rgba(209,224,221,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(209,224,221,0.2)',
  },
  quickChipSelected: {
    backgroundColor: Sport.amber,
    borderColor: Sport.amber,
  },
  quickChipText: {
    color: Sport.inkSoft,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0,
    fontVariant: ['tabular-nums'],
  },
  quickChipTextSelected: {
    color: Sport.bg,
  },
  hint: {
    fontSize: 12,
    color: Sport.inkSoft,
    textAlign: 'center',
    lineHeight: 17,
  },
  keypad: {
    gap: Spacing.sm,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  key: {
    flex: 1,
    aspectRatio: 1.7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Sport.surfaceStrong,
    borderWidth: 1,
    borderColor: Sport.lineStrong,
    borderRadius: Radius.lg,
  },
  keyMuted: {
    backgroundColor: Sport.surface,
    borderColor: Sport.line,
  },
  keyDisabled: {
    opacity: 0.35,
  },
  keyText: {
    fontSize: 26,
    fontWeight: '800',
    color: Sport.ink,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
  },
  keyTextMuted: {
    fontSize: 20,
    color: Sport.inkSoft,
    fontWeight: '800',
    letterSpacing: 1,
  },
  keyTextDisabled: {
    color: Sport.mutedSoft,
  },
  saveButton: {
    backgroundColor: Sport.red,
    borderRadius: Radius.lg,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: Sport.surface,
    borderWidth: 1,
    borderColor: Sport.line,
  },
  saveButtonText: {
    color: Sport.chalk,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },
  saveButtonTextDisabled: {
    color: Sport.muted,
  },
})
