import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { Fonts, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'

type IconName = keyof typeof MaterialCommunityIcons.glyphMap

type RefereeEmptyStateProps = {
  icon?: IconName
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  loading?: boolean
  compact?: boolean
  tone?: 'neutral' | 'danger'
}

export function RefereeEmptyState({
  icon = 'whistle-outline',
  title,
  description,
  actionLabel,
  onAction,
  loading = false,
  compact = false,
  tone = 'neutral',
}: RefereeEmptyStateProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const color = tone === 'danger' ? theme.red : theme.mutedSoft

  return (
    <View style={[styles.card, compact ? styles.compact : null]}>
      {loading ? (
        <ActivityIndicator color={theme.orange} />
      ) : (
        <View style={[styles.iconBox, { backgroundColor: tone === 'danger' ? theme.redSoft : theme.surfaceStrong }]}>
          <MaterialCommunityIcons name={icon} size={23} color={color} />
        </View>
      )}
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      {actionLabel && onAction ? (
        <PressableScale
          style={styles.action}
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </PressableScale>
      ) : null}
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    card: {
      width: '100%',
      minHeight: 148,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface,
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing.xl,
      gap: Spacing.sm,
    },
    compact: { minHeight: 104, padding: Spacing.lg },
    iconBox: {
      width: 44,
      height: 44,
      borderRadius: Radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    copy: { alignItems: 'center', gap: 2 },
    title: {
      color: theme.ink,
      fontSize: 15,
      lineHeight: 22,
      fontWeight: '900',
      fontFamily: Fonts?.thaiHead,
      textAlign: 'center',
    },
    description: {
      color: theme.muted,
      fontSize: 12,
      lineHeight: 18,
      fontWeight: '600',
      fontFamily: Fonts?.thaiBody,
      textAlign: 'center',
    },
    action: {
      minHeight: 44,
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: theme.lineStrong,
      backgroundColor: theme.surfaceStrong,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing.lg,
      marginTop: Spacing.xs,
    },
    actionText: { color: theme.ink, fontSize: 13, lineHeight: 19, fontWeight: '900', fontFamily: Fonts?.thaiHead },
  })
}
