import type { ReactElement, ReactNode } from 'react'
import { ActivityIndicator, SectionList, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { HistoryCategoryTabs } from '@/components/history/HistoryCategoryTabs'
import { MatchHistoryImpactError } from '@/components/history/MatchHistoryImpactError'
import { PressableScale } from '@/components/motion/PressableScale'
import { useScreenInsets } from '@/components/layout/useScreenInsets'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import type { MatchesScreenState } from '@/lib/history/matchesScreenState'
import type { FeedCategory } from '@/lib/history/unifiedFeed'

export type HistoryRowItem =
  | { rowKind: 'raw-match'; match: { id: string } }
  | { rowKind: 'feed'; feedItem: { key: string } }

export type MatchesViewSection = {
  key: 'pending' | 'live' | 'history'
  title: string
  emptyIcon: keyof typeof MaterialCommunityIcons.glyphMap
  emptyText: string
  data: HistoryRowItem[]
}

export type MatchesViewProps = {
  screenState: MatchesScreenState
  sections: MatchesViewSection[]
  category: FeedCategory
  onCategoryChange: (category: FeedCategory) => void
  pendingCount: number
  liveCount: number
  historyCount: number
  labels: {
    title: string
    subtitle: string
    loadMatchesFailed: string
    genericError: string
    historyLoadFailed: string
    findFriends: string
    friendsDashboard: string
    friendsDashboardPending: string
  }
  matchesError: unknown
  historyError: unknown
  historyPending: boolean
  impactsError: boolean
  impactsFetching: boolean
  onRetryImpacts: () => void
  hasIncomingFriendRequests: boolean
  renderFriendsAction: (content: ReactNode) => ReactNode
  renderRow: (row: HistoryRowItem) => ReactElement | null
  sectionEmptyText: (section: MatchesViewSection) => string
  renderBackControl: (style: StyleProp<ViewStyle>) => ReactNode
  syncStatusContent: ReactNode
  contentContainerStyle?: StyleProp<ViewStyle>
}

export function MatchesView({
  screenState,
  sections,
  category,
  onCategoryChange,
  pendingCount,
  liveCount,
  historyCount,
  labels,
  matchesError,
  historyError,
  historyPending,
  impactsError,
  impactsFetching,
  onRetryImpacts,
  hasIncomingFriendRequests,
  renderFriendsAction,
  renderRow,
  sectionEmptyText,
  renderBackControl,
  syncStatusContent,
  contentContainerStyle,
}: MatchesViewProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const insets = useSafeAreaInsets()
  const { paddingTop, paddingBottom } = useScreenInsets({ edges: ['top'], bottomPad: 48 })

  if (screenState === 'loading') return <ActivityIndicator style={styles.loader} color={theme.chalk} />
  if (matchesError) {
    return (
      <View style={styles.empty}>
        {renderBackControl([styles.floatingBack, { top: insets.top + Spacing.sm }])}
        <MaterialCommunityIcons name="alert-circle-outline" size={32} color={theme.red} />
        <Text style={styles.emptyTitle}>{labels.loadMatchesFailed}</Text>
        <Text style={styles.emptyHint}>
          {matchesError instanceof Error ? matchesError.message : labels.genericError}
        </Text>
      </View>
    )
  }

  return (
    <SectionList<HistoryRowItem, MatchesViewSection>
      style={styles.root}
      contentContainerStyle={[styles.container, { paddingTop, paddingBottom }, contentContainerStyle]}
      sections={sections}
      keyExtractor={(row) => (row.rowKind === 'raw-match' ? `raw:${row.match.id}` : row.feedItem.key)}
      renderItem={({ item }) => renderRow(item)}
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={
        <View style={styles.header}>
          {renderBackControl(styles.headerBack)}
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{labels.title}</Text>
              <Text style={styles.subtitle}>{labels.subtitle}</Text>
            </View>
            {renderFriendsAction(
              <PressableScale
                style={styles.searchBtn}
                accessibilityRole="button"
                accessibilityLabel={hasIncomingFriendRequests ? labels.friendsDashboardPending : labels.friendsDashboard}
              >
                <MaterialCommunityIcons name="account-multiple-outline" size={18} color={theme.ink} />
                <Text style={styles.searchBtnText}>{labels.findFriends}</Text>
                {hasIncomingFriendRequests && <View style={styles.friendRequestDot} />}
              </PressableScale>,
            )}
          </View>
          <View style={styles.categoryTabs}>
            <HistoryCategoryTabs category={category} onChange={onCategoryChange} />
          </View>
          {syncStatusContent ? <View style={styles.headerSyncStatus}>{syncStatusContent}</View> : null}
          {impactsError ? (
            <View style={styles.impactError}>
              <MatchHistoryImpactError retrying={impactsFetching} onRetry={onRetryImpacts} />
            </View>
          ) : null}
        </View>
      }
      renderSectionHeader={({ section }) =>
        section.key === 'history' ? (
          <View style={styles.historyHeader}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>
              <View style={styles.countPill}>
                <Text style={styles.countText}>{section.data.length}</Text>
              </View>
            </View>
            {Boolean(historyError) && <Text style={styles.historyErrorText}>{labels.historyLoadFailed}</Text>}
            {historyPending && <ActivityIndicator size="small" color={theme.mutedSoft} style={styles.historyLoader} />}
          </View>
        ) : (
          <View style={styles.sectionHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
            <View style={styles.countPill}>
              <Text style={styles.countText}>{section.data.length}</Text>
            </View>
          </View>
        )
      }
      renderSectionFooter={({ section }) => section.data.length > 0 ? null : (
        <View style={styles.sectionEmpty}>
          <MaterialCommunityIcons name={section.emptyIcon} size={22} color={theme.mutedSoft} />
          <Text style={styles.sectionEmptyText}>{sectionEmptyText(section)}</Text>
        </View>
      )}
      ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
      SectionSeparatorComponent={() => <View style={{ height: Spacing.lg }} />}
      removeClippedSubviews
      windowSize={9}
      initialNumToRender={8}
      maxToRenderPerBatch={10}
    />
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.bg },
    loader: { flex: 1, backgroundColor: theme.bg },
    container: {},
    header: { paddingHorizontal: Spacing.xl },
    headerBack: { marginBottom: Spacing.md },
    floatingBack: { position: 'absolute', left: Spacing.xl },
    categoryTabs: { marginTop: Spacing.md },
    sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    headerTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    title: { fontSize: 28, fontWeight: '900', fontStyle: 'italic', color: theme.ink, letterSpacing: -0.5 },
    subtitle: { fontSize: 12, color: theme.muted, marginTop: 4, letterSpacing: 0.5 },
    searchBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, position: 'relative', paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line },
    searchBtnText: { color: theme.ink, fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
    friendRequestDot: { position: 'absolute', top: 4, right: 6, width: 9, height: 9, borderRadius: 5, backgroundColor: theme.red, borderWidth: 2, borderColor: theme.surface },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl, gap: Spacing.sm, backgroundColor: theme.bg },
    emptyTitle: { fontSize: 18, fontWeight: '800', color: theme.ink },
    emptyHint: { fontSize: 13, color: theme.muted, textAlign: 'center', lineHeight: 20 },
    headerSyncStatus: { marginTop: Spacing.lg },
    impactError: { marginTop: Spacing.md },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md, backgroundColor: theme.bg },
    sectionTitle: { fontSize: 17, fontWeight: '900', color: theme.ink, letterSpacing: 0 },
    countPill: { minWidth: 34, height: 28, borderRadius: Radius.pill, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line, alignItems: 'center', justifyContent: 'center' },
    countText: { color: theme.inkSoft, fontSize: 12, fontWeight: '900', fontVariant: ['tabular-nums'] },
    historyHeader: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md, backgroundColor: theme.bg, gap: Spacing.sm },
    historyErrorText: { fontSize: 11.5, color: theme.red, fontWeight: '600' },
    historyLoader: { alignSelf: 'flex-start' },
    sectionEmpty: { marginHorizontal: Spacing.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.line, borderRadius: Radius.xl, padding: Spacing.lg, alignItems: 'center', gap: Spacing.sm },
    sectionEmptyText: { color: theme.muted, fontSize: 13, textAlign: 'center' },
  })
}
