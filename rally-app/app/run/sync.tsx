import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams } from 'expo-router'
import { FlashList, type ListRenderItem } from '@shopify/flash-list'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Spacing, Radius, type RunArenaPalette as RunArenaColors } from '@/constants/theme'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useAuth } from '@/hooks/useAuth'
import { useRunArenaTheme } from '@/hooks/useAppTheme'
import { useChallenge } from '@/hooks/useChallenge'
import { useMatch } from '@/hooks/useMatch'
import { useSubmitActivity } from '@/hooks/useSubmitActivity'
import { buildRunningSubmissionDataFromSession } from '@/lib/activities/submission/runningSessionSubmission'
import {
  requestHealthPermissions,
  type HealthAuthorizationStatus,
} from '@/lib/run-tracking/permissions/healthPermissions'
import {
  healthWorkoutDedupeKey,
  listRecentHealthRuns,
  type HealthListItem,
} from '@/lib/run-tracking/sources/healthSourceListing'
import { importHealthRun } from '@/lib/run-tracking/sources/healthImportService'
import { formatDistance, formatDuration } from '@/lib/run-tracking/session/runSessionFormat'
import {
  describeRunSubmitError,
  extractRunSubmitErrorCode,
} from '@/lib/run-tracking/session/runSubmitErrorMessages'
import { guardedRouter } from '@/lib/navigation/guardedRouter'

/**
 * Health import sync screen — Phase 2.
 *
 * Surfaces last 14 days of running workouts from HealthKit (iOS) or
 * Health Connect (Android). Tap-to-import uses the same submit-run-session
 * boundary as gps_live; dedup happens server-side via the
 * (user_id, source, external_workout_id) unique index.
 *
 * Auto-detect now runs from the authenticated app shell. This screen remains
 * the explicit review/import surface so health workouts never move points or
 * match state without user intent.
 *
 * Out of scope for v0:
 *   - GPS path import (HKWorkoutRoute / ExerciseRoute) — Phase 4.
 *   - Multi-select + batch import.
 *
 * Permission flow:
 *   - On first visit, requests the read scope; if denied, shows a
 *     "go to Settings" hint with platform-specific copy.
 *   - Result of the permission prompt is NOT cached locally — the
 *     OS owns that state and lying to the user about it would be worse
 *     than a re-prompt.
 */

export default function HealthSyncScreen() {
  const params = useLocalSearchParams<{ matchId?: string; challengeId?: string }>()
  const matchId = normalizeParam(params.matchId)
  const challengeId = normalizeParam(params.challengeId)
  const { user } = useAuth()
  const { track } = useAnalytics()
  const runTheme = useRunArenaTheme()
  const styles = useMemo(() => createStyles(runTheme), [runTheme])
  const RunArenaPalette = runTheme
  const { data: match, isPending: matchPending } = useMatch(matchId)
  const { data: challenge, isPending: challengePending } = useChallenge(challengeId)
  const submitMatchMutation = useSubmitActivity(matchId, user?.id)
  const [authStatus, setAuthStatus] = useState<HealthAuthorizationStatus>('unknown')
  const [items, setItems] = useState<HealthListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [importingId, setImportingId] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  const matchAcceptedAt = useMemo(
    () => match?.accepted_at ? new Date(match.accepted_at) : null,
    [match?.accepted_at],
  )
  const challengeStartAt = useMemo(() => {
    if (!challenge) return null
    const joinedAt = challenge.participants.find((participant) => participant.user_id === user?.id)?.joined_at ?? null
    return maxDate([
      challenge.start_at ? new Date(challenge.start_at) : null,
      joinedAt ? new Date(joinedAt) : null,
    ])
  }, [challenge, user?.id])
  const challengeEndAt = useMemo(
    () => challenge?.end_at ? new Date(challenge.end_at) : null,
    [challenge?.end_at],
  )
  const ruleDistanceMeters = readNumberRuleParam(match?.rule_params, 'distance_meters')
  const ruleDurationSeconds = readNumberRuleParam(match?.rule_params, 'duration_seconds')
  const contextStartAt = matchAcceptedAt ?? challengeStartAt
  const contextLoading = (!!matchId && matchPending) || (!!challengeId && challengePending)
  const challengeNeedsRouteVerification = !!challengeId && !!challenge?.planned_route_geojson

  const requestAndLoad = useCallback(async () => {
    if (contextLoading) return
    setLoading(true)
    try {
      const status = await requestHealthPermissions()
      setAuthStatus(status)
      if (status === 'granted') {
        const records = await listRecentHealthRuns({
          since: contextStartAt ?? undefined,
        })
        setItems(filterEligibleRuns(records, {
          contextStartAt,
          contextEndAt: challengeEndAt,
          ruleDistanceMeters,
          ruleDurationSeconds,
        }))
      }
    } finally {
      setLoading(false)
    }
  }, [challengeEndAt, contextLoading, contextStartAt, ruleDistanceMeters, ruleDurationSeconds])

  useEffect(() => {
    if (contextLoading) return
    void requestAndLoad()
  }, [contextLoading, requestAndLoad])

  const platformLabel = Platform.OS === 'ios' ? 'HealthKit' : 'Health Connect'
  const scopeLabel = matchId ? 'match' : challengeId ? 'challenge' : 'history'

  const handleImport = useCallback(async (item: HealthListItem) => {
    if (importingId || submitMatchMutation.isPending) return
    setImportError(null)
    setImportingId(item.id)
    // Fire-once per attempt: exactly one succeeded/failed event per tap.
    const importEventBase = {
      source: item.source,
      has_match: Boolean(matchId),
      has_challenge: Boolean(challengeId),
    }
    try {
      const result = await importHealthRun(item, { matchId, challengeId })
      if (matchId && match) {
        const data = buildRunningSubmissionDataFromSession({
          serverDistanceMeters: result.serverDistanceMeters,
          serverPaceSecondsPerKm: result.serverPaceSecondsPerKm,
        })
        const submission = await submitMatchMutation.mutateAsync({
          matchId,
          activityType: 'running',
          activitySessionId: result.activitySessionId,
          data,
          isTie: true,
        })
        const pending = submission.pendingSubmissions
        if (pending && pending.submitted < pending.required) {
          const message = `รอเพื่อนส่งผล ${pending.submitted}/${pending.required}`
          if (Platform.OS === 'web') globalThis.alert(message)
          else Alert.alert('Import แล้ว', message)
        }
        track({ name: 'run_health_import_succeeded', properties: importEventBase })
        guardedRouter.replace(`/match/${matchId}`, { actionKey: `run-sync:match:${matchId}` })
        return
      }
      track({ name: 'run_health_import_succeeded', properties: importEventBase })
      guardedRouter.replace({
        pathname: '/run/summary/[sessionId]',
        params: {
          sessionId: result.activitySessionId,
          ...(challengeId ? { challengeId } : {}),
        },
      }, { actionKey: `run-sync:summary:${result.activitySessionId}` })
    } catch (err) {
      track({
        name: 'run_health_import_failed',
        properties: { ...importEventBase, code: extractRunSubmitErrorCode(err) ?? 'unknown' },
      })
      // error ที่มี code แปลผ่าน central map; ข้อความไทยเดิมส่งผ่าน; ที่เหลือ fallback ไทยที่อ่านรู้เรื่อง
      const raw = err instanceof Error ? err.message : String(err)
      setImportError(
        describeRunSubmitError(err)
        ?? (/[ก-๙]/.test(raw) ? raw : 'นำเข้า workout ไม่สำเร็จ ลองใหม่อีกครั้ง'),
      )
    } finally {
      setImportingId(null)
    }
  }, [challengeId, importingId, match, matchId, submitMatchMutation, track])

  const renderItem: ListRenderItem<HealthListItem> = ({ item }) => {
    const isImporting = importingId === item.id
    const importLocked = !!importingId || submitMatchMutation.isPending

    return (
      <Pressable
        style={[styles.row, importLocked && !isImporting && styles.rowDisabled]}
        disabled={importLocked}
        onPress={() => { void handleImport(item) }}
      >
        <MaterialCommunityIcons name="run" size={20} color={RunArenaPalette.trust} />
        <View style={styles.rowMid}>
          <Text style={styles.rowTitle}>
            {(item.distanceMeters / 1000).toFixed(2)} km · {Math.round(item.durationSeconds / 60)} min
          </Text>
          <Text style={styles.rowSub} numberOfLines={1}>
            {item.startedAt.toLocaleString()}
          </Text>
        </View>
        {isImporting ? (
          <ActivityIndicator color={RunArenaPalette.trust} />
        ) : (
          <MaterialCommunityIcons name="import" size={18} color={RunArenaPalette.textMuted} />
        )}
      </Pressable>
    )
  }

  const keyExtractor = useCallback((item: HealthListItem) => healthWorkoutDedupeKey(item), [])

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>ซิงค์ Health</Text>
        <Text style={styles.title}>Import จาก {platformLabel}</Text>
        <Text style={styles.subtitle}>
          {scopeLabel === 'history'
            ? 'Rally เช็ค workout ใหม่ให้อัตโนมัติ · แตะรายการเพื่อยืนยัน import'
            : `เลือก workout เพื่อส่งเข้า ${scopeLabel} นี้`}
        </Text>
      </View>

      {(loading || contextLoading) && <ActivityIndicator color={RunArenaPalette.trust} style={{ marginTop: 32 }} />}

      {!loading && !contextLoading && authStatus === 'granted' && (
        <View style={styles.autoNotice}>
          <MaterialCommunityIcons name="shield-sync-outline" size={18} color={RunArenaPalette.trust} />
          <Text style={styles.autoNoticeText}>
          {matchId
              ? `แสดงเฉพาะ workout หลัง accept${ruleDistanceMeters ? ` · ${formatDistance(ruleDistanceMeters)}+` : ''}${ruleDurationSeconds ? ` · ${formatDuration(ruleDurationSeconds)}+` : ''}`
              : challengeId
                ? `${contextStartAt ? `หลัง join/start · ` : ''}${challengeNeedsRouteVerification ? 'Route challenge ต้อง verify เส้นทางจาก GPS path แยกต่างหาก' : 'เลือก workout เพื่อบวก progress เข้า challenge'}`
              : 'Auto-detect พร้อมแล้ว ระบบจะขอสิทธิ์ครั้งแรกต่อ user และไม่ import เงียบ ๆ ก่อนคุณเลือก'}
          </Text>
        </View>
      )}

      {!loading && !contextLoading && authStatus === 'denied' && (
        <View style={styles.notice}>
          <MaterialCommunityIcons name="lock-outline" size={28} color={RunArenaPalette.warning} />
          <Text style={styles.noticeTitle}>ยังไม่ได้รับอนุญาตอ่านข้อมูล</Text>
          <Text style={styles.noticeBody}>
            เปิดสิทธิ์อ่าน Workouts ใน{' '}
            {Platform.OS === 'ios' ? 'Health app → Sharing → Apps' : 'Health Connect → Permissions'} แล้วกลับมาที่หน้านี้
          </Text>
          <Pressable style={styles.btnPrimary} onPress={requestAndLoad}>
            <Text style={styles.btnPrimaryText}>ลองอีกครั้ง</Text>
          </Pressable>
        </View>
      )}

      {!loading && !contextLoading && authStatus === 'unavailable' && (
        <View style={styles.notice}>
          <MaterialCommunityIcons name="alert-circle-outline" size={28} color={RunArenaPalette.danger} />
          <Text style={styles.noticeTitle}>{platformLabel} ใช้งานไม่ได้บนเครื่องนี้</Text>
        </View>
      )}

      {!loading && !contextLoading && authStatus === 'granted' && items.length === 0 && (
        <View style={styles.notice}>
          <MaterialCommunityIcons name="run" size={28} color={RunArenaPalette.textMuted} />
          <Text style={styles.noticeTitle}>
            {matchId
              ? 'ยังไม่มี workout ที่เข้าเงื่อนไข match'
              : challengeId
                ? 'ยังไม่มี workout ที่เข้าเงื่อนไข challenge'
                : 'ยังไม่มีกิจกรรมการวิ่งใน 14 วัน'}
          </Text>
          <Text style={styles.noticeBody}>
            {matchId
              ? `เลือก workout ที่เริ่มหลัง accept match${ruleDistanceMeters ? ` และครบ ${formatDistance(ruleDistanceMeters)}` : ''}`
              : challengeId
                ? 'เลือก workout ที่เริ่มในช่วง challenge และหลังเวลาที่คุณ join'
              : `กิจกรรมที่บันทึกผ่าน ${platformLabel} จะปรากฏที่นี่`}
          </Text>
        </View>
      )}

      {!loading && !contextLoading && authStatus === 'granted' && items.length > 0 && (
        <>
          {importError && (
            <View style={styles.errorBanner}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color={RunArenaPalette.danger} />
              <Text style={styles.errorText}>{importError}</Text>
            </View>
          )}
          <FlashList
            data={items}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            ItemSeparatorComponent={Separator}
            contentContainerStyle={styles.list}
          />
        </>
      )}
    </SafeAreaView>
  )
}

const Separator = () => <View style={{ height: Spacing.sm }} />

function normalizeParam(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value
  const trimmed = raw?.trim()
  return trimmed ? trimmed : undefined
}

function readNumberRuleParam(
  ruleParams: Record<string, unknown> | null | undefined,
  key: 'distance_meters' | 'duration_seconds',
): number | null {
  const value = ruleParams?.[key]
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : null
}

function filterEligibleRuns(
  records: readonly HealthListItem[],
  rule: {
    contextStartAt: Date | null
    contextEndAt: Date | null
    ruleDistanceMeters: number | null
    ruleDurationSeconds: number | null
  },
): HealthListItem[] {
  const startAtMs = rule.contextStartAt?.getTime() ?? null
  const endAtMs = rule.contextEndAt?.getTime() ?? null
  return records.filter((item) => {
    if (startAtMs !== null && item.startedAt.getTime() < startAtMs) return false
    if (endAtMs !== null && item.startedAt.getTime() > endAtMs) return false
    if (rule.ruleDistanceMeters !== null && item.distanceMeters < rule.ruleDistanceMeters) return false
    if (rule.ruleDurationSeconds !== null && item.durationSeconds < rule.ruleDurationSeconds) return false
    return true
  })
}

function maxDate(values: readonly (Date | null)[]): Date | null {
  const timestamps = values
    .map((value) => value?.getTime() ?? NaN)
    .filter(Number.isFinite)
  if (timestamps.length === 0) return null
  return new Date(Math.max(...timestamps))
}

function createStyles(palette: RunArenaColors) {
  const RunArenaPalette = palette

  return StyleSheet.create({
  root: { flex: 1, backgroundColor: RunArenaPalette.background },
  header: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, gap: 4 },
  eyebrow: {
    fontSize: 11, fontWeight: '900', color: RunArenaPalette.trust,
    letterSpacing: 1.2, textTransform: 'uppercase',
  },
  title: { fontSize: 28, fontWeight: '900', color: RunArenaPalette.text, letterSpacing: 0 },
  subtitle: { fontSize: 12, color: RunArenaPalette.textMuted, marginTop: 2, letterSpacing: 0 },
  list: { padding: Spacing.lg, paddingBottom: 40 },
  autoNotice: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: RunArenaPalette.trustSoft,
    borderWidth: 1,
    borderColor: RunArenaPalette.trust,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  autoNoticeText: {
    flex: 1,
    color: RunArenaPalette.trust,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: RunArenaPalette.surfaceRaised, borderRadius: Radius.xl,
    paddingVertical: 14, paddingHorizontal: Spacing.md,
    borderWidth: 1, borderColor: RunArenaPalette.primaryLine,
  },
  rowDisabled: { opacity: 0.55 },
  rowMid: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 14, fontWeight: '700', color: RunArenaPalette.text },
  rowSub: { fontSize: 12, color: RunArenaPalette.textMuted, marginTop: 2 },
  notice: {
    margin: Spacing.xl, padding: Spacing.lg, borderRadius: Radius.xl,
    backgroundColor: RunArenaPalette.surfaceRaised, borderWidth: 1, borderColor: RunArenaPalette.primaryLine,
    alignItems: 'center', gap: Spacing.sm,
  },
  noticeTitle: { fontSize: 15, fontWeight: '800', color: RunArenaPalette.text, textAlign: 'center' },
  noticeBody: { fontSize: 12, color: RunArenaPalette.textMuted, textAlign: 'center', lineHeight: 18 },
  errorBanner: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: RunArenaPalette.dangerSoft,
    borderWidth: 1,
    borderColor: RunArenaPalette.danger,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  errorText: { flex: 1, color: RunArenaPalette.danger, fontSize: 12, fontWeight: '700' },
  btnPrimary: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xl, paddingVertical: 12,
    borderRadius: Radius.lg, backgroundColor: RunArenaPalette.trust,
  },
  btnPrimaryText: { color: RunArenaPalette.chalk, fontWeight: '900', fontSize: 14 },
  })
}
