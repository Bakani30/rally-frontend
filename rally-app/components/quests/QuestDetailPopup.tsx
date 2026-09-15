// Quest detail popup — bottom sheet (slides up like the lobby player profile popup),
// light + dark, three branches per verifier type.
// Branch logic: inline_daily_mission (sensor_sync) → health card, no button.
//               start_session (timed/capture)       → stat boxes + "เริ่มเควส" flat button.
//               external (geofence)                 → button → /map-quest.
// ALL React hooks are called unconditionally before any conditional render.
import { useEffect, useMemo, useRef } from 'react'
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { onAccent } from '@/constants/theme'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useAuth } from '@/hooks/useAuth'
import { useThemeMode } from '@/hooks/useAppTheme'
import { useDailyMissionSync } from '@/hooks/useDailyMissionSync'
import { useQuestDailyState } from '@/hooks/useQuestDailyState'
import { useQuestProof } from '@/hooks/useQuestProof'
import { DAILY_MISSION_DISTANCE_METERS } from '@/lib/daily-mission/dailyMissionTypes'
import { formatMmss } from '@/lib/quest-proof/formatDuration'
import { questErrorCode, questErrorMessageTH } from '@/lib/quest-proof/questProofErrors'
import { resolveStartTarget } from '@/lib/quest-proof/questStartTarget'
import type { QuestTemplateView } from '@/lib/quest-proof/questProofTypes'

type Props = {
  view: QuestTemplateView | null
  onClose: () => void
}

/** Format the time-limit for the เวลา stat box; '–' when there is no limit. */
function formatTime(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '–'
  return formatMmss(seconds)
}

type StatTheme = {
  panelBg: string
  panelBorder: string
  statLabel: string
  statValue: string
  statUnit: string
}

function StatBox({ label, value, unit, t }: { label: string; value: string; unit?: string; t: StatTheme }) {
  return (
    <View style={[styles.statBox, { backgroundColor: t.panelBg, borderColor: t.panelBorder }]}>
      <Text style={[styles.statLabel, { color: t.statLabel }]}>{label}</Text>
      <Text style={[styles.statValue, { color: t.statValue }]} numberOfLines={2}>
        {value}
        {unit ? <Text style={[styles.statUnit, { color: t.statUnit }]}> {unit}</Text> : null}
      </Text>
    </View>
  )
}

export function QuestDetailPopup({ view, onClose }: Props) {
  // ── ALL hooks unconditional ──────────────────────────────────────────────────
  const mode = useThemeMode()
  const { user } = useAuth()
  const { startMutation } = useQuestProof(user?.id)
  const dailyMission = useDailyMissionSync(user?.id)
  const dailyState = useQuestDailyState(user?.id)
  const { track } = useAnalytics()
  const lastAutoSyncedId = useRef<string | null>(null)
  const mutateDailyMission = dailyMission.mutate

  // Bottom-sheet motion (mirrors BasketballLobbyPlayerPopup): slide up on open,
  // swipe-down past the threshold slides out then closes.
  const translateY = useRef(new Animated.Value(0)).current
  const sheetOpacity = useRef(new Animated.Value(0)).current
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!view) {
      sheetOpacity.setValue(0)
      translateY.setValue(320)
      return
    }
    translateY.setValue(120)
    Animated.parallel([
      Animated.timing(sheetOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.spring(translateY, {
        toValue: 0,
        damping: 24,
        stiffness: 270,
        mass: 0.8,
        useNativeDriver: true,
      }),
    ]).start()
  }, [view, sheetOpacity, translateY])

  const panResponder = useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) =>
        gesture.dy > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_event, gesture) => {
        translateY.setValue(Math.max(0, gesture.dy))
      },
      onPanResponderRelease: (_event, gesture) => {
        if (gesture.dy > 86 || gesture.vy > 0.8) {
          Animated.timing(translateY, { toValue: 320, duration: 150, useNativeDriver: true })
            .start(() => onCloseRef.current())
          return
        }
        Animated.spring(translateY, {
          toValue: 0,
          damping: 24,
          stiffness: 270,
          mass: 0.85,
          useNativeDriver: true,
        }).start()
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start()
      },
    }),
    [translateY],
  )

  // Auto-sync health data when a sensor_sync quest popup opens (mirrors [id].tsx behavior).
  useEffect(() => {
    if (!view || resolveStartTarget(view).kind !== 'inline_daily_mission') {
      lastAutoSyncedId.current = null
      return
    }
    if (lastAutoSyncedId.current === view.templateId) return
    lastAutoSyncedId.current = view.templateId
    mutateDailyMission()
  }, [view, mutateDailyMission])

  // ── Per-mode color tokens (spec § popup-v7) ──────────────────────────────────
  const isDark = mode === 'dark'
  const cardBg = isDark ? '#000' : '#fff'
  const cardBorder = isDark ? '#54545e' : '#161616'
  const xBg = isDark ? '#242428' : '#f0eadf'
  const xBorderColor = isDark ? '#54545e' : '#cfc4b0'
  const titleColor = isDark ? '#fff' : '#161616'
  const panelBg = isDark ? '#0c0c0d' : '#f6f1e8'
  const panelBorder = isDark ? '#3a3a42' : '#e6dccb'
  const rewardLabel = isDark ? '#9a9aa2' : '#8a7f6b'
  const rewardValue = isDark ? '#eac31a' : '#c79100'
  const statT: StatTheme = {
    panelBg,
    panelBorder,
    statLabel: isDark ? '#9a9aa2' : '#9a907c',
    statValue: isDark ? '#fff' : '#161616',
    statUnit: isDark ? '#cfd0d6' : '#5b5446',
  }
  const healthBarTrack = isDark ? '#000' : '#e7ddca'
  const healthBarBorder = isDark ? '#3a3a42' : '#ddd0b6'
  const healthText = isDark ? '#fff' : '#161616'
  const healthMuted = isDark ? '#9a9aa2' : '#8a7f6b'

  // ── Health card data ─────────────────────────────────────────────────────────
  const distance = dailyMission.data?.metrics.distanceMeters ?? 0
  const steps = dailyMission.data?.metrics.steps ?? 0
  const progressRatio = Math.min(1, distance / DAILY_MISSION_DISTANCE_METERS)
  const healthStatus = dailyMission.data?.insight.title ?? 'ยังไม่ถึงเป้า'
  const syncing = dailyMission.isPending

  // ── Handlers ─────────────────────────────────────────────────────────────────
  async function handleStart() {
    if (!view) return
    track({ name: 'quest_proof_start_attempted', properties: { verifier: view.verifier, lane: view.lane } })
    try {
      const session = await startMutation.mutateAsync(view.templateId)
      track({ name: 'quest_proof_start_succeeded', properties: { verifier: view.verifier } })
      onClose()
      router.push(`/quests/proof/${session.id}?templateId=${view.templateId}`)
    } catch (e) {
      track({ name: 'quest_proof_start_failed', properties: { verifier: view.verifier, code: questErrorCode(e) } })
      Alert.alert('เริ่มเควสไม่ได้', questErrorMessageTH(e))
    }
  }

  function handleExternal() {
    onClose()
    router.push('/map-quest')
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  // Modal is always present; visible prop drives the fade animation.
  // Inner content is guarded so view.xxx is never accessed when view is null.
  const target = view ? resolveStartTarget(view) : null

  // Daily quota: only granted (points-earning) sessions consume attempts —
  // mirrors start_quest_proof_session_atomic, so failed/aborted runs stay free.
  const grantedToday = view ? dailyState.data?.[view.templateId]?.grantedToday ?? 0 : 0
  const quotaExhausted = view != null && grantedToday >= view.attemptsPerDay

  return (
    <Modal transparent visible={!!view} animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      {/* Dimmed backdrop — tap to close */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Sheet — slides up from the bottom; swipe down to dismiss */}
        {view && target && (
          <Animated.View
            {...panResponder.panHandlers}
            style={[styles.sheetWrap, { opacity: sheetOpacity, transform: [{ translateY }] }]}
          >
          <Pressable
            style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}
            onPress={() => { /* swallow */ }}
          >
            {/* Drag handle */}
            <View style={[styles.handle, { backgroundColor: xBorderColor }]} />
            {/* X close button (absolute top-right) */}
            <Pressable
              style={[styles.closeBtn, { backgroundColor: xBg, borderColor: xBorderColor }]}
              onPress={onClose}
              hitSlop={8}
              accessibilityLabel="ปิด"
              accessibilityRole="button"
            >
              <Text style={[styles.closeBtnText, { color: titleColor }]}>✕</Text>
            </Pressable>

            {/* Header: icon box + title + underline accent */}
            <View style={styles.header}>
              <View style={[styles.iconBox, { backgroundColor: view.accentColor }]}>
                <MaterialCommunityIcons
                  name={view.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                  size={26}
                  color={onAccent(view.accentColor)}
                />
              </View>
              <View style={styles.titleBlock}>
                <Text style={[styles.titleText, { color: titleColor }]} numberOfLines={2}>
                  {view.titleTH}
                </Text>
                <View style={[styles.titleUnderline, { backgroundColor: view.accentColor }]} />
              </View>
            </View>

            {/* Reward strip */}
            <View style={[styles.rewardStrip, { backgroundColor: panelBg, borderColor: panelBorder }]}>
              <Text style={[styles.rewardLabel, { color: rewardLabel }]}>รางวัล</Text>
              <Text style={[styles.rewardValue, { color: rewardValue }]}>
                +{view.rewardPoints}{' '}
                <Text style={styles.rewardUnit}>แต้ม</Text>
              </Text>
            </View>

            {/* Branch content */}
            {target.kind === 'inline_daily_mission' ? (
              /* ── Sensor-sync quest: inline health card, no button ── */
              <View style={[styles.healthSection, { backgroundColor: panelBg, borderColor: panelBorder }]}>
                <View style={styles.healthRow}>
                  <View style={styles.heartCircle}>
                    <MaterialCommunityIcons name="heart-pulse" size={16} color="#fff" />
                  </View>
                  {syncing ? (
                    <ActivityIndicator size="small" color={healthText} />
                  ) : (
                    <Text style={[styles.healthStat, { color: healthText }]}>{healthStatus}</Text>
                  )}
                </View>
                <View
                  style={[
                    styles.progressTrack,
                    { backgroundColor: healthBarTrack, borderColor: healthBarBorder },
                  ]}
                >
                  <View style={[styles.progressFill, { width: `${progressRatio * 100}%` }]} />
                </View>
                <View style={styles.healthMetrics}>
                  <Text style={[styles.healthMetric, { color: healthText }]}>
                    {(distance / 1000).toFixed(2)}{' '}
                    <Text style={{ color: healthMuted, fontSize: 10, fontStyle: 'normal' }}>/ 7.00 กม.</Text>
                  </Text>
                  <Text style={[styles.healthMetric, { color: healthText }]}>
                    {steps.toLocaleString()}{' '}
                    <Text style={{ color: healthMuted, fontSize: 10, fontStyle: 'normal' }}>ก้าว</Text>
                  </Text>
                </View>
              </View>
            ) : target.kind === 'start_session' ? (
              /* ── Timed / capture quest: stat boxes + เริ่มเควส button ── */
              <>
                <View style={styles.statsRow}>
                  <StatBox label="เป้า" value={view.targetTH || '–'} t={statT} />
                  <StatBox label="เวลา" value={formatTime(view.timeLimitSeconds)} t={statT} />
                  <StatBox label="ต่อวัน" value={String(view.attemptsPerDay)} unit="ครั้ง" t={statT} />
                </View>
                <Pressable
                  style={[
                    styles.ctaBtn,
                    { backgroundColor: view.accentColor },
                    (startMutation.isPending || quotaExhausted) && styles.ctaBtnDisabled,
                  ]}
                  onPress={() => void handleStart()}
                  disabled={startMutation.isPending || quotaExhausted}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: startMutation.isPending || quotaExhausted }}
                >
                  <Text style={[styles.ctaBtnText, { color: onAccent(view.accentColor) }]}>
                    {quotaExhausted ? 'ทำแล้ววันนี้' : startMutation.isPending ? 'กำลังโหลด…' : 'เริ่มเควส'}
                  </Text>
                </Pressable>
              </>
            ) : (
              /* ── External / geofence quest: navigate to map ── */
              <Pressable
                style={[styles.ctaBtn, { backgroundColor: view.accentColor }]}
                onPress={handleExternal}
                accessibilityRole="button"
              >
                <Text style={[styles.ctaBtnText, { color: onAccent(view.accentColor) }]}>
                  {view.ctaTH}
                </Text>
              </Pressable>
            )}
          </Pressable>
          </Animated.View>
        )}
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(8,8,9,0.66)',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 18,
  },
  sheetWrap: {
    width: '100%',
    maxWidth: 380,
  },
  card: {
    width: '100%',
    borderRadius: 22,
    borderWidth: 2,
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 64,
    height: 5,
    borderRadius: 999,
    marginTop: 8,
    marginBottom: -4,
  },
  closeBtn: {
    position: 'absolute',
    right: 11,
    top: 11,
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
  },
  closeBtnText: {
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 16,
    paddingRight: 46, // room for X button
    paddingBottom: 12,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#0d0d0d',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  titleBlock: {
    flex: 1,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '900',
    fontStyle: 'italic',
    lineHeight: 22,
  },
  titleUnderline: {
    width: 24,
    height: 2.5,
    borderRadius: 2,
    marginTop: 5,
    opacity: 0.9,
  },
  rewardStrip: {
    marginHorizontal: 14,
    height: 40,
    borderRadius: 11,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 13,
  },
  rewardLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  rewardValue: {
    fontSize: 22,
    fontWeight: '900',
    fontStyle: 'italic',
    fontVariant: ['tabular-nums'],
  },
  rewardUnit: {
    fontSize: 11,
    fontStyle: 'normal',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  statBox: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  statLabel: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '900',
    fontStyle: 'italic',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  statUnit: {
    fontSize: 8,
    fontStyle: 'normal',
  },
  ctaBtn: {
    margin: 12,
    marginBottom: 14,
    height: 50,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#0d0d0d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBtnDisabled: {
    opacity: 0.6,
  },
  ctaBtnText: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  healthSection: {
    margin: 8,
    marginHorizontal: 14,
    marginTop: 8,
    marginBottom: 14,
    borderRadius: 13,
    borderWidth: 1,
    padding: 12,
  },
  healthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  heartCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthStat: {
    fontSize: 13,
    fontWeight: '900',
  },
  progressTrack: {
    height: 7,
    borderRadius: 99,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 10,
    marginBottom: 7,
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: '#CEF17B',
  },
  healthMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  healthMetric: {
    fontSize: 14,
    fontWeight: '900',
    fontStyle: 'italic',
    fontVariant: ['tabular-nums'],
  },
})
