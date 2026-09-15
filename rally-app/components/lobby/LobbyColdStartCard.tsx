import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'

type LobbyColdStartCardProps = {
  onCreate: () => void
}

// Shown when there are no open lobbies in the active filter. The whole card is a
// single create action — no duplicate buttons (the hero already has ลุยเลย and the
// header has the join-code key). Just an invitation to open the first room.
export function LobbyColdStartCard({ onCreate }: LobbyColdStartCardProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)

  return (
    <PressableScale
      style={styles.card}
      onPress={onCreate}
      accessibilityRole="button"
      accessibilityLabel="สร้างห้อง"
    >
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name="stadium-variant" size={26} color={theme.orange} />
      </View>
      <Text style={styles.title}>เปิดสนามแรกของคืนนี้</Text>
      <View style={styles.cue}>
        <MaterialCommunityIcons name="plus" size={15} color={theme.orange} />
        <Text style={styles.cueText}>สร้างห้อง</Text>
      </View>
    </PressableScale>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.arcadePanel,
      borderRadius: Radius.xl,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: theme.orangeSoft,
      paddingVertical: Spacing.xl,
      paddingHorizontal: Spacing.lg,
      alignItems: 'center',
      gap: Spacing.sm,
    },
    iconWrap: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: theme.orangeSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      color: theme.ink,
      fontSize: 16,
      fontWeight: '900',
    },
    cue: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    cueText: {
      color: theme.orange,
      fontSize: 13,
      fontWeight: '900',
      letterSpacing: 0.3,
    },
  })
}
