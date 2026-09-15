import { StyleSheet, View } from 'react-native'
import { useVideoPlayer, VideoView } from 'expo-video'

type Props = { uri: string }

/** Shows the exact durable/exported file used by share and download actions. */
export function QuestResultVideoPreview({ uri }: Props) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true
    p.play()
  })

  return (
    <View style={styles.frame}>
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls />
    </View>
  )
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    height: 180,
    marginTop: 12,
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: '#000',
  },
})
