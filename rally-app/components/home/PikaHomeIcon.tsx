import { Image, type ImageStyle, type StyleProp } from 'react-native'

import { HOME_ICON_ASSETS, type GeneratedHomeIconName } from '@/components/home/homeIconAssets.generated'

export type PikaHomeIconName = GeneratedHomeIconName

type PikaHomeIconProps = {
  name: PikaHomeIconName
  size?: number
  style?: StyleProp<ImageStyle>
}

export function PikaHomeIcon({ name, size = 24, style }: PikaHomeIconProps) {
  return (
    <Image
      accessibilityIgnoresInvertColors
      resizeMode="contain"
      source={HOME_ICON_ASSETS[name]}
      style={[{ width: size, height: size }, style]}
    />
  )
}
