import { StyleSheet, View, useWindowDimensions } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated'
import { ProfileIdentity } from '@/components/profile/ProfileIdentity'
import { ProfileUidCard } from '@/components/profile/ProfileUidCard'

type ProfileIdentityDeckProps = {
  open: boolean
  // identity
  displayName: string
  idLabel: string
  initials: string
  avatarUrl: string | null | undefined
  frameAssetRef: string | null
  onChangeAvatar?: () => void
  isUpdatingAvatar?: boolean
  editable?: boolean
  // member card
  username: string
  nameId: string
  classLabel: string
  rankingLabel: string
  guildLabel: string
  titleLabel: string
}

// Identity block and member card share one slot; the card slides in from the
// right to cover the identity instead of taking extra vertical space.
export function ProfileIdentityDeck({
  open,
  displayName,
  idLabel,
  initials,
  avatarUrl,
  frameAssetRef,
  onChangeAvatar,
  isUpdatingAvatar,
  editable = true,
  username,
  nameId,
  classLabel,
  rankingLabel,
  guildLabel,
  titleLabel,
}: ProfileIdentityDeckProps) {
  const { width } = useWindowDimensions()
  const progress = useDerivedValue(
    () => withTiming(open ? 1 : 0, { duration: 320, easing: Easing.out(Easing.cubic) }),
    [open],
  )

  const identityStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ translateX: progress.value * -20 }],
  }))
  const cardStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateX: (1 - progress.value) * width }],
  }))

  return (
    <View style={styles.slot}>
      <Animated.View
        style={[styles.layer, styles.identityLayer, identityStyle]}
        pointerEvents={open ? 'none' : 'auto'}
      >
        <ProfileIdentity
          displayName={displayName}
          idLabel={idLabel}
          initials={initials}
          avatarUrl={avatarUrl}
          frameAssetRef={frameAssetRef}
          onChangeAvatar={onChangeAvatar}
          isUpdatingAvatar={isUpdatingAvatar}
          editable={editable}
        />
      </Animated.View>

      <Animated.View style={[styles.layer, cardStyle]} pointerEvents={open ? 'auto' : 'none'}>
        <ProfileUidCard
          username={username}
          displayName={displayName}
          nameId={nameId}
          classLabel={classLabel}
          rankingLabel={rankingLabel}
          guildLabel={guildLabel}
          titleLabel={titleLabel}
          initials={initials}
          avatarUrl={avatarUrl}
        />
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  slot: { width: '100%', aspectRatio: 710 / 406, justifyContent: 'center' },
  layer: { ...StyleSheet.absoluteFillObject },
  identityLayer: { alignItems: 'center', justifyContent: 'center' },
})
