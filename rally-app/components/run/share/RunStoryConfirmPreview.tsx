// Photo/video preview inside the run-story share-confirm dialog
// (app/run/share/[sessionId].tsx). Owns the expo-video player for the
// video case so the screen never has to call useVideoPlayer conditionally.
import { Image, StyleSheet } from 'react-native'
import { useVideoPlayer, VideoView } from 'expo-video'

type RunStoryConfirmPreviewProps = {
  uri: string
  kind: 'photo' | 'video'
}

export function RunStoryConfirmPreview({ uri, kind }: RunStoryConfirmPreviewProps) {
  const isVideo = kind === 'video'
  const player = useVideoPlayer(isVideo ? uri : null, (p) => {
    p.loop = true
    p.muted = true
    p.play()
  })

  if (isVideo) {
    return (
      <VideoView player={player} style={styles.media} contentFit="contain" nativeControls={false} />
    )
  }
  return <Image source={{ uri }} style={styles.media} resizeMode="contain" />
}

const styles = StyleSheet.create({
  media: { width: '100%', height: '100%' },
})
