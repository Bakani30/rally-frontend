import { useState } from 'react'
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { deriveWinnerSideFromScore } from '@/lib/match/resultCorrection'
import type { ProposedResultPayload } from '@/types/match'

const TEAM_SCORE_ACTIVITIES = new Set(['basketball', 'badminton', 'football'])

type ScoreCorrectionFormProps = {
  activityType: string
  onSubmit: (proposed: ProposedResultPayload) => void
  isSubmitting: boolean
  onCancel: () => void
}

export function ScoreCorrectionForm({
  activityType,
  onSubmit,
  isSubmitting,
  onCancel,
}: ScoreCorrectionFormProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const isTeamScore = TEAM_SCORE_ACTIVITIES.has(activityType)

  const [scoreA, setScoreA] = useState('')
  const [scoreB, setScoreB] = useState('')
  const [selectedWinner, setSelectedWinner] = useState<0 | 1 | 'tie' | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  const parsedA = parseInt(scoreA, 10)
  const parsedB = parseInt(scoreB, 10)
  const scoresValid =
    !isNaN(parsedA) && !isNaN(parsedB) && parsedA >= 0 && parsedB >= 0

  const winnerPreview = isTeamScore && scoresValid
    ? deriveWinnerSideFromScore(parsedA, parsedB)
    : null

  const winnerLabel = (() => {
    if (!winnerPreview) return null
    if (winnerPreview.isTie) return 'เสมอ'
    return winnerPreview.winnerSide === 0 ? 'ฝั่ง A ชนะ' : 'ฝั่ง B ชนะ'
  })()

  const canSubmit = isSubmitting
    ? false
    : isTeamScore
      ? scoresValid
      : selectedWinner !== null

  function handleSubmit() {
    setValidationError(null)

    if (isTeamScore) {
      if (!scoresValid) {
        setValidationError('กรอกคะแนนทั้งสองฝั่ง')
        return
      }
      const derived = deriveWinnerSideFromScore(parsedA, parsedB)
      onSubmit({
        side0Score: parsedA,
        side1Score: parsedB,
        winnerSide: derived.winnerSide,
        isTie: derived.isTie,
        scoreLog: null,
      })
      return
    }

    if (selectedWinner === null) {
      setValidationError('เลือกผู้ชนะหรือเสมอ')
      return
    }
    onSubmit({
      isTie: selectedWinner === 'tie',
      winnerSide: selectedWinner === 'tie' ? null : selectedWinner,
    })
  }

  return (
    <View style={styles.container}>
      <Text style={styles.formTitle}>เสนอคะแนนใหม่</Text>

      {isTeamScore ? (
        <>
          <View style={styles.scoreRow}>
            <View style={styles.scoreField}>
              <Text style={styles.scoreLabel}>ฝั่ง A</Text>
              <TextInput
                style={[styles.scoreInput, isSubmitting && styles.inputDisabled]}
                keyboardType="number-pad"
                value={scoreA}
                onChangeText={(v) => { setScoreA(v); setValidationError(null) }}
                placeholder="0"
                placeholderTextColor={theme.muted}
                editable={!isSubmitting}
                maxLength={5}
              />
            </View>
            <Text style={styles.scoreSep}>—</Text>
            <View style={styles.scoreField}>
              <Text style={styles.scoreLabel}>ฝั่ง B</Text>
              <TextInput
                style={[styles.scoreInput, isSubmitting && styles.inputDisabled]}
                keyboardType="number-pad"
                value={scoreB}
                onChangeText={(v) => { setScoreB(v); setValidationError(null) }}
                placeholder="0"
                placeholderTextColor={theme.muted}
                editable={!isSubmitting}
                maxLength={5}
              />
            </View>
          </View>

          {winnerLabel && (
            <View style={styles.previewRow}>
              <MaterialCommunityIcons name="trophy-outline" size={14} color={theme.amber} />
              <Text style={styles.previewText}>
                {scoreA} – {scoreB} → <Text style={styles.previewWinner}>{winnerLabel}</Text>
              </Text>
            </View>
          )}
        </>
      ) : (
        <View style={styles.selectorRow}>
          {(
            [
              { key: 0 as const, label: 'ฝั่ง A ชนะ' },
              { key: 'tie' as const, label: 'เสมอ' },
              { key: 1 as const, label: 'ฝั่ง B ชนะ' },
            ] as const
          ).map((option) => (
            <TouchableOpacity
              key={String(option.key)}
              style={[
                styles.selectorChip,
                selectedWinner === option.key && styles.selectorChipActive,
                isSubmitting && styles.inputDisabled,
              ]}
              onPress={() => {
                if (!isSubmitting) {
                  setSelectedWinner(option.key)
                  setValidationError(null)
                }
              }}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.selectorChipText,
                  selectedWinner === option.key && styles.selectorChipTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {validationError && (
        <Text style={styles.errorText}>{validationError}</Text>
      )}

      <View style={styles.actionRow}>
        <PressableScale
          style={[styles.btn, styles.btnCancel]}
          onPress={onCancel}
          disabled={isSubmitting}
        >
          <Text style={[styles.btnText, styles.btnCancelText]}>ยกเลิก</Text>
        </PressableScale>
        <PressableScale
          style={[styles.btn, styles.btnSubmit, !canSubmit && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          <Text style={styles.btnText}>
            {isSubmitting ? 'กำลังส่ง…' : 'ส่งคำขอ'}
          </Text>
        </PressableScale>
      </View>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    container: {
      backgroundColor: theme.surface,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: theme.line,
      padding: Spacing.md,
      gap: Spacing.sm,
    },
    formTitle: {
      fontSize: 11,
      fontWeight: '800',
      color: theme.inkSoft,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    scoreRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    scoreField: {
      flex: 1,
      gap: 4,
    },
    scoreLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.muted,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    scoreInput: {
      backgroundColor: '#161616',
      color: theme.chalk,
      fontSize: 22,
      fontWeight: '900',
      textAlign: 'center',
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: theme.line,
      paddingVertical: Spacing.sm,
      minHeight: 52,
    },
    inputDisabled: {
      opacity: 0.4,
    },
    scoreSep: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.muted,
      marginTop: 18,
    },
    previewRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    previewText: {
      fontSize: 12,
      color: theme.inkSoft,
    },
    previewWinner: {
      color: theme.amber,
      fontWeight: '800',
    },
    selectorRow: {
      flexDirection: 'row',
      gap: Spacing.xs,
    },
    selectorChip: {
      flex: 1,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Radius.lg,
      backgroundColor: '#161616',
      borderWidth: 1,
      borderColor: theme.line,
      paddingHorizontal: Spacing.xs,
    },
    selectorChipActive: {
      borderColor: '#eb773c',
      backgroundColor: 'rgba(235,119,60,0.12)',
    },
    selectorChipText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.inkSoft,
      textAlign: 'center',
    },
    selectorChipTextActive: {
      color: '#eb773c',
    },
    errorText: {
      fontSize: 11,
      color: '#c73f41',
      fontWeight: '600',
    },
    actionRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginTop: Spacing.xs,
    },
    btn: {
      flex: 1,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Radius.lg,
      paddingHorizontal: 12,
    },
    btnSubmit: {
      backgroundColor: '#eb773c',
    },
    btnCancel: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.line,
    },
    btnDisabled: {
      opacity: 0.4,
    },
    btnText: {
      fontSize: 12,
      fontWeight: '900',
      color: theme.chalk,
      letterSpacing: 0.4,
    },
    btnCancelText: {
      color: theme.inkSoft,
    },
  })
}
