import type { ReactNode } from 'react'
import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native'

type RankFrameProps = {
  children: ReactNode
  /** Tier color used by the placeholder ring. */
  color: string
  /** Diameter of the framed avatar. */
  size: number
  /**
   * Future cosmetic avatar-frame graphic. When provided it replaces the
   * placeholder ring, so a real frame asset can drop in later without touching
   * the row layout.
   */
  frameSource?: ImageSourcePropType
}

/** How far the frame extends beyond the avatar. */
const RING_GAP = 4

/**
 * Decorative frame slot around a profile avatar. For now it draws a light
 * tier-colored ring ("test" frame); pass `frameSource` to swap in a cosmetic
 * avatar-frame image in the future.
 */
export function RankFrame({ children, color, size, frameSource }: RankFrameProps) {
  const ring = size + RING_GAP * 2
  const offset = -RING_GAP

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      {children}
      <View
        pointerEvents="none"
        style={[styles.overlay, { width: ring, height: ring, top: offset, left: offset }]}
      >
        {frameSource ? (
          <Image source={frameSource} resizeMode="stretch" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.ring, { borderRadius: ring / 2, borderColor: color }]} />
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  overlay: { position: 'absolute' },
  ring: { borderWidth: 2 },
})
