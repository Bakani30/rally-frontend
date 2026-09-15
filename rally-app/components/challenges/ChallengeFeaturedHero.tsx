import { Image, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { onAccent, Radius, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { formatCountdown } from '@/lib/challenges/challengeFormat'
import type { CampaignSummary } from '@/types/campaign'

// Always show a real photo: partner cover image when set, else a sport venue.
const FALLBACK_IMAGE = require('../../assets/images/courts/basketball-court-5v5.png')

type ChallengeFeaturedHeroProps = {
  campaign: CampaignSummary
  width: number
  onPress: () => void
}

export function ChallengeFeaturedHero({ campaign, width, onPress }: ChallengeFeaturedHeroProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const skin = campaign.skin ?? {}
  const accent = skin.accentColor ?? skin.primaryColor ?? theme.orange
  const fg = onAccent(accent)
  const remoteImage = skin.coverImageUrl ?? skin.backgroundImageUrl
  const source = remoteImage ? { uri: remoteImage } : FALLBACK_IMAGE

  return (
    <PressableScale
      onPress={onPress}
      style={[styles.card, { width }]}
      accessibilityRole="button"
      accessibilityLabel={campaign.title}
    >
      <Image source={source} style={styles.image} resizeMode="cover" />
      <View style={styles.scrim} />
      <View style={styles.copy}>
        <View style={styles.badgeRow}>
          <View style={[styles.partner, { backgroundColor: accent }]}>
            <MaterialCommunityIcons name="flag-variant" size={11} color={fg} />
            <Text style={[styles.partnerText, { color: fg }]} numberOfLines={1}>
              {campaign.partner_name ? `PRESENTED BY ${campaign.partner_name.toUpperCase()}` : 'OFFICIAL'}
            </Text>
          </View>
        </View>
        <Text style={styles.title} numberOfLines={2}>{campaign.title}</Text>
        <View style={styles.metaRow}>
          <View style={styles.metaPill}>
            <MaterialCommunityIcons name="clock-outline" size={12} color={theme.chalk} />
            <Text style={styles.metaText}>{formatCountdown(campaign.end_at)}</Text>
          </View>
          <View style={[styles.cta, { backgroundColor: accent }]}>
            <Text style={[styles.ctaText, { color: fg }]}>{skin.ctaLabel ?? 'เข้าร่วม'}</Text>
            <MaterialCommunityIcons name="arrow-right" size={14} color={fg} />
          </View>
        </View>
      </View>
    </PressableScale>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    card: {
      height: 184,
      borderRadius: Radius.xxl,
      borderWidth: 2,
      borderColor: theme.arcadeCabinetEdge,
      backgroundColor: theme.arcadeCabinet,
      overflow: 'hidden',
      justifyContent: 'flex-end',
    },
    image: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
    scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,15,18,0.44)' },
    copy: { padding: 14, gap: 8 },
    badgeRow: { flexDirection: 'row' },
    partner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderRadius: Radius.pill,
      paddingHorizontal: 9,
      paddingVertical: 5,
      maxWidth: '100%',
    },
    partnerText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
    title: { color: theme.chalk, fontSize: 24, lineHeight: 26, fontWeight: '900', fontStyle: 'italic' },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    metaPill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { color: theme.chalk, fontSize: 11, fontWeight: '900' },
    cta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderRadius: Radius.pill,
      paddingHorizontal: 14,
      paddingVertical: 7,
      marginLeft: 'auto',
    },
    ctaText: { fontSize: 12, fontWeight: '900' },
  })
}
