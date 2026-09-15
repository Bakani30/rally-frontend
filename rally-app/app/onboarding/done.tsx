import { StyleSheet, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, { FadeIn, FadeInUp, ZoomIn } from 'react-native-reanimated'

import { SheetPalette } from '@/components/onboarding/onboardingSheetPalette'
import { SheetPrimaryButton } from '@/components/onboarding/SheetPrimaryButton'
import { RallyText } from '@/components/ui/RallyText'
import { Spacing } from '@/constants/theme'
import { useI18n } from '@/hooks/useI18n'
import { onboardingDictionary } from '@/lib/i18n/dictionaries/onboarding'
import { guardedRouter } from '@/lib/navigation/guardedRouter'

const STAGGER_MS = 80

/**
 * Final celebration — full-screen white, no sheet/progress (fixed-light,
 * same as the rest of the wizard — see onboardingSheetPalette.ts). The
 * completion flag is already flipped in the profile cache
 * (useCompleteOnboarding.setQueryData), so entering the tabs cannot bounce
 * back into the wizard.
 */
export default function OnboardingDoneScreen() {
  const { t } = useI18n(onboardingDictionary)

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />
      <View style={styles.hero}>
        <Animated.Image
          entering={ZoomIn.springify().damping(14).stiffness(180)}
          source={require('@/assets/images/icon.png')}
          style={styles.logo}
        />
        <Animated.View entering={FadeInUp.delay(STAGGER_MS).duration(260)}>
          <RallyText variant="head" style={styles.title}>{t('title_done')}</RallyText>
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(STAGGER_MS * 2).duration(260)}>
          <RallyText variant="body" style={styles.subtitle}>{t('subtitle_done')}</RallyText>
        </Animated.View>
      </View>
      <Animated.View entering={FadeIn.delay(STAGGER_MS * 3).duration(220)} style={styles.footer}>
        <SheetPrimaryButton
          label={t('button_start')}
          onPress={() => guardedRouter.replace('/(tabs)', { actionKey: 'onboarding:enter-app' })}
        />
      </Animated.View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SheetPalette.bg, justifyContent: 'space-between' },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  logo: { width: 120, height: 120, borderRadius: 28 },
  title: { color: SheetPalette.ink, fontSize: 24, textAlign: 'center' },
  subtitle: { color: SheetPalette.muted, fontSize: 14, textAlign: 'center' },
  footer: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
})
