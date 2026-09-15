import { useRef } from 'react'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'

const DAY_ABBR = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

function buildDays(count: number): Date[] {
  const base = new Date()
  base.setHours(0, 0, 0, 0)
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    return d
  })
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

type Props = {
  value: Date
  onChange: (date: Date) => void
  maxDays?: number
}

export function SchedulePicker({ value, onChange, maxDays = 14 }: Props) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const days = buildDays(maxDays)
  const listRef = useRef<FlatList>(null)

  function selectDay(day: Date) {
    const next = new Date(day)
    next.setHours(value.getHours(), value.getMinutes(), 0, 0)
    onChange(next)
  }

  function adjustHour(delta: number) {
    const next = new Date(value)
    next.setHours((next.getHours() + 24 + delta) % 24)
    onChange(next)
  }

  function adjustMinute(delta: number) {
    const next = new Date(value)
    next.setMinutes((next.getMinutes() + 60 + delta) % 60)
    onChange(next)
  }

  const h = String(value.getHours()).padStart(2, '0')
  const m = String(value.getMinutes()).padStart(2, '0')

  return (
    <View style={styles.root}>
      {/* Day strip */}
      <FlatList
        ref={listRef}
        data={days}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(d) => d.toDateString()}
        contentContainerStyle={styles.strip}
        renderItem={({ item: day, index }) => {
          const active = sameDay(day, value)
          return (
            <PressableScale
              style={[styles.dayChip, active && styles.dayChipActive]}
              onPress={() => selectDay(day)}
              accessibilityLabel={index === 0 ? 'วันนี้' : `${DAY_ABBR[day.getDay()]} ${day.getDate()}`}
            >
              <Text style={[styles.dayAbbr, active && styles.dayAbbrActive]}>
                {index === 0 ? 'วันนี้' : DAY_ABBR[day.getDay()]}
              </Text>
              <Text style={[styles.dayNum, active && styles.dayNumActive]}>
                {day.getDate()}
              </Text>
            </PressableScale>
          )
        }}
      />

      {/* Time stepper */}
      <View style={styles.timeRow}>
        <TimeStepper
          value={h}
          onUp={() => adjustHour(1)}
          onDown={() => adjustHour(-1)}
          label="ชั่วโมง"
        />
        <Text style={styles.sep}>:</Text>
        <TimeStepper
          value={m}
          onUp={() => adjustMinute(1)}
          onDown={() => adjustMinute(-1)}
          label="นาที"
        />
      </View>
    </View>
  )
}

function TimeStepper({
  value,
  onUp,
  onDown,
  label,
}: {
  value: string
  onUp: () => void
  onDown: () => void
  label: string
}) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  return (
    <View style={styles.stepper}>
      <PressableScale style={styles.arrow} onPress={onUp} accessibilityLabel={`เพิ่ม${label}`}>
        <MaterialCommunityIcons name="chevron-up" size={16} color={theme.inkSoft} />
      </PressableScale>
      <Text style={styles.timeNum}>{value}</Text>
      <PressableScale style={styles.arrow} onPress={onDown} accessibilityLabel={`ลด${label}`}>
        <MaterialCommunityIcons name="chevron-down" size={16} color={theme.inkSoft} />
      </PressableScale>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    root: { gap: Spacing.md },

    // Day strip
    strip: { gap: Spacing.xs, paddingVertical: 2 },
    dayChip: {
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 11,
      borderRadius: Radius.lg,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.line,
      minWidth: 50,
    },
    dayChipActive: { backgroundColor: theme.red, borderColor: theme.red },
    dayAbbr: { fontSize: 10, fontWeight: '700', color: theme.muted, letterSpacing: 0.3 },
    dayAbbrActive: { color: 'rgba(255,255,255,0.75)' },
    dayNum: { fontSize: 17, fontWeight: '900', color: theme.ink, marginTop: 2, fontVariant: ['tabular-nums'] },
    dayNumActive: { color: '#fff' },

    // Time stepper
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    stepper: { alignItems: 'center', gap: 2 },
    arrow: {
      width: 44,
      height: 28,
      borderRadius: Radius.md,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    timeNum: {
      fontSize: 22,
      fontWeight: '900',
      color: theme.ink,
      fontVariant: ['tabular-nums'],
      width: 48,
      textAlign: 'center',
      letterSpacing: -0.5,
    },
    sep: {
      fontSize: 18,
      fontWeight: '900',
      color: theme.muted,
      marginBottom: 1,
      marginHorizontal: 2,
    },
  })
}
