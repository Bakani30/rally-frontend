import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { PressableScale } from '@/components/motion/PressableScale'
import { ProfileRankRow } from '@/components/profile/ProfileRankRow'
import { RallyText } from '@/components/ui/RallyText'
import { Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { activityRoleConfig, roleShort } from '@/lib/activities/playerRoles'
import { LEADERBOARD_ACTIVITIES } from '@/lib/leaderboard/leaderboardConfig'
import type { UserActivityRating } from '@/lib/leaderboard/leaderboardTypes'
import { getSportReelItem } from '@/lib/match/sportReel'

export type ProfileRankListViewProps = {
  ratings: UserActivityRating[] | undefined
  positions?: Record<string, string>
  editable?: boolean
  onOpenRank?: () => void
  onEditRole?: (activity: string) => void
}

/** Presentation-only activity ranking list. Position persistence belongs to its caller. */
export function ProfileRankListView({ ratings, positions, editable = true, onOpenRank, onEditRole }: ProfileRankListViewProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const byActivity = new Map((ratings ?? []).map((rating) => [rating.activity, rating]))
  const [openKey, setOpenKey] = useState<string | null>(null)

  return (
    <View style={styles.section}>
      {onOpenRank ? <PressableScale style={styles.titleRow} onPress={onOpenRank} accessibilityRole="button" accessibilityLabel="เปิดหน้าแรงค์"><RallyText variant="head" lang="en" style={styles.title}>Rankings</RallyText><MaterialCommunityIcons name="chevron-right" size={22} color={theme.mutedSoft} /></PressableScale> : <RallyText variant="head" lang="en" style={styles.title}>Rankings</RallyText>}
      <View style={styles.list}>
        {LEADERBOARD_ACTIVITIES.map((activity) => {
          const row = byActivity.get(activity.key)
          const reel = getSportReelItem(activity.key)
          const roleConfig = activityRoleConfig(activity.key)
          return <ProfileRankRow key={activity.key} label={activity.label} icon={activity.icon} color={reel.accent} iconColor={reel.onAccent} rating={row?.rating ?? 0} tier={row?.tier ?? null} matches={row?.matches ?? 0} wins={row?.wins ?? 0} losses={row?.losses ?? 0} showRole={editable && roleConfig != null} roleCellLabel={roleConfig?.cellLabel ?? 'STYLE'} roleValue={roleShort(activity.key, positions?.[activity.key])} onEditRole={editable && roleConfig && onEditRole ? () => onEditRole(activity.key) : undefined} expanded={openKey === activity.key} onPress={() => setOpenKey((current) => current === activity.key ? null : activity.key)} />
        })}
      </View>
    </View>
  )
}

function createStyles(theme: SportPalette) { return StyleSheet.create({ section: { width: '100%', gap: Spacing.sm }, titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }, title: { color: theme.ink, fontSize: 17, fontWeight: '900', fontStyle: 'italic', letterSpacing: 0.2 }, list: { gap: Spacing.sm } }) }
