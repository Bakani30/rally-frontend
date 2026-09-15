import { StyleSheet, type StyleProp } from 'react-native'
import { Image, type ImageStyle } from 'expo-image'

const mascotSource = require('../../assets/images/rally-mascot.png')

type RallyMascotProps = {
  size?: number
  style?: StyleProp<ImageStyle>
}

export function RallyMascot({ size = 128, style }: RallyMascotProps) {
  return (
    <Image
      source={mascotSource}
      style={[styles.image, { width: size, height: size }, style]}
      contentFit="contain"
      accessibilityLabel="Rally mascot"
    />
  )
}

const styles = StyleSheet.create({
  image: {
    flexShrink: 0,
  },
})
