import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { PointsIcon } from '@/components/economy/PointsIcon'
import { BadgeSlot } from '@/components/profile/BadgeSlot'
import { ProfileFrame } from '@/components/profile/ProfileFrame'
import { ProfileTitle } from '@/components/profile/ProfileTitle'
import { RedeemRewardArtwork } from '@/components/gifts/RedeemRewardArtwork'
import { Fonts, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import type { ProfileStudioItem } from '@/lib/cosmetics/profileStudio'

type ProfileStudioCatalogRowProps = {
  item: ProfileStudioItem
  selected: boolean
  equipped: boolean
  priceLabel: string | null
  actionLabel: string
  previewLabel: string
  detailsLabel: string
  metaLabel: string
  actionDisabled: boolean
  onPreview: () => void
  onOpenDetails?: () => void
  onAction: () => void
}

export function ProfileStudioCatalogRow({
  item,
  selected,
  equipped,
  priceLabel,
  actionLabel,
  previewLabel,
  detailsLabel,
  metaLabel,
  actionDisabled,
  onPreview,
  onOpenDetails,
  onAction,
}: ProfileStudioCatalogRowProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const resolved = {
    id: item.cosmeticId,
    code: item.code,
    asset_ref: item.assetRef,
    name: item.name,
    rarity: item.rarity,
  }

  return (
    <View style={[styles.row, selected && styles.rowSelected]}>
      <PressableScale
        style={styles.visualAction}
        onPress={onPreview}
        accessibilityRole="button"
        accessibilityLabel={`${previewLabel}: ${item.name}`}
        accessibilityState={{ selected }}
      >
        <View style={styles.visual}>
          {item.gift ? (
            <RedeemRewardArtwork gift={item.gift} size="thumbnail" />
          ) : item.slot === 'badge' ? (
            <BadgeSlot badgeAssetRef={item.assetRef} size={42} />
          ) : item.slot === 'frame' ? (
            <ProfileFrame frameAssetRef={item.assetRef} size={44}>
              <View style={styles.avatarDot} />
            </ProfileFrame>
          ) : (
            <ProfileTitle title={resolved.asset_ref} rarity={resolved.rarity} />
          )}
          <View style={styles.tryOnBadge}>
            <MaterialCommunityIcons name="eye-outline" size={13} color={theme.chalk} />
          </View>
        </View>
      </PressableScale>

      <PressableScale
        style={styles.copyAction}
        onPress={onOpenDetails ?? onPreview}
        accessibilityRole="button"
        accessibilityLabel={`${onOpenDetails ? detailsLabel : previewLabel}: ${item.name}`}
      >
        <View style={styles.copy}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={1} maxFontSizeMultiplier={1.35}>{item.name}</Text>
            {equipped ? <MaterialCommunityIcons name="check-decagram" size={16} color={theme.greenVivid} /> : null}
            {onOpenDetails ? <MaterialCommunityIcons name="chevron-right" size={17} color={theme.muted} /> : null}
          </View>
          <Text style={styles.meta} numberOfLines={1} maxFontSizeMultiplier={1.3}>
            {metaLabel}
          </Text>
          {priceLabel ? (
            <View style={styles.priceRow}>
              <PointsIcon size={16} />
              <Text style={styles.price} numberOfLines={1}>{priceLabel}</Text>
            </View>
          ) : null}
        </View>
      </PressableScale>

      <PressableScale
        style={[styles.action, actionDisabled && styles.actionDisabled]}
        onPress={onAction}
        disabled={actionDisabled}
        accessibilityRole="button"
        accessibilityLabel={`${actionLabel}: ${item.name}`}
        accessibilityState={{ disabled: actionDisabled }}
      >
        <Text style={[styles.actionText, actionDisabled && styles.actionTextDisabled]} numberOfLines={1} maxFontSizeMultiplier={1.2}>{actionLabel}</Text>
      </PressableScale>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    row: {
      minHeight: 92,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.bgElevated,
      padding: Spacing.sm,
    },
    rowSelected: { borderColor: theme.orange, backgroundColor: theme.orangeSoft },
    visualAction: { width: 68, minHeight: 64, alignItems: 'center', justifyContent: 'center' },
    visual: { width: 68, minHeight: 56, alignItems: 'center', justifyContent: 'center' },
    tryOnBadge: {
      position: 'absolute', right: -2, bottom: 1,
      width: 24, height: 24, alignItems: 'center', justifyContent: 'center',
      borderRadius: Radius.pill, borderWidth: 2, borderColor: theme.bgElevated,
      backgroundColor: theme.orange,
    },
    copyAction: { flex: 1, minWidth: 0, minHeight: 64, justifyContent: 'center' },
    avatarDot: { width: 30, height: 30, borderRadius: Radius.pill, backgroundColor: theme.surfaceStrong },
    copy: { flex: 1, minWidth: 0, gap: 3 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    name: { flex: 1, color: theme.ink, fontSize: 14, lineHeight: 19, fontWeight: '900' },
    meta: { color: theme.muted, fontSize: 9, lineHeight: 12, fontWeight: '900', letterSpacing: 0.8 },
    priceRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    price: { color: theme.economy, fontSize: 11, lineHeight: 15, fontWeight: '900', fontFamily: Fonts.rounded },
    action: { minWidth: 76, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.lg, backgroundColor: theme.orange, paddingHorizontal: Spacing.sm },
    actionDisabled: { backgroundColor: theme.surfaceStrong },
    actionText: { color: theme.chalk, fontSize: 11, lineHeight: 15, fontWeight: '900' },
    actionTextDisabled: { color: theme.muted },
  })
}
