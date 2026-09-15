import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Image } from 'expo-image'

import { PressableScale } from '@/components/motion/PressableScale'
import { onAccent, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useFeaturedCampaigns } from '@/hooks/useCampaigns'
import { useSportTheme } from '@/hooks/useAppTheme'
import { guardedRouter } from '@/lib/navigation/guardedRouter'
import type { CampaignSummary } from '@/types/campaign'

export function NotificationEventList() {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const campaigns = useFeaturedCampaigns()
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignSummary | null>(null)
  const campaignList = campaigns.data ?? []

  if (campaigns.isPending) {
    return (
      <View style={styles.state}>
        <ActivityIndicator color={theme.orange} />
      </View>
    )
  }

  if (campaigns.error) {
    return (
      <View style={styles.state}>
        <MaterialCommunityIcons name="alert-circle-outline" size={28} color={theme.red} />
        <Text style={styles.stateTitle}>โหลดประกาศอีเวนต์ไม่สำเร็จ</Text>
        <Text style={styles.stateHint}>ลองใหม่อีกครั้งภายหลัง</Text>
      </View>
    )
  }

  if (campaignList.length === 0) {
    return (
      <View style={styles.state}>
        <MaterialCommunityIcons name="calendar-star" size={32} color={theme.mutedSoft} />
        <Text style={styles.stateTitle}>ยังไม่มีประกาศอีเวนต์</Text>
        <Text style={styles.stateHint}>อีเวนต์ใหม่จะปรากฏที่นี่เมื่อเปิดให้เข้าร่วม</Text>
      </View>
    )
  }

  return (
    <>
      <View style={styles.list}>
        {campaignList.map((campaign) => (
          <EventAnnouncementRow
            key={campaign.id}
            campaign={campaign}
            onPress={() => setSelectedCampaign(campaign)}
          />
        ))}
      </View>

      <EventDetailsModal
        campaign={selectedCampaign}
        onClose={() => setSelectedCampaign(null)}
        onOpenCampaign={(campaign) => {
          setSelectedCampaign(null)
          guardedRouter.push(`/campaigns/${campaign.slug}`, {
            actionKey: `notifications:event:${campaign.slug}`,
          })
        }}
      />
    </>
  )
}

function EventAnnouncementRow({ campaign, onPress }: { campaign: CampaignSummary; onPress: () => void }) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const skin = campaign.skin ?? {}
  const image = skin.coverImageUrl ?? skin.backgroundImageUrl
  const accent = skin.accentColor ?? skin.primaryColor ?? theme.orange

  return (
    <PressableScale
      style={styles.row}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`เปิดรายละเอียด ${campaign.title}`}
    >
      {image ? (
        <Image source={{ uri: image }} style={styles.thumbnail} contentFit="cover" transition={150} />
      ) : (
        <View style={[styles.thumbnail, styles.thumbnailFallback, { backgroundColor: skin.backgroundColor ?? accent }]}>
          <MaterialCommunityIcons name="calendar-star" size={25} color={onAccent(skin.backgroundColor ?? accent)} />
        </View>
      )}
      <View style={styles.rowCopy}>
        <View style={styles.rowMeta}>
          <MaterialCommunityIcons name="flag-variant" size={13} color={accent} />
          <Text style={[styles.partner, { color: accent }]} numberOfLines={1}>
            {campaign.partner_name ?? 'Official'}
          </Text>
        </View>
        <Text style={styles.rowTitle} numberOfLines={2}>{campaign.title}</Text>
        <Text style={styles.rowPrompt} numberOfLines={2}>{campaign.short_prompt || campaign.description}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color={theme.muted} />
    </PressableScale>
  )
}

function EventDetailsModal({
  campaign,
  onClose,
  onOpenCampaign,
}: {
  campaign: CampaignSummary | null
  onClose: () => void
  onOpenCampaign: (campaign: CampaignSummary) => void
}) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  if (!campaign) return null

  const skin = campaign.skin ?? {}
  const image = skin.coverImageUrl ?? skin.backgroundImageUrl
  const accent = skin.accentColor ?? skin.primaryColor ?? theme.orange

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="ปิดรายละเอียดอีเวนต์" />
        <View style={styles.sheet}>
          <View style={styles.sheetHero}>
            {image ? (
              <Image source={{ uri: image }} style={styles.sheetImage} contentFit="cover" />
            ) : (
              <View style={[styles.sheetImage, { backgroundColor: skin.backgroundColor ?? accent }]} />
            )}
            <View style={styles.sheetHeroScrim} pointerEvents="none" />
            <Pressable style={styles.closeButton} onPress={onClose} accessibilityLabel="ปิด">
              <MaterialCommunityIcons name="close" size={20} color={theme.chalk} />
            </Pressable>
            <View style={styles.sheetHeroCopy}>
              <Text style={[styles.partner, { color: theme.chalk }]}>{campaign.partner_name ?? 'Official'}</Text>
              <Text style={styles.sheetTitle} numberOfLines={2}>{campaign.title}</Text>
            </View>
          </View>
          <View style={styles.sheetBody}>
            <Text style={styles.sheetPrompt}>{campaign.description || campaign.short_prompt}</Text>
            <View style={styles.dateRow}>
              <MaterialCommunityIcons name="calendar-range" size={16} color={accent} />
              <Text style={styles.dateText}>{formatCampaignDates(campaign.start_at, campaign.end_at)}</Text>
            </View>
            <PressableScale
              style={[styles.openButton, { backgroundColor: accent }]}
              onPress={() => onOpenCampaign(campaign)}
              accessibilityRole="button"
              accessibilityLabel={`เปิดกิจกรรม ${campaign.title}`}
            >
              <Text style={[styles.openButtonText, { color: onAccent(accent) }]}>ดูรายละเอียดกิจกรรม</Text>
              <MaterialCommunityIcons name="arrow-right" size={17} color={onAccent(accent)} />
            </PressableScale>
          </View>
        </View>
      </View>
    </Modal>
  )
}

function formatCampaignDates(startAt: string, endAt: string) {
  const formatter = new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short' })
  return `${formatter.format(new Date(startAt))} - ${formatter.format(new Date(endAt))}`
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    list: { gap: Spacing.sm },
    row: {
      minHeight: 104,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface,
      padding: Spacing.sm,
    },
    thumbnail: { width: 84, height: 84, borderRadius: Radius.lg },
    thumbnailFallback: { alignItems: 'center', justifyContent: 'center' },
    rowCopy: { flex: 1, minWidth: 0, gap: 3 },
    rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    partner: { fontSize: 10, lineHeight: 14, fontWeight: '900', letterSpacing: 0.4 },
    rowTitle: { color: theme.ink, fontSize: 15, lineHeight: 20, fontWeight: '900' },
    rowPrompt: { color: theme.muted, fontSize: 11, lineHeight: 16, fontWeight: '700' },
    state: { alignItems: 'center', gap: 7, paddingVertical: Spacing.xxl, paddingHorizontal: Spacing.lg },
    stateTitle: { color: theme.ink, fontSize: 16, lineHeight: 22, fontWeight: '900', textAlign: 'center' },
    stateHint: { color: theme.muted, fontSize: 13, lineHeight: 19, fontWeight: '700', textAlign: 'center' },
    modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.58)', padding: Spacing.md },
    sheet: { overflow: 'hidden', borderRadius: Radius.xxl, backgroundColor: theme.surface },
    sheetHero: { minHeight: 194, justifyContent: 'flex-end', position: 'relative' },
    sheetImage: { ...StyleSheet.absoluteFillObject },
    sheetHeroScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(12,15,20,0.42)' },
    closeButton: {
      position: 'absolute',
      top: Spacing.sm,
      right: Spacing.sm,
      width: 40,
      height: 40,
      borderRadius: Radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(22,22,22,0.52)',
    },
    sheetHeroCopy: { gap: 4, padding: Spacing.lg },
    sheetTitle: { color: theme.chalk, fontSize: 24, lineHeight: 29, fontWeight: '900' },
    sheetBody: { gap: Spacing.md, padding: Spacing.lg },
    sheetPrompt: { color: theme.inkSoft, fontSize: 14, lineHeight: 21, fontWeight: '700' },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    dateText: { color: theme.muted, fontSize: 12, lineHeight: 17, fontWeight: '800' },
    openButton: {
      minHeight: 46,
      borderRadius: Radius.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingHorizontal: Spacing.lg,
    },
    openButtonText: { fontSize: 13, lineHeight: 18, fontWeight: '900' },
  })
}
