import { Platform, StyleSheet } from 'react-native'

import { Arcade, Fonts, OnAccent, Radius, Spacing, type SportPalette } from '@/constants/theme'

/**
 * Shared neutral rhythm for the friends hub and its small entry-point cards.
 * Keep the shadow web-only: native platforms should not receive a CSS shadow
 * string, while web receives the canonical theme shadow unchanged.
 */
export function createFriendsHubStyles(theme: SportPalette) {
  return StyleSheet.create({
    page: {
      paddingHorizontal: Spacing.lg,
      backgroundColor: theme.bg,
    },
    header: {
      minHeight: 64,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerSide: {
      width: Arcade.touchTarget,
      minHeight: Arcade.touchTarget,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      flex: 1,
      color: theme.ink,
      fontSize: 22,
      fontWeight: '900',
      fontFamily: Fonts?.rounded,
      textAlign: 'center',
    },
    profileButton: {
      width: Arcade.touchTarget,
      height: Arcade.touchTarget,
      alignItems: 'center',
      justifyContent: 'center',
    },
    profileAvatar: {
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
    },
    currentDot: {
      position: 'absolute',
      right: -1,
      bottom: 0,
      width: 10,
      height: 10,
      borderRadius: Radius.pill,
      borderWidth: 2,
      borderColor: theme.bg,
      backgroundColor: theme.greenVivid,
    },
    actionRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    actionTile: {
      flex: 1,
      minHeight: 72,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.md,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface,
      ...softSurfaceShadow(theme),
    },
    actionIcon: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Radius.pill,
      backgroundColor: theme.surfaceStrong,
    },
    actionCopy: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    actionTitle: {
      color: theme.ink,
      fontSize: 13,
      fontWeight: '900',
    },
    actionSubtitle: {
      color: theme.muted,
      fontSize: 10,
      fontWeight: '700',
    },
    input: {
      minHeight: Arcade.touchTarget,
      paddingHorizontal: Spacing.md,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface,
      color: theme.ink,
    },
    statusChip: {
      alignSelf: 'flex-start',
      minHeight: 24,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing.sm,
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surfaceStrong,
    },
    statusChipText: {
      color: theme.muted,
      fontSize: 10,
      fontWeight: '800',
    },
    actionChevron: {
      flexShrink: 0,
    },
    recommendationSection: {
      gap: Spacing.sm,
    },
    sectionHeader: {
      minHeight: Arcade.touchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    sectionTitle: {
      color: theme.ink,
      fontSize: 18,
      fontWeight: '900',
      fontFamily: Fonts?.rounded,
    },
    locationToggle: {
      minHeight: 30,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: Spacing.sm,
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface,
    },
    locationToggleEnabled: {
      borderColor: theme.orange,
      backgroundColor: theme.surfaceStrong,
    },
    locationToggleText: {
      color: theme.muted,
      fontSize: 10,
      fontWeight: '800',
    },
    locationToggleTextEnabled: {
      color: theme.orange,
    },
    recommendationRail: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingHorizontal: 0,
      paddingVertical: Spacing.xs,
    },
    candidateTile: {
      width: 62,
      minHeight: 124,
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: Spacing.xs,
      paddingVertical: 2,
    },
    candidateAvatarFrame: {
      width: 52,
      height: 52,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface,
      overflow: 'hidden',
    },
    candidateImage: {
      width: 50,
      height: 50,
      borderRadius: Radius.pill,
    },
    candidateInitials: {
      color: theme.ink,
      fontSize: 15,
      fontWeight: '900',
      fontFamily: Fonts?.rounded,
      letterSpacing: -0.3,
    },
    candidateName: {
      maxWidth: 62,
      color: theme.ink,
      fontSize: 11,
      fontWeight: '800',
      textAlign: 'center',
    },
    candidateAddButton: {
      minWidth: 44,
      minHeight: Arcade.touchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      paddingHorizontal: Spacing.xs,
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: theme.orange,
      backgroundColor: theme.surface,
    },
    candidateAddButtonAdded: {
      borderColor: theme.line,
      backgroundColor: theme.surfaceStrong,
    },
    candidateAddButtonText: {
      color: theme.orange,
      fontSize: 10,
      fontWeight: '900',
    },
    candidateAddButtonTextAdded: {
      color: theme.muted,
    },
    recommendationState: {
      minHeight: Arcade.touchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      paddingHorizontal: 0,
    },
    recommendationStateText: {
      color: theme.muted,
      fontSize: 12,
      fontWeight: '700',
    },
    recommendationErrorText: {
      color: theme.red,
    },
    recommendationRetry: {
      minHeight: Arcade.touchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing.md,
      borderRadius: Radius.pill,
      backgroundColor: theme.orange,
    },
    recommendationRetryText: {
      color: OnAccent.onColor,
      fontSize: 11,
      fontWeight: '900',
    },
    recommendationRefreshError: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingHorizontal: 0,
    },
    recommendationRefreshErrorText: {
      flex: 1,
      color: theme.red,
      fontSize: 11,
      fontWeight: '700',
    },
    tabs: {
      flexDirection: 'row',
      minHeight: Arcade.touchTarget,
      padding: 1,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface,
      ...softSurfaceShadow(theme),
    },
    tab: {
      flex: 1,
      minHeight: Arcade.touchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing.md,
      borderRadius: Radius.lg,
    },
    tabActive: {
      backgroundColor: theme.orange,
    },
    tabLabel: {
      color: theme.ink,
      fontSize: 13,
      fontWeight: '900',
    },
    tabLabelActive: {
      color: OnAccent.onColor,
    },
    tabCount: {
      color: theme.orange,
      fontWeight: '900',
    },
    tabCountActive: {
      color: OnAccent.onColor,
    },
    communityCard: {
      minHeight: 72,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      paddingHorizontal: Spacing.lg,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface,
      ...softSurfaceShadow(theme),
    },
    communityCopy: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    communityTitle: {
      color: theme.ink,
      fontSize: 15,
      fontWeight: '900',
    },
    communityMeta: {
      color: theme.muted,
      fontSize: 12,
      fontWeight: '700',
    },
    communityRequest: {
      alignItems: 'flex-end',
      gap: 2,
    },
    communityRequestLabel: {
      color: theme.muted,
      fontSize: 11,
      fontWeight: '800',
    },
    communityRequestCount: {
      color: theme.orange,
      fontSize: 14,
      fontWeight: '900',
    },
  })
}

function softSurfaceShadow(theme: SportPalette) {
  return Platform.select({
    web: { boxShadow: theme.shadowSoft },
    default: {},
  })
}
