import { ImageBackground, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { ProfileCard } from '@/components/profile/profileColors'
import { Fonts, Spacing } from '@/constants/theme'

const CARD_BG = require('@/assets/images/profile-card-bg.png')

type IconName = keyof typeof MaterialCommunityIcons.glyphMap

type ProfileUidCardProps = {
  username: string
  displayName: string
  nameId: string
  classLabel: string
  rankingLabel: string
  guildLabel: string
  titleLabel: string
  initials: string
  avatarUrl: string | null | undefined
}

// Member ID card (นามบัตร) — uses the real Figma card artwork as the background
// (border, barcode and NO. serial are baked into the image), with live data on top.
export function ProfileUidCard({
  username,
  displayName,
  nameId,
  classLabel,
  rankingLabel,
  guildLabel,
  titleLabel,
  initials,
  avatarUrl,
}: ProfileUidCardProps) {
  const fields: { icon: IconName; label: string; value: string }[] = [
    { icon: 'account-outline', label: 'NAME', value: displayName },
    { icon: 'card-account-details-outline', label: 'NAME ID', value: nameId },
    { icon: 'briefcase-outline', label: 'CLASS', value: classLabel },
    { icon: 'trophy-outline', label: 'RANKING', value: rankingLabel },
    { icon: 'shield-outline', label: 'GUILD', value: guildLabel },
    { icon: 'tag-outline', label: 'TITEL', value: titleLabel },
  ]

  return (
    <ImageBackground source={CARD_BG} style={styles.card} resizeMode="stretch">
      <View style={styles.content}>
        <View style={styles.left}>
          <View style={styles.avatarOuter}>
            <View style={styles.avatarRing}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImg} contentFit="cover" />
              ) : (
                <Text style={styles.avatarInitials}>{initials}</Text>
              )}
            </View>
          </View>
          <View style={styles.namePill}>
            <Text style={styles.namePillText} numberOfLines={1}>
              {username}
            </Text>
          </View>
        </View>

        <View style={styles.center}>
          <Text style={styles.cardTitle}>PROFILE CARD</Text>
          <View style={styles.grid}>
            {fields.map((field) => (
              <View key={field.label} style={styles.field}>
                <MaterialCommunityIcons name={field.icon} size={15} color={ProfileCard.ink} />
                <View style={styles.fieldText}>
                  <Text style={styles.fieldLabel} numberOfLines={1}>
                    {field.label}
                  </Text>
                  <Text style={styles.fieldValue} numberOfLines={1}>
                    {field.value}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    </ImageBackground>
  )
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    aspectRatio: 710 / 406,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    paddingLeft: '4%',
    paddingRight: '13%',
    paddingVertical: '6%',
  },
  left: { width: '30%', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  avatarOuter: {
    width: 84,
    height: 84,
    borderRadius: 18,
    backgroundColor: ProfileCard.bandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRing: {
    width: 74,
    height: 74,
    borderRadius: 13,
    borderWidth: 3,
    borderColor: ProfileCard.surface,
    backgroundColor: ProfileCard.bandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarInitials: {
    color: ProfileCard.ink,
    fontSize: 28,
    fontWeight: '900',
    fontFamily: Fonts?.rounded,
  },
  namePill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: ProfileCard.surface,
    borderWidth: 1.5,
    borderColor: ProfileCard.band,
    maxWidth: '100%',
  },
  namePillText: { color: ProfileCard.ink, fontSize: 12, fontWeight: '900' },
  center: { flex: 1, paddingLeft: Spacing.sm, justifyContent: 'center' },
  cardTitle: {
    color: ProfileCard.ink,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.4,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: Spacing.sm,
  },
  field: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingRight: 4,
  },
  fieldText: { flex: 1, minWidth: 0 },
  fieldLabel: { color: ProfileCard.label, fontSize: 12, fontWeight: '900', letterSpacing: 0.2 },
  fieldValue: { color: ProfileCard.muted, fontSize: 10, fontWeight: '700', marginTop: 1 },
})
