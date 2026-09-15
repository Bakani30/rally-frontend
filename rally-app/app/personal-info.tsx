import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

import { PressableScale } from '@/components/motion/PressableScale'
import { AnimatedSelectable } from '@/components/onboarding/AnimatedSelectable'
import { DateOfBirthField } from '@/components/onboarding/DateOfBirthField'
import { SheetPalette } from '@/components/onboarding/onboardingSheetPalette'
import { SheetPrimaryButton } from '@/components/onboarding/SheetPrimaryButton'
import { SheetSuffixInput } from '@/components/onboarding/SheetSuffixInput'
import { Radius, Spacing } from '@/constants/theme'
import { RallyText } from '@/components/ui/RallyText'
import { useAnalysisProfile, useUpdateAnalysisProfile } from '@/hooks/useAnalysisProfile'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useAuth } from '@/hooks/useAuth'
import { useI18n } from '@/hooks/useI18n'
import { onboardingDictionary } from '@/lib/i18n/dictionaries/onboarding'
import { GENDER_OPTIONS, parseOptionalNumberField, validateAboutYouStep } from '@/lib/onboarding/onboardingRules'
import type { OnboardingGender } from '@/lib/onboarding/onboardingTypes'
import { buildBirthDatePayload, parseBirthDateParts } from '@/lib/profile/birthDate'
import { competitionCategoryToGender, GENDER_TO_COMPETITION_CATEGORY } from '@/lib/profile/genderCategory'

type PersonalInfoDraft = {
  birthYear: number | null
  birthMonth: number | null
  gender: OnboardingGender | null
  heightCm: string
  weightKg: string
}

const EMPTY_DRAFT: PersonalInfoDraft = {
  birthYear: null,
  birthMonth: null,
  gender: null,
  heightCm: '',
  weightKg: '',
}

/**
 * "ข้อมูลส่วนตัว" editor — same fields/components as the onboarding
 * about-you step (DOB, gender, height, weight), editable any time after
 * signup. Plain editor chrome (not the 4-step OnboardingScaffold wizard);
 * replaces the old running-analysis form the founder rejected.
 */
export default function PersonalInfoScreen() {
  const { user } = useAuth()
  const userId = user?.id
  const { from } = useLocalSearchParams<{ from?: string }>()
  const { data: profile, isPending } = useAnalysisProfile(userId)
  const updateMutation = useUpdateAnalysisProfile(userId)
  const { track } = useAnalytics()
  const { t } = useI18n(onboardingDictionary)
  const [draft, setDraft] = useState<PersonalInfoDraft>(EMPTY_DRAFT)
  const openTrackedRef = useRef(false)
  const source = toPersonalInfoSource(from)

  useEffect(() => {
    if (!profile) return
    const birth = parseBirthDateParts(profile.birthDate, profile.birthYear)
    setDraft({
      birthYear: birth.year.length === 0 ? null : Number(birth.year),
      birthMonth: birth.month.length === 0 ? null : Number(birth.month),
      gender: competitionCategoryToGender(profile.competitionCategory),
      heightCm: profile.heightCm == null ? '' : String(profile.heightCm),
      weightKg: profile.weightKg == null ? '' : String(profile.weightKg),
    })
  }, [profile])

  useEffect(() => {
    if (isPending || openTrackedRef.current) return
    openTrackedRef.current = true
    track({
      name: 'analysis_profile_opened',
      properties: {
        source,
        has_existing_profile: countFilledFields(draft) > 0,
        completed_field_count: countFilledFields(draft),
      },
    })
    // Only fire once, right after the profile finishes loading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending])

  function patchDraft(patch: Partial<PersonalInfoDraft>) {
    setDraft((current) => ({ ...current, ...patch }))
  }

  async function save() {
    Keyboard.dismiss()
    const error = validateAboutYouStep(
      {
        birthYear: draft.birthYear,
        birthMonth: draft.birthMonth,
        gender: draft.gender,
        heightCm: draft.heightCm,
        weightKg: draft.weightKg,
        selectedSports: [],
        sportAnswers: {},
      },
      new Date(),
    )
    if (error) {
      Alert.alert('บันทึกไม่ได้', error)
      return
    }

    try {
      const payload = {
        birthDate: buildBirthDatePayload(String(draft.birthYear ?? ''), String(draft.birthMonth ?? '')),
        competitionCategory: draft.gender ? GENDER_TO_COMPETITION_CATEGORY[draft.gender] : null,
        heightCm: parseOptionalNumberField(draft.heightCm),
        weightKg: parseOptionalNumberField(draft.weightKg),
      }
      await updateMutation.mutateAsync(payload)
      track({
        name: 'analysis_profile_saved',
        properties: {
          source,
          completed_field_count: countPayloadFields(payload),
          advanced_private_field_count: [payload.heightCm, payload.weightKg].filter(
            (value) => value !== null && value !== undefined,
          ).length,
          has_birth_date: payload.birthDate !== null && payload.birthDate !== undefined,
          has_competition_category: payload.competitionCategory !== null,
          has_running_level: false,
          has_primary_goal: false,
          preferred_units: 'metric',
        },
      })
      Alert.alert('บันทึกแล้ว', undefined, [{ text: 'ตกลง', onPress: () => router.back() }])
    } catch (err) {
      Alert.alert('บันทึกไม่ได้', err instanceof Error ? err.message : 'ลองอีกครั้งในอีกสักครู่')
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <PressableScale style={styles.iconButton} onPress={() => router.back()} accessibilityLabel="ย้อนกลับ">
            <MaterialCommunityIcons name="chevron-left" size={24} color={SheetPalette.ink} />
          </PressableScale>
          <Text style={styles.title}>ข้อมูลส่วนตัว</Text>
          <View style={styles.iconGhost} />
        </View>

        {isPending ? (
          <View style={styles.center}>
            <ActivityIndicator color={SheetPalette.orange} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="calendar-blank-outline" size={16} color={SheetPalette.ink} />
                <Text style={styles.sectionTitle}>วันเกิด</Text>
              </View>
              <DateOfBirthField
                year={draft.birthYear}
                month={draft.birthMonth}
                onChange={(patch) => patchDraft(patch)}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>เพศ</Text>
              <View style={styles.genderRow}>
                {GENDER_OPTIONS.map((option) => {
                  const selected = draft.gender === option.value
                  const label = t(`gender_${option.value}` as keyof typeof onboardingDictionary)
                  return (
                    <AnimatedSelectable
                      key={option.value}
                      selected={selected}
                      style={[styles.genderPill, selected && styles.genderPillSelected]}
                      onPress={() => patchDraft({ gender: option.value })}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={label}
                      hitSlop={{ top: 2, bottom: 2, left: 2, right: 2 }}
                    >
                      <RallyText variant="body" style={[styles.genderText, selected && styles.genderTextSelected]}>
                        {label}
                      </RallyText>
                    </AnimatedSelectable>
                  )
                })}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.privacyRow}>
                <MaterialCommunityIcons name="lock-outline" size={13} color={SheetPalette.muted} />
                <Text style={styles.privacyText}>ส่วนตัว · เว้นว่างได้</Text>
              </View>
              <View style={styles.bodyRow}>
                <SheetSuffixInput
                  label="ส่วนสูง"
                  suffix="ซม."
                  value={draft.heightCm}
                  onChange={(value) => patchDraft({ heightCm: value })}
                  accessibilityLabel="ส่วนสูง เซนติเมตร"
                />
                <SheetSuffixInput
                  label="น้ำหนัก"
                  suffix="กก."
                  value={draft.weightKg}
                  onChange={(value) => patchDraft({ weightKg: value })}
                  accessibilityLabel="น้ำหนัก กิโลกรัม"
                />
              </View>
            </View>

            <SheetPrimaryButton label="บันทึก" onPress={save} loading={updateMutation.isPending} />
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function toPersonalInfoSource(from: string | undefined): 'run_summary' | 'settings' | 'direct' {
  if (from === 'run-summary') return 'run_summary'
  if (from === 'settings') return 'settings'
  return 'direct'
}

function countFilledFields(draft: PersonalInfoDraft): number {
  return [draft.birthYear, draft.gender, draft.heightCm || null, draft.weightKg || null].filter(
    (value) => value !== null && value !== undefined && value !== '',
  ).length
}

function countPayloadFields(payload: {
  birthDate: string | null | undefined
  competitionCategory: string | null
  heightCm: number | null
  weightKg: number | null
}): number {
  return [payload.birthDate, payload.competitionCategory, payload.heightCm, payload.weightKg].filter(
    (value) => value !== null && value !== undefined,
  ).length
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SheetPalette.bg },
  keyboard: { flex: 1 },
  header: {
    minHeight: 56,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: SheetPalette.surface,
    borderWidth: 1,
    borderColor: SheetPalette.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGhost: { width: 44, height: 44 },
  title: { color: SheetPalette.ink, fontSize: 18, fontWeight: '900' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.lg,
  },
  section: { gap: Spacing.xs },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { color: SheetPalette.ink, fontSize: 14, fontWeight: '900' },
  genderRow: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
  genderPill: {
    flexGrow: 1,
    minHeight: 42,
    minWidth: 68,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: SheetPalette.line,
    backgroundColor: SheetPalette.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  genderPillSelected: {
    backgroundColor: SheetPalette.orange,
    borderColor: SheetPalette.orange,
  },
  genderText: { color: SheetPalette.ink, fontSize: 12.5 },
  genderTextSelected: { color: SheetPalette.onOrange },
  privacyRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  privacyText: { color: SheetPalette.muted, fontSize: 11, fontWeight: '700' },
  bodyRow: { flexDirection: 'row', gap: Spacing.sm },
})
