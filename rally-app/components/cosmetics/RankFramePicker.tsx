import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { SvgXml } from 'react-native-svg'
import { PressableScale } from '@/components/motion/PressableScale'
import { Reveal } from '@/components/motion/Reveal'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { getRankFrameSvg } from '@/lib/ranks/rankFrameSvg'
import type { Tier } from '@/lib/leaderboard/tierRules'
import type { RankFrameCell } from '@/lib/cosmetics/rankFrameGating'

type RankFramePickerProps = {
  cells: RankFrameCell[]
  selectedTier: Tier | null
  onSelect: (tier: Tier | null) => void
  disabled?: boolean
}

const NONE_LABEL = 'ไม่ใส่กรอบ'
const GRID_COLUMNS = 3
const DEFAULT_CELL_WIDTH = 92

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'flex-start',
      columnGap: Spacing.md,
      rowGap: Spacing.md,
    },
    cell: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: Spacing.md,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface,
    },
    cellSelected: { borderColor: theme.green, backgroundColor: `${theme.green}14` },
    cellDisabled: { opacity: 0.68 },
    noneIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
    cellLabel: { fontSize: 11, lineHeight: 16, fontWeight: '800', color: theme.ink },
    lockReason: {
      fontSize: 9, lineHeight: 14, fontWeight: '700', color: theme.muted,
      textAlign: 'center', paddingHorizontal: 4,
    },
    tag: {
      position: 'absolute', top: 6, right: 6,
      borderRadius: Radius.pill, backgroundColor: theme.green,
      width: 16, height: 16, alignItems: 'center', justifyContent: 'center',
    },
  })
}

// Grid of the 7 rank-frame tiers plus a "no frame" cell. Locked cells show
// their lock reason and are not pressable. Pure presentational — receives
// gating state from `buildRankFrameCells`, does not fetch anything.
export function RankFramePicker({ cells, selectedTier, onSelect, disabled = false }: RankFramePickerProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const [gridWidth, setGridWidth] = useState(0)
  const cellWidth = gridWidth > 0
    ? (gridWidth - Spacing.md * (GRID_COLUMNS - 1)) / GRID_COLUMNS
    : DEFAULT_CELL_WIDTH

  return (
    <View
      style={styles.grid}
      onLayout={({ nativeEvent }) => {
        const nextWidth = Math.round(nativeEvent.layout.width)
        setGridWidth((currentWidth) => currentWidth === nextWidth ? currentWidth : nextWidth)
      }}
    >
      <Reveal delay={0}>
        <PressableScale
          style={[
            styles.cell,
            { width: cellWidth },
            selectedTier === null && styles.cellSelected,
            disabled && styles.cellDisabled,
          ]}
          onPress={() => onSelect(null)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityState={{ selected: selectedTier === null }}
        >
          <View style={styles.noneIcon}>
            <MaterialCommunityIcons name="shape-circle-plus" size={28} color={theme.mutedSoft} />
          </View>
          <Text style={styles.cellLabel} numberOfLines={1}>{NONE_LABEL}</Text>
        </PressableScale>
      </Reveal>

      {cells.map((cell, idx) => {
        const locked = cell.state === 'locked_above' || cell.state === 'locked_passed'
        const selected = !locked && selectedTier === cell.tier

        return (
          <Reveal key={cell.tier} delay={(idx + 1) * 40}>
            <PressableScale
              style={[
                styles.cell,
                { width: cellWidth },
                selected && styles.cellSelected,
                (locked || disabled) && styles.cellDisabled,
              ]}
              onPress={locked ? undefined : () => onSelect(cell.tier)}
              disabled={locked || disabled}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled: locked }}
            >
              {cell.state === 'equipped' ? (
                <View style={styles.tag}>
                  <MaterialCommunityIcons name="check" size={11} color={theme.chalk} />
                </View>
              ) : null}
              <SvgXml xml={getRankFrameSvg(cell.tier)} width={48} height={48} />
              <Text style={styles.cellLabel} numberOfLines={1}>
                {cell.tier.charAt(0).toUpperCase() + cell.tier.slice(1)}
              </Text>
              {locked && cell.lockReason ? (
                <Text style={styles.lockReason} numberOfLines={2}>{cell.lockReason}</Text>
              ) : null}
            </PressableScale>
          </Reveal>
        )
      })}
    </View>
  )
}
