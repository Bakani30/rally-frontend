import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

import { PressableScale } from '@/components/motion/PressableScale'
import { AnimatedSelectable } from '@/components/onboarding/AnimatedSelectable'
import { SheetPalette } from '@/components/onboarding/onboardingSheetPalette'
import { Radius, Spacing } from '@/constants/theme'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useAuth } from '@/hooks/useAuth'
import { useI18n } from '@/hooks/useI18n'
import { useSetSportPosition, useSportPositions } from '@/hooks/useSportPositions'
import { activityRoleConfig } from '@/lib/activities/playerRoles'
import { onboardingDictionary } from '@/lib/i18n/dictionaries/onboarding'

// This standalone editor is currently scoped to basketball; running and
// badminton use the shared role registry through their profile surfaces.
const BASKETBALL = 'basketball'
const config = activityRoleConfig(BASKETBALL)!

/**
 * "ตำแหน่งที่ชอบเล่น" editor — a standalone re-editor for the basketball
 * position collected during onboarding. Binds to the real role registry
 * (`ACTIVITY_ROLES`) and writes through the same `set_sport_position` path the
 * profile Rankings card uses, so both surfaces stay in sync. Sibling of
 * `/personal-info`; shares its onboarding-sheet look.
 */
export default function PlayerRoleScreen() {
  const { user } = useAuth()
  const userId = user?.id
  const { from } = useLocalSearchParams<{ from?: string }>()
  const source = from === 'settings' ? 'settings' : 'direct'
  const { data: positions, isPending } = useSportPositions(userId)
  const setPosition = useSetSportPosition(userId)
  const { track } = useAnalytics()
  const { t } = useI18n(onboardingDictionary)

  const current = positions?.[BASKETBALL] ?? null

  function selectRole(key: string) {
    if (key === current) return
    setPosition.mutate(
      { activityType: BASKETBALL, positionKey: key },
      {
        onSuccess: () =>
          track({
            name: 'player_role_changed',
            properties: { activity_type: BASKETBALL, position_key: key, source },
          }),
        onError: (error) =>
          Alert.alert('บันทึกไม่สำเร็จ', error instanceof Error ? error.message : 'ลองอีกครั้ง'),
      },
    )
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <PressableScale style={styles.iconButton} onPress={() => router.back()} accessibilityLabel="ย้อนกลับ">
          <MaterialCommunityIcons name="chevron-left" size={24} color={SheetPalette.ink} />
        </PressableScale>
        <Text style={styles.title}>ตำแหน่งที่ชอบเล่น</Text>
        <View style={styles.iconGhost} />
      </View>

      {isPending ? (
        <View style={styles.center}>
          <ActivityIndicator color={SheetPalette.orange} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="basketball" size={16} color={SheetPalette.ink} />
              <Text style={styles.sectionTitle}>บาสเกตบอล</Text>
            </View>
            <Text style={styles.hint}>แตะเพื่อเลือกตำแหน่งที่ถนัด — แสดงบนการ์ดอันดับของคุณ</Text>
            <View style={styles.roleGrid}>
              {config.roles.map((role) => {
                const selected = role.key === current
                return (
                  <AnimatedSelectable
                    key={role.key}
                    selected={selected}
                    style={[styles.rolePill, selected && styles.rolePillSelected]}
                    onPress={() => selectRole(role.key)}
                    accessibilityLabel={`เลือกตำแหน่ง ${t(role.labelKey)}`}
                  >
                    <Text style={[styles.roleShort, selected && styles.roleShortSelected]}>{role.short}</Text>
                    <Text style={[styles.roleLabel, selected && styles.roleLabelSelected]} numberOfLines={1}>
                      {t(role.labelKey)}
                    </Text>
                  </AnimatedSelectable>
                )
              })}
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SheetPalette.bg },
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
  hint: { color: SheetPalette.muted, fontSize: 11.5, fontWeight: '700' },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.xs },
  rolePill: {
    flexGrow: 1,
    flexBasis: 100,
    minHeight: 56,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: SheetPalette.line,
    backgroundColor: SheetPalette.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    gap: 2,
  },
  rolePillSelected: {
    backgroundColor: SheetPalette.orange,
    borderColor: SheetPalette.orange,
  },
  roleShort: { color: SheetPalette.ink, fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  roleShortSelected: { color: SheetPalette.onOrange },
  roleLabel: { color: SheetPalette.muted, fontSize: 11, fontWeight: '700' },
  roleLabelSelected: { color: SheetPalette.onOrange },
})
