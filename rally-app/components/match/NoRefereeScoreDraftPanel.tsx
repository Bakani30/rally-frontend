import { useEffect, useMemo, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { ProofPicker } from '@/components/match/ProofPicker'
import { Radius, Sport, Spacing } from '@/constants/theme'
import {
  getParticipantDisplayName,
  validateRefereePlayerStatDraftInput,
} from '@/lib/match/matchRules'
import { uploadProofMedia, type LocalProofAsset } from '@/lib/match/proofUploadService'
import type {
  MatchParticipant,
  PlayerScoreDraft,
  PlayerScoreDraftBadmintonSet,
  PlayerScoreDraftBasketballStat,
  Side,
} from '@/types/match'

type NoRefereeScoreDraftPanelProps = {
  matchId: string
  activityType: string
  currentUserId: string
  mySide: Side
  participants: MatchParticipant[]
  drafts: PlayerScoreDraft[]
  /** Points a behind-the-arc shot is worth: 2 for half-court (1v1/2v2/3v3), 3 for 5v5. */
  longRangePointValue: number
  pending?: boolean
  onSave: (input: NoRefereeScoreDraftSubmitInput) => Promise<void> | void
  onOpenPlayer?: (userId: string) => void
}

export type NoRefereeScoreDraftSubmitInput = {
  submit: boolean
  note: string | null
  proofPaths: string[]
  basketballStats?: PlayerScoreDraftBasketballStat[]
  badmintonSets?: PlayerScoreDraftBadmintonSet[]
}

type BasketballStatText = Record<keyof Omit<PlayerScoreDraftBasketballStat, 'userId'>, string>

const BASKETBALL_FIELDS: { key: keyof BasketballStatText; label: string }[] = [
  { key: 'points', label: 'PTS' },
  { key: 'rebounds', label: 'REB' },
  { key: 'assists', label: 'AST' },
  { key: 'blocks', label: 'BLK' },
  { key: 'threePointersMade', label: '3PM' },
]

export function NoRefereeScoreDraftPanel({
  matchId,
  activityType,
  currentUserId,
  mySide,
  participants,
  drafts,
  longRangePointValue,
  pending = false,
  onSave,
  onOpenPlayer,
}: NoRefereeScoreDraftPanelProps) {
  const longShotLabel = longRangePointValue === 3 ? '3PM' : '2PT'
  const myDraft = drafts.find((draft) => draft.side_index === mySide) ?? null
  const activeSidePlayers = useMemo(
    () => participants.filter((participant) => participant.side === mySide && participant.is_active !== false),
    [mySide, participants],
  )
  const [basketballStats, setBasketballStats] = useState<Record<string, BasketballStatText>>({})
  const [badmintonSets, setBadmintonSets] = useState<{ side0Score: string; side1Score: string }[]>([
    { side0Score: '0', side1Score: '0' },
  ])
  const [note, setNote] = useState('')
  const [proofAssets, setProofAssets] = useState<LocalProofAsset[]>([])
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    const nextStats: Record<string, BasketballStatText> = {}
    for (const player of activeSidePlayers) {
      const draftStat = myDraft?.basketball_stats.find((stat) => stat.userId === player.user_id)
      nextStats[player.user_id] = {
        points: String(draftStat?.points ?? 0),
        rebounds: String(draftStat?.rebounds ?? 0),
        assists: String(draftStat?.assists ?? 0),
        blocks: String(draftStat?.blocks ?? 0),
        threePointersMade: String(draftStat?.threePointersMade ?? 0),
      }
    }
    setBasketballStats(nextStats)
    setNote(myDraft?.note ?? '')
    setBadmintonSets(
      myDraft?.badminton_sets.length
        ? myDraft.badminton_sets.map((set) => ({
          side0Score: String(set.side0Score),
          side1Score: String(set.side1Score),
        }))
        : [{ side0Score: '0', side1Score: '0' }],
    )
    setError(null)
  }, [activeSidePlayers, myDraft])

  const parsedBasketballStats = activeSidePlayers.map((player) => ({
    userId: player.user_id,
    points: parseScore(basketballStats[player.user_id]?.points),
    rebounds: parseScore(basketballStats[player.user_id]?.rebounds),
    assists: parseScore(basketballStats[player.user_id]?.assists),
    blocks: parseScore(basketballStats[player.user_id]?.blocks),
    threePointersMade: parseScore(basketballStats[player.user_id]?.threePointersMade),
  }))
  const basketballTotal = parsedBasketballStats.reduce((sum, stat) => sum + stat.points, 0)
  const parsedBadmintonSets = badmintonSets
    .map((set) => ({
      side0Score: parseScore(set.side0Score),
      side1Score: parseScore(set.side1Score),
    }))
    .filter((set) => set.side0Score > 0 || set.side1Score > 0)
  const badmintonTotal = parsedBadmintonSets.reduce(
    (sum, set) => sum + (mySide === 0 ? set.side0Score : set.side1Score),
    0,
  )
  const teamScore = activityType === 'basketball' ? basketballTotal : badmintonTotal
  const selectedPlayer = selectedPlayerId
    ? activeSidePlayers.find((player) => player.user_id === selectedPlayerId) ?? null
    : null

  function updateBasketballStat(userId: string, key: keyof BasketballStatText, raw: string) {
    setError(null)
    setBasketballStats((current) => ({
      ...current,
      [userId]: {
        ...(current[userId] ?? emptyBasketballText()),
        [key]: raw.replace(/[^\d]/g, ''),
      },
    }))
  }

  function updateSet(index: number, key: 'side0Score' | 'side1Score', raw: string) {
    setError(null)
    setBadmintonSets((current) =>
      current.map((set, setIndex) =>
        setIndex === index ? { ...set, [key]: raw.replace(/[^\d]/g, '') } : set,
      ),
    )
  }

  function validate(submit: boolean): boolean {
    if (activityType === 'basketball') {
      if (parsedBasketballStats.length !== activeSidePlayers.length) {
        setError('All active players on your side need stats.')
        return false
      }
      for (const stat of parsedBasketballStats) {
        const validation = validateRefereePlayerStatDraftInput(stat, longRangePointValue)
        if (validation) {
          setError(validation)
          return false
        }
      }
      return true
    }

    if (submit && parsedBadmintonSets.length === 0) {
      setError('Add at least one set score before submit.')
      return false
    }
    return true
  }

  async function submitDraft(submit: boolean) {
    if (!validate(submit)) return
    setError(null)

    try {
      setUploading(true)
      const uploadedProofPaths = proofAssets.length > 0
        ? await uploadProofMedia({
          userId: currentUserId,
          matchId,
          assets: proofAssets,
          folder: 'player-score-drafts',
        })
        : []

      await onSave({
        submit,
        note: note.trim() || null,
        proofPaths: [...(myDraft?.proof_urls ?? []), ...uploadedProofPaths],
        basketballStats: activityType === 'basketball' ? parsedBasketballStats : undefined,
        badmintonSets: activityType === 'badminton' ? parsedBadmintonSets : undefined,
      })
      setProofAssets([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save score draft.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <MaterialCommunityIcons
            name={activityType === 'basketball' ? 'basketball' : 'badminton'}
            size={19}
            color={Sport.amber}
          />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.kicker}>NO-REFEREE SCORE</Text>
          <Text style={styles.title}>Team {mySide === 0 ? 'A' : 'B'} draft</Text>
        </View>
        <View style={styles.totalBadge}>
          <Text style={styles.totalValue}>{teamScore}</Text>
          <Text style={styles.totalLabel}>PTS</Text>
        </View>
      </View>

      {activityType === 'basketball' ? (
        <View style={styles.rows}>
          {activeSidePlayers.map((player) => {
            const stat = parsedBasketballStats.find((item) => item.userId === player.user_id)
            return (
              <Pressable
                key={player.user_id}
                style={styles.playerRow}
                onPress={() => setSelectedPlayerId(player.user_id)}
                onLongPress={() => onOpenPlayer?.(player.user_id)}
                disabled={pending || uploading}
              >
                <View style={styles.playerNameWrap}>
                  <Text style={styles.playerName} numberOfLines={1}>
                    {getParticipantDisplayName(player)}
                  </Text>
                  <Text style={styles.playerSubline} numberOfLines={1}>
                    {stat?.rebounds ?? 0} REB · {stat?.assists ?? 0} AST · {stat?.blocks ?? 0} BLK · {stat?.threePointersMade ?? 0} {longShotLabel}
                  </Text>
                </View>
                <View style={styles.rowScore}>
                  <Text style={styles.rowScoreValue}>{stat?.points ?? 0}</Text>
                  <MaterialCommunityIcons name="chevron-up" size={16} color={Sport.muted} />
                </View>
              </Pressable>
            )
          })}
        </View>
      ) : (
        <View style={styles.rows}>
          {badmintonSets.map((set, index) => (
            <View key={`set-${index}`} style={styles.setRow}>
              <Text style={styles.setLabel}>Set {index + 1}</Text>
              <View style={styles.setInputs}>
                <ScoreInput
                  label="A"
                  value={set.side0Score}
                  onChangeText={(value) => updateSet(index, 'side0Score', value)}
                  editable={!pending && !uploading}
                />
                <ScoreInput
                  label="B"
                  value={set.side1Score}
                  onChangeText={(value) => updateSet(index, 'side1Score', value)}
                  editable={!pending && !uploading}
                />
              </View>
            </View>
          ))}
          <PressableScale
            style={styles.addSetButton}
            onPress={() => setBadmintonSets((current) => [...current, { side0Score: '0', side1Score: '0' }])}
            disabled={pending || uploading || badmintonSets.length >= 16}
          >
            <MaterialCommunityIcons name="plus" size={17} color={Sport.amber} />
            <Text style={styles.addSetText}>Add set</Text>
          </PressableScale>
        </View>
      )}

      <TextInput
        style={styles.noteInput}
        value={note}
        onChangeText={setNote}
        placeholder="Note"
        placeholderTextColor={Sport.mutedSoft}
        editable={!pending && !uploading}
        maxLength={1000}
        multiline
      />

      <ProofPicker
        assets={proofAssets}
        onChange={setProofAssets}
        max={5}
        allowVideos
        label="proof"
      />

      {error ? (
        <View style={styles.errorRow}>
          <MaterialCommunityIcons name="alert-circle-outline" size={16} color={Sport.red} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <PressableScale
          style={[styles.secondaryAction, (pending || uploading) && styles.disabledAction]}
          onPress={() => submitDraft(false)}
          disabled={pending || uploading}
        >
          <MaterialCommunityIcons name="content-save-outline" size={17} color={Sport.amber} />
          <Text style={styles.secondaryActionText}>{uploading ? 'Uploading' : 'Save'}</Text>
        </PressableScale>
        <PressableScale
          style={[styles.primaryAction, (pending || uploading) && styles.disabledAction]}
          onPress={() => submitDraft(true)}
          disabled={pending || uploading}
        >
          <MaterialCommunityIcons name="send-check" size={17} color={Sport.bg} />
          <Text style={styles.primaryActionText}>{pending ? 'Submitting' : 'Submit side score'}</Text>
        </PressableScale>
      </View>

      <PlayerStatModal
        player={selectedPlayer}
        values={selectedPlayer ? basketballStats[selectedPlayer.user_id] ?? emptyBasketballText() : emptyBasketballText()}
        editable={!pending && !uploading}
        longShotLabel={longShotLabel}
        onChange={(key, value) => selectedPlayer && updateBasketballStat(selectedPlayer.user_id, key, value)}
        onClose={() => setSelectedPlayerId(null)}
      />
    </View>
  )
}

function PlayerStatModal({
  player,
  values,
  editable,
  longShotLabel,
  onChange,
  onClose,
}: {
  player: MatchParticipant | null
  values: BasketballStatText
  editable: boolean
  longShotLabel: string
  onChange: (key: keyof BasketballStatText, value: string) => void
  onClose: () => void
}) {
  return (
    <Modal transparent animationType="fade" visible={!!player} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalScrim} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.kicker}>PLAYER STAT</Text>
              <Text style={styles.sheetTitle}>{player ? getParticipantDisplayName(player) : 'Player'}</Text>
            </View>
            <PressableScale style={styles.closeButton} onPress={onClose}>
              <MaterialCommunityIcons name="close" size={20} color={Sport.ink} />
            </PressableScale>
          </View>
          <View style={styles.grid}>
            {BASKETBALL_FIELDS.map((field) => (
              <View key={field.key} style={styles.field}>
                <Text style={styles.fieldLabel}>
                  {field.key === 'threePointersMade' ? longShotLabel : field.label}
                </Text>
                <TextInput
                  style={styles.input}
                  value={values[field.key]}
                  onChangeText={(text) => onChange(field.key, text)}
                  keyboardType="number-pad"
                  maxLength={5}
                  selectTextOnFocus
                  editable={editable}
                />
              </View>
            ))}
          </View>
          <PressableScale style={styles.primaryAction} onPress={onClose}>
            <Text style={styles.primaryActionText}>Done</Text>
          </PressableScale>
        </View>
      </View>
    </Modal>
  )
}

function ScoreInput({
  label,
  value,
  onChangeText,
  editable,
}: {
  label: string
  value: string
  onChangeText: (value: string) => void
  editable: boolean
}) {
  return (
    <View style={styles.scoreInputWrap}>
      <Text style={styles.scoreInputLabel}>{label}</Text>
      <TextInput
        style={styles.scoreInput}
        value={value}
        onChangeText={(text) => onChangeText(text.replace(/[^\d]/g, ''))}
        keyboardType="number-pad"
        maxLength={5}
        selectTextOnFocus
        editable={editable}
      />
    </View>
  )
}

function parseScore(raw: string | undefined): number {
  const value = Number.parseInt(raw || '0', 10)
  return Number.isFinite(value) ? value : 0
}

function emptyBasketballText(): BasketballStatText {
  return {
    points: '0',
    rebounds: '0',
    assists: '0',
    blocks: '0',
    threePointersMade: '0',
  }
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Sport.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,178,61,0.28)',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Sport.amberSoft,
  },
  headerCopy: { flex: 1, minWidth: 0 },
  kicker: {
    color: Sport.amber,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  title: {
    color: Sport.ink,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 2,
  },
  totalBadge: {
    minWidth: 64,
    minHeight: 48,
    borderRadius: Radius.lg,
    backgroundColor: Sport.bg,
    borderWidth: 1,
    borderColor: Sport.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalValue: {
    color: Sport.amber,
    fontSize: 21,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  totalLabel: {
    color: Sport.muted,
    fontSize: 10,
    fontWeight: '900',
  },
  rows: {
    gap: Spacing.sm,
  },
  playerRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Sport.line,
    backgroundColor: Sport.bg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  playerNameWrap: {
    flex: 1,
    minWidth: 0,
  },
  playerName: {
    color: Sport.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  playerSubline: {
    marginTop: 4,
    color: Sport.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  rowScore: {
    minWidth: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
  },
  rowScoreValue: {
    color: Sport.ink,
    fontSize: 18,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  setRow: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Sport.line,
    backgroundColor: Sport.bg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  setLabel: {
    color: Sport.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  setInputs: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  scoreInputWrap: {
    flex: 1,
    gap: 5,
  },
  scoreInputLabel: {
    color: Sport.muted,
    fontSize: 11,
    fontWeight: '900',
  },
  scoreInput: {
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Sport.line,
    color: Sport.ink,
    backgroundColor: Sport.surface,
    paddingHorizontal: 12,
    fontSize: 18,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  addSetButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,178,61,0.28)',
    backgroundColor: Sport.amberSoft,
  },
  addSetText: {
    color: Sport.amber,
    fontSize: 13,
    fontWeight: '900',
  },
  noteInput: {
    minHeight: 56,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Sport.line,
    color: Sport.ink,
    backgroundColor: Sport.bg,
    padding: Spacing.md,
    fontSize: 13,
    fontWeight: '700',
    textAlignVertical: 'top',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  errorText: {
    flex: 1,
    color: Sport.red,
    fontSize: 12,
    fontWeight: '800',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  secondaryAction: {
    minHeight: 46,
    flex: 0.42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,178,61,0.32)',
    backgroundColor: Sport.amberSoft,
  },
  secondaryActionText: {
    color: Sport.amber,
    fontSize: 13,
    fontWeight: '900',
  },
  primaryAction: {
    minHeight: 46,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: Radius.lg,
    backgroundColor: Sport.amber,
    paddingHorizontal: Spacing.md,
  },
  primaryActionText: {
    color: Sport.bg,
    fontSize: 13,
    fontWeight: '900',
  },
  disabledAction: {
    opacity: 0.58,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(12,12,12,0.62)',
  },
  modalScrim: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    maxHeight: '86%',
    backgroundColor: Sport.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Sport.line,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  sheetTitle: {
    color: Sport.ink,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Sport.bg,
    borderWidth: 1,
    borderColor: Sport.line,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  field: {
    minWidth: 86,
    flexGrow: 1,
    gap: 5,
  },
  fieldLabel: {
    color: Sport.muted,
    fontSize: 11,
    fontWeight: '900',
  },
  input: {
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Sport.line,
    color: Sport.ink,
    backgroundColor: Sport.bg,
    paddingHorizontal: 12,
    fontSize: 18,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
})
