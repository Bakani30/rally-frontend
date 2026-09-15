import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ImageBackground,
  InteractionManager,
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
import { useReducedMotion } from 'react-native-reanimated'

import { PulseDot } from '@/components/motion/PulseDot'
import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme, useThemeMode } from '@/hooks/useAppTheme'
import { useI18n } from '@/hooks/useI18n'
import { homeDictionary } from '@/lib/i18n/dictionaries/home'

const AUTO_SCROLL_DELAY_MS = 5000
const BANNER_RADIUS = 15

export type HomeArenaHeroSlide = {
  id: string
  kicker: string
  title: string
  body: string
  icon: keyof typeof MaterialCommunityIcons.glyphMap
  imageSource: ImageSourcePropType
  darkImageSource?: ImageSourcePropType
  tone: 'orange' | 'green' | 'blue'
  live?: boolean
  visualOnly?: boolean
}

type HomeArenaHeroProps = {
  slides: HomeArenaHeroSlide[]
  onPressSlide?: (slide: HomeArenaHeroSlide) => void
}

export function HomeArenaHero({ slides, onPressSlide }: HomeArenaHeroProps) {
  const theme = useSportTheme()
  const isDark = useThemeMode() === 'dark'
  const styles = createStyles(theme)
  const { t } = useI18n(homeDictionary)
  const reduceMotion = useReducedMotion()
  const { width } = useWindowDimensions()
  const cardWidth = Math.max(280, width - 50)
  const snapInterval = cardWidth + Spacing.sm
  const scrollRef = useRef<ScrollView | null>(null)
  const indexRef = useRef(0)
  const [activeIndex, setActiveIndex] = useState(0)
  const [renderAllSlides, setRenderAllSlides] = useState(false)
  const [userIsDragging, setUserIsDragging] = useState(false)
  const slideCount = slides.length
  const safeActiveIndex = Math.min(activeIndex, Math.max(slideCount - 1, 0))
  const visibleSlides = renderAllSlides ? slides : slides.slice(0, 1)

  const scrollToIndex = useCallback((index: number, animated: boolean) => {
    indexRef.current = index
    setActiveIndex(index)
    scrollRef.current?.scrollTo({ x: index * snapInterval, animated })
  }, [snapInterval])

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setRenderAllSlides(true)
    })

    return () => task.cancel()
  }, [])

  useEffect(() => {
    if (reduceMotion || slideCount <= 1 || userIsDragging) return

    const interval = setInterval(() => {
      scrollToIndex((indexRef.current + 1) % slideCount, true)
    }, AUTO_SCROLL_DELAY_MS)

    return () => clearInterval(interval)
  }, [reduceMotion, scrollToIndex, slideCount, userIsDragging])

  function handleMomentumEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / snapInterval)
    const boundedIndex = Math.max(0, Math.min(slideCount - 1, nextIndex))
    const targetOffset = boundedIndex * snapInterval
    indexRef.current = boundedIndex
    setActiveIndex(boundedIndex)
    if (Math.abs(event.nativeEvent.contentOffset.x - targetOffset) > 1) {
      scrollRef.current?.scrollTo({ x: targetOffset, animated: false })
    }
    setUserIsDragging(false)
  }

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scrollRef}
        horizontal
        decelerationRate="fast"
        snapToOffsets={slides.map((_, index) => index * snapInterval)}
        snapToAlignment="start"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.track}
        onScrollBeginDrag={() => setUserIsDragging(true)}
        onMomentumScrollEnd={handleMomentumEnd}
      >
        {visibleSlides.map((slide) => {
          const accent = accentColor(theme, slide.tone)
          const showCopy = !slide.visualOnly
          const showBadge = !slide.visualOnly
          const actionable = !!onPressSlide
          return (
            <PressableScale
              key={slide.id}
              style={[styles.card, { width: cardWidth }]}
              onPress={actionable ? () => onPressSlide?.(slide) : undefined}
              disabled={!actionable}
              disabledOpacity={1}
              accessibilityRole={actionable ? 'button' : 'image'}
              accessibilityLabel={actionable ? t('openSlide', { title: slide.title }) : slide.title}
            >
              <ImageBackground
                source={isDark && slide.darkImageSource ? slide.darkImageSource : slide.imageSource}
                style={styles.image}
                imageStyle={styles.imageShape}
                resizeMode="cover"
              >
                {!slide.visualOnly && <View style={styles.scrim} />}
                {showBadge && (
                  <View style={[styles.statusBadge, { borderColor: accent, backgroundColor: `${accent}ed` }]}>
                    {slide.live && <PulseDot color={theme.chalk} size={7} active />}
                    <Text style={styles.statusText}>{slide.kicker}</Text>
                  </View>
                )}
                {showCopy && (
                  <View style={styles.copyPanel}>
                    <View style={[styles.iconPlate, { borderColor: accent, backgroundColor: `${accent}dd` }]}>
                      <MaterialCommunityIcons name={slide.icon} size={18} color={theme.chalk} />
                    </View>
                    <Text style={styles.slideTitle} numberOfLines={2} adjustsFontSizeToFit>
                      {slide.title}
                    </Text>
                    <Text style={styles.slideBody} numberOfLines={2}>
                      {slide.body}
                    </Text>
                  </View>
                )}
              </ImageBackground>
            </PressableScale>
          )
        })}
      </ScrollView>

      <View style={styles.dots}>
        {slides.map((slide, index) => (
          <View
            key={slide.id}
            style={[
              styles.dot,
              index === safeActiveIndex && styles.dotActive,
            ]}
          />
        ))}
      </View>
    </View>
  )
}

function accentColor(theme: SportPalette, tone: HomeArenaHeroSlide['tone']) {
  if (tone === 'green') return theme.trust
  if (tone === 'blue') return theme.blue
  return theme.orange
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    root: { gap: 8 },
    track: { gap: Spacing.sm, paddingHorizontal: 5 },
    card: {
      height: 160,
      borderRadius: BANNER_RADIUS,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.arcadeCabinet,
      overflow: 'hidden',
    },
    image: {
      flex: 1,
      width: '100%',
      height: '100%',
      overflow: 'hidden',
    },
    imageShape: {
      ...StyleSheet.absoluteFillObject,
      width: '100%',
      height: '100%',
      borderRadius: BANNER_RADIUS,
    },
    scrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(22,22,22,0.24)',
    },
    statusBadge: {
      position: 'absolute',
      top: 16,
      left: 16,
      minHeight: 34,
      borderRadius: Radius.pill,
      borderWidth: 1,
      paddingLeft: 11,
      paddingRight: 13,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },
    statusText: {
      color: theme.chalk,
      fontSize: 10,
      lineHeight: 12,
      fontWeight: '900',
      letterSpacing: 0,
    },
    copyPanel: {
      position: 'absolute',
      left: 16,
      right: 16,
      bottom: 18,
      gap: 6,
    },
    iconPlate: {
      width: 36,
      height: 36,
      borderRadius: Radius.lg,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    slideTitle: {
      color: theme.chalk,
      fontSize: 30,
      lineHeight: 33,
      fontWeight: '900',
      letterSpacing: 0,
      textShadowColor: 'rgba(0,0,0,0.28)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 8,
    },
    slideBody: {
      color: 'rgba(255,255,255,0.88)',
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '800',
      maxWidth: 260,
      textShadowColor: 'rgba(0,0,0,0.25)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 5,
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
      backgroundColor: theme.lineStrong,
      opacity: 0.58,
    },
    dotActive: {
      width: 18,
      backgroundColor: theme.ink,
      opacity: 1,
    },
  })
}
