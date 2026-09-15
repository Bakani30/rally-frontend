import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type Href } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'

import { type HomeArenaHeroSlide } from '@/components/home/HomeArenaHero'
import { HomeView } from '@/components/home/HomeView'
import { QuestDetailPopup } from '@/components/quests/QuestDetailPopup'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useAuth } from '@/hooks/useAuth'
import { useHomeWalletSnapshot } from '@/hooks/useHomeWalletSnapshot'
import { useI18n } from '@/hooks/useI18n'
import { useHomeProfile } from '@/hooks/useProfile'
import { useMatchDiscovery } from '@/hooks/useMatchDiscovery'
import { useOtaRefresh } from '@/hooks/useOtaRefresh'
import { useNotificationUnread } from '@/hooks/useNotificationUnread'
import { useFeaturedCampaigns } from '@/hooks/useCampaigns'
import { useDailyMissionSync } from '@/hooks/useDailyMissionSync'
import { useDailyMissionToday } from '@/hooks/useDailyMissionToday'
import { useQuestDailyState } from '@/hooks/useQuestDailyState'
import { useQuestTemplates } from '@/hooks/useQuestTemplates'
import { toHomeWalletPresentation } from '@/lib/home/homeWalletPresentation'
import { homeDictionary } from '@/lib/i18n/dictionaries/home'
import { HOME_SHORTCUTS, type HomeShortcutKey } from '@/lib/navigation/homeMenu'
import { guardedRouter } from '@/lib/navigation/guardedRouter'
import type { QuestTemplateView } from '@/lib/quest-proof/questProofTypes'
import { topQuestPerSport } from '@/lib/quest-proof/topQuestPerSport'

const LOBBIES_ROUTE = '/lobbies' as unknown as Href
const QUESTS_ROUTE = '/quests' as unknown as Href
const REDEEM_ROUTE = '/redeem' as unknown as Href
// Campaigns are kept for future use; the home hero currently shows the sport ad
// banners only. Flip to true to restore campaign slides (and their impression
// tracking) in the hero carousel.
const SHOW_CAMPAIGNS_IN_HERO: boolean = false

const FALLBACK_HERO_SLIDES: HomeArenaHeroSlide[] = [
  {
    id: 'new-home-promo',
    kicker: 'RALLY',
    title: 'Rally promotion',
    body: '',
    icon: 'run',
    imageSource: require('../../assets/images/home/figma-new-home-promo-light.png'),
    darkImageSource: require('../../assets/images/home/figma-new-home-promo-dark.png'),
    tone: 'orange',
    visualOnly: true,
  },
]

export default function HomeScreen() {
  const { user } = useAuth()
  const { track } = useAnalytics()
  const { t } = useI18n(homeDictionary)
  const homeProfileQuery = useHomeProfile(user?.id)
  const homeWalletSnapshotQuery = useHomeWalletSnapshot(user?.id)
  const { data: profile, refetch: refetchHomeProfile } = homeProfileQuery
  const { refetch: refetchHomeWalletSnapshot } = homeWalletSnapshotQuery
  const notificationUnread = useNotificationUnread(user?.id)
  const featuredCampaigns = useFeaturedCampaigns()
  const dailyMission = useDailyMissionSync(user?.id)
  // Read-only observer of the shared sync-result cache: any sync (home, quest
  // popup, quest hub) updates the daily-walk numbers on the shortcut card.
  const dailyMissionToday = useDailyMissionToday(user?.id)
  const questTemplates = useQuestTemplates()
  const questDailyState = useQuestDailyState(user?.id)
  const { openMatchesQuery } = useMatchDiscovery({ enabled: !!user, fallbackRefreshMs: false })
  const isOpenMatchesStale = openMatchesQuery.isStale
  const refetchOpenMatches = openMatchesQuery.refetch
  const homeWalletPresentation = toHomeWalletPresentation(homeWalletSnapshotQuery)
  // Fire one health sync per signed-in user when home mounts — the shortcut
  // card read this mutation's data but nothing ever triggered it, so the
  // running-quest numbers never updated (stuck at 0 / เหลือ 7.0 km).
  const dailyMissionSyncedForRef = useRef<string | null>(null)
  const mutateDailyMission = dailyMission.mutate
  useEffect(() => {
    if (!user?.id || dailyMissionSyncedForRef.current === user.id) return
    dailyMissionSyncedForRef.current = user.id
    mutateDailyMission()
  }, [user?.id, mutateDailyMission])
  const [questPopup, setQuestPopup] = useState<QuestTemplateView | null>(null)
  const heroSlides = useMemo<HomeArenaHeroSlide[]>(() => {
    const localizedFallbackSlides = FALLBACK_HERO_SLIDES

    if (!SHOW_CAMPAIGNS_IN_HERO) return localizedFallbackSlides

    const campaigns = featuredCampaigns.data ?? []
    if (!campaigns.length) return localizedFallbackSlides

    return campaigns.map((campaign) => {
      const skin = campaign.skin ?? {}
      const imageUrl = skin.coverImageUrl ?? skin.backgroundImageUrl
      return {
        id: `campaign:${campaign.id}`,
        kicker: campaign.partner_name ?? 'OFFICIAL EVENT',
        title: campaign.title,
        body: campaign.short_prompt || campaign.description,
        icon: 'flag-variant',
        imageSource: imageUrl
          ? { uri: imageUrl }
          : require('../../assets/images/courts/basketball-court-3v3.png'),
        tone: 'green',
        live: campaign.status === 'active',
      }
    })
  }, [featuredCampaigns.data])

  useEffect(() => {
    if (!SHOW_CAMPAIGNS_IN_HERO) return
    for (const campaign of featuredCampaigns.data ?? []) {
      track({
        name: 'interaction_performed',
        properties: {
          event_schema_version: 2,
          source: 'client',
          surface: 'home',
          campaign_id: campaign.id,
          campaign_slug: campaign.slug,
          entrypoint: 'home',
          interaction: 'campaign_card',
          target: 'home_featured',
        },
      })
    }
  }, [featuredCampaigns.data, track])

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return
      void refetchHomeProfile()
      void refetchHomeWalletSnapshot()
      if (isOpenMatchesStale) void refetchOpenMatches()
    }, [
      isOpenMatchesStale,
      refetchHomeProfile,
      refetchHomeWalletSnapshot,
      refetchOpenMatches,
      user?.id,
    ]),
  )

  // Pull-to-refresh: refetch home data AND check the OTA server, so a user
  // can pull a shipped fix without force-closing the app. A downloaded
  // update surfaces as the banner below — applying is always explicit.
  const { updateReady, applying, runSessionLive, checkForOtaUpdate, applyUpdate } = useOtaRefresh()
  const [refreshing, setRefreshing] = useState(false)
  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        refetchHomeProfile(),
        refetchHomeWalletSnapshot(),
        refetchOpenMatches(),
        checkForOtaUpdate(),
      ])
    } finally {
      setRefreshing(false)
    }
  }, [checkForOtaUpdate, refetchHomeProfile, refetchHomeWalletSnapshot, refetchOpenMatches])

  function openRoute(shortcut: HomeShortcutKey | 'quests' | 'rewards', route: Href, actionKey: string) {
    track({ name: 'home_shortcut_tapped', properties: { shortcut } })
    guardedRouter.push(route, { actionKey })
  }

  function handleShortcutPress(shortcut: HomeShortcutKey) {
    const item = HOME_SHORTCUTS.find((candidate) => candidate.key === shortcut)
    if (!item) return

    openRoute(item.key, item.route as unknown as Href, item.actionKey)
  }

  function handleOpenQuests() {
    openRoute('quests', QUESTS_ROUTE, 'home:hero:quests')
  }

  function handleOpenCampaign(campaignId: string, slug: string) {
    track({
      name: 'flow_step_completed',
      properties: {
        event_schema_version: 2,
        source: 'client',
        surface: 'home',
        campaign_id: campaignId,
        campaign_slug: slug,
        entrypoint: 'home',
        flow: 'official_event_journey',
        step: 'campaign_opened',
      },
    })
    guardedRouter.push(`/campaigns/${slug}`, { actionKey: `home:campaign:${slug}` })
  }

  function handleHeroSlidePress(slide: HomeArenaHeroSlide) {
    track({
      name: 'interaction_performed',
      properties: {
        event_schema_version: 2,
        source: 'client',
        surface: 'home',
        entrypoint: 'home',
        interaction: 'campaign_hub_cta',
        target: slide.id,
      },
    })

    const campaign = featuredCampaigns.data?.find((item) => slide.id === `campaign:${item.id}`)
    if (campaign) {
      handleOpenCampaign(campaign.id, campaign.slug)
      return
    }

    if (slide.id === 'court-voucher') {
      openRoute('rewards', REDEEM_ROUTE, 'home:hero:rewards')
      return
    }
    if (slide.id === 'solo-lane') {
      openRoute('quests', QUESTS_ROUTE, 'home:hero:quests')
      return
    }
    openRoute('lobby', LOBBIES_ROUTE, 'home:hero:lobby')
  }

  return (
    <>
      <HomeView
        refreshing={refreshing}
        onRefresh={handleRefresh}
        wallet={homeWalletPresentation}
        onOpenWallet={() => guardedRouter.push('/wallet', { actionKey: 'home:reward-balance' })}
        heroSlides={heroSlides}
        onPressHeroSlide={handleHeroSlidePress}
        onPressShortcut={handleShortcutPress}
        quests={{
          views: topQuestPerSport(questTemplates.data ?? []),
          loading: questTemplates.isPending,
          dailyWalkSyncing: dailyMission.isPending && !dailyMissionToday.data,
          dailyWalkDistanceMeters: dailyMissionToday.data?.metrics.distanceMeters ?? 0,
          dailyWalkSteps: dailyMissionToday.data?.metrics.steps ?? 0,
          dailyState: questDailyState.data,
        }}
        onSelectQuest={setQuestPopup}
        onOpenQuests={handleOpenQuests}
        identity={{
          displayName: profile?.display_name,
          avatarUrl: profile?.avatar_url,
          notificationUnread: notificationUnread.hasUnread,
          notificationLabel: t('notifications'),
          profileLabel: t('profile'),
        }}
        onPressNotifications={() => guardedRouter.push('/notifications', { actionKey: 'home:notifications' })}
        onPressProfile={() => guardedRouter.push('/profile', { actionKey: 'home:profile' })}
        otaUpdate={updateReady ? { applying, runSessionLive } : null}
        onApplyOtaUpdate={() => { void applyUpdate() }}
      />
      <QuestDetailPopup view={questPopup} onClose={() => setQuestPopup(null)} />
    </>
  )
}
