/**
 * SpotActionPanel — bottom sheet showing spot info + the primary CTA.
 *
 * States:
 *   out-of-range  → "ไกลเกิน" (disabled)
 *   in-range      → "เช็คอิน" (enabled)
 *   dwell pending → countdown label (disabled)
 *   dwell done    → "รับแต้ม" (enabled)
 *   claimed       → "Claimed" (disabled, indigo bg)
 */

import { ActivityIndicator, Pressable, Text, View } from 'react-native'

import { OnAccent, RallyAccent, type SportPalette } from '@/constants/theme'
import type { QuestSpot } from '@/hooks/useNearbyQuestSpots'
import type { MapQuestStyles } from './mapQuestStyles'

// Solid marker colors — must stay in sync with index.tsx constants
const SPOT_COLOR_IN_RANGE = RallyAccent.orange
const SPOT_COLOR_CLAIMED = RallyAccent.indigo

export type SpotActionPanelProps = {
  spot: QuestSpot
  arrivedAt: number | null
  dwellRemaining: number | null
  isClaimed: boolean
  isPendingArrive: boolean
  isPendingClaim: boolean
  onArrive: () => void
  onClaim: () => void
  styles: MapQuestStyles
  theme: SportPalette
}

export function SpotActionPanel({
  spot,
  arrivedAt,
  dwellRemaining,
  isClaimed,
  isPendingArrive,
  isPendingClaim,
  onArrive,
  onClaim,
  styles,
  theme,
}: SpotActionPanelProps) {
  const isDwelling = arrivedAt !== null && dwellRemaining !== null && dwellRemaining > 0
  const isDwellDone = arrivedAt !== null && dwellRemaining === 0

  const canArrive = spot.inRange && arrivedAt === null && !isClaimed
  const canClaim = isDwellDone && !isClaimed

  let btnLabel = '—'
  let btnDisabled = true

  if (isClaimed) {
    btnLabel = 'Claimed'
    btnDisabled = true
  } else if (isDwelling && dwellRemaining !== null) {
    btnLabel = `${dwellRemaining}s`
    btnDisabled = true
  } else if (isDwellDone) {
    btnLabel = 'รับแต้ม'
    btnDisabled = false
  } else if (canArrive) {
    btnLabel = 'เช็คอิน'
    btnDisabled = false
  } else if (!spot.inRange) {
    btnLabel = 'ไกลเกิน'
    btnDisabled = true
  }

  const isPending = isPendingArrive || isPendingClaim

  return (
    <View style={styles.actionPanel}>
      <View style={styles.actionPanelInner}>
        {/* Spot info row */}
        <View style={styles.spotInfo}>
          <View style={[
            styles.spotDot,
            { backgroundColor: isClaimed ? SPOT_COLOR_CLAIMED : spot.inRange ? SPOT_COLOR_IN_RANGE : theme.muted },
          ]} />
          <View style={styles.spotCopy}>
            <Text style={styles.spotName} numberOfLines={1}>{spot.name}</Text>
            <Text style={styles.spotReward}>+{spot.reward_points}</Text>
          </View>
          <View style={styles.statusPill}>
            <Text style={[
              styles.statusPillText,
              spot.inRange && !isClaimed && styles.statusPillTextActive,
            ]}>
              {isClaimed ? 'Done' : spot.inRange ? 'In range' : 'Out of range'}
            </Text>
          </View>
        </View>

        {/* CTA */}
        <Pressable
          style={[
            styles.actionBtn,
            btnDisabled && styles.actionBtnDisabled,
            isClaimed && styles.actionBtnClaimed,
          ]}
          onPress={canClaim ? onClaim : onArrive}
          disabled={btnDisabled || isPending}
          accessibilityLabel={btnLabel}
        >
          {isPending ? (
            <ActivityIndicator color={OnAccent.onColor} size="small" />
          ) : (
            <Text style={[styles.actionBtnText, btnDisabled && styles.actionBtnTextDisabled]}>
              {btnLabel}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  )
}
