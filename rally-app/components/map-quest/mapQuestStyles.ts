/**
 * Styles for the Map Quest screen and its sub-components.
 *
 * Extracted from app/map-quest/index.tsx (§2.5 — 1 file = 1 responsibility).
 * Import via: import { createMapQuestStyles, type MapQuestStyles } from '@/components/map-quest/mapQuestStyles'
 */

import { StyleSheet } from 'react-native'

import { RallyAccent, OnAccent, type SportPalette } from '@/constants/theme'

export type MapQuestStyles = ReturnType<typeof createMapQuestStyles>

export function createMapQuestStyles(theme: SportPalette) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    centred: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    map: {
      flex: 1,
    },
    topBar: {
      position: 'absolute',
      top: 56,
      left: 16,
      zIndex: 10,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: theme.arcadeCabinetEdge,
      backgroundColor: theme.arcadePanelAlt,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.arcadeShadow,
      shadowOpacity: 0.22,
      shadowRadius: 0,
      shadowOffset: { width: 2, height: 3 },
    },
    spotStrip: {
      position: 'absolute',
      bottom: 172,
      left: 0,
      right: 0,
    },
    spotStripContent: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 16,
    },
    spotChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor: theme.arcadeCabinetEdge,
      backgroundColor: theme.arcadePanelAlt,
      shadowColor: theme.arcadeShadow,
      shadowOpacity: 0.18,
      shadowRadius: 0,
      shadowOffset: { width: 2, height: 3 },
    },
    spotChipActive: {
      borderColor: RallyAccent.orange,
    },
    spotChipDimmed: {
      opacity: 0.55,
    },
    spotChipText: {
      color: theme.ink,
      fontSize: 12,
      fontWeight: '900',
    },
    spotChipTextDimmed: {
      color: theme.muted,
    },
    actionPanel: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: 16,
      paddingBottom: 32,
      paddingTop: 12,
      backgroundColor: theme.arcadePanelAlt,
      borderTopWidth: 2.5,
      borderTopColor: theme.arcadeCabinetEdge,
      shadowColor: theme.arcadeShadow,
      shadowOpacity: 0.22,
      shadowRadius: 0,
      shadowOffset: { width: 0, height: -4 },
    },
    actionPanelInner: {
      gap: 12,
    },
    spotInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    spotDot: {
      width: 14,
      height: 14,
      borderRadius: 7,
    },
    spotCopy: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    spotName: {
      color: theme.ink,
      fontSize: 16,
      fontWeight: '900',
      lineHeight: 20,
    },
    spotReward: {
      color: theme.economy,
      fontSize: 13,
      fontWeight: '900',
      fontVariant: ['tabular-nums'],
    },
    statusPill: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.panelBg,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    statusPillText: {
      color: theme.muted,
      fontSize: 11,
      fontWeight: '900',
    },
    statusPillTextActive: {
      color: RallyAccent.orange,
    },
    actionBtn: {
      height: 52,
      borderRadius: 18,
      backgroundColor: RallyAccent.orange,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.arcadeShadow,
      shadowOpacity: 0.22,
      shadowRadius: 0,
      shadowOffset: { width: 3, height: 4 },
    },
    actionBtnDisabled: {
      backgroundColor: theme.surfaceStrong,
    },
    actionBtnClaimed: {
      backgroundColor: RallyAccent.indigo,
    },
    actionBtnText: {
      color: OnAccent.onColor,
      fontSize: 17,
      fontWeight: '900',
      letterSpacing: 0.3,
    },
    actionBtnTextDisabled: {
      color: theme.muted,
    },
    errorTitle: {
      color: theme.ink,
      fontSize: 15,
      fontWeight: '900',
    },
    emptyTitle: {
      color: theme.ink,
      fontSize: 15,
      fontWeight: '900',
    },
    emptySubtitle: {
      color: theme.muted,
      fontSize: 12,
      fontWeight: '800',
    },
    retryBtn: {
      marginTop: 4,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 999,
      backgroundColor: RallyAccent.orange,
    },
    retryBtnText: {
      color: OnAccent.onColor,
      fontSize: 14,
      fontWeight: '900',
    },
    toast: {
      position: 'absolute',
      top: '40%',
      alignSelf: 'center',
      paddingHorizontal: 22,
      paddingVertical: 12,
      borderRadius: 999,
      backgroundColor: RallyAccent.orange,
      shadowColor: '#000',
      shadowOpacity: 0.22,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
    },
    toastText: {
      color: OnAccent.onColor,
      fontSize: 22,
      fontWeight: '900',
      fontVariant: ['tabular-nums'],
    },
  })
}
