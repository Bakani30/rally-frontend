import type { ReactNode } from 'react'
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { getArenaDiscoveryPresentation } from '@/lib/arenas/arenaDiscoveryPresentation'
import { getActiveArenaRound, getArenaChampion, getArenaQueue } from '@/lib/arenas/arenaRules'
import type { ArenaEventDestination } from '@/lib/arenas/arenaNavigation'
import type { ArenaActivity, ArenaEvent } from '@/types/arena'

const ACTIVITY_ART = {
  // Cropped from the supplied Rally UI reference, then kept as a local app
  // asset so Metro can bundle it in preview and release builds.
  basketball: require('../../assets/images/arena/basketball-court-illustration.png'),
  badminton: require('../../assets/images/home/ad-badminton.png'),
} as const

type ArenaActivityFilter = 'all' | ArenaActivity

type ArenaDiscoverySectionProps = {
  arenas: ArenaEvent[]
  activeFilter: ArenaActivityFilter
  onFilterChange: (filter: ArenaActivityFilter) => void
  onOpenArena: (arena: ArenaEvent) => void
  launchCard: ReactNode
  loading?: boolean
  error?: boolean
  onRetry?: () => void
}

const FILTERS: { key: ArenaActivityFilter; label: string }[] = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'basketball', label: 'บาสเกตบอล' },
  { key: 'badminton', label: 'แบดมินตัน' },
]

export function ArenaDiscoverySection({
  arenas,
  activeFilter,
  onFilterChange,
  onOpenArena,
  launchCard,
  loading = false,
  error = false,
  onRetry,
}: ArenaDiscoverySectionProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const filteredArenas = activeFilter === 'all'
    ? arenas
    : arenas.filter((arena) => arena.activity_type === activeFilter)
  const presentation = getArenaDiscoveryPresentation(filteredArenas)

  return (
    <View style={styles.root}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {FILTERS.map((filter) => {
          const active = filter.key === activeFilter
          return (
            <PressableScale
              key={filter.key}
              style={[styles.filter, active && styles.filterActive]}
              onPress={() => onFilterChange(filter.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`แสดงสนาม ${filter.label}`}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{filter.label}</Text>
            </PressableScale>
          )
        })}
      </ScrollView>

      {launchCard}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Stadium</Text>
        <Text style={styles.sectionCount}>{filteredArenas.length} สนาม</Text>
      </View>

      {loading ? (
        <View style={styles.empty}>
          <ActivityIndicator size="small" color={theme.orange} />
          <Text style={styles.emptyText}>กำลังหาสนาม...</Text>
        </View>
      ) : error ? (
        <PressableScale style={styles.empty} onPress={onRetry} accessibilityRole="button" accessibilityLabel="ลองโหลดสนามอีกครั้ง">
          <MaterialCommunityIcons name="alert-circle-outline" size={22} color={theme.risk} />
          <Text style={styles.emptyText}>โหลดสนามไม่สำเร็จ</Text>
        </PressableScale>
      ) : filteredArenas.length > 0 ? (
        <View style={styles.cards}>
          {presentation.current.length > 0 ? (
            <View style={styles.cardGroup}>
              <Text style={styles.currentGroupTitle}>Arena Sessions</Text>
              {presentation.current.map(({ arena, destination }) => (
                <ArenaDiscoveryCard key={arena.id} arena={arena} destination={destination} onPress={() => onOpenArena(arena)} />
              ))}
            </View>
          ) : null}
          {presentation.legacy.length > 0 ? (
            <View style={styles.cardGroup}>
              <Text style={styles.legacyGroupTitle}>Legacy Arena</Text>
              {presentation.legacy.map(({ arena, destination }) => (
                <ArenaDiscoveryCard key={arena.id} arena={arena} destination={destination} onPress={() => onOpenArena(arena)} />
              ))}
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="stadium-variant" size={22} color={theme.muted} />
          <Text style={styles.emptyText}>ยังไม่มีสนามที่เปิดอยู่</Text>
        </View>
      )}
    </View>
  )
}

function ArenaDiscoveryCard({
  arena,
  destination,
  onPress,
}: {
  arena: ArenaEvent
  destination: ArenaEventDestination
  onPress: () => void
}) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const queue = getArenaQueue(arena)
  const activeRound = getActiveArenaRound(arena)
  const champion = getArenaChampion(arena)
  const isBasketball = arena.activity_type === 'basketball'
  const isLegacy = destination.kind === 'legacy'
  const sport = isBasketball ? 'Basketball' : 'Badminton'
  const liveScore = !isLegacy && activeRound?.champion_score != null && activeRound.challenger_score != null
    ? `${activeRound.champion_score} – ${activeRound.challenger_score}`
    : null
  const status = isLegacy
    ? 'ข้อมูลสนามเดิมสำหรับการดูเท่านั้น'
    : activeRound?.status === 'in_progress'
    ? 'กำลังแข่ง'
    : champion
      ? `ครองสนาม ${arena.current_champion_streak} เกม`
      : `${queue.length} ทีมในคิว`

  return (
    <PressableScale
      style={[styles.card, isLegacy && styles.legacyCard]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={isLegacy ? `ดูสนามเดิม ${arena.title}` : `ดู Arena Session ${arena.title}`}
      accessibilityHint={isLegacy ? 'สนามเดิมสำหรับดูข้อมูลเท่านั้น' : 'เปิด Arena Session'}
    >
      <Image source={ACTIVITY_ART[arena.activity_type]} style={[styles.art, isLegacy && styles.legacyArt]} resizeMode="contain" />
      <View style={styles.copy}>
        <View style={styles.headingRow}>
          <Text style={styles.cardTitle} numberOfLines={1}>{sport}</Text>
          <Text style={styles.format}>({arena.team_size_per_side}v{arena.team_size_per_side})</Text>
        </View>
        {isLegacy ? <Text style={styles.legacyBadge}>{destination.badge}</Text> : null}
        <Text style={styles.arenaName} numberOfLines={2}>{arena.title}</Text>
        <Text style={styles.status} numberOfLines={1}>{status}</Text>
        <View style={styles.bottomRow}>
          {!isLegacy ? <View>
            <Text style={styles.mode}>{arena.team_size_per_side} V {arena.team_size_per_side}</Text>
            <Text style={styles.queue}>{queue.length} ทีมในคิว</Text>
          </View> : <View />}
          <View style={[styles.openButton, isLegacy && styles.legacyOpenButton]}>
            {liveScore ? <Text style={styles.score}>{liveScore}</Text> : <MaterialCommunityIcons name="stadium-variant" size={18} color={theme.arcadeCtaText} />}
            <Text style={styles.openText}>{destination.actionLabel}</Text>
          </View>
        </View>
      </View>
    </PressableScale>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    root: { gap: Spacing.md },
    filters: { flexDirection: 'row', gap: Spacing.sm, paddingRight: 2 },
    filter: {
      minHeight: 44,
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: theme.lineStrong,
      backgroundColor: theme.bgElevated,
      justifyContent: 'center',
      paddingHorizontal: 15,
    },
    filterActive: { borderColor: theme.orange, backgroundColor: theme.orange },
    filterText: { color: theme.ink, fontSize: 12, fontWeight: '900' },
    filterTextActive: { color: theme.arcadeCtaText },
    sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 2 },
    sectionTitle: { color: theme.ink, fontSize: 18, lineHeight: 23, fontWeight: '900', fontStyle: 'italic' },
    sectionCount: { color: theme.muted, fontSize: 11, fontWeight: '800' },
    cards: { gap: Spacing.md },
    cardGroup: { gap: Spacing.sm },
    currentGroupTitle: { color: theme.orange, fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
    legacyGroupTitle: { color: theme.muted, fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
    card: {
      minHeight: 186,
      overflow: 'hidden',
      borderRadius: Radius.xxl,
      borderWidth: 1.5,
      borderColor: theme.lineStrong,
      backgroundColor: theme.bgElevated,
      padding: Spacing.lg,
    },
    legacyCard: { borderColor: theme.line, backgroundColor: theme.bg },
    art: { position: 'absolute', right: -10, bottom: 2, width: '58%', height: '72%', opacity: 0.98 },
    legacyArt: { opacity: 0.38 },
    copy: { flex: 1, width: '62%', minWidth: 0, justifyContent: 'space-between', gap: 8 },
    headingRow: { flexDirection: 'row', alignItems: 'baseline', gap: 7 },
    cardTitle: { color: theme.ink, fontSize: 25, lineHeight: 30, fontWeight: '900', letterSpacing: -0.5 },
    format: { color: theme.muted, fontSize: 12, fontWeight: '900' },
    arenaName: { color: theme.ink, fontSize: 12, lineHeight: 17, fontWeight: '800' },
    legacyBadge: { color: theme.muted, fontSize: 10, fontWeight: '900', letterSpacing: 0.3 },
    status: { color: theme.muted, fontSize: 11, lineHeight: 15, fontWeight: '700' },
    bottomRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 },
    mode: { color: theme.orange, fontSize: 20, lineHeight: 24, fontWeight: '900', fontStyle: 'italic' },
    queue: { color: theme.muted, fontSize: 10, fontWeight: '800' },
    openButton: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderRadius: Radius.pill,
      backgroundColor: theme.orange,
      paddingHorizontal: 12,
    },
    legacyOpenButton: { backgroundColor: theme.arcadeCabinet },
    openText: { color: theme.arcadeCtaText, fontSize: 12, fontWeight: '900' },
    score: { color: theme.arcadeCtaText, fontSize: 12, fontWeight: '900', fontVariant: ['tabular-nums'] },
    empty: { minHeight: 96, borderRadius: Radius.xl, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.bgElevated, alignItems: 'center', justifyContent: 'center', gap: 8, padding: Spacing.md },
    emptyText: { color: theme.muted, fontSize: 12, fontWeight: '800' },
  })
}
