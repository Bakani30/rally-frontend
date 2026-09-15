import type { ArenaSessionSnapshot } from '@/types/arenaSession'

import type { ArenaLifecycleState } from './arenaLifecyclePreview'

/**
 * Read-only snapshots for the local route. These deliberately model the
 * production ArenaSessionSnapshot contract and contain no user coordinates or
 * server mutation inputs.
 */
export function buildArenaLifecycleSnapshot(state: ArenaLifecycleState): ArenaSessionSnapshot {
  const isClosed = state === 'closed'
  const actorWon = state === 'settled_winner' || state === 'champion'
  const actorIsChampion = actorWon || state === 'captain_decision_required' || state === 'captain_continued' || state === 'teammate_waiting'
  const actorTeamStatus = isClosed
    ? 'retired'
    : state === 'paired_stake' || state === 'ready_to_start' || state === 'in_progress'
      ? 'active'
      : actorIsChampion
        ? 'champion'
        : 'retired'
  const opponentTeamStatus = isClosed
    ? 'retired'
    : state === 'in_progress'
      ? 'active'
      : actorIsChampion || state === 'paired_stake' || state === 'ready_to_start' ? 'retired' : 'champion'
  const settledAt = '2026-08-13T08:10:00.000Z'
  const isContinuationDecision = state === 'captain_decision_required'
  const isCaptainContinued = state === 'captain_continued'
  const isTeammateWaiting = state === 'teammate_waiting'
  const isPairedStake = state === 'paired_stake'
  const isReadyToStart = state === 'ready_to_start'
  const isInProgress = state === 'in_progress'
  const isDraining = state === 'draining'
  const hasLiveRound = isPairedStake || isReadyToStart || isInProgress
  const hasDetailedParticipation = isContinuationDecision || isCaptainContinued || isTeammateWaiting
  const liveRoundId = `preview-live-round-${state}`

  return {
    session: {
      arenaEventId: `preview-${state}`,
      sourceKind: 'ad_hoc',
      mode: 'casual',
      title: 'Preview King Court',
      activityType: 'basketball',
      teamSize: 3,
      joinMode: 'open',
      sessionState: isClosed ? 'closed' : isDraining ? 'draining' : 'open',
      openedAt: '2026-08-13T08:00:00.000Z',
      drainingAt: isDraining || isClosed ? '2026-08-13T08:12:00.000Z' : null,
      drainDeadlineAt: isDraining || isClosed ? '2026-08-13T08:30:00.000Z' : null,
      closedAt: isClosed ? '2026-08-13T08:30:00.000Z' : null,
      cancelledAt: null,
      createdAt: '2026-08-13T07:55:00.000Z',
      updatedAt: settledAt,
    },
    actor: {
      role: 'member',
      memberState: 'ready',
      teamId: 'preview-team-you',
      presenceStatus: isClosed ? 'revoked' : 'valid',
      canJoin: false,
      canOpen: false,
      canRecordPresence: false,
      ...(isInProgress ? { activeMatchId: 'preview-match-in-progress' } : {}),
      ...(isPairedStake || isReadyToStart ? {
        roundState: {
          proposalAmount: 25,
          confirmed: isReadyToStart,
          capabilities: {
            isRoundCaptain: true,
            canEditOwnStake: isPairedStake,
            canConfirmStake: isPairedStake,
            canStartRound: isReadyToStart,
          },
        },
      } : {}),
    },
    teamParticipation: hasDetailedParticipation
      ? {
          participationCycleId: `preview-cycle-${state}`,
          teamId: 'preview-team-you',
          lane: 'champion',
          state: isContinuationDecision
            ? 'decision_required'
            : isTeammateWaiting ? 'decision_required' : 'ready_to_pair',
          revision: 7,
          queuePosition: isCaptainContinued ? 1 : null,
          blocksPairing: isContinuationDecision,
          capabilities: {
            canContinue: isContinuationDecision,
            canRetire: isContinuationDecision || isCaptainContinued,
          },
        }
      : { blocksPairing: false },
    teams: [
      {
        teamId: 'preview-team-you',
        name: 'Rally Crew',
        partyName: 'Preview Party',
        status: actorTeamStatus,
        queuePosition: null,
        members: [
          { displayName: 'You', handle: 'you', avatarUrl: null },
          { displayName: 'Mina', handle: 'mina', avatarUrl: null },
          { displayName: 'Ton', handle: 'ton', avatarUrl: null },
        ],
      },
      {
        teamId: 'preview-team-opponent',
        name: 'Court Rivals',
        partyName: 'Rivals Party',
        status: opponentTeamStatus,
        queuePosition: null,
        members: [
          { displayName: 'Beam', handle: 'beam', avatarUrl: null },
          { displayName: 'Ploy', handle: 'ploy', avatarUrl: null },
          { displayName: 'Korn', handle: 'korn', avatarUrl: null },
        ],
      },
    ],
    rounds: [
      {
        roundId: `preview-round-${state}`,
        status: 'settled',
        championTeamId: actorWon ? 'preview-team-you' : 'preview-team-opponent',
        challengerTeamId: actorWon ? 'preview-team-opponent' : 'preview-team-you',
        winnerTeamId: actorWon ? 'preview-team-you' : 'preview-team-opponent',
        loserTeamId: actorWon ? 'preview-team-opponent' : 'preview-team-you',
        startedAt: '2026-08-13T08:02:00.000Z',
        submittedAt: '2026-08-13T08:08:00.000Z',
        settledAt,
      },
      ...(hasLiveRound ? [{
        roundId: liveRoundId,
        status: isInProgress ? 'in_progress' as const : 'stake_acceptance' as const,
        championTeamId: 'preview-team-you',
        challengerTeamId: 'preview-team-opponent',
        winnerTeamId: null,
        loserTeamId: null,
        startedAt: isInProgress ? '2026-08-13T08:12:00.000Z' : null,
        submittedAt: null,
        settledAt: null,
      }] : []),
    ],
    liveRound: hasLiveRound ? {
      roundId: liveRoundId,
      status: isInProgress ? 'in_progress' : 'stake_acceptance',
      phase: isInProgress ? 'active' : isReadyToStart ? 'ready_to_start' : 'stake_confirmation',
      ...(isPairedStake || isReadyToStart ? { stake: {
        version: 3,
        courtAvailableAt: '2026-08-13T08:15:00.000Z',
        confirmationDeadlineAt: '2026-08-13T08:20:00.000Z',
        confirmedCount: isReadyToStart ? 6 : 2,
        requiredCount: 6,
      } } : {}),
      champion: {
        teamId: 'preview-team-you',
        score: null,
        members: [
          { displayName: 'You', handle: 'you', avatarUrl: null, positionKey: 'captain', isCaptain: true },
          { displayName: 'Mina', handle: 'mina', avatarUrl: null, positionKey: 'member-1', isCaptain: false },
          { displayName: 'Ton', handle: 'ton', avatarUrl: null, positionKey: 'member-2', isCaptain: false },
        ],
      },
      challenger: {
        teamId: 'preview-team-opponent',
        score: null,
        members: [
          { displayName: 'Beam', handle: 'beam', avatarUrl: null, positionKey: 'captain', isCaptain: true },
          { displayName: 'Ploy', handle: 'ploy', avatarUrl: null, positionKey: 'member-1', isCaptain: false },
          { displayName: 'Korn', handle: 'korn', avatarUrl: null, positionKey: 'member-2', isCaptain: false },
        ],
      },
    } : null,
  }
}
