import { useEffect, useRef } from 'react'
import {
  ActivityIndicator,
  ImageBackground,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import { Link, router, useLocalSearchParams } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { ChallengeCard } from '@/components/challenges/ChallengeCard'
import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useAuth } from '@/hooks/useAuth'
import { useCampaign } from '@/hooks/useCampaign'

export default function CampaignHubScreen() {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const { user } = useAuth()
  const { track } = useAnalytics()
  const { data: campaign, isPending, error } = useCampaign(slug, user?.id)
  const viewedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!campaign) return
    if (viewedRef.current === campaign.id) return
    viewedRef.current = campaign.id
    track({
      name: 'screen_viewed',
      properties: {
        event_schema_version: 2,
        source: 'client',
        surface: 'campaign_hub',
        campaign_id: campaign.id,
        campaign_slug: campaign.slug,
        entrypoint: 'campaign_hub',
        screen: 'campaign_hub',
        has_campaign_skin: true,
      },
    })
    track({
      name: 'flow_step_completed',
      properties: {
        event_schema_version: 2,
        source: 'client',
        surface: 'campaign_hub',
        campaign_id: campaign.id,
        campaign_slug: campaign.slug,
        entrypoint: 'campaign_hub',
        flow: 'official_event_journey',
        step: 'campaign_opened',
      },
    })
  }, [campaign, track])

  if (isPending) return <ActivityIndicator style={styles.loader} color={theme.red} />
  if (error || !campaign) {
    return (
      <View style={styles.center}>
        <MaterialCommunityIcons name="flag-off-outline" size={42} color={theme.muted} />
        <Text style={styles.errorTitle}>Campaign not found</Text>
        <PressableScale style={styles.secondaryButton} onPress={() => router.back()}>
          <Text style={styles.secondaryButtonText}>Back</Text>
        </PressableScale>
      </View>
    )
  }

  const skin = campaign.skin ?? {}
  const accent = skin.accentColor ?? skin.primaryColor ?? theme.red
  const heroImage = skin.coverImageUrl ?? skin.backgroundImageUrl

  function openChallenge(challengeId: string) {
    track({
      name: 'flow_step_completed',
      properties: {
        event_schema_version: 2,
        source: 'client',
        surface: 'campaign_hub',
        campaign_id: campaign!.id,
        campaign_slug: campaign!.slug,
        challenge_id: challengeId,
        entrypoint: 'campaign_hub',
        flow: 'official_event_journey',
        step: 'challenge_opened',
      },
    })
  }

  async function openPartner(url: string, target: string) {
    track({
      name: 'interaction_performed',
      properties: {
        event_schema_version: 2,
        source: 'client',
        surface: 'campaign_hub',
        campaign_id: campaign!.id,
        campaign_slug: campaign!.slug,
        entrypoint: 'campaign_hub',
        interaction: 'partner_cta',
        target,
      },
    })
    if (Platform.OS === 'web') {
      await Linking.openURL(url)
      return
    }
    await WebBrowser.openBrowserAsync(url)
  }

  const heroContent = (
    <View style={styles.heroOverlay}>
      <PressableScale style={styles.backButton} onPress={() => router.back()}>
        <MaterialCommunityIcons name="chevron-left" size={20} color={theme.chalk} />
      </PressableScale>
      <View style={[styles.officialPill, { borderColor: `${accent}66`, backgroundColor: `${accent}22` }]}>
        <MaterialCommunityIcons name="flag-variant" size={12} color={accent} />
        <Text style={[styles.officialText, { color: accent }]}>{campaign.partner_name ?? 'Official Challenge'}</Text>
      </View>
      <Text style={styles.title}>{campaign.title}</Text>
      <Text style={styles.prompt}>{campaign.short_prompt || campaign.description}</Text>
    </View>
  )

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      {heroImage ? (
        <ImageBackground
          source={{ uri: heroImage }}
          imageStyle={styles.heroImage}
          style={[styles.hero, { backgroundColor: skin.backgroundColor ?? theme.surface }]}
        >
          {heroContent}
        </ImageBackground>
      ) : (
        <View style={[styles.hero, { backgroundColor: skin.backgroundColor ?? theme.ink }]}>
          {heroContent}
        </View>
      )}

      {skin.eventStoryCopy ? (
        <Text style={styles.story}>{skin.eventStoryCopy}</Text>
      ) : null}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Challenges</Text>
        <Text style={styles.sectionMeta}>{campaign.challenges.length}</Text>
      </View>

      <View style={styles.challengeList}>
        {campaign.challenges.length === 0 ? (
          <Text style={styles.emptyText}>No active challenges in this campaign.</Text>
        ) : (
          campaign.challenges.map((challenge) => (
            <Link key={challenge.id} href={`/challenges/${challenge.id}`} asChild>
              <PressableScale onPress={() => openChallenge(challenge.id)}>
                <ChallengeCard challenge={challenge} />
              </PressableScale>
            </Link>
          ))
        )}
      </View>

      {campaign.partner_cards.length > 0 ? (
        <View style={styles.partnerList}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Partner</Text>
          </View>
          {campaign.partner_cards.map((card) => (
            <View key={card.id} style={styles.partnerCard}>
              <Text style={styles.partnerTitle}>{card.title}</Text>
              <Text style={styles.partnerBody}>{card.body}</Text>
              <PressableScale style={[styles.primaryButton, { backgroundColor: accent }]} onPress={() => openPartner(card.outboundUrl, card.id)}>
                <Text style={styles.primaryButtonText}>{card.ctaLabel}</Text>
                <MaterialCommunityIcons name="open-in-new" size={15} color={theme.chalk} />
              </PressableScale>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  loader: { flex: 1, backgroundColor: theme.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, backgroundColor: theme.bg, padding: Spacing.xl },
  errorTitle: { color: theme.ink, fontSize: 16, fontWeight: '800' },
  container: { padding: Spacing.lg, paddingBottom: 48, gap: Spacing.md },
  hero: {
    minHeight: 300,
    overflow: 'hidden',
    borderRadius: Radius.xxl,
    borderWidth: 1,
    borderColor: theme.line,
  },
  heroImage: { borderRadius: Radius.xxl },
  heroOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    padding: Spacing.lg,
    backgroundColor: 'rgba(12, 15, 20, 0.48)',
  },
  backButton: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(22,22,22,0.32)',
  },
  officialPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  officialText: { fontSize: 10, fontWeight: '900', letterSpacing: 0 },
  title: { color: theme.chalk, fontSize: 28, fontWeight: '900' },
  prompt: { color: 'rgba(255,255,255,0.86)', fontSize: 14, fontWeight: '700', lineHeight: 20 },
  story: { color: theme.inkSoft, fontSize: 14, lineHeight: 21, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: theme.ink, fontSize: 16, fontWeight: '900' },
  sectionMeta: { color: theme.muted, fontSize: 12, fontWeight: '800' },
  challengeList: { gap: Spacing.sm },
  emptyText: { color: theme.muted, fontSize: 13, fontWeight: '700' },
  partnerList: { gap: Spacing.sm },
  partnerCard: {
    backgroundColor: theme.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: theme.line,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  partnerTitle: { color: theme.ink, fontSize: 15, fontWeight: '900' },
  partnerBody: { color: theme.inkSoft, fontSize: 13, lineHeight: 19 },
  primaryButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primaryButtonText: { color: theme.chalk, fontSize: 12, fontWeight: '900', letterSpacing: 0 },
  secondaryButton: {
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: theme.surface,
    borderRadius: Radius.lg,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  secondaryButtonText: { color: theme.inkSoft, fontWeight: '800', fontSize: 12, letterSpacing: 0 },
  })
}
