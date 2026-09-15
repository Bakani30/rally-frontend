import { useEffect, useState } from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useI18n, type Translator } from '@/hooks/useI18n'
import { refereeMatchDictionary } from '@/lib/i18n/dictionaries/refereeMatch'
import { getParticipantDisplayName, validateRefereePlayerStatDraftInput } from '@/lib/match/matchRules'
import type { RefereePlayerStatInput } from '@/lib/match/alphaRefereeService'
import type { AlphaRefereePlayerStatDraft, MatchParticipant } from '@/types/match'

type RefereeMatchTranslator = Translator<keyof typeof refereeMatchDictionary>

type RefereePlayerStatSheetProps = {
  visible: boolean
  participant: MatchParticipant | null
  draft: AlphaRefereePlayerStatDraft | null
  pending: boolean
  /** Points a behind-the-arc shot is worth: 2 for half-court (1v1/2v2/3v3), 3 for 5v5. */
  longRangePointValue: number
  onClose: () => void
  onSave: (stats: RefereePlayerStatInput) => Promise<void> | void
}

function fieldConfig(longShotLabel: string, t: RefereeMatchTranslator): {
  key: keyof RefereePlayerStatInput
  label: string
  hint: string
}[] {
  return [
    { key: 'points', label: 'PTS', hint: t('pointsHint') },
    { key: 'rebounds', label: 'REB', hint: t('reboundsHint') },
    { key: 'assists', label: 'AST', hint: t('assistsHint') },
    { key: 'blocks', label: 'BLK', hint: t('blocksHint') },
    {
      key: 'threePointersMade',
      label: longShotLabel,
      hint: longShotLabel === '3PM' ? t('threePointsHint') : t('twoPointsHint'),
    },
  ]
}

export function RefereePlayerStatSheet({
  visible,
  participant,
  draft,
  pending,
  longRangePointValue,
  onClose,
  onSave,
}: RefereePlayerStatSheetProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { t } = useI18n(refereeMatchDictionary)
  const longShotLabel = longRangePointValue === 3 ? '3PM' : '2PT'
  const fields = fieldConfig(longShotLabel, t)
  const [values, setValues] = useState<Record<keyof RefereePlayerStatInput, string>>({
    points: '0',
    rebounds: '0',
    assists: '0',
    blocks: '0',
    threePointersMade: '0',
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!visible) return
    setError(null)
    setValues({
      points: String(draft?.points ?? 0),
      rebounds: String(draft?.rebounds ?? 0),
      assists: String(draft?.assists ?? 0),
      blocks: String(draft?.blocks ?? 0),
      threePointersMade: String(draft?.three_pointers_made ?? 0),
    })
  }, [draft, visible])

  if (!participant) return null

  const sideColor = participant.side === 0 ? theme.red : theme.blue
  const name = getParticipantDisplayName(participant)

  function updateField(key: keyof RefereePlayerStatInput, raw: string) {
    setError(null)
    setValues((current) => ({
      ...current,
      [key]: raw.replace(/[^\d]/g, ''),
    }))
  }

  async function save() {
    const stats: RefereePlayerStatInput = {
      points: parseStat(values.points),
      rebounds: parseStat(values.rebounds),
      assists: parseStat(values.assists),
      blocks: parseStat(values.blocks),
      threePointersMade: parseStat(values.threePointersMade),
    }
    const validationError = validateRefereePlayerStatDraftInput(stats, longRangePointValue)
    if (validationError) {
      setError(t('invalidStats'))
      return
    }
    try {
      await onSave(stats)
    } catch {
      setError(t('saveStatsFailed'))
    }
  }

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.scrim} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <View style={styles.header}>
            <View style={[styles.sideBadge, { borderColor: `${sideColor}66`, backgroundColor: `${sideColor}18` }]}>
              <Text style={[styles.sideText, { color: sideColor }]}>
                {t('sideLabel', { side: participant.side === 0 ? 'A' : 'B' })}
              </Text>
            </View>
            <View style={styles.headerCopy}>
              <Text style={styles.title} numberOfLines={1}>{name}</Text>
              <Text style={styles.subtitle}>{t('statSheetSubtitle')}</Text>
            </View>
            <PressableScale
              style={styles.closeButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t('closeStatSheet')}
            >
              <MaterialCommunityIcons name="close" size={20} color={theme.inkSoft} />
            </PressableScale>
          </View>

          <View style={styles.grid}>
            {fields.map((field) => (
              <View key={field.key} style={styles.field}>
                <Text style={styles.fieldLabel}>{field.label}</Text>
                <TextInput
                  style={styles.input}
                  value={values[field.key]}
                  onChangeText={(text) => updateField(field.key, text)}
                  keyboardType="number-pad"
                  selectTextOnFocus
                  maxLength={5}
                  accessibilityLabel={t('statFieldA11y', { label: field.label, name })}
                />
                <Text style={styles.fieldHint}>{field.hint}</Text>
              </View>
            ))}
          </View>

          {error ? (
            <View style={styles.errorRow}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color={theme.red} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <PressableScale
            style={[styles.saveButton, pending && styles.saveButtonDisabled]}
            onPress={save}
            disabled={pending}
            accessibilityRole="button"
            accessibilityLabel={t('savePlayerStats', { name })}
          >
            <MaterialCommunityIcons name="content-save-check" size={17} color={theme.bg} />
            <Text style={styles.saveText}>{pending ? t('sending') : t('saveStats')}</Text>
          </PressableScale>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

function parseStat(raw: string): number {
  const value = Number.parseInt(raw || '0', 10)
  return Number.isFinite(value) ? value : 0
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    scrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(22,22,22,0.54)',
    },
    sheet: {
      backgroundColor: theme.bg,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      padding: Spacing.lg,
      paddingBottom: Spacing.xl,
      gap: Spacing.md,
    },
    grabber: {
      alignSelf: 'center',
      width: 42,
      height: 5,
      borderRadius: Radius.pill,
      backgroundColor: theme.lineStrong,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    sideBadge: {
      minHeight: 34,
      borderRadius: Radius.pill,
      borderWidth: 1,
      paddingHorizontal: Spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sideText: {
      fontSize: 11,
      fontWeight: '900',
    },
    headerCopy: { flex: 1, minWidth: 0 },
    title: {
      color: theme.ink,
      fontSize: 18,
      fontWeight: '900',
    },
    subtitle: {
      color: theme.muted,
      fontSize: 12,
      fontWeight: '700',
      marginTop: 2,
    },
    closeButton: {
      width: 44,
      height: 44,
      borderRadius: Radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surface,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    field: {
      width: '30%',
      minWidth: 92,
      flexGrow: 1,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface,
      padding: Spacing.sm,
      gap: 6,
    },
    fieldLabel: {
      color: theme.ink,
      fontSize: 12,
      fontWeight: '900',
    },
    input: {
      minHeight: 48,
      borderRadius: Radius.md,
      backgroundColor: theme.bg,
      borderWidth: 1,
      borderColor: theme.line,
      color: theme.ink,
      fontSize: 22,
      fontWeight: '900',
      textAlign: 'center',
    },
    fieldHint: {
      color: theme.muted,
      fontSize: 11,
      fontWeight: '700',
    },
    errorRow: {
      minHeight: 36,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      borderRadius: Radius.md,
      backgroundColor: theme.redSoft,
      paddingHorizontal: Spacing.sm,
    },
    errorText: {
      flex: 1,
      color: theme.red,
      fontSize: 12,
      fontWeight: '800',
    },
    saveButton: {
      minHeight: 52,
      borderRadius: Radius.pill,
      backgroundColor: theme.orange,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.xs,
    },
    saveButtonDisabled: {
      opacity: 0.62,
    },
    saveText: {
      color: theme.bg,
      fontSize: 14,
      fontWeight: '900',
    },
  })
}
