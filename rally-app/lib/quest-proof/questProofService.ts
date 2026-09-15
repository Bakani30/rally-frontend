// Quest Proof service — input guards + orchestration over the repository.
// Pure business logic: no React, no Expo, no UI.
import {
  requestUpload,
  startSession,
  submitSession,
  uploadToSignedUrl,
} from './questProofRepository'
import type {
  QuestMediaExt,
  QuestProofSession,
  QuestUploadContentType,
  SignedUploadTarget,
  SubmitQuestProofInput,
} from './questProofTypes'

export function startQuestSession(templateId: string): Promise<QuestProofSession> {
  if (!templateId) throw new Error('templateId required')
  return startSession(templateId)
}

export function requestQuestUpload(
  sessionId: string,
  contentType: QuestUploadContentType,
): Promise<SignedUploadTarget> {
  if (!sessionId) throw new Error('sessionId required')
  return requestUpload(sessionId, contentType)
}

export function submitQuestProof(input: SubmitQuestProofInput): Promise<QuestProofSession> {
  if (!input.sessionId) throw new Error('sessionId required')
  if (input.hasMedia && !input.mediaExt) throw new Error('mediaExt required when hasMedia')
  return submitSession(input)
}

function contentTypeFor(ext: QuestMediaExt): QuestUploadContentType {
  return ext === 'mp4' ? 'video/mp4' : 'image/jpeg'
}

/**
 * Full capture commit for capture_audit quests: request a signed URL → PUT the
 * recorded file → submit. The three-step sequence the capture screen invokes on
 * "ยืนยันส่ง". Throws (with edge code preserved) on any step.
 */
export async function uploadAndSubmitCapture(params: {
  sessionId: string
  fileUri: string
  mediaExt: QuestMediaExt
  sensorSummary?: Record<string, unknown>
}): Promise<QuestProofSession> {
  if (!params.sessionId) throw new Error('sessionId required')
  if (!params.fileUri) throw new Error('fileUri required')
  const contentType = contentTypeFor(params.mediaExt)
  const target = await requestQuestUpload(params.sessionId, contentType)
  await uploadToSignedUrl(target.signedUrl, params.fileUri, contentType)
  return submitQuestProof({
    sessionId: params.sessionId,
    sensorSummary: params.sensorSummary ?? {},
    hasMedia: true,
    mediaExt: params.mediaExt,
  })
}
