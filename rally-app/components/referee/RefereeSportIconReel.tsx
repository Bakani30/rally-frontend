import { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useI18n } from '@/hooks/useI18n'
import { refereeDictionary } from '@/lib/i18n/dictionaries/referee'
import {
  cycleRefereeActivityFilter,
  type RefereeActivityFilter,
} from '@/lib/match/refereeCopy'
import { refereePassActivityLabel } from '@/lib/match/refereePassPresentation'
import { getSportReelItem } from '@/lib/match/sportReel'

type IconName = keyof typeof MaterialCommunityIcons.glyphMap

type RefereeSportIconReelProps = {
  value: RefereeActivityFilter
  onChange: (value: RefereeActivityFilter) => void
  items?: readonly RefereeActivityFilter[]
  labelFor?: (activity: RefereeActivityFilter) => string
  previousLabel?: string
  nextLabel?: string
}

const FILTERS: readonly RefereeActivityFilter[] = [
  'all',
  'running',
  'basketball',
  'badminton',
]

const SLIDE_DURATION_MS = 260

export function RefereeSportIconReel({
  value,
  onChange,
  items = FILTERS,
  labelFor,
  previousLabel,
  nextLabel,
}: RefereeSportIconReelProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { t } = useI18n(refereeDictionary)
  const filters = items.length > 0 ? items : FILTERS
  const selected = filters.includes(value) ? value : filters[0]
  const selectedIndex = Math.max(0, filters.indexOf(selected))
  const [trackWidth, setTrackWidth] = useState(0)
  const progress = useSharedValue(selectedIndex)
  const previous = cycleRefereeActivityFilter(selected, -1, filters)
  const next = cycleRefereeActivityFilter(selected, 1, filters)
  const filterSignature = filters.join('|')

  useEffect(() => {
    cancelAnimation(progress)
    const itemCount = filters.length
    let targetIndex = selectedIndex
    const currentIndex = progress.value
    const half = itemCount / 2
    while (targetIndex - currentIndex > half) targetIndex -= itemCount
    while (targetIndex - currentIndex < -half) targetIndex += itemCount

    progress.value = withTiming(
      targetIndex,
      { duration: SLIDE_DURATION_MS, easing: Easing.out(Easing.cubic) },
      () => {
        progress.value = selectedIndex
      },
    )
  }, [filterSignature, filters.length, progress, selectedIndex])

  return (
    <View style={styles.controls} accessibilityRole="tablist">
      <PressableScale
        style={styles.arrowButton}
        onPress={() => onChange(previous)}
        accessibilityRole="button"
        accessibilityLabel={previousLabel ?? t('previousSport')}
        hitSlop={4}
        scaleTo={0.92}
      >
        <MaterialCommunityIcons name="chevron-left" size={28} color={theme.fightInk} />
      </PressableScale>

      <View
        style={styles.track}
        onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
      >
        {filters.map((activity, index) => (
          <SportIcon
            key={activity}
            activity={activity}
            itemIndex={index}
            itemCount={filters.length}
            progress={progress}
            trackWidth={trackWidth}
            selected={activity === selected}
            onPress={() => onChange(activity)}
            theme={theme}
            label={labelFor?.(activity) ?? (
              activity === 'all' ? t('allSports') : refereePassActivityLabel(activity, t)
            )}
          />
        ))}
      </View>

      <PressableScale
        style={styles.arrowButton}
        onPress={() => onChange(next)}
        accessibilityRole="button"
        accessibilityLabel={nextLabel ?? t('nextSport')}
        hitSlop={4}
        scaleTo={0.92}
      >
        <MaterialCommunityIcons name="chevron-right" size={28} color={theme.fightInk} />
      </PressableScale>
    </View>
  )
}

function SportIcon({
  activity,
  itemIndex,
  itemCount,
  progress,
  trackWidth,
  selected,
  onPress,
  theme,
  label: customLabel,
}: {
  activity: RefereeActivityFilter
  itemIndex: number
  itemCount: number
  progress: SharedValue<number>
  trackWidth: number
  selected: boolean
  onPress: () => void
  theme: SportPalette
  label?: string
}) {
  const styles = createStyles(theme)
  const reel = activity === 'all' ? null : getSportReelItem(activity)
  const accent = reel?.accent ?? theme.orange
  const iconColor = selected
    ? reel?.onAccent ?? theme.fightBg
    : accent
  const icon: IconName = activity === 'all'
    ? 'whistle-outline'
    : (reel?.icon as IconName) ?? 'whistle-outline'
  const label = customLabel ?? activity

  const animatedStyle = useAnimatedStyle(() => {
    let distance = itemIndex - progress.value
    const half = itemCount / 2
    if (distance > half) distance -= itemCount
    if (distance < -half) distance += itemCount

    const absDistance = Math.abs(distance)
    const slotGap = trackWidth > 0
      ? Math.max(76, Math.min(96, (trackWidth - 58) / 2.35))
      : 82
    const size = interpolate(absDistance, [0, 1, 1.18], [58, 42, 34], Extrapolation.CLAMP)

    return {
      opacity: interpolate(absDistance, [0, 1, 1.18], [1, 0.66, 0], Extrapolation.CLAMP),
      width: size,
      height: size,
      left: trackWidth / 2 - size / 2 + distance * slotGap,
      top: 38 - size / 2,
      zIndex: Math.round((4 - absDistance) * 10),
    }
  }, [itemCount, itemIndex, trackWidth])

  return (
    <PressableScale
      style={[
        styles.iconSlot,
        selected && styles.iconSlotSelected,
        {
          borderColor: selected ? accent : theme.line,
          backgroundColor: selected ? accent : theme.surface,
        },
        animatedStyle,
      ]}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      hitSlop={selected ? 0 : 4}
      scaleTo={0.9}
    >
      <MaterialCommunityIcons
        name={icon}
        size={selected ? 28 : 20}
        color={iconColor}
      />
    </PressableScale>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    controls: {
      minHeight: 76,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    arrowButton: {
      width: 42,
      height: 58,
      borderRadius: Radius.lg,
      backgroundColor: theme.fightBg,
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: theme.shadowSoft,
    },
    track: {
      flex: 1,
      minWidth: 0,
      minHeight: 76,
      position: 'relative',
      overflow: 'hidden',
    },
    iconSlot: {
      position: 'absolute',
      borderRadius: Radius.xl,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconSlotSelected: {
      boxShadow: theme.shadowSoft,
    },
  })
}
