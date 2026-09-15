import { useEffect } from 'react'
import { Modal, ScrollView, Text, View } from 'react-native'
import { Image } from 'expo-image'
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { PressableScale } from '@/components/motion/PressableScale'
import { RallyText } from '@/components/ui/RallyText'
import { TIER_LABEL, TIERS_LOW_TO_HIGH } from '@/lib/cosmetics/rankFrameGating'
import { LEADERBOARD_ACTIVITIES } from '@/lib/leaderboard/leaderboardConfig'
import { getRankIcon } from '@/lib/ranks/rankAssets'
import type { TierEvent } from '@/lib/ranks/tierEventTypes'
import { promotionMomentStyles as styles } from './promotionMomentStyles'

type PromotionMomentProps = {
  visible: boolean
  event: TierEvent | null
  // Optional rating delta (from match_participants.rating_before/after) — the
  // recap flow already computes this for the match that triggered the
  // promotion; if the caller has no match context, omit and the delta line
  // is simply not shown (YAGNI: no dedicated fetch just for this display).
  ratingDelta?: number | null
  onEquipFrame: () => void
  onDismiss: () => void
}

const ACTIVITY_LABEL: Record<TierEvent['activityType'], string> = Object.fromEntries(
  LEADERBOARD_ACTIVITIES.map((a) => [a.key, a.label]),
) as Record<TierEvent['activityType'], string>

/**
 * Full-screen celebratory moment for a rank promotion (Rank Identity v1,
 * mockup จอ 4). CRITICAL: only ever mount this with a `promotion`-direction
 * event — callers must pre-filter via triageTierEvents' `momentEvent`, which
 * already excludes demotions. This component does not re-check direction;
 * the guarantee lives in the triage layer (tierEventTriage.ts) and its tests.
 */
export function PromotionMoment({
  visible, event, ratingDelta, onEquipFrame, onDismiss,
}: PromotionMomentProps) {
  const reduceMotion = useReducedMotion()
  const pop = useSharedValue(reduceMotion ? 1 : 0)

  useEffect(() => {
    if (!visible) return
    if (reduceMotion) {
      pop.value = 1
      return
    }
    pop.value = withSequence(
      withTiming(1.12, { duration: 180, easing: Easing.out(Easing.back(2)) }),
      withTiming(1, { duration: 140 }),
    )
  }, [visible, reduceMotion, pop])

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }], opacity: pop.value }))

  if (!event) return null

  const activityLabel = ACTIVITY_LABEL[event.activityType]
  const fromLabel = TIER_LABEL[event.fromTier]
  const toLabel = TIER_LABEL[event.toTier]

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <RallyText variant="head" style={styles.eyebrow}>เลื่อนขั้น</RallyText>
            <Animated.View style={[styles.rankIconWrap, iconStyle]}>
              <Image source={getRankIcon(event.toTier)} style={{ width: 190, height: 190 }} contentFit="contain" />
            </Animated.View>
            <Text style={styles.tierName}>{toLabel}</Text>
            <RallyText variant="body" style={styles.transitionRow}>
              {activityLabel} · {fromLabel} → {toLabel}
            </RallyText>
            {ratingDelta != null && (
              <Text style={styles.ratingDelta}>{ratingDelta >= 0 ? `+${ratingDelta}` : ratingDelta}</Text>
            )}
            <View style={styles.ladderRow}>
              {TIERS_LOW_TO_HIGH.map((tier) => (
                <View
                  key={tier}
                  style={[styles.ladderIconWrap, tier === event.toTier && styles.ladderIconWrapCurrent]}
                >
                  <Image source={getRankIcon(tier)} style={{ width: 30, height: 30 }} contentFit="contain" />
                </View>
              ))}
            </View>
            <View style={styles.actions}>
              <PressableScale style={styles.primaryBtn} onPress={onEquipFrame}>
                <RallyText variant="head" style={styles.primaryBtnText}>ใส่กรอบ {toLabel} เลย</RallyText>
              </PressableScale>
              <PressableScale style={styles.secondaryBtn} onPress={onDismiss}>
                <RallyText variant="body" style={styles.secondaryBtnText}>ไว้ทีหลัง</RallyText>
              </PressableScale>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  )
}
