import { Image } from 'expo-image'
import { StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native'

import { courtAspect } from '@/lib/match/courtGeometry'

const BADMINTON_COURT = require('../../assets/images/courts/badminton-court.png')
const BASKETBALL_COURT = require('../../assets/images/courts/basketball-court-5v5.png')
const BASKETBALL_COURT_ZOOM_X = 1.08

export type SportCourtSurfaceProps = {
  activityType: 'basketball' | 'badminton'
  width?: number
  height?: number
  cropHeight?: number
  withShading?: boolean
  style?: StyleProp<ViewStyle>
}

/**
 * Shared court imagery and crop only. It owns no score, stake, consent,
 * roster, or position behavior.
 */
export function SportCourtSurface({
  activityType,
  width,
  height,
  cropHeight,
  withShading = false,
  style,
}: SportCourtSurfaceProps) {
  const { width: screenWidth } = useWindowDimensions()
  const imageWidth = width ?? screenWidth
  const fullHeight = height ?? imageWidth * courtAspect(activityType === 'basketball' ? 'full' : 'half')
  const visibleHeight = cropHeight ?? fullHeight
  const cropOffset = Math.max(0, (fullHeight - visibleHeight) / 2)

  return (
    <View style={[StyleSheet.absoluteFillObject, { overflow: 'hidden' }, style]} pointerEvents="none">
      {activityType === 'basketball' ? (
        <View style={{ position: 'absolute', top: -cropOffset, alignSelf: 'center', width: imageWidth, height: fullHeight }}>
          <Image
            source={BASKETBALL_COURT}
            style={{ width: imageWidth, height: fullHeight, transform: [{ scaleX: BASKETBALL_COURT_ZOOM_X }] }}
            contentFit="cover"
          />
        </View>
      ) : (
        <Image
          source={BADMINTON_COURT}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          contentPosition="center"
        />
      )}
      {withShading ? (
        <>
          <View style={styles.dimLayer} />
          {activityType === 'badminton' ? <View style={styles.topShade} /> : null}
          {activityType === 'badminton' ? <View style={styles.bottomShade} /> : null}
        </>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  dimLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  topShade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 82,
    backgroundColor: 'transparent',
  },
  bottomShade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 118,
    backgroundColor: 'transparent',
  },
})
