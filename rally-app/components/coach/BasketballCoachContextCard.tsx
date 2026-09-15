import { useEffect, useState } from 'react'
import { Alert, Platform, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { BasketballNullableStatInput } from '@/components/coach/BasketballNullableStatInput'
import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Sport, Spacing } from '@/constants/theme'
import { useSaveCoachContext } from '@/hooks/useCoachActivityInsights'
import { useLanguageStore } from '@/stores/languageStore'
import {
  BASKETBALL_ROLES,
  type BasketballDetailTag,
  type BasketballFocusTag,
  type BasketballResultTag,
  type BasketballRole,
  type BasketballStatLine,
  type CoachBenchmarkFormat,
} from '@/lib/coach/coachTypes'
import {
  canSaveBaselineCoachContext,
  getBasketballRoleLabel,
  getBasketballRoleHelp,
  getBasketballStatInputKeys,
  getBasketballStatLineValidation,
  getBasketballStatlineHelpText,
  mergeCoachContextPatch,
  sanitizePlayerFacingBasketballStats,
  summarizeCoachInputSignals,
} from '@/lib/coach/coachInputPresentation'
import { createCoachSaveLifecycle } from '@/lib/coach/coachSaveLifecycle'
import { setNullableBasketballStat } from '@/lib/coach/basketballNullableStatInput'

type Props = {
  activitySessionId: string
  title?: string
  helperText?: string
  submitLabel?: string
  surface?: 'card' | 'embedded'
  showInlineSaved?: boolean
  showIntro?: boolean
  ownTeamScore?: number | null
  benchmarkFormat?: CoachBenchmarkFormat | null
  statKeys?: (keyof BasketballStatLine)[]
  requiredStatKeys?: (keyof BasketballStatLine)[]
  requireAnyStat?: boolean
  onSaveStarted?: (input: CoachInputState) => void
  onSaveFailed?: (input: CoachInputState, error: unknown) => void
  onSaved?: (summary: string, input: CoachInputState) => void
  initial?: {
    role: BasketballRole | null
    resultTags: BasketballResultTag[]
    detailTags?: BasketballDetailTag[]
    focusTag: BasketballFocusTag | null
    rpe: number | null
    basketballStats: BasketballStatLine
  }
}

type CoachInputState = {
  role: BasketballRole | null
  resultTags: BasketballResultTag[]
  detailTags: BasketballDetailTag[]
  focusTag: BasketballFocusTag | null
  rpe: number | null
  basketballStats: BasketballStatLine
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

const ALL_STAT_KEYS = [...STAT_KEYS, ...DETAIL_STAT_KEYS]

export function BasketballCoachContextCard({
  activitySessionId,
  title = 'COACH INPUT',
  helperText,
  submitLabel = 'Save quick context',
  surface = 'card',
  showInlineSaved = true,
  showIntro = true,
  ownTeamScore = null,
  benchmarkFormat = null,
  statKeys,
  requiredStatKeys = [],
  requireAnyStat = false,
  onSaveStarted,
  onSaveFailed,
  onSaved,
  initial,
}: Props) {
  const language = useLanguageStore((state) => state.language)
  const [role, setRole] = useState<BasketballRole | null>(initial?.role ?? null)
  const [stats, setStats] = useState<BasketballStatLine>(
    sanitizePlayerFacingBasketballStats(initial?.basketballStats ?? {}),
  )
  const [savedSummary, setSavedSummary] = useState<string | null>(null)
  const mutation = useSaveCoachContext(activitySessionId)
  const saveLifecycle = createCoachSaveLifecycle({ onSaveStarted, onSaved, onSaveFailed })
  const baselineCanSave = canSaveBaselineCoachContext({
    role,
    resultTags: initial?.resultTags ?? [],
    detailTags: initial?.detailTags ?? [],
    focusTag: initial?.focusTag ?? null,
    rpe: initial?.rpe ?? null,
    basketballStats: stats,
  })
  const statValidation = getBasketballStatLineValidation(stats, { ownTeamScore, language, benchmarkFormat })
  const visibleStatKeyNames = getBasketballStatInputKeys({ benchmarkFormat, role, statKeys })
  const visibleStatKeys = visibleStatKeyNames
    .map((key) => ALL_STAT_KEYS.find((stat) => stat.key === key))
    .filter((stat): stat is (typeof ALL_STAT_KEYS)[number] => Boolean(stat))
  const hasAnyStat = Object.values(stats).some((value) => typeof value === 'number' && Number.isFinite(value))
  const missingRequiredStatKeys = requiredStatKeys.filter((key) => typeof stats[key] !== 'number')
  const statRequirementMessage =
    missingRequiredStatKeys.length > 0
      ? language === 'th'
        ? `กรอก ${missingRequiredStatKeys.map((key) => statShortLabel(key)).join(' / ')} ก่อน`
        : `Add ${missingRequiredStatKeys.map((key) => statShortLabel(key)).join(' / ')} first`
      : requireAnyStat && !hasAnyStat
        ? language === 'th'
          ? 'กรอกสถิติอย่างน้อย 1 ค่า'
          : 'Add at least 1 stat'
        : null
  const canSave = baselineCanSave && statValidation.valid && !statRequirementMessage

  useEffect(() => {
    setRole(initial?.role ?? null)
    setStats(sanitizePlayerFacingBasketballStats(initial?.basketballStats ?? {}))
  }, [initial])

  function setStatValue(key: keyof BasketballStatLine, value: number | null) {
    setStats((prev) => setNullableBasketballStat(prev, key, value))
  }

  function onSave() {
    if (!canSave) {
      const msg =
        statValidation.message ??
        (language === 'th' ? 'เลือก Role ก่อนบันทึก' : 'Pick a role before saving')
      if (Platform.OS === 'web') globalThis.alert(msg)
      else Alert.alert(language === 'th' ? 'ยังบันทึกไม่ได้' : 'Cannot save yet', msg)
      return
    }
    const merged = mergeCoachContextPatch(initial, { role })
    const payload = { ...merged, basketballStats: sanitizePlayerFacingBasketballStats(stats) }
    saveLifecycle.start(payload)
    mutation.mutate(
      {
        activitySessionId,
        ...payload,
      },
      {
        onSuccess: () => {
          const summary = summarizeCoachInputSignals(payload, language)
          setSavedSummary(summary)
          saveLifecycle.succeed(summary, payload)
        },
        onError: (err) => {
          const msg = err instanceof Error ? err.message : language === 'th' ? 'บันทึกข้อมูลไม่ได้' : 'Could not save coach context'
          if (Platform.OS === 'web') globalThis.alert(msg)
          else Alert.alert(language === 'th' ? 'บันทึกไม่สำเร็จ' : 'Save failed', msg)
          saveLifecycle.fail(payload, err)
        },
      },
    )
  }

  function showRoleHelp(nextRole: BasketballRole) {
    const help = getBasketballRoleHelp(nextRole, language, benchmarkFormat)
    if (Platform.OS === 'web') globalThis.alert(`${help.title}\n${help.body}`)
    else Alert.alert(help.title, help.body)
  }

  function showStatlineHelp() {
    const body = getBasketballStatlineHelpText(language, benchmarkFormat)
    const title = language === 'th' ? 'สถิติ' : 'Statline'
    if (Platform.OS === 'web') globalThis.alert(`${title}\n${body}`)
    else Alert.alert(title, body)
  }

  return (
    <View style={[styles.card, surface === 'embedded' && styles.cardEmbedded]}>
      {showIntro ? (
        <>
          <Text style={styles.cardLabel}>{title}</Text>
          <Text style={styles.helperText}>
            {helperText ??
              (language === 'th'
                ? 'เลือก Role ก่อน แล้วเติมสถิติที่จำได้'
                : 'Pick a role first. Add the stats you remember.')}
          </Text>
        </>
      ) : null}

      <Text style={styles.fieldLabel}>
        {benchmarkFormat === '3x3'
          ? language === 'th'
            ? 'บทบาท 3v3 วันนี้'
            : '3x3 role today'
          : language === 'th'
            ? 'บทบาทวันนี้'
            : 'Role today'}
      </Text>
      <View style={styles.chipWrap}>
        {BASKETBALL_ROLES.map((r) => (
          <Chip
            key={r}
            label={getBasketballRoleLabel(r, language, benchmarkFormat)}
            active={role === r}
            onPress={() => setRole(role === r ? null : r)}
            onLongPress={() => showRoleHelp(r)}
            accessibilityHint={language === 'th' ? 'กดค้างเพื่อดูว่าบทบาทนี้หมายถึงอะไร' : 'Long press to explain this role.'}
          />
        ))}
      </View>

      <View style={styles.detailGroup}>
        <View style={styles.fieldHeaderRow}>
          <Text style={styles.fieldLabel}>{language === 'th' ? 'สถิติหลัก' : 'Core stats'}</Text>
          <PressableScale
            style={styles.infoButton}
            onPress={showStatlineHelp}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={language === 'th' ? 'อธิบายตัวย่อสถิติ' : 'Explain statline abbreviations'}
            accessibilityHint={
              language === 'th'
                ? 'แสดงความหมายของ PTS, REB, AST และตัวย่ออื่น'
                : 'Shows what PTS, REB, AST, and the other stat labels mean.'
            }
          >
            <MaterialCommunityIcons name="information-outline" size={16} color={Sport.muted} />
          </PressableScale>
        </View>
        <Text style={styles.fieldHelp}>
          {benchmarkFormat === '3x3'
            ? language === 'th'
              ? '3v3 ใส่เฉพาะค่าที่จำได้ · — = ไม่ได้ระบุ'
              : '3x3: add only what you remember · — = not recorded'
            : language === 'th'
              ? 'ใส่เฉพาะเลขที่จดไว้จริง · — = ไม่ได้ระบุ'
              : 'Add only numbers you tracked · — = not recorded'}
        </Text>
      </View>
      <View style={styles.statsGrid}>
        {visibleStatKeys.map(({ key, label }) => (
          <BasketballNullableStatInput
            key={key}
            label={label}
            language={language}
            value={stats[key] ?? null}
            onChange={(value) => setStatValue(key, value)}
          />
        ))}
      </View>
      {statRequirementMessage || statValidation.message ? (
        <Text style={styles.validationText}>{statRequirementMessage ?? statValidation.message}</Text>
      ) : null}

      {showInlineSaved && savedSummary ? (
        <View style={styles.savedBox}>
          <Text style={styles.savedTitle}>
            {language === 'th' ? 'บันทึกข้อมูลแล้ว อัปเดต Recap ให้แล้ว' : 'Context saved. Recap updated.'}
          </Text>
          <Text style={styles.savedBody}>{savedSummary}</Text>
        </View>
      ) : null}

      <PressableScale
        disabled={!canSave || mutation.isPending}
        style={[styles.saveBtn, (!canSave || mutation.isPending) && styles.saveBtnDisabled]}
        onPress={onSave}
        accessibilityRole="button"
        accessibilityLabel={submitLabel}
        accessibilityState={{ disabled: !canSave || mutation.isPending, busy: mutation.isPending }}
      >
        <Text style={styles.saveBtnText}>
          {mutation.isPending ? (language === 'th' ? 'กำลังบันทึก…' : 'Saving…') : submitLabel}
        </Text>
      </PressableScale>
    </View>
  )
}

function statShortLabel(key: keyof BasketballStatLine): string {
  return ALL_STAT_KEYS.find((stat) => stat.key === key)?.label ?? key
}

function Chip({
  label,
  active,
  onPress,
  onLongPress,
  accessibilityHint,
}: {
  label: string
  active: boolean
  onPress: () => void
  onLongPress?: () => void
  accessibilityHint?: string
}) {
  return (
    <PressableScale
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </PressableScale>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Sport.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Sport.line,
    padding: Spacing.lg,
    gap: 10,
  },
  cardEmbedded: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderRadius: 0,
    padding: 0,
  },
  cardLabel: { fontSize: 10, fontWeight: '900', color: Sport.muted, letterSpacing: 1.6 },
  helperText: { fontSize: 12, color: Sport.inkSoft, lineHeight: 17 },
  fieldLabel: { fontSize: 11, fontWeight: '800', color: Sport.inkSoft, marginTop: 4 },
  fieldHelp: { fontSize: 10, fontWeight: '700', color: Sport.muted, lineHeight: 14, marginTop: -4 },
  detailGroup: { gap: 3, marginTop: 2 },
  fieldHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  infoButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -4,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: Sport.surfaceStrong,
    borderWidth: 1,
    borderColor: Sport.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: Sport.amberSoft, borderColor: 'rgba(255,178,61,0.5)' },
  chipText: { fontSize: 11, fontWeight: '700', color: Sport.inkSoft, textTransform: 'capitalize' },
  chipTextActive: { color: Sport.amber },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCell: {
    width: '23%',
    minHeight: 64,
    backgroundColor: Sport.surfaceStrong,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Sport.line,
    padding: 8,
    alignItems: 'center',
  },
  statLabel: { fontSize: 9, fontWeight: '900', color: Sport.muted, letterSpacing: 1.2 },
  statInput: {
    minHeight: 44,
    width: '100%',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '900',
    color: Sport.ink,
    marginTop: 4,
    paddingVertical: 2,
  },
  savedBox: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: `${Sport.green}66`,
    backgroundColor: Sport.greenSoft,
    padding: 10,
    gap: 2,
  },
  savedTitle: { color: Sport.green, fontSize: 12, fontWeight: '900' },
  savedBody: { color: Sport.inkSoft, fontSize: 11, fontWeight: '700', lineHeight: 16 },
  validationText: { color: Sport.red, fontSize: 11, fontWeight: '800', lineHeight: 15 },
  saveBtn: {
    backgroundColor: Sport.amber,
    minHeight: 44,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    alignItems: 'center',
    marginTop: 6,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: Sport.bg, fontSize: 13, fontWeight: '900', letterSpacing: 0.6 },
})
