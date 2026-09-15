import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { FlashList, type ListRenderItem } from '@shopify/flash-list'
import { router, useLocalSearchParams } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { EntryCodeModal } from '@/components/match/EntryCodeModal'
import { LobbyColdStartCard } from '@/components/lobby/LobbyColdStartCard'
import { LobbyFriendsRail } from '@/components/lobby/LobbyFriendsRail'
import { LobbyHeroCard } from '@/components/lobby/LobbyHeroCard'
import { LobbyLiveRail } from '@/components/lobby/LobbyLiveRail'
import { LobbyPartyFeedCard } from '@/components/lobby/LobbyPartyFeedCard'
import { ArenaLobbyLaunchCard } from '@/components/lobby/ArenaLobbyLaunchCard'
import { ArenaDiscoverySection } from '@/components/lobby/ArenaDiscoverySection'
import { useScreenInsets } from '@/components/layout/useScreenInsets'
import { QuickMatchCard } from '@/components/home/QuickMatchCard'
import { OpenLobbyCard } from '@/components/match/OpenLobbyCard'
import { PressableScale } from '@/components/motion/PressableScale'
import { ActivityColor, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useAuth } from '@/hooks/useAuth'
import { useFriends } from '@/hooks/useFriends'
import { useSpectatableLiveMatches } from '@/hooks/useSpectate'
import { useMatchDiscovery } from '@/hooks/useMatchDiscovery'
import { useHomeProfile } from '@/hooks/useProfile'
import { useQuickMatch } from '@/hooks/useQuickMatch'
import { useDiscoverableParties, useMyParties, useRequestPartyJoin } from '@/hooks/useParty'
import { useI18n } from '@/hooks/useI18n'
import { useArenaEvents } from '@/hooks/useArenas'
import { useSportTheme } from '@/hooks/useAppTheme'
import { ACTIVITY_LABEL, MVP_ACTIVITIES, type Activity } from '@/lib/match/matchConfig'
import { isCompleteJoinCode, normalizeJoinCode } from '@/lib/match/joinCode'
import {
  normalizeMatchEntryCode,
  normalizeMatchEntrySource,
  type MatchEntrySource,
} from '@/lib/match/matchEntry'
import { guardedRouter } from '@/lib/navigation/guardedRouter'
import { isEdgeFunctionError } from '@/lib/supabase/edgeError'
import { partyDictionary } from '@/lib/i18n/dictionaries/party'
import { getPartyErrorMessage } from '@/lib/party/partyError'
import { buildLobbyFeed, type LobbyFeedItem } from '@/lib/lobbyFeed'
import { getArenaEventRoute } from '@/lib/arenas/arenaNavigation'
import type { ArenaActivity, ArenaEvent } from '@/types/arena'
import type { MatchLobby, Side } from '@/types/match'

type ActivityFilter = 'all' | Activity
type LobbyCategory = 'lobby' | 'arena'
type ArenaActivityFilter = 'all' | ArenaActivity

function normalizeActivityFilter(value: string | undefined): ActivityFilter {
  if (value && MVP_ACTIVITIES.includes(value as Activity)) return value as Activity
  return 'all'
}

function joinErrorReason(error: unknown): string {
  if (isEdgeFunctionError(error)) return error.code ?? `http_${error.status ?? 'unknown'}`
  if (error instanceof Error) return error.name || 'error'
  return 'unknown_error'
}

function showError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Something went wrong.'
  if (Platform.OS === 'web') {
    globalThis.alert(`Could not join lobby\n\n${message}`)
    return
  }
  Alert.alert('Could not join lobby', message, [{ text: 'Try again' }])
}

function isAlreadyJoinedError(error: unknown) {
  return error instanceof Error && error.message.toLowerCase().includes('already joined')
}

function navigateBackOrHome() {
  guardedRouter.replace('/(tabs)', { actionKey: 'lobbies:exit-home' })
}

export default function LobbiesScreen() {
  const params = useLocalSearchParams<{ activity?: string; joinCode?: string; code?: string; source?: string }>()
  const { user } = useAuth()
  const { track } = useAnalytics()
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { t, language } = useI18n(partyDictionary)
  const { paddingTop, paddingBottom } = useScreenInsets({
    edges: ['top', 'bottom'],
    topPad: Spacing.md,
    bottomPad: 120,
  })
  const {
    openMatchesQuery,
    codeLookupMutation,
    joinLobbyMutation,
    joinLobby,
    joinLobbyByCode,
  } = useMatchDiscovery({ enabled: !!user })
  const {
    isPending: codeLookupPending,
    mutate: lookupCode,
    reset: resetCodeLookup,
  } = codeLookupMutation
  const profileQuery = useHomeProfile(user?.id)
  const profile = profileQuery.data
  const friendsQuery = useFriends(!!user)
  const friends = friendsQuery.data ?? []
  const liveQuery = useSpectatableLiveMatches(!!user)
  const liveMatches = liveQuery.data ?? []
  const quickMatch = useQuickMatch()
  const myPartiesQuery = useMyParties({ enabled: !!user })
  const discoverablePartiesQuery = useDiscoverableParties({ enabled: !!user })
  const requestPartyJoinMutation = useRequestPartyJoin()
  const activePartySummary = useMemo(
    () => myPartiesQuery.data?.find((party) => party.status === 'forming') ?? null,
    [myPartiesQuery.data],
  )
  const initialJoinCode = useMemo(() => {
    return normalizeMatchEntryCode(params.joinCode ?? params.code)
  }, [params.code, params.joinCode])
  const initialEntrySource = useMemo(
    () => normalizeMatchEntrySource(params.source, initialJoinCode ? 'share_link' : 'manual_code'),
    [params.source, initialJoinCode],
  )
  const [joinCode, setJoinCode] = useState(initialJoinCode)
  const [entrySource, setEntrySource] = useState<MatchEntrySource>(initialEntrySource)
  const [codeOpen, setCodeOpen] = useState(!!initialJoinCode)
  const [lobbyCategory, setLobbyCategory] = useState<LobbyCategory>('lobby')
  const [arenaActivityFilter, setArenaActivityFilter] = useState<ArenaActivityFilter>('all')
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>(() => normalizeActivityFilter(params.activity))
  const [requestedPartyIds, setRequestedPartyIds] = useState<Set<string>>(() => new Set())
  const [joining, setJoining] = useState<{ lobbyId: string; side: Side } | null>(null)
  const [entryPrompt, setEntryPrompt] = useState<{
    lobby: MatchLobby
    side: Side
    via: 'open' | 'code'
    source: MatchEntrySource
  } | null>(null)
  const lastAutoLookupCodeRef = useRef('')
  const lastTrackedEntryRef = useRef('')
  const lastTrackedResolvedCodeRef = useRef('')
  const showingLobbies = lobbyCategory === 'lobby'
  const lobbyFeed = useMemo(
    () => buildLobbyFeed(openMatchesQuery.data ?? [], discoverablePartiesQuery.data ?? [], activityFilter),
    [activityFilter, discoverablePartiesQuery.data, openMatchesQuery.data],
  )
  const { arenasQuery } = useArenaEvents({ enabled: !!user && !showingLobbies })

  useEffect(() => {
    track({ name: 'lobbies_screen_viewed' })
  }, [track])

  useEffect(() => {
    setJoinCode(initialJoinCode)
    setEntrySource(initialEntrySource)
    if (initialJoinCode) setCodeOpen(true)
  }, [initialEntrySource, initialJoinCode])

  useEffect(() => {
    if (!initialJoinCode) return
    const key = `${initialJoinCode}:${initialEntrySource}`
    if (lastTrackedEntryRef.current === key) return
    lastTrackedEntryRef.current = key
    track({
      name: 'match_entry_opened',
      properties: { source: initialEntrySource, has_code: true },
    })
  }, [initialEntrySource, initialJoinCode, track])

  useEffect(() => {
    if (!isCompleteJoinCode(joinCode)) {
      if (lastAutoLookupCodeRef.current) {
        resetCodeLookup()
        lastAutoLookupCodeRef.current = ''
      }
      return
    }
    if (joinCode === lastAutoLookupCodeRef.current || codeLookupPending) return
    lastAutoLookupCodeRef.current = joinCode
    lookupCode(joinCode)
  }, [codeLookupPending, joinCode, lookupCode, resetCodeLookup])

  useEffect(() => {
    const lobby = codeLookupMutation.data
    if (!lobby || !isCompleteJoinCode(joinCode)) return
    const key = `${joinCode}:${lobby.id}:${entrySource}`
    if (lastTrackedResolvedCodeRef.current === key) return
    lastTrackedResolvedCodeRef.current = key
    track({
      name: 'match_join_code_resolved',
      properties: {
        source: entrySource,
        match_id: lobby.id,
        activity: lobby.activity_type,
        requires_entry_code: lobby.requires_entry_code,
      },
    })
  }, [codeLookupMutation.data, entrySource, joinCode, track])

  function goToLobby(lobby: MatchLobby) {
    joinLobbyMutation.reset()
    setEntryPrompt(null)
    guardedRouter.push(`/match/${lobby.id}`, { actionKey: `lobbies:lobby:${lobby.id}` })
  }

  async function handleJoinOpenLobby(lobby: MatchLobby, side: Side) {
    if (lobby.requires_entry_code) {
      setEntryPrompt({ lobby, side, via: 'open', source: 'open_lobby' })
      return
    }
    try {
      setJoining({ lobbyId: lobby.id, side })
      const result = await joinLobby(lobby, side)
      track({
        name: 'match_join_completed',
        properties: {
          source: 'open_lobby',
          match_id: result.matchId,
          entry_path: 'open_lobby',
          required_entry_code: false,
        },
      })
      guardedRouter.push(`/match/${result.matchId}`, { actionKey: `lobbies:join:${result.matchId}` })
    } catch (error) {
      if (isAlreadyJoinedError(error)) {
        goToLobby(lobby)
        return
      }
      track({
        name: 'join_match_failed',
        properties: {
          reason: joinErrorReason(error),
          source: 'open_lobby',
          match_id: lobby.id,
          entry_path: 'open_lobby',
          required_entry_code: false,
        },
      })
      showError(error)
    } finally {
      setJoining(null)
    }
  }

  async function handleJoinCodeLobby(lobby: MatchLobby, side: Side) {
    if (lobby.requires_entry_code) {
      setEntryPrompt({ lobby, side, via: 'code', source: entrySource })
      return
    }
    try {
      setJoining({ lobbyId: lobby.id, side })
      const result = await joinLobbyByCode(joinCode, lobby, side)
      track({
        name: 'match_join_completed',
        properties: {
          source: entrySource,
          match_id: result.matchId,
          entry_path: 'join_code',
          required_entry_code: false,
        },
      })
      setJoinCode('')
      guardedRouter.push(`/match/${result.matchId}`, { actionKey: `lobbies:join-code:${result.matchId}` })
    } catch (error) {
      if (isAlreadyJoinedError(error)) {
        setJoinCode('')
        goToLobby(lobby)
        return
      }
      track({
        name: 'join_match_failed',
        properties: {
          reason: joinErrorReason(error),
          source: entrySource,
          match_id: lobby.id,
          entry_path: 'join_code',
          required_entry_code: false,
        },
      })
      showError(error)
    } finally {
      setJoining(null)
    }
  }

  async function submitEntryCode(entryCode: string) {
    if (!entryPrompt) return
    const { lobby, side, source, via } = entryPrompt
    try {
      setJoining({ lobbyId: lobby.id, side })
      const result = via === 'code'
        ? await joinLobbyByCode(joinCode, lobby, side, entryCode)
        : await joinLobby(lobby, side, entryCode)
      track({
        name: 'match_join_completed',
        properties: {
          source,
          match_id: result.matchId,
          entry_path: via === 'code' ? 'join_code' : 'open_lobby',
          required_entry_code: true,
        },
      })
      if (via === 'code') setJoinCode('')
      setEntryPrompt(null)
      guardedRouter.push(`/match/${result.matchId}`, { actionKey: `lobbies:entry-code:${result.matchId}` })
    } catch (error) {
      if (isAlreadyJoinedError(error)) {
        if (via === 'code') setJoinCode('')
        goToLobby(lobby)
        return
      }
      track({
        name: 'join_match_failed',
        properties: {
          reason: joinErrorReason(error),
          source,
          match_id: lobby.id,
          entry_path: via === 'code' ? 'join_code' : 'open_lobby',
          required_entry_code: true,
        },
      })
      showError(error)
    } finally {
      setJoining(null)
    }
  }

  const hasCodeResult =
    codeLookupMutation.error != null ||
    codeLookupMutation.data != null ||
    (isCompleteJoinCode(joinCode) && !codeLookupMutation.isPending && codeLookupMutation.data === null)

  async function handleRequestPartyJoin(partyId: string) {
    try {
      await requestPartyJoinMutation.mutateAsync(partyId)
      setRequestedPartyIds((current) => {
        const next = new Set(current)
        next.add(partyId)
        return next
      })
    } catch (error) {
      Alert.alert(t('requestJoinError'), getPartyErrorMessage(error, 'join', language))
    }
  }

  const renderLobby: ListRenderItem<LobbyFeedItem> = ({ item }) => item.kind === 'match' ? (
    <OpenLobbyCard
      lobby={item.match}
      joiningSide={joining?.lobbyId === item.match.id ? joining.side : null}
      joinPending={joinLobbyMutation.isPending && joining?.lobbyId === item.match.id}
      onJoin={(side) => handleJoinOpenLobby(item.match, side)}
    />
  ) : (
    <LobbyPartyFeedCard
      party={item.party}
      requestPending={requestPartyJoinMutation.isPending && requestPartyJoinMutation.variables === item.party.id}
      requestSent={requestedPartyIds.has(item.party.id)}
      onPress={() => guardedRouter.push(`/party/${item.party.id}` as never, { actionKey: `lobbies:party:${item.party.id}` })}
      onRequestJoin={() => void handleRequestPartyJoin(item.party.id)}
    />
  )

  return (
    <>
      <FlashList
        style={styles.root}
        contentContainerStyle={[styles.container, { paddingTop, paddingBottom }]}
        data={showingLobbies ? lobbyFeed : []}
        keyExtractor={(item) => `${item.kind}:${item.id}`}
        renderItem={renderLobby}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
        ListHeaderComponent={
          <View style={styles.headerStack}>
            <View style={styles.header}>
              <PressableScale
                style={styles.backButton}
                onPress={navigateBackOrHome}
                accessibilityLabel="Back"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons name="chevron-left" size={24} color={theme.chalk} />
              </PressableScale>
              <View style={styles.headerCopy}>
                <Text style={styles.eyebrow}>OPEN ARENAS</Text>
                <Text style={styles.title}>Lobby</Text>
              </View>
              <PressableScale
                style={[styles.headerAction, codeOpen && styles.headerActionActive]}
                onPress={() => setCodeOpen((value) => !value)}
                accessibilityLabel="Enter join code"
              >
                <MaterialCommunityIcons name="key-variant" size={18} color={codeOpen ? theme.trust : theme.ink} />
              </PressableScale>
            </View>

            <LobbyHeroCard
              displayName={profile?.display_name ?? null}
              spendablePoints={profile?.spendable_points ?? null}
              loading={profileQuery.isLoading}
              party={activePartySummary}
              partyLoading={myPartiesQuery.isPending}
              partyError={myPartiesQuery.error != null}
              onCreateParty={() => guardedRouter.push('/party/new', { actionKey: 'lobbies:create-party' })}
              onOpenParty={(partyId) => guardedRouter.push(`/party/${partyId}` as never, { actionKey: 'lobbies:party-details' })}
              onRetryParty={() => void myPartiesQuery.refetch()}
            />

            {showingLobbies && (activityFilter === 'all' || activityFilter === 'basketball') && (
              <QuickMatchCard
                variant="compact"
                label={quickMatch.presetLabel}
                busy={quickMatch.busy}
                onPress={quickMatch.createNow}
                onLongPress={quickMatch.openCustomize}
              />
            )}

            {liveMatches.length > 0 && (
              <LobbyLiveRail
                matches={liveMatches}
                onWatch={(matchId) => guardedRouter.push(`/watch/${matchId}`, { actionKey: `lobbies:watch:${matchId}` })}
              />
            )}

            {friends.length > 0 && (
              <LobbyFriendsRail
                friends={friends}
                onChallenge={(friend) => guardedRouter.push(
                  { pathname: '/match/new', params: friend.handle ? { invite: friend.handle, kind: 'challenge' } : {} },
                  { actionKey: `lobbies:challenge:${friend.friendId}` },
                )}
                onAddFriend={() => guardedRouter.push('/friends', { actionKey: 'lobbies:add-friend' })}
              />
            )}

            <View style={styles.categorySwitch}>
              <CategoryPill
                icon="account-group-outline"
                label="Lobby"
                active={lobbyCategory === 'lobby'}
                onPress={() => setLobbyCategory('lobby')}
              />
              <CategoryPill
                icon="stadium-variant"
                label="Arena"
                active={lobbyCategory === 'arena'}
                onPress={() => setLobbyCategory('arena')}
              />
            </View>

            {showingLobbies && codeOpen && (
              <View style={styles.codePanel}>
                <View style={styles.joinCodeBar}>
                  <MaterialCommunityIcons name="key-variant" size={14} color={theme.trust} />
                  <TextInput
                    style={styles.joinCodeInput}
                    value={joinCode}
                    onChangeText={(text) => {
                      setEntrySource('manual_code')
                      setJoinCode(normalizeJoinCode(text))
                    }}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    placeholder="JOIN CODE"
                    placeholderTextColor={theme.mutedSoft}
                    maxLength={8}
                    autoFocus={!initialJoinCode}
                  />
                  {codeLookupPending && <ActivityIndicator size="small" color={theme.trust} />}
                </View>
                <Text style={styles.joinCodeHelp}>
                  Use an 8-character JOIN CODE from a link, QR, or event day. If the lobby requires a 6-digit entry code, Rally will ask next.
                </Text>
                {hasCodeResult && (
                  <View style={styles.codeResultInline}>
                    {codeLookupMutation.error || (isCompleteJoinCode(joinCode) && !codeLookupPending && codeLookupMutation.data === null) ? (
                      <Text style={styles.codeStatusError}>
                        {codeLookupMutation.error instanceof Error
                          ? codeLookupMutation.error.message
                          : 'No lobby matches this code.'}
                      </Text>
                    ) : codeLookupMutation.data ? (
                      <OpenLobbyCard
                        title="CODE MATCH"
                        lobby={codeLookupMutation.data}
                        joiningSide={joining?.lobbyId === codeLookupMutation.data.id ? joining.side : null}
                        joinPending={joinLobbyMutation.isPending && joining?.lobbyId === codeLookupMutation.data.id}
                        onJoin={(side) => handleJoinCodeLobby(codeLookupMutation.data!, side)}
                      />
                    ) : null}
                  </View>
                )}
              </View>
            )}

            {showingLobbies ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
              >
                <FilterPill
                  label="All"
                  active={activityFilter === 'all'}
                  color={theme.orange}
                  onPress={() => setActivityFilter('all')}
                />
                {MVP_ACTIVITIES.map((activity) => (
                  <FilterPill
                    key={activity}
                    label={ACTIVITY_LABEL[activity]}
                    active={activityFilter === activity}
                    color={ActivityColor[activity] ?? theme.risk}
                    onPress={() => setActivityFilter(activity)}
                  />
                ))}
              </ScrollView>
            ) : (
              <ArenaCategoryPanel
                arenas={arenasQuery.data ?? []}
                activeFilter={arenaActivityFilter}
                loading={arenasQuery.isPending}
                error={arenasQuery.error != null}
                onFilterChange={setArenaActivityFilter}
                onOpenArena={(arena) => router.push(getArenaEventRoute(arena) as never)}
                onRetry={() => void arenasQuery.refetch()}
              />
            )}

            {showingLobbies && openMatchesQuery.isPending && (
              <View style={styles.statePanel}>
                <ActivityIndicator color={theme.trust} />
                <Text style={styles.stateText}>Finding open lobbies...</Text>
              </View>
            )}
            {showingLobbies && openMatchesQuery.error && (
              <View style={styles.statePanel}>
                <MaterialCommunityIcons name="alert-circle-outline" size={20} color={theme.risk} />
                <Text style={styles.stateText}>
                  We could not load open lobbies. Check your connection and try again.
                </Text>
              </View>
            )}
            {showingLobbies && discoverablePartiesQuery.isPending && (
              <View style={styles.statePanel}>
                <ActivityIndicator color={theme.orange} />
                <Text style={styles.stateText}>Finding open Parties...</Text>
              </View>
            )}
            {showingLobbies && discoverablePartiesQuery.error && (
              <View style={styles.statePanel}>
                <MaterialCommunityIcons name="account-group-outline" size={20} color={theme.risk} />
                <Text style={styles.stateText}>We could not load discoverable Parties.</Text>
              </View>
            )}
            {showingLobbies && !openMatchesQuery.isPending && !discoverablePartiesQuery.isPending && !openMatchesQuery.error && !discoverablePartiesQuery.error && lobbyFeed.length > 0 && (
              <View style={styles.sectionLabelRow}>
                <View style={styles.liveDot} />
                <Text style={styles.sectionLabel}>HAPPENING NOW</Text>
              </View>
            )}
            {showingLobbies && !openMatchesQuery.isPending && !discoverablePartiesQuery.isPending && !openMatchesQuery.error && !discoverablePartiesQuery.error && lobbyFeed.length === 0 && (
              <LobbyColdStartCard
                onCreate={() => guardedRouter.push('/match/new', { actionKey: 'lobbies:coldstart-create' })}
              />
            )}
          </View>
        }
        {...({ delayContentTouches: false } as object)}
      />

      <EntryCodeModal
        visible={!!entryPrompt}
        pending={joinLobbyMutation.isPending}
        errorMessage={joinLobbyMutation.error instanceof Error ? joinLobbyMutation.error.message : undefined}
        onSubmit={submitEntryCode}
        onCancel={() => setEntryPrompt(null)}
      />
    </>
  )
}

function CategoryPill({
  icon,
  label,
  active,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap
  label: string
  active: boolean
  onPress: () => void
}) {
  const theme = useSportTheme()
  const styles = createStyles(theme)

  return (
    <PressableScale
      style={[styles.categoryPill, active && styles.categoryPillActive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`Show ${label} category`}
    >
      <MaterialCommunityIcons
        name={icon}
        size={17}
        color={active ? theme.arcadeCtaText : theme.ink}
      />
      <Text style={[styles.categoryText, active && styles.categoryTextActive]}>{label}</Text>
    </PressableScale>
  )
}

function ArenaCategoryPanel({
  arenas,
  activeFilter,
  loading,
  error,
  onFilterChange,
  onOpenArena,
  onRetry,
}: {
  arenas: ArenaEvent[]
  activeFilter: ArenaActivityFilter
  loading: boolean
  error: boolean
  onFilterChange: (filter: ArenaActivityFilter) => void
  onOpenArena: (arena: ArenaEvent) => void
  onRetry: () => void
}) {
  const { t } = useI18n(partyDictionary)

  return (
    <ArenaDiscoverySection
      arenas={arenas}
      activeFilter={activeFilter}
      onFilterChange={onFilterChange}
      onOpenArena={onOpenArena}
      loading={loading}
      error={error}
      onRetry={onRetry}
      launchCard={(
        <ArenaLobbyLaunchCard
          title={t('arenaTitle')}
          description={t('arenaDescription')}
          createLabel={t('createArena')}
          searchLabel={t('searchArena')}
          onCreate={() => router.push('/arena-session/new' as never)}
          onSearch={() => router.push('/arenas' as never)}
        />
      )}
    />
  )
}

function FilterPill({
  label,
  active,
  color,
  onPress,
}: {
  label: string
  active: boolean
  color: string
  onPress: () => void
}) {
  const theme = useSportTheme()
  const styles = createStyles(theme)

  return (
    <PressableScale
      style={[styles.filterPill, active && styles.filterPillActive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`Show ${label} lobbies`}
    >
      <Text style={[styles.filterText, active ? styles.filterTextActive : { color }]}>{label}</Text>
    </PressableScale>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.arenaPage },
    container: { padding: 20 },
    headerStack: { gap: 14, paddingBottom: Spacing.lg },
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
    eyebrow: {
      color: theme.trust,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1.1,
    },
    title: {
      color: theme.ink,
      fontSize: 28,
      lineHeight: 32,
      fontWeight: '900',
      letterSpacing: 0,
    },
    subtitle: {
      color: theme.muted,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: '800',
      marginTop: 2,
    },
    headerAction: {
      width: 42,
      height: 42,
      borderRadius: Radius.lg,
      borderWidth: 1.5,
      borderColor: theme.arcadeCabinetEdge,
      backgroundColor: theme.arcadePanelAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerActionActive: {
      borderColor: theme.trust,
      backgroundColor: theme.greenSoft,
    },
    codePanel: {
      borderRadius: Radius.xxl,
      borderWidth: 2,
      borderColor: theme.arcadeCabinetEdge,
      backgroundColor: 'rgba(255, 244, 236, 0.96)',
      padding: 14,
      gap: 10,
    },
    joinCodeBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: Radius.xl,
      borderWidth: 2,
      borderColor: theme.arcadeCabinetEdge,
      backgroundColor: theme.arcadePanel,
    },
    joinCodeInput: {
      flex: 1,
      fontSize: 13,
      color: theme.ink,
      fontWeight: '900',
      letterSpacing: 2,
      padding: 0,
    },
    joinCodeHelp: {
      color: theme.muted,
      fontSize: 11,
      lineHeight: 16,
      fontWeight: '800',
    },
    codeResultInline: { gap: Spacing.sm },
    codeStatusError: { color: theme.risk, fontSize: 12, fontWeight: '800' },
    categorySwitch: {
      minHeight: 48,
      flexDirection: 'row',
      gap: 8,
      padding: 5,
      borderRadius: Radius.xl,
      borderWidth: 2,
      borderColor: theme.arcadeCabinetEdge,
      backgroundColor: theme.arcadePanel,
    },
    categoryPill: {
      flex: 1,
      minWidth: 0,
      borderRadius: Radius.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingVertical: 10,
      paddingHorizontal: 10,
      backgroundColor: theme.arcadePanelAlt,
    },
    categoryPillActive: {
      backgroundColor: theme.orange,
    },
    categoryText: {
      color: theme.ink,
      fontSize: 12,
      lineHeight: 15,
      fontWeight: '900',
      letterSpacing: 0,
    },
    categoryTextActive: { color: theme.arcadeCtaText },
    filterRow: { flexDirection: 'row', gap: 8, paddingRight: 2 },
    sectionLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 2,
    },
    liveDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: theme.orange,
    },
    sectionLabel: {
      color: theme.muted,
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 1.2,
    },
    filterPill: {
      borderWidth: 1,
      borderColor: theme.lineStrong,
      borderRadius: Radius.pill,
      paddingVertical: 8,
      paddingHorizontal: 13,
      backgroundColor: theme.arcadePanel,
    },
    filterPillActive: {
      borderColor: theme.orange,
      backgroundColor: theme.orange,
    },
    filterText: {
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 0.2,
    },
    filterTextActive: { color: theme.arcadeCtaText },
    statePanel: {
      minHeight: 76,
      borderRadius: Radius.xl,
      borderWidth: 2,
      borderColor: theme.arcadeCabinetEdge,
      backgroundColor: theme.arcadePanel,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    stateText: {
      flex: 1,
      color: theme.muted,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: '800',
    },
    emptyPanel: {
      minHeight: 82,
      borderRadius: Radius.xl,
      borderWidth: 2,
      borderColor: theme.arcadeCabinetEdge,
      backgroundColor: theme.arcadePanel,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    emptyCopy: { flex: 1, minWidth: 0, gap: 2 },
    emptyTitle: { color: theme.ink, fontSize: 14, fontWeight: '900' },
    emptyText: { color: theme.muted, fontSize: 12, lineHeight: 17, fontWeight: '800' },
  })
}
