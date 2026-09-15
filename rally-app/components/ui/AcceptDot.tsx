import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useSportTheme } from '@/hooks/useAppTheme'

type Props = {
  accepted: boolean
  size?: number
}

export function AcceptDot({ accepted, size = 18 }: Props) {
  const theme = useSportTheme()
  return (
    <MaterialCommunityIcons
      name={accepted ? 'check-circle' : 'circle-outline'}
      size={size}
      color={accepted ? theme.green : theme.mutedSoft}
    />
  )
}
