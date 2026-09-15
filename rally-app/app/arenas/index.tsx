import { useMemo } from 'react'
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'

import { PressableScale } from '@/components/motion/PressableScale'
import { ComingSoonEntryCard } from '@/components/roadmap/ComingSoonEntryCard'
import { useScreenInsets } from '@/components/layout/useScreenInsets'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useArenaEvents } from '@/hooks/useArenas'
import { useAuth } from '@/hooks/useAuth'
import { useSportTheme } from '@/hooks/useAppTheme'
import { getActiveArenaRound, getArenaChampion, getArenaQueue } from '@/lib/arenas/arenaRules'
import { getArenaDiscoveryPresentation } from '@/lib/arenas/arenaDiscoveryPresentation'
import type { ArenaEventDestination } from '@/lib/arenas/arenaNavigation'
import type { ArenaEvent } from '@/types/arena'

export default function ArenaListScreen() {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { paddingTop, paddingBottom } = useScreenInsets({
    edges: ['top', 'bottom'],
    topPad: Spacing.md,
    bottomPad: 120,
  })
  const { user } = useAuth()
  const { arenasQuery } = useArenaEvents({ enabled: !!user })

  const arenas = useMemo(() => arenasQuery.data ?? [], [arenasQuery.data])
  const presentation = useMemo(() => getArenaDiscoveryPresentation(arenas), [arenas])

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.container, { paddingTop, paddingBottom }]}
    >
      <View style={styles.header}>
        <PressableScale
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="ย้อนกลับ"
        >
          <MaterialCommunityIcons name="chevron-left" size={24} color={theme.arcadeCtaText} />
        </PressableScale>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>KING OF COURT</Text>
          <Text style={styles.title}>สนามแข่งขัน</Text>
          <Text style={styles.subtitle}>{arenas.length} สนามที่เปิดอยู่</Text>
        </View>
      </View>

      <PressableScale
        style={styles.sessionCta}
        onPress={() => router.push('/arena-session/new' as never)}
        accessibilityRole="button"
        accessibilityLabel="สร้าง Arena Session"
      >
        <View style={styles.sessionCtaIcon}>
          <MaterialCommunityIcons name="account-group-outline" size={20} color={theme.arcadeCtaText} />
        </View>
        <View style={styles.sessionCtaCopy}>
          <Text style={styles.sessionCtaTitle}>Arena Session</Text>
          <Text style={styles.sessionCtaText}>สร้างสนามสำหรับ Party และคิวแข่งขัน</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={theme.arcadeCtaText} />
      </PressableScale>

      <PressableScale
        style={styles.partyCta}
        onPress={() => router.push('/party' as never)}
        accessibilityRole="button"
        accessibilityLabel="จัดการ Party"
      >
        <View style={styles.partyCtaIcon}>
          <MaterialCommunityIcons name="account-multiple-outline" size={19} color={theme.orange} />
        </View>
        <View style={styles.sessionCtaCopy}>
          <Text style={styles.partyCtaTitle}>Party</Text>
          <Text style={styles.partyCtaText}>รวมทีมก่อนเข้า Arena</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={theme.ink} />
      </PressableScale>

      <View style={styles.roadmapStack}>
        <ComingSoonEntryCard featureKey="arena-upgrades" compact />
        <ComingSoonEntryCard featureKey="referee" compact />
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.sectionTitle}>สนามและคิว</Text>
        {arenasQuery.isFetching ? <ActivityIndicator size="small" color={theme.trust} /> : null}
      </View>

      {arenasQuery.isPending ? (
        <StatePanel icon="radar" text="กำลังหาสนามแข่งขัน..." />
      ) : arenasQuery.error ? (
        <StatePanel
          icon="alert-circle-outline"
          text="โหลดสนามแข่งขันไม่สำเร็จ"
          danger
          onRetry={() => void arenasQuery.refetch()}
          retrying={arenasQuery.isFetching}
        />
      ) : arenas.length === 0 ? (
        <StatePanel icon="stadium-variant" text="ยังไม่มีสนามเปิดอยู่" />
      ) : (
        <View style={styles.arenaList}>
          {presentation.current.length > 0 ? (
            <View style={styles.arenaGroup}>
              <Text style={styles.groupTitle}>Arena Sessions</Text>
              {presentation.current.map(({ arena, destination }) => (
                <ArenaCard key={arena.id} arena={arena} destination={destination} />
              ))}
            </View>
          ) : null}
          {presentation.legacy.length > 0 ? (
            <View style={styles.arenaGroup}>
              <Text style={styles.legacyGroupTitle}>Legacy Arena</Text>
              {presentation.legacy.map(({ arena, destination }) => (
                <ArenaCard key={arena.id} arena={arena} destination={destination} />
              ))}
            </View>
          ) : null}
        </View>
      )}
    </ScrollView>
  )
}

function ArenaCard({ arena, destination }: { arena: ArenaEvent; destination: ArenaEventDestination }) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const activeRound = getActiveArenaRound(arena)
  const champion = getArenaChampion(arena)
  const queue = getArenaQueue(arena)
  const icon = arena.activity_type === 'basketball' ? 'basketball' : 'badminton'
  const sportLabel = arena.activity_type === 'basketball' ? 'บาสเกตบอล' : 'แบดมินตัน'
  const hasScore = activeRound?.champion_score != null && activeRound.challenger_score != null
  const roundLabel = activeRound ? formatRoundStatus(activeRound.status) : 'ยังไม่มีรอบ'
  const isLegacy = destination.kind === 'legacy'
  const openDetails = () => router.push(destination.route as never)

  return (
    <PressableScale
      style={[styles.arenaCard, isLegacy && styles.legacyArenaCard]}
      onPress={openDetails}
      accessibilityRole="button"
      accessibilityLabel={isLegacy ? `ดูสนามเดิม ${arena.title}` : `ดู Arena Session ${arena.title}`}
      accessibilityHint={isLegacy ? 'สนามเดิมสำหรับดูข้อมูลเท่านั้น' : 'แตะเพื่อดูทีมและสถานะรอบ'}
    >
      <View style={styles.cardTop}>
        <View style={styles.sportIcon}>
          <MaterialCommunityIcons name={icon} size={22} color={theme.arcadeCtaText} />
        </View>
        <View style={styles.cardCopy}>
          <Text style={styles.cardTitle} numberOfLines={1}>{arena.title}</Text>
          <Text style={styles.cardMeta}>{sportLabel} · {arena.team_size_per_side}v{arena.team_size_per_side}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={theme.ink} />
      </View>
      {isLegacy ? (
        <View style={styles.legacyNotice}>
          <Text style={styles.legacyBadge}>{destination.badge}</Text>
          <Text style={styles.legacyCopy}>ข้อมูลสนามเดิมสำหรับการดูเท่านั้น</Text>
        </View>
      ) : null}
      {!isLegacy ? <View style={styles.teamHighlight}>
        <View style={styles.teamHighlightCopy}>
          <Text style={styles.highlightLabel}>KING OF COURT</Text>
          <Text style={styles.highlightValue} numberOfLines={1}>{champion?.name ?? 'ยังไม่มีทีมครอง'}</Text>
        </View>
        <View style={styles.streakCopy}>
          <Text style={styles.highlightLabel}>STREAK</Text>
          <Text style={styles.highlightValue}>{arena.current_champion_streak > 0 ? `${arena.current_champion_streak} เกม` : 'ยังไม่มี streak'}</Text>
        </View>
      </View> : null}
      {!isLegacy && hasScore ? (
        <View style={styles.scoreRow}>
          <MaterialCommunityIcons name="scoreboard-outline" size={17} color={theme.economy} />
          <Text style={styles.scoreLabel}>{activeRound?.status === 'in_progress' ? 'สกอร์สด' : 'สกอร์รอบนี้'}</Text>
          <Text style={styles.scoreValue}>{activeRound?.champion_score} - {activeRound?.challenger_score}</Text>
        </View>
      ) : null}
      {!isLegacy ? <View style={styles.cardStats}>
        <MiniStat label="ทีมในคิว" value={`${queue.length} ทีม`} />
        <MiniStat label="สถานะรอบ" value={roundLabel} />
      </View> : null}
      <View style={[styles.queueButton, isLegacy && styles.legacyOpenButton]}>
        <MaterialCommunityIcons name={isLegacy ? 'eye-outline' : 'account-group-outline'} size={18} color={theme.arcadeCtaText} />
        <Text style={styles.queueButtonText}>{destination.actionLabel}</Text>
      </View>
    </PressableScale>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  )
}

function StatePanel({
  icon,
  text,
  danger,
  onRetry,
  retrying,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap
  text: string
  danger?: boolean
  onRetry?: () => void
  retrying?: boolean
}) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  return (
    <View style={styles.statePanel}>
      <MaterialCommunityIcons name={icon} size={22} color={danger ? theme.risk : theme.orange} />
      <Text style={styles.stateText}>{text}</Text>
      {onRetry ? (
        <PressableScale
          style={styles.retryButton}
          onPress={onRetry}
          disabled={retrying}
          accessibilityRole="button"
          accessibilityLabel="ลองโหลดสนามแข่งขันอีกครั้ง"
          accessibilityState={{ disabled: retrying, busy: retrying }}
        >
          {retrying ? <ActivityIndicator size="small" color={theme.arcadeCtaText} /> : <Text style={styles.retryText}>ลองใหม่</Text>}
        </PressableScale>
      ) : null}
    </View>
  )
}

function formatRoundStatus(status: string): string {
  switch (status) {
    case 'stake_acceptance':
      return 'รอยืนยันแต้ม'
    case 'in_progress':
      return 'กำลังแข่ง'
    case 'result_pending':
      return 'รอผล'
    case 'disputed':
      return 'มีข้อโต้แย้ง'
    case 'settled':
      return 'จบแล้ว'
    case 'cancelled':
      return 'ยกเลิก'
    default:
      return 'ยังไม่มีรอบ'
  }
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.arenaBg },
    container: { padding: 20, gap: Spacing.md },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      borderRadius: 28,
      borderWidth: 2,
      borderColor: theme.arcadeCabinetEdge,
      backgroundColor: theme.arcadePanel,
      padding: 14,
    },
    backButton: {
      width: 44,
      height: 44,
      borderRadius: Radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.arcadeCabinet,
    },
    headerCopy: { flex: 1, minWidth: 0 },
    eyebrow: { color: theme.trust, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    title: { color: theme.ink, fontSize: 30, lineHeight: 34, fontWeight: '900', letterSpacing: 0 },
    subtitle: { color: theme.muted, fontSize: 12, lineHeight: 17, fontWeight: '800', marginTop: 2 },
    sessionCta: {
      minHeight: 66,
      borderRadius: Radius.xl,
      backgroundColor: theme.orange,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 14,
    },
    sessionCtaIcon: {
      width: 38,
      height: 38,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(22,22,22,0.18)',
    },
    sessionCtaCopy: { flex: 1, minWidth: 0 },
    sessionCtaTitle: { color: theme.arcadeCtaText, fontSize: 15, fontWeight: '900' },
    sessionCtaText: { color: theme.arcadeCtaText, fontSize: 11, lineHeight: 16, fontWeight: '700', marginTop: 2 },
    partyCta: { minHeight: 62, borderRadius: Radius.xl, borderWidth: 1.5, borderColor: theme.line, backgroundColor: theme.bgElevated, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
    partyCtaIcon: { width: 38, height: 38, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.orangeSoft },
    partyCtaTitle: { color: theme.ink, fontSize: 15, fontWeight: '900' },
    partyCtaText: { color: theme.muted, fontSize: 11, lineHeight: 16, fontWeight: '700', marginTop: 2 },
    listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 28 },
    sectionTitle: { color: theme.arcadeCtaText, fontSize: 16, fontWeight: '900' },
    roadmapStack: { gap: 10 },
    arenaList: { gap: Spacing.md },
    arenaGroup: { gap: Spacing.sm },
    groupTitle: { color: theme.arcadeCtaText, fontSize: 13, fontWeight: '900', letterSpacing: 0.7 },
    legacyGroupTitle: { color: theme.muted, fontSize: 13, fontWeight: '900', letterSpacing: 0.7 },
    arenaCard: {
      borderRadius: Radius.xl,
      borderWidth: 2,
      borderColor: theme.arcadeCabinetEdge,
      backgroundColor: theme.arcadePanel,
      padding: 14,
      gap: 12,
    },
    legacyArenaCard: { borderColor: theme.line, backgroundColor: theme.bgElevated },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    sportIcon: {
      width: 44,
      height: 44,
      borderRadius: Radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.arcadeCabinet,
    },
    cardCopy: { flex: 1, minWidth: 0 },
    cardTitle: { color: theme.ink, fontSize: 16, fontWeight: '900' },
    cardMeta: { color: theme.muted, fontSize: 12, fontWeight: '800', marginTop: 2 },
    legacyNotice: { borderRadius: Radius.lg, backgroundColor: theme.bg, gap: 3, padding: 10 },
    legacyBadge: { color: theme.muted, fontSize: 10, fontWeight: '900', letterSpacing: 0.4 },
    legacyCopy: { color: theme.muted, fontSize: 11, fontWeight: '700' },
    teamHighlight: {
      minHeight: 64,
      borderRadius: Radius.lg,
      backgroundColor: theme.arcadeCabinet,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 12,
    },
    teamHighlightCopy: { flex: 1, minWidth: 0 },
    streakCopy: { alignItems: 'flex-end', maxWidth: '42%' },
    highlightLabel: { color: theme.economy, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
    highlightValue: { color: theme.arcadeCtaText, fontSize: 13, fontWeight: '900', marginTop: 3 },
    scoreRow: {
      minHeight: 44,
      borderRadius: Radius.lg,
      backgroundColor: theme.arcadePanelAlt,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      paddingHorizontal: 12,
    },
    scoreLabel: { flex: 1, color: theme.muted, fontSize: 11, fontWeight: '800' },
    scoreValue: { color: theme.ink, fontSize: 17, fontWeight: '900', fontVariant: ['tabular-nums'] },
    cardStats: { flexDirection: 'row', gap: 8 },
    miniStat: {
      flex: 1,
      minHeight: 48,
      borderRadius: Radius.lg,
      backgroundColor: theme.arcadePanelAlt,
      justifyContent: 'center',
      paddingHorizontal: 10,
    },
    miniValue: { color: theme.ink, fontSize: 13, fontWeight: '900' },
    miniLabel: { color: theme.muted, fontSize: 10, fontWeight: '800', marginTop: 2 },
    queueButton: {
      minHeight: 44,
      borderRadius: Radius.lg,
      backgroundColor: theme.orange,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingHorizontal: 12,
    },
    queueButtonText: { color: theme.arcadeCtaText, fontSize: 14, fontWeight: '900' },
    legacyOpenButton: { backgroundColor: theme.arcadeCabinet },
    statePanel: {
      minHeight: 82,
      borderRadius: Radius.xl,
      borderWidth: 2,
      borderColor: theme.arcadeCabinetEdge,
      backgroundColor: theme.arcadePanel,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    stateText: { flex: 1, color: theme.muted, fontSize: 12, lineHeight: 17, fontWeight: '800' },
    retryButton: {
      minHeight: 44,
      minWidth: 76,
      borderRadius: Radius.lg,
      backgroundColor: theme.orange,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 10,
    },
    retryText: { color: theme.arcadeCtaText, fontSize: 12, fontWeight: '900' },
  })
}
