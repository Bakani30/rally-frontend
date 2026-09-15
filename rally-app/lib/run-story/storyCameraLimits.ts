// Pure limits for the in-app story camera's video capture (RunStoryCameraSheet).
// Kept separate from the component so the cap is unit-testable without
// mounting react-native-vision-camera.

export const MAX_STORY_VIDEO_RECORD_SECONDS = 15

/** True once a press-to-record clip has hit (or passed) the max length and should auto-stop. */
export function hasReachedMaxRecordSeconds(
  elapsedSeconds: number,
  maxSeconds: number = MAX_STORY_VIDEO_RECORD_SECONDS,
): boolean {
  return elapsedSeconds >= maxSeconds
}
