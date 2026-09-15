import { Modal, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { getSportPalette, Radius, Spacing, type SportPalette } from '@/constants/theme'

type MatchCancelledMomentProps = {
  visible: boolean
  onExit: () => void
  // 'mutual' = both sides agreed to cancel; 'system' = voided by the system
  // (e.g. anti-abuse/timeout). Drives the copy.
  reason?: 'mutual' | 'system'
}

// Shown to participants when a match is cancelled (mutual cancel) instead of
// bouncing them straight out — mirrors the recap moment's dark vault look with a
// single exit action. Forced dark to match the rest of the match room.
export function MatchCancelledMoment({ visible, onExit, reason = 'mutual' }: MatchCancelledMomentProps) {
  const theme = getSportPalette('dark')
  const styles = createStyles(theme)
  const subtitle = reason === 'system'
    ? 'ระบบยกเลิกแมตช์นี้ แต้มเดิมพันถูกคืนเข้ากระเป๋าเรียบร้อย'
    : 'ทั้งสองฝั่งตกลงยกเลิก แต้มเดิมพันถูกคืนเข้ากระเป๋าเรียบร้อย'

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onExit}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <MaterialCommunityIcons name="close-octagon-outline" size={40} color={theme.red} />
          </View>
          <Text style={styles.title}>ยกเลิกแมตช์แล้ว</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          <PressableScale style={styles.exitButton} onPress={onExit}>
            <Text style={styles.exitText}>ออก</Text>
          </PressableScale>
        </View>
      </View>
    </Modal>
  )
}

function createStyles(theme: SportPalette) {
  return {
    backdrop: {
      flex: 1,
      // Opaque so the (light) match-detail page behind never bleeds through —
      // this is a full-screen takeover, not a dim overlay.
      backgroundColor: theme.bg,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      padding: Spacing.xl,
    },
    card: {
      width: '100%' as const,
      maxWidth: 340,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface,
      padding: Spacing.xl,
      alignItems: 'center' as const,
      gap: Spacing.md,
    },
    iconWrap: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: `${theme.red}1f`,
    },
    title: { color: theme.ink, fontSize: 22, fontWeight: '900' as const, textAlign: 'center' as const },
    subtitle: {
      color: theme.inkSoft,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: '600' as const,
      textAlign: 'center' as const,
    },
    exitButton: {
      marginTop: Spacing.sm,
      minHeight: 50,
      alignSelf: 'stretch' as const,
      borderRadius: Radius.pill,
      backgroundColor: theme.surfaceStrong,
      borderWidth: 1,
      borderColor: theme.line,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    exitText: { color: theme.ink, fontSize: 15, fontWeight: '900' as const },
  }
}
