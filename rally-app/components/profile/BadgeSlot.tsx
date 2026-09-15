import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Link } from 'expo-router'
import { StyleSheet, View } from 'react-native'
import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'

const BADGE_ICON: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  'badge/starter': 'star-four-points',
}

type Props = {
  badgeAssetRef: string | null
  size?: number
  editable?: boolean
}

export function BadgeSlot({ badgeAssetRef, size = 32, editable = false }: Props) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const icon = badgeAssetRef ? BADGE_ICON[badgeAssetRef] ?? 'shield-star' : 'plus'
  const filled = !!badgeAssetRef
  const content = (
    <View
      style={[
        styles.slot,
        { width: size, height: size, borderRadius: size / 2 },
        filled ? styles.slotFilled : styles.slotEmpty,
      ]}
    >
      <MaterialCommunityIcons
        name={icon}
        size={size * 0.55}
        color={filled ? theme.amber : theme.mutedSoft}
      />
    </View>
  )

  if (!editable) return content

  return (
    <Link href="/cosmetics?tab=badge" asChild>
      <PressableScale accessibilityLabel="แก้แบดจ์">{content}</PressableScale>
    </Link>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    slot: {
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderRadius: Radius.pill,
    },
    slotFilled: {
      borderColor: theme.amber,
      backgroundColor: theme.amberSoft,
    },
    slotEmpty: {
      borderColor: theme.line,
      borderStyle: 'dashed',
      backgroundColor: 'transparent',
    },
  })
}
