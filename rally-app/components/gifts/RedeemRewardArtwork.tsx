import { useEffect, useState, type ComponentProps } from 'react'
import { StyleSheet, Text, View, type ImageStyle, type StyleProp } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Image } from 'expo-image'

import { Fonts, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import type { GiftItem } from '@/lib/gifts/giftTypes'
import { resolveRewardMedia, type RewardLocalMediaKey } from './redeemCatalog'

const LOCAL_REWARD_MEDIA: Record<RewardLocalMediaKey, number> = {
  'arena-pass': require('../../assets/images/redeem/arena-pass.jpg'),
  'recovery-pass': require('../../assets/images/redeem/recovery-pass.jpg'),
  'colosseum-frame': require('../../assets/images/redeem/colosseum-frame.jpg'),
  'victory-badge': require('../../assets/images/redeem/victory-badge.jpg'),
  'nova-road-shoe': require('../../assets/images/redeem/nova-road-shoe.jpg'),
  'nova-court-shoe': require('../../assets/images/redeem/nova-court-shoe.jpg'),
}

type RedeemRewardArtworkProps = {
  gift: GiftItem
  size?: 'thumbnail' | 'row' | 'featured' | 'detail'
  imageStyle?: StyleProp<ImageStyle>
}

export function RedeemRewardArtwork({ gift, size = 'row', imageStyle }: RedeemRewardArtworkProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const visual = rewardVisual(gift, theme)
  const media = resolveRewardMedia(gift)
  const [imageFailed, setImageFailed] = useState(false)
  const mediaIdentity = media.kind === 'remote'
    ? `remote:${media.uri}`
    : media.kind === 'local'
      ? `local:${media.key}`
      : 'fallback'
  const imageSource = media.kind === 'remote'
    ? { uri: media.uri }
    : media.kind === 'local'
      ? LOCAL_REWARD_MEDIA[media.key]
      : null

  useEffect(() => {
    setImageFailed(false)
  }, [gift.id, mediaIdentity])

  if (imageSource && !imageFailed) {
    return (
      <Image
        source={imageSource}
        style={[styles.base, styles[size], imageStyle]}
        contentFit="cover"
        transition={160}
        accessibilityLabel={gift.name}
        onError={() => setImageFailed(true)}
      />
    )
  }

  return (
    <View style={[styles.base, styles[size], { backgroundColor: visual.background }]} accessible accessibilityLabel={gift.name}>
      <View style={[styles.arch, { borderColor: visual.foreground }]} />
      <View style={[styles.orbit, { borderColor: visual.foreground }]} />
      <Text style={[styles.serial, { color: visual.foreground }]} maxFontSizeMultiplier={1.2}>{visual.serial}</Text>
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons
          name={visual.icon}
          size={size === 'thumbnail' ? 24 : size === 'row' ? 28 : size === 'featured' ? 48 : 56}
          color={visual.foreground}
        />
      </View>
      <Text style={[styles.mark, { color: visual.foreground }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>RALLY</Text>
    </View>
  )
}

function rewardVisual(gift: GiftItem, theme: SportPalette) {
  const selector = [...gift.code].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 4
  const palettes = [
    { background: theme.orange, foreground: theme.chalk },
    { background: theme.blue, foreground: theme.chalk },
    { background: theme.amber, foreground: theme.onEconomy },
    { background: theme.green, foreground: theme.chalk },
  ]
  const cosmeticIcon: ComponentProps<typeof MaterialCommunityIcons>['name'] = gift.reward_cosmetic?.type === 'frame'
    ? 'image-frame'
    : gift.reward_cosmetic?.type === 'title'
      ? 'shield-star-outline'
      : 'palette-outline'

  return {
    ...palettes[selector],
    serial: gift.code.replace(/^DEMO[-_]?/i, '').slice(0, 3).toUpperCase() || 'RWD',
    icon: gift.item_type === 'voucher' ? 'ticket-percent-outline' as const : cosmeticIcon,
  }
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    base: { position: 'relative', overflow: 'hidden', borderRadius: Radius.xl },
    thumbnail: { width: 64, height: 56, borderRadius: Radius.md },
    row: { width: '100%', height: 118, borderRadius: 0 },
    featured: { width: '100%', height: 164, borderRadius: 0 },
    detail: { width: '100%', height: 210, borderRadius: Radius.xxl },
    arch: {
      position: 'absolute',
      width: '78%',
      height: '86%',
      right: '-20%',
      bottom: '-34%',
      borderWidth: 8,
      borderRadius: 999,
      opacity: 0.22,
    },
    orbit: {
      position: 'absolute',
      width: 72,
      height: 72,
      left: -28,
      top: -28,
      borderWidth: 1,
      borderRadius: 999,
      opacity: 0.28,
    },
    serial: {
      position: 'absolute',
      left: Spacing.sm,
      top: Spacing.sm,
      fontSize: 9,
      lineHeight: 11,
      fontWeight: '900',
      fontFamily: Fonts.rounded,
      letterSpacing: 1.1,
      opacity: 0.72,
    },
    iconWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    mark: {
      position: 'absolute',
      left: Spacing.sm,
      bottom: Spacing.sm,
      fontSize: 9,
      lineHeight: 11,
      fontWeight: '900',
      fontFamily: Fonts.rounded,
      letterSpacing: 1.5,
      opacity: 0.82,
    },
  })
}
