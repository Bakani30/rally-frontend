import { useState } from 'react'
import { Alert, Platform, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Sport, Spacing } from '@/constants/theme'
import { useSyncCoachSensors } from '@/hooks/useCoachActivityInsights'
import { readDeviceBasketballCourtMetrics } from '@/lib/health/basketballCourtHealthSource'
import { useLanguageStore } from '@/stores/languageStore'

type Props = {
  activitySessionId: string
  startedAt: string
  endedAt: string | null
  surface?: 'card' | 'inline'
}

export function BasketballCoachSensorSyncCard({
  activitySessionId,
  startedAt,
  endedAt,
  surface = 'card',
}: Props) {
  const language = useLanguageStore((state) => state.language)
  const mutation = useSyncCoachSensors(activitySessionId)
  const [unsupported, setUnsupported] = useState(false)
  const startedAtMs = new Date(startedAt).getTime()
  const endedAtMs = endedAt ? new Date(endedAt).getTime() : startedAtMs + 60 * 60 * 1000
  const playWindowMs = endedAtMs - startedAtMs
  const playWindowUnavailable =
    Number.isFinite(playWindowMs) && (playWindowMs < 5 * 60 * 1000 || playWindowMs > 4 * 60 * 60 * 1000)
  const syncUnavailable = playWindowUnavailable || unsupported
  const buttonDisabled = mutation.isPending
  async function onSync() {
    setUnsupported(false)
    if (playWindowUnavailable) {
      Alert.alert(
        language === 'th' ? 'ซิงก์ไม่ได้' : 'Sync unavailable',
        language === 'th' ? 'ต้องมีช่วงเล่นอย่างน้อย 5 นาที' : 'Play window must be at least 5 minutes.',
      )
      return
    }
    const start = new Date(startedAt)
    const end = endedAt ? new Date(endedAt) : new Date(start.getTime() + 60 * 60 * 1000)
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      setUnsupported(true)
      return
    }
    try {
      const metrics = await readDeviceBasketballCourtMetrics(start, end)
      mutation.mutate(
        {
          activitySessionId,
          playStartedAt: metrics.startedAt,
          playEndedAt: metrics.endedAt,
          source: metrics.source,
          steps: metrics.steps ?? null,
          activeCalories: metrics.activeCalories ?? null,
          avgHeartRate: metrics.avgHeartRate ?? null,
          maxHeartRate: metrics.maxHeartRate ?? null,
          restingHeartRate: metrics.restingHeartRate ?? null,
          heartRateCoverageSeconds: metrics.heartRateCoverageSeconds ?? null,
          cadenceHighSeconds: metrics.cadenceHighSeconds ?? null,
          cadenceMax: metrics.cadenceMax ?? null,
        },
        {
          onError: (err) => {
            const msg = err instanceof Error ? err.message : language === 'th' ? 'ซิงก์ข้อมูลวอชไม่ได้' : 'Could not sync watch data'
            Alert.alert(language === 'th' ? 'ซิงก์ไม่สำเร็จ' : 'Sync failed', msg)
          },
        },
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : language === 'th' ? 'อ่านข้อมูลวอชไม่ได้' : 'Could not read watch data'
      if (/not available|not granted/i.test(msg)) {
        setUnsupported(true)
        return
      }
      Alert.alert(language === 'th' ? 'ซิงก์ไม่สำเร็จ' : 'Sync failed', msg)
    }
  }

  return (
    <View style={[styles.card, surface === 'inline' && styles.cardInline]}>
      <View style={styles.headerRow}>
        <MaterialCommunityIcons name="watch-variant" size={18} color={Sport.amber} />
        <Text style={styles.cardLabel}>WATCH SYNC</Text>
      </View>

      <PressableScale
        disabled={buttonDisabled}
        style={[styles.button, surface === 'inline' && styles.buttonInline, buttonDisabled && styles.buttonDisabled]}
        onPress={onSync}
        accessibilityRole="button"
        accessibilityLabel={
          syncUnavailable
            ? language === 'th'
              ? 'ซิงก์ไม่ได้'
              : 'Sync unavailable'
            : language === 'th'
              ? 'ซิงก์ความหนัก'
              : 'Sync effort data'
        }
        accessibilityState={{ disabled: buttonDisabled, busy: mutation.isPending }}
      >
        <MaterialCommunityIcons name="sync" size={14} color={Sport.bg} />
        <Text style={styles.buttonText}>
          {syncUnavailable
            ? language === 'th'
              ? 'ซิงก์ไม่ได้'
              : 'Sync unavailable'
            : mutation.isPending
              ? language === 'th'
                ? 'กำลังซิงก์…'
                : 'Syncing…'
                : mutation.isSuccess
                  ? language === 'th'
                    ? 'ซิงก์อีกครั้ง'
                    : 'Sync again'
                  : language === 'th'
                    ? 'ซิงก์ความหนัก'
                    : 'Sync effort data'}
        </Text>
      </PressableScale>

      {mutation.isSuccess && mutation.data?.intensityScore != null && (
        <Text style={styles.confirmation}>
          {language === 'th'
            ? `บันทึกความหนัก ${mutation.data.intensityScore.toFixed(0)} แล้ว`
            : `Intensity ${mutation.data.intensityScore.toFixed(0)} recorded.`}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Sport.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Sport.line,
    padding: Spacing.lg,
    gap: 8,
  },
  cardInline: {
    backgroundColor: Sport.surfaceStrong,
    borderRadius: Radius.lg,
    padding: Spacing.sm,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardLabel: { fontSize: 10, fontWeight: '900', color: Sport.muted, letterSpacing: 1.6 },
  button: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Sport.amber,
    paddingVertical: 10,
    borderRadius: Radius.lg,
  },
  buttonInline: {
    minHeight: 44,
    paddingVertical: 9,
    borderRadius: Radius.md,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: Sport.bg, fontSize: 13, fontWeight: '900' },
  confirmation: { fontSize: 11, color: Sport.green, marginTop: 2, fontWeight: '700' },
})
