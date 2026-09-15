import { useState } from 'react'
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { useVideoPlayer, VideoView } from 'expo-video'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import {
  useDeleteProfileHighlightVideo,
  useProfileHighlightVideo,
  useUploadProfileHighlightVideo,
} from '@/hooks/useProfileHighlight'
import {
  PROFILE_HIGHLIGHT_MAX_DURATION_SECONDS,
  validateProfileHighlightDuration,
} from '@/lib/profile/profileHighlightRules'

type ProfileHighlightVideoProps = {
  userId: string
  matchId: string
  isOwner?: boolean
  pinNumber?: number
  matchLabel?: string
}

/** Optional highlight reel attached to one pinned match. Owners can replace it. */
export function ProfileHighlightVideo({
  userId,
  matchId,
  isOwner = false,
  pinNumber,
  matchLabel = 'แมตช์ที่ปักหมุด',
}: ProfileHighlightVideoProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { data: highlight, isPending, error } = useProfileHighlightVideo(userId, matchId)
  const uploadMutation = useUploadProfileHighlightVideo(userId, matchId)
  const deleteMutation = useDeleteProfileHighlightVideo(userId, matchId)
  const [pickerOpen, setPickerOpen] = useState(false)

  if (isPending && !highlight) return <ActivityIndicator color={theme.muted} />
  if (error && !highlight) {
    return isOwner ? <UploadError styles={styles} onPress={pickVideo} disabled={pickerOpen} /> : null
  }
  if (!highlight && !isOwner) return null

  async function pickVideo() {
    if (pickerOpen || uploadMutation.isPending) return
    setPickerOpen(true)
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsMultipleSelection: false,
        videoMaxDuration: PROFILE_HIGHLIGHT_MAX_DURATION_SECONDS,
      })
      if (result.canceled) return

      const asset = result.assets[0]
      const duration = validateProfileHighlightDuration(asset?.duration)
      if (!duration.accepted) {
        Alert.alert(
          'ลงคลิปไม่ได้',
          duration.reason === 'too_long'
            ? `คลิปไฮไลท์ต้องยาวไม่เกิน ${PROFILE_HIGHLIGHT_MAX_DURATION_SECONDS} วินาที`
            : 'อ่านความยาวคลิปไม่ได้ กรุณาเลือกคลิปอื่น',
        )
        return
      }

      await uploadMutation.mutateAsync({
        asset: {
          uri: asset.uri,
          mimeType: asset.mimeType,
          fileName: asset.fileName,
        },
        durationSeconds: duration.durationSeconds,
      })
    } catch (uploadError) {
      Alert.alert('อัปโหลดไม่สำเร็จ', uploadError instanceof Error ? uploadError.message : 'ลองใหม่อีกครั้ง')
    } finally {
      setPickerOpen(false)
    }
  }

  function confirmDelete() {
    if (!highlight || deleteMutation.isPending) return
    Alert.alert('ลบวิดีโอไฮไลท์?', 'วิดีโอจะถูกนำออกจากหมุดนี้', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบวิดีโอ',
        style: 'destructive',
        onPress: () => {
          deleteMutation.mutate(undefined, {
            onError: (deleteError) => {
              Alert.alert('ลบวิดีโอไม่สำเร็จ', deleteError instanceof Error ? deleteError.message : 'ลองใหม่อีกครั้ง')
            },
          })
        },
      },
    ])
  }

  return (
    <View style={styles.section}>
      <View style={styles.headingRow}>
        <View style={styles.headingIdentity}>
          <View style={styles.pinIcon}>
            <MaterialCommunityIcons name="pin-outline" size={18} color={theme.orange} />
          </View>
          <View style={styles.headingCopy}>
            <Text style={styles.title} numberOfLines={1}>{`ไฮไลท์ของ ${matchLabel}`}</Text>
            <Text style={styles.subtitle}>วิดีโอนี้แสดงติดกับหัวหมุดที่เลือก</Text>
          </View>
        </View>
        {pinNumber != null ? <Text style={styles.pinNumber}>{`หมุด ${pinNumber}`}</Text> : null}
      </View>

      {highlight ? (
        <View style={styles.videoFrame}>
          <HighlightPlayer uri={highlight.videoUrl} />
          <View style={styles.durationPill}>
            <MaterialCommunityIcons name="play-circle-outline" size={14} color={theme.chalk} />
            <Text style={styles.durationText}>{highlight.durationSeconds} วิ</Text>
          </View>
        </View>
      ) : (
        <UploadPrompt styles={styles} onPress={pickVideo} disabled={pickerOpen || uploadMutation.isPending} />
      )}

      {isOwner ? (
        <View style={styles.mediaToolbar}>
          <PressableScale
            style={styles.replaceButton}
            onPress={pickVideo}
            disabled={pickerOpen || uploadMutation.isPending || deleteMutation.isPending}
            accessibilityRole="button"
            accessibilityLabel={highlight ? 'เปลี่ยนวิดีโอไฮไลท์' : 'เพิ่มวิดีโอไฮไลท์ให้หมุดนี้'}
          >
            {uploadMutation.isPending ? (
              <ActivityIndicator size="small" color={theme.ink} />
            ) : (
              <MaterialCommunityIcons name={highlight ? 'video-plus-outline' : 'plus'} size={18} color={theme.ink} />
            )}
            <Text style={styles.replaceText}>{highlight ? 'เปลี่ยนวิดีโอ' : 'เพิ่มวิดีโอ'}</Text>
          </PressableScale>
          {highlight ? (
            <PressableScale
              style={styles.deleteButton}
              onPress={confirmDelete}
              disabled={deleteMutation.isPending || uploadMutation.isPending}
              accessibilityRole="button"
              accessibilityLabel="ลบวิดีโอไฮไลท์"
            >
              {deleteMutation.isPending ? (
                <ActivityIndicator size="small" color={theme.red} />
              ) : (
                <MaterialCommunityIcons name="trash-can-outline" size={17} color={theme.red} />
              )}
              <Text style={styles.deleteText}>ลบวิดีโอ</Text>
            </PressableScale>
          ) : null}
        </View>
      ) : null}

      <Text style={styles.stateText}>ผู้ใช้ที่ล็อกอินเข้าดูโปรไฟล์นี้จะเห็นวิดีโอไฮไลท์</Text>
    </View>
  )
}

function HighlightPlayer({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (videoPlayer) => {
    videoPlayer.loop = true
    videoPlayer.muted = true
  })

  return <VideoView player={player} style={stylesForPlayer.video} contentFit="cover" nativeControls />
}

function UploadPrompt({
  styles,
  onPress,
  disabled,
}: {
  styles: ReturnType<typeof createStyles>
  onPress: () => void
  disabled: boolean
}) {
  return (
    <PressableScale
      style={styles.prompt}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="ลงคลิปไฮไลท์"
    >
      <MaterialCommunityIcons name="video-plus-outline" size={24} color={styles.promptIcon.color} />
      <View style={styles.promptCopy}>
        <Text style={styles.promptTitle}>โชว์จังหวะของคุณ</Text>
        <Text style={styles.promptText}>เลือกวิดีโอสั้นไม่เกิน {PROFILE_HIGHLIGHT_MAX_DURATION_SECONDS} วินาที</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={styles.promptArrow.color} />
    </PressableScale>
  )
}

const stylesForPlayer = StyleSheet.create({
  video: { width: '100%', aspectRatio: 16 / 9 },
})

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    section: { width: '100%', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.xl, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line, boxShadow: theme.shadowSoft },
    headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
    headingIdentity: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    pinIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.orangeSoft },
    headingCopy: { flex: 1, minWidth: 0 },
    title: { color: theme.ink, fontSize: 14, fontWeight: '900' },
    subtitle: { color: theme.muted, fontSize: 11, fontWeight: '600', marginTop: 2 },
    pinNumber: { color: theme.orange, fontSize: 10, fontWeight: '900', borderRadius: Radius.pill, borderWidth: 1, borderColor: theme.orange, paddingHorizontal: 8, paddingVertical: 5 },
    mediaToolbar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    replaceButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.sm, borderRadius: Radius.pill, backgroundColor: theme.orange },
    replaceText: { color: theme.ink, fontSize: 11, fontWeight: '900' },
    deleteButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.sm, borderRadius: Radius.pill, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface },
    deleteText: { color: theme.red, fontSize: 11, fontWeight: '900' },
    stateText: { color: theme.muted, fontSize: 10, fontWeight: '600' },
    videoFrame: { overflow: 'hidden', borderRadius: Radius.lg, backgroundColor: theme.ink },
    durationPill: {
      position: 'absolute',
      right: Spacing.sm,
      bottom: Spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: Radius.pill,
      backgroundColor: 'rgba(22,22,22,0.78)',
    },
    durationText: { color: theme.chalk, fontSize: 11, fontWeight: '900' },
    prompt: {
      minHeight: 76,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.md,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.lineStrong,
      backgroundColor: theme.bg,
    },
    promptIcon: { color: theme.orange },
    promptCopy: { flex: 1, gap: 3 },
    promptTitle: { color: theme.ink, fontSize: 13, fontWeight: '900' },
    promptText: { color: theme.muted, fontSize: 11, fontWeight: '600' },
    promptArrow: { color: theme.mutedSoft },
    errorPrompt: {
      minHeight: 76,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.md,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: theme.red,
      backgroundColor: theme.redSoft,
    },
    errorIcon: { color: theme.red },
    retryButton: {
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: Spacing.sm,
      borderRadius: Radius.pill,
      backgroundColor: theme.red,
    },
    retryText: { color: theme.chalk, fontSize: 11, fontWeight: '900' },
  })
}

function UploadError({
  styles,
  onPress,
  disabled,
}: {
  styles: ReturnType<typeof createStyles>
  onPress: () => void
  disabled: boolean
}) {
  return (
    <View style={styles.errorPrompt}>
      <MaterialCommunityIcons name="alert-circle-outline" size={22} color={styles.errorIcon.color} />
      <View style={styles.promptCopy}>
        <Text style={styles.promptTitle}>โหลดคลิปไม่สำเร็จ</Text>
        <Text style={styles.promptText}>ลองใหม่เพื่อเพิ่มไฮไลท์ให้หมุดนี้</Text>
      </View>
      <PressableScale
        style={styles.retryButton}
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="ลองโหลดคลิปไฮไลท์อีกครั้ง"
      >
        <Text style={styles.retryText}>ลองใหม่</Text>
      </PressableScale>
    </View>
  )
}
