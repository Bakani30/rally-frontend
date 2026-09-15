import { useEffect, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text } from 'react-native'
import { PressableScale } from '@/components/motion/PressableScale'
import { DailyCheckinHeroCard } from '@/components/profile/checkin/DailyCheckinHeroCard'
import { Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useAuth } from '@/hooks/useAuth'
import { useDailyCheckin } from '@/hooks/useDailyCheckin'
import { useProfile } from '@/hooks/useProfile'
import { useWalletSummary } from '@/hooks/useWalletSummary'
import { hasCheckedInToday, todayLocalDate } from '@/lib/profile/profileService'
import { getCheckinStreakProgress } from '@/lib/profile/profileStreak'

type DailyCheckinModalProps = {
  /** When provided, the modal is controlled externally (profile on-demand).
   *  Omit for the root auto first-of-day instance. */
  open?: boolean
  onRequestClose?: () => void
}

type CheckinSuccess = {
  streak: number
  points_earned: number
  /** ISO date string (Bangkok tz) — used to invalidate success state on next day. */
  date: string
}

export function DailyCheckinModal({ open, onRequestClose }: DailyCheckinModalProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { user } = useAuth()
  const { data: profile } = useProfile(user?.id)
  const { data: walletSummary } = useWalletSummary(user?.id)
  const checkinMutation = useDailyCheckin(user?.id)
  const [dismissedDate, setDismissedDate] = useState<string | null>(null)
  const [successResult, setSuccessResult] = useState<CheckinSuccess | null>(null)
  const [errorText, setErrorText] = useState<string | null>(null)

  const today = todayLocalDate()
  const checkedIn = hasCheckedInToday(profile?.last_checkin_date)
  // Only count this session's success if it happened today (guards day rollover)
  const todaySuccess = successResult?.date === today ? successResult : null
  const checkedInToday = checkedIn || !!todaySuccess

  // Controlled: open prop drives visibility. Uncontrolled: auto first-of-day —
  // stay open through this session's success so the reward animates, but never
  // re-nag someone who already checked in on a previous session.
  const visible = open !== undefined
    ? open
    : !!profile && dismissedDate !== today && (!checkedIn || !!todaySuccess)

  const currentStreak = profile?.current_streak ?? 0
  const displayStreak = todaySuccess?.streak ?? currentStreak
  const progress = getCheckinStreakProgress(displayStreak)
  const previewProgress = getCheckinStreakProgress(currentStreak + 1)
  const points = walletSummary?.wallet?.spendable_points ?? 0

  // Clear dismissed date when the day rolls over so the modal can re-show.
  useEffect(() => {
    if (dismissedDate && dismissedDate !== today) setDismissedDate(null)
  }, [today, dismissedDate])

  async function checkIn() {
    setErrorText(null)
    try {
      const data = await checkinMutation.mutateAsync()
      setSuccessResult({ streak: data.streak, points_earned: data.points_earned, date: today })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not check in.'
      // "Already checked in" resolves to the checked-in card via cache; only
      // surface genuine failures.
      if (!message.includes('Already checked in')) setErrorText(message)
    }
  }

  function dismiss() {
    setErrorText(null)
    if (open !== undefined) {
      onRequestClose?.()
    } else {
      setDismissedDate(today)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={dismiss}>
      <Pressable style={styles.backdrop} onPress={dismiss}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <DailyCheckinHeroCard
            streakDays={displayStreak}
            checkedInToday={checkedInToday}
            points={points}
            progress={progress}
            previewProgress={previewProgress}
            isPending={checkinMutation.isPending}
            onCheckIn={checkIn}
          />
          {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
          <PressableScale
            style={styles.dismiss}
            onPress={dismiss}
            disabled={checkinMutation.isPending}
          >
            <Text style={styles.dismissText}>{checkedInToday ? 'ปิด' : 'ไว้ทีหลัง'}</Text>
          </PressableScale>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing.xl,
    },
    card: { width: '100%', maxWidth: 360, alignItems: 'center', gap: Spacing.sm },
    dismiss: { paddingVertical: 8, paddingHorizontal: 16 },
    dismissText: { color: theme.fightMuted, fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
    errorText: {
      color: theme.risk,
      fontSize: 12,
      fontWeight: '700',
      textAlign: 'center',
      paddingHorizontal: Spacing.sm,
    },
  })
}
