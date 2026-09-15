import { useState } from 'react'
import { Alert, View } from 'react-native'
import { PlayerRolePickerModal } from '@/components/profile/PlayerRolePickerModal'
import { ProfileRankListView } from '@/components/profile/ProfileRankListView'
import { useSetSportPosition, useSportPositions } from '@/hooks/useSportPositions'
import { activityRoleConfig } from '@/lib/activities/playerRoles'
import type { UserActivityRating } from '@/lib/leaderboard/leaderboardTypes'

type ProfileRankListProps = {
  ratings: UserActivityRating[] | undefined
  userId: string | undefined
  // When false (viewing another user) rows are read-only: no role editing.
  editable?: boolean
  // When set, the section title becomes a button into the full "My Rank" page.
  onOpenRank?: () => void
}

// Per-activity ranking rows. Tap a row to expand that activity's separate stats.
export function ProfileRankList({ ratings, userId, editable = true, onOpenRank }: ProfileRankListProps) {
  const [pickerActivity, setPickerActivity] = useState<string | null>(null)

  const { data: positions } = useSportPositions(userId)
  const setPosition = useSetSportPosition(userId)

  const pickerConfig = pickerActivity ? activityRoleConfig(pickerActivity) : null

  return (
    <View>
      <ProfileRankListView ratings={ratings} positions={positions} editable={editable} onOpenRank={onOpenRank} onEditRole={setPickerActivity} />
      {editable ? (
        <PlayerRolePickerModal
          visible={pickerConfig != null}
          title={pickerConfig?.pickerTitle ?? ''}
          options={pickerConfig?.roles ?? []}
          currentKey={pickerActivity ? (positions?.[pickerActivity] ?? null) : null}
          onSelect={(key) => {
            if (pickerActivity) {
              setPosition.mutate(
                { activityType: pickerActivity, positionKey: key },
                {
                  onError: (error) =>
                    Alert.alert(
                      'บันทึกไม่สำเร็จ',
                      error instanceof Error ? error.message : 'ลองอีกครั้ง',
                    ),
                },
              )
            }
            setPickerActivity(null)
          }}
          onClose={() => setPickerActivity(null)}
        />
      ) : null}
    </View>
  )
}
