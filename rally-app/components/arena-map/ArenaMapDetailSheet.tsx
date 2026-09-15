import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Fonts, OnAccent, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { arenaMapCompactMetaLabel, arenaMapCompactQueueLabel, arenaMapTypeLabel } from '@/lib/arena-map/arenaMapPresentation'
import type { ArenaMapPinDetail } from '@/types/arenaMap'

type ArenaMapDetailSheetProps = {
  detail: ArenaMapPinDetail
  distanceM: number | null
  isStale: boolean
  onFavorite: () => void
  onClose: () => void
  canView: boolean
  onViewVenue: () => void
}

export function ArenaMapDetailSheet({ detail, distanceM, onFavorite, onClose, canView, onViewVenue }: ArenaMapDetailSheetProps) {
  const theme = useSportTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const insets = useSafeAreaInsets()
  const avatarUrl = detail.ownerOrHost.partyAvatarUrl ?? detail.ownerOrHost.hostAvatarUrl
  const compactMeta = arenaMapCompactMetaLabel(detail.format, distanceM)
  const queueLabel = arenaMapCompactQueueLabel(detail.queuePreview)

  return <View
    style={[styles.sheet, { bottom: Math.max(12, insets.bottom) }]}
    accessibilityLiveRegion="polite"
    accessibilityViewIsModal
  >
    <Pressable onPress={onClose} style={styles.handleButton} hitSlop={8} accessibilityRole="button" accessibilityLabel="ปิดรายละเอียดสนาม">
      <View style={styles.handle} />
    </Pressable>

    <View style={styles.summaryRow}>
      {avatarUrl
        ? <Image source={avatarUrl} style={styles.avatar} contentFit="cover" />
        : <View style={styles.avatarFallback}>
            <Text style={styles.initials}>{detail.ownerOrHost.initials}</Text>
            <MaterialCommunityIcons name="basketball" size={15} color={theme.orange} />
          </View>}

      <View style={styles.identityCopy}>
        <Text style={styles.title} numberOfLines={2}>{detail.name}</Text>
        <View style={styles.typeRow}>
          {detail.venueId && <Pressable
            onPress={onFavorite}
            style={styles.favoriteButton}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={detail.isFavorite ? 'นำสนามออกจากรายการโปรด' : 'เพิ่มสนามในรายการโปรด'}
            accessibilityState={{ selected: detail.isFavorite }}
          >
            <MaterialCommunityIcons name={detail.isFavorite ? 'star' : 'star-outline'} size={20} color={theme.economy} />
          </Pressable>}
          <Text style={styles.typeLabel} numberOfLines={1}>{arenaMapTypeLabel(detail.type)}</Text>
        </View>
        {compactMeta ? <View style={styles.metaRow}>
          <MaterialCommunityIcons name="account-group-outline" size={17} color={theme.muted} />
          <Text style={styles.meta} numberOfLines={1}>{compactMeta}</Text>
        </View> : null}
      </View>

      {detail.liveScore ? <View style={styles.liveSummary}>
        <View style={styles.liveBadge}><Text style={styles.liveBadgeText}>LIVE</Text></View>
        <Text style={styles.score}>{detail.liveScore.homeScore}–{detail.liveScore.awayScore}</Text>
        {queueLabel ? <Text style={styles.queue}>{queueLabel}</Text> : null}
      </View> : null}
    </View>

    {canView && <Pressable
      onPress={onViewVenue}
      style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
      accessibilityRole="button"
      accessibilityLabel="ดูสนาม"
    >
      <Text style={styles.ctaText}>ดูสนาม</Text>
    </Pressable>}
  </View>
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    sheet: { position: 'absolute', left: 12, right: 12, paddingHorizontal: 14, paddingBottom: 14, borderRadius: 26, backgroundColor: theme.bgElevated, shadowColor: theme.ink, shadowOpacity: .16, shadowOffset: { width: 0, height: 8 }, shadowRadius: 20, elevation: 9 },
    handleButton: { height: 28, alignItems: 'center', justifyContent: 'center' },
    handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: theme.line },
    summaryRow: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 10 },
    avatar: { width: 68, height: 68, borderRadius: 34, borderWidth: 2, borderColor: theme.orange },
    avatarFallback: { width: 68, height: 68, borderRadius: 34, borderWidth: 2, borderColor: theme.orange, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 3, backgroundColor: theme.fightBg },
    initials: { color: theme.fightInk, fontSize: 15, lineHeight: 22, fontFamily: Fonts?.thaiHead },
    identityCopy: { flex: 1, minWidth: 0 },
    title: { color: theme.ink, fontSize: 17, lineHeight: 25, fontFamily: Fonts?.thaiHead },
    typeRow: { minHeight: 26, flexDirection: 'row', alignItems: 'center' },
    favoriteButton: { width: 36, height: 36, marginLeft: -8, marginRight: -3, alignItems: 'center', justifyContent: 'center' },
    typeLabel: { flexShrink: 1, color: theme.muted, fontSize: 13, lineHeight: 20, fontFamily: Fonts?.thaiBody },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    meta: { flexShrink: 1, color: theme.muted, fontSize: 13, lineHeight: 20, fontFamily: Fonts?.thaiBody },
    liveSummary: { minWidth: 74, alignItems: 'flex-end' },
    liveBadge: { minHeight: 20, paddingHorizontal: 6, borderRadius: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.trust },
    liveBadgeText: { color: OnAccent.onLight, fontSize: 9, lineHeight: 13, fontFamily: Fonts?.rounded, fontWeight: '900' },
    score: { marginTop: 2, color: theme.ink, fontSize: 28, lineHeight: 34, fontFamily: Fonts?.rounded, fontWeight: '900', fontStyle: 'italic', fontVariant: ['tabular-nums'] },
    queue: { color: theme.ink, fontSize: 12, lineHeight: 18, fontFamily: Fonts?.thaiMedium, fontVariant: ['tabular-nums'] },
    cta: { minHeight: 52, marginTop: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.orange },
    ctaPressed: { opacity: .86 },
    ctaText: { color: OnAccent.onLight, fontSize: 17, lineHeight: 25, fontFamily: Fonts?.thaiMedium },
  })
}
