import { StyleSheet } from 'react-native'

import { Arcade, Fonts, Radius, Spacing, type SportPalette } from '@/constants/theme'

/**
 * Shared visual grammar for every friends-list row (friend / incoming / sent).
 * Mirrors RankingRow: neutral surface, radius ~xl, 1px line — so the three row
 * variants read as one family and stay in step with the master grammar.
 */
export function createFriendRowStyles(theme: SportPalette) {
  return StyleSheet.create({
    row: {
      minHeight: 64,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      backgroundColor: theme.surface,
      paddingVertical: 8,
      paddingHorizontal: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.line,
    },
    mid: { flex: 1, minWidth: 0 },
    name: { fontSize: 14, fontWeight: '800', color: theme.ink },
    handle: { fontSize: 12, color: theme.muted, marginTop: 1 },
    trailingAffordance: {
      width: Arcade.touchTarget,
      height: Arcade.touchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.bg,
    },
    avatarText: {
      color: theme.ink,
      fontSize: 16,
      fontWeight: '900',
      fontFamily: Fonts?.rounded,
      letterSpacing: -0.5,
    },
  })
}
