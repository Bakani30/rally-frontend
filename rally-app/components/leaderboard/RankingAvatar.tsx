import { StyleSheet, Text, View, type ViewStyle } from 'react-native'
import { Image } from 'expo-image'

type Props = {
  photoUrl: string | null
  letter: string
  fallbackBg: string
  letterColor: string
  size: number
  borderColor?: string
  borderWidth?: number
  style?: ViewStyle
}

// Renders a profile photo when available, otherwise the colored letter avatar.
// Image is square-cropped via contentFit; size & border come from the caller
// so podium (large) and row (small) can share the same component.
export function RankingAvatar({
  photoUrl,
  letter,
  fallbackBg,
  letterColor,
  size,
  borderColor,
  borderWidth = 0,
  style,
}: Props) {
  const radius = size / 2
  const base: ViewStyle = {
    width: size,
    height: size,
    borderRadius: radius,
    borderWidth,
    borderColor,
    overflow: 'hidden',
  }

  if (photoUrl) {
    return (
      <View style={[styles.center, base, style]}>
        <Image
          source={{ uri: photoUrl }}
          style={{ width: size, height: size }}
          contentFit="cover"
        />
      </View>
    )
  }

  return (
    <View
      style={[styles.center, base, { backgroundColor: fallbackBg }, style]}
    >
      <Text
        style={[
          styles.letter,
          { color: letterColor, fontSize: Math.round(size * 0.42) },
        ]}
      >
        {letter}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  letter: { fontWeight: '900' },
})
