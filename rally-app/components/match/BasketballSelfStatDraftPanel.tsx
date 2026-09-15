import { useEffect, useMemo, useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useReducedMotion } from 'react-native-reanimated'
import { AnimatedNumber } from '@/components/motion/AnimatedNumber'
import { PressableScale } from '@/components/motion/PressableScale'
import { RallyText } from '@/components/ui/RallyText'
import { Radius, Sport, Spacing } from '@/constants/theme'
import { getParticipantDisplayName, validateRefereePlayerStatDraftInput } from '@/lib/match/matchRules'
import type { BasketballPlayerSelfStatInput } from '@/lib/match/basketballPlayerStatDraftService'
import type { BasketballPlayerStatDraft, MatchParticipant } from '@/types/match'

type LegacyBasketballSelfStatDraftPanelProps = {
  mode: 'legacy'
  role: 'player' | 'referee'
  currentUserId: string
  participants: MatchParticipant[]
  drafts: BasketballPlayerStatDraft[]
  pending?: boolean
  onSaveSelf?: (stats: BasketballPlayerSelfStatInput, note: string | null) => Promise<void> | void
}

type ArenaBasketballSelfStatDraftPanelProps = {
  mode: 'arena'
  initialStats: BasketballPlayerSelfStatInput
  initialNote: string
  readinessLabel: string
  ready: boolean
  editable: boolean
  longRangePointValue: 2 | 3
  longShotLabel: '2PT' | '3PM'
  pending?: boolean
  onSaveSelf?: (stats: BasketballPlayerSelfStatInput, note: string | null) => Promise<void> | void
}

type BasketballSelfStatDraftPanelProps =
  | LegacyBasketballSelfStatDraftPanelProps
  | ArenaBasketballSelfStatDraftPanelProps

const EMPTY_PARTICIPANTS: MatchParticipant[] = []
const EMPTY_DRAFTS: BasketballPlayerStatDraft[] = []

const FIELD_CONFIG: {
  key: keyof BasketballPlayerSelfStatInput
  label: string
}[] = [
  { key: 'points', label: 'PTS' },
  { key: 'rebounds', label: 'REB' },
  { key: 'assists', label: 'AST' },
  { key: 'blocks', label: 'BLK' },
  { key: 'threePointersMade', label: '3PM' },
]

export function BasketballSelfStatDraftPanel(props: BasketballSelfStatDraftPanelProps) {
  const isArena = props.mode === 'arena'
  const reduceMotion = useReducedMotion()
  const pending = props.pending ?? false
  const legacyProps = props.mode === 'legacy' ? props : null
  const participants = legacyProps?.participants ?? EMPTY_PARTICIPANTS
  const drafts = legacyProps?.drafts ?? EMPTY_DRAFTS
  const currentUserId = legacyProps?.currentUserId ?? null
  const editorIsPlayer = props.mode === 'arena' || props.role === 'player'
  const currentParticipant = currentUserId
    ? participants.find((participant) => participant.user_id === currentUserId) ?? null
    : null
  const currentDraft = currentUserId
    ? drafts.find((draft) => draft.user_id === currentUserId) ?? null
    : null
  const initialStats = props.mode === 'arena'
    ? props.initialStats
    : {
        points: currentDraft?.points ?? 0,
        rebounds: currentDraft?.rebounds ?? 0,
        assists: currentDraft?.assists ?? 0,
        blocks: currentDraft?.blocks ?? 0,
        threePointersMade: currentDraft?.three_pointers_made ?? 0,
      }
  const initialNote = props.mode === 'legacy' ? currentDraft?.note ?? '' : props.initialNote
  const canEdit = !pending && (props.mode === 'legacy' || props.editable)
  const fieldConfig = props.mode === 'arena'
    ? FIELD_CONFIG.map((field) => field.key === 'threePointersMade'
      ? { ...field, label: props.longShotLabel }
      : field)
    : FIELD_CONFIG
  const [values, setValues] = useState<Record<keyof BasketballPlayerSelfStatInput, string>>({
    points: '0',
    rebounds: '0',
    assists: '0',
    blocks: '0',
    threePointersMade: '0',
  })
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!editorIsPlayer) return
    setError(null)
    setValues({
      points: String(initialStats.points),
      rebounds: String(initialStats.rebounds),
      assists: String(initialStats.assists),
      blocks: String(initialStats.blocks),
      threePointersMade: String(initialStats.threePointersMade),
    })
    setNote(initialNote)
  }, [
    initialNote,
    initialStats.assists,
    initialStats.blocks,
    initialStats.points,
    initialStats.rebounds,
    initialStats.threePointersMade,
    editorIsPlayer,
  ])

  const visibleDrafts = useMemo(() => {
    const activeIds = new Set(participants.filter((p) => p.is_active !== false).map((p) => p.user_id))
    return drafts.filter((draft) => activeIds.has(draft.user_id))
  }, [drafts, participants])

  if (props.mode === 'legacy' && props.role === 'player' && !currentParticipant) return null
  if (props.mode === 'legacy' && props.role === 'referee' && visibleDrafts.length === 0) return null

  function updateField(key: keyof BasketballPlayerSelfStatInput, raw: string) {
    setError(null)
    setValues((current) => ({ ...current, [key]: raw.replace(/[^\d]/g, '') }))
  }

  async function saveSelfDraft() {
    if (!props.onSaveSelf || !canEdit) return
    const stats: BasketballPlayerSelfStatInput = {
      points: parseStat(values.points),
      rebounds: parseStat(values.rebounds),
      assists: parseStat(values.assists),
      blocks: parseStat(values.blocks),
      threePointersMade: parseStat(values.threePointersMade),
    }
    const validationError = props.mode === 'arena'
      ? validateRefereePlayerStatDraftInput(stats, props.longRangePointValue)
      : validateRefereePlayerStatDraftInput(stats)
    if (validationError) {
      setError(validationError)
      return
    }
    try {
      await props.onSaveSelf(stats, note.trim() || null)
    } catch (err) {
      setError(isArena
        ? 'บันทึกสถิติไม่สำเร็จ กรุณาตรวจการเชื่อมต่อแล้วลองอีกครั้ง'
        : err instanceof Error ? err.message : 'บันทึก stat draft ไม่สำเร็จ')
    }
  }

  if (props.mode === 'legacy' && props.role === 'referee') {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.iconBox}>
            <MaterialCommunityIcons name="clipboard-account-outline" size={18} color={Sport.green} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.kicker}>PLAYER SELF-STATS</Text>
            <Text style={styles.title}>Player notes for Referee</Text>
          </View>
        </View>
        <Text style={styles.hint}>Advisory only. Compare it with your Referee draft before final result.</Text>
        <View style={styles.rows}>
          {visibleDrafts.map((draft) => {
            const participant = participants.find((item) => item.user_id === draft.user_id)
            const color = draft.side_index === 0 ? Sport.red : Sport.blue
            return (
              <View key={draft.id} style={styles.statRow}>
                <Text style={[styles.side, { color }]}>{draft.side_index === 0 ? 'A' : 'B'}</Text>
                <RallyText style={styles.name} numberOfLines={1}>
                  {participant ? getParticipantDisplayName(participant) : 'Player'}
                </RallyText>
                <Text style={styles.statLine} numberOfLines={1}>
                  {draft.points} PTS · {draft.rebounds} REB · {draft.assists} AST · {draft.blocks} BLK · {draft.three_pointers_made} 3PM
                </Text>
              </View>
            )
          })}
        </View>
      </View>
    )
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <MaterialCommunityIcons name="basketball" size={18} color={Sport.green} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.kicker}>{isArena ? 'สถิติของคุณ' : 'MY STAT DRAFT'}</Text>
          <Text style={styles.title}>{isArena ? 'บันทึกสถิติผู้เล่น' : 'Advisory stats for Referee'}</Text>
        </View>
        <View style={styles.totalBadge}>
          {isArena && reduceMotion ? (
            <Text style={styles.totalValue}>{parseStat(values.points)}</Text>
          ) : (
            <AnimatedNumber value={parseStat(values.points)} style={styles.totalValue} />
          )}
          <Text style={styles.totalLabel}>PTS</Text>
        </View>
      </View>
      <Text style={styles.hint}>
        {isArena ? props.readinessLabel : 'Advisory only. Referee final result is the score players review.'}
      </Text>

      <View style={styles.grid}>
        {fieldConfig.map((field) => (
          <View key={field.key} style={styles.field}>
            <Text style={styles.fieldLabel}>{field.label}</Text>
            <TextInput
              style={styles.input}
              value={values[field.key]}
              onChangeText={(text) => updateField(field.key, text)}
              keyboardType="number-pad"
              maxLength={5}
              selectTextOnFocus
              editable={canEdit}
              accessibilityLabel={isArena ? `สถิติ ${field.label} ของคุณ` : `My ${field.label} stat draft`}
            />
          </View>
        ))}
      </View>

      <TextInput
        style={styles.noteInput}
        value={note}
        onChangeText={setNote}
        placeholder={isArena ? 'บันทึกถึงกัปตัน (ไม่บังคับ)' : 'Note for Referee'}
        placeholderTextColor={Sport.mutedSoft}
        editable={canEdit}
        maxLength={800}
        multiline
      />

      {error ? (
        <View style={styles.errorRow}>
          <MaterialCommunityIcons name="alert-circle-outline" size={16} color={Sport.red} />
          <RallyText style={styles.errorText}>{error}</RallyText>
        </View>
      ) : null}

      {isArena && !props.editable ? null : (
        <PressableScale
          style={[styles.saveButton, !canEdit && styles.saveButtonDisabled]}
          onPress={saveSelfDraft}
          disabled={!canEdit}
          scaleTo={isArena && reduceMotion ? 1 : undefined}
        >
          <MaterialCommunityIcons name="content-save-check" size={17} color={Sport.bg} />
          <Text style={styles.saveText}>
            {isArena ? (pending ? 'กำลังบันทึก…' : props.ready ? 'บันทึกสถิติ' : 'บันทึกสถิติของคุณ') : (pending ? 'Saving…' : 'Save advisory draft')}
          </Text>
        </PressableScale>
      )}
    </View>
  )
}

function parseStat(raw: string): number {
  const value = Number.parseInt(raw || '0', 10)
  return Number.isFinite(value) ? value : 0
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Sport.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Sport.line,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Sport.greenSoft,
  },
  headerCopy: { flex: 1, minWidth: 0 },
  kicker: {
    color: Sport.green,
    fontSize: 11,
    fontWeight: '900',
  },
  title: {
    color: Sport.ink,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  hint: {
    color: Sport.muted,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  totalBadge: {
    minWidth: 68,
    minHeight: 46,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Sport.bg,
    borderWidth: 1,
    borderColor: Sport.line,
  },
  totalValue: {
    color: Sport.green,
    fontSize: 20,
    fontWeight: '900',
  },
  totalLabel: {
    color: Sport.muted,
    fontSize: 10,
    fontWeight: '900',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  field: {
    width: '30%',
    minWidth: 88,
    flexGrow: 1,
    gap: 6,
  },
  fieldLabel: {
    color: Sport.muted,
    fontSize: 11,
    fontWeight: '900',
  },
  input: {
    minHeight: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Sport.line,
    backgroundColor: Sport.bg,
    color: Sport.ink,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  noteInput: {
    minHeight: 58,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Sport.line,
    backgroundColor: Sport.bg,
    color: Sport.ink,
    padding: Spacing.sm,
    fontSize: 13,
    fontWeight: '700',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderRadius: Radius.md,
    backgroundColor: Sport.redSoft,
    padding: Spacing.sm,
  },
  errorText: {
    flex: 1,
    color: Sport.red,
    fontSize: 12,
  },
  saveButton: {
    minHeight: 50,
    borderRadius: Radius.pill,
    backgroundColor: Sport.orange,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  saveButtonDisabled: { opacity: 0.62 },
  saveText: {
    color: Sport.bg,
    fontSize: 14,
    fontWeight: '900',
  },
  rows: { gap: Spacing.xs },
  statRow: {
    minHeight: 42,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Sport.line,
    backgroundColor: Sport.bg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  side: {
    width: 18,
    fontSize: 12,
    fontWeight: '900',
  },
  name: {
    flex: 1,
    minWidth: 0,
    color: Sport.ink,
    fontSize: 13,
  },
  statLine: {
    color: Sport.muted,
    fontSize: 11,
    fontWeight: '800',
    flexShrink: 1,
    textAlign: 'right',
  },
})
