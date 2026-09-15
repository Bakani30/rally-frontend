import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { ActivityColor, Fonts, onAccent, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { formatCountdown, formatStartsIn, isEndingSoon } from '@/lib/challenges/challengeFormat'
import { ACTIVITY_LABEL } from '@/lib/match/matchConfig'
import type { Activity } from '@/lib/match/matchConfig'
import type { ChallengeListItem } from '@/types/challenge'

const GOAL_UNIT: Record<ChallengeListItem['goal_type'], string> = {
  distance_km: 'km',
  sessions: 'ครั้ง',
  minutes: 'นาที',
  custom: 'ภารกิจ',
}

const ACTIVITY_ICON: Partial<Record<Activity, keyof typeof MaterialCommunityIcons.glyphMap>> = {
  running: 'run-fast',
  basketball: 'basketball',
  badminton: 'badminton',
}

export function ChallengeCard({ challenge }: { challenge: ChallengeListItem }) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const accent = ActivityColor[challenge.activity_type] ?? theme.orange
  const fg = onAccent(accent)
  const max = challenge.max_participants
  const remaining = max ? Math.max(0, max - challenge.participant_count) : null
  // Scarcity is a join nudge — irrelevant (and alarming) once the user is in.
  const nearlyFull = !challenge.is_joined && remaining != null && remaining <= 5
  const isScheduled = challenge.status === 'scheduled'
  const endingSoon = !isScheduled && isEndingSoon(challenge.end_at)
  const countdownLabel = isScheduled ? formatStartsIn(challenge.start_at) : formatCountdown(challenge.end_at)

  return (
    <View style={styles.card}>
      <View style={[styles.rail, { backgroundColor: accent }]} />
      <View style={styles.headerRow}>
        <View style={[styles.iconBox, { backgroundColor: accent }]}>
          <MaterialCommunityIcons
            name={ACTIVITY_ICON[challenge.activity_type] ?? 'trophy-outline'}
            size={19}
            color={fg}
          />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.title} numberOfLines={1}>{challenge.title}</Text>
          <Text style={styles.activity}>
            {ACTIVITY_LABEL[challenge.activity_type]}
            {challenge.challenge_mode === 'cooperative' ? ' · co-op' : ' · solo'}
          </Text>
        </View>
        {challenge.is_joined ? (
          <View style={[styles.joinedTag, { backgroundColor: theme.greenSoft }]}>
            <MaterialCommunityIcons name="check" size={11} color={theme.green} />
            <Text style={[styles.joinedText, { color: theme.greenVivid }]}>JOINED</Text>
          </View>
        ) : challenge.reward_points ? (
          <Text style={styles.reward}>+{challenge.reward_points}</Text>
        ) : null}
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaPill}>
          <MaterialCommunityIcons
            name={isScheduled ? 'calendar-clock' : 'clock-outline'}
            size={11}
            color={endingSoon ? theme.red : theme.muted}
          />
          <Text style={styles.metaText}>{countdownLabel}</Text>
        </View>
        <View style={styles.metaPill}>
          <MaterialCommunityIcons name="account-group" size={11} color={theme.muted} />
          <Text style={styles.metaText}>เข้าร่วม {challenge.participant_count} คน</Text>
        </View>
        {nearlyFull && (
          <View style={[styles.metaPill, { backgroundColor: theme.redSoft, borderColor: theme.redSoft }]}>
            <MaterialCommunityIcons name="fire" size={11} color={theme.red} />
            <Text style={[styles.metaText, { color: theme.red }]}>เหลือ {remaining} ที่</Text>
          </View>
        )}
        <View style={styles.metaPill}>
          <MaterialCommunityIcons name="bullseye-arrow" size={11} color={theme.muted} />
          <Text style={styles.metaText}>{challenge.goal_value} {GOAL_UNIT[challenge.goal_type]}</Text>
        </View>
      </View>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.panelBg,
      borderRadius: Radius.xl,
      borderWidth: 2,
      borderColor: theme.arcadeCabinetEdge,
      paddingVertical: Spacing.md,
      paddingRight: Spacing.md,
      paddingLeft: 18,
      gap: Spacing.sm,
      overflow: 'hidden',
      shadowColor: theme.arcadeShadow,
      shadowOpacity: 0.12,
      shadowRadius: 0,
      shadowOffset: { width: 3, height: 4 },
    },
    rail: { position: 'absolute', left: 0, top: 14, bottom: 14, width: 5, borderTopRightRadius: Radius.pill, borderBottomRightRadius: Radius.pill },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    iconBox: { width: 40, height: 40, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 14, fontFamily: Fonts?.thaiHead, color: theme.ink },
    activity: { fontSize: 11, color: theme.muted, marginTop: 1, fontFamily: Fonts?.thaiMedium },
    reward: { color: theme.economy, fontSize: 14, fontWeight: '900', fontVariant: ['tabular-nums'] },
    joinedTag: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.pill, borderWidth: 1, borderColor: theme.green },
    joinedText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    metaPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: Radius.pill,
      backgroundColor: theme.surfaceStrong,
      borderWidth: 1,
      borderColor: theme.line,
    },
    metaText: { fontSize: 11, color: theme.inkSoft, fontFamily: Fonts?.thaiMedium, letterSpacing: 0.2 },
  })
}
