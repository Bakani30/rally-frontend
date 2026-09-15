import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { Spacing } from '@/constants/theme'
import { useLanguageStore } from '@/stores/languageStore'
import type { RevealBeat, RevealBeatKind } from '@/lib/coach/analysis/analysisRevealBeats'
import { A } from './basketballAnalysisStyles'

const TONE: Record<RevealBeatKind, { bg: string; ink: string; chip: string }> = {
  result: { bg: A.navy, ink: '#ffffff', chip: 'rgba(255,255,255,0.16)' },
  strength: { bg: A.winInk, ink: '#ffffff', chip: 'rgba(255,255,255,0.20)' },
  gap: { bg: A.loseInk, ink: '#ffffff', chip: 'rgba(255,255,255,0.20)' },
  signature: { bg: A.navy, ink: '#ffffff', chip: 'rgba(255,255,255,0.16)' },
  mastery: { bg: A.orange, ink: A.navy, chip: 'rgba(40,56,69,0.14)' },
}

type AnalysisRevealPopupProps = {
  beats: RevealBeat[]
  onDone: () => void
}

// Tap-through "reveal" sequence shown over the report on entry — one real
// highlight per tap; the last tap dismisses to the full report underneath.
export function AnalysisRevealPopup({ beats, onDone }: AnalysisRevealPopupProps) {
  const language = useLanguageStore((s) => s.language)
  const insets = useSafeAreaInsets()
  const th = language === 'th'
  const [index, setIndex] = useState(0)
  const beat = beats[index]
  const tone = TONE[beat.kind]
  const last = index === beats.length - 1
  const advance = () => (last ? onDone() : setIndex((i) => i + 1))

  return (
    <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(150)} style={styles.backdrop}>
      <Pressable style={[styles.skip, { top: insets.top + Spacing.sm }]} onPress={onDone} hitSlop={14}>
        <Text style={styles.skipText}>{th ? 'ข้าม' : 'SKIP'}</Text>
      </Pressable>

      <PressableScale onPress={advance} style={styles.cardPress}>
        <Animated.View key={index} entering={FadeInDown.duration(300).springify().damping(15)} style={[styles.card, { backgroundColor: tone.bg }]}>
          <Text style={[styles.eyebrow, { color: tone.ink }]}>{beat.eyebrow}</Text>
          <Text style={[styles.title, { color: tone.ink }]} numberOfLines={2} adjustsFontSizeToFit>
            {beat.title}
          </Text>
          {beat.detail && (
            <View style={[styles.detailChip, { backgroundColor: tone.chip }]}>
              <Text style={[styles.detailText, { color: tone.ink }]}>{beat.detail}</Text>
            </View>
          )}
        </Animated.View>
      </PressableScale>

      <View style={styles.dots}>
        {beats.map((b, i) => (
          <View key={b.kind + i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      <PressableScale style={styles.nextBtn} onPress={advance}>
        <Text style={styles.nextText}>{last ? (th ? 'ดูรายงานเต็ม' : 'VIEW REPORT') : th ? 'ถัดไป' : 'NEXT'}</Text>
        <MaterialCommunityIcons name={last ? 'file-document-outline' : 'arrow-right'} size={18} color="#ffffff" />
      </PressableScale>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(18,18,18,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  skip: { position: 'absolute', right: 22, paddingHorizontal: 8, paddingVertical: 4 },
  skipText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '900', letterSpacing: 0.8 },
  cardPress: { width: '100%', maxWidth: 360 },
  card: { width: '100%', minHeight: 230, borderRadius: 26, paddingHorizontal: 26, paddingVertical: 34, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 13, fontWeight: '900', letterSpacing: 2, opacity: 0.72 },
  title: { fontSize: 46, fontWeight: '900', fontStyle: 'italic', textAlign: 'center', marginTop: 10 },
  detailChip: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 7, marginTop: 18 },
  detailText: { fontSize: 17, fontWeight: '900', fontVariant: ['tabular-nums'] },
  dots: { flexDirection: 'row', gap: 7, marginTop: 22 },
  dot: { width: 7, height: 7, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.32)' },
  dotActive: { backgroundColor: '#ffffff', width: 20 },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 26,
    backgroundColor: A.orange, borderRadius: 999, paddingHorizontal: 26, paddingVertical: 13,
  },
  nextText: { color: '#ffffff', fontSize: 15, fontWeight: '900', letterSpacing: 0.4 },
})
