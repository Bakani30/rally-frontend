import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { WeeklyRecommendationCard } from '@/components/challenges/WeeklyRecommendationCard'
import { PressableScale } from '@/components/motion/PressableScale'
import { Fonts, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useSportTheme } from '@/hooks/useAppTheme'
import type { DiscoveryLocation } from '@/hooks/useDiscoveryLocation'
import { guardedRouter } from '@/lib/navigation/guardedRouter'
import type { RankedWeeklyEvent } from '@/lib/discovery/weeklyRecommendation'

type WeeklyDiscoverySectionProps = {
  /** Ranked weekly pick, computed by the parent so it can dedupe its lists. */
  featured: RankedWeeklyEvent | null
  location: DiscoveryLocation
  isPending: boolean
}

/**
 * "This Week" band: the top deterministic weekly recommendation for official
 * running events. Location is requested only when the user presses the nearby
 * button; the section stays fully usable without it (no fake proximity).
 * Recommendation + location state live in ChallengeEventsBlock so the LIVE NOW
 * list can exclude the featured event.
 */
export function WeeklyDiscoverySection({ featured, location, isPending }: WeeklyDiscoverySectionProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { track } = useAnalytics()

  if (isPending) {
    return (
      <View style={styles.root}>
        <Header styles={styles} />
        <ActivityIndicator color={theme.orange} style={{ marginVertical: Spacing.md }} />
      </View>
    )
  }

  // Existing official-event analytics contract; identifies the pressed card
  // via target + challenge_id only — never user coordinates.
  function trackCardPress(target: string, event: RankedWeeklyEvent) {
    track({
      name: 'interaction_performed',
      properties: {
        event_schema_version: 2,
        source: 'client',
        surface: 'challenges',
        challenge_id: event.challenge.id,
        entrypoint: 'challenges',
        interaction: 'challenge_card',
        target,
      },
    })
  }

  function openDetail(event: RankedWeeklyEvent) {
    trackCardPress('weekly_recommendation_card', event)
    guardedRouter.push(`/challenges/${event.challenge.id}`, {
      actionKey: `weekly:challenge:${event.challenge.id}`,
    })
  }

  function openMap(event: RankedWeeklyEvent) {
    trackCardPress('weekly_view_map_button', event)
    guardedRouter.push(`/challenges/map/${event.challenge.id}`, {
      actionKey: `weekly:map:${event.challenge.id}`,
    })
  }

  return (
    <View style={styles.root}>
      <Header styles={styles} />

      {featured ? (
        <WeeklyRecommendationCard
          event={featured}
          onOpenDetail={() => openDetail(featured)}
          onViewMap={featured.hasOfficialRoute ? () => openMap(featured) : undefined}
        />
      ) : (
        <View style={styles.emptyBox}>
          <MaterialCommunityIcons name="calendar-blank-outline" size={18} color={theme.muted} />
          <Text style={styles.emptyText}>ยังไม่มี event วิ่งแนะนำในสัปดาห์นี้</Text>
        </View>
      )}

      {featured && location.status !== 'granted' && (
        <View style={styles.locationRow}>
          {location.status === 'requesting' ? (
            <ActivityIndicator size="small" color={theme.orange} />
          ) : (
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="ใช้ตำแหน่งของฉันเพื่อดูระยะห่างจาก event"
              onPress={() => void location.request()}
              style={styles.locationButton}
            >
              <MaterialCommunityIcons name="crosshairs-gps" size={13} color={theme.inkSoft} />
              <Text style={styles.locationButtonText}>ดูระยะห่างจากฉัน</Text>
            </PressableScale>
          )}
          {location.status === 'denied' && (
            <Text style={styles.locationHint}>ไม่ได้รับอนุญาตตำแหน่ง — ยังดู event ได้ตามปกติ</Text>
          )}
          {location.status === 'unavailable' && (
            <Text style={styles.locationHint}>ตำแหน่งใช้งานไม่ได้ตอนนี้ — ยังดู event ได้ตามปกติ</Text>
          )}
        </View>
      )}
    </View>
  )
}

function Header({ styles }: { styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={styles.headerRow}>
      <View style={styles.weekPill}>
        <MaterialCommunityIcons name="lightning-bolt" size={12} color="#ffffff" />
        <Text style={styles.weekPillText}>THIS WEEK</Text>
      </View>
      <Text style={styles.headerHint}>event วิ่งแนะนำประจำสัปดาห์</Text>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    root: { gap: 10 },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    weekPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.orange,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: Radius.pill,
    },
    weekPillText: { color: '#ffffff', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
    headerHint: { color: theme.muted, fontSize: 11, fontFamily: Fonts?.thaiMedium },
    emptyBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.surfaceStrong,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: theme.line,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.md,
    },
    emptyText: { color: theme.muted, fontSize: 12, fontFamily: Fonts?.thaiMedium },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
    locationButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      minHeight: 32,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surfaceStrong,
    },
    locationButtonText: { color: theme.inkSoft, fontSize: 11, fontFamily: Fonts?.thaiMedium },
    locationHint: { color: theme.muted, fontSize: 10, fontFamily: Fonts?.thaiBody, flexShrink: 1 },
  })
}
