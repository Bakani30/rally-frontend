import { useEffect, useRef, useState } from 'react'
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { useReducedMotion } from 'react-native-reanimated'

import { PressableScale } from '@/components/motion/PressableScale'
import { getNextCampaignIndex } from '@/components/gifts/redeemCatalog'
import { Fonts, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useI18n } from '@/hooks/useI18n'
import { giftsDictionary } from '@/lib/i18n/dictionaries/gifts'

const AUTO_SCROLL_DELAY_MS = 4800

type CampaignAction = 'gifts' | 'events'

type CampaignSlide = {
  id: string
  action: CampaignAction
  image: number
  sampleKey: 'campaignSample' | 'activitySample'
  brandKey: 'campaignBrand' | 'activityBrand'
  titleKey: 'campaignTitle' | 'activityTitle'
  bodyKey: 'campaignBody' | 'activityBody'
  ctaKey: 'campaignCta' | 'activityCta'
}

const CAMPAIGN_SLIDES: CampaignSlide[] = [
  {
    id: 'nova-stride',
    action: 'gifts',
    image: require('../../assets/images/redeem/nova-stride-banner.jpg'),
    sampleKey: 'campaignSample',
    brandKey: 'campaignBrand',
    titleKey: 'campaignTitle',
    bodyKey: 'campaignBody',
    ctaKey: 'campaignCta',
  },
  {
    id: 'night-run',
    action: 'events',
    image: require('../../assets/images/redeem/rally-night-run-banner.jpg'),
    sampleKey: 'activitySample',
    brandKey: 'activityBrand',
    titleKey: 'activityTitle',
    bodyKey: 'activityBody',
    ctaKey: 'activityCta',
  },
]

type RedeemCampaignBannerProps = {
  onOpenGifts: () => void
  onOpenEvents: () => void
}

export function RedeemCampaignBanner({
  onOpenGifts,
  onOpenEvents,
}: RedeemCampaignBannerProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { t } = useI18n(giftsDictionary)
  const { width } = useWindowDimensions()
  const reduceMotion = useReducedMotion()
  const cardWidth = Math.max(280, width - (Spacing.xl * 2))
  const snapInterval = cardWidth + Spacing.sm
  const scrollRef = useRef<ScrollView | null>(null)
  const indexRef = useRef(0)
  const [activeIndex, setActiveIndex] = useState(0)
  const [autoScrollResetKey, setAutoScrollResetKey] = useState(0)

  useEffect(() => {
    if (reduceMotion || CAMPAIGN_SLIDES.length <= 1) return

    const timer = setTimeout(() => {
      const nextIndex = getNextCampaignIndex(indexRef.current, CAMPAIGN_SLIDES.length)
      indexRef.current = nextIndex
      setActiveIndex(nextIndex)
      scrollRef.current?.scrollTo({ x: nextIndex * snapInterval, animated: true })
    }, AUTO_SCROLL_DELAY_MS)

    return () => clearTimeout(timer)
  }, [activeIndex, autoScrollResetKey, reduceMotion, snapInterval])

  function resetAutoScrollClock() {
    setAutoScrollResetKey((key) => key + 1)
  }

  function handleMomentumEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / snapInterval)
    const boundedIndex = Math.max(0, Math.min(CAMPAIGN_SLIDES.length - 1, nextIndex))
    indexRef.current = boundedIndex
    setActiveIndex(boundedIndex)
    resetAutoScrollClock()
  }

  function handlePress(action: CampaignAction) {
    if (action === 'gifts') {
      onOpenGifts()
      return
    }
    onOpenEvents()
  }

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scrollRef}
        horizontal
        decelerationRate="fast"
        snapToInterval={snapInterval}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.track}
        onScrollBeginDrag={resetAutoScrollClock}
        onMomentumScrollEnd={handleMomentumEnd}
        accessibilityLabel={t('campaignCarouselLabel')}
      >
        {CAMPAIGN_SLIDES.map((slide) => (
          <PressableScale
            key={slide.id}
            style={[styles.card, { width: cardWidth }]}
            onPress={() => handlePress(slide.action)}
            accessibilityRole="button"
            accessibilityLabel={`${t(slide.sampleKey)}, ${t(slide.titleKey)}, ${t(slide.ctaKey)}`}
          >
            <Image source={slide.image} style={styles.image} contentFit="cover" transition={180} accessible={false} />
            <View style={styles.copy}>
              <View style={styles.samplePill}>
                <View style={styles.sampleDot} />
                <Text style={styles.sampleText} maxFontSizeMultiplier={1.2}>{t(slide.sampleKey)}</Text>
              </View>
              <View style={styles.titleGroup}>
                <Text style={styles.brand} maxFontSizeMultiplier={1.2}>{t(slide.brandKey)}</Text>
                <Text style={styles.title} numberOfLines={2} maxFontSizeMultiplier={1.15}>{t(slide.titleKey)}</Text>
                <Text style={styles.body} numberOfLines={1} maxFontSizeMultiplier={1.2}>{t(slide.bodyKey)}</Text>
              </View>
              <View style={styles.cta}>
                <Text style={styles.ctaText} maxFontSizeMultiplier={1.2}>{t(slide.ctaKey)}</Text>
                <MaterialCommunityIcons name="arrow-right" size={15} color={theme.chalk} />
              </View>
            </View>
          </PressableScale>
        ))}
      </ScrollView>

      <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {CAMPAIGN_SLIDES.map((slide, index) => (
          <View key={slide.id} style={[styles.dot, index === activeIndex && styles.dotActive]} />
        ))}
      </View>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    root: { gap: 7 },
    track: { gap: Spacing.sm },
    card: {
      height: 170,
      overflow: 'hidden',
      borderRadius: Radius.xxl,
      borderWidth: 1,
      borderColor: theme.lineStrong,
      backgroundColor: theme.fightBg,
      ...Platform.select({ web: { boxShadow: theme.shadowSoft }, default: { elevation: 3 } }),
    },
    image: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
    copy: { width: '58%', height: '100%', justifyContent: 'space-between', alignItems: 'flex-start', padding: Spacing.md },
    samplePill: { minHeight: 25, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: Radius.pill, backgroundColor: theme.fightPanel, paddingHorizontal: 8, paddingVertical: 4 },
    sampleDot: { width: 6, height: 6, borderRadius: Radius.pill, backgroundColor: theme.orange },
    sampleText: { color: theme.fightInkSoft, fontSize: 8, lineHeight: 11, fontWeight: '900' },
    titleGroup: { gap: 1 },
    brand: { color: theme.orange, fontSize: 9, lineHeight: 12, fontWeight: '900', fontFamily: Fonts.rounded, letterSpacing: 1.1 },
    title: { color: theme.fightInk, fontSize: 20, lineHeight: 23, fontWeight: '900' },
    body: { color: theme.fightInkSoft, fontSize: 10, lineHeight: 14, fontWeight: '700' },
    cta: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: Radius.pill, backgroundColor: theme.orange, paddingHorizontal: 11 },
    ctaText: { color: theme.chalk, fontSize: 10, lineHeight: 14, fontWeight: '900' },
    dots: { minHeight: 8, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6 },
    dot: { width: 6, height: 6, borderRadius: Radius.pill, backgroundColor: theme.mutedSoft, opacity: 0.5 },
    dotActive: { width: 18, backgroundColor: theme.orange, opacity: 1 },
  })
}
