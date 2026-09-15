import {
  listInvitableFriendsRecord,
  searchEligibleRefereesRecord,
} from './inviteDirectoryRepository'
import type { EligibleReferee, InvitableFriend } from '@/types/invite'

export function listInvitableFriends(matchId: string): Promise<InvitableFriend[]> {
  return listInvitableFriendsRecord(matchId)
}

export function searchEligibleReferees(
  matchId: string,
  activityType: string,
  query: string,
): Promise<EligibleReferee[]> {
  return searchEligibleRefereesRecord(matchId, activityType, query)
}
