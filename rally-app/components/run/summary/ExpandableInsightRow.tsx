import { useState, type ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import type { RunRecapColors } from '@/components/run/recap/runRecapMomentStyles'

export type ExpandableInsightRowProps = {
  formHasData: boolean
  dayHasData: boolean
  /** Pre-built <RunFormCard/> element, rendered with an accent-border colors override. */
  formCard: ReactNode
  /** Pre-built <DayContextCard/> element, rendered with an accent-border colors override. */
  dayCard: ReactNode
  colors: RunRecapColors
}

/**
 * "ฟอร์มการวิ่ง" + "วันนี้" as two independently-collapsible pill buttons in
 * one row. Each button only renders if its card has data (RunFormCard /
 * DayContextCard's own null rules, surfaced via hasRunFormData /
 * hasDayContextData so this row never duplicates that logic). Both start
 * collapsed; tapping toggles a plain boolean — no animation, so this also
 * satisfies reduce-motion for free.
 */
export function ExpandableInsightRow({
  formHasData,
  dayHasData,
  formCard,
  dayCard,
  colors,
}: ExpandableInsightRowProps) {
  const [formOpen, setFormOpen] = useState(false)
  const [dayOpen, setDayOpen] = useState(false)
  if (!formHasData && !dayHasData) return null

  const styles = createStyles(colors)

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {formHasData && (
          <Pressable
            style={styles.toggle}
            onPress={() => setFormOpen((open) => !open)}
            accessibilityRole="button"
            accessibilityLabel="ฟอร์มการวิ่ง"
            accessibilityState={{ expanded: formOpen }}
          >
            <Text style={styles.toggleLabel}>ฟอร์มการวิ่ง</Text>
            <MaterialCommunityIcons
              name={formOpen ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.subText}
            />
          </Pressable>
        )}
        {dayHasData && (
          <Pressable
            style={styles.toggle}
            onPress={() => setDayOpen((open) => !open)}
            accessibilityRole="button"
            accessibilityLabel="วันนี้"
            accessibilityState={{ expanded: dayOpen }}
          >
            <Text style={styles.toggleLabel}>วันนี้</Text>
            <MaterialCommunityIcons
              name={dayOpen ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.subText}
            />
          </Pressable>
        )}
      </View>
      {formHasData && formOpen && <View style={styles.expandedWrap}>{formCard}</View>}
      {dayHasData && dayOpen && <View style={styles.expandedWrap}>{dayCard}</View>}
    </View>
  )
}

function createStyles(colors: RunRecapColors) {
  return StyleSheet.create({
    wrap: { marginBottom: 18 },
    row: { flexDirection: 'row', gap: 12 },
    expandedWrap: { marginTop: 12 },
    toggle: {
      flex: 1,
      minHeight: 48,
      borderRadius: 10,
      backgroundColor: colors.tileBg,
      borderWidth: 1.5,
      borderColor: colors.tileBorder,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    toggleLabel: { color: colors.heroInk, fontSize: 13, fontWeight: '900' },
  })
}
