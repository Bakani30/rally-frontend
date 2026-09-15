const { runQuery, selectIn, unique } = require('./supabase')

async function collectTargets(client, pattern) {
  const smokeUsers = await runQuery(
    'select smoke users',
    client.from('users').select('id, email, handle').like('email', pattern).order('created_at'),
  )
  const userIds = smokeUsers.map((user) => user.id)

  const participantRows = await selectIn(client, 'match_participants', 'match_id', 'user_id', userIds)
  const createdMatches = await selectIn(client, 'matches', 'id', 'created_by', userIds)
  const wonMatches = await selectIn(client, 'matches', 'id', 'winner_user_id', userIds)
  const submittedMatches = await selectIn(client, 'match_submissions', 'match_id', 'submitted_by', userIds)
  const matchIds = unique([
    ...participantRows.map((row) => row.match_id),
    ...createdMatches.map((row) => row.id),
    ...wonMatches.map((row) => row.id),
    ...submittedMatches.map((row) => row.match_id),
  ])

  const directSessions = await selectIn(client, 'activity_sessions', 'id', 'user_id', userIds)
  const linkedSessions = await selectIn(
    client,
    'activity_session_links',
    'activity_session_id',
    'match_id',
    matchIds,
  )
  const submittedSessions = await selectIn(
    client,
    'match_submissions',
    'activity_session_id',
    'match_id',
    matchIds,
  )
  const activitySessionIds = unique([
    ...directSessions.map((row) => row.id),
    ...linkedSessions.map((row) => row.activity_session_id),
    ...submittedSessions.map((row) => row.activity_session_id),
  ])

  const reportsByMatch = await selectIn(client, 'match_abuse_reports', 'id', 'match_id', matchIds)
  const reportsByReporter = await selectIn(client, 'match_abuse_reports', 'id', 'reporter_user_id', userIds)
  const reportsByReported = await selectIn(client, 'match_abuse_reports', 'id', 'reported_user_id', userIds)
  const reportIds = unique([
    ...reportsByMatch.map((row) => row.id),
    ...reportsByReporter.map((row) => row.id),
    ...reportsByReported.map((row) => row.id),
  ])

  const flagsByMatch = await selectIn(client, 'abuse_flags', 'id', 'related_match_id', matchIds)
  const flagsByUser = await selectIn(client, 'abuse_flags', 'id', 'subject_user_id', userIds)
  const abuseFlagIds = unique([...flagsByMatch.map((row) => row.id), ...flagsByUser.map((row) => row.id)])

  const challenges = await selectIn(client, 'challenges', 'id', 'creator_id', userIds)
  const challengeIds = unique(challenges.map((row) => row.id))

  return { smokeUsers, userIds, matchIds, activitySessionIds, reportIds, abuseFlagIds, challengeIds }
}

function printSummary(targets, options, pattern, url) {
  console.log(`Mode: ${options.apply ? 'APPLY' : 'DRY RUN'}`)
  console.log(`Remote: ${url}`)
  console.log(`Target email LIKE: ${pattern}`)
  console.log('')
  console.log(`Smoke users: ${targets.userIds.length}`)
  targets.smokeUsers.forEach((user) => console.log(`- ${user.email} (${user.id})`))
  console.log('')
  console.log(`Matches: ${targets.matchIds.length}`)
  console.log(`Activity sessions: ${targets.activitySessionIds.length}`)
  console.log(`Abuse reports: ${targets.reportIds.length}`)
  console.log(`Abuse flags: ${targets.abuseFlagIds.length}`)
  console.log(`Challenges: ${targets.challengeIds.length}`)
}

module.exports = { collectTargets, printSummary }
