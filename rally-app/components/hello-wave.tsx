import { MaterialCommunityIcons } from '@expo/vector-icons'
import Animated from 'react-native-reanimated'
import { useSportTheme } from '@/hooks/useAppTheme'

export function HelloWave() {
  const theme = useSportTheme()
  return (
    <Animated.View
      style={{
        animationName: {
          '50%': { transform: [{ rotate: '25deg' }] },
        },
        animationIterationCount: 4,
        animationDuration: '300ms',
      }}
    >
      <MaterialCommunityIcons name="hand-wave" size={26} color={theme.amber} />
    </Animated.View>
  )
}
