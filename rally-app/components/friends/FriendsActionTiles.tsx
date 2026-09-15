import { Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { PressableScale } from '@/components/motion/PressableScale'
import { useSportTheme } from '@/hooks/useAppTheme'
import { createFriendsHubStyles } from './friendsHubStyles'

export type FriendsActionTilesProps = {
  onOpenSearch: () => void
}

/** Equal-width friends entry points. Invite is intentionally locked for now. */
export function FriendsActionTiles({ onOpenSearch }: FriendsActionTilesProps) {
  const theme = useSportTheme()
  const styles = createFriendsHubStyles(theme)

  return (
    <View style={styles.actionRow}>
      <PressableScale
        style={styles.actionTile}
        onPress={onOpenSearch}
        accessibilityRole="button"
        accessibilityLabel="เพิ่มเพื่อน"
      >
        <View style={styles.actionIcon}>
          <MaterialCommunityIcons name="account-plus" size={21} color={theme.ink} />
        </View>
        <View style={styles.actionCopy}>
          <Text style={styles.actionTitle} numberOfLines={1}>
            Add Friends
          </Text>
          <Text style={styles.actionSubtitle} numberOfLines={1}>
            เพิ่มเพื่อนด้วยชื่อ
          </Text>
        </View>
        <MaterialCommunityIcons
          name="chevron-right"
          size={22}
          color={theme.ink}
          style={styles.actionChevron}
        />
      </PressableScale>

      <PressableScale
        style={styles.actionTile}
        disabled
        accessibilityRole="button"
        accessibilityLabel="เชิญเพื่อน, เร็ว ๆ นี้"
        accessibilityState={{ disabled: true }}
      >
        <View style={styles.actionIcon}>
          <MaterialCommunityIcons name="link-variant" size={21} color={theme.ink} />
        </View>
        <View style={styles.actionCopy}>
          <Text style={styles.actionTitle} numberOfLines={1}>
            Invite Friends
          </Text>
          <View style={styles.statusChip}>
            <Text style={styles.statusChipText}>เร็ว ๆ นี้</Text>
          </View>
        </View>
        <MaterialCommunityIcons
          name="lock-outline"
          size={16}
          color={theme.muted}
          style={styles.actionChevron}
        />
      </PressableScale>
    </View>
  )
}
