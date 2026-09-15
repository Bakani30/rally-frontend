import { StyleSheet, Text, View } from 'react-native'
import { PressableScale } from '@/components/motion/PressableScale'
import { ProfileFrame } from '@/components/profile/ProfileFrame'
import { TierBadge } from '@/components/ui/TierBadge'
import { Radius, Sport, Spacing } from '@/constants/theme'
import type { EligibleReferee } from '@/types/invite'

type ConfirmRefereeInviteCardProps = {
  referee: EligibleReferee
  pending?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Confirm gate for a referee invite. Rendered as an absolute overlay INSIDE the
 * referee sheet's own Modal (never a second stacked Modal — iOS can't present one
 * Modal over another). Swiping a row stages the referee here; the invite only
 * fires on explicit "ตกลงจะเชิญ", mirroring the challenge/match confirm pattern.
 */
export function ConfirmRefereeInviteCard({
  referee,
  pending = false,
  onConfirm,
  onCancel,
}: ConfirmRefereeInviteCardProps) {
  const name = referee.displayName ?? referee.handle ?? 'กรรมการ'
  const initials = name[0]?.toUpperCase() ?? '?'

  return (
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <View style={styles.identity}>
          <ProfileFrame frameAssetRef={referee.frameAssetRef} size={44}>
            <Text style={styles.avatarText}>{initials}</Text>
          </ProfileFrame>
          <View style={styles.mid}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            {referee.handle && (
              <Text style={styles.handle} numberOfLines={1}>
                @{referee.handle}
              </Text>
            )}
          </View>
        </View>

        <Text style={styles.question}>เชิญเป็นกรรมการแมตช์นี้?</Text>

        <View style={styles.statRow}>
          <TierBadge tier={referee.trustTier} size={15} showLabel />
          <Text style={styles.stat}>
            ตัดสิน {referee.completedMatches} · clean {referee.cleanMatches}
          </Text>
        </View>

        <View style={styles.buttons}>
          <PressableScale
            style={[styles.btn, styles.cancel, pending && styles.disabled]}
            onPress={onCancel}
            disabled={pending}
            accessibilityLabel="ยกเลิก"
          >
            <Text style={styles.cancelText}>ยกเลิก</Text>
          </PressableScale>
          <PressableScale
            style={[styles.btn, styles.confirm, pending && styles.disabled]}
            onPress={onConfirm}
            disabled={pending}
            accessibilityLabel="ตกลงจะเชิญ"
          >
            <Text style={styles.confirmText}>ตกลงจะเชิญ</Text>
          </PressableScale>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Sport.bgElevated,
    borderRadius: Radius.xxl,
    borderWidth: 1,
    borderColor: Sport.line,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  identity: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minWidth: 0 },
  mid: { flex: 1, minWidth: 0 },
  avatarText: { color: Sport.ink, fontSize: 15, fontWeight: '900', letterSpacing: -0.5 },
  name: { color: Sport.ink, fontSize: 16, fontWeight: '900' },
  handle: { color: Sport.muted, fontSize: 12, fontWeight: '700', marginTop: 1 },
  question: { color: Sport.ink, fontSize: 14, fontWeight: '800' },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stat: { color: Sport.muted, fontSize: 12, fontWeight: '700' },
  buttons: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  btn: {
    flex: 1,
    minHeight: 48,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  cancel: { borderWidth: 1.5, borderColor: Sport.line, backgroundColor: Sport.surface },
  confirm: { backgroundColor: Sport.actionAccept },
  disabled: { opacity: 0.5 },
  cancelText: { color: Sport.ink, fontSize: 14, fontWeight: '900', letterSpacing: 0.2 },
  confirmText: { color: Sport.actionAcceptInk, fontSize: 14, fontWeight: '900', letterSpacing: 0.2 },
})
