import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { TierBadge } from '@/components/ui/TierBadge'
import { Radius, Sport, Spacing } from '@/constants/theme'
import { useEligibleReferees } from '@/hooks/useEligibleReferees'
import type { EligibleReferee } from '@/types/invite'
import { ConfirmRefereeInviteCard } from './ConfirmRefereeInviteCard'
import { InviteSheetShell } from './InviteSheetShell'
import { InviteUserRow } from './InviteUserRow'

type InviteRefereeSheetProps = {
  visible: boolean
  matchId: string | undefined
  activityType: string | undefined
  onClose: () => void
  onInvite: (referee: EligibleReferee) => void
  onOpenProfile: (userId: string) => void
}

export function InviteRefereeSheet({
  visible,
  matchId,
  activityType,
  onClose,
  onInvite,
  onOpenProfile,
}: InviteRefereeSheetProps) {
  const [query, setQuery] = useState('')
  // Swiping a row stages the referee here; the invite fires only on explicit
  // confirm ("ตกลงจะเชิญ") — an in-sheet overlay, never a second stacked Modal.
  const [pendingReferee, setPendingReferee] = useState<EligibleReferee | null>(null)
  const refereesQuery = useEligibleReferees(matchId, activityType, query.trim(), visible)

  const { eligible, notReady } = useMemo(() => {
    const list = refereesQuery.data ?? []
    return {
      eligible: list.filter((r) => r.eligible),
      notReady: list.filter((r) => !r.eligible),
    }
  }, [refereesQuery.data])

  const handleClose = () => {
    setQuery('')
    setPendingReferee(null)
    onClose()
  }

  const confirmInvite = () => {
    if (!pendingReferee) return
    const referee = pendingReferee
    setPendingReferee(null)
    onInvite(referee)
  }

  return (
    <InviteSheetShell
      visible={visible}
      title="เชิญกรรมการ"
      searchValue={query}
      onSearch={setQuery}
      searchPlaceholder="ค้นหาใครก็ได้ (@handle)"
      onClose={handleClose}
      loading={refereesQuery.isPending}
    >
      <View style={styles.body}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ gap: Spacing.lg, paddingBottom: 60 }}
        >
          {(refereesQuery.data ?? []).length === 0 && (
            <Text style={styles.dim}>{query.trim() ? 'ไม่พบผู้ใช้' : 'พิมพ์เพื่อค้นหากรรมการ'}</Text>
          )}
          <RefereeSection
            title="พร้อมตัดสิน"
            items={eligible}
            dim={false}
            onInvite={setPendingReferee}
            onOpenProfile={onOpenProfile}
          />
          <RefereeSection
            title="ยังไม่พร้อม"
            items={notReady}
            dim
            onInvite={setPendingReferee}
            onOpenProfile={onOpenProfile}
          />
        </ScrollView>

        {pendingReferee && (
          <ConfirmRefereeInviteCard
            referee={pendingReferee}
            onConfirm={confirmInvite}
            onCancel={() => setPendingReferee(null)}
          />
        )}
      </View>
    </InviteSheetShell>
  )
}

function RefereeSection({
  title,
  items,
  dim,
  onInvite,
  onOpenProfile,
}: {
  title: string
  items: EligibleReferee[]
  dim: boolean
  onInvite: (referee: EligibleReferee) => void
  onOpenProfile: (userId: string) => void
}) {
  if (items.length === 0) return null
  return (
    <View style={[styles.section, dim && { opacity: 0.6 }]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={{ gap: Spacing.sm }}>
        {items.map((referee) => (
          <InviteUserRow
            key={referee.userId}
            displayName={referee.displayName}
            handle={referee.handle}
            frameAssetRef={referee.frameAssetRef}
            onOpenProfile={() => onOpenProfile(referee.userId)}
            rightSlot={
              <View style={styles.rightWrap}>
                <View style={styles.refMeta}>
                  <TierBadge tier={referee.trustTier} size={14} showLabel />
                  <Text style={styles.refStat}>
                    ตัดสิน {referee.completedMatches} · clean {referee.cleanMatches}
                  </Text>
                </View>
                {referee.assigned ? (
                  <Text style={styles.assigned}>กรรมการอยู่แล้ว</Text>
                ) : (
                  <PressableScale
                    style={styles.inviteBtn}
                    onPress={() => onInvite(referee)}
                    accessibilityLabel="เชิญ"
                  >
                    <MaterialCommunityIcons
                      name="account-plus-outline"
                      size={15}
                      color={Sport.actionAcceptInk}
                    />
                    <Text style={styles.inviteBtnText}>เชิญ</Text>
                  </PressableScale>
                )}
              </View>
            }
          />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  section: { gap: Spacing.sm },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: Sport.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: 4,
  },
  dim: { color: Sport.muted, fontSize: 13, paddingHorizontal: 4 },
  rightWrap: { alignItems: 'flex-end', gap: 6 },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Sport.actionAccept,
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  inviteBtnText: { color: Sport.actionAcceptInk, fontSize: 12, fontWeight: '900' },
  refMeta: { alignItems: 'flex-end', gap: 2 },
  refStat: { fontSize: 11, color: Sport.muted, fontWeight: '700' },
  assigned: { fontSize: 12, color: Sport.trust ?? Sport.muted, fontWeight: '800' },
})
