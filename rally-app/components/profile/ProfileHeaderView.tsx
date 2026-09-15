import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { PressableScale } from '@/components/motion/PressableScale'
import { ScreenBackButtonView } from '@/components/navigation/ScreenBackButtonView'
import { type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'

export type ProfileHeaderViewProps = {
  title?: string
  cardOpen: boolean
  onToggleCard: () => void
  onOpenSettings: () => void
  onBack?: () => void
  showBackButton?: boolean
}

/** Presentation-only profile header. Navigation belongs to its caller. */
export function ProfileHeaderView({
  title = 'Profile',
  cardOpen,
  onToggleCard,
  onOpenSettings,
  onBack,
  showBackButton = false,
}: ProfileHeaderViewProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)

  return (
    <View style={styles.row}>
      {showBackButton && onBack ? (
        <ScreenBackButtonView
          style={styles.backBtn}
          onPress={onBack}
          accessibilityLabel="ย้อนกลับ"
          iconColor={theme.muted}
        />
      ) : null}
      <Text style={styles.title}>{title}</Text>
      <View style={styles.actions}>
        <PressableScale
          style={[styles.btn, cardOpen && styles.btnActiveCard]}
          onPress={onToggleCard}
          accessibilityRole="button"
          accessibilityLabel="นามบัตรสมาชิก"
          accessibilityState={{ expanded: cardOpen }}
          hitSlop={8}
        >
          <MaterialCommunityIcons
            name="card-account-details-outline"
            size={20}
            color={cardOpen ? theme.blue : theme.muted}
          />
        </PressableScale>
        <PressableScale
          style={styles.btn}
          onPress={onOpenSettings}
          accessibilityRole="button"
          accessibilityLabel="ตั้งค่า"
          hitSlop={8}
        >
          <MaterialCommunityIcons name="cog-outline" size={20} color={theme.muted} />
        </PressableScale>
      </View>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    row: { width: '100%', minHeight: 44, alignItems: 'center', justifyContent: 'center' },
    title: { color: theme.ink, fontSize: 22, fontWeight: '900', fontStyle: 'italic', letterSpacing: 0.2 },
    actions: { position: 'absolute', right: 0, top: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
    backBtn: { position: 'absolute', left: 0, top: 0 },
    btn: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line },
    btnActiveCard: { backgroundColor: theme.blueSoft, borderColor: theme.blue },
  })
}
