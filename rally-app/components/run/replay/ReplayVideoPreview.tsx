import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useVideoPlayer, VideoView } from 'expo-video'

import { RallyPalette } from '@/constants/theme'

type ReplayVideoPreviewProps = {
  uri: string
  showInstagram: boolean
  busy?: boolean
  onShare: () => void
  onSave: () => void
  onShareInstagram: () => void
  onCancel: () => void
}

// Modal card over the replay screen once the recorded clip is ready: a
// looping muted preview plus share/save actions. Presentational only — all
// export logic lives in hooks/useReplayVideoShare.ts.
export function ReplayVideoPreview({
  uri,
  showInstagram,
  busy = false,
  onShare,
  onSave,
  onShareInstagram,
  onCancel,
}: ReplayVideoPreviewProps) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true
    p.muted = true
    p.play()
  })

  return (
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <View style={styles.previewFrame}>
          <VideoView
            player={player}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            nativeControls={false}
          />
        </View>

        <View style={styles.actions}>
          <Pressable style={[styles.primaryButton, busy && styles.buttonDisabled]} onPress={onShare} disabled={busy}>
            {busy
              ? <ActivityIndicator color="#ffffff" />
              : <MaterialCommunityIcons name="export-variant" size={18} color="#ffffff" />}
            <Text style={styles.primaryButtonText}>แชร์</Text>
          </Pressable>
          <Pressable style={[styles.secondaryButton, busy && styles.buttonDisabled]} onPress={onSave} disabled={busy}>
            <MaterialCommunityIcons name="download-outline" size={18} color="#ffffff" />
            <Text style={styles.secondaryButtonText}>บันทึกวิดีโอ</Text>
          </Pressable>
          {showInstagram && (
            <Pressable style={[styles.secondaryButton, busy && styles.buttonDisabled]} onPress={onShareInstagram} disabled={busy}>
              <MaterialCommunityIcons name="instagram" size={18} color="#ffffff" />
              <Text style={styles.secondaryButtonText}>IG Story</Text>
            </Pressable>
          )}
          <Pressable style={styles.ghostButton} onPress={onCancel} disabled={busy}>
            <Text style={styles.ghostButtonText}>ปิด</Text>
          </Pressable>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 200,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    backgroundColor: '#161a18',
    padding: 16,
    gap: 14,
  },
  previewFrame: {
    width: '100%',
    aspectRatio: 9 / 16,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  actions: { gap: 10 },
  primaryButton: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: RallyPalette.blue,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '900' },
  secondaryButton: {
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  ghostButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostButtonText: { color: 'rgba(255,255,255,0.72)', fontSize: 13, fontWeight: '800' },
  buttonDisabled: { opacity: 0.58 },
})
