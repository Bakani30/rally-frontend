// Shared capture watermark board — the single source of truth for both the
// on-screen quest HUD strip AND the baked photo/video watermark. Presentational
// only; positioning is owned by the consumer. Renders a flex row:
//   [optional REC segment] · [timestamp/count data slot] · [Rally colosseum mark]
// When `rec` is provided the live REC dot + elapsed timer render (on-screen HUD).
// When `rec` is null/omitted the REC segment is OMITTED — this is the baked output.
import { Image, StyleSheet, Text, View } from 'react-native'

import { Spacing } from '@/constants/theme'
import { formatMmss } from '@/lib/quest-proof/formatDuration'

// Data slot union — timestamp is used everywhere today; count is ready for a
// future scoreboard mode with no layout change.
export type DataSlot =
  | { kind: 'timestamp'; text: string }
  | { kind: 'count'; made: number; target: number }

export type CaptureWatermarkBoardProps = {
  slot: DataSlot
  /** Live-only REC segment. Present → renders REC dot + elapsed timer; omit for baked output. */
  rec?: { seconds: number } | null
}

/** Lime timestamp colour (running accent). */
const LIME_RING = '#CEF17B'

// Shared drop shadow so floating HUD text stays legible over any camera feed.
const TEXT_SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.85)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 4,
} as const

function DataSlotView({ slot }: { slot: DataSlot }) {
  if (slot.kind === 'timestamp') {
    return (
      <View style={styles.slotContainer}>
        <Text style={[styles.slotBig, styles.slotLime]}>{slot.text}</Text>
        <Text style={styles.slotLabel}>เวลาถ่าย</Text>
      </View>
    )
  }
  return (
    <View style={styles.slotContainer}>
      <Text style={[styles.slotBig, styles.slotLime]}>
        {slot.made} / {slot.target}
      </Text>
      <Text style={styles.slotLabel}>ทำได้</Text>
    </View>
  )
}

export function CaptureWatermarkBoard({ slot, rec }: CaptureWatermarkBoardProps) {
  return (
    <View style={styles.row}>
      {/* Left: live REC indicator + elapsed timer — omitted for baked output. */}
      {rec ? (
        <View style={styles.recSeg}>
          <View style={styles.recDot} />
          <Text style={styles.recLabel}>REC</Text>
          <Text style={styles.recTimer}>{formatMmss(rec.seconds)}</Text>
        </View>
      ) : (
        <View style={styles.recSpacer} />
      )}
      {/* Centre: timestamp (or count) data slot. */}
      <DataSlotView slot={slot} />
      {/* Right: Rally colosseum brand mark. */}
      <Image
        source={require('@/assets/images/brand/rally-colosseum-mark-orange.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  // Keeps the data slot centred when REC is omitted (mirrors the logo width).
  recSpacer: { width: 28, height: 28 },
  recSeg: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  recDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#ff4d4f',
    shadowColor: '#ff4d4f',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
  },
  recLabel: { color: '#fff', fontSize: 11, fontWeight: '900', ...TEXT_SHADOW },
  recTimer: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    ...TEXT_SHADOW,
  },
  slotContainer: { alignItems: 'center' },
  slotBig: { fontSize: 15, fontWeight: '900', fontStyle: 'italic', letterSpacing: 0.5, ...TEXT_SHADOW },
  slotLime: { color: LIME_RING },
  // NOTE: no custom lineHeight/fontWeight override interplay on the Thai label —
  // keeping the strip's original values avoids dropping Thai marks.
  slotLabel: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.5,
    opacity: 0.8,
    color: '#fff',
    marginTop: 2,
    ...TEXT_SHADOW,
  },
  logo: { width: 28, height: 28 },
})
