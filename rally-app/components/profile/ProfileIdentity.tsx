import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { PressableScale } from '@/components/motion/PressableScale'
import { RallyText } from '@/components/ui/RallyText'
import { ProfileAvatar } from '@/components/profile/ProfileAvatar'
import { ProfileFrame } from '@/components/profile/ProfileFrame'
import { isDefaultProfileFrame } from '@/components/profile/profileFrameRegistry'
import { ProfileAccent } from '@/components/profile/profileColors'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'

const AVATAR_SIZE = 104

type ProfileIdentityProps = {
  displayName: string
  idLabel: string
  initials: string
  avatarUrl: string | null | undefined
  frameAssetRef: string | null
  onChangeAvatar?: () => void
  isUpdatingAvatar?: boolean
  // When false (viewing another user) the avatar is not pressable / editable.
  editable?: boolean
}

// Avatar (with cosmetic frame when equipped), name pill, handle and player id.
export function ProfileIdentity({
  displayName,
  idLabel,
  initials,
  avatarUrl,
  frameAssetRef,
  onChangeAvatar,
  isUpdatingAvatar = false,
  editable = true,
}: ProfileIdentityProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)

  const avatar = <ProfileAvatar avatarUrl={avatarUrl} initials={initials} size={AVATAR_SIZE} />
  const hasCustomFrame = !isDefaultProfileFrame(frameAssetRef)
  const framed = hasCustomFrame ? (
    <ProfileFrame frameAssetRef={frameAssetRef} size={AVATAR_SIZE}>
      {avatar}
    </ProfileFrame>
  ) : (
    <View style={styles.plainAvatar}>{avatar}</View>
  )

  return (
    <View style={styles.wrap}>
      {editable ? (
        <PressableScale
          onPress={onChangeAvatar}
          disabled={isUpdatingAvatar}
          accessibilityRole="button"
          accessibilityLabel="เปลี่ยนรูปโปรไฟล์"
        >
          {framed}
          {isUpdatingAvatar ? (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="small" color={theme.chalk} />
            </View>
          ) : null}
        </PressableScale>
      ) : (
        <View>{framed}</View>
      )}

      <View style={styles.namePill}>
        <RallyText variant="head" style={styles.name} numberOfLines={1}>
          {displayName}
        </RallyText>
      </View>
      <RallyText variant="head" style={styles.id} numberOfLines={1}>
        {idLabel}
      </RallyText>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    wrap: { alignItems: 'center', gap: Spacing.xs },
    plainAvatar: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: AVATAR_SIZE / 2,
      overflow: 'hidden',
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.2)',
      borderRadius: AVATAR_SIZE / 2,
    },
    namePill: {
      marginTop: Spacing.xs,
      paddingHorizontal: Spacing.lg,
      paddingVertical: 6,
      borderRadius: Radius.pill,
      borderWidth: 1.5,
      borderColor: ProfileAccent.indigo,
      backgroundColor: ProfileAccent.indigoSoft,
      maxWidth: '90%',
    },
    name: {
      color: theme.ink,
      fontSize: 16,
      letterSpacing: 0.2,
      textAlign: 'center',
    },
    id: {
      color: theme.mutedSoft,
      fontSize: 11,
      letterSpacing: 0.6,
      textAlign: 'center',
      marginTop: 2,
    },
  })
}
