import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'

type Relation = 'none' | 'friend' | 'incoming' | 'outgoing'

type PublicProfileActionsProps = {
  relation: Relation
  isPending: boolean
  canChallenge: boolean
  showKebab: boolean
  onPrimary: () => void
  onChallenge: () => void
  onKebab: () => void
}

const PRIMARY: Record<Relation, { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string }> = {
  none: { icon: 'account-plus', label: 'ขอเป็นเพื่อน' },
  incoming: { icon: 'account-arrow-left-outline', label: 'รับคำขอ' },
  outgoing: { icon: 'clock-outline', label: 'รอตอบรับ' },
  friend: { icon: 'account-check', label: 'เป็นเพื่อนแล้ว' },
}

// Friend / challenge / safety actions for another user's profile. Pure UI —
// relationship state and handlers are supplied by the screen.
export function PublicProfileActions({
  relation,
  isPending,
  canChallenge,
  showKebab,
  onPrimary,
  onChallenge,
  onKebab,
}: PublicProfileActionsProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const muted = relation === 'friend' || relation === 'outgoing'
  const accept = relation === 'incoming'
  const p = PRIMARY[relation]

  return (
    <View style={styles.row}>
      <PressableScale
        style={[styles.friendBtn, muted && styles.friendBtnMuted, accept && styles.friendBtnAccept]}
        onPress={onPrimary}
        disabled={muted || isPending}
        accessibilityLabel="Add friend"
      >
        <MaterialCommunityIcons
          name={p.icon}
          size={16}
          color={accept ? theme.green : muted ? theme.muted : theme.chalk}
        />
        <Text
          style={[
            styles.friendBtnText,
            muted && styles.friendBtnMutedText,
            accept && styles.friendBtnAcceptText,
          ]}
        >
          {relation === 'none' && isPending ? 'กำลังส่ง...' : p.label}
        </Text>
      </PressableScale>

      {canChallenge && (
        <PressableScale style={styles.challengeBtn} onPress={onChallenge} accessibilityLabel="Challenge user">
          <MaterialCommunityIcons name="sword-cross" size={16} color={theme.chalk} />
          <Text style={styles.challengeBtnText}>ท้าแข่ง</Text>
        </PressableScale>
      )}

      {showKebab && (
        <PressableScale style={styles.kebabBtn} onPress={onKebab} accessibilityLabel="More actions">
          <MaterialCommunityIcons name="dots-horizontal" size={18} color={theme.muted} />
        </PressableScale>
      )}
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    row: { width: 320, maxWidth: '100%', flexDirection: 'row', gap: Spacing.sm, justifyContent: 'center' },
    friendBtn: {
      flex: 1,
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.red,
      borderRadius: Radius.lg,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: 'rgba(255,77,61,0.45)',
    },
    friendBtnMuted: { backgroundColor: theme.surface, borderColor: theme.line },
    friendBtnAccept: { backgroundColor: theme.greenSoft, borderColor: 'rgba(50,213,131,0.35)' },
    friendBtnText: { color: theme.chalk, fontWeight: '900', fontSize: 12, letterSpacing: 0.5 },
    friendBtnMutedText: { color: theme.muted },
    friendBtnAcceptText: { color: theme.greenVivid },
    challengeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.red,
      borderRadius: Radius.lg,
      paddingVertical: 12,
      paddingHorizontal: 28,
    },
    challengeBtnText: { color: theme.chalk, fontWeight: '900', fontSize: 13, letterSpacing: 1 },
    kebabBtn: {
      width: 38,
      height: 38,
      borderRadius: Radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.line,
    },
  })
}
