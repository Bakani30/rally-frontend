import { Modal, Platform, StyleSheet, View } from 'react-native'

import { getSportPalette, Radius, Spacing } from '@/constants/theme'
import {
  TeamResultReviewCard,
  type LegacyTeamResultReviewCardProps,
} from '@/components/match/TeamResultReviewCard'

type TeamResultReviewSheetProps = LegacyTeamResultReviewCardProps & {
  visible: boolean
}

export function TeamResultReviewSheet({
  visible,
  ...cardProps
}: TeamResultReviewSheetProps) {
  const theme = getSportPalette('dark')
  const styles = createStyles(theme)

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={() => {}}
    >
      <View style={styles.overlay}>
        <View style={styles.scrim} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <TeamResultReviewCard {...cardProps} />
        </View>
      </View>
    </Modal>
  )
}

function createStyles(theme: ReturnType<typeof getSportPalette>) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    scrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.68)',
    },
    sheet: {
      borderTopLeftRadius: Radius.xl,
      borderTopRightRadius: Radius.xl,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.bg,
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.sm,
      paddingBottom: Platform.OS === 'ios' ? 30 : Spacing.md,
      gap: Spacing.sm,
    },
    handle: {
      alignSelf: 'center',
      width: 44,
      height: 5,
      borderRadius: Radius.pill,
      backgroundColor: theme.line,
      marginBottom: 2,
    },
  })
}
