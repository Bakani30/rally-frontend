const { deleteArrayContains, deleteIn, unique } = require('./supabase')

async function deleteAuthUsers(client, userIds) {
  for (const userId of userIds) {
    const { error } = await client.auth.admin.deleteUser(userId)
    if (error && !error.message.includes('User not found')) {
      throw new Error(`delete auth user ${userId}: ${error.message}`)
    }
  }
}

async function cleanupTargets(client, targets) {
  const { userIds, matchIds, activitySessionIds, reportIds, abuseFlagIds, challengeIds } = targets
  const targetIds = unique([...userIds, ...matchIds, ...reportIds, ...abuseFlagIds, ...challengeIds])

  await deleteIn(client, 'admin_actions', 'admin_user_id', userIds)
  await deleteIn(client, 'admin_actions', 'target_id', targetIds)
  await deleteIn(client, 'notification_events', 'match_id', matchIds)
  await deleteIn(client, 'notification_events', 'actor_user_id', userIds)
  await deleteArrayContains(client, 'notification_events', 'recipient_user_ids', userIds)

  await deleteIn(client, 'match_abuse_reports', 'id', reportIds)
  await deleteIn(client, 'abuse_flags', 'id', abuseFlagIds)
  await deleteIn(client, 'match_community_votes', 'match_id', matchIds)
  await deleteIn(client, 'match_community_votes', 'voter_id', userIds)
  await deleteIn(client, 'match_participant_contributions', 'match_id', matchIds)
  await deleteIn(client, 'match_participant_contributions', 'user_id', userIds)

  await deleteIn(client, 'activity_sessions', 'id', activitySessionIds)
  await deleteIn(client, 'match_submissions', 'match_id', matchIds)
  await deleteIn(client, 'match_submissions', 'submitted_by', userIds)

  await deleteIn(client, 'challenge_participants', 'challenge_id', challengeIds)
  await deleteIn(client, 'challenge_participants', 'user_id', userIds)
  await deleteIn(client, 'challenges', 'id', challengeIds)

  await deleteIn(client, 'gift_redemptions', 'user_id', userIds)
  await deleteIn(client, 'stake_locks', 'match_id', matchIds)
  await deleteIn(client, 'stake_locks', 'user_id', userIds)
  await deleteIn(client, 'point_transactions', 'related_match_id', matchIds)
  await deleteIn(client, 'point_transactions', 'user_id', userIds)
  await deleteIn(client, 'credit_transactions', 'related_match_id', matchIds)
  await deleteIn(client, 'credit_transactions', 'user_id', userIds)

  await deleteIn(client, 'season_standings', 'user_id', userIds)
  await deleteIn(client, 'match_participants', 'match_id', matchIds)
  await deleteIn(client, 'match_participants', 'user_id', userIds)
  await deleteIn(client, 'matches', 'id', matchIds)

  await deleteIn(client, 'device_push_tokens', 'user_id', userIds)
  await deleteIn(client, 'user_cosmetics', 'user_id', userIds)
  await deleteIn(client, 'activity_ratings', 'user_id', userIds)
  await deleteIn(client, 'user_stats', 'user_id', userIds)
  await deleteIn(client, 'user_subscriptions', 'user_id', userIds)
  await deleteIn(client, 'user_credit_wallets', 'user_id', userIds)

  await deleteAuthUsers(client, userIds)
  await deleteIn(client, 'users', 'id', userIds)
}

module.exports = { cleanupTargets }
