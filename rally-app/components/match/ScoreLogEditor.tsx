import { StyleSheet, Text, TextInput, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Sport } from '@/constants/theme'
import { PressableScale } from '@/components/motion/PressableScale'
import type { ScoreLogPeriod } from '@/types/match'

type Props = {
  periods: ScoreLogPeriod[]
  onChange: (periods: ScoreLogPeriod[]) => void
  periodLabel?: string // "Quarter", "Game", "Set"
  maxPeriods?: number
}

export function ScoreLogEditor({ periods, onChange, periodLabel = 'Period', maxPeriods = 12 }: Props) {
  function update(idx: number, patch: Partial<ScoreLogPeriod>) {
    onChange(periods.map((p, i) => (i === idx ? { ...p, ...patch } : p)))
  }
  function add() {
    if (periods.length >= maxPeriods) return
    onChange([...periods, { period: periods.length + 1, side_0: 0, side_1: 0 }])
  }
  function remove(idx: number) {
    onChange(periods.filter((_, i) => i !== idx).map((p, i) => ({ ...p, period: i + 1 })))
  }

  const totals = periods.reduce(
    (acc, p) => ({ a: acc.a + (p.side_0 || 0), b: acc.b + (p.side_1 || 0) }),
    { a: 0, b: 0 },
  )

  return (
    <View>
      {periods.map((p, i) => (
        <View key={i} style={styles.row}>
          <Text style={styles.periodLabel}>{periodLabel} {p.period}</Text>
          <TextInput
            style={styles.scoreInput}
            value={p.side_0 === 0 && !p.side_0 ? '' : String(p.side_0)}
            onChangeText={(t) => update(i, { side_0: parseInt(t || '0', 10) || 0 })}
            keyboardType="number-pad"
            placeholder="A"
            placeholderTextColor={Sport.mutedSoft}
          />
          <Text style={styles.dash}>–</Text>
          <TextInput
            style={styles.scoreInput}
            value={p.side_1 === 0 && !p.side_1 ? '' : String(p.side_1)}
            onChangeText={(t) => update(i, { side_1: parseInt(t || '0', 10) || 0 })}
            keyboardType="number-pad"
            placeholder="B"
            placeholderTextColor={Sport.mutedSoft}
          />
          <PressableScale style={styles.removeBtn} onPress={() => remove(i)}>
            <MaterialCommunityIcons name="close" size={16} color={Sport.muted} />
          </PressableScale>
        </View>
      ))}

      <View style={styles.footer}>
        <PressableScale style={styles.addBtn} onPress={add} disabled={periods.length >= maxPeriods}>
          <MaterialCommunityIcons name="plus" size={14} color={Sport.ink} />
          <Text style={styles.addText}>Add {periodLabel.toLowerCase()}</Text>
        </PressableScale>
        {periods.length > 0 && (
          <Text style={styles.totals}>
            Totals: {totals.a} – {totals.b}
          </Text>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  periodLabel: {
    color: Sport.inkSoft,
    fontSize: 13,
    fontWeight: '600',
    width: 90,
  },
  scoreInput: {
    flex: 1,
    backgroundColor: Sport.surface,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: Sport.ink,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: Sport.line,
  },
  dash: { color: Sport.muted, fontSize: 16 },
  removeBtn: {
    width: 30, height: 30, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Sport.surface,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Sport.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Sport.line,
  },
  addText: { color: Sport.ink, fontSize: 12, fontWeight: '600' },
  totals: { color: Sport.muted, fontSize: 12, fontWeight: '600' },
})
