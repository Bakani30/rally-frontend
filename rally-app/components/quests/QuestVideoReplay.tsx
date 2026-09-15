// Local video-replay surface for the quest-proof preview.
// Plays the just-recorded clip (expo-video) and lets the user replay it as many
// times as they want before confirming. Pure presentation: receives a local
// file URI, owns only the player instance — no upload, no network.
import { StyleSheet, Text, View } from 'react-native'
import { useVideoPlayer, VideoView } from 'expo-video'

import { PressableScale } from '@/components/motion/PressableScale'
import { CaptureWatermarkBoard, type DataSlot } from '@/components/share/CaptureWatermarkBoard'

type QuestVideoReplayProps = {
  /** Local file:// URI of the recorded clip. */
  uri: string
  /** Same board that is baked into the submitted/downloaded clip. */
  watermarkSlot?: DataSlot
}

/** Full-bleed player that auto-plays once and offers a tap-to-replay control. */
export function QuestVideoReplay({ uri, watermarkSlot }: QuestVideoReplayProps) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false
    p.play()
  })

  function replay() {
    player.replay()
  }

  return (
    <View style={styles.root}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
      />
      {watermarkSlot && (
        <View pointerEvents="none" style={styles.watermark}>
          <CaptureWatermarkBoard slot={watermarkSlot} />
        </View>
      )}
      {/* Tap anywhere to replay — the clip does not loop on its own. */}
      <PressableScale onPress={replay} style={styles.replayHit} accessibilityLabel="ดูวิดีโอซ้ำ">
        <View style={styles.replayPill}>
          <Text style={styles.replayIcon}>↺</Text>
          <Text style={styles.replayText}>ดูซ้ำ</Text>
        </View>
      </PressableScale>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000' },
  watermark: {
    position: 'absolute',
    top: 52,
    left: 16,
    right: 16,
  },
  // Full-area tap target so any tap replays; the pill sits at the bottom-centre.
  replayHit: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 140,
  },
  replayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  replayIcon: { color: '#fff', fontSize: 16, fontWeight: '900' },
  replayText: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
})
