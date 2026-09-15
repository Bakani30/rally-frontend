import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useI18n } from '@/hooks/useI18n'
import { comingSoonDictionary } from '@/lib/i18n/dictionaries/comingSoon'
import { guardedRouter } from '@/lib/navigation/guardedRouter'
import type { ComingSoonFeature, ComingSoonTone } from '@/lib/roadmap/comingSoonFeatures'

type ComingSoonFeatureShellProps = {
  feature: ComingSoonFeature
  showBack?: boolean
}

export function ComingSoonFeatureShell({ feature, showBack = true }: ComingSoonFeatureShellProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const accent = getToneColor(theme, feature.tone)
  const { t } = useI18n(comingSoonDictionary)

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        {showBack && (
          <PressableScale style={styles.backButton} onPress={() => router.back()} accessibilityLabel={t('back')}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={theme.arcadeCtaText} />
          </PressableScale>
        )}
        <View style={[styles.heroIcon, { borderColor: accent, backgroundColor: `${accent}22` }]}>
          <MaterialCommunityIcons name={feature.icon as never} size={34} color={accent} />
        </View>
        <View style={styles.heroCopy}>
          <Text style={[styles.kicker, { color: accent }]}>{feature.kicker}</Text>
          <Text style={styles.title}>{feature.title}</Text>
          <Text style={styles.body}>{feature.body}</Text>
        </View>
        <View style={styles.badge}>
          <View style={[styles.badgeDot, { backgroundColor: accent }]} />
          <Text style={styles.badgeText}>{t('comingSoonBadge')}</Text>
        </View>
      </View>

      <View style={styles.chipRow}>
        {feature.chips.map((chip) => (
          <View key={chip} style={[styles.chip, { borderColor: `${accent}88`, backgroundColor: `${accent}18` }]}>
            <Text style={[styles.chipText, { color: accent }]} numberOfLines={1}>
              {chip}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.previewList}>
        {feature.previews.map((item) => (
          <View key={item.title} style={styles.previewRow}>
            <View style={[styles.previewIcon, { backgroundColor: `${accent}18`, borderColor: `${accent}70` }]}>
              <MaterialCommunityIcons name={item.icon as never} size={20} color={accent} />
            </View>
            <View style={styles.previewCopy}>
              <Text style={styles.previewMeta}>{item.meta}</Text>
              <Text style={styles.previewTitle}>{item.title}</Text>
              <Text style={styles.previewBody}>{item.body}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.ctaPanel}>
        <View style={styles.lockedButton} accessibilityRole="button" accessibilityState={{ disabled: true }}>
          <MaterialCommunityIcons name="lock-outline" size={18} color={theme.mutedSoft} />
          <Text style={styles.lockedButtonText}>{feature.lockedCta}</Text>
        </View>
        <PressableScale
          style={[styles.playableButton, { backgroundColor: accent }]}
          onPress={() => guardedRouter.push(feature.playableCta.route as never, { actionKey: `coming-soon:${feature.key}:playable` })}
          accessibilityRole="button"
          accessibilityLabel={feature.playableCta.label}
        >
          <MaterialCommunityIcons name={feature.playableCta.icon as never} size={18} color={theme.arcadeCtaText} />
          <Text style={styles.playableButtonText}>{feature.playableCta.label}</Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color={theme.arcadeCtaText} />
        </PressableScale>
      </View>
    </ScrollView>
  )
}

function getToneColor(theme: SportPalette, tone: ComingSoonTone): string {
  if (tone === 'trust') return theme.trust
  if (tone === 'blue') return theme.blue
  if (tone === 'economy') return theme.economy
  if (tone === 'risk') return theme.risk
  return theme.orange
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.arenaBg },
    container: {
      paddingHorizontal: 20,
      paddingTop: 34,
      paddingBottom: 120,
      gap: Spacing.md,
    },
    hero: {
      borderRadius: 30,
      borderWidth: 2,
      borderColor: theme.arcadeCabinetEdge,
      backgroundColor: theme.arcadePanel,
      padding: 16,
      gap: 14,
      overflow: 'hidden',
    },
    backButton: {
      width: 42,
      height: 42,
      borderRadius: Radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.arcadeCabinet,
    },
    heroIcon: {
      width: 72,
      height: 72,
      borderRadius: 24,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroCopy: { gap: 6 },
    kicker: {
      fontSize: 10,
      lineHeight: 13,
      fontWeight: '900',
      letterSpacing: 0,
    },
    title: {
      color: theme.ink,
      fontSize: 32,
      lineHeight: 36,
      fontWeight: '900',
      letterSpacing: 0,
    },
    body: {
      color: theme.muted,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '800',
    },
    badge: {
      alignSelf: 'flex-start',
      minHeight: 34,
      borderRadius: Radius.pill,
      borderWidth: 1.5,
      borderColor: theme.arcadeCabinetEdge,
      backgroundColor: theme.arcadePanelAlt,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    badgeDot: { width: 8, height: 8, borderRadius: 4 },
    badgeText: {
      color: theme.ink,
      fontSize: 11,
      lineHeight: 13,
      fontWeight: '900',
      letterSpacing: 0,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      minHeight: 32,
      borderRadius: Radius.pill,
      borderWidth: 1.5,
      paddingHorizontal: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipText: {
      fontSize: 10,
      lineHeight: 12,
      fontWeight: '900',
      letterSpacing: 0,
    },
    previewList: { gap: 10 },
    previewRow: {
      borderRadius: Radius.xl,
      borderWidth: 2,
      borderColor: theme.arcadeCabinetEdge,
      backgroundColor: theme.arcadePanel,
      padding: 14,
      flexDirection: 'row',
      gap: 12,
    },
    previewIcon: {
      width: 42,
      height: 42,
      borderRadius: Radius.lg,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewCopy: { flex: 1, minWidth: 0, gap: 3 },
    previewMeta: {
      color: theme.mutedSoft,
      fontSize: 10,
      lineHeight: 12,
      fontWeight: '900',
      letterSpacing: 0,
    },
    previewTitle: {
      color: theme.ink,
      fontSize: 15,
      lineHeight: 19,
      fontWeight: '900',
    },
    previewBody: {
      color: theme.muted,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: '800',
    },
    ctaPanel: {
      borderRadius: Radius.xxl,
      borderWidth: 2,
      borderColor: theme.arcadeCabinetEdge,
      backgroundColor: theme.arcadePanel,
      padding: 14,
      gap: 10,
    },
    lockedButton: {
      minHeight: 48,
      borderRadius: Radius.lg,
      borderWidth: 1.5,
      borderColor: theme.lineStrong,
      backgroundColor: theme.surfaceStrong,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      opacity: 0.72,
    },
    lockedButtonText: {
      color: theme.muted,
      fontSize: 14,
      fontWeight: '900',
      letterSpacing: 0,
    },
    playableButton: {
      minHeight: 48,
      borderRadius: Radius.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    playableButtonText: {
      color: theme.arcadeCtaText,
      fontSize: 14,
      fontWeight: '900',
      letterSpacing: 0,
    },
  })
}
