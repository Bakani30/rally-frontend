// Native share for a completed quest-proof result.
// Opens the OS share sheet (react-native-share) so the player can post the clip
// or a caption to LINE, IG Story, X, or anywhere else the device offers.
// UI-agnostic: takes plain data, returns whether the sheet was acted on.
import { videoMimeTypeForUri } from '@/lib/share/videoFileType'

export type ShareQuestResultInput = {
  /** Local file:// URI of the recorded clip, when the proof captured media. */
  mediaUri?: string | null
  /** Caption shared alongside the clip (or on its own for media-less quests). */
  message: string
}

/**
 * Presents the native share sheet. Resolves `true` when the user completed a
 * share, `false` when they dismissed it. Never throws on user cancel so callers
 * can treat cancel as a no-op.
 */
export async function shareQuestResult({
  mediaUri,
  message,
}: ShareQuestResultInput): Promise<boolean> {
  try {
    const mod = await import('react-native-share') as {
      default?: { open: (options: Record<string, unknown>) => Promise<{ success?: boolean }> }
      open?: (options: Record<string, unknown>) => Promise<{ success?: boolean }>
    }
    const share = mod.default ?? (mod.open ? { open: mod.open } : null)
    if (!share) throw new Error('native_share_unavailable')
    const result = await share.open({
      message,
      // Attach the clip when present; a bare message still opens the full sheet.
      url: mediaUri ?? undefined,
      // Android and some iOS share targets otherwise receive an untyped local
      // file and render an empty share surface instead of a video attachment.
      type: mediaUri ? videoMimeTypeForUri(mediaUri) : undefined,
      failOnCancel: false,
    })
    return result?.success ?? false
  } catch {
    // react-native-share rejects on dismiss when failOnCancel is honoured by the
    // platform; treat any dismissal as a benign no-op.
    return false
  }
}
