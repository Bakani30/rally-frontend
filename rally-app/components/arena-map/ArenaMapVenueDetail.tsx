import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { Fonts, OnAccent, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { arenaMapDetailMetaLabel } from '@/lib/arena-map/arenaMapPresentation'
import type { ArenaMapPinDetail } from '@/types/arenaMap'

type ArenaMapVenueDetailProps = {
  detail: ArenaMapPinDetail
  selectedSessionId: string | null
  onBack: () => void
  onFavorite: () => void
  onSelectSession: (sessionId: string) => void
  onViewSession: () => void
}

/** Read-only Venue destination for an idle or active map pin. */
export function ArenaMapVenueDetail({ detail, selectedSessionId, onBack, onFavorite, onSelectSession, onViewSession }: ArenaMapVenueDetailProps) {
  const theme = useSportTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const avatarUrl = detail.ownerOrHost.partyAvatarUrl ?? detail.ownerOrHost.hostAvatarUrl
  const hasSession = selectedSessionId !== null

  return <View style={styles.root}>
    <View style={styles.header}>
      <Pressable onPress={onBack} style={styles.back} accessibilityRole="button" accessibilityLabel="กลับ">
        <MaterialCommunityIcons name="chevron-left" size={26} color={theme.ink} />
      </Pressable>
      <Text style={styles.screenTitle}>รายละเอียดสนาม</Text>
    </View>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.titleRow}>
        <Text style={styles.name} numberOfLines={2}>{detail.name}</Text>
        <Pressable
          onPress={onFavorite}
          style={[styles.favorite, detail.isFavorite && styles.favoriteSelected]}
          accessibilityRole="button"
          accessibilityLabel={detail.isFavorite ? 'นำสนามออกจากรายการโปรด' : 'เพิ่มสนามในรายการโปรด'}
          accessibilityState={{ selected: detail.isFavorite }}
        >
          <MaterialCommunityIcons name={detail.isFavorite ? 'bookmark' : 'bookmark-outline'} size={24} color={theme.ink} />
        </Pressable>
      </View>
      <Text style={styles.meta}>{arenaMapDetailMetaLabel(detail.type, detail.format, null)}</Text>

      <View style={styles.identity}>
        {avatarUrl
          ? <Image source={avatarUrl} style={styles.avatar} contentFit="cover" />
          : <View style={styles.avatarFallback}>
              <Text style={styles.initials}>{detail.ownerOrHost.initials}</Text>
              <MaterialCommunityIcons name="basketball" size={14} color={theme.orange} />
            </View>}
        <View style={styles.identityCopy}>
          <Text style={styles.identityLabel}>ผู้ดูแลสนาม</Text>
          <Text style={styles.identityName} numberOfLines={1}>{detail.ownerOrHost.label}</Text>
          {detail.ownerOrHost.affiliation && <Text style={styles.affiliation} numberOfLines={1}>{detail.ownerOrHost.affiliation}</Text>}
        </View>
      </View>

      <View style={styles.sessionCard}>
        <Text style={styles.sectionTitle}>รอบที่เปิดอยู่</Text>
        {detail.sessionNavigationOptions.length === 0 && <Text style={styles.empty}>ยังไม่มีรอบที่เปิดอยู่</Text>}
        {detail.sessionNavigationOptions.map((option) => {
          const selected = selectedSessionId === option.sessionId
          return <Pressable
            key={option.sessionId}
            onPress={() => onSelectSession(option.sessionId)}
            style={[styles.sessionOption, selected && styles.sessionOptionSelected]}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <Text style={styles.sessionLabel} numberOfLines={1}>{option.label}</Text>
            {selected && <MaterialCommunityIcons name="check-circle" size={20} color={theme.orange} />}
          </Pressable>
        })}
        {detail.additionalSessionCount > 0 && <Text style={styles.moreSessions}>มีรอบอื่นอีก {detail.additionalSessionCount} รอบ</Text>}
      </View>

      {hasSession && <Pressable onPress={onViewSession} style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]} accessibilityRole="button">
        <Text style={styles.ctaText}>ดูสนาม</Text>
      </Pressable>}
    </ScrollView>
  </View>
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.arenaPage },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12 },
    back: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bgElevated, shadowColor: theme.ink, shadowOpacity: .14, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
    screenTitle: { color: theme.ink, fontSize: 18, lineHeight: 28, fontFamily: Fonts?.thaiHead },
    content: { padding: 16, paddingBottom: 36, gap: 16 },
    titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    name: { flex: 1, color: theme.ink, fontSize: 28, lineHeight: 40, fontFamily: Fonts?.thaiHead },
    favorite: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    favoriteSelected: { backgroundColor: theme.economySoft },
    meta: { color: theme.muted, marginTop: -10, fontSize: 14, lineHeight: 22, fontFamily: Fonts?.thaiBody },
    identity: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, backgroundColor: theme.bgElevated },
    avatar: { width: 48, height: 48, borderRadius: 24 },
    avatarFallback: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 2, backgroundColor: theme.surface },
    initials: { color: theme.ink, fontFamily: Fonts?.thaiHead, fontSize: 13, lineHeight: 20 },
    identityCopy: { flex: 1, gap: 2 },
    identityLabel: { color: theme.muted, fontSize: 12, lineHeight: 18, fontFamily: Fonts?.thaiBody },
    identityName: { color: theme.ink, fontSize: 16, lineHeight: 24, fontFamily: Fonts?.thaiMedium },
    affiliation: { color: theme.muted, fontSize: 12, lineHeight: 18, fontFamily: Fonts?.thaiBody },
    sessionCard: { gap: 8, padding: 16, borderRadius: 20, backgroundColor: theme.bgElevated },
    sectionTitle: { color: theme.ink, fontSize: 17, lineHeight: 26, fontFamily: Fonts?.thaiHead },
    empty: { color: theme.muted, fontSize: 14, lineHeight: 22, fontFamily: Fonts?.thaiBody },
    sessionOption: { minHeight: 48, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderRadius: 12, borderWidth: 1, borderColor: 'transparent', backgroundColor: theme.surface },
    sessionOptionSelected: { borderColor: theme.orange, backgroundColor: theme.orangeSoft },
    sessionLabel: { flex: 1, color: theme.ink, fontSize: 14, lineHeight: 22, fontFamily: Fonts?.thaiMedium },
    moreSessions: { color: theme.muted, fontSize: 13, lineHeight: 20, fontFamily: Fonts?.thaiBody },
    cta: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: theme.orange },
    ctaPressed: { opacity: .86 },
    ctaText: { color: OnAccent.onLight, fontSize: 16, lineHeight: 24, fontFamily: Fonts?.thaiMedium },
  })
}
