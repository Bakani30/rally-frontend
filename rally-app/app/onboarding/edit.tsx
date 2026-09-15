import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { useEffect, useRef } from 'react'

import { RallyText } from '@/components/ui/RallyText'
import { SheetPalette } from '@/components/onboarding/onboardingSheetPalette'
import { useAuth } from '@/hooks/useAuth'
import { useAnalysisProfile } from '@/hooks/useAnalysisProfile'
import { onboardingDraftFromAnalysisProfile } from '@/lib/onboarding/onboardingPrefill'
import { guardedRouter } from '@/lib/navigation/guardedRouter'
import { useOnboardingStore } from '@/stores/onboardingStore'

export default function OnboardingEditEntryScreen() {
  const { user } = useAuth()
  const { data: profile, error } = useAnalysisProfile(user?.id)
  const isHydrated = useOnboardingStore((state) => state.isHydrated)
  const replaceDraft = useOnboardingStore((state) => state.replaceDraft)
  const redirected = useRef(false)

  useEffect(() => {
    if (!isHydrated || redirected.current) return
    if (!profile) return
    redirected.current = true
    replaceDraft(onboardingDraftFromAnalysisProfile(profile))
    guardedRouter.replace(
      { pathname: '/onboarding', params: { mode: 'edit' } },
      { actionKey: 'onboarding:edit-entry' },
    )
  }, [isHydrated, profile, replaceDraft])

  if (error) {
    return <View style={styles.center}><RallyText variant="body">โหลดข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง</RallyText></View>
  }
  return <View style={styles.center}><ActivityIndicator color={SheetPalette.orange} /><RallyText variant="body">กำลังโหลดข้อมูลเดิม...</RallyText></View>
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: SheetPalette.bg },
})
