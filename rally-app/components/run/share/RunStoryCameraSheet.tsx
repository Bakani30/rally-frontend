// In-app story camera: full-screen modal with a photo/video toggle and a
// front/back flip, replacing the broken launchCameraAsync picker path on the
// run-story share screen. Adapted from components/quests/QuestCameraOverlay.tsx
// (react-native-vision-camera v4 patterns) — simpler here because there is no
// countdown/HUD/data-slot, just capture-then-hand-back-a-local-uri.
import { useEffect, useMemo, useRef, useState } from 'react'
import { AppState, Image, Modal, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useMicrophonePermission,
} from 'react-native-vision-camera'

import { PressableScale } from '@/components/motion/PressableScale'
import { QuestCameraPermissionPanel } from '@/components/quests/QuestCameraPermissionPanel'
import { QuestVideoReplay } from '@/components/quests/QuestVideoReplay'
import { createRunStoryCameraSheetStyles } from '@/components/run/share/runStoryCameraSheetStyles'
import { onAccent, Spacing } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { openAppSettings } from '@/lib/permissions/appSettings'
import { formatMmss } from '@/lib/quest-proof/formatDuration'
import { hasReachedMaxRecordSeconds, MAX_STORY_VIDEO_RECORD_SECONDS } from '@/lib/run-story/storyCameraLimits'
import { toLocalFileUri } from '@/lib/share/localFileUri'

export type RunStoryCapturedAsset = { uri: string; kind: 'photo' | 'video' }

export type RunStoryCameraSheetProps = {
  visible: boolean
  onClose: () => void
  onCaptured: (asset: RunStoryCapturedAsset) => void
}

type CameraPosition = 'back' | 'front'
type CaptureMode = 'photo' | 'video'

/** Full-screen in-app camera for the run-story background: photo/video toggle + front/back flip. */
export function RunStoryCameraSheet({ visible, onClose, onCaptured }: RunStoryCameraSheetProps) {
  if (!visible) return null
  return <RunStoryCameraSheetContent onClose={onClose} onCaptured={onCaptured} />
}

function RunStoryCameraSheetContent({
  onClose,
  onCaptured,
}: Omit<RunStoryCameraSheetProps, 'visible'>) {
  const theme = useSportTheme()
  const insets = useSafeAreaInsets()
  const styles = useMemo(() => createRunStoryCameraSheetStyles(theme), [theme])

  const [position, setPosition] = useState<CameraPosition>('back')
  const [mode, setMode] = useState<CaptureMode>('photo')
  const device = useCameraDevice(position)
  const camera = useCameraPermission()
  const microphone = useMicrophonePermission()
  const needsMic = mode === 'video'
  const ready = camera.hasPermission && device != null && (!needsMic || microphone.hasPermission)

  const cameraRef = useRef<Camera>(null)
  const askedRef = useRef(false)
  const isRecordingRef = useRef(false)
  const [local, setLocal] = useState<RunStoryCapturedAsset | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [captureError, setCaptureError] = useState<string | null>(null)
  const [recordingSeconds, setRecordingSeconds] = useState(0)

  useEffect(() => {
    isRecordingRef.current = isRecording
  }, [isRecording])

  // Stop any in-flight recording on unmount to avoid orphaned temp clips.
  useEffect(
    () => () => {
      if (isRecordingRef.current) void cameraRef.current?.stopRecording()
    },
    [],
  )

  // Request permissions on mount; re-check when the app is foregrounded (the
  // OS permission dialog can only pop once, so this catches a Settings grant).
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

  // Recording elapsed-seconds timer; auto-stops at the max clip length.
  useEffect(() => {
    if (!isRecording) {
      setRecordingSeconds(0)
      return
    }
    const id = setInterval(() => setRecordingSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [isRecording])

  useEffect(() => {
    if (isRecording && hasReachedMaxRecordSeconds(recordingSeconds)) {
      void handleStopRecording()
    }
  }, [isRecording, recordingSeconds])

  function handleFlip() {
    // Same guard as the mode toggle: swapping the camera device mid-recording
    // tears down the vision-camera session and kills the in-flight clip.
    if (isRecording) return
    setPosition((p) => (p === 'back' ? 'front' : 'back'))
  }

  function handleModeChange(next: CaptureMode) {
    if (isRecording) return
    setMode(next)
  }

  async function handleTakePhoto() {
    setCaptureError(null)
    try {
      const photo = await cameraRef.current?.takePhoto()
      if (photo) setLocal({ uri: toLocalFileUri(photo.path), kind: 'photo' })
    } catch {
      setCaptureError('ถ่ายภาพไม่สำเร็จ ลองใหม่')
    }
  }

  function handleStartRecording() {
    setCaptureError(null)
    setIsRecording(true)
    cameraRef.current?.startRecording({
      // Keep the captured background portable across iOS/Android. Vision
      // Camera's default is .mov, while the story export/upload path is mp4.
      fileType: 'mp4',
      onRecordingFinished: (video) => {
        setIsRecording(false)
        setLocal({ uri: toLocalFileUri(video.path), kind: 'video' })
      },
      onRecordingError: () => {
        setIsRecording(false)
        setCaptureError('อัดคลิปไม่สำเร็จ ลองใหม่')
      },
    })
  }

  async function handleStopRecording() {
    try {
      await cameraRef.current?.stopRecording()
    } catch {
      setIsRecording(false)
      setCaptureError('หยุดอัดไม่สำเร็จ ลองใหม่')
    }
  }

  function handleRetake() {
    setLocal(null)
    setCaptureError(null)
  }

  function handleUse() {
    if (!local) return
    onCaptured(local)
  }

  const inPreview = local != null

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={styles.root}>
        {!camera.hasPermission ? (
          <QuestCameraPermissionPanel
            topInset={insets.top}
            message="ต้องอนุญาตให้ใช้กล้องเพื่อถ่ายพื้นหลังสตอรี่"
            onSettings={() => void openAppSettings()}
            onRetry={() => void requestCamera()}
            onCancel={onClose}
          />
        ) : needsMic && !microphone.hasPermission ? (
          <QuestCameraPermissionPanel
            topInset={insets.top}
            message="ต้องอนุญาตให้ใช้ไมค์เพื่ออัดคลิปสตอรี่"
            onSettings={() => void openAppSettings()}
            onRetry={() => void requestMic()}
            onCancel={onClose}
          />
        ) : device == null ? (
          <QuestCameraPermissionPanel
            topInset={insets.top}
            message="ไม่พบกล้องบนอุปกรณ์นี้"
            onCancel={onClose}
          />
        ) : (
          <>
            <Camera
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={ready && !inPreview}
              photo={mode === 'photo'}
              video={mode === 'video'}
              audio={needsMic && microphone.hasPermission}
            />

            {inPreview && <RunStoryCapturePreview asset={local} />}

            {/* Top row: exit (left) + flip (right) — hidden once in preview. */}
            {!inPreview && (
              <View style={[styles.topRow, { top: insets.top + Spacing.sm }]}>
                <PressableScale onPress={onClose} style={styles.roundBtn} accessibilityLabel="ปิดกล้อง">
                  <MaterialCommunityIcons name="close" size={20} color="#fff" />
                </PressableScale>
                <PressableScale onPress={handleFlip} style={styles.roundBtn} accessibilityLabel="สลับกล้องหน้า-หลัง">
                  <MaterialCommunityIcons name="camera-flip-outline" size={20} color="#fff" />
                </PressableScale>
              </View>
            )}

            {isRecording && !inPreview && (
              <View style={[styles.recStrip, { top: insets.top + Spacing.sm }]}>
                <View style={styles.recDot} />
                <Text style={styles.recTimer}>
                  {formatMmss(recordingSeconds)} / {formatMmss(MAX_STORY_VIDEO_RECORD_SECONDS)}
                </Text>
              </View>
            )}

            {captureError != null && (
              <View style={[styles.errorBanner, { bottom: insets.bottom + 150 }]}>
                <Text style={styles.errorText}>{captureError}</Text>
              </View>
            )}

            <View style={[styles.controls, { paddingBottom: insets.bottom + Spacing.xl }]}>
              {inPreview ? (
                <View style={styles.previewRow}>
                  <PressableScale onPress={handleRetake} style={[styles.pillBtn, styles.retakeBtn]}>
                    <Text style={[styles.pillText, styles.retakeText]}>ถ่ายใหม่</Text>
                  </PressableScale>
                  <PressableScale
                    onPress={handleUse}
                    style={[styles.pillBtn, { backgroundColor: theme.actionAccept }]}
                  >
                    <Text style={[styles.pillText, { color: onAccent(theme.actionAccept) }]}>ใช้รูปนี้</Text>
                  </PressableScale>
                </View>
              ) : (
                <>
                  {/* Mode toggle pill — above the shutter, hidden mid-recording. */}
                  {!isRecording && (
                    <View style={styles.modePill}>
                      <PressableScale
                        onPress={() => handleModeChange('photo')}
                        style={[styles.modeSeg, mode === 'photo' && styles.modeSegActive]}
                      >
                        <Text style={[styles.modeText, mode === 'photo' && styles.modeTextActive]}>รูป</Text>
                      </PressableScale>
                      <PressableScale
                        onPress={() => handleModeChange('video')}
                        style={[styles.modeSeg, mode === 'video' && styles.modeSegActive]}
                      >
                        <Text style={[styles.modeText, mode === 'video' && styles.modeTextActive]}>วิดีโอ</Text>
                      </PressableScale>
                    </View>
                  )}

                  {mode === 'photo' ? (
                    <PressableScale onPress={handleTakePhoto} style={styles.shutterOuter} disabled={!ready}>
                      <View style={styles.shutterInner} />
                    </PressableScale>
                  ) : isRecording ? (
                    <PressableScale onPress={handleStopRecording} style={styles.shutterOuter}>
                      <View style={styles.stopInner} />
                    </PressableScale>
                  ) : (
                    <PressableScale onPress={handleStartRecording} style={styles.shutterOuter} disabled={!ready}>
                      <View style={styles.recInner} />
                    </PressableScale>
                  )}
                </>
              )}
            </View>
          </>
        )}
      </View>
    </Modal>
  )
}

/** Local preview of the just-captured photo/video before confirming. */
function RunStoryCapturePreview({ asset }: { asset: RunStoryCapturedAsset }) {
  if (asset.kind === 'photo') {
    return <Image source={{ uri: asset.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
  }
  return <QuestVideoReplay uri={asset.uri} />
}
