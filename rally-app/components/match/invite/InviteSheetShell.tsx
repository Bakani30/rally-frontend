import type { ReactNode } from 'react'
import { ActivityIndicator, Modal, StyleSheet, Text, TextInput, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Sport, Spacing } from '@/constants/theme'

type InviteSheetShellProps = {
  visible: boolean
  title: string
  searchValue: string
  onSearch: (value: string) => void
  searchPlaceholder?: string
  onClose: () => void
  loading?: boolean
  children: ReactNode
}

/**
 * Shared chrome for the invite sheets (friend + referee): page-sheet modal,
 * header with close, a controlled search bar, and a body slot. The list content
 * and per-row affordances live in the children.
 */
export function InviteSheetShell({
  visible,
  title,
  searchValue,
  onSearch,
  searchPlaceholder,
  onClose,
  loading,
  children,
}: InviteSheetShellProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      {/* Modal renders in a separate native hierarchy outside the app-root
          GestureHandlerRootView, so swipe gestures (SwipeableRow) inside the
          sheet don't fire without wrapping the content in its own GHRV. */}
      <GestureHandlerRootView style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <PressableScale style={styles.closeBtn} onPress={onClose} accessibilityLabel="Close">
            <MaterialCommunityIcons name="close" size={20} color={Sport.ink} />
          </PressableScale>
        </View>

        <View style={styles.searchBar}>
          <MaterialCommunityIcons name="magnify" size={18} color={Sport.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder={searchPlaceholder}
            placeholderTextColor={Sport.mutedSoft}
            autoCapitalize="none"
            autoCorrect={false}
            value={searchValue}
            onChangeText={onSearch}
            returnKeyType="search"
          />
          {searchValue.length > 0 && (
            <PressableScale onPress={() => onSearch('')} accessibilityLabel="Clear">
              <MaterialCommunityIcons name="close-circle" size={16} color={Sport.mutedSoft} />
            </PressableScale>
          )}
        </View>

        {loading ? (
          <ActivityIndicator color={Sport.red} style={{ marginTop: Spacing.lg }} />
        ) : (
          <View style={styles.body}>{children}</View>
        )}
      </GestureHandlerRootView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Sport.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  title: { flex: 1, fontSize: 18, fontWeight: '900', color: Sport.ink },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Sport.surface,
    borderWidth: 1,
    borderColor: Sport.line,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: Spacing.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.lg,
    backgroundColor: Sport.surface,
    borderWidth: 1,
    borderColor: Sport.line,
  },
  searchInput: { flex: 1, color: Sport.ink, fontSize: 14, paddingVertical: 0 },
  body: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
})
