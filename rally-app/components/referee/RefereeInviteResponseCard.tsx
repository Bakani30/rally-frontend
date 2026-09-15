import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useI18n } from '@/hooks/useI18n'
import { refereeMatchDictionary } from '@/lib/i18n/dictionaries/refereeMatch'

type RefereeInviteResponseCardProps = {
  activityLabel: string
  submitting: boolean
  errorText?: string | null
  onAccept: () => void
  onDecline: () => void
}

export function RefereeInviteResponseCard({
  activityLabel,
  submitting,
  errorText,
  onAccept,
  onDecline,
}: RefereeInviteResponseCardProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { t } = useI18n(refereeMatchDictionary)
  const localizedActivityLabel = activityLabel === 'Running' || activityLabel === 'วิ่ง'
    ? t('activityRunning')
    : activityLabel === 'Basketball' || activityLabel === 'บาสเกตบอล'
      ? t('activityBasketball')
      : activityLabel === 'Badminton' || activityLabel === 'แบดมินตัน'
        ? t('activityBadminton')
        : activityLabel

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <MaterialCommunityIcons name="whistle-outline" size={20} color={theme.orange} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.kicker}>{t('inviteKicker')}</Text>
          <Text style={styles.title}>{t('inviteTitle', { activity: localizedActivityLabel })}</Text>
        </View>
      </View>

      {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

      <View style={styles.actions}>
        <PressableScale
          style={[styles.declineButton, submitting && styles.disabledButton]}
          onPress={onDecline}
          disabled={submitting}
          accessibilityRole="button"
          accessibilityLabel={t('declineInviteA11y')}
        >
          <Text style={styles.declineText}>{t('declineInvite')}</Text>
        </PressableScale>
        <PressableScale
          style={[styles.acceptButton, submitting && styles.disabledButton]}
          onPress={onAccept}
          disabled={submitting}
          accessibilityRole="button"
          accessibilityLabel={t('acceptInviteA11y')}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={theme.bg} />
          ) : (
            <>
              <MaterialCommunityIcons name="whistle" size={16} color={theme.bg} />
              <Text style={styles.acceptText}>{t('acceptInvite')}</Text>
            </>
          )}
        </PressableScale>
      </View>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    card: {
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: `${theme.orange}44`,
      backgroundColor: theme.bg,
      padding: Spacing.lg,
      gap: Spacing.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.md,
    },
    iconBox: {
      width: 42,
      height: 42,
      borderRadius: Radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.orangeSoft,
    },
    copy: { flex: 1, minWidth: 0 },
    kicker: {
      color: theme.orange,
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 1,
    },
    title: {
      color: theme.ink,
      fontSize: 16,
      fontWeight: '900',
      marginTop: 2,
    },
    errorText: {
      color: theme.red,
      fontSize: 12,
    },
    actions: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    declineButton: {
      flex: 1,
      minHeight: 48,
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: `${theme.red}55`,
      backgroundColor: theme.redSoft,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    declineText: {
      color: theme.red,
      fontSize: 13,
      fontWeight: '900',
    },
    acceptButton: {
      flex: 1,
      minHeight: 48,
      borderRadius: Radius.pill,
      backgroundColor: theme.orange,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    acceptText: {
      color: theme.bg,
      fontSize: 13,
      fontWeight: '900',
    },
    disabledButton: {
      opacity: 0.62,
    },
  })
}
