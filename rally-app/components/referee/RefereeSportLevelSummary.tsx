import { PressableScale } from '@/components/motion/PressableScale'
import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { RallyText } from '@/components/ui/RallyText'
import { Fonts, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useI18n } from '@/hooks/useI18n'
import { refereeDictionary } from '@/lib/i18n/dictionaries/referee'
import { LEADERBOARD_ACTIVITIES } from '@/lib/leaderboard/leaderboardConfig'
import { refereePassActivityLabel, refereePassTierLabel } from '@/lib/match/refereePassPresentation'
import { refereeTierByLevel } from '@/lib/match/refereeLevels'
import { getSportReelItem } from '@/lib/match/sportReel'
import type { RefereeActivityKey } from '@/lib/match/refereeLevels'

type RefereeSportLevelSummaryProps = {
  items: readonly RefereeSportLevelItem[]
  selectedActivity?: RefereeActivityKey | null
  onSelect?: (activity: RefereeActivityKey) => void
}

export type RefereeSportLevelItem = {
  activityType: RefereeActivityKey
  level: number | null
  completedMatches: number
  rating: number | null
  disputedMatches: number
}

export function RefereeSportLevelSummary({ items, selectedActivity, onSelect }: RefereeSportLevelSummaryProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { t, language } = useI18n(refereeDictionary)

  return (
    <View style={styles.row}>
      {items.map((item) => {
        const reel = getSportReelItem(item.activityType)
        const sport = refereePassActivityLabel(item.activityType, t)
        const isSelected = selectedActivity === item.activityType
        const tier = item.level == null ? null : refereePassTierLabel(refereeTierByLevel(item.level), t)
        const iconBackground = reel.accent
        const iconColor = reel.onAccent
        const sportIcon = LEADERBOARD_ACTIVITIES.find((activity) => activity.key === item.activityType)?.icon
        const card = (
          <View
            style={[
              styles.item,
              isSelected && { borderColor: reel.accent, backgroundColor: theme.surfaceStrong },
            ]}
            accessible
            accessibilityLabel={t('refereeSportStatsA11y', {
              sport,
              level: item.level == null ? t('levelUnavailable') : item.level,
              matches: item.completedMatches,
            })}
          >
            <View style={[styles.icon, { backgroundColor: iconBackground }]}>
              <MaterialCommunityIcons
                name={sportIcon ?? 'whistle-outline'}
                size={20}
                color={iconColor}
              />
            </View>
            <View style={styles.copy}>
              <View style={styles.identityRow}>
                <MaterialCommunityIcons name="hexagon" size={12} color={theme.orange} />
                <RallyText variant="head" lang={language} style={styles.sport} numberOfLines={1}>
                  {sport}
                </RallyText>
              </View>
              <View style={styles.tierRow}>
                <MaterialCommunityIcons name="hexagon" size={10} color={theme.orange} />
                <Text style={styles.tier} numberOfLines={1}>
                  {tier ?? t('levelUnavailable')}
                </Text>
              </View>
            </View>
            <View style={styles.right}>
              <View style={styles.levelBlock}>
                <Text style={styles.level} numberOfLines={1}>
                  {item.level == null ? '—' : item.level}
                </Text>
                <Text style={styles.levelUnit}>LV</Text>
              </View>
              {onSelect ? (
                <MaterialCommunityIcons
                  name={isSelected ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={theme.mutedSoft}
                />
              ) : null}
            </View>
          </View>
        )

        return onSelect ? (
          <PressableScale
            key={item.activityType}
            onPress={() => onSelect(item.activityType)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected, expanded: isSelected }}
          >
            {card}
          </PressableScale>
        ) : <View key={item.activityType}>{card}</View>
      })}
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    row: { gap: Spacing.sm },
    item: {
      width: '100%',
      minWidth: 0,
      minHeight: 62,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface,
      paddingHorizontal: 10,
      paddingVertical: 8,
      boxShadow: theme.shadowSoft,
    },
    icon: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
    },
    copy: { flex: 1, minWidth: 0, gap: 1 },
    identityRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    tierRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    sport: {
      color: theme.ink,
      fontSize: 14,
      fontWeight: '900',
      letterSpacing: 0.3,
    },
    right: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    levelBlock: {
      minWidth: 64,
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: theme.arcadeCabinet,
      alignItems: 'flex-end',
    },
    level: {
      color: theme.chalk,
      fontSize: 16,
      fontWeight: '900',
      fontStyle: 'italic',
      fontFamily: Fonts?.rounded,
      fontVariant: ['tabular-nums'],
    },
    levelUnit: {
      color: theme.chalk,
      opacity: 0.6,
      fontSize: 9,
      fontWeight: '800',
      marginTop: 1,
    },
    tier: {
      color: theme.orange,
      fontSize: 10,
      fontWeight: '900',
      fontFamily: Fonts?.thaiMedium,
      letterSpacing: 0.3,
    },
  })
}
