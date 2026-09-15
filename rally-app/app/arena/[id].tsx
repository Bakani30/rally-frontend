import { useState } from 'react'
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'

import { PressableScale } from '@/components/motion/PressableScale'
import { useScreenInsets } from '@/components/layout/useScreenInsets'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useArenaEvent } from '@/hooks/useArenas'
import { useAuth } from '@/hooks/useAuth'
import { useSportTheme } from '@/hooks/useAppTheme'
import {
  findMyArenaTeam,
  formatArenaTimer,
  getActiveArenaRound,
  getArenaChampion,
  getArenaQueue,
  getArenaRounds,
  getArenaStandings,
  getRoundStakeForTeam,
  getTeamReadyCount,
} from '@/lib/arenas/arenaRules'
import { getLegacyArenaCapabilities } from '@/lib/arenas/arenaLegacyPresentation'
import type { ArenaEvent, ArenaRound, ArenaTeam, ArenaUser } from '@/types/arena'

type ArenaTab = 'queue' | 'standings' | 'results' | 'rules'

export default function ArenaDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>()
  const arenaId = typeof params.id === 'string' ? params.id : undefined
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { paddingTop, paddingBottom } = useScreenInsets({
    edges: ['top', 'bottom'],
    topPad: Spacing.md,
    bottomPad: 120,
  })
  const { user } = useAuth()
  const [tab, setTab] = useState<ArenaTab>('queue')
  const { arenaQuery } = useArenaEvent(arenaId, { enabled: !!user })

  const arena = arenaQuery.data
  const activeRound = getActiveArenaRound(arena)
  const champion = getArenaChampion(arena)
  const queue = getArenaQueue(arena)
  const standings = getArenaStandings(arena)
  const rounds = getArenaRounds(arena)
  const myTeam = findMyArenaTeam(arena, user?.id)
  const myStake = getRoundStakeForTeam(activeRound, myTeam)
  const legacyCapabilities = getLegacyArenaCapabilities()
  const showLegacyReadOnlyBadge = !legacyCapabilities.canCreateTeam
    && !legacyCapabilities.canJoinRefereePool
    && !legacyCapabilities.canAdvanceQueue
    && !legacyCapabilities.canSubmitResult

  if (!arenaId) {
    return <StateScreen text="Arena id is missing." danger />
  }

  if (arenaQuery.isPending) {
    return <StateScreen text="Loading Arena..." />
  }

  if (arenaQuery.error || !arena) {
    return <StateScreen text="Arena could not load." danger />
  }

  return (
    <>
      <ScrollView
        style={styles.root}
        contentContainerStyle={[styles.container, { paddingTop, paddingBottom }]}
      >
        <View style={styles.header}>
          <PressableScale style={styles.backButton} onPress={() => router.back()} accessibilityLabel="Back">
            <MaterialCommunityIcons name="chevron-left" size={24} color={theme.arcadeCtaText} />
          </PressableScale>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>{arena.activity_type.toUpperCase()} ARENA</Text>
            <Text style={styles.title} numberOfLines={2}>{arena.title}</Text>
            {showLegacyReadOnlyBadge ? <Text style={styles.legacyBadge}>LEGACY · ดูได้เท่านั้น</Text> : null}
            <Text style={styles.subtitle}>
              {arena.target_score} target · {formatArenaTimer(arena.time_limit_seconds)} · max {arena.max_streak} streak
            </Text>
          </View>
        </View>

        <View style={styles.scoreboard}>
          <LaneCard
            label="Champion"
            team={champion}
            empty="Open lane"
            accent={theme.economy}
            meta={arena.current_champion_streak ? `${arena.current_champion_streak} streak` : 'base stake'}
          />
          <View style={styles.versusPill}>
            <Text style={styles.versusText}>VS</Text>
          </View>
          <LaneCard
            label="On deck"
            team={activeRound ? teamById(arena, activeRound.challenger_team_id) : queue[0] ?? null}
            empty="Queue waiting"
            accent={theme.orange}
            meta={activeRound ? `${activeRound.challenger_stake_per_player} RP/player` : `${queue.length} queued`}
          />
        </View>

        {activeRound ? (
          <RoundPanel
            arena={arena}
            round={activeRound}
            myStake={myStake}
            onOpenMatch={() => router.push(`/match/${activeRound.match_id}` as never)}
          />
        ) : (
          <View style={styles.noticePanel}>
            <MaterialCommunityIcons name="timer-sand" size={20} color={theme.orange} />
            <Text style={styles.noticeText}>No active round.</Text>
          </View>
        )}

        <View style={styles.tabs}>
          {(['queue', 'standings', 'results', 'rules'] as ArenaTab[]).map((item) => (
            <PressableScale
              key={item}
              style={[styles.tabButton, tab === item && styles.tabButtonActive]}
              onPress={() => setTab(item)}
            >
              <Text style={[styles.tabText, tab === item && styles.tabTextActive]}>{item}</Text>
            </PressableScale>
          ))}
        </View>

        {tab === 'queue' ? <QueueTab arena={arena} teams={queue} /> : null}
        {tab === 'standings' ? <StandingsTab teams={standings} /> : null}
        {tab === 'results' ? <ResultsTab arena={arena} rounds={rounds} /> : null}
        {tab === 'rules' ? <RulesTab arena={arena} /> : null}
      </ScrollView>

    </>
  )
}

function LaneCard({ label, team, empty, accent, meta }: { label: string; team: ArenaTeam | null; empty: string; accent: string; meta: string }) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  return (
    <View style={styles.laneCard}>
      <Text style={[styles.laneLabel, { color: accent }]}>{label}</Text>
      <Text style={styles.laneTitle} numberOfLines={1}>{team?.name ?? empty}</Text>
      <Text style={styles.laneMeta} numberOfLines={1}>{meta}</Text>
    </View>
  )
}

function RoundPanel({ arena, round, myStake, onOpenMatch }: { arena: ArenaEvent; round: ArenaRound; myStake: number | null; onOpenMatch: () => void }) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const champion = teamById(arena, round.champion_team_id)
  const challenger = teamById(arena, round.challenger_team_id)
  const referee = round.referee ?? arena.arena_referees?.find((row) => row.user_id === round.referee_user_id)?.users ?? null
  return (
    <View style={styles.roundPanel}>
      <View style={styles.roundTop}>
        <Text style={styles.roundStatus}>{round.status.replace('_', ' ')}</Text>
        <PressableScale style={styles.matchButton} onPress={onOpenMatch}>
          <MaterialCommunityIcons name="open-in-new" size={14} color={theme.arcadeCtaText} />
          <Text style={styles.matchButtonText}>Match</Text>
        </PressableScale>
      </View>
      <View style={styles.roundTeams}>
        <Text style={styles.roundTeam} numberOfLines={1}>{champion?.name ?? 'Champion'}</Text>
        <Text style={styles.roundScore}>
          {round.champion_score ?? '-'}:{round.challenger_score ?? '-'}
        </Text>
        <Text style={styles.roundTeam} numberOfLines={1}>{challenger?.name ?? 'Challenger'}</Text>
      </View>
      <Text style={styles.roundMeta}>
        Champion {round.champion_stake_per_player} RP/player · Challenger {round.challenger_stake_per_player} RP/player
        {myStake != null ? ` · Your lock ${myStake} RP` : ''}
      </Text>
      <Text style={styles.roundReferee}>
        Referee: {round.referee_user_id ? formatArenaUser(referee, 'Assigned') : 'No referee assigned'}
      </Text>
    </View>
  )
}

function QueueTab({ arena, teams }: { arena: ArenaEvent; teams: ArenaTeam[] }) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  if (teams.length === 0) return <EmptyTab text="Queue is empty." />
  return (
    <View style={styles.tabPanel}>
      {teams.map((team, index) => (
        <TeamRow key={team.id} rank={index + 1} team={team} required={arena.team_size_per_side} />
      ))}
    </View>
  )
}

function StandingsTab({ teams }: { teams: ArenaTeam[] }) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  if (teams.length === 0) return <EmptyTab text="No teams yet." />
  return (
    <View style={styles.tabPanel}>
      {teams.map((team, index) => (
        <StandingRow key={team.id} rank={index + 1} team={team} />
      ))}
    </View>
  )
}

function ResultsTab({ arena, rounds }: { arena: ArenaEvent; rounds: ArenaRound[] }) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const settled = rounds.filter((round) => ['settled', 'disputed', 'cancelled', 'result_pending'].includes(round.status))
  if (settled.length === 0) return <EmptyTab text="No result feed yet." />
  return (
    <View style={styles.tabPanel}>
      {settled.map((round) => (
        <View key={round.id} style={styles.resultRow}>
          <Text style={styles.resultTitle} numberOfLines={1}>
            {teamById(arena, round.champion_team_id)?.name ?? 'Champion'} vs {teamById(arena, round.challenger_team_id)?.name ?? 'Challenger'}
          </Text>
          <Text style={styles.resultScore}>{round.champion_score ?? '-'}:{round.challenger_score ?? '-'}</Text>
          <Text style={styles.resultMeta}>{round.status.replace('_', ' ')}</Text>
        </View>
      ))}
    </View>
  )
}

function RulesTab({ arena }: { arena: ArenaEvent }) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  return (
    <View style={styles.tabPanel}>
      <View style={styles.ruleRow}><Text style={styles.ruleKey}>Target</Text><Text style={styles.ruleText}>{arena.target_score}</Text></View>
      <View style={styles.ruleRow}><Text style={styles.ruleKey}>Limit</Text><Text style={styles.ruleText}>{formatArenaTimer(arena.time_limit_seconds)}</Text></View>
      <View style={styles.ruleRow}><Text style={styles.ruleKey}>Stake</Text><Text style={styles.ruleText}>{arena.base_stake_per_player} + streak × {arena.streak_increment_per_player}</Text></View>
      <View style={styles.ruleRow}><Text style={styles.ruleKey}>Retire</Text><Text style={styles.ruleText}>{arena.max_streak} wins</Text></View>
      <Text style={styles.rulesCopy}>{arena.rule_text}</Text>
    </View>
  )
}

function TeamRow({ rank, team, required }: { rank: number; team: ArenaTeam; required: number }) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const ready = getTeamReadyCount(team)
  return (
    <View style={styles.teamRow}>
      <Text style={styles.rankText}>{rank}</Text>
      <View style={styles.teamCopy}>
        <Text style={styles.teamName} numberOfLines={1}>{team.name}</Text>
        <Text style={styles.teamMeta}>{ready.ready}/{required} ready · {team.status}</Text>
      </View>
      <Text style={styles.teamStreak}>{team.current_streak}</Text>
    </View>
  )
}

function StandingRow({ rank, team }: { rank: number; team: ArenaTeam }) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  return (
    <View style={styles.teamRow}>
      <Text style={styles.rankText}>{rank}</Text>
      <View style={styles.teamCopy}>
        <Text style={styles.teamName} numberOfLines={1}>{team.name}</Text>
        <Text style={styles.teamMeta}>W{team.wins} L{team.losses} · best {team.best_streak}</Text>
      </View>
      <Text style={styles.teamStreak}>{team.points_for - team.points_against}</Text>
    </View>
  )
}

function EmptyTab({ text }: { text: string }) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  return (
    <View style={styles.emptyTab}>
      <MaterialCommunityIcons name="stadium-variant" size={22} color={theme.orange} />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  )
}

function StateScreen({ text, danger }: { text: string; danger?: boolean }) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  return (
    <View style={styles.stateScreen}>
      <MaterialCommunityIcons name={danger ? 'alert-circle-outline' : 'stadium'} size={28} color={danger ? theme.risk : theme.orange} />
      <Text style={styles.stateText}>{text}</Text>
    </View>
  )
}

function formatArenaUser(user: ArenaUser | null | undefined, fallback: string): string {
  return user?.display_name || user?.handle || fallback
}

function teamById(arena: ArenaEvent, teamId: string | null): ArenaTeam | null {
  if (!teamId) return null
  return arena.arena_teams?.find((team) => team.id === teamId) ?? null
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
      width: 42,
      height: 42,
      borderRadius: Radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.arcadeCabinet,
    },
    headerCopy: { flex: 1, minWidth: 0 },
    eyebrow: { color: theme.trust, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    title: { color: theme.ink, fontSize: 28, lineHeight: 32, fontWeight: '900', letterSpacing: 0 },
    legacyBadge: { color: theme.muted, fontSize: 10, fontWeight: '900', letterSpacing: 0.4, marginTop: 2 },
    subtitle: { color: theme.muted, fontSize: 12, lineHeight: 17, fontWeight: '800', marginTop: 2 },
    scoreboard: {
      borderRadius: Radius.xxl,
      borderWidth: 2,
      borderColor: theme.arcadeCabinetEdge,
      backgroundColor: theme.arcadeCabinet,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: 8,
    },
    laneCard: {
      flex: 1,
      minHeight: 92,
      borderRadius: Radius.xl,
      backgroundColor: theme.arcadePanel,
      padding: 12,
      justifyContent: 'center',
    },
    laneLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    laneTitle: { color: theme.ink, fontSize: 17, fontWeight: '900', marginTop: 4 },
    laneMeta: { color: theme.muted, fontSize: 11, fontWeight: '800', marginTop: 4 },
    versusPill: {
      alignSelf: 'center',
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: theme.orange,
      alignItems: 'center',
      justifyContent: 'center',
    },
    versusText: { color: theme.arcadeCtaText, fontSize: 11, fontWeight: '900' },
    roundPanel: {
      borderRadius: Radius.xl,
      borderWidth: 2,
      borderColor: theme.arcadeCabinetEdge,
      backgroundColor: theme.arcadePanel,
      padding: 14,
      gap: 12,
    },
    roundTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    roundStatus: { color: theme.trust, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
    matchButton: {
      minHeight: 32,
      borderRadius: Radius.md,
      backgroundColor: theme.arcadeCabinet,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
    },
    matchButtonText: { color: theme.arcadeCtaText, fontSize: 11, fontWeight: '900' },
    roundTeams: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    roundTeam: { flex: 1, color: theme.ink, fontSize: 14, fontWeight: '900' },
    roundScore: { color: theme.orange, fontSize: 22, fontWeight: '900' },
    roundMeta: { color: theme.muted, fontSize: 11, lineHeight: 16, fontWeight: '800' },
    roundReferee: { color: theme.trust, fontSize: 11, lineHeight: 16, fontWeight: '900' },
    noticePanel: {
      minHeight: 58,
      borderRadius: Radius.xl,
      borderWidth: 2,
      borderColor: theme.arcadeCabinetEdge,
      backgroundColor: theme.arcadePanel,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    noticeText: { color: theme.muted, fontSize: 12, fontWeight: '800' },
    tabs: {
      flexDirection: 'row',
      borderRadius: Radius.xl,
      backgroundColor: theme.arcadeCabinet,
      padding: 5,
      gap: 5,
    },
    tabButton: {
      flex: 1,
      minHeight: 36,
      borderRadius: Radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabButtonActive: { backgroundColor: theme.arcadePanel },
    tabText: { color: theme.arcadeCtaText, fontSize: 11, fontWeight: '900', textTransform: 'capitalize' },
    tabTextActive: { color: theme.ink },
    tabPanel: {
      borderRadius: Radius.xl,
      borderWidth: 2,
      borderColor: theme.arcadeCabinetEdge,
      backgroundColor: theme.arcadePanel,
      padding: 10,
      gap: 8,
    },
    teamRow: {
      minHeight: 54,
      borderRadius: Radius.lg,
      backgroundColor: theme.arcadePanelAlt,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 12,
    },
    rankText: { width: 24, color: theme.orange, fontSize: 15, fontWeight: '900' },
    teamCopy: { flex: 1, minWidth: 0 },
    teamName: { color: theme.ink, fontSize: 14, fontWeight: '900' },
    teamMeta: { color: theme.muted, fontSize: 11, fontWeight: '800', marginTop: 2 },
    teamStreak: { color: theme.ink, fontSize: 16, fontWeight: '900' },
    resultRow: {
      minHeight: 58,
      borderRadius: Radius.lg,
      backgroundColor: theme.arcadePanelAlt,
      padding: 12,
      gap: 4,
    },
    resultTitle: { color: theme.ink, fontSize: 13, fontWeight: '900' },
    resultScore: { color: theme.orange, fontSize: 18, fontWeight: '900' },
    resultMeta: { color: theme.muted, fontSize: 11, fontWeight: '800' },
    ruleRow: {
      minHeight: 42,
      borderRadius: Radius.lg,
      backgroundColor: theme.arcadePanelAlt,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
    },
    ruleKey: { color: theme.muted, fontSize: 11, fontWeight: '900' },
    ruleText: { color: theme.ink, fontSize: 13, fontWeight: '900' },
    rulesCopy: { color: theme.muted, fontSize: 12, lineHeight: 18, fontWeight: '800', padding: 4 },
    emptyTab: {
      minHeight: 84,
      borderRadius: Radius.xl,
      borderWidth: 2,
      borderColor: theme.arcadeCabinetEdge,
      backgroundColor: theme.arcadePanel,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    emptyText: { color: theme.muted, fontSize: 12, fontWeight: '800' },
    stateScreen: {
      flex: 1,
      backgroundColor: theme.arenaBg,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      gap: 10,
    },
    stateText: { color: theme.arcadeCtaText, fontSize: 14, fontWeight: '900', textAlign: 'center' },
  })
}
