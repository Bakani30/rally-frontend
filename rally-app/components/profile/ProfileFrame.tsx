import { ReactNode, useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'
import { SvgXml } from 'react-native-svg'
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { useSportTheme } from '@/hooks/useAppTheme'
import {
  getProfileFrameDefinition,
  type ProfileFrameLayer,
} from '@/components/profile/profileFrameRegistry'
import { computeRankFrameLayerSize } from '@/lib/ranks/rankFrameSvg'

// Screen edge of a single frame layer given the avatar size.
function resolveLayerSize(layer: ProfileFrameLayer, avatarSize: number): number {
  return layer.fitInnerToAvatar
    ? computeRankFrameLayerSize(avatarSize)
    : avatarSize + layer.sizeOffset
}

type ProfileFrameProps = {
  frameAssetRef: string | null
  size?: number
  children: ReactNode
}

type AnimatedFrameLayerProps = {
  layer: ProfileFrameLayer
  avatarSize: number
  reduceMotion: boolean
}

export function ProfileFrame({ frameAssetRef, size = 88, children }: ProfileFrameProps) {
  const theme = useSportTheme()
  const frame = getProfileFrameDefinition(frameAssetRef)
  const reduceMotion = useReducedMotion()

  // Wrap must contain the widest layer (rank rings extend past framePadding).
  const maxLayer = frame.layers.reduce(
    (max, layer) => Math.max(max, resolveLayerSize(layer, size)),
    size + frame.framePadding * 2,
  )
  const wrapSize = maxLayer

  const belowLayers = frame.layers.filter((layer) => !layer.aboveAvatar)
  const aboveLayers = frame.layers.filter((layer) => layer.aboveAvatar)

  return (
    <View style={[styles.wrap, { width: wrapSize, height: wrapSize }]}>
      {belowLayers.map((layer) => (
        <AnimatedFrameLayer
          key={layer.id}
          layer={layer}
          avatarSize={size}
          reduceMotion={reduceMotion}
        />
      ))}
      <View
        style={[
          styles.avatarShell,
          { backgroundColor: theme.bgElevated },
          { width: size, height: size, borderRadius: size / 2 },
          frame.avatarStyle,
        ]}
      >
        {children}
      </View>
      {aboveLayers.map((layer) => (
        <AnimatedFrameLayer
          key={layer.id}
          layer={layer}
          avatarSize={size}
          reduceMotion={reduceMotion}
        />
      ))}
    </View>
  )
}

function AnimatedFrameLayer({ layer, avatarSize, reduceMotion }: AnimatedFrameLayerProps) {
  const progress = useSharedValue(0)

  useEffect(() => {
    cancelAnimation(progress)

    if (!layer.animation || reduceMotion) {
      progress.value = 0
      return
    }

    const duration = layer.animation.durationMs ?? 1600

    if (layer.animation.kind === 'spin') {
      progress.value = withRepeat(
        withTiming(1, { duration, easing: Easing.linear }),
        -1,
        false,
      )
      return () => cancelAnimation(progress)
    }

    progress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: duration / 2, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: duration / 2, easing: Easing.in(Easing.quad) }),
      ),
      -1,
      false,
    )

    return () => cancelAnimation(progress)
  }, [layer.animation, progress, reduceMotion])

  const animatedStyle = useAnimatedStyle(() => {
    const animation = layer.animation
    if (!animation || reduceMotion) {
      return {}
    }

    if (animation.kind === 'spin') {
      const direction = animation.direction === 'ccw' ? -1 : 1
      return {
        opacity: animation.opacity ?? 1,
        transform: [{ rotate: `${progress.value * 360 * direction}deg` }],
      }
    }

    const minOpacity = animation.minOpacity ?? 0.18
    const maxOpacity = animation.maxOpacity ?? 0.42

    if (animation.kind === 'breathe') {
      return {
        opacity: minOpacity + (maxOpacity - minOpacity) * progress.value,
      }
    }

    const minScale = animation.minScale ?? 0.96
    const maxScale = animation.maxScale ?? 1.06

    return {
      opacity: minOpacity + (maxOpacity - minOpacity) * progress.value,
      transform: [{ scale: minScale + (maxScale - minScale) * progress.value }],
    }
  })

  const layerSize = resolveLayerSize(layer, avatarSize)

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.layer,
        { width: layerSize, height: layerSize, borderRadius: layerSize / 2 },
        layer.style,
        animatedStyle,
      ]}
    >
      {layer.svgXml ? (
        <SvgXml xml={layer.svgXml} width={layerSize} height={layerSize} />
      ) : layer.source ? (
        <Image
          source={layer.source}
          style={StyleSheet.absoluteFill}
          contentFit={layer.contentFit ?? 'contain'}
        />
      ) : null}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  layer: { position: 'absolute' },
  avatarShell: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
})
