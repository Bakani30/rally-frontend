import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useI18n } from '@/hooks/useI18n'
import { giftsDictionary } from '@/lib/i18n/dictionaries/gifts'
import type { GiftItem, RedeemRewardResult } from '@/lib/gifts/giftTypes'

type RedeemSuccessSheetProps = {
  visible: boolean
  gift: GiftItem
  result: RedeemRewardResult
  copied: boolean
  onCopyCode: () => void
  onClose: () => void
  onOpenRewards: () => void
  onOpenProfile: () => void
}

export function RedeemSuccessSheet({ visible, gift, result, copied, onCopyCode, onClose, onOpenRewards, onOpenProfile }: RedeemSuccessSheetProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const insets = useSafeAreaInsets()
  const { t, language } = useI18n(giftsDictionary)
  const voucher = result.kind === 'voucher'
  const cosmeticFulfilled = result.kind === 'cosmetic' && result.status === 'fulfilled'
  const cosmeticPending = result.kind === 'cosmetic' && result.status === 'pending'
  const title = voucher
    ? t('redeemSuccess')
    : cosmeticFulfilled
      ? t('cosmeticUnlocked')
      : cosmeticPending
        ? t('redemptionPendingTitle')
        : t('redemptionCancelledTitle')
  const body = voucher
    ? t('voucherSuccessBody')
    : cosmeticFulfilled
      ? t('cosmeticSuccessBody')
      : cosmeticPending
        ? t('redemptionPendingBody')
        : t('redemptionCancelledBody')
  const openRewards = voucher || !cosmeticFulfilled

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.modalRoot, { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.md }]}>
        <Pressable style={styles.scrim} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('close')} />
        <View style={styles.sheet} accessibilityViewIsModal>
          <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.successIcon, !voucher && !cosmeticFulfilled && { backgroundColor: cosmeticPending ? theme.amber : theme.red }]}><MaterialCommunityIcons name={voucher || cosmeticFulfilled ? 'check' : cosmeticPending ? 'progress-clock' : 'close'} size={30} color={theme.chalk} /></View>
            <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={1.6}>{title}</Text>
            <Text style={styles.rewardName} maxFontSizeMultiplier={1.6}>{gift.name}</Text>
            <Text style={styles.body} maxFontSizeMultiplier={1.8}>{body}</Text>

            {voucher ? (
              <View style={styles.codeCard}>
                <Text style={styles.codeLabel}>{t('voucherCode')}</Text>
                <Text style={styles.code} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.62} selectable>{result.shortCode}</Text>
                <PressableScale style={styles.copyButton} onPress={onCopyCode} accessibilityRole="button" accessibilityLabel={copied ? t('copied') : t('copyCode')}>
                  <MaterialCommunityIcons name={copied ? 'check' : 'content-copy'} size={17} color={theme.orange} />
                  <Text style={styles.copyText} maxFontSizeMultiplier={1.4}>{copied ? t('copied') : t('copyCode')}</Text>
                </PressableScale>
                <Text style={styles.expiry}>{result.expiresAt ? t('expiresAt', { date: new Date(result.expiresAt).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US') }) : t('voucherExpiryNotSpecified')}</Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.actions}>
            <PressableScale style={styles.secondaryButton} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('close')}><Text style={styles.secondaryText} maxFontSizeMultiplier={1.4}>{t('close')}</Text></PressableScale>
            <PressableScale style={styles.primaryButton} onPress={openRewards ? onOpenRewards : onOpenProfile} accessibilityRole="button" accessibilityLabel={openRewards ? t('openRewards') : t('openProfileStudio')}>
              <Text style={styles.primaryText} maxFontSizeMultiplier={1.4}>{openRewards ? t('openRewards') : t('openProfileStudio')}</Text>
              <MaterialCommunityIcons name="arrow-right" size={17} color={theme.chalk} />
            </PressableScale>
          </View>
        </View>
      </View>
    </Modal>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    modalRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl },
    scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.56)' },
    sheet: { width: '100%', maxWidth: 440, maxHeight: '100%', gap: Spacing.sm, borderRadius: Radius.xxl, backgroundColor: theme.bg, padding: Spacing.xl, ...Platform.select({ web: { boxShadow: theme.shadowSoft }, default: { elevation: 8 } }) },
    scrollBody: { flexShrink: 1, width: '100%' },
    scrollContent: { alignItems: 'center', gap: Spacing.sm },
    successIcon: { width: 64, height: 64, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.green },
    title: { color: theme.ink, fontSize: 22, lineHeight: 29, fontWeight: '900', textAlign: 'center' },
    rewardName: { color: theme.orange, fontSize: 15, lineHeight: 21, fontWeight: '900', textAlign: 'center' },
    body: { color: theme.muted, fontSize: 13, lineHeight: 19, fontWeight: '700', textAlign: 'center' },
    codeCard: { width: '100%', alignItems: 'center', gap: 6, borderRadius: Radius.xl, borderWidth: 1, borderColor: theme.orangeSoft, backgroundColor: theme.orangeSoft, padding: Spacing.md },
    codeLabel: { color: theme.muted, fontSize: 11, lineHeight: 15, fontWeight: '800' },
    code: { color: theme.ink, fontSize: 26, lineHeight: 33, fontWeight: '900', letterSpacing: 2 },
    copyButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.md },
    copyText: { color: theme.orange, fontSize: 13, lineHeight: 18, fontWeight: '900' },
    expiry: { color: theme.muted, fontSize: 11, lineHeight: 15, fontWeight: '700' },
    actions: { width: '100%', flexDirection: 'row', gap: Spacing.sm, paddingTop: Spacing.sm },
    secondaryButton: { minHeight: 48, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.lg, borderWidth: 1, borderColor: theme.line },
    secondaryText: { color: theme.inkSoft, fontSize: 13, lineHeight: 18, fontWeight: '900' },
    primaryButton: { minHeight: 48, flex: 1.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: Radius.lg, backgroundColor: theme.orange },
    primaryText: { color: theme.chalk, fontSize: 13, lineHeight: 18, fontWeight: '900' },
  })
}
