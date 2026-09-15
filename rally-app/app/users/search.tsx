import { useState, type ComponentProps } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { PressableScale } from '@/components/motion/PressableScale'
import { useScreenInsets } from '@/components/layout/useScreenInsets'
import { ScreenBackButton } from '@/components/navigation/ScreenBackButton'
import { ProfileFrame } from '@/components/profile/ProfileFrame'
import { Fonts, OnAccent, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useAddFriend } from '@/hooks/useFriends'
import { useUserSearch } from '@/hooks/useUserSearch'
import { friendlyFriendMessage } from '@/lib/friends/friendErrorMessage'
import { guardedRouter } from '@/lib/navigation/guardedRouter'
import type { UserSearchResult } from '@/lib/users/userSearchService'

export default function SearchUsersScreen() {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const insets = useSafeAreaInsets()
  const { paddingBottom } = useScreenInsets({ edges: ['bottom'] })
  const [query, setQuery] = useState('')
  const { data, error, isFetching, refetch, searchedQuery } = useUserSearch(query)
  const trimmed = query.trim()
  const isQuerySettled = trimmed === searchedQuery
  const results = isQuerySettled ? (data ?? []) : []
  const showLoading = trimmed.length > 0 && (!isQuerySettled || isFetching)
  const showError = trimmed.length > 0 && isQuerySettled && !!error && !isFetching
  const showNoResults = trimmed.length > 0 && isQuerySettled && !isFetching && !error && results.length === 0

  function retrySettledQuery() { if (trimmed === searchedQuery) void refetch() }

  return (
    <View style={styles.root}>
      <View style={[styles.headerBar, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.headerContent}>
          <ScreenBackButton accessibilityLabel="ย้อนกลับ" />
          <Text style={styles.headerTitle} pointerEvents="none" accessibilityRole="header">Add Friends</Text>
        </View>
      </View>

      <View style={styles.searchBar}>
        <MaterialCommunityIcons name="magnify" size={22} color={theme.muted} />
        <TextInput
          style={styles.input}
          placeholder="Search by username or name"
          placeholderTextColor={theme.mutedSoft}
          accessibilityLabel="Search by username or name"
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <PressableScale
            style={styles.clearButton}
            onPress={() => setQuery('')}
            accessibilityRole="button"
            accessibilityLabel="ล้างการค้นหา"
          >
            <MaterialCommunityIcons name="close-circle" size={20} color={theme.mutedSoft} />
          </PressableScale>
        )}
      </View>

      <FlatList
        data={results}
        keyExtractor={(user) => user.id}
        contentContainerStyle={[
          styles.list,
          results.length === 0 ? styles.listEmpty : null,
          { paddingBottom },
        ]}
        keyboardShouldPersistTaps="handled"
        ItemSeparatorComponent={ListSeparator}
        ListHeaderComponent={
          showLoading && results.length > 0 ? (
            <ActivityIndicator style={styles.inlineLoader} color={theme.orange} />
          ) : showError && results.length > 0 ? (
            <SearchState
              icon="cloud-alert-outline"
              title="ค้นหาไม่สำเร็จ"
              hint="ลองอีกครั้งในอีกสักครู่"
              actionLabel="ลองใหม่"
              onAction={retrySettledQuery}
              isActionDisabled={isFetching}
              theme={theme}
            />
          ) : null
        }
        ListEmptyComponent={
          trimmed.length === 0 ? (
            <SearchState
              icon="account-search-outline"
              title="ค้นหาผู้เล่น"
              hint="พิมพ์ชื่อหรือ @handle เพื่อเพิ่มเพื่อน"
              theme={theme}
            />
          ) : showLoading ? (
            <ActivityIndicator color={theme.orange} />
          ) : showError ? (
            <SearchState
              icon="cloud-alert-outline"
              title="ค้นหาไม่สำเร็จ"
              hint="ลองอีกครั้งในอีกสักครู่"
              actionLabel="ลองใหม่"
              onAction={retrySettledQuery}
              isActionDisabled={isFetching}
              theme={theme}
            />
          ) : showNoResults ? (
            <SearchState
              icon="account-question-outline"
              title="ไม่พบผู้ใช้"
              hint="ลองค้นหาด้วยชื่ออื่นหรือ @handle"
              theme={theme}
            />
          ) : null
        }
        renderItem={({ item }) => <ResultRow user={item} />}
      />
    </View>
  )
}

function ListSeparator() {
  return <View style={{ height: Spacing.sm }} />
}

type SearchStateProps = {
  icon: ComponentProps<typeof MaterialCommunityIcons>['name']
  title: string
  hint: string
  actionLabel?: string
  onAction?: () => void
  isActionDisabled?: boolean
  theme: SportPalette
}

function SearchState({
  icon,
  title,
  hint,
  actionLabel,
  onAction,
  isActionDisabled = false,
  theme,
}: SearchStateProps) {
  const styles = createStyles(theme)

  return (
    <View style={styles.empty} accessibilityRole={actionLabel ? 'alert' : 'text'}>
      <MaterialCommunityIcons name={icon} size={42} color={theme.mutedSoft} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyHint}>{hint}</Text>
      {actionLabel && onAction ? (
        <PressableScale
          style={styles.retryButton}
          onPress={onAction}
          disabled={isActionDisabled}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          accessibilityState={{ disabled: isActionDisabled, busy: isActionDisabled }}
        >
          <Text style={styles.retryButtonText}>{actionLabel}</Text>
        </PressableScale>
      ) : null}
    </View>
  )
}

function ResultRow({ user }: { user: UserSearchResult }) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const addFriendMutation = useAddFriend()
  const [friendStatus, setFriendStatus] = useState<'pending' | 'accepted' | null>(null)
  const initials = getInitials(user.display_name)
  const handle = user.handle
  const actionDisabled = addFriendMutation.isPending || friendStatus !== null
  const actionLabel = friendStatus === 'accepted' ? 'เพื่อนแล้ว' : friendStatus === 'pending' ? 'ส่งแล้ว' : 'เพิ่ม'

  function goProfile() {
    guardedRouter.push(`/user/${user.id}`, { actionKey: `user-search:user:${user.id}` })
  }

  async function addFriend() {
    const target = handle ? `@${handle}` : user.id

    try {
      const result = await addFriendMutation.mutateAsync(target)
      setFriendStatus(result.status === 'accepted' ? 'accepted' : 'pending')
      const label = result.handle ? `@${result.handle}` : (result.displayName ?? user.display_name)
      Alert.alert(result.status === 'accepted' ? 'เป็นเพื่อนกันแล้ว' : 'ส่งคำขอแล้ว', label)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not send friend request'
      Alert.alert('ส่งคำขอไม่สำเร็จ', friendlyFriendMessage(message))
    }
  }

  return (
    <PressableScale
      style={styles.row}
      onPress={goProfile}
      accessibilityRole="button"
      accessibilityLabel={`เปิดโปรไฟล์ ${user.display_name}`}
    >
      <ProfileFrame frameAssetRef={user.frame_asset_ref} size={48}>
        <Text style={styles.avatarText}>{initials}</Text>
      </ProfileFrame>
      <View style={styles.rowMid}>
        <Text style={styles.displayName} numberOfLines={1} maxFontSizeMultiplier={1.4}>
          {user.display_name || 'Player'}
        </Text>
        {handle ? (
          <Text style={styles.handle} numberOfLines={1} maxFontSizeMultiplier={1.4}>
            @{handle}
          </Text>
        ) : null}
      </View>
      <PressableScale
        style={styles.addButton}
        onPress={(event) => {
          event.stopPropagation()
          void addFriend()
        }}
        disabled={actionDisabled}
        accessibilityRole="button"
        accessibilityLabel={`${actionLabel} ${user.display_name}`}
        accessibilityState={{ disabled: actionDisabled, busy: addFriendMutation.isPending }}
      >
        {addFriendMutation.isPending ? (
          <ActivityIndicator size="small" color={OnAccent.onColor} />
        ) : (
          <Text style={styles.addButtonText}>{actionLabel}</Text>
        )}
      </PressableScale>
    </PressableScale>
  )
}

function getInitials(displayName: string): string {
  const initials = displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

  return initials || '?'
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.bg },
    headerBar: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
    headerContent: { height: 40, justifyContent: 'center', position: 'relative' },
    headerTitle: { position: 'absolute', left: 0, right: 0, textAlign: 'center', color: theme.ink, fontSize: 20, lineHeight: 26, fontWeight: '900', fontFamily: Fonts.thaiHead },
    searchBar: {
      height: 56,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginHorizontal: Spacing.lg,
      marginBottom: Spacing.lg,
      paddingHorizontal: Spacing.md,
      borderRadius: Radius.xl,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.line,
    },
    input: { flex: 1, color: theme.ink, fontSize: 15, fontFamily: Fonts.thaiBody, paddingVertical: 0 },
    clearButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    list: { paddingHorizontal: Spacing.lg },
    listEmpty: { flexGrow: 1 },
    inlineLoader: { marginBottom: Spacing.sm },
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing.xxxl,
      gap: Spacing.sm,
    },
    emptyTitle: { color: theme.ink, fontSize: 16, lineHeight: 22, fontWeight: '700', fontFamily: Fonts.thaiHead, textAlign: 'center' },
    emptyHint: { color: theme.muted, fontSize: 13, lineHeight: 20, fontFamily: Fonts.thaiBody, textAlign: 'center' },
    retryButton: {
      minHeight: 44,
      paddingHorizontal: Spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Radius.pill,
      backgroundColor: theme.surfaceStrong,
      borderWidth: 1,
      borderColor: theme.line,
    },
    retryButtonText: { color: theme.ink, fontSize: 13, fontWeight: '700', fontFamily: Fonts.thaiHead },
    row: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: Radius.xl, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line },
    avatarText: { color: theme.ink, fontSize: 17, fontWeight: '900', fontFamily: Fonts.rounded, letterSpacing: -0.5 },
    rowMid: { flex: 1, minWidth: 0 },
    displayName: { color: theme.ink, fontSize: 15, lineHeight: 21, fontWeight: '700', fontFamily: Fonts.thaiHead },
    handle: { marginTop: 2, color: theme.muted, fontSize: 13, lineHeight: 18, fontFamily: Fonts.thaiBody },
    addButton: { minWidth: 60, height: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.md, borderRadius: Radius.pill, backgroundColor: theme.orange },
    addButtonText: { color: OnAccent.onColor, fontSize: 13, fontWeight: '900', fontFamily: Fonts.thaiHead },
  })
}
