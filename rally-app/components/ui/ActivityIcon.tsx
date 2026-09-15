import { View, StyleSheet } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { ActivityColor, Radius } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'

type Activity = 'running' | 'basketball' | 'badminton' | string

const ICON_NAME: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  running: 'run-fast',
  basketball: 'basketball',
  badminton: 'badminton',
}

type Props = {
  activity: Activity
  size?: number
  filled?: boolean
}

export function ActivityIcon({ activity, size = 22, filled = true }: Props) {
  const theme = useSportTheme()
  const name = ICON_NAME[activity] ?? 'bullseye-arrow'
  const color = ActivityColor[activity] ?? theme.ink

  if (!filled) {
    return <MaterialCommunityIcons name={name} size={size} color={color} />
  }

  const boxSize = size + 18
  return (
    <View
      style={[
        styles.box,
        {
          width: boxSize,
          height: boxSize,
          backgroundColor: `${color}22`,
          borderColor: `${color}33`,
        },
      ]}
    >
      <MaterialCommunityIcons name={name} size={size} color={color} />
    </View>
  )
}

const styles = StyleSheet.create({
  box: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
