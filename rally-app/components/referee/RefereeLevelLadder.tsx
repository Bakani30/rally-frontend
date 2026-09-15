import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { Reveal } from '@/components/motion/Reveal'
import { refereeTierColors } from '@/components/referee/refereeTierColors'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useI18n, type Translator } from '@/hooks/useI18n'
import { refereeDictionary } from '@/lib/i18n/dictionaries/referee'
import { REFEREE_TIERS, type RefereeTierMeta } from '@/lib/match/refereeLevels'

type RefereeLevelLadderProps = {
  currentLevel: number
  completedMatches: number
  rating: number
  trustScore: number
}

// The access screen only shows the next locked rung. Levels already unlocked
// stay out of the way, including levels granted directly by Rally.
export function RefereeLevelLadder({
  currentLevel,
  completedMatches,
  rating,
  trustScore,
}: RefereeLevelLadderProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { t } = useI18n(refereeDictionary)
  const [showHigherLevels, setShowHigherLevels] = useState(false)
  const lockedTiers = REFEREE_TIERS.filter((tier) => tier.level > currentLevel)
  const [nextTier, ...higherTiers] = lockedTiers

  if (!nextTier) {
    return (
      <View style={styles.completeCard}>
        <MaterialCommunityIcons name="check-decagram-outline" size={22} color={theme.green} />
        <View style={styles.copy}>
          <Text style={styles.completeTitle}>{t('highestLevel')}</Text>
          <Text style={styles.completeBody}>{t('highestLevelBody')}</Text>
        </View>
      </View>
    )
  }

  const current = { completedMatches, rating, trustScore }
  const nextCard = renderTierRung({
    tier: nextTier,
    current,
    isNext: true,
    showToggle: higherTiers.length > 0,
    expanded: showHigherLevels,
    theme,
    styles,
    t,
  })

  return (
    <View style={styles.stack}>
      {higherTiers.length > 0 ? (
        <PressableScale
          onPress={() => setShowHigherLevels((value) => !value)}
          accessibilityRole="button"
          accessibilityState={{ expanded: showHigherLevels }}
          accessibilityLabel={showHigherLevels ? t('hideHigherLevels') : t('viewHigherLevels')}
          scaleTo={0.98}
        >
          {nextCard}
        </PressableScale>
      ) : nextCard}

      {showHigherLevels ? (
        <Reveal style={styles.stack} translateY={6} duration={220}>
          {higherTiers.map((tier) => (
            <View key={tier.key}>
              {renderTierRung({ tier, current, theme, styles, t })}
            </View>
          ))}
        </Reveal>
      ) : null}
    </View>
  )
}

type RefereeTranslator = Translator<keyof typeof refereeDictionary>
type LadderStyles = ReturnType<typeof createStyles>

function renderTierRung({
  tier,
  current,
  isNext = false,
  showToggle = false,
  expanded = false,
  theme,
  styles,
  t,
}: {
  tier: RefereeTierMeta
  current: { completedMatches: number; rating: number; trustScore: number }
  isNext?: boolean
  showToggle?: boolean
  expanded?: boolean
  theme: SportPalette
  styles: LadderStyles
  t: RefereeTranslator
}) {
  const colors = refereeTierColors(theme, tier.accent)
  const requirements = requirementLines(tier, current, t)
  const access = accessLine(tier, t)

  return (
    <View style={[styles.rung, { borderColor: colors.border }]}>
      <View style={[styles.levelBox, { backgroundColor: colors.bg }]}>
        <Text style={[styles.levelValue, { color: colors.fg }]}>{tier.level}</Text>
      </View>
      <View style={styles.copy}>
        <Text style={styles.kicker}>
          {isNext ? t('nextLevel') : t('levelNumber', { level: tier.level })}
        </Text>
        <Text style={styles.title}>{tierLabel(tier, t)}</Text>
        <View style={styles.requirements}>
          {requirements.map((requirement) => (
            <View key={requirement} style={styles.requirementRow}>
              <MaterialCommunityIcons name="lock-outline" size={14} color={theme.mutedSoft} />
              <Text style={styles.requirement}>{requirement}</Text>
            </View>
          ))}
          <View style={styles.requirementRow}>
            <MaterialCommunityIcons name="shield-check-outline" size={14} color={theme.green} />
            <Text style={[styles.requirement, styles.access]}>{access}</Text>
          </View>
          {showToggle ? (
            <View style={styles.moreRow}>
              <Text style={styles.moreText}>
                {expanded ? t('hideHigherLevels') : t('viewHigherLevels')}
              </Text>
              <MaterialCommunityIcons
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={theme.orange}
              />
            </View>
          ) : null}
        </View>
      </View>
    </View>
  )
}

function tierLabel(tier: RefereeTierMeta, t: RefereeTranslator): string {
  if (tier.key === 'court_side') return t('tierCourtSide')
  if (tier.key === 'community') return t('tierCommunity')
  if (tier.key === 'official_ready') return t('tierOfficialReady')
  if (tier.key === 'event_lead') return t('tierEventLead')
  return t('tierCandidate')
}

function requirementLines(
  tier: RefereeTierMeta,
  current: { completedMatches: number; rating: number; trustScore: number },
  t: RefereeTranslator,
): string[] {
  const requiredMatches = tier.requirement.completedMatches
  const lines = [t('requirementMatchesProgress', {
    current: current.completedMatches,
    required: requiredMatches,
    remaining: Math.max(0, requiredMatches - current.completedMatches),
  })]
  if (tier.requirement.rating > 0) {
    lines.push(t('requirementRatingProgress', {
      current: current.rating.toFixed(1),
      required: tier.requirement.rating.toFixed(1),
      remaining: Math.max(0, tier.requirement.rating - current.rating).toFixed(1),
    }))
  }
  if (tier.requirement.trustScore > 0) {
    lines.push(t('requirementTrustProgress', {
      current: current.trustScore,
      required: tier.requirement.trustScore,
      remaining: Math.max(0, tier.requirement.trustScore - current.trustScore),
    }))
  }
  return lines
}

function accessLine(tier: RefereeTierMeta, t: RefereeTranslator): string {
  if (tier.key === 'court_side') return t('accessCourtSide')
  if (tier.key === 'community') return t('accessCommunity')
  if (tier.key === 'official_ready') return t('accessOfficialReady')
  if (tier.key === 'event_lead') return t('accessEventLead')
  return t('accessCandidate')
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    stack: { width: '100%', gap: Spacing.sm },
    rung: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.md,
      borderRadius: Radius.xl,
      borderWidth: 1,
      backgroundColor: theme.surface,
      padding: Spacing.md,
    },
    levelBox: {
      width: 44,
      height: 44,
      borderRadius: Radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    levelValue: { fontSize: 20, fontWeight: '900', fontVariant: ['tabular-nums'] },
    copy: { flex: 1, minWidth: 0, gap: 2 },
    kicker: { color: theme.muted, fontSize: 10, lineHeight: 15, fontWeight: '800' },
    title: { color: theme.ink, fontSize: 15, lineHeight: 22, fontWeight: '900' },
    requirements: { gap: 4, marginTop: Spacing.xs },
    requirementRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    requirement: { flex: 1, color: theme.muted, fontSize: 11, lineHeight: 17, fontWeight: '700' },
    access: { color: theme.inkSoft },
    moreRow: {
      minHeight: 36,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: Spacing.xs,
      paddingTop: Spacing.xs,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.line,
    },
    moreText: { color: theme.orange, fontSize: 11, lineHeight: 17, fontWeight: '900' },
    completeCard: {
      minHeight: 72,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: theme.green,
      backgroundColor: theme.greenSoft,
      padding: Spacing.md,
    },
    completeTitle: { color: theme.green, fontSize: 14, lineHeight: 21, fontWeight: '900' },
    completeBody: { color: theme.inkSoft, fontSize: 11, lineHeight: 17, fontWeight: '700' },
  })
}
