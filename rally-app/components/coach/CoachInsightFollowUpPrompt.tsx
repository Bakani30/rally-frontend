import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { BasketballNullableStatInput } from '@/components/coach/BasketballNullableStatInput'
import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Sport, Spacing } from '@/constants/theme'
import { useLanguageStore } from '@/stores/languageStore'
import {
  type BasketballRole,
  type BasketballStatLine,
} from '@/lib/coach/coachTypes'
import {
  getBasketballStatLineValidation,
  sanitizePlayerFacingBasketballStats,
  type CoachCardFollowUpPrompt,
  type CoachContextPatch,
} from '@/lib/coach/coachInputPresentation'
import { setNullableBasketballStat } from '@/lib/coach/basketballNullableStatInput'

type Props = {
  prompt: CoachCardFollowUpPrompt
  role: BasketballRole | null
  ownTeamScore?: number | null
  isSaving: boolean
  onSave: (patch: CoachContextPatch) => void
  onCancel?: () => void
}

const STAT_KEYS: { key: keyof BasketballStatLine; label: string }[] = [
  { key: 'points', label: 'PTS' },
  { key: 'twoPointersMade', label: '2PT' },
  { key: 'rebounds', label: 'REB' },
  { key: 'assists', label: 'AST' },
  { key: 'blocks', label: 'BLK' },
]

const DETAIL_STAT_KEYS: { key: keyof BasketballStatLine; label: string }[] = [
  { key: 'steals', label: 'STL' },
  { key: 'threePointersMade', label: '3PM' },
  { key: 'freeThrowsMade', label: 'FT' },
]

export function CoachInsightFollowUpPrompt({ prompt, ownTeamScore = null, isSaving, onSave, onCancel }: Props) {
  const language = useLanguageStore((state) => state.language)
  const [rpe, setRpe] = useState<number | null>(prompt.kind === 'rpe' ? prompt.initialRpe : null)
  const [stats, setStats] = useState<BasketballStatLine>(
    prompt.kind === 'statline' ? sanitizePlayerFacingBasketballStats(prompt.initialStats) : {},
  )

  useEffect(() => {
    setRpe(prompt.kind === 'rpe' ? prompt.initialRpe : null)
    setStats(prompt.kind === 'statline' ? sanitizePlayerFacingBasketballStats(prompt.initialStats) : {})
  }, [prompt])

  function setStatValue(key: keyof BasketballStatLine, value: number | null) {
    setStats((prev) => setNullableBasketballStat(prev, key, value))
  }

  const statValidation = getBasketballStatLineValidation(stats, { ownTeamScore, language })
  const requiredStatKeys = prompt.kind === 'statline' ? prompt.requiredStatKeys ?? [] : []
  const hasRequiredStats = requiredStatKeys.every((key) => stats[key] != null)
  const canSave =
    prompt.kind === 'rpe'
      ? rpe != null
      : (requiredStatKeys.length > 0 ? hasRequiredStats : Object.keys(stats).length > 0) && statValidation.valid

  function save() {
    if (!canSave || isSaving) return
    if (prompt.kind === 'rpe') onSave({ rpe })
    else onSave({ basketballStats: sanitizePlayerFacingBasketballStats(stats) })
  }

  return (
    <View style={styles.prompt}>
      <View>
        <Text style={styles.promptTitle}>{prompt.title}</Text>
        <Text style={styles.promptHelp}>{prompt.help}</Text>
      </View>

      {prompt.kind === 'rpe' ? (
        <View style={styles.rpeRow}>
          {Array.from({ length: 10 }, (_, idx) => idx + 1).map((value) => (
            <PressableScale
              key={value}
              style={[styles.rpePill, rpe === value && styles.activePill]}
              onPress={() => setRpe(rpe === value ? null : value)}
            >
              <Text style={[styles.pillText, rpe === value && styles.activePillText]}>{value}</Text>
            </PressableScale>
          ))}
        </View>
      ) : null}

      {prompt.kind === 'statline' ? (
        <>
          <StatGrid
            keys={getVisibleStatKeys(prompt.statKeys, STAT_KEYS)}
            stats={stats}
            language={language}
            onChange={setStatValue}
          />
          {getVisibleStatKeys(prompt.statKeys, DETAIL_STAT_KEYS).length > 0 ? (
            <>
              <Text style={styles.detailStatsLabel}>
                {language === 'th' ? 'สถิติเพิ่ม' : 'Detail stats'}
              </Text>
              <StatGrid
                keys={getVisibleStatKeys(prompt.statKeys, DETAIL_STAT_KEYS)}
                stats={stats}
                language={language}
                onChange={setStatValue}
              />
            </>
          ) : null}
          {statValidation.message ? <Text style={styles.validationText}>{statValidation.message}</Text> : null}
        </>
      ) : null}

      <View style={styles.actionRow}>
        {onCancel ? (
          <PressableScale style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>
              {prompt.cancelLabel ?? (language === 'th' ? 'ยกเลิก' : 'Cancel')}
            </Text>
          </PressableScale>
        ) : null}
        <PressableScale
          disabled={!canSave || isSaving}
          style={[styles.saveButton, onCancel && styles.saveButtonInline, (!canSave || isSaving) && styles.saveButtonDisabled]}
          onPress={save}
        >
          <Text style={styles.saveButtonText}>
            {isSaving
              ? language === 'th'
                ? 'กำลังบันทึก...'
                : 'Saving...'
              : prompt.saveLabel ?? (language === 'th'
                ? 'บันทึกให้การ์ดนี้'
                : 'Save to this read')}
          </Text>
        </PressableScale>
      </View>
    </View>
  )
}

function getVisibleStatKeys(
  promptKeys: (keyof BasketballStatLine)[] | undefined,
  group: { key: keyof BasketballStatLine; label: string }[],
) {
  const allowedGroup = group.filter(({ key }) => key !== 'turnovers')
  if (!promptKeys) return allowedGroup
  return allowedGroup.filter(({ key }) => promptKeys.includes(key))
}

function StatGrid({
  keys,
  stats,
  language,
  onChange,
}: {
  keys: { key: keyof BasketballStatLine; label: string }[]
  stats: BasketballStatLine
  language: 'en' | 'th'
  onChange: (key: keyof BasketballStatLine, value: number | null) => void
}) {
  if (keys.length === 0) return null
  return (
    <View style={styles.statsGrid}>
      {keys.map(({ key, label }) => (
        <BasketballNullableStatInput
          key={key}
          label={label}
          language={language}
          value={stats[key] ?? null}
          onChange={(value) => onChange(key, value)}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  prompt: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Sport.line,
    backgroundColor: Sport.surfaceStrong,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  promptTitle: { color: Sport.ink, fontSize: 12, fontWeight: '900' },
  promptHelp: { color: Sport.muted, fontSize: 11, fontWeight: '700', lineHeight: 15, marginTop: 2 },
  rpeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  rpePill: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: Sport.surface,
    borderWidth: 1,
    borderColor: Sport.line,
  },
  activePill: { backgroundColor: Sport.amberSoft, borderColor: 'rgba(255,178,61,0.5)' },
  pillText: { fontSize: 12, fontWeight: '900', color: Sport.inkSoft },
  activePillText: { color: Sport.amber },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: Sport.surface,
    borderWidth: 1,
    borderColor: Sport.line,
  },
  suggestedChip: { borderColor: 'rgba(255,178,61,0.34)' },
  activeChip: { backgroundColor: Sport.amberSoft, borderColor: 'rgba(255,178,61,0.5)' },
  chipText: { fontSize: 11, fontWeight: '800', color: Sport.inkSoft, textTransform: 'capitalize' },
  detailStatsLabel: { color: Sport.muted, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  saveButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: Radius.md,
    backgroundColor: Sport.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonInline: { flex: 1.4 },
  saveButtonDisabled: { opacity: 0.55 },
  saveButtonText: { color: Sport.bg, fontSize: 12, fontWeight: '900' },
  actionRow: { flexDirection: 'row', gap: 8 },
  cancelButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Sport.line,
    backgroundColor: Sport.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: { color: Sport.inkSoft, fontSize: 12, fontWeight: '900' },
  validationText: { color: Sport.red, fontSize: 11, fontWeight: '800', lineHeight: 15 },
})
