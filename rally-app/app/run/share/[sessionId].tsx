import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useReducedMotion } from 'react-native-reanimated'

import { Reveal } from '@/components/motion/Reveal'
import { PressableScale } from '@/components/motion/PressableScale'
import { RallyBrandMark } from '@/components/run/brand/RallyBrandMark'
import { createRunRecapColors, type RunRecapColors } from '@/components/run/recap/runRecapMomentStyles'
import type { RunStoryCameraSheetProps, RunStoryCapturedAsset } from '@/components/run/share/RunStoryCameraSheet'
import { RunStoryConfirmPreview } from '@/components/run/share/RunStoryConfirmPreview'
import { RunShareMetricSelector } from '@/components/run-insights/RunShareMetricSelector'
import { RunStoryPreview } from '@/components/run-story/RunStoryPreview'
import { type RunArenaPalette as RunArenaColors } from '@/constants/theme'
import { useRunArenaTheme, useThemeMode } from '@/hooks/useAppTheme'
import { useActivityDetail } from '@/hooks/useActivityDetail'
import { useAnalysisProfile } from '@/hooks/useAnalysisProfile'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useAuth } from '@/hooks/useAuth'
import { useRunBodyMetrics } from '@/hooks/useRunBodyMetrics'
import { useRunStoryVideoExport } from '@/hooks/useRunStoryVideoExport'
import { useSaveRunStoryImage } from '@/hooks/useSaveRunStoryImage'
import {
  buildRunInsightInputFromActivity,
  buildRunInsightSummary,
  getDefaultRunShareMetricIds,
  resolveRunShareMetrics,
  toggleRunShareMetricId,
  type RunInsightSummary,
  type RunShareCandidate,
} from '@/lib/run-insights'
import type { GpsPoint } from '@/lib/run-tracking/gps/gpsTypes'
import {
  formatStoryDistance,
  formatStoryDuration,
  formatStoryPace,
} from '@/lib/run-story/runStoryFormat'
import { videoMimeTypeForUri } from '@/lib/share/videoFileType'

const STORY_WIDTH = 1080
const STORY_HEIGHT = 1920
const STORY_FRAME_BG = '#15181d'

type CaptureRefOptions = {
  format: 'jpg'
  quality: number
  result: 'tmpfile'
  width: number
  height: number
}

type CaptureRef = (target: React.RefObject<View | null>, options: CaptureRefOptions) => Promise<string>

type MediaLibraryModule = {
  requestPermissionsAsync: (writeOnly?: boolean) => Promise<{ granted: boolean }>
  saveToLibraryAsync: (localUri: string) => Promise<void>
}

type ImagePickerResult = {
  canceled: boolean
  assets: { uri?: string }[]
}

type ImagePickerModule = {
  requestMediaLibraryPermissionsAsync: () => Promise<{ granted: boolean }>
  launchImageLibraryAsync: (options: {
    mediaTypes: string[]
    allowsMultipleSelection: boolean
    quality: number
  }) => Promise<ImagePickerResult>
}

const nativeExportError =
  'การส่งออกต้องใช้ native build ที่มี expo-media-library และ react-native-view-shot · build แอปใหม่แล้วเปิด Rally อีกครั้ง'
const nativePhotoPickerError =
  'พื้นหลังจากรูปต้องใช้ native build ที่มี expo-image-picker · build แอปใหม่แล้วเปิด Rally อีกครั้ง'

// Stage-specific save/upload errors are all Thai copy, so classifyShareExportError
// can't sniff English keywords out of the message anymore — this marker carries
// the analytics reason alongside the user-facing Thai text.
type ShareStageErrorCode = 'capture_failed' | 'permission_denied' | 'save_failed' | 'upload_failed'

class ShareStageError extends Error {
  code: ShareStageErrorCode
  constructor(code: ShareStageErrorCode, message: string) {
    super(message)
    this.code = code
  }
}

async function runShareStage<T>(
  code: ShareStageErrorCode,
  message: string,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn()
  } catch {
    throw new ShareStageError(code, message)
  }
}

const loadCaptureRef = async (): Promise<CaptureRef> => {
  try {
    const viewShot = await import('react-native-view-shot') as { captureRef?: CaptureRef }
    if (typeof viewShot.captureRef === 'function') return viewShot.captureRef
  } catch {
    // Let the caller show a user-facing export error instead of crashing during route load.
  }
  throw new Error(nativeExportError)
}

const loadMediaLibrary = async (): Promise<MediaLibraryModule> => {
  try {
    const mediaLibrary = await import('expo-media-library') as MediaLibraryModule
    if (
      typeof mediaLibrary.requestPermissionsAsync === 'function' &&
      typeof mediaLibrary.saveToLibraryAsync === 'function'
    ) {
      return mediaLibrary
    }
  } catch {
    // Let the caller show a user-facing export error instead of crashing during route load.
  }
  throw new Error(nativeExportError)
}

const loadImagePicker = async (): Promise<ImagePickerModule> => {
  try {
    const imagePicker = await import('expo-image-picker') as ImagePickerModule
    if (
      typeof imagePicker.requestMediaLibraryPermissionsAsync === 'function' &&
      typeof imagePicker.launchImageLibraryAsync === 'function'
    ) {
      return imagePicker
    }
  } catch {
    // Let the caller show a user-facing picker error instead of crashing during route load.
  }
  throw new Error(nativePhotoPickerError)
}

export default function RunStoryShareScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>()
  const runTheme = useRunArenaTheme()
  const themeMode = useThemeMode()
  const recapColors = useMemo(() => createRunRecapColors(themeMode), [themeMode])
  const styles = useMemo(() => createStyles(runTheme, recapColors), [runTheme, recapColors])
  const reduceMotion = useReducedMotion()
  const { user } = useAuth()
  const { data: activity, isPending, error } = useActivityDetail(sessionId)
  const { data: analysisProfile, isPending: isAnalysisProfilePending } = useAnalysisProfile(
    user?.id,
  )
  const saveStoryMutation = useSaveRunStoryImage(user?.id)
  const videoExport = useRunStoryVideoExport()
  const { track } = useAnalytics()
  const storyRef = useRef<View>(null)
  const shareOpenedTrackedKey = useRef<string | null>(null)
  const [backgroundUri, setBackgroundUri] = useState<string | null>(null)
  const [backgroundKind, setBackgroundKind] = useState<'photo' | 'video'>('photo')
  const [videoDurationSeconds, setVideoDurationSeconds] = useState<number | null>(null)
  const [storyCameraVisible, setStoryCameraVisible] = useState(false)
  // Loaded on demand: vision-camera's native module is absent on builds that
  // predate the story camera, and a static import would crash the whole screen.
  const [StoryCameraSheet, setStoryCameraSheet] =
    useState<ComponentType<RunStoryCameraSheetProps> | null>(null)
  const [busyAction, setBusyAction] = useState<'gallery' | 'save' | 'share' | null>(null)
  const [savedStory, setSavedStory] = useState<{ key: string; uri: string; storagePath: string } | null>(null)
  const [metricIdsOverride, setMetricIdsOverride] = useState<string[] | null>(null)
  const [sensitiveMetricsEnabled, setSensitiveMetricsEnabled] = useState(false)
  const [shareConfirmUri, setShareConfirmUri] = useState<string | null>(null)

  const runDetails = activity?.running_activity_details ?? null
  const path = useMemo(
    () => (runDetails?.route_summary as { path?: GpsPoint[] } | null)?.path ?? [],
    [runDetails?.route_summary],
  )
  const insightInput = useMemo(() => {
    if (!activity?.running_activity_details) return null
    return buildRunInsightInputFromActivity(activity, analysisProfile)
  }, [activity, analysisProfile])
  const insightSummary = useMemo(() => (
    insightInput ? buildRunInsightSummary(insightInput) : null
  ), [insightInput])

  // Body metrics (calories, HR zones, intensity) need the run's real wall-clock
  // window to read HealthKit/Health Connect samples; ended_at is only set once
  // the session record is fully written server-side.
  const activityWindow = useMemo(() => {
    if (!activity?.started_at || !activity?.ended_at) return null
    return { start: new Date(activity.started_at), end: new Date(activity.ended_at) }
  }, [activity?.started_at, activity?.ended_at])

  const bodyMetrics = useRunBodyMetrics({
    sessionId,
    window: activityWindow,
    movingTimeSeconds: runDetails?.moving_time_seconds ?? null,
    distanceMeters: runDetails?.distance_meters ?? null,
    paceSecondsPerKm: runDetails?.pace_seconds_per_km ?? null,
    pedometerSteps: runDetails?.steps ?? null,
    deviceCalories: runDetails?.calories ?? null,
  })

  // Extra share-card options sourced from the body-metrics query (calories,
  // training-load intensity, avg HR) — merged onto the insight summary's own
  // candidates so the existing dynamic selector picks them up unchanged.
  // Not included by default; null values are simply never appended.
  const bodyShareCandidates = useMemo(() => {
    const body = bodyMetrics.data
    const publicMetrics: RunShareCandidate[] = []
    const sensitiveMetrics: RunShareCandidate[] = []
    if (!body) return { publicMetrics, sensitiveMetrics }

    if (body.caloriesKcal != null) {
      publicMetrics.push({
        id: 'body-calories',
        label: 'แคลอรี่',
        value: `${body.caloriesKcal} KCAL`,
        sensitivity: 'public_default',
      })
    }
    if (body.intensityScore != null && body.intensityLevel != null) {
      publicMetrics.push({
        id: 'body-intensity',
        label: 'ความหนักของการออกกำลังกาย',
        value: `${body.intensityScore} · ${body.intensityLevel}`,
        sensitivity: 'public_default',
      })
    }
    if (body.avgBpm != null) {
      sensitiveMetrics.push({
        id: 'body-hr-avg',
        label: 'HR เฉลี่ย',
        value: `${body.avgBpm} bpm`,
        sensitivity: 'explicit_sensitive',
      })
    }
    return { publicMetrics, sensitiveMetrics }
  }, [bodyMetrics.data])

  const augmentedSummary = useMemo<RunInsightSummary | null>(() => {
    if (!insightSummary) return null
    return {
      ...insightSummary,
      shareCandidates: [...insightSummary.shareCandidates, ...bodyShareCandidates.publicMetrics],
      sensitiveMetrics: [...insightSummary.sensitiveMetrics, ...bodyShareCandidates.sensitiveMetrics],
    }
  }, [insightSummary, bodyShareCandidates])

  const defaultMetricIds = useMemo(
    () => augmentedSummary ? getDefaultRunShareMetricIds(augmentedSummary) : [],
    [augmentedSummary],
  )
  const selectedMetricIds = metricIdsOverride ?? defaultMetricIds
  const selectedMetrics = useMemo(
    () => augmentedSummary
      ? resolveRunShareMetrics(augmentedSummary, selectedMetricIds, sensitiveMetricsEnabled)
      : [],
    [augmentedSummary, selectedMetricIds, sensitiveMetricsEnabled],
  )
  const storyKey = `${sessionId}:${backgroundUri ?? 'fallback'}:${backgroundKind}:${path.length}:${activity?.started_at ?? ''}:${selectedMetricIds.join('|')}:${sensitiveMetricsEnabled ? 's' : 'p'}`

  useEffect(() => {
    if (!activity || !insightInput || !insightSummary) return
    if (user?.id && isAnalysisProfilePending) return

    const key = `${activity.id}:${insightSummary.shareCandidates.length}:${insightSummary.sensitiveMetrics.length}`
    if (shareOpenedTrackedKey.current === key) return
    shareOpenedTrackedKey.current = key

    track({
      name: 'run_share_card_opened',
      properties: {
        source: insightInput.source,
        route_point_count: path.length,
        default_metric_count: insightSummary.shareCandidates.length,
        sensitive_metric_count: insightSummary.sensitiveMetrics.length,
      },
    })
  }, [
    activity,
    insightInput,
    insightSummary,
    isAnalysisProfilePending,
    path.length,
    track,
    user?.id,
  ])

  const toggleMetric = (metricId: string) => {
    const currentIds = metricIdsOverride ?? defaultMetricIds
    const nextIds = toggleRunShareMetricId(currentIds, metricId)
    const metric = findShareMetric(augmentedSummary, metricId)
    setMetricIdsOverride(nextIds)
    setSavedStory(null)
    track({
      name: 'run_share_metric_toggled',
      properties: {
        metric_id: metricId,
        selected: !currentIds.includes(metricId),
        sensitivity: metric?.sensitivity ?? 'public_default',
        selected_metric_count: nextIds.length,
      },
    })
  }

  const toggleSensitiveMetrics = () => {
    const nextEnabled = !sensitiveMetricsEnabled
    if (sensitiveMetricsEnabled && augmentedSummary) {
      const sensitiveIds = new Set(augmentedSummary.sensitiveMetrics.map((metric) => metric.id))
      setMetricIdsOverride((current) =>
        (current ?? defaultMetricIds).filter((metricId) => !sensitiveIds.has(metricId)),
      )
    }
    setSensitiveMetricsEnabled(nextEnabled)
    setSavedStory(null)
    track({
      name: 'run_share_sensitive_metrics_toggled',
      properties: {
        enabled: nextEnabled,
        sensitive_metric_count: augmentedSummary?.sensitiveMetrics.length ?? 0,
      },
    })
  }

  const showError = (title: string, message: string) => {
    if (Platform.OS === 'web') globalThis.alert(`${title}\n\n${message}`)
    else Alert.alert(title, message)
  }

  const openStoryCamera = async () => {
    try {
      if (!StoryCameraSheet) {
        const mod = await import('@/components/run/share/RunStoryCameraSheet')
        setStoryCameraSheet(() => mod.RunStoryCameraSheet)
      }
      setStoryCameraVisible(true)
    } catch {
      showError('เปิดกล้องไม่ได้', 'กล้องต้องใช้แอปเวอร์ชัน build ใหม่ · อัปเดตแอปแล้วลองอีกครั้ง')
    }
  }
  const closeStoryCamera = () => setStoryCameraVisible(false)

  const handleStoryCaptured = (asset: RunStoryCapturedAsset) => {
    setStoryCameraVisible(false)
    setBackgroundUri(asset.uri)
    setBackgroundKind(asset.kind)
    setVideoDurationSeconds(null)
    setSavedStory(null)
  }

  const pickFromGallery = async () => {
    setBusyAction('gallery')
    try {
      const imagePicker = await loadImagePicker()
      const permission = await imagePicker.requestMediaLibraryPermissionsAsync()
      if (!permission.granted) throw new Error('ไม่ได้รับสิทธิ์เข้าคลังรูป')
      const result = await imagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        quality: 0.92,
      })
      if (!result.canceled) {
        setBackgroundUri(result.assets[0]?.uri ?? null)
        setBackgroundKind('photo')
        setVideoDurationSeconds(null)
        setSavedStory(null)
      }
    } catch (err) {
      showError('เลือกรูปไม่ได้', readableShareError(err, 'เปิดคลังรูปไม่ได้ตอนนี้'))
    } finally {
      setBusyAction(null)
    }
  }

  const ensureSavedImageStory = async () => {
    if (!user || !sessionId) throw new Error('ต้องเข้าสู่ระบบก่อน')
    if (savedStory?.key === storyKey) return savedStory
    if (!storyRef.current) throw new Error('ตัวอย่างการ์ดยังไม่พร้อม')

    const uri = await runShareStage('capture_failed', 'สร้างรูปไม่สำเร็จ', async () => {
      const captureRef = await loadCaptureRef()
      return captureRef(storyRef, {
        format: 'jpg',
        quality: 0.95,
        result: 'tmpfile',
        width: STORY_WIDTH,
        height: STORY_HEIGHT,
      })
    })

    const mediaLibrary = await runShareStage(
      'save_failed',
      'บันทึกลงคลังรูปไม่สำเร็จ · เช็คสิทธิ์รูปภาพของ Rally',
      loadMediaLibrary,
    )
    const permission = await mediaLibrary.requestPermissionsAsync(true)
    if (!permission.granted) {
      throw new ShareStageError('permission_denied', 'ไม่ได้รับสิทธิ์บันทึกลงคลังรูป')
    }
    await runShareStage(
      'save_failed',
      'บันทึกลงคลังรูปไม่สำเร็จ · เช็คสิทธิ์รูปภาพของ Rally',
      () => mediaLibrary.saveToLibraryAsync(uri),
    )

    const result = await runShareStage(
      'upload_failed',
      'อัปโหลดขึ้นเซิร์ฟเวอร์ไม่สำเร็จ · รูปถูกบันทึกลงเครื่องแล้ว',
      () => saveStoryMutation.mutateAsync({
        userId: user.id,
        activitySessionId: sessionId,
        mediaUri: uri,
        kind: 'photo',
      }),
    )

    const next = { key: storyKey, uri, storagePath: result.storagePath }
    setSavedStory(next)
    return next
  }

  // Video-background card: no screenshot — record the on-screen card for one
  // background-loop via useRunStoryVideoExport (expo-screen-recorder), then
  // reuse the same media-library-save + upload steps as the photo path.
  const ensureSavedVideoStory = async () => {
    if (!user || !sessionId) throw new Error('ต้องเข้าสู่ระบบก่อน')
    if (savedStory?.key === storyKey) return savedStory

    const uri = await runShareStage(
      'capture_failed',
      'บันทึกวิดีโอไม่สำเร็จ',
      () => videoExport.begin(videoDurationSeconds),
    )

    const mediaLibrary = await runShareStage(
      'save_failed',
      'บันทึกลงคลังรูปไม่สำเร็จ · เช็คสิทธิ์รูปภาพของ Rally',
      loadMediaLibrary,
    )
    const permission = await mediaLibrary.requestPermissionsAsync(true)
    if (!permission.granted) {
      throw new ShareStageError('permission_denied', 'ไม่ได้รับสิทธิ์บันทึกลงคลังรูป')
    }
    await runShareStage(
      'save_failed',
      'บันทึกลงคลังรูปไม่สำเร็จ · เช็คสิทธิ์รูปภาพของ Rally',
      () => mediaLibrary.saveToLibraryAsync(uri),
    )

    const result = await runShareStage(
      'upload_failed',
      'อัปโหลดขึ้นเซิร์ฟเวอร์ไม่สำเร็จ · วิดีโอถูกบันทึกลงเครื่องแล้ว',
      () => saveStoryMutation.mutateAsync({
        userId: user.id,
        activitySessionId: sessionId,
        mediaUri: uri,
        kind: 'video',
      }),
    )

    // Deliberately no videoExport.reset() here: the export's temp uri is
    // still `uri` above, still needed for the share-confirm preview and the
    // Sharing.shareAsync call that follows — reset() deletes the cache file,
    // and would race a save-then-share flow. The hook cleans the previous
    // file up itself on the next begin() (re-record) and on unmount.
    const next = { key: storyKey, uri, storagePath: result.storagePath }
    setSavedStory(next)
    return next
  }

  const ensureSavedStory = () => (
    backgroundKind === 'video' ? ensureSavedVideoStory() : ensureSavedImageStory()
  )

  const saveImage = async () => {
    setBusyAction('save')
    try {
      await ensureSavedStory()
      track({
        name: 'run_share_card_exported',
        properties: buildShareExportProperties({
          method: 'save_image',
          assetKind: backgroundKind,
          selectedMetrics,
          backgroundUri,
          source: insightInput?.source ?? 'unknown',
          routePointCount: path.length,
        }),
      })
      const savedMessage = backgroundKind === 'video' ? 'วิดีโออยู่ในคลังแล้ว' : 'รูปอยู่ในคลังแล้ว'
      if (Platform.OS === 'web') {
        globalThis.alert(`บันทึกแล้ว\n\n${savedMessage}`)
      } else {
        Alert.alert('บันทึกแล้ว', savedMessage, [
          { text: 'ออก', onPress: () => router.back() },
          { text: 'แชร์', onPress: () => void shareStory() },
        ])
      }
    } catch (err) {
      track({
        name: 'run_share_card_export_failed',
        properties: buildShareExportFailureProperties({
          method: 'save_image',
          assetKind: backgroundKind,
          error: err,
          selectedMetrics,
          backgroundUri,
          source: insightInput?.source ?? 'unknown',
          routePointCount: path.length,
        }),
      })
      showError('บันทึกไม่สำเร็จ', readableShareError(err, 'ลองใหม่อีกครั้ง'))
    } finally {
      setBusyAction(null)
    }
  }

  const shareStory = async () => {
    setBusyAction('share')
    try {
      const story = await ensureSavedStory()
      setShareConfirmUri(story.uri)
    } catch (err) {
      track({
        name: 'run_share_card_export_failed',
        properties: buildShareExportFailureProperties({
          method: 'system_share',
          assetKind: backgroundKind,
          error: err,
          selectedMetrics,
          backgroundUri,
          source: insightInput?.source ?? 'unknown',
          routePointCount: path.length,
        }),
      })
      showError('แชร์ไม่สำเร็จ', readableShareError(err, 'ลองใหม่อีกครั้ง'))
    } finally {
      setBusyAction(null)
    }
  }

  const cancelShareConfirm = () => setShareConfirmUri(null)

  const confirmShare = async () => {
    if (!shareConfirmUri) return
    setBusyAction('share')
    try {
      const Sharing = await import('expo-sharing')
      await Sharing.shareAsync(shareConfirmUri, {
        mimeType: backgroundKind === 'video' ? videoMimeTypeForUri(shareConfirmUri) : 'image/jpeg',
      })
      track({
        name: 'run_share_card_exported',
        properties: buildShareExportProperties({
          method: 'system_share',
          assetKind: backgroundKind,
          selectedMetrics,
          backgroundUri,
          source: insightInput?.source ?? 'unknown',
          routePointCount: path.length,
        }),
      })
      setShareConfirmUri(null)
    } catch (err) {
      track({
        name: 'run_share_card_export_failed',
        properties: buildShareExportFailureProperties({
          method: 'system_share',
          assetKind: backgroundKind,
          error: err,
          selectedMetrics,
          backgroundUri,
          source: insightInput?.source ?? 'unknown',
          routePointCount: path.length,
        }),
      })
      showError('แชร์ไม่ได้', readableShareError(err, 'ลองใหม่อีกครั้ง'))
    } finally {
      setBusyAction(null)
    }
  }

  if (isPending) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={runTheme.trust} />
      </SafeAreaView>
    )
  }

  if (error || !activity || !runDetails || path.length < 2) {
    return (
      <SafeAreaView style={styles.center}>
        <MaterialCommunityIcons name="map-marker-off-outline" size={32} color={runTheme.textMuted} />
        <Text style={styles.errorText}>การวิ่งนี้ไม่มีเส้นทางให้แชร์</Text>
        <PressableScale style={styles.secondaryButton} onPress={() => router.back()}>
          <Text style={styles.secondaryButtonText}>ย้อนกลับ</Text>
        </PressableScale>
      </SafeAreaView>
    )
  }

  const busy = busyAction !== null || saveStoryMutation.isPending
  const distance = formatStoryDistance(runDetails.distance_meters)
  const movingTime = formatStoryDuration(runDetails.moving_time_seconds)
  const pace = formatStoryPace(runDetails.pace_seconds_per_km)
  const dateLabel = new Date(activity.started_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })

  // While the video-story export is countdown/recording, hide everything but
  // the story card itself — expo-screen-recorder captures the whole device
  // screen, so any chrome left visible ends up baked into the exported mp4
  // (mirrors app/run/replay/[sessionId].tsx's video.chromeHidden pattern).
  const chromeHidden = videoExport.chromeHidden

  return (
    <SafeAreaView style={styles.root}>
      {!chromeHidden && (
        <View style={styles.header}>
          <View style={styles.headerLeading}>
            <Pressable
              style={styles.iconButton}
              onPress={() => router.back()}
              accessibilityLabel="ย้อนกลับ"
            >
              <MaterialCommunityIcons name="chevron-left" size={24} color={runTheme.text} />
            </Pressable>
            <RallyBrandMark size={34} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>รูป/วิดีโอการวิ่ง</Text>
            <Text style={styles.title}>แชร์เส้นทาง</Text>
          </View>
          <View style={styles.iconButtonGhost} />
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent} scrollEnabled={!chromeHidden}>
        <Reveal delay={0}>
          <View style={styles.previewShell}>
            <View ref={storyRef} collapsable={false} style={styles.captureFrame}>
              <RunStoryPreview
                backgroundUri={backgroundUri}
                backgroundKind={backgroundKind}
                path={path}
                distance={distance}
                movingTime={movingTime}
                pace={pace}
                dateLabel={dateLabel}
                metrics={selectedMetrics}
                onVideoDurationSeconds={setVideoDurationSeconds}
              />
            </View>
            {chromeHidden && videoExport.state === 'countdown' && (
              <View style={styles.videoExportOverlay} pointerEvents="none">
                <Text style={styles.videoExportOverlayText}>{videoExport.countdownValue}</Text>
              </View>
            )}
            {chromeHidden && videoExport.state !== 'countdown' && (
              <View style={styles.videoExportOverlay} pointerEvents="none">
                <ActivityIndicator color="#fff" />
              </View>
            )}
          </View>
        </Reveal>

        {!chromeHidden && augmentedSummary && (
          <Reveal delay={reduceMotion ? 0 : 80}>
            <RunShareMetricSelector
              publicMetrics={augmentedSummary.shareCandidates}
              sensitiveMetrics={augmentedSummary.sensitiveMetrics}
              selectedMetricIds={selectedMetricIds}
              sensitiveMetricsEnabled={sensitiveMetricsEnabled}
              onToggleMetric={toggleMetric}
              onToggleSensitiveMetrics={toggleSensitiveMetrics}
            />
          </Reveal>
        )}

        {!chromeHidden && (
          <Reveal delay={reduceMotion ? 0 : 160}>
            <View style={styles.photoActions}>
              <PressableScale
                style={styles.photoButton}
                onPress={openStoryCamera}
                disabled={busy}
                accessibilityLabel="ถ่ายรูปหรือวิดีโอเป็นพื้นหลัง"
              >
                <MaterialCommunityIcons name="camera-outline" size={18} color={recapColors.heroInk} />
                <Text style={styles.photoButtonText}>ถ่ายรูป</Text>
              </PressableScale>
              <PressableScale
                style={styles.photoButton}
                onPress={pickFromGallery}
                disabled={busy}
                accessibilityLabel="เลือกรูปเป็นพื้นหลัง"
              >
                {busyAction === 'gallery'
                  ? <ActivityIndicator color={recapColors.heroInk} />
                  : <MaterialCommunityIcons name="image-outline" size={18} color={recapColors.heroInk} />}
                <Text style={styles.photoButtonText}>เลือกรูป</Text>
              </PressableScale>
            </View>

            <View style={styles.shareActions}>
              <PressableScale
                style={[styles.secondaryButton, busy && styles.buttonDisabled]}
                onPress={saveImage}
                disabled={busy}
                accessibilityLabel="บันทึกรูป"
              >
                {busyAction === 'save'
                  ? <ActivityIndicator color={recapColors.secondaryText} />
                  : <MaterialCommunityIcons name="download-outline" size={18} color={recapColors.secondaryText} />}
                <Text style={styles.secondaryButtonText}>บันทึก</Text>
              </PressableScale>
              <PressableScale
                style={[styles.primaryButton, busy && styles.buttonDisabled]}
                onPress={shareStory}
                disabled={busy}
                accessibilityLabel="แชร์"
              >
                {busyAction === 'share'
                  ? <ActivityIndicator color={recapColors.onAccent} />
                  : <MaterialCommunityIcons name="export-variant" size={18} color={recapColors.onAccent} />}
                <Text style={styles.primaryButtonText}>แชร์</Text>
              </PressableScale>
            </View>
          </Reveal>
        )}
      </ScrollView>

      {shareConfirmUri && (
        <View style={styles.shareConfirmBackdrop}>
          <View style={styles.shareConfirmCard}>
            <View style={styles.shareConfirmFrame}>
              <RunStoryConfirmPreview uri={shareConfirmUri} kind={backgroundKind} />
            </View>
            <View style={styles.shareActions}>
              <PressableScale
                style={[styles.secondaryButton, busy && styles.buttonDisabled]}
                onPress={cancelShareConfirm}
                disabled={busy}
                accessibilityLabel="ยกเลิกการแชร์"
              >
                <Text style={styles.secondaryButtonText}>ยกเลิก</Text>
              </PressableScale>
              <PressableScale
                style={[styles.primaryButton, busy && styles.buttonDisabled]}
                onPress={confirmShare}
                disabled={busy}
                accessibilityLabel="ยืนยันแชร์"
              >
                {busyAction === 'share'
                  ? <ActivityIndicator color={recapColors.onAccent} />
                  : <MaterialCommunityIcons name="export-variant" size={18} color={recapColors.onAccent} />}
                <Text style={styles.primaryButtonText}>แชร์</Text>
              </PressableScale>
            </View>
          </View>
        </View>
      )}

      {StoryCameraSheet && (
        <StoryCameraSheet
          visible={storyCameraVisible}
          onClose={closeStoryCamera}
          onCaptured={handleStoryCaptured}
        />
      )}
    </SafeAreaView>
  )
}

function findShareMetric(
  summary: RunInsightSummary | null,
  metricId: string,
): RunShareCandidate | null {
  if (!summary) return null
  return [...summary.shareCandidates, ...summary.sensitiveMetrics].find((metric) => metric.id === metricId) ?? null
}

function buildShareExportProperties({
  method,
  assetKind,
  selectedMetrics,
  backgroundUri,
  source,
  routePointCount,
}: {
  method: 'save_image' | 'system_share'
  assetKind: 'photo' | 'video'
  selectedMetrics: RunShareCandidate[]
  backgroundUri: string | null
  source: string
  routePointCount: number
}) {
  return {
    method,
    asset_kind: assetKind,
    selected_metric_count: selectedMetrics.length,
    includes_sensitive_metrics: selectedMetrics.some((metric) => metric.sensitivity === 'explicit_sensitive'),
    has_custom_background: backgroundUri !== null,
    source,
    route_point_count: routePointCount,
  }
}

function buildShareExportFailureProperties({
  method,
  assetKind,
  error,
  selectedMetrics,
  backgroundUri,
  source,
  routePointCount,
}: {
  method: 'save_image' | 'system_share'
  assetKind: 'photo' | 'video'
  error: unknown
  selectedMetrics: RunShareCandidate[]
  backgroundUri: string | null
  source: string
  routePointCount: number
}) {
  return {
    ...buildShareExportProperties({ method, assetKind, selectedMetrics, backgroundUri, source, routePointCount }),
    reason: classifyShareExportError(error),
  }
}

// native/storage error เป็นอังกฤษ/technical — แสดงต่อผู้ใช้เฉพาะถ้าเป็นไทยอยู่แล้ว ที่เหลือใช้ fallback ไทย
function readableShareError(err: unknown, fallback: string): string {
  return err instanceof Error && /[ก-๙]/.test(err.message) ? err.message : fallback
}

function classifyShareExportError(error: unknown): string {
  if (error instanceof ShareStageError) return error.code
  if (!(error instanceof Error)) return 'unknown'
  const message = error.message.toLowerCase()
  if (message.includes('native build')) return 'native_module_missing'
  if (message.includes('user session')) return 'missing_user_session'
  if (message.includes('not ready')) return 'preview_not_ready'
  return 'export_failed'
}

function createStyles(RunArenaPalette: RunArenaColors, recap: RunRecapColors) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: recap.cardBg },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: recap.cardBg,
    padding: 24,
    gap: 14,
  },
  header: {
    minHeight: 72,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerLeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerCopy: { flex: 1, alignItems: 'center' },
  eyebrow: { color: RunArenaPalette.trust, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: RunArenaPalette.text, fontSize: 20, fontWeight: '900', marginTop: 2 },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: recap.tileBg,
    borderWidth: 1.5,
    borderColor: recap.tileBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonGhost: { width: 44, height: 44 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 16,
  },
  previewShell: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: recap.cardBg,
    borderWidth: 1.5,
    borderColor: recap.tileBorder,
  },
  captureFrame: {
    width: '100%',
    aspectRatio: 9 / 16,
    backgroundColor: STORY_FRAME_BG,
  },
  videoExportOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  videoExportOverlayText: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '900',
  },
  photoActions: {
    flexDirection: 'row',
    gap: 12,
  },
  photoButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 10,
    backgroundColor: recap.tileBg,
    borderWidth: 1.5,
    borderColor: recap.tileBorder,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  photoButtonText: { color: recap.heroInk, fontSize: 14, fontWeight: '900' },
  shareActions: { flexDirection: 'row', gap: 12 },
  primaryButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: 10,
    backgroundColor: recap.accent,
    borderWidth: 1.5,
    borderColor: recap.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonText: { color: recap.onAccent, fontSize: 15, fontWeight: '900' },
  secondaryButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 10,
    backgroundColor: recap.tileBg,
    borderWidth: 1.5,
    borderColor: recap.tileBorder,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
  },
  secondaryButtonText: { color: recap.secondaryText, fontSize: 14, fontWeight: '900' },
  buttonDisabled: { opacity: 0.58 },
  errorText: { color: recap.heroInk, fontSize: 15, fontWeight: '800', textAlign: 'center' },
  shareConfirmBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: recap.backdrop,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 200,
  },
  shareConfirmCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 10,
    backgroundColor: recap.cardBg,
    borderWidth: 1.5,
    borderColor: recap.tileBorder,
    padding: 16,
    gap: 14,
  },
  shareConfirmFrame: {
    width: '100%',
    aspectRatio: 9 / 16,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: STORY_FRAME_BG,
  },
  })
}
