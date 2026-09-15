import { useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { router, Stack } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { Screen } from '@/components/layout/Screen'
import { PointsIcon } from '@/components/economy/PointsIcon'
import { PressableScale } from '@/components/motion/PressableScale'
import { Skeleton } from '@/components/ui/Skeleton'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useAuth } from '@/hooks/useAuth'
import { useGiftItems, useGiftRedemptions } from '@/hooks/useGifts'
import { useI18n, type Translator } from '@/hooks/useI18n'
import { useMyVouchers } from '@/hooks/useVouchers'
import type { GiftRedemption } from '@/lib/gifts/giftTypes'
import type { MyVoucher, VoucherStatus } from '@/lib/vouchers/voucherTypes'
import { giftsDictionary } from '@/lib/i18n/dictionaries/gifts'
import { guardedRouter } from '@/lib/navigation/guardedRouter'
import { CURRENCY_UNIT } from '@/lib/wallet/walletFormatting'

type GiftsTranslator = Translator<keyof typeof giftsDictionary>
type Tab = 'redemptions' | 'vouchers'

export default function MyRedemptionsScreen() {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { user } = useAuth()
  const { t, language } = useI18n(giftsDictionary)
  const [tab, setTab] = useState<Tab>('redemptions')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const { data: redemptions, isPending: redemptionsPending, error: redemptionsError } = useGiftRedemptions(user?.id)
  const { data: vouchers, isPending: vouchersPending, error: vouchersError } = useMyVouchers(user?.id)
  const { data: gifts } = useGiftItems(user?.id)

  const giftNameById = useMemo(() => new Map((gifts ?? []).map((gift) => [gift.id, gift.name])), [gifts])
  const loading = tab === 'redemptions' ? redemptionsPending : vouchersPending
  const error = tab === 'redemptions' ? redemptionsError : vouchersError

  async function copyVoucher(voucher: MyVoucher) {
    const Clipboard = await import('expo-clipboard')
    await Clipboard.setStringAsync(voucher.shortCode)
    setCopiedId(voucher.id)
  }

  return (
    <>
      <Stack.Screen options={{ title: t('myRewards'), headerShown: false }} />
      <Screen edges={['top', 'bottom']} backgroundColor={theme.bg} contentContainerStyle={styles.container} bottomPad={Spacing.xxxl}>
        <View style={styles.topBar}>
          <PressableScale style={styles.backButton} onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/(tabs)') }} accessibilityRole="button" accessibilityLabel={t('back')}>
            <MaterialCommunityIcons name="chevron-left" size={25} color={theme.ink} />
          </PressableScale>
          <View style={styles.titleCopy}>
            <Text style={styles.eyebrow} maxFontSizeMultiplier={1.3}>{t('inventoryEyebrow')}</Text>
            <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} maxFontSizeMultiplier={1.4}>{t('myRewards')}</Text>
          </View>
          <PressableScale style={styles.storeButton} onPress={() => guardedRouter.push('/gifts', { actionKey: 'rewards:store' })} accessibilityRole="button" accessibilityLabel={t('browseStore')}>
            <MaterialCommunityIcons name="storefront-outline" size={20} color={theme.orange} />
          </PressableScale>
        </View>

        <View style={styles.tabs}>
          <TabButton active={tab === 'redemptions'} label={t('redemptionTab')} onPress={() => setTab('redemptions')} />
          <TabButton active={tab === 'vouchers'} label={t('voucherTab')} onPress={() => setTab('vouchers')} />
        </View>

        {loading ? <InventorySkeleton /> : error ? <Text style={styles.errorText}>{t('loadFailedFallback')}</Text> : tab === 'redemptions' ? (
          redemptions && redemptions.length > 0 ? redemptions.map((redemption) => (
            <RedemptionRow key={redemption.id} redemption={redemption} giftName={giftNameById.get(redemption.gift_item_id) ?? redemption.gift_item_id} language={language} t={t} />
          )) : <EmptyInventory icon="gift-outline" title={t('emptyRewardsTitle')} body={t('emptyRewardsBody')} onBrowse={() => guardedRouter.push('/gifts', { actionKey: 'rewards:empty-vault' })} t={t} />
        ) : (
          vouchers && vouchers.length > 0 ? vouchers.map((voucher) => (
            <VoucherRow key={voucher.id} voucher={voucher} copied={copiedId === voucher.id} onCopy={() => copyVoucher(voucher)} language={language} t={t} />
          )) : <EmptyInventory icon="ticket-outline" title={t('emptyVouchersTitle')} body={t('emptyVouchersBody')} onBrowse={() => guardedRouter.push('/gifts', { actionKey: 'rewards:empty-vault-voucher' })} t={t} />
        )}
      </Screen>
    </>
  )
}

function TabButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  return <PressableScale style={[styles.tab, active && styles.tabActive]} onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: active }}><Text style={[styles.tabText, active && styles.tabTextActive]} maxFontSizeMultiplier={1.4}>{label}</Text></PressableScale>
}

function RedemptionRow({ redemption, giftName, language, t }: { redemption: GiftRedemption; giftName: string; language: 'th' | 'en'; t: GiftsTranslator }) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const meta = redemptionStatus(redemption.status, theme, t)
  return <View style={styles.row}><View style={styles.rowMain}><View style={[styles.iconBox, { backgroundColor: meta.bg }]}>{redemption.currency === 'credit' ? <MaterialCommunityIcons name="diamond-stone" size={18} color={theme.amber} /> : <PointsIcon size={20} />}</View><View style={styles.rowCopy}><Text style={styles.rowTitle} numberOfLines={2} maxFontSizeMultiplier={1.6}>{giftName}</Text><Text style={styles.rowMeta} maxFontSizeMultiplier={1.5}>{formatDate(redemption.created_at, language)} · {redemption.amount.toLocaleString()} {CURRENCY_UNIT[redemption.currency]}</Text></View></View><StatusPill meta={meta} /></View>
}

function VoucherRow({ voucher, copied, onCopy, language, t }: { voucher: MyVoucher; copied: boolean; onCopy: () => void; language: 'th' | 'en'; t: GiftsTranslator }) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const meta = voucherStatus(voucher.status, theme, t)
  return <View style={styles.voucherCard}><View style={styles.voucherHeader}><View style={styles.rowCopy}><Text style={styles.rowTitle} numberOfLines={2} maxFontSizeMultiplier={1.6}>{voucher.giftItem.name}</Text><Text style={[styles.voucherStatus, { color: meta.color }]} maxFontSizeMultiplier={1.4}>{meta.label}</Text></View><MaterialCommunityIcons name="ticket-confirmation-outline" size={24} color={theme.orange} /></View><View style={styles.codeRow}><Text style={styles.code} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} maxFontSizeMultiplier={1.4} selectable>{voucher.shortCode}</Text><PressableScale style={styles.copyButton} onPress={onCopy} accessibilityRole="button" accessibilityLabel={copied ? t('copied') : t('copyCode')}><MaterialCommunityIcons name={copied ? 'check' : 'content-copy'} size={16} color={theme.orange} /><Text style={styles.copyText} maxFontSizeMultiplier={1.4}>{copied ? t('copied') : t('copyCode')}</Text></PressableScale></View><Text style={styles.rowMeta} maxFontSizeMultiplier={1.5}>{voucher.expiresAt ? t('expiresAt', { date: formatDate(voucher.expiresAt, language) }) : t('voucherExpiryNotSpecified')}</Text></View>
}

function InventorySkeleton() {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  return <View style={styles.skeletonList}><Skeleton height={76} borderRadius={Radius.xl} color={theme.surfaceStrong} /><Skeleton height={76} borderRadius={Radius.xl} color={theme.surfaceStrong} /><Skeleton height={76} borderRadius={Radius.xl} color={theme.surfaceStrong} /></View>
}

function formatDate(value: string, language: 'th' | 'en') {
  return new Intl.DateTimeFormat(language === 'th' ? 'th-TH' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value))
}

function StatusPill({ meta }: { meta: { label: string; color: string; bg: string; icon: 'progress-clock' | 'check-circle' | 'close-circle' | 'backup-restore' } }) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  return <View style={[styles.statusPill, { backgroundColor: meta.bg, borderColor: `${meta.color}44` }]}><MaterialCommunityIcons name={meta.icon} size={12} color={meta.color} /><Text style={[styles.statusText, { color: meta.color }]} maxFontSizeMultiplier={1.4}>{meta.label}</Text></View>
}

function EmptyInventory({ icon, title, body, onBrowse, t }: { icon: 'gift-outline' | 'ticket-outline'; title: string; body: string; onBrowse: () => void; t: GiftsTranslator }) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  return <View style={styles.emptyCard}><MaterialCommunityIcons name={icon} size={30} color={theme.mutedSoft} /><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyBody}>{body}</Text><PressableScale style={styles.browseButton} onPress={onBrowse} accessibilityRole="button"><Text style={styles.browseText} maxFontSizeMultiplier={1.5}>{t('browseVault')}</Text></PressableScale></View>
}

function redemptionStatus(status: GiftRedemption['status'], theme: SportPalette, t: GiftsTranslator) {
  const map = { pending: { label: t('pending'), color: theme.amber, bg: theme.amberSoft, icon: 'progress-clock' as const }, fulfilled: { label: t('fulfilled'), color: theme.green, bg: theme.greenSoft, icon: 'check-circle' as const }, cancelled: { label: t('cancelled'), color: theme.muted, bg: theme.surfaceStrong, icon: 'close-circle' as const }, refunded: { label: t('refunded'), color: theme.blue, bg: theme.blueSoft, icon: 'backup-restore' as const } }
  return map[status]
}

function voucherStatus(status: VoucherStatus, theme: SportPalette, t: GiftsTranslator) {
  const map = { active: { label: t('active'), color: theme.green, bg: theme.greenSoft }, used: { label: t('used'), color: theme.muted, bg: theme.surfaceStrong }, expired: { label: t('expired'), color: theme.red, bg: theme.redSoft }, revoked: { label: t('revoked'), color: theme.red, bg: theme.redSoft } }
  return map[status]
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    container: { paddingHorizontal: Spacing.xl, gap: Spacing.md },
    topBar: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.pill, backgroundColor: theme.surface },
    storeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.pill, backgroundColor: theme.orangeSoft },
    titleCopy: { flex: 1, minWidth: 0, gap: 1 },
    eyebrow: { color: theme.orange, fontSize: 9, lineHeight: 12, fontWeight: '900', letterSpacing: 1.2 },
    title: { color: theme.ink, fontSize: 24, lineHeight: 29, fontWeight: '900', letterSpacing: -0.5 },
    tabs: { flexDirection: 'row', gap: Spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.line, paddingBottom: Spacing.sm },
    tab: { minHeight: 44, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.lg },
    tabActive: { backgroundColor: theme.orangeSoft },
    tabText: { color: theme.muted, fontSize: 13, lineHeight: 18, fontWeight: '900' },
    tabTextActive: { color: theme.orange },
    skeletonList: { gap: Spacing.md, paddingTop: Spacing.sm },
    errorText: { color: theme.red, fontSize: 13, lineHeight: 19, fontWeight: '800', paddingTop: Spacing.md },
    row: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.line, paddingVertical: Spacing.md },
    rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    iconBox: { width: 40, height: 40, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
    rowCopy: { flex: 1, minWidth: 0, gap: 3 },
    rowTitle: { color: theme.ink, fontSize: 14, lineHeight: 20, fontWeight: '900' },
    rowMeta: { color: theme.muted, fontSize: 11, lineHeight: 16, fontWeight: '700' },
    statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 6 },
    statusText: { fontSize: 9, lineHeight: 12, fontWeight: '900' },
    voucherCard: { gap: Spacing.sm, borderRadius: Radius.xl, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface, padding: Spacing.lg },
    voucherHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
    voucherStatus: { fontSize: 11, lineHeight: 15, fontWeight: '900' },
    codeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderRadius: Radius.lg, backgroundColor: theme.orangeSoft, paddingLeft: Spacing.md },
    code: { flex: 1, color: theme.ink, fontSize: 18, lineHeight: 24, fontWeight: '900', letterSpacing: 1.2 },
    copyButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.md },
    copyText: { color: theme.orange, fontSize: 12, lineHeight: 16, fontWeight: '900' },
    emptyCard: { alignItems: 'center', gap: 8, borderRadius: Radius.xl, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface, padding: Spacing.xl, marginTop: Spacing.md },
    emptyTitle: { color: theme.ink, fontSize: 16, lineHeight: 22, fontWeight: '900', textAlign: 'center' },
    emptyBody: { color: theme.muted, fontSize: 13, lineHeight: 19, fontWeight: '700', textAlign: 'center' },
    browseButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.lg, backgroundColor: theme.orange, paddingHorizontal: Spacing.lg, marginTop: Spacing.sm },
    browseText: { color: theme.chalk, fontSize: 13, lineHeight: 18, fontWeight: '900' },
  })
}
