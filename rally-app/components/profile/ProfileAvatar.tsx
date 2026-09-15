import { Image } from 'expo-image'
import { StyleSheet, Text } from 'react-native'
import { Fonts, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'

type Props = {
  avatarUrl: string | null | undefined
  initials: string
  size?: number
}

export function ProfileAvatar({ avatarUrl, initials, size = 88 }: Props) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={{ width: size, height: size }}
        contentFit="cover"
        transition={150}
      />
    )
  }
  return <Text style={styles.initials}>{initials}</Text>
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    initials: {
      color: theme.ink,
      fontSize: 36,
      fontWeight: '900',
      fontFamily: Fonts?.rounded,
      letterSpacing: -1,
    },
  })
}
