import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Radius, Sport, Spacing } from '@/constants/theme'
import { useAutoBasketballCoachSensorSync } from '@/hooks/useAutoBasketballCoachSensorSync'
import { useCoachActivityInsights } from '@/hooks/useCoachActivityInsights'
import { useLanguageStore } from '@/stores/languageStore'
import { BasketballCoachContextCard } from './BasketballCoachContextCard'
import type { CoachBenchmarkFormat } from '@/lib/coach/coachTypes'

type BasketballCoachStartInputCardProps = {
  activitySessionId: string
  startedAt: string
  endedAt: string | null
  ownTeamScore?: number | null
  benchmarkFormat?: CoachBenchmarkFormat | null
  onSaved?: () => void
}

export function BasketballCoachStartInputCard({
  activitySessionId,
  startedAt,
  endedAt,
  ownTeamScore = null,
  benchmarkFormat = null,
  onSaved,
}: BasketballCoachStartInputCardProps) {
  const language = useLanguageStore((state) => state.language)
  const { data, isPending, error } = useCoachActivityInsights(activitySessionId)

  useAutoBasketballCoachSensorSync({
    activitySessionId,
    startedAt,
    endedAt,
    sensorState: data?.sensorState.status,
    enabled: Boolean(data),
  })

  if (isPending) {
    return (
      <View style={styles.shell}>
        <Text style={styles.eyebrow}>COACH INPUT</Text>
        <ActivityIndicator color={Sport.amber} />
      </View>
    )
  }

  if (error || !data) {
    return (
      <View style={styles.shell}>
        <MaterialCommunityIcons name="chart-box-outline" size={22} color={Sport.muted} />
        <Text style={styles.errorText}>
          {language === 'th' ? 'ยังเริ่มวิเคราะห์ไม่ได้' : 'Coach input unavailable.'}
        </Text>
      </View>
    )
  }

  return (
    <BasketballCoachContextCard
      activitySessionId={activitySessionId}
      title={language === 'th' ? 'เริ่มวิเคราะห์แมตช์นี้' : 'Start this match read'}
      helperText={
        language === 'th'
          ? 'กรอก Role กับสถิติที่จำได้ก่อน แล้วระบบจะเปิดรายงานให้'
          : 'Add your role and tracked stats first, then open the report.'
      }
      submitLabel={language === 'th' ? 'บันทึกแล้วดูรายงาน' : 'Save and view report'}
      initial={data.currentContext ?? undefined}
      ownTeamScore={ownTeamScore}
      benchmarkFormat={benchmarkFormat}
      onSaved={onSaved}
    />
  )
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: Sport.surface,
    borderRadius: Radius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(234,195,26,0.32)',
    padding: Spacing.lg,
    gap: Spacing.md,
    alignItems: 'center',
  },
  eyebrow: { color: Sport.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1.7 },
  errorText: { color: Sport.muted, fontSize: 12, fontWeight: '800' },
})
