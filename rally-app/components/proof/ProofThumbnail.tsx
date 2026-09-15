import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { getSignedProofUrl } from '@/lib/match/proofUploadService'
import { isVideoPath } from './proofMediaUtils'

type Props = {
  path: string
  size?: number
  onPress?: (path: string, url: string) => void
}

export function ProofThumbnail({ path, size = 88, onPress }: Props) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const isVideo = isVideoPath(path)

  useEffect(() => {
    let cancelled = false
    setError(false)
    setUrl(null)
    getSignedProofUrl(path)
      .then((u) => { if (!cancelled) setUrl(u) })
      .catch(() => { if (!cancelled) setError(true) })
    return () => { cancelled = true }
  }, [path])

  return (
    <PressableScale
      style={[styles.thumb, { width: size, height: size }]}
      onPress={() => url && onPress?.(path, url)}
      disabled={!url}
      accessibilityLabel={isVideo ? 'Play video proof' : 'Open photo proof'}
    >
      {!url && !error && <ActivityIndicator color={theme.muted} />}
      {error && (
        <MaterialCommunityIcons name="image-off-outline" size={20} color={theme.muted} />
      )}
      {url && !isVideo && (
        <Image
          source={{ uri: url }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      )}
      {url && isVideo && (
        <View style={styles.videoBox}>
          <MaterialCommunityIcons name="play-circle" size={26} color={theme.chalk} />
          <Text style={styles.videoLabel}>VIDEO</Text>
        </View>
      )}
    </PressableScale>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    thumb: {
      borderRadius: Radius.md,
      overflow: 'hidden',
      backgroundColor: theme.surfaceStrong,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.line,
    },
    videoBox: {
      flex: 1,
      width: '100%',
      backgroundColor: '#000',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    videoLabel: {
      color: theme.chalk,
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 1.2,
    },
  })
}
