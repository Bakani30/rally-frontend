import { useEffect, useRef } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import {
  RefereeSourceIcon,
  type RefereeSourceIconName,
} from '@/components/referee/icons/RefereeSourceIcon'
import { Fonts, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import {
  cycleRefereeActivityFilter,
  REFEREE_ACTIVITY_FILTERS,
  refereeActivityLabel,
  refereeActivityShortLabel,
  type RefereeActivityFilter,
} from '@/lib/match/refereeCopy'
import { getSportReelItem } from '@/lib/match/sportReel'

type RefereeSportRailProps = {
  value: RefereeActivityFilter
  onChange: (value: RefereeActivityFilter) => void
  items?: readonly RefereeActivityFilter[]
}

export function RefereeSportRail({
  value,
  onChange,
  items = REFEREE_ACTIVITY_FILTERS,
}: RefereeSportRailProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const scrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    const index = items.indexOf(value)
    scrollRef.current?.scrollTo({ x: Math.max(0, index * 70 - 8), animated: true })
  }, [items, value])

  const move = (direction: -1 | 1) => onChange(cycleRefereeActivityFilter(value, direction, items))

  return (
    <View style={styles.controls}>
      <PressableScale
        style={styles.arrowButton}
        onPress={() => move(-1)}
        accessibilityRole="button"
        accessibilityLabel="เลือกกีฬาก่อนหน้า"
      >
        <MaterialCommunityIcons name="chevron-left" size={28} color={theme.fightInk} />
      </PressableScale>

      <View style={styles.track}>
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.content}
          accessibilityRole="tablist"
        >
          {items.map((key) => {
            const selected = value === key
            const reel = key === 'all' ? null : getSportReelItem(key)
            const backgroundColor = selected ? reel?.accent ?? theme.fightBg : theme.surface
            const color = selected
              ? reel?.onAccent ?? theme.fightInk
              : reel?.accent ?? theme.inkSoft
            const label = key === 'all' ? 'ทั้งหมด' : refereeActivityShortLabel(key)
            const accessibilityLabel = key === 'all' ? label : refereeActivityLabel(key)

            return (
              <PressableScale
                key={key}
                style={[styles.item, { backgroundColor }, selected ? styles.itemSelected : null]}
                onPress={() => onChange(key)}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                accessibilityLabel={`กรองกีฬา ${accessibilityLabel}`}
              >
                <RefereeSourceIcon
                  name={(key === 'all' ? 'whistle' : key) as RefereeSourceIconName}
                  size={22}
                  color={color}
                />
                <Text style={[styles.label, { color }]}>{label}</Text>
              </PressableScale>
            )
          })}
        </ScrollView>
      </View>

      <PressableScale
        style={styles.arrowButton}
        onPress={() => move(1)}
        accessibilityRole="button"
        accessibilityLabel="เลือกกีฬาถัดไป"
      >
        <MaterialCommunityIcons name="chevron-right" size={28} color={theme.fightInk} />
      </PressableScale>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    controls: {
      minHeight: 74,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    arrowButton: {
      width: 44,
      height: 58,
      borderRadius: Radius.lg,
      backgroundColor: theme.fightBg,
      borderWidth: 1,
      borderColor: theme.lineStrong,
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: theme.shadowSoft,
    },
    track: { flex: 1, minWidth: 0, minHeight: 70, overflow: 'hidden' },
    content: { gap: Spacing.sm, paddingHorizontal: 2 },
    item: {
      width: 62,
      minHeight: 70,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: theme.line,
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.xs,
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.sm,
    },
    itemSelected: { borderWidth: 2, borderColor: theme.lineStrong },
    label: { fontSize: 11, lineHeight: 17, fontWeight: '900', fontFamily: Fonts?.thaiMedium },
  })
}
