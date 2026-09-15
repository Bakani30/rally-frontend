import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { ActivityColor, Fonts, onAccent, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { ACTIVITY_LABEL } from '@/lib/match/matchConfig'
import type { RankedWeeklyEvent } from '@/lib/discovery/weeklyRecommendation'

type WeeklyRecommendationCardProps = {
  event: RankedWeeklyEvent
  onOpenDetail: () => void
  /** Present only when the event has a renderable official route. */
  onViewMap?: () => void
}

/** "ศ. 17 ก.ค. · 06:00" from the event start time, in the device locale clock. */
function formatStart(startAtISO: string): string {
  const date = new Date(startAtISO)
  if (Number.isNaN(date.getTime())) return ''
  const day = new Intl.DateTimeFormat('th-TH', { weekday: 'short', day: 'numeric', month: 'short' }).format(date)
  const time = new Intl.DateTimeFormat('th-TH', { hour: '2-digit', minute: '2-digit' }).format(date)
  return `${day} · ${time}`
}

/** Compact reason line, e.g. "5K สัปดาห์นี้ · 3.2 กม. จากคุณ". */
function reasonLine(event: RankedWeeklyEvent): string {
  const parts: string[] = []
  if (event.isExactDistance && event.challenge.goal_type === 'distance_km') {
    parts.push(`${event.challenge.goal_value}K สัปดาห์นี้`)
  } else if (event.challenge.goal_type === 'distance_km') {
    parts.push(`${event.challenge.goal_value} กม. สัปดาห์นี้ (ระยะใกล้เคียงที่สุด)`)
  } else {
    parts.push('Event สัปดาห์นี้')
  }
  if (event.distanceFromUserKm != null) {
    parts.push(`${event.distanceFromUserKm.toFixed(1)} กม. จากคุณ`)
  }
  return parts.join(' · ')
}

export function WeeklyRecommendationCard({
  event,
  onOpenDetail,
  onViewMap,
}: WeeklyRecommendationCardProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { challenge } = event
  const startLabel = formatStart(challenge.start_at)
  // One accent per card: the sport's own color (lime for running). Orange
  // stays reserved for the THIS WEEK pill in the section header.
  const accent = ActivityColor[challenge.activity_type] ?? theme.orange
  const accentFg = onAccent(accent)

  return (
    <View style={[styles.card, { borderColor: accent }]}>
      <View style={styles.headerRow}>
        <View style={[styles.iconBox, { backgroundColor: accent }]}>
          <MaterialCommunityIcons name="run-fast" size={20} color={accentFg} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.title} numberOfLines={2}>{challenge.title}</Text>
          <Text style={[styles.reason, { color: accent }]} numberOfLines={1}>{reasonLine(event)}</Text>
        </View>
        {challenge.is_joined && (
          <View style={styles.joinedTag}>
            <MaterialCommunityIcons name="check" size={11} color={theme.greenVivid} />
            <Text style={styles.joinedText}>เข้าร่วมแล้ว</Text>
          </View>
        )}
      </View>

      <View style={styles.metaRow}>
        {!!startLabel && (
          <View style={styles.metaPill}>
            <MaterialCommunityIcons name="calendar-clock" size={11} color={theme.muted} />
            <Text style={styles.metaText}>{startLabel}</Text>
          </View>
        )}
        <View style={styles.metaPill}>
          <MaterialCommunityIcons name="bullseye-arrow" size={11} color={theme.muted} />
          <Text style={styles.metaText}>
            {ACTIVITY_LABEL[challenge.activity_type]}
            {challenge.goal_type === 'distance_km' ? ` ${challenge.goal_value} กม.` : ''}
          </Text>
        </View>
        {event.hasOfficialRoute && (
          <View style={[styles.metaPill, styles.routePill]}>
            <MaterialCommunityIcons name="map-marker-path" size={11} color={theme.greenVivid} />
            <Text style={[styles.metaText, { color: theme.greenVivid }]}>Official Route</Text>
          </View>
        )}
        <View style={styles.metaPill}>
          <MaterialCommunityIcons name="account-group" size={11} color={theme.muted} />
          <Text style={styles.metaText}>เข้าร่วม {challenge.participant_count} คน</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`เปิดรายละเอียด ${challenge.title}`}
          onPress={onOpenDetail}
          style={[styles.primaryButton, { backgroundColor: accent }]}
        >
          <Text style={[styles.primaryButtonText, { color: accentFg }]}>
            {challenge.is_joined ? 'ดูความคืบหน้า' : 'ดูรายละเอียด · เข้าร่วม'}
          </Text>
        </PressableScale>
        {onViewMap && (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={`ดูเส้นทางของ ${challenge.title}`}
            onPress={onViewMap}
            style={[styles.mapButton, { borderColor: accent }]}
          >
            <MaterialCommunityIcons name="map-outline" size={15} color={accent} />
            <Text style={[styles.mapButtonText, { color: accent }]}>ดูเส้นทาง</Text>
          </PressableScale>
        )}
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
      borderColor: theme.orange,
      padding: Spacing.md,
      gap: Spacing.sm,
      shadowColor: theme.arcadeShadow,
      shadowOpacity: 0.14,
      shadowRadius: 0,
      shadowOffset: { width: 3, height: 4 },
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    iconBox: {
      width: 44,
      height: 44,
      borderRadius: Radius.lg,
      backgroundColor: theme.orange,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: { fontSize: 15, fontFamily: Fonts?.thaiHead, color: theme.ink },
    reason: { fontSize: 12, fontFamily: Fonts?.thaiMedium, marginTop: 2 },
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
    routePill: { borderColor: theme.green, backgroundColor: theme.greenSoft },
    joinedTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: theme.green,
      backgroundColor: theme.greenSoft,
    },
    joinedText: { fontSize: 10, fontFamily: Fonts?.thaiMedium, color: theme.greenVivid, letterSpacing: 0.3 },
    metaText: { fontSize: 11, color: theme.inkSoft, fontFamily: Fonts?.thaiMedium, letterSpacing: 0.2 },
    actionRow: { flexDirection: 'row', gap: Spacing.sm },
    primaryButton: {
      flex: 1,
      minHeight: 44,
      borderRadius: Radius.pill,
      backgroundColor: theme.orange,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing.md,
    },
    primaryButtonText: { fontSize: 13, fontFamily: Fonts?.thaiHead, letterSpacing: 0.4 },
    mapButton: {
      minHeight: 44,
      borderRadius: Radius.pill,
      borderWidth: 2,
      borderColor: theme.orange,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 6,
      paddingHorizontal: Spacing.md,
    },
    mapButtonText: { fontSize: 13, fontFamily: Fonts?.thaiHead },
  })
}
