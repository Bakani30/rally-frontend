import type { WearCommand, WearRunState } from './wearProtocol'

export type WearCommandDecision =
  | { action: 'start' | 'pause' | 'resume' | 'stop' | 'publish_state'; message: string | null }
  | { action: 'score_event'; points: 1 | 2 | 3; message: string | null }
  | { action: 'undo_score_event'; message: string | null }
  | { action: 'health_snapshot'; message: string | null }
  | { action: 'reject' | 'ignore'; message: string }

export function decideWearRunCommand(
  command: WearCommand,
  state: WearRunState,
): WearCommandDecision {
  switch (command.type) {
    case 'START_RUN':
      if (state.status !== 'idle') return { action: 'ignore', message: 'Run already active on phone' }
      return { action: 'start', message: null }
    case 'PAUSE_RUN':
      if (state.status !== 'active') return { action: 'ignore', message: 'Run is not recording' }
      return { action: 'pause', message: null }
    case 'RESUME_RUN':
      if (state.status !== 'paused') return { action: 'ignore', message: 'Run is not paused' }
      return { action: 'resume', message: null }
    case 'STOP_RUN':
      if (state.status !== 'active' && state.status !== 'paused') {
        return { action: 'ignore', message: 'No active run to finish' }
      }
      return { action: 'stop', message: null }
    case 'REQUEST_STATE':
      return { action: 'publish_state', message: null }
    case 'JOIN_ROOM_HINT':
      if (!state.joinCode) return { action: 'reject', message: 'No host room code on phone' }
      return { action: 'publish_state', message: null }
    case 'SCORE_EVENT':
      if (!state.activeMatchId || !state.scoreDraft || state.scoreDraft.matchId !== state.activeMatchId) {
        return { action: 'reject', message: 'No active team match score draft on phone' }
      }
      if (!command.payload.scoreDelta) return { action: 'reject', message: 'Score event needs +1, +2, or +3' }
      return { action: 'score_event', points: command.payload.scoreDelta, message: null }
    case 'UNDO_SCORE_EVENT':
      if (!state.activeMatchId || !state.scoreDraft || state.scoreDraft.matchId !== state.activeMatchId) {
        return { action: 'reject', message: 'No active team match score draft on phone' }
      }
      return { action: 'undo_score_event', message: null }
    case 'PUBLISH_HEALTH_SNAPSHOT':
      if (!command.payload.healthSummary && !command.payload.heartRate) {
        return { action: 'reject', message: 'Health snapshot is empty' }
      }
      return { action: 'health_snapshot', message: null }
  }
}
