import { ImageBackground, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, type SportPalette, Spacing } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import type { CampaignSummary } from '@/types/campaign'

type CampaignCardProps = {
  campaign: CampaignSummary
  compact?: boolean
  onPress: () => void
}

export function CampaignCard({ campaign, compact, onPress }: CampaignCardProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const skin = campaign.skin ?? {}
  const accent = skin.accentColor ?? skin.primaryColor ?? theme.red
  const image = skin.coverImageUrl ?? skin.backgroundImageUrl

  const content = (
    <View style={[styles.overlay, compact && styles.overlayCompact]}>
      <View style={[styles.badge, { borderColor: `${accent}66`, backgroundColor: `${accent}22` }]}>
        <MaterialCommunityIcons name="flag-variant" size={12} color={accent} />
        <Text style={[styles.badgeText, { color: accent }]}>{campaign.partner_name ?? 'Official'}</Text>
      </View>
      <Text style={styles.title} numberOfLines={compact ? 1 : 2}>{campaign.title}</Text>
      <Text style={styles.prompt} numberOfLines={compact ? 1 : 2}>{campaign.short_prompt || campaign.description}</Text>
    </View>
  )

  return (
    <PressableScale onPress={onPress} style={styles.pressable}>
      {image ? (
        <ImageBackground source={{ uri: image }} imageStyle={styles.image} style={styles.card}>
          {content}
        </ImageBackground>
      ) : (
        <View style={[styles.card, { backgroundColor: skin.backgroundColor ?? theme.surface }]}>
          {content}
        </View>
      )}
    </PressableScale>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    pressable: { width: '100%' },
    card: {
      minHeight: 150,
      overflow: 'hidden',
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface,
    },
    image: { borderRadius: Radius.xl },
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
      gap: Spacing.xs,
      padding: Spacing.md,
      backgroundColor: 'rgba(15, 18, 24, 0.46)',
    },
    overlayCompact: { minHeight: 120 },
    badge: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderRadius: Radius.pill,
      borderWidth: 1,
      paddingHorizontal: 9,
      paddingVertical: 5,
    },
    badgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 0 },
    title: { color: theme.chalk, fontSize: 20, fontWeight: '900' },
    prompt: { color: 'rgba(255,255,255,0.84)', fontSize: 12, fontWeight: '700', lineHeight: 17 },
  })
}
