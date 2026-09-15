import { useEffect, useRef, useState } from 'react'
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native'
import { ChallengeFeaturedHero } from '@/components/challenges/ChallengeFeaturedHero'
import { Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import type { CampaignSummary } from '@/types/campaign'

const AUTO_SCROLL_DELAY_MS = 4500

type ChallengeHeroCarouselProps = {
  campaigns: CampaignSummary[]
  onOpen: (campaignId: string, slug: string) => void
}

/** Swipeable, snapping, auto-rotating sponsor-banner carousel with page dots. */
export function ChallengeHeroCarousel({ campaigns, onOpen }: ChallengeHeroCarouselProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { width } = useWindowDimensions()
  const cardWidth = Math.max(280, width - 32)
  const snapInterval = cardWidth + Spacing.sm
  const scrollRef = useRef<ScrollView | null>(null)
  const indexRef = useRef(0)
  const [activeIndex, setActiveIndex] = useState(0)
  const [autoScrollResetKey, setAutoScrollResetKey] = useState(0)

  useEffect(() => {
    if (campaigns.length <= 1) return
    const timer = setTimeout(() => {
      const nextIndex = (indexRef.current + 1) % campaigns.length
      indexRef.current = nextIndex
      setActiveIndex(nextIndex)
      scrollRef.current?.scrollTo({ x: nextIndex * snapInterval, animated: true })
    }, AUTO_SCROLL_DELAY_MS)
    return () => clearTimeout(timer)
  }, [activeIndex, autoScrollResetKey, snapInterval, campaigns.length])

  function resetAutoScrollClock() {
    setAutoScrollResetKey((key) => key + 1)
  }

  function handleMomentumEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / snapInterval)
    const boundedIndex = Math.max(0, Math.min(campaigns.length - 1, nextIndex))
    indexRef.current = boundedIndex
    setActiveIndex(boundedIndex)
    resetAutoScrollClock()
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
      >
        {campaigns.map((campaign) => (
          <ChallengeFeaturedHero
            key={campaign.id}
            campaign={campaign}
            width={cardWidth}
            onPress={() => onOpen(campaign.id, campaign.slug)}
          />
        ))}
      </ScrollView>

      {campaigns.length > 1 && (
        <View style={styles.dots}>
          {campaigns.map((campaign, index) => (
            <View key={campaign.id} style={[styles.dot, index === activeIndex && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    root: { gap: 8 },
    track: { gap: Spacing.sm },
    dots: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6 },
    dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: theme.muted, opacity: 0.5 },
    dotActive: { width: 18, opacity: 1, backgroundColor: theme.orange },
  })
}
