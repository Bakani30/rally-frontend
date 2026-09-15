import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { ArcadeButton } from '@/components/arcade/ArcadeButton'
import { RefereeSourceIcon } from '@/components/referee/icons/RefereeSourceIcon'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useI18n } from '@/hooks/useI18n'
import { refereeDictionary } from '@/lib/i18n/dictionaries/referee'
import {
  refereePassActivityLabel,
  type RefereePassCondition,
} from '@/lib/match/refereePassPresentation'
import { getSportReelItem } from '@/lib/match/sportReel'
import type { RefereeActivityKey } from '@/lib/match/refereeLevels'

type RefereeApplicationTaskCardProps = {
  activity: RefereeActivityKey
  conditions: readonly RefereePassCondition[]
  pending: boolean
  disabled: boolean
  onApply: () => void
}

export function RefereeApplicationTaskCard({
  activity,
  conditions,
  pending,
  disabled,
  onApply,
}: RefereeApplicationTaskCardProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { t } = useI18n(refereeDictionary)
  const reel = getSportReelItem(activity)
  const sport = refereePassActivityLabel(activity, t)

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: reel.accent }]}>
          <RefereeSourceIcon name={activity} size={22} color={reel.onAccent} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.sport}>{sport}</Text>
          <Text style={styles.title}>{t('applicationTaskTitle')}</Text>
          <Text style={styles.body}>{t('applicationTaskBody', { sport })}</Text>
        </View>
      </View>

      <ArcadeButton
        label={pending ? t('applyingButton') : t('applyButton', { sport })}
        icon="shield-account-outline"
        disabled={disabled}
        onPress={onApply}
      />

      <View style={styles.conditions}>
        {conditions.map((condition, index) => (
          <View
            key={`${condition.icon}:${condition.text}`}
            style={[styles.conditionRow, index > 0 && styles.divider]}
          >
            <MaterialCommunityIcons name={condition.icon} size={18} color={theme.mutedSoft} />
            <Text style={styles.conditionText}>{condition.text}</Text>
          </View>
        ))}
      </View>

      {pending ? (
        <View style={styles.pending} accessibilityLiveRegion="polite">
          <ActivityIndicator size="small" color={theme.orange} />
        </View>
      ) : null}
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    card: {
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface,
      padding: Spacing.md,
      gap: Spacing.md,
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    iconBox: {
      width: 46,
      height: 46,
      borderRadius: Radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    copy: { flex: 1, minWidth: 0 },
    sport: { color: theme.muted, fontSize: 11, lineHeight: 17, fontWeight: '800' },
    title: { color: theme.ink, fontSize: 16, lineHeight: 23, fontWeight: '900' },
    body: { color: theme.muted, fontSize: 12, lineHeight: 18, fontWeight: '600' },
    conditions: {
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surfaceStrong,
      paddingHorizontal: Spacing.md,
    },
    conditionRow: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line },
    conditionText: { flex: 1, color: theme.inkSoft, fontSize: 12, lineHeight: 18, fontWeight: '700' },
    pending: { position: 'absolute', right: Spacing.md, top: Spacing.md },
  })
}
