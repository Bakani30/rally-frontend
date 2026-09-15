import { ActivityIndicator, Alert, Platform, StyleSheet, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { EventRouteMapView } from '@/components/maps/EventRouteMapView'
import { PressableScale } from '@/components/motion/PressableScale'
import { ActivityColor, Fonts, onAccent, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useAuth } from '@/hooks/useAuth'
import { useChallenge } from '@/hooks/useChallenge'
import { useChallengeActions } from '@/hooks/useChallengeActions'
import { extractPlannedRouteGeometry } from '@/lib/maps/plannedRouteGeometry'
import { ACTIVITY_LABEL } from '@/lib/match/matchConfig'
import { guardedRouter } from '@/lib/navigation/guardedRouter'

/**
 * Full event map for one official challenge: the trusted planned route drawn
 * over the map with start/finish markers and a compact event card. Loads the
 * challenge by id through the existing query layer — route coordinates are
 * never passed via navigation params. Viewing the route requires no location
 * permission.
 */

const BOTTOM_CARD_RESERVED_PX = 260

export default function ChallengeRouteMapScreen() {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const insets = useSafeAreaInsets()
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>()
  const { user } = useAuth()
  const { data: challenge, isPending, error } = useChallenge(id)
  const { joinMutation } = useChallengeActions(id, user?.id)

  if (isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.orange} />
        <Text style={styles.stateText}>กำลังโหลด event…</Text>
      </View>
    )
  }

  if (error || !challenge) {
    return (
      <View style={styles.center}>
        <MaterialCommunityIcons name="flag-off-outline" size={42} color={theme.muted} />
        <Text style={styles.stateText}>ไม่พบ event นี้</Text>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="ย้อนกลับ"
          style={styles.secondaryBtn}
          onPress={() => router.back()}
        >
          <Text style={styles.secondaryBtnText}>ย้อนกลับ</Text>
        </PressableScale>
      </View>
    )
  }

  const geometry = extractPlannedRouteGeometry(challenge.planned_route_geojson)
  const accent = ActivityColor[challenge.activity_type] ?? theme.orange
  const isJoined = challenge.participants.some((p) => p.user_id === user?.id)
  const isEnded = new Date(challenge.end_at).getTime() <= Date.now()
  const isFull =
    !!challenge.max_participants && challenge.participants.length >= challenge.max_participants
  const canJoin = !isJoined && !isEnded && !isFull
    && (challenge.status === 'active' || challenge.status === 'scheduled')
  const startDate = new Date(challenge.start_at)
  const dateLabel = Number.isNaN(startDate.getTime())
    ? ''
    : new Intl.DateTimeFormat('th-TH', {
        weekday: 'short', day: 'numeric', month: 'short',
        hour: '2-digit', minute: '2-digit',
      }).format(startDate)

  function showError(e: unknown) {
    const message = e instanceof Error ? e.message : 'Something went wrong.'
    if (Platform.OS === 'web') {
      globalThis.alert(`Error\n\n${message}`)
      return
    }
    Alert.alert('Error', message)
  }

  function onJoin() {
    joinMutation.mutate(challenge!.id, { onError: showError })
  }

  function openDetail() {
    guardedRouter.push(`/challenges/${challenge!.id}`, {
      actionKey: `event-map:detail:${challenge!.id}`,
    })
  }

  return (
    <View style={styles.root}>
      {geometry ? (
        <EventRouteMapView geometry={geometry} bottomPaddingPx={BOTTOM_CARD_RESERVED_PX + insets.bottom} />
      ) : (
        <View style={[styles.center, { backgroundColor: theme.bg }]}>
          <MaterialCommunityIcons name="map-marker-off-outline" size={38} color={theme.muted} />
          <Text style={styles.stateText}>event นี้ยังไม่มีเส้นทาง official</Text>
        </View>
      )}

      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="ย้อนกลับ"
        style={[styles.backButton, { top: insets.top + 10 }]}
        onPress={() => router.back()}
      >
        <MaterialCommunityIcons name="arrow-left" size={20} color={theme.ink} />
      </PressableScale>

      <View style={[styles.bottomCard, { paddingBottom: Spacing.md + insets.bottom }]}>
        {from === 'weekly' && (
          <View style={styles.weeklyPill}>
            <MaterialCommunityIcons name="lightning-bolt" size={11} color="#ffffff" />
            <Text style={styles.weeklyPillText}>แนะนำประจำสัปดาห์</Text>
          </View>
        )}
        <Text style={styles.title} numberOfLines={2}>{challenge.title}</Text>

        {geometry && geometry.distanceKm >= 0.1 && (
          <View style={styles.statRow}>
            <Text style={[styles.statValue, { color: accent }]}>
              {geometry.distanceKm.toFixed(1)}
            </Text>
            <Text style={styles.statUnit}>กม.</Text>
            <Text style={styles.statHint}>ระยะทางของเส้นทางนี้</Text>
          </View>
        )}

        <View style={styles.metaRow}>
          <View style={styles.metaPill}>
            <MaterialCommunityIcons name="run-fast" size={11} color={theme.muted} />
            <Text style={styles.metaText}>
              {ACTIVITY_LABEL[challenge.activity_type]}
              {challenge.goal_type === 'distance_km' ? ` ${challenge.goal_value} กม.` : ''}
            </Text>
          </View>
          {!!dateLabel && (
            <View style={styles.metaPill}>
              <MaterialCommunityIcons name="calendar-clock" size={11} color={theme.muted} />
              <Text style={styles.metaText}>{dateLabel}</Text>
            </View>
          )}
          <View style={styles.metaPill}>
            <MaterialCommunityIcons name="account-group" size={11} color={theme.muted} />
            <Text style={styles.metaText}>
              {challenge.participants.length}
              {challenge.max_participants ? `/${challenge.max_participants}` : ''} คน
            </Text>
          </View>
          {challenge.campaigns?.partner_name && (
            <View style={styles.metaPill}>
              <MaterialCommunityIcons name="handshake-outline" size={11} color={theme.muted} />
              <Text style={styles.metaText}>{challenge.campaigns.partner_name}</Text>
            </View>
          )}
        </View>

        {geometry && (
          <View style={styles.legendRow}>
            <View style={[styles.metaPill, { borderColor: theme.green, backgroundColor: theme.greenSoft }]}>
              <MaterialCommunityIcons name="map-marker-path" size={11} color={theme.greenVivid} />
              <Text style={[styles.metaText, { color: theme.greenVivid }]}>Official Route</Text>
            </View>
            {geometry.isLoop ? (
              <Text style={styles.legendText}>● จุด Start/Finish เดียวกัน (เส้นทางวนรอบ)</Text>
            ) : (
              <Text style={styles.legendText}>● เขียว = Start · ● ดำ = Finish</Text>
            )}
          </View>
        )}

        <View style={styles.actionRow}>
          {isJoined ? (
            // Joined is a status, not an action — keep it a compact badge and
            // hand the wide tap target to the real next step (รายละเอียด).
            <View style={[styles.joinedTag, { borderColor: theme.green }]}>
              <MaterialCommunityIcons name="check" size={13} color={theme.green} />
              <Text style={[styles.joinedText, { color: theme.greenVivid }]}>เข้าร่วมแล้ว</Text>
            </View>
          ) : (
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={`เข้าร่วม ${challenge.title}`}
              style={[styles.primaryBtn, { backgroundColor: accent }, !canJoin && { opacity: 0.5 }]}
              disabled={!canJoin || joinMutation.isPending}
              onPress={onJoin}
            >
              <Text style={[styles.primaryBtnText, { color: onAccent(accent) }]}>
                {isFull ? 'เต็มแล้ว' : isEnded ? 'จบแล้ว' : joinMutation.isPending ? 'กำลังเข้าร่วม…' : 'เข้าร่วม EVENT'}
              </Text>
            </PressableScale>
          )}
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="เปิดรายละเอียด event"
            style={[styles.secondaryBtn, isJoined && { flex: 1 }]}
            onPress={openDetail}
          >
            <Text style={styles.secondaryBtnText}>รายละเอียด</Text>
          </PressableScale>
        </View>
      </View>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.bg },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingHorizontal: 24,
    },
    stateText: { color: theme.muted, fontSize: 13, fontFamily: Fonts?.thaiMedium, textAlign: 'center' },
    backButton: {
      position: 'absolute',
      left: Spacing.md,
      width: 44,
      height: 44,
      borderRadius: Radius.pill,
      backgroundColor: theme.panelBg,
      borderWidth: 2,
      borderColor: theme.arcadeCabinetEdge,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bottomCard: {
      position: 'absolute',
      left: Spacing.md,
      right: Spacing.md,
      bottom: Spacing.md,
      backgroundColor: theme.panelBg,
      borderRadius: Radius.xl,
      borderWidth: 2,
      borderColor: theme.arcadeCabinetEdge,
      padding: Spacing.md,
      gap: Spacing.sm,
      shadowColor: theme.arcadeShadow,
      shadowOpacity: 0.16,
      shadowRadius: 0,
      shadowOffset: { width: 3, height: 4 },
    },
    weeklyPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      alignSelf: 'flex-start',
      backgroundColor: theme.orange,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: Radius.pill,
    },
    weeklyPillText: { color: '#ffffff', fontSize: 10, fontFamily: Fonts?.thaiMedium, letterSpacing: 0.5 },
    title: { fontSize: 16, fontFamily: Fonts?.thaiHead, color: theme.ink },
    statRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 5 },
    statValue: {
      fontSize: 28,
      fontWeight: '900',
      fontFamily: Fonts?.rounded,
      fontVariant: ['tabular-nums'],
      letterSpacing: -0.8,
      lineHeight: 30,
    },
    statUnit: { fontSize: 13, color: theme.inkSoft, fontFamily: Fonts?.thaiMedium, marginBottom: 2 },
    statHint: { fontSize: 10, color: theme.muted, fontFamily: Fonts?.thaiBody, marginBottom: 3, marginLeft: 4 },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    metaPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: Radius.pill,
      backgroundColor: theme.surfaceStrong,
      borderWidth: 1,
      borderColor: theme.line,
    },
    metaText: { fontSize: 11, color: theme.inkSoft, fontFamily: Fonts?.thaiMedium, letterSpacing: 0.2 },
    legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    legendText: { fontSize: 10, color: theme.muted, fontFamily: Fonts?.thaiBody },
    actionRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
    primaryBtn: {
      flex: 1,
      minHeight: 46,
      borderRadius: Radius.pill,
      backgroundColor: theme.orange,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryBtnText: { fontSize: 13, fontFamily: Fonts?.thaiHead, letterSpacing: 0.4 },
    joinedTag: {
      minHeight: 46,
      paddingHorizontal: Spacing.md,
      borderRadius: Radius.pill,
      borderWidth: 2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      backgroundColor: theme.greenSoft,
    },
    joinedText: { fontSize: 12, fontFamily: Fonts?.thaiMedium, letterSpacing: 0.3 },
    secondaryBtn: {
      minHeight: 46,
      paddingHorizontal: Spacing.lg,
      borderRadius: Radius.pill,
      borderWidth: 2,
      borderColor: theme.arcadeCabinetEdge,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surfaceStrong,
    },
    secondaryBtnText: { color: theme.ink, fontSize: 13, fontFamily: Fonts?.thaiHead },
  })
}
