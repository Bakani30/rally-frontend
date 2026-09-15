import { useState } from 'react'
import { Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import type { SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { PressableScale } from '@/components/motion/PressableScale'
import type { LocalProofAsset } from '@/lib/match/proofUploadService'
import { useWatermarkedCapture } from '@/hooks/useWatermarkedCapture'
import { formatWatermarkTimestamp } from '@/lib/share/watermarkTimestamp'
import {
  extensionForUri,
  isVideoUri,
  supportedVideoMimeTypeForUri,
  videoExtensionForMime,
  videoMimeTypeForUri,
} from '@/lib/share/videoFileType'

type Props = {
  assets: LocalProofAsset[]
  onChange: (assets: LocalProofAsset[]) => void
  max?: number
  allowVideos?: boolean
  label?: string
}

export function ProofPicker({ assets, onChange, max = 5, allowVideos = false, label }: Props) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const [loading, setLoading] = useState(false)
  // Timestamp reflects when the proof is added (gallery files have no live capture time).
  const watermark = useWatermarkedCapture({
    slot: { kind: 'timestamp', text: formatWatermarkTimestamp(new Date()) },
    domain: 'basketball_proof',
  })

  async function pick() {
    if (assets.length >= max) {
      Alert.alert('Limit reached', `Max ${max} proof files`)
      return
    }
    setLoading(true)
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: allowVideos ? ['images', 'videos'] : ['images'],
        allowsMultipleSelection: true,
        selectionLimit: max - assets.length,
        quality: 0.8,
        videoMaxDuration: 60,
      })
      if (result.canceled) return
      const composited: LocalProofAsset[] = []
      for (const a of result.assets) {
        const isVideo = isVideoAsset(a)
        if (isVideo) {
          // Native watermark export is always MP4. Resolve metadata from the
          // output URI instead of carrying source metadata forward; otherwise
          // a MOV source becomes MP4 bytes labelled video/quicktime.
          const uri = await watermark.watermarkVideo(a.uri)
          const outputMimeType = supportedVideoMimeTypeForUri(uri)
          const outputExtension = extensionForUri(uri)
          if (
            !outputMimeType
            && (
              outputExtension
              || (
                a.mimeType !== null
                && a.mimeType !== undefined
                && a.mimeType !== 'video/mp4'
                && a.mimeType !== 'video/quicktime'
              )
            )
          ) {
            throw new Error('รองรับเฉพาะวิดีโอ MP4 หรือ MOV')
          }
          const mimeType = outputMimeType ?? videoMimeTypeForUri(
            uri,
            a.mimeType === 'video/quicktime' ? 'video/quicktime' : 'video/mp4',
          )
          composited.push({
            uri,
            mimeType,
            fileName: `rally-proof.${videoExtensionForMime(mimeType)}`,
          })
        } else {
          const uri = await watermark.watermarkPhoto(a.uri)
          composited.push({ uri, mimeType: 'image/jpeg', fileName: a.fileName })
        }
      }
      onChange([...assets, ...composited].slice(0, max))
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not pick proof')
    } finally {
      setLoading(false)
    }
  }

  function remove(idx: number) {
    onChange(assets.filter((_, i) => i !== idx))
  }

  return (
    <View>
      {watermark.composerElement}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {assets.map((a, i) => (
          <View key={a.uri} style={styles.thumb}>
            {a.mimeType?.startsWith('video/') ? (
              <View style={styles.videoThumb}>
                <MaterialCommunityIcons name="play-circle-outline" size={28} color={theme.ink} />
                <Text style={styles.videoText}>Video</Text>
              </View>
            ) : (
              <Image source={{ uri: a.uri }} style={styles.img} />
            )}
            <PressableScale style={styles.removeBtn} onPress={() => remove(i)}>
              <MaterialCommunityIcons name="close" size={12} color={theme.ink} />
            </PressableScale>
          </View>
        ))}
        {assets.length < max && (
          <PressableScale style={styles.addBtn} onPress={pick} disabled={loading}>
            <MaterialCommunityIcons name="camera-plus-outline" size={22} color={theme.muted} />
            <Text style={styles.addText}>{loading || watermark.status === 'processing' ? '...' : 'Add'}</Text>
          </PressableScale>
        )}
      </ScrollView>
      <Text style={styles.hint}>{assets.length}/{max} {label ?? (allowVideos ? 'proof files' : 'photos')}</Text>
    </View>
  )
}

function isVideoAsset(asset: ImagePicker.ImagePickerAsset): boolean {
  if (asset.mimeType?.startsWith('video/')) return true
  const name = asset.fileName ?? asset.uri
  return isVideoUri(name)
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    row: { gap: 8, paddingVertical: 4 },
    thumb: {
      width: 84, height: 84, borderRadius: 10, overflow: 'hidden',
      position: 'relative',
    },
    img: { width: '100%', height: '100%' },
    videoThumb: {
      width: '100%',
      height: '100%',
      backgroundColor: theme.surfaceStrong,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    videoText: { color: theme.inkSoft, fontSize: 11, fontWeight: '800' },
    removeBtn: {
      position: 'absolute', top: 4, right: 4,
      width: 20, height: 20, borderRadius: 10,
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center', justifyContent: 'center',
    },
    addBtn: {
      width: 84, height: 84, borderRadius: 10,
      borderWidth: 1, borderStyle: 'dashed', borderColor: theme.line,
      alignItems: 'center', justifyContent: 'center', gap: 4,
      backgroundColor: theme.surface,
    },
    addText: { color: theme.muted, fontSize: 11, fontWeight: '600' },
    hint: { color: theme.mutedSoft, fontSize: 11, marginTop: 4 },
  })
}
