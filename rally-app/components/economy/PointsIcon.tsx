import { Image, type ImageStyle } from 'expo-image'
import type { StyleProp } from 'react-native'

const pointsIconSource = require('../../assets/images/brand/rally-points-star.png')

type PointsIconProps = {
  size?: number
  style?: StyleProp<ImageStyle>
  accessibilityLabel?: string
}

export function PointsIcon({ size = 20, style, accessibilityLabel }: PointsIconProps) {
  return (
    <Image
      source={pointsIconSource}
      style={[{ width: size, height: size }, style]}
      contentFit="contain"
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
    />
  )
}
