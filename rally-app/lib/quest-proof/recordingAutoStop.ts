// Pure decision helper for the default proof-clip cap. Capture quests can pass
// their template-specific time limit so the recording does not end early.
export const MAX_PROOF_CLIP_SECONDS = 60

export function shouldAutoStopRecording(
  recordingSeconds: number,
  isRecording: boolean,
  maxDurationSeconds = MAX_PROOF_CLIP_SECONDS,
): boolean {
  return isRecording && maxDurationSeconds > 0 && recordingSeconds >= maxDurationSeconds
}
