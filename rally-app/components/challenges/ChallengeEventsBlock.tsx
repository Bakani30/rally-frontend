import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { ChallengeCard } from '@/components/challenges/ChallengeCard'
import { ChallengeHeroCarousel } from '@/components/challenges/ChallengeHeroCarousel'
import { ChallengeSectionHeader } from '@/components/challenges/ChallengeSectionHeader'
import { WeeklyDiscoverySection } from '@/components/challenges/WeeklyDiscoverySection'
import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useDiscoveryLocation } from '@/hooks/useDiscoveryLocation'
import { useFeaturedCampaigns } from '@/hooks/useCampaigns'
import { useChallenges } from '@/hooks/useChallenges'
import { useWeeklyRecommendation } from '@/hooks/useWeeklyRecommendation'
import { guardedRouter } from '@/lib/navigation/guardedRouter'
import type { ChallengeListItem } from '@/types/challenge'

type ChallengeEventsBlockProps = {
  currentUserId: string | undefined
  /**
   * Standalone surfaces (the OFFICIAL EVENTS page) pass true so a no-event
   * state shows an explanatory panel instead of an empty page. The Quest Hub
   * keeps the default false so quests lead the page when there are no events.
   */
  showEmptyState?: boolean
}

/**
 * Official-events band shown at the top of the Quest Hub: a sponsor hero
 * carousel + THIS WEEK recommendation + LIVE NOW (active) and Upcoming
 * (scheduled) sections. Joined challenges stay inside LIVE NOW with their
 * JOINED tag (no separate lane).
 */
export function ChallengeEventsBlock({ currentUserId, showEmptyState = false }: ChallengeEventsBlockProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { track } = useAnalytics()
  const campaigns = useFeaturedCampaigns()
  const { data, isPending, error } = useChallenges(currentUserId)

  const location = useDiscoveryLocation()
  const { featured } = useWeeklyRecommendation(data, location.coords)

  const all = data ?? []
  // The featured weekly event already has its own hero card above — repeating
  // it inside LIVE NOW made users unsure which card to tap.
  const live = all.filter(
    (challenge) => challenge.status === 'active' && challenge.id !== featured?.challenge.id,
  )
  const upcoming = all.filter((challenge) => challenge.status === 'scheduled')
  const heroes = campaigns.data ?? []

  if (!isPending && !error && !featured && heroes.length === 0 && live.length === 0 && upcoming.length === 0) {
    if (!showEmptyState) return null
    return (
      <View style={styles.emptyPanel}>
        <MaterialCommunityIcons name="calendar-blank-outline" size={28} color={theme.muted} />
        <Text style={styles.emptyTitle}>ยังไม่มี official event ตอนนี้</Text>
        <Text style={styles.emptyHint}>event ใหม่จะขึ้นที่นี่ — ระหว่างนี้เก็บแต้มจากเควสไปก่อนได้</Text>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="ไปหน้าเควส"
          style={styles.emptyCta}
          onPress={() => guardedRouter.push('/quests', { actionKey: 'events-empty:quests' })}
        >
          <MaterialCommunityIcons name="star-four-points" size={15} color="#ffffff" />
          <Text style={styles.emptyCtaText}>ไปหน้าเควส</Text>
        </PressableScale>
      </View>
    )
  }

  function openChallenge(item: ChallengeListItem) {
    guardedRouter.push(`/challenges/${item.id}`, { actionKey: `quests:challenge:${item.id}` })
  }

  function openCampaign(campaignId: string, slug: string) {
    track({
      name: 'flow_step_completed',
      properties: {
        event_schema_version: 2,
        source: 'client',
        surface: 'challenges',
        campaign_id: campaignId,
        campaign_slug: slug,
        entrypoint: 'challenges',
        flow: 'official_event_journey',
        step: 'campaign_opened',
      },
    })
    guardedRouter.push(`/campaigns/${slug}`, { actionKey: `quests:campaign:${slug}` })
  }

  function renderSection(label: string, tone: 'live' | 'upcoming', items: ChallengeListItem[]) {
    if (items.length === 0) return null
    return (
      <View style={styles.section}>
        <ChallengeSectionHeader label={label} count={items.length} tone={tone} />
        <View style={styles.list}>
          {items.map((item) => (
            <PressableScale
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.title}`}
              onPress={() => openChallenge(item)}
            >
              <ChallengeCard challenge={item} />
            </PressableScale>
          ))}
        </View>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      {heroes.length > 0 && <ChallengeHeroCarousel campaigns={heroes} onOpen={openCampaign} />}

      {!error && <WeeklyDiscoverySection featured={featured} location={location} isPending={isPending} />}

      {isPending && <ActivityIndicator color={theme.red} style={styles.pending} />}

      {error && (
        <View style={styles.errorRow}>
          <MaterialCommunityIcons name="alert-circle-outline" size={14} color={theme.red} />
          <Text style={styles.errorText}>โหลด events ไม่สำเร็จ</Text>
        </View>
      )}

      {renderSection('LIVE NOW', 'live', live)}
      {renderSection('เริ่มเร็วๆ นี้', 'upcoming', upcoming)}
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    root: { gap: 16 },
    section: { gap: 10 },
    list: { gap: Spacing.sm },
    pending: { marginVertical: Spacing.md },
    errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 2 },
    errorText: { color: theme.red, fontSize: 12, fontWeight: '800' },
    emptyPanel: {
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.panelBg,
      borderRadius: Radius.xl,
      borderWidth: 2,
      borderColor: theme.arcadeCabinetEdge,
      paddingVertical: 28,
      paddingHorizontal: Spacing.lg,
      shadowColor: theme.arcadeShadow,
      shadowOpacity: 0.12,
      shadowRadius: 0,
      shadowOffset: { width: 3, height: 4 },
    },
    emptyTitle: { color: theme.ink, fontSize: 15, fontWeight: '900' },
    emptyHint: { color: theme.muted, fontSize: 12, fontWeight: '700', textAlign: 'center' },
    emptyCta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      minHeight: 44,
      paddingHorizontal: 22,
      borderRadius: Radius.pill,
      backgroundColor: theme.orange,
      marginTop: 4,
    },
    emptyCtaText: { color: '#ffffff', fontSize: 13, fontWeight: '900', letterSpacing: 0.4 },
  })
}
