import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaView } from 'react-native-safe-area-context'
import ReanimatedAnimated, { FadeIn } from 'react-native-reanimated'

import { PressableScale } from '@/components/motion/PressableScale'
import { SheetPalette } from '@/components/onboarding/onboardingSheetPalette'
import { RallyText } from '@/components/ui/RallyText'
import { Radius, Spacing } from '@/constants/theme'
import { useI18n } from '@/hooks/useI18n'
import { onboardingDictionary } from '@/lib/i18n/dictionaries/onboarding'
import { guardedRouter } from '@/lib/navigation/guardedRouter'

const TOTAL_STEPS = 4
const PROGRESS_DURATION = 250
const CONTENT_ENTER_DURATION = 260

type OnboardingScaffoldProps = {
  step: 1 | 2 | 3 | 4
  title: string
  /** MaterialCommunityIcons name rendered orange after the title (the SVG
   * design's title icons — icons, not emoji, which tofu at heavy weights). */
  titleIcon?: keyof typeof MaterialCommunityIcons.glyphMap
  subtitle?: string
  /** Icon rendered large and centered above the title (sports + experience
   * steps). Omit for the default left-aligned header where `titleIcon` is
   * inlined at the end of the title instead. */
  headerIcon?: keyof typeof MaterialCommunityIcons.glyphMap
  headerIconColor?: string
  headerIconSize?: number
  /** When set, wraps `headerIcon` in a soft-tint circle instead of rendering
   * it bare (e.g. the experience step's per-sport icon). */
  headerIconBackground?: string
  showBack?: boolean
  /** Override the back chevron's action (default: router.back()). */
  onBack?: () => void
  footer: ReactNode
  children: ReactNode
}

/**
 * Full-page frame for the onboarding wizard (founder feedback: the earlier
 * bottom-sheet popup became a plain full-screen page). Fixed-light
 * (`SheetPalette`) regardless of the device's system theme — see
 * onboardingSheetPalette.ts. Header (back + progress + step label) is
 * pinned at top; content scrolls only if it outgrows the screen; the CTA
 * footer is pinned at the safe-area-aware bottom.
 */
export function OnboardingScaffold({
  step,
  title,
  titleIcon,
  subtitle,
  headerIcon,
  headerIconColor,
  headerIconSize = 40,
  headerIconBackground,
  showBack = false,
  onBack,
  footer,
  children,
}: OnboardingScaffoldProps) {
  const { t } = useI18n(onboardingDictionary)
  const progress = useRef(new Animated.Value(step / TOTAL_STEPS)).current

  useEffect(() => {
    Animated.timing(progress, {
      toValue: step / TOTAL_STEPS,
      duration: PROGRESS_DURATION,
      useNativeDriver: false,
    }).start()
  }, [progress, step])

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  })

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.root}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        {showBack ? (
          <PressableScale
            style={styles.backButton}
            onPress={onBack ?? (() => guardedRouter.back({ actionKey: 'onboarding:back' }))}
            scaleTo={0.86}
            accessibilityLabel={t('a11y_back')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons name="chevron-left" size={26} color={SheetPalette.ink} />
          </PressableScale>
        ) : (
          <View style={styles.backGhost} />
        )}
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
        <RallyText variant="body" style={styles.stepLabel}>
          {t('step_label', { step, total: TOTAL_STEPS })}
        </RallyText>
      </View>

      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ReanimatedAnimated.View
          entering={FadeIn.duration(CONTENT_ENTER_DURATION)}
          style={styles.contentWrap}
        >
          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={styles.content}
            bounces={false}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {headerIcon ? (
              <View style={styles.centeredHeader}>
                {headerIconBackground ? (
                  <View style={[styles.headerIconCircle, { backgroundColor: headerIconBackground }]}>
                    <MaterialCommunityIcons
                      name={headerIcon}
                      size={headerIconSize}
                      color={headerIconColor ?? SheetPalette.orange}
                    />
                  </View>
                ) : (
                  <MaterialCommunityIcons
                    name={headerIcon}
                    size={headerIconSize}
                    color={headerIconColor ?? SheetPalette.orange}
                  />
                )}
                <RallyText variant="head" style={styles.titleCentered}>{title}</RallyText>
                {subtitle ? (
                  <RallyText variant="body" style={styles.subtitleCentered}>{subtitle}</RallyText>
                ) : null}
              </View>
            ) : (
              <View style={styles.titleBlock}>
                <View style={styles.titleRow}>
                  <RallyText variant="head" style={styles.title}>{title}</RallyText>
                  {titleIcon ? (
                    <MaterialCommunityIcons name={titleIcon} size={26} color={SheetPalette.orange} />
                  ) : null}
                </View>
                {subtitle ? <RallyText variant="body" style={styles.subtitle}>{subtitle}</RallyText> : null}
              </View>
            )}
            {children}
          </ScrollView>
        </ReanimatedAnimated.View>

        <View style={styles.footer}>{footer}</View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SheetPalette.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    minHeight: 44,
  },
  backButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  backGhost: { width: 32, height: 32 },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: Radius.pill,
    backgroundColor: SheetPalette.surfaceStrong,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: Radius.pill,
    backgroundColor: SheetPalette.ink,
  },
  stepLabel: { color: SheetPalette.muted, fontSize: 11 },
  body: { flex: 1 },
  contentWrap: { flex: 1 },
  contentScroll: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.xl,
  },
  titleBlock: { gap: Spacing.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: SheetPalette.ink, fontSize: 28, letterSpacing: -0.4 },
  subtitle: { color: SheetPalette.muted, fontSize: 14 },
  centeredHeader: { alignItems: 'center', gap: Spacing.sm, paddingBottom: Spacing.xs },
  headerIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCentered: {
    color: SheetPalette.ink,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  subtitleCentered: { color: SheetPalette.muted, fontSize: 14, textAlign: 'center' },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: SheetPalette.line,
    gap: Spacing.sm,
  },
})
