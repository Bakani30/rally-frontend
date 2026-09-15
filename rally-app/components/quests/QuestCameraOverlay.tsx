// Live quest-proof capture overlay (react-native-vision-camera v4).
// Full-screen front camera with a 3-2-1 countdown, scoreboard HUD banner,
// NO on-screen nonce (liveness = live-capture-only + on-screen timestamp + admin review),
// and local retake — nothing uploads to Rally until the user taps "ยืนยันส่ง".
// Pure presentation: receives media mode + data slot + quest title;
// hands back a local file URI.
import { useEffect, useMemo, useRef, useState } from 'react'
import { AppState, Image, Linking, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useMicrophonePermission,
} from 'react-native-vision-camera'

import { PressableScale } from '@/components/motion/PressableScale'
import { QuestCameraPermissionPanel } from '@/components/quests/QuestCameraPermissionPanel'
import { QuestVideoReplay } from '@/components/quests/QuestVideoReplay'
import { CaptureWatermarkBoard, type DataSlot } from '@/components/share/CaptureWatermarkBoard'
import { onAccent, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { MAX_PROOF_CLIP_SECONDS, shouldAutoStopRecording } from '@/lib/quest-proof/recordingAutoStop'
import type { QuestMediaExt } from '@/lib/quest-proof/questProofTypes'
import { toLocalFileUri } from '@/lib/share/localFileUri'

export type { DataSlot } from '@/components/share/CaptureWatermarkBoard'

type QuestCameraOverlayProps = {
  media: 'video' | 'image'
  /** Quest title displayed while the camera is ready and during countdown. */
  questTitle: string
  /**
   * Flexible HUD centre slot.
   * Phase A: { kind: 'timestamp', text: 'DD/MM HH:mm' }
   * Phase B: { kind: 'count', made: 2, target: 5 } — no layout change needed.
   */
  slot: DataSlot
  onConfirm: (fileUri: string, mediaExt: QuestMediaExt) => void
  onDownload?: (fileUri: string, mediaExt: QuestMediaExt) => Promise<boolean> | boolean
  isDownloading?: boolean
  /** True while watermark composition/export is preparing the file. */
  isProcessing?: boolean
  /** Maximum recording length supplied by the active quest template. */
  maxDurationSeconds?: number
  onCancel: () => void
}

type LocalCapture = { uri: string; ext: QuestMediaExt }
type CapturePhase = 'ready' | 'countdown' | 'live'

/** Lime ring / timestamp colour (running accent). */
const LIME_RING = '#CEF17B'

/** Live camera capture with countdown, scoreboard HUD, local retake, and a confirm gate. */
export function QuestCameraOverlay({
  media,
  questTitle,
  slot,
  onConfirm,
  onDownload,
  isDownloading = false,
  isProcessing = false,
  maxDurationSeconds = MAX_PROOF_CLIP_SECONDS,
  onCancel,
}: QuestCameraOverlayProps) {
  const theme = useSportTheme()
  const insets = useSafeAreaInsets()
  const styles = useMemo(() => createStyles(theme), [theme])

  const [cameraPosition, setCameraPosition] = useState<'front' | 'back'>('front')
  const device = useCameraDevice(cameraPosition)
  const camera = useCameraPermission()
  const microphone = useMicrophonePermission()
  const needsMic = media === 'video'
  // The live camera is usable only once permission is granted and a device is
  // resolved. The countdown must not run until then, otherwise on the first
  // capture it ticks to 0 behind the permission prompt and dead-ends the screen.
  const ready = camera.hasPermission && device != null && (!needsMic || microphone.hasPermission)

  const cameraRef = useRef<Camera>(null)
  const askedRef = useRef(false)
  // Ref-latch for handleStartRecording so the countdown effect can always call
  // the latest version without needing it as a dep (prevents effect restarts).
  const handleStartRecordingRef = useRef<() => void>(() => {})
  // Ref-latch for handleStopRecording so the auto-stop effect calls the latest
  // version without needing it as a dep (prevents effect restarts).
  const handleStopRecordingRef = useRef<() => void>(() => {})
  // Guards the 60s auto-stop so it requests stopRecording() at most once per
  // session — isRecording only flips false async after the native stop
  // settles, so without this the effect can re-fire on the next tick and
  // call stopRecording() a second time while the first is still in flight.
  const autoStoppedRef = useRef(false)

  // Opening the camera must not start a recording. Video enters the countdown
  // only after the player explicitly presses the record control.
  const [phase, setPhase] = useState<CapturePhase>('ready')
  const [countdownNum, setCountdownNum] = useState(3)
  const [local, setLocal] = useState<LocalCapture | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [captureError, setCaptureError] = useState<string | null>(null)
  const [recordingSeconds, setRecordingSeconds] = useState(0)

  // Keep isRecording in a ref for the unmount-stop cleanup (avoids stale closure).
  const isRecordingRef = useRef(false)
  useEffect(() => {
    isRecordingRef.current = isRecording
  }, [isRecording])

  // Stop any in-flight recording on unmount to avoid orphaned temp clips and
  // setState-on-unmounted-component warnings from onRecordingError.
  useEffect(
    () => () => {
      if (isRecordingRef.current) {
        void cameraRef.current?.stopRecording()
      }
    },
    [],
  )

  // Request permissions on mount; re-check when the app is foregrounded.
  const requestCamera = camera.requestPermission
  const requestMic = microphone.requestPermission
  useEffect(() => {
    const ensure = () => {
      if (!camera.hasPermission) void requestCamera()
      if (needsMic && !microphone.hasPermission) void requestMic()
    }
    if (!askedRef.current) {
      askedRef.current = true
      ensure()
    }
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') ensure()
    })
    return () => sub.remove()
  }, [camera.hasPermission, microphone.hasPermission, needsMic, requestCamera, requestMic])

  // Recording elapsed-seconds timer; resets to 0 whenever recording stops.
  useEffect(() => {
    if (!isRecording) {
      setRecordingSeconds(0)
      return
    }
    const id = setInterval(() => setRecordingSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [isRecording])

  // Stop at the active quest's limit so the recorded clip matches the
  // requirement shown in the quest template.
  useEffect(() => {
    if (!autoStoppedRef.current && shouldAutoStopRecording(recordingSeconds, isRecording, maxDurationSeconds)) {
      autoStoppedRef.current = true
      handleStopRecordingRef.current()
    }
  }, [recordingSeconds, isRecording, maxDurationSeconds])

  // 3-2-1 countdown: only runs after the player starts a video capture and once
  // the camera is ready. handleStartRecordingRef is synced below (after the
  // function definition) so the effect always calls the latest version.
  useEffect(() => {
    if (!ready) return
    if (phase !== 'countdown') return
    if (countdownNum <= 0) {
      setPhase('live')
      handleStartRecordingRef.current()
      return
    }
    const id = setTimeout(() => setCountdownNum((n) => n - 1), 1000)
    return () => clearTimeout(id)
  }, [ready, phase, countdownNum, media])

  // ── Permission gates ─────────────────────────────────────────────────────────
  if (!camera.hasPermission) {
    return (
      <QuestCameraPermissionPanel
        topInset={insets.top}
        message="ต้องอนุญาตให้ใช้กล้องเพื่อถ่ายหลักฐาน"
        onSettings={() => void Linking.openSettings()}
        onRetry={() => void requestCamera()}
        onCancel={onCancel}
      />
    )
  }

  if (needsMic && !microphone.hasPermission) {
    return (
      <QuestCameraPermissionPanel
        topInset={insets.top}
        message="ต้องอนุญาตให้ใช้ไมค์เพื่ออัดคลิปหลักฐาน"
        onSettings={() => void Linking.openSettings()}
        onRetry={() => void microphone.requestPermission()}
        onCancel={onCancel}
      />
    )
  }

  if (device == null) {
    return (
      <QuestCameraPermissionPanel
        topInset={insets.top}
        message="ไม่พบกล้องบนอุปกรณ์นี้"
        onCancel={onCancel}
      />
    )
  }

  // ── Event handlers ───────────────────────────────────────────────────────────
  async function handleTakePhoto() {
    if (isProcessing || isDownloading || phase !== 'ready') return
    setCaptureError(null)
    try {
      const photo = await cameraRef.current?.takePhoto()
      if (photo) setLocal({ uri: toLocalFileUri(photo.path), ext: 'jpg' })
    } catch {
      setCaptureError('ถ่ายภาพไม่สำเร็จ ลองใหม่')
    }
  }

  function handleStartRecording() {
    if (isRecording || local != null || isProcessing || isDownloading) return
    setCaptureError(null)
    autoStoppedRef.current = false
    setIsRecording(true)
    cameraRef.current?.startRecording({
      // Vision Camera defaults to .mov on both platforms. The quest-proof
      // contract accepts video/mp4, so keep the bytes and mediaExt aligned.
      fileType: 'mp4',
      onRecordingFinished: (video) => {
        setIsRecording(false)
        setLocal({ uri: toLocalFileUri(video.path), ext: 'mp4' })
      },
      onRecordingError: () => {
        setIsRecording(false)
        setCaptureError('อัดคลิปไม่สำเร็จ ลองใหม่')
      },
    })
  }

  // Sync ref with the latest handleStartRecording so the countdown effect can
  // call it without it being a dep (prevents the effect from restarting).
  handleStartRecordingRef.current = handleStartRecording

  function handleBeginVideoCapture() {
    if (phase !== 'ready' || isProcessing || isDownloading) return
    setCaptureError(null)
    setCountdownNum(3)
    setPhase('countdown')
  }

  async function handleStopRecording() {
    try {
      await cameraRef.current?.stopRecording()
    } catch {
      setIsRecording(false)
      setCaptureError('หยุดอัดไม่สำเร็จ ลองใหม่')
    }
  }

  // Sync ref with the latest handleStopRecording so the auto-stop effect can
  // call it without it being a dep (prevents the effect from restarting).
  handleStopRecordingRef.current = handleStopRecording

  function handleToggleCamera() {
    if (isRecording || local != null) return
    setCameraPosition((current) => (current === 'front' ? 'back' : 'front'))
  }

  async function handleDownload() {
    if (!local || local.ext !== 'mp4' || !onDownload || isDownloading || isProcessing) return
    setCaptureError(null)
    try {
      const saved = await onDownload(local.uri, local.ext)
      if (!saved) setCaptureError('บันทึกวิดีโอไม่สำเร็จ ลองใหม่')
    } catch {
      setCaptureError('บันทึกวิดีโอไม่สำเร็จ ลองใหม่')
    }
  }

  function handleRetake() {
    if (isProcessing || isDownloading) return
    setLocal(null)
    setCaptureError(null)
    setCountdownNum(3)
    setPhase('ready')
  }

  const inPreview = local != null

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      {/* Live camera — stays active until a capture is taken / stopped. */}
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={!inPreview}
        photo={media === 'image'}
        video={media === 'video'}
        audio={needsMic && microphone.hasPermission}
      />

      {/* Image / video preview overlays the live feed after capture. */}
      {inPreview && local.ext === 'jpg' && (
        <Image source={{ uri: local.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      )}
      {inPreview && local.ext === 'mp4' && <QuestVideoReplay uri={local.uri} watermarkSlot={slot} />}

      {phase === 'ready' && !inPreview && (
        <View style={styles.readyOverlay} pointerEvents="none">
          <Text style={styles.readyTitle}>{questTitle}</Text>
          <Text style={styles.readyHint}>
            {media === 'video' ? 'กดปุ่มแดงเพื่อเริ่มอัด' : 'กดปุ่มเพื่อถ่ายภาพ'}
          </Text>
        </View>
      )}

      {/* 3-2-1 countdown overlay — visible only after the player starts video. */}
      {phase === 'countdown' && !inPreview && (
        <View style={styles.countdownOverlay}>
          <View style={styles.countdownRing}>
            <Text style={styles.countdownNum}>{countdownNum}</Text>
          </View>
          <Text style={styles.countdownTitle}>{questTitle}</Text>
          <Text style={styles.countdownHint}>เตรียมตัว… กำลังเริ่มอัด</Text>
        </View>
      )}

      {/* Floating watermark board — live phase, before capture. The SAME board
          that gets baked into shared/saved media; here we pass `rec` so the live
          REC dot + elapsed timer render. No visual change vs. before. */}
      {phase === 'live' && !inPreview && (
        <View style={[styles.statusStrip, { top: insets.top + Spacing.xs }]}>
          <CaptureWatermarkBoard slot={slot} rec={{ seconds: recordingSeconds }} />
        </View>
      )}

      {captureError != null && (
        <View style={[styles.errorBanner, { bottom: insets.bottom + 140 }]}>
          <Text style={styles.errorText}>{captureError}</Text>
        </View>
      )}

      {!inPreview && !isRecording && (
        <PressableScale
          onPress={handleToggleCamera}
          style={[styles.cameraSwitchBtn, { top: insets.top + Spacing.lg }]}
          accessibilityRole="button"
          accessibilityLabel="สลับกล้อง"
        >
          <Text style={styles.cameraSwitchIcon}>↻</Text>
        </PressableScale>
      )}

      {/* Controls stay visible while ready so the player controls when capture begins. */}
      {(phase === 'ready' || phase === 'live' || inPreview) && (
        <View style={[styles.controls, { paddingBottom: insets.bottom + Spacing.xl }]}>
          {inPreview ? (
            <View style={styles.previewRow}>
              <PressableScale
                onPress={handleRetake}
                style={[styles.pillBtn, styles.retakeBtn]}
                disabled={isProcessing || isDownloading}
              >
                <Text style={[styles.pillText, styles.retakeText]}>ถ่ายใหม่</Text>
              </PressableScale>
              {media === 'video' && onDownload && (
                <PressableScale
                  onPress={() => void handleDownload()}
                  style={[styles.pillBtn, styles.downloadBtn]}
                  disabled={isDownloading || isProcessing}
                  accessibilityRole="button"
                  accessibilityLabel="ดาวน์โหลด"
                >
                  <Text style={[styles.pillText, styles.downloadText]}>
                    {isProcessing ? 'กำลังเตรียม…' : isDownloading ? 'กำลังบันทึก…' : 'บันทึกวิดีโอ'}
                  </Text>
                </PressableScale>
              )}
              <PressableScale
                onPress={() => onConfirm(local.uri, local.ext)}
                style={[styles.pillBtn, { backgroundColor: theme.actionAccept }]}
                disabled={isProcessing || isDownloading}
              >
                <Text style={[styles.pillText, { color: onAccent(theme.actionAccept) }]}>
                  {isProcessing ? 'กำลังเตรียม…' : 'ยืนยันส่ง'}
                </Text>
              </PressableScale>
            </View>
          ) : phase === 'ready' && media === 'video' ? (
            <PressableScale
              onPress={handleBeginVideoCapture}
              style={styles.shutterOuter}
              accessibilityRole="button"
              accessibilityLabel="เริ่มอัดวิดีโอ"
            >
              <View style={styles.recInner} />
            </PressableScale>
          ) : media === 'image' ? (
            <PressableScale
              onPress={handleTakePhoto}
              style={styles.shutterOuter}
              accessibilityRole="button"
              accessibilityLabel="ถ่ายภาพ"
            >
              <View style={styles.shutterInner} />
            </PressableScale>
          ) : isRecording ? (
            <PressableScale onPress={handleStopRecording} style={styles.shutterOuter}>
              <View style={styles.stopInner} />
            </PressableScale>
          ) : (
            // Video, live but not yet recording — manual retry if native start
            // missed after the countdown.
            <PressableScale onPress={handleStartRecording} style={styles.shutterOuter}>
              <View style={styles.recInner} />
            </PressableScale>
          )}
        </View>
      )}

      {/* Exit button — moved to the bottom-left, alongside the stop/record
          control. Hidden in preview, where ถ่ายใหม่ already serves as go-back. */}
      {!inPreview && (
        <PressableScale
          onPress={onCancel}
          style={[styles.exitBtn, { bottom: insets.bottom + Spacing.xl }]}
          accessibilityLabel="ออก"
        >
          <Text style={styles.exitIcon}>✕</Text>
          <Text style={styles.exitLabel}>ออก</Text>
        </PressableScale>
      )}
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: '#000' },

    // ── Ready state ──────────────────────────────────────────────────────────
    readyOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing.xl,
      backgroundColor: 'rgba(8,10,14,0.18)',
    },
    readyTitle: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '900',
      textAlign: 'center',
      textShadowColor: 'rgba(0,0,0,0.85)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    readyHint: {
      marginTop: 8,
      color: 'rgba(255,255,255,0.82)',
      fontSize: 14,
      fontWeight: '700',
      textAlign: 'center',
      textShadowColor: 'rgba(0,0,0,0.85)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },

    // ── Countdown overlay ─────────────────────────────────────────────────────
    countdownOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(8,10,14,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    countdownRing: {
      width: 130,
      height: 130,
      borderRadius: 65,
      borderWidth: 6,
      borderColor: LIME_RING,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: LIME_RING,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.35,
      shadowRadius: 20,
    },
    countdownNum: {
      fontSize: 68,
      fontWeight: '900',
      fontStyle: 'italic',
      color: '#fff',
    },
    countdownTitle: {
      marginTop: 16,
      fontSize: 16,
      fontWeight: '900',
      color: '#fff',
      textAlign: 'center',
      paddingHorizontal: Spacing.xl,
    },
    countdownHint: {
      marginTop: 6,
      fontSize: 12,
      fontWeight: '700',
      color: 'rgba(255,255,255,0.7)',
    },
    exitBtn: {
      position: 'absolute',
      left: Spacing.lg,
      height: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: Radius.pill,
      backgroundColor: 'rgba(0,0,0,0.55)',
      paddingHorizontal: Spacing.md,
    },
    exitIcon: { color: '#fff', fontSize: 18, fontWeight: '800' },
    exitLabel: { color: '#fff', fontSize: 14, fontWeight: '800' },

    // ── Floating watermark board wrapper (positioning only) ────────────────────
    statusStrip: {
      position: 'absolute',
      left: Spacing.lg,
      right: Spacing.lg,
    },

    // ── Error banner ──────────────────────────────────────────────────────────
    errorBanner: {
      position: 'absolute',
      alignSelf: 'center',
      backgroundColor: theme.redVivid,
      borderRadius: Radius.pill,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
    },
    errorText: { color: '#fff', fontSize: 13, fontWeight: '700' },

    cameraSwitchBtn: {
      position: 'absolute',
      right: Spacing.lg,
      width: 44,
      height: 44,
      borderRadius: Radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    cameraSwitchIcon: { color: '#fff', fontSize: 22, fontWeight: '900' },

    // ── Capture controls ──────────────────────────────────────────────────────
    controls: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      gap: Spacing.md,
    },
    // ~50 px diameter record / stop / shutter button (reduced from 76 px).
    shutterOuter: {
      width: 50,
      height: 50,
      borderRadius: Radius.pill,
      borderWidth: 3,
      borderColor: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
    },
    shutterInner: {
      width: 38,
      height: 38,
      borderRadius: Radius.pill,
      backgroundColor: '#fff',
    },
    stopInner: {
      width: 20,
      height: 20,
      borderRadius: Radius.sm,
      backgroundColor: theme.redVivid,
    },
    recInner: {
      width: 38,
      height: 38,
      borderRadius: Radius.pill,
      backgroundColor: theme.redVivid,
    },
    previewRow: { flexDirection: 'row', gap: Spacing.sm, width: '100%', paddingHorizontal: Spacing.md },
    pillBtn: {
      flex: 1,
      height: 52,
      borderRadius: Radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing.sm,
    },
    // Restart/retake button — solid black surface with light label.
    retakeBtn: { backgroundColor: '#161616' },
    retakeText: { color: '#fff' },
    downloadBtn: { backgroundColor: theme.blue },
    downloadText: { color: onAccent(theme.blue) },
    pillText: { fontSize: 16, fontWeight: '900' },
  })
}
