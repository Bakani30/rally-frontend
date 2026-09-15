import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { AnimatedNumber } from '@/components/motion/AnimatedNumber'
import { PressableScale } from '@/components/motion/PressableScale'
import { CheckinFlame } from '@/components/profile/checkin/CheckinFlame'
import { CheckinWeekDots } from '@/components/profile/CheckinWeekDots'
import {
  CheckCircleIcon,
  FireCheckIcon,
  MilestoneCheckIcon,
} from '@/components/profile/checkinIcons'
import { OnAccent, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useI18n } from '@/hooks/useI18n'
import { profileTabDictionary } from '@/lib/i18n/dictionaries/profileTab'
import {
  CHECKIN_STREAK_MILESTONES,
  type CheckinStreakProgress,
  getCheckinWeekDots,
} from '@/lib/profile/profileStreak'

type DailyCheckinHeroCardProps = {
  streakDays: number
  checkedInToday: boolean
  points: number
  progress: CheckinStreakProgress
  previewProgress: CheckinStreakProgress
  isPending: boolean
  onCheckIn: () => void
}

export function DailyCheckinHeroCard({
  streakDays,
  checkedInToday,
  points,
  progress,
  previewProgress,
  isPending,
  onCheckIn,
}: DailyCheckinHeroCardProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { t } = useI18n(profileTabDictionary)
  const targetMilestone = progress.nextMilestone
  const previewMilestone = previewProgress.reachedMilestone
  const weekDots = getCheckinWeekDots(progress.cycleDay, checkedInToday)
  const ctaCopy = previewMilestone
    ? t('checkinCtaBonus', { points: previewMilestone.rewardPoints })
    : t('checkinCtaDefault')

  return (
    <View style={styles.card}>
      <View style={styles.hero}>
        <CheckinFlame size={92} />
        <View style={styles.ptsRow}>
          <AnimatedNumber
            value={points}
            animateFromZero
            style={styles.ptsValue}
            formatter={(n) => n.toLocaleString()}
          />
          <Text style={styles.ptsUnit}>PTS</Text>
        </View>
        <View style={styles.streakChip}>
          <FireCheckIcon size={13} color={theme.orange} />
          <Text style={styles.streakText}>{t('checkinStreakDays', { days: streakDays })}</Text>
        </View>
      </View>

      <CheckinWeekDots dots={weekDots} />

      <View style={styles.milestoneRow}>
        {CHECKIN_STREAK_MILESTONES.map((milestone) => {
          const completed = progress.cycleDay >= milestone.cycleDay
          const isNext = targetMilestone.cycleDay === milestone.cycleDay && !completed
          return (
            <View
              key={milestone.cycleDay}
              style={[
                styles.milestoneChip,
                completed && styles.milestoneChipDone,
                isNext && styles.milestoneChipNext,
              ]}
            >
              <View style={styles.milestoneDayRow}>
                <Text style={[styles.milestoneDay, completed && styles.milestoneDayDone]}>
                  D{milestone.cycleDay}
                </Text>
                {completed ? <MilestoneCheckIcon size={13} color={theme.greenVivid} /> : null}
              </View>
              <Text style={[styles.milestoneReward, completed && styles.milestoneRewardDone]}>
                +{milestone.rewardPoints}
              </Text>
            </View>
          )
        })}
      </View>

      <PressableScale
        style={[styles.cta, checkedInToday && styles.ctaDone]}
        onPress={onCheckIn}
        disabled={checkedInToday || isPending}
        accessibilityRole="button"
        accessibilityLabel={checkedInToday ? t('checkinCtaDone') : t('checkinCtaDefault')}
      >
        {isPending ? (
          <ActivityIndicator color={OnAccent.onColor} />
        ) : (
          <>
            {checkedInToday ? (
              <MilestoneCheckIcon size={18} color={theme.greenVivid} />
            ) : (
              <CheckCircleIcon size={18} color={OnAccent.onColor} />
            )}
            <Text style={[styles.ctaText, checkedInToday && styles.ctaTextDone]}>
              {checkedInToday ? t('checkinCtaDone') : ctaCopy}
            </Text>
          </>
        )}
      </PressableScale>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    card: {
      width: 340,
      maxWidth: '100%',
      borderRadius: Radius.xxl,
      backgroundColor: theme.arcadeCabinet,
      padding: Spacing.lg,
      gap: Spacing.lg,
      boxShadow: theme.shadowSoft,
    },
    hero: { alignItems: 'center', gap: 6 },
    ptsRow: { flexDirection: 'row', alignItems: 'baseline', gap: 7 },
    ptsValue: {
      color: theme.economy,
      fontSize: 52,
      lineHeight: 56,
      fontWeight: '900',
      fontStyle: 'italic',
      fontVariant: ['tabular-nums'],
      letterSpacing: -0.5,
    },
    ptsUnit: { color: theme.economy, fontSize: 18, fontWeight: '900', fontStyle: 'italic' },
    streakChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.fightPanel,
      borderWidth: 1,
      borderColor: theme.fightLine,
      borderRadius: Radius.pill,
      paddingHorizontal: 11,
      paddingVertical: 5,
    },
    streakText: { color: theme.fightInkSoft, fontSize: 12, fontWeight: '800' },
    milestoneRow: { flexDirection: 'row', gap: Spacing.sm },
    milestoneChip: {
      flex: 1,
      minHeight: 46,
      borderRadius: Radius.lg,
      backgroundColor: theme.fightPanel,
      borderWidth: 1,
      borderColor: theme.lineStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    milestoneChipDone: { backgroundColor: theme.greenSoft, borderColor: theme.green },
    milestoneChipNext: { borderColor: theme.orange },
    milestoneDayRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    milestoneDay: { color: theme.fightMuted, fontSize: 11, fontWeight: '900' },
    milestoneDayDone: { color: theme.fightInk },
    milestoneReward: { color: theme.fightMuted, fontSize: 10, fontWeight: '800', marginTop: 2 },
    milestoneRewardDone: { color: theme.economy },
    cta: {
      minHeight: 50,
      borderRadius: Radius.lg,
      backgroundColor: theme.orange,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    ctaDone: {
      backgroundColor: theme.greenSoft,
      borderWidth: 1,
      borderColor: theme.green,
    },
    ctaText: { color: OnAccent.onColor, fontSize: 14, fontWeight: '900' },
    ctaTextDone: { color: theme.greenVivid },
  })
}
