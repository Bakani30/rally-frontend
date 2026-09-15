import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  acknowledgeWearCommand,
  isWearBridgeAvailable,
  publishWearRunState,
  subscribeWearCommands,
} from '@/lib/wear/wearBridge'
import { decideWearRunCommand } from '@/lib/wear/wearCommandReducer'
import {
  parseWearCommand,
  type WearCommand,
  type WearHealthSummary,
  type WearRunState,
} from '@/lib/wear/wearProtocol'
import { useRunSessionStore } from '@/lib/run-tracking/session/runSessionStore'

type UseWearRunCompanionInput = WearRunState & {
  start?: () => Promise<void>
  pause?: () => void
  resume?: () => void
  stopAndSubmit?: () => Promise<void>
  onScoreEvent?: (points: 1 | 2 | 3) => void
  onUndoScoreEvent?: () => void
  onHealthSnapshot?: (summary: WearHealthSummary) => void
}

export function useWearRunCompanion(input: UseWearRunCompanionInput): void {
  const inputRef = useRef(input)
  const handledCommandsRef = useRef(new Set<string>())
  inputRef.current = input

  const publishState = useCallback(async () => {
    if (!isWearBridgeAvailable()) return
    await publishWearRunState(inputRef.current)
  }, [])

  const handleCommand = useCallback(async (command: WearCommand) => {
    if (handledCommandsRef.current.has(command.commandId)) {
      await acknowledgeWearCommand(command.commandId, command.type, 'ignored', 'Duplicate command')
      return
    }
    handledCommandsRef.current.add(command.commandId)
    if (handledCommandsRef.current.size > 100) {
      handledCommandsRef.current = new Set(Array.from(handledCommandsRef.current).slice(-50))
    }

    if (command.payload.heartRate) {
      useRunSessionStore.getState().recordWearHeartRate(command.payload.heartRate)
    }
    if (command.payload.healthSummary?.heartRate) {
      useRunSessionStore.getState().recordWearHeartRate(command.payload.healthSummary.heartRate)
    }

    const current = inputRef.current
    const decision = decideWearRunCommand(command, current)
    try {
      switch (decision.action) {
        case 'start':
          if (!current.start) throw new Error('No run context on phone')
          await current.start()
          await acknowledgeWearCommand(command.commandId, command.type, 'accepted', null)
          break
        case 'pause':
          if (!current.pause) throw new Error('No run context on phone')
          current.pause()
          await acknowledgeWearCommand(command.commandId, command.type, 'accepted', null)
          break
        case 'resume':
          if (!current.resume) throw new Error('No run context on phone')
          current.resume()
          await acknowledgeWearCommand(command.commandId, command.type, 'accepted', null)
          break
        case 'stop':
          if (!current.stopAndSubmit) throw new Error('No run context on phone')
          await current.stopAndSubmit()
          await acknowledgeWearCommand(command.commandId, command.type, 'accepted', null)
          break
        case 'score_event':
          if (!current.onScoreEvent) throw new Error('No score draft on phone')
          current.onScoreEvent(decision.points)
          await acknowledgeWearCommand(command.commandId, command.type, 'accepted', null)
          break
        case 'undo_score_event':
          if (!current.onUndoScoreEvent) throw new Error('No score draft on phone')
          current.onUndoScoreEvent()
          await acknowledgeWearCommand(command.commandId, command.type, 'accepted', null)
          break
        case 'health_snapshot':
          if (command.payload.healthSummary && current.onHealthSnapshot) {
            current.onHealthSnapshot(command.payload.healthSummary)
          }
          await acknowledgeWearCommand(command.commandId, command.type, 'accepted', null)
          break
        case 'publish_state':
          await acknowledgeWearCommand(command.commandId, command.type, 'accepted', null)
          break
        case 'ignore':
          await acknowledgeWearCommand(command.commandId, command.type, 'ignored', decision.message)
          break
        case 'reject':
          await acknowledgeWearCommand(command.commandId, command.type, 'rejected', decision.message)
          break
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await acknowledgeWearCommand(command.commandId, command.type, 'rejected', message)
    } finally {
      await publishState()
    }
  }, [publishState])

  useEffect(() => {
    if (!isWearBridgeAvailable()) return
    return subscribeWearCommands((event) => {
      const command = parseWearCommand(event)
      if (!command) return
      void handleCommand(command)
    })
  }, [handleCommand])

  const telemetryKey = useMemo(() => JSON.stringify({
    sessionId: input.sessionId,
    status: input.status,
    distanceMeters: Math.round(input.distanceMeters),
    durationSeconds: Math.round(input.durationSeconds),
    paceSecondsPerKm: input.paceSecondsPerKm,
    heartRate: input.heartRate,
    matchLabel: input.matchLabel,
    guildGoalLabel: input.guildGoalLabel,
    guildGoalProgress: input.guildGoalProgress,
    activeMatchId: input.activeMatchId,
    activeMatchLabel: input.activeMatchLabel,
    joinCode: input.joinCode,
    activeGuildGoalId: input.activeGuildGoalId,
    activeGuildGoalLabel: input.activeGuildGoalLabel,
    healthSummary: input.healthSummary,
    scoreDraft: input.scoreDraft,
    partnerCampaign: input.partnerCampaign,
  }), [input])

  useEffect(() => {
    void publishState()
  }, [publishState, telemetryKey])
}
