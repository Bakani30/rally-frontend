import { useMutation, useQueryClient } from '@tanstack/react-query'

import { isQuestStartRetryable } from '@/lib/quest-proof/questProofErrors'
import { questProofQueryKeys } from '@/lib/quest-proof/questProofQueryKeys'
import {
  requestQuestUpload,
  startQuestSession,
  submitQuestProof,
  uploadAndSubmitCapture,
} from '@/lib/quest-proof/questProofService'
import type {
  QuestMediaExt,
  QuestProofSession,
  QuestUploadContentType,
  SignedUploadTarget,
  SubmitQuestProofInput,
} from '@/lib/quest-proof/questProofTypes'

/** Mutations for the quest proof flow: start / request upload / submit / capture commit. */
export function useQuestProof(userId?: string) {
  const qc = useQueryClient()

  const invalidateAfterGrant = () => {
    qc.invalidateQueries({ queryKey: ['wallet-summary'] })
    qc.invalidateQueries({ queryKey: questProofQueryKeys.sessions(userId) })
    qc.invalidateQueries({ queryKey: questProofQueryKeys.templates() })
  }

  const startMutation = useMutation<QuestProofSession, Error, string>({
    mutationFn: (templateId) => startQuestSession(templateId),
    // One automatic retry on transient failures (server 5xx / network send
    // failure) — starts are free until granted, so a duplicate is harmless.
    retry: (failureCount, error) => failureCount < 1 && isQuestStartRetryable(error),
  })

  const requestUploadMutation = useMutation<
    SignedUploadTarget,
    Error,
    { sessionId: string; contentType: QuestUploadContentType }
  >({
    mutationFn: ({ sessionId, contentType }) => requestQuestUpload(sessionId, contentType),
  })

  const submitMutation = useMutation<QuestProofSession, Error, SubmitQuestProofInput>({
    mutationFn: (input) => submitQuestProof(input),
    onSuccess: invalidateAfterGrant,
  })

  const captureMutation = useMutation<
    QuestProofSession,
    Error,
    { sessionId: string; fileUri: string; mediaExt: QuestMediaExt; sensorSummary?: Record<string, unknown> }
  >({
    mutationFn: (params) => uploadAndSubmitCapture(params),
    onSuccess: invalidateAfterGrant,
  })

  return { startMutation, requestUploadMutation, submitMutation, captureMutation }
}
