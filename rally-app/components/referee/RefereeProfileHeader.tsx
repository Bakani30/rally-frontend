import { StyleSheet, Text, View } from 'react-native'
import { ProfileAvatar } from '@/components/profile/ProfileAvatar'
import { Fonts, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'

const AVATAR_SIZE = 88

type RefereeProfileHeaderProps = {
  displayName: string
  avatarUrl: string | null | undefined
  initials: string
}

export function RefereeProfileHeader({
  displayName,
  avatarUrl,
  initials,
}: RefereeProfileHeaderProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)

  return (
    <View style={styles.wrap}>
      <View style={styles.avatarRing}>
        <ProfileAvatar avatarUrl={avatarUrl} initials={initials} size={AVATAR_SIZE} />
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {displayName}
      </Text>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    wrap: { alignItems: 'center', gap: Spacing.xs, paddingVertical: Spacing.sm },
    avatarRing: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: AVATAR_SIZE / 2,
      overflow: 'hidden',
      backgroundColor: theme.surface,
      borderWidth: 2,
      borderColor: theme.orange,
      alignItems: 'center',
      justifyContent: 'center',
    },
    name: {
      color: theme.ink,
      fontSize: 22,
      fontWeight: '900',
      fontFamily: Fonts?.thaiHead,
      textAlign: 'center',
      maxWidth: '90%',
      marginTop: Spacing.xs,
    },
  })
}
