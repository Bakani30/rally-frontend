import { Modal, Platform, StyleSheet, Text, View } from 'react-native'
import { PressableScale } from '@/components/motion/PressableScale'
import { getSportPalette, Radius, Spacing, type SportPalette } from '@/constants/theme'

// Dark vault card — same RECAP_NAVY + transparent backdrop as MatchRecapMoment.
const CARD_BG = '#283845'
const CARD_LINE = 'rgba(255,255,255,0.13)'

type TeamResolutionRequestModalProps = {
  visible: boolean
  kind: 'correction' | 'cancel'
  pending?: boolean
  onAgree: () => void
  onDecline: () => void
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.82)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing.xl,
    },
    card: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: CARD_BG,
      borderRadius: Radius.xxl,
      borderWidth: 2,
      borderColor: CARD_LINE,
      padding: Spacing.xl,
      gap: Spacing.md,
      ...Platform.select({
        web: { boxShadow: '0 24px 60px -24px rgba(0,0,0,0.7)' },
        default: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 16 },
          shadowOpacity: 0.4,
          shadowRadius: 28,
          elevation: 8,
        },
      }),
    },
    title: {
      color: '#ffffff',
      fontSize: 20,
      fontWeight: '900',
      letterSpacing: 0.3,
    },
    consequence: {
      color: 'rgba(255,255,255,0.66)',
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '600',
    },
    row: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginTop: Spacing.xs,
    },
    btn: {
      flex: 1,
      minHeight: 48,
      borderRadius: Radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing.md,
    },
    decline: {
      borderWidth: 1.5,
      borderColor: theme.red,
      backgroundColor: 'rgba(199,63,65,0.12)',
    },
    agree: {
      backgroundColor: theme.orange,
    },
    disabled: {
      opacity: 0.5,
    },
    declineText: {
      color: theme.red,
      fontSize: 14,
      fontWeight: '900',
      letterSpacing: 0.2,
    },
    agreeText: {
      color: CARD_BG,
      fontSize: 14,
      fontWeight: '900',
      letterSpacing: 0.2,
    },
  })
}

export function TeamResolutionRequestModal({
  visible,
  kind,
  pending = false,
  onAgree,
  onDecline,
}: TeamResolutionRequestModalProps) {
  const theme = getSportPalette('dark')
  const styles = createStyles(theme)

  const title = kind === 'correction' ? 'อีกฝั่งขอแก้คะแนน' : 'อีกฝั่งขอยกเลิกแมตช์'
  const consequence =
    kind === 'correction'
      ? 'ตกลงเพื่อเปิดให้กรอกคะแนนใหม่'
      : 'ตกลงเพื่อยกเลิกแมตช์และคืนแต้ม'
  const agreeLabel = kind === 'correction' ? 'ตกลง ให้แก้ใหม่' : 'ตกลง ยกเลิก'

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onDecline}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.consequence}>{consequence}</Text>
          <View style={styles.row}>
            <PressableScale
              style={[styles.btn, styles.decline, pending && styles.disabled]}
              onPress={onDecline}
              disabled={pending}
            >
              <Text style={styles.declineText}>ปฏิเสธ</Text>
            </PressableScale>
            <PressableScale
              style={[styles.btn, styles.agree, pending && styles.disabled]}
              onPress={onAgree}
              disabled={pending}
            >
              <Text style={styles.agreeText}>{agreeLabel}</Text>
            </PressableScale>
          </View>
        </View>
      </View>
    </Modal>
  )
}
