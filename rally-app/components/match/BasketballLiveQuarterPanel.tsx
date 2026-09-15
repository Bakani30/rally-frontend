import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { PressableScale } from '@/components/motion/PressableScale'
import { RallyText } from '@/components/ui/RallyText'
import { ActivityColor, Radius, Spacing } from '@/constants/theme'
import { formatQuarterDuration, type QuarterLine } from '@/lib/match/basketballQuarters'

type BasketballLiveQuarterPanelProps = {
  lines: QuarterLine[]
  /** Omit to render the breakdown read-only (player / spectator view). */
  onAddQuarter?: () => void
  disabled?: boolean
}

const SIDE_A_COLOR = ActivityColor.basketball
const SIDE_B_COLOR = '#85b7eb'
const ACCENT = ActivityColor.basketball
const TEXT_MUTED = 'rgba(243,246,238,0.55)'

export function BasketballLiveQuarterPanel({
  lines,
  onAddQuarter,
  disabled = false,
}: BasketballLiveQuarterPanelProps) {
  return (
    <View style={styles.card}>
      <View style={styles.rows}>
        {lines.map((line) => (
          <View
            key={line.period}
            style={[styles.row, line.isCurrent && styles.rowCurrent]}
          >
            <Text style={[styles.score, { color: SIDE_A_COLOR }]} numberOfLines={1}>
              {line.side0}
            </Text>
            <View style={styles.periodCol}>
              <Text
                style={[styles.period, line.isCurrent && styles.periodCurrent]}
                numberOfLines={1}
              >
                {line.label}
              </Text>
              <Text style={styles.duration} numberOfLines={1}>
                {formatQuarterDuration(line.durationMs)}
              </Text>
            </View>
            <Text style={[styles.score, styles.scoreRight, { color: SIDE_B_COLOR }]} numberOfLines={1}>
              {line.side1}
            </Text>
          </View>
        ))}
      </View>

      {onAddQuarter && (
        <PressableScale
          style={[styles.addButton, disabled && styles.addButtonDisabled]}
          onPress={onAddQuarter}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="เพิ่มควอเตอร์"
        >
          <MaterialCommunityIcons name="plus" size={18} color={disabled ? TEXT_MUTED : ACCENT} />
          <RallyText style={[styles.addLabel, disabled && { color: TEXT_MUTED }]}>ควอเตอร์</RallyText>
        </PressableScale>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1b2622',
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  rows: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.07)',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  rowCurrent: {
    backgroundColor: 'rgba(235,119,60,0.1)',
    borderColor: 'rgba(235,119,60,0.45)',
  },
  score: {
    width: '34%',
    fontSize: 15,
    fontWeight: '800',
  },
  scoreRight: {
    textAlign: 'right',
  },
  periodCol: {
    flex: 1,
    alignItems: 'center',
  },
  period: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_MUTED,
  },
  periodCurrent: {
    color: ACCENT,
  },
  duration: {
    marginTop: 1,
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(243,246,238,0.4)',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(235,119,60,0.12)',
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(235,119,60,0.4)',
    paddingVertical: 10,
  },
  addButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  addLabel: {
    color: ACCENT,
    fontSize: 13,
  },
})
