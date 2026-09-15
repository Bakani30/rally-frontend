// Quest Proof repository — edge-function access only (no business rules, no UI).
// Mirrors lib/challenges/challengeRepository.ts: invoke + extractEdgeFunctionError.
import { extractEdgeFunctionError } from '@/lib/supabase/edgeError'
import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'
import type {
  QuestProofSession,
  QuestUploadContentType,
  SignedUploadTarget,
  SubmitQuestProofInput,
} from './questProofTypes'

/** Start (or resume) a proof session for a startable template (timed_sensor / capture_audit). */
export async function startSession(templateId: string): Promise<QuestProofSession> {
  const { data, error } = await invokeAuthenticatedFunction<QuestProofSession>('quest-proof', {
    body: { action: 'start', templateId },
  })
  if (error) throw await extractEdgeFunctionError(error, 'เริ่มเควสไม่ได้ ลองใหม่')
  if (!data) throw new Error('quest-proof/start returned no data')
  return data
}

/** Request a signed upload URL for the capture media (server derives the storage path). */
export async function requestUpload(
  sessionId: string,
  contentType: QuestUploadContentType,
): Promise<SignedUploadTarget> {
  const { data, error } = await invokeAuthenticatedFunction<SignedUploadTarget>('quest-proof', {
    body: { action: 'request_upload', sessionId, contentType },
  })
  if (error) throw await extractEdgeFunctionError(error, 'ขอที่อัปโหลดไม่ได้ ลองใหม่')
  if (!data) throw new Error('quest-proof/request_upload returned no data')
  return data
}

/** Submit a proof session. Capture quests grant instantly; timed quests pass/fail inline. */
export async function submitSession(input: SubmitQuestProofInput): Promise<QuestProofSession> {
  const { data, error } = await invokeAuthenticatedFunction<QuestProofSession>('quest-proof', {
    body: {
      action: 'submit',
      sessionId: input.sessionId,
      sensorSummary: input.sensorSummary ?? {},
      hasMedia: input.hasMedia,
      mediaExt: input.mediaExt ?? null,
    },
  })
  if (error) throw await extractEdgeFunctionError(error, 'ส่งหลักฐานไม่ได้ ลองใหม่')
  if (!data) throw new Error('quest-proof/submit returned no data')
  return data
}

/**
 * Upload a local file (file:// uri) to a Supabase signed upload URL via PUT.
 * The quest-proof bucket uses server-derived paths, so the client only PUTs bytes —
 * kept separate from lib/match/proofUploadService (different path-ownership model).
 * React Native's Blob from fetch(file://…) can produce malformed Storage bodies;
 * read raw bytes through Expo FileSystem instead.
 */
export async function uploadToSignedUrl(
  signedUrl: string,
  uri: string,
  contentType: QuestUploadContentType,
): Promise<void> {
  const { File } = await import('expo-file-system')
  let bytes: Uint8Array
  try {
    bytes = await new File(uri).bytes()
  } catch {
    throw new Error('อ่านไฟล์ไม่ได้')
  }
  const putResponse = await fetch(signedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    // React Native fetch accepts the byte view at runtime; the DOM typings do
    // not include Uint8Array in BodyInit, so keep the boundary cast local.
    body: bytes as unknown as BodyInit,
  })
  if (!putResponse.ok) {
    throw new Error(`อัปโหลดไม่สำเร็จ (${putResponse.status})`)
  }
}
