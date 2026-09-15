import { useEffect, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { PressableScale } from '@/components/motion/PressableScale'
import { RallyText } from '@/components/ui/RallyText'
import { BasketballLiveQuarterPanel } from '@/components/match/BasketballLiveQuarterPanel'
import { ActivityColor, Radius, Spacing } from '@/constants/theme'
import { buildQuarterLines, type QuarterBoundary } from '@/lib/match/basketballQuarters'

type BasketballLiveScoreSheetProps = {
  visible: boolean
  /** Assigned referee gets quarter + end-game controls; everyone else views live. */
  isReferee: boolean
  sideAScore: number
  sideBScore: number
  startedAt: string | null
  boundaries: QuarterBoundary[]
  addQuarterPending?: boolean
  endGamePending: boolean
  canEndGame: boolean
  onAddQuarter: () => void
  onEndGame: () => void
  onClose: () => void
}

const SIDE_A_COLOR = ActivityColor.basketball
const SIDE_B_COLOR = '#85b7eb'
const ACCENT = ActivityColor.basketball
const TEXT = '#f3f6ee'

function formatElapsed(startedAt: string | null, nowMs: number): string {
  if (!startedAt) return '00:00'
  const startMs = new Date(startedAt).getTime()
  if (!Number.isFinite(startMs)) return '00:00'
  const total = Math.max(0, Math.floor((nowMs - startMs) / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function BasketballLiveScoreSheet({
  visible,
  isReferee,
  sideAScore,
  sideBScore,
  startedAt,
  boundaries,
  addQuarterPending = false,
  endGamePending,
  canEndGame,
  onAddQuarter,
  onEndGame,
  onClose,
}: BasketballLiveScoreSheetProps) {
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    if (!visible) return
    setNowMs(Date.now())
    const timer = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [visible])

  const startMs = startedAt ? new Date(startedAt).getTime() : null
  const currentElapsedMs = startMs != null && Number.isFinite(startMs) ? Math.max(0, nowMs - startMs) : 0
  const quarterLines = buildQuarterLines(boundaries, { 0: sideAScore, 1: sideBScore }, currentElapsedMs)
  const currentQuarterLabel = `Q${boundaries.length + 1}`

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.grabber} />

          <View style={styles.scoreboard}>
            <View style={styles.scoreCol}>
              <Text style={[styles.teamLabel, { color: SIDE_A_COLOR }]}>TEAM A</Text>
              <Text style={styles.teamScore}>{sideAScore}</Text>
            </View>
            <View style={styles.clockBox}>
              <Text style={styles.clock}>{formatElapsed(startedAt, nowMs)}</Text>
              <RallyText style={styles.clockSub}>{currentQuarterLabel} · เวลาเดิน</RallyText>
            </View>
            <View style={styles.scoreCol}>
              <Text style={[styles.teamLabel, { color: SIDE_B_COLOR }]}>TEAM B</Text>
              <Text style={styles.teamScore}>{sideBScore}</Text>
            </View>
          </View>

          <View style={styles.refereePillRow}>
            <View style={styles.refereePill}>
              <MaterialCommunityIcons
                name={isReferee ? 'whistle-outline' : 'eye-outline'}
                size={13}
                color="#eac31a"
              />
              <RallyText style={styles.refereePillText}>
                {isReferee ? 'คุณคุมเกม (กรรมการ)' : 'ดูสด · กรรมการคุมเกม'}
              </RallyText>
            </View>
          </View>

          <BasketballLiveQuarterPanel
            lines={quarterLines}
            onAddQuarter={isReferee ? onAddQuarter : undefined}
            disabled={endGamePending || addQuarterPending}
          />

          {isReferee && (
            <PressableScale
              style={[styles.endButton, (!canEndGame || endGamePending) && styles.endButtonDisabled]}
              onPress={onEndGame}
              disabled={!canEndGame || endGamePending}
              accessibilityRole="button"
              accessibilityLabel="จบเกมและส่งผล"
            >
              <MaterialCommunityIcons
                name="flag-checkered"
                size={18}
                color={!canEndGame || endGamePending ? 'rgba(26,21,0,0.5)' : '#1a1500'}
              />
              <RallyText variant="head" style={styles.endLabel}>จบเกม & ส่งผล</RallyText>
            </PressableScale>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0d1412',
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: Spacing.xs,
  },
  scoreboard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1b2622',
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  scoreCol: {
    width: '34%',
    alignItems: 'center',
  },
  teamLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  teamScore: {
    color: TEXT,
    fontSize: 40,
    fontWeight: '800',
    lineHeight: 42,
  },
  clockBox: {
    width: '30%',
    alignItems: 'center',
    backgroundColor: '#0d1412',
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(235,119,60,0.4)',
    paddingVertical: 6,
  },
  clock: {
    color: ACCENT,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 1,
  },
  clockSub: {
    color: 'rgba(243,246,238,0.55)',
    fontSize: 10,
    marginTop: 1,
  },
  refereePillRow: {
    alignItems: 'center',
    marginTop: -Spacing.xs,
  },
  refereePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(234,195,26,0.14)',
    borderRadius: Radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  refereePillText: {
    color: '#eac31a',
    fontSize: 10,
  },
  endButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#eac31a',
    borderRadius: Radius.lg,
    paddingVertical: 13,
  },
  endButtonDisabled: {
    backgroundColor: 'rgba(234,195,26,0.4)',
  },
  endLabel: {
    color: '#1a1500',
    fontSize: 14,
    letterSpacing: 0.4,
  },
})
