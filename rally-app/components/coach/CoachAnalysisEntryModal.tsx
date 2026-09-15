import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Sport, Spacing } from '@/constants/theme'
import { useCoachActivityInsights } from '@/hooks/useCoachActivityInsights'
import { useAutoBasketballCoachSensorSync } from '@/hooks/useAutoBasketballCoachSensorSync'
import { BasketballCoachContextCard } from './BasketballCoachContextCard'
import { useLanguageStore } from '@/stores/languageStore'
import type { CoachInputSignalState } from '@/lib/coach/coachInputPresentation'
import type { CoachBenchmarkFormat } from '@/lib/coach/coachTypes'

export type CoachAnalysisEntryModalProps = {
  visible: boolean
  activitySessionId: string
  startedAt: string
  endedAt: string | null
  durationSeconds?: number | null
  ownTeamScore?: number | null
  benchmarkFormat?: CoachBenchmarkFormat | null
  onDismiss: () => void
  onSaveStarted?: (input: CoachInputSignalState) => void
  onSaveFailed?: (input: CoachInputSignalState, error: unknown) => void
  onComplete: (summary: string, input: CoachInputSignalState) => void
}

export function CoachAnalysisEntryModal({
  visible,
  activitySessionId,
  startedAt,
  endedAt,
  durationSeconds,
  ownTeamScore,
  benchmarkFormat = null,
  onDismiss,
  onSaveStarted,
  onSaveFailed,
  onComplete,
}: CoachAnalysisEntryModalProps) {
  const language = useLanguageStore((state) => state.language)
  const { data } = useCoachActivityInsights(activitySessionId)

  useAutoBasketballCoachSensorSync({
    activitySessionId,
    startedAt,
    endedAt,
    sensorState: data?.sensorState.status,
    enabled: visible && Boolean(data),
  })

  const derivedDurationSeconds =
    durationSeconds ??
    (endedAt
      ? Math.max(0, Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000))
      : null)
  const isKnownShortDuration = derivedDurationSeconds != null && derivedDurationSeconds < 300
  let syncLabel = language === 'th' ? 'กำลังโหลดข้อมูล...' : 'Loading data...'
  let syncIcon: keyof typeof MaterialCommunityIcons.glyphMap = 'watch-variant'
  let syncColor = Sport.muted

  if (isKnownShortDuration) {
    syncLabel =
      language === 'th'
        ? 'เล่นไม่ถึง 5 นาที ใช้สถิติที่กรอกแทน'
        : 'Under 5 mins. Use manual stats.'
    syncIcon = 'timer-off-outline'
  } else if (data?.sensorState.status === 'available') {
    syncLabel = language === 'th' ? 'พร้อมซิงก์จากอุปกรณ์' : 'Ready to sync from device'
    syncIcon = 'watch-variant'
    syncColor = Sport.green
  } else {
    syncLabel = language === 'th' ? 'ยังไม่มีข้อมูลจากอุปกรณ์' : 'No device data yet'
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoider}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.backdrop}>
          <View style={styles.modalContent}>
            <ScrollView
              bounces={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
            >
              <View style={styles.headerRow}>
                <View style={styles.headerIcon}>
                  <MaterialCommunityIcons name="clipboard-pulse-outline" size={18} color={Sport.bg} />
                </View>
                <View style={styles.headerCopy}>
                  <Text style={styles.eyebrow}>COACH REPORT</Text>
                  <Text style={styles.title}>
                    {language === 'th' ? 'เริ่มวิเคราะห์แมตช์นี้' : 'Start Match Analysis'}
                  </Text>
                </View>
                <PressableScale
                  style={styles.closeButton}
                  onPress={onDismiss}
                  accessibilityRole="button"
                  accessibilityLabel={language === 'th' ? 'ปิดหน้ากรอกข้อมูล' : 'Close analysis setup'}
                >
                  <MaterialCommunityIcons name="close" size={18} color={Sport.inkSoft} />
                </PressableScale>
              </View>

              <Text style={styles.body}>
                {language === 'th'
                  ? 'เลือกบทบาท แล้วใส่เฉพาะสถิติที่จดไว้จริง รายงานจะอ่านจากข้อมูลนี้ทันที'
                  : 'Pick your role, then add only tracked stats. The report reads from this data.'}
              </Text>

              <View style={styles.syncRow}>
                <View style={[styles.syncIconWrap, { borderColor: syncColor }]}>
                  <MaterialCommunityIcons name={syncIcon} size={17} color={syncColor} />
                </View>
                <View style={styles.syncCopy}>
                  <Text style={styles.syncKicker}>{language === 'th' ? 'Sensor sync' : 'Sensor sync'}</Text>
                  <Text style={[styles.syncText, { color: syncColor }]}>{syncLabel}</Text>
                </View>
              </View>

              <BasketballCoachContextCard
                activitySessionId={activitySessionId}
                surface="embedded"
                showIntro={false}
                showInlineSaved={false}
                requireAnyStat
                submitLabel={language === 'th' ? 'บันทึกแล้วดูรายงาน' : 'Save and view report'}
                ownTeamScore={ownTeamScore}
                benchmarkFormat={benchmarkFormat}
                initial={data?.currentContext ?? undefined}
                onSaveStarted={onSaveStarted}
                onSaveFailed={onSaveFailed}
                onSaved={onComplete}
              />
            </ScrollView>

            <View style={styles.footer}>
              <PressableScale
                style={styles.secondaryBtn}
                onPress={onDismiss}
                accessibilityRole="button"
                accessibilityLabel={language === 'th' ? 'ดู Activity ก่อน' : 'View Activity first'}
              >
                <Text style={styles.secondaryBtnText}>
                  {language === 'th' ? 'ดู Activity ก่อน' : 'View Activity first'}
                </Text>
              </PressableScale>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  keyboardAvoider: { flex: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  modalContent: {
    backgroundColor: '#101010',
    borderRadius: Radius.xxl,
    borderWidth: 1,
    borderColor: Sport.amber,
    maxHeight: '85%',
    shadowColor: Sport.amber,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.34,
    shadowRadius: 18,
    elevation: 12,
  },
  scrollContent: { padding: Spacing.lg, gap: Spacing.md },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerIcon: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Sport.amber,
    shadowColor: Sport.amber,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 10,
  },
  headerCopy: { flex: 1 },
  eyebrow: { color: Sport.amber, fontSize: 10, fontWeight: '900', letterSpacing: 1.6 },
  title: { color: Sport.ink, fontSize: 20, fontWeight: '900', marginTop: 2 },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    backgroundColor: Sport.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { color: Sport.inkSoft, fontSize: 13, fontWeight: '700', lineHeight: 19 },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: Sport.line,
    padding: Spacing.md,
    borderRadius: Radius.lg,
  },
  syncIconWrap: {
    width: 34,
    height: 34,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.24)',
  },
  syncCopy: { flex: 1, gap: 2 },
  syncKicker: { color: Sport.mutedSoft, fontSize: 9, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
  syncText: { fontSize: 12, fontWeight: '900' },
  footer: {
    padding: Spacing.md,
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: Sport.line,
  },
  secondaryBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.md },
  secondaryBtnText: { color: Sport.inkSoft, fontSize: 13, fontWeight: '700' },
})
