// Quest proof live screen — branches on the template's verifier:
//  • timed_sensor  (needsCapture=false): countdown, then submit with no media.
//  • capture_audit (needsCapture=true):  live camera overlay → upload + submit.
// Screen layer only: resolves the template view via a hook and drives mutations.
// On success, renders QuestResultBeat instead of navigating immediately (Task 8).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'

import { PressableScale } from '@/components/motion/PressableScale'
import { QuestCameraOverlay } from '@/components/quests/QuestCameraOverlay'
import { QuestResultBeat } from '@/components/quests/QuestResultBeat'
import { onAccent, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useAuth } from '@/hooks/useAuth'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useQuestProof } from '@/hooks/useQuestProof'
import { useQuestMediaDownload } from '@/hooks/useQuestMediaDownload'
import { useQuestTemplates } from '@/hooks/useQuestTemplates'
import { formatMmss } from '@/lib/quest-proof/formatDuration'
import { questErrorCode, questErrorMessageTH } from '@/lib/quest-proof/questProofErrors'
import { MAX_PROOF_CLIP_SECONDS } from '@/lib/quest-proof/recordingAutoStop'
import { persistQuestMedia } from '@/lib/quest-proof/questMediaStore'
import type { QuestMediaExt, QuestProofSession } from '@/lib/quest-proof/questProofTypes'
import { formatWatermarkTimestamp } from '@/lib/share/watermarkTimestamp'
import { useWatermarkedCapture } from '@/hooks/useWatermarkedCapture'

export default function QuestProofScreen() {
  const { sessionId, templateId } = useLocalSearchParams<{ sessionId: string; templateId?: string }>()
  const { user } = useAuth()
  const theme = useSportTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  const { data, isPending, isError: templatesIsError, error: templatesError, refetch: refetchTemplates } = useQuestTemplates()
  const { submitMutation, captureMutation } = useQuestProof(user?.id)
  const { saveToGallery, isSaving: isDownloading } = useQuestMediaDownload()
  const { track } = useAnalytics()

  const [error, setError] = useState<{ message: string; code?: string } | null>(null)
  const [resultSession, setResultSession] = useState<QuestProofSession | null>(null)
  // Local clip captured this session, kept so the result beat can offer a share.
  const [capturedMediaUri, setCapturedMediaUri] = useState<string | null>(null)
  const preparedMediaRef = useRef<{ rawUri: string; mediaExt: QuestMediaExt; uri: string } | null>(null)
  const confirmedRef = useRef(false)

  // Capture timestamp at screen-mount time (≈ moment recording starts after countdown).
  // Format DD/MM HH:mm — owned by the shared watermark util so on-screen HUD and the
  // baked watermark stay identical.
  const [timestampShort] = useState(() => formatWatermarkTimestamp(new Date()))

  // Bakes timestamp + Rally mark into the captured proof before upload/share.
  const view = data?.find((v) => v.templateId === templateId)
  const maxCaptureDurationSeconds = Math.max(1, view?.timeLimitSeconds ?? MAX_PROOF_CLIP_SECONDS)

  const watermark = useWatermarkedCapture({
    slot: { kind: 'timestamp', text: timestampShort },
    domain: 'quest',
    maxVideoDurationSeconds: maxCaptureDurationSeconds,
    requireWatermark: true,
  })
  const { watermarkPhoto, watermarkVideo, status: watermarkStatus } = watermark

  const prepareMedia = useCallback(async (fileUri: string, mediaExt: QuestMediaExt) => {
    const prepared = preparedMediaRef.current
    if (prepared?.rawUri === fileUri && prepared.mediaExt === mediaExt) return prepared.uri

    const exportedUri =
      mediaExt === 'jpg'
        ? await watermarkPhoto(fileUri)
        : await watermarkVideo(fileUri)
    const finalUri = persistQuestMedia(exportedUri, sessionId, mediaExt)

    preparedMediaRef.current = { rawUri: fileUri, mediaExt, uri: finalUri }
    if (mediaExt === 'mp4') setCapturedMediaUri(finalUri)
    return finalUri
  }, [sessionId, watermarkPhoto, watermarkVideo])

  const handleDownload = useCallback(async (fileUri: string, mediaExt: QuestMediaExt) => {
    const finalUri = await prepareMedia(fileUri, mediaExt)
    return saveToGallery(finalUri)
  }, [prepareMedia, saveToGallery])

  // ── Outcome handlers (shared by both branches) ───────────────────────────────
  function onMutationSuccess(session: QuestProofSession) {
    // Caches are already invalidated by the mutation hook (useQuestProof).
    // Capture the session so the result beat renders instead of the form.
    setResultSession(session)
  }
  function onMutationError(e: unknown) {
    confirmedRef.current = false
    setError({ message: questErrorMessageTH(e), code: questErrorCode(e) })
  }

  function restartFromDetail() {
    // Detail is now a popup on the hub — navigate back to the hub.
    router.replace('/quests')
  }

  // ── Result beat (replaces form/camera after a successful mutation) ──────────
  if (resultSession) {
    return (
      <QuestResultBeat
        session={resultSession}
        shareMediaUri={capturedMediaUri}
        onDownload={capturedMediaUri ? () => saveToGallery(capturedMediaUri) : undefined}
        isDownloading={isDownloading}
      />
    )
  }

  // ── Pending ──────────────────────────────────────────────────────────────────
  if (isPending) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <ActivityIndicator color={theme.orange} />
      </View>
    )
  }

  // ── Templates fetch error ────────────────────────────────────────────────────
  if (templatesIsError) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <Text style={[styles.message, { color: theme.ink }]}>{questErrorMessageTH(templatesError)}</Text>
        <PressableScale onPress={() => void refetchTemplates()} style={[styles.cta, { backgroundColor: theme.orange }]}>
          <Text style={[styles.ctaText, { color: onAccent(theme.orange) }]}>ลองใหม่</Text>
        </PressableScale>
        <Pressable onPress={() => router.replace('/quests')} style={styles.backLink}>
          <Text style={[styles.backText, { color: theme.inkSoft }]}>กลับหน้าเควส</Text>
        </Pressable>
      </View>
    )
  }

  // ── Not found (missing templateId or unknown template) ───────────────────────
  if (!view) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <Text style={[styles.message, { color: theme.ink }]}>ไม่พบเควสนี้</Text>
        <PressableScale onPress={() => router.replace('/quests')} style={[styles.cta, { backgroundColor: theme.orange }]}>
          <Text style={[styles.ctaText, { color: onAccent(theme.orange) }]}>กลับ</Text>
        </PressableScale>
      </View>
    )
  }

  // ── Error panel (shared) ─────────────────────────────────────────────────────
  if (error) {
    const expired = error.code === 'session_expired'
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <Text style={[styles.message, { color: theme.ink }]}>{error.message}</Text>
        {expired ? (
          <PressableScale onPress={restartFromDetail} style={[styles.cta, { backgroundColor: theme.orange }]}>
            <Text style={[styles.ctaText, { color: onAccent(theme.orange) }]}>เริ่มใหม่</Text>
          </PressableScale>
        ) : (
          <PressableScale onPress={() => setError(null)} style={[styles.cta, { backgroundColor: theme.orange }]}>
            <Text style={[styles.ctaText, { color: onAccent(theme.orange) }]}>ลองใหม่</Text>
          </PressableScale>
        )}
        <Pressable onPress={() => router.replace('/quests')} style={styles.backLink}>
          <Text style={[styles.backText, { color: theme.inkSoft }]}>กลับหน้าเควส</Text>
        </Pressable>
      </View>
    )
  }

  // ── Capture branch ───────────────────────────────────────────────────────────
  if (view.needsCapture) {
    if (captureMutation.isPending) {
      return <Submitting label="กำลังส่งหลักฐาน…" styles={styles} theme={theme} />
    }
    // Liveness: live-capture-only + on-screen timestamp + post-hoc admin review.
    // Server nonce is still generated/stored for session binding but no longer shown on-screen.
    return (
      <>
        {watermark.composerElement}
        <QuestCameraOverlay
          media={view.captureMedia ?? 'image'}
          questTitle={view.titleTH}
          slot={{ kind: 'timestamp', text: timestampShort }}
          onDownload={view.captureMedia === 'video' ? handleDownload : undefined}
          isDownloading={isDownloading}
          isProcessing={watermarkStatus === 'processing'}
          maxDurationSeconds={maxCaptureDurationSeconds}
          onConfirm={(fileUri, mediaExt) => {
            if (confirmedRef.current) return
            confirmedRef.current = true
            track({ name: 'quest_proof_capture_submitted', properties: { verifier: view.verifier } })
            void (async () => {
              try {
                const finalUri = await prepareMedia(fileUri, mediaExt)
                captureMutation.mutate(
                  { sessionId, fileUri: finalUri, mediaExt },
                  { onSuccess: (session) => onMutationSuccess(session), onError: onMutationError },
                )
              } catch (e) {
                // Watermark/export must never leave the capture screen inert.
                // Show the existing retry state and release the submit latch.
                onMutationError(e)
              }
            })()
          }}
          onCancel={restartFromDetail}
        />
      </>
    )
  }

  // ── Timed branch (timed_sensor) ──────────────────────────────────────────────
  return (
    <TimedProof
      sessionId={sessionId}
      timeLimitSeconds={view.timeLimitSeconds ?? 0}
      titleTH={view.titleTH}
      submitting={submitMutation.isPending}
      onFinish={() => {
        track({ name: 'quest_proof_capture_submitted', properties: { verifier: view.verifier } })
        submitMutation.mutate(
          { sessionId, hasMedia: false },
          { onSuccess: (session) => onMutationSuccess(session), onError: onMutationError },
        )
      }}
      styles={styles}
      theme={theme}
    />
  )
}

type TimedProofProps = {
  sessionId: string
  timeLimitSeconds: number
  titleTH: string
  submitting: boolean
  onFinish: () => void
  styles: ReturnType<typeof createStyles>
  theme: SportPalette
}

/** Counts down the practice window; auto-submits at zero or on the "จบ" tap. */
function TimedProof({ timeLimitSeconds, titleTH, submitting, onFinish, styles, theme }: TimedProofProps) {
  const [secondsLeft, setSecondsLeft] = useState(timeLimitSeconds)
  const finishedRef = useRef(false)

  // Latch onFinish in a ref so the countdown effect can call the latest version
  // without needing onFinish in its dep array — prevents interval restarts when
  // a background useQuestTemplates refetch hands a new onFinish identity.
  const onFinishRef = useRef(onFinish)
  useEffect(() => { onFinishRef.current = onFinish })

  useEffect(() => {
    if (timeLimitSeconds <= 0) return
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id)
          if (!finishedRef.current) {
            finishedRef.current = true
            onFinishRef.current()
          }
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [timeLimitSeconds])

  function finishNow() {
    if (finishedRef.current) return
    finishedRef.current = true
    onFinishRef.current()
  }

  if (submitting) {
    return <Submitting label="กำลังส่งผล…" styles={styles} theme={theme} />
  }

  return (
    <View style={[styles.center, { backgroundColor: theme.bg }]}>
      <Text style={[styles.timedTitle, { color: theme.inkSoft }]}>{titleTH}</Text>
      <Text style={[styles.clock, { color: theme.ink }]}>{formatMmss(secondsLeft)}</Text>
      <PressableScale onPress={finishNow} style={[styles.cta, { backgroundColor: theme.orange }]}>
        <Text style={[styles.ctaText, { color: onAccent(theme.orange) }]}>จบ</Text>
      </PressableScale>
    </View>
  )
}

function Submitting({
  label,
  styles,
  theme,
}: {
  label: string
  styles: ReturnType<typeof createStyles>
  theme: SportPalette
}) {
  return (
    <View style={[styles.center, { backgroundColor: theme.bg }]}>
      <ActivityIndicator color={theme.orange} />
      <Text style={[styles.message, { color: theme.inkSoft }]}>{label}</Text>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.lg,
      paddingHorizontal: Spacing.xl,
    },
    message: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
    timedTitle: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
    clock: { fontSize: 72, fontWeight: '900', letterSpacing: 2, fontVariant: ['tabular-nums'] },
    cta: {
      minWidth: 160,
      height: 52,
      borderRadius: Radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing.xl,
    },
    ctaText: { fontSize: 16, fontWeight: '900' },
    backLink: { paddingVertical: Spacing.sm },
    backText: { fontSize: 13, fontWeight: '600' },
  })
}
