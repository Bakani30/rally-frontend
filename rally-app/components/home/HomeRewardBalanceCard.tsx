import { useEffect, useRef, useState } from 'react'
import { ImageBackground, StyleSheet, Text, View } from 'react-native'

import { HomeShadowFrame } from '@/components/home/HomeShadowFrame'
import { PressableScale } from '@/components/motion/PressableScale'
import { Fonts, Radius, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useI18n } from '@/hooks/useI18n'
import { homeDictionary } from '@/lib/i18n/dictionaries/home'

type HomeRewardBalanceCardProps = {
  points: number
  pointsDelta?: number | null
  onPress: () => void
}

const rewardBalanceBackground = require('../../assets/images/home-reward-vault-bg.jpg')
const POINT_ROLL_DURATION_MS = 650

export function HomeRewardBalanceCard({ points, pointsDelta, onPress }: HomeRewardBalanceCardProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { t } = useI18n(homeDictionary)
  const normalizedPoints = normalizePoints(points)
  const [displayedPoints, setDisplayedPoints] = useState(normalizedPoints)
  const displayedPointsRef = useRef(normalizedPoints)
  const animationFrameRef = useRef<number | null>(null)
  const hasDelta = typeof pointsDelta === 'number' && pointsDelta !== 0
  const isGain = !!pointsDelta && pointsDelta > 0
  const deltaLabel = isGain ? t('pointsUp') : t('pointsDown')
  const deltaValue = pointsDelta ? Math.abs(pointsDelta).toLocaleString() : ''

  useEffect(() => {
    const target = normalizePoints(points)
    const start = displayedPointsRef.current
    if (start === target) return

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    let startedAt: number | null = null
    const tick = (timestamp: number) => {
      startedAt ??= timestamp
      const elapsed = timestamp - startedAt
      const progress = Math.min(1, elapsed / POINT_ROLL_DURATION_MS)
      const eased = 1 - Math.pow(1 - progress, 3)
      const nextValue = Math.round(start + (target - start) * eased)
      displayedPointsRef.current = nextValue
      setDisplayedPoints(nextValue)

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(tick)
        return
      }

      displayedPointsRef.current = target
      setDisplayedPoints(target)
      animationFrameRef.current = null
    }

    animationFrameRef.current = requestAnimationFrame(tick)

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [points])

  return (
    <HomeShadowFrame radius={26} offset={{ width: 6, height: 8 }}>
      <PressableScale
        style={styles.card}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={
          hasDelta
            ? t(isGain ? 'openRewardBalanceIncreased' : 'openRewardBalanceDecreased', {
                amount: Math.abs(pointsDelta ?? 0).toLocaleString(),
              })
            : t('openRewardBalancePlain')
        }
      >
        <ImageBackground
          source={rewardBalanceBackground}
          resizeMode="cover"
          style={styles.background}
          imageStyle={styles.backgroundImage}
        >
          <View pointerEvents="none" style={styles.scrim} />
          <View style={styles.content}>
            <View style={[styles.copy, hasDelta && styles.copyWithDelta]}>
              <View style={styles.kickerRow}>
                <Text style={styles.kicker}>{t('rallyVaultKicker')}</Text>
                <Text style={styles.availableLabel}>{t('availableToUse')}</Text>
              </View>
              <View style={styles.valueRow}>
                <Text style={styles.value} numberOfLines={1}>
                  {displayedPoints.toLocaleString()}
                </Text>
                <Text style={styles.unit}>PTS</Text>
              </View>
            </View>
          </View>

          {hasDelta && (
            <View style={[styles.deltaPill, isGain ? styles.deltaPillGain : styles.deltaPillLoss]}>
              <Text style={[styles.deltaLabel, isGain ? styles.deltaTextGain : styles.deltaTextLoss]}>{deltaLabel}</Text>
              <Text style={[styles.deltaValue, isGain ? styles.deltaTextGain : styles.deltaTextLoss]}>{deltaValue}</Text>
            </View>
          )}
        </ImageBackground>
      </PressableScale>
    </HomeShadowFrame>
  )
}

function normalizePoints(points: number): number {
  if (!Number.isFinite(points)) return 0
  return Math.max(0, Math.round(points))
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    card: {
      minHeight: 106,
      borderRadius: 26,
      backgroundColor: theme.arcadeCabinet,
      overflow: 'hidden',
    },
    background: {
      minHeight: 106,
      paddingHorizontal: 18,
      paddingVertical: 16,
      justifyContent: 'center',
    },
    backgroundImage: {
      borderRadius: 26,
    },
    scrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(13,13,13,0.18)',
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
    },
    copy: {
      minWidth: 0,
      flex: 1,
      gap: 7,
    },
    copyWithDelta: {
      paddingRight: 86,
    },
    kickerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      minWidth: 0,
    },
    kicker: {
      color: theme.fightInkSoft,
      fontSize: 11,
      lineHeight: 13,
      fontWeight: '900',
      letterSpacing: 0,
    },
    availableLabel: {
      color: theme.economy,
      fontSize: 9,
      lineHeight: 11,
      fontWeight: '900',
      letterSpacing: 0,
    },
    valueRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 10,
      minWidth: 0,
    },
    value: {
      color: theme.fightInk,
      fontSize: 48,
      lineHeight: 50,
      fontWeight: '900',
      letterSpacing: 0,
      fontVariant: ['tabular-nums'],
      fontFamily: Fonts?.number,
      minWidth: 94,
    },
    unit: {
      color: theme.economy,
      fontSize: 13,
      lineHeight: 22,
      fontWeight: '900',
      letterSpacing: 0,
    },
    deltaPill: {
      position: 'absolute',
      right: 18,
      bottom: 12,
      minWidth: 74,
      minHeight: 36,
      borderRadius: Radius.md,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'flex-end',
      paddingHorizontal: 9,
      paddingVertical: 5,
      gap: 1,
    },
    deltaPillGain: {
      borderColor: theme.trust,
      backgroundColor: theme.trustSoft,
    },
    deltaPillLoss: {
      borderColor: theme.risk,
      backgroundColor: theme.riskSoft,
    },
    deltaLabel: {
      fontSize: 9,
      lineHeight: 11,
      fontWeight: '900',
      letterSpacing: 0,
    },
    deltaValue: {
      fontSize: 15,
      lineHeight: 18,
      fontWeight: '900',
      letterSpacing: 0,
      fontVariant: ['tabular-nums'],
      fontFamily: Fonts?.number,
    },
    deltaTextGain: { color: theme.trust },
    deltaTextLoss: { color: theme.risk },
  })
}
