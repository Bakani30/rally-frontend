import { useEffect, useRef, useState } from 'react'
import {
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ImageSourcePropType,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { HomeShadowFrame } from '@/components/home/HomeShadowFrame'
import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useI18n } from '@/hooks/useI18n'
import { homeDictionary } from '@/lib/i18n/dictionaries/home'

type PromoAction = 'lobbies' | 'redeem' | 'quests'

type PromoCard = {
  id: string
  kickerKey: 'promoArenaKicker' | 'promoRewardKicker' | 'promoQuestKicker'
  titleKey: 'promoArenaTitle' | 'promoRewardTitle' | 'promoQuestTitle'
  bodyKey: 'promoArenaBody' | 'promoRewardBody' | 'promoQuestBody'
  icon: keyof typeof MaterialCommunityIcons.glyphMap
  imageSource: ImageSourcePropType
  tone: 'orange' | 'green' | 'blue'
  action: PromoAction
}

type HomePromoCarouselProps = {
  onOpenLobbies: () => void
  onOpenRedeem: () => void
  onOpenQuests: () => void
}

const PROMOS: PromoCard[] = [
  {
    id: 'arena-live',
    kickerKey: 'promoArenaKicker',
    titleKey: 'promoArenaTitle',
    bodyKey: 'promoArenaBody',
    icon: 'stadium',
    imageSource: require('../../assets/images/rally-mascot.png'),
    tone: 'orange',
    action: 'lobbies',
  },
  {
    id: 'court-voucher',
    kickerKey: 'promoRewardKicker',
    titleKey: 'promoRewardTitle',
    bodyKey: 'promoRewardBody',
    icon: 'tag-outline',
    imageSource: require('../../assets/images/courts/basketball-court-3v3.png'),
    tone: 'green',
    action: 'redeem',
  },
  {
    id: 'solo-lane',
    kickerKey: 'promoQuestKicker',
    titleKey: 'promoQuestTitle',
    bodyKey: 'promoQuestBody',
    icon: 'clipboard-text-outline',
    imageSource: require('../../assets/images/courts/basketball-court-5v5.png'),
    tone: 'blue',
    action: 'quests',
  },
]

const AUTO_SCROLL_DELAY_MS = 4500

export function HomePromoCarousel({
  onOpenLobbies,
  onOpenRedeem,
  onOpenQuests,
}: HomePromoCarouselProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { t } = useI18n(homeDictionary)
  const { width } = useWindowDimensions()
  const cardWidth = Math.max(280, width - 40)
  const snapInterval = cardWidth + Spacing.sm
  const scrollRef = useRef<ScrollView | null>(null)
  const indexRef = useRef(0)
  const [activeIndex, setActiveIndex] = useState(0)
  const [autoScrollResetKey, setAutoScrollResetKey] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      const nextIndex = (indexRef.current + 1) % PROMOS.length
      indexRef.current = nextIndex
      setActiveIndex(nextIndex)
      scrollRef.current?.scrollTo({ x: nextIndex * snapInterval, animated: true })
    }, AUTO_SCROLL_DELAY_MS)

    return () => clearTimeout(timer)
  }, [activeIndex, autoScrollResetKey, snapInterval])

  function resetAutoScrollClock() {
    setAutoScrollResetKey((key) => key + 1)
  }

  function handleMomentumEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / snapInterval)
    const boundedIndex = Math.max(0, Math.min(PROMOS.length - 1, nextIndex))
    indexRef.current = boundedIndex
    setActiveIndex(boundedIndex)
    resetAutoScrollClock()
  }

  function handlePromoPress(action: PromoAction) {
    if (action === 'lobbies') {
      onOpenLobbies()
      return
    }
    if (action === 'redeem') {
      onOpenRedeem()
      return
    }
    onOpenQuests()
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
        onScrollEndDrag={resetAutoScrollClock}
        onMomentumScrollEnd={handleMomentumEnd}
      >
        {PROMOS.map((promo) => {
          const color = accentColor(theme, promo.tone)
          const title = t(promo.titleKey)
          return (
            <HomeShadowFrame key={promo.id} radius={24} offset={{ width: 6, height: 8 }}>
              <PressableScale
                style={[styles.card, { width: cardWidth, borderColor: color }]}
                onPress={() => handlePromoPress(promo.action)}
                accessibilityRole="button"
                accessibilityLabel={title}
              >
                <Image source={promo.imageSource} style={styles.image} resizeMode="cover" />
                <View style={styles.scrim} />
                <View style={styles.copy}>
                  <View style={[styles.badge, { backgroundColor: color }]}>
                    <MaterialCommunityIcons name={promo.icon} size={17} color={theme.chalk} />
                    <Text style={styles.badgeText}>{t(promo.kickerKey)}</Text>
                  </View>
                  <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
                    {title}
                  </Text>
                  <Text style={styles.body} numberOfLines={2}>
                    {t(promo.bodyKey)}
                  </Text>
                </View>
              </PressableScale>
            </HomeShadowFrame>
          )
        })}
      </ScrollView>

      <View style={styles.dots}>
        {PROMOS.map((promo, index) => (
          <View
            key={promo.id}
            style={[
              styles.dot,
              index === activeIndex && {
                width: 18,
                opacity: 1,
              },
            ]}
          />
        ))}
      </View>
    </View>
  )
}

function accentColor(theme: SportPalette, tone: PromoCard['tone']) {
  if (tone === 'green') return theme.trust
  if (tone === 'blue') return theme.blue
  return theme.orange
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    root: { gap: 8 },
    track: { gap: Spacing.sm },
    card: {
      height: 178,
      borderRadius: 24,
      borderWidth: 1,
      backgroundColor: theme.arcadeCabinet,
      overflow: 'hidden',
      justifyContent: 'flex-end',
    },
    image: {
      ...StyleSheet.absoluteFillObject,
      width: '100%',
      height: '100%',
    },
    scrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(22,22,22,0.36)',
    },
    copy: {
      padding: 14,
      gap: 7,
    },
    badge: {
      alignSelf: 'flex-start',
      minHeight: 30,
      borderRadius: Radius.pill,
      paddingHorizontal: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.5)',
    },
    badgeText: {
      color: theme.chalk,
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 0.9,
    },
    title: {
      color: theme.chalk,
      fontSize: 27,
      lineHeight: 31,
      fontWeight: '900',
      letterSpacing: 0,
    },
    body: {
      maxWidth: 280,
      color: 'rgba(255,255,255,0.88)',
      fontSize: 12,
      lineHeight: 17,
      fontWeight: '800',
    },
    dots: {
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: theme.arcadePanel,
      opacity: 0.58,
    },
  })
}
